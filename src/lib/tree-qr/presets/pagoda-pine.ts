import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PresetContext, PresetResult } from './types';

/**
 * Procedural Pagoda Pine Preset (Japanese Black Pine / Matsu)
 * ==========================================================
 * Characterized by:
 * - A tall columnar trunk with rugged scaly bark rings
 * - 5 distinct horizontal pagoda tiers tapering upward in a conical silhouette
 * - Upward-curving branch tips supporting dense needle tufts
 * - Evergreen needle bough clusters in deep forest pine tones
 * - Miniature pine cone accents along lower branches
 */
export function buildPagodaPine(ctx: PresetContext): PresetResult {
    const { scene, palette, prng } = ctx;

    const trunkGroup = new THREE.Group();
    trunkGroup.name = 'pagodaPinePreset';
    scene.add(trunkGroup);

    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x2e1e14, // Scaly dark pine bark
        roughness: 0.94,
        metalness: 0.02,
    });

    const branchGeometries: THREE.BufferGeometry[] = [];
    const needleTuftCenters: Array<{ pos: THREE.Vector3; spread: number }> = [];

    // 1. Rugged Columnar Trunk with Scaly Bark Rings
    const trunkSegments = 12;
    const trunkHeight = 11.2;
    let prevPoint = new THREE.Vector3(0, 0.1, 0);

    for (let s = 0; s < trunkSegments; s++) {
        const segHeight = trunkHeight / trunkSegments;
        const progress = (s + 1) / trunkSegments;
        const rBottom = 1.25 - 0.75 * (s / trunkSegments);
        const rTop = 1.25 - 0.75 * progress;

        // Subtle organic sway
        const swayX = Math.sin(s * 0.35 + 0.5) * 0.15 * (s + 1);
        const swayZ = Math.cos(s * 0.3 + 0.2) * 0.12 * (s + 1);
        const nextPoint = new THREE.Vector3(swayX, 0.1 + (s + 1) * segHeight, swayZ);

        const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segHeight, 8);
        segGeo.translate(0, segHeight / 2, 0);

        const dir = nextPoint.clone().sub(prevPoint).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        segGeo.applyQuaternion(quat);
        segGeo.translate(prevPoint.x, prevPoint.y, prevPoint.z);

        branchGeometries.push(segGeo);

        // Bark texture ridges / rings
        if (s % 2 === 0) {
            const ringGeo = new THREE.TorusGeometry(rBottom * 1.05, 0.06, 5, 12);
            ringGeo.translate(0, 0, 0);
            ringGeo.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
            ringGeo.translate(prevPoint.x, prevPoint.y, prevPoint.z);
            branchGeometries.push(ringGeo);
        }

        prevPoint = nextPoint;
    }

    // Buttress base roots
    for (let r = 0; r < 6; r++) {
        const angle = (r / 6) * Math.PI * 2 + prng.range(-0.1, 0.1);
        const rootLen = prng.range(1.8, 2.6);
        const rootGeo = new THREE.ConeGeometry(0.44, rootLen, 6);
        rootGeo.translate(0, rootLen / 2, 0);

        const rDir = new THREE.Vector3(Math.cos(angle) * 0.88, -0.38, Math.sin(angle) * 0.88).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rDir);
        rootGeo.applyQuaternion(quat);
        rootGeo.translate(Math.cos(angle) * 0.65, 0.14, Math.sin(angle) * 0.65);

        branchGeometries.push(rootGeo);
    }

    // 2. Tiered Horizontal Pagoda Boughs (5 tiers)
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
        const tProgress = t / (tiers - 1); // 0 (bottom tier) to 1 (top tier)
        const tierHeight = 4.0 + tProgress * 6.2;
        const tierSpread = 4.8 * (1.0 - tProgress * 0.6); // Conical pagoda taper
        const branchesInTier = t === tiers - 1 ? 3 : 4;
        const baseAngleOffset = (t * 0.78); // Stagger branches between tiers

        for (let b = 0; b < branchesInTier; b++) {
            const bAngle = (b / branchesInTier) * Math.PI * 2 + baseAngleOffset + prng.range(-0.15, 0.15);
            const bLen = tierSpread * prng.range(0.85, 1.1);
            const branchSteps = 3;

            let curPos = new THREE.Vector3(
                Math.sin(tierHeight * 0.3) * 0.2,
                tierHeight,
                Math.cos(tierHeight * 0.25) * 0.2
            );
            let bRad = 0.28 * (1.0 - tProgress * 0.4);

            for (let st = 0; st < branchSteps; st++) {
                const stepLen = bLen / branchSteps;
                const p = (st + 1) / branchSteps;
                // Upward flick at the branch tips (classic Japanese black pine)
                const tipFlick = st === branchSteps - 1 ? 0.35 : 0.05;

                const nxtPos = new THREE.Vector3(
                    curPos.x + Math.cos(bAngle) * stepLen,
                    curPos.y - 0.15 + tipFlick,
                    curPos.z + Math.sin(bAngle) * stepLen
                );

                const nxtRad = Math.max(0.08, bRad - 0.06);
                const bGeo = new THREE.CylinderGeometry(nxtRad, bRad, stepLen, 6);
                bGeo.translate(0, stepLen / 2, 0);

                const dir = nxtPos.clone().sub(curPos).normalize();
                const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                bGeo.applyQuaternion(quat);
                bGeo.translate(curPos.x, curPos.y, curPos.z);

                branchGeometries.push(bGeo);

                // Add needle tuft cluster centers at outer steps
                if (st >= 1) {
                    needleTuftCenters.push({
                        pos: nxtPos.clone(),
                        spread: 1.4 * (1.0 - tProgress * 0.35),
                    });
                }

                curPos = nxtPos;
                bRad = nxtRad;
            }
        }
    }

    // Apex Crown Tuft
    needleTuftCenters.push({
        pos: prevPoint.clone().add(new THREE.Vector3(0, 0.3, 0)),
        spread: 1.5,
    });

    if (branchGeometries.length > 0) {
        const mergedTrunk = mergeGeometries(branchGeometries);
        if (mergedTrunk) {
            const mesh = new THREE.Mesh(mergedTrunk, trunkMat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            trunkGroup.add(mesh);
        }
    }

    // ─── 3. DENSE EVERGREEN PINE NEEDLE TUFTS ──────────────────────────────────
    // Needle tuft geometry: 3 intersecting planes in radial star formation
    const needleGeo = new THREE.PlaneGeometry(0.35, 0.35);
    const needleMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        side: THREE.DoubleSide,
    });

    const NEEDLES_PER_TUFT = 55;
    const totalNeedles = needleTuftCenters.length * NEEDLES_PER_TUFT;
    const needleInstanced = new THREE.InstancedMesh(needleGeo, needleMat, totalNeedles);
    needleInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    const colDeep = new THREE.Color(palette.deepShadow);
    const colPrimary = new THREE.Color(palette.primary);
    const colHighlight = new THREE.Color(palette.highlight);
    const tempColor = new THREE.Color();

    let nIdx = 0;
    needleTuftCenters.forEach((center) => {
        for (let n = 0; n < NEEDLES_PER_TUFT; n++) {
            const theta = prng.range(0, Math.PI * 2);
            const r = Math.sqrt(prng.next()) * center.spread;
            const nx = center.pos.x + Math.cos(theta) * r;
            const nz = center.pos.z + Math.sin(theta) * r;
            // Upward convex dome of needles
            const ny = center.pos.y + Math.max(0, 0.28 * (1.0 - (r / center.spread))) + prng.range(-0.06, 0.08);

            dummy.position.set(nx, ny, nz);
            dummy.rotation.set(
                prng.range(-0.4, 0.4),
                prng.range(0, Math.PI * 2),
                prng.range(-0.4, 0.4)
            );
            const s = prng.range(0.85, 1.35);
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();

            needleInstanced.setMatrixAt(nIdx, dummy.matrix);

            // Pine needle gradient
            const heightRatio = Math.max(0, Math.min(1, (ny - 3.5) / 8.0));
            if (heightRatio > 0.65) {
                tempColor.copy(colHighlight);
            } else if (heightRatio > 0.3) {
                tempColor.copy(colPrimary).lerp(colHighlight, (heightRatio - 0.3) * 0.5);
            } else {
                tempColor.copy(colDeep).lerp(colPrimary, 0.3);
            }
            tempColor.offsetHSL(prng.range(-0.01, 0.01), prng.range(-0.02, 0.02), prng.range(-0.02, 0.02));
            needleInstanced.setColorAt(nIdx, tempColor);

            nIdx++;
        }
    });

    needleInstanced.count = nIdx;
    needleInstanced.instanceMatrix.needsUpdate = true;
    if (needleInstanced.instanceColor) needleInstanced.instanceColor.needsUpdate = true;
    trunkGroup.add(needleInstanced);

    // ─── 4. PINE CONE ACCENTS ─────────────────────────────────────────────────
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x3d2516, roughness: 0.9 });
    const coneGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
    for (let c = 0; c < 14; c++) {
        const tc = prng.choice(needleTuftCenters);
        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.set(
            tc.pos.x + prng.range(-0.5, 0.5),
            tc.pos.y - 0.15,
            tc.pos.z + prng.range(-0.5, 0.5)
        );
        coneMesh.rotation.set(Math.PI + prng.range(-0.2, 0.2), 0, prng.range(-0.2, 0.2));
        trunkGroup.add(coneMesh);
    }

    return {
        trunkGroup,
        leafMeshes: [needleInstanced],
    };
}
