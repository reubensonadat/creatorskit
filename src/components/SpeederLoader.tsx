"use client";

import React from "react";

interface SpeederLoaderProps {
  message?: string;
}

export default function SpeederLoader({ message = "PROCESSING ASSET" }: SpeederLoaderProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%", margin: "24px 0" }}>
      <div className="speeder-container">
        <div className="speeder-loader">
          <span>
            <span />
            <span />
            <span />
            <span />
          </span>
          <div className="speeder-base">
            <span />
            <div className="speeder-face" />
          </div>
        </div>
        <div className="longfazers">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
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
