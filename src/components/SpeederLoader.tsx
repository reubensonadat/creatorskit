"use client";

import { ThinkingOrb, type OrbState } from "thinking-orbs";

interface SpeederLoaderProps {
  message?: string;
  /** Which orb animation to show — see https://libraries.dev/orbs.html */
  state?: OrbState;
}

export default function SpeederLoader({ message = "PROCESSING ASSET", state = "working" }: SpeederLoaderProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%", margin: "24px 0" }}>
      <ThinkingOrb state={state} size={64} />
      <div
        style={{
          fontFamily: "monospace",
          fontWeight: 900,
          fontSize: "0.85rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#000",
          background: "#fff",
          border: "2px solid #000",
          padding: "4px 10px",
          boxShadow: "3px 3px 0 #000",
        }}
      >
        {message}...
      </div>
    </div>
  );
}
