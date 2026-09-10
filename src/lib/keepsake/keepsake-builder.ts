/**
 * KEEPSAKE BUILDER — assembles the complete museum-grade diorama:
 * palette-bound ground + botanical centerpiece + brass dedication plaque +
 * golden-hour lighting + sky dome + dust motes + drifting breeze petals.
 *
 * Everything hangs off one rootGroup; call `update(elapsed, delta)` each
 * frame and `dispose()` on teardown.
 */

import * as THREE from 'three';
import { KEEPSAKE_PALETTES, KeepsakeConfig, KeepsakePalette } from './types';
import { getKeepsakePresetBuilder } from './presets';
import { buildKeepsakeGround } from './ground';
import { buildGiftPlaque, PlaqueHandles } from './plaque';
import {
    createGoldenHourLighting,
    createSkyDome,
    createDustMotes,
    updateDustMotes,
    createDriftingPetals,
    updateDriftingPetals,
    DustMotes,
    DriftingPetals,
} from './atmosphere';

export interface KeepsakeDiorama {
    rootGroup: THREE.Group;
    palette: KeepsakePalette;
    /** Subtle living sway of the whole centerpiece. */
    update: (elapsed: number, delta: number) => void;
    dispose: () => void;
    redrawPlaque: () => void;
}

export function buildKeepsakeDiorama(config: KeepsakeConfig): KeepsakeDiorama {
    const palette = KEEPSAKE_PALETTES[config.presetId];
    const rootGroup = new THREE.Group();
    rootGroup.name = 'keepsakeRoot';

    /* ── 1. Centerpiece (modular preset builder) ─────────────────────────── */
    const builder = getKeepsakePresetBuilder(config.presetId);
    const preset = builder(palette, config.seed);
    rootGroup.add(preset.group);

    /* ── 2. Palette-bound ground carpet & stone pedestal ─────────────────── */
    // The plaque greets the initial camera dead-on.
    // (Camera azimuth is θ = 0.32π → radial angle = π/2 − θ.)
    const plaqueAngle = Math.PI * 0.18;

    const ground = buildKeepsakeGround({
        palette,
        seed: config.seed,
        rootAngles: preset.rootAngles,
        plaqueAngle, // stepping stones lead to the plaque
    });
    rootGroup.add(ground);

    /* ── 3. Brass dedication plaque at the foot of the tree ──────────────── */
    const plaque: PlaqueHandles = buildGiftPlaque(palette, config.seed, config.plaque);
    const plaqueRadius = 9.2;
    plaque.group.position.set(
        Math.cos(plaqueAngle) * plaqueRadius,
        0.66, // plinth bottom lands on the walkway cobbles
        Math.sin(plaqueAngle) * plaqueRadius
    );
    plaque.group.rotation.y = -plaqueAngle + Math.PI / 2;
    rootGroup.add(plaque.group);

    /* ── 4. Lighting, sky, atmosphere ────────────────────────────────────── */
    const lighting = createGoldenHourLighting(rootGroup);
    const sky = createSkyDome(palette);
    rootGroup.add(sky);

    const ceiling = Math.max(preset.canopyTopY + 1.6, 9);
    const dust = createDustMotes(config.seed, ceiling);
    rootGroup.add(dust.mesh);

    const drift = createDriftingPetals(config.seed, palette, ceiling);
    rootGroup.add(drift.mesh);

    /* ── 5. Per-frame life ───────────────────────────────────────────────── */
    const update = (elapsed: number, delta: number) => {
        // The whole tree breathes — a breeze you feel more than see
        const gust = 0.65 + 0.35 * Math.sin(elapsed * 0.43);
        preset.group.rotation.z = Math.sin(elapsed * 0.7) * 0.0075 * gust;
        preset.group.rotation.x = Math.cos(elapsed * 0.55) * 0.0055 * gust;

        updateDustMotes(dust, elapsed);
        updateDriftingPetals(drift, elapsed, delta);

        // Sun shimmer: the golden hour breathes very slowly
        lighting.sun.intensity = 3.1 + Math.sin(elapsed * 0.21) * 0.14;
    };

    const dispose = () => {
        rootGroup.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(mat)) {
                mat.forEach(disposeMaterial);
            } else if (mat) {
                disposeMaterial(mat);
            }
        });
    };

    return {
        rootGroup,
        palette,
        update,
        dispose,
        redrawPlaque: plaque.redraw,
    };
}

function disposeMaterial(mat: THREE.Material): void {
    const anyMat = mat as unknown as Record<string, THREE.Texture | undefined>;
    for (const key of ['map', 'bumpMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'emissiveMap']) {
        anyMat[key]?.dispose();
    }
    mat.dispose();
}
