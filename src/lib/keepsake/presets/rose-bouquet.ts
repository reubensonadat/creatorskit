/**
 * VELVET ROSE BOUQUET preset — a hand-tied dome of seven deep crimson roses
 * with layered spiral petals, serrated foliage, baby's breath stardust and
 * a warm kraft wrap. No trunk — the stems themselves flare from the earth.
 */

import * as THREE from 'three';
import { PRNG } from '../prng';
import {
    createPetalGeometry,
    createLeafGeometry,
    createPetalMaterial,
    createBerryGeometry,
    taperedTubeGeometry,
    InstanceBag,
    jitterHSL,
} from '../geometry';
import { mergeGeometries } from '../geometry';
import type { KeepsakePalette, KeepsakePresetResult } from '../types';

export function buildRoseBouquet(palette: KeepsakePalette, seed: string): KeepsakePresetResult {
    const group = new THREE.Group();
    group.name = 'roseBouquet';

    const prng = new PRNG(seed).fork('roses');

    const petalBag = new InstanceBag();
    const leafBag = new InstanceBag();
    const fillerBag = new InstanceBag();
    const stemGeos: THREE.BufferGeometry[] = [];

    const deep = new THREE.Color(palette.canopy.deep);
    const secondary = new THREE.Color(palette.canopy.secondary);
    const primary = new THREE.Color(palette.canopy.primary);
    const highlight = new THREE.Color(palette.canopy.highlight);
    const leafColor = new THREE.Color(palette.undergrowth.herb);
    const leafDeep = new THREE.Color(palette.undergrowth.stem);
    const white = new THREE.Color(palette.undergrowth.babyBreath);
    const temp = new THREE.Color();

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();

    const up = new THREE.Vector3(0, 1, 0);

    /** One rose: spiral phyllotaxis petals in rings, cupped tight at the
     *  heart, opening wide and paler at the outer guard petals. */
    function rose(center: THREE.Vector3, faceDir: THREE.Vector3, bloomScale: number, hueShift: number): void {
        const faceQuat = new THREE.Quaternion().setFromUnitVectors(up, faceDir.clone().normalize());
        const rings: Array<{ count: number; tilt: number; scale: number }> = [
            { count: 3, tilt: 0.28, scale: 0.55 }, // heart — tightly furled
            { count: 5, tilt: 0.5, scale: 0.72 },
            { count: 7, tilt: 0.78, scale: 0.9 },
            { count: 9, tilt: 1.05, scale: 1.0 },  // guard petals flaring out
            { count: 8, tilt: 1.32, scale: 1.02 },
        ];
        const basePetal = 0.34 * bloomScale;

        rings.forEach((ring, ri) => {
            const ringColor = temp
                .copy(ri < 2 ? deep : ri === 2 ? secondary : primary)
                .lerp(highlight, ri >= 3 ? 0.22 : 0.05);
            const offset = ri * 2.39996; // golden angle per ring

            for (let p = 0; p < ring.count; p++) {
                const a = (p / ring.count) * Math.PI * 2 + offset + prng.range(-0.1, 0.1);
                const tilt = ring.tilt + prng.range(-0.07, 0.07);
                const local = new THREE.Vector3(
                    Math.sin(tilt) * Math.cos(a),
                    Math.cos(tilt),
                    Math.sin(tilt) * Math.sin(a)
                );
                quat.setFromUnitVectors(up, local).premultiply(faceQuat);

                const r = ri === 0 ? 0.02 : ri * 0.052 * bloomScale;
                pos.set(
                    center.x + local.x * r,
                    center.y + local.y * r,
                    center.z + local.z * r
                );
                const s = basePetal * ring.scale * prng.range(0.9, 1.08);
                scale.set(s, s * prng.range(0.92, 1.06), s);

                petalBag.add(
                    pos,
                    quat,
                    scale,
                    jitterHSL(ringColor, prng, 0.012 + hueShift * 0.4, 0.04, 0.05)
                );
            }
        });

        // Dewy heart: a tight dark bud cone
        // (kept implicit — the furled ring 0 reads as the heart)
    }

    // ── Seven roses in a dome, hand-tied ──
    const roseCount = 7;
    const domeR = 1.9;
    const roseAnchors: Array<{ pos: THREE.Vector3; dir: THREE.Vector3 }> = [];
    for (let i = 0; i < roseCount; i++) {
        const a = (i / roseCount) * Math.PI * 2 + prng.range(-0.18, 0.18);
        const rr = i === 0 ? 0 : domeR * prng.range(0.55, 1);
        const height = i === 0 ? 4.2 : prng.range(3.0, 3.9);
        const x = Math.cos(a) * rr;
        const z = Math.sin(a) * rr;

        // Stem: gentle S-curve from the wrap mouth up into the light
        const stemPts: THREE.Vector3[] = [];
        for (let s = 0; s <= 5; s++) {
            const t = s / 5;
            stemPts.push(
                new THREE.Vector3(
                    x * (0.35 + t * 0.65) + prng.range(-0.12, 0.12) * t,
                    1.05 + (height - 1.05) * t,
                    z * (0.35 + t * 0.65) + prng.range(-0.12, 0.12) * t
                )
            );
        }
        const curve = new THREE.CatmullRomCurve3(stemPts);
        stemGeos.push(taperedTubeGeometry(curve, (t) => THREE.MathUtils.lerp(0.06, 0.022, t), 8, 6, true));

        const head = stemPts[stemPts.length - 1].clone();
        const dir = new THREE.Vector3(x * 0.22, 1, z * 0.22)
            .normalize()
            .applyAxisAngle(new THREE.Vector3(1, 0, 0), prng.range(-0.16, 0.16))
            .applyAxisAngle(new THREE.Vector3(0, 0, 1), prng.range(-0.16, 0.16));
        roseAnchors.push({ pos: head, dir });
        rose(head, dir, prng.range(0.92, 1.14), prng.range(-0.2, 0.2));

        // Foliage along each stem
        const leaves = prng.int(3, 5);
        for (let l = 0; l < leaves; l++) {
            const t = prng.range(0.3, 0.85);
            const p = curve.getPointAt(t);
            const a2 = prng.range(0, Math.PI * 2);
            const tilt = prng.range(0.5, 1.1);
            quat.setFromEuler(euler.set(tilt, a2, 0, 'YXZ'));
            pos.copy(p);
            const s = prng.range(0.75, 1.2);
            leafBag.add(
                pos,
                quat,
                new THREE.Vector3(s, s, s),
                temp.copy(leafColor).lerp(leafDeep, prng.range(0, 0.4))
            );
        }
    }

    // ── Baby's breath stardust between the roses ──
    const fillerCount = 200;
    for (let f = 0; f < fillerCount; f++) {
        const a = prng.range(0, Math.PI * 2);
        const rr = prng.range(0.4, domeR * 1.35);
        pos.set(
            Math.cos(a) * rr,
            prng.range(2.2, 4.8),
            Math.sin(a) * rr
        );
        quat.identity();
        const s = prng.range(0.5, 0.95);
        fillerBag.add(pos, quat, new THREE.Vector3(s, s, s), jitterHSL(white, prng, 0.006, 0.015, 0.02));
    }

    // ── Cedar display stand — the bouquet is a gift, presented ──
    const standMat = new THREE.MeshStandardMaterial({
        color: 0x8a5a33,
        roughness: 0.6,
        metalness: 0.02,
    });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 2.5), standMat);
    stand.position.y = -0.17; // from -0.42 (garden floor) up to 0.08
    stand.castShadow = true;
    stand.receiveShadow = true;
    group.add(stand);
    const standCap = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.09, 2.64), new THREE.MeshStandardMaterial({ color: 0xa4713f, roughness: 0.5 }));
    standCap.position.y = 0.1;
    standCap.castShadow = true;
    group.add(standCap);

    // ── Warm kraft wrap cradling the stems ──
    const wrapMat = new THREE.MeshStandardMaterial({
        color: 0xc8a97e,
        roughness: 0.88,
        side: THREE.DoubleSide,
    });
    const wrap = new THREE.Mesh(
        new THREE.CylinderGeometry(1.72, 0.95, 2.15, 22, 1, true, 0.25, Math.PI * 1.62),
        wrapMat
    );
    wrap.position.y = 1.45; // cone from ~0.375 to ~2.53, mouth above the stand
    wrap.castShadow = true;
    wrap.receiveShadow = true;
    group.add(wrap);

    const wrapBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.96, 0.8, 0.35, 20),
        wrapMat
    );
    wrapBase.position.y = 0.26; // sits directly on the stand cap
    wrapBase.castShadow = true;
    group.add(wrapBase);

    // A soft ribbon fold at the wrap mouth
    const ribbonMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.canopy.secondary),
        roughness: 0.55,
        side: THREE.DoubleSide,
    });
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.14, 8, 20, Math.PI * 1.4), ribbonMat);
    ribbon.rotation.set(Math.PI / 2 + 0.25, 0, 0.6);
    ribbon.position.set(0.75, 2.15, 1.05);
    ribbon.castShadow = true;
    group.add(ribbon);

    // ── Merge stems into one mesh ──
    const stemMat = new THREE.MeshStandardMaterial({
        color: 0x3f5a2e,
        roughness: 0.8,
    });
    const mergedStems = mergeGeometries(stemGeos, false) || stemGeos[0];
    const stemMesh = new THREE.Mesh(mergedStems, stemMat);
    stemMesh.castShadow = true;
    stemMesh.name = 'roseStems';
    group.add(stemMesh);

    // ── Petals: velvet crimson, deep cup, SSS rim ──
    const petalGeo = createPetalGeometry({
        length: 0.42,
        width: 0.4,
        notch: 0.02,
        cup: 0.13,
        curl: 0.06,
        thickness: 0.016,
    });
    const petalMat = createPetalMaterial(palette.canopy.highlight, { rimStrength: 0.5, roughness: 0.42 });
    group.add(petalBag.build(petalGeo, petalMat, { castShadow: true, receiveShadow: true, name: 'roseHeads' }));

    const leafMat = createPetalMaterial('#dfecc9', { rimStrength: 0.22, roughness: 0.58 });
    group.add(
        leafBag.build(createLeafGeometry(0.4, 0.24), leafMat, {
            castShadow: true,
            receiveShadow: true,
            name: 'roseLeaves',
        })
    );

    const fillerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    group.add(
        fillerBag.build(createBerryGeometry(0.045), fillerMat, {
            name: 'babyBreath',
            castShadow: false,
        })
    );

    return {
        group,
        rootAngles: roseAnchors.map((r) => Math.atan2(r.pos.z, r.pos.x)),
        canopyFootprint: 4.4,
        canopyTopY: 4.9,
    };
}
