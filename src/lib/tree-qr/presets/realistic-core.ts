/**
 * REALISTIC TREE CORE — the shared botanical architecture for QR dioramas.
 *
 * Ports the proven keepsake techniques into the QR harness at courtyard scale:
 *  - a fluted trunk with muscular Nebari root buttresses (vertex displacement)
 *  - recursive boughs with WEIGHT: sag under blossom load, tips sweep to the sun
 *  - irregular puffy blossom/leaf clouds with an altitude color gradient
 *    (shadowed deep tones below → sunlit highlight crowns above)
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PresetBuilder, PresetContext, PresetResult } from './types';
import type { PRNG } from '../tree-generator';

/* ─────────────────────────────── Specs ─────────────────────────────── */

export interface RealisticTrunkSpec {
    height: number;
    baseRadius: number;
    taper: number;
    fluteCount: number;
    fluteAmp: number;
    fluteTwist: number;
    buttressCount: number;
    buttressAmp: number;
    buttressSpread: number;
    lean: number;
    leanDirection: number;
    barkColor: number;
    sink?: number;
}

export interface RealisticBranchSpec {
    depth: number;
    boughCount: [number, number];
    boughLength: [number, number];
    boughRadius: [number, number];
    lengthFall: number;
    radiusFall: number;
    sag: number;
    tipLift: number;
    upBias: number;
    wander: number;
}

export type LeafShapeKind = 'teardrop' | 'maple' | 'ginkgo' | 'round';

export interface RealisticCloudSpec {
    petalsPerUnit: number;
    cloudRadius: [number, number];
    flattenY: number;
    petalScale: number;
    openFlowerChance: number;
    shape: LeafShapeKind;
}

export interface RealisticTreeConfig {
    trunk: RealisticTrunkSpec;
    branch: RealisticBranchSpec;
    cloud: RealisticCloudSpec;
    /** Optional extra decorations (berries, moss, racemes…). */
    decorate?: (ctx: PresetContext, anchors: Array<{ pos: THREE.Vector3; radius: number }>) => void;
}

/* ─────────────────────── Fluted Nebari trunk ─────────────────────── */

function angDist(a: number, b: number): number {
    let d = Math.abs(a - b) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
}

export function buildFlutedTrunkGeometry(spec: RealisticTrunkSpec, prng: PRNG): THREE.BufferGeometry {
    const { height, baseRadius } = spec;
    const geo = new THREE.CylinderGeometry(1, 1, height, 72, 30, false);
    geo.translate(0, height / 2, 0); // pivot at base

    const buttressAngles: number[] = [];
    for (let k = 0; k < spec.buttressCount; k++) {
        buttressAngles.push((k / spec.buttressCount) * Math.PI * 2 + prng.range(-0.22, 0.22));
    }

    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        const t = THREE.MathUtils.clamp(y / height, 0, 1); // 0 base → 1 top
        const theta = Math.atan2(z, x);

        // Taper with a gentle cosine flare at the root collar
        const taper = THREE.MathUtils.lerp(1, spec.taper, Math.pow(t, 0.8));
        const flare = 1 + 0.34 * Math.exp(-t * 5.2);

        // Continuous organic fluting (ridges & furrows running up the trunk)
        const flute =
            1 +
            spec.fluteAmp * (1 - t * 0.75) * Math.sin(spec.fluteCount * theta + spec.fluteTwist * t * Math.PI * 2);

        // Muscular Nebari buttresses rooted at the courtyard
        let buttress = 1;
        const window = Math.exp(-t * 3.4);
        for (const a of buttressAngles) {
            const d = angDist(theta, a);
            buttress += spec.buttressAmp * window * Math.exp(-(d * d) / (spec.buttressSpread * spec.buttressSpread));
        }

        // Deterministic micro-relief so the bark never looks machine-turned
        const relief =
            1 +
            0.028 * Math.sin(5 * theta + 1.7) * Math.sin(t * 11 + 0.6) +
            0.02 * Math.sin(11 * theta + t * 23);

        const r = taper * flare * flute * buttress * relief;
        pos.setXYZ(i, x * r, y, z * r);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
}

