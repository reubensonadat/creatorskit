"use client";

import { useEffect, useRef, useState } from "react";

interface BrutalistSelectOption {
  value: string;
  label: string;
}

interface BrutalistSelectProps {
  id: string;
  value: string;
  options: BrutalistSelectOption[];
  onChange: (value: string) => void;
}

export default function BrutalistSelect({
  id,
  value,
  options,
  onChange,
}: BrutalistSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const selected = options.find((o) => o.value === value);

  return (
    <div
      ref={rootRef}
      className={`custom-dropdown-container ${open ? "custom-dropdown-open" : ""}`}
    >
      <button
        type="button"
        id={id}
        className="custom-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ padding: "8px 10px", border: "2px solid #000", boxShadow: "none" }}
      >
        <span>{selected?.label ?? value}</span>
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
      <div
        className="dropdown-menu-list"
        style={{ border: "2px solid #000", boxShadow: "4px 4px 0 #000" }}
        role="listbox"
        aria-labelledby={id}
      >
        {options.map((o) => (
          <div
            key={o.value}
            role="option"
            aria-selected={o.value === value}
            className={`custom-dropdown-item ${o.value === value ? "active" : ""}`}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            {o.label}
          </div>
        ))}
      </div>
    </div>
  );
}