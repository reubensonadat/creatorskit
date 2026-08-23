import * as THREE from 'three';
import type { EquipmentDefinition } from './types';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';

// ============================================================
// Procedural 3D Model Generator for Studio Space Planner
// Ensures EVERY single gear item and decor piece in the catalog
// renders as a rich, authentic, multi-part 3D model (zero generic blobs)
// ============================================================

function makeMat(color: number, roughness = 0.7, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function emissiveMat(color: number, emissiveColor: number, intensity = 0.6, roughness = 0.3): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: emissiveColor, emissiveIntensity: intensity, roughness });
}

function addBox(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  opts?: {
    rx?: number;
    ry?: number;
    rz?: number;
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
  }
) {
  const mat = opts?.emissive !== undefined
    ? new THREE.MeshStandardMaterial({
        color,
        emissive: opts.emissive,
        emissiveIntensity: opts.emissiveIntensity ?? 0.6,
        roughness: opts.roughness ?? 0.3,
        metalness: opts.metalness ?? 0,
      })
    : makeMat(color, opts?.roughness, opts?.metalness);
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.005, w), Math.max(0.005, h), Math.max(0.005, d)), mat);
  m.position.set(x, y, z);
  if (opts?.rx) m.rotation.x = opts.rx;
  if (opts?.ry) m.rotation.y = opts.ry;
  if (opts?.rz) m.rotation.z = opts.rz;
  if (opts?.castShadow !== false) m.castShadow = true;
  if (opts?.receiveShadow) m.receiveShadow = true;
  g.add(m);
  return m;
}

function addCyl(
  g: THREE.Group,
  rTop: number,
  rBot: number,
  h: number,
  color: number,
  x: number,
  y: number,
  z: number,
  segments = 18,
  opts?: {
    rx?: number;
    ry?: number;
    rz?: number;
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
  }
) {
  const mat = opts?.emissive !== undefined
    ? new THREE.MeshStandardMaterial({
        color,
        emissive: opts.emissive,
        emissiveIntensity: opts.emissiveIntensity ?? 0.6,
        roughness: opts.roughness ?? 0.3,
        metalness: opts.metalness ?? 0,
      })
    : makeMat(color, opts?.roughness, opts?.metalness);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.002, rTop), Math.max(0.002, rBot), Math.max(0.005, h), segments), mat);
  m.position.set(x, y, z);
  if (opts?.rx) m.rotation.x = opts.rx;
  if (opts?.ry) m.rotation.y = opts.ry;
  if (opts?.rz) m.rotation.z = opts.rz;
  if (opts?.castShadow !== false) m.castShadow = true;
  if (opts?.receiveShadow) m.receiveShadow = true;
  g.add(m);
  return m;
}

function addSphere(
  g: THREE.Group,
  r: number,
  color: number,
  x: number,
  y: number,
  z: number,
  segments = 16,
  opts?: {
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
  }
) {
  const mat = opts?.emissive !== undefined
    ? new THREE.MeshStandardMaterial({
        color,
        emissive: opts.emissive,
        emissiveIntensity: opts.emissiveIntensity ?? 0.6,
        roughness: opts.roughness ?? 0.3,
        metalness: opts.metalness ?? 0,
      })
    : makeMat(color, opts?.roughness, opts?.metalness);
  const m = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.002, r), segments, Math.max(segments, 12)), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

// ============================================================
// 1. CAMERA & OPTICS PROCEDURAL BUILDER
// ============================================================
function buildCameraItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x222222;
  const name = (def.name || id).toLowerCase();

  // Broadcast / Pedestal camera
  if (name.includes('pedestal') || name.includes('broadcast') || name.includes('studio camera')) {
    const baseR = 0.45;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const lx = Math.cos(a) * (baseR / 2);
      const lz = Math.sin(a) * (baseR / 2);
      addBox(g, 0.05, 0.04, baseR, 0x1f1e1d, lx, 0.05, lz, { ry: -a + Math.PI / 2, metalness: 0.8 });
      const wx = Math.cos(a) * baseR;
      const wz = Math.sin(a) * baseR;
      addCyl(g, 0.04, 0.04, 0.03, 0x111111, wx, 0.04, wz, 12, { rz: Math.PI / 2, roughness: 0.9 });
    }
    const colH = Math.max(0.8, h - 0.5);
    addCyl(g, 0.07, 0.09, colH, 0x333333, 0, colH / 2 + 0.05, 0, 16, { metalness: 0.8, roughness: 0.3 });
    addCyl(g, 0.06, 0.06, 0.05, 0x222222, 0, colH + 0.04, 0, 16, { metalness: 0.9 });
    const headY = colH + 0.1;
    addBox(g, 0.22, 0.12, 0.2, 0x1a1a1a, 0, headY, 0, { metalness: 0.7 });
    addCyl(g, 0.012, 0.012, 0.45, 0x111111, -0.15, headY - 0.04, -0.2, 10, { rx: 0.5, metalness: 0.6 });
    addCyl(g, 0.012, 0.012, 0.45, 0x111111, 0.15, headY - 0.04, -0.2, 10, { rx: 0.5, metalness: 0.6 });
    const camY = headY + 0.16;
    addBox(g, 0.25, 0.22, 0.38, 0x242424, 0, camY, 0, { roughness: 0.4, metalness: 0.6 });
    addBox(g, 0.2, 0.2, 0.35, 0x181818, 0, camY, 0.35, { roughness: 0.3, metalness: 0.7 });
    addCyl(g, 0.09, 0.09, 0.04, 0x0a1020, 0, camY, 0.54, 20, { rx: Math.PI / 2, roughness: 0.1, metalness: 0.9, emissive: 0x003366, emissiveIntensity: 0.4 });
    addBox(g, 0.24, 0.16, 0.02, 0x111111, 0, camY + 0.2, 0.05, { metalness: 0.6 });
    addBox(g, 0.22, 0.14, 0.005, 0x224488, 0, camY + 0.2, 0.06, { emissive: 0x3366aa, emissiveIntensity: 0.7 });
    return;
  }

  // Teleprompter Rig on Stand
  if (name.includes('prompter') || name.includes('teleprompter')) {
    const standH = Math.max(1.0, h - 0.4);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addCyl(g, 0.015, 0.01, standH, 0x222222, Math.cos(a) * 0.22, standH / 2, Math.sin(a) * 0.22, 10, { metalness: 0.8 });
    }
    const propY = standH + 0.15;
    // Beamsplitter glass trapezoid hood
    addBox(g, 0.34, 0.26, 0.28, 0x1a1a1a, 0, propY, 0, { roughness: 0.9 });
    // 45-degree glass plane
    addBox(g, 0.3, 0.22, 0.004, 0x88bbdd, 0, propY, 0.04, { rx: -0.7, emissive: 0x336688, emissiveIntensity: 0.6 });
    // Lower prompter tablet display
    addBox(g, 0.28, 0.015, 0.2, 0x111111, 0, propY - 0.12, 0.08, { metalness: 0.8 });
    addBox(g, 0.26, 0.002, 0.18, 0x00ee44, 0, propY - 0.11, 0.08, { emissive: 0x00cc33, emissiveIntensity: 0.8 });
    // Rear camera body
    addBox(g, 0.16, 0.12, 0.15, 0x222222, 0, propY, -0.2, { roughness: 0.4, metalness: 0.6 });
    return;
  }

  // Generic Full-Rig Camera on Tripod
  const standH = Math.max(1.0, h - 0.4);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const lx = Math.cos(a) * 0.28;
    const lz = Math.sin(a) * 0.28;
    addCyl(g, 0.015, 0.01, standH, 0x282624, lx / 2, standH / 2, lz / 2, 10, { rx: (Math.sin(a) * 0.28) / standH, rz: (-Math.cos(a) * 0.28) / standH, metalness: 0.8 });
  }
  addCyl(g, 0.022, 0.022, standH * 0.4, 0x1f1e1d, 0, standH * 0.8, 0, 12, { metalness: 0.9 });
  addBox(g, 0.14, 0.08, 0.12, 0x181818, 0, standH + 0.04, 0, { metalness: 0.8 });
  const camY = standH + 0.14;
  addBox(g, 0.18, 0.14, 0.2, col, 0, camY, 0, { roughness: 0.4, metalness: 0.6 });
  addCyl(g, 0.045, 0.042, 0.14, 0x111111, 0, camY, 0.17, 18, { rx: Math.PI / 2, metalness: 0.85, roughness: 0.2 });
  addCyl(g, 0.038, 0.038, 0.01, 0x0055aa, 0, camY, 0.24, 18, { rx: Math.PI / 2, emissive: 0x004488, emissiveIntensity: 0.6 });
  addBox(g, 0.03, 0.02, 0.15, 0x1a1a1a, 0, camY + 0.1, 0, { metalness: 0.8 });
}

