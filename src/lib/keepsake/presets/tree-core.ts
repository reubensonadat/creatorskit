/**
 * Tree Core — the shared skeleton of every wooden keepsake preset.
 *
 * Implements the "living botanical architecture":
 *  - scaffold boughs with WEIGHT: long boughs sag under their blossom load,
 *    then sweep upward at the tips (gravitational droop + phototropic lift)
 *  - recursive branching with organic wander
 *  - irregular, puffy "blossom clouds" at twig tips that self-shadow lower tiers
 *  - velvet moss cushions nestled into bark crevices near the base
 */

import * as THREE from 'three';
import { PRNG } from '../prng';
import {
    buildFlutedTrunk,
    taperedTubeGeometry,
    createPetalGeometry,
    createPetalMaterial,
    InstanceBag,
    jitterHSL,
    TrunkInfo,
} from '../geometry';
import { makeBarkTextures } from '../textures';
import type { KeepsakePalette } from '../types';

export interface BranchSpec {
    depth: number;          // recursion levels below the scaffold boughs
    boughCount: [number, number];
    boughLength: [number, number];
    boughRadius: [number, number];
    lengthFall: number;     // child length multiplier range center
    radiusFall: number;
    sag: number;            // gravitational droop per unit length (0..0.2)
    tipLift: number;        // upward sweep at the tip
    upBias: number;         // phototropism pulling children upward
    wander: number;         // direction noise
    spawnAnchorEvery: number; // cloud anchors per terminal twig
}

export interface CloudSpec {
    petalsPerUnit: number;    // petal density per cloud-radius unit
    cloudRadius: [number, number];
    flattenY: number;         // squash clouds vertically (bonsai pads)
    openFlowerChance: number; // fully-open 5-petal blossoms among the mass
}

export interface SkeletonResult {
    trunkInfo: TrunkInfo;
    branchGeometries: THREE.BufferGeometry[];
    anchors: Array<{ pos: THREE.Vector3; radius: number }>;
}

