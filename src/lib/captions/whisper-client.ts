/**
 * Whisper Client Controller
 * =========================
 * Spawns and manages the Web Worker for client-side transcription,
 * handles progress events, and formats output into SubtitleCue items.
 */

import { SubtitleCue, SubtitleWord, cleanStageDirections } from './vtt-formatter';

/**
 * Normalizes raw Whisper output chunks into exact word timings.
 */
export function extractWordTimings(rawChunks: any[]): SubtitleWord[] {
    const words: SubtitleWord[] = [];
    let lastTimestamp = 0;

    for (const chunk of rawChunks) {
        const text = (chunk.text || '').trim();
        if (!text) continue;

        // Skip any bracket cues in transcription
        const cleaned = cleanStageDirections(text);
        if (!cleaned) continue;

        let start = Array.isArray(chunk.timestamp) && typeof chunk.timestamp[0] === 'number'
            ? chunk.timestamp[0]
            : lastTimestamp;
        let end = Array.isArray(chunk.timestamp) && typeof chunk.timestamp[1] === 'number'
            ? chunk.timestamp[1]
            : start + 0.35;
        if (end <= start) end = start + 0.25;
        lastTimestamp = end;

        const splitWords = cleaned.split(/\s+/).filter(Boolean);
        if (splitWords.length === 1) {
            words.push({
                word: splitWords[0],
                start: parseFloat(start.toFixed(3)),
                end: parseFloat(Math.max(start + 0.1, end).toFixed(3)),
            });
        } else if (splitWords.length > 1) {
            const dur = Math.max(0.08, end - start);
            const perWord = dur / splitWords.length;
            splitWords.forEach((w, idx) => {
                words.push({
                    word: w,
                    start: parseFloat((start + idx * perWord).toFixed(3)),
                    end: parseFloat((start + (idx + 1) * perWord).toFixed(3)),
                });
            });
        }
    }

    return words;
}

/**
 * Groups words into strictly ONE-LINE cues (3 to 4 words per cue).
 * Breaks at natural pauses (>0.35s), punctuation (. ? ! , ; :), or 26 chars.
 */
export function groupWordsIntoSingleLineCues(words: SubtitleWord[]): SubtitleCue[] {
    if (words.length === 0) return [];

    const cues: SubtitleCue[] = [];
    let currentWords: SubtitleWord[] = [];

    const flushCue = () => {
        if (currentWords.length === 0) return;
        const start = currentWords[0].start;
        const end = currentWords[currentWords.length - 1].end;
        const text = currentWords.map((w) => w.word).join(' ');

        cues.push({
            start,
            end: Math.max(start + 0.30, end),
            text,
            words: [...currentWords],
        });
        currentWords = [];
    };

    for (let i = 0; i < words.length; i++) {
        const curr = words[i];
        const prev = currentWords[currentWords.length - 1];

        // Silence gap between words (> 0.35s)
        const pauseGap = prev ? curr.start - prev.end : 0;
        const isPause = pauseGap > 0.35;

        // Punctuation break (. ? ! , ; :)
        const isSentenceEnd = prev && /[.?!,;:]$/.test(prev.word) && currentWords.length >= 2;

        // Max 4 words or max 26 characters to strictly guarantee a single clean line
        const candidateLength = currentWords.map((w) => w.word).join(' ').length + curr.word.length + 1;
        const isLengthExceeded = currentWords.length >= 4 || candidateLength > 26;

        if (currentWords.length > 0 && (isPause || isSentenceEnd || isLengthExceeded)) {
            flushCue();
        }

        currentWords.push(curr);
    }

    flushCue();
    return cues;
}

/**
 * Ensures any list of cues (including loaded from localStorage or legacy transcripts)
 * is normalized into strictly single-line cues with verified word timings.
 */
export function ensureSingleLineCues(cues: SubtitleCue[]): SubtitleCue[] {
    if (!cues || cues.length === 0) return [];

    const allWords: SubtitleWord[] = [];

    for (const cue of cues) {
        if (cue.words && cue.words.length > 0) {
            cue.words.forEach((w) => allWords.push(w));
        } else {
            const cleaned = cleanStageDirections(cue.text);
            if (!cleaned) continue;
            const split = cleaned.split(/\s+/).filter(Boolean);
            if (split.length === 0) continue;
            const dur = Math.max(0.08, cue.end - cue.start);
            const perWord = dur / split.length;
            split.forEach((w, idx) => {
                allWords.push({
                    word: w,
                    start: parseFloat((cue.start + idx * perWord).toFixed(3)),
                    end: parseFloat((cue.start + (idx + 1) * perWord).toFixed(3)),
                });
            });
        }
    }

    if (allWords.length === 0) return cues;
    return groupWordsIntoSingleLineCues(allWords);
}

