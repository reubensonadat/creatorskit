/**
 * Motion as Code — scene timeline & sub-frame motion blur
 * =======================================================
 * The blueprint's engine, adapted from Three.js scenes to Canvas 2D plates.
 *
 * A "plate" is a discrete animation segment with [start, end] bounds and a
 * `draw` that is a PURE FUNCTION OF TIME — it receives the absolute
 * timeline time and its own eased-local progress, and must render the
 * complete state for that instant. Nothing else may leak in: no clocks, no
 * RNG, no frame counters. That is what makes the same plate code run
 * identically in the live preview loop and in the deterministic
 * frame-stepped exporter.
 *
 * `accumulateMotionBlur` implements the blueprint's headless-render
 * accumulator: for each output frame it samples N sub-frames across the
 * frame's exposure window (Δt = 1 / (fps · samples)) and averages them
 * into the canvas, producing true temporal motion blur.
 */

import { clamp01 } from './easing';

// ── scene plates ────────────────────────────────────────────

/** Read-only per-frame context handed to every plate draw call. */
export interface MotionFrameInfo {
    width: number;
    height: number;
    /** Absolute timeline time in seconds. */
    time: number;
    /** 0..1 eased-window progress of THIS plate (clamped). */
    progress: number;
    /** The plate's local time since its start (can exceed its span). */
    localTime: number;
}

export interface MotionPlate {
    id: string;
    /** Inclusive start bound in seconds. */
    start: number;
    /** Exclusive end bound in seconds. */
    end: number;
    /**
     * Render the full state of this plate at `info.time`.
     * Called only while start ≤ time < end.
     */
    draw: (ctx: CanvasRenderingContext2D, info: MotionFrameInfo) => void;
}

/**
 * Ordered registry of plates. `renderAt` is the master coordinator: it
 * decides plate visibility from time alone — S(t) = f(t).
 */
export class MotionTimeline {
    private readonly plates: MotionPlate[] = [];

    add(plate: MotionPlate): this {
        this.plates.push(plate);
        this.plates.sort((a, b) => a.start - b.start);
        return this;
    }

    remove(id: string): this {
        const i = this.plates.findIndex((p) => p.id === id);
        if (i >= 0) this.plates.splice(i, 1);
        return this;
    }

    /** Plates whose window contains `t`. */
    platesAt(t: number): MotionPlate[] {
        return this.plates.filter((p) => t >= p.start && t < p.end);
    }

    /** Total timeline duration (end of the last plate). */
    get duration(): number {
        return this.plates.reduce((max, p) => Math.max(max, p.end), 0);
    }

    /**
     * Evaluates the whole scene graph at time `t` and draws every active
     * plate. Pure: calling it twice with the same `t` paints the same
     * pixels. (Callers own clearing the canvas — e.g. a background fill —
     * so plates may layer transparency deliberately.)
     */
    renderAt(ctx: CanvasRenderingContext2D, width: number, height: number, t: number): void {
        for (const plate of this.plates) {
            if (t < plate.start || t >= plate.end) continue;
            const span = Math.max(1e-6, plate.end - plate.start);
            ctx.save();
            try {
                plate.draw(ctx, {
                    width,
                    height,
                    time: t,
                    progress: clamp01((t - plate.start) / span),
                    localTime: t - plate.start,
                });
            } finally {
                ctx.restore();
            }
        }
    }
}

// ── sub-frame motion blur accumulator ───────────────────────

/**
 * Renders `samples` sub-frames spread across one output frame's exposure
 * window and averages them onto the canvas — the Canvas 2D equivalent of
 * the blueprint's offscreen accumulator buffer.
 *
 * Averaging uses the progressive-mean compositing trick: sub-frame k is
 * drawn with globalAlpha = 1/(k+1), which leaves an EXACT equal-weight
 * mean of all N sub-frames after the last draw:
 *
 *     B_k = ((k-1)/k)·B_(k-1) + (1/k)·S_k  =  mean(S_1..S_k)
 *
 * `drawAt` must not reset `globalAlpha` (state-changing helpers like
 * save/restore are fine — globalAlpha survives a save/restore pair).
 * Note: `clearRect` inside `drawAt` ignores alpha and would wipe the
 * accumulator, so background clearing should be an opaque fill (as the
 * caption renderer's green-screen fill already is).
 *
 * @param frameTime   timestamp of the output frame being encoded
 * @param exposureSec shutter length (1/fps for a 180°-equivalent look use 0.5/fps)
 * @param samples     sub-frames per output frame (1 = blur off)
 */
export function accumulateMotionBlur(
    ctx: CanvasRenderingContext2D,
    frameTime: number,
    exposureSec: number,
    samples: number,
    drawAt: (subFrameTime: number) => void
): void {
    const n = Math.max(1, Math.min(16, Math.round(samples)));
    if (n === 1 || exposureSec <= 0) {
        ctx.globalAlpha = 1;
        drawAt(frameTime);
        ctx.globalAlpha = 1;
        return;
    }

    for (let k = 0; k < n; k++) {
        // Sub-frame centers evenly spaced across the exposure window.
        const subT = frameTime - exposureSec / 2 + (exposureSec * (k + 0.5)) / n;
        ctx.globalAlpha = k === 0 ? 1 : 1 / (k + 1);
        drawAt(subT);
    }
    ctx.globalAlpha = 1;
}
