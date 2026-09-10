/**
 * Voxel QR Diorama — Pure Authentic Morph Engine
 * ===============================================
 * The exact architecture of tree.icqr.com:
 * 1. ONE unified voxel world where canopy blocks, trunk blocks, and ground blocks
 *    ARE the modules of the QR code.
 * 2. Seamless height morph:
 *    - In 3D (progress = 0): Canopy & trunk blocks sit at full 3D layer heights.
 *    - In 2D (progress = 1): Camera tilts to direct top-down (90°), and all block
 *      heights smoothly descend into layer 0, flattening into the scannable QR code!
 *    - Returning to 3D: Blocks rise back out of the QR code, growing the tree!
 * 3. Delicate grass sprigs & wildflower stalks on outer green lawn modules.
 * 4. Slender wooden branch sticks connecting trunk to canopy.
 * 5. Full 2-axis interactive 3D orbit (yaw + pitch) with momentum and zoom.
 */

import * as THREE from 'three';
import type { FoliagePalette, SceneType } from './tree-generator';
import type { VoxelData } from './voxel-blocks';
import { generateVoxelDiorama } from './voxel-blocks';
import type { BlocksMesh, PetalField } from './voxel-meshes';
import { buildBlocksMesh, buildPetalField, buildSlabMesh } from './voxel-meshes';
import type { FoliageLayer, WindUniforms } from './foliage-meshes';
import { buildLeafCanopy, buildGrassField, buildBlossomField } from './foliage-meshes';
import { getFoliageTextures } from './foliage-textures';
import {
    BLOCK,
    FIT_2D,
    FIT_3D,
    FLAT_ANGLE_X,
    FLAT_ANGLE_Y,
    ISO_ANGLE_X,
    ISO_ANGLE_Y,
    LERP_SPEED,
    REBUILD_DURATION_RECOLOR,
    REBUILD_DURATION_PRESET,
    REBUILD_DURATION_URL,
    TRUNK_RADIUS,
    VOXEL_SHAPES,
    X_OFFSET_2D_FACTOR,
    Y_OFFSET_2D_FACTOR,
    deriveVoxelTones,
    easeInOutCubic,
    easeOutCubic,
    mulberry32,
    type VoxelPresetShape,
    type VoxelTones,
    VoxelBlockType,
} from './voxel-qr';
import { stringToSeed } from './qr-matrix';

export type ViewMode = '2d' | '3d';
export type RebuildKind = 'url' | 'preset' | 'recolor';

export interface VoxelSceneOptions {
    onModeChange?: (mode: ViewMode) => void;
    reducedMotion?: boolean;
}

const REBUILD_DURATIONS: Record<RebuildKind, number> = {
    url: REBUILD_DURATION_URL,
    preset: REBUILD_DURATION_PRESET,
    recolor: REBUILD_DURATION_RECOLOR,
};

export class VoxelQRScene {
    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    private stage = new THREE.Group();

    private data: VoxelData | null = null;
    private tones: VoxelTones | null = null;
    private blocksMesh: BlocksMesh | null = null;
    private petalField: PetalField | null = null;
    private slabMesh: THREE.Object3D | null = null;
    private branchGroup = new THREE.Group();

    // Organic foliage — alpha-clipped leaf/grass/blossom planes whose wind
    // sway and morph flattening run entirely in an injected vertex shader.
    private foliageGroup = new THREE.Group();
    private leafLayer: FoliageLayer | null = null;
    private grassLayer: FoliageLayer | null = null;
    private blossomLayer: FoliageLayer | null = null;
    private wind: WindUniforms = {
        uTime: { value: 0 },
        uReveal: { value: 1 },
        uFlatten: { value: 0 },
    };

    private rawProgress = 0;
    private progress = 0;
    private flat = false;
    private time = 0;
    private aspect = 1;
    /** Pixels of docked studio UI covering the canvas's right edge. */
    private sidebarInset = 0;
    private viewW = 0;

    // Interactive 3D camera controls:
    // Natural direct manipulation: drag right rotates right, drag up tilts up
    private dragYaw = 0;
    private dragPitch = 0;
    private targetYaw = 0;
    private targetPitch = 0;
    private zoomMul = 1;
    private targetZoom = 1;

    private rebuild: { t: number; dur: number; max: number } | null = null;
    private matrix = new THREE.Matrix4();
    private quat = new THREE.Quaternion();
    private scaleV = new THREE.Vector3();
    private posV = new THREE.Vector3();
    private currentSceneType: SceneType = 'sakura';

    constructor(
        private canvas: HTMLCanvasElement,
        public opts: VoxelSceneOptions = {}
    ) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            preserveDrawingBuffer: true,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor('#f6f3ec');

        this.camera.position.z = 20;
        this.scene.add(this.stage);
        this.stage.add(this.branchGroup, this.foliageGroup);

        // Warm ambient and directional lighting matching the reference photo
        const hemi = new THREE.HemisphereLight(0xfff6ea, 0x6a5845, 0.95);
        this.stage.add(hemi);

        const sun = new THREE.DirectionalLight(0xffffff, 1.25);
        sun.position.set(-8, 14, 8);
        this.stage.add(sun);

