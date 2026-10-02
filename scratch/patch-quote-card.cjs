/**
 * Fork transform: src/app/quote-card/page.tsx (copied from text-behind) → Card Studio.
 * Owner ruling 2026-10-02: same interface as text-behind, NO AI background-removal
 * model, multiple photos on canvas, per-card photos + bg colours, individual cards.
 * Every replacement asserts exactly-once matching; exits non-zero on any mismatch.
 */
const fs = require('fs');
const FILE = 'src/app/quote-card/page.tsx';
const DRY = process.env.DRY === '1';
let src = fs.readFileSync(FILE, 'utf8');
let ok = 0;
const fails = [];
function rep(label, find, repl) {
    const parts = src.split(find);
    if (parts.length !== 2) {
        fails.push(`${label}: matched ${parts.length - 1} times (expected 1)`);
        return;
    }
    src = parts.join(repl);
    ok++;
}

/* 1. Header comment */
rep('header-comment',
    `/**
 * TEXT BEHIND IMAGE — the movie-poster sandwich editor.
 *
 * Layer 0 (bottom): the original photo
 * Layer 1 (behind): typography behind the subject
 * Layer 2 (cutout): the subject cutout (transparent PNG)
 * Layer 3 (front):  typography in front of the subject
 *
 * Supports:
 * - 52 Google Fonts across 5 categories (Serif, Typewriter, Tabloid, Sans, Display)
 * - True typographic variations: Weights (Regular, Bold, Heavy), Italic/Slant, Case transforms
 * - Depth management: Multiple independent text layers (behind vs front)
 * - 10 Curated Poster Style Presets & interactive Blend Modes (Solid, Overlay, Screen, Multiply)
 * - Pinned desktop studio viewport with independent scrolling settings column
 */`,
    `/**
 * CARD STUDIO (quote cards) — the text-behind interface, minus the AI model.
 *
 * Owner ruling 2026-10-02: this is a deliberate fork of Text Behind Image with
 * the SAME interface (text boxes, fonts, shapes, grain, undo, export), but:
 * - NO AI background removal ever runs here (bring your own transparent PNG
 *   via "custom subject" if you want the sandwich look).
 * - Multiple photos can be inserted as movable canvas layers.
 * - Cards are individual: each keeps its own photo, bg colour, text & overlays.
 * - Batch photo upload creates one card per photo. Deck exports as a ZIP.
 */`);

/* 2. Imports */
rep('import-thinkingorb',
    `import { ThinkingOrb } from 'thinking-orbs';
import SiteNav from '@/components/nav/SiteNav';`,
    `import SiteNav from '@/components/nav/SiteNav';`);

rep('import-bgremoval',
    `import {
    removeBackgroundBrowser,
    standardizeSourceImage,
    BROWSER_MODELS,
    prewarmBackgroundEngine,
    type MatteEngine,
    type MatteProgress,
    type BrowserModel,
} from '@/lib/background-removal';`,
    `import { standardizeSourceImage } from '@/lib/background-removal';`);

rep('import-handoff',
    `import { putHandoffImage, takeHandoffImage } from '@/lib/tool-handoff';`,
    `import { putHandoffImage } from '@/lib/tool-handoff';`);

/* 3. QUALITY_KEY out */
rep('quality-key',
    `/** Engine quality choice — same key as /background-replace so the two tools stay in sync. */
const QUALITY_KEY = 'ck_bgrem_quality_v1';

`,
    ``);

/* 4. Storage keys */
rep('keys-main',
    `const SETTINGS_KEY = 'ck_text_behind_v6';
const OVERLAYS_KEY = 'ck_text_behind_overlays_v1';`,
    `const SETTINGS_KEY = 'ck_quote_card_v1';
const OVERLAYS_KEY = 'ck_quote_card_overlays_v1';
const DECK_KEY = 'ck_quote_card_deck_v1';`);

rep('key-bgdim-load',
    `const saved = parseFloat(localStorage.getItem('ck_text_behind_bgdim') ?? '');`,
    `const saved = parseFloat(localStorage.getItem('ck_quote_card_bgdim') ?? '');`);

rep('key-bgdim-save',
    `localStorage.setItem('ck_text_behind_bgdim', String(bgDim));`,
    `localStorage.setItem('ck_quote_card_bgdim', String(bgDim));`);

rep('key-idb',
    `const req = indexedDB.open('ck_text_behind', 1);`,
    `const req = indexedDB.open('ck_quote_card', 1);`);

/* 5. Component name */
rep('component-name',
    `export default function TextBehindPage() {`,
    `export default function QuoteCardPage() {`);

/* 6. matte state → card colour states */
rep('matte-state',
    `    // --- auto-cutout (browser WASM first, worker /matte fallback) -----------
    const [matte, setMatte] = useState<{
        busy: boolean;
        engine: MatteEngine;
        message: string;
        percent: number;
    } | null>(null);
    const [cutoutError, setCutoutError] = useState<string | null>(null);`,
    `    // --- card canvas (no AI here — owner ruling 2026-10-02) -----------------
    /** Solid card background — the canvas when a card has no photo. */
    const [cardBgColor, setCardBgColor] = useState('#18181b');
    /** True once the user starts a colour card (canvas without a photo). */
    const [colorCardStarted, setColorCardStarted] = useState(false);
    const [cutoutError, setCutoutError] = useState<string | null>(null);`);

/* 7. ShapeKind + ShapeLayer gain 'image' */
rep('shapekind',
    `type ShapeKind = 'rect' | 'line' | 'beam' | 'circle' | 'icon' | 'button';`,
    `type ShapeKind = 'rect' | 'line' | 'beam' | 'circle' | 'icon' | 'button' | 'image';`);

