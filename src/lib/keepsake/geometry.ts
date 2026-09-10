/**
 * Botanical geometry atelier for the Keepsake dioramas.
 *
 * - buildFlutedTrunk(): continuous organic fluting + muscular Nebari buttresses
 * - taperedTubeGeometry(): weighty boughs that sag under blossom load
 * - Curved, thick petal / leaf / fan geometries with cup + curl
 * - createPetalMaterial(): Fresnel rim translucency (simulated SSS)
 * - InstanceBag: high-efficiency InstancedMesh batching with HSL micro-jitter
 */

import * as THREE from 'three';
import { PRNG, ValueNoise2D } from './prng';

/* ═══════════════════════════════════════════════════════════════════════════
 * FLUTED TRUNK WITH NEBARI ROOT BUTTRESSES
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface TrunkParams {
    height: number;
    baseRadius: number;
    taper: number;          // 0..1 how much the trunk slims toward the top
    flareAmp: number;       // uniform radial flare right at the soil line
    flareTau: number;       // how quickly the flare dies with height
    fluteCount: number;     // sin wave count around the trunk (muscular fluting)
    fluteAmpBase: number;   // fluting strength at the base
    fluteAmpTop: number;    // fluting strength near the crown
    fluteTwist: number;     // flutes slowly spiral up the trunk
    buttressCount: number;  // Nebari root ridge count
    buttressAmp: number;    // how far roots plunge outward
    buttressTau: number;    // height over which buttresses fade
    buttressSpread: number; // angular half-width of each buttress (rad)
    noiseAmp: number;       // organic irregularity
    lean: number;           // slight trunk lean (rad)
    leanDirection: number;  // lean azimuth (rad)
    sink: number;           // extend below y=0 so roots grasp the earth
    seed: string;
}

export interface TrunkInfo {
    geometry: THREE.BufferGeometry;
    params: TrunkParams;
    /** Surface radius at (theta, height) — for moss placement on the bark. */
    radiusAt: (theta: number, h: number) => number;
    buttressAngles: number[];
}

