export interface Decor {
  kind: "bar" | "date" | "rule" | "photo" | "index" | "slash" | "dots";
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  tone: number;
}

export interface Layout {
  id: number;
  seed: number;
  paperIdx: number;
  tilt: number;
  decors: Decor[];
}

export const PAPER_COUNT = 7;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateLayout(id: number, seed: number): Layout {
  const r = mulberry32(seed);
  const kinds: Decor["kind"][] = [
    "bar",
    "bar",
    "date",
    "rule",
    "photo",
    "index",
    "slash",
    "dots",
    "rule",
    "photo",
  ];
  const count = 5 + Math.floor(r() * 5);
  const decors: Decor[] = [];
  for (let i = 0; i < count; i++) {
    decors.push({
      kind: kinds[Math.floor(r() * kinds.length)],
      x: 0.06 + r() * 0.88,
      y: 0.1 + r() * 0.8,
      w: 0.1 + r() * 0.5,
      h: 0.02 + r() * 0.12,
      rot: (r() - 0.5) * 14,
      tone: r(),
    });
  }
  return {
    id,
    seed,
    paperIdx: Math.floor(r() * PAPER_COUNT),
    tilt: (r() - 0.5) * 2.4,
    decors,
  };
}

// ── paper-fiber helpers ────────────────────────────────────

