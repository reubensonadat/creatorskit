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
    private slabMesh: THREE.Mesh | null = null;
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
        // the canopy (no more blocky Minecraft trunk stacks — the ground
        // tiles at layer 0 already keep the center modules QR-dark).
        if (sceneType !== 'house') {
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
        // Direct-manipulation pan: the pointer delta is inverted before it
        // reaches the rig so the ENVIRONMENT is dragged with the cursor —
        // dragging left pulls the 3D world left, dragging down pulls its
        // top surface down (standard grab/orbit expectations). The old
        // `-=` yaw moved the world opposite to the pointer.
        this.targetYaw += dx * 0.007;
        // Wide pitch range — orbit from near ground level up to near top-down
        // so the whole 3D scene can be inspected from any angle.
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.006, -0.55, 0.92);
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
        const currentIsoY = ISO_ANGLE_Y + this.dragYaw;
        const currentIsoX = ISO_ANGLE_X + this.dragPitch;

        const angleY = THREE.MathUtils.lerp(currentIsoY, FLAT_ANGLE_Y, progress) + idleSway;
        const angleX = THREE.MathUtils.lerp(currentIsoX, FLAT_ANGLE_X, progress);

        // Euler order 'YXZ': Rotate yaw (Y) first, then pitch (X)
        this.stage.rotation.set(angleX, angleY, 0, 'YXZ');

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

        this.stage.position.y = Y_OFFSET_2D_FACTOR * this.data.halfGridWorld * progress;
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
            // Height descends smoothly towards ground level (layer 0)
            const y = (b.layer * hFactor + 0.5) * BLOCK;
            const z = b.row * BLOCK - halfGrid;

            this.matrix.makeTranslation(x, y, z);
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
                const y = (b.layer * hFactor + 0.5) * BLOCK;
                const z = b.row * BLOCK - halfGrid;

                this.posV.set(x, y, z);
                this.scaleV.setScalar(s);
                this.matrix.compose(this.posV, this.quat, this.scaleV);
                bm.mesh.setMatrixAt(i, this.matrix);
            }
        }
        bm.mesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Rounded trunk — a tapered two-segment shaft with a gentle natural lean
     * plus root flares ringing the base. Lives in branchGroup so it flattens
     * into the QR exactly like the branches and foliage do.
     */
    private buildRoundedTrunk(tones: VoxelTones, shape: VoxelPresetShape, rng: () => number): void {
        const trunkH = Math.max(4, shape.trunkLayers) * BLOCK * 0.98;
        const rBase = (shape.trunkRadius ?? TRUNK_RADIUS) * BLOCK * 0.88;
        const baseY = BLOCK * 0.95;

        const barkDark = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[2][0], tones.trunk[2][1], tones.trunk[2][2]),
        });
        const barkLight = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[1][0], tones.trunk[1][1], tones.trunk[1][2]),
        });

        // Lower shaft — widest at the roots, softly tapered
        const lowerGeo = new THREE.CylinderGeometry(rBase * 0.8, rBase, trunkH * 0.58, 12, 1);
        lowerGeo.translate(0, (trunkH * 0.58) / 2, 0);
        const lower = new THREE.Mesh(lowerGeo, barkDark);
        lower.position.y = baseY;
        this.branchGroup.add(lower);

        // Upper shaft — continues the taper with a slight organic lean
        const upperGeo = new THREE.CylinderGeometry(rBase * 0.52, rBase * 0.8, trunkH * 0.46, 12, 1);
        upperGeo.rotateZ(0.05);
        upperGeo.translate(rBase * 0.1, (trunkH * 0.46) / 2, 0);
        const upper = new THREE.Mesh(upperGeo, barkLight);
        upper.position.set(rBase * 0.06, baseY + trunkH * 0.55, 0);
        this.branchGroup.add(upper);

        // Root flare — small tapered spurs ringing the base
        const nFlares = 5;
        for (let i = 0; i < nFlares; i++) {
            const ang = (i / nFlares) * Math.PI * 2 + rng() * 0.5;
            const len = rBase * (1.1 + rng() * 0.5);
            const geo = new THREE.CylinderGeometry(rBase * 0.16, rBase * 0.42, len, 7, 1);
            geo.translate(0, len / 2, 0);
            const m = new THREE.Mesh(geo, barkDark);
            m.position.set(Math.cos(ang) * rBase * 0.72, baseY, Math.sin(ang) * rBase * 0.72);
            m.rotation.z = Math.cos(ang) * 0.55;
            m.rotation.x = -Math.sin(ang) * 0.55;
            this.branchGroup.add(m);
        }
    }

    private buildBranches(tones: VoxelTones, rng: () => number): void {
        const shape = VOXEL_SHAPES[this.currentSceneType];
        const trunkH = Math.max(4, shape.trunkLayers) * BLOCK;

        const branchMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tones.trunk[1][0], tones.trunk[1][1], tones.trunk[1][2]),
        });

        // Slender branching wooden struts radiating outward and upward (reference photo)
        const numBranches = 7;
        for (let i = 0; i < numBranches; i++) {
            const angle = (i / numBranches) * Math.PI * 2 + rng() * 0.35;
            const len = BLOCK * (3.5 + rng() * 3.5);
            const r = BLOCK * 0.22;

            const geo = new THREE.CylinderGeometry(r * 0.5, r, len, 6);
            geo.translate(0, len * 0.5, 0);

            const mesh = new THREE.Mesh(geo, branchMat);
            const attachY = trunkH * (0.55 + (i / numBranches) * 0.35);
            mesh.position.set(0, attachY, 0);

            mesh.rotation.y = angle;
            mesh.rotation.z = -0.7 - rng() * 0.25;

            this.branchGroup.add(mesh);
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
            this.slabMesh.geometry.dispose();
            (this.slabMesh.material as THREE.Material).dispose();
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
            const child = this.branchGroup.children[0] as THREE.Mesh;
            this.branchGroup.remove(child);
            child.geometry?.dispose();
            (child.material as THREE.Material)?.dispose();
        }
    }
}
