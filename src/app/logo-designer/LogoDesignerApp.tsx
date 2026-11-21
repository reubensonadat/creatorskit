"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { ReactNode, MouseEvent, CSSProperties } from "react";
import {
    Pencil,
    Eraser,
    Slash,
    Square,
    Circle,
    PaintBucket,
    Undo2,
    Redo2,
    Plus,
    Eye,
    EyeOff,
    Download,
} from "lucide-react";
import { Grid, clampGridSize, GRID_MIN, GRID_MAX } from "../../lib/logo-designer/models/grid";
import type { CellData } from "../../lib/logo-designer/models/grid";
import { LayerManager } from "../../lib/logo-designer/models/layers";
import type { Layer } from "../../lib/logo-designer/models/layers";
import { History, DrawStrokeCommand, ResizeCommand } from "../../lib/logo-designer/canvas/history";
import { resizeGrid } from "../../lib/logo-designer/canvas/resize";
import { computeSmoothedPaths } from "../../lib/logo-designer/smoothing/slider";
import type { SmoothedLayerResult, SmoothingMode } from "../../lib/logo-designer/smoothing/slider";
import { pathToSvgD } from "../../lib/logo-designer/smoothing/bezier";
import { exportSvg, exportPng } from "../../lib/logo-designer/export/integration";
import type { ExportConfig } from "../../lib/logo-designer/export/integration";
import type { PngScale } from "../../lib/logo-designer/export/png";
import { downloadSvg, downloadPng, generateFilename } from "../../lib/logo-designer/export/download";
import { Tool, DEFAULT_TOOL_OPTIONS } from "../../lib/logo-designer/models/tools";
import type { ToolOptions, SymmetryMode } from "../../lib/logo-designer/models/tools";
import { ROTATION_PRESETS, inverseRotatePoint } from "../../lib/logo-designer/models/rotation";
import {
    bresenhamLine,
    rectangleCells,
    ellipseCells,
    floodFill,
} from "../../lib/logo-designer/canvas/shapes";
import type { CellCoord, StrokeMode } from "../../lib/logo-designer/canvas/drawing";
import { expandBrush, mirrorCells } from "../../lib/logo-designer/canvas/symmetry";

type ExportMode = "light" | "dark" | "adaptive";

const PRESET_COLORS = [
    "#000000",
    "#ffffff",
    "#dc2626",
    "#ea580c",
    "#FFE500",
    "#16a34a",
    "#2563eb",
    "#7c3aed",
    "#db2777",
];

const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

function Kicker({ children }: { children: ReactNode }) {
    return (
        <span
            style={{
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#dc2626",
                display: "block",
            }}
        >
            {children}
        </span>
    );
}

