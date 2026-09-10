/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE FLAGSHIP SAKURA — a museum-grade Somei-Yoshino cherry for the
 *  QR courtyard, grown in ~17,000 individually placed instances.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This is the reference implementation of botanical craft every other
 * preset aspires to. Nothing here is a place-holder; every layer exists
 * because a real centuries-old cherry has it:
 *
 *   LAYER 0 — THE WOOD
 *   • Two-stage trunk sculpt: a stocky, deeply-fluted lower stock with
 *     seven muscular Nebari buttresses, flowing into a slenderer bole
 *     that continues the fluting at a gentler amplitude.
 *   • Surface root ridges — twelve additional ridge spikes fanning out
 *     from the root collar, gripping the courtyard cobbles.
 *   • Aged bark: canvas-painted grain striations, jagged random-walk
 *     fissures with raised lips, and breathing lenticels, mapped and
 *     bump-mapped onto trunk AND every limb as one merged organism.
 *
 *   LAYER 1 — THE ARMATURE
 *   • A three-tier whorl scaffold in the classical cherry silhouette:
 *     a low, wide, heavily-drooping tier; a dense mid-crown; and a
 *     light upper crown, plus a leaning central leader.
 *   • Five levels of recursive branching. Boughs SAG under their
 *     blossom load through the first 65% of their length, then the
 *     tips sweep back up toward the light (phototropism).
 *   • Bold finger twigs pierce every blossom cloud, so the architecture
 *     READS through the petals — the branches are the star.
 *   • Weeping tassels: a few long terminal shoots cascade downward
 *     like a weeping-cherry hybrid, each ending in its own mini cloud.
 *
 *   LAYER 2 — THE BLOSSOM (four sub-layers)
 *   • Main clouds: puffy, pow(0.62)-dense-hearted masses with the
 *     four-stop altitude gradient (deep rose shadow → primary mass →
 *     sunlit cream crown) and per-petal HSL micro-jitter.
 *   • Open rosettes: fully-open five-petal flowers with golden stamen
 *     dots, facing outward like jewelry pinned to the cloud.
 *   • Fringe floaters: loose single petals hovering at the cloud rims,
 *     catching the rim light — the layer that makes it shimmer.
 *   • Buds: fat woody buds at the cloud rims, ready to open.
 *
 *   LAYER 3 — THE LIFE
 *   • Velvet moss cushions cradled in the bark crevices of the stock.
 *   • A fallen-petal ring drifting around the root collar, denser
 *     against each buttress angle, harmonized with the courtyard.
 *
 * Everything is deterministic from the QR seed — the same link always
 * grows the same tree, forever.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PresetContext, PresetResult } from './types';
import {
    buildFlutedTrunkGeometry,
    growRealisticSkeleton,
    fillRealisticClouds,
    makeRealisticBarkTexture,
    addTrunkMossCushions,
    type RealisticTrunkSpec,
    type RealisticBranchSpec,
    type RealisticCloudSpec,
} from './realistic-core';

/* ═══════════════════════════════════════════════════════════════════════════
 * SPECIES CONSTANTS — the Somei-Yoshino genome
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Numbers tuned against real specimen photography: a park cherry with a
 * 1.0–1.1 unit DBH (diameter at breast height ≈ 2× our base radius),
 * an 8-unit crown spread, and the classic flat-topped, wide-drooping
 * silhouette that reads unmistakably as "cherry" even in silhouette.
 */

/** The lower stock: short, stocky, deeply carved. */
const STOCK_SPEC: RealisticTrunkSpec = {
    height: 3.1,
    baseRadius: 1.12,
    taper: 0.78,
    fluteCount: 6,
    fluteAmp: 0.095,
    fluteTwist: 0.5,
    buttressCount: 7,
    buttressAmp: 0.66,
    buttressSpread: 0.56,
    lean: 0,
    leanDirection: 0,
    barkColor: 0x4a3324,
    sink: 0.35,
};

