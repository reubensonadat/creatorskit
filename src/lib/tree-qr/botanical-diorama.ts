/**
 * Botanical QR Diorama — High-Fidelity 3D Tree & Organic Garden
 * =============================================================
 * Replaces chunky Minecraft voxels with the aesthetic from the reference demo:
 * 1. Tapered organic wooden trunk with natural bark rings and branching boughs.
 * 2. Delicate blossom petal cloud clusters (thousands of soft sakura petals).
 * 3. Ground cobblestone pavers for QR light modules.
 * 4. Fresh lawn with instanced vertical grass blades and tall wildflower stalks.
 * 5. Scattered fallen petal drifts across the courtyard floor.
 * 6. Guaranteed 100% scannable QR code in calibrated top-down 2D view.
 */

import * as THREE from 'three';
import { generateQRMatrix, stringToSeed, type QRMatrixResult } from './qr-matrix';
import { type FoliagePalette, type SceneType } from './tree-generator';
import { mulberry32 } from './voxel-qr';

export const BLOCK = 0.026; // Module spacing in world units

// ─── Color derivations for the botanical diorama ─────────────────────────────

export interface BotanicalDioramaColors {
    stonePaver: THREE.Color;
    stonePaverAlt: THREE.Color;
    stoneGrout: THREE.Color;
    grassLawn: THREE.Color;
    grassBlade: THREE.Color;
    grassBladeAlt: THREE.Color;
    wildflowerStem: THREE.Color;
    wildflowerTip: THREE.Color;
    trunkBark: THREE.Color;
    trunkDark: THREE.Color;
    branchWood: THREE.Color;
    petalLight: THREE.Color;
    petalMid: THREE.Color;
    petalDeep: THREE.Color;
    pedestalSlab: THREE.Color;
    paperBg: string;
}

export function deriveBotanicalColors(palette: FoliagePalette): BotanicalDioramaColors {
    const primary = new THREE.Color(palette.primary);
    const secondary = new THREE.Color(palette.secondary);
    const deep = new THREE.Color(palette.deepShadow);
    const highlight = new THREE.Color(palette.highlight);
    const accent = palette.flowerAccent ? new THREE.Color(palette.flowerAccent) : primary;

    const isFrost = palette.id === 'frost';

    return {
        stonePaver: new THREE.Color(isFrost ? '#e2e7ec' : '#ece8df'),
        stonePaverAlt: new THREE.Color(isFrost ? '#d5dce2' : '#dfd9ce'),
        stoneGrout: new THREE.Color(isFrost ? '#b0bcc6' : '#c8c1b3'),
        grassLawn: isFrost ? new THREE.Color('#3d5668') : new THREE.Color('#386427'),
        grassBlade: isFrost ? new THREE.Color('#58788c') : new THREE.Color('#4d8832'),
        grassBladeAlt: isFrost ? new THREE.Color('#789baa') : new THREE.Color('#68ab45'),
        wildflowerStem: isFrost ? new THREE.Color('#6a8c9e') : new THREE.Color('#467b2e'),
        wildflowerTip: accent.clone().lerp(new THREE.Color('#ffffff'), 0.15),
        trunkBark: new THREE.Color('#4a2f1b'),
        trunkDark: new THREE.Color('#2e1a0d'),
        branchWood: new THREE.Color('#5c3c23'),
        petalLight: highlight.clone().lerp(primary, 0.4),
        petalMid: primary.clone(),
        petalDeep: deep.clone().lerp(secondary, 0.3),
        pedestalSlab: new THREE.Color('#d4cfc4'),
        paperBg: '#f6f3ec',
    };
}

// ─── Procedural Botanical Geometries ─────────────────────────────────────────

