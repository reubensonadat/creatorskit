'use client';

/**
 * src/components/NextStepRow.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The "NEXT →" success-state row (docs/TOOL_INTEGRATION_PLAN.md §4.3).
 *
 * Every tool's export/render success state renders this row: up to 3 relevant
 * hand-off targets pulled from the tool's `handoffs` list in src/data/tools.ts,
 * plus the tool's own Download action. This is the integration users feel —
 * one tool flows into the next instead of dead-ending at a file dialog.
 *
 * Monochrome by design: no yellow (yellow encodes measurement only).
 */

import Link from 'next/link';
import { ArrowRight, Download } from 'lucide-react';
import { EVERY_TOOL, type ToolItem } from '@/data/tools';
import { resolveToolIcon } from '@/components/nav/SiteNav';

export interface NextStepRowProps {
  /** This tool's href — its `handoffs` entry in tools.ts drives the targets. */
  currentHref: string;
  /** Override the target hrefs when the success state knows better than tools.ts. */
  targets?: string[];
  /** The tool's own primary download action. Omit to hide the button. */
  onDownload?: () => void;
  downloadLabel?: string;
  /** Kicker text above/beside the chips. */
  heading?: string;
  /** 'light' for paper tools, 'dark' for studio-dark surfaces. */
  theme?: 'light' | 'dark';
  style?: React.CSSProperties;
  /**
   * Called before a target link is followed (e.g. to stash a hand-off blob in
   * IndexedDB first). Navigation waits for the returned promise, if any.
   */
  onBeforeNavigate?: (href: string) => void | Promise<void>;
}

const STYLES = {
  light: {
    frame: { background: '#ffffff', border: '2px solid #000000', color: '#000000' },
    chip: { background: '#ffffff', border: '1.5px solid #000000', color: '#000000' },
    download: { background: '#000000', border: '2px solid #000000', color: '#ffffff' },
    kicker: '#000000',
    hint: '#52525b',
  },
  dark: {
    frame: { background: '#18181b', border: '2px solid #3f3f46', color: '#fafafa' },
    chip: { background: '#18181b', border: '1.5px solid #52525b', color: '#fafafa' },
    download: { background: '#fafafa', border: '2px solid #fafafa', color: '#000000' },
    kicker: '#fafafa',
    hint: '#a1a1aa',
  },
} as const;

export default function NextStepRow({
  currentHref,
  targets,
  onDownload,
  downloadLabel = 'DOWNLOAD',
  heading = 'EXPORT COMPLETE — KEEP GOING',
  theme = 'light',
  style,
  onBeforeNavigate,
}: NextStepRowProps) {
  const tool: ToolItem | undefined = EVERY_TOOL.find((t) => t.href === currentHref);
  const hrefs = (targets ?? tool?.handoffs ?? []).slice(0, 3);
  const suggestions = hrefs
    .map((href) => EVERY_TOOL.find((t) => t.href === href))
    .filter((t): t is ToolItem => Boolean(t));

  if (suggestions.length === 0 && !onDownload) return null;

  const s = STYLES[theme];

  return (
    <div
      style={{
        ...s.frame,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        padding: '10px 12px',
        boxShadow: '3px 3px 0 #000000',
        borderRadius: 2,
        marginTop: 12,
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.6rem',
          fontWeight: 900,
          fontFamily: 'monospace',
          letterSpacing: '0.06em',
          color: s.kicker,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        <ArrowRight size={13} strokeWidth={3} />
        {heading}
      </span>

      {suggestions.map((t) => {
        const Icon = resolveToolIcon(t.icon);
        return (
          <Link
            key={t.href}
            href={t.href}
            onClick={(e) => {
              if (!onBeforeNavigate) return;
              e.preventDefault();
              Promise.resolve(onBeforeNavigate(t.href)).finally(() => {
                window.location.assign(t.href);
              });
            }}
            style={{
              ...s.chip,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              fontSize: '0.66rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderRadius: 2,
              maxWidth: 210,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
            title={`${t.label} — ${t.hint}`}
          >
            <Icon size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
          </Link>
        );
      })}

      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          style={{
            ...s.download,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            fontSize: '0.66rem',
            fontWeight: 900,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            borderRadius: 2,
            marginLeft: 'auto',
          }}
        >
          <Download size={13} strokeWidth={3} />
          {downloadLabel}
        </button>
      )}
    </div>
  );
}