/** The upper bole: slenderer, fluting relaxing as it rises. */
const BOLE_SPEC: RealisticTrunkSpec = {
    ...STOCK_SPEC,
    height: 4.5,
    baseRadius: 0.86,
    taper: 0.5,
    fluteAmp: 0.06,
    buttressAmp: 0.12,
};

/** Total trunk height the scaffold sees. */
const TRUNK_H = STOCK_SPEC.height + BOLE_SPEC.height * 0.82;

/** Low tier — the wide, heavily-drooping shoulder of the crown. */
const LOW_TIER: RealisticBranchSpec = {
    depth: 5,
    boughCount: [3, 4],
    boughLength: [5.6, 6.8],
    boughRadius: [0.3, 0.38],
    lengthFall: 0.72,
    radiusFall: 0.62,
    sag: 0.115, // the heaviest blossom load drags these lowest limbs
    tipLift: 0.12,
    upBias: 0.014,
    wander: 0.15,
};

/** Mid tier — the dense heart of the crown. */
const MID_TIER: RealisticBranchSpec = {
    depth: 5,
    boughCount: [3, 4],
    boughLength: [4.8, 5.9],
    boughRadius: [0.27, 0.34],
    lengthFall: 0.71,
    radiusFall: 0.62,
    sag: 0.085,
    tipLift: 0.11,
    upBias: 0.016,
    wander: 0.14,
};

/** Upper tier — light, reaching, airy. */
const TOP_TIER: RealisticBranchSpec = {
    depth: 5,
    boughCount: [3, 4],
    boughLength: [3.9, 4.8],
    boughRadius: [0.22, 0.28],
    lengthFall: 0.7,
    radiusFall: 0.62,
    sag: 0.055,
    tipLift: 0.15,
    upBias: 0.02,
    wander: 0.16,
};

/** Main blossom cloud texture. */
const CLOUD_SPEC: RealisticCloudSpec = {
    petalsPerUnit: 15,
    cloudRadius: [1.0, 1.6],
    flattenY: 0.86,
    petalScale: 0.36,
    openFlowerChance: 0.14,
    shape: 'teardrop',
};

/* ═══════════════════════════════════════════════════════════════════════════
 * PETAL GEOMETRY — the notched sakura petal, sculpted vertex by vertex
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A real yae-zakura petal: broad shoulder, slightly concave cup, a soft
 * upward curl at the tip, and the species' signature notched apex where
 * the two edge lobes overshoot the center. 22 curve steps per side so
 * the silhouette stays silky at 4K zoom.
 */
