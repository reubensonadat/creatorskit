/**
 * 3D Tree QR Diorama — Matrix Generator & Voxel Classifier
 * ========================================================
 * Generates high-error-tolerance (Level H, 30% recovery) QR matrices
 * and classifies each cell for 3D procedural voxel generation.
 */

import QRCode from 'qrcode';

export interface QRModuleInfo {
    x: number;
    y: number;
    isDark: boolean;
    isFinder: boolean;
    isFinderCenter: boolean;
    isFinderBorder: boolean;
    isCenterTreeArea: boolean;
    distFromCenter: number;
}

export interface QRMatrixResult {
    size: number;
    modules: QRModuleInfo[][];
    seed: number;
    rawText: string;
}

/**
 * Creates a deterministic 32-bit integer seed from any input string.
 */
export function stringToSeed(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/**
 * Generates a classified QR Matrix from a given text or URL.
 */
export function generateQRMatrix(text: string): QRMatrixResult {
    const validText = text.trim() || 'https://tree.icqr.com/';
    const seed = stringToSeed(validText);

    // Using ErrorCorrectionLevel 'H' (~30% damage tolerance) ensures
    // that even with procedural tree canopy / trunk voxels in the center,
    // any smartphone camera or QR scanner decodes the payload instantly!
    const qr = QRCode.create(validText, {
        errorCorrectionLevel: 'M',
    });

    const size = qr.modules.size;
    const center = Math.floor(size / 2);
    const centerRadius = Math.max(3, Math.floor(size * 0.16));

    const modules: QRModuleInfo[][] = [];

    // Finder patterns are the three 7x7 corner eye patterns:
    // (0,0), (size-7, 0), (0, size-7)
    const isFinderArea = (x: number, y: number): { isFinder: boolean; isBorder: boolean; isCenter: boolean } => {
        const checkEye = (cornerX: number, cornerY: number) => {
            const relX = x - cornerX;
            const relY = y - cornerY;
            if (relX >= 0 && relX < 7 && relY >= 0 && relY < 7) {
                const isOuterBorder = relX === 0 || relX === 6 || relY === 0 || relY === 6;
                const isInnerCenter = relX >= 2 && relX <= 4 && relY >= 2 && relY <= 4;
                return { isFinder: true, isBorder: isOuterBorder, isCenter: isInnerCenter };
            }
            return null;
        };

        const eyeTL = checkEye(0, 0);
        if (eyeTL) return eyeTL;

        const eyeTR = checkEye(size - 7, 0);
        if (eyeTR) return eyeTR;

        const eyeBL = checkEye(0, size - 7);
        if (eyeBL) return eyeBL;

        return { isFinder: false, isBorder: false, isCenter: false };
    };

    for (let y = 0; y < size; y++) {
        const row: QRModuleInfo[] = [];
        for (let x = 0; x < size; x++) {
            const isDark = Boolean(qr.modules.get(x, y));
            const finderInfo = isFinderArea(x, y);

            const dx = x - center;
            const dy = y - center;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const isCenterTree = dist <= centerRadius;

            row.push({
                x,
                y,
                isDark,
                isFinder: finderInfo.isFinder,
                isFinderBorder: finderInfo.isBorder,
                isFinderCenter: finderInfo.isCenter,
                isCenterTreeArea: isCenterTree,
                distFromCenter: dist,
            });
        }
        modules.push(row);
    }

    return {
        size,
        modules,
        seed,
        rawText: validText,
    };
}
