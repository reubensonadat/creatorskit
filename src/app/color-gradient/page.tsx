"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { 
  ChevronLeft, 
  RefreshCw, 
  Heart,
  Info,
  ArrowUpDown,
  Wand2,
  Palette,
  Plus,
  Trash2,
  Download,
  Paintbrush,
  Search
} from "lucide-react";
import Link from "next/link";

interface ColorCombo {
  id: number;
  primaryName: string;
  primaryHex: string;
  secondaryName: string;
  secondaryHex: string;
  primaryBias: number;
  secondaryBias: number;
  relationType: string;
}

const CREATOR_QUOTES = [
  "A harmonious palette breathes life into digital concepts.",
  "Good contrast makes readability effortless for creators.",
  "Every color pair holds a conversation; make it memorable.",
  "Design is the silent ambassador of your creative brand.",
  "Simplicity is the ultimate sophistication in layout design.",
  "Shape your typography, frame your story, captivate your audience.",
  "Color theory is where physics meets human emotion.",
  "Empowering browser-based workflows for creators worldwide.",
  "Contrast isn't just aesthetic; it's accessibility.",
  "Crafting smooth interfaces with sharp brutalist layouts.",
  "Find color combinations that inspire, test, and perform.",
  "Visual clarity is the shortest path to great storytelling."
];

interface MeshNode {
  id: number;
  color: string;
  x: number;
  y: number;
}

const INITIAL_NODES: MeshNode[] = [
  { id: 1, color: "#0F2F65", x: 25, y: 25 },
  { id: 2, color: "#E687D8", x: 50, y: 15 },
  { id: 3, color: "#347BD1", x: 80, y: 25 },
  { id: 4, color: "#6890E2", x: 25, y: 65 },
  { id: 5, color: "#07265C", x: 50, y: 70 },
  { id: 6, color: "#A88BDF", x: 80, y: 65 },
];