function drawFibers(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  seed: number,
  opacity: number
) {
  const r = mulberry32(seed);
  const count = Math.floor(cw * ch * 0.00015);
  for (let i = 0; i < count; i++) {
    const x = r() * cw;
    const y = r() * ch;
    const len = 2 + r() * 8;
    const angle = r() * Math.PI;
    const alpha = opacity * (0.3 + r() * 0.7);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(60,50,35,${alpha})`;
    ctx.fillRect(0, 0, len, 0.4 + r() * 0.6);
    ctx.restore();
  }
}

function drawGrain(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  seed: number,
  baseAlpha: number
) {
  const r = mulberry32(seed);
  const count = Math.floor(cw * ch * 0.00018);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = r() * cw;
    const y = r() * ch;
    const sz = 0.6 + r() * 2.8;
    const alpha = baseAlpha * (0.2 + r() * 0.8);
    ctx.fillStyle = `rgba(80,65,40,${alpha})`;
    ctx.fillRect(x, y, sz, sz);
  }
  ctx.restore();
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  intensity: number
) {
  const grad = ctx.createRadialGradient(
    cw / 2,
    ch / 2,
    Math.min(cw, ch) * 0.25,
    cw / 2,
    ch / 2,
    Math.max(cw, ch) * 0.72
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(20,15,10,${intensity})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);
}

function drawStains(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  seed: number
) {
  const r = mulberry32(seed);
  const count = 2 + Math.floor(r() * 4);
  for (let i = 0; i < count; i++) {
    const cx = r() * cw;
    const cy = r() * ch;
    const radius = cw * (0.04 + r() * 0.12);
    const alpha = 0.015 + r() * 0.035;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(160,130,80,${alpha * 1.5})`);
    grad.addColorStop(0.5, `rgba(140,110,70,${alpha})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }
}

function drawPaperEdge(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  seed: number
) {
  const r = mulberry32(seed);
  const edge = Math.floor(r() * 4);
  const alpha = 0.06 + r() * 0.08;
  switch (edge) {
    case 0:
      // top shadow
      ctx.save();
      ctx.translate(0, 0);
      ctx.scale(1, 1);
      ctx.fillStyle = `rgba(20,15,10,${alpha})`;
      ctx.fillRect(0, 0, cw, ch * 0.06);
      ctx.fillStyle = `rgba(20,15,10,${alpha * 0.5})`;
      ctx.fillRect(0, ch * 0.06, cw, ch * 0.06);
      ctx.restore();
      break;
    case 1:
      // bottom shadow
      ctx.fillStyle = `rgba(20,15,10,${alpha})`;
      ctx.fillRect(0, ch * 0.94, cw, ch * 0.06);
      ctx.fillStyle = `rgba(20,15,10,${alpha * 0.5})`;
      ctx.fillRect(0, ch * 0.88, cw, ch * 0.06);
      break;
    case 2:
      // left shadow
      ctx.fillStyle = `rgba(20,15,10,${alpha})`;
      ctx.fillRect(0, 0, cw * 0.06, ch);
      break;
    default:
      // right shadow
      ctx.fillStyle = `rgba(20,15,10,${alpha})`;
      ctx.fillRect(cw * 0.94, 0, cw * 0.06, ch);
      break;
  }
}

// ── paper styles ───────────────────────────────────────────

export function drawPaper(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  idx: number
) {
  const r = mulberry32(1234 + idx * 7919);
  const seed = 5678 + idx * 3821;

  switch (idx) {
    // 0 — warm cream newsprint (aged newspaper)
    case 0:
      ctx.fillStyle = "#F2EDE0";
      ctx.fillRect(0, 0, cw, ch);
      drawFibers(ctx, cw, ch, seed, 0.14);
      drawGrain(ctx, cw, ch, seed + 111, 0.06);
      // faint column rules
      for (let x = cw * 0.2; x < cw; x += cw * 0.22) {
        ctx.strokeStyle = "rgba(160,145,120,0.08)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
        ctx.stroke();
      }
      drawStains(ctx, cw, ch, seed + 200);
      drawVignette(ctx, cw, ch, 0.12);
      drawPaperEdge(ctx, cw, ch, seed);
      break;

    // 1 — off-white newsprint with text ghosting
    case 1:
      ctx.fillStyle = "#F1EFE9";
      ctx.fillRect(0, 0, cw, ch);
      // ghosted text-lines (very faint horizontal strips)
      for (let y = ch * 0.06; y < ch; y += ch * 0.042) {
        ctx.fillStyle = `rgba(80,70,50,${0.04 + Math.random() * 0.03})`;
        ctx.fillRect(cw * 0.08, y, cw * r() * 0.6 + cw * 0.1, ch * 0.016);
      }
      // bold column rules
      for (let x = cw * 0.18; x < cw; x += cw * 0.25) {
        ctx.strokeStyle = "rgba(100,90,70,0.1)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
        ctx.stroke();
      }
      drawFibers(ctx, cw, ch, seed + 11, 0.12);
      drawGrain(ctx, cw, ch, seed + 33, 0.04);
      drawStains(ctx, cw, ch, seed + 22);
      drawVignette(ctx, cw, ch, 0.1);
      drawPaperEdge(ctx, cw, ch, seed + 1);
      break;

    // 2 — warm manila / kraft letter
    case 2:
      ctx.fillStyle = "#DBC9A6";
      ctx.fillRect(0, 0, cw, ch);
      // heavy fiber for manila texture
      drawFibers(ctx, cw, ch, seed + 2, 0.22);
      drawFibers(ctx, cw, ch, seed + 666, 0.12);
      drawGrain(ctx, cw, ch, seed + 44, 0.09);
      // subtle crosshatch
      ctx.strokeStyle = "rgba(130,100,60,0.06)";
      ctx.lineWidth = 0.6;
      for (let x = cw * 0.08; x < cw; x += cw * 0.035) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - clineOffset(x), ch);
        ctx.stroke();
      }
      drawStains(ctx, cw, ch, seed + 77);
      drawVignette(ctx, cw, ch, 0.18);
      drawPaperEdge(ctx, cw, ch, seed + 2);
      break;

    // 3 — light cream with pencil/graphite
    case 3:
      ctx.fillStyle = "#F8F5ED";
      ctx.fillRect(0, 0, cw, ch);
      drawFibers(ctx, cw, ch, seed + 3, 0.1);
      drawGrain(ctx, cw, ch, seed + 55, 0.05);
      // graphite smudge marks
      for (let i = 0; i < 40; i++) {
        const gx = r() * cw;
        const gy = r() * ch;
        ctx.fillStyle = `rgba(90,85,75,${0.015 + r() * 0.03})`;
        ctx.beginPath();
        ctx.arc(gx, gy, 3 + r() * 16, 0, Math.PI * 2);
        ctx.fill();
      }
      // faint pencil lines
      ctx.strokeStyle = "rgba(110,100,85,0.06)";
      ctx.lineWidth = 0.4;
      for (let y = ch * 0.12; y < ch; y += ch * 0.055) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y + (r() - 0.5) * 8);
        ctx.stroke();
      }
      drawStains(ctx, cw, ch, seed + 88);
      drawVignette(ctx, cw, ch, 0.08);
      break;

    // 4 — brown field note / journal paper
    case 4:
      ctx.fillStyle = "#A98D63";
      ctx.fillRect(0, 0, cw, ch);
      drawFibers(ctx, cw, ch, seed + 4, 0.2);
      drawGrain(ctx, cw, ch, seed + 66, 0.08);
      // horizontal ruled lines (field notes style)
      for (let y = ch * 0.1; y < ch; y += ch * 0.07) {
        ctx.strokeStyle = "rgba(180,160,130,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cw * 0.05, y);
        ctx.lineTo(cw * 0.95, y);
        ctx.stroke();
      }
      // left margin
      ctx.strokeStyle = "rgba(190,70,60,0.3)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cw * 0.12, 0);
      ctx.lineTo(cw * 0.12, ch);
      ctx.stroke();
      drawVignette(ctx, cw, ch, 0.16);
      drawPaperEdge(ctx, cw, ch, seed + 3);
      break;

    // 5 — aged parchment with foxing spots
    case 5:
      ctx.fillStyle = "#EAE3C5";
      ctx.fillRect(0, 0, cw, ch);
      drawFibers(ctx, cw, ch, seed + 5, 0.16);
      drawGrain(ctx, cw, ch, seed + 77, 0.07);
      // foxing (age spots) — scattered brownish circles
      for (let i = 0; i < 35; i++) {
        const fx = r() * cw;
        const fy = r() * ch;
        const fr = 4 + r() * 28;
        const spotGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        spotGrad.addColorStop(0, `rgba(140,115,60,${0.04 + r() * 0.08})`);
        spotGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
      }
      drawStains(ctx, cw, ch, seed + 99);
      drawVignette(ctx, cw, ch, 0.15);
      drawPaperEdge(ctx, cw, ch, seed + 4);
      break;

    // 6 — dark cream / toned sketch paper
    default:
      ctx.fillStyle = "#D6CDB8";
      ctx.fillRect(0, 0, cw, ch);
      drawFibers(ctx, cw, ch, seed + 6, 0.18);
      drawGrain(ctx, cw, ch, seed + 88, 0.07);
      // heavy tooth texture (large irregular grains)
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(90,75,50,${0.03 + r() * 0.06})`;
        ctx.fillRect(r() * cw, r() * ch, 2 + r() * 5, 1.5 + r() * 3);
      }
      drawStains(ctx, cw, ch, seed + 111);
      drawVignette(ctx, cw, ch, 0.14);
      drawPaperEdge(ctx, cw, ch, seed + 5);
      break;
  }
}

