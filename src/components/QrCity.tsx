"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import QRCode from "qrcode";
import { Building2, Camera, Compass, Download, RotateCcw, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";

const GAP = 0.12;
const DEG = Math.PI / 180;
const PITCH_TERRAIN = 54 * DEG;
const YAW_TERRAIN = 26 * DEG;
const YAW_LIMIT = 55 * DEG;
const PITCH_LIMIT = 72 * DEG;
const DRAG_YAW = 0.32 * DEG;
const DRAG_PITCH = 0.36 * DEG;
const SPIN_HALF_LIFE = 0.18;
const SPIN_IN = (YAW_TERRAIN * Math.LN2) / SPIN_HALF_LIFE;
const PITCH_STIFFNESS = 140;
const PITCH_DAMPING = 2 * Math.sqrt(PITCH_STIFFNESS);
const EDGE_STIFFNESS = 180;
const BUMP_STIFFNESS = 420;
const BUMP_DAMPING = 2 * Math.sqrt(BUMP_STIFFNESS) * 0.75;
const BUMP = 0.85;
const WAVE = 0.7;
const PADDING = 36;
const REST_EPSILON = 0.0005;

export type CityTheme = "night" | "blueprint" | "clean";

export interface QrCityProps {
  defaultValue?: string;
  className?: string;
  showControls?: boolean;
}

interface Building {
  index: number;
  col: number;
  row: number;
  isDark: boolean;
  isFinder: boolean;
  isFinderCenter: boolean;
  baseHeight: number;
  stories: number;
  hasAntenna: boolean;
}

interface Pose {
  yaw: number;
  pitch: number;
  scale: number;
  cx: number;
  cy: number;
}

type Rgb = [number, number, number];

interface ThemeColors {
  sky: string;
  ground: Rgb;
  buildingWall: Rgb;
  buildingRoof: Rgb;
  finderWall: Rgb;
  finderRoof: Rgb;
  finderBeacon: Rgb;
  windowGlow: string;
  accent: Rgb;
}

// Design system: Black/White/Yellow only. No decorative colour.
const THEMES: Record<CityTheme, { name: string; colors: ThemeColors }> = {
  night: {
    name: "Dark",
    colors: {
      sky: "#09090b",
      ground: [24, 24, 27],
      buildingWall: [39, 39, 42],
      buildingRoof: [63, 63, 70],
      finderWall: [24, 24, 27],
      finderRoof: [255, 229, 0],
      finderBeacon: [255, 229, 0],
      windowGlow: "rgba(255,229,0,0.6)",
      accent: [255, 229, 0],
    },
  },
  blueprint: {
    name: "Blueprint",
    colors: {
      sky: "#f4f4f5",
      ground: [228, 228, 231],
      buildingWall: [161, 161, 170],
      buildingRoof: [82, 82, 91],
      finderWall: [24, 24, 27],
      finderRoof: [24, 24, 27],
      finderBeacon: [0, 0, 0],
      windowGlow: "rgba(255,255,255,0.9)",
      accent: [255, 229, 0],
    },
  },
  clean: {
    name: "Clean",
    colors: {
      sky: "#ffffff",
      ground: [244, 244, 245],
      buildingWall: [113, 113, 122],
      buildingRoof: [24, 24, 27],
      finderWall: [9, 9, 11],
      finderRoof: [9, 9, 11],
      finderBeacon: [255, 229, 0],
      windowGlow: "rgba(255,229,0,0.8)",
      accent: [255, 229, 0],
    },
  },
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function easeOutBack(t: number) {
  const c = 1.35;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

function rubber(value: number, min: number, max: number) {
  if (value < min) return min - 0.18 * (1 - Math.exp((value - min) / 0.18));
  if (value > max) return max + 0.18 * (1 - Math.exp((max - value) / 0.18));
  return value;
}

function shade([r, g, b]: Rgb, amount: number) {
  const k = 1 - amount;
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
}

function project(pose: Pose, x: number, y: number, z: number) {
  const cos = Math.cos(pose.yaw);
  const sin = Math.sin(pose.yaw);
  const xr = x * cos - z * sin;
  const zr = x * sin + z * cos;
  return [
    pose.cx + xr * pose.scale,
    pose.cy +
      (zr * Math.cos(pose.pitch) - y * Math.sin(pose.pitch)) * pose.scale,
  ];
}

function visibleFaces(
  pose: Pose,
  x0: number,
  z0: number,
  h: number
): { points: number[][]; tone: number; isTop?: boolean }[] {
  const x1 = x0 + 1 - GAP;
  const z1 = z0 + 1 - GAP;
  const p = (x: number, y: number, z: number) => project(pose, x, y, z);
  const faces: { points: number[][]; tone: number; isTop?: boolean }[] = [];
  const sin = Math.sin(pose.yaw);
  const cos = Math.cos(pose.yaw);

  if (h > 0.02 && pose.pitch > 0.01) {
    if (cos > 0) {
      faces.push({ points: [p(x0, 0, z1), p(x1, 0, z1), p(x1, h, z1), p(x0, h, z1)], tone: 0.22 });
    } else {
      faces.push({ points: [p(x0, 0, z0), p(x1, 0, z0), p(x1, h, z0), p(x0, h, z0)], tone: 0.22 });
    }
    if (sin > 0.001) {
      faces.push({ points: [p(x1, 0, z0), p(x1, 0, z1), p(x1, h, z1), p(x1, h, z0)], tone: 0.38 });
    } else if (sin < -0.001) {
      faces.push({ points: [p(x0, 0, z0), p(x0, 0, z1), p(x0, h, z1), p(x0, h, z0)], tone: 0.38 });
    }
  }

  faces.push({
    points: [p(x0, h, z0), p(x1, h, z0), p(x1, h, z1), p(x0, h, z1)],
    tone: 0,
    isTop: true,
  });
  return faces;
}

function inside(points: number[][], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function polygon(ctx: CanvasRenderingContext2D, points: number[][]) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function getFinderInfo(col: number, row: number, size: number) {
  const inTL = col < 7 && row < 7;
  const inTR = col >= size - 7 && row < 7;
  const inBL = col < 7 && row >= size - 7;
  const isFinder = inTL || inTR || inBL;
  const isCenter =
    (col >= 2 && col <= 4 && row >= 2 && row <= 4) ||
    (col >= size - 5 && col <= size - 3 && row >= 2 && row <= 4) ||
    (col >= 2 && col <= 4 && row >= size - 5 && row <= size - 3);
  return { isFinder, isCenter };
}

function hashCoords(x: number, y: number, seed = 42) {
  let h = seed ^ (x * 374761393 + y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export default function QrCity({
  defaultValue = "https://creatorskit.app",
  className,
  showControls = true,
}: QrCityProps) {
  const [value, setValue] = useState(defaultValue);
  const [themeName, setThemeName] = useState<CityTheme>("night");
  const [heightScale, setHeightScale] = useState(2.8);
  const [flat, setFlat] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);
  const [dragging, setDragging] = useState(false);

  const theme = THEMES[themeName].colors;

  const { buildings, size } = useMemo(() => {
    try {
      const qr = QRCode.create(value.trim() || "https://creatorskit.app", {
        errorCorrectionLevel: "M",
      });
      const s = qr.modules.size;
      const data = qr.modules.data;
      const result: Building[] = [];

      for (let r = 0; r < s; r++) {
        for (let c = 0; c < s; c++) {
          const idx = r * s + c;
          const isDark = (data[idx] & 1) === 1;
          const { isFinder, isCenter } = getFinderInfo(c, r, s);

          let baseH = 0.04;
          let stories = 0;
          let hasAntenna = false;

          if (isDark) {
            if (isCenter) {
              baseH = heightScale * 1.6;
              stories = Math.round(baseH * 24);
              hasAntenna = true;
            } else if (isFinder) {
              baseH = heightScale * 1.25;
              stories = Math.round(baseH * 20);
            } else {
              const variation = hashCoords(c, r);
              baseH = heightScale * (0.6 + variation * 0.7);
              stories = Math.round(baseH * 16);
              hasAntenna = variation > 0.85;
            }
          }

          result.push({ index: idx, col: c, row: r, isDark, isFinder, isFinderCenter: isCenter, baseHeight: baseH, stories, hasAntenna });
        }
      }
      return { buildings: result, size: s };
    } catch {
      return { buildings: [], size: 21 };
    }
  }, [value, heightScale]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef({
    yaw: 0, yawSpeed: 0, pitch: 0, pitchSpeed: 0,
    pitchTarget: flat ? 0 : PITCH_TERRAIN,
    bumps: new Float64Array(buildings.length),
    bumpSpeeds: new Float64Array(buildings.length),
    hovered: -1,
    origin: { col: Math.floor(size / 2), row: Math.floor(size / 2) },
    width: 0, height: 0, dpr: 1,
    drag: null as null | {
      id: number; x: number; y: number; yaw: number; pitch: number;
      moved: boolean; samples: { t: number; x: number; y: number }[];
    },
    raf: 0, last: 0, visible: false, started: false, autoSpin: false,
  });

  sim.current.autoSpin = autoRotate;
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;

  if (sim.current.bumps.length !== buildings.length) {
    sim.current.bumps = new Float64Array(buildings.length);
    sim.current.bumpSpeeds = new Float64Array(buildings.length);
  }

  const getBuildingHeight = useCallback((b: Building, lift: number) => {
    const s = sim.current;
    const span = Math.hypot(size, size) || 1;
    const d = Math.hypot(b.col - s.origin.col, b.row - s.origin.row) / span;
    const local = clamp(lift * (1 + WAVE) - d * WAVE, 0, 1);
    return b.baseHeight * easeOutBack(local) + s.bumps[b.index];
  }, [size]);

  const pose = useCallback((): Pose & { lift: number } => {
    const s = sim.current;
    const lift = clamp(s.pitch / PITCH_TERRAIN, 0, 1.25);
    const corners = [[0, 0], [size, 0], [0, size], [size, size]];
    const probe: Pose = { yaw: s.yaw, pitch: s.pitch, scale: 1, cx: 0, cy: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const maxH = heightScale * 1.6;
    for (const [x, z] of corners) {
      for (const y of [0, maxH * Math.min(lift, 1)]) {
        const [px, py] = project(probe, x - size / 2, y, z - size / 2);
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    }
    const scale = Math.min(
      (s.width - PADDING * 2) / (maxX - minX || 1),
      (s.height - PADDING * 2) / (maxY - minY || 1)
    );
    return { yaw: s.yaw, pitch: s.pitch, scale, cx: s.width / 2 - ((minX + maxX) / 2) * scale, cy: s.height / 2 - ((minY + maxY) / 2) * scale, lift };
  }, [size, heightScale]);

  const ordered = useCallback((p: Pose) => {
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    const depth = (b: Building) => (b.col + 0.5 - size / 2) * sin + (b.row + 0.5 - size / 2) * cos;
    return [...buildingsRef.current].sort((a, b) => depth(a) - depth(b));
  }, [size]);

  const draw = useCallback(() => {
    const s = sim.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!(canvas && ctx && s.width)) return;
    const p = pose();
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, s.width, s.height);
    ctx.lineJoin = "round";
    const isFlatView = p.pitch < 0.05;

    if (!isFlatView) {
      const gc = [
        project(p, -size / 2 - 1, 0, -size / 2 - 1),
        project(p, size / 2 + 1, 0, -size / 2 - 1),
        project(p, size / 2 + 1, 0, size / 2 + 1),
        project(p, -size / 2 - 1, 0, size / 2 + 1),
      ];
      ctx.beginPath();
      ctx.moveTo(gc[0][0], gc[0][1]);
      for (let i = 1; i < gc.length; i++) ctx.lineTo(gc[i][0], gc[i][1]);
      ctx.closePath();
      ctx.fillStyle = `rgb(${theme.ground.join(",")})`;
      ctx.fill();
    }

    for (const b of ordered(p)) {
      if (isFlatView && !b.isDark) continue;
      const h = getBuildingHeight(b, p.lift);
      const isHovered = b.index === s.hovered;
      let wallColor = theme.buildingWall;
      let roofColor = theme.buildingRoof;
      if (b.isFinder) { wallColor = theme.finderWall; roofColor = b.isFinderCenter ? theme.finderBeacon : theme.finderRoof; }
      if (isHovered) { wallColor = theme.accent; roofColor = theme.accent; }

      for (const face of visibleFaces(p, b.col - size / 2, b.row - size / 2, h)) {
        polygon(ctx, face.points);
        const fill = face.isTop ? `rgb(${roofColor.join(",")})` : shade(wallColor, face.tone);
        ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = fill; ctx.lineWidth = 0.5; ctx.stroke();

        if (!face.isTop && h > 0.8 && !isFlatView && p.pitch > 0.2) {
          ctx.strokeStyle = theme.windowGlow; ctx.lineWidth = 0.4;
          const [p0, p1, p2, p3] = face.points;
          const st = Math.min(b.stories, 6);
          for (let n = 1; n < st; n++) {
            const frac = n / st;
            ctx.beginPath();
            ctx.setLineDash([2, 4]);
            ctx.moveTo(p0[0] + (p3[0] - p0[0]) * frac, p0[1] + (p3[1] - p0[1]) * frac);
            ctx.lineTo(p1[0] + (p2[0] - p1[0]) * frac, p1[1] + (p2[1] - p1[1]) * frac);
            ctx.stroke(); ctx.setLineDash([]);
          }
        }
      }

      if (b.hasAntenna && h > 1.2 && !isFlatView) {
        const top = project(p, b.col - size / 2 + 0.5 - GAP / 2, h, b.row - size / 2 + 0.5 - GAP / 2);
        const tip = project(p, b.col - size / 2 + 0.5 - GAP / 2, h + 0.5, b.row - size / 2 + 0.5 - GAP / 2);
        ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(tip[0], tip[1]);
        ctx.strokeStyle = `rgb(${theme.finderBeacon.join(",")})`; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${theme.finderBeacon.join(",")})`; ctx.fill();
      }
    }
  }, [getBuildingHeight, ordered, pose, size, theme]);

  const hitTest = useCallback((x: number, y: number) => {
    const p = pose();
    const list = ordered(p);
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      const h = getBuildingHeight(b, p.lift);
      for (const face of visibleFaces(p, b.col - size / 2, b.row - size / 2, h))
        if (inside(face.points, x, y)) return b;
    }
    return null;
  }, [getBuildingHeight, ordered, pose, size]);

  const stepSprings = useCallback((dt: number) => {
    const s = sim.current;
    let energy = 0;
    if (s.autoSpin && !s.drag) {
      s.yaw = (s.yaw + 0.25 * dt) % (Math.PI * 2);
      energy = 1;
    } else if (!s.drag) {
      s.yawSpeed *= 0.5 ** (dt / SPIN_HALF_LIFE);
      let target = s.yaw;
      if (s.pitchTarget === 0) target = 0;
      else if (s.yaw > YAW_LIMIT) target = YAW_LIMIT;
      else if (s.yaw < -YAW_LIMIT) target = -YAW_LIMIT;
      if (target !== s.yaw) s.yawSpeed += ((target - s.yaw) * EDGE_STIFFNESS - s.yawSpeed * 2 * Math.sqrt(EDGE_STIFFNESS)) * dt;
      s.yaw += s.yawSpeed * dt;
      energy = Math.max(energy, Math.abs(s.yawSpeed), Math.abs(target - s.yaw));
      const force = (s.pitchTarget - s.pitch) * PITCH_STIFFNESS - s.pitchSpeed * PITCH_DAMPING;
      s.pitchSpeed += force * dt; s.pitch += s.pitchSpeed * dt;
      energy = Math.max(energy, Math.abs(s.pitchSpeed), Math.abs(s.pitchTarget - s.pitch));
    }
    for (let i = 0; i < s.bumps.length; i++) {
      const target = i === s.hovered && s.pitch > 0.1 ? BUMP : 0;
      s.bumpSpeeds[i] += ((target - s.bumps[i]) * BUMP_STIFFNESS - s.bumpSpeeds[i] * BUMP_DAMPING) * dt;
      s.bumps[i] += s.bumpSpeeds[i] * dt;
      energy = Math.max(energy, Math.abs(s.bumpSpeeds[i]) * 0.1, Math.abs(target - s.bumps[i]));
    }
    return energy;
  }, []);

  const tick = useCallback((now: number) => {
    const s = sim.current;
    s.raf = 0;
    const dt = s.last ? Math.min((now - s.last) / 1000, 1 / 30) : 1 / 60;
    s.last = now;
    const energy = stepSprings(dt);
    draw();
    if ((s.drag || s.autoSpin || energy > REST_EPSILON) && s.visible) s.raf = requestAnimationFrame(tick);
    else s.last = 0;
  }, [draw, stepSprings]);

  const turnIn = useCallback(() => {
    const s = sim.current;
    if (Math.abs(s.yaw) > 2 * DEG) return;
    s.yawSpeed = SPIN_IN;
  }, []);

  const wake = useCallback(() => {
    const s = sim.current;
    if (!s.raf && s.visible) s.raf = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    const s = sim.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = new ResizeObserver(([entry]) => {
      s.width = entry.contentRect.width; s.height = entry.contentRect.height;
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(s.width * s.dpr); canvas.height = Math.round(s.height * s.dpr);
      draw();
    });
    resize.observe(canvas);
    let onScreen = false;
    const update = () => {
      s.visible = onScreen && !document.hidden;
      if (s.visible) {
        if (!s.started) { s.started = true; if (s.pitchTarget > 0) turnIn(); }
        wake();
      } else if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; }
    };
    const obs = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); });
    obs.observe(canvas);
    document.addEventListener("visibilitychange", update);
    return () => { resize.disconnect(); obs.disconnect(); document.removeEventListener("visibilitychange", update); cancelAnimationFrame(s.raf); s.raf = 0; };
  }, [draw, turnIn, wake]);

  const setViewMode = (isFlat: boolean) => {
    const s = sim.current;
    setFlat(isFlat); setAutoRotate(false);
    s.origin = { col: Math.floor(size / 2), row: Math.floor(size / 2) };
    s.pitchTarget = isFlat ? 0 : PITCH_TERRAIN; s.yawSpeed = 0;
    if (!isFlat) turnIn();
    wake();
  };

  const localPoint = (event: PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : { x: 0, y: 0 };
  };

  const hover = (b: Building | null) => {
    const s = sim.current;
    const index = b ? b.index : -1;
    if (index !== s.hovered) { s.hovered = index; setActiveBuilding(b); wake(); }
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const s = sim.current;
    const { x, y } = localPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    const b = hitTest(x, y);
    if (b) { s.origin = { col: b.col, row: b.row }; s.bumpSpeeds[b.index] = 4; }
    s.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: s.yaw, pitch: s.pitch, moved: false, samples: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }] };
    s.yawSpeed = 0; s.pitchSpeed = 0;
    setDragging(true); hover(b); wake();
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    const drag = s.drag;
    if (!drag || drag.id !== event.pointerId) {
      if (event.pointerType === "mouse") { const { x, y } = localPoint(event); hover(hitTest(x, y)); }
      return;
    }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    s.yaw = rubber(drag.yaw + dx * DRAG_YAW, -YAW_LIMIT, YAW_LIMIT);
    s.pitch = rubber(drag.pitch + dy * DRAG_PITCH, 0, PITCH_LIMIT);
    drag.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
    if (drag.samples.length > 5) drag.samples.shift();
    wake();
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    const drag = s.drag;
    if (!drag || drag.id !== event.pointerId) return;
    s.drag = null; setDragging(false);
    if (!drag.moved) { wake(); return; }
    const first = drag.samples[0], last = drag.samples.at(-1) ?? first;
    const dt = Math.max((last.t - first.t) / 1000, 0.016);
    s.yawSpeed = (last.x - first.x) / dt * DRAG_YAW;
    s.pitchSpeed = (last.y - first.y) / dt * DRAG_PITCH;
    const nextFlat = s.pitch + s.pitchSpeed * 0.15 < PITCH_TERRAIN / 2;
    setFlat(nextFlat); s.pitchTarget = nextFlat ? 0 : PITCH_TERRAIN; wake();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-city-${flat ? "scan" : "3d"}.png`;
    link.href = canvas.toDataURL("image/png"); link.click();
  };

  return (
    <div className={cn("brutalist-card overflow-hidden select-none", className)}>
      {/* Topbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderBottom: "2px solid #000000",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32, height: 32, border: "2px solid #000000",
              background: "#000000", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}
          >
            <Building2 size={16} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 900, fontSize: "0.85rem", letterSpacing: "-0.01em" }}>QR CITY</span>
              <span
                style={{
                  fontFamily: "monospace", fontSize: "0.6rem", fontWeight: 900,
                  background: "#FFE500", color: "#000000", border: "1.5px solid #000000",
                  padding: "1px 6px", letterSpacing: "0.06em",
                }}
              >
                LIVE 3D
              </span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "#888888", marginTop: 1 }}>
              {activeBuilding
                ? `Block (${activeBuilding.col}, ${activeBuilding.row}) · ${activeBuilding.stories} stories`
                : `${size}×${size} voxel matrix · drag to rotate`}
            </div>
          </div>
        </div>

        {/* View toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="view-toggle">
            <button
              className={flat ? "active" : ""}
              onClick={() => setViewMode(true)}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <Camera size={12} /> Scan
            </button>
            <button
              className={!flat ? "active" : ""}
              onClick={() => setViewMode(false)}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <Compass size={12} /> 3D City
            </button>
          </div>
          <button
            className="btn btn-icon"
            title="Download snapshot"
            onClick={handleDownload}
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Canvas viewport */}
      <div style={{ position: "relative", height: 380 }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => hover(null)}
          style={{
            display: "block", width: "100%", height: "100%",
            touchAction: "none", outline: "none",
            cursor: dragging ? "grabbing" : "grab",
          }}
        />

        {/* Scan hint */}
        {flat && (
          <div
            className="hud hud-bl"
            style={{ fontSize: "0.68rem", color: "#888888", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Camera size={11} />
            Point camera at screen to scan QR
          </div>
        )}

        {/* Auto-orbit toggle */}
        {!flat && (
          <button
            className={cn("hud hud-br btn", autoRotate ? "btn-primary active" : "")}
            style={{ bottom: 12, right: 12, display: "flex", alignItems: "center", gap: 6, padding: "5px 10px" }}
            onClick={() => { setAutoRotate(!autoRotate); wake(); }}
          >
            <RotateCcw size={11} className={autoRotate ? "animate-spin" : ""} />
            {autoRotate ? "Stop" : "Orbit"}
          </button>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div style={{ borderTop: "2px solid #000000", background: "#f4f4f5", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* URL input */}
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="URL or text — e.g. https://creatorskit.app"
            style={{
              width: "100%", boxSizing: "border-box",
              border: "2px solid #000000", borderRadius: 0, background: "#ffffff",
              padding: "7px 10px", fontSize: "0.78rem", fontWeight: 600, outline: "none",
            }}
          />

          {/* Theme + height row */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <div className="view-toggle" style={{ flex: "0 0 auto" }}>
              {(Object.keys(THEMES) as CityTheme[]).map((t) => (
                <button key={t} className={themeName === t ? "active" : ""} onClick={() => setThemeName(t)}>
                  {THEMES[t].name}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 160 }}>
              <Sliders size={12} style={{ flexShrink: 0 }} />
              <input
                type="range" min="1.2" max="4.5" step="0.1" value={heightScale}
                onChange={(e) => setHeightScale(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "#000000" }}
              />
              <span style={{ fontFamily: "monospace", fontSize: "0.72rem", fontWeight: 700, minWidth: 28 }}>
                {heightScale.toFixed(1)}×
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
