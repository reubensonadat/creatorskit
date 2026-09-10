/**
 * CINEMATIC ATMOSPHERE
 * ====================
 * Golden-hour sun with soft PCF shadows, warm amber bounce, lavender/rose
 * ambient fill, volumetric dust motes drifting through the light, and a
 * breeze of falling petals gliding through the scene. A gradient sky dome
 * blushes with the palette.
 */

import * as THREE from 'three';
import { PRNG } from './prng';
import { createPetalGeometry, jitterHSL } from './geometry';
import type { KeepsakePalette } from './types';

/* ────────────────────────────────────────────────────────────────────────────
 * LIGHTING RIG — warm golden hour + lavender/rose fill
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LightingRig {
    sun: THREE.DirectionalLight;
}

export function createGoldenHourLighting(scene: THREE.Object3D): LightingRig {
    // Key: low golden-hour sun, warm amber
    const sun = new THREE.DirectionalLight(0xffd9a3, 3.1);
    sun.position.set(19, 16.5, 13);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -15;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 4;
    scene.add(sun);

    // Warm amber bounce low from the sun side (stone & petal bounce)
    const bounce = new THREE.DirectionalLight(0xffb066, 0.5);
    bounce.position.set(14, 3.5, 9);
    scene.add(bounce);

    // Lavender fill from the shadow side — no pitch blacks, only dusk velvet
    const lavenderFill = new THREE.DirectionalLight(0xc9b8f0, 0.5);
    lavenderFill.position.set(-16, 11, -12);
    scene.add(lavenderFill);

    // Rose ambient wash
    const roseAmbient = new THREE.AmbientLight(0xf6dee6, 0.5);
    scene.add(roseAmbient);

    // Hemisphere: warm sky over earthy ground
    const hemi = new THREE.HemisphereLight(0xfdeecb, 0x6b5138, 0.55);
    scene.add(hemi);

    return { sun };
}

/* ────────────────────────────────────────────────────────────────────────────
 * SKY DOME — palette-blushed gradient horizon
 * ──────────────────────────────────────────────────────────────────────────── */

