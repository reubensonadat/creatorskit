// skeleton.ts — §10 application: solved placements rewrite the
// composed cover while the preset's authored relationships ride
// along (§10.5 relaxation — the nothing-collides contract).

import { clamp, rectIntersect } from './units';
import { resolveSignature } from './signatures';
import type { Rect } from './units';
import type { SolverResult, SolvedPlacement } from './types';
import type { DecorationShape } from './decorations';
import type { SystemTextSpec, SystemShapeSpec, ComposedCover } from './cover-system';
// §10 · APPLICATION — the Gen II contract, unchanged: solved placements
//       rewrite the composed cover's specs; the app's layout-law engine
//       verifies physically afterwards. Field writes go through a typed
//       bridge so this file compiles against any composer generation.
// ===========================================================================

const roleOfSpec = (spec: { id: string }): string | null => {
    const id = spec.id;
    if (id.includes('masthead')) return 'masthead';
    if (id.includes('dateline') || id.includes('rail')) return 'dateline';
    if (id.includes('feature')) return 'feature';
    if (id.includes('sub')) return 'sub';
    if (id.includes('teaser')) return 'teasers';
    if (id.includes('badge')) return 'badge';
    return null;
};

/** Writable bridge — the solver's word is law on these fields. */
type WritableText = Pick<SystemTextSpec, 'xPct' | 'yPct' | 'widthPct' | 'heightPct' | 'rotationDeg' | 'depth'> & {
    opacity?: number;
};
const asWritable = (s: SystemTextSpec): WritableText => s as unknown as WritableText;

/** Flat-rect approximation of a decoration for the composed cover's shape
 *  list. The app's renderer re-expands every `sys-decoration-` id with
 *  full fidelity (giant type becomes a real text layer, crosshairs become
 *  twin registration bars), so this only guarantees the shapes exist. */
const decorationToShapeSpec = (d: DecorationShape): SystemShapeSpec =>
    ({
        id: `sys-decoration-${d.kind}-${Math.round(d.xPct * 1000)}-${Math.round(d.yPct * 1000)}`,
        kind: 'rect',
        xPct: d.xPct,
        yPct: d.yPct,
        wPct: d.wPct,
        hPct: d.hPct,
        fillColor: d.color,
        fillOn: d.kind !== 'frame',
        strokeColor: d.color,
        strokeW: d.kind === 'frame' ? (d.thickness ?? 1.5) : 0,
        cornerPct: d.corner ?? 0,
        rotationDeg: d.rotationDeg,
        opacity: d.opacity ?? 1,
        depth: d.depth,
    }) as SystemShapeSpec;

/** Mutates the composed cover in place: every text spec snaps to its solved
 *  zone with its solved rung — and the preset's AUTHORED relationships ride
 *  along (siblings keep their designed offsets from their role leader).
 *  A weighted relaxation pass then guarantees the nothing-collides contract
 *  at spec level, BEFORE any renderer draws a pixel. The feature gains a
 *  plate when the physics demands one; the barcode/QR moves to the solved
 *  corner; the style signature's decorations land as shapes. The layout
 *  laws verify after. */
