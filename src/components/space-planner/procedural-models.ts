import * as THREE from 'three';
import type { EquipmentDefinition } from './types';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';

// ============================================================
// Procedural 3D Model Generator for Studio Space Planner
// Ensures EVERY single gear item in the 210+ item catalog
// renders as a rich, authentic, multi-part 3D model (no generic blobs)
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

// ------------------------------------------------------------
// CAMERA & OPTICS PROCEDURAL BUILDER
// ------------------------------------------------------------
function buildCameraItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x222222;
  const name = (def.name || id).toLowerCase();

  // 1. Broadcast / Pedestal camera
  if (name.includes('pedestal') || name.includes('broadcast') || name.includes('studio camera')) {
    // Triangular dolly base with caster wheels
    const baseR = 0.45;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const lx = Math.cos(a) * (baseR / 2);
      const lz = Math.sin(a) * (baseR / 2);
      addBox(g, 0.05, 0.04, baseR, 0x1f1e1d, lx, 0.05, lz, { ry: -a + Math.PI / 2, metalness: 0.8 });
      // Caster wheel
      const wx = Math.cos(a) * baseR;
      const wz = Math.sin(a) * baseR;
      addCyl(g, 0.04, 0.04, 0.03, 0x111111, wx, 0.04, wz, 12, { rz: Math.PI / 2, roughness: 0.9 });
    }
    // Heavy pneumatic center column
    const colH = Math.max(0.8, h - 0.5);
    addCyl(g, 0.07, 0.09, colH, 0x333333, 0, colH / 2 + 0.05, 0, 16, { metalness: 0.8, roughness: 0.3 });
    addCyl(g, 0.06, 0.06, 0.05, 0x222222, 0, colH + 0.04, 0, 16, { metalness: 0.9 });
    // Heavy fluid head
    const headY = colH + 0.1;
    addBox(g, 0.22, 0.12, 0.2, 0x1a1a1a, 0, headY, 0, { metalness: 0.7 });
    // Dual pan handles
    addCyl(g, 0.012, 0.012, 0.45, 0x111111, -0.15, headY - 0.04, -0.2, 10, { rx: 0.5, metalness: 0.6 });
    addCyl(g, 0.012, 0.012, 0.45, 0x111111, 0.15, headY - 0.04, -0.2, 10, { rx: 0.5, metalness: 0.6 });
    // Large broadcast camera body
    const camY = headY + 0.16;
    addBox(g, 0.25, 0.22, 0.38, 0x242424, 0, camY, 0, { roughness: 0.4, metalness: 0.6 });
    // Studio box zoom lens
    addBox(g, 0.2, 0.2, 0.35, 0x181818, 0, camY, 0.35, { roughness: 0.3, metalness: 0.7 });
    addCyl(g, 0.09, 0.09, 0.04, 0x0a1020, 0, camY, 0.54, 20, { rx: Math.PI / 2, roughness: 0.1, metalness: 0.9, emissive: 0x003366, emissiveIntensity: 0.4 });
    // Top 7" Studio prompter / return monitor
    addBox(g, 0.24, 0.16, 0.02, 0x111111, 0, camY + 0.2, 0.05, { metalness: 0.6 });
    addBox(g, 0.22, 0.14, 0.005, 0x224488, 0, camY + 0.2, 0.06, { emissive: 0x3366aa, emissiveIntensity: 0.7 });
    return;
  }

  // 2. Overhead Down-Shooter / Ceiling Rig
  if (name.includes('overhead') || name.includes('down-shooter') || name.includes('gantry')) {
    const frameH = Math.max(1.5, h);
    // Vertical riser stand
    addCyl(g, 0.025, 0.025, frameH, 0x222222, 0, frameH / 2, -d * 0.3, 14, { metalness: 0.8 });
    // Horizontal cantilever cross-arm
    addBox(g, 0.04, 0.04, d * 0.9, 0x1a1a1a, 0, frameH - 0.05, 0, { metalness: 0.8 });
    // Downward motor gimbal & cinema camera
    const armEndY = frameH - 0.15;
    addCyl(g, 0.03, 0.03, 0.08, 0x333333, 0, armEndY, d * 0.25, 14, { metalness: 0.8 });
    addBox(g, 0.18, 0.14, 0.15, col, 0, armEndY - 0.1, d * 0.25, { roughness: 0.5, metalness: 0.5 });
    // Downward lens
    addCyl(g, 0.05, 0.04, 0.12, 0x111111, 0, armEndY - 0.22, d * 0.25, 16, { metalness: 0.9 });
    addCyl(g, 0.038, 0.038, 0.01, 0x00aaff, 0, armEndY - 0.28, d * 0.25, 16, { emissive: 0x0088cc, emissiveIntensity: 0.6 });
    return;
  }

  // 3. Telephoto / Cinema Lens & Rig
  if (name.includes('lens') || name.includes('telephoto') || name.includes('anamorphic') || name.includes('prime')) {
    // Metal lens barrel with ribbed focus rings
    const lenL = Math.max(0.25, d);
    addCyl(g, 0.07, 0.065, lenL * 0.7, 0x222222, 0, h * 0.55, lenL * 0.1, 20, { metalness: 0.85, roughness: 0.25 });
    // Ribbed focus rubber rings
    addCyl(g, 0.073, 0.073, 0.04, 0x111111, 0, h * 0.55, lenL * 0.2, 20, { roughness: 0.95 });
    addCyl(g, 0.073, 0.073, 0.03, 0x111111, 0, h * 0.55, 0, 20, { roughness: 0.95 });
    // Front flared lens element & glass
    addCyl(g, 0.085, 0.07, 0.08, 0x1f1e1d, 0, h * 0.55, lenL * 0.45, 20, { metalness: 0.9 });
    addCyl(g, 0.075, 0.075, 0.01, 0x004488, 0, h * 0.55, lenL * 0.49, 20, { emissive: 0x0066aa, emissiveIntensity: 0.5 });
    // Rear camera body
    addBox(g, 0.15, 0.12, 0.1, 0x222222, 0, h * 0.55, -lenL * 0.35, { roughness: 0.4, metalness: 0.6 });
    // Tripod foot collar
    addBox(g, 0.04, 0.06, 0.08, 0x181818, 0, h * 0.55 - 0.08, lenL * 0.1, { metalness: 0.9 });
    return;
  }

  // 4. Gimbal / Stabilizer
  if (name.includes('gimbal') || name.includes('stabilizer')) {
    // Dual side grip handles
    addCyl(g, 0.016, 0.016, 0.25, 0x111111, -w * 0.4, h * 0.5, 0, 12, { roughness: 0.9 });
    addCyl(g, 0.016, 0.016, 0.25, 0x111111, w * 0.4, h * 0.5, 0, 12, { roughness: 0.9 });
    // Top crossbar
    addCyl(g, 0.014, 0.014, w * 0.8, 0x2a2826, 0, h * 0.6, 0, 12, { rz: Math.PI / 2, metalness: 0.85 });
    // 3-Axis Motor hubs & center camera cage
    addCyl(g, 0.035, 0.035, 0.05, 0x1a1a1a, 0, h * 0.45, 0, 16, { metalness: 0.9 });
    addBox(g, 0.14, 0.1, 0.12, 0x222222, 0, h * 0.45, 0.04, { roughness: 0.4, metalness: 0.5 });
    addCyl(g, 0.035, 0.03, 0.06, 0x111111, 0, h * 0.45, 0.12, 16, { rx: Math.PI / 2, metalness: 0.8 });
    return;
  }

  // 5. Field Monitor / Viewfinder / Wireless Unit
  if (name.includes('monitor') || name.includes('viewfinder') || name.includes('timecode') || name.includes('handwheel') || name.includes('wireless')) {
    // Thin monitor body
    addBox(g, w, h, Math.min(0.04, d), 0x181818, 0, h / 2, 0, { metalness: 0.8, roughness: 0.3 });
    // Glowing active display screen
    addBox(g, w * 0.92, h * 0.88, 0.004, 0x1a3355, 0, h / 2, 0.02, { emissive: 0x225588, emissiveIntensity: 0.8 });
    // Sun hood canopy
    addBox(g, w, 0.01, d * 0.6, 0x111111, 0, h, d * 0.25, { roughness: 0.9 });
    addBox(g, 0.01, h, d * 0.6, 0x111111, -w / 2, h / 2, d * 0.25, { roughness: 0.9 });
    addBox(g, 0.01, h, d * 0.6, 0x111111, w / 2, h / 2, d * 0.25, { roughness: 0.9 });
    // Rear dual NP-F battery
    addBox(g, w * 0.3, h * 0.5, 0.03, 0x2a2826, 0, h / 2, -0.03, { roughness: 0.7 });
    return;
  }

  // 6. Camera Slider / Dolly
  if (name.includes('slider') || name.includes('dolly') || name.includes('rail')) {
    const railL = Math.max(0.5, d);
    // Dual precision carbon rails
    addCyl(g, 0.012, 0.012, railL, 0x111111, -0.06, 0.04, 0, 12, { rx: Math.PI / 2, roughness: 0.3, metalness: 0.9 });
    addCyl(g, 0.012, 0.012, railL, 0x111111, 0.06, 0.04, 0, 12, { rx: Math.PI / 2, roughness: 0.3, metalness: 0.9 });
    // End blocks with leveling feet
    [-railL / 2, railL / 2].forEach((ez) => {
      addBox(g, 0.16, 0.03, 0.04, 0x222222, 0, 0.04, ez, { metalness: 0.8 });
      addCyl(g, 0.015, 0.015, 0.03, 0x111111, -0.07, 0.015, ez, 10, { roughness: 0.9 });
      addCyl(g, 0.015, 0.015, 0.03, 0x111111, 0.07, 0.015, ez, 10, { roughness: 0.9 });
    });
    // Center carriage sled plate & mini fluid head
    addBox(g, 0.14, 0.02, 0.12, 0x2a2826, 0, 0.06, 0, { metalness: 0.85 });
    addCyl(g, 0.03, 0.03, 0.06, 0x181818, 0, 0.1, 0, 16, { metalness: 0.8 });
    return;
  }

  // 7. Generic Full-Rig Camera on Tripod (default camera fallback)
  const standH = Math.max(1.0, h - 0.4);
  // Tripod legs
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const lx = Math.cos(a) * 0.28;
    const lz = Math.sin(a) * 0.28;
    addCyl(g, 0.015, 0.01, standH, 0x282624, lx / 2, standH / 2, lz / 2, 10, { rx: (Math.sin(a) * 0.28) / standH, rz: (-Math.cos(a) * 0.28) / standH, metalness: 0.8 });
  }
  // Center column & fluid head
  addCyl(g, 0.022, 0.022, standH * 0.4, 0x1f1e1d, 0, standH * 0.8, 0, 12, { metalness: 0.9 });
  addBox(g, 0.14, 0.08, 0.12, 0x181818, 0, standH + 0.04, 0, { metalness: 0.8 });
  // Camera body
  const camY = standH + 0.14;
  addBox(g, 0.18, 0.14, 0.2, col, 0, camY, 0, { roughness: 0.4, metalness: 0.6 });
  // Lens with focus ring
  addCyl(g, 0.045, 0.042, 0.14, 0x111111, 0, camY, 0.17, 18, { rx: Math.PI / 2, metalness: 0.85, roughness: 0.2 });
  addCyl(g, 0.038, 0.038, 0.01, 0x0055aa, 0, camY, 0.24, 18, { rx: Math.PI / 2, emissive: 0x004488, emissiveIntensity: 0.6 });
  // Top handle
  addBox(g, 0.03, 0.02, 0.15, 0x1a1a1a, 0, camY + 0.1, 0, { metalness: 0.8 });
}

