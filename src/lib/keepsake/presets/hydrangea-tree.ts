/**
 * HYDRANGEA TREE preset — a broad-crowned mophead hydrangea grown on a stout
 * fluted trunk. Over-sized cornflower florets (deep sky-blue shadow → white
 * sunlit rim) billow into round clouds that weigh the boughs down, while cool
 * mist-grey pavers and sea-green moss harmonize the ground beneath.
 */

import * as THREE from 'three';
import { PRNG } from '../prng';
import { growTreeSkeleton, buildBarkMesh, fillBlossomClouds, addBarkMossCushions } from './tree-core';
import type { KeepsakePalette, KeepsakePresetResult } from '../types';

export function buildHydrangeaTree(palette: KeepsakePalette, seed: string): KeepsakePresetResult {
    const group = new THREE.Group();
    group.name = 'hydrangeaTree';

    const prng = new PRNG(seed).fork('hydrangea');

    const skeleton = growTreeSkeleton(
        seed,
        {
            height: 6.4,
            baseRadius: 0.92,
            taper: 0.5,
            flareAmp: 0.5,
            flareTau: 0.9,
            fluteCount: 6,
            fluteAmpBase: 0.07,
            fluteAmpTop: 0.02,
            fluteTwist: 0.55,
            buttressCount: 6,
            buttressAmp: 0.55,
            buttressTau: 1.0,
            buttressSpread: 0.5,
            noiseAmp: 0.045,
            lean: 0.04,
            leanDirection: prng.range(0, Math.PI * 2),
            sink: 0.5, // grips below the garden floor (-0.42)
            seed,
        },
        {
            depth: 4,
            boughCount: [6, 8],       // wide umbrella crown
            boughLength: [3.2, 4.4],
            boughRadius: [0.19, 0.28],
            lengthFall: 0.72,
            radiusFall: 0.56,
            sag: 0.1,                 // heavy mopheads weigh the boughs down
            tipLift: 0.09,
            upBias: 0.014,
            wander: 0.13,
            spawnAnchorEvery: 1,
        },
        prng
    );

    group.add(buildBarkMesh(skeleton.trunkInfo, skeleton.branchGeometries, palette, seed));
    addBarkMossCushions(group, skeleton.trunkInfo, palette, prng, 85);

    // Mophead clouds: over-sized round florets, billowing globe masses.
    // Fewer, larger petals than the sakura — hydrangea florets read big.
    const clouds = fillBlossomClouds(
        skeleton.anchors,
        palette,
        prng,
        {
            petalsPerUnit: 13,
            cloudRadius: [1.05, 1.65],
            flattenY: 0.92, // rounder, globe-like mopheads
            openFlowerChance: 0.1,
        },
        { notch: 0.12, cup: 0.1, curl: 0.06, length: 0.38, width: 0.34 }
    );
    group.add(clouds);

    let topY = 0;
    skeleton.anchors.forEach((a) => {
        topY = Math.max(topY, a.pos.y + a.radius);
    });

    return {
        group,
        rootAngles: skeleton.trunkInfo.buttressAngles,
        canopyFootprint: 6.9,
        canopyTopY: topY,
    };
}
