'use client';

import html2canvas from 'html2canvas';

export interface ExportImageOptions {
  node: HTMLElement;
  filename: string;
  title?: string;
  text?: string;
}

/**
 * Robust, cross-browser document-to-image exporter.
 * Uses html2canvas to capture computed styles directly from the DOM node,
 * avoiding browser SecurityError issues with cross-origin Google Fonts stylesheets.
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
    const canvas = await html2canvas(node, {
      scale: 2, // 2x Retina resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (element) => {
        return element.classList?.contains('ck-noprint') ?? false;
      },
    });

    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
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
            resolve(true);
            return;
          } catch (shareErr: unknown) {
            // If user cancelled the share sheet (AbortError), don't throw
            if (shareErr instanceof Error && shareErr.name === 'AbortError') {
              resolve(true);
              return;
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
        resolve(true);
      }, 'image/png', 0.98);
    });
  } catch (err) {
    console.error('Error exporting document image:', err);
    return false;
  }
}
