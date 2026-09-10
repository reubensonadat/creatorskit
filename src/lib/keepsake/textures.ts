/**
 * Procedural canvas textures for the Keepsake dioramas.
 * All drawn at runtime — zero image assets, fully deterministic per seed.
 */

import * as THREE from 'three';
import { PRNG } from './prng';
import type { PlaqueText } from './types';

/* ────────────────────────────────────────────────────────────────────────────
 * AGED BARK — deep fissures, wood-grain striations, lenticels, knots.
 * Returns a color map + matching bump map (bump derived from the same strokes).
 * ──────────────────────────────────────────────────────────────────────────── */

export interface BarkTextures {
    map: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
}

export function makeBarkTextures(seed: string | number, tint: string): BarkTextures {
    const prng = new PRNG(seed).fork('bark');
    const W = 512;
    const H = 1024;

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = W;
    colorCanvas.height = H;
    const c = colorCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = W;
    bumpCanvas.height = H;
    const b = bumpCanvas.getContext('2d')!;

    const tintCol = new THREE.Color(tint);

    // — Base vertical gradient of weathered bark tones —
    const grad = c.createLinearGradient(0, 0, 0, H);
    const lerpHex = (mul: number, light: number) =>
        '#' +
        tintCol
            .clone()
            .multiplyScalar(mul)
            .lerp(new THREE.Color(0xffffff), light)
            .getHexString();
    grad.addColorStop(0.0, lerpHex(0.92, 0.0));
    grad.addColorStop(0.5, lerpHex(1.0, 0.02));
    grad.addColorStop(1.0, lerpHex(0.78, 0.0));
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    b.fillStyle = '#808080';
    b.fillRect(0, 0, W, H);

    // — Wood grain striations: long, wavering vertical bands —
    const grainLayers = 110;
    for (let i = 0; i < grainLayers; i++) {
        const x0 = prng.range(0, W);
        const light = prng.bool(0.45);
        const alpha = prng.range(0.04, 0.13);
        const width = prng.range(1.5, 6);
        const wob = prng.range(4, 16);
        const speed = prng.range(0.004, 0.012);
        const phase = prng.range(0, Math.PI * 2);

        c.strokeStyle = light
            ? `rgba(235,214,184,${alpha})`
            : `rgba(24,14,7,${alpha * 1.25})`;
        c.lineWidth = width;
        c.beginPath();
        for (let y = 0; y <= H; y += 16) {
            const x = x0 + Math.sin(y * speed + phase) * wob;
            if (y === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
        }
        c.stroke();

        // Grain relief on bump: light ridges up, dark grooves down
        b.strokeStyle = light
            ? `rgba(255,255,255,${alpha * 0.9})`
            : `rgba(0,0,0,${alpha * 0.9})`;
        b.lineWidth = width;
        b.beginPath();
        for (let y = 0; y <= H; y += 16) {
            const x = x0 + Math.sin(y * speed + phase) * wob;
            if (y === 0) b.moveTo(x, y);
            else b.lineTo(x, y);
        }
        b.stroke();
    }

    // — Deep aged fissures: jagged vertical cracks with raised lips —
    const crackCount = 26;
    for (let i = 0; i < crackCount; i++) {
        let x = prng.range(0, W);
        let y = prng.range(-40, H * 0.25);
        const length = prng.range(140, 460);
        const maxWidth = prng.range(2.5, 7.5);
        let step = 0;

        const walk = (ctx: CanvasRenderingContext2D, color: string) => {
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
            const pts: Array<[number, number, number]> = [];
            while (step < length && y < H + 20) {
                const w = maxWidth * (1 - step / length * 0.65);
                x += prng.range(-4.5, 4.5);
                y += prng.range(8, 20);
                pts.push([x, y, w]);
                step += 12;
            }
            for (const [px, py, pw] of pts) {
                ctx.lineWidth = pw;
                ctx.lineTo(px, py);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px, py);
            }
        };

        // Dark crevice on color + deep groove on bump
        walk(c, `rgba(16,9,4,${prng.range(0.5, 0.72)})`);
        x -= 2.2; y -= 0; step = 0;
        // re-walk offset for lip highlight
        let lx = x + prng.range(2, 5);
        let ly = y;
        c.strokeStyle = `rgba(240,222,192,${prng.range(0.08, 0.16)})`;
        c.lineWidth = maxWidth * 0.8;
        c.beginPath();
        c.moveTo(lx, ly);
        for (let s2 = 0; s2 < length * 0.8; s2 += 12) {
            lx += prng.range(-3.5, 3.5);
            ly += prng.range(8, 18);
            c.lineTo(lx, ly);
        }
        c.stroke();

        // Bump: deep dark groove
        x -= 0; y = prng.range(-40, H * 0.25); step = 0;
        // reset walk start for bump
        let bx = x, by = y;
        b.strokeStyle = 'rgba(0,0,0,0.85)';
        b.lineCap = 'round';
        b.beginPath();
        b.moveTo(bx, by);
        for (let s3 = 0; s3 < length && by < H + 20; s3 += 12) {
            const w = maxWidth * (1 - s3 / length * 0.6);
            bx += prng.range(-4.5, 4.5);
            by += prng.range(8, 20);
            b.lineWidth = w;
            b.lineTo(bx, by);
            b.stroke();
            b.beginPath();
            b.moveTo(bx, by);
        }
    }

    // — Lenticels: tiny horizontal breathing pores —
    for (let i = 0; i < 70; i++) {
        const x = prng.range(0, W);
        const y = prng.range(0, H);
        const w = prng.range(4, 14);
        const h = prng.range(1.5, 3.5);
        c.fillStyle = `rgba(228,206,172,${prng.range(0.1, 0.26)})`;
        c.beginPath();
        c.ellipse(x, y, w, h, prng.range(-0.2, 0.2), 0, Math.PI * 2);
        c.fill();
        b.strokeStyle = 'rgba(255,255,255,0.28)';
        b.lineWidth = h;
        b.beginPath();
        b.moveTo(x - w, y);
        b.lineTo(x + w, y);
        b.stroke();
    }

    // — Old knots —
    for (let i = 0; i < 3; i++) {
        const x = prng.range(60, W - 60);
        const y = prng.range(120, H - 120);
        const r = prng.range(12, 26);
        const knot = c.createRadialGradient(x, y, 1, x, y, r);
        knot.addColorStop(0, 'rgba(18,10,5,0.8)');
        knot.addColorStop(0.6, 'rgba(50,32,18,0.45)');
        knot.addColorStop(1, 'rgba(50,32,18,0)');
        c.fillStyle = knot;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
        // Concentric rings
        c.strokeStyle = 'rgba(20,12,6,0.4)';
        for (let ring = 1; ring <= 3; ring++) {
            c.lineWidth = 1.4;
            c.beginPath();
            c.ellipse(x, y, r * ring * 0.32, r * ring * 0.24, prng.range(0, 3), 0, Math.PI * 2);
            c.stroke();
        }
        const bk = b.createRadialGradient(x, y, 1, x, y, r);
        bk.addColorStop(0, 'rgba(0,0,0,0.9)');
        bk.addColorStop(1, 'rgba(0,0,0,0)');
        b.fillStyle = bk;
        b.beginPath();
        b.arc(x, y, r, 0, Math.PI * 2);
        b.fill();
    }

    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(2.2, 1.4);
    map.anisotropy = 4;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(2.2, 1.4);

    return { map, bumpMap };
}

