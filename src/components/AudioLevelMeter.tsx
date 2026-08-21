"use client";

import { useEffect, useRef } from "react";

interface AudioLevelMeterProps {
  stream: MediaStream | null;
}

const LOUD_THRESHOLD = 0.72;
const WARN_THRESHOLD = 0.55;
const QUIET_THRESHOLD = 0.06;

export default function AudioLevelMeter({ stream }: AudioLevelMeterProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const dbRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
    void ctx.resume();

    const data = new Float32Array(analyser.fftSize);
    let raf = 0;

    const loop = () => {
      analyser.getFloatTimeDomainData(data);

      let sum = 0;
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        sum += v * v;
        const a = Math.abs(v);
        if (a > peak) peak = a;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(1, peak * 1.35);
      const db = 20 * Math.log10(Math.max(rms, 1e-5));

      const fill = fillRef.current;
      if (fill) {
        fill.style.width = `${Math.round(level * 100)}%`;
        fill.style.background =
          level >= LOUD_THRESHOLD
            ? "#ef4444"
            : level >= WARN_THRESHOLD
              ? "#f59e0b"
              : "#16a34a";
      }

      if (dbRef.current) {
        dbRef.current.textContent = `${db.toFixed(1)} dB`;
      }

      const status = statusRef.current;
      if (status) {
        if (level >= LOUD_THRESHOLD) {
          status.textContent = "TOO LOUD - EASE OFF";
          status.style.borderColor = "#ef4444";
          status.style.color = "#ef4444";
          status.style.background = "#fef2f2";
          status.style.animation = "dotLabelPulse 0.6s ease-in-out infinite";
        } else if (level < QUIET_THRESHOLD) {
          status.textContent = "TOO QUIET - SPEAK UP";
          status.style.borderColor = "#f59e0b";
          status.style.color = "#b45309";
          status.style.background = "#fffbeb";
          status.style.animation = "none";
        } else {
          status.textContent = "LEVEL OK";
          status.style.borderColor = "#16a34a";
          status.style.color = "#166534";
          status.style.background = "#f0fdf4";
          status.style.animation = "none";
        }
        status.style.opacity = "1";
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 32,
        left: 24,
        width: 280,
        background: "#ffffff",
        border: "3px solid #000000",
        boxShadow: "4px 4px 0 #000000",
        padding: "10px 12px",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 900,
            fontSize: "0.68rem",
            letterSpacing: "0.1em",
            color: "#000000",
          }}
        >
          MIC LEVEL
        </span>
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "0.68rem",
            color: "var(--text-hint)",
            minWidth: 58,
            textAlign: "right",
          }}
        >
          <span ref={dbRef}>-99.0 dB</span>
        </span>
      </div>

      <div
        style={{
          position: "relative",
          height: 16,
          border: "2px solid #000000",
          background: "linear-gradient(to right, rgba(22,163,74,0.25) 0%, rgba(22,163,74,0.25) 55%, rgba(245,158,11,0.3) 55%, rgba(245,158,11,0.3) 74%, rgba(239,68,68,0.35) 74%, rgba(239,68,68,0.35) 100%)",
          overflow: "hidden",
        }}
      >
        <div
          ref={fillRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "0%",
            background: "#16a34a",
            transition: "background 0.1s ease",
          }}
        />
      </div>

      <div
        ref={statusRef}
        style={{
          alignSelf: "flex-start",
          fontFamily: "monospace",
          fontWeight: 900,
          fontSize: "0.62rem",
          letterSpacing: "0.08em",
          padding: "3px 8px",
          border: "2px solid #16a34a",
          color: "#166534",
          background: "#f0fdf4",
          opacity: 0,
          whiteSpace: "nowrap",
        }}
      >
        LEVEL OK
      </div>
    </div>
  );
}