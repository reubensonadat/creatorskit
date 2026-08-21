"use client";

import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useEffect, useRef, useState } from "react";

export type MatchCutScene = "paper" | "billboard";

export type MatchCutProps = {
  fullText: string;
  highlightWord: string;
  sceneType?: MatchCutScene;
  backgroundImageUrl?: string | null;
  zoomLevel?: number;
  highlightColor?: string;
  subtitleTop?: string;
  subtitleBottom?: string;
  durationInFrames?: number;
};

const SNAP_FRAME = 31;
const DEFAULT_ZOOM = 3.2;
const MAX_CHARS = 40;

const FILLER = [
  `The consultant fee was not disclosed. It was large. The meeting was rescheduled four times and then cancelled. All parties described it as a misunderstanding. Police are not convinced.`,
  `Witnesses disagree on basically everything. The dog was fine. Nobody had asked about the dog. An audit was mentioned briefly and not mentioned again.`,
  `The mayor denied everything and then left the building. A van was seen leaving at speed. It was beige. CCTV captured something. Officers are reviewing it slowly.`,
];

function splitHighlight(
  text: string,
  highlight: string
): [string, string, string] {
  if (!highlight) return [text, "", ""];
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return [text, "", ""];
  return [
    text.slice(0, idx),
    text.slice(idx, idx + highlight.length),
    text.slice(idx + highlight.length),
  ];
}

export const MatchCutComposition = ({
  fullText,
  highlightWord,
  sceneType = "paper",
  backgroundImageUrl = null,
  zoomLevel = DEFAULT_ZOOM,
  highlightColor = "#FFE500",
  subtitleTop = "THE DAILY MURMUR",
  subtitleBottom = "\u2014\u2009Investigative Team (Reduced)",
  durationInFrames,
}: MatchCutProps) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: totalFrames } =
    useVideoConfig();

  const endFrame = durationInFrames ?? totalFrames;

  const isPostCut = frame >= SNAP_FRAME;

  // Hard snap at cutFrame (over 5 frames ≈ 167ms) then slow creep to end
  const currentScale = frame < SNAP_FRAME
    ? 1
    : interpolate(frame, [SNAP_FRAME, SNAP_FRAME + 5, endFrame], [1, zoomLevel, zoomLevel + 0.3], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const driftX = isPostCut
    ? interpolate(frame, [SNAP_FRAME, endFrame], [0, -width * 0.04], {
        easing: Easing.inOut(Easing.quad),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const driftY = isPostCut
    ? interpolate(frame, [SNAP_FRAME, endFrame], [0, height * 0.015], {
        easing: Easing.inOut(Easing.quad),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const [before, highlight, after] = splitHighlight(
    fullText.slice(0, MAX_CHARS),
    highlightWord
  );

  // Dynamic transform-origin — measure highlight word position once
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (containerRef.current && highlightRef.current) {
      const cr = containerRef.current.getBoundingClientRect();
      const hr = highlightRef.current.getBoundingClientRect();
      const ox =
        ((hr.left - cr.left + hr.width / 2) / cr.width) * 100;
      const oy =
        ((hr.top - cr.top + hr.height / 2) / cr.height) * 100;
      setOrigin({ x: ox, y: oy });
    }
  }, [fullText, highlightWord]);

  const isBillboard = sceneType === "billboard" && backgroundImageUrl;

  const blurAmount = isPostCut ? interpolate(
    frame,
    [SNAP_FRAME, endFrame],
    [3, 5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  ) : 0;

  const quoteMarkOpacity = 0.35;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: isBillboard ? "#000" : "#F7F7F2",
        overflow: "hidden",
        fontFamily: "var(--font-playfair), 'Georgia', 'Times New Roman', serif",
      }}
    >
      {isBillboard ? (
        <Img
          src={backgroundImageUrl!}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}

      {/* Virtual camera container */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          transformOrigin: `${origin.x}% ${origin.y}%`,
          transform: `scale(${currentScale}) translate(${driftX}px, ${driftY}px)`,
        }}
      >
        {/* Top filler text — blurs on zoom */}
        <div
          className="w-full px-12 mb-10"
          style={{
            filter: isPostCut ? `blur(${blurAmount}px)` : "none",
            opacity: isPostCut ? 0.35 : 0.7,
            transition: "opacity 0.3s",
          }}
        >
          <p className="text-justify text-sm leading-relaxed"
            style={{
              fontSize: Math.min(width * 0.011, 13),
              color: "rgba(100,95,85,0.6)",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              lineHeight: 1.6,
              maxWidth: "85%",
              margin: "0 auto",
              WebkitLineClamp: 3,
              overflow: "hidden",
            }}
          >
            {FILLER[0]} {FILLER[1]}
          </p>
        </div>

        {/* Subtitle top */}
        <div
          className="uppercase font-sans font-bold tracking-[0.25em] mb-8 border-b border-neutral-300 pb-2"
          style={{
            fontSize: Math.min(width * 0.011, 12),
            color: "rgba(100,100,90,0.55)",
            opacity: isPostCut ? 0 : 1,
            transition: "opacity 0.3s",
            borderBottomColor: "rgba(180,175,165,0.4)",
          }}
        >
          {subtitleTop}
        </div>

        {/* Main quote */}
        <h1
          className="font-serif font-black leading-tight text-center"
          style={{
            fontSize: Math.min(width * 0.09, width * 0.09, 130),
            color: "#1a1918",
            letterSpacing: "-0.005em",
            maxWidth: "88%",
          }}
        >
          <span style={{ opacity: quoteMarkOpacity, marginRight: "0.05em" }}>
            &ldquo;
          </span>
          {highlight ? (
            <>
              <span>{before}</span>
              <span
                ref={highlightRef}
                className="text-black inline-block leading-none whitespace-nowrap font-black"
                style={{
                  backgroundColor: highlightColor,
                  padding: "0.02em 0.1em",
                }}
              >
                {highlight}
              </span>
              <span>{after}</span>
            </>
          ) : (
            <span>{fullText.slice(0, MAX_CHARS)}</span>
          )}
          <span style={{ opacity: quoteMarkOpacity, marginLeft: "0.03em" }}>
            &rdquo;
          </span>
        </h1>

        {/* Subtitle bottom */}
        <div
          className="italic"
          style={{
            fontSize: Math.min(width * 0.013, 15),
            color: "rgba(120,115,105,0.5)",
            marginTop: width * 0.045,
            opacity: isPostCut ? 0 : 1,
            transition: "opacity 0.3s",
          }}
        >
          {subtitleBottom}
        </div>

        {/* Bottom filler text — blurs on zoom */}
        <div
          className="w-full px-12 mt-10"
          style={{
            filter: isPostCut ? `blur(${blurAmount}px)` : "none",
            opacity: isPostCut ? 0.35 : 0.7,
            transition: "opacity 0.3s",
          }}
        >
          <p className="text-justify text-sm leading-relaxed"
            style={{
              fontSize: Math.min(width * 0.011, 13),
              color: "rgba(100,95,85,0.6)",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              lineHeight: 1.6,
              maxWidth: "85%",
              margin: "0 auto",
              WebkitLineClamp: 3,
              overflow: "hidden",
            }}
          >
            {FILLER[2]} {FILLER[0]}
          </p>
        </div>
      </div>

      {/* Cinematic vignette overlay */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(10,8,6,0.2) 100%)",
          pointerEvents: "none",
          zIndex: 20,
        }}
      />
    </AbsoluteFill>
  );
};

export default MatchCutComposition;