/* ────────────────── Branch skeleton with WEIGHT ────────────────── */

export function growRealisticSkeleton(
    trunkHeight: number,
    baseRadius: number,
    spec: RealisticBranchSpec,
    prng: PRNG
): { geometries: THREE.BufferGeometry[]; anchors: Array<{ pos: THREE.Vector3; radius: number }> } {
    const geometries: THREE.BufferGeometry[] = [];
    const anchors: Array<{ pos: THREE.Vector3; radius: number }> = [];

    function taperedTube(curve: THREE.CatmullRomCurve3, r0: number, segments: number): THREE.BufferGeometry {
        const tubular = Math.max(8, segments);
        const radial = 7;
        const frames = curve.computeFrenetFrames(tubular, false);
        const positions: number[] = [];
        const indices: number[] = [];
        const uvs: number[] = [];
        const p = new THREE.Vector3();

        for (let i = 0; i <= tubular; i++) {
            const t = i / tubular;
            // Bold limbs: never taper below a visible twig radius
            const r = THREE.MathUtils.lerp(r0, Math.max(r0 * 0.32, 0.05), t) * (1 - 0.1 * Math.sin(t * Math.PI));
            const N = frames.normals[i];
            const B = frames.binormals[i];
            for (let j = 0; j <= radial; j++) {
                const v = (j / radial) * Math.PI * 2;
                const sin = Math.sin(v);
                const cos = -Math.cos(v);
                positions.push(
                    p.x + r * (cos * N.x + sin * B.x),
                    p.y + r * (cos * N.y + sin * B.y),
                    p.z + r * (cos * N.z + sin * B.z)
                );
                // UVs are REQUIRED so limbs merge with the textured trunk
                uvs.push(j / radial, i / tubular);
            }
        }
        for (let i = 0; i < tubular; i++) {
            for (let j = 0; j < radial; j++) {
                const a = i * (radial + 1) + j;
                const b = a + radial + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }

    function branch(start: THREE.Vector3, dir: THREE.Vector3, length: number, r0: number, depth: number) {
        const n = Math.max(4, Math.round(length / 0.62));
        const pts: THREE.Vector3[] = [start.clone()];
        const d = dir.clone().normalize();
        const stepLen = length / n;

        for (let i = 1; i <= n; i++) {
            const t = i / n;
            // Gravity bows the bough through the first 65%…
            if (t < 0.65) d.y -= spec.sag * 0.55;
            // …then phototropism sweeps the tip back up to the light
            else d.y += spec.tipLift * 0.9;
            d.x += (prng.next() - 0.5) * spec.wander;
            d.z += (prng.next() - 0.5) * spec.wander;
            d.y += spec.upBias * 0.012;
            d.normalize();
            const prev = pts[pts.length - 1];
            pts.push(new THREE.Vector3(prev.x + d.x * stepLen, prev.y + d.y * stepLen, prev.z + d.z * stepLen));
        }

        const curve = new THREE.CatmullRomCurve3(pts);
        geometries.push(taperedTube(curve, r0, n));

        if (depth <= 0) {
            // ── FOLIAGE DISCIPLINE ──
            // Blossoms live ONLY on the sunlit outer canopy, as compact clumps
            // with visible gaps between them. Inner and lower limbs stay BARE —
            // that negative space is what makes the wooden scaffold READ.
            const tip = pts[pts.length - 1];
            if (tip.y > trunkHeight * 0.42) {
                const cloudR = THREE.MathUtils.clamp(0.42 + length * 0.3, 0.42, 1.15);
                anchors.push({ pos: tip, radius: cloudR });
            }

            // ── BOLD FINGER TWIGS piercing the blossom clumps ──
            const twigCount = prng.int(3, 5);
            const side = new THREE.Vector3();
            for (let w = 0; w < twigCount; w++) {
                const tt = prng.range(0.35, 1);
                const tp = curve.getPointAt(tt);
                const tangent = curve.getTangentAt(tt);
                side.set(-tangent.z, 0, tangent.x).normalize();
                if (side.lengthSq() < 0.01) side.set(1, 0, 0);
                const twigDir = tangent
                    .clone()
                    .applyAxisAngle(side, prng.range(0.55, 1.25) * (prng.next() > 0.5 ? 1 : -1))
                    .applyAxisAngle(tangent, prng.range(0, Math.PI * 2));
                twigDir.y += prng.range(0.1, 0.45);
                twigDir.normalize();
                const twigLen = prng.range(0.5, 1.05);
                const end = tp.clone().addScaledVector(twigDir, twigLen);
                geometries.push(
                    taperedTube(
                        new THREE.CatmullRomCurve3([
                            tp,
                            tp.clone().lerp(end, 0.55).add(new THREE.Vector3(0, prng.range(-0.08, 0.12), 0)),
                            end,
                        ]),
                        prng.range(0.05, 0.08),
                        4
                    )
                );
                // Under half the twigs flower — the rest stay bare spikes
                if (prng.next() < 0.45) {
                    anchors.push({ pos: end, radius: prng.range(0.3, 0.5) });
                }
            }
            return;
        }

        // ── FOLIAGE SHELVES on the last inner limbs ──
        // A flattened cluster riding ON TOP of the bough (offset along +Y):
        // the dark wood silhouette stays readable beneath the leaf mass.
        if (depth === 1 && pts[pts.length - 1].y > trunkHeight * 0.5) {
            const shelf = curve.getPointAt(0.72);
            shelf.y += r0 * 0.85;
            anchors.push({ pos: shelf, radius: THREE.MathUtils.clamp(0.34 + length * 0.2, 0.34, 0.8) });
        }

        // Final fork is always a clean pair — the scaffold reads as limbs, not fuzz
        const kids =
            depth === 1 ? 2 : depth >= spec.depth - 1 ? prng.int(2, 3) : prng.next() > 0.45 ? 3 : 2;
        for (let k = 0; k < kids; k++) {
            const t = prng.range(0.42, 0.96);
            const origin = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t);
            let side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            if (side.lengthSq() < 0.01) side.set(1, 0, 0);
            const az = prng.range(0, Math.PI * 2);
            const tilt = prng.range(0.45, 1.05);
            const childDir = tangent
                .clone()
                .applyAxisAngle(side, tilt * (prng.next() > 0.6 ? 1 : -1))
                .applyAxisAngle(tangent, az);
            childDir.y += spec.upBias;
            childDir.normalize();
            branch(
                origin,
                childDir,
                length * prng.range(spec.lengthFall - 0.1, spec.lengthFall + 0.1),
                r0 * spec.radiusFall * prng.range(0.85, 1.12),
                depth - 1
            );
        }
    }

    // Phyllotactic scaffold boughs radiating from the upper trunk + a central leader
    const boughCount = prng.int(spec.boughCount[0], spec.boughCount[1]);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let b = 0; b < boughCount; b++) {
        const frac = 0.52 + (b / boughCount) * 0.44 + prng.range(-0.04, 0.04);
        const y = trunkHeight * frac;
        const az = b * golden + prng.range(-0.3, 0.3);
        const pitch = prng.range(0.62, 1.08);
        const dir = new THREE.Vector3(
            Math.cos(az) * Math.cos(pitch),
            Math.sin(pitch) * 0.55,
            Math.sin(az) * Math.cos(pitch)
        ).normalize();
        const len = prng.range(spec.boughLength[0], spec.boughLength[1]) * (1.18 - frac * 0.28);
        const r0 = prng.range(spec.boughRadius[0], spec.boughRadius[1]);
        branch(new THREE.Vector3(dir.x * baseRadius * 0.22, y, dir.z * baseRadius * 0.22), dir, len, r0, spec.depth);
    }
    branch(
        new THREE.Vector3(0, trunkHeight * 0.97, 0),
        new THREE.Vector3(0, 1, 0),
        prng.range(spec.boughLength[0] * 0.8, spec.boughLength[1] * 0.9),
        prng.range(spec.boughRadius[0] * 0.8, spec.boughRadius[1] * 0.9),
        spec.depth
    );

    return { geometries, anchors };
}

