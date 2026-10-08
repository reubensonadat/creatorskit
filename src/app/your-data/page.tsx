"use client";

/**
 * /your-data — plan §8 Phase 7.3.
 *
 * The transparency page: EVERYTHING CreatorsKit has saved on this device, per
 * tool, with view + delete + one-tap EXPORT ALL. Zero server by construction —
 * this page only reads IndexedDB (`ck_local_memory` via src/lib/local-memory.ts)
 * and the `ck_*` settings keys in localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Database, Eye, EyeOff, Trash2, Download, RefreshCw, ShieldCheck, HardDrive, Smartphone, ArrowDownToLine, Palette } from "lucide-react";
import {
  listMemory,
  loadAssets,
  loadState,
  clearTool,
  type MemoryToolSummary,
} from "@/lib/local-memory";
import { backupToDeviceTransfer, restoreFromDeviceTransfer, type BackupResult } from "@/lib/device-transfer";

interface DetailRow {
  name: string;
  size: number;
  url: string | null;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function YourDataPage() {
  const [rows, setRows] = useState<MemoryToolSummary[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [statePreview, setStatePreview] = useState<string | null>(null);
  const [lsKeys, setLsKeys] = useState<{ key: string; bytes: number }[]>([]);
  const [note, setNote] = useState("");
  const [exporting, setExporting] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);

  // Phone migration (the ONLY opt-in cloud copy in CreatorsKit — see device-transfer.ts)
  const [backupPin, setBackupPin] = useState("");
  const [backupPin2, setBackupPin2] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [backupError, setBackupError] = useState("");
  const [restoreCode, setRestoreCode] = useState("");
  const [restorePin, setRestorePin] = useState("");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [restoreOk, setRestoreOk] = useState(false);

  const label = { fontSize: "0.66rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.04em", textTransform: "uppercase" as const };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "2px solid #000",
    background: "#fff",
    padding: "9px 10px",
    fontFamily: "monospace",
    fontWeight: 800,
    fontSize: "0.85rem",
    color: "#000",
    outline: "none",
  };

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(""), 2000);
  };

  const refresh = useCallback(async () => {
    const mem = await listMemory();
    setRows(mem);
    const keys: { key: string; bytes: number }[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("ck_")) {
          keys.push({ key: k, bytes: (window.localStorage.getItem(k) ?? "").length });
        }
      }
    } catch {
      /* storage blocked — settings section just stays empty */
    }
    setLsKeys(keys);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const revokeUrls = () => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  };

  // Revoke preview URLs on unmount so expanded thumbs never leak.
  useEffect(() => () => revokeUrls(), []);

  const toggleExpand = async (tool: string) => {
    if (expanded === tool) {
      setExpanded(null);
      return;
    }
    revokeUrls();
    const recs = await loadAssets(tool);
    const urls: DetailRow[] = recs.map((r) => ({
      name: r.name ?? `slot-${r.slot}`,
      size: r.blob.size,
      url: r.blob.type.startsWith("image/") ? URL.createObjectURL(r.blob) : null,
    }));
    urls.forEach((u) => {
      if (u.url) objectUrlsRef.current.push(u.url);
    });
    const st = await loadState<unknown>(tool);
    let preview: string | null = null;
    if (st) {
      try {
        preview = JSON.stringify(st.state, null, 2);
        if (preview && preview.length > 1600) preview = preview.slice(0, 1600) + "\n… (truncated)";
      } catch {
        preview = null;
      }
    }
    setDetail(urls);
    setStatePreview(preview);
    setExpanded(tool);
  };

  const deleteTool = async (tool: string) => {
    await clearTool(tool);
    if (expanded === tool) {
      revokeUrls();
      setExpanded(null);
      setDetail([]);
      setStatePreview(null);
    }
    await refresh();
    flash("Deleted. That tool now starts fresh.");
  };

  const deleteLsKey = async (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* blocked — non-fatal */
    }
    await refresh();
    flash(`${key} removed.`);
  };

  const exportAll = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const JSZip = (await import("jszip")).default; // lazy per §7 — never in the page bundle
      const zip = new JSZip();
      const mem = await listMemory();
      const manifest = {
        exportedAt: new Date().toISOString(),
        device: "On-device export from creatorskit — nothing here was ever uploaded to any server.",
        tools: [] as Array<{ tool: string; label: string; assets: number; bytes: number; hasState: boolean }>,
      };
      for (const m of mem) {
        manifest.tools.push({ tool: m.tool, label: m.label, assets: m.assets, bytes: m.bytes, hasState: m.hasState });
        const folder = zip.folder(m.tool) ?? zip;
        const recs = await loadAssets(m.tool);
        for (const r of recs) {
          const ext = r.name && /\.[a-z0-9]+$/i.test(r.name) ? "" : r.blob.type.split("/")[1] ? "." + r.blob.type.split("/")[1] : "";
          folder.file(`${r.slot}-${r.name ?? "file"}${ext}`, r.blob);
        }
        const st = await loadState<unknown>(m.tool);
        if (st) folder.file("state.json", JSON.stringify(st.state, null, 2));
      }
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `creatorskit-your-data-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      flash(`Exported ${mem.length} tool store${mem.length === 1 ? "" : "s"} as one ZIP.`);
    } catch {
      flash("Export failed — try again.");
    } finally {
      setExporting(false);
    }
  };

  const runBackup = async () => {
    if (backupBusy) return;
    setBackupError("");
    setBackupResult(null);
    if (!/^\d{4}$/.test(backupPin)) {
      setBackupError("Pick a 4-digit PIN first.");
      return;
    }
    if (backupPin !== backupPin2) {
      setBackupError("The two PINs don't match.");
      return;
    }
    setBackupBusy(true);
    try {
      const result = await backupToDeviceTransfer(backupPin);
      setBackupResult(result);
      setBackupPin("");
      setBackupPin2("");
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : "Backup failed — try again.");
    } finally {
      setBackupBusy(false);
    }
  };

  const copyTransferCode = async () => {
    if (!backupResult) return;
    try {
      await navigator.clipboard.writeText(backupResult.code);
      flash("Recovery code copied.");
    } catch {
      flash("Copy failed — write it down by hand.");
    }
  };

  const runRestore = async () => {
    if (restoreBusy) return;
    setRestoreMsg("");
    setRestoreOk(false);
    if (!restoreCode.trim()) {
      setRestoreMsg("Enter the recovery code from your old phone.");
      return;
    }
    if (!/^\d{4}$/.test(restorePin)) {
      setRestoreMsg("Enter the 4-digit PIN you set on the old phone.");
      return;
    }
    setRestoreBusy(true);
    try {
      const stats = await restoreFromDeviceTransfer(restoreCode, restorePin);
      setRestoreOk(true);
      setRestoreMsg(
        `Restored ${stats.lsKeys} setting${stats.lsKeys === 1 ? "" : "s"}, ${stats.states} tool state${stats.states === 1 ? "" : "s"} and ${stats.assetsIncluded} file${stats.assetsIncluded === 1 ? "" : "s"} — reopen your tools and everything is back.`
      );
      setRestoreCode("");
      setRestorePin("");
      await refresh();
    } catch (e) {
      setRestoreMsg(e instanceof Error ? e.message : "Restore failed — try again.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const totalBytes = (rows ?? []).reduce((a, r) => a + r.bytes, 0);
  const totalAssets = (rows ?? []).reduce((a, r) => a + r.assets, 0);

  return (
    <div className="tool-page-padding" style={{ position: "relative", minHeight: "100vh", overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
      <div className="grid-bg" />
      <div className="tool-inner-container" style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>

        {/* Title */}
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 8px", border: "2px solid #000", background: "#000", color: "#fff", fontFamily: "monospace" }}>
              YOUR DATA
            </span>
            <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
              EVERYTHING THIS DEVICE STORES · VIEW · DELETE · EXPORT
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, textTransform: "uppercase" }}>
            Your Data, On Your Device
          </h1>
        </div>

        {/* Privacy banner */}
        <div className="brutalist-card" style={{ padding: 18, display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
          <ShieldCheck size={20} style={{ color: "#000", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "#000", marginBottom: 4 }}>
              Your name is your name — we don't store your name.
            </div>
            <div style={{ fontSize: "0.8rem", color: "#555", lineHeight: 1.6, fontWeight: 500 }}>
              Everything listed below lives <strong>only in this browser</strong> (IndexedDB + localStorage) so your tools remember
              your work between visits. It is never uploaded, never synced, and there is no server copy to ask for — deleting it here
              deletes it everywhere.
            </div>
            <Link href="/privacy" style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 900, color: "#000", textDecoration: "none", borderBottom: "2px solid #000", paddingBottom: 1, display: "inline-block", marginTop: 8 }}>
              FULL PRIVACY POLICY →
            </Link>
          </div>
        </div>

        {/* Phone migration — opt-in encrypted copy that deletes itself in 7 days */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div className="brutalist-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={15} style={{ color: "#000" }} />
              <span style={{ fontWeight: 900, fontSize: "0.92rem", color: "#000" }}>MOVE TO A NEW PHONE</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.6, fontWeight: 500 }}>
              Changing phones? One tap packs <strong>everything on this page</strong> into a single encrypted copy — locked
              with a 4-digit PIN only you know — that <strong>deletes itself after 7 days</strong>. Nothing uploads until
              you physically press the button.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ ...label, color: "#666", marginBottom: 4 }}>NEW 4-DIGIT PIN</div>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={4}
                  value={backupPin}
                  onChange={(e) => setBackupPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{ ...label, color: "#666", marginBottom: 4 }}>CONFIRM PIN</div>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={4}
                  value={backupPin2}
                  onChange={(e) => setBackupPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  style={inputStyle}
                />
              </div>
            </div>
            <button
              className="brutalist-button brutalist-button-primary"
              disabled={backupBusy}
              onClick={() => void runBackup()}
              style={{ fontSize: "0.78rem", padding: "10px 16px", cursor: backupBusy ? "wait" : "pointer" }}
            >
              <Smartphone size={14} /> {backupBusy ? "ENCRYPTING…" : "BACK UP MY DATA"}
            </button>
            {backupError && (
              <div style={{ border: "2px solid #b91c1c", background: "rgba(185,28,28,0.06)", padding: "8px 10px", fontSize: "0.74rem", fontWeight: 700, color: "#b91c1c", lineHeight: 1.5 }}>
                {backupError}
              </div>
            )}
            {backupResult && (
              <div style={{ border: "2px solid #000", background: "#fff", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ ...label, color: "#666" }}>YOUR RECOVERY CODE — WRITE IT DOWN</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.12em", background: "#000", color: "#fff", padding: "10px 12px", textAlign: "center" }}>
                  {backupResult.code}
                </div>
                <button className="brutalist-button" onClick={() => void copyTransferCode()} style={{ fontSize: "0.7rem", padding: "7px 12px" }}>
                  <Download size={12} /> COPY CODE
                </button>
                <div style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 700, color: "#555", lineHeight: 1.8 }}>
                  PACKED {backupResult.stats.lsKeys} SETTINGS · {backupResult.stats.states} TOOL STATES · {backupResult.stats.assetsIncluded} FILES
                  {backupResult.stats.assetsSkipped > 0 ? ` · ${backupResult.stats.assetsSkipped} BIG FILE${backupResult.stats.assetsSkipped === 1 ? "" : "S"} LEFT ON THIS PHONE` : ""}
                  <br />
                  DELETES ITSELF {formatDate(Date.parse(backupResult.expiresAt))}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#666", lineHeight: 1.6, fontWeight: 500 }}>
                  On the new phone: open this page → “Restore on this phone” → enter this code plus this PIN. After 7 days
                  the copy is gone — and nobody, not even us, can read it without your PIN.
                </div>
              </div>
            )}
          </div>

          <div className="brutalist-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowDownToLine size={15} style={{ color: "#000" }} />
              <span style={{ fontWeight: 900, fontSize: "0.92rem", color: "#000" }}>RESTORE ON THIS PHONE</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.6, fontWeight: 500 }}>
              New phone? Enter the recovery code from the old one, plus the PIN you set there. Your settings, drafts and
              files land straight onto this device — the copy stays restorable for 7 days from the moment it was made.
            </div>
            <div>
              <div style={{ ...label, color: "#666", marginBottom: 4 }}>RECOVERY CODE</div>
              <input
                value={restoreCode}
                onChange={(e) => setRestoreCode(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, "").slice(0, 13))}
                placeholder="CK-XXXX-XXXX"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...inputStyle, letterSpacing: "0.1em" }}
              />
            </div>
            <div>
              <div style={{ ...label, color: "#666", marginBottom: 4 }}>4-DIGIT PIN</div>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={restorePin}
                onChange={(e) => setRestorePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                style={inputStyle}
              />
            </div>
            <button
              className="brutalist-button brutalist-button-primary"
              disabled={restoreBusy}
              onClick={() => void runRestore()}
              style={{ fontSize: "0.78rem", padding: "10px 16px", cursor: restoreBusy ? "wait" : "pointer" }}
            >
              <ArrowDownToLine size={14} /> {restoreBusy ? "RESTORING…" : "RESTORE MY DATA"}
            </button>
            {restoreMsg && (
              <div style={{ border: `2px solid ${restoreOk ? "#16a34a" : "#b91c1c"}`, background: restoreOk ? "rgba(22,163,74,0.06)" : "rgba(185,28,28,0.06)", padding: "8px 10px", fontSize: "0.74rem", fontWeight: 700, color: restoreOk ? "#16a34a" : "#b91c1c", lineHeight: 1.5 }}>
                {restoreMsg}
              </div>
            )}
            <div style={{ fontSize: "0.66rem", color: "#999", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.03em" }}>
              RESTORING REPLACES THIS DEVICE'S COPY OF THOSE SETTINGS & FILES.
            </div>
          </div>
        </div>

        {/* Brand Kit — the universal identity every tool pulls from */}
        <div className="brutalist-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Palette size={18} style={{ color: "#000", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 900, fontSize: "0.85rem", color: "#000" }}>BRAND KIT — YOUR IDENTITY, EVERYWHERE</div>
            <div style={{ fontSize: "0.74rem", color: "#666", lineHeight: 1.5 }}>
              Save your logo, colors, fonts and MoMo/bank details once — invoices and tools open pre-filled. Moves to a
              new phone with everything else.
            </div>
          </div>
          <Link href="/brand-kit" className="brutalist-button" style={{ fontSize: "0.72rem", padding: "8px 14px", textDecoration: "none" }}>
            MANAGE →
          </Link>
        </div>

        {/* Global actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
          <button className="brutalist-button brutalist-button-primary" disabled={exporting || (rows ?? []).length === 0} onClick={() => void exportAll()} style={{ fontSize: "0.78rem", padding: "10px 16px", cursor: exporting ? "wait" : "pointer" }}>
            <Download size={14} /> {exporting ? "PACKAGING…" : "EXPORT ALL (ZIP)"}
          </button>
          <button className="brutalist-button" onClick={() => void refresh()} style={{ fontSize: "0.78rem", padding: "10px 16px" }}>
            <RefreshCw size={14} /> REFRESH
          </button>
          <span style={{ fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
            {rows === null ? "READING…" : `${rows.length} TOOL STORE${rows.length === 1 ? "" : "S"} · ${totalAssets} FILE${totalAssets === 1 ? "" : "S"} · ${formatBytes(totalBytes)}`}
          </span>
          {note && <span style={{ fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 800, color: "#000" }}>{note}</span>}
        </div>

        {/* Tool stores */}
        {rows === null ? (
          <div className="brutalist-card" style={{ padding: 40, textAlign: "center", color: "#666", fontFamily: "monospace", fontWeight: 800, fontSize: "0.8rem" }}>
            READING LOCAL MEMORY…
          </div>
        ) : rows.length === 0 ? (
          <div className="brutalist-card" style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Database size={28} style={{ color: "#000" }} />
            <div style={{ fontWeight: 900, color: "#000" }}>Nothing stored yet</div>
            <div style={{ fontSize: "0.82rem", color: "#666", maxWidth: 420, lineHeight: 1.6 }}>
              Use any tool — upload photos to Batch Watermark, pick a logo, slice a carousel — and its working files will be
              remembered here, on this device only.
            </div>
            <Link href="/" className="brutalist-button" style={{ fontSize: "0.76rem", padding: "8px 14px", textDecoration: "none" }}>
              ‹ GO MAKE SOMETHING
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {rows.map((r) => (
              <div key={r.tool} className="brutalist-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HardDrive size={15} style={{ color: "#000" }} />
                  <span style={{ fontWeight: 900, fontSize: "0.92rem", color: "#000" }}>{r.label}</span>
                </div>
                <div style={{ ...label, color: "#666" }}>{r.tool.toUpperCase()}</div>
                <div style={{ fontSize: "0.74rem", fontFamily: "monospace", fontWeight: 700, color: "#555", lineHeight: 1.7 }}>
                  {r.assets} FILE{r.assets === 1 ? "" : "S"} · {formatBytes(r.bytes)}
                  <br />
                  {r.hasState ? "SETTINGS SAVED" : "NO SETTINGS"} · USED {formatDate(r.updatedAt)}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button className="brutalist-button" onClick={() => void toggleExpand(r.tool)} style={{ fontSize: "0.7rem", padding: "7px 12px" }}>
                    {expanded === r.tool ? <EyeOff size={13} /> : <Eye size={13} />} {expanded === r.tool ? "HIDE" : "VIEW"}
                  </button>
                  <button className="brutalist-button" onClick={() => void deleteTool(r.tool)} style={{ fontSize: "0.7rem", padding: "7px 12px" }}>
                    <Trash2 size={13} /> DELETE
                  </button>
                </div>

                {expanded === r.tool && (
                  <div style={{ borderTop: "2px solid #000", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {detail.length === 0 && !statePreview && (
                      <span style={{ fontSize: "0.74rem", color: "#666", fontFamily: "monospace", fontWeight: 700 }}>
                        Only settings in this store — no files.
                      </span>
                    )}
                    {detail.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 6 }}>
                        {detail.map((d, i) =>
                          d.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={d.name + i} src={d.url} alt={d.name} title={`${d.name} · ${formatBytes(d.size)}`} style={{ width: "100%", height: 64, objectFit: "cover", border: "2px solid #000", display: "block" }} />
                          ) : (
                            <div key={d.name + i} title={`${d.name} · ${formatBytes(d.size)}`} style={{ width: "100%", height: 64, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontFamily: "monospace", fontWeight: 900, color: "#000", textAlign: "center", padding: 4, boxSizing: "border-box", overflow: "hidden" }}>
                              {d.name.slice(0, 18)}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {detail.length > 0 && (
                      <div style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 700, color: "#666", lineHeight: 1.8 }}>
                        {detail.map((d, i) => (
                          <div key={d.name + "-row" + i} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                            <span>{formatBytes(d.size)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {statePreview && (
                      <div style={{ border: "2px dashed rgba(0,0,0,0.35)", background: "rgba(0,0,0,0.02)", padding: 10 }}>
                        <div style={{ ...label, color: "#666", marginBottom: 6 }}>SAVED SETTINGS (JSON)</div>
                        <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.66rem", lineHeight: 1.6, color: "#000", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 240, overflowY: "auto" }}>
                          {statePreview}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* localStorage settings */}
        <div className="brutalist-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Database size={15} />
            <span style={{ ...label, color: "#000" }}>SETTINGS & LIBRARIES (LOCALSTORAGE · CK_* KEYS)</span>
          </div>
          {lsKeys.length === 0 ? (
            <span style={{ fontSize: "0.78rem", color: "#666", fontFamily: "monospace", fontWeight: 700 }}>
              No settings saved yet — tool preferences (watermark position, logo library, brand kit…) will appear here.
            </span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {lsKeys.map((k) => (
                <div key={k.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: "2px solid #000", padding: "8px 10px", background: "#fff" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.72rem", color: "#000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {k.key}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.7rem", color: "#666" }}>{formatBytes(k.bytes)}</span>
                    <button className="brutalist-button" onClick={() => void deleteLsKey(k.key)} style={{ fontSize: "0.66rem", padding: "5px 10px" }}>
                      <Trash2 size={12} /> DELETE
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Link href="/" className="brutalist-button" style={{ fontSize: "0.78rem", padding: "8px 16px", textDecoration: "none" }}>
            ‹ ALL TOOLS
          </Link>
        </div>
      </div>
    </div>
  );
}
