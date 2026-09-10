import * as THREE from 'three';
import { PRNG, SeasonType, FoliagePalette } from '../tree-generator';

export interface PresetContext {
    scene: THREE.Group;
    season: SeasonType;
    palette: FoliagePalette;
    prng: PRNG;
    worldSize: number;
    qrSize?: number;
}

export interface PresetResult {
    trunkGroup: THREE.Group;
    leafMeshes: THREE.InstancedMesh[];
    customGroup?: THREE.Group;
}

export type PresetBuilder = (ctx: PresetContext) => PresetResult;
