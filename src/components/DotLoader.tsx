"use client";

import { ThinkingOrb, type OrbState } from "thinking-orbs";

interface DotLoaderProps {
  message?: string;
  /** Which orb animation to show — see https://libraries.dev/orbs.html */
  state?: OrbState;
}

export default function DotLoader({ message = "Processing Image", state = "working" }: DotLoaderProps) {
  return (
    <div
      className="dot-loader-overlay"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
    >
      <ThinkingOrb state={state} size={64} />
      <div className="dot-loader-label">{message}...</div>
    </div>
  );
}