export function buildFlutedTrunk(params: TrunkParams): TrunkInfo {
    const noise = new ValueNoise2D(params.seed + ':trunk');
    const prng = new PRNG(params.seed + ':trunk-angles');
    const buttressAngles: number[] = [];
    for (let i = 0; i < params.buttressCount; i++) {
        buttressAngles.push((i / params.buttressCount) * Math.PI * 2 + prng.range(-0.22, 0.22));
    }

    const radialSegments = 36;
    const heightSegments = 52;
    const yBottom = -params.sink;
    const H = params.height;

    const radiusAt = (theta: number, h: number): number => {
        // Base taper profile (thick, ancient base → slender crown)
        const t = THREE.MathUtils.clamp((h - yBottom) / (H - yBottom), 0, 1);
        let r = params.baseRadius * Math.pow(1 - t * params.taper, 1.35);

        // Root flare at the soil line
        r += params.flareAmp * Math.exp(-Math.max(0, h) / params.flareTau);

        // Continuous muscular fluting, stronger near the roots
        const fluteAmp =
            params.fluteAmpBase * Math.exp(-h / (H * 0.42)) + params.fluteAmpTop;
        r *= 1 + fluteAmp * Math.sin(params.fluteCount * theta + h * params.fluteTwist);

        // Nebari buttresses plunging into the earth
        for (const a of buttressAngles) {
            let d = Math.abs(theta - a) % (Math.PI * 2);
            if (d > Math.PI) d = Math.PI * 2 - d;
            if (d < params.buttressSpread) {
                const w = Math.cos((d / params.buttressSpread) * (Math.PI / 2));
                r +=
                    params.buttressAmp *
                    Math.pow(w, 1.6) *
                    Math.exp(-Math.max(0, h) / params.buttressTau);
            }
        }

        // Organic irregularity
        r *= 1 + params.noiseAmp * (noise.fbm(theta * 1.35, h * 0.55, 3) - 0.5) * 2;

        return Math.max(0.02, r);
    };

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iy = 0; iy <= heightSegments; iy++) {
        const v = iy / heightSegments;
        const h = yBottom + v * (H - yBottom);
        const leanOffset = Math.sin(v * Math.PI * 0.5) * params.lean * h;
        const cx = Math.cos(params.leanDirection) * leanOffset;
        const cz = Math.sin(params.leanDirection) * leanOffset;

        for (let it = 0; it <= radialSegments; it++) {
            const u = it / radialSegments;
            const theta = u * Math.PI * 2;
            const r = radiusAt(theta, h);
            positions.push(
                cx + Math.cos(theta) * r,
                h,
                cz + Math.sin(theta) * r
            );
            uvs.push(u * 2.4, v * 1.5);
        }
    }

    for (let iy = 0; iy < heightSegments; iy++) {
        for (let it = 0; it < radialSegments; it++) {
            const a = iy * (radialSegments + 1) + it;
            const b = a + radialSegments + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }

    // Root disc — seal the bottom so the trunk visibly grasps the soil
    const centerIndex = positions.length / 3;
    positions.push(cx0(params.lean), yBottom, 0);
    uvs.push(0.5, 0.02);
    function cx0(_lean: number) {
        return 0;
    }
    for (let it = 0; it < radialSegments; it++) {
        const ringIdx = it;
        indices.push(centerIndex, ringIdx + 1, ringIdx);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return { geometry, params, radiusAt, buttressAngles };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * TAPERED TUBE — weighty branches built along organic spine curves
 * ═══════════════════════════════════════════════════════════════════════════ */

export function taperedTubeGeometry(
    curve: THREE.Curve<THREE.Vector3>,
    radiusFn: (t: number) => number,
    tubularSegments = 14,
    radialSegments = 7,
    capStart = false
): THREE.BufferGeometry {
    const frames = curve.computeFrenetFrames(tubularSegments, false);
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const P = new THREE.Vector3();
    const N = new THREE.Vector3();
    const B = new THREE.Vector3();
    const v = new THREE.Vector3();

    for (let i = 0; i <= tubularSegments; i++) {
        const t = i / tubularSegments;
        curve.getPointAt(t, P);
        N.copy(frames.normals[Math.min(i, tubularSegments - 1)]);
        B.copy(frames.binormals[Math.min(i, tubularSegments - 1)]);
        const r = Math.max(0.008, radiusFn(t));

        for (let j = 0; j <= radialSegments; j++) {
            const phi = (j / radialSegments) * Math.PI * 2;
            const sin = Math.sin(phi);
            const cos = -Math.cos(phi);
            v.copy(N).multiplyScalar(cos).addScaledVector(B, sin).normalize();
            positions.push(P.x + v.x * r, P.y + v.y * r, P.z + v.z * r);
            uvs.push(j / radialSegments, t);
        }
    }

    for (let i = 0; i < tubularSegments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const a = i * (radialSegments + 1) + j;
            const b = a + radialSegments + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }

    if (capStart) {
        curve.getPointAt(0, P);
        const ci = positions.length / 3;
        positions.push(P.x, P.y, P.z);
        uvs.push(0, 0);
        for (let j = 0; j < radialSegments; j++) {
            indices.push(ci, j, j + 1);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PETALS & LEAVES — curvature, thickness variation, delicate edges
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PetalOptions {
    length?: number;
    width?: number;
    notch?: number;        // sakura-style notch at the petal tip (0..0.4)
    cup?: number;          // crossways cupping
    curl?: number;         // lengthwise upward curl
    thickness?: number;
    ruffle?: number;       // edge waviness
}

/** A thick, curved petal. Grows along +Y from the origin (calyx at y=0). */
export function createPetalGeometry(opts: PetalOptions = {}): THREE.BufferGeometry {
    const L = opts.length ?? 0.3;
    const W = opts.width ?? 0.24;
    const notch = opts.notch ?? 0.18;
    const cup = opts.cup ?? 0.06;
    const curl = opts.curl ?? 0.08;
    const thickness = opts.thickness ?? 0.014;
    const ruffle = opts.ruffle ?? 0.012;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    // Left flank — a rose-hip swell then sweep to the tip
    shape.bezierCurveTo(-W * 0.55, L * 0.08, -W * 0.52, L * 0.5, -W * 0.2, L * 0.9);
    // Notched tip (sakura heart) or rounded tip
    if (notch > 0.01) {
        shape.quadraticCurveTo(-W * 0.1, L * 1.0, 0, L * (1 - notch));
        shape.quadraticCurveTo(W * 0.1, L * 1.0, W * 0.2, L * 0.9);
    } else {
        shape.quadraticCurveTo(0, L * 1.02, W * 0.2, L * 0.9);
    }
    // Right flank back down
    shape.bezierCurveTo(W * 0.52, L * 0.5, W * 0.55, L * 0.08, 0, 0);

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: true,
        bevelThickness: thickness * 0.5,
        bevelSize: thickness * 0.55,
        bevelSegments: 1,
        curveSegments: 5,
        steps: 1,
    });

    // Center on X, sit on Y=0, cup + curl the whole blade
    geo.translate(-thickness / 2, 0, -thickness / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const t = y / L;
        const xn = x / (W / 2);
        let z = pos.getZ(i);
        z += cup * (xn * xn) * (1 - 0.35 * t);                 // crossways cup
        z += curl * t * t;                                      // tip curls up
        z += ruffle * Math.sin(xn * 9.5) * Math.max(0, t - 0.35); // delicate ruffled edge
        pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
}

/** Serrated foliage leaf (rose / wisteria greenery). Grows along +Y. */
export function createLeafGeometry(length = 0.34, width = 0.18): THREE.BufferGeometry {
    const pts: THREE.Vector2[] = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const halfW =
            (width / 2) *
            Math.sin(Math.PI * Math.min(1, t * 1.12)) *
            (1 - 0.12 * t) *
            (1 + 0.1 * Math.sin(t * Math.PI * 7)); // gentle serration
        pts.push(new THREE.Vector2(halfW, t * length));
    }
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (const p of pts) shape.lineTo(p.x, p.y);
    for (let i = pts.length - 1; i >= 0; i--) shape.lineTo(-pts[i].x, pts[i].y);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.006,
        bevelEnabled: true,
        bevelThickness: 0.003,
        bevelSize: 0.004,
        bevelSegments: 1,
        curveSegments: 2,
        steps: 1,
    });
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, pos.getZ(i) + 0.05 * (x / (width / 2)) ** 2 + 0.04 * (y / length) ** 2);
    }
    geo.computeVertexNormals();
    return geo;
}