function clineOffset(x: number): number {
  return x * 0.12;
}

export function drawDecors(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  layout: Layout
) {
  const r = mulberry32(layout.seed ^ 0x9e3779b9);
  layout.decors.forEach((d) => {
    const x = d.x * cw;
    const y = d.y * ch;
    const w = d.w * cw;
    const h = d.h * ch;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((d.rot * Math.PI) / 180);
    switch (d.kind) {
      case "bar":
        ctx.fillStyle = `rgba(20,20,22,${0.75 + d.tone * 0.2})`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = "rgba(240,235,220,0.9)";
        ctx.fillRect(-w / 2 + h / 3, -h / 6, w - h / 1.5, h / 3);
        break;
      case "date":
        ctx.font = `700 ${Math.max(11, h * 0.8)}px monospace`;
        ctx.fillStyle = "rgba(60,55,50,0.65)";
        ctx.textAlign = "center";
        ctx.fillText(
          `VOL. ${10 + Math.floor(r() * 90)} — \u00A7 ${Math.ceil(r() * 12)} \u00B7 2026`,
          0,
          0
        );
        break;
      case "rule":
        ctx.strokeStyle = "rgba(60,55,50,0.4)";
        ctx.lineWidth = Math.max(1, h);
        ctx.beginPath();
        ctx.moveTo(0, -h * 2);
        ctx.lineTo(0, h * 2);
        ctx.stroke();
        break;
      case "photo":
        ctx.fillStyle = `rgba(120,115,105,${0.5 + d.tone * 0.3})`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = "rgba(30,30,30,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = "rgba(90,85,75,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2);
        ctx.lineTo(-w / 2 + w * 0.18, -h / 2);
        ctx.moveTo(-w / 2, -h / 2 + h * 0.18);
        ctx.lineTo(-w / 2, -h / 2);
        ctx.stroke();
        break;
      case "index":
        ctx.strokeStyle = "rgba(30,30,30,0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, h, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(30,30,30,0.7)";
        ctx.font = `900 ${h * 0.9}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(Math.ceil(r() * 40)), 0, 0);
        break;
      case "slash":
        ctx.strokeStyle = "rgba(20,20,22,0.7)";
        ctx.lineWidth = Math.max(1.5, h * 0.4);
        ctx.beginPath();
        ctx.moveTo(-w / 2, h / 2);
        ctx.lineTo(w / 2, -h / 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(220,40,40,0.6)";
        ctx.lineWidth = Math.max(1.5, h * 0.2);
        ctx.beginPath();
        ctx.moveTo(-w / 2 + w * 0.12, h / 2 - h * 0.12);
        ctx.lineTo(w / 2 - w * 0.12, -h / 2 + h * 0.12);
        ctx.stroke();
        break;
      case "dots":
        ctx.fillStyle = "rgba(30,30,30,0.55)";
        const step = Math.max(4, cw * 0.008);
        for (let x = -w / 2; x < w / 2; x += step) {
          ctx.beginPath();
          ctx.arc(x, 0, Math.max(1.2, h * 0.3), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
    ctx.restore();
  });
  ctx.textBaseline = "alphabetic";
}

export function makeCanvas(cw: number, ch: number) {
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  return c;
}