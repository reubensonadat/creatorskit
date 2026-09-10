/**
 * SAKURA TREE preset — the classic blooming cherry with muscular Nebari roots,
 * wide boughs that sag under clouds of notched pink petals, and moss cushions
 * cradled in the bark crevices of its ancient trunk.
 */

import * as THREE from 'three';
import { PRNG } from '../prng';
import { growTreeSkeleton, buildBarkMesh, fillBlossomClouds, addBarkMossCushions } from './tree-core';
import type { KeepsakePalette, KeepsakePresetResult } from '../types';

export function buildSakuraTree(palette: KeepsakePalette, seed: string): KeepsakePresetResult {
    const group = new THREE.Group();
    group.name = 'sakuraTree';

    const prng = new PRNG(seed).fork('sakura');

    const skeleton = growTreeSkeleton(
        seed,
        {
            height: 7.4,
            baseRadius: 0.98,
            taper: 0.52,
            flareAmp: 0.5,
            flareTau: 0.9,
            fluteCount: 6,
            fluteAmpBase: 0.075,
            fluteAmpTop: 0.02,
            fluteTwist: 0.5,
            buttressCount: 7,
            buttressAmp: 0.62,
            buttressTau: 1.05,
            buttressSpread: 0.55,
            noiseAmp: 0.045,
            lean: 0.035,
            leanDirection: prng.range(0, Math.PI * 2),
            sink: 0.5, // grips below the garden floor (-0.42)
            seed,
        },
        {
            depth: 4,
            boughCount: [5, 7],
            boughLength: [3.4, 4.9],
            boughRadius: [0.2, 0.3],
            lengthFall: 0.72,
            radiusFall: 0.56,
            sag: 0.085,       // heavy blossom load pulls boughs down
            tipLift: 0.1,     // …then tips sweep up toward the sun
            upBias: 0.016,
            wander: 0.14,
            spawnAnchorEvery: 1,
        },
        prng
    );

    group.add(buildBarkMesh(skeleton.trunkInfo, skeleton.branchGeometries, palette, seed));
    addBarkMossCushions(group, skeleton.trunkInfo, palette, prng, 95);

    const clouds = fillBlossomClouds(
        skeleton.anchors,
        palette,
        prng,
        {
            petalsPerUnit: 22,
            cloudRadius: [0.9, 1.5],
            flattenY: 0.8,
            openFlowerChance: 0.16,
        },
        { notch: 0.22, cup: 0.075, curl: 0.11, length: 0.3, width: 0.27 }
    );
    group.add(clouds);

    let topY = 0;
    skeleton.anchors.forEach((a) => {
        topY = Math.max(topY, a.pos.y + a.radius);
    });

    return {
        group,
        rootAngles: skeleton.trunkInfo.buttressAngles,
        canopyFootprint: 6.6,
        canopyTopY: topY,
    };
}