rep('shapelayer-imgsrc',
    `    iconId?: string; // remix icon id (kind === 'icon')
    label?: string; // centred text (kind === 'button') — e.g. "NEXT"`,
    `    iconId?: string; // remix icon id (kind === 'icon')
    imgSrc?: string; // data URL of an uploaded photo (kind === 'image')
    label?: string; // centred text (kind === 'button') — e.g. "NEXT"`);

/* 8. Deck + photo-layer machinery after removeShape */
rep('deck-block',
    `    const removeShape = (id: string) => {
        pushUndo();
        setShapes((prev) => prev.filter((s) => s.id !== id));
        if (activeShapeId === id) setActiveShapeId(null);
    };`,
    `    const removeShape = (id: string) => {
        pushUndo();
        setShapes((prev) => prev.filter((s) => s.id !== id));
        if (activeShapeId === id) setActiveShapeId(null);
        photoLayerImgsRef.current.delete(id);
    };

    // --- photo layers (multiple uploaded images on the canvas) ---------------
    /** Decoded <img> per photo-layer shape id; bumping iconTick repaints. */
    const photoLayerImgsRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const photoLayerInputRef = useRef<HTMLInputElement>(null);

    /** Multi-photo intake — every file becomes a movable, rotatable photo layer. */
    const handleAddPhotoLayers = async (files: FileList | null) => {
        if (!files) return;
        const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (list.length === 0) return;
        pushUndo();
        let idx = shapes.length;
        for (const f of list) {
            const dataUrl = await new Promise<string>((res) => {
                const r = new FileReader();
                r.onload = () => res(String(r.result));
                r.readAsDataURL(f);
            });
            const s: ShapeLayer = {
                ...makeShape('image', idx++),
                wPct: 55,
                hPct: 45,
                fillColor: '#FFFFFF',
                fillOn: false,
                depth: 'front',
                imgSrc: dataUrl,
            };
            setShapes((prev) => [...prev, s]);
            const img = new Image();
            img.onload = () => {
                photoLayerImgsRef.current.set(s.id, img);
                setIconTick((t) => (t + 1) % 100000);
            };
            img.src = dataUrl;
        }
        setActiveShapeId(null);
        setAdvancedOpen(true);
        setExportNote(
            list.length === 1
                ? 'Photo added as a canvas layer — drag it, rotate it, scale it.'
                : list.length + ' photos added as canvas layers.'
        );
    };

    // --- Card Studio deck: individual cards, each with its own photo/bg ------
    /** cards.length === 0 → single implicit card (the working state itself).
     *  Every card keeps its own photo, bg colour, text layers, shapes & grain.
     *  NO AI models run here — photos are placed as-is (owner ruling 2026-10-02). */
    type CardDeckItem = { id: string; name: string; layers: TextLayer[]; shapes: ShapeLayer[]; grain: GrainSettings; bgColor: string };
    const [cards, setCards] = useState<CardDeckItem[]>([]);
    const [activeCardId, setActiveCardId] = useState<string>('');
    const [deckExporting, setDeckExporting] = useState(false);
    /** In-memory per-card photos while the deck lives (blob + decoded img). */
    const cardBgRef = useRef<Map<string, { img: HTMLImageElement; blob: Blob }>>(new Map());

    const activeDeckId = () => activeCardId || 'card-1';

    const deckWithWorkingState = (): CardDeckItem[] => {
        if (cards.length === 0) return [{ id: 'card-1', name: 'CARD 1', layers, shapes, grain, bgColor: cardBgColor }];
        return cards.map((c) =>
            c.id === activeCardId || (activeCardId === '' && c.id === 'card-1')
                ? { ...c, layers, shapes, grain, bgColor: cardBgColor }
                : c
        );
    };

    /** Stash the working photo under the active card id (called before switches). */
    const stashWorkingPhoto = () => {
        if (bgImage && bgFileRef.current) {
            cardBgRef.current.set(activeDeckId(), { img: bgImage, blob: bgFileRef.current });
        }
    };

    /** Apply a card's photo (or lack of one) to the working state. */
    const applyCardPhoto = (id: string) => {
        const photo = cardBgRef.current.get(id);
        if (photo) {
            bgFileRef.current = photo.blob;
            setBgImage(photo.img);
            setBgInfo(photo.img.naturalWidth + ' × ' + photo.img.naturalHeight + 'px · card photo');
        } else {
            bgFileRef.current = null;
            setBgImage(null);
            setBgInfo('');
            setColorCardStarted(true); // a card without a photo is a colour card
        }
    };

    const resetHistory = () => {
        undoStackRef.current = [];
        setUndoCount(0);
        redoStackRef.current = [];
        setRedoCount(0);
    };

    const switchCard = (targetId: string) => {
        const deck = cards.length > 0 ? cards : deckWithWorkingState();
        const target = deck.find((c) => c.id === targetId);
        if (!target) return;
        stashWorkingPhoto();
        setCards(deckWithWorkingState());
        setActiveCardId(target.id);
        setLayers(target.layers);
        setActiveLayerId(target.layers[0]?.id ?? '');
        setShapes(target.shapes);
        setActiveShapeId(null);
        setGrain(target.grain);
        setCardBgColor(target.bgColor);
        applyCardPhoto(target.id);
        resetHistory();
    };

    const addCard = () => {
        stashWorkingPhoto();
        const deck = deckWithWorkingState();
        const next: CardDeckItem = {
            id: 'card-' + Date.now(),
            name: 'CARD ' + (deck.length + 1),
            layers: [{ ...DEFAULT_TEXT_LAYER, id: 't-' + Date.now() }],
            shapes: [],
            grain: DEFAULT_GRAIN,
            bgColor: cardBgColor,
        };
        setCards([...deck, next]);
        setActiveCardId(next.id);
        setLayers(next.layers);
        setActiveLayerId(next.layers[0].id);
        setShapes([]);
        setActiveShapeId(null);
        setGrain(DEFAULT_GRAIN);
        bgFileRef.current = null;
        setBgImage(null);
        setBgInfo('');
        setColorCardStarted(true);
        resetHistory();
    };

    const removeCard = (id: string) => {
        if (cards.length === 0) return;
        const stashed = deckWithWorkingState();
        if (stashed.length <= 1) {
            // Deleting the last card returns to the implicit single-card mode.
            setCards([]);
            setActiveCardId('');
            return;
        }
        const idx = stashed.findIndex((c) => c.id === id);
        const next = stashed.filter((c) => c.id !== id);
        cardBgRef.current.delete(id);
        setCards(next);
        const wasActive = id === activeDeckId();
        if (wasActive) {
            const fallback = next[Math.max(0, idx - 1)];
            setActiveCardId(fallback.id);
            setLayers(fallback.layers);
            setActiveLayerId(fallback.layers[0]?.id ?? '');
            setShapes(fallback.shapes);
            setActiveShapeId(null);
            setGrain(fallback.grain);
            setCardBgColor(fallback.bgColor);
            applyCardPhoto(fallback.id);
            resetHistory();
        }
    };`);

