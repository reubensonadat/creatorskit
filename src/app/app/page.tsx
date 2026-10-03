'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowLeft,
    AudioLines,
    Droplets,
    Eraser,
    ExternalLink as ExternalLinkIcon,
    FileImage,
    FileText,
    Film,
    Flower2,
    Highlighter,
    Images,
    Layers,
    ListChecks,
    Maximize2,
    MonitorPlay,
    Paintbrush,
    Palette,
    Pin,
    Plus,
    Quote,
    Scissors,
    Search,
    Video,
    X,
} from 'lucide-react';
import { Liquid } from 'liquid-gooey';
import { NATIVE_TOOLS, CURATED_DIRECTORY } from '@/data/tools';
import type { ToolItem } from '@/data/tools';
import { getRecentTools, getPinnedTools, toggleToolPin, pinToolEvicting, QUICK_SLOTS } from '@/lib/app-home';
import { hapticOpen, hapticPin, hapticTap } from '@/lib/haptics';
import { useToast } from '@/hooks/use-toast';

/**
 * src/app/app/page.tsx — APP HOME / TOOL LAUNCHER
 * ─────────────────────────────────────────────────────────────────────────────
 * Owner rulings 2026-10-03:
 *  1. Split the surfaces: `/` = marketing landing; /app = the app home —
 *     "you come, you click, you use your tool". The installed PWA opens
 *     here (manifest start_url). Registered in HIDDEN_TOOLS with fullscreen
 *     chrome so ClientLayout renders it bare (no marketing Navbar).
 *  2. Mobile: floating bottom bar with GOOEY SPRING PHYSICS (liquid-gooey,
 *     Libraries.dev). Exactly 4 items: 3 quick-tool slots + a PLUS button
 *     that opens a pop-up drawer to attach tools to slots (pinned tools
 *     keep their slot; recents auto-fill the rest). The bar lives ONLY on
 *     this page (vanishes inside tools) and only renders on mobile
 *     (.app-bottomnav media rule).
 *  3. Long-press any tool card (or bar slot) to pin/unpin it.
 *  4. Haptics on every tap (src/lib/haptics.ts). No sparkles anywhere.
 * Everything derives from src/data/tools.ts (§3: no hardcoded route lists).
 */

const ICONS: Record<string, LucideIcon> = {
    FileText,
    ListChecks,
    Images,
    MonitorPlay,
    Highlighter,
    Scissors,
    AudioLines,
    Flower2,
    FileImage,
    Maximize2,
    Droplets,
    Video,
    Layers,
    Quote,
    Eraser,
    Palette,
    Film,
    Paintbrush,
    ExternalLink: ExternalLinkIcon,
};

const GROUPS: { key: ToolItem['category']; label: string }[] = [
    { key: 'business', label: 'Business & Money' },
    { key: 'studio', label: 'Studio' },
    { key: 'motion', label: 'Motion' },
    { key: 'utility', label: 'Utility & Data Savers' },
];

/* ─── Long-press (press & hold ~480ms) → pin. Cancels on scroll/drag.
       Suppresses the follow-up click so the Link doesn't navigate. ───────── */
function useLongPress(onLongPress: () => void) {
    const timer = useRef<number | null>(null);
    const origin = useRef<{ x: number; y: number } | null>(null);
    const suppressClick = useRef(false);

    const clear = () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    };

    const down = (e: React.PointerEvent) => {
        origin.current = { x: e.clientX, y: e.clientY };
        suppressClick.current = false;
        clear();
        timer.current = window.setTimeout(() => {
            suppressClick.current = true;
            onLongPress();
        }, 480);
    };

    const move = (e: React.PointerEvent) => {
        if (
            origin.current &&
            (Math.abs(e.clientX - origin.current.x) > 10 || Math.abs(e.clientY - origin.current.y) > 10)
        ) {
            clear();
        }
    };

    return {
        suppressClick,
        handlers: {
            onPointerDown: down,
            onPointerMove: move,
            onPointerUp: clear,
            onPointerLeave: clear,
            onPointerCancel: clear,
            onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        },
    };
}

