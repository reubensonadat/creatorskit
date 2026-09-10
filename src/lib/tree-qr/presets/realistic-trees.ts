/**
 * REALISTIC BOTANICAL PRESETS — species-true QR courtyard centerpieces.
 *
 * Every preset is a thin configuration over the shared realistic core:
 * a fluted Nebari trunk, boughs that sag under their blossom load, and
 * puffy altitude-gradient clouds. Species differ in silhouette, bark,
 * leaf geometry and cloud texture — so the courtyard truly grows a
 * maple, a ginkgo, a magnolia… not just a recolored cherry tree.
 */

import * as THREE from 'three';
import { realisticTree } from './realistic-core';
import type { PresetBuilder } from './types';

/* ── SAKURA — the classic blooming cherry, heavy with notched petals ── */
export const buildRealisticSakura: PresetBuilder = realisticTree({
    trunk: {
        height: 7.8,
        baseRadius: 1.05,
        taper: 0.5,
        fluteCount: 6,
        fluteAmp: 0.08,
        fluteTwist: 0.5,
        buttressCount: 7,
        buttressAmp: 0.6,
        buttressSpread: 0.55,
        lean: 0.03,
        leanDirection: 0.8,
        barkColor: 0x4a3324,
        sink: 0.35,
    },
    branch: {
        depth: 5,
        boughCount: [7, 9],
        boughLength: [4.6, 6.4],
        boughRadius: [0.28, 0.39],
        lengthFall: 0.72,
        radiusFall: 0.62,
        sag: 0.085, // heavy blossom load
        tipLift: 0.1,
        upBias: 0.016,
        wander: 0.14,
    },
    cloud: {
        petalsPerUnit: 18,
        cloudRadius: [1.05, 1.6],
        flattenY: 0.85,
        petalScale: 0.34,
        openFlowerChance: 0.16,
        shape: 'teardrop',
    },
});

/* ── MAPLE — a true palmate-leaf Japanese maple, wide and layered ── */
export const buildRealisticMaple: PresetBuilder = realisticTree({
    trunk: {
        height: 7.2,
        baseRadius: 0.95,
        taper: 0.46,
        fluteCount: 5,
        fluteAmp: 0.09,
        fluteTwist: 0.7,
        buttressCount: 6,
        buttressAmp: 0.5,
        buttressSpread: 0.5,
        lean: 0.05,
        leanDirection: 2.4,
        barkColor: 0x54443a,
        sink: 0.35,
    },
    branch: {
        depth: 5,
        boughCount: [6, 8],
        boughLength: [4.2, 5.8],
        boughRadius: [0.23, 0.34],
        lengthFall: 0.74,
        radiusFall: 0.62,
        sag: 0.05, // light palmate leaves — boughs stay buoyant
        tipLift: 0.14,
        upBias: 0.02,
        wander: 0.16,
    },
    cloud: {
        petalsPerUnit: 16,
        cloudRadius: [1.0, 1.5],
        flattenY: 0.78, // layered, cloud-pruned silhouette
        petalScale: 0.52,
        openFlowerChance: 0.04,
        shape: 'maple',
    },
});

/* ── GINKGO — golden fan leaves on a pagoda-tiered crown, with berries ── */
export const buildRealisticGinkgo: PresetBuilder = realisticTree({
    trunk: {
        height: 7.0,
        baseRadius: 0.95,
        taper: 0.48,
        fluteCount: 6,
        fluteAmp: 0.075,
        fluteTwist: 0.45,
        buttressCount: 6,
        buttressAmp: 0.52,
        buttressSpread: 0.52,
        lean: 0.035,
        leanDirection: 4.1,
        barkColor: 0x6a5a48,
        sink: 0.35,
    },
    branch: {
        depth: 5,
        boughCount: [7, 9],
        boughLength: [4.0, 5.6],
        boughRadius: [0.23, 0.34],
        lengthFall: 0.72,
        radiusFall: 0.62,
        sag: 0.05,
        tipLift: 0.13,
        upBias: 0.018,
        wander: 0.13,
    },
    cloud: {
        petalsPerUnit: 18,
        cloudRadius: [0.95, 1.45],
        flattenY: 0.88,
        petalScale: 0.44,
        openFlowerChance: 0.03,
        shape: 'ginkgo',
    },
    decorate: (ctx, anchors) => {
        // Silver-pink ginkgo berries nestled among the fan leaves
        const { prng, palette } = ctx;
        const count = 220;
        const geo = new THREE.SphereGeometry(0.09, 7, 6);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        const berry = new THREE.Color(palette.highlight).lerp(new THREE.Color('#e8c9d8'), 0.5);
        for (let i = 0; i < count; i++) {
            const a = prng.choice(anchors);
            dummy.position.set(
                a.pos.x + prng.range(-a.radius, a.radius),
                a.pos.y + prng.range(-a.radius * 0.7, a.radius * 0.7),
                a.pos.z + prng.range(-a.radius, a.radius)
            );
            const s = prng.range(0.7, 1.2);
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, berry.clone().offsetHSL(0, 0, prng.range(-0.05, 0.05)));
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = true;
        ctx.scene.getObjectByName('realisticTree')?.add(mesh);
    },
});

