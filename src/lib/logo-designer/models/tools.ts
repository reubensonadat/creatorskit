export enum Tool {
  Draw = "draw",
  Erase = "erase",
  Line = "line",
  Rectangle = "rectangle",
  Ellipse = "ellipse",
  Fill = "fill",
}

export type SymmetryMode = "none" | "horizontal" | "vertical" | "both";

export interface ToolOptions {
  brushSize: 1 | 2 | 3 | 4;
  symmetry: SymmetryMode;
  shapeFilled: boolean;
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  brushSize: 1,
  symmetry: "none",
  shapeFilled: false,
};
