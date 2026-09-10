/**
 * Foliage QR Diorama — instanced foliage planes with GPU wind
 * ==========================================================
 * Renders the canopy and lawn as thousands of small, intersecting 2D planes
 * carrying alpha-clipped leaf-cluster / grass-blade / blossom textures.
 *
 * Motion is entirely vertex-shader driven (never per-plane JavaScript):
 * a continuous time uniform feeds layered sine waves that gently offset the
 * X and Z coordinates of the TOP vertices (weight ∝ height²) — the swelling,
 * breathing sway of wind through leaves and grass at zero CPU cost.
 *
 * The same shader drives the 2D ⇄ 3D morph contract:
 *  - uFlatten shrinks each plane into its anchor as the camera tips
 *    top-down (mirroring the voxel blocks descending into layer 0),
 *  - uReveal blooms planes in center-outward during preset/URL rebuilds,
 *  - the scene additionally scales the foliage group's Y so the canopy
 *    descends toward the ground exactly like the block world does.
 */

import * as THREE from 'three';
import type { VoxelData } from './voxel-blocks';
import { BLOCK, type VoxelTones } from './voxel-qr';

// ─── Shared uniforms — one object, referenced by every foliage material ──────

export interface WindUniforms {
    uTime: { value: number };
    uReveal: { value: number };
    uFlatten: { value: number };
}

export interface FoliageLayer {
    mesh: THREE.InstancedMesh;
    material: THREE.MeshLambertMaterial;
}

interface WindOptions {
    windStrength: number; // object-space sway amplitude
    windSpeed: number; // sine cycles per second
}

/**
 * Lambert cutout material with the wind + morph vertex program injected.
 * `aPhase` is a per-instance attribute in [0,1] that offsets both the wind
 * wave and the rebuild bloom so planes never move in lockstep.
 */
