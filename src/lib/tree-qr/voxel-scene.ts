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
    VOXEL_SHAPES,
    X_OFFSET_2D_FACTOR,
    Y_OFFSET_2D_FACTOR,
    deriveVoxelTones,
    easeInOutCubic,
    easeOutCubic,
    mulberry32,
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
    private sprigsMesh: THREE.InstancedMesh | null = null;

    private rawProgress = 0;
    private progress = 0;
    private flat = false;
    private time = 0;
    private aspect = 1;

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
        this.stage.add(this.branchGroup);

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
        const topWorld = maxLayer * BLOCK;

        // 1. Instanced voxel blocks (ground, trunk, canopy)
        this.blocksMesh = buildBlocksMesh(data, tones);

        // 2. Drifting petals
        this.petalField = buildPetalField(data.petalCount, tones, data.halfGridWorld, topWorld, rng);
        this.petalField.material.opacity = 0;

        // 3. Earth pedestal slab
        this.slabMesh = buildSlabMesh(data, tones);

        // 4. Slender branch struts connecting trunk to canopy (reference photo)
        if (sceneType !== 'house') {
            this.buildBranches(data, tones, rng);
        }

        // 5. Grass sprigs & wildflower stalks on outer green modules (reference photo)
        this.buildGroundSprigs(data, tones, rng);

        this.stage.add(this.slabMesh, this.blocksMesh.mesh, this.petalField.points);
        if (this.sprigsMesh) this.stage.add(this.sprigsMesh);

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
        // Natural direct manipulation
        this.targetYaw -= dx * 0.007;
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.006, -0.4, 0.65);
    }

    addZoomDelta(delta: number): void {
        this.targetZoom = THREE.MathUtils.clamp(this.targetZoom * (1 + delta), 0.65, 1.85);
    }

    resize(width: number, height: number): void {
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

        this.updatePetals(dt);
        this.applyView(this.progress);
        this.renderer.render(this.scene, this.camera);
    }

    capture(pureQR: boolean): string {
        const prevZoom = this.zoomMul;
        const prevPetalOpacity = this.petalField ? this.petalField.material.opacity : 0;
        this.zoomMul = 1;
        if (this.petalField) this.petalField.material.opacity = pureQR ? 0 : prevPetalOpacity;
        this.applyView(pureQR ? 1 : this.progress);
        if (pureQR) this.applyHeightMorph(1);
        this.renderer.render(this.scene, this.camera);
        const url = this.renderer.domElement.toDataURL('image/png');
        this.zoomMul = prevZoom;
        if (this.petalField) this.petalField.material.opacity = prevPetalOpacity;
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

        // Branches and grass sprigs flatten alongside the tree
        const branchScale = Math.max(0.001, hFactor);
        this.branchGroup.scale.set(1, branchScale, 1);
        if (this.sprigsMesh) {
            this.sprigsMesh.visible = progress < 0.85;
            this.sprigsMesh.scale.set(1, branchScale, 1);
        }
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

    private buildBranches(data: VoxelData, tones: VoxelTones, rng: () => number): void {
        const c = data.gridSize * 0.5;
        const halfGrid = data.halfGridWorld;
        const trunkH = BLOCK * 9;

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

    private buildGroundSprigs(data: VoxelData, tones: VoxelTones, rng: () => number): void {
        const halfGrid = data.halfGridWorld;
        const spots = data.grassSpots;
        const count = spots.length;
        if (count === 0) return;

        // Slender vertical blade quad (reference photo)
        const sprigGeo = new THREE.BufferGeometry();
        const h = BLOCK * 1.3;
        const w = BLOCK * 0.14;
        const pos = [
            -w, 0, 0,
            w, 0, 0,
            -w * 0.5, h, 0.003,
            w * 0.5, h, 0.003,
        ];
        const idx = [0, 1, 2, 1, 3, 2];
        sprigGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        sprigGeo.setIndex(idx);
        sprigGeo.computeVertexNormals();

        const sprigMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
        const mesh = new THREE.InstancedMesh(sprigGeo, sprigMat, count * 2);
        const m = new THREE.Matrix4();
        const p = new THREE.Vector3();
        const q = new THREE.Quaternion();
        const s = new THREE.Vector3();
        const col = new THREE.Color();
        const up = new THREE.Vector3(0, 1, 0);

        let i = 0;
        for (const spot of spots) {
            const x = (spot.col + 0.5 + (rng() - 0.5) * 0.6) * BLOCK - halfGrid;
            const z = (spot.row + 0.5 + (rng() - 0.5) * 0.6) * BLOCK - halfGrid;

            p.set(x, BLOCK, z);
            q.setFromAxisAngle(up, rng() * Math.PI * 2);
            s.setScalar(0.75 + rng() * 0.5);
            m.compose(p, q, s);
            mesh.setMatrixAt(i, m);

            if (spot.flower && rng() < 0.6) {
                // Pink/lavender wildflower blossom tip (reference photo)
                col.setRGB(tones.flower[0], tones.flower[1], tones.flower[2]);
            } else {
                col.setRGB(tones.grass[1][0], tones.grass[1][1], tones.grass[1][2]);
            }
            mesh.setColorAt(i, col);
            i++;
        }

        mesh.count = i;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        this.sprigsMesh = mesh;
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
        if (this.sprigsMesh) {
            this.stage.remove(this.sprigsMesh);
            this.sprigsMesh.geometry.dispose();
            (this.sprigsMesh.material as THREE.Material).dispose();
            this.sprigsMesh = null;
        }
        while (this.branchGroup.children.length > 0) {
            const child = this.branchGroup.children[0] as THREE.Mesh;
            this.branchGroup.remove(child);
            child.geometry?.dispose();
            (child.material as THREE.Material)?.dispose();
        }
    }
}