// ============================================================
// 2. LIGHTING & MODIFIERS PROCEDURAL BUILDER
// ============================================================
function buildLightingItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0xf5f1ea;
  const name = (def.name || id).toLowerCase();

  // Softbox / Octabox / Lantern / Parabolic Dome
  if (name.includes('softbox') || name.includes('octa') || name.includes('lantern') || name.includes('umbrella') || name.includes('dome')) {
    const standH = Math.max(1.1, h - 0.45);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addCyl(g, 0.014, 0.01, 0.55, 0x1f1e1d, Math.cos(a) * 0.22, 0.25, Math.sin(a) * 0.22, 10, { metalness: 0.8 });
    }
    addCyl(g, 0.018, 0.022, standH, 0x1f1e1d, 0, standH / 2, 0, 12, { metalness: 0.85 });
    const headY = standH + 0.1;
    addBox(g, 0.16, 0.16, 0.18, 0x181818, 0, headY, -0.08, { metalness: 0.7 });
    const sbW = Math.max(0.45, w);
    const sbH = Math.max(0.45, Math.min(0.8, h * 0.5));
    addBox(g, sbW, sbH, 0.28, 0x111111, 0, headY, 0.12, { roughness: 0.95 });
    addBox(g, sbW * 0.96, sbH * 0.96, 0.01, 0xffffff, 0, headY, 0.26, {
      emissive: 0xfff8ee,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
    return;
  }

  // Fresnel Spotlight with Barn Doors
  if (name.includes('fresnel') || name.includes('spotlight') || name.includes('beam') || name.includes('par') || name.includes('barndoor')) {
    const standH = Math.max(1.1, h - 0.35);
    addCyl(g, 0.02, 0.02, standH, 0x333333, 0, standH / 2, 0, 14, { metalness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addBox(g, 0.025, 0.025, 0.35, 0x333333, Math.cos(a) * 0.18, 0.03 + i * 0.015, Math.sin(a) * 0.18, { ry: -a + Math.PI / 2, metalness: 0.9 });
    }
    const headY = standH + 0.15;
    addBox(g, 0.24, 0.02, 0.04, 0x222222, 0, headY - 0.08, 0, { metalness: 0.8 });
    addBox(g, 0.02, 0.16, 0.04, 0x222222, -0.12, headY, 0, { metalness: 0.8 });
    addBox(g, 0.02, 0.16, 0.04, 0x222222, 0.12, headY, 0, { metalness: 0.8 });
    addCyl(g, 0.09, 0.09, 0.24, 0x1f1e1d, 0, headY, 0, 18, { rx: Math.PI / 2, metalness: 0.7, roughness: 0.3 });
    addCyl(g, 0.082, 0.082, 0.02, 0xfff0cc, 0, headY, 0.12, 20, { rx: Math.PI / 2, emissive: 0xffd988, emissiveIntensity: 1.0 });
    const doorW = 0.18, doorH = 0.1;
    addBox(g, doorW, doorH, 0.005, 0x111111, 0, headY + 0.1, 0.18, { rx: -0.4, roughness: 0.8 });
    addBox(g, doorW, doorH, 0.005, 0x111111, 0, headY - 0.1, 0.18, { rx: 0.4, roughness: 0.8 });
    addBox(g, doorH, doorW, 0.005, 0x111111, -0.1, headY, 0.18, { ry: 0.4, roughness: 0.8 });
    addBox(g, doorH, doorW, 0.005, 0x111111, 0.1, headY, 0.18, { ry: -0.4, roughness: 0.8 });
    return;
  }

  // LED RGB Tube / Wand / Pixel Bar
  if (name.includes('tube') || name.includes('wand') || name.includes('pixel') || name.includes('bar')) {
    const tubeH = Math.max(0.6, h);
    addCyl(g, 0.025, 0.025, tubeH * 0.85, col, 0, tubeH / 2, 0, 18, {
      emissive: col,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    addCyl(g, 0.028, 0.028, 0.04, 0x222222, 0, tubeH * 0.05, 0, 16, { metalness: 0.9 });
    addCyl(g, 0.028, 0.028, 0.04, 0x222222, 0, tubeH * 0.95, 0, 16, { metalness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addCyl(g, 0.006, 0.006, 0.14, 0x181818, Math.cos(a) * 0.06, 0.04, Math.sin(a) * 0.06, 8, { metalness: 0.8 });
    }
    return;
  }

  // Generic Lighting Fallback (LED Panel on Stand)
  const standH = Math.max(1.0, h - 0.3);
  addCyl(g, 0.018, 0.018, standH, 0x222222, 0, standH / 2, 0, 12, { metalness: 0.8 });
  addBox(g, w, h * 0.3, d, 0x1f1e1d, 0, standH + (h * 0.3) / 2, 0, { metalness: 0.7 });
  addBox(g, w * 0.9, h * 0.26, 0.01, 0xffeedd, 0, standH + (h * 0.3) / 2, d / 2 + 0.005, { emissive: 0xffe0b0, emissiveIntensity: 0.8 });
}

// ============================================================
// 3. AUDIO & ACOUSTICS PROCEDURAL BUILDER
// ============================================================
function buildAudioItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x2a2826;
  const name = (def.name || id).toLowerCase();

  // Broadcast / Podcast Microphone on Boom Arm
  if (name.includes('podcast') || name.includes('broadcast mic') || name.includes('dynamic mic') || name.includes('sm7b')) {
    addBox(g, 0.06, 0.08, 0.06, 0x181818, 0, 0.04, 0, { metalness: 0.9 });
    addCyl(g, 0.008, 0.008, 0.35, 0x222222, -0.05, 0.22, 0, 8, { rz: 0.3, metalness: 0.85 });
    addCyl(g, 0.008, 0.008, 0.35, 0x222222, 0.05, 0.22, 0, 8, { rz: -0.3, metalness: 0.85 });
    const micY = Math.max(0.35, h * 0.7);
    addBox(g, 0.12, 0.06, 0.03, 0x181818, 0, micY, 0, { metalness: 0.8 });
    addCyl(g, 0.026, 0.026, 0.14, 0x111111, 0, micY + 0.06, 0.04, 16, { rx: 0.5, roughness: 0.95 });
    addCyl(g, 0.022, 0.022, 0.06, 0x242424, 0, micY + 0.01, -0.02, 14, { rx: 0.5, metalness: 0.7 });
    return;
  }

  // Audio Mixer / DJ Console / Stream Interface
  if (name.includes('mixer') || name.includes('interface') || name.includes('console') || name.includes('recorder') || name.includes('dj') || name.includes('deck')) {
    const cW = Math.max(0.25, w);
    const cD = Math.max(0.2, d);
    const cH = Math.max(0.04, h);
    addBox(g, cW, cH, cD, 0x1f1e1d, 0, cH / 2, 0, { rx: -0.1, roughness: 0.4, metalness: 0.6 });
    const numFaders = Math.max(4, Math.floor(cW / 0.05));
    for (let i = 0; i < numFaders; i++) {
      const fx = -cW * 0.4 + (i * cW * 0.8) / (numFaders - 1);
      addBox(g, 0.006, 0.002, cD * 0.4, 0x0a0a0a, fx, cH + 0.002, 0.02, { roughness: 0.9 });
      addBox(g, 0.016, 0.012, 0.02, i === 0 ? 0xcc3333 : 0xdddddd, fx, cH + 0.008, 0.01, { roughness: 0.6 });
      addCyl(g, 0.006, 0.006, 0.01, 0x2288cc, fx, cH + 0.007, -cD * 0.22, 10);
    }
    addBox(g, 0.02, 0.004, cD * 0.35, 0x00ff44, cW * 0.42, cH + 0.002, -0.05, { emissive: 0x00cc33, emissiveIntensity: 0.8 });
    return;
  }

  // Studio Monitor Speaker
  if (name.includes('monitor') || name.includes('speaker') || name.includes('subwoofer')) {
    addBox(g, w, h, d, 0x181818, 0, h / 2, 0, { roughness: 0.7, metalness: 0.2 });
    const wooferR = Math.min(w * 0.38, h * 0.28);
    const wooferY = h * 0.38;
    addCyl(g, wooferR, wooferR * 0.85, 0.015, 0xffaa00, 0, wooferY, d / 2 + 0.005, 20, { rx: Math.PI / 2, roughness: 0.5 });
    addSphere(g, wooferR * 0.32, 0x111111, 0, wooferY, d / 2 + 0.015, 14, { roughness: 0.3 });
    const tweetR = wooferR * 0.42;
    const tweetY = h * 0.75;
    addCyl(g, tweetR * 1.3, tweetR * 1.3, 0.008, 0x222222, 0, tweetY, d / 2 + 0.004, 16, { rx: Math.PI / 2 });
    addSphere(g, tweetR * 0.7, 0x111111, 0, tweetY, d / 2 + 0.008, 14, { metalness: 0.6 });
    return;
  }

  // Acoustic Wall Panel
  if (name.includes('acoustic') || name.includes('diffuser') || name.includes('bass trap') || name.includes('foam')) {
    addBox(g, w, h, d, 0x2a2826, 0, h / 2, 0, { roughness: 0.8 });
    const rows = 4, cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = -w * 0.4 + (c * w * 0.8) / (cols - 1);
        const py = h * 0.15 + (r * h * 0.7) / (rows - 1);
        addBox(g, (w * 0.8) / cols, (h * 0.7) / rows, 0.02, (r + c) % 2 === 0 ? col : 0x1a1a1a, px, py, d / 2 + 0.008, { roughness: 0.98 });
      }
    }
    return;
  }

  // Generic Audio Fallback
  addCyl(g, 0.08, 0.08, 0.02, 0x111111, 0, 0.01, 0, 16, { metalness: 0.9 });
  addCyl(g, 0.012, 0.012, h * 0.8, 0x222222, 0, (h * 0.8) / 2, 0, 10, { metalness: 0.85 });
  addCyl(g, 0.025, 0.025, 0.12, col, 0, h * 0.8 + 0.06, 0, 16, { metalness: 0.8 });
}

// ============================================================
// 4. DECOR, PROPS & BOTANICALS PROCEDURAL BUILDER
// ============================================================
function buildDecorAndPropsItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x22c55e;
  const name = (def.name || id).toLowerCase();

  // 1. Indoor Plants / Fiddle Leaf / Monstera / Ferns
  if (name.includes('plant') || name.includes('tree') || name.includes('monstera') || name.includes('flora') || name.includes('fig') || name.includes('palm')) {
    // Ceramic planter pot
    const potR = Math.max(0.12, Math.min(w * 0.4, 0.25));
    const potH = Math.max(0.25, h * 0.35);
    addCyl(g, potR * 1.1, potR * 0.85, potH, 0xf5f0eb, 0, potH / 2, 0, 18, { roughness: 0.5 });
    // Dark rich soil inside pot
    addCyl(g, potR * 0.95, potR * 0.95, 0.02, 0x2a1b0e, 0, potH - 0.01, 0, 16, { roughness: 0.98 });
    // Main vertical stalks
    const stalkH = h - potH;
    addCyl(g, 0.014, 0.02, stalkH, 0x4a7c36, 0, potH + stalkH / 2, 0, 10, { roughness: 0.7 });
    // Layered broad green leaves
    const numLeaves = 8;
    for (let i = 0; i < numLeaves; i++) {
      const a = (i * Math.PI * 2) / numLeaves + (i * 0.3);
      const ly = potH + 0.15 + (i * (stalkH - 0.1)) / numLeaves;
      const lDist = potR * 1.4 + (i % 3) * 0.08;
      const lx = Math.cos(a) * lDist;
      const lz = Math.sin(a) * lDist;
      // Leaf stem
      addCyl(g, 0.005, 0.008, lDist * 0.8, 0x4a7c36, lx / 2, ly, lz / 2, 6, {
        ry: -a,
        rx: 0.4,
        roughness: 0.8,
      });
      // Broad green leaf blade
      addBox(g, 0.18, 0.005, 0.26, 0x2e7d32, lx, ly + 0.05, lz, {
        ry: -a,
        rx: 0.35,
        roughness: 0.6,
      });
    }
    return;
  }

  // 2. Neon Accent Wall Signs / LED Artwork
  if (name.includes('neon') || name.includes('led sign') || name.includes('wall art') || name.includes('logo sign')) {
    // Clear acrylic mounting backing
    addBox(g, w, h, 0.008, 0x111111, 0, h / 2, 0, { metalness: 0.5, roughness: 0.1 });
    // Glowing neon tube lines
    const neonCol = def.color || 0xff007f;
    addCyl(g, 0.01, 0.01, w * 0.8, neonCol, 0, h * 0.7, 0.012, 12, { rz: Math.PI / 2, emissive: neonCol, emissiveIntensity: 1.2 });
    addCyl(g, 0.01, 0.01, w * 0.6, neonCol, 0, h * 0.35, 0.012, 12, { rz: Math.PI / 2, emissive: neonCol, emissiveIntensity: 1.2 });
    addCyl(g, 0.01, 0.01, h * 0.5, neonCol, -w * 0.3, h * 0.5, 0.012, 12, { emissive: neonCol, emissiveIntensity: 1.2 });
    addCyl(g, 0.01, 0.01, h * 0.5, neonCol, w * 0.3, h * 0.5, 0.012, 12, { emissive: neonCol, emissiveIntensity: 1.2 });
    return;
  }

  // 3. Studio Rug / Acoustic Floor Carpet
  if (name.includes('rug') || name.includes('carpet') || name.includes('mat')) {
    // Thin textured floor rug with border trim
    addBox(g, w, 0.008, d, col, 0, 0.004, 0, { roughness: 0.98 });
    // Outer border trim
    addBox(g, w * 1.02, 0.009, 0.04, 0x181818, 0, 0.0045, -d / 2, { roughness: 0.9 });
    addBox(g, w * 1.02, 0.009, 0.04, 0x181818, 0, 0.0045, d / 2, { roughness: 0.9 });
    addBox(g, 0.04, 0.009, d * 1.02, 0x181818, -w / 2, 0.0045, 0, { roughness: 0.9 });
    addBox(g, 0.04, 0.009, d * 1.02, 0x181818, w / 2, 0.0045, 0, { roughness: 0.9 });
    return;
  }

  // 4. Picture Frame / Wall Poster / Gold Record
  if (name.includes('frame') || name.includes('poster') || name.includes('canvas') || name.includes('award') || name.includes('gold record')) {
    // Black gallery frame
    addBox(g, w, h, 0.02, 0x111111, 0, h / 2, 0, { roughness: 0.4, metalness: 0.7 });
    // White interior passe-partout matting
    addBox(g, w * 0.92, h * 0.92, 0.004, 0xffffff, 0, h / 2, 0.011, { roughness: 0.8 });
    // Center artwork / Gold vinyl record
    if (name.includes('record') || name.includes('gold')) {
      addCyl(g, Math.min(w, h) * 0.35, Math.min(w, h) * 0.35, 0.006, 0xffd700, 0, h / 2, 0.014, 24, { rx: Math.PI / 2, metalness: 0.95, roughness: 0.15 });
      addCyl(g, Math.min(w, h) * 0.12, Math.min(w, h) * 0.12, 0.008, 0xcc2200, 0, h / 2, 0.015, 16, { rx: Math.PI / 2 });
    } else {
      addBox(g, w * 0.75, h * 0.75, 0.004, 0x224477, 0, h / 2, 0.013, { roughness: 0.5 });
    }
    return;
  }

  // 5. Electric / Acoustic Guitar & Bass on Floor Stand
  if (name.includes('guitar') || name.includes('bass') || name.includes('instrument')) {
    // Tripod floor stand base
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addCyl(g, 0.008, 0.008, 0.28, 0x111111, Math.cos(a) * 0.14, 0.08, Math.sin(a) * 0.14, 8, { metalness: 0.9 });
    }
    addCyl(g, 0.012, 0.012, 0.85, 0x222222, 0, 0.45, -0.05, 10, { metalness: 0.9 });
    // Contoured guitar body
    const bodyY = 0.35;
    addBox(g, 0.32, 0.45, 0.05, col, 0, bodyY, 0, { roughness: 0.3, metalness: 0.2 });
    addBox(g, 0.22, 0.3, 0.052, 0xffffff, -0.04, bodyY - 0.04, 0.001, { roughness: 0.4 });
    // Maple guitar neck & fretboard
    addBox(g, 0.045, 0.55, 0.025, 0xd4a373, 0, bodyY + 0.45, 0.01, { roughness: 0.5 });
    // Headstock with chrome tuning pegs
    addBox(g, 0.065, 0.14, 0.02, 0x2b1d0c, 0, bodyY + 0.76, 0.01, { roughness: 0.4 });
    for (let p = 0; p < 6; p++) {
      const py = bodyY + 0.72 + (p % 3) * 0.035;
      const px = p < 3 ? -0.04 : 0.04;
      addCyl(g, 0.004, 0.004, 0.02, 0xeeeeee, px, py, 0.01, 8, { rz: Math.PI / 2, metalness: 0.95 });
    }
    return;
  }

  // 6. Studio Espresso Bar & Beverage Station
  if (name.includes('coffee') || name.includes('espresso') || name.includes('fridge') || name.includes('bar')) {
    // Stainless steel machine housing
    addBox(g, w, h, d, 0x2a2826, 0, h / 2, 0, { metalness: 0.8, roughness: 0.2 });
    // Dual chrome portafilter group heads
    [-w * 0.2, w * 0.2].forEach((gx) => {
      addCyl(g, 0.03, 0.025, 0.04, 0xdddddd, gx, h * 0.45, d / 2 + 0.02, 14, { metalness: 0.95 });
      addCyl(g, 0.008, 0.008, 0.12, 0x111111, gx, h * 0.45, d / 2 + 0.08, 8, { rx: Math.PI / 2, roughness: 0.8 });
    });
    // Steam wand & pressure manometer gauge
    addCyl(g, 0.005, 0.005, 0.14, 0xdddddd, w * 0.38, h * 0.38, d / 2 + 0.03, 8, { rx: 0.3, metalness: 0.95 });
    addCyl(g, 0.02, 0.02, 0.005, 0xffffff, 0, h * 0.75, d / 2 + 0.002, 14, { rx: Math.PI / 2 });
    // Top warming rack with espresso cups
    addBox(g, w * 0.88, 0.01, d * 0.88, 0x333333, 0, h + 0.005, 0, { metalness: 0.9 });
    [-w * 0.25, 0, w * 0.25].forEach((cx) => {
      addCyl(g, 0.025, 0.018, 0.04, 0xffffff, cx, h + 0.03, 0, 12, { roughness: 0.2 });
    });
    return;
  }

  // 7. Books, Vinyl Records & Creator Props Stack
  if (name.includes('book') || name.includes('vinyl') || name.includes('prop') || name.includes('decor')) {
    // Base stack of horizontal books
    const bookColors = [0x991b1b, 0x1e3a8a, 0x065f46, 0xb45309];
    bookColors.forEach((bCol, i) => {
      addBox(g, w * 0.75, 0.035, d * 0.75, bCol, 0, 0.018 + i * 0.036, 0, { roughness: 0.8 });
      addBox(g, w * 0.04, 0.035, d * 0.72, 0xffffff, -w * 0.36, 0.018 + i * 0.036, 0, { roughness: 0.9 });
    });
    // Metal decorative bookend or headphone stand on top
    addBox(g, 0.08, 0.12, 0.08, 0x1f1e1d, 0, 0.2, 0, { metalness: 0.85 });
    return;
  }

  // 8. Universal High-Detail Decor Archetype
  addBox(g, w, h * 0.85, d, col, 0, (h * 0.85) / 2, 0, { roughness: 0.6, metalness: 0.2 });
  addBox(g, w * 1.05, 0.02, d * 1.05, 0x181818, 0, h * 0.85 + 0.01, 0, { metalness: 0.8 });
}