// ------------------------------------------------------------
// LIGHTING & MODIFIERS PROCEDURAL BUILDER
// ------------------------------------------------------------
function buildLightingItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0xf5f1ea;
  const name = (def.name || id).toLowerCase();

  // 1. Softbox / Octabox / Lantern / Parabolic Dome
  if (name.includes('softbox') || name.includes('octa') || name.includes('lantern') || name.includes('umbrella') || name.includes('dome')) {
    const standH = Math.max(1.1, h - 0.45);
    // Light stand tripod base & riser
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addCyl(g, 0.014, 0.01, 0.55, 0x1f1e1d, Math.cos(a) * 0.22, 0.25, Math.sin(a) * 0.22, 10, { metalness: 0.8 });
    }
    addCyl(g, 0.018, 0.022, standH, 0x1f1e1d, 0, standH / 2, 0, 12, { metalness: 0.85 });
    // Light head housing
    const headY = standH + 0.1;
    addBox(g, 0.16, 0.16, 0.18, 0x181818, 0, headY, -0.08, { metalness: 0.7 });
    // Tapered softbox hood (octagonal or rectangular)
    const sbW = Math.max(0.45, w);
    const sbH = Math.max(0.45, Math.min(0.8, h * 0.5));
    // Softbox outer shell
    addBox(g, sbW, sbH, 0.28, 0x111111, 0, headY, 0.12, { roughness: 0.95 });
    // Front glowing diffusion face with soft white emissive
    addBox(g, sbW * 0.96, sbH * 0.96, 0.01, 0xffffff, 0, headY, 0.26, {
      emissive: 0xfff8ee,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
    return;
  }

  // 2. Fresnel Spotlight / Par / Projector with Barn Doors
  if (name.includes('fresnel') || name.includes('spotlight') || name.includes('beam') || name.includes('par') || name.includes('barndoor')) {
    const standH = Math.max(1.1, h - 0.35);
    // C-stand riser
    addCyl(g, 0.02, 0.02, standH, 0x333333, 0, standH / 2, 0, 14, { metalness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addBox(g, 0.025, 0.025, 0.35, 0x333333, Math.cos(a) * 0.18, 0.03 + i * 0.015, Math.sin(a) * 0.18, { ry: -a + Math.PI / 2, metalness: 0.9 });
    }
    // U-yoke bracket
    const headY = standH + 0.15;
    addBox(g, 0.24, 0.02, 0.04, 0x222222, 0, headY - 0.08, 0, { metalness: 0.8 });
    addBox(g, 0.02, 0.16, 0.04, 0x222222, -0.12, headY, 0, { metalness: 0.8 });
    addBox(g, 0.02, 0.16, 0.04, 0x222222, 0.12, headY, 0, { metalness: 0.8 });
    // Ribbed cylindrical spotlight housing
    addCyl(g, 0.09, 0.09, 0.24, 0x1f1e1d, 0, headY, 0, 18, { rx: Math.PI / 2, metalness: 0.7, roughness: 0.3 });
    // Stepped Fresnel glass lens with warm glowing emissive core
    addCyl(g, 0.082, 0.082, 0.02, 0xfff0cc, 0, headY, 0.12, 20, { rx: Math.PI / 2, emissive: 0xffd988, emissiveIntensity: 1.0 });
    // 4 Barn Door Flaps
    const doorW = 0.18, doorH = 0.1;
    addBox(g, doorW, doorH, 0.005, 0x111111, 0, headY + 0.1, 0.18, { rx: -0.4, roughness: 0.8 });
    addBox(g, doorW, doorH, 0.005, 0x111111, 0, headY - 0.1, 0.18, { rx: 0.4, roughness: 0.8 });
    addBox(g, doorH, doorW, 0.005, 0x111111, -0.1, headY, 0.18, { ry: 0.4, roughness: 0.8 });
    addBox(g, doorH, doorW, 0.005, 0x111111, 0.1, headY, 0.18, { ry: -0.4, roughness: 0.8 });
    return;
  }

  // 3. LED RGB Tube / Wand / Pixel Bar
  if (name.includes('tube') || name.includes('wand') || name.includes('pixel') || name.includes('bar')) {
    const tubeH = Math.max(0.6, h);
    // Frosted glowing tube
    addCyl(g, 0.025, 0.025, tubeH * 0.85, col, 0, tubeH / 2, 0, 18, {
      emissive: col,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    // Aluminum end caps with bumpers
    addCyl(g, 0.028, 0.028, 0.04, 0x222222, 0, tubeH * 0.05, 0, 16, { metalness: 0.9 });
    addCyl(g, 0.028, 0.028, 0.04, 0x222222, 0, tubeH * 0.95, 0, 16, { metalness: 0.9 });
    // Mini folding desk tripod feet
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addCyl(g, 0.006, 0.006, 0.14, 0x181818, Math.cos(a) * 0.06, 0.04, Math.sin(a) * 0.06, 8, { metalness: 0.8 });
    }
    return;
  }

  // 4. LED Panel / Bi-Color Mat
  if (name.includes('panel') || name.includes('mat') || name.includes('led')) {
    const standH = Math.max(1.1, h - 0.3);
    addCyl(g, 0.016, 0.016, standH, 0x222222, 0, standH / 2, 0, 12, { metalness: 0.85 });
    // Panel chassis with rear heatsink cooling fins
    const pW = Math.max(0.3, w);
    const pH = Math.max(0.25, h * 0.35);
    const headY = standH + pH / 2 + 0.05;
    addBox(g, pW, pH, 0.035, 0x1f1e1d, 0, headY, 0, { metalness: 0.7 });
    // Front illuminated diffusion face
    addBox(g, pW * 0.94, pH * 0.92, 0.006, 0xffeedd, 0, headY, 0.02, {
      emissive: 0xffe8c8,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    // U-yoke bracket
    addBox(g, pW + 0.04, 0.015, 0.02, 0x2a2826, 0, headY - pH / 2 - 0.02, 0, { metalness: 0.8 });
    return;
  }

  // 5. Light Cutter Flag / Scrim / Floppy
  if (name.includes('flag') || name.includes('scrim') || name.includes('cutter') || name.includes('floppy') || name.includes('reflector')) {
    const riserH = Math.max(1.2, h - 0.4);
    // C-Stand base & riser
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      addBox(g, 0.025, 0.025, 0.38, 0x333333, Math.cos(a) * 0.18, 0.03 + i * 0.015, Math.sin(a) * 0.18, { ry: -a + Math.PI / 2, metalness: 0.9 });
    }
    addCyl(g, 0.02, 0.02, riserH, 0x333333, 0, riserH / 2, 0, 12, { metalness: 0.9 });
    // 2.5" Grip head knuckle & extension grip arm
    addCyl(g, 0.04, 0.04, 0.06, 0x1a1a1a, 0, riserH, 0, 12, { metalness: 0.7 });
    addCyl(g, 0.012, 0.012, 0.6, 0x333333, 0.25, riserH + 0.05, 0, 10, { rz: Math.PI / 2, metalness: 0.9 });
    // Wire frame & duvetyne fabric / silk screen
    const fW = Math.max(0.6, w);
    const fH = Math.max(0.5, h * 0.4);
    const fX = 0.45, fY = riserH + 0.05;
    addBox(g, fW, fH, 0.005, col, fX, fY, 0, { roughness: 0.95 });
    addBox(g, fW, 0.01, 0.01, 0x222222, fX, fY + fH / 2, 0, { metalness: 0.85 });
    addBox(g, fW, 0.01, 0.01, 0x222222, fX, fY - fH / 2, 0, { metalness: 0.85 });
    return;
  }

  // 6. Generic Lighting Fallback
  const standH = Math.max(1.0, h - 0.3);
  addCyl(g, 0.018, 0.018, standH, 0x222222, 0, standH / 2, 0, 12, { metalness: 0.8 });
  addBox(g, w, h * 0.3, d, 0x1f1e1d, 0, standH + (h * 0.3) / 2, 0, { metalness: 0.7 });
  addBox(g, w * 0.9, h * 0.26, 0.01, 0xffeedd, 0, standH + (h * 0.3) / 2, d / 2 + 0.005, { emissive: 0xffe0b0, emissiveIntensity: 0.8 });
}

// ------------------------------------------------------------
// AUDIO & ACOUSTICS PROCEDURAL BUILDER
// ------------------------------------------------------------
function buildAudioItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x2a2826;
  const name = (def.name || id).toLowerCase();

  // 1. Broadcast / Podcast Microphone (SM7B style) on Arm
  if (name.includes('podcast') || name.includes('broadcast mic') || name.includes('dynamic mic')) {
    // Scissor arm base clamp
    addBox(g, 0.06, 0.08, 0.06, 0x181818, 0, 0.04, 0, { metalness: 0.9 });
    // Dual articulation arms
    addCyl(g, 0.008, 0.008, 0.35, 0x222222, -0.05, 0.22, 0, 8, { rz: 0.3, metalness: 0.85 });
    addCyl(g, 0.008, 0.008, 0.35, 0x222222, 0.05, 0.22, 0, 8, { rz: -0.3, metalness: 0.85 });
    // U-yoke mount
    const micY = Math.max(0.35, h * 0.7);
    addBox(g, 0.12, 0.06, 0.03, 0x181818, 0, micY, 0, { metalness: 0.8 });
    // Microphone body & black foam windscreen
    addCyl(g, 0.026, 0.026, 0.14, 0x111111, 0, micY + 0.06, 0.04, 16, { rx: 0.5, roughness: 0.95 });
    addCyl(g, 0.022, 0.022, 0.06, 0x242424, 0, micY + 0.01, -0.02, 14, { rx: 0.5, metalness: 0.7 });
    return;
  }

  // 2. Studio Condenser Mic with Shockmount & Pop Filter
  if (name.includes('condenser') || name.includes('vocal mic') || name.includes('studio mic')) {
    // Circular heavy desk base & riser
    addCyl(g, 0.07, 0.07, 0.02, 0x111111, 0, 0.01, 0, 18, { metalness: 0.9 });
    addCyl(g, 0.012, 0.012, h * 0.6, 0x222222, 0, (h * 0.6) / 2, 0, 10, { metalness: 0.85 });
    const micY = h * 0.6 + 0.06;
    // Spider shockmount outer ring
    addCyl(g, 0.055, 0.055, 0.04, 0x1a1a1a, 0, micY, 0, 16, { metalness: 0.8 });
    // Metal condenser mic body (Champagne/Silver)
    addCyl(g, 0.024, 0.024, 0.12, 0x333333, 0, micY, 0, 16, { metalness: 0.85, roughness: 0.2 });
    // Metallic mesh grille on top
    addCyl(g, 0.023, 0.023, 0.06, 0xaaaaaa, 0, micY + 0.07, 0, 16, { metalness: 0.95, roughness: 0.1 });
    // Pop filter hoop in front
    addCyl(g, 0.06, 0.06, 0.005, 0x111111, 0, micY + 0.05, 0.08, 20, { rx: Math.PI / 2, roughness: 0.9 });
    return;
  }

  // 3. Audio Console / Mixer / Controller / Audio Interface
  if (name.includes('mixer') || name.includes('interface') || name.includes('console') || name.includes('recorder') || name.includes('preamp')) {
    // Angled tabletop console chassis
    const cW = Math.max(0.25, w);
    const cD = Math.max(0.2, d);
    const cH = Math.max(0.04, h);
    addBox(g, cW, cH, cD, 0x1f1e1d, 0, cH / 2, 0, { rx: -0.1, roughness: 0.4, metalness: 0.6 });
    // Channel fader slots & color-coded fader knobs
    const numFaders = Math.max(4, Math.floor(cW / 0.05));
    for (let i = 0; i < numFaders; i++) {
      const fx = -cW * 0.4 + (i * cW * 0.8) / (numFaders - 1);
      // Fader groove
      addBox(g, 0.006, 0.002, cD * 0.4, 0x0a0a0a, fx, cH + 0.002, 0.02, { roughness: 0.9 });
      // Tactile fader knob
      addBox(g, 0.016, 0.012, 0.02, i === 0 ? 0xcc3333 : 0xdddddd, fx, cH + 0.008, 0.01, { roughness: 0.6 });
      // Rotary EQ knobs (High, Mid, Low)
      addCyl(g, 0.006, 0.006, 0.01, 0x2288cc, fx, cH + 0.007, -cD * 0.22, 10);
      addCyl(g, 0.006, 0.006, 0.01, 0x33aa44, fx, cH + 0.007, -cD * 0.3, 10);
    }
    // Dual stereo LED VU meters
    addBox(g, 0.02, 0.004, cD * 0.35, 0x00ff44, cW * 0.42, cH + 0.002, -0.05, { emissive: 0x00cc33, emissiveIntensity: 0.8 });
    return;
  }

  // 4. Studio Monitor / Speaker / Subwoofer
  if (name.includes('monitor') || name.includes('speaker') || name.includes('subwoofer') || name.includes('sound')) {
    // Solid MDF speaker cabinet
    addBox(g, w, h, d, 0x181818, 0, h / 2, 0, { roughness: 0.7, metalness: 0.2 });
    // Woofer cone with center dust cap
    const wooferR = Math.min(w * 0.38, h * 0.28);
    const wooferY = h * 0.38;
    addCyl(g, wooferR, wooferR * 0.85, 0.015, 0xffaa00, 0, wooferY, d / 2 + 0.005, 20, { rx: Math.PI / 2, roughness: 0.5 });
    addSphere(g, wooferR * 0.32, 0x111111, 0, wooferY, d / 2 + 0.015, 14, { roughness: 0.3 });
    // Silk dome tweeter
    const tweetR = wooferR * 0.42;
    const tweetY = h * 0.75;
    addCyl(g, tweetR * 1.3, tweetR * 1.3, 0.008, 0x222222, 0, tweetY, d / 2 + 0.004, 16, { rx: Math.PI / 2 });
    addSphere(g, tweetR * 0.7, 0x111111, 0, tweetY, d / 2 + 0.008, 14, { metalness: 0.6 });
    // Bass reflex port tube
    addCyl(g, wooferR * 0.28, wooferR * 0.28, 0.02, 0x0a0a0a, 0, h * 0.12, d / 2 + 0.005, 14, { rx: Math.PI / 2 });
    return;
  }

  // 5. Acoustic Panel / Sound Diffuser / Bass Trap
  if (name.includes('acoustic') || name.includes('diffuser') || name.includes('bass trap') || name.includes('foam')) {
    // Outer beveled frame
    addBox(g, w, h, d, 0x2a2826, 0, h / 2, 0, { roughness: 0.8 });
    // 3D wedge relief acoustic foam pattern
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

  // 6. Generic Audio Fallback (Mic on stand)
  addCyl(g, 0.08, 0.08, 0.02, 0x111111, 0, 0.01, 0, 16, { metalness: 0.9 });
  addCyl(g, 0.012, 0.012, h * 0.8, 0x222222, 0, (h * 0.8) / 2, 0, 10, { metalness: 0.85 });
  addCyl(g, 0.025, 0.025, 0.12, col, 0, h * 0.8 + 0.06, 0, 16, { metalness: 0.8 });
}

// ------------------------------------------------------------
// FURNITURE & STAGING PROCEDURAL BUILDER
// ------------------------------------------------------------
function buildFurnitureItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x3a3836;
  const name = (def.name || id).toLowerCase();

  // 1. Desks, Workstations & Tables
  if (name.includes('desk') || name.includes('table') || name.includes('workstation')) {
    const topThick = 0.04;
    // Beveled wooden / matte laminate desktop slab
    addBox(g, w, topThick, d, col, 0, h - topThick / 2, 0, { roughness: 0.5, metalness: 0.1 });
    // Dual motorized heavy steel T-legs or 4 wooden legs
    if (w > 1.0) {
      // Modern dual T-leg standing desk frame
      [-w * 0.42, w * 0.42].forEach((lx) => {
        // Vertical motorized telescoping column
        addBox(g, 0.08, h - topThick, 0.06, 0x1f1e1d, lx, (h - topThick) / 2, 0, { metalness: 0.85 });
        // Wide foot stabilizer on floor
        addBox(g, 0.08, 0.03, d * 0.8, 0x1f1e1d, lx, 0.015, 0, { metalness: 0.85 });
        // Top support bracket
        addBox(g, 0.06, 0.03, d * 0.7, 0x1f1e1d, lx, h - topThick - 0.015, 0, { metalness: 0.85 });
      });
      // Crossbar support & cable raceway
      addBox(g, w * 0.8, 0.04, 0.04, 0x1f1e1d, 0, h * 0.7, 0, { metalness: 0.85 });
    } else {
      // 4-Leg sturdy table
      [-w * 0.42, w * 0.42].forEach((lx) => {
        [-d * 0.42, d * 0.42].forEach((lz) => {
          addCyl(g, 0.025, 0.02, h - topThick, 0x1f1e1d, lx, (h - topThick) / 2, lz, 10, { metalness: 0.8 });
        });
      });
    }
    return;
  }

  // 2. Chairs, Gaming Chairs & Ergonomic Seating
  if (name.includes('chair') || name.includes('seating')) {
    // 5-Star wheeled base with 5 casters
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const lx = Math.cos(a) * 0.25;
      const lz = Math.sin(a) * 0.25;
      addBox(g, 0.04, 0.025, 0.26, 0x181818, lx / 2, 0.06, lz / 2, { ry: -a + Math.PI / 2, metalness: 0.8 });
      addCyl(g, 0.025, 0.025, 0.03, 0x111111, lx, 0.03, lz, 10, { rz: Math.PI / 2, roughness: 0.9 });
    }
    // Gas lift cylinder
    const seatY = Math.max(0.42, h * 0.45);
    addCyl(g, 0.028, 0.032, seatY - 0.06, 0x333333, 0, (seatY + 0.06) / 2, 0, 14, { metalness: 0.95 });
    // Contoured seat cushion
    addBox(g, w * 0.85, 0.08, d * 0.85, col, 0, seatY, 0, { roughness: 0.8 });
    // Ergonomic curved backrest
    const backH = h - seatY;
    addBox(g, w * 0.78, backH * 0.85, 0.05, col, 0, seatY + backH * 0.45, -d * 0.35, { rx: 0.1, roughness: 0.8 });
    // 3D adjustable armrests
    [-w * 0.42, w * 0.42].forEach((ax) => {
      addCyl(g, 0.015, 0.015, 0.18, 0x222222, ax, seatY + 0.09, 0, 10, { metalness: 0.8 });
      addBox(g, 0.08, 0.025, 0.22, 0x111111, ax, seatY + 0.18, 0, { roughness: 0.9 });
    });
    return;
  }

  // 3. Stools / Barstools
  if (name.includes('stool')) {
    // Tall frame with ring footrest
    const sH = Math.max(0.65, h);
    addCyl(g, 0.03, 0.03, sH - 0.08, 0x222222, 0, (sH - 0.08) / 2, 0, 14, { metalness: 0.9 });
    addCyl(g, 0.22, 0.22, 0.02, 0x222222, 0, 0.01, 0, 18, { metalness: 0.9 });
    addCyl(g, 0.16, 0.16, 0.015, 0x333333, 0, sH * 0.35, 0, 18, { metalness: 0.9 });
    // Padded cushion seat
    addCyl(g, w * 0.45, w * 0.45, 0.08, col, 0, sH - 0.04, 0, 20, { roughness: 0.8 });
    return;
  }

  // 4. Sofa / Couch / Lounge Armchair
  if (name.includes('sofa') || name.includes('couch') || name.includes('lounge')) {
    const seatH = 0.42;
    // Base platform & short wooden legs
    addBox(g, w, 0.15, d, col, 0, 0.18, 0, { roughness: 0.9 });
    [-w * 0.44, w * 0.44].forEach((lx) => {
      [-d * 0.44, d * 0.44].forEach((lz) => {
        addCyl(g, 0.03, 0.02, 0.1, 0x553311, lx, 0.05, lz, 10, { roughness: 0.6 });
      });
    });
    // Deep plush seat cushions
    addBox(g, w * 0.88, 0.14, d * 0.75, col, 0, seatH, d * 0.05, { roughness: 0.95 });
    // Backrest with tufting
    addBox(g, w, h - seatH, 0.22, col, 0, seatH + (h - seatH) / 2, -d * 0.38, { roughness: 0.95 });
    // Dual armrests
    [-w / 2 + 0.1, w / 2 - 0.1].forEach((ax) => {
      addBox(g, 0.18, 0.28, d, col, ax, 0.38, 0, { roughness: 0.95 });
    });
    return;
  }

  // 5. Shelving Units, Credenzas & Gear Racks
  if (name.includes('shelf') || name.includes('rack') || name.includes('credenza') || name.includes('cabinet')) {
    // 4 Corner upright steel posts
    [-w / 2 + 0.02, w / 2 - 0.02].forEach((px) => {
      [-d / 2 + 0.02, d / 2 - 0.02].forEach((pz) => {
        addBox(g, 0.03, h, 0.03, 0x1f1e1d, px, h / 2, pz, { metalness: 0.85 });
      });
    });
    // 4 Horizontal shelf tiers holding studio gear
    const numShelves = 4;
    for (let i = 0; i < numShelves; i++) {
      const sy = 0.08 + (i * (h - 0.12)) / (numShelves - 1);
      addBox(g, w - 0.02, 0.02, d - 0.02, col, 0, sy, 0, { roughness: 0.6 });
      if (i < numShelves - 1) {
        // Gear prop boxes / items on shelf
        addBox(g, 0.18, 0.12, 0.14, 0x333333, -w * 0.25, sy + 0.07, 0, { roughness: 0.7 });
        addBox(g, 0.22, 0.15, 0.16, 0x554433, w * 0.22, sy + 0.085, 0, { roughness: 0.8 });
      }
    }
    return;
  }

  // 6. Seamless Backdrop / Green Screen / Cyclorama
  if (name.includes('backdrop') || name.includes('green-screen') || name.includes('seamless') || name.includes('cyclorama')) {
    // Dual vertical backdrop support stands
    [-w / 2 + 0.05, w / 2 - 0.05].forEach((sx) => {
      addCyl(g, 0.02, 0.02, h, 0x222222, sx, h / 2, -d * 0.4, 12, { metalness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        addCyl(g, 0.012, 0.008, 0.45, 0x1f1e1d, sx + Math.cos(a) * 0.18, 0.2, -d * 0.4 + Math.sin(a) * 0.18, 8, { metalness: 0.8 });
      }
    });
    // Top crossbar roller tube
    addCyl(g, 0.025, 0.025, w, 0x333333, 0, h - 0.04, -d * 0.4, 16, { rz: Math.PI / 2, metalness: 0.9 });
    // Hanging seamless sweep curving down to floor
    const sweepColor = name.includes('green') ? 0x00cc44 : col;
    addBox(g, w * 0.94, h * 0.95, 0.005, sweepColor, 0, h * 0.48, -d * 0.4, { roughness: 0.98 });
    addBox(g, w * 0.94, 0.005, d * 0.8, sweepColor, 0, 0.003, 0, { roughness: 0.98 });
    return;
  }

  // 7. Generic Furniture Fallback (Product display plinth)
  addBox(g, w, h, d, col, 0, h / 2, 0, { roughness: 0.6, metalness: 0.1 });
  addBox(g, w * 1.04, 0.02, d * 1.04, 0x1f1e1d, 0, h, 0, { metalness: 0.8 });
}

// ------------------------------------------------------------
// TECH & COMPUTING PROCEDURAL BUILDER
// ------------------------------------------------------------
function buildTechItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x1f1e1d;
  const name = (def.name || id).toLowerCase();

  // 1. Laptop / Mac / Computer
  if (name.includes('laptop') || name.includes('macbook')) {
    const baseH = 0.015;
    // Lower keyboard chassis & trackpad
    addBox(g, w, baseH, d * 0.65, 0xd0d0d0, 0, baseH / 2, 0, { metalness: 0.9, roughness: 0.2 });
    addBox(g, w * 0.85, 0.002, d * 0.35, 0x111111, 0, baseH + 0.001, -d * 0.08, { roughness: 0.8 });
    addBox(g, w * 0.35, 0.001, d * 0.18, 0xb0b0b0, 0, baseH + 0.001, d * 0.2, { metalness: 0.5 });
    // Angled screen display
    const screenH = d * 0.6;
    addBox(g, w, screenH, 0.008, 0xd0d0d0, 0, baseH + screenH / 2, -d * 0.32, { rx: -0.25, metalness: 0.9 });
    addBox(g, w * 0.92, screenH * 0.88, 0.002, 0x113355, 0, baseH + screenH / 2, -d * 0.31, { rx: -0.25, emissive: 0x224477, emissiveIntensity: 0.8 });
    return;
  }

  // 2. High-Performance Tower PC / Server
  if (name.includes('pc') || name.includes('tower') || name.includes('server') || name.includes('workstation')) {
    addBox(g, w, h, d, 0x181818, 0, h / 2, 0, { metalness: 0.7, roughness: 0.3 });
    // Front intake mesh grille & RGB strip
    addBox(g, w * 0.88, h * 0.88, 0.005, 0x111111, 0, h / 2, d / 2 + 0.002, { roughness: 0.95 });
    addBox(g, 0.008, h * 0.85, 0.006, 0x00ccff, 0, h / 2, d / 2 + 0.004, { emissive: 0x00aaff, emissiveIntensity: 0.9 });
    // Tempered glass side panel with internal glowing hardware
    addBox(g, 0.004, h * 0.85, d * 0.85, 0x224466, w / 2 + 0.002, h / 2, 0, { emissive: 0x113355, emissiveIntensity: 0.4 });
    return;
  }

  // 3. Switchers, Stream Decks & Control Surfaces
  if (name.includes('switch') || name.includes('stream deck') || name.includes('streamdeck') || name.includes('deck')) {
    addBox(g, w, h, d, 0x1a1a1a, 0, h / 2, 0, { rx: -0.15, metalness: 0.7, roughness: 0.4 });
    // Grid of illuminated silicone LCD keys
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
    // Video transition T-Bar lever
    if (w > 0.3) {
      addCyl(g, 0.008, 0.008, 0.05, 0xdddddd, w * 0.35, h + 0.025, 0, 10, { metalness: 0.95 });
      addCyl(g, 0.018, 0.018, 0.06, 0x222222, w * 0.35, h + 0.05, 0, 10, { rx: Math.PI / 2, metalness: 0.8 });
    }
    return;
  }

  // 4. Keyboard Synthesizer / Piano
  if (name.includes('keyboard') || name.includes('synth') || name.includes('piano')) {
    // Housing enclosure
    addBox(g, w, h, d, 0x1f1e1d, 0, h / 2, 0, { roughness: 0.4, metalness: 0.6 });
    // White piano keys bed
    const numKeys = 24;
    for (let i = 0; i < numKeys; i++) {
      const kx = -w * 0.42 + (i * w * 0.84) / (numKeys - 1);
      addBox(g, (w * 0.8) / numKeys, 0.01, d * 0.45, 0xffffff, kx, h + 0.005, d * 0.2, { roughness: 0.2 });
      // Black accidentals
      if (i % 7 !== 2 && i % 7 !== 6) {
        addBox(g, (w * 0.5) / numKeys, 0.016, d * 0.28, 0x111111, kx + (w * 0.4) / numKeys, h + 0.012, d * 0.12, { roughness: 0.3 });
      }
    }
    // Top control panel & pitch/mod wheels
    addBox(g, w * 0.3, 0.004, d * 0.2, 0x0088cc, 0, h + 0.003, -d * 0.25, { emissive: 0x0066aa, emissiveIntensity: 0.7 });
    addCyl(g, 0.025, 0.025, 0.015, 0x222222, -w * 0.44, h + 0.01, -d * 0.2, 14, { rx: Math.PI / 2, metalness: 0.8 });
    return;
  }

  // 5. Generic Tech Fallback (Multi-monitor desk setup)
  addBox(g, w, 0.02, 0.08, 0x222222, 0, 0.01, 0, { metalness: 0.9 });
  addCyl(g, 0.018, 0.018, h * 0.7, 0x222222, 0, (h * 0.7) / 2, 0, 10, { metalness: 0.9 });
  addBox(g, w, h * 0.6, 0.02, 0x181818, 0, h * 0.65, 0, { metalness: 0.8 });
  addBox(g, w * 0.94, h * 0.54, 0.004, 0x224488, 0, h * 0.65, 0.012, { emissive: 0x3366aa, emissiveIntensity: 0.8 });
}

// ------------------------------------------------------------
// POWER, BATTERIES & UTILITIES PROCEDURAL BUILDER
// ------------------------------------------------------------
function buildPowerItem(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const { width: w, depth: d, height: h } = def.dimensions;
  const col = def.color || 0x333333;
  const name = (def.name || id).toLowerCase();

  // 1. Portable Power Station (Jackery / EcoFlow style)
  if (name.includes('station') || name.includes('solar') || name.includes('battery') || name.includes('ups')) {
    // Rugged chassis with corner bumpers
    addBox(g, w, h, d, col, 0, h / 2, 0, { roughness: 0.6, metalness: 0.3 });
    [-w / 2, w / 2].forEach((bx) => {
      [-d / 2, d / 2].forEach((bz) => {
        addBox(g, 0.04, h * 1.02, 0.04, 0x111111, bx, h / 2, bz, { roughness: 0.9 });
      });
    });
    // Top integrated carry handles
    addBox(g, w * 0.6, 0.03, 0.04, 0x1a1a1a, 0, h + 0.03, 0, { metalness: 0.8 });
    // Front smart color LCD display showing Watts in/out
    addBox(g, w * 0.45, h * 0.35, 0.004, 0x002244, 0, h * 0.6, d / 2 + 0.002, { emissive: 0x0088dd, emissiveIntensity: 0.9 });
    // AC & USB Outlet ports on front face
    addBox(g, w * 0.3, h * 0.25, 0.003, 0x222222, -w * 0.25, h * 0.25, d / 2 + 0.002, { roughness: 0.9 });
    addBox(g, w * 0.3, h * 0.25, 0.003, 0x222222, w * 0.25, h * 0.25, d / 2 + 0.002, { roughness: 0.9 });
    return;
  }

  // 2. Inverter Generator with Roll Cage
  if (name.includes('generator') || name.includes('petrol') || name.includes('fuel')) {
    // Tubular steel perimeter roll cage
    [-w / 2 + 0.02, w / 2 - 0.02].forEach((cx) => {
      [-d / 2 + 0.02, d / 2 - 0.02].forEach((cz) => {
        addCyl(g, 0.015, 0.015, h, 0xcc2200, cx, h / 2, cz, 10, { metalness: 0.85 });
      });
    });
    // Engine block inside cage
    addBox(g, w * 0.8, h * 0.65, d * 0.75, 0x282624, 0, h * 0.4, 0, { roughness: 0.6, metalness: 0.7 });
    // Fuel tank with chrome cap on top
    addBox(g, w * 0.85, 0.1, d * 0.8, 0xcc2200, 0, h - 0.05, 0, { roughness: 0.4, metalness: 0.4 });
    addCyl(g, 0.035, 0.035, 0.025, 0xeeeeee, 0, h + 0.01, 0, 14, { metalness: 0.95 });
    // All-terrain transport wheels
    [-w * 0.45, w * 0.45].forEach((wx) => {
      addCyl(g, 0.06, 0.06, 0.04, 0x111111, wx, 0.06, -d * 0.4, 14, { rx: Math.PI / 2, roughness: 0.95 });
    });
    return;
  }

  // 3. Power Strip / Multi-plug Extension
  if (name.includes('strip') || name.includes('extension') || name.includes('cable')) {
    addBox(g, w, h, d, 0xf0ece1, 0, h / 2, 0, { roughness: 0.7 });
    // Illuminated red power rocker switch
    addBox(g, 0.025, 0.01, 0.04, 0xff2200, -w * 0.38, h + 0.005, 0, { emissive: 0xff1100, emissiveIntensity: 0.9 });
    // 6 Grounded socket outlets
    const numSockets = 6;
    for (let i = 0; i < numSockets; i++) {
      const sx = -w * 0.22 + (i * w * 0.6) / (numSockets - 1);
      addCyl(g, 0.016, 0.016, 0.004, 0x222222, sx, h + 0.002, 0, 12, { roughness: 0.9 });
    }
    // Heavy rubber power cord
    addCyl(g, 0.008, 0.008, 0.3, 0x111111, -w / 2 - 0.15, 0.008, 0, 8, { rz: Math.PI / 2, roughness: 0.9 });
    return;
  }

  // 4. Generic Power Fallback
  addBox(g, w, h, d, col, 0, h / 2, 0, { roughness: 0.6, metalness: 0.4 });
  addCyl(g, 0.01, 0.01, 0.005, 0x00ff44, w * 0.3, h * 0.8, d / 2 + 0.002, 8, { rx: Math.PI / 2, emissive: 0x00ff44, emissiveIntensity: 0.9 });
}

// ============================================================
// 7. HUMAN CREATOR SCALE REFERENCE MANNEQUINS
// ============================================================
function buildHumanModel(g: THREE.Group, def: EquipmentDefinition, id: string) {
  const isSeated = id.includes('seated');
  const isGuest = id.includes('guest');
  const skinCol = 0xdfa070;
  const shirtCol = isGuest ? 0x8b3a4a : 0x223348;
  const pantsCol = 0x1a2230;
  const shoeCol = 0x222222;

  if (!isSeated) {
    // ---- STANDING CREATOR FIGURE (1.75m) ----
    // Shoes
    addBox(g, 0.12, 0.08, 0.26, shoeCol, -0.11, 0.04, 0.03, { roughness: 0.8 });
    addBox(g, 0.12, 0.08, 0.26, shoeCol, 0.11, 0.04, 0.03, { roughness: 0.8 });
    addBox(g, 0.12, 0.02, 0.27, 0xffffff, -0.11, 0.01, 0.03, { roughness: 0.5 });
    addBox(g, 0.12, 0.02, 0.27, 0xffffff, 0.11, 0.01, 0.03, { roughness: 0.5 });

    // Legs
    addCyl(g, 0.07, 0.055, 0.82, pantsCol, -0.11, 0.48, 0, 12, { roughness: 0.7 });
    addCyl(g, 0.07, 0.055, 0.82, pantsCol, 0.11, 0.48, 0, 12, { roughness: 0.7 });

    // Hips / Pelvis
    addBox(g, 0.34, 0.16, 0.22, pantsCol, 0, 0.92, 0, { roughness: 0.7 });

    // Torso / Jacket
    addBox(g, 0.38, 0.48, 0.24, shirtCol, 0, 1.22, 0, { roughness: 0.8 });

    // Arms
    addCyl(g, 0.055, 0.045, 0.58, shirtCol, -0.23, 1.16, 0, 10, { rz: 0.1, roughness: 0.8 });
    addCyl(g, 0.055, 0.045, 0.58, shirtCol, 0.23, 1.16, 0, 10, { rz: -0.1, roughness: 0.8 });

    // Hands
    addBox(g, 0.06, 0.09, 0.06, skinCol, -0.26, 0.84, 0, { roughness: 0.6 });
    addBox(g, 0.06, 0.09, 0.06, skinCol, 0.26, 0.84, 0, 0, { roughness: 0.6 });

    // Neck
    addCyl(g, 0.055, 0.06, 0.09, skinCol, 0, 1.48, 0, 12, { roughness: 0.6 });

    // Head
    const headMat = makeMat(skinCol, 0.6);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 18), headMat);
    head.scale.set(1, 1.18, 1.05);
    head.position.set(0, 1.62, 0);
    head.castShadow = true;
    g.add(head);

    // Studio Headphones
    addCyl(g, 0.045, 0.045, 0.04, 0x111111, -0.12, 1.62, 0, 12, { rz: Math.PI / 2, roughness: 0.4 });
    addCyl(g, 0.045, 0.045, 0.04, 0x111111, 0.12, 1.62, 0, 12, { rz: Math.PI / 2, roughness: 0.4 });
    const bandMat = makeMat(0x111111, 0.4);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 8, 24, Math.PI), bandMat);
    band.position.set(0, 1.63, 0);
    band.rotation.z = -Math.PI / 2;
    band.rotation.y = Math.PI / 2;
    g.add(band);
  } else {
    // ---- SEATED CREATOR FIGURE ----
    // Feet
    addBox(g, 0.12, 0.08, 0.24, shoeCol, -0.12, 0.04, 0.32, { roughness: 0.8 });
    addBox(g, 0.12, 0.08, 0.24, shoeCol, 0.12, 0.04, 0.32, { roughness: 0.8 });

    // Lower legs (Vertical)
    addCyl(g, 0.065, 0.055, 0.45, pantsCol, -0.12, 0.24, 0.32, 12, { roughness: 0.7 });
    addCyl(g, 0.065, 0.055, 0.45, pantsCol, 0.12, 0.24, 0.32, 12, { roughness: 0.7 });

    // Thighs (Horizontal)
    addCyl(g, 0.07, 0.065, 0.42, pantsCol, -0.12, 0.47, 0.16, 12, { rx: Math.PI / 2, roughness: 0.7 });
    addCyl(g, 0.07, 0.065, 0.42, pantsCol, 0.12, 0.47, 0.16, 12, { rx: Math.PI / 2, roughness: 0.7 });

    // Pelvis / Seat
    addBox(g, 0.36, 0.14, 0.26, pantsCol, 0, 0.5, -0.05, { roughness: 0.7 });

    // Torso (Upright)
    addBox(g, 0.38, 0.46, 0.24, shirtCol, 0, 0.78, -0.05, { roughness: 0.8 });

    // Arms resting forward towards desk
    addCyl(g, 0.055, 0.045, 0.38, shirtCol, -0.22, 0.75, 0.08, 10, { rx: -0.6, roughness: 0.8 });
    addCyl(g, 0.055, 0.045, 0.38, shirtCol, 0.22, 0.75, 0.08, 10, { rx: -0.6, roughness: 0.8 });

    // Neck & Head
    addCyl(g, 0.055, 0.06, 0.09, skinCol, 0, 1.05, -0.05, 12, { roughness: 0.6 });
    const headMat = makeMat(skinCol, 0.6);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 18), headMat);
    head.scale.set(1, 1.18, 1.05);
    head.position.set(0, 1.2, -0.05);
    head.castShadow = true;
    g.add(head);

    // Headphones
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
    // Fallback if ID is completely unknown
    addBox(g, 0.3, 0.3, 0.3, 0x333333, 0, 0.15, 0, { roughness: 0.5, metalness: 0.3 });
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
  } else if (cat === 'furniture' || cat === 'props' || equipmentId.startsWith('furn-') || equipmentId.startsWith('prop-') || name.includes('desk') || name.includes('table') || name.includes('chair') || name.includes('sofa') || name.includes('shelf') || name.includes('backdrop') || name.includes('stand') || name.includes('stool')) {
    buildFurnitureItem(g, def, equipmentId);
  } else if (cat === 'tech' || equipmentId.startsWith('tech-') || name.includes('computer') || name.includes('laptop') || name.includes('stream') || name.includes('switch') || name.includes('synth') || name.includes('keyboard') || name.includes('deck')) {
    buildTechItem(g, def, equipmentId);
  } else if (cat === 'power' || equipmentId.startsWith('pwr-') || name.includes('power') || name.includes('battery') || name.includes('generator') || name.includes('strip')) {
    buildPowerItem(g, def, equipmentId);
  } else {
    // Universal intelligent dimensional archetype
    buildFurnitureItem(g, def, equipmentId);
  }

  return g;
}
