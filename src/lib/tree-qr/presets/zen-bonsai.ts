import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PresetContext, PresetResult } from './types';

/**
 * Procedural Zen Bonsai Preset
 * =============================
 * An authentic Japanese Moyogi (informal upright) bonsai diorama:
 * - Glazed stoneware ceramic pot with corner foot pegs
 * - Moss-covered soil mound and miniature Suiseki accent stone
 * - Sinuous exposed Nebari surface roots
 * - Dramatic S-curved tapered aged trunk with Jin (deadwood)
 * - Sculpted horizontal cloud foliage pads (Niwaki pads)
 */
export function buildZenBonsai(ctx: PresetContext): PresetResult {
    const { scene, palette, prng } = ctx;

    const trunkGroup = new THREE.Group();
    trunkGroup.name = 'zenBonsaiPreset';
    scene.add(trunkGroup);

    // ─── 1. GLAZED CERAMIC BONSAI POT & MOUND ────────────────────────────────
    const potMat = new THREE.MeshStandardMaterial({
        color: 0x24272c, // Glazed dark graphite stoneware
        roughness: 0.35,
        metalness: 0.15,
    });

    const potWidth = 6.4;
    const potDepth = 5.2;
    const potHeight = 0.75;

    // Main pot basin
    const potGeo = new THREE.BoxGeometry(potWidth, potHeight, potDepth);
    const potMesh = new THREE.Mesh(potGeo, potMat);
    potMesh.position.set(0, potHeight / 2 + 0.12, 0);
    potMesh.castShadow = true;
    potMesh.receiveShadow = true;
    trunkGroup.add(potMesh);

    // 4 Corner foot pegs
    const footMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.5 });
    const footOffsets = [
        [-potWidth * 0.42, -potDepth * 0.42],
        [potWidth * 0.42, -potDepth * 0.42],
        [-potWidth * 0.42, potDepth * 0.42],
        [potWidth * 0.42, potDepth * 0.42],
    ];
    footOffsets.forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.55), footMat);
        foot.position.set(fx, 0.07, fz);
        foot.castShadow = true;
        trunkGroup.add(foot);
    });

    // Dark bonsai soil & moss layer
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x2a1d13, roughness: 0.95 });
    const soilMesh = new THREE.Mesh(new THREE.BoxGeometry(potWidth * 0.92, 0.15, potDepth * 0.92), soilMat);
    soilMesh.position.set(0, potHeight + 0.12, 0);
    soilMesh.receiveShadow = true;
    trunkGroup.add(soilMesh);

    // Velvety green moss patches
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
    for (let m = 0; m < 8; m++) {
        const mx = prng.range(-potWidth * 0.35, potWidth * 0.35);
        const mz = prng.range(-potDepth * 0.35, potDepth * 0.35);
        const mossPatch = new THREE.Mesh(
            new THREE.CylinderGeometry(prng.range(0.4, 0.8), prng.range(0.5, 0.9), 0.08, 8),
            mossMat
        );
        mossPatch.position.set(mx, potHeight + 0.2, mz);
        mossPatch.rotation.y = prng.range(0, Math.PI);
        trunkGroup.add(mossPatch);
    }

    // Suiseki accent stone nestled in moss
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), rockMat);
    rock.position.set(1.4, potHeight + 0.45, -0.9);
    rock.scale.set(1.1, 0.8, 0.9);
    rock.rotation.set(0.3, 0.6, -0.2);
    rock.castShadow = true;
    trunkGroup.add(rock);

    // ─── 2. S-CURVED BONSAI TRUNK & NEBARI ROOTS ──────────────────────────────
    const woodMat = new THREE.MeshStandardMaterial({
        color: 0x4a3324,
        roughness: 0.9,
        metalness: 0.02,
    });

    const branchGeometries: THREE.BufferGeometry[] = [];
    const cloudPadCenters: Array<{ pos: THREE.Vector3; radiusX: number; radiusZ: number }> = [];

    // Exposed Nebari roots grasping the soil
    for (let r = 0; r < 7; r++) {
        const rAngle = (r / 7) * Math.PI * 2 + prng.range(-0.15, 0.15);
        const rLen = prng.range(1.4, 2.2);
        const rGeo = new THREE.ConeGeometry(0.35, rLen, 6);
        rGeo.translate(0, rLen / 2, 0);

        const rDir = new THREE.Vector3(Math.cos(rAngle) * 0.9, -0.3, Math.sin(rAngle) * 0.9).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rDir);
        rGeo.applyQuaternion(quat);
        rGeo.translate(Math.cos(rAngle) * 0.5, potHeight + 0.22, Math.sin(rAngle) * 0.5);
        branchGeometries.push(rGeo);
    }

    // S-Curve trunk spline
    const trunkSegments = 10;
    const trunkHeight = 6.2;
    let prevPoint = new THREE.Vector3(0, potHeight + 0.2, 0);

    for (let s = 0; s < trunkSegments; s++) {
        const segHeight = trunkHeight / trunkSegments;
        const progress = (s + 1) / trunkSegments;
        const rBottom = 0.95 - 0.6 * (s / trunkSegments);
        const rTop = 0.95 - 0.6 * progress;

        // Graceful S-curve bend: sweeps outward to right, then sweeps back inward and up
        const curveX = Math.sin(progress * Math.PI * 1.3) * 1.8;
        const curveZ = Math.cos(progress * Math.PI * 1.1) * 0.6 - 0.6;
        const nextPoint = new THREE.Vector3(curveX, potHeight + 0.2 + (s + 1) * segHeight, curveZ);

        const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segHeight, 8);
        segGeo.translate(0, segHeight / 2, 0);

        const dir = nextPoint.clone().sub(prevPoint).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        segGeo.applyQuaternion(quat);
        segGeo.translate(prevPoint.x, prevPoint.y, prevPoint.z);

        branchGeometries.push(segGeo);

        // Branch off at key bends to form cloud pad anchor points
        if (s === 4 || s === 6 || s === 8) {
            const bSign = s === 4 ? -1 : 1;
            const bDir = new THREE.Vector3(bSign * 0.9, 0.25, prng.range(-0.4, 0.4)).normalize();
            const bLen = prng.range(2.0, 3.2);
            const bGeo = new THREE.CylinderGeometry(0.12, 0.24, bLen, 6);
            bGeo.translate(0, bLen / 2, 0);
            const bQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bDir);
            bGeo.applyQuaternion(bQuat);
            bGeo.translate(nextPoint.x, nextPoint.y, nextPoint.z);
            branchGeometries.push(bGeo);

            const padEnd = nextPoint.clone().addScaledVector(bDir, bLen);
            cloudPadCenters.push({
                pos: padEnd,
                radiusX: prng.range(1.6, 2.2),
                radiusZ: prng.range(1.4, 1.9),
            });
        }

        prevPoint = nextPoint;
    }

    // Apex crown pad
    cloudPadCenters.push({
        pos: prevPoint.clone().add(new THREE.Vector3(0, 0.4, 0)),
        radiusX: 2.1,
        radiusZ: 1.8,
    });

    // Bleached deadwood Jin accent
    const jinMat = new THREE.MeshStandardMaterial({ color: 0xddd0be, roughness: 0.7 });
    const jinGeo = new THREE.ConeGeometry(0.08, 0.9, 5);
    const jinMesh = new THREE.Mesh(jinGeo, jinMat);
    jinMesh.position.copy(prevPoint).add(new THREE.Vector3(0.25, 0.6, -0.2));
    jinMesh.rotation.set(-0.4, 0.2, 0.5);
    trunkGroup.add(jinMesh);

    if (branchGeometries.length > 0) {
        const mergedTrunk = mergeGeometries(branchGeometries);
        if (mergedTrunk) {
            const tMesh = new THREE.Mesh(mergedTrunk, woodMat);
            tMesh.castShadow = true;
            tMesh.receiveShadow = true;
            trunkGroup.add(tMesh);
        }
    }

    // ─── 3. SCULPTED HORIZONTAL CLOUD FOLIAGE PADS (NIWAKI) ───────────────────
    const tuftGeo = new THREE.PlaneGeometry(0.3, 0.3);
    const tuftMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6,
        side: THREE.DoubleSide,
    });

    const TUFTS_PER_PAD = 140;
    const totalTufts = cloudPadCenters.length * TUFTS_PER_PAD;
    const cloudInstanced = new THREE.InstancedMesh(tuftGeo, tuftMat, totalTufts);
    cloudInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    const colDeep = new THREE.Color(palette.deepShadow);
    const colPrimary = new THREE.Color(palette.primary);
    const colHighlight = new THREE.Color(palette.highlight);
    const tempColor = new THREE.Color();

    let tuftIdx = 0;
    cloudPadCenters.forEach((pad) => {
        for (let t = 0; t < TUFTS_PER_PAD; t++) {
            // Flattened horizontal disc distribution
            const theta = prng.range(0, Math.PI * 2);
            const r = Math.sqrt(prng.next()); // Uniform disc sampling
            const ox = Math.cos(theta) * (r * pad.radiusX);
            const oz = Math.sin(theta) * (r * pad.radiusZ);
            // Slightly convex dome top surface: thickness ~ 0.35
            const domeY = Math.max(0, 0.35 * (1.0 - (r * r))) + prng.range(-0.08, 0.08);

            dummy.position.set(pad.pos.x + ox, pad.pos.y + domeY, pad.pos.z + oz);
            dummy.rotation.set(
                prng.range(-0.25, 0.25),
                prng.range(0, Math.PI * 2),
                prng.range(-0.25, 0.25)
            );
            const s = prng.range(0.8, 1.3);
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();

            cloudInstanced.setMatrixAt(tuftIdx, dummy.matrix);

            // Cloud pad highlights on top surface
            if (domeY > 0.2) {
                tempColor.copy(colHighlight);
            } else if (domeY > 0.08) {
                tempColor.copy(colPrimary);
            } else {
                tempColor.copy(colDeep);
            }
            tempColor.offsetHSL(prng.range(-0.01, 0.01), prng.range(-0.02, 0.02), prng.range(-0.02, 0.02));
            cloudInstanced.setColorAt(tuftIdx, tempColor);

            tuftIdx++;
        }
    });

    cloudInstanced.count = tuftIdx;
    cloudInstanced.instanceMatrix.needsUpdate = true;
    if (cloudInstanced.instanceColor) cloudInstanced.instanceColor.needsUpdate = true;
    trunkGroup.add(cloudInstanced);

    return {
        trunkGroup,
        leafMeshes: [cloudInstanced],
    };
}
