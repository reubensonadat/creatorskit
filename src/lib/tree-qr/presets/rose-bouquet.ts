import * as THREE from 'three';
import { PresetContext, PresetResult } from './types';

/**
 * Creates a curved petal geometry for roses and foliage
 */
function createCurvedPetalGeometry(size = 0.5): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const half = size / 2;
    const vertices = new Float32Array([
        0, 0, -half * 1.3,
        -half, 0.05, 0,
        half, 0.05, 0,

        -half, 0.05, 0,
        0, 0, half * 1.3,
        half, 0.05, 0,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
}

/**
 * Procedural Luxury Rose Bouquet Preset
 * =====================================
 * An authentic florist wrapped bouquet featuring:
 * - Flared kraft paper cone wrap with origami collar folds
 * - Satin ribbon belt with dimensional 3D bow knot & tails
 * - Exposed stem bundle at base
 * - Deep green salal foliage collar
 * - Meticulously sculpted concentric velvet spiral roses
 * - Scattered gypsophila (baby's breath) accent sprigs
 */
export function buildRoseBouquet(ctx: PresetContext): PresetResult {
    const { scene, palette, prng } = ctx;

    const trunkGroup = new THREE.Group();
    trunkGroup.name = 'roseBouquetPreset';
    scene.add(trunkGroup);

    // 1. Tapered Kraft Paper Wrap
    const wrapMat = new THREE.MeshStandardMaterial({
        color: 0xd6c7b2, // Ribbed natural kraft paper
        roughness: 0.88,
        metalness: 0.02,
        side: THREE.DoubleSide,
    });
    // Flared cone wrap: top radius 2.6, bottom radius 0.9, height 4.2
    const wrapGeo = new THREE.CylinderGeometry(2.6, 0.9, 4.2, 28, 1, true);
    const wrapMesh = new THREE.Mesh(wrapGeo, wrapMat);
    wrapMesh.position.set(0, 2.3, 0);
    wrapMesh.castShadow = true;
    wrapMesh.receiveShadow = true;
    trunkGroup.add(wrapMesh);

    // Origami flared fold collar around top rim
    const foldCount = 12;
    const foldMat = new THREE.MeshStandardMaterial({
        color: 0xccbba2,
        roughness: 0.92,
        side: THREE.DoubleSide,
    });
    for (let f = 0; f < foldCount; f++) {
        const fAngle = (f / foldCount) * Math.PI * 2;
        const foldGeo = new THREE.BufferGeometry();
        const fVerts = new Float32Array([
            0, 0, 0,
            -0.5, 0.6, 0.3,
            0.5, 0.6, 0.3,
        ]);
        foldGeo.setAttribute('position', new THREE.BufferAttribute(fVerts, 3));
        foldGeo.computeVertexNormals();
        const foldMesh = new THREE.Mesh(foldGeo, foldMat);
        foldMesh.position.set(Math.cos(fAngle) * 2.58, 4.35, Math.sin(fAngle) * 2.58);
        foldMesh.rotation.set(0.4, -fAngle + Math.PI / 2, 0);
        trunkGroup.add(foldMesh);
    }

    // 2. Satin Ribbon Belt & Bow Knot
    const ribbonColor = new THREE.Color(palette.primary);
    const ribbonMat = new THREE.MeshStandardMaterial({
        color: ribbonColor,
        roughness: 0.35,
        metalness: 0.25,
    });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.09, 8, 32), ribbonMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 1.45, 0);
    belt.castShadow = true;
    trunkGroup.add(belt);

    // Bow knot loops
    const loopGeo = new THREE.TorusGeometry(0.35, 0.07, 6, 18);
    const leftLoop = new THREE.Mesh(loopGeo, ribbonMat);
    leftLoop.position.set(-0.38, 1.45, 1.35);
    leftLoop.rotation.set(0.3, 0.5, 0.2);
    trunkGroup.add(leftLoop);

    const rightLoop = new THREE.Mesh(loopGeo, ribbonMat);
    rightLoop.position.set(0.38, 1.45, 1.35);
    rightLoop.rotation.set(0.3, -0.5, -0.2);
    trunkGroup.add(rightLoop);

    // Ribbon tails
    const tailGeo = new THREE.BoxGeometry(0.18, 1.1, 0.02);
    const leftTail = new THREE.Mesh(tailGeo, ribbonMat);
    leftTail.position.set(-0.28, 0.95, 1.38);
    leftTail.rotation.set(0.15, 0, 0.22);
    trunkGroup.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo, ribbonMat);
    rightTail.position.set(0.28, 0.95, 1.38);
    rightTail.rotation.set(0.15, 0, -0.22);
    trunkGroup.add(rightTail);

    // 3. Protruding Stems at Base
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.82 });
    for (let s = 0; s < 10; s++) {
        const sAngle = (s / 10) * Math.PI * 2;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), stemMat);
        stem.position.set(Math.cos(sAngle) * 0.42, 0.45, Math.sin(sAngle) * 0.42);
        stem.rotation.set(Math.sin(sAngle) * 0.18, 0, -Math.cos(sAngle) * 0.18);
        trunkGroup.add(stem);
    }

    // 4. Salal & Eucalyptus Foliage Collar
    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.65,
        metalness: 0.04,
        side: THREE.DoubleSide,
    });
    for (let l = 0; l < 14; l++) {
        const lAngle = (l / 14) * Math.PI * 2 + prng.range(-0.1, 0.1);
        const leaf = new THREE.Mesh(createCurvedPetalGeometry(1.0), leafMat);
        leaf.position.set(Math.cos(lAngle) * 2.4, 4.35, Math.sin(lAngle) * 2.4);
        leaf.rotation.set(-0.45, lAngle, 0.45);
        leaf.castShadow = true;
        trunkGroup.add(leaf);
    }

    // 5. Velvet Concentric Spiral Roses
    const colDeep = new THREE.Color(palette.deepShadow);
    const colPrimary = new THREE.Color(palette.primary);
    const colSecondary = new THREE.Color(palette.secondary);
    const colHighlight = new THREE.Color(palette.highlight);

    const roseMat = new THREE.MeshStandardMaterial({
        color: colPrimary.clone().lerp(colDeep, 0.35),
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide,
    });

    // 13 roses arranged in concentric rings (Hero center + 4 inner + 8 outer)
    const rosePositions: Array<{ x: number; y: number; z: number; scale: number; tiltX: number; tiltZ: number }> = [
        // Center Queen Rose
        { x: 0, y: 5.2, z: 0, scale: 1.2, tiltX: 0, tiltZ: 0 },
        // Inner ring (4 roses)
        { x: 0.95, y: 4.85, z: 0.45, scale: 1.05, tiltX: 0.2, tiltZ: -0.3 },
        { x: -0.9, y: 4.85, z: 0.5, scale: 1.05, tiltX: 0.2, tiltZ: 0.3 },
        { x: 0.55, y: 4.85, z: -0.85, scale: 1.05, tiltX: -0.3, tiltZ: -0.2 },
        { x: -0.6, y: 4.85, z: -0.8, scale: 1.05, tiltX: -0.3, tiltZ: 0.2 },
        // Outer ring (8 roses)
        { x: 1.6, y: 4.5, z: 0.0, scale: 0.95, tiltX: 0.0, tiltZ: -0.45 },
        { x: -1.6, y: 4.5, z: 0.0, scale: 0.95, tiltX: 0.0, tiltZ: 0.45 },
        { x: 0.0, y: 4.5, z: 1.6, scale: 0.95, tiltX: 0.45, tiltZ: 0.0 },
        { x: 0.0, y: 4.5, z: -1.6, scale: 0.95, tiltX: -0.45, tiltZ: 0.0 },
        { x: 1.15, y: 4.45, z: 1.15, scale: 0.9, tiltX: 0.35, tiltZ: -0.35 },
        { x: -1.15, y: 4.45, z: 1.15, scale: 0.9, tiltX: 0.35, tiltZ: 0.35 },
        { x: 1.15, y: 4.45, z: -1.15, scale: 0.9, tiltX: -0.35, tiltZ: -0.35 },
        { x: -1.15, y: 4.45, z: -1.15, scale: 0.9, tiltX: -0.35, tiltZ: 0.35 },
    ];

    rosePositions.forEach((rp) => {
        const roseGroup = new THREE.Group();
        roseGroup.position.set(rp.x, rp.y, rp.z);
        roseGroup.rotation.set(rp.tiltX, 0, rp.tiltZ);
        roseGroup.scale.set(rp.scale, rp.scale, rp.scale);

        // Core bud cylinder
        const budCore = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.15, 0.48, 8), roseMat);
        budCore.position.y = 0.22;
        roseGroup.add(budCore);

        // 4 spiral layers of curved petals
        for (let layer = 0; layer < 4; layer++) {
            const countInLayer = 3 + layer * 2;
            const radius = 0.32 + layer * 0.22;
            for (let p = 0; p < countInLayer; p++) {
                const theta = (p / countInLayer) * Math.PI * 2 + (layer * 0.55);
                const petal = new THREE.Mesh(createCurvedPetalGeometry(0.55 + layer * 0.18), roseMat);
                petal.position.set(Math.cos(theta) * radius, 0.12 + layer * 0.08, Math.sin(theta) * radius);
                petal.rotation.set(-0.35 - layer * 0.12, -theta, 0.38);
                petal.castShadow = true;
                roseGroup.add(petal);
            }
        }
        trunkGroup.add(roseGroup);
    });

    // 6. Gypsophila (Baby's Breath) filler florets
    const bbMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.05,
    });
    const bbGeo = new THREE.SphereGeometry(0.07, 5, 4);
    for (let bb = 0; bb < 60; bb++) {
        const bbx = prng.range(-2.1, 2.1);
        const bbz = prng.range(-2.1, 2.1);
        const bby = 4.4 + prng.range(-0.3, 1.0);
        const floret = new THREE.Mesh(bbGeo, bbMat);
        floret.position.set(bbx, bby, bbz);
        trunkGroup.add(floret);
    }

    return {
        trunkGroup,
        leafMeshes: [],
    };
}
