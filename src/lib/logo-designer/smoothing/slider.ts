import { useState, useRef, useCallback, useEffect } from "react";
import type { Grid } from "../models/grid";
import type { LayerManager } from "../models/layers";
import { extractAllLayerContours } from "./multicolor";
import {
  smoothContour,
  smoothContourSubdivision,
  type SmoothedPath,
} from "./bezier";

export interface SmoothedLayerResult {
  layerId: string;
  paths: Array<SmoothedPath & { color: string }>;
  rotation: number;
}

export type SmoothingMode = "squircle" | "smooth";

export function computeSmoothedPaths(
  grid: Grid,
  layerManager: LayerManager,
  alpha: number,
  mode: SmoothingMode = "squircle",
): SmoothedLayerResult[] {
  const layerContours = extractAllLayerContours(grid, layerManager);
  const smoother =
    mode === "smooth" ? smoothContourSubdivision : smoothContour;

  return layerContours.map((lc) => {
    const layer = layerManager.getLayer(lc.layerId);
    return {
      layerId: lc.layerId,
      paths: lc.contours.map((c) => ({
        ...smoother(c, alpha),
        color: c.color,
      })),
      rotation: layer?.rotation ?? 0,
    };
  });
}

export interface SmoothingSliderState {
  alpha: number;
  setAlpha: (value: number) => void;
  mode: SmoothingMode;
  setMode: (mode: SmoothingMode) => void;
  result: SmoothedLayerResult[];
}

export function useSmoothingSlider(
  grid: Grid,
  layerManager: LayerManager,
  debounceMs: number = 150,
  initialMode: SmoothingMode = "squircle",
): SmoothingSliderState {
  const [alpha, setAlphaRaw] = useState(0.5);
  const [mode, setMode] = useState<SmoothingMode>(initialMode);
  const [result, setResult] = useState<SmoothedLayerResult[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setAlpha = useCallback((value: number) => {
    setAlphaRaw(Math.max(0, Math.min(1, value)));
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setResult(computeSmoothedPaths(grid, layerManager, alpha, mode));
      timerRef.current = null;
    }, debounceMs);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [alpha, mode, grid, layerManager, debounceMs]);

  return { alpha, setAlpha, mode, setMode, result };
}