export function createSkyDome(palette: KeepsakePalette): THREE.Mesh {
    const uniforms = {
        topColor: { value: new THREE.Color(palette.sky.zenith) },
        horizonColor: { value: new THREE.Color(palette.sky.horizon) },
        bottomColor: { value: new THREE.Color(palette.sky.floor) },
    };

    const mat = new THREE.ShaderMaterial({
        uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: /* glsl */ `
            varying vec3 vWorldPos;
            void main() {
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 topColor;
            uniform vec3 horizonColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPos;
            void main() {
                float h = normalize(vWorldPos).y;
                vec3 col = mix(horizonColor, topColor, smoothstep(0.02, 0.5, h));
                col = mix(bottomColor, col, smoothstep(-0.35, 0.02, h));
                gl_FragColor = vec4(col, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
    });

    const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 14), mat);
    dome.name = 'skyDome';
    return dome;
}

/* ────────────────────────────────────────────────────────────────────────────
 * VOLUMETRIC DUST MOTES — floating gold in the sunbeams
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DustMotes {
    mesh: THREE.InstancedMesh;
    basePositions: Float32Array;
    phases: Float32Array;
    count: number;
}

export function createDustMotes(seed: string, ceilingY: number): DustMotes {
    const prng = new PRNG(seed).fork('dust');
    const count = 170;
    const geo = new THREE.PlaneGeometry(0.055, 0.055);
    const mat = new THREE.MeshBasicMaterial({
        color: 0xffe9bd,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.name = 'dustMotes';

    const basePositions = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const a = prng.range(0, Math.PI * 2);
        const r = prng.range(0.5, 11) * Math.sqrt(prng.next());
        basePositions[i * 3] = Math.cos(a) * r;
        basePositions[i * 3 + 1] = prng.range(0.4, ceilingY);
        basePositions[i * 3 + 2] = Math.sin(a) * r;
        phases[i] = prng.range(0, Math.PI * 2);
        dummy.position.set(basePositions[i * 3], basePositions[i * 3 + 1], basePositions[i * 3 + 2]);
        const s = prng.range(0.5, 1.3);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;

    return { mesh, basePositions, phases, count };
}

export function updateDustMotes(dust: DustMotes, time: number): void {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < dust.count; i++) {
        const p = dust.phases[i];
        const x = dust.basePositions[i * 3] + Math.sin(time * 0.22 + p) * 0.65;
        const y = dust.basePositions[i * 3 + 1] + Math.sin(time * 0.16 + p * 1.7) * 0.45;
        const z = dust.basePositions[i * 3 + 2] + Math.cos(time * 0.19 + p * 0.6) * 0.65;
        dummy.position.set(x, y, z);
        // Always face the camera (billboard via lookAt is overkill; keep upright)
        dummy.rotation.set(0, time * 0.05 + p, 0);
        const pulse = 0.7 + 0.3 * Math.sin(time * 1.4 + p * 3.1);
        dummy.scale.set(pulse, pulse, pulse);
        dummy.updateMatrix();
        dust.mesh.setMatrixAt(i, dummy.matrix);
    }
    dust.mesh.instanceMatrix.needsUpdate = true;
}

/* ────────────────────────────────────────────────────────────────────────────
 * BREEZE-BLOWN PETALS — drifting, gliding, tumbling gently to the ground
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DriftingPetals {
    mesh: THREE.InstancedMesh;
    positions: Float32Array;
    rotations: Float32Array;
    rotSpeeds: Float32Array;
    fallSpeeds: Float32Array;
    swayPhases: Float32Array;
    count: number;
    ceilingY: number;
}

export function createDriftingPetals(seed: string, palette: KeepsakePalette, ceilingY: number): DriftingPetals {
    const prng = new PRNG(seed).fork('breeze');
    const count = 105;
    const geo = createPetalGeometry({
        length: 0.24,
        width: 0.21,
        notch: 0.2,
        cup: 0.05,
        curl: 0.1,
        thickness: 0.01,
    });
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.55,
        side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.name = 'driftingPetals';
    mesh.frustumCulled = false;

    const canopy = [
        new THREE.Color(palette.canopy.secondary),
        new THREE.Color(palette.canopy.primary),
        new THREE.Color(palette.canopy.highlight),
    ];

    const positions = new Float32Array(count * 3);
    const rotations = new Float32Array(count * 3);
    const rotSpeeds = new Float32Array(count * 3);
    const fallSpeeds = new Float32Array(count);
    const swayPhases = new Float32Array(count);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const a = prng.range(0, Math.PI * 2);
        const r = prng.range(1, 9.5);
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = prng.range(0.6, ceilingY);
        positions[i * 3 + 2] = Math.sin(a) * r;

        rotations[i * 3] = prng.range(0, Math.PI * 2);
        rotations[i * 3 + 1] = prng.range(0, Math.PI * 2);
        rotations[i * 3 + 2] = prng.range(0, Math.PI * 2);

        rotSpeeds[i * 3] = prng.range(-0.6, 0.6);
        rotSpeeds[i * 3 + 1] = prng.range(-0.9, 0.9);
        rotSpeeds[i * 3 + 2] = prng.range(-0.6, 0.6);

        fallSpeeds[i] = prng.range(0.22, 0.5);
        swayPhases[i] = prng.range(0, Math.PI * 2);

        dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        dummy.rotation.set(rotations[i * 3], rotations[i * 3 + 1], rotations[i * 3 + 2]);
        const s = prng.range(0.65, 1.05);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, jitterHSL(prng.pick(canopy), prng, 0.012, 0.03, 0.04));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    return { mesh, positions, rotations, rotSpeeds, fallSpeeds, swayPhases, count, ceilingY };
}

export function updateDriftingPetals(
    petals: DriftingPetals,
    time: number,
    delta: number
): void {
    const dummy = new THREE.Object3D();
    const { count, positions, rotations, rotSpeeds, fallSpeeds, swayPhases } = petals;

    for (let i = 0; i < count; i++) {
        const phase = swayPhases[i];

        // Glide: sinusoidal breeze carries petals sideways as they fall
        positions[i * 3] += Math.sin(time * 0.7 + phase) * 0.55 * delta;
        positions[i * 3 + 1] -= fallSpeeds[i] * delta;
        positions[i * 3 + 2] += Math.cos(time * 0.55 + phase * 1.3) * 0.55 * delta;

        rotations[i * 3] += rotSpeeds[i * 3] * delta;
        rotations[i * 3 + 1] += rotSpeeds[i * 3 + 1] * delta;
        rotations[i * 3 + 2] += rotSpeeds[i * 3 + 2] * delta;

        // Respawn from the crown when a petal kisses the carpet
        if (positions[i * 3 + 1] < -0.32) {
            const a = Math.random() * Math.PI * 2;
            const r = 1.5 + Math.random() * 7;
            positions[i * 3] = Math.cos(a) * r;
            positions[i * 3 + 1] = petals.ceilingY * (0.65 + Math.random() * 0.35);
            positions[i * 3 + 2] = Math.sin(a) * r;
        }

        dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        dummy.rotation.set(rotations[i * 3], rotations[i * 3 + 1], rotations[i * 3 + 2]);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        petals.mesh.setMatrixAt(i, dummy.matrix);
    }
    petals.mesh.instanceMatrix.needsUpdate = true;
}