/* ─────────────────────── Leaf / petal shapes ─────────────────────── */

export function createRealisticLeafGeometry(kind: LeafShapeKind, scale: number): THREE.BufferGeometry {
    switch (kind) {
        case 'maple': {
            // Palmate 5-lobe maple leaf via a polar star profile
            const shape = new THREE.Shape();
            const lobes = 5;
            const steps = 90;
            for (let i = 0; i <= steps; i++) {
                const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
                const spike = Math.pow(Math.abs(Math.cos((a * lobes) / 2)), 0.85);
                const r = scale * (0.34 + 0.66 * spike);
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r * 1.08;
                if (i === 0) shape.moveTo(x, y);
                else shape.lineTo(x, y);
            }
            const geo = new THREE.ShapeGeometry(shape, 24);
            return cupLeaf(geo, scale, 0.3);
        }
        case 'ginkgo': {
            // Fan-shaped ginkgo leaf with a slightly ruffled rim
            const shape = new THREE.Shape();
            const steps = 40;
            shape.moveTo(0, 0);
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const a = Math.PI * 0.15 + t * Math.PI * 0.7;
                const r = scale * (0.85 + 0.15 * Math.sin(t * Math.PI * 6));
                shape.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.92);
            }
            shape.lineTo(0, 0);
            const geo = new THREE.ShapeGeometry(shape, 20);
            return cupLeaf(geo, scale, 0.35);
        }
        case 'round': {
            const geo = new THREE.CircleGeometry(scale * 0.5, 14);
            return cupLeaf(geo, scale, 0.28);
        }
        case 'teardrop':
        default: {
            // Notched, softly-cupped blossom petal
            const l = scale * 1.45;
            const w = scale;
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.bezierCurveTo(w * 0.75, l * 0.18, w * 0.85, l * 0.82, w * 0.22, l * 0.96);
            shape.lineTo(0, l * 0.82); // the classic sakura notch
            shape.lineTo(-w * 0.22, l * 0.96);
            shape.bezierCurveTo(-w * 0.85, l * 0.82, -w * 0.75, l * 0.18, 0, 0);
            const geo = new THREE.ShapeGeometry(shape, 18);
            return cupLeaf(geo, scale, 0.4);
        }
    }
}

