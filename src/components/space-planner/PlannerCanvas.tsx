'use client';

import * as THREE from 'three';
import ArchitecturalCanvas from './ArchitecturalCanvas';

export const isCamEquipment = (id?: any): boolean =>
  typeof id === 'string' &&
  (id === 'camera' ||
    id.startsWith('cam') ||
    id.includes('phone') ||
    id.includes('webcam') ||
    id.includes('prompter') ||
    id.includes('teleprompter'));

export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite) {
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.map?.dispose();
            mat.dispose();
          });
        } else {
          child.material.map?.dispose();
          child.material.dispose();
        }
      }
    }
  });
}

export default function PlannerCanvas() {
  return <ArchitecturalCanvas />;
}