/* 9. Overlays save strips photo data URLs */
rep('overlays-save',
    `            localStorage.setItem(OVERLAYS_KEY, JSON.stringify({ shapes, grain }));`,
    `            // Photo layers persist as placeholders — imgSrc data URLs would blow
            // the localStorage quota. Their geometry survives; images re-upload.
            const persistableShapes = shapes.map((s) => (s.kind === 'image' ? { ...s, imgSrc: undefined } : s));
            localStorage.setItem(OVERLAYS_KEY, JSON.stringify({ shapes: persistableShapes, grain }));`);

/* 10. Deck persistence */
rep('deck-persist',
    `    }, [shapes, grain]);

    // Restore saved images from IndexedDB`,
    `    }, [shapes, grain]);

    // --- Card Studio deck persistence ----------------------------------------
    // Declared AFTER the layers/overlays loaders so the hydrated active card
    // wins over the legacy single-card keys (same-tick effect order).
    useEffect(() => {
        try {
            const raw = localStorage.getItem(DECK_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed?.cards) && parsed.cards.length > 0) {
                setCards(parsed.cards);
                const active = parsed.cards.find((c) => c.id === parsed.activeCardId) ?? parsed.cards[0];
                setActiveCardId(active.id);
                setLayers(active.layers);
                setActiveLayerId(active.layers[0]?.id ?? '');
                setShapes(active.shapes);
                setGrain(active.grain);
                setCardBgColor(active.bgColor);
                setColorCardStarted(true);
            }
        } catch { /* non-fatal */ }
    }, []);

    const deckHadCardsRef = useRef(false);
    useEffect(() => {
        if (cards.length > 0) deckHadCardsRef.current = true;
        // Skip while implicit AND never materialized — avoids wiping the saved
        // deck on the mount tick before the loader above has hydrated cards.
        if (cards.length === 0 && !deckHadCardsRef.current) return;
        try {
            if (cards.length === 0) {
                // Back to the implicit single card — retire the deck key.
                localStorage.removeItem(DECK_KEY);
            } else {
                const persistable = deckWithWorkingState().map((c) => ({
                    ...c,
                    shapes: c.shapes.map((s) => (s.kind === 'image' ? { ...s, imgSrc: undefined } : s)),
                }));
                localStorage.setItem(DECK_KEY, JSON.stringify({ cards: persistable, activeCardId }));
            }
        } catch { /* non-fatal */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards, activeCardId, layers, shapes, grain, cardBgColor]);

    // Restore saved images from IndexedDB`);

/* 11. Restore effect: handoff consume out */
rep('restore-handoff',
    `            // Cross-tool hand-off (Background Remover → here): a freshly sent
            // cutout wins over whatever was restored from IndexedDB.
            const handoff = await takeHandoffImage('text-behind');
            if (handoff && !cancelled) {
                try {
                    const img = await loadImage(handoff.blob);
                    setCutoutImage(img);
                    setCutoutInfo(\`\${img.naturalWidth} × \${img.naturalHeight}px · PNG · FROM BACKGROUND REMOVER\`);
                    await idbPut('cutout', handoff.blob);
                } catch { /* not a decodable image — ignore */ }
            }
        })();`,
    `        })();`);

/* 12. Prewarm out */
rep('prewarm',
    `    // Warm the AI engine silently after first interaction so the first real
    // cutout skips the ~110 MB model download the moment a photo lands.
    useEffect(() => {
        prewarmBackgroundEngine();
    }, []);

`,
    ``);

/* 13. handleAutoCutout out */
rep('handle-auto-cutout',
    `    const handleAutoCutout = useCallback(async (customBlob?: Blob) => {
        const source = customBlob || bgFileRef.current;
        if (!source) {
            setCutoutError('Upload the background photo first.');
            setMatte(null);
            return;
        }
        setCutoutError(null);
        setMatte({
            busy: true,
            engine: 'browser',
            message: 'Starting AI cutout model…',
            percent: 5,
        });
        const onProgress: MatteProgress = (_stage, message, percent) => {
            setMatte((prev) => (prev ? { ...prev, message, percent } : prev));
        };
        try {
            const rawCutout = await removeBackgroundBrowser(source, onProgress, 'isnet_quint8');
            const stdCutout = await standardizeSourceImage(rawCutout);
            setCutoutImage(stdCutout.img);
            setCutoutInfo(\`\${stdCutout.width} × \${stdCutout.height}px · Subject Cutout Ready\`);
            void idbPut('cutout', stdCutout.blob);
            setCutoutError(null);
            setMatte(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Cutout failed — please try again.';
            console.error('[handleAutoCutout] Cutout error:', err);
            setCutoutError(message);
            setMatte(null);
        }
    }, []);

`,
    ``);

