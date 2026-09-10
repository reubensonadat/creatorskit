'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { generateQRMatrix, QRMatrixResult } from '@/lib/tree-qr/qr-matrix';
import {
    buildDiorama,
    updateDioramaSimulation,
    applyDioramaMorph,
    DioramaSceneObjects,
    SeasonType,
    SceneType,
    FoliagePalette,
} from '@/lib/tree-qr/tree-generator';
import {
    renderBotanicalQRCanvas,
    generateBotanicalQRDataUrl,
} from '@/lib/tree-qr/botanical-qr-renderer';

export interface TreeDioramaRef {
    toggleViewMode: () => void;
    getViewMode: () => '2d' | '3d';
    captureSnapshot: (pureQR?: boolean) => Promise<string>;
    resetCamera: () => void;
}

interface TreeDioramaProps {
    urlText: string;
    /** Kept for backward compatibility — the palette now drives the world. */
    season?: SeasonType;
    sceneType?: SceneType;
    palette?: FoliagePalette;
    onViewModeChange?: (mode: '2d' | '3d') => void;
    className?: string;
}

export const TreeDiorama = forwardRef<TreeDioramaRef, TreeDioramaProps>(function TreeDiorama(
    { urlText, season = 'spring', sceneType = 'tree', palette, onViewModeChange, className },
    ref
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
    const [isQrOverlayVisible, setIsQrOverlayVisible] = useState(false);
    const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Three.js instances ref
    const threeRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.OrthographicCamera;
        renderer: THREE.WebGLRenderer;
        diorama: DioramaSceneObjects | null;
        qrResult: QRMatrixResult | null;
        animId: number | null;
        clock: THREE.Clock;
        targetPos: THREE.Vector3;
        targetLookAt: THREE.Vector3;
        targetUp: THREE.Vector3;
        targetZoom: number;
        targetTreeScale: number;
        currentTreeScale: number;
        currentLookAt: THREE.Vector3;
        currentUp: THREE.Vector3;
        isDragging: boolean;
        prevPointer: { x: number; y: number };
        pointerStart: { x: number; y: number };
        orbitAngles: { theta: number; phi: number; radius: number };
        frustumSize: number;
    }>({
        scene: null as any,
        camera: null as any,
        renderer: null as any,
        diorama: null,
        qrResult: null,
        animId: null,
        clock: new THREE.Clock(),
        targetTreeScale: 1.0,
        currentTreeScale: 1.0,
        targetPos: new THREE.Vector3(),
        targetLookAt: new THREE.Vector3(0, 4.2, 0),
        targetUp: new THREE.Vector3(0, 1, 0),
        targetZoom: 0.95,
        currentLookAt: new THREE.Vector3(0, 4.2, 0),
        currentUp: new THREE.Vector3(0, 1, 0),
        isDragging: false,
        prevPointer: { x: 0, y: 0 },
        pointerStart: { x: 0, y: 0 },
        orbitAngles: { theta: Math.PI / 4, phi: Math.PI / 5, radius: 52 },
        frustumSize: 48,
    });

    // ─── CAMERA POSITION CALCULATIONS ──────────────────────────────────────
    const applyViewTargets = useCallback((animate = true) => {
        const t = threeRef.current;
        if (!t.camera) return;

        const rad = t.orbitAngles.radius;
        const x = rad * Math.sin(t.orbitAngles.phi) * Math.sin(t.orbitAngles.theta);
        const y = rad * Math.cos(t.orbitAngles.phi);
        const z = rad * Math.sin(t.orbitAngles.phi) * Math.cos(t.orbitAngles.theta);

        t.targetPos.set(x, y, z);
        t.targetLookAt.set(0, 4.2, 0);
        t.targetUp.set(0, 1, 0);
        t.targetZoom = 0.95;
        t.targetTreeScale = 1.0;

        if (!animate) {
            t.camera.position.copy(t.targetPos);
            t.currentLookAt.copy(t.targetLookAt);
            t.currentUp.copy(t.targetUp);
            t.camera.up.copy(t.targetUp);
            t.camera.lookAt(t.currentLookAt);
            t.camera.zoom = t.targetZoom;
            t.camera.updateProjectionMatrix();
        }
    }, []);

    // ─── SEQUENTIAL 2D ⇄ 3D MAGIC MORPH ────────────────────────────────────
    // Toggling to 2D drives THREE synchronized phases: (1) the camera glides
    // overhead while applyDioramaMorph flattens the living courtyard toward
    // its flat high-contrast QR coloring (morph = 0), then (2) the crisp 2D
    // botanical QR cross-dissolves on top — no visual jump between worlds.
    const setMode = useCallback(
        (newMode: '2d' | '3d') => {
            if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
            const t = threeRef.current;
            setViewMode(newMode);
            onViewModeChange?.(newMode);

            if (newMode === '2d') {
                // Phase 1a: diorama flattens toward its scannable QR look
                t.targetTreeScale = 0;
                // Phase 1b: camera swoops to direct top-down (0, 56, 0) over (0, 0, 0)
                // with UP (0, 0, -1) so finder patterns strictly align with 2D corners
                t.targetPos.set(0, 56, 0);
                t.targetLookAt.set(0, 0, 0);
                t.targetUp.set(0, 0, -1);
                t.targetZoom = 1.02;

                // Phase 2: when the camera finishes turning overhead (~480ms),
                // the ultra-crisp 2D QR cross-dissolves in over 350ms
                transitionTimerRef.current = setTimeout(() => {
                    setIsQrOverlayVisible(true);
                }, 480);
            } else {
                // Phase 1: the 2D QR fades out over 200ms, revealing the
                // flattened top-down 3D scene already wearing its QR colors
                setIsQrOverlayVisible(false);

                // Phase 2: the world blooms back to life as the camera swoops
                // down into the living 3D isometric diorama
                transitionTimerRef.current = setTimeout(() => {
                    t.targetTreeScale = 1;
                    const rad = t.orbitAngles.radius;
                    const x = rad * Math.sin(t.orbitAngles.phi) * Math.sin(t.orbitAngles.theta);
                    const y = rad * Math.cos(t.orbitAngles.phi);
                    const z = rad * Math.sin(t.orbitAngles.phi) * Math.cos(t.orbitAngles.theta);

                    t.targetPos.set(x, y, z);
                    t.targetLookAt.set(0, 4.2, 0);
                    t.targetUp.set(0, 1, 0);
                    t.targetZoom = 0.95;
                }, 200);
            }
        },
        [onViewModeChange]
    );

    const toggleMode = useCallback(() => {
        setMode(viewMode === '2d' ? '3d' : '2d');
    }, [viewMode, setMode]);

    // Expose methods to parent via ref
    useImperativeHandle(
        ref,
        () => ({
            toggleViewMode: toggleMode,
            getViewMode: () => viewMode,
            resetCamera: () => {
                const t = threeRef.current;
                t.orbitAngles = { theta: Math.PI / 4, phi: Math.PI / 5, radius: 52 };
                applyViewTargets(true);
            },
            captureSnapshot: async (pureQR = false): Promise<string> => {
                const t = threeRef.current;
                if (pureQR) {
                    const curQr = t.qrResult || generateQRMatrix(urlText);
                    return generateBotanicalQRDataUrl(curQr, palette, 1024, season);
                }
                if (!t.renderer || !t.scene || !t.camera) return '';
                t.renderer.render(t.scene, t.camera);
                return t.renderer.domElement.toDataURL('image/png');
            },
        }),
        [toggleMode, viewMode, applyViewTargets, urlText, palette, season]
    );

    // ─── RENDER 2D BOTANICAL QR CODE TO OVERLAY CANVAS ──────────────────
    useEffect(() => {
        if (viewMode === '2d' && qrCanvasRef.current) {
            const curQr = threeRef.current.qrResult || generateQRMatrix(urlText);
            const container = containerRef.current;
            const containerW = container?.clientWidth || 600;
            const containerH = container?.clientHeight || 600;
            const maxDimension = Math.min(containerW, containerH);
            const canvasPx = Math.max(280, Math.floor(maxDimension * 0.82));

            renderBotanicalQRCanvas(qrCanvasRef.current, curQr, palette, {
                canvasSize: canvasPx,
                dpr: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 2,
                marginModules: 4,
                showPaverTexture: true,
            }, season);
        }
    }, [viewMode, urlText, palette, season]);

    // ─── INITIALIZE THREE.JS SCENE ─────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        // ── HIGH-RES: Get actual CSS layout dimensions ──
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const cssWidth = container.clientWidth || 800;
        const cssHeight = container.clientHeight || 600;
        const aspect = cssWidth / cssHeight;
        const frustumSize = 46;
        threeRef.current.frustumSize = frustumSize;

        // 1. Scene — atmospheric background with depth fog
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8f5ee);
        scene.fog = new THREE.FogExp2(0xf8f5ee, 0.007);

        // 2. Orthographic Camera with extended far plane
        const camera = new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            250
        );

        // 3. WebGL Renderer — MAXIMUM QUALITY
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: false,
            powerPreference: 'high-performance',
        });

        // CRITICAL: Set pixel ratio FIRST, then size — this is what gives us sharp rendering
        renderer.setPixelRatio(dpr);
        renderer.setSize(cssWidth, cssHeight);

        // CINEMATIC rendering pipeline
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // 4. CINEMATIC 5-POINT STUDIO LIGHTING
        // Key light: warm directional sun with ultra-high-res shadows
        const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.4);
        sunLight.position.set(24, 42, 20);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 140;
        sunLight.shadow.radius = 2.5;
        const d = 30;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0002;
        sunLight.shadow.normalBias = 0.02;
        scene.add(sunLight);

        // Fill light: cool blue sky bounce
        const fillLight = new THREE.DirectionalLight(0xc8ddf5, 0.8);
        fillLight.position.set(-22, 28, -22);
        scene.add(fillLight);

        // Rim/back light: warm edge definition
        const rimLight = new THREE.DirectionalLight(0xffe8c4, 0.5);
        rimLight.position.set(-10, 15, 30);
        scene.add(rimLight);

        // Ambient: rich warm fill (lower than before — tone mapping compensates)
        const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.0);
        scene.add(ambientLight);

        // Hemisphere: natural ground bounce
        const groundBounce = new THREE.HemisphereLight(0xfef3c7, 0x5a4131, 0.65);
        scene.add(groundBounce);

        // Store instances
        threeRef.current.scene = scene;
        threeRef.current.camera = camera;
        threeRef.current.renderer = renderer;

        // Initial camera targets
        applyViewTargets(false);

        // 5. Animation Loop
        let animFrameId = 0;
        const clock = new THREE.Clock();

        const animate = () => {
            animFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const elapsed = clock.getElapsedTime();

            const t = threeRef.current;
            if (!t.camera || !t.renderer || !t.scene) return;

            // Smooth camera interpolation
            const lerpSpeed = 0.08;
            t.camera.position.lerp(t.targetPos, lerpSpeed);
            t.currentLookAt.lerp(t.targetLookAt, lerpSpeed);
            t.currentUp.lerp(t.targetUp, lerpSpeed);

            t.camera.up.copy(t.currentUp);
            t.camera.lookAt(t.currentLookAt);

            if (Math.abs(t.camera.zoom - t.targetZoom) > 0.001) {
                t.camera.zoom += (t.targetZoom - t.camera.zoom) * lerpSpeed;
                t.camera.updateProjectionMatrix();
            }

            // Seamless 2D ⇄ 3D diorama morphing
            if (t.diorama) {
                if (Math.abs(t.currentTreeScale - t.targetTreeScale) > 0.0005) {
                    t.currentTreeScale += (t.targetTreeScale - t.currentTreeScale) * 0.09;
                    applyDioramaMorph(t.diorama, t.currentTreeScale);
                }
            }

            // Update particle physics and tree canopy wind simulation
            if (t.diorama) {
                updateDioramaSimulation(t.diorama, elapsed, delta);
            }

            t.renderer.render(t.scene, t.camera);
        };

        animate();
        threeRef.current.animId = animFrameId;

        // 6. HIGH-RES Resize Observer — reapplies DPR on every resize
        const handleResize = () => {
            if (!container || !camera || !renderer) return;
            const newW = container.clientWidth;
            const newH = container.clientHeight;
            if (newW === 0 || newH === 0) return;

            const newAspect = newW / newH;
            const fs = threeRef.current.frustumSize;
            camera.left = (-fs * newAspect) / 2;
            camera.right = (fs * newAspect) / 2;
            camera.top = fs / 2;
            camera.bottom = -fs / 2;
            camera.updateProjectionMatrix();

            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
            renderer.setSize(newW, newH);
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        return () => {
            cancelAnimationFrame(animFrameId);
            resizeObserver.disconnect();
            renderer.dispose();
        };
    }, []);

    // ─── REBUILD DIORAMA ON URL, SEASON, OR PALETTE CHANGE ────────────────
    useEffect(() => {
        const t = threeRef.current;
        if (!t.scene) return;

        // Generate QR Code Matrix
        const qrResult = generateQRMatrix(urlText);
        t.qrResult = qrResult;

        // Clean up previous diorama
        if (t.diorama) {
            t.scene.remove(t.diorama.rootGroup);
            t.diorama.rootGroup.traverse((obj) => {
                if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
                    obj.geometry.dispose();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m) => m.dispose());
                    } else if (obj.material) {
                        obj.material.dispose();
                    }
                }
            });
            t.diorama = null;
        }

        // Build new procedural diorama
        const newDiorama = buildDiorama(qrResult, season, palette, sceneType);
        t.diorama = newDiorama;
        applyDioramaMorph(newDiorama, t.currentTreeScale);
        t.scene.add(newDiorama.rootGroup);
    }, [urlText, season, palette, sceneType]);

    // ─── POINTER & ORBIT DRAG CONTROLS ─────────────────────────────────────
    const handlePointerDown = (e: React.PointerEvent) => {
        if (viewMode === '2d') {
            setMode('3d');
            return;
        }

        const t = threeRef.current;
        t.isDragging = true;
        t.prevPointer = { x: e.clientX, y: e.clientY };
        t.pointerStart = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const t = threeRef.current;
        if (!t.isDragging || viewMode === '2d') return;

        const dx = e.clientX - t.prevPointer.x;
        const dy = e.clientY - t.prevPointer.y;
        t.prevPointer = { x: e.clientX, y: e.clientY };

        t.orbitAngles.theta -= dx * 0.008;
        t.orbitAngles.phi = Math.max(0.2, Math.min(Math.PI / 2.2, t.orbitAngles.phi - dy * 0.008));

        const rad = t.orbitAngles.radius;
        const x = rad * Math.sin(t.orbitAngles.phi) * Math.sin(t.orbitAngles.theta);
        const y = rad * Math.cos(t.orbitAngles.phi);
        const z = rad * Math.sin(t.orbitAngles.phi) * Math.cos(t.orbitAngles.theta);
        t.targetPos.set(x, y, z);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const t = threeRef.current;
        t.isDragging = false;
        // Direct tap on the 3D tree / diorama toggles to 2D QR code (matching tree.icqr.com)
        const dx = e.clientX - t.pointerStart.x;
        const dy = e.clientY - t.pointerStart.y;
        if (Math.hypot(dx, dy) < 6 && viewMode === '3d') {
            setMode('2d');
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (viewMode === '2d') return;
        const t = threeRef.current;
        const zoomDelta = e.deltaY * -0.001;
        t.targetZoom = Math.max(0.4, Math.min(2.5, t.targetZoom + zoomDelta));
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full select-none overflow-hidden ${
                viewMode === '3d' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            } ${className || ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => { threeRef.current.isDragging = false; }}
            onWheel={handleWheel}
            style={{ touchAction: 'none' }}
        >
            {/* 3D Living Diorama WebGL Canvas */}
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: '100%' }}
            />

            {/* 2D Botanical QR Code Overlay — Smooth cross-dissolve once camera settles top-down */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-350 ease-out ${
                    isQrOverlayVisible
                        ? 'opacity-100 pointer-events-auto scale-100'
                        : 'opacity-0 pointer-events-none scale-98'
                }`}
                style={{ background: '#f8f5ee' }}
                onClick={() => setMode('3d')}
                title="Tap to see the tree"
            >
                <canvas
                    ref={qrCanvasRef}
                    className="cursor-pointer max-h-[88%] max-w-[88%] object-contain"
                />
            </div>
        </div>
    );
});
