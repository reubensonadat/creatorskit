'use client';

import { toBlob, toPng } from 'html-to-image';

export interface ExportImageOptions {
  node: HTMLElement;
  filename: string;
  title?: string;
  text?: string;
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
 * Rasterize a DOM node to a PNG Blob at 2x Retina resolution.
 *
 * html-to-image renders the cloned node inside an SVG foreignObject using the
 * browser's own CSS engine, so modern color functions (oklch / color-mix /
 * lab) that Tailwind v4 emits are rendered natively. html2canvas cannot parse
 * those functions and throws
 * "Attempting to parse an unsupported color function" — do not regress to it.
 */
async function captureNodeAsPngBlob(node: HTMLElement): Promise<Blob | null> {
  // Let web fonts settle so the capture matches the live on-screen document.
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
    const blob = await toBlob(node, options);
    if (blob && blob.size > 0) return blob;
  } catch (err) {
    console.warn('Document image capture (toBlob) failed, retrying via toPng:', err);
  }

  // Fallback: rasterize to a data URL, then decode it into a Blob.
  try {
    const dataUrl = await toPng(node, options);
    const blob = dataUrl ? dataUrlToBlob(dataUrl) : null;
    if (blob && blob.size > 0) return blob;
  } catch (err) {
    console.error('Document image capture failed:', err);
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
}: ExportImageOptions): Promise<boolean> {
  try {
    const blob = await captureNodeAsPngBlob(node);
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
