"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px", background: "#f4f4f5" }}>
      <div style={{ maxWidth: 600, position: "relative", zIndex: 1 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 40,
            padding: "10px 18px",
            background: "transparent",
            color: "#666",
            border: "2px solid #ccc",
            fontWeight: 900,
            fontSize: "0.75rem",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            textDecoration: "none",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#000"; e.currentTarget.style.color = "#000"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ccc"; e.currentTarget.style.color = "#666"; }}
        >
          <ChevronLeft size={14} />
          Back
        </Link>
        <h1 style={{ fontSize: "6rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 16, color: "#ddd", fontFamily: "monospace" }}>
          404
        </h1>
        <p style={{ fontSize: "1.2rem", fontWeight: 900, color: "#000", marginBottom: 16 }}>
          Page not found
        </p>
        <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 40, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            background: "#000",
            color: "#fff",
            border: "2px solid #000",
            fontWeight: 900,
            fontSize: "0.8rem",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            textDecoration: "none",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#333"; e.currentTarget.style.borderColor = "#333"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#000"; e.currentTarget.style.borderColor = "#000"; }}
        >
          Return to CreatorKit
        </Link>
      </div>
    </div>
  );
}