// ============================================================
// 5. FURNITURE & STAGING PROCEDURAL BUILDER
// ============================================================
function buildFurnitureItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x3a3836;
  const name = (def.name || id).toLowerCase();

  // Desks, Workstations & Tables
  if (name.includes('desk') || name.includes('table') || name.includes('workstation')) {
    const topThick = 0.04;
    addBox(g, w, topThick, d, col, 0, h - topThick / 2, 0, { roughness: 0.5, metalness: 0.1 });
    if (w > 1.0) {
      [-w * 0.42, w * 0.42].forEach((lx) => {
        addBox(g, 0.08, h - topThick, 0.06, 0x1f1e1d, lx, (h - topThick) / 2, 0, { metalness: 0.85 });
        addBox(g, 0.08, 0.03, d * 0.8, 0x1f1e1d, lx, 0.015, 0, { metalness: 0.85 });
        addBox(g, 0.06, 0.03, d * 0.7, 0x1f1e1d, lx, h - topThick - 0.015, 0, { metalness: 0.85 });
      });
      addBox(g, w * 0.8, 0.04, 0.04, 0x1f1e1d, 0, h * 0.7, 0, { metalness: 0.85 });
    } else {
      [-w * 0.42, w * 0.42].forEach((lx) => {
        [-d * 0.42, d * 0.42].forEach((lz) => {
          addCyl(g, 0.025, 0.02, h - topThick, 0x1f1e1d, lx, (h - topThick) / 2, lz, 10, { metalness: 0.8 });
        });
      });
    }
    return;
  }

  // Chairs & Ergonomic Seating
  if (name.includes('chair') || name.includes('seating')) {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const lx = Math.cos(a) * 0.25;
      const lz = Math.sin(a) * 0.25;
      addBox(g, 0.04, 0.025, 0.26, 0x181818, lx / 2, 0.06, lz / 2, { ry: -a + Math.PI / 2, metalness: 0.8 });
      addCyl(g, 0.025, 0.025, 0.03, 0x111111, lx, 0.03, lz, 10, { rz: Math.PI / 2, roughness: 0.9 });
    }
    const seatY = Math.max(0.42, h * 0.45);
    addCyl(g, 0.028, 0.032, seatY - 0.06, 0x333333, 0, (seatY + 0.06) / 2, 0, 14, { metalness: 0.95 });
    addBox(g, w * 0.85, 0.08, d * 0.85, col, 0, seatY, 0, { roughness: 0.8 });
    const backH = h - seatY;
    addBox(g, w * 0.78, backH * 0.85, 0.05, col, 0, seatY + backH * 0.45, -d * 0.35, { rx: 0.1, roughness: 0.8 });
    [-w * 0.42, w * 0.42].forEach((ax) => {
      addCyl(g, 0.015, 0.015, 0.18, 0x222222, ax, seatY + 0.09, 0, 10, { metalness: 0.8 });
      addBox(g, 0.08, 0.025, 0.22, 0x111111, ax, seatY + 0.18, 0, { roughness: 0.9 });
    });
    return;
  }

  // Sofa / Lounge Armchair
  if (name.includes('sofa') || name.includes('couch') || name.includes('lounge')) {
    const seatH = 0.42;
    addBox(g, w, 0.15, d, col, 0, 0.18, 0, { roughness: 0.9 });
    [-w * 0.44, w * 0.44].forEach((lx) => {
      [-d * 0.44, d * 0.44].forEach((lz) => {
        addCyl(g, 0.03, 0.02, 0.1, 0x553311, lx, 0.05, lz, 10, { roughness: 0.6 });
      });
    });
    addBox(g, w * 0.88, 0.14, d * 0.75, col, 0, seatH, d * 0.05, { roughness: 0.95 });
    addBox(g, w, h - seatH, 0.22, col, 0, seatH + (h - seatH) / 2, -d * 0.38, { roughness: 0.95 });
    [-w / 2 + 0.1, w / 2 - 0.1].forEach((ax) => {
      addBox(g, 0.18, 0.28, d, col, ax, 0.38, 0, { roughness: 0.95 });
    });
    return;
  }

  // Built-in Wardrobe / Closet Cabinet
  if (name.includes('wardrobe') || name.includes('closet')) {
    const plinthH = 0.08;
    // Main carcass
    addBox(g, w, h - plinthH, d, col, 0, plinthH + (h - plinthH) / 2, 0, { roughness: 0.75 });
    // Recessed base plinth
    addBox(g, w * 0.96, plinthH, d * 0.94, 0x222222, 0, plinthH / 2, 0, { roughness: 0.8 });
    // Top crown trim
    addBox(g, w * 1.02, 0.03, d * 1.02, col, 0, h - 0.015, 0, { roughness: 0.6 });

    // Doors & handles
    const numDoors = w > 1.4 ? (w > 2.2 ? 4 : 3) : 2;
    const doorW = (w - 0.02 * (numDoors + 1)) / numDoors;
    for (let i = 0; i < numDoors; i++) {
      const dx = -w / 2 + 0.02 + doorW / 2 + i * (doorW + 0.01);
      // Door panel
      addBox(g, doorW, h - plinthH - 0.06, 0.015, col, dx, plinthH + 0.03 + (h - plinthH - 0.06) / 2, d / 2 + 0.008, {
        roughness: 0.65,
      });
      // Minimalist brushed metal handle
      const handleSide = i % 2 === 0 ? dx + doorW * 0.38 : dx - doorW * 0.38;
      addBox(g, 0.015, 0.35, 0.025, 0xdddddd, handleSide, h * 0.52, d / 2 + 0.025, { metalness: 0.9, roughness: 0.2 });
    }
    return;
  }

  // Bed & Headboard Obstacle
  if (name.includes('bed')) {
    const baseH = 0.28;
    const mattressH = 0.22;
    // Bed base
    addBox(g, w, baseH, d, 0x2a2420, 0, baseH / 2, 0, { roughness: 0.8 });
    // Headboard
    const headboardH = Math.min(1.1, h * 1.6);
    addBox(g, w * 1.02, headboardH, 0.08, 0x3d332a, 0, headboardH / 2, -d / 2 + 0.04, { roughness: 0.85 });
    // Mattress
    addBox(g, w * 0.96, mattressH, d * 0.92, 0xf7f5f0, 0, baseH + mattressH / 2, d * 0.02, { roughness: 0.95 });
    // Duvet / Comforter
    addBox(g, w * 0.98, 0.04, d * 0.65, col, 0, baseH + mattressH + 0.02, d * 0.15, { roughness: 0.9 });
    // Pillows
    const pillowW = (w * 0.85) / 2;
    [-pillowW / 2 - 0.02, pillowW / 2 + 0.02].forEach((px) => {
      addBox(g, pillowW, 0.1, 0.35, 0xffffff, px, baseH + mattressH + 0.05, -d * 0.28, { rx: 0.2, roughness: 0.95 });
    });
    return;
  }

  // Door Swing & Clearance Arc
  if (name.includes('door') || name.includes('swing')) {
    // Door frame
    const frameW = 0.06;
    addBox(g, frameW, h, 0.08, 0x2a2826, -w / 2 + frameW / 2, h / 2, 0, { roughness: 0.8 });
    addBox(g, frameW, h, 0.08, 0x2a2826, w / 2 - frameW / 2, h / 2, 0, { roughness: 0.8 });
    addBox(g, w, frameW, 0.08, 0x2a2826, 0, h - frameW / 2, 0, { roughness: 0.8 });
    // Open door leaf at 45 degree angle
    const doorLeafW = w - frameW * 2;
    addBox(g, 0.035, h - frameW, doorLeafW, 0x8a6a4a, -w / 2 + frameW + 0.02, (h - frameW) / 2, doorLeafW / 2, {
      ry: 0.5,
      roughness: 0.7,
    });
    // Metal door handle
    addBox(g, 0.06, 0.03, 0.12, 0xcccccc, -w / 2 + frameW + 0.15, 0.95, doorLeafW * 0.85, { metalness: 0.9 });
    // Floor clearance arc
    const arcRadius = doorLeafW;
    const arcPoints: THREE.Vector3[] = [];
    for (let a = 0; a <= Math.PI / 2; a += Math.PI / 16) {
      arcPoints.push(new THREE.Vector3(-w / 2 + frameW + Math.sin(a) * arcRadius, 0.005, Math.cos(a) * arcRadius));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMat = new THREE.LineDashedMaterial({ color: 0xffaa00, dashSize: 0.08, gapSize: 0.05 });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    arcLine.computeLineDistances();
    g.add(arcLine);
    return;
  }

  // Structural Column / Pillar
  if (name.includes('pillar') || name.includes('column')) {
    addBox(g, w, h, d, col || 0xe5e2dc, 0, h / 2, 0, { roughness: 0.9 });
    addBox(g, w * 1.08, 0.08, d * 1.08, 0x2a2826, 0, 0.04, 0, { roughness: 0.8 });
    addBox(g, w * 1.08, 0.08, d * 1.08, 0x2a2826, 0, h - 0.04, 0, { roughness: 0.8 });
    return;
  }

  // Shelving Units, Credenzas & Gear Racks
  if (name.includes('shelf') || name.includes('rack') || name.includes('credenza') || name.includes('cabinet')) {
    [-w / 2 + 0.02, w / 2 - 0.02].forEach((px) => {
      [-d / 2 + 0.02, d / 2 - 0.02].forEach((pz) => {
        addBox(g, 0.03, h, 0.03, 0x1f1e1d, px, h / 2, pz, { metalness: 0.85 });
      });
    });
    const numShelves = 4;
    for (let i = 0; i < numShelves; i++) {
      const sy = 0.08 + (i * (h - 0.12)) / (numShelves - 1);
      addBox(g, w - 0.02, 0.02, d - 0.02, col, 0, sy, 0, { roughness: 0.6 });
      if (i < numShelves - 1) {
        addBox(g, 0.18, 0.12, 0.14, 0x333333, -w * 0.25, sy + 0.07, 0, { roughness: 0.7 });
        addBox(g, 0.22, 0.15, 0.16, 0x554433, w * 0.22, sy + 0.085, 0, { roughness: 0.8 });
      }
    }
    return;
  }

  // Backdrop / Green Screen / Cyclorama
  if (name.includes('backdrop') || name.includes('green-screen') || name.includes('seamless') || name.includes('cyclorama')) {
    [-w / 2 + 0.05, w / 2 - 0.05].forEach((sx) => {
      addCyl(g, 0.02, 0.02, h, 0x222222, sx, h / 2, -d * 0.4, 12, { metalness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        addCyl(g, 0.012, 0.008, 0.45, 0x1f1e1d, sx + Math.cos(a) * 0.18, 0.2, -d * 0.4 + Math.sin(a) * 0.18, 8, { metalness: 0.8 });
      }
    });
    addCyl(g, 0.025, 0.025, w, 0x333333, 0, h - 0.04, -d * 0.4, 16, { rz: Math.PI / 2, metalness: 0.9 });
    const sweepColor = name.includes('green') ? 0x00cc44 : col;
    addBox(g, w * 0.94, h * 0.95, 0.005, sweepColor, 0, h * 0.48, -d * 0.4, { roughness: 0.98 });
    addBox(g, w * 0.94, 0.005, d * 0.8, sweepColor, 0, 0.003, 0, { roughness: 0.98 });
    return;
  }

  // Fallback to Decor & Props builder
  buildDecorAndPropsItem(g, def, id);
}

// ============================================================
// 6. TECH & COMPUTING PROCEDURAL BUILDER
// ============================================================
function buildTechItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const name = (def.name || id).toLowerCase();

  // Laptop / MacBook
  if (name.includes('laptop') || name.includes('macbook')) {
    const baseH = 0.015;
    addBox(g, w, baseH, d * 0.65, 0xd0d0d0, 0, baseH / 2, 0, { metalness: 0.9, roughness: 0.2 });
    addBox(g, w * 0.85, 0.002, d * 0.35, 0x111111, 0, baseH + 0.001, -d * 0.08, { roughness: 0.8 });
    addBox(g, w * 0.35, 0.001, d * 0.18, 0xb0b0b0, 0, baseH + 0.001, d * 0.2, { metalness: 0.5 });
    const screenH = d * 0.6;
    addBox(g, w, screenH, 0.008, 0xd0d0d0, 0, baseH + screenH / 2, -d * 0.32, { rx: -0.25, metalness: 0.9 });
    addBox(g, w * 0.92, screenH * 0.88, 0.002, 0x113355, 0, baseH + screenH / 2, -d * 0.31, { rx: -0.25, emissive: 0x224477, emissiveIntensity: 0.8 });
    return;
  }

  // Tower PC Workstation
  if (name.includes('pc') || name.includes('tower') || name.includes('server') || name.includes('workstation')) {
    addBox(g, w, h, d, 0x181818, 0, h / 2, 0, { metalness: 0.7, roughness: 0.3 });
    addBox(g, w * 0.88, h * 0.88, 0.005, 0x111111, 0, h / 2, d / 2 + 0.002, { roughness: 0.95 });
    addBox(g, 0.008, h * 0.85, 0.006, 0x00ccff, 0, h / 2, d / 2 + 0.004, { emissive: 0x00aaff, emissiveIntensity: 0.9 });
    addBox(g, 0.004, h * 0.85, d * 0.85, 0x224466, w / 2 + 0.002, h / 2, 0, { emissive: 0x113355, emissiveIntensity: 0.4 });
    return;
  }

  // Stream Deck / Video Switcher
  if (name.includes('switch') || name.includes('stream deck') || name.includes('streamdeck') || name.includes('deck')) {
    addBox(g, w, h, d, 0x1a1a1a, 0, h / 2, 0, { rx: -0.15, metalness: 0.7, roughness: 0.4 });
    const rows = 3, cols = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const kx = -w * 0.36 + (c * w * 0.72) / (cols - 1);
        const kz = -d * 0.3 + (r * d * 0.6) / (rows - 1);
        const keyColor = (r + c) % 3 === 0 ? 0xff4422 : (r + c) % 3 === 1 ? 0x00aaff : 0x00ee66;
        addBox(g, (w * 0.65) / cols, 0.008, (d * 0.5) / rows, keyColor, kx, h + 0.004, kz, {
          emissive: keyColor,
          emissiveIntensity: 0.85,
        });
      }
    }
    return;
  }

  // Generic Monitor / Screen
  addBox(g, w, 0.02, 0.08, 0x222222, 0, 0.01, 0, { metalness: 0.9 });
  addCyl(g, 0.018, 0.018, h * 0.7, 0x222222, 0, (h * 0.7) / 2, 0, 10, { metalness: 0.9 });
  addBox(g, w, h * 0.6, 0.02, 0x181818, 0, h * 0.65, 0, { metalness: 0.8 });
  addBox(g, w * 0.94, h * 0.54, 0.004, 0x224488, 0, h * 0.65, 0.012, { emissive: 0x3366aa, emissiveIntensity: 0.8 });
}

