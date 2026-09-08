/**
 * Cloud Whisper & BYOK (Bring Your Own Key) Transcription Client
 * ==============================================================
 * Connects CreatorKit to high-speed cloud transcription engines:
 * - Groq Whisper-large-v3 (<1 second verbatim transcription, generous free tier)
 * - OpenAI Whisper-1
 * - Gemini 2.5 Flash
 * 
 * Automatically segments word-level timestamps into creator-optimized
 * 3-5 word punchy subtitle cues with complete SubtitleWord precision.
 */

import { SubtitleCue, SubtitleWord } from './vtt-formatter';

export type CloudWhisperProvider = 'local' | 'groq' | 'openai' | 'gemini';
export type CloudTranscriptionProvider = 'groq' | 'openai' | 'gemini';

export interface CloudKeyConfig {
    provider: CloudWhisperProvider;
    groqApiKey?: string;
    openAiApiKey?: string;
}

const STORAGE_KEYS = {
    PROVIDER: 'creatorkit_transcription_provider',
    GROQ_KEY: 'creatorkit_byok_groq_key',
    OPENAI_KEY: 'creatorkit_byok_openai_key',
};

export function getStoredApiKey(provider: CloudTranscriptionProvider): string {
    if (typeof window === 'undefined') return '';
    if (provider === 'groq') return localStorage.getItem(STORAGE_KEYS.GROQ_KEY) || '';
    if (provider === 'openai') return localStorage.getItem(STORAGE_KEYS.OPENAI_KEY) || '';
    return '';
}

export function setStoredApiKey(provider: CloudTranscriptionProvider, key: string): void {
    if (typeof window === 'undefined') return;
    if (provider === 'groq') {
        if (key) localStorage.setItem(STORAGE_KEYS.GROQ_KEY, key.trim());
        else localStorage.removeItem(STORAGE_KEYS.GROQ_KEY);
    }
    if (provider === 'openai') {
        if (key) localStorage.setItem(STORAGE_KEYS.OPENAI_KEY, key.trim());
        else localStorage.removeItem(STORAGE_KEYS.OPENAI_KEY);
    }
}

export function getSavedCloudConfig(): CloudKeyConfig {
    if (typeof window === 'undefined') {
        return { provider: 'local' };
    }
    const provider = (localStorage.getItem(STORAGE_KEYS.PROVIDER) as CloudWhisperProvider) || 'local';
    const groqApiKey = localStorage.getItem(STORAGE_KEYS.GROQ_KEY) || '';
    const openAiApiKey = localStorage.getItem(STORAGE_KEYS.OPENAI_KEY) || '';

    return { provider, groqApiKey, openAiApiKey };
}

export function saveCloudConfig(config: CloudKeyConfig): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.PROVIDER, config.provider);
    if (config.groqApiKey !== undefined) {
        localStorage.setItem(STORAGE_KEYS.GROQ_KEY, config.groqApiKey.trim());
    }
    if (config.openAiApiKey !== undefined) {
        localStorage.setItem(STORAGE_KEYS.OPENAI_KEY, config.openAiApiKey.trim());
    }
}

/**
 * Breaks down raw word-level Whisper output into punchy, high-retention 3-5 word cues
 * tailored for short-form video (TikTok, Reels, Shorts).
 */