/* 14. handleBgFile simplified + multi-file intake */
rep('handle-bg-file',
    `    const handleBgFile = useCallback(async (file: File | null) => {
        if (!file) return;
        try {
            setCutoutError(null);
            setMatte({
                busy: true,
                engine: 'browser',
                message: 'Standardizing image format…',
                percent: 5,
            });
            const std = await standardizeSourceImage(file);
            bgFileRef.current = std.blob;
            setBgImage(std.img);
            setBgInfo(\`\${std.width} × \${std.height}px · Standardized PNG\`);
            void idbPut('bg', std.blob);

            // Trigger AI cutout automatically
            void handleAutoCutout(std.blob);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not open that file — please select a valid JPG or PNG.';
            setBgInfo('Could not open that file.');
            setCutoutError(msg);
            setMatte(null);
        }
    }, [handleAutoCutout]);`,
    `    const handleBgFile = useCallback(async (file: File | null) => {
        if (!file) return;
        try {
            const std = await standardizeSourceImage(file);
            bgFileRef.current = std.blob;
            setBgImage(std.img);
            setBgInfo(std.width + ' × ' + std.height + 'px · Standardized PNG');
            void idbPut('bg', std.blob);
        } catch {
            setBgInfo('Could not open that file.');
        }
    }, []);

    /** Multi-file intake: the first photo becomes the active card's background,
     *  every extra photo becomes its own NEW card (owner ruling 2026-10-02). */
    const handleBgFiles = async (files: FileList | null) => {
        if (!files) return;
        const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (list.length === 0) return;
        await handleBgFile(list[0]);
        for (const extra of list.slice(1)) {
            try {
                stashWorkingPhoto();
                const deck = deckWithWorkingState();
                const std = await standardizeSourceImage(extra);
                const id = 'card-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                cardBgRef.current.set(id, { img: std.img, blob: std.blob });
                setCards([
                    ...deck,
                    { id, name: 'CARD ' + (deck.length + 1), layers: [DEFAULT_TEXT_LAYER], shapes: [], grain: DEFAULT_GRAIN, bgColor: cardBgColor },
                ]);
                setActiveCardId(id);
                setLayers([DEFAULT_TEXT_LAYER]);
                setActiveLayerId(DEFAULT_TEXT_LAYER.id);
                setShapes([]);
                setActiveShapeId(null);
                setGrain(DEFAULT_GRAIN);
                bgFileRef.current = std.blob;
                setBgImage(std.img);
                setBgInfo(std.width + ' × ' + std.height + 'px · Standardized PNG');
            } catch { /* skip undecodable extras */ }
        }
        if (list.length > 1) setExportNote(list.length + ' photos loaded — one card each.');
    };`);

/* 15. Reset photos without matte */
rep('handle-reset',
    `    const handleResetPhotos = () => {
        setBgImage(null);
        setBgInfo('');
        setCutoutImage(null);
        setCutoutInfo('');
        setCutoutError(null);
        setMatte(null);
        setBgDim(0);
        bgFileRef.current = null;
        setExportNote('');
        void idbClear(['bg', 'cutout']);
    };`,
    `    const handleResetPhotos = () => {
        setBgImage(null);
        setBgInfo('');
        setCutoutImage(null);
        setCutoutInfo('');
        setCutoutError(null);
        setBgDim(0);
        bgFileRef.current = null;
        setColorCardStarted(false);
        setExportNote('');
        void idbClear(['bg', 'cutout']);
    };`);

/* 16. canvasW/H with format fallback */
rep('canvas-dims',
    `    const canvasW = bgImage?.naturalWidth ?? 0;
    const canvasH = bgImage?.naturalHeight ?? 0;`,
    `    /** Card format template — the canvas size when a card has no photo yet. */
    const [cardFormat, setCardFormat] = useState({ w: 1080, h: 1350 });
    const canvasW = bgImage?.naturalWidth ?? cardFormat.w;
    const canvasH = bgImage?.naturalHeight ?? cardFormat.h;`);

/* 17. drawSandwich bg colour fill */
rep('draw-bg-fill',
    `            if (bgImage) {
                ctx.drawImage(bgImage, 0, 0, W, H);`,
    `            // Card background colour — visible on colour cards and behind photos.
            ctx.fillStyle = cardBgColor;
            ctx.fillRect(0, 0, W, H);
            if (bgImage) {
                ctx.drawImage(bgImage, 0, 0, W, H);`);

/* 18. drawShapeLayer image branch */
rep('draw-image-branch',
    `                if (s.kind === 'icon') {
                    // Remix icon layer — rendered to an image and stamped at w × h.`,
    `                if (s.kind === 'image') {
                    // Uploaded photo layer — cover-fit into the shape rect, clipped
                    // to rounded corners. Aspect-locked, so nothing squashes.
                    const img = photoLayerImgsRef.current.get(s.id);
                    ctx.globalAlpha = s.opacity;
                    if (img) {
                        const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);
                        const dw = img.naturalWidth * sc;
                        const dh = img.naturalHeight * sc;
                        ctx.save();
                        pathRoundRect(ctx, -w / 2, -h / 2, w, h, radius);
                        ctx.clip();
                        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
                        ctx.restore();
                    } else {
                        // Still decoding — dashed placeholder so the layer is never invisible
                        ctx.strokeStyle = s.strokeColor;
                        ctx.lineWidth = Math.max(1.5, W / 700);
                        ctx.setLineDash([w / 12, w / 16]);
                        ctx.strokeRect(-w / 2, -h / 2, w, h);
                        ctx.setLineDash([]);
                    }
                } else if (s.kind === 'icon') {
                    // Remix icon layer — rendered to an image and stamped at w × h.`);

