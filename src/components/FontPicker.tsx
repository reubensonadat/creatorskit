"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const GF_META_URL = "https://fonts.google.com/metadata/fonts";
const CACHE_KEY = "creatorkit:google-fonts:v1";

interface FontPickerProps {
  id: string;
  value: string;
  fallbackFonts: string[];
  onChange: (value: string) => void;
}

const injectFont = (family: string, href?: string) => {
  const slug = family.replace(/ /g, "+");
  const id = `gfont-${slug}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href =
    href ??
    `https://fonts.googleapis.com/css2?family=${slug}:wght@400;600;700;800;900&display=swap`;
  document.head.appendChild(link);
};

export default function FontPicker({
  id,
  value,
  fallbackFonts,
  onChange,
}: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [families, setFamilies] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let list: string[] | null = null;
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 5) list = parsed;
        }
      } catch {
        list = null;
      }
      if (!list) {
        try {
          const res = await fetch(GF_META_URL);
          let data: { familyMetadataList?: { family?: string }[] };
          try {
            data = await res.json();
          } catch {
            const text = await res.text();
            data = JSON.parse(text.replace(/^\)\]\}'\n/, ""));
          }
          list = (data?.familyMetadataList ?? [])
            .map((i) => i.family)
            .filter((f): f is string => typeof f === "string" && f.length > 0);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(list));
          } catch {
            // Cache full — keep session-only
          }
        } catch {
          list = [];
        }
      }
      if (!cancelled && list) setFamilies(list);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const allFamilies = useMemo(() => {
    const merged = [...families, ...extras];
    return merged.length ? merged : fallbackFonts;
  }, [families, extras, fallbackFonts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? allFamilies.filter((f) => f.toLowerCase().includes(q)) : allFamilies;
    const shown = base.slice(0, 80);
    if (value && !shown.includes(value)) shown.unshift(value);
    return shown;
  }, [allFamilies, query, value]);

  // Preload the fonts visible in the list so names render in their own typeface
  useEffect(() => {
    filtered.slice(0, 16).forEach((f) => injectFont(f));
  }, [filtered]);

  useEffect(() => {
    if (value) injectFont(value);
  }, [value]);

  const applyCustomFont = () => {
    const raw = customUrl.trim();
    if (!raw) return;
    let family = "";
    let href = raw;
    try {
      const url = new URL(
        raw.startsWith("http") ? raw : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(raw)}`
      );
      const familyParam = url.searchParams.get("family");
      if (familyParam) {
        family = familyParam.split(":")[0].replace(/\+/g, " ");
        href = url.toString();
      }
    } catch {
      family = raw.replace(/\+/g, " ");
    }
    if (!family) return;
    injectFont(family, href);
    setExtras((prev) => (prev.includes(family) ? prev : [...prev, family]));
    onChange(family);
    setOpen(false);
    setCustomUrl("");
  };

  return (
    <div ref={rootRef} className={`custom-dropdown-container ${open ? "custom-dropdown-open" : ""}`}>
      <button
        type="button"
        id={id}
        className="custom-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ padding: "8px 10px", border: "2px solid #000", boxShadow: "none" }}
      >
        <span style={{ fontFamily: `'${value}', sans-serif` }}>{value}</span>
        <svg className="arrow-down-svg" width={10} height={6} viewBox="0 0 10 6">
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {open && (
        <div
          className="dropdown-menu-list tool-scroll"
          style={{ border: "2px solid #000", boxShadow: "4px 4px 0 #000", maxHeight: 340, overflowY: "auto" }}
          role="listbox"
          aria-labelledby={id}
        >
          <div style={{ padding: 8, borderBottom: "2px solid #000" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${allFamilies.length} Google Fonts…`}
              autoFocus
              style={{
                width: "100%",
                padding: "7px 9px",
                fontSize: "0.78rem",
                border: "2px solid #000",
                boxShadow: "none",
                outline: "none",
                fontWeight: 600,
              }}
            />
          </div>

          {filtered.map((f) => (
            <div
              key={f}
              role="option"
              aria-selected={f === value}
              className={`custom-dropdown-item ${f === value ? "active" : ""}`}
              onClick={() => {
                onChange(f);
                setOpen(false);
              }}
            >
              <span style={{ fontFamily: `'${f}', sans-serif`, fontSize: "0.95rem" }}>{f}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-hint)" }}>
              No fonts match &quot;{query}&quot;
            </div>
          )}

          <div style={{ padding: 8, borderTop: "2px solid #000", display: "flex", gap: 6 }}>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustomFont();
              }}
              placeholder="Paste Google Fonts link…"
              style={{
                flex: 1,
                padding: "7px 9px",
                fontSize: "0.72rem",
                border: "2px solid #000",
                boxShadow: "none",
                outline: "none",
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            />
            <button
              onClick={applyCustomFont}
              style={{
                padding: "7px 10px",
                border: "2px solid #000",
                background: "#000",
                color: "#fff",
                fontWeight: 900,
                fontFamily: "monospace",
                fontSize: "0.68rem",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Use
            </button>
          </div>
        </div>
      )}
    </div>
  );
}