function Seg<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div
            style={{
                display: "flex",
                border: "2px solid #000",
                borderRadius: 8,
                overflow: "hidden",
                background: "#fff",
            }}
        >
            {options.map((option, i) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        style={{
                            flex: 1,
                            padding: "5px 8px",
                            fontFamily: MONO,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                            color: "#000",
                            background: active ? "#FFE500" : "#fff",
                            borderLeft: i === 0 ? "none" : "2px solid #000",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

const TOOL_ICONS: Record<Tool, { label: string; icon: ReactNode }> = {
    [Tool.Draw]: { label: "Draw", icon: <Pencil size={16} strokeWidth={2.2} /> },
    [Tool.Erase]: { label: "Erase", icon: <Eraser size={16} strokeWidth={2.2} /> },
    [Tool.Line]: { label: "Line", icon: <Slash size={16} strokeWidth={2.2} /> },
    [Tool.Rectangle]: { label: "Rectangle", icon: <Square size={16} strokeWidth={2.2} /> },
    [Tool.Ellipse]: { label: "Ellipse", icon: <Circle size={16} strokeWidth={2.2} /> },
    [Tool.Fill]: { label: "Fill", icon: <PaintBucket size={16} strokeWidth={2.2} /> },
};

/* ------------------------------------------------------------------ */
/* Pixel canvas                                                        */
/* ------------------------------------------------------------------ */

interface StrokeState {
    mode: StrokeMode;
    layerId: string;
    changes: Array<{
        row: number;
        col: number;
        before: CellData;
        after: CellData;
    }>;
    visited: Set<string>;
}

interface ShapeDragState {
    tool: Tool;
    layerId: string;
    anchorRow: number;
    anchorCol: number;
}

interface PixelCanvasProps {
    grid: Grid;
    layerManager: LayerManager;
    activeColor: string;
    activeTool: Tool;
    toolOptions: ToolOptions;
    version: number;
    onStrokeComplete: (
        layerId: string,
        changes: Array<{
            row: number;
            col: number;
            before: CellData;
            after: CellData;
        }>,
    ) => void;
    onCursorChange: (pos: { row: number; col: number } | null) => void;
    zoom: number;
    onZoomChange: (zoom: number) => void;
}

function PixelCanvas({
    grid,
    layerManager,
    activeColor,
    activeTool,
    toolOptions,
    version,
    onStrokeComplete,
    onCursorChange,
    zoom,
    onZoomChange,
}: PixelCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokeRef = useRef<StrokeState | null>(null);
    const shapeDragRef = useRef<ShapeDragState | null>(null);
    const ghostRef = useRef<CellCoord[]>([]);
    const hoverRef = useRef<{ row: number; col: number } | null>(null);
    const panRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const spaceDownRef = useRef(false);
    const [maxSize, setMaxSize] = useState(0);

    // Observe container size
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0]!.contentRect;
            setMaxSize(Math.floor(Math.min(width, height)));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Track space key for pan mode
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.code === "Space" && !e.repeat) {
                const t = e.target as HTMLElement | null;
                if (!t || t === document.body || t.tagName === "CANVAS") {
                    e.preventDefault();
                }
                spaceDownRef.current = true;
            }
        }
        function onKeyUp(e: KeyboardEvent) {
            if (e.code === "Space") {
                spaceDownRef.current = false;
                isPanningRef.current = false;
            }
        }
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    const n = grid.n;
    const baseCellSize = maxSize > 0 ? Math.max(2, Math.floor(maxSize / n)) : 0;
    const cellSize = baseCellSize * zoom;
    const canvasPixels = cellSize * n;

    // Stable redraw ref
    const redrawRef = useRef<() => void>(() => { });
    redrawRef.current = () => {
        const canvas = canvasRef.current;
        if (!canvas || canvasPixels === 0) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const displayW = Math.min(canvasPixels, maxSize * 2);
        const displayH = displayW;
        const w = displayW * dpr;
        if (canvas.width !== w || canvas.height !== w) {
            canvas.width = w;
            canvas.height = w;
        }
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, displayW, displayH);

        // Apply pan
        ctx.save();
        ctx.translate(panRef.current.x, panRef.current.y);

        // Checkerboard (light, house palette)
        const cs = Math.max(cellSize, 8);
        const totalSize = cellSize * n;
        const checkerCols = Math.ceil(totalSize / cs);
        for (let r = 0; r < checkerCols; r++) {
            for (let c = 0; c < checkerCols; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? "#ffffff" : "#e4e4e7";
                ctx.fillRect(c * cs, r * cs, cs, cs);
            }
        }

        // Filled cells — render per-layer with rotation
        const visibleLayers = layerManager.getVisibleLayers();
        const centerPx = (n * cellSize) / 2;

        for (const layer of visibleLayers) {
            ctx.save();
            if (layer.rotation !== 0) {
                ctx.translate(centerPx, centerPx);
                ctx.rotate((layer.rotation * Math.PI) / 180);
                ctx.translate(-centerPx, -centerPx);
            }
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    const cell = grid.getCell(layer.id, r, c);
                    if (cell.filled && cell.color) {
                        ctx.fillStyle = cell.color;
                        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
                    }
                }
            }
            ctx.restore();
        }

        // Grid lines
        if (cellSize >= 6) {
            ctx.strokeStyle = "rgba(0,0,0,0.08)";
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= n; i++) {
                const pos = i * cellSize + 0.25;
                ctx.beginPath();
                ctx.moveTo(pos, 0);
                ctx.lineTo(pos, totalSize);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, pos);
                ctx.lineTo(totalSize, pos);
                ctx.stroke();
            }
        }

        // Ghost cells for shape tools
        const ghost = ghostRef.current;
        if (ghost.length > 0) {
            ctx.fillStyle = "rgba(255,229,0,0.45)";
            for (const { row, col } of ghost) {
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }

        // Hover indicator
        const hover = hoverRef.current;
        if (hover && !strokeRef.current && !shapeDragRef.current) {
            ctx.fillStyle = "rgba(220,38,38,0.12)";
            ctx.fillRect(hover.col * cellSize, hover.row * cellSize, cellSize, cellSize);
            ctx.strokeStyle = "rgba(220,38,38,0.55)";
            ctx.lineWidth = 1;
            ctx.strokeRect(
                hover.col * cellSize + 0.5,
                hover.row * cellSize + 0.5,
                cellSize - 1,
                cellSize - 1,
            );
        }

        ctx.restore(); // pan
    };

    // Redraw on state changes
    useEffect(() => {
        redrawRef.current();
    }, [version, maxSize, canvasPixels, zoom]);

    // Non-passive wheel zoom (native listener so preventDefault works)
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handler = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            onZoomChange(Math.max(0.5, Math.min(4, zoomRef.current + delta)));
        };
        canvas.addEventListener("wheel", handler, { passive: false });
        return () => canvas.removeEventListener("wheel", handler);
    }, [onZoomChange]);

    function getCell(e: MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = parseFloat(canvas.style.width) / rect.width;
        const scaleY = parseFloat(canvas.style.height) / rect.height;
        let x = (e.clientX - rect.left) * scaleX - panRef.current.x;
        let y = (e.clientY - rect.top) * scaleY - panRef.current.y;

        // Apply inverse rotation of active layer for drawing
        const activeLayer = layerManager.getActiveLayer();
        if (activeLayer.rotation !== 0) {
            const centerPx = (n * cellSize) / 2;
            const inv = inverseRotatePoint(x, y, centerPx, centerPx, activeLayer.rotation);
            x = inv.x;
            y = inv.y;
        }

        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);
        if (row < 0 || row >= n || col < 0 || col >= n) return null;
        return { row, col };
    }

    function applyCells(
        cells: CellCoord[],
        mode: "paint" | "erase",
    ): Array<{
        row: number;
        col: number;
        before: CellData;
        after: CellData;
    }> {
        // Apply brush expansion and symmetry
        let processed = cells;
        if (toolOptions.brushSize > 1 && activeTool !== Tool.Fill) {
            processed = expandBrush(processed, toolOptions.brushSize, n);
        }
        if (toolOptions.symmetry !== "none") {
            processed = mirrorCells(processed, n, toolOptions.symmetry);
        }

        const layerId = layerManager.activeLayerId;
        const changes: Array<{
            row: number;
            col: number;
            before: CellData;
            after: CellData;
        }> = [];

        for (const { row, col } of processed) {
            if (row < 0 || row >= n || col < 0 || col >= n) continue;
            const cellData = grid.getCell(layerId, row, col);
            const before: CellData = { filled: cellData.filled, color: cellData.color };
            const after: CellData =
                mode === "paint"
                    ? { filled: true, color: activeColor }
                    : { filled: false, color: undefined };

            if (before.filled !== after.filled || before.color !== after.color) {
                grid.setCell(layerId, row, col, after);
                changes.push({ row, col, before, after });
            }
        }

        return changes;
    }

    function handleMouseDown(e: MouseEvent<HTMLCanvasElement>) {
        e.preventDefault();

        // Pan mode
        if (spaceDownRef.current) {
            isPanningRef.current = true;
            panStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                panX: panRef.current.x,
                panY: panRef.current.y,
            };
            return;
        }

        const cell = getCell(e);
        if (!cell) return;

        const layerId = layerManager.activeLayerId;

        // Fill tool — immediate action
        if (activeTool === Tool.Fill) {
            const fillCells = floodFill(grid, layerId, cell.row, cell.col, activeColor);
            if (fillCells.length > 0) {
                const changes = applyCells(fillCells, "paint");
                if (changes.length > 0) {
                    onStrokeComplete(layerId, changes);
                }
            }
            return;
        }

        // Shape tools — start drag
        if (
            activeTool === Tool.Line ||
            activeTool === Tool.Rectangle ||
            activeTool === Tool.Ellipse
        ) {
            shapeDragRef.current = {
                tool: activeTool,
                layerId,
                anchorRow: cell.row,
                anchorCol: cell.col,
            };
            ghostRef.current = [cell];
            redrawRef.current();
            return;
        }

        // Draw/Erase — freehand stroke
        const cellData = grid.getCell(layerId, cell.row, cell.col);
        const mode: StrokeMode =
            activeTool === Tool.Erase
                ? "erase"
                : activeTool === Tool.Draw
                    ? "paint"
                    : cellData.filled
                        ? "erase"
                        : "paint";

        const changes = applyCells([cell], mode);

        strokeRef.current = {
            mode,
            layerId,
            changes,
            visited: new Set([`${cell.row},${cell.col}`]),
        };

        redrawRef.current();
    }

    function handleMouseMove(e: MouseEvent<HTMLCanvasElement>) {
        // Pan handling
        if (isPanningRef.current) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            panRef.current = {
                x: panStartRef.current.panX + dx,
                y: panStartRef.current.panY + dy,
            };
            redrawRef.current();
            return;
        }

        const cell = getCell(e);
        hoverRef.current = cell;
        onCursorChange(cell);

        // Shape drag — update ghost
        if (shapeDragRef.current && cell) {
            const { tool, anchorRow, anchorCol } = shapeDragRef.current;
            let cells: CellCoord[];

            switch (tool) {
                case Tool.Line:
                    cells = bresenhamLine(anchorRow, anchorCol, cell.row, cell.col);
                    break;
                case Tool.Rectangle:
                    cells = rectangleCells(anchorRow, anchorCol, cell.row, cell.col, toolOptions.shapeFilled);
                    break;
                case Tool.Ellipse:
                    cells = ellipseCells(anchorRow, anchorCol, cell.row, cell.col, toolOptions.shapeFilled);
                    break;
                default:
                    cells = [];
            }

            // Apply brush + symmetry to ghost
            if (toolOptions.brushSize > 1) {
                cells = expandBrush(cells, toolOptions.brushSize, n);
            }
            if (toolOptions.symmetry !== "none") {
                cells = mirrorCells(cells, n, toolOptions.symmetry);
            }

            ghostRef.current = cells;
            redrawRef.current();
            return;
        }

        // Freehand stroke
        if (strokeRef.current && cell) {
            const key = `${cell.row},${cell.col}`;
            if (!strokeRef.current.visited.has(key)) {
                strokeRef.current.visited.add(key);
                const newChanges = applyCells([cell], strokeRef.current.mode);
                strokeRef.current.changes.push(...newChanges);
            }
        }

        redrawRef.current();
    }

    function finishStroke() {
        // Complete shape drag
        if (shapeDragRef.current) {
            const ghost = ghostRef.current;
            if (ghost.length > 0) {
                const changes = applyCells(ghost, "paint");
                if (changes.length > 0) {
                    onStrokeComplete(shapeDragRef.current.layerId, changes);
                }
            }
            shapeDragRef.current = null;
            ghostRef.current = [];
        }

        // Complete freehand stroke
        if (strokeRef.current && strokeRef.current.changes.length > 0) {
            onStrokeComplete(strokeRef.current.layerId, strokeRef.current.changes);
        }
        strokeRef.current = null;
    }

    function handleMouseUp() {
        isPanningRef.current = false;
        finishStroke();
        redrawRef.current();
    }

    function handleMouseLeave() {
        hoverRef.current = null;
        onCursorChange(null);
        isPanningRef.current = false;
        finishStroke();
        redrawRef.current();
    }

    function handleDoubleClick() {
        panRef.current = { x: 0, y: 0 };
        onZoomChange(1);
        redrawRef.current();
    }

    const cursor = spaceDownRef.current || isPanningRef.current ? "grab" : "crosshair";

    const containerStyle: CSSProperties = {
        height: "min(62vh, 520px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#fafafa",
        border: "2px solid #000",
        borderRadius: 8,
    };

    if (maxSize === 0) {
        return <div ref={containerRef} style={containerStyle} />;
    }

    return (
        <div ref={containerRef} style={containerStyle}>
            <canvas
                ref={canvasRef}
                style={{
                    cursor,
                    border: "3px solid #000",
                    borderRadius: 6,
                    boxShadow: "4px 4px 0 #000",
                    display: "block",
                    touchAction: "none",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onDoubleClick={handleDoubleClick}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Smoothed preview                                                    */
/* ------------------------------------------------------------------ */

function PreviewPanel({
    smoothedResult,
    gridSize,
}: {
    smoothedResult: SmoothedLayerResult[];
    gridSize: number;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [maxSize, setMaxSize] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0]!.contentRect;
            setMaxSize(Math.floor(Math.min(width, height)));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const viewSize = gridSize + 2; // padded coordinate space
    const svgPixels = maxSize > 0 ? maxSize : 300;
    const center = viewSize / 2;

    const hasPaths = smoothedResult.some((l) => l.paths.length > 0);

    return (
        <div
            ref={containerRef}
            style={{
                height: "min(48vh, 380px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background: "#fafafa",
                border: "2px solid #000",
                borderRadius: 8,
                padding: 10,
            }}
        >
            {hasPaths ? (
                <div
                    style={{
                        width: svgPixels,
                        height: svgPixels,
                        background: "repeating-conic-gradient(#e4e4e7 0% 25%, #ffffff 0% 50%) 50% / 20px 20px",
                        border: "2px solid #000",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                    }}
                >
                    <svg viewBox={`0 0 ${viewSize} ${viewSize}`} width={svgPixels} height={svgPixels}>
                        {smoothedResult.map((layer) => {
                            const rot = layer.rotation ?? 0;
                            const transform = rot !== 0 ? `rotate(${rot}, ${center}, ${center})` : undefined;
                            // Group paths by color, combine into single <path> with evenodd
                            // so holes (counter-clockwise contours) subtract from fills
                            const byColor = new Map<string, string[]>();
                            for (const path of layer.paths) {
                                const d = pathToSvgD(path);
                                if (!d) continue;
                                const arr = byColor.get(path.color);
                                if (arr) arr.push(d);
                                else byColor.set(path.color, [d]);
                            }

                            return (
                                <g key={layer.layerId} transform={transform}>
                                    {[...byColor.entries()].map(([color, ds]) => (
                                        <path key={color} d={ds.join(" ")} fill={color} fillRule="evenodd" />
                                    ))}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            ) : (
                <div
                    style={{
                        width: svgPixels,
                        height: svgPixels,
                        maxWidth: "100%",
                        border: "2px dashed #a1a1aa",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: MONO,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: "#71717a",
                        textTransform: "uppercase",
                    }}
                >
                    Draw to see preview
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Inspector                                                           */
/* ------------------------------------------------------------------ */

function InspectorSection({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div
            style={{
                background: "#fff",
                border: "2px solid #000",
                borderRadius: 8,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            <Kicker>{label}</Kicker>
            {children}
        </div>
    );
}

function Inspector({
    activeTool,
    toolOptions,
    onBrushSizeChange,
    onSymmetryChange,
    onShapeFilledChange,
    activeColor,
    onColorChange,
    layers,
    activeLayerId,
    canAddLayer,
    onSelectLayer,
    onToggleVisibility,
    onAddLayer,
    onRotateLayer,
    alpha,
    onAlphaChange,
    smoothingMode,
    onSmoothingModeChange,
    exportMode,
    onExportModeChange,
    onExportSvg,
    onExportPng,
}: {
    activeTool: Tool;
    toolOptions: ToolOptions;
    onBrushSizeChange: (size: 1 | 2 | 3 | 4) => void;
    onSymmetryChange: (mode: SymmetryMode) => void;
    onShapeFilledChange: (filled: boolean) => void;
    activeColor: string;
    onColorChange: (color: string) => void;
    layers: readonly Layer[];
    activeLayerId: string;
    canAddLayer: boolean;
    onSelectLayer: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onAddLayer: () => void;
    onRotateLayer: (id: string, degrees: number) => void;
    alpha: number;
    onAlphaChange: (value: number) => void;
    smoothingMode: SmoothingMode;
    onSmoothingModeChange: (mode: SmoothingMode) => void;
    exportMode: ExportMode;
    onExportModeChange: (mode: ExportMode) => void;
    onExportSvg: () => void;
    onExportPng: (scale: PngScale) => void;
}) {
    const isShapeTool =
        activeTool === Tool.Line || activeTool === Tool.Rectangle || activeTool === Tool.Ellipse;
    const isDrawOrErase = activeTool === Tool.Draw || activeTool === Tool.Erase;

    const exportBtn = (label: string, onClick: () => void, primary = false) => (
        <button
            type="button"
            onClick={onClick}
            style={{
                flex: 1,
                padding: "7px 8px",
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: "#000",
                background: primary ? "#FFE500" : "#fff",
                border: "2px solid #000",
                borderRadius: 8,
                boxShadow: primary ? "3px 3px 0 #000" : "none",
                cursor: "pointer",
            }}
        >
            {label}
        </button>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Tool options */}
            <InspectorSection label="Tool Options">
                {isDrawOrErase && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, color: "#71717a", width: 44 }}>BRUSH</span>
                            <Seg
                                options={[
                                    { value: "1", label: "1" },
                                    { value: "2", label: "2" },
                                    { value: "3", label: "3" },
                                    { value: "4", label: "4" },
                                ]}
                                value={String(toolOptions.brushSize)}
                                onChange={(v) => onBrushSizeChange(Number(v) as 1 | 2 | 3 | 4)}
                            />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, color: "#71717a", width: 44 }}>MIRROR</span>
                            <Seg
                                options={[
                                    { value: "none", label: "OFF" },
                                    { value: "horizontal", label: "H" },
                                    { value: "vertical", label: "V" },
                                    { value: "both", label: "HV" },
                                ]}
                                value={toolOptions.symmetry}
                                onChange={(v) => onSymmetryChange(v as SymmetryMode)}
                            />
                        </div>
                    </>
                )}
                {isShapeTool && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: "#71717a", width: 44 }}>SHAPE</span>
                        <Seg
                            options={[
                                { value: "outline", label: "OUTLINE" },
                                { value: "filled", label: "FILLED" },
                            ]}
                            value={toolOptions.shapeFilled ? "filled" : "outline"}
                            onChange={(v) => onShapeFilledChange(v === "filled")}
                        />
                    </div>
                )}
                {activeTool === Tool.Fill && (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: "#71717a" }}>
                        CLICK A REGION TO FILL IT
                    </span>
                )}
            </InspectorSection>

            {/* Color */}
            <InspectorSection label="Color">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {PRESET_COLORS.map((color) => {
                        const active = color === activeColor;
                        return (
                            <button
                                key={color}
                                type="button"
                                onClick={() => onColorChange(color)}
                                aria-label={`Select color ${color}`}
                                style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 6,
                                    background: color,
                                    border: "2px solid #000",
                                    boxShadow: active ? "2px 2px 0 #000" : "none",
                                    transform: active ? "translate(-1px,-1px)" : "none",
                                    cursor: "pointer",
                                    padding: 0,
                                }}
                            />
                        );
                    })}
                    <input
                        type="color"
                        value={activeColor}
                        onChange={(e) => onColorChange(e.target.value)}
                        aria-label="Custom color picker"
                        style={{
                            width: 34,
                            height: 26,
                            padding: 0,
                            border: "2px solid #000",
                            borderRadius: 6,
                            background: "#fff",
                            cursor: "pointer",
                        }}
                    />
                </div>
            </InspectorSection>

            {/* Layers */}
            <InspectorSection label="Layers">
                {layers.map((layer) => {
                    const active = layer.id === activeLayerId;
                    return (
                        <div
                            key={layer.id}
                            style={{
                                border: "2px solid #000",
                                borderRadius: 8,
                                background: active ? "#FEF3B8" : "#fff",
                                boxShadow: active ? "2px 2px 0 #000" : "none",
                                padding: 8,
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => onToggleVisibility(layer.id)}
                                    aria-label={`Toggle ${layer.name} visibility`}
                                    title={layer.visible ? "Hide layer" : "Show layer"}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "2px solid #000",
                                        borderRadius: 6,
                                        background: layer.visible ? "#FFE500" : "#fff",
                                        cursor: "pointer",
                                        padding: 0,
                                        color: "#000",
                                    }}
                                >
                                    {layer.visible ? <Eye size={13} strokeWidth={2.4} /> : <EyeOff size={13} strokeWidth={2.4} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onSelectLayer(layer.id)}
                                    style={{
                                        flex: 1,
                                        textAlign: "left",
                                        fontFamily: MONO,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.5,
                                        color: "#000",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                    }}
                                >
                                    {layer.name}
                                </button>
                            </div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                                {ROTATION_PRESETS.map((deg) => {
                                    const on = layer.rotation === deg;
                                    return (
                                        <button
                                            key={deg}
                                            type="button"
                                            onClick={() => onRotateLayer(layer.id, deg)}
                                            title={`${deg} degrees`}
                                            style={{
                                                fontFamily: MONO,
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: "2px 6px",
                                                border: "2px solid #000",
                                                borderRadius: 6,
                                                background: on ? "#000" : "#fff",
                                                color: on ? "#FFE500" : "#000",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {deg}°
                                        </button>
                                    );
                                })}
                                <input
                                    type="number"
                                    min={0}
                                    max={360}
                                    step={15}
                                    value={layer.rotation}
                                    onChange={(e) => onRotateLayer(layer.id, Number(e.target.value) || 0)}
                                    aria-label={`${layer.name} rotation`}
                                    style={{
                                        width: 58,
                                        fontFamily: MONO,
                                        fontSize: 11,
                                        padding: "2px 6px",
                                        border: "2px solid #000",
                                        borderRadius: 6,
                                        background: "#fff",
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
                {canAddLayer && (
                    <button
                        type="button"
                        onClick={onAddLayer}
                        aria-label="Add layer"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "6px 10px",
                            fontFamily: MONO,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                            color: "#000",
                            background: "#fff",
                            border: "2px dashed #000",
                            borderRadius: 8,
                            cursor: "pointer",
                        }}
                    >
                        <Plus size={13} strokeWidth={2.4} /> Layer
                    </button>
                )}
            </InspectorSection>

            {/* Smoothing */}
            <InspectorSection label="Smoothing">
                <Seg
                    options={[
                        { value: "squircle", label: "SQUIRCLE" },
                        { value: "smooth", label: "SMOOTH" },
                    ]}
                    value={smoothingMode}
                    onChange={onSmoothingModeChange}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={alpha}
                        onChange={(e) => onAlphaChange(parseFloat(e.target.value))}
                        aria-label="Smoothing amount"
                        style={{ flex: 1, accentColor: "#dc2626" }}
                    />
                    <span
                        style={{
                            fontFamily: MONO,
                            fontSize: 11,
                            fontWeight: 700,
                            minWidth: 36,
                            textAlign: "right",
                        }}
                    >
                        {alpha.toFixed(2)}
                    </span>
                </div>
            </InspectorSection>

            {/* Export */}
            <InspectorSection label="Export">
                <Seg
                    options={[
                        { value: "light", label: "LIGHT" },
                        { value: "dark", label: "DARK" },
                        { value: "adaptive", label: "AUTO" },
                    ]}
                    value={exportMode}
                    onChange={onExportModeChange}
                />
                <div style={{ display: "flex", gap: 6 }}>
                    {exportBtn("SVG", onExportSvg, true)}
                    {exportBtn("1×", () => onExportPng(1))}
                    {exportBtn("2×", () => onExportPng(2))}
                    {exportBtn("4×", () => onExportPng(4))}
                </div>
            </InspectorSection>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Main app                                                            */
/* ------------------------------------------------------------------ */

export default function LogoDesignerApp() {
    const gridRef = useRef(new Grid(16));
    const layerManagerRef = useRef(new LayerManager());
    const historyRef = useRef(new History());

    const [version, setVersion] = useState(0);
    const [activeColor, setActiveColor] = useState("#000000");
    const [alpha, setAlpha] = useState(0.5);
    const [smoothingMode, setSmoothingMode] = useState<SmoothingMode>("smooth");
    const [smoothedResult, setSmoothedResult] = useState<SmoothedLayerResult[]>([]);
    const [exportMode, setExportMode] = useState<ExportMode>("light");
    const [gridSizeInput, setGridSizeInput] = useState("16");
    const [activeTool, setActiveTool] = useState<Tool>(Tool.Draw);
    const [toolOptions, setToolOptions] = useState<ToolOptions>(DEFAULT_TOOL_OPTIONS);
    const [zoom, setZoom] = useState(1);
    const [cursorPos, setCursorPos] = useState<{ row: number; col: number } | null>(null);

    const layerManager = layerManagerRef.current;
    const history = historyRef.current;

    // Initialize layers in grid
    useEffect(() => {
        const g = gridRef.current;
        const lm = layerManagerRef.current;
        for (const layer of lm.layers) {
            g.initLayer(layer.id);
        }
        setVersion(1);
    }, []);

    // Compute smoothed paths (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            const g = gridRef.current;
            const lm = layerManagerRef.current;
            setSmoothedResult(computeSmoothedPaths(g, lm, alpha, smoothingMode));
        }, 100);
        return () => clearTimeout(timer);
    }, [version, alpha, smoothingMode]);

    const bump = useCallback(() => setVersion((v) => v + 1), []);

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT" ||
                    target.isContentEditable)
            ) {
                return;
            }
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                historyRef.current.undo();
                setGridSizeInput(String(gridRef.current.n));
                setVersion((v) => v + 1);
            } else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
                e.preventDefault();
                historyRef.current.redo();
                setGridSizeInput(String(gridRef.current.n));
                setVersion((v) => v + 1);
            }
            // Tool shortcuts
            if (!mod && !e.shiftKey) {
                switch (e.key) {
                    case "d": setActiveTool(Tool.Draw); break;
                    case "e": setActiveTool(Tool.Erase); break;
                    case "l": setActiveTool(Tool.Line); break;
                    case "r": setActiveTool(Tool.Rectangle); break;
                    case "o": setActiveTool(Tool.Ellipse); break;
                    case "f": setActiveTool(Tool.Fill); break;
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Drawing complete
    const handleStrokeComplete = useCallback(
        (
            layerId: string,
            changes: Array<{
                row: number;
                col: number;
                before: CellData;
                after: CellData;
            }>,
        ) => {
            const cmd = new DrawStrokeCommand(gridRef.current, layerId, changes);
            historyRef.current.push(cmd);
            bump();
        },
        [bump],
    );

    // Undo / Redo
    function handleUndo() {
        history.undo();
        setGridSizeInput(String(gridRef.current.n));
        bump();
    }

    function handleRedo() {
        history.redo();
        setGridSizeInput(String(gridRef.current.n));
        bump();
    }

    // Grid resize
    function handleResize(newN: number) {
        const clamped = clampGridSize(newN);
        if (clamped === gridRef.current.n) return;
        const oldGrid = gridRef.current;
        const newGrid = resizeGrid(oldGrid, layerManager, clamped);
        const cmd = new ResizeCommand(
            (g) => {
                gridRef.current = g;
            },
            oldGrid,
            newGrid,
        );
        gridRef.current = newGrid;
        history.push(cmd);
        setGridSizeInput(String(clamped));
        bump();
    }

    function handleGridSizeSubmit() {
        const val = parseInt(gridSizeInput, 10);
        if (!isNaN(val)) {
            handleResize(val);
        } else {
            setGridSizeInput(String(gridRef.current.n));
        }
    }

    // Layer actions
    function handleSelectLayer(id: string) {
        layerManager.setActiveLayer(id);
        bump();
    }

    function handleToggleVisibility(id: string) {
        layerManager.toggleVisibility(id);
        bump();
    }

    function handleAddLayer() {
        const layer = layerManager.addLayer();
        gridRef.current.initLayer(layer.id);
        bump();
    }

    function handleRotateLayer(id: string, degrees: number) {
        layerManager.setRotation(id, degrees);
        bump();
    }

    // Tool options
    function handleBrushSizeChange(size: 1 | 2 | 3 | 4) {
        setToolOptions((prev) => ({ ...prev, brushSize: size }));
    }

    function handleSymmetryChange(mode: SymmetryMode) {
        setToolOptions((prev) => ({ ...prev, symmetry: mode }));
    }

    function handleShapeFilledChange(filled: boolean) {
        setToolOptions((prev) => ({ ...prev, shapeFilled: filled }));
    }

    // Export
    function buildExportConfig(): ExportConfig {
        const n = gridRef.current.n;
        return {
            width: n + 2,
            height: n + 2,
            layers: smoothedResult,
            background: { type: "transparent" },
            mode: exportMode,
            lightBg: "#ffffff",
            darkBg: "#000000",
            lightFg: "#000000",
            darkFg: "#ffffff",
        };
    }

    function handleExportSvg() {
        const config = buildExportConfig();
        const svg = exportSvg(config);
        const filename = generateFilename("svg", { mode: exportMode });
        downloadSvg(svg, filename);
    }

    async function handleExportPng(scale: PngScale) {
        const config = buildExportConfig();
        const blob = await exportPng(config, scale);
        downloadPng(blob, scale, `logo-${exportMode}`);
    }

    const canUndo = history.canUndo;
    const canRedo = history.canRedo;
    const layers = layerManager.layers;
    const activeLayerId = layerManager.activeLayerId;
    const canAddLayer = layers.length < 3;
    const activeLayer = layerManager.getActiveLayer();
    const gridN = gridRef.current.n;

    const iconBtnStyle = (active: boolean, disabled: boolean): CSSProperties => ({
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #000",
        borderRadius: 8,
        background: active ? "#FFE500" : "#fff",
        boxShadow: active ? "2px 2px 0 #000" : "none",
        transform: active ? "translate(-1px,-1px)" : "none",
        color: "#000",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "default" : "pointer",
        padding: 0,
    });

    const statusItem: CSSProperties = {
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "#52525b",
        whiteSpace: "nowrap",
    };

    return (
        <section
            style={{
                maxWidth: 1240,
                margin: "0 auto",
                padding: "clamp(16px, 3vw, 28px) clamp(12px, 3vw, 24px) 60px",
            }}
        >
            <header style={{ marginBottom: 18 }}>
                <Kicker>CreatorsKit Studio</Kicker>
                <h1
                    style={{
                        fontSize: "clamp(26px, 4vw, 38px)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: -0.5,
                        lineHeight: 1.05,
                        margin: "4px 0 8px",
                    }}
                >
                    Logo Designer
                </h1>
                <p style={{ fontSize: 14, color: "#3f3f46", maxWidth: 720, margin: 0 }}>
                    Paint your mark on the pixel grid — every stroke gets smoothed into clean vector
                    curves. Up to 3 layers, mirror symmetry, per-layer rotation, and production-ready
                    SVG / PNG export up to 4×. Everything runs in your browser.
                </p>
            </header>

            {/* Editor card */}
            <div
                style={{
                    background: "#fff",
                    border: "3px solid #000",
                    borderRadius: 10,
                    boxShadow: "6px 6px 0 #000",
                    overflow: "hidden",
                    marginBottom: 16,
                }}
            >
                {/* Toolbar */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        padding: "10px 14px",
                        borderBottom: "3px solid #000",
                        background: "#fff",
                    }}
                >
                    <div style={{ display: "flex", gap: 6 }}>
                        {Object.values(Tool).map((tool) => {
                            const { label, icon } = TOOL_ICONS[tool];
                            return (
                                <button
                                    key={tool}
                                    type="button"
                                    title={`${label} (${label[0].toUpperCase()})`}
                                    aria-label={label}
                                    onClick={() => setActiveTool(tool)}
                                    style={iconBtnStyle(activeTool === tool, false)}
                                >
                                    {icon}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ width: 2, alignSelf: "stretch", background: "#000", opacity: 0.15 }} />

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ ...statusItem, color: "#dc2626" }}>GRID</span>
                        <input
                            type="text"
                            value={gridSizeInput}
                            onChange={(e) => setGridSizeInput(e.target.value)}
                            onBlur={handleGridSizeSubmit}
                            onKeyDown={(e) => e.key === "Enter" && handleGridSizeSubmit()}
                            aria-label={`Grid size (${GRID_MIN}-${GRID_MAX})`}
                            style={{
                                width: 56,
                                fontFamily: MONO,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "6px 8px",
                                border: "2px solid #000",
                                borderRadius: 8,
                                background: "#fff",
                            }}
                        />
                        {[16, 24, 32, 48].map((size) => {
                            const on = gridN === size;
                            return (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => handleResize(size)}
                                    style={{
                                        fontFamily: MONO,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "5px 7px",
                                        border: "2px solid #000",
                                        borderRadius: 8,
                                        background: on ? "#000" : "#fff",
                                        color: on ? "#FFE500" : "#000",
                                        cursor: "pointer",
                                    }}
                                >
                                    {size}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ width: 2, alignSelf: "stretch", background: "#000", opacity: 0.15 }} />

                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        aria-label="Undo"
                        title="Undo (Ctrl/Cmd+Z)"
                        style={iconBtnStyle(false, !canUndo)}
                    >
                        <Undo2 size={16} strokeWidth={2.2} />
                    </button>
                    <button
                        type="button"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        aria-label="Redo"
                        title="Redo (Ctrl/Cmd+Shift+Z)"
                        style={iconBtnStyle(false, !canRedo)}
                    >
                        <Redo2 size={16} strokeWidth={2.2} />
                    </button>

                    <div style={{ flex: 1 }} />

                    <button
                        type="button"
                        onClick={handleExportSvg}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 14px",
                            fontFamily: MONO,
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                            color: "#000",
                            background: "#FFE500",
                            border: "3px solid #000",
                            borderRadius: 8,
                            boxShadow: "3px 3px 0 #000",
                            cursor: "pointer",
                        }}
                    >
                        <Download size={14} strokeWidth={2.5} /> SVG
                    </button>
                </div>

                {/* Workspace */}
                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        padding: 12,
                        background: "#f4f4f5",
                    }}
                >
                    <div style={{ flex: "1 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <Kicker>Draw</Kicker>
                        <PixelCanvas
                            grid={gridRef.current}
                            layerManager={layerManager}
                            activeColor={activeColor}
                            activeTool={activeTool}
                            toolOptions={toolOptions}
                            version={version}
                            onStrokeComplete={handleStrokeComplete}
                            onCursorChange={setCursorPos}
                            zoom={zoom}
                            onZoomChange={setZoom}
                        />
                    </div>

                    <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <Kicker>Preview</Kicker>
                        <PreviewPanel smoothedResult={smoothedResult} gridSize={gridN} />
                    </div>

                    <div style={{ flex: "1 1 250px", minWidth: 240 }}>
                        <Inspector
                            activeTool={activeTool}
                            toolOptions={toolOptions}
                            onBrushSizeChange={handleBrushSizeChange}
                            onSymmetryChange={handleSymmetryChange}
                            onShapeFilledChange={handleShapeFilledChange}
                            activeColor={activeColor}
                            onColorChange={setActiveColor}
                            layers={layers}
                            activeLayerId={activeLayerId}
                            canAddLayer={canAddLayer}
                            onSelectLayer={handleSelectLayer}
                            onToggleVisibility={handleToggleVisibility}
                            onAddLayer={handleAddLayer}
                            onRotateLayer={handleRotateLayer}
                            alpha={alpha}
                            onAlphaChange={setAlpha}
                            smoothingMode={smoothingMode}
                            onSmoothingModeChange={setSmoothingMode}
                            exportMode={exportMode}
                            onExportModeChange={setExportMode}
                            onExportSvg={handleExportSvg}
                            onExportPng={handleExportPng}
                        />
                    </div>
                </div>

                {/* Status bar */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        padding: "8px 14px",
                        borderTop: "3px solid #000",
                        background: "#fff",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={statusItem}>{Math.round(zoom * 100)}%</span>
                        <span style={statusItem}>
                            {gridN}×{gridN}
                        </span>
                        <span style={statusItem}>
                            {cursorPos ? `R${cursorPos.row} C${cursorPos.col}` : "R– C–"}
                        </span>
                        <span style={statusItem}>{activeLayer.name}</span>
                    </div>
                    <span style={{ ...statusItem, color: "#a1a1aa" }}>
                        Scroll zoom · Space+drag pan · Dbl-click reset
                    </span>
                </div>
            </div>

            {/* Shortcuts */}
            <div
                style={{
                    background: "#fff",
                    border: "3px solid #000",
                    borderRadius: 10,
                    boxShadow: "5px 5px 0 #000",
                    padding: "clamp(14px, 2.5vw, 20px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                }}
            >
                <Kicker>Shortcuts & Moves</Kicker>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                        ["D", "Draw"],
                        ["E", "Erase"],
                        ["L", "Line"],
                        ["R", "Rectangle"],
                        ["O", "Ellipse"],
                        ["F", "Fill"],
                        ["⌘Z", "Undo"],
                        ["⌘⇧Z", "Redo"],
                        ["SCROLL", "Zoom"],
                        ["SPACE+DRAG", "Pan"],
                        ["2× CLICK", "Reset view"],
                    ].map(([kbd, desc]) => (
                        <span
                            key={kbd}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 8px 4px 4px",
                                border: "2px solid #000",
                                borderRadius: 8,
                                background: "#fff",
                                boxShadow: "2px 2px 0 #000",
                                fontFamily: MONO,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 0.5,
                                textTransform: "uppercase",
                            }}
                        >
                            <span
                                style={{
                                    padding: "2px 6px",
                                    background: "#000",
                                    color: "#FFE500",
                                    borderRadius: 5,
                                }}
                            >
                                {kbd}
                            </span>
                            {desc}
                        </span>
                    ))}
                </div>
                <p style={{ fontSize: 13, color: "#52525b", margin: 0, maxWidth: 820 }}>
                    Grid sizes run {GRID_MIN}–{GRID_MAX}. Turn on mirror symmetry to ink both halves at
                    once, dial the smoothing slider to control how aggressively corners round off, then
                    export a transparent-background SVG or a crisp PNG at 1×, 2× or 4×.
                </p>
            </div>
        </section>
    );
}
