/**
 * LAVENDER WISTERIA preset — a gnarled little trunk beneath a broad leafy
 * canopy, from which dozens of living racemes cascade like lavender rain.
 * Each hanging cluster graduates from deep violet at the crown to pale silk
 * at the dripping tips.
 */

import * as THREE from 'three';
import { PRNG } from '../prng';
import {
    growTreeSkeleton,
    buildBarkMesh,
    addBarkMossCushions,
} from './tree-core';
import {
    createFloretGeometry,
    createLeafGeometry,
    createPetalMaterial,
    taperedTubeGeometry,
    InstanceBag,
    jitterHSL,
} from '../geometry';
import type { KeepsakePalette, KeepsakePresetResult } from '../types';

export function buildWisteria(palette: KeepsakePalette, seed: string): KeepsakePresetResult {
    const group = new THREE.Group();
    group.name = 'wisteria';

    const prng = new PRNG(seed).fork('wisteria');

    // ── Gnarled, leaning trunk with an umbrella crown ──
    const skeleton = growTreeSkeleton(
        seed,
        {
            height: 4.8,
            baseRadius: 0.62,
            taper: 0.6,
            flareAmp: 0.32,
            flareTau: 0.7,
            fluteCount: 5,
            fluteAmpBase: 0.11,      // deeply fluted, twisted old wood
            fluteAmpTop: 0.04,
            fluteTwist: 1.1,
            buttressCount: 5,
            buttressAmp: 0.38,
            buttressTau: 0.8,
            buttressSpread: 0.5,
            noiseAmp: 0.075,
            lean: 0.09,
            leanDirection: prng.range(0, Math.PI * 2),
            sink: 0.5,
            seed,
        },
        {
            depth: 3,
            boughCount: [5, 6],
            boughLength: [2.6, 3.6],
            boughRadius: [0.13, 0.19],
            lengthFall: 0.68,
            radiusFall: 0.55,
            sag: 0.07,
            tipLift: 0.06,
            upBias: 0.03,      // flat, spreading umbrella
            wander: 0.16,
            spawnAnchorEvery: 1,
        },
        prng
    );

    group.add(buildBarkMesh(skeleton.trunkInfo, skeleton.branchGeometries, palette, seed));
    addBarkMossCushions(group, skeleton.trunkInfo, palette, prng, 70);

    const leafGreen = new THREE.Color(palette.undergrowth.herb);
    const leafDeep = new THREE.Color(palette.canopy.deep);

    // ── Canopy: soft green-violet leaf clouds ──
    const leafBag = new InstanceBag();
    const leafGeo = createLeafGeometry(0.3, 0.17);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    const temp = new THREE.Color();

    const racemeOrigins: THREE.Vector3[] = [];

    for (const anchor of skeleton.anchors) {
        const R = THREE.MathUtils.clamp(prng.range(0.9, 1.4) * anchor.radius, 0.6, 2.0);
        const count = Math.max(10, Math.round(R * 16));
        for (let i = 0; i < count; i++) {
            const rr = Math.pow(prng.next(), 0.6);
            const th = prng.range(0, Math.PI * 2);
            const ph = Math.acos(prng.range(-1, 1));
            pos.set(
                anchor.pos.x + rr * R * Math.sin(ph) * Math.cos(th),
                anchor.pos.y + rr * R * Math.cos(ph) * 0.55,
                anchor.pos.z + rr * R * Math.sin(ph) * Math.sin(th)
            );
            euler.set(prng.range(0, Math.PI), prng.range(0, Math.PI * 2), prng.range(0, Math.PI));
            quat.setFromEuler(euler);
            const s = prng.range(0.8, 1.4);
            scale.set(s, s, s);
            temp.copy(leafGreen).lerp(leafDeep, prng.range(0, 0.22));
            jitterHSL(temp, prng, 0.015, 0.04, 0.05);
            leafBag.add(pos, quat, scale, temp);
        }
        racemeOrigins.push(anchor.pos.clone());
        // Extra raceme anchor slightly below the cloud fringe
        if (prng.bool(0.4)) {
            racemeOrigins.push(
                new THREE.Vector3(anchor.pos.x, anchor.pos.y - R * 0.35, anchor.pos.z)
            );
        }
    }

    const leafMat = createPetalMaterial('#f1e6ff', { rimStrength: 0.3, roughness: 0.6 });
    group.add(
        leafBag.build(leafGeo, leafMat, { castShadow: true, receiveShadow: true, name: 'wisteriaLeaves' })
    );

    // ── Cascading racemes: lavender rain ──
    const floretBag = new InstanceBag();
    const stemGeos: THREE.BufferGeometry[] = [];
    const racemeDeep = new THREE.Color(palette.canopy.deep);
    const racemeMid = new THREE.Color(palette.canopy.secondary);
    const racemeTip = new THREE.Color(palette.canopy.highlight);

    for (const origin of racemeOrigins) {
        const length = prng.range(2.1, 3.8);
        const swayDir = prng.range(0, Math.PI * 2);
        const swayAmt = prng.range(0.25, 0.75);

        // Hanging spine: gentle S-curve drifting sideways as it falls
        const pts: THREE.Vector3[] = [];
        const nSeg = 7;
        for (let i = 0; i <= nSeg; i++) {
            const t = i / nSeg;
            pts.push(
                new THREE.Vector3(
                    origin.x + Math.sin(t * Math.PI * 0.9) * swayAmt * Math.cos(swayDir),
                    origin.y - length * t,
                    origin.z + Math.sin(t * Math.PI * 0.9) * swayAmt * Math.sin(swayDir)
                )
            );
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        stemGeos.push(
            taperedTubeGeometry(curve, (t) => THREE.MathUtils.lerp(0.028, 0.008, t), nSeg, 5, true)
        );

        // Florets along the spine, denser near the crown, opening near the tip
        const florets = Math.round(length * 16);
        for (let f = 0; f < florets; f++) {
            const t = prng.range(0.06, 0.98);
            const p = curve.getPointAt(t);
            // Florets jut outward and downward from the spine
            const a = prng.range(0, Math.PI * 2);
            const outR = 0.1 + 0.14 * Math.sin(Math.PI * Math.min(1, t * 1.2));
            pos.set(p.x + Math.cos(a) * outR, p.y - 0.03, p.z + Math.sin(a) * outR);

            // Face outward, keel down
            euler.set(
                prng.range(0.9, 1.5),
                a + Math.PI / 2,
                prng.range(-0.2, 0.2),
                'YXZ'
            );
            quat.setFromEuler(euler);
            const s = prng.range(0.8, 1.25);
            scale.set(s, s, s);

            // Violet crown → pale silk tip
            if (t < 0.4) temp.copy(racemeDeep).lerp(racemeMid, t / 0.4);
            else temp.copy(racemeMid).lerp(racemeTip, (t - 0.4) / 0.6);
            jitterHSL(temp, prng, 0.013, 0.035, 0.04);
            floretBag.add(pos, quat, scale, temp);
        }
    }

    const floretMat = createPetalMaterial(palette.canopy.highlight, { rimStrength: 0.6, roughness: 0.45 });
    group.add(
        floretBag.build(createFloretGeometry(0.085), floretMat, {
            castShadow: true,
            receiveShadow: true,
            name: 'wisteriaRacemes',
        })
    );

    // Merge the thin raceme stems into one bark-tinted mesh
    const stemMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.barkTint).lerp(new THREE.Color(palette.canopy.deep), 0.35),
        roughness: 0.85,
    });
    const mergedStems = mergeStemGeos(stemGeos);
    const stemMesh = new THREE.Mesh(mergedStems, stemMat);
    stemMesh.castShadow = true;
    stemMesh.name = 'racemeStems';
    group.add(stemMesh);

    let topY = 0;
    skeleton.anchors.forEach((a) => {
        topY = Math.max(topY, a.pos.y + a.radius);
    });

    return {
        group,
        rootAngles: skeleton.trunkInfo.buttressAngles,
        canopyFootprint: 5.6,
        canopyTopY: topY,
    };
}

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function mergeStemGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
    return mergeGeometries(list, false) || list[0];
}