/* 19. drawSandwich deps + fresh refs */
rep('draw-deps-refs',
    `        [bgImage, cutoutImage, layers, activeLayerId, guides, bgDim, shapes, activeShapeId, grain, iconTick, handleIconReady]
    );`,
    `        [bgImage, cutoutImage, layers, activeLayerId, guides, bgDim, shapes, activeShapeId, grain, iconTick, handleIconReady, cardBgColor]
    );

    // Always-fresh draw closure + canvas size for deck export: re-assigned every
    // render so sequential per-card state swaps render through them untouched.
    const drawSandwichRef = useRef(drawSandwich);
    drawSandwichRef.current = drawSandwich;
    const canvasSizeRef = useRef({ w: canvasW, h: canvasH });
    canvasSizeRef.current = { w: canvasW, h: canvasH };`);

/* 20. Repaint effect for colour cards */
rep('repaint-effect',
    `        if (!canvas || !bgImage) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawSandwich(ctx, canvasW, canvasH, { preview: true });
    }, [bgImage, canvasW, canvasH, drawSandwich]);`,
    `        if (!canvas || (!bgImage && !colorCardStarted)) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawSandwich(ctx, canvasW, canvasH, { preview: true });
    }, [bgImage, colorCardStarted, cardBgColor, canvasW, canvasH, drawSandwich]);`);

/* 21. Guards accept colour cards */
rep('export-guard',
    `        if (!bgImage || exporting) return;`,
    `        if ((!bgImage && !colorCardStarted) || exporting) return;`);

rep('handoff-guard-1',
    `    const handleSendToThumbnailLab = async (format: 'longform' | 'shorts') => {
        if (!bgImage || sendingHandoff) return;`,
    `    const handleSendToThumbnailLab = async (format: 'longform' | 'shorts') => {
        if ((!bgImage && !colorCardStarted) || sendingHandoff) return;`);

rep('handoff-guard-2',
    `    const handleSendToCarouselSlicer = async () => {
        if (!bgImage || sendingHandoff) return;`,
    `    const handleSendToCarouselSlicer = async () => {
        if ((!bgImage && !colorCardStarted) || sendingHandoff) return;`);

/* 22. Deck export + send-to-text-behind */
rep('deck-export-fn',
    `        } catch (err) {
            console.error('Failed to send to Carousel Slicer:', err);
        } finally {
            setSendingHandoff(false);
        }
    };`,
    `        } catch (err) {
            console.error('Failed to send to Carousel Slicer:', err);
        } finally {
            setSendingHandoff(false);
        }
    };

    /** Cross-tool: need the AI text-behind sandwich? Ship this card to Text Behind. */
    const handleSendToTextBehind = async () => {
        if ((!bgImage && !colorCardStarted) || sendingHandoff) return;
        setSendingHandoff(true);
        try {
            await Promise.all(layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic)));
            const off = document.createElement('canvas');
            off.width = canvasW;
            off.height = canvasH;
            const ctx = off.getContext('2d');
            if (!ctx) throw new Error('Offscreen context failed');
            drawSandwichRef.current(ctx, canvasW, canvasH, { preview: false });
            const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Handoff render failed.');
            await putHandoffImage('text-behind', blob, { sourceTool: 'quote-card' });
            setHandoffModalOpen(false);
            window.open('/text-behind', '_blank');
        } catch (err) {
            console.error('Failed to send to Text Behind:', err);
        } finally {
            setSendingHandoff(false);
        }
    };

    /** Deck export: render every card clean, bundle a ZIP (lazy jszip per §7). */
    const handleExportDeck = async () => {
        if (exporting || sendingHandoff || deckExporting) return;
        const deck = deckWithWorkingState();
        if (deck.length < 2) return; // single card → the plain PNG buttons cover it
        setDeckExporting(true);
        setExportNote('Rendering deck…');
        stashWorkingPhoto();
        const orig = {
            layers,
            activeLayerId,
            shapes,
            activeShapeId,
            grain,
            cardBgColor,
            bgImage,
            bgBlob: bgFileRef.current,
        };
        const nextFrame = () =>
            new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const off = document.createElement('canvas');
            const ctx = off.getContext('2d');
            if (!ctx) throw new Error('Offscreen context failed');
            for (let i = 0; i < deck.length; i++) {
                const card = deck[i];
                // Swap the working state to this card; the double-rAF lets React
                // commit so drawSandwichRef holds the fresh closure.
                setLayers(card.layers);
                setActiveLayerId(card.layers[0]?.id ?? '');
                setShapes(card.shapes);
                setActiveShapeId(null);
                setGrain(card.grain);
                setCardBgColor(card.bgColor);
                const photo = cardBgRef.current.get(card.id) ?? null;
                setBgImage(photo ? photo.img : null);
                bgFileRef.current = photo ? photo.blob : null;
                await Promise.all(card.layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic)));
                await nextFrame();
                const W = canvasSizeRef.current.w;
                const H = canvasSizeRef.current.h;
                if (off.width !== W || off.height !== H) {
                    off.width = W;
                    off.height = H;
                }
                drawSandwichRef.current(ctx, W, H, { preview: false });
                const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
                if (!blob) throw new Error('Card ' + (i + 1) + ' render failed.');
                zip.file(
                    String(i + 1).padStart(2, '0') + '-' + card.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png',
                    blob
                );
                setExportNote('Rendering deck… ' + (i + 1) + '/' + deck.length);
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const base = (activeLayer.text.split('\n')[0] || 'creatorskit').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'cards';
            downloadBlob(zipBlob, base + '-deck-' + deck.length + '-cards.zip');
            setExportNote('Saved ZIP · ' + deck.length + ' cards.');
        } catch (err) {
            setExportNote(err instanceof Error ? err.message : 'Deck export failed.');
        } finally {
            // Restore the working state of the card the user was editing.
            setLayers(orig.layers);
            setActiveLayerId(orig.activeLayerId);
            setShapes(orig.shapes);
            setActiveShapeId(orig.activeShapeId);
            setGrain(orig.grain);
            setCardBgColor(orig.cardBgColor);
            setBgImage(orig.bgImage);
            bgFileRef.current = orig.bgBlob;
            setDeckExporting(false);
        }
    };`);