/** Ginkgo fan leaf with its iconic notch, on a slender stem. Grows along +Y. */
export function createGinkgoLeafGeometry(size = 0.3): THREE.BufferGeometry {
    const stem = size * 0.36;
    const R = size * 0.8;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, stem);
    // Fan opening upward, ±66°
    const a0 = Math.PI / 2 - 1.15;
    const a1 = Math.PI / 2 + 1.15;
    shape.absarc(0, stem + R * 0.42, R * 0.82, a0 - 0.35, a1 + 0.35, false);
    // Notch dip at the crown center
    shape.quadraticCurveTo(0, stem + R * 0.62, -R * 0.66, stem + R * 0.58);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.006,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.003,
        bevelSegments: 1,
        curveSegments: 5,
        steps: 1,
    });
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, pos.getZ(i) + 0.07 * (x / R) ** 2 - 0.03 * Math.abs(y - stem) / R);
    }
    geo.computeVertexNormals();
    return geo;
}

/** A tiny ginkgo fruit (silverpink berry) for realism sprinkles. */
export function createBerryGeometry(r = 0.05): THREE.BufferGeometry {
    return new THREE.SphereGeometry(r, 8, 6);
}

/** Wisteria floret — a butterfly-shaped lip petal pair. */
export function createFloretGeometry(size = 0.09): THREE.BufferGeometry {
    const s = size;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(s * 0.9, s * 0.1, s * 1.05, s * 0.75, s * 0.28, s * 0.95);
    shape.quadraticCurveTo(s * 0.1, s * 1.05, 0, s * 0.82);
    shape.quadraticCurveTo(-s * 0.1, s * 1.05, -s * 0.28, s * 0.95);
    shape.bezierCurveTo(-s * 1.05, s * 0.75, -s * 0.9, s * 0.1, 0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: s * 0.1,
        bevelEnabled: true,
        bevelThickness: s * 0.03,
        bevelSize: s * 0.05,
        bevelSegments: 1,
        curveSegments: 4,
        steps: 1,
    });
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, pos.getZ(i) + 0.14 * (x / s) ** 2);
    }
    geo.computeVertexNormals();
    return geo;
}

