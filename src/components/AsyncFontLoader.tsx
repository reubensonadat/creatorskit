"use client";

/**
 * Renders a stylesheet <link> that does not block first paint.
 *
 * The link is served with media="print" (lowest priority, non-render-blocking)
 * and flipped to media="all" once loaded. Combined with a <link rel="preload">
 * emitted by the caller, the browser fetches the CSS early but never holds
 * back the first contentful paint — a significant win on slow mobile
 * connections where the Google Fonts CSS (60+ families) can otherwise
 * delay the entire page.
 */
export default function AsyncFontLoader({ href }: { href: string }) {
    return (
        <link
            rel="stylesheet"
            href={href}
            crossOrigin="anonymous"
            media="print"
            onLoad={(e) => {
                e.currentTarget.media = "all";
            }}
        />
    );
}
