'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { generateQRMatrix, QRMatrixResult } from '@/lib/tree-qr/qr-matrix';
import {
    buildDiorama,
    updateDioramaSimulation,
    DioramaSceneObjects,
    SeasonType,
    FoliagePalette,
} from '@/lib/tree-qr/tree-generator';

export interface TreeDioramaRef {
    toggleViewMode: () => void;
    getViewMode: () => '2d' | '3d';
    captureSnapshot: (pureQR?: boolean) => Promise<string>;
    resetCamera: () => void;
}

interface TreeDioramaProps {
    urlText: string;
    season: SeasonType;
    palette?: FoliagePalette;
    onViewModeChange?: (mode: '2d' | '3d') => void;
    className?: string;
}

export const TreeDiorama = forwardRef<TreeDioramaRef, TreeDioramaProps>(function TreeDiorama(
    { urlText, season, palette, onViewModeChange, className },
    ref
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
    const [isTransitioning, setIsTransitioning] = useState(false);

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
        currentLookAt: THREE.Vector3;
        currentUp: THREE.Vector3;
        isDragging: boolean;
        prevPointer: { x: number; y: number };
        orbitAngles: { theta: number; phi: number; radius: number };
    }>({
        scene: null as any,
        camera: null as any,
        renderer: null as any,
        diorama: null,
        qrResult: null,
        animId: null,
        clock: new THREE.Clock(),
        targetPos: new THREE.Vector3(),
        targetLookAt: new THREE.Vector3(0, 2.5, 0),
        targetUp: new THREE.Vector3(0, 1, 0),
        targetZoom: 16,
        currentLookAt: new THREE.Vector3(0, 2.5, 0),
        currentUp: new THREE.Vector3(0, 1, 0),
        isDragging: false,
        prevPointer: { x: 0, y: 0 },
        orbitAngles: { theta: Math.PI / 4, phi: Math.PI / 5, radius: 48 },
    });

    // ─── CAMERA POSITION CALCULATIONS ──────────────────────────────────────
    const applyViewTargets = useCallback((mode: '2d' | '3d', animate = true) => {
        const t = threeRef.current;
        if (!t.camera) return;

        if (mode === '2d') {
            // Top-down orthographic view
            t.targetPos.set(0, 55, 0);
            t.targetLookAt.set(0, 0, 0);
            t.targetUp.set(0, 0, -1); // QR reads with top oriented north
            t.targetZoom = 18.5;
        } else {
            // 3D Isometric diorama view
            const rad = t.orbitAngles.radius;
            const x = rad * Math.sin(t.orbitAngles.phi) * Math.sin(t.orbitAngles.theta);
            const y = rad * Math.cos(t.orbitAngles.phi);
            const z = rad * Math.sin(t.orbitAngles.phi) * Math.cos(t.orbitAngles.theta);

            t.targetPos.set(x, y, z);
            t.targetLookAt.set(0, 3.2, 0);
            t.targetUp.set(0, 1, 0);
            t.targetZoom = 17;
        }

        if (!animate) {
            t.camera.position.copy(t.targetPos);
            t.currentLookAt.copy(t.targetLookAt);
            t.currentUp.copy(t.targetUp);
            t.camera.up.copy(t.targetUp);
            t.camera.lookAt(t.currentLookAt);
            t.camera.zoom = t.targetZoom;
            t.camera.updateProjectionMatrix();
        } else {
            setIsTransitioning(true);
        }
    }, []);

    // ─── VIEW MODE SWITCHER ────────────────────────────────────────────────
    const setMode = useCallback(
        (newMode: '2d' | '3d') => {
            setViewMode(newMode);
            applyViewTargets(newMode, true);
            onViewModeChange?.(newMode);
        },
        [applyViewTargets, onViewModeChange]
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
                t.orbitAngles = { theta: Math.PI / 4, phi: Math.PI / 5, radius: 48 };
                applyViewTargets(viewMode, true);
            },
            captureSnapshot: async (pureQR = false): Promise<string> => {
                const t = threeRef.current;
                if (!t.renderer || !t.scene || !t.camera) return '';

                const prevPos = t.camera.position.clone();
                const prevLookAt = t.currentLookAt.clone();
                const prevUp = t.camera.up.clone();
                const prevZoom = t.camera.zoom;

                if (pureQR) {
                    // Force clean 2D top-down render
                    t.camera.position.set(0, 55, 0);
                    t.camera.up.set(0, 0, -1);
                    t.camera.lookAt(0, 0, 0);
                    t.camera.zoom = 18.5;
                    t.camera.updateProjectionMatrix();
                }

                t.renderer.render(t.scene, t.camera);
                const dataUrl = t.renderer.domElement.toDataURL('image/png');

                // Restore camera
                t.camera.position.copy(prevPos);
                t.camera.up.copy(prevUp);
                t.camera.lookAt(prevLookAt);
                t.camera.zoom = prevZoom;
                t.camera.updateProjectionMatrix();

                return dataUrl;
            },
        }),
        [toggleMode, viewMode, applyViewTargets]
    );

    // ─── INITIALIZE THREE.JS SCENE ─────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const aspect = width / height;

        // 1. Scene setup with warm aesthetic background
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf6f5f0);

        // 2. Orthographic Camera
        const frustumSize = 34;
        const camera = new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            200
        );

        // 3. WebGL Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 4. Studio Lighting
        const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.4);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        sunLight.position.set(24, 40, 20);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 120;
        const d = 26;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0003;
        scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.6);
        fillLight.position.set(-20, 25, -20);
        scene.add(fillLight);

        const groundBounce = new THREE.HemisphereLight(0xffedd5, 0x5a4131, 0.5);
        scene.add(groundBounce);

        // Store instances
        threeRef.current.scene = scene;
        threeRef.current.camera = camera;
        threeRef.current.renderer = renderer;

        // Initial camera targets
        applyViewTargets(viewMode, false);

        // 5. Animation Loop
        let animFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const elapsed = clock.getElapsedTime();

            const t = threeRef.current;
            if (!t.camera || !t.renderer || !t.scene) return;

            // Camera smooth interpolation
            const lerpSpeed = 0.08;
            t.camera.position.lerp(t.targetPos, lerpSpeed);
            t.currentLookAt.lerp(t.targetLookAt, lerpSpeed);
            t.currentUp.lerp(t.targetUp, lerpSpeed);

            t.camera.up.copy(t.currentUp);
            t.camera.lookAt(t.currentLookAt);

            if (Math.abs(t.camera.zoom - t.targetZoom) > 0.01) {
                t.camera.zoom += (t.targetZoom - t.camera.zoom) * lerpSpeed;
                t.camera.updateProjectionMatrix();
            }

            // Update particle physics and tree canopy wind simulation
            if (t.diorama) {
                updateDioramaSimulation(t.diorama, elapsed, delta);
            }

            t.renderer.render(t.scene, t.camera);
        };

        animate();
        threeRef.current.animId = animFrameId;

        // 6. Resize Observer
        const handleResize = () => {
            if (!container || !camera || !renderer) return;
            const newW = container.clientWidth;
            const newH = container.clientHeight;
            if (newW === 0 || newH === 0) return;

            const newAspect = newW / newH;
            camera.left = (-frustumSize * newAspect) / 2;
            camera.right = (frustumSize * newAspect) / 2;
            camera.top = frustumSize / 2;
            camera.bottom = -frustumSize / 2;
            camera.updateProjectionMatrix();

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
            // Dispose geometries & materials
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
        const newDiorama = buildDiorama(qrResult, season, palette);
        t.diorama = newDiorama;
        t.scene.add(newDiorama.rootGroup);
    }, [urlText, season, palette]);

    // ─── POINTER & ORBIT DRAG CONTROLS ─────────────────────────────────────
    const handlePointerDown = (e: React.PointerEvent) => {
        if (viewMode === '2d') {
            // Tap to expand into 3D view
            setMode('3d');
            return;
        }

        const t = threeRef.current;
        t.isDragging = true;
        t.prevPointer = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const t = threeRef.current;
        if (!t.isDragging || viewMode === '2d') return;

        const dx = e.clientX - t.prevPointer.x;
        const dy = e.clientY - t.prevPointer.y;
        t.prevPointer = { x: e.clientX, y: e.clientY };

        // Rotate isometric orbit angles
        t.orbitAngles.theta -= dx * 0.008;
        t.orbitAngles.phi = Math.max(0.2, Math.min(Math.PI / 2.2, t.orbitAngles.phi - dy * 0.008));

        // Update target camera position
        const rad = t.orbitAngles.radius;
        const x = rad * Math.sin(t.orbitAngles.phi) * Math.sin(t.orbitAngles.theta);
        const y = rad * Math.cos(t.orbitAngles.phi);
        const z = rad * Math.sin(t.orbitAngles.phi) * Math.cos(t.orbitAngles.theta);
        t.targetPos.set(x, y, z);
    };

    const handlePointerUp = () => {
        threeRef.current.isDragging = false;
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (viewMode === '2d') return;
        const t = threeRef.current;
        const zoomDelta = e.deltaY * -0.01;
        t.targetZoom = Math.max(8, Math.min(32, t.targetZoom + zoomDelta));
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full select-none cursor-grab active:cursor-grabbing overflow-hidden ${
                className || ''
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            style={{ touchAction: 'none' }}
        >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Click to Toggle Overlay Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div
                    style={{
                        background: '#000',
                        color: '#FFE500',
                        border: '1.5px solid #000',
                        borderRadius: 24,
                        padding: '6px 16px',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        letterSpacing: '0.04em',
                        boxShadow: '2px 2px 0 rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <span className="inline-block w-2 h-2 rounded-full bg-[#FFE500] animate-pulse" />
                    <span>
                        {viewMode === '2d' ? 'TAP TO SEE 3D TREE' : 'TAP THE TREE TO SEE QR CODE'}
                    </span>
                </div>
            </div>
        </div>
    );
});
