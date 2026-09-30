'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    UploadCloud,
    Download,
    RefreshCw,
    ImageOff,
    Cpu,
    Server,
    ArrowRight,
    Layers,
    LayoutGrid,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import {
    removeBackgroundBrowser,
    removeBackgroundServer,
    BROWSER_MODELS,
    type MatteEngine,
    type MatteProgress,
    type BrowserModel,
} from '@/lib/background-removal';
import { putHandoffImage } from '@/lib/tool-handoff';

/**
 * Native Background Remover — replaces the old 5-second redirect bridge to
 * fileconv.online. Same engine stack as /text-behind:
 *
 *   CUT ON MY DEVICE  → @imgly isnet via /api/imgly proxy (free, private,
 *                       engine kept in IndexedDB after first use — shared
 *                       with /text-behind, survives cache eviction)
 *   CUT ON SERVER     → Render worker /matte (rembg u2netp, any subject)
 *
 * Results hand off to /text-behind (cutout) or /thumbnail-lab (original)
 * without a download → re-upload round trip.
 */

const MODE_KEY = 'ck_bgrem_mode_v1';
/** Engine quality choice — same key as /text-behind so the two tools stay in sync. */
const QUALITY_KEY = 'ck_bgrem_quality_v1';
type CutMode = MatteEngine;

const CHECKERBOARD: React.CSSProperties = {
    backgroundColor: '#fff',
    backgroundImage:
        'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
};

/* ── result persistence (IndexedDB, survives reload + cache eviction) ──
 * The last original + cutout pair is saved the moment a cut succeeds, so a
 * reload re-shows your prior work before you upload a new photo. */
const RESULT_DB = 'ck_bgrem';
const RESULT_STORE = 'images';
const ENGINE_KEY = 'ck_bgrem_engine_v1';