/* ────────────────────────────────────────────────────────────────────────────
 * CEDAR WOOD — for the plinth beneath the brass plaque.
 * ──────────────────────────────────────────────────────────────────────────── */

export function makeCedarTexture(seed: string | number): THREE.CanvasTexture {
    const prng = new PRNG(seed).fork('cedar');
    const W = 512;
    const H = 256;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext('2d')!;

    const grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#9a6a3e');
    grad.addColorStop(0.5, '#8a5a33');
    grad.addColorStop(1, '#7a4e2b');
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    // Warm cedar grain flowing horizontally
    for (let i = 0; i < 64; i++) {
        const y0 = prng.range(0, H);
        const light = prng.bool(0.4);
        c.strokeStyle = light
            ? `rgba(226,186,140,${prng.range(0.08, 0.2)})`
            : `rgba(64,36,16,${prng.range(0.08, 0.2)})`;
        c.lineWidth = prng.range(1, 4);
        c.beginPath();
        c.moveTo(0, y0);
        for (let x = 0; x <= W; x += 20) {
            c.lineTo(x, y0 + Math.sin(x * 0.02 + i) * prng.range(1, 5));
        }
        c.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

/* ────────────────────────────────────────────────────────────────────────────
 * ENGRAVED BRASS PLAQUE — brushed gold, deep engraved cursive typography,
 * laurel flourish, palette-tinted petal ornaments in the corners.
 * ──────────────────────────────────────────────────────────────────────────── */

const CURSIVE_STACK = `'Caveat', 'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', cursive`;
const SERIF_STACK = `'Cormorant Garamond', 'Playfair Display', Georgia, serif`;

export interface PlaqueArtwork {
    texture: THREE.CanvasTexture;
    redraw: () => void;
}

export function makeBrassPlaqueTexture(text: PlaqueText, accentHex: string): PlaqueArtwork {
    const W = 1024;
    const H = 352;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const draw = () => {
        const c = canvas.getContext('2d')!;
        c.clearRect(0, 0, W, H);

        // — Polished brass base with soft vertical sheen —
        const bg = c.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0.0, '#a8823c');
        bg.addColorStop(0.18, '#d4ab58');
        bg.addColorStop(0.42, '#f0cf82');
        bg.addColorStop(0.55, '#e2bd68');
        bg.addColorStop(0.82, '#c39a4a');
        bg.addColorStop(1.0, '#9a7634');
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);

        // — Brushed metal micro-streaks —
        const prng = new PRNG(text.title + text.subtitle);
        for (let i = 0; i < 240; i++) {
            const y = prng.range(0, H);
            c.strokeStyle = prng.bool(0.5)
                ? `rgba(255,240,200,${prng.range(0.02, 0.07)})`
                : `rgba(90,62,20,${prng.range(0.02, 0.06)})`;
            c.lineWidth = prng.range(0.5, 1.6);
            c.beginPath();
            c.moveTo(prng.range(0, W * 0.3), y);
            c.lineTo(prng.range(W * 0.7, W), y + prng.range(-2, 2));
            c.stroke();
        }

        // — Vignette edges (hand-waxed patina) —
        const vig = c.createLinearGradient(0, 0, W, 0);
        vig.addColorStop(0, 'rgba(70,48,14,0.35)');
        vig.addColorStop(0.12, 'rgba(70,48,14,0)');
        vig.addColorStop(0.88, 'rgba(70,48,14,0)');
        vig.addColorStop(1, 'rgba(70,48,14,0.35)');
        c.fillStyle = vig;
        c.fillRect(0, 0, W, H);

        // — Double engraved border frame —
        const engraveStroke = (fn: () => void, dark = 'rgba(58,38,8,0.85)', lite = 'rgba(255,238,190,0.55)') => {
            c.save();
            c.strokeStyle = lite;
            c.lineWidth = 3;
            c.translate(0, 2.2); // highlight catches the lower lip of the cut
            fn();
            c.restore();
            c.save();
            c.strokeStyle = dark;
            c.lineWidth = 2.6;
            fn();
            c.restore();
        };

        engraveStroke(() => {
            c.strokeRect(26, 24, W - 52, H - 48);
        });
        engraveStroke(() => {
            c.strokeRect(38, 36, W - 76, H - 72);
        }, 'rgba(58,38,8,0.5)', 'rgba(255,238,190,0.3)');

        // — Engraved text helper: light lower lip + dark cut —
        const engraveText = (
            str: string,
            font: string,
            y: number,
            maxWidth: number,
            maxPx: number
        ) => {
            let px = maxPx;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            do {
                c.font = font.replace('%s', String(px));
                if (c.measureText(str).width <= maxWidth || px <= 18) break;
                px -= 3;
            } while (true);

            c.save();
            c.fillStyle = 'rgba(255,240,196,0.5)';
            c.fillText(str, W / 2, y + 2.4);
            c.restore();

            c.fillStyle = 'rgba(52,32,6,0.92)';
            c.fillText(str, W / 2, y);
        };

        // — Cursive dedication —
        engraveText(text.title || 'Happy Birthday Mom', `700 %s ${CURSIVE_STACK}`, H * 0.36, W * 0.82, 96);

        // — Flourish divider —
        engraveStroke(() => {
            c.beginPath();
            c.moveTo(W / 2 - 150, H * 0.58);
            c.bezierCurveTo(W / 2 - 70, H * 0.52, W / 2 - 40, H * 0.66, W / 2, H * 0.58);
            c.bezierCurveTo(W / 2 + 40, H * 0.5, W / 2 + 70, H * 0.64, W / 2 + 150, H * 0.58);
            c.stroke();
        }, 'rgba(58,38,8,0.55)', 'rgba(255,238,190,0.35)');

        // — Subtitle in refined serif italics —
        engraveText(text.subtitle || 'May you forever bloom', `italic 600 %s ${SERIF_STACK}`, H * 0.72, W * 0.7, 46);

        // — Signature line —
        if (text.signature && text.signature.trim()) {
            engraveText(text.signature.trim(), `italic 500 %s ${SERIF_STACK}`, H * 0.88, W * 0.6, 30);
        }

        // — Corner petal ornaments, tinted with the living palette —
        const petal = (x: number, y: number, rot: number, s: number) => {
            c.save();
            c.translate(x, y);
            c.rotate(rot);
            c.fillStyle = accentHex + 'cc';
            c.beginPath();
            c.ellipse(0, -s * 0.5, s * 0.34, s * 0.6, 0, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = 'rgba(255,255,255,0.35)';
            c.beginPath();
            c.ellipse(0, -s * 0.62, s * 0.16, s * 0.32, 0, 0, Math.PI * 2);
            c.fill();
            c.restore();
        };
        const cornerFlower = (x: number, y: number) => {
            for (let p = 0; p < 5; p++) petal(x, y, (p / 5) * Math.PI * 2, 26);
            c.fillStyle = '#f7dd9a';
            c.beginPath();
            c.arc(x, y, 5, 0, Math.PI * 2);
            c.fill();
        };
        cornerFlower(72, 66);
        cornerFlower(W - 72, 66);
        cornerFlower(72, H - 62);
        cornerFlower(W - 72, H - 62);

        texture.needsUpdate = true;
    };

    draw();
    return { texture, redraw: draw };
}
