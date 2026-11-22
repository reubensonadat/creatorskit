"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import { Undo2, Redo2, Download } from "lucide-react";
import { Grid, clampGridSize, GRID_MIN, GRID_MAX } from "../../lib/logo-designer/models/grid";
import type { CellData } from "../../lib/logo-designer/models/grid";
import { LayerManager } from "../../lib/logo-designer/models/layers";
import { History, DrawStrokeCommand, ResizeCommand } from "../../lib/logo-designer/canvas/history";
import { resizeGrid } from "../../lib/logo-designer/canvas/resize";
import { computeSmoothedPaths } from "../../lib/logo-designer/smoothing/slider";
import type { SmoothedLayerResult, SmoothingMode } from "../../lib/logo-designer/smoothing/slider";
import { exportSvg, exportPng } from "../../lib/logo-designer/export/integration";
import type { ExportConfig } from "../../lib/logo-designer/export/integration";
import type { PngScale } from "../../lib/logo-designer/export/png";
import { downloadSvg, downloadPng, generateFilename } from "../../lib/logo-designer/export/download";
import { Tool, DEFAULT_TOOL_OPTIONS } from "../../lib/logo-designer/models/tools";
import type { ToolOptions, SymmetryMode } from "../../lib/logo-designer/models/tools";
import {
    PixelCanvas,
    PreviewPanel,
    Inspector,
    TOOL_ICONS,
    Kicker,
    MONO,
    type ExportMode,
} from "./editor-parts";

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

    const squareToolBtn: CSSProperties = {
        width: 34,
        height: 34,
        padding: 0,
        gap: 0,
    };

    const statusItem: CSSProperties = {
        fontFamily: MONO,
        fontSize: "0.68rem",
        fontWeight: 800,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "#666",
        whiteSpace: "nowrap",
    };

    return (
        <div
            className="tool-page-padding"
            style={{
                position: "relative",
                minHeight: "calc(100vh - 60px)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxSizing: "border-box",
                width: "100%",
            }}
        >
            <div
                style={{
                    maxWidth: 1200,
                    width: "100%",
                    margin: "0 auto",
                    padding: "40px 24px",
                    position: "relative",
                    zIndex: 1,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Top title section (house treatment) */}
                <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                            style={{
                                fontSize: "0.68rem",
                                fontWeight: 900,
                                padding: "3px 8px",
                                border: "2px solid #000",
                                background: "#000",
                                color: "#fff",
                                fontFamily: "monospace",
                            }}
                        >
                            LOGO DESIGNER STUDIO
                        </span>
                        <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
                            PIXEL GRID → SMOOTH VECTORS · LAYERS · SYMMETRY · SVG/PNG EXPORT
                        </span>
                    </div>
                    <h1
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: 900,
                            letterSpacing: "-0.03em",
                            margin: 0,
                            textTransform: "uppercase",
                        }}
                    >
                        Logo Designer
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "#666", margin: 0, maxWidth: 720 }}>
                        Paint your mark on the pixel grid — every stroke gets smoothed into clean vector
                        curves. Up to 3 layers, mirror symmetry, per-layer rotation, undo/redo, and
                        production-ready SVG / PNG export up to 4×. Everything runs in your browser.
                    </p>
                </div>

                {/* Editor card */}
                <div
                    className="brutalist-card"
                    style={{ overflow: "hidden", marginBottom: 24 }}
                >
                    {/* Toolbar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                            padding: "10px 14px",
                            borderBottom: "2px solid #000",
                            background: "#fff",
                        }}
                    >
                        <div style={{ display: "flex", gap: 6 }}>
                            {Object.values(Tool).map((tool) => {
                                const { label, icon } = TOOL_ICONS[tool];
                                const active = activeTool === tool;
                                return (
                                    <button
                                        key={tool}
                                        type="button"
                                        title={`${label} (${label[0].toUpperCase()})`}
                                        aria-label={label}
                                        onClick={() => setActiveTool(tool)}
                                        className={`brutalist-button${active ? " brutalist-button-dark" : ""}`}
                                        style={{
                                            ...squareToolBtn,
                                            boxShadow: active ? "inset 2px 2px 0 rgba(0,0,0,0.35)" : undefined,
                                        }}
                                    >
                                        {icon}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ width: 2, height: 32, background: "rgba(0,0,0,0.12)" }} />

                        {/* Grid size */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: MONO, fontSize: "0.68rem", fontWeight: 900, color: "#dc2626" }}>
                                GRID
                            </span>
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
                                    fontSize: "0.76rem",
                                    fontWeight: 900,
                                    padding: "6px 8px",
                                    border: "2px solid #000",
                                    borderRadius: 4,
                                    background: "#fff",
                                    textAlign: "center",
                                }}
                            />
                            {[16, 24, 32, 48].map((size) => {
                                const on = gridN === size;
                                return (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => handleResize(size)}
                                        className={`brutalist-button${on ? " brutalist-button-dark" : ""}`}
                                        style={{ padding: "5px 8px", fontSize: "0.68rem", gap: 0, boxShadow: "none" }}
                                    >
                                        {size}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ width: 2, height: 32, background: "rgba(0,0,0,0.12)" }} />

                        {/* History */}
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={!canUndo}
                            aria-label="Undo"
                            title="Undo (Ctrl/Cmd+Z)"
                            className="brutalist-button"
                            style={squareToolBtn}
                        >
                            <Undo2 size={16} strokeWidth={2.2} />
                        </button>
                        <button
                            type="button"
                            onClick={handleRedo}
                            disabled={!canRedo}
                            aria-label="Redo"
                            title="Redo (Ctrl/Cmd+Shift+Z)"
                            className="brutalist-button"
                            style={squareToolBtn}
                        >
                            <Redo2 size={16} strokeWidth={2.2} />
                        </button>

                        <div style={{ flex: 1 }} />

                        {/* Primary export CTA */}
                        <button
                            type="button"
                            onClick={handleExportSvg}
                            className="brutalist-button brutalist-button-primary"
                            style={{ padding: "8px 16px" }}
                        >
                            <Download size={14} strokeWidth={2.5} /> EXPORT SVG
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
                        <div
                            style={{
                                flex: "1 1 360px",
                                minWidth: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
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

                        <div
                            style={{
                                flex: "1 1 240px",
                                minWidth: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
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
                            borderTop: "2px solid #000",
                            background: "#fff",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
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

                {/* Shortcuts & moves */}
                <div
                    className="brutalist-card"
                    style={{
                        padding: "clamp(14px, 2.5vw, 20px)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <Kicker>Shortcuts & Moves</Kicker>
                        <span
                            style={{
                                fontSize: "0.68rem",
                                fontWeight: 900,
                                background: "#000",
                                color: "#fff",
                                padding: "2px 8px",
                                border: "1.5px solid #000",
                                fontFamily: "monospace",
                            }}
                        >
                            {GRID_MIN}–{GRID_MAX} GRID
                        </span>
                    </div>
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
                                    borderRadius: 4,
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
                                        borderRadius: 3,
                                    }}
                                >
                                    {kbd}
                                </span>
                                {desc}
                            </span>
                        ))}
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "#666", margin: 0, maxWidth: 820 }}>
                        Turn on mirror symmetry to ink both halves at once, dial the smoothing scrubber to
                        control how aggressively corners round off, then export a transparent-background SVG
                        or a crisp PNG at 1×, 2× or 4×.
                    </p>
                </div>
            </div>
        </div>
    );
}