/* ─── Bottom-bar gooey circle buttons ──────────────────────────────────────── */

const gooBtn: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 999,
    border: 'none',
    background: '#000000',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
};

function GooSlot({
    t,
    pinned,
    index,
    drawerOpen,
    onTogglePin,
}: {
    t: ToolItem;
    pinned: boolean;
    index: number;
    drawerOpen: boolean;
    onTogglePin: (t: ToolItem) => void;
}) {
    const router = useRouter();
    const Icon = ICONS[t.icon] ?? ListChecks;
    const [pressed, setPressed] = useState(false);
    const lp = useLongPress(() => onTogglePin(t));
    return (
        <Liquid.Item
            y={pressed ? 3 : drawerOpen ? -14 : 0}
            scale={pressed ? 0.92 : 1}
            delay={drawerOpen ? index * 40 : 0}
            transition="bouncy"
            style={{ display: 'flex' }}
        >
            <button
                {...lp.handlers}
                onPointerDown={(e) => {
                    setPressed(true);
                    lp.handlers.onPointerDown(e);
                }}
                onPointerUp={() => {
                    setPressed(false);
                    lp.handlers.onPointerUp();
                }}
                onPointerLeave={() => {
                    setPressed(false);
                    lp.handlers.onPointerLeave();
                }}
                onPointerCancel={() => {
                    setPressed(false);
                    lp.handlers.onPointerCancel();
                }}
                onClick={(e) => {
                    if (lp.suppressClick.current) {
                        lp.suppressClick.current = false;
                        return;
                    }
                    hapticOpen();
                    router.push(t.href);
                }}
                title={t.label}
                aria-label={t.label}
                style={gooBtn}
            >
                <Icon size={17} strokeWidth={2.5} color="#ffffff" />
                {pinned && (
                    <span style={{ position: 'absolute', top: 6, right: 6, width: 4, height: 4, background: '#ffffff', borderRadius: 999 }} />
                )}
            </button>
        </Liquid.Item>
    );
}

/* Empty slot — a crisp dashed "socket" (owner ruling 2026-10-03: the gooey
   empty state looked bad). Sits OUTSIDE the goo cluster so it reads as an
   unfilled hole vs the filled liquid nodes. Tap → attach drawer. */
function EmptySlot({ onOpenDrawer }: { onOpenDrawer: () => void }) {
    return (
        <button
            onClick={onOpenDrawer}
            aria-label="Attach a tool to this slot"
            title="Attach a tool"
            style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: '2px dashed #a1a1aa',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
            }}
        >
            <Plus size={13} strokeWidth={2.5} color="#a1a1aa" />
        </button>
    );
}

/* PLUS — crisp yellow action button (springy press via overshoot curve,
   rotates into × while the drawer is open). */
function PlusButton({ drawerOpen, onToggle }: { drawerOpen: boolean; onToggle: () => void }) {
    const [pressed, setPressed] = useState(false);
    return (
        <button
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => setPressed(false)}
            onPointerLeave={() => setPressed(false)}
            onPointerCancel={() => setPressed(false)}
            onClick={onToggle}
            aria-label={drawerOpen ? 'Close customize bar' : 'Customize your bar'}
            style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: '#FFE500',
                color: '#000000',
                border: '2px solid #000000',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                boxSizing: 'border-box',
                transform: pressed ? 'scale(0.9)' : 'scale(1)',
                transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
        >
            <span
                style={{
                    display: 'inline-flex',
                    transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: drawerOpen ? 'rotate(45deg)' : 'none',
                }}
            >
                <Plus size={19} strokeWidth={3} color="#000000" />
            </span>
        </button>
    );
}

/* ─── Launcher cards ───────────────────────────────────────────────────────── */

