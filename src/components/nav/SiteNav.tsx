'use client';

/**
 * SiteNav — the ONE navigation component family for the whole app.
 * (docs/TOOL_INTEGRATION_PLAN.md §3)
 *
 * - mode="floating": a compact pill button that opens the searchable tool
 *   menu. Used by full-screen canvases (teleprompter, text-behind, bouquet,
 *   thumbnail-lab, video-grabber…) where a sticky bar would steal space.
 * - mode="bar": embedded/marketing chrome (Navbar & ToolLayout adopt it
 *   incrementally).
 *
 * Data source: src/data/tools.ts only. No hardcoded route lists here —
 * this file is one of the two allowed importers of the tools dataset.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  ChevronDown,
  Search,
  X,
  ArrowUpRight,
  FileText,
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
  Eraser,
  Palette,
  Film,
  Paintbrush,
  Quote,
  Ruler,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { VISIBLE_TOOLS, type ToolItem } from '@/data/tools';
import { externalLinkClick } from '@/components/ExternalAdGate';

// ─── Icon resolver — the single name→icon map in the codebase ────────────────
const ICONS: Record<string, LucideIcon> = {
  FileText,
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
  Eraser,
  Palette,
  Film,
  Paintbrush,
  Quote,
  Ruler,
  ExternalLink,
};

export function resolveToolIcon(name: string): LucideIcon {
  return ICONS[name] ?? LayoutGrid;
}

// ─── Category presentation ────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  business: 'BUSINESS & LEGAL',
  studio: 'STUDIO',
  motion: 'MOTION',
  audio: 'AUDIO',
  utility: 'UTILITIES',
  directory: 'MORE TOOLS',
};

interface Group {
  key: string;
  label: string;
  items: ToolItem[];
}

function groupTools(tools: ToolItem[]): Group[] {
  const groups: Group[] = [];
  const byKey = new Map<string, Group>();
  for (const t of tools) {
    const key = t.category ?? 'utility';
    let g = byKey.get(key);
    if (!g) {
      g = { key, label: CATEGORY_LABELS[key] ?? key.toUpperCase(), items: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(t);
  }
  return groups;
}

// ─── Component ────────────────────────────────────────────────────────────────
export interface SiteNavProps {
  mode?: 'floating' | 'bar';
  /** href of the current tool (rendered as active) */
  currentHref?: string;
  theme?: 'dark' | 'light';
  align?: 'left' | 'right';
  /** pill label (floating mode) */
  label?: string;
}