// ============================================================
// 7. POWER & BATTERIES PROCEDURAL BUILDER
// ============================================================
function buildPowerItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x333333;
  const name = (def.name || id).toLowerCase();

  // Portable Power Station
  if (name.includes('station') || name.includes('solar') || name.includes('battery') || name.includes('ups')) {
    addBox(g, w, h, d, col, 0, h / 2, 0, { roughness: 0.6, metalness: 0.3 });
    [-w / 2, w / 2].forEach((bx) => {
      [-d / 2, d / 2].forEach((bz) => {
        addBox(g, 0.04, h * 1.02, 0.04, 0x111111, bx, h / 2, bz, { roughness: 0.9 });
      });
    });
    addBox(g, w * 0.6, 0.03, 0.04, 0x1a1a1a, 0, h + 0.03, 0, { metalness: 0.8 });
    addBox(g, w * 0.45, h * 0.35, 0.004, 0x002244, 0, h * 0.6, d / 2 + 0.002, { emissive: 0x0088dd, emissiveIntensity: 0.9 });
    addBox(g, w * 0.3, h * 0.25, 0.003, 0x222222, -w * 0.25, h * 0.25, d / 2 + 0.002, { roughness: 0.9 });
    addBox(g, w * 0.3, h * 0.25, 0.003, 0x222222, w * 0.25, h * 0.25, d / 2 + 0.002, { roughness: 0.9 });
    return;
  }

  // Power Strip
  if (name.includes('strip') || name.includes('extension') || name.includes('cable')) {
    addBox(g, w, h, d, 0xf0ece1, 0, h / 2, 0, { roughness: 0.7 });
    addBox(g, 0.025, 0.01, 0.04, 0xff2200, -w * 0.38, h + 0.005, 0, { emissive: 0xff1100, emissiveIntensity: 0.9 });
    const numSockets = 6;
    for (let i = 0; i < numSockets; i++) {
      const sx = -w * 0.22 + (i * w * 0.6) / (numSockets - 1);
      addCyl(g, 0.016, 0.016, 0.004, 0x222222, sx, h + 0.002, 0, 12, { roughness: 0.9 });
    }
    addCyl(g, 0.008, 0.008, 0.3, 0x111111, -w / 2 - 0.15, 0.008, 0, 8, { rz: Math.PI / 2, roughness: 0.9 });
    return;
  }

  // Generic Power Fallback
  addBox(g, w, h, d, col, 0, h / 2, 0, { roughness: 0.6, metalness: 0.4 });
  addCyl(g, 0.01, 0.01, 0.005, 0x00ff44, w * 0.3, h * 0.8, d / 2 + 0.002, 8, { rx: Math.PI / 2, emissive: 0x00ff44, emissiveIntensity: 0.9 });
}

