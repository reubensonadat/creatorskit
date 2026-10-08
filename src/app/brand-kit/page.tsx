"use client";

/**
 * /brand-kit — the universal creator identity ("Grand Kit").
 *
 * Save your brand ONCE: name, logo, colors, fonts, MoMo & bank details.
 * Every tool that cares pulls from here (invoices today, more tomorrow) —
 * documents still let you override anything per-document without ever
 * writing back to this kit.
 *
 * 100% local: `ck_brandkit_v1` in localStorage → rides the encrypted
 * device transfer on /your-data when you change phones. No server.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Palette, ImagePlus, Trash2, Smartphone, ShieldCheck, Sparkles, PenTool } from "lucide-react";
import {
  loadBrandKit,
  saveBrandKit,
  clearBrandKit,
  brandKitHasAnything,
  fileToLogoDataUrl,
  type BrandKit,
  type BrandKitIdentity,
  type BrandKitMoney,
} from "@/lib/brand-kit";
import { GOOGLE_FONTS_LIST } from "@/lib/invoice-fonts";
import CreatorSignatureModal from "@/components/CreatorSignatureModal";

const CURRENCIES = ["GHS", "NGN", "USD", "GBP"] as const;

const label = {
  display: "block",
  fontSize: "0.64rem",
  fontWeight: 900,
  fontFamily: "monospace",
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  marginBottom: 4,
  color: "#000",
};

const field = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "8px 10px",
  border: "2px solid #000",
  background: "#fff",
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "#000",
  outline: "none",
};

export default function BrandKitPage() {
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmLogoRemove, setConfirmLogoRemove] = useState(false);
  const [confirmSigRemove, setConfirmSigRemove] = useState(false);
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const disarmRef = useRef<number | null>(null);

  useEffect(() => {
    setKit(loadBrandKit());
    return () => {
      if (disarmRef.current) window.clearTimeout(disarmRef.current);
    };
  }, []);

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(""), 1600);
  };

  const commit = (next: BrandKit, quiet = false) => {
    setKit(next);
    if (!saveBrandKit(next)) {
      setError("STORAGE FULL — try a smaller logo image.");
      return;
    }
    setError("");
    if (!quiet) flash("SAVED ✓");
  };

  const setIdentity = (k: keyof BrandKitIdentity) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!kit) return;
    commit({ ...kit, identity: { ...kit.identity, [k]: e.target.value }, updatedAt: Date.now() }, true);
  };

  const setMoney = (k: keyof BrandKitMoney) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!kit) return;
    commit({ ...kit, money: { ...kit.money, [k]: e.target.value }, updatedAt: Date.now() }, true);
  };

  const setColor = (k: "primary" | "accent") => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!kit) return;
    commit({ ...kit, colors: { ...kit.colors, [k]: e.target.value }, updatedAt: Date.now() }, true);
  };

  const setFont = (k: "heading" | "body") => (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!kit) return;
    commit({ ...kit, fonts: { ...kit.fonts, [k]: e.target.value }, updatedAt: Date.now() });
  };

  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !kit) return;
    setLogoBusy(true);
    try {
      const dataUrl = await fileToLogoDataUrl(file, 512);
      commit({ ...kit, logoDataUrl: dataUrl, updatedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that image.");
    } finally {
      setLogoBusy(false);
    }
  };

  const removeLogo = () => {
    if (!kit) return;
    if (!confirmLogoRemove) {
      setConfirmLogoRemove(true);
      if (disarmRef.current) window.clearTimeout(disarmRef.current);
      disarmRef.current = window.setTimeout(() => setConfirmLogoRemove(false), 2600);
      return;
    }
    setConfirmLogoRemove(false);
    commit({ ...kit, logoDataUrl: null, updatedAt: Date.now() });
  };

  const onSaveSignature = (dataUrl: string, name?: string) => {
    if (!kit) return;
    const sigName = name || kit.identity.name || 'Signature';
    commit({
      ...kit,
      signature: {
        drawingUrl: dataUrl,
        signatureName: sigName,
        font: 'Caveat',
      },
      updatedAt: Date.now(),
    });
    try {
      localStorage.setItem('ck_creator_signature_v1', dataUrl);
    } catch {}
    setIsSigModalOpen(false);
    flash("SIGNATURE SAVED ✓");
  };

  const removeSignature = () => {
    if (!kit) return;
    if (!confirmSigRemove) {
      setConfirmSigRemove(true);
      if (disarmRef.current) window.clearTimeout(disarmRef.current);
      disarmRef.current = window.setTimeout(() => setConfirmSigRemove(false), 2600);
      return;
    }
    setConfirmSigRemove(false);
    commit({
      ...kit,
      signature: {
        drawingUrl: null,
        signatureName: '',
        font: 'Caveat',
      },
      updatedAt: Date.now(),
    });
    try {
      localStorage.removeItem('ck_creator_signature_v1');
    } catch {}
    flash("Signature removed.");
  };

  const wipeKit = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      if (disarmRef.current) window.clearTimeout(disarmRef.current);
      disarmRef.current = window.setTimeout(() => setConfirmClear(false), 2600);
      return;
    }
    clearBrandKit();
    setConfirmClear(false);
    setKit(loadBrandKit());
    flash("Brand Kit cleared.");
  };

  if (!kit) {
    return (
      <div className="tool-page-padding" style={{ minHeight: "100vh" }}>
        <div className="grid-bg" />
        <div className="tool-inner-container" style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px" }}>
          <div className="brutalist-card" style={{ padding: 40, textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
            LOADING…
          </div>
        </div>
      </div>
    );
  }

  const ready = brandKitHasAnything(kit);
  const headingFamily = kit.fonts.heading ? `'${kit.fonts.heading}', sans-serif` : undefined;
  const previewLine = (text: string) => text || "—";

  return (
    <div className="tool-page-padding" style={{ position: "relative", minHeight: "100vh", overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
      <div className="grid-bg" />
      <div className="tool-inner-container" style={{ maxWidth: 860, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>

        {/* Title */}
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 8px", border: "2px solid #000", background: "#000", color: "#fff", fontFamily: "monospace" }}>
              BRAND KIT
            </span>
            <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
              SAVE ONCE · EVERY TOOL STARTS PRE-FILLED · NEVER UPLOADED
            </span>
            {note && <span style={{ fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 900, color: "#16a34a" }}>{note}</span>}
            {error && <span style={{ fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 900, color: "#b91c1c" }}>{error}</span>}
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, textTransform: "uppercase" }}>
            Your Brand, Remembered
          </h1>
          <div style={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.6, maxWidth: 640 }}>
            These are your <strong>defaults</strong>. Invoices, receipts and future tools open with them already in place —
            and anything you change inside a document is a one-off override that never writes back here.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>

          {/* ── Live preview ── */}
          <div className="brutalist-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={15} />
              <span style={{ ...label, marginBottom: 0 }}>HOW INVOICES WILL OPEN</span>
            </div>
            <div style={{ border: "2px solid #000", background: "#fff", padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
              {kit.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kit.logoDataUrl} alt="Brand logo" style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, border: "2px dashed rgba(0,0,0,0.35)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontFamily: "monospace", fontWeight: 900, color: "#999", textAlign: "center" }}>
                  LOGO
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: headingFamily, fontWeight: 900, fontSize: "1rem", color: kit.colors.primary || "#000", lineHeight: 1.2, wordBreak: "break-word" }}>
                  {previewLine(kit.identity.name)}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#666", fontFamily: "monospace", fontWeight: 700 }}>
                  {kit.identity.handle || "handle"} · {kit.identity.location || "location"}
                </div>
              </div>
            </div>
            <div style={{ height: 6, background: kit.colors.accent || "#e5e5e5", border: "1px solid rgba(0,0,0,0.15)" }} />
            <div style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 700, color: "#555", lineHeight: 1.8 }}>
              PAY: {kit.money.momoNumber ? `${kit.money.momoNumber} · ${kit.money.momoName || kit.money.momoNetwork || "MoMo"}` : "MoMo —"}
              <br />
              BANK: {kit.money.bankAccountNumber ? `${kit.money.bankName || "Bank"} · ${kit.money.bankAccountNumber}` : "—"}
              <br />
              CURRENCY: {kit.money.currency || "—"}
              <br />
              eSIGN: {kit.signature?.drawingUrl || kit.signature?.signatureName ? "SAVED TO BRAND KIT ✓" : "—"}
            </div>
            <Link href="/business" className="brutalist-button" style={{ fontSize: "0.72rem", padding: "8px 14px", textDecoration: "none", textAlign: "center" }}>
              TRY IT IN THE BUSINESS SUITE →
            </Link>
          </div>

          {/* ── Identity ── */}
          <div className="brutalist-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Palette size={15} />
              <span style={{ ...label, marginBottom: 0 }}>IDENTITY</span>
            </div>
            <div>
              <label style={label}>YOUR NAME / BRAND</label>
              <input type="text" value={kit.identity.name} onChange={setIdentity("name")} placeholder="Kofi Creates" style={field} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={label}>HANDLE</label>
                <input type="text" value={kit.identity.handle} onChange={setIdentity("handle")} placeholder="@kofi_creates" style={field} />
              </div>
              <div>
                <label style={label}>NICHE</label>
                <input type="text" value={kit.identity.niche} onChange={setIdentity("niche")} placeholder="Tech & Lifestyle Creator" style={field} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={label}>EMAIL</label>
                <input type="email" value={kit.identity.email} onChange={setIdentity("email")} placeholder="you@example.com" style={field} />
              </div>
              <div>
                <label style={label}>PHONE</label>
                <input type="tel" value={kit.identity.phone} onChange={setIdentity("phone")} placeholder="+233 24 000 0000" style={field} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={label}>WHATSAPP</label>
                <input type="tel" value={kit.identity.whatsapp} onChange={setIdentity("whatsapp")} placeholder="+233 24 000 0000" style={field} />
              </div>
              <div>
                <label style={label}>LOCATION</label>
                <input type="text" value={kit.identity.location} onChange={setIdentity("location")} placeholder="Accra, Ghana" style={field} />
              </div>
            </div>
          </div>

          {/* ── Logo & colors ── */}
          <div className="brutalist-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ImagePlus size={15} />
              <span style={{ ...label, marginBottom: 0 }}>LOGO & COLORS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {kit.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kit.logoDataUrl} alt="Brand logo" style={{ width: 64, height: 64, objectFit: "contain", border: "2px solid #000", background: "#fff", padding: 4 }} />
              ) : (
                <div style={{ width: 64, height: 64, border: "2px dashed rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontFamily: "monospace", fontWeight: 900, color: "#999" }}>NONE</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button className="brutalist-button" disabled={logoBusy} onClick={() => logoInputRef.current?.click()} style={{ fontSize: "0.7rem", padding: "7px 12px", cursor: logoBusy ? "wait" : "pointer" }}>
                  <ImagePlus size={12} /> {logoBusy ? "PROCESSING…" : kit.logoDataUrl ? "CHANGE LOGO" : "UPLOAD LOGO"}
                </button>
                {kit.logoDataUrl && (
                  <button
                    className="brutalist-button"
                    onClick={removeLogo}
                    style={{ fontSize: "0.66rem", padding: "6px 10px", background: confirmLogoRemove ? "#b91c1c" : "#fff", color: confirmLogoRemove ? "#fff" : "#000" }}
                  >
                    <Trash2 size={11} /> {confirmLogoRemove ? "ARE YOU SURE?" : "REMOVE"}
                  </button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => void onLogoUpload(e)} style={{ display: "none" }} />
              </div>
            </div>
            <div style={{ fontSize: "0.66rem", color: "#888", fontFamily: "monospace", fontWeight: 700 }}>
              PNG TRANSPARENCY KEPT · AUTO-SHRUNK TO ≤512PX
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={label}>PRIMARY COLOR</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="color" value={kit.colors.primary || "#000000"} onChange={setColor("primary")} style={{ width: 44, height: 36, border: "2px solid #000", background: "#fff", padding: 2, cursor: "pointer" }} />
                  <input type="text" value={kit.colors.primary} onChange={setColor("primary")} placeholder="#000000" style={{ ...field, fontFamily: "monospace" }} />
                </div>
              </div>
              <div>
                <label style={label}>ACCENT COLOR</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="color" value={kit.colors.accent || "#eab308"} onChange={setColor("accent")} style={{ width: 44, height: 36, border: "2px solid #000", background: "#fff", padding: 2, cursor: "pointer" }} />
                  <input type="text" value={kit.colors.accent} onChange={setColor("accent")} placeholder="#eab308" style={{ ...field, fontFamily: "monospace" }} />
                </div>
              </div>
            </div>
            <Link href="/palette-extractor" className="brutalist-button" style={{ fontSize: "0.68rem", padding: "7px 12px", textDecoration: "none", textAlign: "center" }}>
              PULL COLORS FROM A PHOTO →
            </Link>
          </div>

          {/* ── Fonts ── */}
          <div className="brutalist-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...label, marginBottom: 0 }}>FONTS</span>
            </div>
            <div>
              <label style={label}>HEADING FONT</label>
              <select value={kit.fonts.heading} onChange={setFont("heading")} style={field}>
                <option value="">— none saved —</option>
                {GOOGLE_FONTS_LIST.map((f) => (
                  <option key={`bk-h-${f.id}`} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>BODY FONT</label>
              <select value={kit.fonts.body} onChange={setFont("body")} style={field}>
                <option value="">— none saved —</option>
                {GOOGLE_FONTS_LIST.map((f) => (
                  <option key={`bk-b-${f.id}`} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: "0.66rem", color: "#888", fontFamily: "monospace", fontWeight: 700 }}>
              USED BY INVOICES, RECEIPTS & FUTURE DESIGN TOOLS
            </div>
          </div>

          {/* ── Electronic Signature ── */}
          <div className="brutalist-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PenTool size={15} />
              <span style={{ ...label, marginBottom: 0 }}>ELECTRONIC SIGNATURE (eSIGN)</span>
            </div>
            <div
              style={{
                border: "2px solid #000",
                background: "#fafafa",
                padding: "12px 14px",
                minHeight: 74,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {kit.signature?.drawingUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={kit.signature.drawingUrl}
                  alt="Saved electronic signature"
                  style={{ maxHeight: 54, maxWidth: "100%", objectFit: "contain" }}
                />
              ) : kit.signature?.signatureName ? (
                <span
                  style={{
                    fontFamily: "Caveat, cursive, sans-serif",
                    fontSize: "30px",
                    color: "#0f172a",
                    transform: "rotate(-2deg)",
                    display: "inline-block",
                  }}
                >
                  {kit.signature.signatureName}
                </span>
              ) : (
                <div style={{ fontSize: "0.66rem", fontFamily: "monospace", fontWeight: 800, color: "#9ca3af", textAlign: "center" }}>
                  NO SIGNATURE SAVED · TAP BELOW TO DRAW OR TYPE
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="brutalist-button"
                onClick={() => setIsSigModalOpen(true)}
                style={{ fontSize: "0.7rem", padding: "7px 12px", flex: 1 }}
              >
                <PenTool size={12} /> {kit.signature?.drawingUrl || kit.signature?.signatureName ? "CHANGE SIGNATURE" : "DRAW / CREATE SIGNATURE"}
              </button>
              {(kit.signature?.drawingUrl || kit.signature?.signatureName) && (
                <button
                  type="button"
                  className="brutalist-button"
                  onClick={removeSignature}
                  style={{
                    fontSize: "0.66rem",
                    padding: "6px 10px",
                    background: confirmSigRemove ? "#b91c1c" : "#fff",
                    color: confirmSigRemove ? "#fff" : "#000",
                  }}
                >
                  <Trash2 size={11} /> {confirmSigRemove ? "CONFIRM REMOVE?" : "REMOVE"}
                </button>
              )}
            </div>
            <div style={{ fontSize: "0.64rem", color: "#666", fontFamily: "monospace", fontWeight: 700, lineHeight: 1.4 }}>
              SAVED TO BRAND KIT · AUTO-SIGNS YOUR INVOICES, AGREEMENTS & UPLOADED CONTRACTS
            </div>
          </div>

          {/* ── Payment details ── */}
          <div className="brutalist-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={15} />
              <span style={{ ...label, marginBottom: 0 }}>PAYMENT DETAILS — WHAT CLIENTS SEE ON EVERY INVOICE</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              <div>
                <label style={label}>CURRENCY</label>
                <select value={kit.money.currency} onChange={setMoney("currency")} style={field}>
                  <option value="">— none saved —</option>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>MOMO NETWORK</label>
                <input type="text" value={kit.money.momoNetwork} onChange={setMoney("momoNetwork")} placeholder="MTN Mobile Money" style={field} />
              </div>
              <div>
                <label style={label}>MOMO NUMBER</label>
                <input type="text" inputMode="tel" value={kit.money.momoNumber} onChange={setMoney("momoNumber")} placeholder="024 123 4567" style={field} />
              </div>
              <div>
                <label style={label}>REGISTERED MOMO NAME</label>
                <input type="text" value={kit.money.momoName} onChange={setMoney("momoName")} placeholder="Kofi Mensah" style={field} />
              </div>
              <div>
                <label style={label}>BANK NAME</label>
                <input type="text" value={kit.money.bankName} onChange={setMoney("bankName")} placeholder="Stanbic Bank Ghana" style={field} />
              </div>
              <div>
                <label style={label}>ACCOUNT NUMBER</label>
                <input type="text" inputMode="numeric" value={kit.money.bankAccountNumber} onChange={setMoney("bankAccountNumber")} placeholder="9040001234567" style={field} />
              </div>
              <div>
                <label style={label}>ACCOUNT NAME</label>
                <input type="text" value={kit.money.bankAccountName} onChange={setMoney("bankAccountName")} placeholder="Kofi Creates Ltd" style={field} />
              </div>
              <div>
                <label style={label}>PAYSTACK / PAYMENT LINK</label>
                <input type="url" value={kit.money.paystackLink} onChange={setMoney("paystackLink")} placeholder="https://paystack.shop/…" style={field} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Privacy + portability + danger ── */}
        <div className="brutalist-card" style={{ padding: 18, marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.6 }}>
              Lives <strong>only on this device</strong> — nothing here is ever uploaded. Changing phones?{" "}
              <Link href="/your-data" style={{ color: "#000", fontWeight: 800, textDecoration: "none", borderBottom: "2px solid #000" }}>
                Your Data → Move to a new phone
              </Link>{" "}
              carries your Brand Kit with everything else, encrypted with your PIN.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: "2px solid rgba(0,0,0,0.1)", paddingTop: 10 }}>
            <button
              className="brutalist-button"
              onClick={wipeKit}
              disabled={!ready}
              style={{ fontSize: "0.7rem", padding: "8px 12px", background: confirmClear ? "#b91c1c" : "#fff", color: confirmClear ? "#fff" : "#000", cursor: ready ? "pointer" : "not-allowed" }}
            >
              <Trash2 size={12} /> {confirmClear ? "ARE YOU SURE YOU WANT TO CLEAR YOUR BRAND KIT?" : "CLEAR BRAND KIT"}
            </button>
            <span style={{ fontSize: "0.66rem", color: "#999", fontFamily: "monospace", fontWeight: 700 }}>
              EVERYTHING ABOVE STAYS ON THIS DEVICE UNTIL YOU MOVE IT.
            </span>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/your-data" className="brutalist-button" style={{ fontSize: "0.78rem", padding: "8px 16px", textDecoration: "none" }}>
            ‹ YOUR DATA
          </Link>
        </div>

        <CreatorSignatureModal
          isOpen={isSigModalOpen}
          onClose={() => setIsSigModalOpen(false)}
          initialName={kit.identity.name || "Kofi Mensah"}
          onSave={onSaveSignature}
        />
      </div>
    </div>
  );
}