/* 23. Cutout-error banner: manual PNG retry */
rep('banner-retry',
    `                                                    onClick={() => {
                                                        setCutoutError(null);
                                                        void handleAutoCutout();
                                                    }}
                                                >
                                                    <span>RETRY CUTOUT</span>`,
    `                                                    onClick={() => {
                                                        setCutoutError(null);
                                                        cutoutInputRef.current?.click();
                                                    }}
                                                >
                                                    <span>PICK A PNG INSTEAD</span>`);

rep('banner-title',
    `                                                        BACKGROUND REMOVAL FAILED`,
    `                                                        IMAGE TROUBLE`);

/* 24. matte overlay out */
rep('matte-overlay',
    `                                    {matte?.busy && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                                backdropFilter: 'blur(6px)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 24,
                                                zIndex: 25,
                                            }}
                                        >
                                            {/* Thinking orb — connecting while fetching the AI engine, shaping while cutting the subject out */}
                                            <ThinkingOrb
                                                size={64}
                                                style={{ marginBottom: 16 }}
                                                state={
                                                    (matte.message || '').toLowerCase().includes('fetch') ||
                                                    (matte.message || '').toLowerCase().includes('download')
                                                        ? 'connecting'
                                                        : 'shaping'
                                                }
                                            />

                                            {/* Status & Progress Info */}
                                            <div style={{ textAlign: 'center', maxWidth: 320, width: '100%' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', color: '#000', marginBottom: 4 }}>
                                                    {matte.message || 'Extracting Subject…'}
                                                </div>
                                                <div style={{ fontSize: '0.66rem', color: '#666', marginBottom: 10 }}>
                                                    {matte.message.includes('fetch') || matte.message.includes('Downloading')
                                                        ? 'Fetching AI engine files — one time only, then kept offline.'
                                                        : 'Cutting out subject — This takes a few seconds'}
                                                </div>
                                                <div style={{ width: '100%', maxWidth: 220, height: 8, background: '#fff', border: '1.5px solid #000', margin: '0 auto', overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            height: '100%',
                                                            width: \`\${Math.max(6, Math.min(100, matte.percent))}%\`,
                                                            background: '#FFE500',
                                                            transition: 'width 0.2s ease-out',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (`,
    `                                </>
                            ) : (`);

/* 25. Viewport colour-card condition + meta strip */
rep('viewport-cond',
    `                            {bgImage ? (
                                <>
                                    <canvas`,
    `                            {(bgImage || colorCardStarted) ? (
                                <>
                                    <canvas`);

rep('meta-strip',
    `                        {bgImage && (
                            <div className="text-behind-meta-strip"`,
    `                        {(bgImage || colorCardStarted) && (
                            <div className="text-behind-meta-strip"`);

/* 26. Tab strip in the viewport column */
rep('tab-strip',
    `                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            height: '100%',
                            minHeight: 0,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            onWheel={(e) => {`,
    `                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            height: '100%',
                            minHeight: 0,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Card tabs — individual cards, each with its own photo,
                            colour, text & overlays (owner ruling 2026-10-02). */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            {(cards.length > 0 ? cards : deckWithWorkingState()).map((c, i) => {
                                const isActive =
                                    cards.length === 0 || c.id === activeCardId || (activeCardId === '' && c.id === 'card-1');
                                return (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'stretch', border: '2px solid #000' }}>
                                        <button
                                            onClick={() => switchCard(c.id)}
                                            style={{
                                                padding: '3px 10px',
                                                fontFamily: 'monospace',
                                                fontWeight: 900,
                                                fontSize: '0.62rem',
                                                letterSpacing: '0.04em',
                                                cursor: 'pointer',
                                                border: 'none',
                                                background: isActive ? '#000' : '#fff',
                                                color: isActive ? '#fff' : '#000',
                                            }}
                                        >
                                            {String(i + 1).padStart(2, '0')}
                                        </button>
                                        {cards.length > 1 && (
                                            <button
                                                onClick={() => removeCard(c.id)}
                                                title="Delete card"
                                                style={{
                                                    padding: '3px 6px',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    fontSize: '0.62rem',
                                                    cursor: 'pointer',
                                                    border: 'none',
                                                    borderLeft: '2px solid #000',
                                                    background: isActive ? '#000' : '#fff',
                                                    color: isActive ? '#fff' : '#000',
                                                }}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                onClick={addCard}
                                style={{
                                    padding: '3px 10px',
                                    fontFamily: 'monospace',
                                    fontWeight: 900,
                                    fontSize: '0.62rem',
                                    letterSpacing: '0.04em',
                                    cursor: 'pointer',
                                    border: '2px dashed #000',
                                    background: '#fff',
                                    color: '#000',
                                }}
                            >
                                + CARD
                            </button>
                        </div>
                        <div
                            onWheel={(e) => {`);

/* 27. Hidden file inputs */
rep('hidden-inputs',
    `                        {/* Hidden File Inputs */}
                        <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleBgFile(e.target.files?.[0] ?? null)} />
                        <input ref={cutoutInputRef} type="file" accept="image/png,image/*" style={{ display: 'none' }} onChange={(e) => handleCutoutFile(e.target.files?.[0] ?? null)} />`,
    `                        {/* Hidden File Inputs */}
                        <input
                            ref={bgInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                void handleBgFiles(e.target.files);
                                e.currentTarget.value = '';
                            }}
                        />
                        <input
                            ref={cutoutInputRef}
                            type="file"
                            accept="image/png,image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                handleCutoutFile(e.target.files?.[0] ?? null);
                                e.currentTarget.value = '';
                            }}
                        />
                        <input
                            ref={photoLayerInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                void handleAddPhotoLayers(e.target.files);
                                e.currentTarget.value = '';
                            }}
                        />`);

