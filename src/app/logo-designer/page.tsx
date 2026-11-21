import type { Metadata } from "next";
import LogoDesignerApp from "./LogoDesignerApp";

export const metadata: Metadata = {
    title: "Logo Designer — Pixel Grid to Smooth SVG | CreatorsKit",
    description:
        "Paint a logo on a pixel grid, dial in the curve smoothing, and export production-ready SVG or PNG up to 4x. Layers, symmetry, rotation and undo — 100% in your browser.",
};

export default function LogoDesignerPage() {
    return <LogoDesignerApp />;
}