// ============================================================
// 8. HUMAN CREATOR SCALE REFERENCE MANNEQUINS
// ============================================================
function buildHumanModel(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const isSeated = id.includes('seated');
  const isGuest = id.includes('guest');
  const skinCol = 0xdfa070;
  const shirtCol = isGuest ? 0x8b3a4a : 0x223348;
  const pantsCol = 0x1a2230;
  const shoeCol = 0x222222;

  if (!isSeated) {
    // Standing Creator Figure
    addBox(g, 0.12, 0.08, 0.26, shoeCol, -0.11, 0.04, 0.03, { roughness: 0.8 });
    addBox(g, 0.12, 0.08, 0.26, shoeCol, 0.11, 0.04, 0.03, { roughness: 0.8 });
    addCyl(g, 0.07, 0.055, 0.82, pantsCol, -0.11, 0.48, 0, 12, { roughness: 0.7 });
    addCyl(g, 0.07, 0.055, 0.82, pantsCol, 0.11, 0.48, 0, 12, { roughness: 0.7 });
    addBox(g, 0.34, 0.16, 0.22, pantsCol, 0, 0.92, 0, { roughness: 0.7 });
    addBox(g, 0.38, 0.48, 0.24, shirtCol, 0, 1.22, 0, { roughness: 0.8 });
    addCyl(g, 0.055, 0.045, 0.58, shirtCol, -0.23, 1.16, 0, 10, { rz: 0.1, roughness: 0.8 });
    addCyl(g, 0.055, 0.045, 0.58, shirtCol, 0.23, 1.16, 0, 10, { rz: -0.1, roughness: 0.8 });
    addBox(g, 0.06, 0.09, 0.06, skinCol, -0.26, 0.84, 0, { roughness: 0.6 });
    addBox(g, 0.06, 0.09, 0.06, skinCol, 0.26, 0.84, 0, 0, { roughness: 0.6 });
    addCyl(g, 0.055, 0.06, 0.09, skinCol, 0, 1.48, 0, 12, { roughness: 0.6 });

    const headMat = makeMat(skinCol, 0.6);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 18), headMat);
    head.scale.set(1, 1.18, 1.05);
    head.position.set(0, 1.62, 0);
    head.castShadow = true;
    g.add(head);

    addCyl(g, 0.045, 0.045, 0.04, 0x111111, -0.12, 1.62, 0, 12, { rz: Math.PI / 2, roughness: 0.4 });
    addCyl(g, 0.045, 0.045, 0.04, 0x111111, 0.12, 1.62, 0, 12, { rz: Math.PI / 2, roughness: 0.4 });
  } else {
    // Seated Creator Figure
    addBox(g, 0.12, 0.08, 0.24, shoeCol, -0.12, 0.04, 0.32, { roughness: 0.8 });
    addBox(g, 0.12, 0.08, 0.24, shoeCol, 0.12, 0.04, 0.32, { roughness: 0.8 });
    addCyl(g, 0.065, 0.055, 0.45, pantsCol, -0.12, 0.24, 0.32, 12, { roughness: 0.7 });
    addCyl(g, 0.065, 0.055, 0.45, pantsCol, 0.12, 0.24, 0.32, 12, { roughness: 0.7 });
    addCyl(g, 0.07, 0.065, 0.42, pantsCol, -0.12, 0.47, 0.16, 12, { rx: Math.PI / 2, roughness: 0.7 });
    addCyl(g, 0.07, 0.065, 0.42, pantsCol, 0.12, 0.47, 0.16, 12, { rx: Math.PI / 2, roughness: 0.7 });
    addBox(g, 0.36, 0.14, 0.26, pantsCol, 0, 0.5, -0.05, { roughness: 0.7 });
    addBox(g, 0.38, 0.46, 0.24, shirtCol, 0, 0.78, -0.05, { roughness: 0.8 });
    addCyl(g, 0.055, 0.045, 0.38, shirtCol, -0.22, 0.75, 0.08, 10, { rx: -0.6, roughness: 0.8 });
    addCyl(g, 0.055, 0.045, 0.38, shirtCol, 0.22, 0.75, 0.08, 10, { rx: -0.6, roughness: 0.8 });
    addCyl(g, 0.055, 0.06, 0.09, skinCol, 0, 1.05, -0.05, 12, { roughness: 0.6 });

    const headMat = makeMat(skinCol, 0.6);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 18), headMat);
    head.scale.set(1, 1.18, 1.05);
    head.position.set(0, 1.2, -0.05);
    head.castShadow = true;
    g.add(head);

    addCyl(g, 0.045, 0.045, 0.04, 0x111111, -0.12, 1.2, -0.05, 12, { rz: Math.PI / 2, roughness: 0.4 });
    addCyl(g, 0.045, 0.045, 0.04, 0x111111, 0.12, 1.2, -0.05, 12, { rz: Math.PI / 2, roughness: 0.4 });
  }
}