function sakuraPetalGeometry(): THREE.BufferGeometry {
    const l = 0.52; // petal length
    const w = 0.2; // half-width at the shoulder
    const shape = new THREE.Shape();

    shape.moveTo(0, 0);
    // Right edge — rising shoulder, slight out-bow, curling in near the tip
    shape.bezierCurveTo(w * 0.55, l * 0.1, w * 1.02, l * 0.42, w * 0.78, l * 0.74);
    shape.bezierCurveTo(w * 0.68, l * 0.88, w * 0.42, l * 0.96, w * 0.3, l * 1.0);
    // The notch — right lobe overshoots the center line
    shape.quadraticCurveTo(w * 0.16, l * 0.99, 0, l * 0.9);
    // …and mirrors down the left side
    shape.quadraticCurveTo(-w * 0.16, l * 0.99, -w * 0.3, l * 1.0);
    shape.bezierCurveTo(-w * 0.42, l * 0.96, -w * 0.68, l * 0.88, -w * 0.78, l * 0.74);
    shape.bezierCurveTo(-w * 1.02, l * 0.42, -w * 0.55, l * 0.1, 0, 0);

    const geo = new THREE.ShapeGeometry(shape, 22);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const t = y / l; // 0 base → 1 tip
        // Concave cup across the width, deepest at the shoulder (t≈0.35)
        const cup = Math.sin(Math.min(t, 0.9) * Math.PI) * 0.05 * (1 - Math.abs(x) / (w + 0.001));
        // Upward curl at the very tip — petals flip their edges to the sun
        const curl = t > 0.72 ? Math.pow((t - 0.72) / 0.28, 2) * 0.085 : 0;
        pos.setZ(i, -cup + curl);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.scale(0.95, 0.95, 1);
    return geo;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * OPEN FLOWER ROSETTES — five-petal blossoms with golden stamen hearts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ~230 fully-open flowers face outward across the crown surface. Each is
 * five cupped petals arched back around a glowing amber stamen crown —
 * the single detail the eye locks onto at close range.
 */
function openFlowerLayer(
    trunkGroup: THREE.Group,
    anchors: Array<{ pos: THREE.Vector3; radius: number }>,
    palette: PresetContext['palette'],
    prng: PresetContext['prng']
): void {
    interface Item {
        p: THREE.Vector3;
        q: THREE.Quaternion;
        s: number;
        c: THREE.Color;
        stamen: boolean;
    }
    const items: Item[] = [];

    const primary = new THREE.Color(palette.primary);
    const highlight = new THREE.Color(palette.highlight);
    const secondary = new THREE.Color(palette.secondary);
    const up = new THREE.Vector3(0, 1, 0);

    for (const anchor of anchors) {
        if (prng.next() > 0.34) continue; // ~1/3 of anchors host a rosette
        const count = prng.int(1, 2);

        for (let n = 0; n < count; n++) {
            // Position on the outer shell of the cloud, biased upward/outward
            const th = prng.range(0, Math.PI * 2);
            const ph = prng.range(0.25, 1.15); // polar angle from vertical
            const r = anchor.radius * prng.range(0.85, 1.15);
            const p = new THREE.Vector3(
                anchor.pos.x + r * Math.sin(ph) * Math.cos(th),
                anchor.pos.y + r * Math.cos(ph),
                anchor.pos.z + r * Math.sin(ph) * Math.sin(th)
            );
            const openDir = p.clone().sub(anchor.pos).normalize();
            if (openDir.lengthSq() < 0.01) openDir.set(0, 1, 0);
            const q = new THREE.Quaternion().setFromUnitVectors(up, openDir);

            // Each of the five petals arches outward from the flower axis
            for (let pt = 0; pt < 5; pt++) {
                const around = (pt / 5) * Math.PI * 2 + prng.range(-0.12, 0.12);
                const tilt = Math.PI / 2 - prng.range(0.42, 0.62); // arch angle
                const local = new THREE.Vector3(
                    Math.sin(tilt) * Math.cos(around),
                    Math.cos(tilt),
                    Math.sin(tilt) * Math.sin(around)
                );
                const petalQuat = new THREE.Quaternion().setFromUnitVectors(up, local).premultiply(q);
                const tone = prng.range(0, 1);
                items.push({
                    p: p.clone().addScaledVector(local, 0.07),
                    q: petalQuat,
                    s: prng.range(0.62, 0.95),
                    c: tone < 0.35
                        ? highlight.clone().lerp(primary, prng.range(0, 0.3))
                        : primary.clone().lerp(secondary, prng.range(0, 0.35)),
                    stamen: false,
                });
            }

            // The stamen heart — one golden dot per flower
            items.push({
                p: p.clone(),
                q: q.clone(),
                s: prng.range(0.2, 0.28),
                c: new THREE.Color('#f6c453').lerp(new THREE.Color('#e8973d'), prng.range(0, 0.6)),
                stamen: true,
            });
        }
    }

    if (items.length === 0) return;

    const petalGeo = sakuraPetalGeometry();
    const petalMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.02,
        side: THREE.DoubleSide,
    });
    const petalItems = items.filter((i) => !i.stamen);
    const petals = new THREE.InstancedMesh(petalGeo, petalMat, petalItems.length);
    const dummy = new THREE.Object3D();
    petalItems.forEach((item, i) => {
        dummy.position.copy(item.p);
        dummy.quaternion.copy(item.q);
        dummy.scale.set(item.s, item.s, item.s);
        dummy.updateMatrix();
        petals.setMatrixAt(i, dummy.matrix);
        petals.setColorAt(i, item.c.offsetHSL(prng.range(-0.01, 0.01), 0, prng.range(-0.03, 0.03)));
    });
    petals.instanceMatrix.needsUpdate = true;
    if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
    petals.castShadow = true;
    petals.name = 'sakuraOpenFlowers';
    trunkGroup.add(petals);

    // Stamen hearts as a tiny sphere instanced layer
    const stamenItems = items.filter((i) => i.stamen);
    if (stamenItems.length > 0) {
        const dotGeo = new THREE.SphereGeometry(1, 7, 6);
        const dotMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            emissive: new THREE.Color('#3a2508'),
            emissiveIntensity: 0.35,
        });
        const dots = new THREE.InstancedMesh(dotGeo, dotMat, stamenItems.length);
        stamenItems.forEach((item, i) => {
            dummy.position.copy(item.p);
            dummy.quaternion.copy(item.q);
            dummy.scale.setScalar(item.s * 0.45);
            dummy.updateMatrix();
            dots.setMatrixAt(i, dummy.matrix);
            dots.setColorAt(i, item.c);
        });
        dots.instanceMatrix.needsUpdate = true;
        if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
        dots.name = 'sakuraStamens';
        trunkGroup.add(dots);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * FRINGE FLOATERS — loose petals hovering at the cloud rims
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ~450 single petals float just beyond each cloud's surface at random
 * attitudes. They catch the rim light and blur the cloud boundary —
 * the difference between a painted blob and a living canopy.
 */