function resultDbOpen(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = window.indexedDB.open(RESULT_DB, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(RESULT_STORE)) req.result.createObjectStore(RESULT_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function resultPut(key: 'original' | 'cutout', blob: Blob): Promise<void> {
    try {
        const db = await resultDbOpen();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(RESULT_STORE, 'readwrite');
            tx.objectStore(RESULT_STORE).put(blob, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch {
        /* persistence is best-effort — never block the cut */
    }
}

async function resultGet(key: 'original' | 'cutout'): Promise<Blob | null> {
    try {
        const db = await resultDbOpen();
        const blob = await new Promise<Blob | null>((resolve) => {
            const get = db.transaction(RESULT_STORE, 'readonly').objectStore(RESULT_STORE).get(key);
            get.onsuccess = () => resolve(get.result instanceof Blob ? get.result : null);
            get.onerror = () => resolve(null);
        });
        db.close();
        return blob;
    } catch {
        return null;
    }
}

export default function BackgroundRemoverPage() {
    const [mode, setMode] = useState<CutMode>('browser');
    const [browserModel, setBrowserModel] = useState<BrowserModel>('isnet_quint8');
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
    const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [percent, setPercent] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [doneWith, setDoneWith] = useState<MatteEngine | null>(null);
    const [preview, setPreview] = useState<'cutout' | 'original'>('cutout');
    const [dropActive, setDropActive] = useState(false);
    const [isNarrow, setIsNarrow] = useState(false);

    // mobile layout — stack the stage above the controls below 900px
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 900px)');
        const update = () => setIsNarrow(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const runIdRef = useRef(0);

    // restore preferred mode
    useEffect(() => {
        const saved = window.localStorage.getItem(MODE_KEY);
        if (saved === 'browser' || saved === 'server') setMode(saved);
    }, []);
    useEffect(() => {
        window.localStorage.setItem(MODE_KEY, mode);
    }, [mode]);

    // restore + persist engine quality (shared with /text-behind)
    useEffect(() => {
        const saved = window.localStorage.getItem(QUALITY_KEY);
        if (saved === 'isnet_quint8' || saved === 'isnet_fp16' || saved === 'isnet') setBrowserModel(saved);
    }, []);
    useEffect(() => {
        window.localStorage.setItem(QUALITY_KEY, browserModel);
    }, [browserModel]);

    // revoke object URLs when replaced/unmount
    useEffect(() => {
        return () => {
            if (originalUrl) URL.revokeObjectURL(originalUrl);
            if (cutoutUrl) URL.revokeObjectURL(cutoutUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const runCut = useCallback(async (file: File, engine: CutMode) => {
        const runId = ++runIdRef.current;
        setBusy(true);
        setError(null);
        setCutoutBlob(null);
        setCutoutUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setStatusText(engine === 'server' ? 'Connecting to CreatorKit Server…' : 'Preparing…');
        setPercent(0);

        const onProgress: MatteProgress = (stage, message, pct) => {
            if (runIdRef.current !== runId) return;
            setStatusText(message);
            // monotonic: the engine reports per-file, so a raw percent jumps
            // 100 → 5 when the next file starts — never walk the bar backwards
            setPercent((prev) => Math.max(prev, pct));
        };

        try {
            const out =
                engine === 'server'
                    ? await removeBackgroundServer(file, onProgress)
                    : await removeBackgroundBrowser(file, onProgress, browserModel);
            if (runIdRef.current !== runId) return;
            setCutoutBlob(out);
            setCutoutUrl(URL.createObjectURL(out));
            setDoneWith(engine);
            setPreview('cutout');
            setStatusText('');
            // persist the pair so a reload re-shows this work
            void resultPut('original', file);
            void resultPut('cutout', out);
            try {
                window.localStorage.setItem(ENGINE_KEY, engine);
            } catch {
                /* non-fatal */
            }
        } catch (err) {
            if (runIdRef.current !== runId) return;
            setError(err instanceof Error ? err.message : String(err));
            setStatusText('');
        } finally {
            if (runIdRef.current === runId) setBusy(false);
        }
    }, [browserModel]);

    // restore the last saved original + cutout pair on reload — you see your
    // previous work first, then hit NEW PHOTO when ready for the next one
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [original, cutout] = await Promise.all([resultGet('original'), resultGet('cutout')]);
            if (cancelled || !original || !cutout) return;
            setOriginalFile(new File([original], 'original', { type: original.type || 'image/png' }));
            setOriginalUrl(URL.createObjectURL(original));
            setCutoutBlob(cutout);
            setCutoutUrl(URL.createObjectURL(cutout));
            setPreview('cutout');
            const savedEngine = window.localStorage.getItem(ENGINE_KEY);
            if (savedEngine === 'browser' || savedEngine === 'server') setDoneWith(savedEngine);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleFile = useCallback(
        (file: File | null) => {
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                setError('That file is not an image — drop a photo (PNG, JPG or WebP).');
                return;
            }
            const prevUrl = originalUrl;
            setOriginalFile(file);
            setOriginalUrl(URL.createObjectURL(file));
            setError(null);
            if (prevUrl) URL.revokeObjectURL(prevUrl);
            // seamless: the cut starts itself the moment a photo lands
            runCut(file, mode);
        },
        [mode, originalUrl, runCut],
    );

    // paste support (Ctrl+V a screenshot straight in)
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
            const file = item?.getAsFile();
            if (file) handleFile(file);
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [handleFile]);

    const handleDownload = () => {
        if (!cutoutUrl) return;
        const a = document.createElement('a');
        a.href = cutoutUrl;
        a.download = 'creatorskit-cutout.png';
        a.click();
    };

    const sendToTextBehind = async () => {
        if (!cutoutBlob) return;
        await putHandoffImage('text-behind', cutoutBlob, { sourceTool: 'background-remover' });
        window.open('/text-behind', '_blank');
    };

    const sendToThumbnailLab = async () => {
        if (!originalFile) return;
        await putHandoffImage('thumbnail-lab', originalFile, { sourceTool: 'background-remover' });
        window.open('/thumbnail-lab', '_blank');
    };

    const hasResult = cutoutUrl !== null;
    const shownUrl = preview === 'cutout' ? cutoutUrl : originalUrl;

    return (
        <div style={{ minHeight: '100vh', background: '#F4F4F5', padding: '20px 16px 60px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" className="brutalist-button" style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none' }}>
                    ‹ HOME
                </Link>
                <span
                    style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '4px 10px',
                        border: '2px solid #000',
                        background: '#FFDD00',
                        color: '#000',
                        fontFamily: 'monospace',
                    }}
                >
                    CREATOR ENGINE
                </span>
            </div>

            <div style={{ maxWidth: 1100, margin: '0 auto 12px' }}>
                <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
                    BACKGROUND REMOVER
                </h1>
                <p style={{ fontSize: '0.85rem', color: '#555', margin: '4px 0 0', fontWeight: 600 }}>
                    Drop a photo → get a transparent PNG cutout. Runs on your device (free & private) or on our server.
                </p>
            </div>

            <div
                style={{
                    maxWidth: 1100,
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: isNarrow ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 320px',
                    gap: isNarrow ? 12 : 16,
                    alignItems: 'start',
                }}
            >
                {/* ── STAGE ─────────────────────────────────────────────── */}
                <div
                    className="brutalist-card"
                    style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDropActive(true);
                    }}
                    onDragLeave={() => setDropActive(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDropActive(false);
                        const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
                        handleFile(file ?? null);
                    }}
                >
                    {!originalUrl ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '100%',
                                minHeight: isNarrow ? 300 : 380,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                border: dropActive ? '2px dashed #000' : '2px dashed #a3a3a3',
                                borderRadius: 12,
                                background: dropActive ? '#FEF9C3' : '#fafafa',
                                cursor: 'pointer',
                                padding: 24,
                            }}
                        >
                            <UploadCloud size={44} color="#000" />
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#000' }}>
                                Drag & drop your photo here
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>or click to browse · you can also paste (Ctrl+V)</span>
                            <span
                                style={{
                                    marginTop: 8,
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    fontFamily: 'monospace',
                                    background: '#FFDD00',
                                    border: '2px solid #000',
                                    padding: '3px 10px',
                                    color: '#000',
                                }}
                            >
                                {mode === 'browser' ? 'WILL CUT ON MY DEVICE' : 'WILL CUT ON SERVER'}
                            </span>
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {(['cutout', 'original'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPreview(p)}
                                        disabled={p === 'cutout' && !hasResult}
                                        style={{
                                            padding: '5px 12px',
                                            fontSize: '0.7rem',
                                            fontWeight: 900,
                                            fontFamily: 'monospace',
                                            border: '2px solid #000',
                                            background: preview === p ? '#000' : '#fff',
                                            color: preview === p ? '#fff' : '#000',
                                            cursor: p === 'cutout' && !hasResult ? 'not-allowed' : 'pointer',
                                            opacity: p === 'cutout' && !hasResult ? 0.4 : 1,
                                        }}
                                    >
                                        {p === 'cutout' ? 'CUTOUT' : 'ORIGINAL'}
                                    </button>
                                ))}
                                {doneWith && !busy && (
                                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: '#166534' }}>
                                        <CheckCircle2 size={13} /> CUT {doneWith === 'browser' ? 'ON MY DEVICE' : 'ON SERVER'}
                                    </span>
                                )}
                            </div>
                            <div
                                style={{
                                    ...CHECKERBOARD,
                                    border: '2px solid #000',
                                    borderRadius: 8,
                                    minHeight: isNarrow ? 300 : 380,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={shownUrl ?? originalUrl ?? undefined}
                                    alt={preview === 'cutout' ? 'Cutout preview' : 'Original photo'}
                                    style={{ maxWidth: '100%', maxHeight: isNarrow ? '55vh' : 560, objectFit: 'contain' }}
                                />
                                {busy && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            borderTop: '2px solid #000',
                                            background: 'rgba(255,255,255,0.92)',
                                            padding: '8px 10px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4,
                                        }}
                                    >
                                        <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>
                                            {statusText} ({percent}%)
                                        </div>
                                        <div style={{ height: 6, background: '#fff', border: '1px solid #000' }}>
                                            <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, percent))}%`, background: '#FFE500', transition: 'width 0.25s ease' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                            handleFile(e.target.files?.[0] ?? null);
                            e.target.value = '';
                        }}
                    />

                    {error && (
                        <div
                            style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'flex-start',
                                border: '1.5px solid #000',
                                background: '#FEE2E2',
                                padding: '6px 8px',
                                fontSize: '0.6rem',
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                color: '#7F1D1D',
                                textTransform: 'uppercase',
                            }}
                        >
                            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* ── CONTROLS ──────────────────────────────────────────── */}
                <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {(busy || statusText) && !error && (
                        <div style={{ padding: '6px 8px', border: '1.5px solid #000', background: '#fafafa' }}>
                            <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: busy ? '#000' : '#b00' }}>
                                {busy ? `${statusText} (${percent}%)` : statusText}
                            </div>
                            {busy && (
                                <div style={{ height: 6, background: '#fff', border: '1px solid #000', marginTop: 4 }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, percent))}%`, background: '#FFE500' }} />
                                </div>
                            )}
                            {!busy && (
                                <button className="brutalist-button" style={{ padding: '3px 8px', fontSize: '0.56rem', marginTop: 5 }} onClick={() => setStatusText('')}>
                                    ✕ CLEAR
                                </button>
                            )}
                        </div>
                    )}
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.06em', color: '#000' }}>
                        WHERE SHOULD THE CUT HAPPEN?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {([
                            { m: 'browser' as CutMode, label: 'ON MY DEVICE', sub: 'FREE · PRIVATE', icon: <Cpu size={14} /> },
                            { m: 'server' as CutMode, label: 'ON SERVER', sub: 'ANY SUBJECT', icon: <Server size={14} /> },
                        ]).map(({ m, label, sub, icon }) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                disabled={busy}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 4,
                                    padding: '10px 10px',
                                    border: mode === m ? '2.5px solid #000' : '2px solid #bbb',
                                    background: mode === m ? '#FFDD00' : '#fff',
                                    boxShadow: mode === m ? '3px 3px 0 #000' : 'none',
                                    cursor: busy ? 'wait' : 'pointer',
                                    opacity: busy ? 0.6 : 1,
                                }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', color: '#000' }}>
                                    {icon} {label}
                                </span>
                                <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#444', fontWeight: 700 }}>{sub}</span>
                            </button>
                        ))}
                    </div>
                    {mode === 'browser' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.04em' }}>
                                ENGINE QUALITY
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {(Object.entries(BROWSER_MODELS) as [BrowserModel, typeof BROWSER_MODELS[BrowserModel]][]).map(
                                    ([key, { label, sub }]) => (
                                        <button
                                            key={key}
                                            onClick={() => setBrowserModel(key)}
                                            disabled={busy}
                                            style={{
                                                flex: 1,
                                                padding: '6px 4px',
                                                border: browserModel === key ? '2.5px solid #000' : '2px solid #ccc',
                                                background: browserModel === key ? '#FFDD00' : '#fff',
                                                boxShadow: browserModel === key ? '3px 3px 0 #000' : 'none',
                                                cursor: busy ? 'wait' : 'pointer',
                                                opacity: busy ? 0.6 : 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 2,
                                            }}
                                        >
                                            <span style={{ fontSize: '0.66rem', fontWeight: 900, fontFamily: 'monospace' }}>{label}</span>
                                            <span style={{ fontSize: '0.52rem', fontFamily: 'monospace', color: '#444', fontWeight: 700 }}>{sub}</span>
                                        </button>
                                    ),
                                )}
                        </div>
                        {browserModel !== 'isnet_quint8' && (
                            <div style={{ fontSize: '0.56rem', fontFamily: 'monospace', fontWeight: 900, color: '#b00', lineHeight: 1.4 }}>
                                ⚠ {BROWSER_MODELS[browserModel].label} CAN FREEZE THIS TAB — OR YOUR WHOLE PHONE — FOR UP TO ~15 SECONDS WHILE IT CUTS. THAT'S NORMAL; DON'T CLOSE THE PAGE.
                            </div>
                        )}
                    </div>
                )}
                    <p style={{ fontSize: '0.68rem', color: '#666', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        {mode === 'browser'
                            ? `Runs in your browser — your photo never leaves your device. The ${BROWSER_MODELS[browserModel].label} engine downloads once (${BROWSER_MODELS[browserModel].sub}) and is kept in IndexedDB. Higher tiers freeze the tab longer while cutting — the gain is subtler edges (hair, fur) at full zoom; the preview may look identical.`
                            : 'Our server does the cutting — works for any subject, handy on low-power phones.'}
                    </p>

                    <div style={{ height: 0, borderTop: '1.5px solid #eee' }} />

                    <button
                        onClick={handleDownload}
                        disabled={!hasResult || busy}
                        className="brutalist-button brutalist-button-primary"
                        style={{ justifyContent: 'center', opacity: !hasResult || busy ? 0.5 : 1, cursor: !hasResult || busy ? 'not-allowed' : 'pointer' }}
                    >
                        <Download size={15} /> DOWNLOAD PNG
                    </button>

                    {originalFile && (
                        <button
                            onClick={() => runCut(originalFile, mode)}
                            disabled={busy}
                            className="brutalist-button"
                            style={{ justifyContent: 'center', opacity: busy ? 0.5 : 1, cursor: busy ? 'wait' : 'pointer' }}
                        >
                            <RefreshCw size={14} /> RE-CUT
                        </button>
                    )}

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="brutalist-button"
                        style={{ justifyContent: 'center', opacity: busy ? 0.5 : 1, cursor: busy ? 'wait' : 'pointer' }}
                    >
                        <ImageOff size={14} style={{ transform: 'none' }} /> NEW PHOTO
                    </button>

                    <div style={{ height: 0, borderTop: '1.5px solid #eee' }} />

                    <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.06em', color: '#000' }}>
                        CONTINUE IN…
                    </div>
                    <button
                        onClick={sendToTextBehind}
                        disabled={!hasResult || busy}
                        className="brutalist-button"
                        style={{ justifyContent: 'center', opacity: !hasResult || busy ? 0.5 : 1, cursor: !hasResult || busy ? 'not-allowed' : 'pointer' }}
                    >
                        <Layers size={14} /> TEXT-BEHIND POSTER <ArrowRight size={13} />
                    </button>
                    <button
                        onClick={sendToThumbnailLab}
                        disabled={!originalFile || busy}
                        className="brutalist-button"
                        style={{ justifyContent: 'center', opacity: !originalFile || busy ? 0.5 : 1, cursor: !originalFile || busy ? 'not-allowed' : 'pointer' }}
                    >
                        <LayoutGrid size={14} /> THUMBNAIL LAB <ArrowRight size={13} />
                    </button>
                    <p style={{ fontSize: '0.64rem', color: '#888', margin: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                        HAND-OFFS SKIP THE DOWNLOAD → RE-UPLOAD ROUND TRIP
                    </p>
                </div>
            </div>
        </div>
    );
}
