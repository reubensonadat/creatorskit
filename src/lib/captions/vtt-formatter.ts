/**
 * Subtitle Formatter for CreatorKit
 * =================================
 * Converts timestamped transcription cues into WebVTT (.vtt), SubRip (.srt),
 * and plain text formats, with browser 1-click download utilities.
 */

export interface SubtitleWord {
    word: string;
    start: number; // in seconds
    end: number;   // in seconds
}

export interface SubtitleCue {
    start: number; // in seconds
    end: number;   // in seconds
    text: string;
    words?: SubtitleWord[];
}

/**
 * Format seconds to WebVTT timestamp: HH:MM:SS.mmm
 */
export function formatVttTimestamp(seconds: number): string {
    const totalMs = Math.max(0, Math.floor(seconds * 1000));
    const ms = totalMs % 1000;
    const totalSecs = Math.floor(totalMs / 1000);
    const secs = totalSecs % 60;
    const totalMins = Math.floor(totalSecs / 60);
    const mins = totalMins % 60;
    const hours = Math.floor(totalMins / 60);

    const hh = hours.toString().padStart(2, '0');
    const mm = mins.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    const mmm = ms.toString().padStart(3, '0');

    return `${hh}:${mm}:${ss}.${mmm}`;
}

/**
 * Format seconds to SRT timestamp: HH:MM:SS,mmm (comma separator)
 */
export function formatSrtTimestamp(seconds: number): string {
    return formatVttTimestamp(seconds).replace('.', ',');
}

/**
 * Strip stage directions, hook markers, and silence brackets from cue text.
 * E.g. "[Hook]", "[Silence]", "[Pause 3s]", "(beat)", "(music)" are removed.
 */
export function cleanStageDirections(text: string): string {
    if (!text) return '';
    return text
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\((?:silence|pause|beat|applause|music|hook|intro|outro|cut|b-roll|scene|cough|laughs)[^\)]*\)/gi, ' ')
        .replace(/\b(?:Hook|Silence|Pause|Beat|Intro|Outro):\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Generate standard WebVTT string from cues
 */
export function generateVtt(cues: SubtitleCue[]): string {
    let output = 'WEBVTT\n\n';
    let cueIndex = 1;
    cues.forEach((cue) => {
        const cleaned = cleanStageDirections(cue.text);
        if (!cleaned) return; // Skip silence / stage cues
        output += `${cueIndex++}\n`;
        output += `${formatVttTimestamp(cue.start)} --> ${formatVttTimestamp(cue.end)}\n`;
        output += `${cleaned}\n\n`;
    });
    return output;
}

/**
 * Generate SubRip (.srt) string from cues
 */
export function generateSrt(cues: SubtitleCue[]): string {
    let output = '';
    let cueIndex = 1;
    cues.forEach((cue) => {
        const cleaned = cleanStageDirections(cue.text);
        if (!cleaned) return; // Skip silence / stage cues
        output += `${cueIndex++}\n`;
        output += `${formatSrtTimestamp(cue.start)} --> ${formatSrtTimestamp(cue.end)}\n`;
        output += `${cleaned}\n\n`;
    });
    return output.trim() + '\n';
}

/**
 * Generate plain text transcript from cues
 */
export function generatePlainText(cues: SubtitleCue[]): string {
    return cues
        .map((c) => cleanStageDirections(c.text))
        .filter(Boolean)
        .join(' ');
}

/**
 * Trigger in-browser file download from string content ($0 server bandwidth)
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
