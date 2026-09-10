/**
 * ZEN BONSAI preset — a century of patience in a glazed ceramic bowl.
 * A twisted, ancient little trunk rises from a mossy soil mound, its
 * foliage trained into flattened, cloud-like pads; a scattering of tiny
 * white blossoms dusts the green.
 */

import * as THREE from 'three';
import { PRNG } from '../prng';
import {
    growTreeSkeleton,
    buildBarkMesh,
} from './tree-core';
import {
    createLeafGeometry,
    createPetalMaterial,
    createPetalGeometry,
    InstanceBag,
    jitterHSL,
} from '../geometry';
import type { KeepsakePalette, KeepsakePresetResult } from '../types';

export function buildBonsai(palette: KeepsakePalette, seed: string): KeepsakePresetResult {
    const group = new THREE.Group();
    group.name = 'bonsai';
    group.position.y = -0.42; // the bowl's feet rest on the garden floor

    const prng = new PRNG(seed).fork('bonsai');

    const inner = new THREE.Group();
    inner.position.y = 1.28; // sit atop the ceramic bowl
    group.add(inner);

    // ── The gnarled elder trunk ──
    const skeleton = growTreeSkeleton(
        seed,
        {
            height: 3.1,
            baseRadius: 0.34,
            taper: 0.62,
            flareAmp: 0.18,
            flareTau: 0.4,
            fluteCount: 4,
            fluteAmpBase: 0.14,      // deeply twisted, ancient wood
            fluteAmpTop: 0.05,
            fluteTwist: 1.5,
            buttressCount: 4,
            buttressAmp: 0.2,
            buttressTau: 0.5,
            buttressSpread: 0.45,
            noiseAmp: 0.09,
            lean: 0.16,
            leanDirection: prng.range(0, Math.PI * 2),
            sink: 0.22,
            seed,
        },
        {
            depth: 3,
            boughCount: [4, 5],
            boughLength: [1.35, 1.9],
            boughRadius: [0.075, 0.11],
            lengthFall: 0.62,
            radiusFall: 0.52,
            sag: 0.05,
            tipLift: 0.03,
            upBias: 0.045,      // pads level off horizontally
            wander: 0.2,
            spawnAnchorEvery: 1,
        },
        prng
    );

    inner.add(buildBarkMesh(skeleton.trunkInfo, skeleton.branchGeometries, palette, seed));

    // ── Flattened foliage pads (cloud-pruned tiers) ──
    const leafBag = new InstanceBag();
    const blossomBag = new InstanceBag();

    const deep = new THREE.Color(palette.canopy.deep);
    const primary = new THREE.Color(palette.canopy.primary);
    const highlight = new THREE.Color(palette.canopy.highlight);
    const white = new THREE.Color(palette.undergrowth.babyBreath);
    const temp = new THREE.Color();

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();

    for (const anchor of skeleton.anchors) {
        const R = THREE.MathUtils.clamp(prng.range(0.95, 1.35) * anchor.radius, 0.45, 1.35);
        const count = Math.max(12, Math.round(R * 30));
        for (let i = 0; i < count; i++) {
            const rr = Math.pow(prng.next(), 0.55);
            const th = prng.range(0, Math.PI * 2);
            pos.set(
                anchor.pos.x + rr * R * Math.cos(th),
                anchor.pos.y + (prng.next() - 0.5) * R * 0.3, // pad-like: strongly flattened
                anchor.pos.z + rr * R * Math.sin(th)
            );
            euler.set(prng.range(-0.5, 0.5), prng.range(0, Math.PI * 2), prng.range(-0.5, 0.5));
            quat.setFromEuler(euler);
            const s = prng.range(0.75, 1.25);
            scale.set(s, s, s);
            temp.copy(deep).lerp(primary, prng.range(0.3, 1));
            if (prng.bool(0.14)) temp.copy(highlight);
            jitterHSL(temp, prng, 0.016, 0.045, 0.05);
            leafBag.add(pos, quat, scale, temp);

            // Tiny white blossoms dusted across the pads
            if (prng.bool(0.07)) {
                quat.setFromEuler(
                    euler.set(prng.range(0, Math.PI * 2), prng.range(0, Math.PI * 2), prng.range(0, Math.PI * 2))
                );
                const bs = prng.range(0.55, 0.85);
                blossomBag.add(pos, quat, new THREE.Vector3(bs, bs, bs), jitterHSL(white, prng, 0.008, 0.02, 0.02));
            }
        }
    }

    const leafMat = createPetalMaterial(palette.canopy.highlight, { rimStrength: 0.35, roughness: 0.55 });
    // Pads live in the inner (bowl-top) coordinate space, alongside the trunk
    inner.add(
        leafBag.build(createLeafGeometry(0.22, 0.13), leafMat, {
            castShadow: true,
            receiveShadow: true,
            name: 'bonsaiPads',
        })
    );
    inner.add(
        blossomBag.build(
            createPetalGeometry({ length: 0.09, width: 0.09, notch: 0.12, cup: 0.03, curl: 0.03 }),
            createPetalMaterial('#ffffff', { rimStrength: 0.65 }),
            { name: 'bonsaiBlossoms', castShadow: false }
        )
    );

    // ── Glazed ceramic bowl (indigo celadon) ──
    const bowlMat = new THREE.MeshPhysicalMaterial({
        color: 0x2e3a5c,
        roughness: 0.18,
        metalness: 0.05,
        clearcoat: 0.9,
        clearcoatRoughness: 0.25,
    });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.18, 1.05, 24, 1, false), bowlMat);
    bowl.position.y = 0.52;
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    group.add(bowl);

    // Slightly flared rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.09, 10, 26), bowlMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.04;
    rim.castShadow = true;
    group.add(rim);

    // Little ceramic feet
    const footGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.22, 10);
    for (let f = 0; f < 4; f++) {
        const a = (f / 4) * Math.PI * 2 + Math.PI / 4;
        const foot = new THREE.Mesh(footGeo, bowlMat);
        foot.position.set(Math.cos(a) * 0.95, 0.11, Math.sin(a) * 0.95);
        foot.castShadow = true;
        group.add(foot);
    }

    // ── Mossy soil mound ──
    const soilMat = new THREE.MeshStandardMaterial({
        color: 0x2c2115,
        roughness: 0.97,
    });
    const soil = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 12), soilMat);
    soil.scale.set(1, 0.24, 1);
    soil.position.y = 1.06;
    soil.castShadow = true;
    soil.receiveShadow = true;
    group.add(soil);

    const mossBag = new InstanceBag();
    const mossColor = new THREE.Color(palette.undergrowth.moss);
    const mossGeo = new THREE.SphereGeometry(1, 7, 5);
    for (let m = 0; m < 130; m++) {
        const a = prng.range(0, Math.PI * 2);
        const rr = Math.pow(prng.next(), 0.6) * 1.42;
        const x = Math.cos(a) * rr;
        const z = Math.sin(a) * rr;
        // Match the domed soil surface
        const y = 1.06 + Math.sqrt(Math.max(0, 1 - (rr / 1.5) ** 2)) * 1.5 * 0.24 - 0.03;
        pos.set(x, y, z);
        quat.setFromEuler(euler.set(0, prng.range(0, Math.PI * 2), 0));
        const s = prng.range(0.07, 0.2);
        mossBag.add(pos, quat, new THREE.Vector3(s, s * 0.45, s * prng.range(0.8, 1.15)), jitterHSL(mossColor, prng, 0.02, 0.05, 0.06));
    }
    group.add(mossBag.build(mossGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), { name: 'bonsaiMoss', castShadow: false }));

    let topY = 0;
    skeleton.anchors.forEach((a) => {
        topY = Math.max(topY, a.pos.y + a.radius);
    });

    return {
        group,
        rootAngles: [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5],
        canopyFootprint: 4.2,
        canopyTopY: topY + 1.28,
    };
}