/* 28. Mobile sidebar header copy */
rep('mobile-header',
    `                                POSTER CONTROLS · {layers.length} TEXT {layers.length === 1 ? 'BOX' : 'BOXES'}`,
    `                                CARD CONTROLS · {layers.length} TEXT {layers.length === 1 ? 'BOX' : 'BOXES'}`);

/* 29. Photo section: subtitle + RE-CUT → PHOTO ON CANVAS */
rep('photo-subtitle',
    `                                <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#666', marginBottom: 10 }}>
                                    STANDARDIZED CANVAS RENDERING · 100% PRIVATE ON-DEVICE AI
                                </div>`,
    `                                <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#666', marginBottom: 10 }}>
                                    PER-CARD PHOTOS · NO AI MODELS · 100% ON-DEVICE
                                </div>`);

rep('recut-button',
    `                                    <button
                                        type="button"
                                        className="brutalist-button"
                                        style={{ padding: '9px 8px', fontSize: '0.72rem' }}
                                        disabled={!bgImage || !!matte?.busy}
                                        onClick={() => void handleAutoCutout()}
                                    >
                                        {matte?.busy ? 'CUTTING OUT…' : '↻ RE-CUT SUBJECT'}
                                    </button>`,
    `                                    <button
                                        type="button"
                                        className="brutalist-button"
                                        style={{ padding: '9px 8px', fontSize: '0.72rem' }}
                                        onClick={() => photoLayerInputRef.current?.click()}
                                    >
                                        + PHOTO ON CANVAS
                                    </button>`);

rep('cutout-status',
    `                                    <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#888', marginBottom: 8 }}>
                                        {bgImage ? 'Subject cutout not generated yet.' : 'Upload a photo to extract the subject.'}
                                    </div>`,
    `                                    <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#888', marginBottom: 8 }}>
                                        Optional: bring your own transparent PNG to layer in front of the text.
                                    </div>`);

/* 30. Card colour + format pickers after the custom-PNG button (index-based) */
const CARD_PICKERS = `

                                    {/* Card background colour — the canvas on photo-less cards */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                        <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.04em' }}>
                                            CARD COLOUR
                                        </label>
                                        <input
                                            type="color"
                                            value={cardBgColor}
                                            onChange={(e) => setCardBgColor(e.target.value)}
                                            style={{ width: 34, height: 26, border: '2px solid #000', padding: 0, cursor: 'pointer', background: 'none' }}
                                        />
                                        {['#18181b', '#f5f5f4', '#FFE500', '#dc2626', '#2563eb', '#059669'].map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setCardBgColor(c)}
                                                title={'Card colour ' + c}
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    border: cardBgColor === c ? '2px solid #000' : '1.5px solid #999',
                                                    background: c,
                                                    cursor: 'pointer',
                                                    boxShadow: cardBgColor === c ? '2px 2px 0 #000' : 'none',
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Card format template — canvas size for photo-less cards */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                                        <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.04em' }}>
                                            FORMAT
                                        </label>
                                        {[['1:1', 1080, 1080], ['4:5', 1080, 1350], ['9:16', 1080, 1920]].map(([label, w, h]) => (
                                            <button
                                                key={label}
                                                type="button"
                                                className="brutalist-button"
                                                disabled={!!bgImage}
                                                title={bgImage ? 'Format follows the photo' : w + ' × ' + h + ' px'}
                                                onClick={() => setCardFormat({ w, h })}
                                                style={{
                                                    padding: '5px 9px',
                                                    fontSize: '0.64rem',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    background: cardFormat.w === w && cardFormat.h === h ? '#000' : '#fff',
                                                    color: cardFormat.w === w && cardFormat.h === h ? '#fff' : '#000',
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>`;

(function () {
    const anchor = 'UPLOAD CUSTOM SUBJECT PNG';
    const i = src.indexOf(anchor);
    const j = i === -1 ? -1 : src.indexOf('</button>', i);
    if (i === -1 || j === -1) {
        fails.push('bg-color-picker: anchor not found');
        return;
    }
    const at = j + '</button>'.length;
    src = src.slice(0, at) + CARD_PICKERS + src.slice(at);
    ok++;
})();
/* 31. Empty-state: honest copy + colour/format quick-start (replaces AI badge + demos) */
rep('empty-badge',
    `                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.04em', background: '#FFE500', border: '1.5px solid #000', padding: '2px 8px' }}>
                                        ON-DEVICE AI CUTOUT · 100% PRIVATE & FAST
                                    </span>`,
    `                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.04em', background: '#FFE500', border: '1.5px solid #000', padding: '2px 8px' }}>
                                        MULTI-CARD STUDIO · NO AI · 100% ON-DEVICE
                                    </span>`);

rep('empty-demos',
    `                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1.5px dashed #d4d4d4' }}>
                                        <div style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', color: '#525252', marginBottom: 8 }}>
                                            POSTERS MADE WITH TEXT BEHIND IMAGE
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                                            {[
                                                { src: '/assets/text-behind/demo-cruise-poster.jpg', alt: 'Travel poster with giant CRUISE text layered behind the photo subject' },
                                                { src: '/assets/text-behind/demo-earth-poster.jpg', alt: 'Earth poster with EARTH typography behind the subject — depth text effect' },
                                                { src: '/assets/text-behind/demo-portrait-poster.jpg', alt: 'Portrait poster with bold text behind the person, on-device background remover cutout' },
                                                { src: '/assets/text-behind/demo-egypt-poster.jpg', alt: 'Egypt travel poster with EGYPT text behind the subject' },
                                            ].map((demo) => (
                                                <NextImage
                                                    key={demo.src}
                                                    src={demo.src}
                                                    alt={demo.alt}
                                                    width={150}
                                                    height={100}
                                                    style={{ border: '1.5px solid #000', borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: '#a3a3a3', marginTop: 6, fontFamily: 'monospace' }}>
                                            giant type sandwiched behind your subject · free · no signup
                                        </div>
                                    </div>`,
    `                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1.5px dashed #d4d4d4' }}>
                                        <div style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', color: '#525252', marginBottom: 8 }}>
                                            NO PHOTO YET? START A COLOUR CARD
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
                                            {['#18181b', '#f5f5f4', '#FFE500', '#dc2626', '#2563eb', '#059669'].map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => {
                                                        setCardBgColor(c);
                                                        setColorCardStarted(true);
                                                    }}
                                                    title={'Start a ' + c + ' card'}
                                                    style={{ width: 34, height: 34, border: '2px solid #000', background: c, cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
                                                />
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
                                            {[
                                                ['1:1', 1080, 1080],
                                                ['4:5', 1080, 1350],
                                                ['9:16', 1080, 1920],
                                            ].map(([label, w, h]) => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    className="brutalist-button"
                                                    onClick={() => setCardFormat({ w, h })}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '0.64rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        background: cardFormat.w === w && cardFormat.h === h ? '#000' : '#fff',
                                                        color: cardFormat.w === w && cardFormat.h === h ? '#fff' : '#000',
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: '#a3a3a3', marginTop: 6, fontFamily: 'monospace' }}>
                                            every card keeps its own photo, colour, text & overlays · free · no signup
                                        </div>
                                    </div>`);

