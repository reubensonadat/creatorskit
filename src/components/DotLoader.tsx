"use client";

interface DotLoaderProps {
  message?: string;
}

export default function DotLoader({ message = "Processing Image" }: DotLoaderProps) {
  return (
    <div className="dot-loader-overlay">
      <div className="dot-loader">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
      <div className="dot-loader-label">{message}...</div>
    </div>
  );
}