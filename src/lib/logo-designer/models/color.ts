import { useState, useCallback } from "react";

export const DEFAULT_COLOR = "#000000";

export interface ColorState {
  activeColor: string;
  setActiveColor: (color: string) => void;
}

export function useColorState(
  initialColor: string = DEFAULT_COLOR,
): ColorState {
  const [activeColor, setActiveColorRaw] = useState<string>(initialColor);

  const setActiveColor = useCallback((color: string) => {
    if (typeof color !== "string" || color.trim() === "") {
      throw new Error("Color must be a non-empty string");
    }
    setActiveColorRaw(color.trim());
  }, []);

  return { activeColor, setActiveColor };
}

export function createColorStore(initialColor: string = DEFAULT_COLOR) {
  let activeColor = initialColor;
  const listeners = new Set<(color: string) => void>();

  function getActiveColor(): string {
    return activeColor;
  }

  function setActiveColor(color: string): void {
    if (typeof color !== "string" || color.trim() === "") {
      throw new Error("Color must be a non-empty string");
    }
    activeColor = color.trim();
    listeners.forEach((fn) => fn(activeColor));
  }

  function subscribe(listener: (color: string) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getActiveColor, setActiveColor, subscribe };
}
