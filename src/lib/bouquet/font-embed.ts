'use client';

// Font definitions for CreatorsKit Bouquet
export interface BouquetFontConfig {
  id: string;
  family: string;
  spec: string;
}

export const BOUQUET_FONTS: Record<string, BouquetFontConfig> = {
  'space-mono': {
    id: 'space-mono',
    family: 'Space Mono',
    spec: 'Space+Mono:ital,wght@0,400;0,700;1,400',
  },
  'caveat': {
    id: 'caveat',
    family: 'Caveat',
    spec: 'Caveat:wght@400;600;700',
  },
  'kalam': {
    id: 'kalam',
    family: 'Kalam',
    spec: 'Kalam:wght@400;700',
  },
  'special-elite': {
    id: 'special-elite',
    family: 'Special Elite',
    spec: 'Special+Elite',
  },
  'indie-flower': {
    id: 'indie-flower',
    family: 'Indie Flower',
    spec: 'Indie+Flower',
  },
  'shadows': {
    id: 'shadows',
    family: 'Shadows Into Light',
    spec: 'Shadows+Into+Light',
  },
  'playfair': {
    id: 'playfair',
    family: 'Playfair Display',
    spec: 'Playfair+Display:ital,wght@0,400;0,700;1,400',
  },
  'eb-garamond': {
    id: 'eb-garamond',
    family: 'EB Garamond',
    spec: 'EB+Garamond:ital,wght@0,400;0,700;1,400',
  },
};

// In-memory cache for fully embedded base64 CSS
const fontEmbedCache = new Map<string, string>();
const inFlightPromises = new Map<string, Promise<string>>();

/**
 * Normalizes font ID (e.g. 'font-caveat' -> 'caveat')
 */
export function normalizeFontId(fontId?: string): string {
  if (!fontId) return 'caveat';
  const clean = fontId.toLowerCase().replace(/^font-/, '').trim();
  return BOUQUET_FONTS[clean] ? clean : 'caveat';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read font blob as DataURL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches Google Fonts CSS for the font, downloads the referenced woff2 files,
 * converts them to base64 data URIs, and caches the result.
 */
async function fetchAndEmbedFont(fontId: string): Promise<string> {
  const id = normalizeFontId(fontId);
  if (fontEmbedCache.has(id)) {
    return fontEmbedCache.get(id)!;
  }

  const config = BOUQUET_FONTS[id];
  if (!config) return '';

  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${config.spec}&display=swap`;
    const res = await fetch(cssUrl);
    if (!res.ok) return '';
    let css = await res.text();

    // Extract all remote font URLs (typically fonts.gstatic.com)
    const fontUrls = Array.from(
      new Set(
        [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(
          (m) => m[1]
        )
      )
    );

    // Download font binaries and convert to base64 data URIs in parallel
    const urlToBase64 = new Map<string, string>();
    await Promise.all(
      fontUrls.map(async (url) => {
        try {
          const fontRes = await fetch(url);
          if (!fontRes.ok) return;
          const blob = await fontRes.blob();
          const base64Uri = await blobToDataUrl(blob);
          urlToBase64.set(url, base64Uri);
        } catch (err) {
          console.warn(`[font-embed] Failed to convert font url ${url}:`, err);
        }
      })
    );

    // Replace all remote URLs with self-contained data URIs
    for (const [url, b64] of urlToBase64.entries()) {
      css = css.split(url).join(b64);
    }

    fontEmbedCache.set(id, css);
    return css;
  } catch (err) {
    console.warn(`[font-embed] Failed to embed font ${fontId}:`, err);
    return '';
  }
}

/**
 * Retrieves the complete CSS with base64 embedded fonts for both the active card font
 * and Space Mono (used for headers and keepsake badges).
 * Includes a safety timeout so it never blocks PNG export.
 */
export async function getBouquetFontEmbedCSS(
  selectedCardFont: string,
  timeoutMs = 4000
): Promise<string> {
  if (typeof window === 'undefined') return '';

  const normCardFont = normalizeFontId(selectedCardFont);
  const fontsNeeded = Array.from(new Set([normCardFont, 'space-mono']));

  const loadPromise = Promise.all(
    fontsNeeded.map((fId) => {
      if (fontEmbedCache.has(fId)) {
        return Promise.resolve(fontEmbedCache.get(fId)!);
      }
      if (!inFlightPromises.has(fId)) {
        const p = fetchAndEmbedFont(fId).finally(() => {
          inFlightPromises.delete(fId);
        });
        inFlightPromises.set(fId, p);
      }
      return inFlightPromises.get(fId)!;
    })
  ).then((parts) => parts.filter(Boolean).join('\n\n'));

  // Timeout guard
  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      // Return whatever is currently in cache if timed out
      const cached = fontsNeeded
        .map((fId) => fontEmbedCache.get(fId) || '')
        .filter(Boolean)
        .join('\n\n');
      resolve(cached);
    }, timeoutMs);
  });

  return Promise.race([loadPromise, timeoutPromise]);
}

/**
 * Pre-cache font in the background on load or selection change
 * so export is instantaneous.
 */
export function prefetchBouquetFonts(selectedCardFont?: string) {
  if (typeof window === 'undefined') return;
  const fonts = selectedCardFont
    ? [normalizeFontId(selectedCardFont), 'space-mono']
    : ['caveat', 'space-mono'];

  fonts.forEach((fId) => {
    if (!fontEmbedCache.has(fId) && !inFlightPromises.has(fId)) {
      const p = fetchAndEmbedFont(fId).finally(() => {
        inFlightPromises.delete(fId);
      });
      inFlightPromises.set(fId, p);
    }
  });
}
