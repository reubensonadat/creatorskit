'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LayoutGrid, ChevronDown } from 'lucide-react';
import { ALL_TOOLS } from '@/data/tools';

interface StudioToolsDropdownProps {
  currentHref: string;
  theme?: 'dark' | 'light';
}

export default function StudioToolsDropdown({
  currentHref,
  theme = 'dark',
}: StudioToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const isDark = theme === 'dark';

  return (
    <div ref={rootRef} style={{ position: 'relative', zIndex: 100 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '5px 9px',
          fontSize: '0.7rem',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: isOpen ? (isDark ? '#27272a' : '#000000') : isDark ? '#141417' : '#ffffff',
          color: isOpen ? '#ffffff' : isDark ? '#ffffff' : '#000000',
          border: isDark ? '1px solid #27272a' : '1.5px solid #000000',
          fontFamily: 'monospace',
          fontWeight: 900,
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          transition: 'all 0.12s',
        }}
      >
        <LayoutGrid size={13} />
        <span>Tools</span>
        <ChevronDown
          size={11}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 320,
            maxHeight: 460,
            overflowY: 'auto',
            background: isDark ? '#141417' : '#ffffff',
            border: isDark ? '1px solid #27272a' : '2px solid #000000',
            borderRadius: 6,
            boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.85)' : '4px 4px 0 #000000',
            zIndex: 150,
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
          className="no-scrollbar"
        >
          <div
            style={{
              padding: '6px 10px',
              fontSize: '0.62rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              color: isDark ? '#a1a1aa' : '#888888',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderBottom: isDark ? '1px solid #27272a' : '1px solid #eeeeee',
              marginBottom: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>All Tools (Alphabetical)</span>
            <span
              style={{
                background: isDark ? '#27272a' : '#000000',
                color: isDark ? '#FFE500' : '#ffffff',
                padding: '1px 6px',
                borderRadius: 2,
              }}
            >
              {ALL_TOOLS.length}
            </span>
          </div>

          {ALL_TOOLS.map((t) => {
            const isCurrent = t.href === currentHref;
            return (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 4,
                  border: isCurrent
                    ? isDark
                      ? '1px solid #FFE500'
                      : '1.5px solid #000000'
                    : '1px solid transparent',
                  background: isCurrent
                    ? isDark
                      ? '#27272a'
                      : '#FFE500'
                    : 'transparent',
                  color: isCurrent
                    ? isDark
                      ? '#FFE500'
                      : '#000000'
                    : isDark
                    ? '#ffffff'
                    : '#000000',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.74rem',
                  fontWeight: isCurrent ? 900 : 600,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = isDark ? '#202025' : '#f4f4f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span>{t.label}</span>
                <span
                  style={{
                    fontSize: '0.54rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    color: isCurrent
                      ? isDark
                        ? '#FFE500'
                        : '#000000'
                      : isDark
                      ? '#71717a'
                      : '#888888',
                    background: isCurrent
                      ? isDark
                        ? 'rgba(255, 229, 0, 0.15)'
                        : 'rgba(0, 0, 0, 0.1)'
                      : isDark
                      ? '#27272a'
                      : '#f0f0f0',
                    padding: '1px 5px',
                    borderRadius: 2,
                  }}
                >
                  {t.hint}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
