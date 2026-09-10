import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PresetContext, PresetResult } from './types';

/**
 * Procedural Sakura Tree Preset
 * =============================
 * Implements recursive phototropic branching with merged geometry
 * and thousands of organic, curved 3D blossom petals clustered at branch tips.
 */
export function buildSakuraTree(ctx: PresetContext): PresetResult {
    const { scene, palette, prng } = ctx;

    const trunkGroup = new THREE.Group();
    trunkGroup.name = 'sakuraTreePreset';
    scene.add(trunkGroup);

    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.88,
        metalness: 0.02,
    });

    const leafPositions: THREE.Vector3[] = [];
    const branchGeometries: THREE.BufferGeometry[] = [];

    // Flared buttress roots anchoring the trunk
    const rootCount = 7;
    for (let r = 0; r < rootCount; r++) {
        const rootAngle = (r / rootCount) * Math.PI * 2 + prng.range(-0.18, 0.18);
        const rootLen = prng.range(2.0, 3.2);
        const rootGeo = new THREE.ConeGeometry(0.48, rootLen, 7);
        rootGeo.translate(0, rootLen / 2, 0);

        const rootDir = new THREE.Vector3(
            Math.cos(rootAngle) * 0.88,
            -0.35,
            Math.sin(rootAngle) * 0.88
        ).normalize();

        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rootDir);
        rootGeo.applyQuaternion(quat);
        rootGeo.translate(
            Math.cos(rootAngle) * 0.6,
            0.15,
            Math.sin(rootAngle) * 0.6
        );
        branchGeometries.push(rootGeo);
    }

    // Recursive phototropic branching function
    function generateBranch(
        start: THREE.Vector3,
        dir: THREE.Vector3,
        length: number,
        radius: number,
        depth: number
    ) {
        const end = new THREE.Vector3().copy(dir).multiplyScalar(length).add(start);

        // Cylinder branch geometry
        const branchGeo = new THREE.CylinderGeometry(radius * 0.68, radius, length, 7);
        branchGeo.translate(0, length / 2, 0); // Pivot at branch base

        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        branchGeo.applyQuaternion(quaternion);
        branchGeo.translate(start.x, start.y, start.z);

        branchGeometries.push(branchGeo);

        // Base case: collect leaf cluster spawn points
        if (depth <= 0) {
            const spawnCount = 6;
            for (let i = 0; i < spawnCount; i++) {
                const leafOffset = new THREE.Vector3(
                    prng.range(-1.4, 1.4),
                    prng.range(-0.8, 1.4),
                    prng.range(-1.4, 1.4)
                );
                leafPositions.push(new THREE.Vector3().copy(end).add(leafOffset));
            }
            return;
        }

        // Branching logic: 3 branches at upper tiers, 2-3 at lower tiers
        const numBranches = (depth >= 4) ? 3 : (prng.next() > 0.25 ? 2 : 3);
        for (let i = 0; i < numBranches; i++) {
            const splitAngle = prng.range(0.35, 0.85);
            const twistAngle = prng.range(0, Math.PI * 2);

            const newDir = new THREE.Vector3().copy(dir);

            // Tilt outward from current branch direction
            let tangent = new THREE.Vector3(1, 0, 0).cross(dir).normalize();
            if (tangent.lengthSq() < 0.01) tangent.set(0, 0, 1);
            newDir.applyAxisAngle(tangent, splitAngle);

            // Twist around parent branch axis
            newDir.applyAxisAngle(dir, twistAngle);
            newDir.normalize();

            // Phototropism: Naturally bend upwards towards the sun/light
            const up = new THREE.Vector3(0, 1, 0);
            newDir.lerp(up, 0.22).normalize();

            const newLength = length * prng.range(0.68, 0.86);
            const newRadius = Math.max(0.08, radius * 0.65);

            generateBranch(end, newDir, newLength, newRadius, depth - 1);
        }
    }

    // Start organic tree generation from origin
    const startPos = new THREE.Vector3(0, 0.1, 0);
    const startDir = new THREE.Vector3(0, 1, 0);
    generateBranch(startPos, startDir, 4.4, 0.82, 5);

    // Merge branch geometries for high-performance rendering
    if (branchGeometries.length > 0) {
        const mergedTrunkGeo = mergeGeometries(branchGeometries);
        if (mergedTrunkGeo) {
            const treeMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat);
            treeMesh.castShadow = true;
            treeMesh.receiveShadow = true;
            trunkGroup.add(treeMesh);
        }
    }

    // ─── VOLUMETRIC CURVED SAKURA PETALS ──────────────────────────────────────
    // 3D curved plane geometry simulating natural petal curvature
    const leafGeo = new THREE.PlaneGeometry(0.34, 0.34);
    const posAttribute = leafGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
        const z = posAttribute.getZ(i);
        const y = posAttribute.getY(i);
        posAttribute.setZ(i, z + Math.sin(y * Math.PI) * 0.12);
    }
    leafGeo.computeVertexNormals();

    const leafMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, // Tinted per-instance
        roughness: 0.55,
        metalness: 0.02,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.94,
    });

    const PETALS_PER_SPAWN = 14;
    const maxLeaves = leafPositions.length * PETALS_PER_SPAWN;
    const leafInstanced = new THREE.InstancedMesh(leafGeo, leafMat, maxLeaves);
    leafInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    const colPrimary = new THREE.Color(palette.primary);
    const colSecondary = new THREE.Color(palette.secondary);
    const colHighlight = new THREE.Color(palette.highlight);
    const tempColor = new THREE.Color();

    let leafIdx = 0;
    for (let i = 0; i < leafPositions.length; i++) {
        const basePos = leafPositions[i];

        for (let j = 0; j < PETALS_PER_SPAWN; j++) {
            const px = basePos.x + prng.range(-1.2, 1.2);
            const py = basePos.y + prng.range(-1.0, 1.0);
            const pz = basePos.z + prng.range(-1.2, 1.2);

            // Shape the crown with gentle spherical falloff
            const distFromCrownCenter = Math.sqrt(px * px + (py - 10.5) * (py - 10.5) + pz * pz);
            if (distFromCrownCenter > 11.0) continue;

            dummy.position.set(px, py, pz);
            dummy.rotation.set(
                prng.range(0, Math.PI * 2),
                prng.range(0, Math.PI * 2),
                prng.range(0, Math.PI * 2)
            );

            const scale = prng.range(0.7, 1.4);
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            leafInstanced.setMatrixAt(leafIdx, dummy.matrix);

            // Multi-tone sakura coloring gradient
            const heightRatio = Math.max(0, Math.min(1, (py - 5.0) / 7.0));
            if (heightRatio > 0.7) {
                tempColor.copy(colHighlight);
            } else if (heightRatio > 0.3) {
                tempColor.copy(colPrimary).lerp(colHighlight, (heightRatio - 0.3) * 0.7);
            } else {
                tempColor.copy(colSecondary).lerp(colPrimary, 0.4);
            }
            tempColor.offsetHSL(prng.range(-0.012, 0.012), prng.range(-0.02, 0.02), prng.range(-0.02, 0.02));
            leafInstanced.setColorAt(leafIdx, tempColor);

            leafIdx++;
        }
    }

    leafInstanced.count = leafIdx;
    leafInstanced.instanceMatrix.needsUpdate = true;
    if (leafInstanced.instanceColor) leafInstanced.instanceColor.needsUpdate = true;
    trunkGroup.add(leafInstanced);

    return {
        trunkGroup,
        leafMeshes: [leafInstanced],
    };
}