// ============================================================
// MAIN PROCEDURAL MODEL DISPATCHER
// ============================================================
export function createDetailedProceduralModel(equipmentId: string): THREE.Group {
  const def = COMPREHENSIVE_EQUIPMENT_CATALOG[equipmentId];
  const g = new THREE.Group();

  if (!def) {
    // If ID is completely unknown, build a realistic flight case box with metal ball corners
    addBox(g, 0.4, 0.35, 0.3, 0x1f1e1d, 0, 0.175, 0, { roughness: 0.7, metalness: 0.3 });
    // Metal ball corners and aluminum extrusions
    [-0.2, 0.2].forEach((x) => {
      [-0.15, 0.15].forEach((z) => {
        addSphere(g, 0.025, 0xcccccc, x, 0.35, z, 10, { metalness: 0.95 });
        addSphere(g, 0.025, 0xcccccc, x, 0.01, z, 10, { metalness: 0.95 });
      });
    });
    return g;
  }

  const cat = def.category;
  const name = (def.name || equipmentId).toLowerCase();

  if (equipmentId.startsWith('human-') || name.includes('human') || name.includes('talent') || name.includes('creator figure')) {
    buildHumanModel(g, def, equipmentId);
  } else if (cat === 'camera' || equipmentId.startsWith('cam-') || name.includes('camera') || name.includes('lens') || name.includes('gimbal') || name.includes('slider') || name.includes('prompter') || name.includes('drone') || name.includes('monitor')) {
    buildCameraItem(g, def, equipmentId);
  } else if (cat === 'lighting' || equipmentId.startsWith('light-') || name.includes('light') || name.includes('softbox') || name.includes('fresnel') || name.includes('tube') || name.includes('panel') || name.includes('spotlight') || name.includes('flag') || name.includes('scrim') || name.includes('haze') || name.includes('fog')) {
    buildLightingItem(g, def, equipmentId);
  } else if (cat === 'audio' || equipmentId.startsWith('audio-') || name.includes('mic') || name.includes('audio') || name.includes('recorder') || name.includes('mixer') || name.includes('speaker') || name.includes('monitor') || name.includes('acoustic') || name.includes('panel')) {
    buildAudioItem(g, def, equipmentId);
  } else if (name.includes('plant') || name.includes('tree') || name.includes('neon') || name.includes('rug') || name.includes('poster') || name.includes('guitar') || name.includes('coffee') || name.includes('book') || name.includes('vinyl') || name.includes('prop')) {
    buildDecorAndPropsItem(g, def, equipmentId);
  } else if (cat === 'furniture' || equipmentId.startsWith('furn-') || name.includes('desk') || name.includes('table') || name.includes('chair') || name.includes('sofa') || name.includes('shelf') || name.includes('backdrop') || name.includes('stand') || name.includes('stool')) {
    buildFurnitureItem(g, def, equipmentId);
  } else if (cat === 'tech' || equipmentId.startsWith('tech-') || name.includes('computer') || name.includes('laptop') || name.includes('stream') || name.includes('switch') || name.includes('synth') || name.includes('keyboard') || name.includes('deck')) {
    buildTechItem(g, def, equipmentId);
  } else if (cat === 'power' || equipmentId.startsWith('pwr-') || name.includes('power') || name.includes('battery') || name.includes('generator') || name.includes('strip')) {
    buildPowerItem(g, def, equipmentId);
  } else {
    buildDecorAndPropsItem(g, def, equipmentId);
  }

  return g;
}