/** Three-leaf clover sprout used in palette-harmonized undergrowth. */
export function createCloverGeometry(size = 0.07): THREE.BufferGeometry {
    const leaf = new THREE.Shape();
    leaf.moveTo(0, 0);
    leaf.bezierCurveTo(size, size * 0.3, size * 1.05, size * 1.1, 0, size * 1.15);
    leaf.bezierCurveTo(-size * 1.05, size * 1.1, -size, size * 0.3, 0, 0);
    const one = new THREE.ExtrudeGeometry(leaf, {
        depth: 0.004,
        bevelEnabled: false,
        curveSegments: 4,
    });
    one.rotateX(-0.35);
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++) {
        const g = one.clone();
        g.rotateY((k / 3) * Math.PI * 2);
        g.translate(0, 0.02, 0);
        parts.push(g);
    }
    const merged = mergeSimple(parts);
    return merged;
}

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function mergeSimple(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const merged = mergeGeometries(parts, false);
    return merged || parts[0];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MATERIALS
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Petal material with a view-dependent Fresnel rim — simulates the
 * subsurface-scattered translucent edge that catches golden-hour rim light.
 * Works with per-instance colors.
 */
export function createPetalMaterial(
    rimColor: THREE.ColorRepresentation,
    opts: { roughness?: number; rimStrength?: number; rimPower?: number } = {}
): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: opts.roughness ?? 0.52,
        metalness: 0.02,
        side: THREE.DoubleSide,
    });

    const rim = { value: new THREE.Color(rimColor) };
    const strength = { value: opts.rimStrength ?? 0.5 };
    const power = { value: opts.rimPower ?? 2.6 };

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uRimColor = rim;
        shader.uniforms.uRimStrength = strength;
        shader.uniforms.uRimPower = power;
        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
                uniform vec3 uRimColor;
                uniform float uRimStrength;
                uniform float uRimPower;`
            )
            .replace(
                '#include <emissivemap_fragment>',
                `#include <emissivemap_fragment>
                {
                    vec3 viewDir = normalize(vViewPosition);
                    float fres = pow(clamp(1.0 - abs(dot(normalize(vNormal), viewDir)), 0.0, 1.0), uRimPower);
                    totalEmissiveRadiance += uRimColor * fres * uRimStrength;
                }`
            );
    };
    mat.customProgramCacheKey = () => 'keepsake-petal-rim';
    return mat;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * INSTANCE BAG — batched instancing with per-instance HSL micro-jitter
 * ═══════════════════════════════════════════════════════════════════════════ */

const _tmpMat4 = new THREE.Matrix4();
const _tmpQuat = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler();

export class InstanceBag {
    private matrices: THREE.Matrix4[] = [];
    private colors: THREE.Color[] = [];

    get size(): number {
        return this.matrices.length;
    }

    add(
        position: THREE.Vector3,
        quaternion: THREE.Quaternion,
        scale: THREE.Vector3 | number,
        color: THREE.Color
    ): void {
        const s =
            typeof scale === 'number'
                ? new THREE.Vector3(scale, scale, scale)
                : scale.clone();
        _tmpMat4.compose(position, quaternion, s);
        this.matrices.push(_tmpMat4.clone());
        this.colors.push(color.clone());
    }

    addTRS(
        px: number, py: number, pz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number,
        color: THREE.Color
    ): void {
        _tmpEuler.set(rx, ry, rz);
        _tmpQuat.setFromEuler(_tmpEuler);
        _tmpMat4.compose(new THREE.Vector3(px, py, pz), _tmpQuat, new THREE.Vector3(sx, sy, sz));
        this.matrices.push(_tmpMat4.clone());
        this.colors.push(color.clone());
    }

    /** Bake into a shadow-casting InstancedMesh. */
    build(
        geometry: THREE.BufferGeometry,
        material: THREE.Material,
        opts: { castShadow?: boolean; receiveShadow?: boolean; name?: string } = {}
    ): THREE.InstancedMesh {
        const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, this.matrices.length));
        for (let i = 0; i < this.matrices.length; i++) {
            mesh.setMatrixAt(i, this.matrices[i]);
            mesh.setColorAt(i, this.colors[i]);
        }
        if (this.matrices.length === 0) mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = opts.castShadow ?? true;
        mesh.receiveShadow = opts.receiveShadow ?? true;
        mesh.name = opts.name ?? 'instanceBag';
        return mesh;
    }
}

/** Convenience: random micro-jitter around a base color so no two petals match. */
export function jitterHSL(
    base: THREE.Color,
    prng: PRNG,
    h = 0.012,
    s = 0.03,
    l = 0.035
): THREE.Color {
    return base
        .clone()
        .offsetHSL(prng.range(-h, h), prng.range(-s, s), prng.range(-l, l));
}

/** Gaussian offset vector around a point, sigma per axis. */
export function gaussOffset(
    prng: PRNG,
    sx: number,
    sy: number,
    sz: number,
    out = new THREE.Vector3()
): THREE.Vector3 {
    return out.set(
        prng.gaussian() * sx,
        prng.gaussian() * sy,
        prng.gaussian() * sz
    );
}

export { mergeGeometries };
