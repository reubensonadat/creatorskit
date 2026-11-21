import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Logo Designer — Pixel Grid to Smooth SVG | CreatorsKit',
    description:
        'Paint a logo on a pixel grid, dial in the curve smoothing, then export production-ready SVG or PNG in light mode, dark mode or both. No Illustrator needed — everything runs in your browser.',
};

/**
 * Logo Designer — full-bleed host page.
 *
 * The editor itself is the MIT-licensed JuliusBrussee/logo-designer app
 * (React 19 + Vite), built to self-contained static files with relative
 * asset paths and served from public/logo-designer/. This page mounts it
 * edge-to-edge with fullscreen chrome (see src/data/tools.ts), so the
 * grid editor gets the whole viewport.
 */
export default function LogoDesignerPage() {
    return (
        <iframe
            src="/logo-designer/index.html"
            title="Logo Designer"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
            }}
            allow="clipboard-write; downloads"
        />
    );
}