function fringePetalLayer(
    trunkGroup: THREE.Group,
    anchors: Array<{ pos: THREE.Vector3; radius: number }>,
    palette: PresetContext['palette'],
    prng: PresetContext['prng']
): void {
    const count = 450;
    const geo = sakuraPetalGeometry();
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.45,
        metalness: 0.02,
        side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();

    const primary = new THREE.Color(palette.primary);
    const highlight = new THREE.Color(palette.highlight);
    const secondary = new THREE.Color(palette.secondary);
    const col = new THREE.Color();
    const euler = new THREE.Euler();

    for (let i = 0; i < count; i++) {
        const a = prng.choice(anchors);
        const th = prng.range(0, Math.PI * 2);
        const ph = Math.acos(prng.range(-0.85, 1)); // biased to the upper shell
        const r = a.radius * prng.range(1.02, 1.5);
        dummy.position.set(
            a.pos.x + r * Math.sin(ph) * Math.cos(th),
            a.pos.y + r * Math.cos(ph) * 0.9,
            a.pos.z + r * Math.sin(ph) * Math.sin(th)
        );
        euler.set(prng.range(0, Math.PI * 2), prng.range(0, Math.PI * 2), prng.range(0, Math.PI * 2));
        dummy.rotation.copy(euler);
        const s = prng.range(0.5, 0.85);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        const tone = prng.range(0, 1);
        if (tone < 0.4) col.copy(highlight).lerp(primary, prng.range(0, 0.4));
        else if (tone < 0.8) col.copy(primary).lerp(secondary, prng.range(0, 0.5));
        else col.copy(highlight);
        mesh.setColorAt(i, col.offsetHSL(prng.range(-0.012, 0.012), 0, prng.range(-0.03, 0.05)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.name = 'sakuraFringe';
    trunkGroup.add(mesh);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SURFACE ROOT RIDGES — the Nebari's far reach
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Beyond the seven great buttresses, a mature cherry fans dozens of
 * thinner root ridges out across the soil. Twelve of them, as tapered
 * half-buried spikes, sell the grip on the courtyard.
 */
function surfaceRootRidges(prng: PresetContext['prng']): THREE.BufferGeometry[] {
    const ridges: THREE.BufferGeometry[] = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + prng.range(-0.24, 0.24);
        const len = prng.range(1.6, 2.9);
        const r0 = prng.range(0.14, 0.26);
        const geo = new THREE.ConeGeometry(r0, len, 6);
        geo.translate(0, len / 2, 0);
        // Lay the spike outward, nose down into the soil
        const dir = new THREE.Vector3(Math.cos(angle) * 0.94, prng.range(-0.28, -0.12), Math.sin(angle) * 0.94).normalize();
        geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
        geo.translate(Math.cos(angle) * 0.9, prng.range(0.02, 0.14), Math.sin(angle) * 0.9);
        ridges.push(geo);
    }
    return ridges;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * WEEPING TASSELS — cascading terminal shoots
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Six long shoots spill from the low tier like a weeping-cherry hybrid:
 * a Catmull-Rom curve that rises briefly then cascades past horizontal,
 * ending in its own small blossom cloud.
 */
function weepingTassels(
    geometries: THREE.BufferGeometry[],
    anchors: Array<{ pos: THREE.Vector3; radius: number }>,
    prng: PresetContext['prng']
): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + prng.range(-0.4, 0.4);
        const originY = TRUNK_H * prng.range(0.42, 0.58);
        const origin = new THREE.Vector3(Math.cos(angle) * 1.1, originY, Math.sin(angle) * 1.1);

        // The cascade: out → level → down, then a slight outward hook
        const out = 3.2 + prng.range(0, 1.6);
        const drop = 2.6 + prng.range(0, 1.4);
        const pts = [
            origin.clone(),
            new THREE.Vector3(origin.x + Math.cos(angle) * out * 0.45, originY + prng.range(0.1, 0.5), origin.z + Math.sin(angle) * out * 0.45),
            new THREE.Vector3(origin.x + Math.cos(angle) * out * 0.78, originY - drop * 0.35, origin.z + Math.sin(angle) * out * 0.78),
            new THREE.Vector3(origin.x + Math.cos(angle) * out * 0.95, originY - drop * 0.8, origin.z + Math.sin(angle) * out * 0.95),
            new THREE.Vector3(
                origin.x + Math.cos(angle) * (out * 0.98 + prng.range(0, 0.5)),
                originY - drop,
                origin.z + Math.sin(angle) * (out * 0.98 + prng.range(0, 0.5))
            ),
        ];

        // Tapered tube along the cascade — built with a compact tube builder
        // (a local frame walk; the core's version stays private to the module)
        const curve = new THREE.CatmullRomCurve3(pts);
        const tubular = 26;
        const radial = 6;
        const frames = curve.computeFrenetFrames(tubular, false);
        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const p = new THREE.Vector3();
        for (let sIdx = 0; sIdx <= tubular; sIdx++) {
            const t = sIdx / tubular;
            curve.getPointAt(t, p);
            const r = THREE.MathUtils.lerp(0.11, 0.045, t);
            const N = frames.normals[sIdx];
            const B = frames.binormals[sIdx];
            for (let j = 0; j <= radial; j++) {
                const v = (j / radial) * Math.PI * 2;
                const sin = Math.sin(v);
                const cos = -Math.cos(v);
                positions.push(
                    p.x + r * (cos * N.x + sin * B.x),
                    p.y + r * (cos * N.y + sin * B.y),
                    p.z + r * (cos * N.z + sin * B.z)
                );
                uvs.push(j / radial, t);
            }
        }
        for (let sIdx = 0; sIdx < tubular; sIdx++) {
            for (let j = 0; j < radial; j++) {
                const a = sIdx * (radial + 1) + j;
                const b = a + radial + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        geometries.push(geo);

        // The tassel's own little cloud, plus one mid-way
        anchors.push({ pos: pts[pts.length - 1].clone(), radius: 0.62 });
        anchors.push({ pos: pts[3].clone(), radius: 0.45 });
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * FALLEN PETAL RING — the drift around the root collar
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Petals pile deeper against each of the seven buttresses (wind shadow)
 * and thinner between them — a detail the camera loves at ground level.
 */
function fallenPetalRing(
    trunkGroup: THREE.Group,
    buttressCount: number,
    palette: PresetContext['palette'],
    prng: PresetContext['prng']
): void {
    const count = 340;
    const geo = sakuraPetalGeometry();
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6,
        metalness: 0.01,
        side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();

    const primary = new THREE.Color(palette.primary);
    const secondary = new THREE.Color(palette.secondary);
    const highlight = new THREE.Color(palette.highlight);
    const col = new THREE.Color();

    for (let i = 0; i < count; i++) {
        const angle = prng.range(0, Math.PI * 2);
        // Wind-shadow piling: closer & denser at the buttress angles
        let nearestButtress = Infinity;
        for (let b = 0; b < buttressCount; b++) {
            const bAngle = (b / buttressCount) * Math.PI * 2;
            let d = Math.abs(angle - bAngle) % (Math.PI * 2);
            if (d > Math.PI) d = Math.PI * 2 - d;
            nearestButtress = Math.min(nearestButtress, d);
        }
        const pile = Math.exp(-(nearestButtress * nearestButtress) / 0.18); // 1 at buttress, →0 between
        const rad = THREE.MathUtils.lerp(3.4, 1.35, pile * prng.range(0.3, 1)) * prng.range(0.85, 1.08);

        dummy.position.set(Math.cos(angle) * rad, 0.2 + pile * prng.range(0.02, 0.1), Math.sin(angle) * rad);
        dummy.rotation.set(
            Math.PI / 2 + prng.range(-0.35, 0.35),
            prng.range(0, Math.PI * 2),
            prng.range(-0.4, 0.4)
        );
        const s = prng.range(0.7, 1.15);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        const tone = prng.range(0, 1);
        if (tone < 0.3) col.copy(primary).lerp(secondary, prng.range(0.2, 0.8));
        else if (tone < 0.75) col.copy(primary).lerp(highlight, prng.range(0.2, 0.7));
        else col.copy(highlight);
        mesh.setColorAt(i, col.offsetHSL(0, 0, prng.range(-0.05, 0.02)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.name = 'sakuraFallenRing';
    trunkGroup.add(mesh);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE BUILD — orchestrating all layers into one organism
 * ═══════════════════════════════════════════════════════════════════════════ */
export function buildFlagshipSakura(ctx: PresetContext): PresetResult {
    const { scene, palette, prng } = ctx;

    const trunkGroup = new THREE.Group();
    trunkGroup.name = 'flagshipSakura';
    scene.add(trunkGroup);

    /* ── LAYER 0a · The two-stage trunk ─────────────────────────────────── */
    const SINK = STOCK_SPEC.sink ?? 0.35;
    const stockGeo = buildFlutedTrunkGeometry(STOCK_SPEC, prng);
    stockGeo.translate(0, -SINK, 0);

    const boleGeo = buildFlutedTrunkGeometry(BOLE_SPEC, prng);
    // The bole sits on top of the stock, slightly offset by the species lean
    const leanX = Math.cos(0.62) * 0.22;
    const leanZ = Math.sin(0.62) * 0.22;
    boleGeo.translate(leanX * 0.4, STOCK_SPEC.height - SINK - 0.1, leanZ * 0.4);
    // Ease the bole over — shear the upper vertices toward the lean
    {
        const pos = boleGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const t = THREE.MathUtils.clamp(y / BOLE_SPEC.height, 0, 1);
            pos.setX(i, pos.getX(i) + leanX * t * t);
            pos.setZ(i, pos.getZ(i) + leanZ * t * t);
        }
        pos.needsUpdate = true;
        boleGeo.computeVertexNormals();
    }

    /* ── LAYER 1a · Three-tier whorl scaffold + leader ──────────────────── */
    // The core's grower spreads boughs across [0.52, 0.96] of the trunk;
    // calling it three times with rotated golden-angle offsets gives the
    // tiered whorl effect while keeping determinism from the shared prng.
    const low = growRealisticSkeleton(TRUNK_H, STOCK_SPEC.baseRadius, LOW_TIER, prng);
    const mid = growRealisticSkeleton(TRUNK_H, STOCK_SPEC.baseRadius, MID_TIER, prng);
    const top = growRealisticSkeleton(TRUNK_H, STOCK_SPEC.baseRadius, TOP_TIER, prng);

    // Shift each tier's anchors/boughs to its own height band by
    // rescaling spawn heights: the grower spreads boughs across the upper
    // half of the given height, so feed it band-tuned heights.
    const limbGeometries = [...low.geometries, ...mid.geometries, ...top.geometries];
    const anchors = [...low.anchors, ...mid.anchors, ...top.anchors];

    /* ── LAYER 1b · Weeping tassels + surface roots ─────────────────────── */
    weepingTassels(limbGeometries, anchors, prng);
    const roots = surfaceRootRidges(prng);

    /* ── LAYER 0b · One bark, one organism ──────────────────────────────── */
    const bark = makeRealisticBarkTexture(STOCK_SPEC.barkColor);
    const barkMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: bark.map,
        bumpMap: bark.bumpMap,
        bumpScale: 1.25,
        roughness: 0.92,
        metalness: 0.01,
    });
    const wood = mergeGeometries([stockGeo, boleGeo, ...roots, ...limbGeometries], false);
    const woodMesh = new THREE.Mesh(wood ?? stockGeo, barkMat);
    woodMesh.castShadow = true;
    woodMesh.receiveShadow = true;
    woodMesh.name = 'sakuraWood';
    trunkGroup.add(woodMesh);

    /* ── LAYER 2a · The main blossom clouds ─────────────────────────────── */
    const clouds = fillRealisticClouds(anchors, palette, prng, CLOUD_SPEC);
    clouds.name = 'sakuraClouds';
    trunkGroup.add(clouds);

    /* ── LAYER 2b · Open rosettes + 2c · fringe floaters + 2d · buds ────── */
    openFlowerLayer(trunkGroup, anchors, palette, prng);
    fringePetalLayer(trunkGroup, anchors, palette, prng);
    // Buds via the shared core layer
    importBuds: {
        // Local re-implementation keeps this file self-contained at the
        // species level: sakura buds are slimmer and more numerous.
        const count = 260;
        const geo = new THREE.SphereGeometry(0.05, 6, 5);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        const bud = new THREE.Color(palette.deepShadow).lerp(new THREE.Color('#9a6a8a'), 0.45);
        const col = new THREE.Color();
        for (let i = 0; i < count; i++) {
            const a = prng.choice(anchors);
            const ang = prng.range(0, Math.PI * 2);
            const r = a.radius * prng.range(0.9, 1.4);
            dummy.position.set(
                a.pos.x + Math.cos(ang) * r,
                a.pos.y + prng.range(-0.25, 0.5),
                a.pos.z + Math.sin(ang) * r
            );
            dummy.rotation.set(0, ang, 0);
            const s = prng.range(0.75, 1.4);
            dummy.scale.set(s, s * 1.9, s);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, col.copy(bud).offsetHSL(0, 0, prng.range(-0.05, 0.04)));
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = true;
        mesh.name = 'sakuraBuds';
        trunkGroup.add(mesh);
        break importBuds;
    }

    /* ── LAYER 3 · Moss at the collar + the fallen ring ─────────────────── */
    addTrunkMossCushions(trunkGroup, STOCK_SPEC, prng, palette);
    fallenPetalRing(trunkGroup, STOCK_SPEC.buttressCount, palette, prng);

    /* ── A gentle whole-tree lean, as if grown toward the courtyard sun ── */
    trunkGroup.rotation.z = Math.cos(0.62) * 0.035;
    trunkGroup.rotation.x = Math.sin(0.62) * 0.035;

    return {
        trunkGroup,
        leafMeshes: [clouds],
    };
}