function ToolCard({
    t,
    pinned,
    onTogglePin,
}: {
    t: ToolItem;
    pinned: boolean;
    onTogglePin: (t: ToolItem) => void;
}) {
    const Icon = ICONS[t.icon] ?? ListChecks;
    const muted = t.badge === 'IN DEVELOPMENT';
    const lp = useLongPress(() => onTogglePin(t));
    return (
        <Link
            href={t.href}
            {...lp.handlers}
            onClick={(e) => {
                if (lp.suppressClick.current) {
                    e.preventDefault();
                    lp.suppressClick.current = false;
                    return;
                }
                hapticOpen();
            }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '14px 14px 15px',
                background: '#ffffff',
                color: '#000000',
                border: '2px solid #000000',
                borderRadius: '4px',
                textDecoration: 'none',
                boxShadow: '3px 3px 0 #000000',
                transition: 'all 0.12s ease',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'manipulation',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = '5px 5px 0 #000000';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '3px 3px 0 #000000';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                    style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #000000',
                        background: '#ffffff',
                    }}
                >
                    <Icon size={15} strokeWidth={2.5} />
                </div>
                {pinned ? (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: '0.56rem',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            padding: '2px 6px',
                            background: '#000000',
                            color: '#ffffff',
                        }}
                    >
                        <Pin size={9} strokeWidth={3} />
                        PINNED
                    </span>
                ) : t.badge ? (
                    <span
                        style={{
                            fontSize: '0.56rem',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            padding: '2px 6px',
                            background: muted ? '#e5e5e5' : '#000000',
                            color: muted ? '#555555' : '#ffffff',
                        }}
                    >
                        {t.badge}
                    </span>
                ) : (
                    <span
                        style={{
                            fontSize: '0.58rem',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            color: '#888888',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {t.hint}
                    </span>
                )}
            </div>
            <div style={{ fontWeight: 900, fontSize: '0.92rem', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                {t.label}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#555555', lineHeight: 1.45 }}>{t.desc}</div>
        </Link>
    );
}

function SectionHead({ label, count }: { label: string; count: number }) {
    return (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, background: '#000000', flexShrink: 0 }} />
            <h2
                style={{
                    fontSize: 'clamp(1.05rem, 3vw, 1.35rem)',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0,
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </h2>
            <span
                style={{
                    background: '#000000',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    padding: '1px 7px',
                }}
            >
                {count}
            </span>
        </div>
    );
}

export default function AppHome() {
    const router = useRouter();
    const { toast } = useToast();
    const [q, setQ] = useState('');
    const [recentHrefs, setRecentHrefs] = useState<string[]>([]);
    const [pinHrefs, setPinHrefs] = useState<string[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const pool = useMemo(() => [...NATIVE_TOOLS, ...CURATED_DIRECTORY], []);
    const byHref = useMemo(() => new Map(pool.map((t) => [t.href, t])), [pool]);

    // Quick-tool state is localStorage-backed → read after mount so the
    // server-rendered markup stays hydration-stable.
    useEffect(() => {
        setRecentHrefs(getRecentTools());
        setPinHrefs(getPinnedTools());
    }, []);

    const query = q.trim().toLowerCase();
    const matches = useMemo(() => {
        if (!query) return [];
        return pool.filter((t) => `${t.label} ${t.hint} ${t.desc}`.toLowerCase().includes(query));
    }, [pool, query]);

    const recentItems = useMemo<ToolItem[]>(
        () =>
            recentHrefs
                .map((h) => byHref.get(h))
                .filter((t): t is ToolItem => Boolean(t))
                .slice(0, QUICK_SLOTS),
        [recentHrefs, byHref],
    );

    const pinnedSet = useMemo(() => new Set(pinHrefs), [pinHrefs]);

    // Bottom-bar quick slots: pinned first, recents fill the rest.
    const quickItems = useMemo<ToolItem[]>(() => {
        const out: ToolItem[] = [];
        for (const h of pinHrefs) {
            const t = byHref.get(h);
            if (t && !out.includes(t)) out.push(t);
        }
        for (const h of recentHrefs) {
            if (out.length >= QUICK_SLOTS) break;
            const t = byHref.get(h);
            if (t && !out.includes(t)) out.push(t);
        }
        return out.slice(0, QUICK_SLOTS);
    }, [pinHrefs, recentHrefs, byHref]);

    const emptySlots = Math.max(0, QUICK_SLOTS - quickItems.length);

    // Launcher keys: "/" focuses search from anywhere on the page.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement !== searchRef.current) {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === 'Escape') setDrawerOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const togglePin = (t: ToolItem) => {
        const nowPinned = toggleToolPin(t.href);
        setPinHrefs(getPinnedTools());
        hapticPin();
        toast({
            title: nowPinned ? `PINNED — ${t.label.split(' ')[0].toUpperCase()}` : 'UNPINNED',
            description: nowPinned
                ? 'Keeps its slot in your bottom bar.'
                : 'Long-press any tool to pin it again.',
        });
    };

    /** Drawer toggle: unpin / pin; when the bar is full the newest pin evicts the oldest. */
    const toggleFromDrawer = (t: ToolItem) => {
        if (pinnedSet.has(t.href)) {
            togglePin(t);
            return;
        }
        if (pinHrefs.length >= QUICK_SLOTS) {
            const next = pinToolEvicting(t.href);
            setPinHrefs(next);
            hapticPin();
            toast({
                title: `ADDED — ${t.label.split(' ')[0].toUpperCase()}`,
                description: 'Bar was full — the oldest slot was replaced.',
            });
            return;
        }
        togglePin(t);
    };

    return (
        <div
            className="app-bottomnav-pad"
            style={{ background: '#f4f4f5', minHeight: '100vh', color: '#000000' }}
        >
            {/* ─── HEADER (own chrome — fullscreen route, no marketing Navbar) ─── */}
            <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffff', borderBottom: '2px solid #000000' }}>
                <div
                    style={{
                        maxWidth: 1200,
                        margin: '0 auto',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                >
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
                        <div
                            style={{
                                width: 30,
                                height: 30,
                                overflow: 'hidden',
                                border: '2px solid #000000',
                                background: '#ffffff',
                                boxShadow: '2px 2px 0 #000000',
                            }}
                        >
                            <img src="/logo.png" alt="CK" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '-0.02em', fontFamily: 'monospace' }}>
                            CK<span style={{ color: '#71717a' }}>.win</span>
                        </span>
                        <span
                            style={{
                                background: '#000000',
                                color: '#ffffff',
                                fontSize: '0.56rem',
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                letterSpacing: '0.14em',
                                padding: '3px 8px',
                            }}
                        >
                            APP HOME
                        </span>
                    </Link>

                    <Link
                        href="/"
                        onClick={() => hapticTap()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: '#ffffff',
                            color: '#000000',
                            border: '2px solid #000000',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '0.7rem',
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textDecoration: 'none',
                            boxShadow: '3px 3px 0 #000000',
                            transition: 'all 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translate(-2px, -2px)';
                            e.currentTarget.style.boxShadow = '5px 5px 0 #000000';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '3px 3px 0 #000000';
                        }}
                    >
                        <ArrowLeft size={13} />
                        Back to Site
                    </Link>
                </div>
            </header>

            {/* ─── LAUNCHER ──────────────────────────────────────────────────────── */}
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(26px, 5vw, 44px) 16px 60px' }}>
                <h1
                    style={{
                        fontSize: 'clamp(1.8rem, 6vw, 3rem)',
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.08,
                        margin: '0 0 10px',
                    }}
                >
                    What are you making?
                </h1>
                <p
                    style={{
                        fontSize: '0.92rem',
                        color: '#444444',
                        fontWeight: 500,
                        margin: '0 0 24px',
                        fontFamily: 'monospace',
                    }}
                >
                    Tap a tool — free, no account, everything runs on your device.
                </p>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 8 }}>
                    <Search
                        size={16}
                        strokeWidth={2.5}
                        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#000000', pointerEvents: 'none' }}
                    />
                    <input
                        ref={searchRef}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const first = matches[0];
                                if (first) {
                                    hapticOpen();
                                    router.push(first.href);
                                }
                            }
                            if (e.key === 'Escape') {
                                setQ('');
                                e.currentTarget.blur();
                            }
                        }}
                        aria-label="Search tools"
                        placeholder={`Search ${pool.length} tools — invoice, captions, thumbnail…`}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '14px 64px 14px 40px',
                            background: '#ffffff',
                            color: '#000000',
                            border: '2px solid #000000',
                            borderRadius: '4px',
                            boxShadow: '3px 3px 0 #000000',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            outline: 'none',
                        }}
                    />
                    <span
                        style={{
                            position: 'absolute',
                            right: 14,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.6rem',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            color: '#888888',
                            border: '1px solid #cccccc',
                            padding: '2px 6px',
                        }}
                    >
                        /
                    </span>
                </div>
                <div
                    style={{
                        fontSize: '0.6rem',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        letterSpacing: '0.08em',
                        color: '#888888',
                        margin: '0 0 34px 2px',
                    }}
                >
                    LONG-PRESS ANY TOOL TO PIN IT · USE + BELOW TO ATTACH TOOLS TO YOUR BAR
                </div>

                {/* Results (searching) */}
                {query ? (
                    matches.length > 0 ? (
                        <>
                            <SectionHead label={`Results — “${q.trim()}”`} count={matches.length} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
                                {matches.map((t) => (
                                    <ToolCard key={t.href} t={t} pinned={pinnedSet.has(t.href)} onTogglePin={togglePin} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                border: '2px solid #000000',
                                background: '#ffffff',
                                boxShadow: '3px 3px 0 #000000',
                                padding: '28px 20px',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: 8 }}>NO MATCHES</div>
                            <div style={{ fontSize: '0.78rem', color: '#555555', fontFamily: 'monospace', marginBottom: 16 }}>
                                Try one of these instead:
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                                {['invoice', 'captions', 'thumbnail', 'watermark'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            hapticTap();
                                            setQ(s);
                                        }}
                                        style={{
                                            padding: '7px 14px',
                                            background: '#ffffff',
                                            color: '#000000',
                                            border: '2px solid #000000',
                                            borderRadius: '4px',
                                            fontFamily: 'monospace',
                                            fontWeight: 900,
                                            fontSize: '0.7rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            cursor: 'pointer',
                                            boxShadow: '2px 2px 0 #000000',
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                ) : (
                    <>
                        {/* Jump back in — the last few tools actually used */}
                        {recentItems.length > 0 && (
                            <section style={{ marginBottom: 38 }}>
                                <SectionHead label="Jump Back In" count={recentItems.length} />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
                                    {recentItems.map((t) => (
                                        <ToolCard key={t.href} t={t} pinned={pinnedSet.has(t.href)} onTogglePin={togglePin} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Grouped launcher */}
                        <div id="app-tools">
                            {GROUPS.map((g) => {
                                const tools = NATIVE_TOOLS.filter((t) => t.category === g.key);
                                if (tools.length === 0) return null;
                                return (
                                    <section key={g.key} style={{ marginBottom: 38 }}>
                                        <SectionHead label={g.label} count={tools.length} />
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
                                            {tools.map((t) => (
                                                <ToolCard key={t.href} t={t} pinned={pinnedSet.has(t.href)} onTogglePin={togglePin} />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        {/* Around the web (curated externals via ad bridge) */}
                        <section>
                            <SectionHead label="Around the Web" count={CURATED_DIRECTORY.length} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
                                {CURATED_DIRECTORY.map((t) => (
                                    <ToolCard key={t.href} t={t} pinned={pinnedSet.has(t.href)} onTogglePin={togglePin} />
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </main>

            {/* ─── FOOTER ────────────────────────────────────────────────────────── */}
            <footer style={{ borderTop: '2px solid #000000', background: '#ffffff' }}>
                <div
                    style={{
                        maxWidth: 1200,
                        margin: '0 auto',
                        padding: '22px 16px 30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 14,
                    }}
                >
                    <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.08em' }}>
                        CREATORSKIT · APP HOME · RUNS ON YOUR DEVICE
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                        <Link
                            href="/your-data"
                            onClick={() => hapticTap()}
                            style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.08em', color: '#000000', textDecoration: 'none', borderBottom: '2px solid #000000', paddingBottom: 2 }}
                        >
                            YOUR DATA
                        </Link>
                        <Link
                            href="/privacy"
                            onClick={() => hapticTap()}
                            style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.08em', color: '#000000', textDecoration: 'none', borderBottom: '2px solid #000000', paddingBottom: 2 }}
                        >
                            PRIVACY
                        </Link>
                        <Link
                            href="/terms"
                            onClick={() => hapticTap()}
                            style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.08em', color: '#000000', textDecoration: 'none', borderBottom: '2px solid #000000', paddingBottom: 2 }}
                        >
                            TERMS
                        </Link>
                    </div>
                </div>
                <div
                    style={{
                        maxWidth: 1200,
                        margin: '0 auto',
                        padding: '0 16px 26px',
                        fontSize: '0.62rem',
                        fontFamily: 'monospace',
                        color: '#888888',
                        letterSpacing: '0.06em',
                    }}
                >
                    INSTALL TIP: BROWSER MENU → “ADD TO HOME SCREEN” AND THIS PAGE BECOMES YOUR APP.
                </div>
            </footer>

            {/* ─── BOTTOM NAVIGATION (mobile only · this page only) ───────────────
          Owner spec 2026-10-03: 4 items — 3 quick-tool slots + PLUS, spring
          physics + gooey melt via liquid-gooey (Libraries.dev). FULL-BLEED
          system bar: flush to both screen edges, slim height, flat top rule
          (not a floating island). Empty slots = dashed sockets. PLUS opens
          the attach-tools drawer. Hidden ≥768px via .app-bottomnav. */}
            <nav
                className="app-bottomnav"
                aria-label="App navigation"
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    zIndex: 60,
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        pointerEvents: 'auto',
                        width: '100%',
                        background: '#ffffff',
                        borderTop: '2px solid #000000',
                        paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0px))',
                        boxSizing: 'border-box',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', padding: '5px 18px' }}>
                        <Liquid blur={5} contrast={16} fill="#000000" filterPadding={40} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            {quickItems.map((t, i) => (
                                <GooSlot
                                    key={t.href}
                                    t={t}
                                    pinned={pinnedSet.has(t.href)}
                                    index={i}
                                    drawerOpen={drawerOpen}
                                    onTogglePin={togglePin}
                                />
                            ))}
                        </Liquid>
                        {Array.from({ length: emptySlots }).map((_, i) => (
                            <EmptySlot key={`empty-${i}`} onOpenDrawer={() => { hapticTap(); setDrawerOpen(true); }} />
                        ))}
                        <PlusButton
                            drawerOpen={drawerOpen}
                            onToggle={() => {
                                hapticTap();
                                setDrawerOpen((v) => !v);
                            }}
                        />
                    </div>
                </div>
            </nav>

            {/* ─── ATTACH-TOOLS DRAWER (pop-up sheet above the bar) ───────────────── */}
            {drawerOpen && (
                <>
                    <div
                        className="app-drawer-backdrop"
                        onClick={() => {
                            hapticTap();
                            setDrawerOpen(false);
                        }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 65 }}
                        aria-hidden
                    />
                    <div
                        className="app-drawer"
                        role="dialog"
                        aria-label="Customize your bottom bar"
                        style={{
                            position: 'fixed',
                            left: 12,
                            right: 12,
                            bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
                            zIndex: 66,
                            maxWidth: 520,
                            margin: '0 auto',
                            background: '#ffffff',
                            border: '2px solid #000000',
                            borderRadius: '14px',
                            boxShadow: '6px 6px 0 #000000',
                            maxHeight: '62vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Drawer header */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                padding: '12px 14px',
                                borderBottom: '2px solid #000000',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.1em' }}>
                                    CUSTOMIZE YOUR BAR
                                </span>
                                <span
                                    style={{
                                        background: '#000000',
                                        color: '#ffffff',
                                        fontSize: '0.62rem',
                                        fontFamily: 'monospace',
                                        fontWeight: 900,
                                        padding: '1px 7px',
                                    }}
                                >
                                    {pinHrefs.length}/{QUICK_SLOTS}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    hapticTap();
                                    setDrawerOpen(false);
                                }}
                                aria-label="Close"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 30,
                                    height: 30,
                                    background: '#ffffff',
                                    border: '2px solid #000000',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={15} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Drawer list — every tool, tap to attach/detach */}
                        <div style={{ overflowY: 'auto', padding: 6 }}>
                            {pool.map((t) => {
                                const Icon = ICONS[t.icon] ?? ListChecks;
                                const attached = pinnedSet.has(t.href);
                                return (
                                    <button
                                        key={t.href}
                                        onClick={() => toggleFromDrawer(t)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            width: '100%',
                                            padding: '9px 10px',
                                            background: attached ? '#f4f4f5' : '#ffffff',
                                            border: 'none',
                                            borderBottom: '1px solid #e5e5e5',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 28,
                                                height: 28,
                                                flexShrink: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid #000000',
                                            }}
                                        >
                                            <Icon size={14} strokeWidth={2.5} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 900, fontSize: '0.8rem', letterSpacing: '-0.01em' }}>{t.label}</div>
                                            <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#888888', letterSpacing: '0.06em' }}>
                                                {t.hint}
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: '0.58rem',
                                                fontFamily: 'monospace',
                                                fontWeight: 900,
                                                letterSpacing: '0.08em',
                                                padding: '3px 8px',
                                                background: attached ? '#000000' : '#ffffff',
                                                color: attached ? '#ffffff' : '#000000',
                                                border: attached ? 'none' : '2px solid #000000',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {attached ? 'IN BAR' : '+ ADD'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Drawer footer — nav completeness + done */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 10,
                                padding: '10px 14px',
                                borderTop: '2px solid #000000',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <Link
                                    href="/your-data"
                                    onClick={() => hapticTap()}
                                    style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.08em', color: '#000000', textDecoration: 'none', borderBottom: '2px solid #000000', paddingBottom: 2 }}
                                >
                                    YOUR DATA
                                </Link>
                                <Link
                                    href="/"
                                    onClick={() => hapticTap()}
                                    style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.08em', color: '#000000', textDecoration: 'none', borderBottom: '2px solid #000000', paddingBottom: 2 }}
                                >
                                    BACK TO SITE
                                </Link>
                            </div>
                            <button
                                onClick={() => {
                                    hapticTap();
                                    setDrawerOpen(false);
                                }}
                                style={{
                                    padding: '8px 18px',
                                    background: '#000000',
                                    color: '#ffffff',
                                    border: '2px solid #000000',
                                    fontFamily: 'monospace',
                                    fontWeight: 900,
                                    fontSize: '0.68rem',
                                    letterSpacing: '0.08em',
                                    cursor: 'pointer',
                                    boxShadow: '2px 2px 0 #000000',
                                }}
                            >
                                DONE
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