function cupLeaf(geo: THREE.BufferGeometry, _scale: number, cup: number): THREE.BufferGeometry {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        // Cup across width + a gentle upward curl toward the tip
        pos.setZ(i, Math.cos((x * Math.PI) / 0.9) * 0.48 * cup * Math.abs(x) + Math.sin(y * 2.4) * 0.12 * cup);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
}

/* ─────────────── Puffy altitude-gradient blossom clouds ─────────────── */

export function fillRealisticClouds(
    anchors: Array<{ pos: THREE.Vector3; radius: number }>,
    palette: { deepShadow: string; secondary: string; primary: string; highlight: string },
    prng: PRNG,
    cloud: RealisticCloudSpec
): THREE.InstancedMesh {
    const geo = createRealisticLeafGeometry(cloud.shape, cloud.petalScale);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.55,
        metalness: 0.02,
        side: THREE.DoubleSide,
    });

    const bag: Array<{ p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; c: THREE.Color }> = [];
    const deep = new THREE.Color(palette.deepShadow);
    const secondary = new THREE.Color(palette.secondary);
    const primary = new THREE.Color(palette.primary);
    const highlight = new THREE.Color(palette.highlight);
    const temp = new THREE.Color();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    for (const anchor of anchors) {
        // Compact clumps — never the giant overlapping blobs that bury branches
        const R = THREE.MathUtils.clamp(
            prng.range(cloud.cloudRadius[0], cloud.cloudRadius[1]) * anchor.radius,
            0.45,
            1.6
        );
        const count = Math.max(6, Math.round(R * cloud.petalsPerUnit));

        for (let i = 0; i < count; i++) {
            const rr = Math.pow(prng.next(), 0.62); // dense heart, airy fringes
            const th = prng.range(0, Math.PI * 2);
            const ph = Math.acos(prng.range(-1, 1));
            pos.set(
                anchor.pos.x + rr * R * Math.sin(ph) * Math.cos(th),
                anchor.pos.y + rr * R * Math.cos(ph) * cloud.flattenY,
                anchor.pos.z + rr * R * Math.sin(ph) * Math.sin(th)
            );
            euler.set(prng.range(0, Math.PI * 2), prng.range(0, Math.PI * 2), prng.range(0, Math.PI * 2));
            quat.setFromEuler(euler);
            const s = prng.range(0.72, 1.5) * (1.25 - rr * 0.35);

            // 4-stop altitude ramp: shadow below → sunlit crown above
            const alt = THREE.MathUtils.clamp((pos.y - (anchor.pos.y - R)) / (2 * R), 0, 1);
            if (alt < 0.3) temp.copy(deep).lerp(secondary, alt / 0.3);
            else if (alt < 0.72) temp.copy(secondary).lerp(primary, (alt - 0.3) / 0.42);
            else temp.copy(primary).lerp(highlight, (alt - 0.72) / 0.28);
            temp.offsetHSL(prng.range(-0.014, 0.014), prng.range(-0.03, 0.03), prng.range(-0.04, 0.04));

            bag.push({
                p: pos.clone(),
                q: quat.clone(),
                s: new THREE.Vector3(s, s * prng.range(0.9, 1.12), s),
                c: temp.clone(),
            });
        }

        // A fully-open five-petal blossom facing outward — jewelry in the cloud
        if (prng.next() < cloud.openFlowerChance) {
            const openDir = new THREE.Vector3(
                prng.range(-0.6, 0.6),
                prng.range(0.35, 0.9),
                prng.range(-0.6, 0.6)
            ).normalize();
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), openDir);
            for (let p = 0; p < 5; p++) {
                const around = (p / 5) * Math.PI * 2;
                const tilt = Math.PI / 2 - 0.5;
                const local = new THREE.Vector3(
                    Math.sin(tilt) * Math.cos(around),
                    Math.cos(tilt),
                    Math.sin(tilt) * Math.sin(around)
                );
                const petalQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), local).premultiply(q);
                pos.copy(anchor.pos).addScaledVector(openDir, R * 0.55);
                bag.push({
                    p: pos.clone(),
                    q: petalQuat,
                    s: new THREE.Vector3(1.3, 1.3, 1.3),
                    c: highlight.clone().offsetHSL(0, 0, prng.range(-0.02, 0.02)),
                });
            }
        }
    }

    const mesh = new THREE.InstancedMesh(geo, mat, bag.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bag.length; i++) {
        dummy.position.copy(bag[i].p);
        dummy.quaternion.copy(bag[i].q);
        dummy.scale.copy(bag[i].s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, bag[i].c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'realisticClouds';
    return mesh;
}

/* ────────────────── Aged bark canvas texture ────────────────── */

/**
 * Paints a full bark study — base coat, vertical grain striations, jagged
 * random-walk fissures with raised lips, and breathing lenticels — plus a
 * matching bump map. Applied to trunk AND limbs so the whole tree reads
 * as one ancient piece of wood.
 */
export function makeRealisticBarkTexture(barkColor: number): {
    map: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
} {
    const base = new THREE.Color(barkColor);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    const css = (l: number) =>
        `hsl(${Math.round(hsl.h * 360)}, ${Math.round(hsl.s * 100)}%, ${Math.round(
            THREE.MathUtils.clamp(l, 0.03, 0.96) * 100
        )}%)`;

    let s = (barkColor >>> 0) || 42;
    const rnd = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const g = c.getContext('2d')!;

    // Base coat
    g.fillStyle = css(hsl.l);
    g.fillRect(0, 0, 256, 512);

    // Vertical wood-grain striations
    for (let i = 0; i < 230; i++) {
        const x = rnd() * 256;
        const y = rnd() * 512;
        const len = 24 + rnd() * 120;
        g.strokeStyle = css(hsl.l + (rnd() - 0.5) * 0.16);
        g.lineWidth = 0.6 + rnd() * 1.8;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(
            x + (rnd() - 0.5) * 6,
            y + len * 0.33,
            x + (rnd() - 0.5) * 6,
            y + len * 0.66,
            x + (rnd() - 0.5) * 8,
            y + len
        );
        g.stroke();
    }

    // Jagged random-walk fissures with a raised lip on one side
    for (let f = 0; f < 28; f++) {
        let x = rnd() * 256;
        let y = rnd() * 512;
        const steps = 14 + Math.floor(rnd() * 18);
        const draw = () => {
            g.beginPath();
            g.moveTo(x, y);
            let cx = x;
            let cy = y;
            for (let i = 0; i < steps; i++) {
                cx += (rnd() - 0.5) * 9;
                cy += 8 + rnd() * 16;
                g.lineTo(cx, cy);
            }
        };
        draw();
        g.strokeStyle = css(hsl.l - 0.2 - rnd() * 0.1);
        g.lineWidth = 1.6 + rnd() * 2.6;
        g.stroke();
        // Raised lip catch-light, offset one pixel
        g.save();
        g.translate(1.6, 0);
        draw();
        g.strokeStyle = css(hsl.l + 0.1);
        g.lineWidth = 1;
        g.stroke();
        g.restore();
    }

    // Lenticels — the tree's breathing pores
    for (let l = 0; l < 90; l++) {
        g.fillStyle = css(hsl.l + 0.14);
        g.beginPath();
        g.ellipse(rnd() * 256, rnd() * 512, 1 + rnd() * 2.2, 0.6 + rnd() * 1.1, 0, 0, Math.PI * 2);
        g.fill();
    }

    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;

    // Matching grayscale bump canvas
    const cb = document.createElement('canvas');
    cb.width = 256;
    cb.height = 512;
    const gb = cb.getContext('2d')!;
    gb.fillStyle = '#808080';
    gb.fillRect(0, 0, 256, 512);
    let sb = ((barkColor * 7919 + 13) >>> 0) || 7;
    const rndb = () => {
        sb = (sb * 1664525 + 1013904223) >>> 0;
        return sb / 4294967296;
    };
    for (let i = 0; i < 160; i++) {
        const x = rndb() * 256;
        const y = rndb() * 512;
        gb.strokeStyle = rndb() > 0.5 ? '#9a9a9a' : '#666666';
        gb.lineWidth = 0.6 + rndb() * 1.6;
        gb.beginPath();
        gb.moveTo(x, y);
        gb.lineTo(x + (rndb() - 0.5) * 6, y + 30 + rndb() * 110);
        gb.stroke();
    }
    for (let f = 0; f < 32; f++) {
        let x = rndb() * 256;
        let y = rndb() * 512;
        gb.beginPath();
        gb.moveTo(x, y);
        const steps = 12 + Math.floor(rndb() * 16);
        for (let i = 0; i < steps; i++) {
            x += (rndb() - 0.5) * 9;
            y += 8 + rndb() * 15;
            gb.lineTo(x, y);
        }
        gb.strokeStyle = '#2e2e2e';
        gb.lineWidth = 1.8 + rndb() * 2.4;
        gb.stroke();
    }
    const bumpMap = new THREE.CanvasTexture(cb);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

    return { map, bumpMap };
}

/* ────────────────── Velvet moss at the root collar ────────────────── */

export function addTrunkMossCushions(
    parent: THREE.Group,
    trunk: RealisticTrunkSpec,
    prng: PRNG,
    palette: { deepShadow: string }
): void {
    const count = 70;
    const geo = new THREE.SphereGeometry(1, 8, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const moss = new THREE.Color(0x6a8f4e).lerp(new THREE.Color(palette.deepShadow), 0.18);
    const col = new THREE.Color();

    for (let i = 0; i < count; i++) {
        const theta = prng.range(0, Math.PI * 2);
        const h = Math.pow(prng.next(), 2.1) * (trunk.height * 0.3) + 0.1;
        const t = h / trunk.height;
        // Approximate the fluted/buttressed surface radius at this height
        const r =
            trunk.baseRadius *
            THREE.MathUtils.lerp(1, trunk.taper, Math.pow(t, 0.8)) *
            (1 + 0.34 * Math.exp(-t * 5.2)) *
            (1 + trunk.buttressAmp * 0.5 * Math.exp(-t * 3.4)) +
            trunk.buttressAmp * 0.18;
        const sc = prng.range(0.08, 0.26) * (1.25 - t);
        dummy.position.set(
            Math.cos(theta) * (r + sc * 0.2),
            h - (trunk.sink ?? 0.2),
            Math.sin(theta) * (r + sc * 0.2)
        );
        dummy.rotation.set(0, prng.range(0, Math.PI * 2), 0);
        dummy.scale.set(sc, sc * prng.range(0.34, 0.5), sc * prng.range(0.8, 1.1));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, col.copy(moss).offsetHSL(0, 0, prng.range(-0.05, 0.05)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.name = 'trunkMoss';
    parent.add(mesh);
}

/* ────────────────── Fat buds at the cloud rims ────────────────── */

export function addCloudBuds(
    parent: THREE.Group,
    anchors: Array<{ pos: THREE.Vector3; radius: number }>,
    prng: PRNG,
    palette: { deepShadow: string }
): void {
    const count = 150;
    const geo = new THREE.SphereGeometry(0.055, 6, 5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const bud = new THREE.Color(palette.deepShadow).lerp(new THREE.Color('#8a5a3a'), 0.3);
    const col = new THREE.Color();

    for (let i = 0; i < count; i++) {
        const a = prng.choice(anchors);
        const ang = prng.range(0, Math.PI * 2);
        const r = a.radius * prng.range(0.9, 1.35);
        dummy.position.set(a.pos.x + Math.cos(ang) * r, a.pos.y + prng.range(-0.2, 0.45), a.pos.z + Math.sin(ang) * r);
        dummy.rotation.set(0, ang, 0);
        const sc = prng.range(0.8, 1.6);
        dummy.scale.set(sc, sc * 1.7, sc);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, col.copy(bud).offsetHSL(0, 0, prng.range(-0.04, 0.04)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.name = 'cloudBuds';
    parent.add(mesh);
}

/* ───────────────────── Preset factory ───────────────────── */

export function realisticTree(config: RealisticTreeConfig): PresetBuilder {
    return (ctx: PresetContext): PresetResult => {
        const { scene, palette, prng } = ctx;
        const trunkGroup = new THREE.Group();
        trunkGroup.name = 'realisticTree';
        scene.add(trunkGroup);

        // Trunk + boughs merged into one bark mesh
        const trunkGeo = buildFlutedTrunkGeometry(config.trunk, prng);
        trunkGeo.translate(0, -(config.trunk.sink ?? 0.2), 0);
        const skeleton = growRealisticSkeleton(
            config.trunk.height,
            config.trunk.baseRadius,
            config.branch,
            prng
        );
        // ── Aged bark: painted fissures, grain striations, lenticels ──
        const bark = makeRealisticBarkTexture(config.trunk.barkColor);
        const barkMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: bark.map,
            bumpMap: bark.bumpMap,
            bumpScale: 1.2,
            roughness: 0.92,
            metalness: 0.01,
        });
        const merged = mergeGeometries([trunkGeo, ...skeleton.geometries], false);
        const barkMesh = new THREE.Mesh(merged ?? trunkGeo, barkMat);
        barkMesh.castShadow = true;
        barkMesh.receiveShadow = true;
        trunkGroup.add(barkMesh);

        // Puffy altitude-gradient blossom clouds
        const clouds = fillRealisticClouds(skeleton.anchors, palette, prng, config.cloud);
        trunkGroup.add(clouds);

        // ── Living details: velvet moss at the root collar + fat buds ──
        addTrunkMossCushions(trunkGroup, config.trunk, prng, palette);
        addCloudBuds(trunkGroup, skeleton.anchors, prng, palette);

        config.decorate?.(ctx, skeleton.anchors);

        // A gentle, whole-tree lean away from the wind
        trunkGroup.rotation.z = Math.cos(config.trunk.leanDirection) * config.trunk.lean;
        trunkGroup.rotation.x = Math.sin(config.trunk.leanDirection) * config.trunk.lean;

        return { trunkGroup, leafMeshes: [clouds] };
    };
}