/* 32. SiteNav href + page title */
rep('sitenav-href',
    `<SiteNav mode="floating" currentHref="/text-behind" theme="light" align="left" label="TOOLS" />`,
    `<SiteNav mode="floating" currentHref="/quote-card" theme="light" align="left" label="TOOLS" />`);

rep('page-title',
    `                        TEXT BEHIND IMAGE
                    </h1>`,
    `                        CARD STUDIO — QUOTE CARDS
                    </h1>`);

/* 33. Export grid: deck ZIP + send-to-text-behind buttons after thumbnail-lab */
rep('export-buttons',
    `                                    <button
                                        className="brutalist-button"
                                        style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }}
                                        disabled={!bgImage || exporting || sendingHandoff}
                                        onClick={() => setHandoffModalOpen(true)}
                                    >
                                        → OPEN IN THUMBNAIL LAB (NO DOWNLOAD)
                                    </button>
                                </div>`,
    `                                    <button
                                        className="brutalist-button"
                                        style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }}
                                        disabled={(!bgImage && !colorCardStarted) || exporting || sendingHandoff}
                                        onClick={() => setHandoffModalOpen(true)}
                                    >
                                        → OPEN IN THUMBNAIL LAB (NO DOWNLOAD)
                                    </button>
                                    <button
                                        className="brutalist-button"
                                        style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }}
                                        disabled={exporting || sendingHandoff || deckExporting || cards.length < 2}
                                        onClick={handleExportDeck}
                                    >
                                        ⬇ EXPORT DECK — ALL CARDS (ZIP)
                                    </button>
                                    <button
                                        className="brutalist-button"
                                        style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }}
                                        disabled={exporting || sendingHandoff}
                                        onClick={handleSendToTextBehind}
                                    >
                                        → WANT THE TEXT-BEHIND EFFECT? SEND TO TEXT BEHIND
                                    </button>
                                </div>`);

/* 34. Export format buttons: colour cards exportable */
rep('export-btn-png-native',
    `                                    <button className="brutalist-button brutalist-button-primary" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={!bgImage || exporting} onClick={() => handleExport('png', 1)}>
                                        PNG · NATIVE
                                    </button>`,
    `                                    <button className="brutalist-button brutalist-button-primary" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={(!bgImage && !colorCardStarted) || exporting} onClick={() => handleExport('png', 1)}>
                                        PNG · NATIVE
                                    </button>`);

rep('export-btn-png-2x',
    `                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={!bgImage || exporting} onClick={() => handleExport('png', 2)}>
                                        PNG · 2×
                                    </button>`,
    `                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={(!bgImage && !colorCardStarted) || exporting} onClick={() => handleExport('png', 2)}>
                                        PNG · 2×
                                    </button>`);

rep('export-btn-jpg-native',
    `                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={!bgImage || exporting} onClick={() => handleExport('jpg', 1)}>
                                        JPG · NATIVE
                                    </button>`,
    `                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={(!bgImage && !colorCardStarted) || exporting} onClick={() => handleExport('jpg', 1)}>
                                        JPG · NATIVE
                                    </button>`);

rep('export-btn-jpg-2x',
    `                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={!bgImage || exporting} onClick={() => handleExport('jpg', 2)}>
                                        JPG · 2×
                                    </button>`,
    `                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={(!bgImage && !colorCardStarted) || exporting} onClick={() => handleExport('jpg', 2)}>
                                        JPG · 2×
                                    </button>`);

/* 35. NEXT→ row + handoff sourceTool strings */
rep('next-step-row',
    `                                {exportNote && !exporting && (
                                    <NextStepRow currentHref="/text-behind" heading="Poster saved — keep going" />
                                )}`,
    `                                {exportNote && !exporting && (
                                    <NextStepRow currentHref="/quote-card" heading="Card saved — keep going" />
                                )}`);

rep('source-tool-1',
    `await putHandoffImage('thumbnail-lab', blob, { format, sourceTool: 'text-behind' });`,
    `await putHandoffImage('thumbnail-lab', blob, { format, sourceTool: 'quote-card' });`);

rep('source-tool-2',
    `await putHandoffImage('carousel-slicer', blob, { sourceTool: 'text-behind' });`,
    `await putHandoffImage('carousel-slicer', blob, { sourceTool: 'quote-card' });`);

/* Write out */
if (DRY) {
    console.log('DRY RUN — file NOT written.', ok, 'replacements would apply.');
} else {
    fs.writeFileSync(FILE, src);
    console.log('patched:', ok, 'replacements OK');
}
if (fails.length) {
    console.error('FAILED:\n - ' + fails.join('\n - '));
    process.exit(1);
}
