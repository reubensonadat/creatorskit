'use client';

/**
 * KEEPSAKE DIORAMA — cinematic, fully 3D-rotatable WebGL canvas.
 *
 * Interaction contract (per the gift-giver's request):
 *  - Drag anywhere → orbit the tree through a FULL 360° of azimuth
 *  - Drag vertically → tilt between a worm's-eye and bird's-eye view
 *  - Scroll / pinch → zoom
 *  - Idle → the diorama slowly, lovingly turns by itself
 */

import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    useImperativeHandle,
    forwardRef,
} from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
    buildKeepsakeDiorama,
    KeepsakeDiorama as DioramaObjects,
} from '@/lib/keepsake/keepsake-builder';
import type { KeepsakeConfig } from '@/lib/keepsake/types';

export interface KeepsakeDioramaRef {
    captureSnapshot: () => Promise<string>;
    resetCamera: () => void;
    setAutoRotate: (on: boolean) => void;
}

interface KeepsakeDioramaProps {
    config: KeepsakeConfig;
    className?: string;
}

interface OrbitState {
    theta: number;      // azimuth — UNCLAMPED, full 360°+
    phi: number;        // polar
    radius: number;
    targetTheta: number;
    targetPhi: number;
    targetRadius: number;
    targetY: number;
    currentY: number;
}

