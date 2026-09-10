import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PresetContext, PresetResult } from './types';

/**
 * Procedural Weeping Wisteria Tree Preset
 * ========================================
 * Characterized by:
 * - A gnarled, twisting fluted trunk with exposed root flares
 * - Spreading horizontal boughs forming a garden pergola / umbrella trellis
 * - Cascading pendulous raceme flower chains dangling gracefully downwards
 * - Two-tone lavender and royal violet wisteria florets with lilac highlights
 * - Tender green pinnate foliage topping the boughs
 */
export function buildWeepingWisteria(ctx: PresetContext): PresetResult {
    const { scene, palette, prng } = ctx;

    const trunkGroup = new THREE.Group();
    trunkGroup.name = 'weepingWisteriaPreset';
    scene.add(trunkGroup);

    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x422d1d,
        roughness: 0.9,
        metalness: 0.02,
    });

    const branchGeometries: THREE.BufferGeometry[] = [];
    const racemePoints: Array<{ pos: THREE.Vector3; length: number }> = [];

    // 1. Gnarled Muscular Wisteria Trunk
    const trunkSegments = 10;
    const trunkHeight = 8.5;
    let prevPoint = new THREE.Vector3(0, 0.1, 0);

    for (let s = 0; s < trunkSegments; s++) {
        const segHeight = trunkHeight / trunkSegments;
        const progress = (s + 1) / trunkSegments;
        const rBottom = 1.1 - 0.55 * (s / trunkSegments);
        const rTop = 1.1 - 0.55 * progress;

        // Spiraling twist
        const twistAngle = s * 0.45 + 0.8;
        const wobbleX = Math.sin(twistAngle) * (0.28 * (s + 1));
        const wobbleZ = Math.cos(twistAngle) * (0.22 * (s + 1));
        const nextPoint = new THREE.Vector3(wobbleX, 0.1 + (s + 1) * segHeight, wobbleZ);

        const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segHeight, 9);
        segGeo.translate(0, segHeight / 2, 0);

        const dir = nextPoint.clone().sub(prevPoint).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        segGeo.applyQuaternion(quat);
        segGeo.translate(prevPoint.x, prevPoint.y, prevPoint.z);

        branchGeometries.push(segGeo);
        prevPoint = nextPoint;
    }

    // Fluted base roots
    for (let r = 0; r < 6; r++) {
        const angle = (r / 6) * Math.PI * 2 + prng.range(-0.15, 0.15);
        const rootLen = prng.range(2.0, 2.8);
        const rootGeo = new THREE.ConeGeometry(0.42, rootLen, 6);
        rootGeo.translate(0, rootLen / 2, 0);

        const dir = new THREE.Vector3(Math.cos(angle) * 0.9, -0.35, Math.sin(angle) * 0.9).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        rootGeo.applyQuaternion(quat);
        rootGeo.translate(Math.cos(angle) * 0.5, 0.12, Math.sin(angle) * 0.5);

        branchGeometries.push(rootGeo);
    }

    // 2. Spreading Horizontal Arbor Boughs
    const canopyTop = prevPoint.clone();
    const mainBranches = 8;
    for (let b = 0; b < mainBranches; b++) {
        const bAngle = (b / mainBranches) * Math.PI * 2 + prng.range(-0.2, 0.2);
        const bLength = prng.range(7.5, 9.5);
        const steps = 5;
        let cur = canopyTop.clone();
        let bRad = 0.35;

        for (let st = 0; st < steps; st++) {
            const stepLen = bLength / steps;
            const progress = (st + 1) / steps;
            // High arch: rises first, then flattens out horizontally
            const elevation = Math.sin(progress * Math.PI * 0.8) * 1.8;
            const nextX = canopyTop.x + Math.cos(bAngle) * (progress * bLength);
            const nextZ = canopyTop.z + Math.sin(bAngle) * (progress * bLength);
            const nextY = canopyTop.y + elevation - progress * 0.6;
            const nxt = new THREE.Vector3(nextX, nextY, nextZ);

            const nxtRad = Math.max(0.1, bRad - 0.05);
            const subGeo = new THREE.CylinderGeometry(nxtRad, bRad, stepLen, 7);
            subGeo.translate(0, stepLen / 2, 0);

            const bDir = nxt.clone().sub(cur).normalize();
            const bQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bDir);
            subGeo.applyQuaternion(bQuat);
            subGeo.translate(cur.x, cur.y, cur.z);
            branchGeometries.push(subGeo);

            // Collect hang points for cascading wisteria racemes along the outer 60% of branches
            if (st >= 2) {
                const numHangers = prng.int(1, 3);
                for (let h = 0; h < numHangers; h++) {
                    const hPos = cur.clone().lerp(nxt, (h + 0.5) / numHangers);
                    hPos.y -= 0.15; // Hang from underside of branch
                    hPos.x += prng.range(-0.35, 0.35);
                    hPos.z += prng.range(-0.35, 0.35);
                    racemePoints.push({
                        pos: hPos,
                        length: prng.range(2.0, 3.8),
                    });
                }
            }

            cur = nxt;
            bRad = nxtRad;
        }
    }

    if (branchGeometries.length > 0) {
        const mergedBranchGeo = mergeGeometries(branchGeometries);
        if (mergedBranchGeo) {
            const mesh = new THREE.Mesh(mergedBranchGeo, trunkMat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            trunkGroup.add(mesh);
        }
    }

    // ─── 3. CASCADING WISTERIA RACEME FLOWER CHAINS ───────────────────────────
    // Hanging pendulous flower chains dangling downwards
    const floretGeo = new THREE.SphereGeometry(0.18, 5, 4);
    floretGeo.scale(1.0, 1.3, 1.0); // Droplet shape

    const floretMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.02,
    });

    const FLORETS_PER_RACEME = 12;
    const totalFlorets = racemePoints.length * FLORETS_PER_RACEME;
    const racemeInstanced = new THREE.InstancedMesh(floretGeo, floretMat, totalFlorets);
    racemeInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    const colDeep = new THREE.Color(palette.deepShadow);
    const colPrimary = new THREE.Color(palette.primary);
    const colSecondary = new THREE.Color(palette.secondary);
    const colHighlight = new THREE.Color(palette.highlight);
    const tempColor = new THREE.Color();

    let fIdx = 0;
    for (let r = 0; r < racemePoints.length; r++) {
        const { pos, length } = racemePoints[r];

        for (let fl = 0; fl < FLORETS_PER_RACEME; fl++) {
            const progress = fl / (FLORETS_PER_RACEME - 1);
            // Taper: wider at top, needle tip at bottom
            const taper = 1.0 - progress * 0.55;
            const spreadRad = (0.28 * taper);
            const flAngle = progress * Math.PI * 6 + (r * 0.4);

            const fx = pos.x + Math.cos(flAngle) * spreadRad + prng.range(-0.04, 0.04);
            const fy = pos.y - (progress * length);
            const fz = pos.z + Math.sin(flAngle) * spreadRad + prng.range(-0.04, 0.04);

            dummy.position.set(fx, fy, fz);
            dummy.rotation.set(prng.range(0, 0.2), flAngle, prng.range(0, 0.2));

            const flScale = taper * prng.range(0.85, 1.15);
            dummy.scale.set(flScale, flScale, flScale);
            dummy.updateMatrix();

            racemeInstanced.setMatrixAt(fIdx, dummy.matrix);

            // Wisteria color gradient: deeper violet at upper clusters, pale lavender/lilac at the dangling tip
            if (progress < 0.3) {
                tempColor.copy(colDeep).lerp(colSecondary, progress / 0.3);
            } else if (progress < 0.75) {
                tempColor.copy(colSecondary).lerp(colPrimary, (progress - 0.3) / 0.45);
            } else {
                tempColor.copy(colPrimary).lerp(colHighlight, (progress - 0.75) / 0.25);
            }
            tempColor.offsetHSL(prng.range(-0.015, 0.015), prng.range(-0.02, 0.02), prng.range(-0.02, 0.02));
            racemeInstanced.setColorAt(fIdx, tempColor);

            fIdx++;
        }
    }

    racemeInstanced.count = fIdx;
    racemeInstanced.instanceMatrix.needsUpdate = true;
    if (racemeInstanced.instanceColor) racemeInstanced.instanceColor.needsUpdate = true;
    trunkGroup.add(racemeInstanced);

    // ─── 4. FRESH GREEN WISTERIA FOLIAGE TUFTS ────────────────────────────────
    const leafGeo = new THREE.PlaneGeometry(0.32, 0.32);
    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x4ade80, // Spring wisteria green
        roughness: 0.65,
        side: THREE.DoubleSide,
    });
    const leafCount = racemePoints.length * 6;
    const leafInstanced = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
    let lIdx = 0;
    for (let r = 0; r < racemePoints.length; r++) {
        const { pos } = racemePoints[r];
        for (let k = 0; k < 6; k++) {
            dummy.position.set(
                pos.x + prng.range(-0.5, 0.5),
                pos.y + 0.35 + prng.range(0, 0.4), // Sits atop the bough
                pos.z + prng.range(-0.5, 0.5)
            );
            dummy.rotation.set(prng.range(0, Math.PI), prng.range(0, Math.PI), prng.range(0, Math.PI));
            const s = prng.range(0.8, 1.3);
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            leafInstanced.setMatrixAt(lIdx, dummy.matrix);
            lIdx++;
        }
    }
    leafInstanced.count = lIdx;
    leafInstanced.instanceMatrix.needsUpdate = true;
    trunkGroup.add(leafInstanced);

    return {
        trunkGroup,
        leafMeshes: [racemeInstanced, leafInstanced],
    };
}
