'use client';

/**
 * VoxelDiorama — React wrapper for the voxel QR scene engine
 * =========================================================
 * Drop-in replacement for TreeDiorama: same props/ref contract, but the
 * seamless QR⇄3D morph comes from the camera orbit itself (one voxel
 * scene, reference-demo architecture) instead of a 2D overlay swap.
 *
 * Interactions: tap/click morphs QR⇄3D, drag orbits (3D only), scroll
 * zooms. URL changes ripple-rebuild from the center outward; preset and
 * palette changes regrow/recolor with the same choreography.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { FoliagePalette, SceneType, SeasonType } from '@/lib/tree-qr/tree-generator';
import { VoxelQRScene, type RebuildKind, type ViewMode } from '@/lib/tree-qr/voxel-scene';

export interface VoxelDioramaRef {
    toggleViewMode: () => void;
    getViewMode: () => ViewMode;
    captureSnapshot: (pureQR?: boolean) => Promise<string>;
    resetCamera: () => void;
    /** Quarter-turn view rotation (direction: 1 = right, -1 = left). */
    rotateView90: (direction: 1 | -1) => void;
}

interface VoxelDioramaProps {
    urlText: string;
    sceneType: SceneType;
    palette: FoliagePalette;
    /** Accepted for API parity with TreeDiorama — palettes drive the world. */
    season?: SeasonType;
    /** Pixels of docked UI covering the canvas's right edge — the diorama recenters. */
    sidebarInset?: number;
    onViewModeChange?: (mode: ViewMode) => void;
    className?: string;
}

const VoxelDiorama = forwardRef<VoxelDioramaRef, VoxelDioramaProps>(function VoxelDiorama(
    { urlText, sceneType, palette, sidebarInset = 0, onViewModeChange, className },
    ref
) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<VoxelQRScene | null>(null);
    const prevConfigRef = useRef<{ url: string; scene: SceneType; pal: string } | null>(null);
    const [failed, setFailed] = useState(false);

    // ─── Engine lifecycle: renderer, rAF loop, input, resize ────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let scene: VoxelQRScene;
        try {
            scene = new VoxelQRScene(canvas, { reducedMotion, onModeChange: onViewModeChange });
        } catch (err) {
            console.error('VoxelDiorama: WebGL unavailable', err);
            setFailed(true);
            return;
        }
        sceneRef.current = scene;

        const rect = wrap.getBoundingClientRect();
        scene.resize(rect.width, rect.height);

        let raf = 0;
        let last = performance.now();
        const tick = (now: number) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            scene.update(dt);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        const ro = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect;
            if (box) scene.resize(box.width, box.height);
        });
        ro.observe(wrap);

        // Drag to orbit in 3D (yaw + pitch), wheel to zoom, click/tap to toggle QR view
        let dragging = false;
        let moved = 0;
        let lastX = 0;
        let lastY = 0;

        const onPointerDown = (e: PointerEvent) => {
            dragging = true;
            moved = 0;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
            canvas.setPointerCapture(e.pointerId);
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            moved += Math.hypot(dx, dy);
            scene.addOrbitDelta(dx, dy);
        };
        const onPointerUp = (e: PointerEvent) => {
            if (!dragging) return;
            dragging = false;
            canvas.style.cursor = 'grab';
            if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
            if (moved < 6) scene.toggle();
        };
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            scene.addZoomDelta(-e.deltaY * 0.0012);
        };

        canvas.style.cursor = 'grab';
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            canvas.removeEventListener('wheel', onWheel);
            scene.dispose();
            sceneRef.current = null;
        };
        // The mode-change callback is refreshed by the effect below instead
        // of tearing down the whole engine.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the mode-change callback fresh without rebuilding the engine.
    useEffect(() => {
        const scene = sceneRef.current;
        if (scene) scene.opts.onModeChange = onViewModeChange;
    }, [onViewModeChange]);

    // Recentre the world inside the visible viewport as the dock opens/closes.
    useEffect(() => {
        sceneRef.current?.setSidebarInset(sidebarInset);
    }, [sidebarInset]);

    // ─── Rebuild choreography: url ripple / preset regrow / palette recolor ─
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;
        const prev = prevConfigRef.current;
        prevConfigRef.current = { url: urlText, scene: sceneType, pal: palette.id };

        let kind: RebuildKind = 'url';
        if (prev) {
            if (prev.url !== urlText) kind = 'url';
            else if (prev.scene !== sceneType) kind = 'preset';
            else if (prev.pal !== palette.id) kind = 'recolor';
        }
        scene.build(urlText, sceneType, palette, kind);
    }, [urlText, sceneType, palette]);

    useImperativeHandle(
        ref,
        () => ({
            toggleViewMode: () => sceneRef.current?.toggle(),
            getViewMode: () => sceneRef.current?.getView() ?? '3d',
            captureSnapshot: async (pureQR = false) => {
                const scene = sceneRef.current;
                if (!scene) throw new Error('VoxelDiorama not ready');
                return scene.capture(pureQR);
            },
            resetCamera: () => sceneRef.current?.resetCamera(),
            rotateView90: (direction: 1 | -1) => sceneRef.current?.rotateView90(direction),
        }),
        []
    );

    if (failed) {
        return (
            <div
                className={className}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'monospace',
                    color: '#999',
                }}
            >
                WebGL unavailable — QR diorama cannot start.
            </div>
        );
    }

    return (
        <div
            ref={wrapRef}
            className={className}
            style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    touchAction: 'none',
                    cursor: 'pointer',
                }}
            />
        </div>
    );
});

export default VoxelDiorama;
