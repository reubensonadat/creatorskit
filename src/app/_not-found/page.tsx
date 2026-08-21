"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 600, position: "relative", zIndex: 1 }}>
        <Link href="/" className="brutalist-button" style={{ alignSelf: "flex-start", marginBottom: 32, padding: "10px 20px" }}>
          <ChevronLeft size={16} style={{ marginRight: 8 }} /> Back to Dashboard
        </Link>
        <h1 style={{ fontSize: "6rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 16, color: "var(--text-hint)" }}>
          404
        </h1>
        <p style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text-hint)", marginBottom: 24 }}>
          Page not found
        </p>
        <p style={{ fontSize: "1rem", color: "var(--text-hint)", marginBottom: 32, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="brutalist-button brutalist-button-primary" style={{ display: "inline-flex", padding: "14px 28px", fontSize: "1rem" }}>
          Return to CreatorKit
        </Link>
      </div>
    </div>
  );
}