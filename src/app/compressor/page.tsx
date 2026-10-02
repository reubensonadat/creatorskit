"use client";

/**
 * COMPRESS & CONVERT — the format hub (docs/TOOL_INTEGRATION_PLAN.md §9).
 *
 * Conversion matrix, all on-device:
 *   PDF  → PNG / JPG / WebP   (pdfjs-dist, lazy — renders every page)
 *   IMG/SVG → PNG / JPG / WebP (Canvas)
 *   IMG/SVG → PDF              (pdf-lib, lazy)
 *
 * Rules from the plan: engines never sit in the page bundle (dynamic import
 * on first use) · estimated output size BEFORE committing · batch 5+ with
 * per-file progress · everything stays on-device.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Download, FolderDown, X, FileText, Zap } from "lucide-react";
import NextStepRow from "@/components/NextStepRow";
import { putHandoffImage, takeHandoffImage } from "@/lib/tool-handoff";
import { TactileScrubber } from "@/components/tactile-scrubber";
import { loadAssets, loadState, saveAssets, saveState } from "@/lib/local-memory";

type TargetFmt = "image/png" | "image/jpeg" | "image/webp" | "image/avif" | "application/pdf";

interface OutFile {
    name: string;
    blob: Blob;
}

type ItemKind = "image" | "pdf" | "svg";

interface Item {
    id: string;
    file: File;
    kind: ItemKind;
    /** page count for PDFs (filled lazily by the estimator) */
    pages?: number;
    /** estimated total output bytes for the CURRENT settings signature */
    est?: number;
    estFor?: string;
    outs?: OutFile[];
    busy?: boolean;
    status?: string;
    error?: string;
}

const EXT: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
    "application/pdf": "pdf",
};

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function baseName(name: string): string {
    const i = name.lastIndexOf(".");
    return i > 0 ? name.slice(0, i) : name;
}

/** Decode any image (incl. SVG) to an HTMLImageElement. */
function loadImageEl(src: File | Blob | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = typeof src === "string" ? src : URL.createObjectURL(src);
        const img = new Image();
        img.onload = () => {
            if (typeof src !== "string") URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            if (typeof src !== "string") URL.revokeObjectURL(url);
            reject(new Error("Could not decode image"));
        };
        img.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, fmt: TargetFmt, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error(`Your browser can't encode ${fmt}`))),
            fmt,
            fmt === "image/png" || fmt === "application/pdf" ? undefined : quality
        );
    });
}

/** Rasterize a decoded image to the target format blob. */
async function rasterize(
    img: HTMLImageElement,
    fmt: TargetFmt,
    quality: number
): Promise<{ blob: Blob; width: number; height: number }> {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, img.naturalWidth || 1024);
    canvas.height = Math.max(1, img.naturalHeight || 1024);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context failed");
    if (fmt === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF"; // JPG has no alpha — flatten onto white
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { blob: await canvasToBlob(canvas, fmt, quality), width: canvas.width, height: canvas.height };
}

/** pdfjs-dist — lazy-loaded, worker served from /public (v-matched copy). */
async function getPdfjs() {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return pdfjs;
}

/** Render every page of a PDF to image blobs at the given scale. */
async function pdfToImages(file: File, fmt: TargetFmt, quality: number, scale: number): Promise<OutFile[]> {
    const pdfjs = await getPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    const outs: OutFile[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");
        if (fmt === "image/jpeg") {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        await page.render({ canvas, viewport }).promise;
        const blob = await canvasToBlob(canvas, fmt, quality);
        outs.push({ name: `${baseName(file.name)}-p${String(p).padStart(2, "0")}.${EXT[fmt]}`, blob });
    }
    return outs;
}

/** pdf-lib — lazy-loaded. Embeds PNG/JPG natively; anything else rasterizes to PNG first. */
async function imageToPdf(file: File, kind: ItemKind): Promise<OutFile> {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const type = file.type || (kind === "svg" ? "image/svg+xml" : "");

    let embedded;
    if (type === "image/png") {
        embedded = await pdf.embedPng(await file.arrayBuffer());
    } else if (type === "image/jpeg" || type === "image/jpg") {
        embedded = await pdf.embedJpg(await file.arrayBuffer());
    } else {
        // webp / svg / gif … → rasterize to PNG, then embed
        const img = await loadImageEl(file);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, img.naturalWidth || 1024);
        canvas.height = Math.max(1, img.naturalHeight || 1024);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        embedded = await pdf.embedPng(dataUrl);
    }
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    const bytes = await pdf.save();
    return {
        name: `${baseName(file.name)}.pdf`,
        blob: new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
    };
}