export function buildOptimizedCuesFromWords(rawWords: Array<{ word: string; start: number; end: number }>): SubtitleCue[] {
    if (!rawWords || rawWords.length === 0) return [];

    const cues: SubtitleCue[] = [];
    let currentWords: SubtitleWord[] = [];
    const MAX_WORDS_PER_CUE = 4;
    const MAX_DURATION_PER_CUE = 2.4; // seconds

    for (let i = 0; i < rawWords.length; i++) {
        const item = rawWords[i];
        const cleanedWord = item.word.trim();
        if (!cleanedWord) continue;

        currentWords.push({
            word: cleanedWord,
            start: item.start,
            end: item.end,
        });

        const cueDuration = currentWords[currentWords.length - 1].end - currentWords[0].start;
        const nextWord = rawWords[i + 1];
        const gapToNext = nextWord ? nextWord.start - item.end : 0;
        const hasPunctuation = /[.!?]$/.test(cleanedWord);

        // Break conditions:
        // 1. Sentence boundary (. ! ?)
        // 2. Natural speech pause (> 0.5s pause)
        // 3. Max words reached
        // 4. Max cue duration reached
        const shouldBreak =
            hasPunctuation ||
            gapToNext > 0.45 ||
            currentWords.length >= MAX_WORDS_PER_CUE ||
            cueDuration >= MAX_DURATION_PER_CUE ||
            i === rawWords.length - 1;

        if (shouldBreak && currentWords.length > 0) {
            cues.push({
                start: currentWords[0].start,
                end: currentWords[currentWords.length - 1].end,
                text: currentWords.map((w) => w.word).join(' '),
                words: [...currentWords],
            });
            currentWords = [];
        }
    }

    if (currentWords.length > 0) {
        cues.push({
            start: currentWords[0].start,
            end: currentWords[currentWords.length - 1].end,
            text: currentWords.map((w) => w.word).join(' '),
            words: [...currentWords],
        });
    }

    return cues;
}

/**
 * Transcribe media file using Cloud BYOK provider
 */
export async function transcribeWithCloudProvider(
    file: File | Blob,
    provider: 'groq' | 'openai' | 'gemini',
    apiKey?: string,
    prompt?: string,
    onProgress?: (progress: { stage: 'idle' | 'decoding' | 'loading_model' | 'transcribing' | 'complete' | 'error'; message: string; percent?: number }) => void
): Promise<{ text: string; fullText: string; cues: SubtitleCue[]; rawWords: SubtitleWord[]; elapsedSeconds: string }> {
    const startTime = performance.now();
    onProgress?.({
        stage: 'transcribing',
        message: `Transcribing via ${provider.toUpperCase()} Whisper...`,
        percent: 40,
    });

    const formData = new FormData();
    formData.append('file', file, (file as File).name || 'recording.webm');
    formData.append('provider', provider);
    if (apiKey) formData.append('apiKey', apiKey.trim());
    if (prompt) formData.append('prompt', prompt);

    const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `Server HTTP ${res.status}` }));
        throw new Error(errJson.error || `Cloud transcription failed (${res.status})`);
    }

    onProgress?.({
        stage: 'transcribing',
        message: 'Formatting subtitle cues...',
        percent: 85,
    });

    const data = await res.json();
    const rawWords: SubtitleWord[] = (data.words || []).map((w: any) => ({
        word: w.word.trim(),
        start: Number(w.start),
        end: Number(w.end),
    }));

    let cues: SubtitleCue[] = [];

    if (rawWords.length > 0) {
        cues = buildOptimizedCuesFromWords(rawWords);
    } else if (data.segments && data.segments.length > 0) {
        // Fallback if segment-only returned
        cues = data.segments.map((seg: any) => {
            const segWords = (seg.text || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            const dur = Math.max(0.2, (seg.end - seg.start) / Math.max(1, segWords.length));
            const wordsList: SubtitleWord[] = segWords.map((w: string, idx: number) => ({
                word: w,
                start: seg.start + idx * dur,
                end: seg.start + (idx + 1) * dur,
            }));
            return {
                start: Number(seg.start),
                end: Number(seg.end),
                text: seg.text.trim(),
                words: wordsList,
            };
        });
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    const fullText = data.text || cues.map(c => c.text).join(' ') || '';

    onProgress?.({
        stage: 'complete',
        message: 'Transcription complete!',
        percent: 100,
    });

    return {
        text: fullText,
        fullText,
        cues,
        rawWords,
        elapsedSeconds: elapsed,
    };
}