export interface WhisperProgress {
    stage: 'idle' | 'decoding' | 'loading_model' | 'transcribing' | 'complete' | 'error';
    message: string;
    percent?: number;
    device?: string;
    fileInfo?: string;
}

export interface TranscriptionResult {
    cues: SubtitleCue[];
    fullText: string;
    elapsedSeconds: string;
}

class MultiFileProgressTracker {
    private files = new Map<string, { loaded: number; total: number; progress: number }>();
    private maxProgress = 0;

    public update(data: any): { percent: number; fileInfo?: string } {
        if (!data) return { percent: this.maxProgress };

        const fileName = (data.file || data.name || 'weights').split('/').pop() || 'weights';
        const isDone = data.status === 'done' || data.status === 'ready';
        const fileProgress = isDone ? 100 : (typeof data.progress === 'number' ? data.progress : 0);

        // ONNX models are ~90% of whisper-tiny (~38MB), tokenizer is ~8% (~1MB), configs <2%
        const isModel = fileName.includes('.onnx') || fileName.includes('model');
        const isTokenizer = fileName.includes('tokenizer') || fileName.includes('vocab');
        const estimatedTotal = isModel ? 38000000 : isTokenizer ? 1000000 : 50000;

        const totalBytes = data.total && data.total > 0 ? data.total : estimatedTotal;
        const loadedBytes = data.loaded && data.loaded > 0 ? data.loaded : (fileProgress / 100) * totalBytes;

        this.files.set(fileName, {
            loaded: loadedBytes,
            total: totalBytes,
            progress: fileProgress,
        });

        let sumLoaded = 0;
        let sumTotal = 0;
        for (const f of this.files.values()) {
            sumLoaded += f.loaded;
            sumTotal += f.total;
        }

        const calculated = sumTotal > 0 ? (sumLoaded / sumTotal) * 100 : fileProgress;
        // Strictly monotonic: percentage NEVER goes down
        this.maxProgress = Math.min(99, Math.max(this.maxProgress, Math.round(calculated)));

        return {
            percent: this.maxProgress,
            fileInfo: fileName,
        };
    }

    public reset() {
        this.files.clear();
        this.maxProgress = 0;
    }
}

export class WhisperClient {
    private worker: Worker | null = null;
    private progressTracker = new MultiFileProgressTracker();

    private getWorker(): Worker {
        if (!this.worker) {
            this.worker = new Worker(
                new URL('./whisper-worker.ts', import.meta.url),
                { type: 'module' }
            );
        }
        return this.worker;
    }

    public async transcribe(
        audioData: Float32Array,
        onProgress?: (progress: WhisperProgress) => void
    ): Promise<TranscriptionResult> {
        this.progressTracker.reset();

        return new Promise((resolve, reject) => {
            const worker = this.getWorker();

            const handleMessage = (event: MessageEvent) => {
                const { type, message, data, output, elapsed, error, device } = event.data;

                if (type === 'status') {
                    onProgress?.({
                        stage: 'loading_model',
                        message: message || 'Generating captions...',
                        device,
                    });
                } else if (type === 'model_progress') {
                    const { percent, fileInfo } = this.progressTracker.update(data);

                    onProgress?.({
                        stage: 'loading_model',
                        message: 'Generating captions...',
                        percent,
                        fileInfo,
                    });
                } else if (type === 'complete') {
                    worker.removeEventListener('message', handleMessage);

                    onProgress?.({
                        stage: 'complete',
                        message: 'Transcription complete!',
                        percent: 100,
                    });

                    // Parse output chunks into exact word timings and strictly one-line SubtitleCues
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const rawChunks: any[] = output?.chunks || [];
                    const wordTimings = extractWordTimings(rawChunks);
                    const cues: SubtitleCue[] = groupWordsIntoSingleLineCues(wordTimings);

                    resolve({
                        cues,
                        fullText: (output?.text || '').trim(),
                        elapsedSeconds: elapsed || '0',
                    });
                } else if (type === 'error') {
                    worker.removeEventListener('message', handleMessage);
                    onProgress?.({
                        stage: 'error',
                        message: error || 'Transcription failed',
                    });
                    reject(new Error(error || 'Transcription failed'));
                }
            };

            worker.addEventListener('message', handleMessage);
            // Transfer (not copy) the PCM buffer to the worker — avoids
            // duplicating multi-megabyte Float32Arrays across threads.
            worker.postMessage({ type: 'transcribe', audioData }, [audioData.buffer]);
        });
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}
