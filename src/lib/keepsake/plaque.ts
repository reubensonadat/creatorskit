/**
 * THE GIFT PLAQUE
 * ===============
 * An engraved brass dedication resting on a warm cedar plinth at the foot
 * of the tree — the personal, physical heart of the keepsake. The cursive
 * typography is embossed with a light-catching lower lip (true engraving),
 * framed by a double-cut border and corner blossoms tinted with the
 * living palette.
 */

import * as THREE from 'three';
import { makeBrassPlaqueTexture, makeCedarTexture } from './textures';
import type { KeepsakePalette, PlaqueText } from './types';

export interface PlaqueHandles {
    group: THREE.Group;
    /** Redraw the engraving (e.g. once web fonts finish loading). */
    redraw: () => void;
}

export function buildGiftPlaque(
    palette: KeepsakePalette,
    seed: string,
    text: PlaqueText
): PlaqueHandles {
    const group = new THREE.Group();
    group.name = 'giftPlaque';

    /* ── Cedar plinth — hand-oiled warm wood ─────────────────────────────── */
    const cedarTex = makeCedarTexture(seed);
    cedarTex.repeat.set(2, 1);
    const cedarMat = new THREE.MeshStandardMaterial({
        map: cedarTex,
        color: 0xffffff,
        roughness: 0.62,
        metalness: 0.02,
    });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.44, 1.62), cedarMat);
    plinth.position.y = -0.62;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Chamfered plinth cap
    const capMat = new THREE.MeshStandardMaterial({
        color: 0xa4713f,
        roughness: 0.5,
    });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(4.66, 0.1, 1.78), capMat);
    cap.position.y = -0.36;
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);

    /* ── The brass plate, tilted toward the viewer like an open book ─────── */
    const artwork = makeBrassPlaqueTexture(text, palette.canopy.primary);
    const brassMat = new THREE.MeshPhysicalMaterial({
        map: artwork.texture,
        metalness: 0.88,
        roughness: 0.3,
        clearcoat: 0.65,
        clearcoatRoughness: 0.3,
        envMapIntensity: 1.5,
    });

    const platePivot = new THREE.Group();
    platePivot.position.set(0, -0.28, 0.18);
    platePivot.rotation.x = -0.34; // reading tilt
    group.add(platePivot);

    const plate = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.09, 1.24), brassMat);
    plate.castShadow = true;
    plate.receiveShadow = true;
    platePivot.add(plate);

    // Brass edge bezel (slightly larger back plate for depth)
    const bezelMat = new THREE.MeshPhysicalMaterial({
        color: 0xb08a3e,
        metalness: 0.92,
        roughness: 0.24,
        envMapIntensity: 1.4,
    });
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(3.82, 0.05, 1.36), bezelMat);
    bezel.position.y = -0.065;
    platePivot.add(bezel);

    // Corner pins — tiny riveted brass studs
    const pinGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.06, 8);
    for (const [px, pz] of [
        [-1.72, 0.5],
        [1.72, 0.5],
        [-1.72, -0.5],
        [1.72, -0.5],
    ]) {
        const pin = new THREE.Mesh(pinGeo, bezelMat);
        pin.position.set(px, 0.07, pz);
        platePivot.add(pin);
    }

    /* ── Two small lantern stones flanking the dedication ────────────────── */
    const stoneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.cobble.base).lerp(new THREE.Color('#ffffff'), 0.18),
        roughness: 0.7,
    });
    for (const sx of [-2.6, 2.6]) {
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.62, 7), stoneMat);
        lantern.position.set(sx, -0.52, 0.1);
        lantern.castShadow = true;
        lantern.receiveShadow = true;
        group.add(lantern);

        const capStone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 7), stoneMat);
        capStone.position.set(sx, -0.06, 0.1);
        capStone.castShadow = true;
        group.add(capStone);
    }

    return { group, redraw: artwork.redraw };
}