export default function SiteNav({
  mode = 'floating',
  currentHref,
  theme = 'dark',
  align = 'right',
  label = 'Tools',
}: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPopState = () => setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPopState);
    // autofocus search when opening
    requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPopState);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VISIBLE_TOOLS;
    return VISIBLE_TOOLS.filter((t) =>
      `${t.label} ${t.hint} ${t.desc}`.toLowerCase().includes(q)
    );
  }, [query]);

  const groups = useMemo(() => groupTools(filtered), [filtered]);
  const isDark = theme === 'dark';

  if (mode === 'bar') {
    // Bar chrome is adopted by Navbar/ToolLayout incrementally; floating is
    // the mode shipped first. Bar mode renders the same pill (used in tool
    // topbars) until the full bar layout lands.
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', zIndex: 100 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open tools menu"
        aria-expanded={open}
        style={{
          padding: '6px 12px',
          fontSize: '0.74rem',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: open ? (isDark ? '#27272a' : '#000000') : isDark ? '#141417' : '#ffffff',
          color: open ? '#ffffff' : isDark ? '#ffffff' : '#000000',
          border: isDark ? '1px solid #27272a' : '2px solid #000000',
          boxShadow: isDark ? 'none' : '2px 2px 0 #000000',
          fontFamily: 'monospace',
          fontWeight: 900,
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          transition: 'all 0.12s',
          whiteSpace: 'nowrap',
        }}
      >
        <LayoutGrid size={13} />
        <span>{label}</span>
        <ChevronDown
          size={11}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
        />
      </button>

      {open && (
        <div
          className="sitenav-drop"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(align === 'right' ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' }),
            width: 320,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'min(480px, calc(100vh - 120px))',
            display: 'flex',
            flexDirection: 'column',
            background: isDark ? '#141417' : '#ffffff',
            border: isDark ? '1px solid #27272a' : '2px solid #000000',
            borderRadius: 6,
            boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.85)' : '4px 4px 0 #000000',
            zIndex: 150,
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderBottom: isDark ? '1px solid #27272a' : '2px solid #000000',
              background: isDark ? '#09090b' : '#f4f4f5',
            }}
          >
            <Search size={13} color={isDark ? '#a1a1aa' : '#71717a'} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${VISIBLE_TOOLS.length} tools…`}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: isDark ? '#ffffff' : '#000000',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: isDark ? '#a1a1aa' : '#71717a' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* List */}
          <div
            className="no-scrollbar"
            style={{ overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {groups.length === 0 && (
              <div
                style={{
                  padding: '18px 10px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: isDark ? '#71717a' : '#71717a',
                }}
              >
                No tools match “{query}”
              </div>
            )}
            {groups.map((g) => (
              <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.58rem',
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    color: '#71717a',
                    padding: '4px 8px 2px',
                  }}
                >
                  {g.label}
                </div>
                {g.items.map((tool) => {
                  const Icon = resolveToolIcon(tool.icon);
                  const active = currentHref === tool.href;
                  const isExtLink = tool.isExternal === true;
                  const extTarget = tool.externalUrl || tool.href;
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      onClick={(e) => {
                        setOpen(false);
                        if (isExtLink) externalLinkClick(e, extTarget, tool.label);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 8px',
                        borderRadius: 4,
                        textDecoration: 'none',
                        background: active ? (isDark ? '#27272a' : '#000000') : 'transparent',
                        color: active ? '#ffffff' : isDark ? '#ffffff' : '#000000',
                        border: '1px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = isDark ? '#1f1f23' : '#f4f4f5';
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Icon size={14} style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          flex: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.74rem',
                          fontWeight: 900,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tool.label}
                      </span>
                      {tool.isExternal ? (
                        <ArrowUpRight size={12} style={{ flexShrink: 0, color: '#71717a' }} />
                      ) : (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.55rem',
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            color: '#71717a',
                            flexShrink: 0,
                          }}
                        >
                          {tool.hint}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderTop: isDark ? '1px solid #27272a' : '2px solid #000000',
              background: isDark ? '#09090b' : '#f4f4f5',
              color: isDark ? '#ffffff' : '#000000',
              textDecoration: 'none',
              fontFamily: 'monospace',
              fontSize: '0.68rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <span>All tools home</span>
            <span style={{ color: '#71717a' }}>CK.win</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Shared list renderer — used by Navbar & ToolLayout chrome ────────────────
// Keeps ALL_TOOLS/VISIBLE_TOOLS imported in exactly one file (this one).
export const SITE_TOOL_COUNT = VISIBLE_TOOLS.length;

export function findTool(href: string): ToolItem | undefined {
  return VISIBLE_TOOLS.find((t) => t.href === href);
}

export interface SiteNavListProps {
  /** href of the current page (rendered as active) */
  currentHref?: string;
  /** called after any link is clicked (close menus/drawers) */
  onNavigate?: () => void;
  /**
   * compact — Navbar desktop dropdown rows (label + hint, no icons)
   * roomy   — Navbar mobile menu rows (two-line, badge chip)
   * rail    — ToolLayout desktop icon rail (icon-only until expanded)
   * drawer  — ToolLayout mobile drawer rows (icon + label + hint)
   */
  variant?: 'compact' | 'roomy' | 'rail' | 'drawer';
  /** rail variant only: false = collapsed icon-only, true = expanded with labels */
  expanded?: boolean;
}

export function SiteNavList({ currentHref, onNavigate, variant = 'compact', expanded = true }: SiteNavListProps) {
  return (
    <>
      {VISIBLE_TOOLS.map((tool) => {
        const isActive = currentHref === tool.href;
        const isExt = tool.isExternal && (tool.externalUrl || tool.href).startsWith('http');

        if (isExt) {
          const Icon = resolveToolIcon(tool.icon);
          const extTarget = tool.externalUrl || '';
          const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            onNavigate?.();
            externalLinkClick(e, extTarget, tool.label);
          };

          if (variant === 'rail') {
            return (
              <a
                key={tool.href}
                href={tool.href}
                title={tool.label}
                onClick={handleClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: expanded ? 10 : 0,
                  padding: expanded ? '8px 10px' : '0',
                  width: expanded ? '100%' : '36px',
                  height: expanded ? 'auto' : '36px',
                  margin: expanded ? '0 0 3px 0' : '0 auto 4px auto',
                  textDecoration: 'none',
                  position: 'relative',
                  background: 'transparent',
                  color: '#444444',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  borderRadius: 4,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f4f4f5';
                  e.currentTarget.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#444444';
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!expanded && (
                  <ArrowUpRight size={9} style={{ position: 'absolute', top: 1, right: 1, color: '#71717a' }} />
                )}
                {expanded && (
                  <>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.label}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.52rem',
                        fontFamily: 'monospace',
                        opacity: 0.7,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      EXT <ArrowUpRight size={10} />
                    </span>
                  </>
                )}
              </a>
            );
          }

          if (variant === 'drawer') {
            return (
              <a
                key={tool.href}
                href={tool.href}
                title={tool.label}
                onClick={handleClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  width: '100%',
                  textDecoration: 'none',
                  background: 'transparent',
                  color: '#444444',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  borderRadius: 4,
                  marginBottom: 2,
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.label}</span>
                <ArrowUpRight size={12} style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.7 }} />
              </a>
            );
          }

          // compact & roomy — Navbar rows (match internal row styling)
          return (
            <a
              key={tool.href}
              href={tool.href}
              onClick={handleClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: variant === 'roomy' ? '12px 14px' : '8px 12px',
                textDecoration: 'none',
                transition: 'background 0.1s',
                borderBottom: variant === 'roomy' ? '1px solid #f0f0f0' : 'none',
                background: 'transparent',
                color: '#000000',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f4f4f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {variant === 'roomy' ? (
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{tool.label}</div>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'monospace',
                      color: '#888888',
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {tool.hint} <ArrowUpRight size={9} />
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{tool.label}</span>
              )}
              {tool.badge ? (
                <span
                  style={{
                    fontSize: '0.55rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    background: '#000000',
                    color: '#ffffff',
                    padding: '2px 6px',
                  }}
                >
                  {tool.badge}
                </span>
              ) : (
                variant === 'compact' && (
                  <span
                    style={{
                      fontSize: '0.58rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '0.06em',
                      color: '#71717a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    EXT <ArrowUpRight size={10} />
                  </span>
                )
              )}
            </a>
          );
        }

        if (variant === 'rail') {
          const Icon = resolveToolIcon(tool.icon);
          return (
            <Link
              key={tool.href}
              href={tool.href}
              title={tool.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: expanded ? 10 : 0,
                padding: expanded ? '8px 10px' : '0',
                width: expanded ? '100%' : '36px',
                height: expanded ? 'auto' : '36px',
                margin: expanded ? '0 0 3px 0' : '0 auto 4px auto',
                textDecoration: 'none',
                background: isActive ? '#000000' : 'transparent',
                color: isActive ? '#ffffff' : '#444444',
                fontWeight: isActive ? 900 : 600,
                fontSize: '0.78rem',
                justifyContent: expanded ? 'flex-start' : 'center',
                borderRadius: 4,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f4f4f5';
                  e.currentTarget.style.color = '#000000';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#444444';
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {expanded && (
                <>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.52rem', fontFamily: 'monospace', opacity: 0.7, flexShrink: 0 }}>
                    {tool.hint}
                  </span>
                </>
              )}
            </Link>
          );
        }

        if (variant === 'drawer') {
          const Icon = resolveToolIcon(tool.icon);
          return (
            <Link
              key={tool.href}
              href={tool.href}
              title={tool.label}
              onClick={onNavigate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                width: '100%',
                textDecoration: 'none',
                background: isActive ? '#000000' : 'transparent',
                color: isActive ? '#ffffff' : '#444444',
                fontWeight: isActive ? 900 : 600,
                fontSize: '0.82rem',
                borderRadius: 4,
                marginBottom: 2,
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.52rem', fontFamily: 'monospace', opacity: 0.7, flexShrink: 0 }}>
                {tool.hint}
              </span>
            </Link>
          );
        }

        // compact & roomy — Navbar rows
        return (
          <Link
            key={tool.href}
            href={tool.href}
            onClick={onNavigate}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: variant === 'roomy' ? '12px 14px' : '8px 12px',
              textDecoration: 'none',
              transition: 'background 0.1s',
              borderBottom: variant === 'roomy' ? '1px solid #f0f0f0' : 'none',
              background: isActive ? '#000000' : 'transparent',
              color: isActive ? '#ffffff' : '#000000',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = '#f4f4f5';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            {variant === 'roomy' ? (
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{tool.label}</div>
                <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: isActive ? '#999999' : '#888888', marginTop: 2 }}>
                  {tool.hint}
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{tool.label}</span>
            )}
            {tool.badge ? (
              <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, background: isActive ? '#ffffff' : '#000000', color: isActive ? '#000000' : '#ffffff', padding: '2px 6px' }}>
                {tool.badge}
              </span>
            ) : (
              variant === 'compact' && (
                <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.06em', color: isActive ? '#a1a1aa' : '#71717a' }}>
                  {tool.hint}
                </span>
              )
            )}
          </Link>
        );
      })}
    </>
  );
}