export default function CompressorPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [target, setTarget] = useState<TargetFmt>("image/webp");
    const [quality, setQuality] = useState(0.8);
    const [pdfScale, setPdfScale] = useState(1.5);
    const [isDragging, setIsDragging] = useState(false);
    const [converting, setConverting] = useState(false);
    const [note, setNote] = useState("");

    const fileRef = useRef<HTMLInputElement>(null);
    const hydratedRef = useRef(false);

    /** AVIF encoding support — feature-detected once (plan: "± AVIF where supported"). */
    const avifSupported = useMemo(() => {
        if (typeof document === "undefined") return false;
        try {
            const c = document.createElement("canvas");
            c.width = 2;
            c.height = 2;
            return c.toDataURL("image/avif").startsWith("data:image/avif");
        } catch {
            return false;
        }
    }, []);

    const settingsKey = `${target}|${quality}|${pdfScale}`;
    const hasPdf = items.some((i) => i.kind === "pdf");

    const targets: { fmt: TargetFmt; label: string }[] = [
        { fmt: "image/webp", label: "WEBP" },
        { fmt: "image/jpeg", label: "JPG" },
        { fmt: "image/png", label: "PNG" },
        ...(avifSupported ? [{ fmt: "image/avif" as TargetFmt, label: "AVIF" }] : []),
        { fmt: "application/pdf", label: "PDF" },
    ];

    const classify = (file: File): ItemKind | null => {
        const name = file.name.toLowerCase();
        if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
        if (file.type === "image/svg+xml" || name.endsWith(".svg")) return "svg";
        if (file.type.startsWith("image/")) return "image";
        return null;
    };

    const addFiles = useCallback((files: FileList | File[] | null) => {
        if (!files) return;
        const next: Item[] = [];
        for (const f of Array.from(files)) {
            const kind = classify(f);
            if (!kind) continue;
            next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file: f, kind });
        }
        if (next.length === 0) return;
        setItems((prev) => [...prev, ...next]);
        setNote("");
    }, []);

    // Phase 7.1 + §4 cross-tool intake — restore the last queue + settings
    // from local memory (on-device only), then let a pending hand-off image
    // (from watermark / carousel-slicer / resizer) append on top.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const stored = await loadAssets("compressor");
                if (stored.length > 0) {
                    const restored: Item[] = [];
                    for (const mem of stored) {
                        const f = new File([mem.blob], mem.name ?? "file", { type: mem.blob.type });
                        const kind = classify(f);
                        if (!kind) continue;
                        restored.push({ id: `mem-${mem.slot}`, file: f, kind });
                    }
                    if (!cancelled && restored.length > 0) setItems(restored);
                }
                const saved = await loadState<{ target: TargetFmt; quality: number; pdfScale: number }>("compressor");
                if (!cancelled && saved) {
                    setTarget(saved.state.target);
                    setQuality(saved.state.quality);
                    setPdfScale(saved.state.pdfScale);
                }
            } catch {
                /* private mode / unavailable — memory is optional */
            }
            hydratedRef.current = true;
            const rec = await takeHandoffImage("compressor");
            if (cancelled || !rec || !rec.blob.type.startsWith("image/")) return;
            addFiles([new File([rec.blob], rec.name ?? "handoff-image", { type: rec.blob.type })]);
        })();
        return () => { cancelled = true; };
    }, [addFiles]);

    // Phase 7.1 — the queue survives app close (IndexedDB, on-device only).
    // A deliberate clear (CLEAR ALL / removing every file) persists too:
    // memory mirrors the visible queue.
    useEffect(() => {
        if (!hydratedRef.current) return; // never wipe before the restore lands
        void saveAssets(
            "compressor",
            "Convert & Compress",
            items.map((it, i) => ({ slot: String(i), blob: it.file, name: it.file.name }))
        );
    }, [items]);

    // Phase 7.1 — settings persist alongside the queue.
    useEffect(() => {
        if (!hydratedRef.current) return;
        void saveState("compressor", "Convert & Compress", { target, quality, pdfScale });
    }, [target, quality, pdfScale]);

    const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

    const clearAll = () => {
        setItems([]);
        setNote("");
    };

    const patchItem = (id: string, patch: Partial<Item>) =>
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

    /** Rough output-size estimate for one item under the current settings. */
    const estimateItem = async (item: Item): Promise<{ est: number; pages?: number }> => {
        if (target === "application/pdf") {
            if (item.kind === "pdf") return { est: item.file.size }; // passthrough copy
            // rasterize → embed: PDF adds ~1-3% wrapper around a PNG of the pixels
            const img = await loadImageEl(item.file);
            const { blob } = await rasterize(img, "image/png", quality);
            return { est: Math.round(blob.size * 1.02) };
        }
        if (item.kind === "pdf") {
            // render page 1 at half scale, extrapolate over the page count
            const pdfjs = await getPdfjs();
            const data = new Uint8Array(await item.file.arrayBuffer());
            const doc = await pdfjs.getDocument({ data }).promise;
            const page = await doc.getPage(1);
            const viewport = page.getViewport({ scale: pdfScale * 0.5 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context failed");
            await page.render({ canvas, viewport }).promise;
            const one = await canvasToBlob(canvas, target, quality);
            return { est: one.size * doc.numPages, pages: doc.numPages };
        }
        const img = await loadImageEl(item.file);
        const { blob } = await rasterize(img, target, quality);
        return { est: blob.size };
    };

    /** Debounced: keep every item's estimate fresh for the current settings. */
    useEffect(() => {
        if (items.length === 0) return;
        let cancelled = false;
        const t = setTimeout(async () => {
            for (const item of items) {
                if (cancelled) return;
                if (item.estFor === settingsKey && item.est !== undefined) continue;
                try {
                    const { est, pages } = await estimateItem(item);
                    if (cancelled) return;
                    patchItem(item.id, { est, estFor: settingsKey, pages, error: undefined });
                } catch {
                    if (cancelled) return;
                    patchItem(item.id, { est: undefined, estFor: settingsKey, error: "Could not read file" });
                }
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.map((i) => i.id).join(","), settingsKey]);

    const convertItem = async (item: Item): Promise<OutFile[]> => {
        if (target === "application/pdf") {
            if (item.kind === "pdf") return [{ name: item.file.name, blob: item.file }];
            return [await imageToPdf(item.file, item.kind)];
        }
        if (item.kind === "pdf") {
            return await pdfToImages(item.file, target, quality, pdfScale);
        }
        const img = await loadImageEl(item.file);
        const { blob } = await rasterize(img, target, quality);
        return [{ name: `${baseName(item.file.name)}.${EXT[target]}`, blob }];
    };

    const convertAll = async () => {
        if (items.length === 0 || converting) return;
        setConverting(true);
        setNote("");
        let ok = 0;
        let failed = 0;
        let outFiles = 0;
        try {
            for (const item of items) {
                patchItem(item.id, { busy: true, status: "Working…", error: undefined, outs: undefined });
                try {
                    const outs = await convertItem(item);
                    outFiles += outs.length;
                    ok++;
                    patchItem(item.id, {
                        busy: false,
                        status: outs.length > 1 ? `${outs.length} files ready` : "Ready",
                        outs,
                    });
                } catch (err) {
                    failed++;
                    patchItem(item.id, {
                        busy: false,
                        status: undefined,
                        error: err instanceof Error ? err.message : "Conversion failed",
                    });
                }
            }
            setNote(`${ok} converted · ${outFiles} files${failed ? ` · ${failed} failed` : ""}.`);
        } finally {
            setConverting(false);
        }
    };

    const downloadBlob = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    };

    const downloadItem = (item: Item) => {
        if (!item.outs || item.outs.length === 0) return;
        if (item.outs.length === 1) {
            downloadBlob(item.outs[0].blob, item.outs[0].name);
            return;
        }
        downloadAll([{ name: baseName(item.file.name), outs: item.outs }]);
    };

    const downloadAll = async (source?: { name: string; outs: OutFile[] }[]) => {
        const ready = (source ?? items)
            .filter((i) => "outs" in i && i.outs && i.outs.length > 0)
            .map((i) => ({ name: baseName((i as Item).file.name), outs: (i as Item).outs! }));
        if (ready.length === 0) return;
        if (ready.length === 1 && ready[0].outs.length === 1) {
            downloadBlob(ready[0].outs[0].blob, ready[0].outs[0].name);
            return;
        }
        setNote("Zipping…");
        try {
            const JSZip = (await import("jszip")).default; // lazy per §7 — never in the page bundle
            const zip = new JSZip();
            for (const r of ready) {
                if (r.outs.length === 1) {
                    zip.file(r.outs[0].name, r.outs[0].blob);
                } else {
                    const folder = zip.folder(r.name) ?? zip;
                    r.outs.forEach((o) => folder.file(o.name, o.blob));
                }
            }
            const blob = await zip.generateAsync({ type: "blob" });
            downloadBlob(blob, `creatorskit-convert-${ready.length}-files.zip`);
            setNote("ZIP saved.");
        } catch {
            setNote("ZIP failed — try downloading files individually.");
        }
    };

    const totalIn = items.reduce((a, i) => a + i.file.size, 0);
    const estTotal = items.reduce((a, i) => a + (i.est ?? 0), 0);
    const readyCount = items.filter((i) => i.outs && i.outs.length > 0).length;
    const savings = totalIn > 0 && estTotal > 0 ? Math.round((1 - estTotal / totalIn) * 100) : 0;

    /** Cross-tool hand-off (§4): stash the FIRST converted output for the next tool. */
    const handoffFirst = async (href: string) => {
        const out = items.find((i) => i.outs && i.outs.length > 0)?.outs?.[0];
        if (!out) return;
        try {
            await putHandoffImage(href.replace(/^\//, ""), out.blob, { sourceTool: "compressor", name: out.name });
        } catch {
            /* best-effort — the target tool still opens */
        }
    };

    return (
        <div className="tool-page-padding" style={{ position: "relative", minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
            <div className="grid-bg" />

            <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Title */}
                <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 8px", border: "2px solid #000", background: "#000", color: "#fff", fontFamily: "monospace" }}>
                            COMPRESS & CONVERT
                        </span>
                        <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
                            PDF ⇄ PNG ⇄ JPG ⇄ WEBP · SIZE ESTIMATES BEFORE YOU COMMIT · ZERO UPLOAD
                        </span>
                    </div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, textTransform: "uppercase" }}>
                        Compress & Convert
                    </h1>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#444", maxWidth: 640 }}>
                        Turn PDFs into images, images into PDFs, or squeeze everything into WebP/JPG — right in your
                        browser. Batch as many files as you want; the estimated output size is shown before anything is saved.
                    </p>
                </div>

                {/* Drop zone */}
                {items.length === 0 ? (
                    <div
                        onDragEnter={() => setIsDragging(true)}
                        onDragLeave={() => setIsDragging(false)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            addFiles(e.dataTransfer.files);
                        }}
                        onClick={() => fileRef.current?.click()}
                        className="brutalist-card"
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "80px 40px",
                            textAlign: "center",
                            cursor: "pointer",
                            border: `4px dashed ${isDragging ? "var(--accent)" : "#000000"}`,
                            background: isDragging ? "rgba(37, 99, 235, 0.02)" : "#ffffff",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <div
                            style={{
                                width: 72,
                                height: 72,
                                border: "3px solid #000000",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: 24,
                                background: "#ffffff",
                                boxShadow: "4px 4px 0 #000000",
                            }}
                        >
                            <ImageIcon size={32} style={{ color: "#000" }} />
                        </div>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
                            Drop images or PDFs here
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "#555", margin: 0 }}>
                            PNG · JPG · WebP · SVG · PDF — batch friendly, unlimited count
                        </p>
                        <p style={{ fontSize: "0.72rem", color: "#888", margin: "10px 0 0", fontFamily: "monospace" }}>
                            100% ON-DEVICE · YOUR FILES NEVER LEAVE THIS TAB
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                        {/* Settings */}
                        <div className="brutalist-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 900, letterSpacing: "0.05em" }}>
                                    CONVERT TO
                                </span>
                                {targets.map((t) => {
                                    const disabled =
                                        (t.fmt === "application/pdf" && items.length > 0 && items.every((i) => i.kind === "pdf")) ||
                                        t.fmt === target;
                                    return (
                                        <button
                                            key={t.fmt}
                                            type="button"
                                            className="brutalist-button"
                                            disabled={disabled}
                                            onClick={() => setTarget(t.fmt)}
                                            style={{
                                                padding: "6px 12px",
                                                fontSize: "0.7rem",
                                                fontFamily: "monospace",
                                                fontWeight: 900,
                                                background: target === t.fmt ? "#000" : "#fff",
                                                color: target === t.fmt ? "#fff" : "#000",
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {(target === "image/jpeg" || target === "image/webp" || target === "image/avif") && (
                                <TactileScrubber
                                    label="Quality"
                                    min={30}
                                    max={95}
                                    step={1}
                                    value={Math.round(quality * 100)}
                                    onChange={(v) => setQuality(v / 100)}
                                    formatValue={(v) => `${v}%`}
                                    presets={[50, 70, 80, 95]}
                                />
                            )}

                            {hasPdf && target !== "application/pdf" && (
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 900, letterSpacing: "0.05em" }}>
                                        PDF RENDER SCALE
                                    </span>
                                    {[
                                        [1, "1× SHARP"],
                                        [1.5, "1.5× CRISP"],
                                        [2, "2× PRINT"],
                                    ].map(([s, label]) => (
                                        <button
                                            key={s}
                                            type="button"
                                            className="brutalist-button"
                                            onClick={() => setPdfScale(s as number)}
                                            style={{
                                                padding: "5px 10px",
                                                fontSize: "0.66rem",
                                                fontFamily: "monospace",
                                                fontWeight: 900,
                                                background: pdfScale === s ? "#000" : "#fff",
                                                color: pdfScale === s ? "#fff" : "#000",
                                            }}
                                        >
                                            {label as string}
                                        </button>
                                    ))}
                                    <span style={{ fontSize: "0.66rem", color: "#666", fontFamily: "monospace" }}>
                                        every PDF page becomes its own image
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* File list */}
                        <div className="brutalist-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, maxHeight: "42vh", overflowY: "auto" }}>
                            {items.map((item) => {
                                const estDelta =
                                    item.est !== undefined && item.est > 0
                                        ? Math.round((1 - item.est / item.file.size) * 100)
                                        : null;
                                return (
                                    <div
                                        key={item.id}
                                        className="compressor-file-row"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "8px 10px",
                                            border: "2px solid #000",
                                            background: item.error ? "#fee2e2" : "#fafafa",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <span className="compressor-file-name" style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 2, fontSize: "0.78rem", fontWeight: 700 }}>
                                            {item.kind === "pdf" ? <FileText size={15} /> : <ImageIcon size={15} />}
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {item.file.name}
                                            </span>
                                            {item.kind === "pdf" && item.pages ? (
                                                <span style={{ fontSize: "0.64rem", color: "#666", fontFamily: "monospace" }}>· {item.pages} PAGES</span>
                                            ) : null}
                                        </span>
                                        <span className="compressor-file-size" style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#555", flex: 1, minWidth: 0 }}>
                                            {formatBytes(item.file.size)} →{" "}
                                            {item.busy ? (
                                                "…"
                                            ) : item.error ? (
                                                <span style={{ color: "#b91c1c" }}>{item.error}</span>
                                            ) : item.est !== undefined ? (
                                                <span style={{ fontWeight: 800, color: estDelta && estDelta > 0 ? "#059669" : "#b45309" }}>
                                                    ≈ {formatBytes(item.est)}
                                                    {estDelta !== null ? ` (${estDelta > 0 ? "−" : "+"}${Math.abs(estDelta)}%)` : ""}
                                                </span>
                                            ) : (
                                                "estimating…"
                                            )}
                                        </span>
                                        {item.outs && item.outs.length > 0 && !item.busy ? (
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                onClick={() => downloadItem(item)}
                                                style={{ padding: "4px 10px", fontSize: "0.64rem", display: "flex", alignItems: "center", gap: 5 }}
                                            >
                                                <Download size={13} /> {item.outs.length > 1 ? `${item.outs.length} FILES` : "SAVE"}
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: "0.64rem", fontFamily: "monospace", color: item.busy ? "#000" : "#999", minWidth: 60 }}>
                                                {item.busy ? item.status ?? "…" : item.status ?? ""}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            title="Remove"
                                            style={{ border: "none", background: "none", cursor: "pointer", display: "flex", padding: 2, color: "#000" }}
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="brutalist-button"
                                style={{ padding: "6px 12px", fontSize: "0.68rem", alignSelf: "flex-start" }}
                            >
                                + ADD MORE FILES
                            </button>
                        </div>

                        {/* Stats + actions */}
                        <div className="brutalist-card" style={{ padding: 16, display: "flex", gap: 20, justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                                {[
                                    [`${items.length}`, "FILES QUEUED"],
                                    [formatBytes(totalIn), "TOTAL IN"],
                                    [`≈ ${formatBytes(estTotal)}`, "ESTIMATED OUT"],
                                    [`${savings > 0 ? "−" : ""}${Math.abs(savings)}%`, "EST. SAVINGS"],
                                ].map(([v, l]) => (
                                    <div key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        <span style={{ fontSize: "1.15rem", fontWeight: 900, fontFamily: "monospace" }}>{v}</span>
                                        <span style={{ fontSize: "0.6rem", fontFamily: "monospace", color: "#666", letterSpacing: "0.05em" }}>{l}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                {note && (
                                    <span style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#444" }}>{note}</span>
                                )}
                                <button type="button" className="brutalist-button" onClick={clearAll} disabled={converting} style={{ padding: "9px 14px", fontSize: "0.72rem" }}>
                                    CLEAR
                                </button>
                                <button
                                    type="button"
                                    className="brutalist-button"
                                    disabled={readyCount === 0 || converting}
                                    onClick={() => void downloadAll()}
                                    style={{ padding: "9px 14px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 6 }}
                                >
                                    <FolderDown size={15} /> DOWNLOAD ALL {readyCount > 0 ? `(${readyCount})` : ""}
                                </button>
                                <button
                                    type="button"
                                    className="brutalist-button brutalist-button-primary"
                                    disabled={converting || items.length === 0}
                                    onClick={() => void convertAll()}
                                    style={{ padding: "9px 16px", fontSize: "0.74rem", display: "flex", alignItems: "center", gap: 6 }}
                                >
                                    <Zap size={15} /> {converting ? "CONVERTING…" : `CONVERT ${items.length} FILE${items.length === 1 ? "" : "S"}`}
                                </button>
                            </div>
                        </div>

                        {readyCount > 0 && (
                            <NextStepRow
                                currentHref="/compressor"
                                heading="CONVERTED — KEEP GOING"
                                onDownload={() => void downloadAll()}
                                downloadLabel="ZIP"
                                onBeforeNavigate={(href) => handoffFirst(href)}
                            />
                        )}

                        <p style={{ fontSize: "0.68rem", color: "#888", fontFamily: "monospace", margin: 0, textAlign: "center" }}>
                            ESTIMATES ARE COMPUTED LOCALLY BY RENDERING EACH FILE — EXACT BYTES APPEAR AFTER CONVERSION ·
                            PDF ENGINE (pdf.js) & PDF WRITER (pdf-lib) LOAD ONLY WHEN FIRST NEEDED
                        </p>
                    </div>
                )}

                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf,.svg"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                        addFiles(e.target.files);
                        e.currentTarget.value = "";
                    }}
                />
            </div>
        </div>
    );
}