        const ambient = new THREE.AmbientLight(0xffffff, 0.35);
        this.scene.add(ambient);
    }

    // ─── Public API ────────────────────────────────────────────────────────

    build(url: string, sceneType: SceneType, palette: FoliagePalette, kind: RebuildKind = 'url'): void {
        this.disposeMeshes();
        this.currentSceneType = sceneType;

        const data = generateVoxelDiorama(url, sceneType);
        const tones = deriveVoxelTones(palette);
        const rng = mulberry32(stringToSeed(url + '::' + sceneType + '::dress'));

        let maxLayer = 6;
        for (const b of data.blocks) if (b.layer > maxLayer) maxLayer = b.layer;
        const topWorld = Math.max(maxLayer, data.leafTop) * BLOCK;

        // 1. Instanced voxel blocks (ground tiles, trunk, house) — these ARE
        // the QR modules and carry the guaranteed flatten morph.
        this.blocksMesh = buildBlocksMesh(data, tones);

        // 2. Drifting petals
        this.petalField = buildPetalField(data.petalCount, tones, data.halfGridWorld, topWorld, rng);
        this.petalField.material.opacity = 0;

        // 3. Earth pedestal slab
        this.slabMesh = buildSlabMesh(data, tones);

        // 4. Rounded organic trunk + slender branch struts connecting it to
        // the canopy, or a charming handcrafted 3D cottage diorama centerpiece
        if (sceneType === 'house') {
            this.buildCottageCenterpiece(tones, rng);
        } else {
            this.buildRoundedTrunk(tones, VOXEL_SHAPES[sceneType], rng);
            this.buildBranches(tones, rng);
        }

        // 5. Organic foliage — scattered alpha-clipped planes grown from the
        // preset's rules: leaf-cluster canopy, crossed grass-blade tufts on
        // the lawn modules, and wildflower blossoms. Wind + morph run in the
        // injected vertex shader; this rebuild resets the bloom clock.
        const tex = getFoliageTextures();
        this.leafLayer = buildLeafCanopy(data, tones, tex.leaf, this.wind, rng);
        this.grassLayer = buildGrassField(data, tones, tex.grass, this.wind, rng);
        this.blossomLayer = buildBlossomField(data, tones, tex.blossom, this.wind, rng);
        if (this.leafLayer) this.foliageGroup.add(this.leafLayer.mesh);
        if (this.grassLayer) this.foliageGroup.add(this.grassLayer.mesh);
        if (this.blossomLayer) this.foliageGroup.add(this.blossomLayer.mesh);
        this.wind.uReveal.value = 0;

        this.stage.add(this.slabMesh, this.blocksMesh.mesh, this.petalField.points);

        this.renderer.setClearColor(tones.paper);

        this.data = data;
        this.tones = tones;

        const dur = this.opts.reducedMotion ? 0.15 : REBUILD_DURATIONS[kind];
        this.rebuild = { t: 0, dur, max: data.maxStagger };
        this.applyRebuild(0);
    }

    setFlat(flat: boolean): void {
        if (this.flat === flat) return;
        this.flat = flat;
        this.opts.onModeChange?.(flat ? '2d' : '3d');
    }

    toggle(): ViewMode {
        this.setFlat(!this.flat);
        return this.flat ? '2d' : '3d';
    }

    getView(): ViewMode {
        return this.flat ? '2d' : '3d';
    }

    resetCamera(): void {
        this.targetYaw = 0;
        this.targetPitch = 0;
        this.targetZoom = 1;
    }

    addOrbitDelta(dx: number, dy = 0): void {
        if (this.flat) return; // Locked strictly top-down in 2D QR mode
        // Direct-manipulation orbit: drag left pulls world left, drag down tilts down
        this.targetYaw += dx * 0.0065;
        // Curated pitch range: keeps elevation between ~18° and ~58° so the diorama
        // always looks photogenic and never dips below ground or flips overhead.
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.005, -0.32, 0.42);
    }

    addZoomDelta(delta: number): void {
        this.targetZoom = THREE.MathUtils.clamp(this.targetZoom * (1 + delta), 0.65, 1.85);
    }

    /**
     * Docked right-side studio UI covering `px` of the canvas — the world
     * smoothly recenters inside the *visible* viewport instead of hiding
     * behind the panel.
     */
    setSidebarInset(px: number): void {
        this.sidebarInset = Math.max(0, px);
    }

    /** Quarter-turn view rotation (direction: 1 = right, -1 = left). */
    rotateView90(direction: 1 | -1): void {
        this.targetYaw += direction * (Math.PI / 2);
    }

    resize(width: number, height: number): void {
        this.viewW = width;
        this.aspect = Math.max(width / Math.max(height, 1), 0.01);
        this.renderer.setSize(width, height, false);
    }

    update(dt: number): void {
        this.time += dt;

        // Smooth camera damping
        const lerpFactor = Math.min(1, 14 * dt);
        this.dragYaw += (this.targetYaw - this.dragYaw) * lerpFactor;
        this.dragPitch += (this.targetPitch - this.dragPitch) * lerpFactor;
        this.zoomMul += (this.targetZoom - this.zoomMul) * lerpFactor;

        // Animate 3D ⇄ 2D view morph
        const target = this.flat ? 1 : 0;
        if (this.opts.reducedMotion) {
            this.rawProgress = target;
        } else {
            this.rawProgress += (target - this.rawProgress) * Math.min(1, LERP_SPEED * dt);
            if (Math.abs(this.rawProgress - target) < 0.001) this.rawProgress = target;
        }
        this.progress = easeInOutCubic(this.rawProgress);

        // Rebuild ripple stagger
        if (this.rebuild) {
            this.rebuild.t += dt / this.rebuild.dur;
            if (this.rebuild.t >= 1) {
                this.rebuild = null;
                this.applyRebuild(1);
            } else {
                this.applyRebuild(this.rebuild.t);
            }
        } else {
            // Live height morph during 3D ⇄ 2D transition
            this.applyHeightMorph(this.progress);
        }

        // Foliage: GPU wind clock + morph uniforms. The canopy descends with
        // the same flatten factor as the blocks (group Y-scale) while the
        // shader collapses each plane into its anchor — the world dissolves
        // into the scannable QR exactly like the block layers do.
        this.wind.uTime.value = this.time;
        this.wind.uFlatten.value = this.progress;
        this.wind.uReveal.value = this.rebuild ? easeOutCubic(Math.min(1, this.rebuild.t)) : 1;
        this.foliageGroup.scale.set(1, Math.max(0.001, 1 - this.progress), 1);
        this.foliageGroup.visible = this.progress < 0.92;

        this.updatePetals(dt);
        this.applyView(this.progress);
        this.renderer.render(this.scene, this.camera);
    }

    capture(pureQR: boolean): string {
        const prevZoom = this.zoomMul;
        const prevPetalOpacity = this.petalField ? this.petalField.material.opacity : 0;
        const prevFoliageVisible = this.foliageGroup.visible;
        const prevFlatten = this.wind.uFlatten.value;
        const prevReveal = this.wind.uReveal.value;
        this.zoomMul = 1;
        if (this.petalField) this.petalField.material.opacity = pureQR ? 0 : prevPetalOpacity;
        // Pure-QR export: foliage must be fully collapsed so only the flat
        // scannable tiles remain. 3D snapshot: foliage at its live morph state.
        this.wind.uFlatten.value = pureQR ? 1 : this.progress;
        this.wind.uReveal.value = 1;
        this.foliageGroup.scale.set(1, Math.max(0.001, 1 - (pureQR ? 1 : this.progress)), 1);
        this.foliageGroup.visible = !pureQR && this.progress < 0.92;
        this.applyView(pureQR ? 1 : this.progress);
        if (pureQR) this.applyHeightMorph(1);
        this.renderer.render(this.scene, this.camera);
        const url = this.renderer.domElement.toDataURL('image/png');
        this.zoomMul = prevZoom;
        if (this.petalField) this.petalField.material.opacity = prevPetalOpacity;
        this.foliageGroup.visible = prevFoliageVisible;
        this.wind.uFlatten.value = prevFlatten;
        this.wind.uReveal.value = prevReveal;
        this.applyView(this.progress);
        this.applyHeightMorph(this.progress);
        return url;
    }

    dispose(): void {
        this.disposeMeshes();
        this.renderer.dispose();
    }

    // ─── Internals ─────────────────────────────────────────────────────────

    private applyView(progress: number): void {
        if (!this.data) return;

        const shapeSway = VOXEL_SHAPES[this.currentSceneType]?.sway ?? 0.04;
        const idleSway = Math.sin(this.time * 0.5) * shapeSway * (1 - progress);

        // Interpolate yaw and pitch towards calibrated flat 2D values
        // Drag deltas smoothly blend to 0 as progress approaches 1 (2D mode)
        // guaranteeing the QR code is strictly squared, upright, and instantly scannable
        const dragBlend = 1 - progress;
        const currentIsoY = ISO_ANGLE_Y + this.dragYaw * dragBlend;
        const currentIsoX = ISO_ANGLE_X + this.dragPitch * dragBlend;

        const angleY = THREE.MathUtils.lerp(currentIsoY, FLAT_ANGLE_Y, progress) + idleSway;
        const angleX = THREE.MathUtils.lerp(currentIsoX, FLAT_ANGLE_X, progress);

        // Euler order 'YXZ': Rotate yaw (Y) first, then pitch (X)
        this.stage.rotation.set(angleX, angleY, 0, 'YXZ');

        // Scale and fade branch & centerpiece structures alongside the foliage
        this.branchGroup.scale.set(1, Math.max(0.001, 1 - progress), 1);
        this.branchGroup.visible = progress < 0.96;

        const fit = THREE.MathUtils.lerp(FIT_3D, FIT_2D, progress);
        const halfH = this.data.halfGridWorld * fit * (1 + (this.zoomMul - 1) * (1 - progress * 0.9));
        const halfW = halfH * this.aspect;

        // Recenter horizontally inside the visible viewport when the docked
        // studio panel covers the right edge of the full-page canvas.
        this.camera.position.x =
            this.sidebarInset > 0 && this.viewW > 0
                ? halfW * Math.min(0.45, this.sidebarInset / this.viewW)
                : 0;

        this.camera.left = -halfW;
        this.camera.right = halfW;
        this.camera.top = halfH;
        this.camera.bottom = -halfH;
        this.camera.updateProjectionMatrix();

        // Offset the stage downwards in 3D so the base rests near the bottom controls
        const lowerOffset = -halfH * 0.45 * (1 - progress);
        this.stage.position.y = Y_OFFSET_2D_FACTOR * this.data.halfGridWorld * progress + lowerOffset;
        this.stage.position.x = X_OFFSET_2D_FACTOR * this.data.halfGridWorld * progress;
    }

    /**
     * Seamless physical height morph:
     * - At progress = 0 (3D): Blocks are at full layer heights.
     * - At progress = 1 (2D): Blocks smoothly descend down into layer 0,
     *   flattens into the scannable QR code!
     */
    private applyHeightMorph(progress: number): void {
        const bm = this.blocksMesh;
        const data = this.data;
        if (!bm || !data) return;

        const hFactor = 1 - progress; // 1 in 3D, 0 in 2D
        const halfGrid = data.halfGridWorld;

        for (let i = 0; i < bm.count; i++) {
            const b = data.blocks[i];
            const x = b.col * BLOCK - halfGrid;
            const flattenOffset = (1 - hFactor) * b.layer * 0.005;
            const y = (b.layer * hFactor + 0.5 + flattenOffset) * BLOCK;
            const z = b.row * BLOCK - halfGrid;

            // Tree blocks shrink to zero in 2D mode so they don't disrupt the QR code
            const s = b.layer > 0 ? Math.max(0.001, hFactor) : 1;

            this.matrix.makeTranslation(x, y, z);
            if (s !== 1) this.matrix.scale(new THREE.Vector3(s, s, s));
            bm.mesh.setMatrixAt(i, this.matrix);
        }
        bm.mesh.instanceMatrix.needsUpdate = true;

        // Branches flatten alongside the tree; the foliage planes flatten via
        // the wind shader's uFlatten + foliageGroup Y-scale in update().
        const branchScale = Math.max(0.001, hFactor);
        this.branchGroup.scale.set(1, branchScale, 1);
    }

    private applyRebuild(t: number): void {
        const bm = this.blocksMesh;
        const data = this.data;
        if (!bm || !data) return;
        const max = this.rebuild?.max ?? data.maxStagger ?? 1;

        if (t >= 1) {
            this.applyHeightMorph(this.progress);
            return;
        }

        const halfGrid = data.halfGridWorld;
        const hFactor = 1 - this.progress;

        // Center-outward stagger ripple
        for (let i = 0; i < bm.count; i++) {
            const b = data.blocks[i];
            const localT = THREE.MathUtils.clamp((t - (bm.staggers[i] / max) * 0.45) / 0.55, 0, 1);
            const s = easeOutCubic(localT);

            if (s <= 0.001) {
                this.matrix.makeScale(0.0001, 0.0001, 0.0001);
                bm.mesh.setMatrixAt(i, this.matrix);
            } else {
                const x = b.col * BLOCK - halfGrid;
                const flattenOffset = (1 - hFactor) * b.layer * 0.005;
                const y = (b.layer * hFactor + 0.5 + flattenOffset) * BLOCK;
                const z = b.row * BLOCK - halfGrid;

                const finalScale = b.layer > 0 ? Math.max(0.001, hFactor) * s : s;

                this.posV.set(x, y, z);
                this.scaleV.setScalar(finalScale);
                this.matrix.compose(this.posV, this.quat, this.scaleV);
                bm.mesh.setMatrixAt(i, this.matrix);
            }
        }
        bm.mesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Sculpted organic botanical trunk:
     * - Taller, elegant profile with natural taper and botanical sweep
     * - Multi-segmented shaft tailored to the preset shape (graceful, bonsai s-curve, or pagoda pine mast)
     * - Nebari root buttresses fluting outward and tapering onto the courtyard pavers
     */
    private buildRoundedTrunk(tones: VoxelTones, shape: VoxelPresetShape, rng: () => number): void {
        const isBonsai = this.currentSceneType === 'bonsai';
        const isPine = this.currentSceneType === 'pine';

        // Taller, more majestic trunk height matching reference aesthetics
        const trunkH = Math.max(10, shape.trunkLayers * 1.35) * BLOCK;
        const rBase = (shape.trunkRadius ?? TRUNK_RADIUS) * BLOCK * 0.85;
        const baseY = BLOCK * 0.85;

        const barkDark = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[2][0], tones.trunk[2][1], tones.trunk[2][2]),
        });
        const barkMid = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[1][0], tones.trunk[1][1], tones.trunk[1][2]),
        });
        const barkLight = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[0][0], tones.trunk[0][1], tones.trunk[0][2]),
        });

        if (isBonsai) {
            // Classical Japanese aged Bonsai trunk with gnarly S-curve elbows
            const seg1H = trunkH * 0.45;
            const seg1Geo = new THREE.CylinderGeometry(rBase * 0.78, rBase * 1.15, seg1H, 12);
            seg1Geo.translate(0, seg1H * 0.5, 0);
            seg1Geo.rotateZ(0.22);
            const seg1 = new THREE.Mesh(seg1Geo, barkDark);
            seg1.position.set(-rBase * 0.15, baseY, 0);
            this.branchGroup.add(seg1);

            const seg2H = trunkH * 0.45;
            const seg2Geo = new THREE.CylinderGeometry(rBase * 0.52, rBase * 0.78, seg2H, 12);
            seg2Geo.translate(0, seg2H * 0.5, 0);
            seg2Geo.rotateZ(-0.28);
            const seg2 = new THREE.Mesh(seg2Geo, barkMid);
            seg2.position.set(rBase * 0.25, baseY + seg1H * 0.85, 0);
            this.branchGroup.add(seg2);

            const seg3H = trunkH * 0.35;
            const seg3Geo = new THREE.CylinderGeometry(rBase * 0.32, rBase * 0.52, seg3H, 10);
            seg3Geo.translate(0, seg3H * 0.5, 0);
            seg3Geo.rotateZ(0.15);
            const seg3 = new THREE.Mesh(seg3Geo, barkLight);
            seg3.position.set(rBase * 0.05, baseY + seg1H * 0.85 + seg2H * 0.82, 0);
            this.branchGroup.add(seg3);
        } else if (isPine) {
            // Pagoda Pine: Straight central mast tapering smoothly upward
            const seg1H = trunkH * 0.55;
            const seg1Geo = new THREE.CylinderGeometry(rBase * 0.65, rBase * 1.1, seg1H, 14);
            seg1Geo.translate(0, seg1H * 0.5, 0);
            const seg1 = new THREE.Mesh(seg1Geo, barkDark);
            seg1.position.set(0, baseY, 0);
            this.branchGroup.add(seg1);

            const seg2H = trunkH * 0.55;
            const seg2Geo = new THREE.CylinderGeometry(rBase * 0.28, rBase * 0.65, seg2H, 12);
            seg2Geo.translate(0, seg2H * 0.5, 0);
            const seg2 = new THREE.Mesh(seg2Geo, barkMid);
            seg2.position.set(0, baseY + seg1H * 0.95, 0);
            this.branchGroup.add(seg2);
        } else {
            // Sakura, Maple, Oak, Ginkgo, Magnolia, Frost, Rose, Wisteria:
            // Graceful, organic sculpted trunk with gentle botanical lean and smooth taper
            const seg1H = trunkH * 0.52;
            const seg1Geo = new THREE.CylinderGeometry(rBase * 0.72, rBase * 1.08, seg1H, 14);
            seg1Geo.translate(0, seg1H * 0.5, 0);
            const seg1 = new THREE.Mesh(seg1Geo, barkDark);
            seg1.position.set(0, baseY, 0);
            this.branchGroup.add(seg1);

            const seg2H = trunkH * 0.52;
            const seg2Geo = new THREE.CylinderGeometry(rBase * 0.44, rBase * 0.72, seg2H, 12);
            seg2Geo.translate(0, seg2H * 0.5, 0);
            seg2Geo.rotateZ(0.06);
            seg2Geo.rotateX(0.04);
            const seg2 = new THREE.Mesh(seg2Geo, barkMid);
            seg2.position.set(rBase * 0.05, baseY + seg1H * 0.96, rBase * 0.04);
            this.branchGroup.add(seg2);
        }

        // Fluted Root Buttresses (Nebari) spreading onto the stone pavers
        const nFlares = isBonsai ? 7 : 6;
        for (let i = 0; i < nFlares; i++) {
            const ang = (i / nFlares) * Math.PI * 2 + (rng() - 0.5) * 0.35;
            const flareLen = rBase * (1.15 + rng() * 0.6);
            const flareR1 = rBase * 0.12;
            const flareR2 = rBase * 0.38;
            const geo = new THREE.CylinderGeometry(flareR1, flareR2, flareLen, 7);
            geo.translate(0, flareLen * 0.5, 0);
            const flareMesh = new THREE.Mesh(geo, barkDark);

            const spawnDist = rBase * 0.72;
            flareMesh.position.set(
                Math.cos(ang) * spawnDist,
                baseY,
                Math.sin(ang) * spawnDist
            );
            flareMesh.rotation.y = -ang;
            flareMesh.rotation.z = -0.62 - rng() * 0.15;
            this.branchGroup.add(flareMesh);
        }
    }

    /**
     * Multi-tiered botanical branches extending from the trunk into the foliage clusters
     */
    private buildBranches(tones: VoxelTones, rng: () => number): void {
        const shape = VOXEL_SHAPES[this.currentSceneType];
        const trunkH = Math.max(10, shape.trunkLayers * 1.35) * BLOCK;
        const isBonsai = this.currentSceneType === 'bonsai';
        const isPine = this.currentSceneType === 'pine';
        const isWeeping = this.currentSceneType === 'wisteria';

        const branchMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[1][0], tones.trunk[1][1], tones.trunk[1][2]),
        });
        const twigMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[0][0], tones.trunk[0][1], tones.trunk[0][2]),
        });

        if (isPine) {
            // Pagoda Pine: 4 tiers of horizontal whorls radiating outward
            const nTiers = 4;
            for (let t = 0; t < nTiers; t++) {
                const tierY = trunkH * (0.42 + t * 0.16);
                const tierLen = BLOCK * (6.5 - t * 1.1);
                const nBranchesInTier = 5;
                for (let b = 0; b < nBranchesInTier; b++) {
                    const ang = (b / nBranchesInTier) * Math.PI * 2 + t * 0.45;
                    const r = BLOCK * (0.24 - t * 0.03);
                    const geo = new THREE.CylinderGeometry(r * 0.4, r, tierLen, 6);
                    geo.translate(0, tierLen * 0.5, 0);
                    const mesh = new THREE.Mesh(geo, branchMat);
                    mesh.position.set(0, tierY, 0);
                    mesh.rotation.y = -ang;
                    mesh.rotation.z = -1.25 + rng() * 0.15;
                    this.branchGroup.add(mesh);
                }
            }
        } else if (isBonsai) {
            // Bonsai: 4 asymmetrical cloud-pad branches with sharp horizontal elbows
            const arms = [
                { y: trunkH * 0.48, ang: 0.2, len: BLOCK * 5.2, tilt: -1.1 },
                { y: trunkH * 0.65, ang: 2.8, len: BLOCK * 6.0, tilt: -1.05 },
                { y: trunkH * 0.82, ang: 1.4, len: BLOCK * 4.5, tilt: -0.95 },
                { y: trunkH * 0.95, ang: 4.6, len: BLOCK * 3.8, tilt: -0.85 },
            ];
            for (const arm of arms) {
                const r = BLOCK * 0.28;
                const geo = new THREE.CylinderGeometry(r * 0.55, r, arm.len, 7);
                geo.translate(0, arm.len * 0.5, 0);
                const mesh = new THREE.Mesh(geo, branchMat);
                mesh.position.set(0, arm.y, 0);
                mesh.rotation.y = -arm.ang;
                mesh.rotation.z = arm.tilt;
                this.branchGroup.add(mesh);
            }
        } else if (isWeeping) {
            // Weeping Wisteria: Arching boughs extending horizontally with downward hanging spur hooks
            const numBoughs = 8;
            for (let i = 0; i < numBoughs; i++) {
                const ang = (i / numBoughs) * Math.PI * 2 + (rng() - 0.5) * 0.3;
                const len = BLOCK * (6.5 + rng() * 2.8);
                const r = BLOCK * 0.26;
                const geo = new THREE.CylinderGeometry(r * 0.45, r, len, 6);
                geo.translate(0, len * 0.5, 0);
                const mesh = new THREE.Mesh(geo, branchMat);
                mesh.position.set(0, trunkH * (0.75 + (i / numBoughs) * 0.2), 0);
                mesh.rotation.y = -ang;
                mesh.rotation.z = -1.15 - rng() * 0.2;
                this.branchGroup.add(mesh);

                // Hanging spur hook
                const spurLen = BLOCK * (2.0 + rng() * 1.5);
                const spurGeo = new THREE.CylinderGeometry(r * 0.25, r * 0.4, spurLen, 5);
                spurGeo.translate(0, spurLen * 0.5, 0);
                const spurMesh = new THREE.Mesh(spurGeo, twigMat);
                const endDist = len * 0.82;
                spurMesh.position.set(
                    Math.cos(ang) * endDist,
                    trunkH * 0.85 - BLOCK * 0.5,
                    Math.sin(ang) * endDist
                );
                spurMesh.rotation.z = Math.PI * 0.85;
                this.branchGroup.add(spurMesh);
            }
        } else {
            // Dome / Puff / Cube presets (Sakura, Maple, Oak, Ginkgo, Magnolia, Hydrangea, Rose, Frost):
            // 10 organic curving boughs radiating outward and reaching into the canopy clouds
            const numBranches = 10;
            for (let i = 0; i < numBranches; i++) {
                const angle = (i / numBranches) * Math.PI * 2 + (rng() - 0.5) * 0.4;
                const len = BLOCK * (5.5 + rng() * 4.2);
                const r = BLOCK * (0.28 - (i / numBranches) * 0.08);

                const geo = new THREE.CylinderGeometry(r * 0.48, r, len, 7);
                geo.translate(0, len * 0.5, 0);

                const mesh = new THREE.Mesh(geo, branchMat);
                const attachY = trunkH * (0.62 + (i / numBranches) * 0.34);
                mesh.position.set(0, attachY, 0);

                mesh.rotation.y = -angle;
                mesh.rotation.z = -0.72 - rng() * 0.32;

                this.branchGroup.add(mesh);

                // Secondary twig branch
                if (rng() < 0.65) {
                    const twigLen = BLOCK * (2.8 + rng() * 2.2);
                    const twigGeo = new THREE.CylinderGeometry(r * 0.25, r * 0.45, twigLen, 5);
                    twigGeo.translate(0, twigLen * 0.5, 0);
                    const twig = new THREE.Mesh(twigGeo, twigMat);
                    const twigDist = len * 0.65;
                    const twigY = attachY + Math.cos(0.72) * twigDist;
                    twig.position.set(
                        Math.cos(angle) * twigDist * 0.8,
                        twigY,
                        Math.sin(angle) * twigDist * 0.8
                    );
                    twig.rotation.y = -(angle + 0.5);
                    twig.rotation.z = -0.55 - rng() * 0.25;
                    this.branchGroup.add(twig);
                }
            }
        }
    }

    /**
     * Handcrafted 3D cottage diorama centerpiece:
     * - Plastered timber-frame walls with solid oak corner posts
     * - Pitched gable roof with overhanging eaves and ridge cap
     * - Fieldstone chimney with chimney smoke puffs
     * - Rustic timber front door, doorstep, glowing warm wall lantern
     * - Casement windows with flower boxes and blossom specks
     * Attached to branchGroup so it seamlessly flattens down in 2D mode for the QR code!
     */
    private buildCottageCenterpiece(tones: VoxelTones, _rng: () => number): void {
        const wallLight = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.wall[0][0], tones.wall[0][1], tones.wall[0][2]),
        });
        const wallDark = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.wall[1][0], tones.wall[1][1], tones.wall[1][2]),
        });
        const roofLight = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.roof[0][0], tones.roof[0][1], tones.roof[0][2]),
        });
        const roofDark = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.roof[1][0], tones.roof[1][1], tones.roof[1][2]),
        });
        const timberMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[1][0], tones.trunk[1][1], tones.trunk[1][2]),
        });
        const doorMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.door[0], tones.door[1], tones.door[2]),
        });
        const windowMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.window[0], tones.window[1], tones.window[2]),
            emissive: new THREE.Color(0x3a2510),
        });
        const flowerMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.flower[0], tones.flower[1], tones.flower[2]),
        });

        const baseY = BLOCK * 0.85;
        const cottageW = BLOCK * 8.2;
        const cottageL = BLOCK * 7.0;
        const cottageH = BLOCK * 4.6;

        // 1. Stone Foundation Footing
        const fGeo = new THREE.BoxGeometry(cottageW + BLOCK * 0.6, BLOCK * 0.45, cottageL + BLOCK * 0.6);
        const fMesh = new THREE.Mesh(fGeo, wallDark);
        fMesh.position.set(0, baseY + BLOCK * 0.22, 0);
        this.branchGroup.add(fMesh);

        // 2. Main Wall Body
        const wGeo = new THREE.BoxGeometry(cottageW, cottageH, cottageL);
        const wMesh = new THREE.Mesh(wGeo, wallLight);
        wMesh.position.set(0, baseY + BLOCK * 0.45 + cottageH * 0.5, 0);
        this.branchGroup.add(wMesh);

        // 3. Exposed Timber Corner Posts
        const postGeo = new THREE.BoxGeometry(BLOCK * 0.65, cottageH + BLOCK * 0.1, BLOCK * 0.65);
        const hw = cottageW * 0.5;
        const hl = cottageL * 0.5;
        const postOffsets = [
            [-hw, -hl],
            [hw, -hl],
            [-hw, hl],
            [hw, hl],
        ];
        for (const [px, pz] of postOffsets) {
            const p = new THREE.Mesh(postGeo, timberMat);
            p.position.set(px, baseY + BLOCK * 0.45 + cottageH * 0.5, pz);
            this.branchGroup.add(p);
        }

        // 4. Gable Roof with Overhanging Eaves
        const roofSlopeL = (cottageW + BLOCK * 1.8) * 0.58;
        const roofGeo = new THREE.BoxGeometry(roofSlopeL, BLOCK * 0.4, cottageL + BLOCK * 1.6);
        const roofPeakY = baseY + BLOCK * 0.45 + cottageH + BLOCK * 2.8;

        // Left roof slope
        const rLeft = new THREE.Mesh(roofGeo, roofLight);
        rLeft.position.set(-cottageW * 0.26, roofPeakY - BLOCK * 1.25, 0);
        rLeft.rotation.z = 0.58;
        this.branchGroup.add(rLeft);

        // Right roof slope
        const rRight = new THREE.Mesh(roofGeo, roofDark);
        rRight.position.set(cottageW * 0.26, roofPeakY - BLOCK * 1.25, 0);
        rRight.rotation.z = -0.58;
        this.branchGroup.add(rRight);

        // Ridge Beam Cap
        const ridgeGeo = new THREE.BoxGeometry(BLOCK * 0.75, BLOCK * 0.5, cottageL + BLOCK * 1.7);
        const ridge = new THREE.Mesh(ridgeGeo, timberMat);
        ridge.position.set(0, roofPeakY + BLOCK * 0.05, 0);
        this.branchGroup.add(ridge);

        // Triangular Gable Wall Infill
        const gableGeo = new THREE.CylinderGeometry(0.01, cottageW * 0.5, BLOCK * 2.5, 3);
        gableGeo.rotateY(Math.PI / 2);
        gableGeo.rotateZ(Math.PI);
        const gFront = new THREE.Mesh(gableGeo, wallLight);
        gFront.position.set(0, baseY + BLOCK * 0.45 + cottageH + BLOCK * 1.25, hl - BLOCK * 0.02);
        this.branchGroup.add(gFront);

        // 5. Stone Chimney with Smoke Puffs
        const chimW = BLOCK * 1.4;
        const chimH = cottageH + BLOCK * 4.2;
        const chimGeo = new THREE.BoxGeometry(chimW, chimH, chimW);
        const chim = new THREE.Mesh(chimGeo, wallDark);
        chim.position.set(-hw * 0.65, baseY + chimH * 0.5, -hl * 0.4);
        this.branchGroup.add(chim);

        // Soft chimney smoke puffs
        const smokeMat = new THREE.MeshLambertMaterial({
            color: 0xedeae2,
            transparent: true,
            opacity: 0.65,
        });
        for (let s = 1; s <= 3; s++) {
            const smokeGeo = new THREE.SphereGeometry(BLOCK * (0.35 + s * 0.22), 6, 6);
            const smoke = new THREE.Mesh(smokeGeo, smokeMat);
            smoke.position.set(
                -hw * 0.65 + (s * 0.12 - 0.05) * BLOCK,
                baseY + chimH + s * BLOCK * 0.85,
                -hl * 0.4 + s * 0.15 * BLOCK
            );
            this.branchGroup.add(smoke);
        }

        // 6. Rustic Front Door facing viewer
        const doorGeo = new THREE.BoxGeometry(BLOCK * 1.6, BLOCK * 2.8, BLOCK * 0.22);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(BLOCK * 0.6, baseY + BLOCK * 0.45 + BLOCK * 1.4, hl + BLOCK * 0.1);
        this.branchGroup.add(door);

        // Doorstep
        const stepGeo = new THREE.BoxGeometry(BLOCK * 2.0, BLOCK * 0.25, BLOCK * 0.7);
        const step = new THREE.Mesh(stepGeo, wallDark);
        step.position.set(BLOCK * 0.6, baseY + BLOCK * 0.12, hl + BLOCK * 0.4);
        this.branchGroup.add(step);

        // Cozy Wall Lantern
        const lanternGeo = new THREE.BoxGeometry(BLOCK * 0.4, BLOCK * 0.55, BLOCK * 0.35);
        const lantern = new THREE.Mesh(lanternGeo, flowerMat);
        lantern.position.set(BLOCK * 2.0, baseY + BLOCK * 0.45 + BLOCK * 2.2, hl + BLOCK * 0.2);
        this.branchGroup.add(lantern);

        // 7. Paned Windows with Warm Interior Glow
        const winGeo = new THREE.BoxGeometry(BLOCK * 1.4, BLOCK * 1.4, BLOCK * 0.18);
        const winFront = new THREE.Mesh(winGeo, windowMat);
        winFront.position.set(-BLOCK * 2.2, baseY + BLOCK * 0.45 + BLOCK * 2.2, hl + BLOCK * 0.1);
        this.branchGroup.add(winFront);

        // Window Flower Box
        const boxGeo = new THREE.BoxGeometry(BLOCK * 1.6, BLOCK * 0.4, BLOCK * 0.5);
        const box = new THREE.Mesh(boxGeo, timberMat);
        box.position.set(-BLOCK * 2.2, baseY + BLOCK * 0.45 + BLOCK * 1.25, hl + BLOCK * 0.28);
        this.branchGroup.add(box);

        // Flower specks in the box
        for (let f = 0; f < 4; f++) {
            const flGeo = new THREE.SphereGeometry(BLOCK * 0.2, 4, 4);
            const fl = new THREE.Mesh(flGeo, flowerMat);
            fl.position.set(-BLOCK * 2.8 + f * BLOCK * 0.4, baseY + BLOCK * 0.45 + BLOCK * 1.55, hl + BLOCK * 0.3);
            this.branchGroup.add(fl);
        }
    }

    private updatePetals(dt: number): void {
        const pf = this.petalField;
        if (!pf || !this.data) return;
        const visible = this.progress < 0.96;
        pf.points.visible = visible;
        if (!visible) return;
        pf.material.opacity = 0.85 * (1 - this.progress);

        const top = BLOCK * 18;
        for (let i = 0; i < pf.count; i++) {
            let y = pf.positions[i * 3 + 1] - pf.velocities[i] * dt;
            if (y < BLOCK * 0.8) y = top * (0.75 + 0.25 * Math.random());
            pf.positions[i * 3 + 1] = y;
            pf.positions[i * 3] += Math.sin(this.time * 1.4 + pf.phases[i]) * 0.0006;
            pf.positions[i * 3 + 2] += Math.cos(this.time * 1.2 + pf.phases[i]) * 0.0006;
        }
        pf.points.geometry.attributes.position.needsUpdate = true;
    }

    private disposeMeshes(): void {
        if (this.blocksMesh) {
            this.stage.remove(this.blocksMesh.mesh);
            this.blocksMesh.mesh.geometry.dispose();
            (this.blocksMesh.mesh.material as THREE.Material).dispose();
            this.blocksMesh = null;
        }
        if (this.petalField) {
            this.stage.remove(this.petalField.points);
            this.petalField.points.geometry.dispose();
            this.petalField.material.dispose();
            this.petalField = null;
        }
        if (this.slabMesh) {
            this.stage.remove(this.slabMesh);
            this.slabMesh.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                    const m = obj as THREE.Mesh;
                    m.geometry?.dispose();
                    if (Array.isArray(m.material)) {
                        m.material.forEach((mat) => mat.dispose());
                    } else if (m.material) {
                        m.material.dispose();
                    }
                }
            });
            this.slabMesh = null;
        }
        const disposeFoliageLayer = (layer: FoliageLayer | null) => {
            if (!layer) return;
            this.foliageGroup.remove(layer.mesh);
            layer.mesh.geometry.dispose();
            layer.material.dispose();
        };
        disposeFoliageLayer(this.leafLayer);
        disposeFoliageLayer(this.grassLayer);
        disposeFoliageLayer(this.blossomLayer);
        this.leafLayer = null;
        this.grassLayer = null;
        this.blossomLayer = null;
        while (this.branchGroup.children.length > 0) {
            const child = this.branchGroup.children[0];
            this.branchGroup.remove(child);
            child.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                    const m = obj as THREE.Mesh;
                    m.geometry?.dispose();
                    if (Array.isArray(m.material)) {
                        m.material.forEach((mat) => mat.dispose());
                    } else if (m.material) {
                        m.material.dispose();
                    }
                }
            });
        }
    }
}
