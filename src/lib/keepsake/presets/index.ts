/**
 * Keepsake preset registry — modular botanical builders, completely
 * decoupled from the QR harness. Each builder receives only a palette +
 * deterministic seed and returns a self-contained THREE.Group.
 */

import type { KeepsakePalette, KeepsakePresetId, KeepsakePresetResult } from '../types';
import { buildSakuraTree } from './sakura-tree';
import { buildRoseBouquet } from './rose-bouquet';
import { buildWisteria } from './wisteria';
import { buildGinkgoTree } from './ginkgo-tree';
import { buildHydrangeaTree } from './hydrangea-tree';
import { buildFrostTree } from './frost-tree';
import { buildBonsai } from './bonsai';

export type KeepsakePresetBuilder = (
    palette: KeepsakePalette,
    seed: string
) => KeepsakePresetResult;

export const KEEPSAKE_PRESET_REGISTRY: Record<KeepsakePresetId, KeepsakePresetBuilder> = {
    sakura: buildSakuraTree,
    wisteria: buildWisteria,
    rose: buildRoseBouquet,
    ginkgo: buildGinkgoTree,
    hydrangea: buildHydrangeaTree,
    frost: buildFrostTree,
    bonsai: buildBonsai,
};

export function getKeepsakePresetBuilder(id: KeepsakePresetId): KeepsakePresetBuilder {
    return KEEPSAKE_PRESET_REGISTRY[id] ?? buildSakuraTree;
}
