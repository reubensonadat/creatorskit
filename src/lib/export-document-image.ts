'use client';

import { toBlob, toPng } from 'html-to-image';

export interface ExportImageOptions {
  node: HTMLElement;
  filename: string;
  title?: string;
  text?: string;
  /**
   * Original design width (px) the document must be captured at. When the live
   * node renders narrower than this (mobile / split preview), an off-screen
   * clone is laid out at exactly this width before rasterizing — so the saved
   * image keeps the document's true proportions instead of the squeezed
   * on-screen size. When the live node already matches, it is captured as-is.
   */
  designWidth?: number;
}

/**
 * Convert a canvas data URL to a Blob (fallback path when toBlob is
 * unavailable or fails on exotic mobile WebViews).
 */
function dataUrlToBlob(dataUrl: string, fallbackType = 'image/png'): Blob | null {
  try {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) return null;
    const mime = dataUrl.slice(5, dataUrl.indexOf(';')) || fallbackType;
    const binary = atob(dataUrl.slice(commaIndex + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/**
 * Breathing room (px) added around the document on every side of the saved
 * image, so content never sits flush against the edges.
 */
const EXPORT_IMAGE_PADDING_PX = 24;

/**
 * Rasterize a DOM node to a PNG Blob at 2x Retina resolution.
 *
 * The node is always staged off-screen at its true design width inside a
 * white padded wrapper, so the saved PNG gets clean margins on all four
 * sides (never squeezed to the edges) and is never baked at the squeezed
 * on-screen preview width either.
 *
 * html-to-image renders the cloned node inside an SVG foreignObject using the
 * browser's own CSS engine, so modern color functions (oklch / color-mix /
 * lab) that Tailwind v4 emits are rendered natively. html2canvas cannot parse
 * those functions and throws
 * "Attempting to parse an unsupported color function" — do not regress to it.
 */
async function captureNodeAsPngBlob(node: HTMLElement, designWidth?: number): Promise<Blob | null> {
  // Let web fonts settle so the capture matches the live on-screen document.
  try {
    await document.fonts?.ready;
  } catch {
    // document.fonts unavailable — proceed without waiting.
  }

  const targetWidth = designWidth && designWidth > 0 ? designWidth : node.getBoundingClientRect().width;

  // Off-screen stage: fixed + far off the left edge keeps it out of view
  // without adding scrollbars or shifting the live document.
  const stage = document.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  stage.style.position = 'fixed';
  stage.style.left = '-99999px';
  stage.style.top = '0';
  stage.style.background = '#ffffff';

  // Padded wrapper: provides the white side / top / bottom margins in the
  // final saved image. Inline-block shrink-wraps to the document width.
  const pad = document.createElement('div');
  pad.style.display = 'inline-block';
  pad.style.padding = `${EXPORT_IMAGE_PADDING_PX}px`;
  pad.style.background = '#ffffff';

  const clone = node.cloneNode(true) as HTMLElement;
  // Neutralize responsive shrink-wrap so the clone occupies the full design width.
  clone.style.width = `${targetWidth}px`;
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';

  pad.appendChild(clone);
  stage.appendChild(pad);
  document.body.appendChild(stage);

  // Two animation frames guarantee the clone has been laid out at the
  // design width before html-to-image measures it.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  try {
    await document.fonts?.ready;
  } catch {
    // document.fonts unavailable — proceed without waiting.
  }

  const options = {
    pixelRatio: 2, // 2x Retina resolution
    backgroundColor: '#ffffff',
    cacheBust: false,
    // Skip editor chrome (toolbars, controls) that is marked no-capture
    filter: (domNode: HTMLElement) => !(domNode.classList?.contains('ck-noprint') ?? false),
  };

  try {
    try {
      const blob = await toBlob(pad, options);
      if (blob && blob.size > 0) return blob;
    } catch (err) {
      console.warn('Document image capture (toBlob) failed, retrying via toPng:', err);
    }

    // Fallback: rasterize to a data URL, then decode it into a Blob.
    try {
      const dataUrl = await toPng(pad, options);
      const blob = dataUrl ? dataUrlToBlob(dataUrl) : null;
      if (blob && blob.size > 0) return blob;
    } catch (err) {
      console.error('Document image capture failed:', err);
    }
  } finally {
    stage?.remove();
  }

  return null;
}

/**
 * Robust, cross-browser document-to-image exporter.
 * On mobile, opens the native Share Sheet ("Save Image" to Photos / Files / AirDrop / WhatsApp).
 * On desktop, triggers a direct high-res PNG download.
 */
export async function exportDocumentAsImage({
  node,
  filename,
  title = 'Document',
  text = 'Creator document',
  designWidth,
}: ExportImageOptions): Promise<boolean> {
  try {
    const blob = await captureNodeAsPngBlob(node, designWidth);
    if (!blob) {
      return false;
    }

    const safeFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
    const file = new File([blob], safeFilename, { type: 'image/png' });

    // Web Share API on mobile (iOS Safari / Android Chrome)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title,
          text,
        });
        return true;
      } catch (shareErr: unknown) {
        // If user cancelled the share sheet (AbortError), don't fall through to download
        if (shareErr instanceof Error && shareErr.name === 'AbortError') {
          return true;
        }
      }
    }

    // Fallback: direct browser file download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error exporting document image:', err);
    return false;
  }
}
