/**
 * CreatorKit Project Metadata & Media Embedding Engine
 * =====================================================
 * Implements the "Magic Trick":
 * 1. Embeds teleprompter scripts, cues, and studio project settings directly
 *    into recorded video/audio media blobs as a trailing container chunk.
 *    Media decoders (HTML5 <video>/<audio>, Web Audio API, VLC, Premiere) ignore
 *    trailing data past frame clusters, while CreatorKit reads the embedded JSON
 *    instantly on drag & drop or file selection.
 * 2. Manages zero-loss 1-Click Handoff between Teleprompter and Auto Captions
 *    using high-capacity IndexedDB, completely eliminating fragile localStorage size limits.
 * 3. Exports & parses unified .ckcaptions and .json CreatorKit project archives.
 */

import { SubtitleCue } from './vtt-formatter';
import { saveAudioBlobToCache, getAudioBlobFromCache, clearAudioCache } from './audio-cache';

export interface CreatorKitProjectMetadata {
    version: '1.0';
    generator: 'creatorkit-studio';
    script: string;
    createdAt: number;
    title?: string;
    wpm?: number;
    cues?: SubtitleCue[];
    audioDuration?: number;
    aspectRatio?: '9:16' | '16:9';
    videoMode?: 'teleprompter' | 'kinetic-pop' | 'minimal';
    highlighterColor?: string;
    typography?: {
        fontFamily?: string;
        fontSize?: number;
        letterSpacing?: number;
        yPositionPercent?: number;
        pillBackground?: string;
        pillCustomColor?: string;
        emojiMode?: boolean;
        springPhysics?: boolean;
    };
}

export const CK_MAGIC_START = '/*===CREATORKIT_METADATA_START===*/\n';
export const CK_MAGIC_END = '\n/*===CREATORKIT_METADATA_END===*/';

const HANDOFF_KEYS = {
    BLOB_KEY: 'creatorkit_handoff_blob',
    META_KEY: 'creatorkit_handoff_meta',
};

/**
 * Embeds JSON script metadata into any recorded media Blob (WebM, MP4, WAV).
 * Returns a new Blob with identical MIME type and embedded metadata payload.
 */
export async function embedMetadataIntoMediaBlob(
    mediaBlob: Blob,
    metadata: CreatorKitProjectMetadata
): Promise<Blob> {
    const jsonStr = JSON.stringify(metadata);
    const trailerStr = `${CK_MAGIC_START}${jsonStr}${CK_MAGIC_END}`;
    const encoder = new TextEncoder();
    const trailerBytes = encoder.encode(trailerStr);

    return new Blob([mediaBlob, trailerBytes], { type: mediaBlob.type });
}

/**
 * Inspects a dropped or selected File/Blob to extract embedded CreatorKit script metadata.
 * Reads the trailing 256KB of the file where the magic marker resides.
 */
export async function extractMetadataFromMediaBlob(
    fileOrBlob: Blob | File
): Promise<CreatorKitProjectMetadata | null> {
    try {
        // If file is a .json or .ckcaptions project file directly:
        if (fileOrBlob.type.includes('json') || (fileOrBlob instanceof File && fileOrBlob.name.endsWith('.ckcaptions'))) {
            const text = await fileOrBlob.text();
            const parsed = JSON.parse(text);
            if (parsed && (parsed.generator === 'creatorkit-studio' || parsed.script || parsed.cues)) {
                return parsed as CreatorKitProjectMetadata;
            }
        }

        // For audio/video files: inspect the trailing 256KB
        const inspectSize = Math.min(fileOrBlob.size, 262144);
        const slice = fileOrBlob.slice(fileOrBlob.size - inspectSize, fileOrBlob.size);
        const text = await slice.text();

        const startIndex = text.lastIndexOf(CK_MAGIC_START.trim());
        if (startIndex === -1) return null;

        const endIndex = text.indexOf(CK_MAGIC_END.trim(), startIndex);
        if (endIndex === -1) return null;

        const jsonString = text.substring(startIndex + CK_MAGIC_START.trim().length, endIndex).trim();
        const parsed = JSON.parse(jsonString);

        if (parsed && parsed.generator === 'creatorkit-studio') {
            return parsed as CreatorKitProjectMetadata;
        }

        return null;
    } catch (err) {
        console.warn('Could not extract embedded metadata from file:', err);
        return null;
    }
}

/**
 * Exports a standalone .ckcaptions project file
 */
export function createProjectPackageBlob(projectData: CreatorKitProjectMetadata): Blob {
    const jsonStr = JSON.stringify(projectData, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
}

/**
 * High-Capacity 1-Click Handoff: Saves recorded media + teleprompter script
 * into browser IndexedDB store for seamless cross-tool pipeline.
 */
export async function saveHandoffSession(payload: {
    script: string;
    mediaBlob: Blob;
    fileName?: string;
    title?: string;
    wpm?: number;
}): Promise<void> {
    try {
        // 1. Embed metadata into the blob itself for defense-in-depth
        const enrichedBlob = await embedMetadataIntoMediaBlob(payload.mediaBlob, {
            version: '1.0',
            generator: 'creatorkit-studio',
            script: payload.script,
            title: payload.title || 'Teleprompter Take',
            wpm: payload.wpm,
            createdAt: Date.now(),
        });

        // 2. Persist blob in IndexedDB
        await saveAudioBlobToCache(HANDOFF_KEYS.BLOB_KEY, enrichedBlob);

        // 3. Persist session manifest in localStorage
        const meta = {
            script: payload.script,
            fileName: payload.fileName || `take_${Date.now()}.webm`,
            title: payload.title || 'Teleprompter Recording',
            wpm: payload.wpm,
            timestamp: Date.now(),
        };
        localStorage.setItem(HANDOFF_KEYS.META_KEY, JSON.stringify(meta));
        // Also keep legacy key synced for backwards compatibility
        localStorage.setItem('creatorkit_teleprompter_script', payload.script);
    } catch (err) {
        console.error('Failed to save handoff session:', err);
    }
}

/**
 * Checks for a pending handoff session from Teleprompter
 */
export async function getHandoffSession(): Promise<{
    script: string;
    mediaBlob: Blob;
    fileName: string;
    title: string;
    wpm?: number;
} | null> {
    try {
        const metaRaw = localStorage.getItem(HANDOFF_KEYS.META_KEY);
        if (!metaRaw) return null;

        const meta = JSON.parse(metaRaw);
        const blob = await getAudioBlobFromCache(HANDOFF_KEYS.BLOB_KEY);
        if (!blob) return null;

        return {
            script: meta.script || '',
            mediaBlob: blob,
            fileName: meta.fileName || 'teleprompter_recording.webm',
            title: meta.title || 'Teleprompter Take',
            wpm: meta.wpm,
        };
    } catch (err) {
        console.warn('Could not restore handoff session:', err);
        return null;
    }
}

/**
 * Clears pending handoff session once consumed or discarded
 */
export async function clearHandoffSession(): Promise<void> {
    try {
        localStorage.removeItem(HANDOFF_KEYS.META_KEY);
        await clearAudioCache(HANDOFF_KEYS.BLOB_KEY);
    } catch (err) {
        console.warn('Failed to clear handoff session:', err);
    }
}
