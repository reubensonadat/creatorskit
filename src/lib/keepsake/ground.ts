/**
 * Palette-Bound Ground System
 * ===========================
 * The ground is NEVER a generic green — it is dynamically bound to the
 * chosen tree palette and transforms instantly when the preset changes:
 *
 *  - Layered stone pedestal rising like a museum display plinth
 *  - Wet-sheen cobblestone walkway reflecting ambient color temperature,
 *    with velvet moss creeping through the grout lines
 *  - Fallen petals that form organic DRIFTS and DUNES — dense mounds
 *    accumulating against the root buttresses, stone curbs and steppers
 *  - Undergrowth harmonized with the canopy: blush clover + baby's breath
 *    beneath a sakura; rich ochre + amber moss beneath a golden ginkgo
 */

import * as THREE from 'three';
import { PRNG } from './prng';
import { InstanceBag, jitterHSL, createPetalGeometry, mergeGeometries } from './geometry';
import type { KeepsakePalette } from './types';

export interface GroundContext {
    palette: KeepsakePalette;
    seed: string;
    /** Buttress/root azimuths the petal carpet piles against. */
    rootAngles: number[];
    /** Where the brass plaque sits (carved gap in the walkway). */
    plaqueAngle?: number;
}

export function buildKeepsakeGround(ctx: GroundContext): THREE.Group {
    const { palette, seed } = ctx;
    const group = new THREE.Group();
    group.name = 'keepsakeGround';

    const prng = new PRNG(seed).fork('ground');

    const stoneTint = new THREE.Color(palette.cobble.base);
    const mossTint = new THREE.Color(palette.cobble.moss);

    /* ── 1. MUSEUM PLINTH — layered stone pedestal ──────────────────────── */
    const plinthMat = new THREE.MeshStandardMaterial({
        color: stoneTint.clone().multiplyScalar(0.82).lerp(new THREE.Color('#efe8da'), 0.25),
        roughness: 0.86,
        metalness: 0.02,
    });
    const tiers: Array<{ r: number; h: number; y: number }> = [
        { r: 13.4, h: 0.7, y: -1.82 },   // base slab: -2.17 … -1.47
        { r: 12.7, h: 0.55, y: -1.215 }, // mid ring:  -1.49 … -0.94
        { r: 12.05, h: 0.95, y: -1.395 },// top tier:  -1.87 … -0.92
    ];
    for (const tier of tiers) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(tier.r, tier.r * 1.03, tier.h, 48), plinthMat);
        m.position.y = tier.y;
        m.receiveShadow = true;
        m.castShadow = true;
        group.add(m);
    }

    // Chiseled edge highlight ring on the top tier
    const edgeMat = new THREE.MeshStandardMaterial({
        color: stoneTint.clone().lerp(new THREE.Color('#ffffff'), 0.3),
        roughness: 0.7,
    });
    const edge = new THREE.Mesh(new THREE.TorusGeometry(12.02, 0.09, 8, 56), edgeMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = -0.92;
    edge.receiveShadow = true;
    group.add(edge);

    /* ── 2. SOIL BED — dark living earth, slightly domed ────────────────── */
    const soilMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#2f2418').lerp(new THREE.Color(palette.canopy.deep), 0.16),
        roughness: 0.98,
    });
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 0.5, 48), soilMat);
    soil.position.y = -0.67; // slab from -0.92 to -0.42; the garden floor is y=-0.42
    soil.receiveShadow = true;
    group.add(soil);

    // Dark earth apron below the soil (so the diorama reads "cut from the earth")
    const earthMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#3d2e1e').lerp(new THREE.Color(palette.barkTint), 0.3),
        roughness: 0.95,
    });
    const earth = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 10.9, 1.35, 40), earthMat);
    earth.position.y = -1.6; // hidden core filling the plinth interior
    group.add(earth);

    /* ── 3. COBBLESTONE WALKWAY — wet-sheen stones, mossy grout ─────────── */
    const cobbleBag = new InstanceBag();
    const groutMossBag = new InstanceBag();

    const cobbleGeo = new THREE.CylinderGeometry(0.34, 0.41, 0.24, 7);
    const stoneBase = stoneTint.clone();
    // Wet sheen: low roughness + slight clearcoat; ambient reflections come
    // from the environment map set on the scene.
    const cobbleMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.34,
        metalness: 0.02,
        clearcoat: 0.55,
        clearcoatRoughness: 0.4,
    });

    const walkwayInner = 7.6;
    const walkwayOuter = 10.9;
    for (let ring = walkwayInner; ring < walkwayOuter; ring += 0.64) {
        const count = Math.max(8, Math.floor((2 * Math.PI * ring) / 0.68));
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + prng.range(-0.06, 0.06);
            const r = ring + prng.range(-0.07, 0.07);
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;

            cobbleBag.addTRS(
                x,
                -0.30 + prng.range(0.0, 0.05), // stones sit on the soil (-0.42 base)
                z,
                0,
                prng.range(0, Math.PI * 2),
                0,
                prng.range(0.82, 1.06),
                prng.range(0.75, 1.1),
                prng.range(0.82, 1.06),
                jitterHSL(stoneBase, prng, 0.012, 0.02, 0.045)
            );

            // Velvet moss creeping between the grout lines (behind most stones)
            if (prng.bool(0.34)) {
                groutMossBag.addTRS(
                    x + prng.range(-0.28, 0.28),
                    -0.44,
                    z + prng.range(-0.28, 0.28),
                    0,
                    prng.range(0, Math.PI * 2),
                    0,
                    1, 1, 1,
                    jitterHSL(mossTint, prng, 0.02, 0.05, 0.06)
                );
            }
        }
    }
    group.add(
        cobbleBag.build(cobbleGeo, cobbleMat, {
            castShadow: true,
            receiveShadow: true,
            name: 'cobblestones',
        })
    );
    group.add(
        groutMossBag.build(
            new THREE.SphereGeometry(0.17, 7, 5),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 }),
            {
                name: 'groutMoss',
                castShadow: false,
                receiveShadow: true,
            }
        )
    );
    // Squash grout moss flat
    group.traverse((o) => {
        if ((o as THREE.InstancedMesh).name === 'groutMoss') {
            (o as THREE.InstancedMesh).scale.set(1, 0.32, 1);
        }
    });

    /* ── 4. STONE CURBS framing the inner garden ────────────────────────── */
    const curbMat = new THREE.MeshStandardMaterial({
        color: stoneTint.clone().lerp(new THREE.Color('#ffffff'), 0.14),
        roughness: 0.6,
        metalness: 0.03,
    });
    const curbBag = new InstanceBag();
    const curbGeo = new THREE.BoxGeometry(0.9, 0.34, 0.36);
    const curbCount = 44;
    for (let i = 0; i < curbCount; i++) {
        const a = (i / curbCount) * Math.PI * 2 + (Math.PI / curbCount);
        curbBag.addTRS(
            Math.cos(a) * walkwayInner,
            -0.25,
            Math.sin(a) * walkwayInner,
            0,
            -a + Math.PI / 2,
            0,
            1, prng.range(0.85, 1.05), 1,
            jitterHSL(stoneBase, prng, 0.008, 0.015, 0.03)
        );
    }
    group.add(curbBag.build(curbGeo, curbMat, { castShadow: true, receiveShadow: true, name: 'innerCurb' }));

    /* ── 5. STEPPING STONES — a quiet path to the plaque ────────────────── */
    const stepperMat = new THREE.MeshStandardMaterial({
        color: stoneTint.clone().lerp(new THREE.Color('#ffffff'), 0.2),
        roughness: 0.42,
        metalness: 0.03,
    });
    const stepGeo = new THREE.CylinderGeometry(0.72, 0.78, 0.16, 9);
    for (let s = 0; s < 3; s++) {
        const step = new THREE.Mesh(stepGeo, stepperMat);
        const a = ctx.plaqueAngle ?? Math.PI / 2;
        const r = 2.6 + s * 1.65;
        step.position.set(Math.cos(a) * r, -0.34, Math.sin(a) * r);
        step.rotation.y = prng.range(0, Math.PI);
        step.castShadow = true;
        step.receiveShadow = true;
        group.add(step);
    }

    /* ── 6. FALLEN PETAL CARPET — drifts & dunes, never sparse dots ─────── */
    const carpetBag = new InstanceBag();
    const carpetColors = palette.petalCarpet.map((c) => new THREE.Color(c));
    const aged = new THREE.Color(palette.canopy.deep);

    /** Scatter one drift: petals concentrate at the heart, pile against obstacles. */
    function drift(
        cx: number,
        cz: number,
        sigmaX: number,
        sigmaZ: number,
        count: number,
        pileCenterBias = 1
    ): void {
        for (let i = 0; i < count; i++) {
            // Gaussian cluster, pulled toward the drift heart
            let ox = prng.gaussian() * sigmaX;
            let oz = prng.gaussian() * sigmaZ;
            ox *= pileCenterBias;
            oz *= pileCenterBias;
            const x = cx + ox;
            const z = cz + oz;
            const rr = Math.hypot(ox / sigmaX, oz / sigmaZ); // normalized distance

            // Keep the carpet inside the garden — stones stay stone
            if (x * x + z * z > 54.1) continue; // r < 7.35

            // Dune height: petals stack into a soft mound at the heart
            const pile = Math.max(0, 1 - rr * 0.55);
            const y = -0.41 + pile * prng.range(0.02, 0.16) + prng.range(0, 0.02);

            // Mostly lying flat, sun-curled few
            const tilt = prng.range(-0.16, 0.16);
            const yaw = prng.range(0, Math.PI * 2);

            const s = prng.range(0.72, 1.35) * (1 + pile * 0.25);
            let col = jitterHSL(prng.pick(carpetColors), prng, 0.013, 0.03, 0.045);
            if (prng.bool(0.08)) {
                col = jitterHSL(aged, prng, 0.01, 0.02, 0.03); // a few aged, rain-darkened
            }
            col.multiplyScalar(0.94); // grounded, no canopy glow

            carpetBag.addTRS(x, y, z, -Math.PI / 2 + tilt, yaw, 0, s, s, prng.range(0.9, 1.1), col);
        }
    }

    // (a) Root collar drifts — petals pile against each buttress
    for (const a of ctx.rootAngles) {
        const r = prng.range(1.5, 2.6);
        drift(
            Math.cos(a) * r,
            Math.sin(a) * r,
            prng.range(1.0, 1.5),
            prng.range(1.0, 1.5),
            prng.int(210, 300),
            0.85
        );
    }

    // (b) Inner curb accumulation — long windswept drifts against the edging
    const curbDrifts = 6;
    for (let d = 0; d < curbDrifts; d++) {
        const a = prng.range(0, Math.PI * 2);
        const r = prng.range(6.2, 6.9);
        drift(
            Math.cos(a) * r,
            Math.sin(a) * r,
            prng.range(1.6, 2.3),
            prng.range(0.7, 1.1),
            prng.int(160, 240)
        );
    }

    // (c) Free dunes — wandering hearts of the carpet
    const duneCount = 4;
    for (let d = 0; d < duneCount; d++) {
        const a = prng.range(0, Math.PI * 2);
        const r = prng.range(3.2, 5.6);
        drift(
            Math.cos(a) * r,
            Math.sin(a) * r,
            prng.range(1.2, 1.9),
            prng.range(1.2, 1.9),
            prng.int(180, 260)
        );
    }

    // (d) Soft scatter across the whole garden floor
    drift(0, 0, 5.6, 5.6, 420, 1);

    const carpetGeo = createPetalGeometry({
        length: 0.3,
        width: 0.27,
        notch: 0.2,
        cup: 0.05,
        curl: 0.14,
    });
    const carpetMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.72,
        metalness: 0,
        side: THREE.DoubleSide,
    });
    group.add(
        carpetBag.build(carpetGeo, carpetMat, {
            castShadow: false, // petals don't need to shadow — they ARE the shadow story
            receiveShadow: true,
            name: 'petalCarpet',
        })
    );

    /* ── 7. HARMONIZED UNDERGROWTH ───────────────────────────────────────── */
    const cloverBag = new InstanceBag();
    const cloverColor = new THREE.Color(palette.undergrowth.clover);

    // Blush/ochre clover patches
    const cloverClusters = 12;
    for (let c = 0; c < cloverClusters; c++) {
        const a = prng.range(0, Math.PI * 2);
        const r = prng.range(1.8, 6.6);
        const cx = Math.cos(a) * r;
        const cz = Math.sin(a) * r;
        const per = prng.int(14, 26);
        for (let i = 0; i < per; i++) {
            cloverBag.addTRS(
                cx + prng.gaussian() * 0.55,
                -0.41 + prng.range(0, 0.05),
                cz + prng.gaussian() * 0.55,
                0,
                prng.range(0, Math.PI * 2),
                0,
                1, 1, 1,
                jitterHSL(cloverColor, prng, 0.015, 0.04, 0.05)
            );
        }
    }
    const cloverGeo = makeCloverGeo();
    group.add(
        cloverBag.build(cloverGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), {
            name: 'clover',
            castShadow: false,
            receiveShadow: true,
        })
    );

    // Baby's breath — constellations of tiny white stars on fine stems
    const stemBag = new InstanceBag();
    const starBag = new InstanceBag();
    const starColor = new THREE.Color(palette.undergrowth.babyBreath);
    const stemColor = new THREE.Color(palette.undergrowth.stem);
    const starCount = 170;
    for (let s = 0; s < starCount; s++) {
        const a = prng.range(0, Math.PI * 2);
        const r = prng.range(2.0, 6.8);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const h = prng.range(0.5, 1.15);

        stemBag.addTRS(x, -0.42 + h / 2, z, prng.range(-0.08, 0.08), 0, prng.range(-0.08, 0.08), 1, h, 1, stemColor);
        starBag.addTRS(x + prng.range(-0.04, 0.04), -0.42 + h + 0.03, z + prng.range(-0.04, 0.04), 0, 0, 0, 1, 1, 1, jitterHSL(starColor, prng, 0.006, 0.015, 0.02));

        // each plant gets a little sister bud
        if (prng.bool(0.6)) {
            const h2 = h * prng.range(0.5, 0.8);
            const x2 = x + prng.range(-0.16, 0.16);
            const z2 = z + prng.range(-0.16, 0.16);
            stemBag.addTRS(x2, -0.42 + h2 / 2, z2, prng.range(-0.1, 0.1), 0, prng.range(-0.1, 0.1), 0.8, h2, 0.8, stemColor);
            starBag.addTRS(x2, -0.42 + h2 + 0.02, z2, 0, 0, 0, 0.8, 0.8, 0.8, jitterHSL(starColor, prng, 0.006, 0.015, 0.02));
        }
    }
    group.add(
        stemBag.build(
            new THREE.CylinderGeometry(0.012, 0.017, 1, 4),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
            { name: 'babyBreathStems', castShadow: false }
        )
    );
    group.add(
        starBag.build(
            new THREE.SphereGeometry(0.05, 6, 5),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
            { name: 'babyBreathStars', castShadow: false }
        )
    );

    // Velvet moss cushions on the garden floor
    const floorMossBag = new InstanceBag();
    const floorMossColor = new THREE.Color(palette.undergrowth.moss);
    for (let m = 0; m < 150; m++) {
        const a = prng.range(0, Math.PI * 2);
        const r = prng.range(0.8, 7.2);
        const s = prng.range(0.14, 0.42);
        floorMossBag.addTRS(
            Math.cos(a) * r,
            -0.42 + s * 0.12,
            Math.sin(a) * r,
            0,
            prng.range(0, Math.PI * 2),
            0,
            s, s * prng.range(0.3, 0.45), s * prng.range(0.8, 1.2),
            jitterHSL(floorMossColor, prng, 0.02, 0.05, 0.06)
        );
    }
    group.add(
        floorMossBag.build(
            new THREE.SphereGeometry(1, 7, 5),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 }),
            { name: 'floorMoss', castShadow: false, receiveShadow: true }
        )
    );

    // Micro-herb blades catching the breeze
    const herbBag = new InstanceBag();
    const herbColor = new THREE.Color(palette.undergrowth.herb);
    for (let h = 0; h < 260; h++) {
        const a = prng.range(0, Math.PI * 2);
        const r = prng.range(1.2, 7.0);
        const height = prng.range(0.18, 0.5);
        herbBag.addTRS(
            Math.cos(a) * r,
            -0.42 + height / 2,
            Math.sin(a) * r,
            prng.range(-0.16, 0.16),
            prng.range(0, Math.PI * 2),
            prng.range(-0.16, 0.16),
            prng.range(0.6, 1), height, prng.range(0.6, 1),
            jitterHSL(herbColor, prng, 0.018, 0.05, 0.05)
        );
    }
    group.add(
        herbBag.build(
            new THREE.ConeGeometry(0.035, 1, 4),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }),
            { name: 'microHerbs', castShadow: false, receiveShadow: true }
        )
    );

    return group;
}

/** Tiny 3-lobe clover sprout geometry (three fused hearts + stem). */
function makeCloverGeo(): THREE.BufferGeometry {
    const leaf = new THREE.Shape();
    const s = 0.07;
    leaf.moveTo(0, 0);
    leaf.bezierCurveTo(s, s * 0.3, s * 1.02, s * 1.05, 0, s * 1.12);
    leaf.bezierCurveTo(-s * 1.02, s * 1.05, -s, s * 0.3, 0, 0);
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++) {
        const g = new THREE.ExtrudeGeometry(leaf, { depth: 0.004, bevelEnabled: false, curveSegments: 4 });
        g.rotateX(-0.5);
        g.rotateY((k / 3) * Math.PI * 2);
        parts.push(g);
    }
    const stem = new THREE.CylinderGeometry(0.008, 0.01, 0.16, 4);
    stem.translate(0, 0.06, 0);
    parts.push(stem);
    return mergeGeometries(parts, false) || parts[0];
}