// Helper: HSL to Hex
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Helper: Hex to HSL
const hexToHsl = (hex: string) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) return { h: 0, s: 0, l: 0 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

const getColorName = (hex: string): string => {
  const { h, s, l } = hexToHsl(hex);
  
  // Calculate a stable hash from hex string to select prefixes and base names
  let hash = 0;
  for (let i = 1; i < hex.length; i++) {
    hash = hex.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const lightPrefixes = ["Pale", "Soft", "Alabaster", "Frosted", "Powder", "Ice", "Mist", "Cotton", "Glinting", "Pearly"];
  const darkPrefixes = ["Deep", "Midnight", "Obsidian", "Charcoal", "Shadow", "Imperial", "Dark", "Rich", "Ebon", "Vesper"];
  const vibrantPrefixes = ["Electric", "Vibrant", "Neon", "Luminous", "Laser", "Cosmic", "Hyper", "Solar", "Glow", "Radiant"];
  const neutralPrefixes = ["Dusty", "Muted", "Slate", "Smoke", "Clay", "Pebble", "Driftwood", "Ash", "Sandy", "Fossil"];

  // Incorporate saturation and lightness into the prefix selector as well
  const prefixIndex = (hash + h + s + l) % 10;
  let prefix = "";
  if (l > 82) {
    prefix = lightPrefixes[prefixIndex];
  } else if (l < 22) {
    prefix = darkPrefixes[prefixIndex];
  } else if (s > 68) {
    prefix = vibrantPrefixes[prefixIndex];
  } else {
    prefix = neutralPrefixes[prefixIndex];
  }

  // Base color name based on HSL hue spectrum and exact color characteristics
  let base = "";
  const nameIndex = (hash + h + s + l) % 6;
  if (h < 15) base = ["Rose", "Ruby", "Crimson", "Scarlet", "Clay", "Cherry"][nameIndex];
  else if (h < 45) base = ["Coral", "Amber", "Terracotta", "Sunset", "Peach", "Rust"][nameIndex];
  else if (h < 75) base = ["Gold", "Saffron", "Sand", "Ochre", "Ginger", "Straw"][nameIndex];
  else if (h < 150) base = ["Sage", "Olive", "Forest", "Emerald", "Basil", "Fern"][nameIndex];
  else if (h < 180) base = ["Mint", "Teal", "Turquoise", "Jungle", "Pine", "Jade"][nameIndex];
  else if (h < 210) base = ["Cyan", "Ocean", "Sky", "Cobalt", "Lagoon", "Marine"][nameIndex];
  else if (h < 240) base = ["Danube", "Sapphire", "Navy", "Indigo", "Slate", "Azure"][nameIndex];
  else if (h < 270) base = ["Amethyst", "Lavender", "Lilac", "Wisteria", "Violet", "Orchid"][nameIndex];
  else if (h < 310) base = ["Plum", "Magenta", "Orchid", "Fuchsia", "Mulberry", "Eggplant"][nameIndex];
  else base = ["Cherry", "Rosewood", "Plush", "Burgundy", "Wine", "Berry"][nameIndex];

  return `${prefix} ${base}`;
};

const colorNameToHex: { [key: string]: string } = {
  black: "#000000",
  white: "#ffffff",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  charcoal: "#2e2e2e",
  red: "#ff0000",
  crimson: "#dc143c",
  orange: "#ff8c00",
  yellow: "#ffd700",
  gold: "#ffd700",
  green: "#2e7d32",
  mint: "#a7f3d0",
  teal: "#008080",
  blue: "#2563eb",
  danube: "#5e9bc6",
  navy: "#000080",
  indigo: "#4b0082",
  purple: "#800080",
  violet: "#ee82ee",
  magenta: "#ff00ff",
  pink: "#ffc0cb",
  rose: "#ff007f",
  lime: "#00ff00",
  cyan: "#00ffff",
  brown: "#8b4513",
  olive: "#808000",
  beige: "#f5f5dc",
  cream: "#fffdd0"
};

// Map search words to approximate base hues
const wordToHueMap: { [key: string]: number } = {
  red: 0,
  crimson: 350,
  orange: 30,
  amber: 45,
  yellow: 60,
  green: 120,
  sage: 135,
  mint: 155,
  teal: 185,
  cyan: 195,
  blue: 220,
  danube: 215,
  indigo: 245,
  purple: 270,
  violet: 280,
  magenta: 310,
  pink: 330,
};

export default function ColorGradientPage() {
  const [activeTab, setActiveTab] = useState<"combinations" | "mesh">("combinations");

  // Base user selected color to drive ALL dynamic combinations
  const [baseColor, setBaseColor] = useState("#5E9BC6"); // default Danube Blue
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedComboId, setSelectedComboId] = useState<number>(1);
  const [swappedIds, setSwappedIds] = useState<number[]>([]);

  // Tab 2: Mesh State
  const [nodes, setNodes] = useState<MeshNode[]>(INITIAL_NODES);
  const [noiseOpacity, setNoiseOpacity] = useState(0.12);
  const [warpSize, setWarpSize] = useState(65);
  const [warpAmount, setWarpAmount] = useState(40);
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Automatically update the baseColor if query matches color keywords or hex pattern
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q.startsWith("#") && (q.length === 7 || q.length === 4)) {
      setBaseColor(q);
    } else if (colorNameToHex[q] !== undefined) {
      setBaseColor(colorNameToHex[q]);
    } else if (wordToHueMap[q] !== undefined) {
      const hue = wordToHueMap[q];
      setBaseColor(hslToHex(hue, 60, 50));
    }
  }, [searchQuery]);

  // Dynamic Generator Engine based on baseColor HSL physics
  const combos = useMemo<ColorCombo[]>(() => {
    const { h: baseH, s: baseS, l: baseL } = hexToHsl(baseColor);
    
    // Check if the selected color is neutral (low saturation, or pure black/white)
    const isBaseNeutral = baseS <= 8 || baseL < 10 || baseL > 90;

    // Generate 12 variations using specific physical relationship offsets
    const relations = [
      { name: "Monochromatic (Light)", mode: "mono", hueOffset: 0, isDarkBg: false },
      { name: "Monochromatic (Dark)", mode: "mono", hueOffset: 0, isDarkBg: true },
      { name: "Analogous Cool", mode: "analogous", hueOffset: -30, isDarkBg: true },
      { name: "Analogous Warm", mode: "analogous", hueOffset: 30, isDarkBg: false },
      { name: "Complementary Contrast", mode: "complementary", hueOffset: 180, isDarkBg: true },
      { name: "Complementary Accent", mode: "complementary", hueOffset: 180, isDarkBg: false },
      { name: "Split Comp Right", mode: "split", hueOffset: 150, isDarkBg: true },
      { name: "Split Comp Left", mode: "split", hueOffset: -150, isDarkBg: false },
      { name: "Triadic Balance", mode: "triadic", hueOffset: 120, isDarkBg: true },
      { name: "Triadic Contrast", mode: "triadic", hueOffset: 240, isDarkBg: false },
      { name: "Dual Shade", mode: "mono", hueOffset: 10, isDarkBg: true },
      { name: "High Contrast", mode: "complementary", hueOffset: 180, isDarkBg: false },
    ];

    // Vibrant accent colors to match with black/white/grey
    const vibrantAccents = [
      "#FFFFFF", // white
      "#EF4444", // red
      "#F97316", // orange
      "#EAB308", // yellow
      "#22C55E", // green
      "#06B6D4", // cyan
      "#3B82F6", // blue
      "#6366F1", // indigo
      "#A855F7", // purple
      "#EC4899", // pink
      "#1E2224", // charcoal
      "#F1F5F9", // slate light
    ];

    return relations.map((rel, index) => {
      let primaryHex = "";
      let secondaryHex = "";

      if (isBaseNeutral) {
        // If base color is neutral, pair baseColor (e.g. black) with one of our high contrast vibrant colors
        let accentColor = vibrantAccents[index % vibrantAccents.length];
        
        // If base is white and accent is white, swap it to black
        if (baseL > 90 && accentColor === "#FFFFFF") {
          accentColor = "#1E2224";
        }
        // If base is black and accent is black/charcoal, swap it to white
        if (baseL < 10 && (accentColor === "#1E2224" || accentColor === "#000000")) {
          accentColor = "#FFFFFF";
        }

        // Order text & bg based on isDarkBg layout context
        if (rel.isDarkBg) {
          primaryHex = accentColor;
          secondaryHex = baseColor;
        } else {
          primaryHex = baseColor;
          secondaryHex = accentColor;
        }
      } else {
        const targetH = (baseH + rel.hueOffset + 360) % 360;
        
        // Determine Lightness values based on role (text vs bg) to ensure readability
        const lBg = rel.isDarkBg ? 12 : 94;
        const lText = rel.isDarkBg ? 82 : 12;

        // Keep saturation within comfortable guidelines (not too bright/neons)
        const clampedS = Math.min(85, Math.max(35, baseS));

        primaryHex = hslToHex(baseH, clampedS, lText);
        secondaryHex = hslToHex(targetH, clampedS, lBg);
      }

      return {
        id: index + 1,
        primaryName: getColorName(primaryHex),
        primaryHex,
        secondaryName: getColorName(secondaryHex),
        secondaryHex,
        primaryBias: rel.isDarkBg ? 45 : 85,
        secondaryBias: rel.isDarkBg ? 85 : 45,
        relationType: rel.name,
      };
    });
  }, [baseColor]);

  // Selected combo inspectors
  const selectedCombo = useMemo(() => {
    const original = combos.find((c) => c.id === selectedComboId) || combos[0];
    const isSwapped = swappedIds.includes(original.id);
    if (isSwapped) {
      return {
        ...original,
        primaryHex: original.secondaryHex,
        primaryName: original.secondaryName,
        primaryBias: original.secondaryBias,
        secondaryHex: original.primaryHex,
        secondaryName: original.primaryName,
        secondaryBias: original.primaryBias,
      };
    }
    return original;
  }, [combos, selectedComboId, swappedIds]);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    );
  };

  const toggleSwap = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSwappedIds((prev) =>
      prev.includes(id) ? prev.filter((swId) => swId !== id) : [...prev, id]
    );
  };

  const randomizeBaseColor = () => {
    const randomHex = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    setBaseColor(randomHex());
    setSwappedIds([]);
  };

  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (r: number, g: number, b: number) => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const getContrastRatio = (c1: string, c2: string) => {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    if (!rgb1 || !rgb2) return 1.0;
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b) + 0.05;
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  };

  // Mesh dragging callbacks
  const handleMouseDown = (id: number) => {
    setDraggingNodeId(id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingNodeId === null || !previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;
      
      const x = Math.min(100, Math.max(0, rawX));
      const y = Math.min(100, Math.max(0, rawY));

      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x, y } : n))
      );
    };

    const handleMouseUp = () => {
      setDraggingNodeId(null);
    };

    if (draggingNodeId !== null) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingNodeId]);

  const handleNodeColorChange = (id: number, color: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
  };

  const deleteNode = (id: number) => {
    if (nodes.length <= 2) return;
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const addRandomNode = () => {
    const randomHex = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    const nextId = nodes.length ? Math.max(...nodes.map((n) => n.id)) + 1 : 1;
    setNodes((prev) => [
      ...prev,
      {
        id: nextId,
        color: randomHex(),
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
      },
    ]);
  };

  const shuffleMeshColors = () => {
    const randomHex = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    setNodes((prev) => prev.map((n) => ({ ...n, color: randomHex() })));
  };

  const exportMeshGradient = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1200, 1200);

    nodes.forEach((node) => {
      const gradX = (node.x / 100) * 1200;
      const gradY = (node.y / 100) * 1200;
      const radius = (warpSize / 100) * 1200 * 1.5;

      const gradient = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, radius);
      gradient.addColorStop(0, node.color);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 0, 1200, 1200);
    });

    ctx.globalAlpha = 1.0;

    if (noiseOpacity > 0) {
      const imgData = ctx.getImageData(0, 0, 1200, 1200);
      const data = imgData.data;
      const amount = noiseOpacity * 255 * 0.16;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * amount;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const link = document.createElement("a");
    link.download = "creatorkit-mesh-gradient.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      <div className="grid-bg" />

      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Top Title Section */}
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 8px", border: "2px solid #000", background: "#FFDD00", color: "#000", fontFamily: "monospace" }}>
              COLOR & GRADIENT STUDIO
            </span>
            <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
              MESH GRADIENTS · HARMONIC PALETTES · CSS CODE EXPORT
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, textTransform: "uppercase" }}>
            Color & Gradient Studio
          </h1>
        </div>

        {/* Studio Segment Tabs switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setActiveTab("combinations")}
            className="brutalist-button"
            style={{
              flex: 1,
              padding: "10px 16px",
              background: activeTab === "combinations" ? "#000000" : "#ffffff",
              color: activeTab === "combinations" ? "#FFE500" : "#000000",
              fontWeight: 900,
              fontSize: "0.82rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              boxShadow: activeTab === "combinations" ? "inset 2px 2px 0 rgba(0,0,0,0.3)" : "3px 3px 0 #000",
            }}
          >
            <Palette size={16} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }} />
            Combinations Lab
          </button>
          <button
            onClick={() => setActiveTab("mesh")}
            className="brutalist-button"
            style={{
              flex: 1,
              padding: "10px 16px",
              background: activeTab === "mesh" ? "#000000" : "#ffffff",
              color: activeTab === "mesh" ? "#FFE500" : "#000000",
              fontWeight: 900,
              fontSize: "0.82rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              boxShadow: activeTab === "mesh" ? "inset 2px 2px 0 rgba(0,0,0,0.3)" : "3px 3px 0 #000",
            }}
          >
            <Paintbrush size={16} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }} />
            Mesh Gradient Designer
          </button>
        </div>

        {/* Tab 1: Combinations view (Khroma replica) */}
        {activeTab === "combinations" && (
          <div>
            {/* Base Color Picker Panel */}
            <div
              className="brutalist-card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "20px 24px",
                marginBottom: 32,
                background: "#ffffff",
                flexWrap: "wrap",
              }}
            >
              {/* Select Base Brand Color */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    border: "3px solid #000000",
                    background: "#ffffff",
                    boxShadow: "3px 3px 0 #000000",
                  }}
                >
                  <Paintbrush size={22} />
                </div>
                <div>
                  <label className="label" style={{ display: "block", fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 800 }}>BASE BRAND COLOR</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <input
                      type="color"
                      value={baseColor}
                      onChange={(e) => setBaseColor(e.target.value)}
                      style={{
                        width: 44,
                        height: 30,
                        border: "2px solid #000000",
                        background: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                    <input
                      type="text"
                      value={baseColor.toUpperCase()}
                      onChange={(e) => {
                        if (e.target.value.startsWith("#") && e.target.value.length <= 7) {
                          setBaseColor(e.target.value);
                        }
                      }}
                      className="brutalist-input"
                      style={{
                        width: 90,
                        padding: "4px 8px",
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                        boxShadow: "none",
                        border: "2px solid #000",
                        textAlign: "center"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Vertical line divider */}
              <div style={{ width: 2, height: 40, background: "rgba(0,0,0,0.1)" }} />

              {/* Filter Search */}
              <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: 12, color: "var(--text-hint)" }}>
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Or search hues (e.g. blue, red, mint, green)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="brutalist-input"
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 42px",
                    fontSize: "0.88rem",
                    fontFamily: "monospace",
                    boxShadow: "none",
                    border: "3px solid #000",
                  }}
                />
              </div>

              <button className="brutalist-button brutalist-button-primary" onClick={randomizeBaseColor} style={{ gap: 6, height: 42 }}>
                <RefreshCw size={16} /> Randomize Base
              </button>
            </div>

            {/* Layout grids */}
            <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: 32, alignItems: "start" }}>
              {/* Left panel specs */}
              <div
                className="brutalist-card"
                style={{
                  background: "#1E2224",
                  color: "#ffffff",
                  padding: 24,
                  border: "3px solid #000000",
                  boxShadow: "6px 6px 0 #000000",
                  position: "sticky",
                  top: 24,
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 24 }}>
                  <div style={{ width: 32, height: 32, background: selectedCombo.primaryHex, border: "2px solid #ffffff" }} />
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ffffff" }}>
                      {selectedCombo.primaryName}
                    </h3>
                    <div style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.8, marginTop: 4 }}>
                      <div>HEX: {selectedCombo.primaryHex}</div>
                      <div>RGB: {hexToRgb(selectedCombo.primaryHex) ? `rgb(${hexToRgb(selectedCombo.primaryHex)?.r}, ${hexToRgb(selectedCombo.primaryHex)?.g}, ${hexToRgb(selectedCombo.primaryHex)?.b})` : "—"}</div>
                      <div>BIAS: {selectedCombo.primaryBias}%</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 32 }}>
                  <div style={{ width: 32, height: 32, background: selectedCombo.secondaryHex, border: "2px solid #ffffff" }} />
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ffffff" }}>
                      {selectedCombo.secondaryName}
                    </h3>
                    <div style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.8, marginTop: 4 }}>
                      <div>HEX: {selectedCombo.secondaryHex}</div>
                      <div>RGB: {hexToRgb(selectedCombo.secondaryHex) ? `rgb(${hexToRgb(selectedCombo.secondaryHex)?.r}, ${hexToRgb(selectedCombo.secondaryHex)?.g}, ${hexToRgb(selectedCombo.secondaryHex)?.b})` : "—"}</div>
                      <div>BIAS: {selectedCombo.secondaryBias}%</div>
                    </div>
                  </div>
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,0.15)", margin: "0 0 20px" }} />

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, opacity: 0.8 }}>WCAG Ratio:</span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 900,
                        padding: "2px 8px",
                        border: "2px solid #fff",
                        background: getContrastRatio(selectedCombo.primaryHex, selectedCombo.secondaryHex) >= 4.5 ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {getContrastRatio(selectedCombo.primaryHex, selectedCombo.secondaryHex) >= 4.5 ? "Pass" : "Fail"} ({getContrastRatio(selectedCombo.primaryHex, selectedCombo.secondaryHex).toFixed(2)}:1)
                    </span>
                  </div>
                  <p style={{ fontSize: "0.72rem", opacity: 0.6, lineHeight: 1.5 }}>
                    Contrast ratio measures readability. Standards recommend at least 4.5:1 for body copy.
                  </p>
                </div>
              </div>

              {/* Right combinations grids */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
                {combos.map((combo) => {
                  const isSwapped = swappedIds.includes(combo.id);
                  const txtColor = isSwapped ? combo.secondaryHex : combo.primaryHex;
                  const bgCol = isSwapped ? combo.primaryHex : combo.secondaryHex;
                  const isFav = favorites.includes(combo.id);

                  return (
                    <div
                      key={combo.id}
                      onClick={() => setSelectedComboId(combo.id)}
                      style={{
                        height: 290,
                        background: bgCol,
                        color: txtColor,
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        border: selectedComboId === combo.id ? "5px solid #1E2224" : "3px solid #000000",
                        boxShadow: "6px 6px 0 #000000",
                        cursor: "pointer",
                        position: "relative",
                        transition: "transform 0.15s ease",
                      }}
                      className="khroma-card"
                    >
                      <div
                        className="khroma-actions"
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          display: "flex",
                          gap: 8,
                          zIndex: 10,
                          background: "#ffffff",
                          border: "2px solid #000000",
                          padding: 4,
                        }}
                      >
                        <button
                          onClick={(e) => toggleSwap(combo.id, e)}
                          title="Swap Text & BG Color"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#000", padding: 4, display: "flex" }}
                        >
                          <ArrowUpDown size={16} />
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(combo.id, e)}
                          title="Favorite Combo"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: isFav ? "#ef4444" : "#000", padding: 4, display: "flex" }}
                        >
                          {isFav ? <Heart size={16} fill="currentColor" /> : <Heart size={16} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedComboId(combo.id); }}
                          title="View Specs"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#000", padding: 4, display: "flex" }}
                        >
                          <Info size={16} />
                        </button>
                      </div>

                      <div style={{ marginTop: 24 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.85 }}>
                          {combo.relationType}
                        </div>
                        <div style={{ fontSize: "1.15rem", fontWeight: 900, lineHeight: 1.2, marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                          <span>Text: {isSwapped ? combo.secondaryName : combo.primaryName} ({isSwapped ? combo.secondaryHex.toUpperCase() : combo.primaryHex.toUpperCase()})</span>
                          <span style={{ fontSize: "0.85rem", opacity: 0.8, fontWeight: 700 }}>BG: {isSwapped ? combo.primaryName : combo.secondaryName} ({isSwapped ? combo.primaryHex.toUpperCase() : combo.secondaryHex.toUpperCase()})</span>
                        </div>
                      </div>

                      <div style={{ fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.6, opacity: 0.9 }}>
                        {CREATOR_QUOTES[combo.id % CREATOR_QUOTES.length]}
                      </div>

                      <div style={{ position: "absolute", bottom: 12, right: 16, fontSize: "0.75rem", fontWeight: 800, opacity: 0.7, fontFamily: "monospace" }}>
                        {combo.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Mesh Gradient Designer (Photogradient replica - compact grid layout) */}
        {activeTab === "mesh" && (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 32, alignItems: "start" }}>
            
            {/* Left: Compact fixed aspect ratio preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                ref={previewContainerRef}
                style={{
                  width: 360,
                  height: 360,
                  border: "4px solid #000000",
                  boxShadow: "6px 6px 0 #000000",
                  background: "#1e1b4b",
                  position: "relative",
                  borderRadius: 24,
                  overflow: "hidden",
                }}
              >
                {/* CSS mesh radial overlay gradient layer */}
                <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                  {nodes.map((node) => (
                    <div
                      key={node.id}
                      style={{
                        position: "absolute",
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        width: `${warpSize}%`,
                        height: `${warpSize}%`,
                        transform: "translate(-50%, -50%)",
                        borderRadius: "50%",
                        background: node.color,
                        filter: `blur(${warpAmount}px)`,
                        opacity: 0.85,
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                </div>

                {/* SVG Film Grain Noise Overlay */}
                {noiseOpacity > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: noiseOpacity,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Interactive Drag Handles */}
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    onMouseDown={() => handleMouseDown(node.id)}
                    style={{
                      position: "absolute",
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "3px solid #ffffff",
                      background: node.color,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.4), 0 0 0 2px #000000",
                      cursor: draggingNodeId === node.id ? "grabbing" : "grab",
                      transform: "translate(-50%, -50%)",
                      zIndex: 20,
                    }}
                    title="Drag to position node color block"
                  />
                ))}
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-hint)", textAlign: "center", lineHeight: 1.4 }}>
                Drag color handles inside the canvas to mix custom gradients.
              </p>
            </div>

            {/* Right: Controller board, aligned and fits on screen */}
            <div className="brutalist-card" style={{ display: "flex", flexDirection: "column", gap: 16, background: "#ffffff", padding: 20, border: "3px solid #000", boxShadow: "6px 6px 0 #000" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Mesh Controls</h2>
                <span style={{ fontSize: "0.68rem", fontWeight: 900, background: "#FFDD00", padding: "2px 8px", border: "1.5px solid #000", fontFamily: "monospace" }}>
                  {nodes.length} PINS
                </span>
              </div>

              {/* Slider Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: "0.74rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}>Blur Warp Size</label>
                    <span style={{ fontSize: "0.74rem", fontWeight: 900, fontFamily: "monospace" }}>{warpSize}%</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={warpSize}
                    onChange={(e) => setWarpSize(Number(e.target.value))}
                    style={{ width: "100%", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: "0.74rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}>Blur Diffusion</label>
                    <span style={{ fontSize: "0.74rem", fontWeight: 900, fontFamily: "monospace" }}>{warpAmount}px</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={warpAmount}
                    onChange={(e) => setWarpAmount(Number(e.target.value))}
                    style={{ width: "100%", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: "0.74rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}>Film Grain Noise</label>
                    <span style={{ fontSize: "0.74rem", fontWeight: 900, fontFamily: "monospace" }}>{Math.round(noiseOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.5}
                    step={0.01}
                    value={noiseOpacity}
                    onChange={(e) => setNoiseOpacity(Number(e.target.value))}
                    style={{ width: "100%", cursor: "pointer" }}
                  />
                </div>
              </div>

              <div style={{ height: 1, background: "#000", margin: "4px 0" }} />

              {/* Colors editor list */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: "0.74rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}>Canvas Color Pins</label>
                  <button
                    onClick={addRandomNode}
                    className="brutalist-button"
                    style={{
                      padding: "3px 8px",
                      fontSize: "0.68rem",
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Plus size={12} /> Add Pin
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
                  {nodes.map((node) => (
                    <div
                      key={node.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 6px",
                        border: "2px solid #000",
                        background: "#fff",
                      }}
                    >
                      <input
                        type="color"
                        value={node.color}
                        onChange={(e) => handleNodeColorChange(node.id, e.target.value)}
                        style={{
                          width: 26,
                          height: 22,
                          border: "1px solid #000",
                          cursor: "pointer",
                          background: "none",
                          padding: 0,
                        }}
                      />
                      <span style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 800 }}>
                        {node.color.toUpperCase()}
                      </span>
                      {nodes.length > 2 && (
                        <button
                          onClick={() => deleteNode(node.id)}
                          style={{
                            marginLeft: "auto",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#dc2626",
                            padding: 2,
                            display: "flex",
                          }}
                          title="Delete pin"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  className="brutalist-button"
                  onClick={shuffleMeshColors}
                  style={{ flex: 1, padding: "10px 0", fontSize: "0.8rem" }}
                >
                  <RefreshCw size={14} style={{ display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />
                  Shuffle
                </button>
                <button
                  className="brutalist-button brutalist-button-primary"
                  onClick={exportMeshGradient}
                  style={{ flex: 2, padding: "10px 0", fontSize: "0.8rem", gap: 6 }}
                >
                  <Download size={15} />
                  Download PNG
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