export function applySolverToCover(cover: ComposedCover, solved: SolverResult): void {
    const byRole: Record<string, SolvedPlacement> = {};
    for (const p of solved.placements) byRole[p.role] = p;

    // ── SKELETON SNAPSHOT ── before any coordinate is touched, record
    // each role's LEADER spec and every sibling's designed offset from
    // it. The presets are authored arrangements, not noise: when the
    // leader moves to its solved zone, the siblings ride along with
    // their relationships intact. (The editor's ruling: stop fighting
    // the designed layouts — fit them.)
    const specs = cover.text as SystemTextSpec[];
    const leaderOf = new Map<string, SystemTextSpec>();
    const siblingDelta: Array<{ spec: SystemTextSpec; role: string; dx: number; dy: number }> = [];
    for (const spec of specs) {
        const role = roleOfSpec(spec);
        if (!role) continue;
        const lead = leaderOf.get(role);
        if (!lead) leaderOf.set(role, spec);
        else siblingDelta.push({ spec, role, dx: spec.xPct - lead.xPct, dy: spec.yPct - lead.yPct });
    }

    const used = new Set<string>();
    for (const spec of specs) {
        const role = roleOfSpec(spec);
        if (!role) continue;
        const p = byRole[role];
        if (!p || used.has(role)) continue; // first spec of each role carries the zone
        used.add(role);
        const w = asWritable(spec);
        w.xPct = p.xPct;
        w.yPct = p.yPct;
        w.widthPct = p.widthPct;
        if (p.heightPct) w.heightPct = p.heightPct; // the solved rung — the ladder speaks
        if (p.rotationDeg) w.rotationDeg = p.rotationDeg;
        if (p.depth) w.depth = p.depth;
    }

    // Siblings re-dock to their (now moved) leader — designed spacing,
    // translated as one arrangement.
    for (const s of siblingDelta) {
        const lead = leaderOf.get(s.role);
        if (!lead) continue;
        const w = asWritable(s.spec);
        w.xPct = clamp(lead.xPct + s.dx, 0.03, 0.97);
        w.yPct = clamp(lead.yPct + s.dy, 0.03, 0.97);
    }

    // ── §10.5 · THE RELAXATION PASS — the nothing-collides contract ──
    // Every live front text spec is checked pairwise; intersecting pairs
    // are pushed apart VERTICALLY (so every shared alignment axis — the
    // Gestalt continuity law — survives the push), split by inverse role
    // mass: the masthead barely moves, a teaser yields completely.
    // ≤10 relaxation passes over a handful of specs; then a final audit
    // that must come back clean or report itself as critical. This is
    // where "things appear on other things" dies — at the spec, before
    // any renderer ever draws.
    const MASS: Record<string, number> = { masthead: 5, feature: 4, sub: 2.5, teasers: 1.2, dateline: 1.5, badge: 1 };
    const boxOf = (s: SystemTextSpec): Rect => ({
        x0: s.xPct - s.widthPct / 200,
        y0: s.yPct - (s.heightPct ?? 3) / 200,
        x1: s.xPct + s.widthPct / 200,
        y1: s.yPct + (s.heightPct ?? 3) / 200,
    });
    const live = specs.filter((s) => !(s as { opacity?: number }).opacity && !s.rotationDeg);
    for (let pass = 0; pass < 10; pass++) {
        let moved = false;
        for (let i = 0; i < live.length; i++) {
            for (let j = i + 1; j < live.length; j++) {
                const a = live[i];
                const b = live[j];
                const hit = rectIntersect(boxOf(a), boxOf(b));
                if (!hit) continue;
                const ma = MASS[roleOfSpec(a) ?? ''] ?? 1;
                const mb = MASS[roleOfSpec(b) ?? ''] ?? 1;
                const pushY = hit.y1 - hit.y0 + 0.012; // full separation plus one breath
                const dir = a.yPct <= b.yPct ? -1 : 1; // upper spec rises, lower sinks
                const total = ma + mb;
                const wa = asWritable(a);
                const wb = asWritable(b);
                wa.yPct = clamp(wa.yPct + dir * pushY * (mb / total), 0.04, 0.96);
                wb.yPct = clamp(wb.yPct - dir * pushY * (ma / total), 0.04, 0.96);
                moved = true;
            }
        }
        if (!moved) break;
    }
    // The audit — the relaxation must end clean or say so, loudly.
    solved.violations = solved.violations ?? [];
    for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
            if (rectIntersect(boxOf(live[i]), boxOf(live[j]))) {
                solved.violations.push({
                    id: 'spec-overlap',
                    severity: 'critical',
                    message: `${roleOfSpec(live[i]) ?? 'text'} still intersects ${roleOfSpec(live[j]) ?? 'text'} after relaxation`,
                    role: roleOfSpec(live[i]) ?? undefined,
                });
            }
        }
    }

    // Plate the feature when the solver's physics demands one.
    const featP = byRole.feature;
    const featSpec = (cover.text as SystemTextSpec[]).find((s) => roleOfSpec(s) === 'feature');
    if (featP?.plate && featSpec) {
        const hasPlate = (cover.shapes as SystemShapeSpec[]).some(
            (s) => s.kind === 'rect' && s.fillOn && Math.abs(s.xPct - featSpec.xPct) < 0.12 && Math.abs(s.yPct - featSpec.yPct) < 0.12,
        );
        if (!hasPlate) {
            const w = featSpec.widthPct + 8;
            const h = featSpec.heightPct + 2.5;
            (cover.shapes as SystemShapeSpec[]).push({
                id: 'sys-solver-plate-0',
                kind: 'rect',
                xPct: featSpec.xPct,
                yPct: featSpec.yPct,
                wPct: w,
                hPct: h,
                // §16 — the plate inks with the photo's own tones when the
                // palette rode along; stock ink/paper otherwise.
                fillColor: solved.photoLight
                    ? (solved.swatches?.inkDark ?? '#000000')
                    : (solved.swatches?.paperNeutral ?? '#FFFFFF'),
                fillOn: true,
                strokeColor: solved.photoLight
                    ? (solved.swatches?.inkDark ?? '#000000')
                    : (solved.swatches?.paperNeutral ?? '#FFFFFF'),
                strokeW: 0,
                cornerPct: 0,
                rotationDeg: 0,
                opacity: 1,
                depth: 'behind',
                // Plates render under front text; the civic-sense render guard
                // flips the text ink against whatever sits beneath it.
            } as SystemShapeSpec);
        }
    }

    // The scan element moves to the solved corner.
    const scanP = byRole.scan;
    if (scanP) {
        const sc = (cover.shapes as SystemShapeSpec[]).find((s) => s.kind === 'barcode' || s.kind === 'qr');
        if (sc) {
            sc.xPct = scanP.xPct;
            sc.yPct = scanP.yPct;
        }
    }

    // Giant wordmark styles retire the composer's masthead — printing both
    // would set the word twice.
    const sig = resolveSignature(solved.style);
    if (sig.giant) {
        const m = (cover.text as SystemTextSpec[]).find((s) => roleOfSpec(s) === 'masthead');
        if (m) asWritable(m).opacity = 0;
    }

    for (const d of solved.decorations) {
        (cover.shapes as SystemShapeSpec[]).push(decorationToShapeSpec(d));
    }
}

// ===========================================================================
