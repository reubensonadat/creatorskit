/**
 * GOLDEN GINKGO preset — the ancient temple tree. Stately, more upright
 * branching, an amber-gold crown of fluttering fan leaves, silver-pink
 * berries, and amber moss cushions pressed into its coarse bark.
 */

import * as THREE from 'three';
import { PRNG } from '../prng';
import {
    growTreeSkeleton,
    buildBarkMesh,
    addBarkMossCushions,
} from './tree-core';
import {
    createGinkgoLeafGeometry,
    createBerryGeometry,
    createPetalMaterial,
    InstanceBag,
    jitterHSL,
} from '../geometry';
import type { KeepsakePalette, KeepsakePresetResult } from '../types';

export function buildGinkgoTree(palette: KeepsakePalette, seed: string): KeepsakePresetResult {
    const group = new THREE.Group();
    group.name = 'ginkgoTree';

    const prng = new PRNG(seed).fork('ginkgo');

    const skeleton = growTreeSkeleton(
        seed,
        {
            height: 6.9,
            baseRadius: 0.92,
            taper: 0.5,
            flareAmp: 0.46,
            flareTau: 0.85,
            fluteCount: 5,
            fluteAmpBase: 0.09,
            fluteAmpTop: 0.025,
            fluteTwist: 0.4,
            buttressCount: 6,
            buttressAmp: 0.55,
            buttressTau: 0.95,
            buttressSpread: 0.5,
            noiseAmp: 0.05,
            lean: 0.02,
            leanDirection: prng.range(0, Math.PI * 2),
            sink: 0.5,
            seed,
        },
        {
            depth: 4,
            boughCount: [6, 8],
            boughLength: [3.0, 4.4],
            boughRadius: [0.18, 0.27],
            lengthFall: 0.7,
            radiusFall: 0.55,
            sag: 0.05,       // ginkgo boughs are stiffer — only a graceful droop
            tipLift: 0.13,   // signature upward-swept tips
            upBias: 0.02,
            wander: 0.12,
            spawnAnchorEvery: 1,
        },
        prng
    );

    group.add(buildBarkMesh(skeleton.trunkInfo, skeleton.branchGeometries, palette, seed));
    addBarkMossCushions(group, skeleton.trunkInfo, palette, prng, 110);

    // ── Golden fan-leaf canopy in irregular puffy clouds ──
    const leafBag = new InstanceBag();
    const berryBag = new InstanceBag();

    const deep = new THREE.Color(palette.canopy.deep);
    const secondary = new THREE.Color(palette.canopy.secondary);
    const primary = new THREE.Color(palette.canopy.primary);
    const highlight = new THREE.Color(palette.canopy.highlight);
    const berryColor = new THREE.Color('#e8b8a0');
    const temp = new THREE.Color();

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();

    for (const anchor of skeleton.anchors) {
        const R = THREE.MathUtils.clamp(
            prng.range(0.9, 1.5) * anchor.radius,
            0.7,
            2.4
        );
        const count = Math.max(12, Math.round(R * 27));

        for (let i = 0; i < count; i++) {
            const rr = Math.pow(prng.next(), 0.6);
            const th = prng.range(0, Math.PI * 2);
            const ph = Math.acos(prng.range(-1, 1));
            pos.set(
                anchor.pos.x + rr * R * Math.sin(ph) * Math.cos(th),
                anchor.pos.y + rr * R * Math.cos(ph) * 0.82,
                anchor.pos.z + rr * R * Math.sin(ph) * Math.sin(th)
            );

            euler.set(
                prng.range(0, Math.PI * 2),
                prng.range(0, Math.PI * 2),
                prng.range(0, Math.PI * 2)
            );
            quat.setFromEuler(euler);

            const s = prng.range(0.85, 1.65) * (1.2 - rr * 0.3);
            scale.set(s, s * prng.range(0.9, 1.1), s);

            const alt = THREE.MathUtils.clamp((pos.y - (anchor.pos.y - R)) / (2 * R), 0, 1);
            if (alt < 0.3) temp.copy(deep).lerp(secondary, alt / 0.3);
            else if (alt < 0.72) temp.copy(secondary).lerp(primary, (alt - 0.3) / 0.42);
            else temp.copy(primary).lerp(highlight, (alt - 0.72) / 0.28);
            jitterHSL(temp, prng, 0.016, 0.04, 0.05);

            leafBag.add(pos, quat, scale, temp);
        }

        // Silver-pink berries tucked in the crown
        const berries = Math.round(R * 3);
        for (let i = 0; i < berries; i++) {
            const rr = Math.pow(prng.next(), 0.7);
            const th = prng.range(0, Math.PI * 2);
            pos.set(
                anchor.pos.x + rr * R * 0.8 * Math.cos(th),
                anchor.pos.y + (prng.next() - 0.5) * R * 0.7,
                anchor.pos.z + rr * R * 0.8 * Math.sin(th)
            );
            quat.identity();
            const s = prng.range(0.7, 1.2);
            berryBag.add(pos, quat, new THREE.Vector3(s, s, s), jitterHSL(berryColor, prng, 0.01, 0.03, 0.04));
        }
    }

    const leafMat = createPetalMaterial(palette.canopy.highlight, { rimStrength: 0.42, roughness: 0.5 });
    const leaves = leafBag.build(createGinkgoLeafGeometry(0.32), leafMat, {
        castShadow: true,
        receiveShadow: true,
        name: 'ginkgoCrown',
    });
    group.add(leaves);

    const berryMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 });
    group.add(berryBag.build(createBerryGeometry(0.055), berryMat, { name: 'ginkgoBerries', castShadow: false }));

    let topY = 0;
    skeleton.anchors.forEach((a) => {
        topY = Math.max(topY, a.pos.y + a.radius);
    });

    return {
        group,
        rootAngles: skeleton.trunkInfo.buttressAngles,
        canopyFootprint: 6.2,
        canopyTopY: topY,
    };
}
