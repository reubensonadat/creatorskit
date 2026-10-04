// Paper Transition — shared cinematic IN/OUT compositing for the paper tools
// (Text Highlighter + Text Match Cut).
//
// One damped-spring system drives EVERY channel — position, rotation, scale,
// blur and shadow — like a single After Effects expression, so no channel
// ever floats on its own timeline. The caller drives `progress` (0..1 across
// the transition window) as a pure function of time, which keeps the live
// preview and the frame-stepped exporter pixel-identical (Motion-as-Code).
//
// mode 'in'  : the paper slams INTO view and settles dead center (explosive
//              launch → travel → overshoot → damped settle).
// mode 'out' : the paper whips OUT of view with an anticipation windup — a
//              tiny pull-back in the OPPOSITE direction before the launch —
//              then accelerates away, streaking until it's fully gone.

export type PaperTransitionDirection = 'top' | 'bottom' | 'left' | 'right';

export interface PaperTransitionOptions {
    mode: 'in' | 'out';
    direction: PaperTransitionDirection;
    /** 0..1 across the transition window (caller-driven, deterministic). */
    progress: number;
    /** 0..1 directional smear intensity. */
    blur: number;
    /** Settle (in) / launch (out) rotation in degrees. Defaults: in +4, out −3. */
    tiltDeg?: number;
    /** 'in': starting scale (default 1.07). 'out': ending scale (default 1.08). */
    scaleEdge?: number;
    /** Backdrop fill — the EXACT paper color, so the sheet slides over more of itself. */
    bg: string;
    /** Travel distance multiplier — how far the paper moves across the axis
     *  (1.3 × axis length by default). Tune to scroll "more of the page". */
    travelScale?: number;
    /** 'in': how far past center the paper may overshoot before settling
     *  (0.2 = 20% bounce by default; ~0 = pure glide, no settle wobble). */
    overshoot?: number;
}

