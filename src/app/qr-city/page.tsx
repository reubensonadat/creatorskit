"use client";

import { useState } from "react";
import { Building2, Globe, QrCode, Wifi, Youtube } from "lucide-react";
import QrCity from "@/components/QrCity";

const PRESETS = [
  { label: "Creators Kit", value: "https://creatorskit.app", icon: Globe },
  { label: "YouTube", value: "https://youtube.com/@creatorskit", icon: Youtube },
  { label: "Wi-Fi", value: "WIFI:S:MyNetwork;T:WPA;P:password123;;", icon: Wifi },
  { label: "Portfolio", value: "https://portfolio.creatorskit.app", icon: QrCode },
];

export default function QrCityPage() {
  const [activeUrl, setActiveUrl] = useState("https://creatorskit.app");

  return (
    <div className="tool-page-padding" style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", boxSizing: "border-box", width: "100%" }}>
      <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", flex: 1 }}>

        {/* Page header — brutalist, matches design system */}
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 8px", border: "2px solid #000", background: "#000", color: "#fff", fontFamily: "monospace" }}>
              3D VOXEL QR CODE
            </span>
            <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
              INTERACTIVE ISOMETRIC CITY · SCAN MODE · PNG EXPORT
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, textTransform: "uppercase" }}>
            QR City Metropolis
          </h1>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#555", maxWidth: 600, lineHeight: 1.5 }}>
            Converts any URL or text into an interactive 3D voxel city. Dark QR modules become skyscrapers with spring physics — flatten to Scan Mode to read the code with any phone.
          </p>
        </div>

        {/* Quick presets */}
        <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>Quick presets →</span>
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const isActive = activeUrl === p.value;
            return (
              <button
                key={p.label}
                onClick={() => setActiveUrl(p.value)}
                className="brutalist-button"
                style={{
                  padding: "5px 12px",
                  fontSize: "0.72rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: isActive ? "#000000" : "#ffffff",
                  color: isActive ? "#ffffff" : "#000000",
                  boxShadow: isActive ? "inset 2px 2px 0 rgba(0,0,0,0.3)" : "3px 3px 0 #000",
                }}
              >
                <Icon size={12} />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Main component — re-keyed on URL change to reinitialise physics */}
        <QrCity key={activeUrl} defaultValue={activeUrl} />

        {/* Feature info row */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {[
            {
              icon: Building2,
              title: "Corner Citadels",
              desc: "The 3 QR finder anchors become the city's highest megatowers with rooftop antenna beacons.",
            },
            {
              icon: QrCode,
              title: "Fully Scannable",
              desc: "Switch to Scan Mode to drop to a flat top-down view — any phone camera reads it instantly.",
            },
            {
              icon: Globe,
              title: "Zero Upload",
              desc: "QR generation and 3D physics run 100% locally in your browser. Nothing leaves your device.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="brutalist-card"
              style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, border: "2px solid #000", background: "#FFE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={14} />
                </div>
                <span style={{ fontWeight: 900, fontSize: "0.82rem", letterSpacing: "-0.01em", textTransform: "uppercase" }}>
                  {title}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#555", lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