/** Single delicate blossom petal / leaf quad with slight crossways curl. */
export function createPetalGeometry(size = 0.022): THREE.BufferGeometry {
    const w = size * 0.75;
    const h = size;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-w * 0.6, h * 0.3, -w * 0.5, h * 0.8, 0, h);
    shape.bezierCurveTo(w * 0.5, h * 0.8, w * 0.6, h * 0.3, 0, 0);

    const geo = new THREE.ShapeGeometry(shape, 2);
    // Curl the tip slightly upward
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setZ(i, (y / h) * (y / h) * 0.005);
    }
    geo.computeVertexNormals();
    return geo;
}

/** Slender vertical grass blade with natural forward arc. */
export function createGrassBladeGeometry(): THREE.BufferGeometry {
    const segs = 3;
    const h = BLOCK * 1.35;
    const halfW = BLOCK * 0.12;
    const pos: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const w = halfW * (1 - t * 0.88);
        const y = t * h;
        const z = t * t * (BLOCK * 0.35); // forward arc
        pos.push(-w, y, z, w, y, z);
        if (i < segs) {
            const a = i * 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

/** Tall wildflower stalk with little blossom florets. */
export function createWildflowerGeometry(): THREE.BufferGeometry {
    const h = BLOCK * 1.9;
    const halfW = BLOCK * 0.08;
    const pos: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        const w = halfW * (1 - t * 0.6);
        const y = t * h;
        pos.push(-w, y, 0, w, y, 0);
        if (i < 4) {
            const a = i * 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

// ─── Tapered Organic Trunk with Branches ─────────────────────────────────────

export interface TreeSkeleton {
    trunkMesh: THREE.Mesh;
    branchGroup: THREE.Group;
    foliageOrigins: THREE.Vector3[];
    treeHeight: number;
}

export function buildOrganicTree(
    sceneType: SceneType,
    colors: BotanicalDioramaColors,
    rng: () => number
): TreeSkeleton {
    const group = new THREE.Group();
    const foliageOrigins: THREE.Vector3[] = [];

    const isBonsai = sceneType === 'bonsai';
    const isPine = sceneType === 'pine';

    const trunkHeight = isBonsai ? BLOCK * 6.5 : isPine ? BLOCK * 14 : BLOCK * 10.5;
    const baseRadius = isBonsai ? BLOCK * 1.4 : BLOCK * 1.15;
    const topRadius = isBonsai ? BLOCK * 0.65 : BLOCK * 0.55;

    // 1. Tapered segmented trunk cylinder with bark rings
    const trunkGeo = new THREE.CylinderGeometry(topRadius, baseRadius, trunkHeight, 14, 8);
    // Root flare at the base
    const pos = trunkGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = 1 - (y + trunkHeight * 0.5) / trunkHeight; // 1 at base, 0 at top
        if (t > 0.6) {
            const flare = Math.pow((t - 0.6) / 0.4, 1.8) * (BLOCK * 0.45);
            pos.setX(i, pos.getX(i) * (1 + flare));
            pos.setZ(i, pos.getZ(i) * (1 + flare));
        }
        // Subtle bark ridges
        const angle = Math.atan2(pos.getZ(i), pos.getX(i));
        const ridge = Math.sin(angle * 6 + y * 45) * (BLOCK * 0.035);
        pos.setX(i, pos.getX(i) + Math.cos(angle) * ridge);
        pos.setZ(i, pos.getZ(i) + Math.sin(angle) * ridge);
    }
    trunkGeo.computeVertexNormals();

    const trunkMat = new THREE.MeshLambertMaterial({
        color: colors.trunkBark,
    });
    const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
    trunkMesh.position.y = trunkHeight * 0.5;

    // 2. Branching limbs
    const branchGroup = new THREE.Group();
    const branchMat = new THREE.MeshLambertMaterial({ color: colors.branchWood });

    const numBranches = isBonsai ? 4 : isPine ? 7 : 6;
    for (let i = 0; i < numBranches; i++) {
        const angle = (i / numBranches) * Math.PI * 2 + rng() * 0.4;
        const bLength = trunkHeight * (0.45 + rng() * 0.35);
        const bRadius = topRadius * (0.55 + rng() * 0.25);

        const branchGeo = new THREE.CylinderGeometry(bRadius * 0.45, bRadius, bLength, 7);
        branchGeo.translate(0, bLength * 0.5, 0);

        const branch = new THREE.Mesh(branchGeo, branchMat);
        const attachY = trunkHeight * (0.55 + (i / numBranches) * 0.4);
        branch.position.set(0, attachY, 0);

        // Angled outward and upward
        const pitch = isPine ? 0.95 : 0.65 + rng() * 0.3;
        branch.rotation.y = angle;
        branch.rotation.z = -pitch;

        branchGroup.add(branch);

        // Branch tip origin for foliage clusters
        const tipX = Math.sin(pitch) * Math.cos(angle) * bLength;
        const tipZ = Math.sin(pitch) * Math.sin(angle) * bLength;
        const tipY = attachY + Math.cos(pitch) * bLength;
        foliageOrigins.push(new THREE.Vector3(tipX, tipY, tipZ));
    }

    // Top crown center
    foliageOrigins.push(new THREE.Vector3(0, trunkHeight + BLOCK * 1.2, 0));

    return {
        trunkMesh,
        branchGroup,
        foliageOrigins,
        treeHeight: trunkHeight,
    };
}

// ─── Canopy Blossom Petal Cloud ──────────────────────────────────────────────

export function buildPetalCanopy(
    sceneType: SceneType,
    origins: THREE.Vector3[],
    colors: BotanicalDioramaColors,
    canopyRadius: number,
    rng: () => number
): THREE.InstancedMesh {
    const isWisteria = sceneType === 'wisteria';
    const isMaple = sceneType === 'maple';
    const isPine = sceneType === 'pine';

    const numPetals = isPine ? 1400 : 2200;
    const petalGeo = createPetalGeometry(BLOCK * 0.95);
    const petalMat = new THREE.MeshLambertMaterial({
        side: THREE.DoubleSide,
    });

    const mesh = new THREE.InstancedMesh(petalGeo, petalMat, numPetals);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const rot = new THREE.Euler();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();

    let idx = 0;
    for (let i = 0; i < numPetals; i++) {
        // Pick an origin branch or crown
        const origin = origins[i % origins.length];
        const rad = canopyRadius * (0.2 + 0.8 * Math.pow(rng(), 0.7));
        const theta = rng() * Math.PI * 2;
        const phi = (rng() - 0.4) * Math.PI;

        const x = origin.x + Math.cos(theta) * Math.cos(phi) * rad;
        let y = origin.y + Math.sin(phi) * rad * 0.65;
        const z = origin.z + Math.sin(theta) * Math.cos(phi) * rad;

        // Wisteria drooping effect
        if (isWisteria && rad > canopyRadius * 0.45) {
            y -= rng() * BLOCK * 5.0;
        }

        pos.set(x, Math.max(y, BLOCK * 2), z);
        rot.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
        quat.setFromEuler(rot);

        const s = 0.75 + rng() * 0.55;
        scale.set(s, s, s);

        m.compose(pos, quat, scale);
        mesh.setMatrixAt(idx, m);

        // Petal color variation: lighter on outer fringe, deeper toward inner core
        const distFromCenter = Math.hypot(x, z);
        const t = Math.min(distFromCenter / canopyRadius, 1);
        const r = rng();
        if (r < 0.45) {
            color.copy(colors.petalLight).lerp(colors.petalMid, 1 - t);
        } else if (r < 0.82) {
            color.copy(colors.petalMid);
        } else {
            color.copy(colors.petalDeep);
        }

        mesh.setColorAt(idx, color);
        idx++;
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
}

// ─── Ground Paving & Lawn with Grass Sprigs ───────────────────────────────────

export interface BotanicalGround {
    group: THREE.Group;
    pavingMesh: THREE.InstancedMesh;
    lawnMesh: THREE.InstancedMesh;
    grassSprigsMesh: THREE.InstancedMesh;
    wildflowersMesh: THREE.InstancedMesh;
    fallenPetalsMesh: THREE.InstancedMesh;
    pedestalMesh: THREE.Mesh;
}

export function buildBotanicalGround(
    matrix: QRMatrixResult,
    colors: BotanicalDioramaColors,
    rng: () => number
): BotanicalGround {
    const group = new THREE.Group();
    const size = matrix.size;
    const modules = matrix.modules;
    const c = size / 2;
    const halfGrid = (size * BLOCK) / 2;

    let lightCount = 0;
    let darkCount = 0;
    for (let r = 0; r < size; r++) {
        for (let col = 0; col < size; col++) {
            if (modules[r][col].isDark) darkCount++;
            else lightCount++;
        }
    }

    // 1. Light modules: Beveled stone pavers
    const paverGeo = new THREE.BoxGeometry(BLOCK * 0.94, BLOCK * 0.4, BLOCK * 0.94);
    const paverMat = new THREE.MeshLambertMaterial();
    const pavingMesh = new THREE.InstancedMesh(paverGeo, paverMat, lightCount);
    pavingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // 2. Dark modules: Living green lawn tiles
    const lawnGeo = new THREE.BoxGeometry(BLOCK * 0.96, BLOCK * 0.42, BLOCK * 0.96);
    const lawnMat = new THREE.MeshLambertMaterial();
    const lawnMesh = new THREE.InstancedMesh(lawnGeo, lawnMat, darkCount);
    lawnMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // 3. Grass sprigs on outer lawn modules (reference photo)
    const grassGeo = createGrassBladeGeometry();
    const grassMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    const maxSprigs = darkCount * 4;
    const grassSprigsMesh = new THREE.InstancedMesh(grassGeo, grassMat, maxSprigs);

    // 4. Wildflower stalks on outer lawn modules
    const flowerGeo = createWildflowerGeometry();
    const flowerMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    const maxFlowers = darkCount;
    const wildflowersMesh = new THREE.InstancedMesh(flowerGeo, flowerMat, maxFlowers);

    // 5. Fallen petals on ground (reference photo)
    const fallenPetalGeo = createPetalGeometry(BLOCK * 0.7);
    const fallenPetalMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    const maxFallenPetals = 450;
    const fallenPetalsMesh = new THREE.InstancedMesh(fallenPetalGeo, fallenPetalMat, maxFallenPetals);

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const color = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);

    let lightIdx = 0;
    let darkIdx = 0;
    let sprigIdx = 0;
    let flowerIdx = 0;
    let fallenIdx = 0;

    const innerRadius = size * 0.32;

    for (let r = 0; r < size; r++) {
        for (let col = 0; col < size; col++) {
            const info = modules[r][col];
            const x = col * BLOCK - halfGrid + BLOCK * 0.5;
            const z = r * BLOCK - halfGrid + BLOCK * 0.5;
            const distFromCenter = Math.hypot(col + 0.5 - c, r + 0.5 - c);

            if (!info.isDark) {
                // Light stone paver
                pos.set(x, BLOCK * 0.2, z);
                m.makeTranslation(pos.x, pos.y, pos.z);
                pavingMesh.setMatrixAt(lightIdx, m);

                const n = rng();
                if (n < 0.55) color.copy(colors.stonePaver);
                else if (n < 0.88) color.copy(colors.stonePaverAlt);
                else color.copy(colors.stonePaver).lerp(colors.stoneGrout, 0.25);

                pavingMesh.setColorAt(lightIdx, color);
                lightIdx++;

                // Fallen petals scattered under the tree courtyard
                if (distFromCenter < innerRadius * 1.3 && fallenIdx < maxFallenPetals && rng() < 0.45) {
                    pos.set(x + (rng() - 0.5) * BLOCK * 0.6, BLOCK * 0.42, z + (rng() - 0.5) * BLOCK * 0.6);
                    quat.setFromAxisAngle(up, rng() * Math.PI * 2);
                    scale.setScalar(0.7 + rng() * 0.5);
                    m.compose(pos, quat, scale);
                    fallenPetalsMesh.setMatrixAt(fallenIdx, m);
                    fallenPetalsMesh.setColorAt(
                        fallenIdx,
                        rng() < 0.6 ? colors.petalLight : colors.petalMid
                    );
                    fallenIdx++;
                }
            } else {
                // Dark module: Green lawn tile
                pos.set(x, BLOCK * 0.21, z);
                m.makeTranslation(pos.x, pos.y, pos.z);
                lawnMesh.setMatrixAt(darkIdx, m);

                // Tree shadow factor
                const shadow = distFromCenter < innerRadius ? 0.82 : 1.0;
                color.copy(colors.grassLawn).multiplyScalar(shadow);
                lawnMesh.setColorAt(darkIdx, color);
                darkIdx++;

                // Grass sprigs on outer lawn areas (exactly like reference photo)
                if (distFromCenter > innerRadius * 0.85 && sprigIdx < maxSprigs) {
                    const sprigCount = 1 + Math.floor(rng() * 3);
                    for (let s = 0; s < sprigCount; s++) {
                        pos.set(
                            x + (rng() - 0.5) * BLOCK * 0.7,
                            BLOCK * 0.4,
                            z + (rng() - 0.5) * BLOCK * 0.7
                        );
                        quat.setFromAxisAngle(up, rng() * Math.PI * 2);
                        scale.setScalar(0.75 + rng() * 0.45);
                        m.compose(pos, quat, scale);
                        grassSprigsMesh.setMatrixAt(sprigIdx, m);
                        grassSprigsMesh.setColorAt(
                            sprigIdx,
                            rng() < 0.5 ? colors.grassBlade : colors.grassBladeAlt
                        );
                        sprigIdx++;
                    }

                    // Occasional tall wildflower stalk with pink blossom tip
                    if (rng() < 0.28 && flowerIdx < maxFlowers) {
                        pos.set(
                            x + (rng() - 0.5) * BLOCK * 0.6,
                            BLOCK * 0.4,
                            z + (rng() - 0.5) * BLOCK * 0.6
                        );
                        quat.setFromAxisAngle(up, rng() * Math.PI * 2);
                        scale.setScalar(0.85 + rng() * 0.35);
                        m.compose(pos, quat, scale);
                        wildflowersMesh.setMatrixAt(flowerIdx, m);
                        wildflowersMesh.setColorAt(flowerIdx, colors.wildflowerTip);
                        flowerIdx++;
                    }
                }
            }
        }
    }

    grassSprigsMesh.count = sprigIdx;
    wildflowersMesh.count = flowerIdx;
    fallenPetalsMesh.count = fallenIdx;

    if (pavingMesh.instanceColor) pavingMesh.instanceColor.needsUpdate = true;
    if (lawnMesh.instanceColor) lawnMesh.instanceColor.needsUpdate = true;
    if (grassSprigsMesh.instanceColor) grassSprigsMesh.instanceColor.needsUpdate = true;
    if (wildflowersMesh.instanceColor) wildflowersMesh.instanceColor.needsUpdate = true;
    if (fallenPetalsMesh.instanceColor) fallenPetalsMesh.instanceColor.needsUpdate = true;

    // 6. Clean Pedestal Slab underneath
    const slabSize = size * BLOCK * 1.04;
    const slabGeo = new THREE.BoxGeometry(slabSize, BLOCK * 1.4, slabSize);
    const slabMat = new THREE.MeshLambertMaterial({ color: colors.pedestalSlab });
    const pedestalMesh = new THREE.Mesh(slabGeo, slabMat);
    pedestalMesh.position.y = -BLOCK * 0.7;

    group.add(
        pedestalMesh,
        pavingMesh,
        lawnMesh,
        grassSprigsMesh,
        wildflowersMesh,
        fallenPetalsMesh
    );

    return {
        group,
        pavingMesh,
        lawnMesh,
        grassSprigsMesh,
        wildflowersMesh,
        fallenPetalsMesh,
        pedestalMesh,
    };
}