/* ── MAGNOLIA — grand tulip petals on an elegant, airy frame ── */
export const buildMagnolia: PresetBuilder = realisticTree({
    trunk: {
        height: 7.4,
        baseRadius: 0.85,
        taper: 0.44,
        fluteCount: 5,
        fluteAmp: 0.06,
        fluteTwist: 0.4,
        buttressCount: 5,
        buttressAmp: 0.45,
        buttressSpread: 0.5,
        lean: 0.04,
        leanDirection: 1.5,
        barkColor: 0x6e6258, // silver-grey bark
        sink: 0.35,
    },
    branch: {
        depth: 5,
        boughCount: [6, 7],
        boughLength: [4.4, 6.0],
        boughRadius: [0.21, 0.31],
        lengthFall: 0.75,
        radiusFall: 0.6,
        sag: 0.06,
        tipLift: 0.12,
        upBias: 0.02,
        wander: 0.15,
    },
    cloud: {
        petalsPerUnit: 8, // few but enormous tulip petals
        cloudRadius: [0.9, 1.4],
        flattenY: 0.8,
        petalScale: 0.62,
        openFlowerChance: 0.2,
        shape: 'teardrop',
    },
});

/* ── HYDRANGEA — a broad mophead crown of oversized round florets ── */
export const buildHydrangeaTree: PresetBuilder = realisticTree({
    trunk: {
        height: 6.4,
        baseRadius: 0.95,
        taper: 0.5,
        fluteCount: 6,
        fluteAmp: 0.07,
        fluteTwist: 0.55,
        buttressCount: 6,
        buttressAmp: 0.55,
        buttressSpread: 0.5,
        lean: 0.035,
        leanDirection: 3.2,
        barkColor: 0x584b42,
        sink: 0.35,
    },
    branch: {
        depth: 5,
        boughCount: [7, 9],
        boughLength: [4.4, 6.0],
        boughRadius: [0.23, 0.33],
        lengthFall: 0.72,
        radiusFall: 0.62,
        sag: 0.1, // heavy mopheads weigh the boughs down
        tipLift: 0.09,
        upBias: 0.014,
        wander: 0.13,
    },
    cloud: {
        petalsPerUnit: 14,
        cloudRadius: [1.15, 1.75],
        flattenY: 0.92, // round, globe-like mopheads
        petalScale: 0.46,
        openFlowerChance: 0.1,
        shape: 'round',
    },
});

/* ── FROST — a winter sentinel, airy white florets, silver bark ── */
export const buildFrostTree: PresetBuilder = realisticTree({
    trunk: {
        height: 8.2,
        baseRadius: 0.88,
        taper: 0.46,
        fluteCount: 6,
        fluteAmp: 0.07,
        fluteTwist: 0.6,
        buttressCount: 6,
        buttressAmp: 0.5,
        buttressSpread: 0.48,
        lean: 0.025,
        leanDirection: 5.5,
        barkColor: 0x6b635a, // silver-grey bark
        sink: 0.35,
    },
    branch: {
        depth: 5,
        boughCount: [7, 9],
        boughLength: [4.2, 5.8],
        boughRadius: [0.2, 0.29],
        lengthFall: 0.7,
        radiusFall: 0.6,
        sag: 0.06, // frost weighs nothing
        tipLift: 0.13,
        upBias: 0.02,
        wander: 0.16,
    },
    cloud: {
        petalsPerUnit: 22,
        cloudRadius: [0.8, 1.3],
        flattenY: 0.85,
        petalScale: 0.26, // small, delicate, sparkling
        openFlowerChance: 0.08,
        shape: 'teardrop',
    },
});

/* ── OAK — a dense, generous summer crown of small rounded leaves ── */
export const buildRealisticOak: PresetBuilder = realisticTree({
    trunk: {
        height: 8.0,
        baseRadius: 1.15,
        taper: 0.52,
        fluteCount: 7,
        fluteAmp: 0.085,
        fluteTwist: 0.45,
        buttressCount: 8,
        buttressAmp: 0.62,
        buttressSpread: 0.55,
        lean: 0.02,
        leanDirection: 2.9,
        barkColor: 0x4a3626,
        sink: 0.35,
    },
    branch: {
        depth: 5,
        boughCount: [8, 10],
        boughLength: [4.6, 6.2],
        boughRadius: [0.28, 0.4],
        lengthFall: 0.73,
        radiusFall: 0.62,
        sag: 0.075,
        tipLift: 0.11,
        upBias: 0.016,
        wander: 0.14,
    },
    cloud: {
        petalsPerUnit: 26,
        cloudRadius: [1.0, 1.55],
        flattenY: 0.82,
        petalScale: 0.28,
        openFlowerChance: 0.03,
        shape: 'round',
    },
});
