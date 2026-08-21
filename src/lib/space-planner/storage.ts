import type { PlacedObject, ProjectInfo, Currency, CreatorTemplateId, ViewMode } from '@/components/space-planner/types';

export interface SavedPlan {
  version: 1;
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  templateId: CreatorTemplateId;
  viewMode: ViewMode;
  currency: Currency;
  projectInfo: ProjectInfo;
  placedObjects: PlacedObject[];
  savedAt: string;
}

const STORAGE_KEY = 'creator-space-planner-save';

export function savePlan(data: Omit<SavedPlan, 'version' | 'savedAt'>): void {
  const plan: SavedPlan = {
    ...data,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadPlan(): SavedPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) return null;
    return parsed as SavedPlan;
  } catch {
    return null;
  }
}

export function clearSavedPlan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasSavedPlan(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