/** Grow the fluted trunk + weighty branching skeleton. */
export function growTreeSkeleton(
    seed: string,
    trunkParams: Parameters<typeof buildFlutedTrunk>[0],
    spec: BranchSpec,
    prng: PRNG,
    trunkTopY?: number
): SkeletonResult {
    const trunkInfo = buildFlutedTrunk({ ...trunkParams, seed });
    const branchGeometries: THREE.BufferGeometry[] = [];
    const anchors: Array<{ pos: THREE.Vector3; radius: number }> = [];

    const H = trunkTopY ?? trunkParams.height;

    /**
     * Build one bough with weight: the spine bows downward under its
     * blossom load through the first 65%, then sweeps up toward the light.
     */
    function branch(
        start: THREE.Vector3,
        dir: THREE.Vector3,
        length: number,
        r0: number,
        depth: number
    ): void {
        const n = Math.max(4, Math.round(length / 0.62));
        const pts: THREE.Vector3[] = [start.clone()];
        const d = dir.clone().normalize();
        const stepLen = length / n;

        for (let i = 1; i <= n; i++) {
            const t = i / n;
            // Gravitational sag dominates mid-bough; tip lifts to the sun.
            if (t < 0.65) d.y -= spec.sag * 0.55;
            else d.y += spec.tipLift * 0.9;
            // Organic wander
            d.x += (prng.next() - 0.5) * spec.wander;
            d.z += (prng.next() - 0.5) * spec.wander;
            // Gentle phototropism
            d.y += spec.upBias * 0.012;
            d.normalize();
            const prev = pts[pts.length - 1];
            pts.push(new THREE.Vector3(prev.x + d.x * stepLen, prev.y + d.y * stepLen, prev.z + d.z * stepLen));
        }

        const curve = new THREE.CatmullRomCurve3(pts);
        branchGeometries.push(
            taperedTubeGeometry(
                curve,
                (t) => THREE.MathUtils.lerp(r0, r0 * 0.34, t) * (1 - 0.1 * Math.sin(t * Math.PI)),
                n,
                7,
                true
            )
        );

        if (depth <= 0) {
            const tip = pts[pts.length - 1];
            const cloudR = THREE.MathUtils.clamp(0.55 + length * 0.34, 0.5, 1.9);
            anchors.push({ pos: tip, radius: cloudR });
            if (length > 2.2 && prng.bool(0.5)) {
                const mid = pts[Math.floor(pts.length * 0.55)];
                anchors.push({ pos: mid, radius: cloudR * 0.72 });
            }
            return;
        }

        const kids = depth >= spec.depth - 1 ? prng.int(2, 3) : prng.bool(0.55) ? 3 : 2;
        for (let k = 0; k < kids; k++) {
            const t = prng.range(0.42, 0.96);
            const origin = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t);

            // Diverge away from the parent
            let side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            if (side.lengthSq() < 0.01) side.set(1, 0, 0);
            const az = prng.range(0, Math.PI * 2);
            const tilt = prng.range(0.45, 1.05);
            const childDir = tangent
                .clone()
                .applyAxisAngle(side, tilt * (prng.bool(0.6) ? 1 : -1))
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

    // ── Scaffold boughs radiating from the upper trunk ──
    const boughCount = prng.int(spec.boughCount[0], spec.boughCount[1]);
    const golden = Math.PI * (3 - Math.sqrt(5)); // phyllotactic spread
    for (let b = 0; b < boughCount; b++) {
        const frac = 0.52 + (b / boughCount) * 0.44 + prng.range(-0.04, 0.04);
        const y = H * frac;
        const az = b * golden + prng.range(-0.3, 0.3);
        const pitch = prng.range(0.62, 1.08); // low-angle, spreading crown
        const dir = new THREE.Vector3(
            Math.cos(az) * Math.cos(pitch),
            Math.sin(pitch) * 0.55,
            Math.sin(az) * Math.cos(pitch)
        ).normalize();
        const len = prng.range(spec.boughLength[0], spec.boughLength[1]) * (1.18 - frac * 0.28);
        const r0 = prng.range(spec.boughRadius[0], spec.boughRadius[1]);
        const origin = new THREE.Vector3(dir.x * trunkParams.baseRadius * 0.22, y, dir.z * trunkParams.baseRadius * 0.22);
        branch(origin, dir, len, r0, spec.depth);
    }

    // ── Central leader continuation ──
    const leaderDir = new THREE.Vector3(
        trunkParams.lean ? Math.cos(trunkParams.leanDirection) * 0.18 : 0,
        1,
        trunkParams.lean ? Math.sin(trunkParams.leanDirection) * 0.18 : 0
    ).normalize();
    branch(
        new THREE.Vector3(0, H * 0.97, 0),
        leaderDir,
        prng.range(spec.boughLength[0] * 0.8, spec.boughLength[1] * 0.9),
        prng.range(spec.boughRadius[0] * 0.8, spec.boughRadius[1] * 0.9),
        spec.depth
    );

    return { trunkInfo, branchGeometries, anchors };
}

/** Merged bark mesh (trunk + all boughs) with aged fissure textures. */
export function buildBarkMesh(
    trunkInfo: TrunkInfo,
    branchGeometries: THREE.BufferGeometry[],
    palette: KeepsakePalette,
    seed: string
): THREE.Mesh {
    const bark = makeBarkTextures(seed, palette.barkTint);
    const barkMat = new THREE.MeshStandardMaterial({
        map: bark.map,
        bumpMap: bark.bumpMap,
        bumpScale: 1.35,
        color: 0xffffff,
        roughness: 0.93,
        metalness: 0.01,
    });
    const all = [trunkInfo.geometry, ...branchGeometries];
    const merged =
        all.length === 1
            ? all[0]
            : mergeGeometriesSafe(all);
    const mesh = new THREE.Mesh(merged, barkMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'barkMesh';
    return mesh;
}

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function mergeGeometriesSafe(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
    return mergeGeometries(list, false) || list[0];
}

/**
 * Irregular, puffy blossom clouds from twig anchors.
 * Vertical gradient: shadowed `deep` undersides → sunlit `highlight` crowns,
 * every petal carrying HSL micro-jitter so no two are identical.
 */
export function fillBlossomClouds(
    anchors: Array<{ pos: THREE.Vector3; radius: number }>,
    palette: KeepsakePalette,
    prng: PRNG,
    cloud: CloudSpec,
    petalOptions: { notch?: number; cup?: number; curl?: number; length?: number; width?: number } = {}
): THREE.InstancedMesh {
    const bag = new InstanceBag();

    const deep = new THREE.Color(palette.canopy.deep);
    const secondary = new THREE.Color(palette.canopy.secondary);
    const primary = new THREE.Color(palette.canopy.primary);
    const highlight = new THREE.Color(palette.canopy.highlight);
    const temp = new THREE.Color();

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();

    for (const anchor of anchors) {
        const R = THREE.MathUtils.clamp(
            prng.range(cloud.cloudRadius[0], cloud.cloudRadius[1]) * anchor.radius,
            0.65,
            2.6
        );
        const count = Math.max(10, Math.round(R * cloud.petalsPerUnit));

        for (let i = 0; i < count; i++) {
            // Pow-scaled radius → puffy dense heart, airy fringes
            const rr = Math.pow(prng.next(), 0.62);
            const th = prng.range(0, Math.PI * 2);
            const ph = Math.acos(prng.range(-1, 1));
            pos.set(
                anchor.pos.x + rr * R * Math.sin(ph) * Math.cos(th),
                anchor.pos.y + rr * R * Math.cos(ph) * cloud.flattenY,
                anchor.pos.z + rr * R * Math.sin(ph) * Math.sin(th)
            );

            euler.set(
                prng.range(0, Math.PI * 2),
                prng.range(0, Math.PI * 2),
                prng.range(0, Math.PI * 2)
            );
            quat.setFromEuler(euler);

            const s = prng.range(0.72, 1.5) * (1.25 - rr * 0.35);
            scale.set(s, s * prng.range(0.9, 1.12), s);

            // Altitude gradient + micro jitter
            const alt = THREE.MathUtils.clamp((pos.y - (anchor.pos.y - R)) / (2 * R), 0, 1);
            if (alt < 0.3) temp.copy(deep).lerp(secondary, alt / 0.3);
            else if (alt < 0.72) temp.copy(secondary).lerp(primary, (alt - 0.3) / 0.42);
            else temp.copy(primary).lerp(highlight, (alt - 0.72) / 0.28);
            jitterHSL(temp, prng, 0.014, 0.035, 0.045);

            bag.add(pos, quat, scale, temp);
        }

        // A fully-open five-petal blossom facing outward — jewelry in the cloud
        if (prng.next() < cloud.openFlowerChance) {
            const openDir = new THREE.Vector3(
                prng.range(-0.6, 0.6),
                prng.range(0.35, 0.9),
                prng.range(-0.6, 0.6)
            ).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            const normal = openDir.clone();
            for (let p = 0; p < 5; p++) {
                const around = (p / 5) * Math.PI * 2;
                const tilt = Math.PI / 2 - 0.5; // petals arch outward
                const local = new THREE.Vector3(
                    Math.sin(tilt) * Math.cos(around),
                    Math.cos(tilt),
                    Math.sin(tilt) * Math.sin(around)
                );
                // Orient the flower's up-axis along openDir
                const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
                const petalQuat = new THREE.Quaternion().setFromUnitVectors(up, local).premultiply(q);
                pos.copy(anchor.pos).addScaledVector(normal, R * 0.55);
                const s = prng.range(1.15, 1.5);
                bag.add(pos, petalQuat, new THREE.Vector3(s, s, s), jitterHSL(highlight, prng, 0.01, 0.02, 0.03));
            }
        }
    }

    const geo = createPetalGeometry({
        length: petalOptions.length ?? 0.3,
        width: petalOptions.width ?? 0.26,
        notch: petalOptions.notch ?? 0.2,
        cup: petalOptions.cup ?? 0.07,
        curl: petalOptions.curl ?? 0.1,
    });
    const mat = createPetalMaterial(palette.canopy.highlight, { rimStrength: 0.55 });
    const mesh = bag.build(geo, mat, { castShadow: true, receiveShadow: true, name: 'blossomClouds' });
    return mesh;
}

/**
 * Velvet moss cushions nestled into the bark crevices near the base —
 * the detail that makes an ancient trunk feel alive.
 */
export function addBarkMossCushions(
    parent: THREE.Group,
    trunkInfo: TrunkInfo,
    palette: KeepsakePalette,
    prng: PRNG,
    count = 90
): THREE.InstancedMesh {
    const bag = new InstanceBag();
    const mossBase = new THREE.Color(palette.undergrowth.moss);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scaleV = new THREE.Vector3();

    const geo = new THREE.SphereGeometry(1, 8, 6);

    for (let i = 0; i < count; i++) {
        const theta = prng.range(0, Math.PI * 2);
        // Densely clustered near the root collar, a few strays higher
        const h = Math.pow(prng.next(), 2.1) * (trunkInfo.params.height * 0.38) + 0.12;
        const r = trunkInfo.radiusAt(theta, h);
        const s = prng.range(0.09, 0.3) * (1.25 - h / (trunkInfo.params.height * 0.4));

        // Squash sphere against the bark surface
        pos.set(Math.cos(theta) * (r + s * 0.25), h, Math.sin(theta) * (r + s * 0.25));
        quat.setFromEuler(new THREE.Euler(0, prng.range(0, Math.PI * 2), 0));
        scaleV.set(s, s * prng.range(0.34, 0.5), s * prng.range(0.8, 1.1));

        bag.add(pos, quat, scaleV, jitterHSL(mossBase, prng, 0.02, 0.05, 0.06));
    }

    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0,
    });
    const mesh = bag.build(geo, mat, { castShadow: false, receiveShadow: true, name: 'barkMoss' });
    parent.add(mesh);
    return mesh;
}