function createWindMaterial(
    map: THREE.Texture,
    shared: WindUniforms,
    opts: WindOptions
): THREE.MeshLambertMaterial {
    const material = new THREE.MeshLambertMaterial({
        map,
        alphaTest: 0.42, // hard cutout — negative space around leaves is invisible
        side: THREE.DoubleSide,
    });

    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = shared.uTime;
        shader.uniforms.uReveal = shared.uReveal;
        shader.uniforms.uFlatten = shared.uFlatten;
        shader.uniforms.uWindStrength = { value: opts.windStrength };
        shader.uniforms.uWindSpeed = { value: opts.windSpeed };

        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                `#include <common>
                uniform float uTime;
                uniform float uReveal;
                uniform float uFlatten;
                uniform float uWindStrength;
                uniform float uWindSpeed;
                attribute float aPhase;`
            )
            .replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                {
                    // Vertex height in [0,1] — quads are anchored at their base,
                    // so tops sway hardest and roots stay planted.
                    float hW = clamp(position.y, 0.0, 1.0);
                    float ph = aPhase * 6.2831853;
                    float amp = uWindStrength * (0.25 + 0.75 * hW * hW) * (1.0 - uFlatten);

                    // Layered sine/cosine swell — rhythmic wind, not twitching.
                    transformed.x += sin(uTime * uWindSpeed + ph + position.y * 2.4 + position.x * 1.9) * amp;
                    transformed.z += cos(uTime * uWindSpeed * 0.77 + ph * 1.31 + position.z * 1.3) * amp * 0.6;

                    // Rebuild bloom (center-outward via aPhase) and 2D flatten:
                    // planes collapse into their anchor, revealing the QR tiles.
                    float alive = clamp(uReveal * 1.6 - aPhase * 0.6, 0.0, 1.0) * (1.0 - uFlatten);
                    transformed.x *= alive;
                    transformed.z *= alive;
                }`
            );
    };
    material.customProgramCacheKey = () => 'foliage-wind-v1';
    return material;
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

/** Base-anchored quad: x ∈ [-0.5, 0.5], y ∈ [0, 1] — wind weights by y. */
function baseQuadGeometry(): THREE.BufferGeometry {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    return geo;
}

/** Two crossed base-anchored quads — a grass tuft with volume from any yaw. */
function crossQuadGeometry(): THREE.BufferGeometry {
    const positions = new Float32Array([
        // quad 1 — XY plane
        -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0,
        // quad 2 — ZY plane (rotated 90° about Y)
        0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5,
    ]);
    const uvs = new Float32Array([
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
    ]);
    const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
    const normals = new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
}

/** Three crossed base-anchored quads — a 3D leaf cluster with volume from any angle. */
function starQuadGeometry(): THREE.BufferGeometry {
    const positions = new Float32Array([
        // quad 1 (0°)
        -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0,
        // quad 2 (60°)
        -0.25, 0, 0.433, 0.25, 0, -0.433, 0.25, 1, -0.433, -0.25, 1, 0.433,
        // quad 3 (120°)
        0.25, 0, 0.433, -0.25, 0, -0.433, -0.25, 1, -0.433, 0.25, 1, 0.433,
    ]);
    const uvs = new Float32Array([
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
    ]);
    const indices = [
        0, 1, 2, 0, 2, 3, 
        4, 5, 6, 4, 6, 7, 
        8, 9, 10, 8, 10, 11
    ];
    // Normals are all straight up so the lighting treats the whole cluster as one fluffy puff
    const normals = new Float32Array([
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
}

// ─── Builders ────────────────────────────────────────────────────────────────

/** Scatter the canopy: one instanced draw call for every leaf-cluster plane. */
export function buildLeafCanopy(
    data: VoxelData,
    tones: VoxelTones,
    map: THREE.Texture,
    shared: WindUniforms,
    rng: () => number
): FoliageLayer | null {
    const planes = data.leafPlanes;
    if (planes.length === 0) return null;

    const geometry = starQuadGeometry();
    const material = createWindMaterial(map, shared, { windStrength: 0.065, windSpeed: 1.6 });
    const mesh = new THREE.InstancedMesh(geometry, material, planes.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const phases = new Float32Array(planes.length);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const col = new THREE.Color();

    for (let i = 0; i < planes.length; i++) {
        const plane = planes[i];
        p.set(
            plane.x * BLOCK - data.halfGridWorld,
            plane.layerY * BLOCK,
            plane.z * BLOCK - data.halfGridWorld
        );

        // Random tilt and spin for a fluffy 3D cluster look
        e.set((rng() - 0.5) * 0.85, rng() * Math.PI * 2, (rng() - 0.5) * 0.4, 'YXZ');
        q.setFromEuler(e);

        const sc = plane.size * BLOCK;
        s.set(sc, sc * (0.85 + rng() * 0.35), sc);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);

        const tone = tones.canopy[plane.tone];
        const v = 0.86 + rng() * 0.3;
        col.setRGB(tone[0] * v, tone[1] * v, tone[2] * v);
        mesh.setColorAt(i, col);

        phases[i] = plane.phase;
    }

    geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return { mesh, material };
}

/** Scatter the lawn: crossed grass-tuft quads over the dark ground modules. */
export function buildGrassField(
    data: VoxelData,
    tones: VoxelTones,
    map: THREE.Texture,
    shared: WindUniforms,
    rng: () => number
): FoliageLayer | null {
    const spots = data.grassSpots;
    if (spots.length === 0) return null;

    const geometry = crossQuadGeometry();
    const material = createWindMaterial(map, shared, { windStrength: 0.1, windSpeed: 1.9 });
    const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const phases = new Float32Array(spots.length);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const s = new THREE.Vector3();
    const col = new THREE.Color();

    for (let i = 0; i < spots.length; i++) {
        const spot = spots[i];
        // Keep grass strictly aligned to the tile center, not wildly scattered
        p.set(
            (spot.col + 0.5) * BLOCK - data.halfGridWorld,
            BLOCK, // rooted on top of the ground tile
            (spot.row + 0.5) * BLOCK - data.halfGridWorld
        );
        // Orthogonal or diagonal, clean and stylized
        q.setFromAxisAngle(up, rng() < 0.5 ? 0 : Math.PI / 4);
        const hModules = (1.5 + rng() * 1.3) * spot.blades * 0.62;
        const h = hModules * BLOCK;
        s.set(h * 0.72, h, h * 0.72);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);

        const g = tones.grass[rng() < 0.4 ? 0 : rng() < 0.7 ? 1 : 2];
        const v = 0.85 + rng() * 0.35;
        col.setRGB(g[0] * v, g[1] * v, g[2] * v);
        mesh.setColorAt(i, col);

        phases[i] = rng();
    }

    geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return { mesh, material };
}

/** Wildflower accents — small blossom rosettes topping random lawn spots. */
export function buildBlossomField(
    data: VoxelData,
    tones: VoxelTones,
    map: THREE.Texture,
    shared: WindUniforms,
    rng: () => number
): FoliageLayer | null {
    const flowers = data.grassSpots.filter((sp) => sp.flower);
    if (flowers.length === 0) return null;

    const geometry = baseQuadGeometry();
    const material = createWindMaterial(map, shared, { windStrength: 0.045, windSpeed: 1.4 });
    const mesh = new THREE.InstancedMesh(geometry, material, flowers.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const phases = new Float32Array(flowers.length);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const col = new THREE.Color();

    let i = 0;
    for (const spot of flowers) {
        if (rng() < 0.25) continue; // let some buds stay dormant
        p.set(
            (spot.col + 0.5 + (rng() - 0.5) * 0.5) * BLOCK - data.halfGridWorld,
            BLOCK * 2.1, // hovering at the tip of its tuft
            (spot.row + 0.5 + (rng() - 0.5) * 0.5) * BLOCK - data.halfGridWorld
        );
        e.set((rng() - 0.5) * 0.7, rng() * Math.PI * 2, (rng() - 0.5) * 0.3, 'YXZ');
        q.setFromEuler(e);
        const sc = (0.95 + rng() * 0.55) * BLOCK;
        s.set(sc, sc, sc);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);

        const f = tones.flower;
        const v = 0.95 + rng() * 0.25;
        col.setRGB(Math.min(1, f[0] * v), Math.min(1, f[1] * v), Math.min(1, f[2] * v));
        mesh.setColorAt(i, col);

        phases[i] = rng();
        i++;
    }

    mesh.count = i;
    geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return { mesh, material };
}
