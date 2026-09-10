/**
 * FROST TREE preset — a tall winter sentinel silvered with frost. Slender
 * boughs rise at the tips (frost weighs nothing), carrying airy clouds of
 * small winter-white florets and edelweiss. Frost-sage cushions hug the
 * silver bark, pale marble pavers glow below — and because the drifting
 * breeze is palette-bound, this crown sheds soft white snow-flakes.
 */

import * as THREE from 'three';
import { PRNG } from '../prng';
import { growTreeSkeleton, buildBarkMesh, fillBlossomClouds, addBarkMossCushions } from './tree-core';
import type { KeepsakePalette, KeepsakePresetResult } from '../types';

export function buildFrostTree(palette: KeepsakePalette, seed: string): KeepsakePresetResult {
    const group = new THREE.Group();
    group.name = 'frostTree';

    const prng = new PRNG(seed).fork('frost');

    const skeleton = growTreeSkeleton(
        seed,
        {
            height: 7.8,
            baseRadius: 0.88,
            taper: 0.46,
            flareAmp: 0.48,
            flareTau: 0.9,
            fluteCount: 6,
            fluteAmpBase: 0.07,
            fluteAmpTop: 0.025,
            fluteTwist: 0.6,
            buttressCount: 6,
            buttressAmp: 0.5,
            buttressTau: 1.0,
            buttressSpread: 0.48,
            noiseAmp: 0.05,
            lean: 0.03,
            leanDirection: prng.range(0, Math.PI * 2),
            sink: 0.5, // grips below the garden floor (-0.42)
            seed,
        },
        {
            depth: 4,
            boughCount: [6, 8],
            boughLength: [3.0, 4.2],
            boughRadius: [0.16, 0.24],
            lengthFall: 0.7,
            radiusFall: 0.55,
            sag: 0.06,        // frost weighs nothing — boughs stay light
            tipLift: 0.13,    // tips rise toward the pale sun
            upBias: 0.02,
            wander: 0.16,
            spawnAnchorEvery: 1,
        },
        prng
    );

    group.add(buildBarkMesh(skeleton.trunkInfo, skeleton.branchGeometries, palette, seed));
    // Frost-sage cushions cling further up the silvery bark
    addBarkMossCushions(group, skeleton.trunkInfo, palette, prng, 110);

    // Airy frost clouds: small, delicate, sparkling white florets
    const clouds = fillBlossomClouds(
        skeleton.anchors,
        palette,
        prng,
        {
            petalsPerUnit: 24,
            cloudRadius: [0.8, 1.3],
            flattenY: 0.85,
            openFlowerChance: 0.08, // occasional edelweiss-like stars
        },
        { notch: 0.28, cup: 0.06, curl: 0.14, length: 0.22, width: 0.19 }
    );
    group.add(clouds);

    let topY = 0;
    skeleton.anchors.forEach((a) => {
        topY = Math.max(topY, a.pos.y + a.radius);
    });

    return {
        group,
        rootAngles: skeleton.trunkInfo.buttressAngles,
        canopyFootprint: 6.4,
        canopyTopY: topY,
    };
}
