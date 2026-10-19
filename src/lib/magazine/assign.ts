// assign.ts — §5 the assignment optimizer: the exact Hungarian core
// plus seeded k-best restarts. Pure combinatorics; knows nothing of
// magazines.

// §5 · THE ASSIGNMENT OPTIMIZER — the Gen II Hungarian core, verbatim
//      (it is exact, unbeatable, and battle-proven), plus k-best restarts:
//      seeded cost perturbations produce genuinely different optima, and
//      a distinctness filter keeps only layouts that MOVE.
// ===========================================================================

const INFEASIBLE = 1e6;

/** Jonker-style Hungarian assignment with potentials. cost[r][c], returns
 *  col index per row (minimizes total cost). Classic, exact, unbeatable. */
const hungarian = (cost: number[][]): number[] => {
    const n = cost.length;
    const INF = 1e15;
    const u = new Array<number>(n + 1).fill(0);
    const v = new Array<number>(n + 1).fill(0);
    const p = new Array<number>(n + 1).fill(0);
    const way = new Array<number>(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
        p[0] = i;
        let j0 = 0;
        const minv = new Array<number>(n + 1).fill(INF);
        const used = new Array<boolean>(n + 1).fill(false);
        do {
            used[j0] = true;
            const i0 = p[j0];
            let delta = INF;
            let j1 = 0;
            for (let j = 1; j <= n; j++) {
                if (used[j]) continue;
                const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                if (cur < minv[j]) {
                    minv[j] = cur;
                    way[j] = j0;
                }
                if (minv[j] < delta) {
                    delta = minv[j];
                    j1 = j;
                }
            }
            for (let j = 0; j <= n; j++) {
                if (used[j]) {
                    u[p[j]] += delta;
                    v[j] -= delta;
                } else {
                    minv[j] -= delta;
                }
            }
            j0 = j1;
        } while (p[j0] !== 0);
        do {
            const j1 = way[j0];
            p[j0] = p[j1];
            j0 = j1;
        } while (j0);
    }
    const rowToCol = new Array<number>(n).fill(-1);
    for (let j = 1; j <= n; j++) if (p[j] > 0) rowToCol[p[j] - 1] = j - 1;
    return rowToCol;
};

interface KBestResult {
    assignment: number[];
    totalCost: number;
}

/**
 * k-best by perturbation restart: solve once on the true cost, then re-
 * solve on seeded jittered copies. Each candidate keeps its TRUE cost;
 * dedupe requires a mean per-role displacement of at least `minShift`
 * zone-index distance so "different" means different. Returns best-first.
 */
const kBestAssignments = (cost: number[][], k: number, rng: () => number, minShift = 1.4): KBestResult[] => {
    const trueTotal = (a: number[]): number =>
        a.reduce((acc, col, row) => (col >= 0 && cost[row][col] < INFEASIBLE ? acc + cost[row][col] : acc + INFEASIBLE), 0);
    const seen: { assignment: number[]; totalCost: number }[] = [];
    const push = (a: number[]): void => {
        if (a.some((c) => c < 0)) return;
        if (seen.some((s) => s.assignment.every((c, i) => c === a[i]))) return;
        seen.push({ assignment: [...a], totalCost: trueTotal(a) });
    };
    push(hungarian(cost));
    for (let attempt = 0; attempt < k * 3 && seen.length < k; attempt++) {
        const jittered = cost.map((row) => row.map((c) => (c >= INFEASIBLE ? c : c * (1 + (rng() * 2 - 1) * 0.35))));
        const a = hungarian(jittered);
        if (a.some((c) => c < 0)) continue;
        const far = seen.every((s) => {
            const shift = a.reduce((acc, col, i) => acc + Math.abs(col - s.assignment[i]), 0) / a.length;
            return shift >= minShift;
        });
        if (far) push(a);
    }
    return seen.sort((a, b) => a.totalCost - b.totalCost);
};

// ===========================================================================
export { hungarian, kBestAssignments, INFEASIBLE };
export type { KBestResult };
