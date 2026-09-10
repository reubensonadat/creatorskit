import { SceneType } from '../tree-generator';
import { PresetBuilder } from './types';
import { buildSakuraTree } from './sakura-tree';
import { buildRoseBouquet } from './rose-bouquet';
import { buildWeepingWisteria } from './weeping-wisteria';
import { buildZenBonsai } from './zen-bonsai';
import { buildPagodaPine } from './pagoda-pine';
import {
    buildRealisticSakura,
    buildRealisticMaple,
    buildRealisticGinkgo,
    buildMagnolia,
    buildHydrangeaTree,
    buildFrostTree,
    buildRealisticOak,
} from './realistic-trees';
import { buildFlagshipSakura } from './sakura-realistic';

export * from './types';
export * from './sakura-tree';
export * from './rose-bouquet';
export * from './weeping-wisteria';
export * from './zen-bonsai';
export * from './pagoda-pine';
export * from './realistic-core';
export * from './realistic-trees';
export * from './sakura-realistic';

const PRESET_REGISTRY: Record<string, PresetBuilder> = {
    sakura: buildFlagshipSakura,
    tree: buildFlagshipSakura,
    maple: buildRealisticMaple,
    ginkgo: buildRealisticGinkgo,
    magnolia: buildMagnolia,
    hydrangea: buildHydrangeaTree,
    frost: buildFrostTree,
    oak: buildRealisticOak,
    rose: buildRoseBouquet,
    wisteria: buildWeepingWisteria,
    bonsai: buildZenBonsai,
    pine: buildPagodaPine,
};

/**
 * Returns the specialized procedural builder for the given scene type.
 */
export function getPresetBuilder(sceneType: SceneType): PresetBuilder {
    return PRESET_REGISTRY[sceneType] || buildRealisticSakura;
}
