// ============================================================
// Creator Space Planner — Procedural Architectural Floor Textures
// Generates seamless canvas textures for all floor finishes
// ============================================================

import * as THREE from 'three';
import type { FloorFinish } from '@/components/space-planner/types';

const textureCache: Partial<Record<FloorFinish, THREE.CanvasTexture>> = {};

export function getFloorTexture(finish: FloorFinish = 'oak-parquet'): THREE.CanvasTexture {
  if (textureCache[finish]) return textureCache[finish]!;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  if (finish === 'dark-epoxy') {
    // High-gloss Dark Charcoal / Obsidian Epoxy with subtle metallic marble swirls
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 1024, 1024);

    // Marble veins
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 1024, 0);
      ctx.bezierCurveTo(
        Math.random() * 1024, 300,
        Math.random() * 1024, 700,
        Math.random() * 1024, 1024
      );
      ctx.stroke();
    }
  } else if (finish === 'acoustic-carpet') {
    // Dense Acoustic Studio Carpet Tile (Hex / Herringbone weave)
    ctx.fillStyle = '#2d3238';
    ctx.fillRect(0, 0, 1024, 1024);

    const tileSize = 64;
    for (let y = 0; y < 1024; y += tileSize) {
      for (let x = 0; x < 1024; x += tileSize) {
        const isAlt = (x / tileSize + y / tileSize) % 2 === 0;
        ctx.fillStyle = isAlt ? '#333940' : '#2b3036';
        ctx.fillRect(x, y, tileSize - 1, tileSize - 1);

        // Carpet fiber noise
        ctx.fillStyle = isAlt ? '#3e464f' : '#25292e';
        for (let p = 0; p < 20; p++) {
          ctx.fillRect(
            x + Math.random() * (tileSize - 2),
            y + Math.random() * (tileSize - 2),
            2,
            2
          );
        }
      }
    }
  } else if (finish === 'concrete-loft') {
    // Polished Industrial Loft Concrete with expansion joint grid
    ctx.fillStyle = '#b5b1a7';
    ctx.fillRect(0, 0, 1024, 1024);

    // Concrete aggregate speckles
    for (let i = 0; i < 800; i++) {
      const shade = Math.random() > 0.5 ? '#9c988f' : '#cbc7bc';
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Concrete slab joint lines
    ctx.strokeStyle = '#858178';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 1024, 1024);
    ctx.beginPath();
    ctx.moveTo(512, 0); ctx.lineTo(512, 1024);
    ctx.moveTo(0, 512); ctx.lineTo(1024, 512);
    ctx.stroke();
  } else {
    // 'oak-parquet' (Default Scandinavian White Oak Parquet)
    ctx.fillStyle = '#dfd7cc';
    ctx.fillRect(0, 0, 1024, 1024);

    const numRows = 16;
    const plankH = 1024 / numRows;
    const plankW = 256;

    for (let r = 0; r < numRows; r++) {
      const y = r * plankH;
      const offset = (r % 3) * 85;
      for (let x = -plankW + offset; x < 1024 + plankW; x += plankW) {
        const seed = Math.sin(r * 12.3 + x * 0.05);
        const lightness = 82 + seed * 5 - (r % 2) * 2;
        ctx.fillStyle = `hsl(38, 22%, ${lightness}%)`;
        ctx.fillRect(x, y, plankW - 2, plankH - 2);

        // Fine woodgrain striations
        ctx.strokeStyle = `hsla(35, 24%, ${lightness - 8}%, 0.4)`;
        ctx.lineWidth = 1;
        for (let g = 6; g < plankH - 4; g += 7) {
          ctx.beginPath();
          ctx.moveTo(x + 2, y + g);
          ctx.bezierCurveTo(
            x + plankW * 0.35,
            y + g + Math.sin(x + g) * 1.5,
            x + plankW * 0.7,
            y + g - Math.cos(x + g) * 1.5,
            x + plankW - 4,
            y + g
          );
          ctx.stroke();
        }

        ctx.strokeStyle = '#c4b7a4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, plankW - 1, plankH - 1);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache[finish] = tex;
  return tex;
}
