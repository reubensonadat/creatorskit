"use client";

import React from "react";

interface ExportButtonProps {
  onExportPNG?: () => void;
  onExportJPEG?: () => void;
  onExportWebP?: () => void;
}

export default function ExportButton({
  onExportPNG,
  onExportJPEG,
  onExportWebP,
}: ExportButtonProps) {
  return (
    <div style={{ display: "inline-block" }}>
      <div className="export-card-container">
        <div className="export-background" />
        <div className="export-logo">Export</div>
        
        {/* Box 1 (PNG - Outer card) */}
        <div 
          onClick={onExportPNG} 
          className="export-box export-box1" 
          title="Export as PNG"
        >
          <span style={{ fontSize: "0.9rem", fontWeight: 900 }}>PNG</span>
          <span style={{ fontSize: "0.6rem", color: "inherit", fontWeight: 700 }}>Lossless</span>
        </div>

        {/* Box 2 (WebP - Middle card) */}
        <div 
          onClick={onExportWebP} 
          className="export-box export-box2" 
          title="Export as WebP"
        >
          <span style={{ fontSize: "0.82rem", fontWeight: 900 }}>WEBP</span>
          <span style={{ fontSize: "0.55rem", color: "inherit", fontWeight: 700 }}>Compact</span>
        </div>

        {/* Box 3 (JPEG - Inner card) */}
        <div 
          onClick={onExportJPEG} 
          className="export-box export-box3" 
          title="Export as JPEG"
        >
          <span style={{ fontSize: "0.72rem", fontWeight: 900 }}>JPG</span>
        </div>

        {/* Dummy bottom buffer card */}
        <div className="export-box" style={{ width: "10%", height: "10%", bottom: "-10%", left: "-10%", transitionDelay: "0.3s" }} />
      </div>
    </div>
  );
}