export const KeepsakeDiorama = forwardRef<KeepsakeDioramaRef, KeepsakeDioramaProps>(
    function KeepsakeDiorama({ config, className }, ref) {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);

        const [isReady, setIsReady] = useState(false);

        const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
        const sceneRef = useRef<THREE.Scene | null>(null);
        const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
        const dioramaRef = useRef<DioramaObjects | null>(null);
        const orbitRef = useRef<OrbitState>({
            theta: Math.PI * 0.32,
            phi: 1.08,
            radius: 34, // start pulled back; the intro glide eases in
            targetTheta: Math.PI * 0.32,
            targetPhi: 1.02,
            targetRadius: 24.5,
            targetY: 3.6,
            currentY: 6.2,
        });
        const autoRotateRef = useRef(true);
        const lastInteractionRef = useRef(0);
        const dragRef = useRef({
            active: false,
            x: 0,
            y: 0,
            moved: 0,
        });

        /* ─── RENDERER / SCENE / CAMERA — one-time setup ─────────────────── */
        useEffect(() => {
            const container = containerRef.current;
            const canvas = canvasRef.current;
            if (!container || !canvas) return;

            const scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0xf3e6d8, 0.0075);

            const camera = new THREE.PerspectiveCamera(
                36,
                (container.clientWidth || 800) / (container.clientHeight || 600),
                0.1,
                400
            );

            const renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                preserveDrawingBuffer: true,
                powerPreference: 'high-performance',
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.08;
            renderer.outputColorSpace = THREE.SRGBColorSpace;

            // Studio environment reflections — makes the brass plaque glow
            // and gives the wet cobbles their sheen.
            const pmrem = new THREE.PMREMGenerator(renderer);
            const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
            scene.environment = envMap;
            scene.environmentIntensity = 0.42;
            pmrem.dispose();

            sceneRef.current = scene;
            cameraRef.current = camera;
            rendererRef.current = renderer;

            /* ─── Animation loop ─── */
            const clock = new THREE.Clock();
            let animId = 0;

            const animate = () => {
                animId = requestAnimationFrame(animate);
                const delta = Math.min(clock.getDelta(), 0.05);
                const elapsed = clock.elapsedTime;
                const orbit = orbitRef.current;

                // Idle → slow, loving auto-rotation of the whole tree
                if (
                    autoRotateRef.current &&
                    !dragRef.current.active &&
                    elapsed - lastInteractionRef.current > 2.2
                ) {
                    orbit.targetTheta += delta * 0.1;
                }

                // Damped orbit — buttery, museum-display motion
                orbit.theta += (orbit.targetTheta - orbit.theta) * Math.min(1, delta * 7.5);
                orbit.phi += (orbit.targetPhi - orbit.phi) * Math.min(1, delta * 7.5);
                orbit.radius += (orbit.targetRadius - orbit.radius) * Math.min(1, delta * 4.2);
                orbit.currentY += (orbit.targetY - orbit.currentY) * Math.min(1, delta * 4.2);

                const sinPhi = Math.sin(orbit.phi);
                camera.position.set(
                    orbit.radius * sinPhi * Math.sin(orbit.theta),
                    orbit.currentY + orbit.radius * Math.cos(orbit.phi),
                    orbit.radius * sinPhi * Math.cos(orbit.theta)
                );
                camera.lookAt(0, orbit.currentY, 0);

                dioramaRef.current?.update(elapsed, delta);
                renderer.render(scene, camera);
            };
            animate();

            /* ─── Resize ─── */
            const handleResize = () => {
                if (!container || !camera || !renderer) return;
                const w = container.clientWidth;
                const h = container.clientHeight;
                if (w === 0 || h === 0) return;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                renderer.setSize(w, h);
            };
            const ro = new ResizeObserver(handleResize);
            ro.observe(container);

            return () => {
                cancelAnimationFrame(animId);
                ro.disconnect();
                dioramaRef.current?.dispose();
                dioramaRef.current = null;
                envMap.dispose();
                renderer.dispose();
                sceneRef.current = null;
                cameraRef.current = null;
                rendererRef.current = null;
            };
        }, []);

        /* ─── BUILD / REBUILD the diorama when the config changes ────────── */
        useEffect(() => {
            const scene = sceneRef.current;
            if (!scene) return;

            let cancelled = false;
            let diorama: DioramaObjects | null = null;

            // Wait (briefly) for the cursive engraving font so the brass
            // plaque renders with its intended typography.
            const fontReady =
                typeof document !== 'undefined' && document.fonts
                    ? Promise.race([
                        document.fonts.load('700 90px Caveat').catch(() => undefined),
                        new Promise((r) => setTimeout(r, 1400)),
                    ])
                    : Promise.resolve();

            fontReady.then(() => {
                if (cancelled) return;

                // Tear down previous build
                if (dioramaRef.current) {
                    scene.remove(dioramaRef.current.rootGroup);
                    dioramaRef.current.dispose();
                    dioramaRef.current = null;
                }

                diorama = buildKeepsakeDiorama(config);
                dioramaRef.current = diorama;
                scene.add(diorama.rootGroup);
                setIsReady(true);
            });

            return () => {
                cancelled = true;
            };
        }, [config]);

        /* ─── Exposed API ─── */
        useImperativeHandle(
            ref,
            () => ({
                captureSnapshot: async (): Promise<string> => {
                    const renderer = rendererRef.current;
                    const sc = sceneRef.current;
                    const cam = cameraRef.current;
                    if (!renderer || !sc || !cam) return '';
                    renderer.render(sc, cam);
                    return renderer.domElement.toDataURL('image/png');
                },
                resetCamera: () => {
                    const orbit = orbitRef.current;
                    orbit.targetTheta = Math.PI * 0.32;
                    orbit.targetPhi = 1.02;
                    orbit.targetRadius = 24.5;
                    orbit.targetY = 3.6;
                    lastInteractionRef.current = performance.now() / 1000;
                },
                setAutoRotate: (on: boolean) => {
                    autoRotateRef.current = on;
                },
            }),
            []
        );

        /* ─── POINTER CONTROLS — full 360° orbit ─── */
        const handlePointerDown = useCallback((e: React.PointerEvent) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            dragRef.current = { active: true, x: e.clientX, y: e.clientY, moved: 0 };
            lastInteractionRef.current = performance.now() / 1000;
        }, []);

        const handlePointerMove = useCallback((e: React.PointerEvent) => {
            const drag = dragRef.current;
            if (!drag.active) return;
            const orbit = orbitRef.current;

            const dx = e.clientX - drag.x;
            const dy = e.clientY - drag.y;
            drag.x = e.clientX;
            drag.y = e.clientY;
            drag.moved += Math.abs(dx) + Math.abs(dy);

            // Full 360° azimuthal freedom; generous polar range
            orbit.targetTheta -= dx * 0.0052;
            orbit.targetPhi = THREE.MathUtils.clamp(
                orbit.targetPhi - dy * 0.0042,
                0.18,
                1.52
            );
            lastInteractionRef.current = performance.now() / 1000;
        }, []);

        const handlePointerUp = useCallback((e: React.PointerEvent) => {
            dragRef.current.active = false;
            lastInteractionRef.current = performance.now() / 1000;
        }, []);

        const handleWheel = useCallback((e: React.WheelEvent) => {
            const orbit = orbitRef.current;
            orbit.targetRadius = THREE.MathUtils.clamp(
                orbit.targetRadius + e.deltaY * 0.022,
                9,
                46
            );
            lastInteractionRef.current = performance.now() / 1000;
        }, []);

        // Pinch zoom for touch devices
        const pinchRef = useRef<{ dist: number } | null>(null);
        const handleTouchStart = useCallback((e: React.TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchRef.current = { dist: Math.hypot(dx, dy) };
            }
        }, []);
        const handleTouchMove = useCallback((e: React.TouchEvent) => {
            if (e.touches.length === 2 && pinchRef.current) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const orbit = orbitRef.current;
                orbit.targetRadius = THREE.MathUtils.clamp(
                    orbit.targetRadius - (dist - pinchRef.current.dist) * 0.05,
                    9,
                    46
                );
                pinchRef.current.dist = dist;
                lastInteractionRef.current = performance.now() / 1000;
            }
        }, []);
        const handleTouchEnd = useCallback(() => {
            pinchRef.current = null;
        }, []);

        return (
            <div
                ref={containerRef}
                className={`relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing ${className || ''}`}
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block', width: '100%', height: '100%' }}
                />

                {/* Warm cinematic vignette — no post-processing cost */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse at 50% 42%, rgba(255,236,200,0) 46%, rgba(61,42,26,0.16) 82%, rgba(45,30,18,0.3) 100%)',
                    }}
                />

                {/* Graceful first-paint shimmer while the garden grows */}
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#f6efe2]">
                        <div className="text-center">
                            <div
                                className="text-2xl"
                                style={{ fontFamily: "'Caveat', cursive", color: '#8a6a45' }}
                            >
                                growing your garden…
                            </div>
                            <div className="mt-3 mx-auto h-px w-28 bg-gradient-to-r from-transparent via-[#c9a24b] to-transparent animate-pulse" />
                        </div>
                    </div>
                )}
            </div>
        );
    }
);