let transitionBuffer: HTMLCanvasElement | null = null;
function getTransitionBuffer(width: number, height: number): HTMLCanvasElement {
    if (!transitionBuffer) transitionBuffer = document.createElement('canvas');
    if (transitionBuffer.width !== width || transitionBuffer.height !== height) {
        transitionBuffer.width = width;
        transitionBuffer.height = height;
    }
    return transitionBuffer;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Displacement curve for the ENTRANCE — remaining-displacement spring:
 * starts at 1 (fully off-screen), decays with a damped cosine so the paper
 * overshoots past center slightly (dip below 0) and settles at 0.
 */
function entranceDisp(x: number): number {
    return Math.exp(-4.2 * x) * Math.cos(8.5 * x);
}

/**
 * Displacement curve for the EXIT — anticipation windup (dip below 0 as the
 * paper pulls slightly OPPOSITE its exit direction), then quadratic
 * acceleration to 1 (fully gone). Reads as a whip, not a slide.
 */
function exitDisp(t: number): number {
    const windup = -0.09 * Math.sin(Math.PI * clamp01(t / 0.32)) * (1 - t * t);
    return Math.max(-0.15, Math.min(1.05, t * t + windup));
}

/**
 * Composites the paper with the transition. `drawPaper` renders the settled
 * document into whatever context it is given (the caller decides frame state).
 * When mode is 'out' and progress >= 1, only the backdrop is drawn — the
 * paper is fully gone.
 */
export function renderPaperTransition(
    targetCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    drawPaper: (ctx: CanvasRenderingContext2D) => void,
    opts: PaperTransitionOptions
): void {
    if (typeof document === 'undefined') {
        drawPaper(targetCtx);
        return;
    }

    const tctx = targetCtx;
    const p = clamp01(opts.progress);

    // 1. Backdrop: the EXACT paper color — the article slides over more of
    //    itself, so the flight reads as one continuous sheet, never a dark
    //    pit behind a floating rectangle.
    tctx.save();
    tctx.fillStyle = opts.bg;
    tctx.fillRect(0, 0, width, height);
    tctx.restore();

    if (opts.mode === 'out' && p >= 1) return; // fully gone — blank paper color

    // 2. Render the document offscreen.
    const buf = getTransitionBuffer(width, height);
    const bctx = buf.getContext('2d');
    if (!bctx) {
        drawPaper(tctx);
        return;
    }
    drawPaper(bctx);

    // 3. ONE shared curve drives position/tilt/scale/blur/shadow.
    let d: number;
    let speed: number;
    let approach: number; // 0..1 — how close the paper is to the stack
    let scale: number;
    const dt = 0.016;

    if (opts.mode === 'in') {
        const FLIGHT_SHARE = 0.8; // flight 80% of the window; rest is settle hold
        const t2 = Math.min(1, p / FLIGHT_SHARE);
        const overshoot = opts.overshoot ?? 0.2;
        d = Math.max(-overshoot, Math.min(1, entranceDisp(t2))); // dips < 0 → overshoot
        const dNext = Math.max(-overshoot, Math.min(1, entranceDisp(t2 + dt)));
        const vel = Math.abs(d - dNext) / dt;
        speed = Math.min(1, vel / 5);
        approach = 1 - Math.min(1, Math.abs(d));
        scale = 1 + ((opts.scaleEdge ?? 1.07) - 1) * Math.max(0, d);
    } else {
        d = exitDisp(p);
        const dNext = exitDisp(Math.min(1, p + dt));
        const vel = Math.abs(d - dNext) / dt;
        speed = Math.min(1, vel / 2.2); // exits are short — keep the smear hot
        approach = 1 - p; // shadow fades as the sheet lifts away
        scale = 1 + ((opts.scaleEdge ?? 1.08) - 1) * p;
    }

    const dir = opts.direction;
    const axisLen = dir === 'top' || dir === 'bottom' ? height : width;
    const travel = axisLen * (opts.travelScale ?? 1.3);
    let dx = 0;
    let dy = 0;
    if (dir === 'top') dy = -travel * d;
    else if (dir === 'bottom') dy = travel * d;
    else if (dir === 'left') dx = -travel * d;
    else if (dir === 'right') dx = travel * d;
    const tiltSign = dir === 'left' || dir === 'top' ? -1 : 1;
    const tilt = ((opts.tiltDeg ?? (opts.mode === 'in' ? 4 : -3)) * Math.PI / 180) * d * tiltSign;
    const blur = clamp01(opts.blur);

    // 4. Stack shadow — deepens as the paper approaches, fades as it leaves.
    const shadow = tctx.createRadialGradient(
        width / 2, height / 2 + height * 0.015, Math.min(width, height) * 0.08,
        width / 2, height / 2 + height * 0.015, Math.max(width, height) * 0.5
    );
    shadow.addColorStop(0, `rgba(0,0,0,${(0.05 + 0.14 * Math.max(0, approach)).toFixed(3)})`);
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.save();
    tctx.fillStyle = shadow;
    tctx.fillRect(0, 0, width, height);
    tctx.restore();

    // 5. TRUE directional motion blur — a continuous streak, not discrete
    //    ghosts: 16 samples laid along the motion path BEHIND the paper,
    //    Gaussian-weighted (solid leading edge, smearing tail), spacing ∝
    //    velocity², each trail copy softened with a small canvas blur so
    //    ghost boundaries dissolve into one smear. The streak collapses to
    //    exactly zero on touchdown / at full exit, so the paper snaps crisp.
    const ux = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const uy = dir === 'top' ? -1 : dir === 'bottom' ? 1 : 0;
    const smear = axisLen * 0.35 * blur * speed * speed;
    const samples = blur > 0.02 ? 16 : 1;
    const weights: number[] = [];
    let wSum = 0;
    for (let k = 0; k < samples; k++) {
        const f = samples > 1 ? k / (samples - 1) : 0;
        const w = Math.exp(-Math.pow(f / 0.3, 2)); // gaussian falloff along the trail
        weights.push(w);
        wSum += w;
    }
    for (let k = samples - 1; k >= 0; k--) {
        const f = samples > 1 ? k / (samples - 1) : 0;
        const off = smear * f;
        const alpha = Math.min(1, (weights[k] / wSum) * 2.1); // gain keeps the head solid
        if (k > 0 && alpha < 0.02) continue; // near-invisible tail — skip the drawImage entirely
        tctx.save();
        tctx.globalAlpha = alpha;
        try {
            // Head samples stay opaque and crisp; only the softening trail pays
            // for a canvas filter. Sub-perceptual blurs (f ≤ 0.15) are skipped.
            if (k > 0 && f > 0.15) tctx.filter = `blur(${(1 + f * 4).toFixed(1)}px)`; // dissolve ghost edges
        } catch { /* filters unsupported — crisp trail still works */ }
        tctx.translate(width / 2 + dx - ux * off, height / 2 + dy - uy * off);
        tctx.rotate(tilt);
        tctx.scale(scale, scale);
        tctx.translate(-width / 2, -height / 2);
        tctx.drawImage(buf, 0, 0);
        tctx.restore();
    }
    try { tctx.filter = 'none'; } catch { /* ignore */ }
}
