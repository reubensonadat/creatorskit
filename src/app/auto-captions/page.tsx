'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CassettePlayer } from '@/components/CassettePlayer';
import { processAudioForWhisper } from '@/lib/captions/audio-processor';
import {
    type WhisperProgress,
    type TranscriptionResult,
    WhisperClient,
    ensureSingleLineCues,
} from '@/lib/captions/whisper-client';
import {
    generateVtt,
    generateSrt,
    downloadFile,
    formatVttTimestamp,
    type SubtitleCue,
} from '@/lib/captions/vtt-formatter';
import {
    saveAudioBlobToCache,
    getAudioBlobFromCache,
    clearAudioCache,
} from '@/lib/captions/audio-cache';
import {
    Upload,
    Download,
    Copy,
    Check,
    X,
    Key,
    Plus,
    Play,
    Pause,
    Trash2,
    Scissors,
} from 'lucide-react';
import {
    extractMetadataFromMediaBlob,
    embedMetadataIntoMediaBlob,
    getHandoffSession,
    clearHandoffSession,
    type CreatorKitProjectMetadata,
} from '@/lib/captions/project-metadata';
import {
    transcribeWithCloudProvider,
    getStoredApiKey,
    setStoredApiKey,
    type CloudTranscriptionProvider,
} from '@/lib/captions/whisper-cloud';
import {
    type CaptionVideoMode,
    type CaptionPillBackground,
    type VideoAspectRatio,
    type VideoBackgroundMode,
    type CaptionStylePresetConfig,
    CAPTION_STYLE_PRESETS,
    drawCaptionFrame,
    renderCaptionsToVideo,
    POPULAR_OVERLAY_FONTS,
} from '@/lib/captions/overlay-renderer';
import { alignScriptWithAudioCues } from '@/lib/captions/script-aligner';
import { TactileScrubber } from '@/components/tactile-scrubber';

const DEFAULT_OVERLAY_FONTS = [
    { id: 'montserrat', name: 'Montserrat', family: '"Montserrat", sans-serif' },
    { id: 'bebas-neue', name: 'Bebas Neue', family: '"Bebas Neue", Impact, sans-serif' },
    { id: 'inter', name: 'Inter', family: '"Inter", sans-serif' },
    { id: 'archivo-black', name: 'Archivo Black', family: '"Archivo Black", sans-serif' },
    { id: 'space-mono', name: 'Space Mono', family: '"Space Mono", monospace' },
];

function cuePaceBadges(cue: SubtitleCue): { label: string; title: string; bg: string }[] {
    const duration = cue.end - cue.start;
    const wordCount = cue.text.trim().split(/\s+/).filter(Boolean).length;
    const badges: { label: string; title: string; bg: string }[] = [];
    if (wordCount > 0 && duration < 0.8) {
        badges.push({
            label: 'FAST',
            title: 'Under 0.8s on screen — viewers may not finish reading',
            bg: '#fde68a',
        });
    }
    if (duration > 5 || wordCount > 7) {
        badges.push({
            label: 'LONG',
            title: 'Over 5s or 7+ words — consider splitting this cue',
            bg: '#e9d5ff',
        });
    }
    return badges;
}

function paceSummarySuffix(cues: SubtitleCue[]): string {
    if (cues.length === 0) return '';
    const fast = cues.filter((c) => c.end - c.start < 0.8).length;
    const long = cues.filter(
        (c) => c.end - c.start > 5 || c.text.trim().split(/\s+/).filter(Boolean).length > 7
    ).length;
    if (fast === 0 && long === 0) return '';
    return ` · ⚡${fast} · 🐢${long}`;
}

const STORAGE_KEYS = {
    CUES: 'creatorkit_autoCaptions_cues',
    FULL_TEXT: 'creatorkit_autoCaptions_fullText',
    FILE_NAME: 'creatorkit_autoCaptions_fileName',
    ELAPSED: 'creatorkit_autoCaptions_elapsed',
    DURATION: 'creatorkit_autoCaptions_duration',
    AUDIO_KEY: 'current_caption_audio',
};

/* ── Brutalist UI kit (matches app design system: brutalist-card / brutalist-button) ── */
const BRUT_LABEL: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 900,
    fontFamily: 'monospace, system-ui, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#000',
};

const BRUT_INPUT: React.CSSProperties = {
    padding: '8px 12px',
    border: '2px solid #000',
    borderRadius: 4,
    background: '#fff',
    fontSize: '0.84rem',
    fontWeight: 600,
    color: '#000',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
};

/** Chunky chip toggle for option groups (active = yellow with hard shadow). */
function brutChip(active: boolean): React.CSSProperties {
    return {
        padding: '6px 12px',
        border: '2px solid #000',
        borderRadius: 4,
        background: active ? '#FFE500' : '#ffffff',
        color: '#000',
        fontFamily: 'monospace, system-ui, sans-serif',
        fontWeight: 900,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: active ? '2px 2px 0 #000' : 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.12s',
    };
}

/**
 * Brutalist progress bar: monospace label + hard-bordered track with yellow fill.
 */
function BrutProgress({ percent, label, statusText }: { percent: number; label?: string; statusText?: string }) {
    const clamped = Math.min(100, Math.max(0, percent));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={BRUT_LABEL}>{label || 'PROCESSING...'}</span>
                <span style={{ ...BRUT_LABEL, color: '#666', fontSize: '0.68rem', letterSpacing: 0 }}>
                    {statusText || `${Math.round(clamped)}%`}
                </span>
            </div>
            <div
                style={{
                    height: 14,
                    background: '#ffffff',
                    border: '2px solid #000',
                    borderRadius: 3,
                    overflow: 'hidden',
                }}
                role="progressbar"
                aria-valuenow={Math.round(clamped)}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    style={{
                        width: `${clamped}%`,
                        height: '100%',
                        background: '#FFE500',
                        borderRight: clamped >= 100 ? 'none' : '2px solid #000',
                        transition: 'width 0.25s ease-out',
                    }}
                />
            </div>
        </div>
    );
}

export default function CaptionsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [vttUrl, setVttUrl] = useState<string | null>(null);
    const [cues, setCues] = useState<SubtitleCue[]>([]);
    const [fullText, setFullText] = useState<string>('');
    const [elapsed, setElapsed] = useState<string>('');
    const [audioDuration, setAudioDuration] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<WhisperProgress>({
        stage: 'idle',
        message: 'Ready for audio',
        percent: 0,
    });
    const [activeTab, setActiveTab] = useState<'cues' | 'text'>('cues');
    const [copied, setCopied] = useState(false);
    const whisperClientRef = useRef<WhisperClient | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Left Studio Deck Mode: 'cassette' | 'overlay'
    const [activeStudioDeck, setActiveStudioDeck] = useState<'cassette' | 'overlay'>('cassette');

    // Video Overlay Studio Configuration (3 Modes: Teleprompter Highlight, Kinetic Pop, Minimal)
    const [videoMode, setVideoMode] = useState<CaptionVideoMode>('teleprompter');
    const [captionFont, setCaptionFont] = useState<string>('montserrat');
    const [captionFontSize, setCaptionFontSize] = useState<number>(48);
    const [captionLetterSpacing, setCaptionLetterSpacing] = useState<number>(0);
    const [captionYPosition, setCaptionYPosition] = useState<number>(78);
    const [captionPillBg, setCaptionPillBg] = useState<CaptionPillBackground>('dark');
    const [captionPillCustomColor, setCaptionPillCustomColor] = useState<string>('#18181b');
    const [emojiMode, setEmojiMode] = useState<boolean>(false);
    const [overlayColor, setOverlayColor] = useState<string>('#FFE500');
    const [overlayAspectRatio, setOverlayAspectRatio] = useState<VideoAspectRatio>('9:16');
    const [overlayBackground, setOverlayBackground] = useState<VideoBackgroundMode>('transparent');
    const [isRenderingVideo, setIsRenderingVideo] = useState(false);
    const [videoRenderProgress, setVideoRenderProgress] = useState(0);

    // ✨ Visual Kinetic Typography & Physics Controls
    const [springPhysics, setSpringPhysics] = useState<boolean>(true);
    const [bounceIntensity, setBounceIntensity] = useState<number>(1.15);
    const [wordRotation, setWordRotation] = useState<boolean>(true);
    const [textShadow, setTextShadow] = useState<boolean>(true);
    const [uppercase, setUppercase] = useState<boolean>(false);
    const [wordPop, setWordPop] = useState<boolean>(false);
    const [activePresetId, setActivePresetId] = useState<string | null>(null);

    // 🚀 BYOK (Bring Your Own Key) Engine Settings
    const [transcriptionEngine, setTranscriptionEngine] = useState<CloudTranscriptionProvider | 'local'>('local');
    const [groqKey, setGroqKey] = useState<string>('');
    const [openaiKey, setOpenaiKey] = useState<string>('');
    const [byokModalOpen, setByokModalOpen] = useState<boolean>(false);
    const [byokModalProvider, setByokModalProvider] = useState<CloudTranscriptionProvider>('groq');
    const [tempKeyInput, setTempKeyInput] = useState<string>('');
    const [byokSavedToast, setByokSavedToast] = useState<string | null>(null);

    // ✨ Embedded Metadata & Handoff State
    const [magicMetadata, setMagicMetadata] = useState<CreatorKitProjectMetadata | null>(null);
    const [magicBannerDismissed, setMagicBannerDismissed] = useState<boolean>(false);
    const [pendingHandoff, setPendingHandoff] = useState<{
        script: string;
        mediaBlob: Blob;
        fileName?: string;
        title?: string;
        wpm?: number;
    } | null>(null);

    // ✍️ Manual Subtitle Cue Editing & Search
    const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
    const [findQuery, setFindQuery] = useState<string>('');
    const [replaceQuery, setReplaceQuery] = useState<string>('');

    // Teleprompter Script Sync State
    const [teleprompterScript, setTeleprompterScript] = useState<string | null>(null);
    const [scriptAligned, setScriptAligned] = useState(false);

    // Overlay Live Player State
    const overlayAudioRef = useRef<HTMLAudioElement | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [overlayPlaying, setOverlayPlaying] = useState(false);
    const [overlayCurrentTime, setOverlayCurrentTime] = useState(0);

    // Initialize or cleanup whisper client
    useEffect(() => {
        whisperClientRef.current = new WhisperClient();
        return () => {
            whisperClientRef.current?.terminate();
        };
    }, []);

    const audioUrlRef = useRef<string | null>(null);
    const vttUrlRef = useRef<string | null>(null);

    useEffect(() => {
        audioUrlRef.current = audioUrl;
    }, [audioUrl]);

    useEffect(() => {
        vttUrlRef.current = vttUrl;
    }, [vttUrl]);

    // Only revoke object URLs when the component completely unmounts
    useEffect(() => {
        return () => {
            if (audioUrlRef.current && audioUrlRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(audioUrlRef.current);
            }
            if (vttUrlRef.current && vttUrlRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(vttUrlRef.current);
            }
        };
    }, []);

    const handleFile = async (selectedFile: File, engineOverride?: CloudTranscriptionProvider | 'local') => {
        const activeEngine = engineOverride || transcriptionEngine;

        // Reject empty/unreadable files up front with a clear message
        if (!selectedFile || selectedFile.size === 0) {
            setProgress({
                stage: 'error',
                message: 'The selected file is empty or unreadable. Please re-select the original media file.',
                percent: 0,
            });
            return;
        }

        // Clean up previous blob URLs if replacing file
        if (audioUrlRef.current && audioUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrlRef.current);
        }
        if (vttUrlRef.current && vttUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(vttUrlRef.current);
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setFile(selectedFile);
        setAudioUrl(objectUrl);
        setCues([]);
        setFullText('');
        setVttUrl(null);

        // Immediately persist audio blob into IndexedDB so it's safely cached
        saveAudioBlobToCache(STORAGE_KEYS.AUDIO_KEY, selectedFile).catch((err) => {
            console.warn('Immediate audio cache warning:', err);
        });

        // ✨ THE MAGIC TRICK: Inspect file for embedded script metadata
        let extractedScript: string | null = null;
        try {
            const extracted = await extractMetadataFromMediaBlob(selectedFile);
            if (extracted && extracted.script) {
                setMagicMetadata(extracted);
                setMagicBannerDismissed(false);
                setTeleprompterScript(extracted.script);
                extractedScript = extracted.script;
                localStorage.setItem('creatorkit_teleprompter_script', extracted.script);
            }
        } catch (metaErr) {
            console.warn('Metadata inspection fallback:', metaErr);
        }

        setIsProcessing(true);
        try {
            let result: TranscriptionResult;
            const effectiveScript = extractedScript || teleprompterScript || undefined;

            if (activeEngine === 'groq' || activeEngine === 'openai') {
                const userKey = activeEngine === 'groq' ? groqKey : openaiKey;
                if (!userKey) {
                    // Prompt user for key
                    setByokModalProvider(activeEngine);
                    setTempKeyInput('');
                    setByokModalOpen(true);
                    setIsProcessing(false);
                    return;
                }

                setProgress({
                    stage: 'loading_model',
                    message: `Connecting to ${activeEngine === 'groq' ? 'Groq Cloud' : 'OpenAI'} Whisper...`,
                    percent: 20,
                });

                result = await transcribeWithCloudProvider(
                    selectedFile,
                    activeEngine,
                    userKey,
                    effectiveScript,
                    (prog) => setProgress(prog)
                );
            } else {
                // Step 1: Decode audio locally
                setProgress({
                    stage: 'decoding',
                    message: 'Analyzing audio...',
                    percent: 5,
                });

                const { audioData, duration: decodedDuration } = await processAudioForWhisper(selectedFile, () => {
                    setProgress({
                        stage: 'decoding',
                        message: 'Analyzing audio...',
                        percent: 15,
                    });
                });
                setAudioDuration(decodedDuration);

                // Step 2: Transcribe audio with in-browser Web Worker Whisper
                setProgress({
                    stage: 'loading_model',
                    message: 'Generating captions...',
                    percent: 20,
                });

                if (!whisperClientRef.current) {
                    whisperClientRef.current = new WhisperClient();
                }

                result = await whisperClientRef.current.transcribe(
                    audioData,
                    (prog) => {
                        setProgress(prog);
                    }
                );
            }

            // If we have an aligned teleprompter script, align the generated cues for crystal-clear spelling and punctuation
            let finalCues = result.cues;
            if (effectiveScript && finalCues.length > 0) {
                try {
                    finalCues = alignScriptWithAudioCues(finalCues, effectiveScript);
                    setScriptAligned(true);
                } catch (alignErr) {
                    console.warn('Auto script alignment fallback:', alignErr);
                }
            }

            // Step 3: Format subtitle output
            setCues(finalCues);
            setFullText(result.fullText);
            setElapsed(result.elapsedSeconds);

            // Generate .vtt blob for the CassettePlayer caption track
            const vttContent = generateVtt(finalCues);
            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
            const vttBlobUrl = URL.createObjectURL(vttBlob);
            setVttUrl(vttBlobUrl);

            // Step 4: Persist in browser (localStorage + IndexedDB)
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(finalCues));
                localStorage.setItem(STORAGE_KEYS.FULL_TEXT, result.fullText);
                localStorage.setItem(STORAGE_KEYS.FILE_NAME, selectedFile.name);
                localStorage.setItem(STORAGE_KEYS.ELAPSED, result.elapsedSeconds);
                if (finalCues.length > 0) {
                    const dur = finalCues[finalCues.length - 1].end;
                    setAudioDuration(dur);
                    localStorage.setItem(STORAGE_KEYS.DURATION, dur.toString());
                }
                await saveAudioBlobToCache(STORAGE_KEYS.AUDIO_KEY, selectedFile);
            } catch (cacheErr) {
                console.warn('Session caching warning:', cacheErr);
            }

            setProgress({
                stage: 'complete',
                message: 'Transcription complete',
                percent: 100,
            });
        } catch (err) {
            console.error('Transcription error:', err);
            setProgress({
                stage: 'error',
                message: err instanceof Error ? err.message : 'Transcription failed',
                percent: 0,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Session Persistence: restore from localStorage and IndexedDB on mount
    useEffect(() => {
        let isMounted = true;

        async function restoreSession() {
            try {
                if (typeof window === 'undefined') return;

                // Load stored BYOK keys
                const storedGroq = getStoredApiKey('groq');
                if (storedGroq) setGroqKey(storedGroq);
                const storedOpenai = getStoredApiKey('openai');
                if (storedOpenai) setOpenaiKey(storedOpenai);

                // Check for 1-Click Handoff from Teleprompter
                const handoff = await getHandoffSession();
                if (handoff && isMounted) {
                    setPendingHandoff(handoff);
                    if (handoff.script) {
                        setTeleprompterScript(handoff.script);
                    }
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('auto') === 'true' && handoff.mediaBlob) {
                        const transferredFile = new File([handoff.mediaBlob], handoff.fileName || 'teleprompter_take.webm', {
                            type: handoff.mediaBlob.type || 'audio/webm',
                        });
                        await clearHandoffSession();
                        handleFile(transferredFile);
                        return;
                    }
                }

                const savedFileName = localStorage.getItem(STORAGE_KEYS.FILE_NAME);
                const savedCues = localStorage.getItem(STORAGE_KEYS.CUES);
                const savedFullText = localStorage.getItem(STORAGE_KEYS.FULL_TEXT);
                const savedElapsed = localStorage.getItem(STORAGE_KEYS.ELAPSED);

                if (savedFileName) {
                    const cachedBlob = await getAudioBlobFromCache(STORAGE_KEYS.AUDIO_KEY);
                    if (cachedBlob && isMounted) {
                        const audioBlobUrl = URL.createObjectURL(cachedBlob);
                        const syntheticFile = new File([cachedBlob], savedFileName, {
                            type: cachedBlob.type || 'audio/mp3',
                        });

                        let parsedCues: SubtitleCue[] = [];
                        if (savedCues) {
                            try {
                                parsedCues = ensureSingleLineCues(JSON.parse(savedCues));
                            } catch {
                                parsedCues = [];
                            }
                        }

                        const savedDuration = localStorage.getItem(STORAGE_KEYS.DURATION);
                        if (savedDuration) {
                            setAudioDuration(parseFloat(savedDuration));
                        } else if (parsedCues.length > 0) {
                            setAudioDuration(parsedCues[parsedCues.length - 1].end);
                        }

                        setFile(syntheticFile);
                        setAudioUrl(audioBlobUrl);
                        setCues(parsedCues);
                        setFullText(savedFullText || '');
                        setElapsed(savedElapsed || '');

                        // Check if a script was transferred from teleprompter
                        const pendingScript = localStorage.getItem('creatorkit_teleprompter_script');
                        if (pendingScript && isMounted) {
                            setTeleprompterScript(pendingScript);
                        }

                        if (parsedCues.length > 0) {
                            const vttContent = generateVtt(parsedCues);
                            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
                            const vttBlobUrl = URL.createObjectURL(vttBlob);
                            setVttUrl(vttBlobUrl);
                        }

                        setProgress({
                            stage: 'complete',
                            message: 'Session restored from local cache',
                            percent: 100,
                        });
                    } else if (savedCues && isMounted) {
                        // In case audio was not cached (e.g. older session), restore text and cues
                        let parsedCues: SubtitleCue[] = [];
                        try {
                            parsedCues = ensureSingleLineCues(JSON.parse(savedCues));
                        } catch {
                            parsedCues = [];
                        }
                        const syntheticFile = new File([], savedFileName, { type: 'audio/mp3' });
                        setFile(syntheticFile);
                        setCues(parsedCues);
                        setFullText(savedFullText || '');
                        setElapsed(savedElapsed || '');
                        if (parsedCues.length > 0) {
                            const vttContent = generateVtt(parsedCues);
                            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
                            setVttUrl(URL.createObjectURL(vttBlob));
                        }
                    }
                }
            } catch (err) {
                console.warn('Could not restore local captions session:', err);
            }
        }

        restoreSession();

        return () => {
            isMounted = false;
        };
    }, []);

    // ─────────────────────────────────────────────────────────────
    // INTERACTIVE SUBTITLE CUE EDITING ENGINE
    // ─────────────────────────────────────────────────────────────
    const handleUpdateCueText = (index: number, newText: string) => {
        setCues((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], text: newText };
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    const handleNudgeCue = (index: number, field: 'start' | 'end', delta: number) => {
        setCues((prev) => {
            const next = [...prev];
            const cue = { ...next[index] };
            if (field === 'start') {
                cue.start = Math.max(0, parseFloat((cue.start + delta).toFixed(2)));
                if (cue.start >= cue.end) cue.start = Math.max(0, cue.end - 0.05);
            } else {
                cue.end = parseFloat((cue.end + delta).toFixed(2));
                if (cue.end <= cue.start) cue.end = cue.start + 0.05;
            }
            next[index] = cue;
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    const handleSplitCue = (index: number) => {
        setCues((prev) => {
            const cue = prev[index];
            if (!cue) return prev;
            const words = cue.text.trim().split(/\s+/);
            const midTime = parseFloat(((cue.start + cue.end) / 2).toFixed(2));
            if (words.length <= 1) {
                const c1 = { start: cue.start, end: midTime, text: words[0] || '' };
                const c2 = { start: midTime, end: cue.end, text: '' };
                const next = [...prev.slice(0, index), c1, c2, ...prev.slice(index + 1)];
                const vtt = generateVtt(next);
                setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
                try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
                return next;
            }
            const midWordIdx = Math.ceil(words.length / 2);
            const firstHalf = words.slice(0, midWordIdx).join(' ');
            const secondHalf = words.slice(midWordIdx).join(' ');
            const c1: SubtitleCue = { start: cue.start, end: midTime, text: firstHalf };
            const c2: SubtitleCue = { start: midTime, end: cue.end, text: secondHalf };
            const next = [...prev.slice(0, index), c1, c2, ...prev.slice(index + 1)];
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
            return next;
        });
    };

    const handleMergeWithNextCue = (index: number) => {
        setCues((prev) => {
            if (index >= prev.length - 1) return prev;
            const c1 = prev[index];
            const c2 = prev[index + 1];
            const merged: SubtitleCue = {
                start: c1.start,
                end: c2.end,
                text: `${c1.text} ${c2.text}`.trim(),
            };
            const next = [...prev.slice(0, index), merged, ...prev.slice(index + 2)];
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
            return next;
        });
    };

    const handleDeleteCue = (index: number) => {
        setCues((prev) => {
            const next = prev.filter((_, i) => i !== index);
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
            return next;
        });
    };

    const handleAddCue = () => {
        setCues((prev) => {
            const lastEnd = prev.length > 0 ? prev[prev.length - 1].end : 0;
            const newCue: SubtitleCue = {
                start: parseFloat(lastEnd.toFixed(2)),
                end: parseFloat((lastEnd + 2.0).toFixed(2)),
                text: 'New subtitle cue',
            };
            const next = [...prev, newCue];
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
            return next;
        });
    };

    const handleBulkShift = (deltaSeconds: number) => {
        setCues((prev) => {
            const next = prev.map((c) => ({
                ...c,
                start: Math.max(0, parseFloat((c.start + deltaSeconds).toFixed(2))),
                end: Math.max(0.1, parseFloat((c.end + deltaSeconds).toFixed(2))),
            }));
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
            return next;
        });
    };

    const handleExecuteFindReplace = () => {
        if (!findQuery.trim()) return;
        setCues((prev) => {
            const regex = new RegExp(findQuery, 'gi');
            const next = prev.map((c) => ({
                ...c,
                text: c.text.replace(regex, replaceQuery),
            }));
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
            return next;
        });
        setFullText((prev) => {
            const regex = new RegExp(findQuery, 'gi');
            const next = prev.replace(regex, replaceQuery);
            try { localStorage.setItem(STORAGE_KEYS.FULL_TEXT, next); } catch { }
            return next;
        });
        setShowFindReplace(false);
    };

    const handleSeekToTime = (time: number) => {
        setOverlayCurrentTime(time);
        if (overlayAudioRef.current) {
            overlayAudioRef.current.currentTime = time;
        }
    };

    const handleSaveApiKey = (provider: CloudTranscriptionProvider, key: string) => {
        setStoredApiKey(provider, key);
        if (provider === 'groq') setGroqKey(key);
        if (provider === 'openai') setOpenaiKey(key);
        setByokSavedToast(`${provider === 'groq' ? 'Groq' : 'OpenAI'} API key saved`);
        setTimeout(() => setByokSavedToast(null), 3000);
        setByokModalOpen(false);
    };

    const handleClearApiKey = (provider: CloudTranscriptionProvider) => {
        setStoredApiKey(provider, '');
        if (provider === 'groq') setGroqKey('');
        if (provider === 'openai') setOpenaiKey('');
        setByokSavedToast(`${provider === 'groq' ? 'Groq' : 'OpenAI'} API key cleared`);
        setTimeout(() => setByokSavedToast(null), 3000);
    };

    const handleDownloadWithEmbeddedMetadata = async () => {
        if (!file || cues.length === 0) return;
        try {
            const blobWithMeta = await embedMetadataIntoMediaBlob(file, {
                version: '1.0',
                generator: 'creatorkit-studio',
                script: fullText || teleprompterScript || '',
                cues: cues,
                createdAt: Date.now(),
                title: file.name,
            });
            const url = URL.createObjectURL(blobWithMeta);
            const nameParts = file.name.split('.');
            const ext = nameParts.pop() || 'webm';
            const base = nameParts.join('.');
            downloadFile(url, `${base}_with_metadata.${ext}`, blobWithMeta.type);
        } catch (err) {
            console.error('Failed to embed metadata on download:', err);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) handleFile(dropped);
    };

    const handleCopy = () => {
        if (!fullText) return;
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadVtt = () => {
        if (cues.length === 0) return;
        const vtt = generateVtt(cues);
        downloadFile(vtt, `${file?.name?.replace(/\.[^/.]+$/, '') || 'subtitles'}.vtt`, 'text/vtt');
    };

    const handleDownloadSrt = () => {
        if (cues.length === 0) return;
        const srt = generateSrt(cues);
        downloadFile(srt, `${file?.name?.replace(/\.[^/.]+$/, '') || 'subtitles'}.srt`, 'text/plain');
    };

    const handleDownloadTxt = () => {
        if (!fullText) return;
        downloadFile(fullText, `${file?.name?.replace(/\.[^/.]+$/, '') || 'transcript'}.txt`, 'text/plain');
    };

    const handleDownloadJsonProject = () => {
        const projectData = {
            version: '1.0',
            fileName: file?.name || 'captions',
            audioDuration,
            videoMode,
            typography: {
                fontFamily: captionFont,
                fontSize: captionFontSize,
                letterSpacing: captionLetterSpacing,
                yPositionPercent: captionYPosition,
            },
            highlighterColor: overlayColor,
            aspectRatio: overlayAspectRatio,
            teleprompterScript,
            cues,
            fullText,
        };
        const jsonStr = JSON.stringify(projectData, null, 2);
        downloadFile(jsonStr, `${file?.name?.replace(/\.[^/.]+$/, '') || 'captions'}_project.json`, 'application/json');
    };

    const resetSession = async () => {
        try {
            localStorage.removeItem(STORAGE_KEYS.CUES);
            localStorage.removeItem(STORAGE_KEYS.FULL_TEXT);
            localStorage.removeItem(STORAGE_KEYS.FILE_NAME);
            localStorage.removeItem(STORAGE_KEYS.ELAPSED);
            localStorage.removeItem(STORAGE_KEYS.DURATION);
            await clearAudioCache(STORAGE_KEYS.AUDIO_KEY);
        } catch (e) {
            console.warn('Failed to clear session cache:', e);
        }

        if (vttUrl) URL.revokeObjectURL(vttUrl);
        if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
        setFile(null);
        setAudioUrl(null);
        setVttUrl(null);
        setCues([]);
        setFullText('');
        setElapsed('');
        setAudioDuration(0);
        setOverlayPlaying(false);
        setOverlayCurrentTime(0);
        setIsProcessing(false);
        setProgress({ stage: 'idle', message: 'Ready for audio', percent: 0 });
    };

    const lastScrubberUpdateRef = useRef<number>(0);

    // Live Render Preview Canvas for Video Overlay Studio
    const applyStylePreset = (preset: CaptionStylePresetConfig) => {
        setActivePresetId(preset.id);
        setVideoMode(preset.videoMode);
        setCaptionFont(preset.fontFamily);
        setCaptionFontSize(preset.fontSize);
        setCaptionLetterSpacing(preset.letterSpacing);
        setCaptionYPosition(preset.yPositionPercent);
        setCaptionPillBg(preset.pillBackground);
        setOverlayColor(preset.highlighterColor);
        setSpringPhysics(preset.springPhysics);
        setBounceIntensity(preset.bounceIntensity);
        setWordRotation(preset.wordRotation);
        setWordPop(preset.wordPop);
        setTextShadow(preset.textShadow);
        setUppercase(preset.uppercase);
        setEmojiMode(preset.emojiMode);
    };

    const renderPreviewCanvas = useCallback((time: number) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const isPortrait = overlayAspectRatio === '9:16';
        const width = isPortrait ? 360 : 640;
        const height = isPortrait ? 640 : 360;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const ctx = canvas.getContext('2d', { alpha: overlayBackground === 'transparent' });
        if (!ctx) return;

        drawCaptionFrame(
            ctx,
            width,
            height,
            time,
            cues,
            videoMode,
            overlayBackground,
            overlayColor,
            {
                fontFamily: captionFont,
                fontSize: captionFontSize,
                letterSpacing: captionLetterSpacing,
                yPositionPercent: captionYPosition,
                pillBackground: captionPillBg,
                pillCustomColor: captionPillCustomColor,
                emojiMode: emojiMode,
                springPhysics: springPhysics,
                bounceIntensity: bounceIntensity,
                wordRotation: wordRotation,
                wordPop: wordPop,
                textShadow: textShadow,
                uppercase: uppercase,
            }
        );
    }, [
        cues,
        videoMode,
        captionFont,
        captionFontSize,
        captionLetterSpacing,
        captionYPosition,
        captionPillBg,
        captionPillCustomColor,
        overlayColor,
        overlayBackground,
        overlayAspectRatio,
        emojiMode,
        springPhysics,
        bounceIntensity,
        wordRotation,
        wordPop,
        textShadow,
        uppercase,
    ]);

    // Redraw preview whenever settings change or when scrubbed while paused
    useEffect(() => {
        renderPreviewCanvas(overlayCurrentTime);
    }, [renderPreviewCanvas, overlayCurrentTime]);

    // Live 60FPS Overlay Audio Animation Loop (direct high-speed canvas draw)
    useEffect(() => {
        let animId = 0;
        const syncLoop = () => {
            const audio = overlayAudioRef.current;
            if (audio && !audio.paused) {
                const nowTime = audio.currentTime;
                renderPreviewCanvas(nowTime);

                const now = performance.now();
                if (now - lastScrubberUpdateRef.current > 70) {
                    lastScrubberUpdateRef.current = now;
                    setOverlayCurrentTime(nowTime);
                }

                animId = window.requestAnimationFrame(syncLoop);
            }
        };

        if (overlayPlaying) {
            animId = window.requestAnimationFrame(syncLoop);
        }
        return () => window.cancelAnimationFrame(animId);
    }, [overlayPlaying, renderPreviewCanvas]);

    const toggleOverlayPlayback = () => {
        const audio = overlayAudioRef.current;
        if (!audio) return;
        if (audio.paused) {
            audio.play().then(() => setOverlayPlaying(true)).catch(() => setOverlayPlaying(false));
        } else {
            audio.pause();
            setOverlayPlaying(false);
        }
    };

    const handleAlignWithTeleprompter = () => {
        if (!teleprompterScript || cues.length === 0) return;
        const aligned = alignScriptWithAudioCues(cues, teleprompterScript);
        setCues(aligned);
        setScriptAligned(true);

        const vttContent = generateVtt(aligned);
        const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
        if (vttUrl) URL.revokeObjectURL(vttUrl);
        setVttUrl(URL.createObjectURL(vttBlob));

        try {
            localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(aligned));
        } catch (e) {
            console.warn(e);
        }
    };

    const handleExportOverlayVideo = async (bg: VideoBackgroundMode) => {
        if (cues.length === 0) return;
        setIsRenderingVideo(true);
        setVideoRenderProgress(0);

        try {
            const effectiveDur = audioDuration || (cues.length > 0 ? cues[cues.length - 1].end : 5);
            const videoBlob = await renderCaptionsToVideo({
                cues,
                duration: effectiveDur,
                videoMode,
                highlighterColor: overlayColor,
                aspectRatio: overlayAspectRatio,
                background: bg,
                typography: {
                    fontFamily: captionFont,
                    fontSize: captionFontSize,
                    letterSpacing: captionLetterSpacing,
                    yPositionPercent: captionYPosition,
                    pillBackground: captionPillBg,
                    pillCustomColor: captionPillCustomColor,
                    emojiMode: emojiMode,
                    springPhysics: springPhysics,
                    bounceIntensity: bounceIntensity,
                    wordRotation: wordRotation,
                    wordPop: wordPop,
                    textShadow: textShadow,
                    uppercase: uppercase,
                },
                onProgress: (percent) => setVideoRenderProgress(percent),
            });

            const url = URL.createObjectURL(videoBlob);
            const baseName = file?.name?.replace(/\.[^/.]+$/, '') || 'captions';
            const ext = 'webm';
            downloadFile(url, `${baseName}_overlay_${videoMode}_${overlayAspectRatio.replace(':', 'x')}.${ext}`, videoBlob.type);
        } catch (err) {
            console.error('Error rendering overlay video:', err);
        } finally {
            setIsRenderingVideo(false);
        }
    };

    return (
        <div
            className="tool-page-padding"
            style={{
                position: 'relative',
                minHeight: '100%',
                padding: '20px 16px 80px',
                maxWidth: 1380,
                margin: '0 auto',
                boxSizing: 'border-box',
                width: '100%',
            }}
        >
            {/* Header */}
            <div className="tool-page-header" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                        style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            color: '#000',
                            letterSpacing: '0.14em',
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            background: '#FFE500',
                            padding: '3px 8px',
                            border: '2px solid #000',
                            boxShadow: '2px 2px 0 #000',
                        }}
                    >
                        Whisper Auto Captions
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#666', fontFamily: 'monospace' }}>
                        OFFLINE BROWSER AI · SRT/VTT EXPORT · 1080P OVERLAY RENDER
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                    <h1
                        style={{
                            fontSize: '1.85rem',
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            color: '#000',
                            textTransform: 'uppercase',
                            margin: 0,
                        }}
                    >
                        Auto Captions
                    </h1>
                    <p style={{ fontSize: '0.85rem', color: '#555', maxWidth: 720, lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                        Free speech-to-text — offline Whisper in your browser, or your own Groq / OpenAI key.
                    </p>
                </div>
            </div>

            {/* Toast */}
            {byokSavedToast && (
                <div
                    style={{
                        marginBottom: 14,
                        padding: '10px 14px',
                        background: '#fef08a',
                        border: '2px solid #000',
                        borderRadius: 4,
                        color: '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <Check size={14} strokeWidth={3} />
                    <span>{byokSavedToast}</span>
                </div>
            )}

            {/* Transcription engine */}
            <section
                className="brutalist-card"
                style={{
                    padding: '10px 14px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={BRUT_LABEL}>Engine</span>
                    <button
                        type="button"
                        style={brutChip(transcriptionEngine === 'local')}
                        onClick={() => setTranscriptionEngine('local')}
                    >
                        Local · Offline
                    </button>
                    <button
                        type="button"
                        style={brutChip(transcriptionEngine === 'groq')}
                        onClick={() => {
                            setTranscriptionEngine('groq');
                            if (!groqKey) {
                                setByokModalProvider('groq');
                                setTempKeyInput('');
                                setByokModalOpen(true);
                            }
                        }}
                    >
                        Groq · Fast{groqKey ? ' ✓' : ''}
                    </button>
                    <button
                        type="button"
                        style={brutChip(transcriptionEngine === 'openai')}
                        onClick={() => {
                            setTranscriptionEngine('openai');
                            if (!openaiKey) {
                                setByokModalProvider('openai');
                                setTempKeyInput('');
                                setByokModalOpen(true);
                            }
                        }}
                    >
                        OpenAI{openaiKey ? ' ✓' : ''}
                    </button>
                </div>

                <button
                    type="button"
                    className="brutalist-button"
                    style={{ fontSize: '0.68rem', padding: '5px 10px' }}
                    onClick={() => {
                        setByokModalProvider(transcriptionEngine === 'openai' ? 'openai' : 'groq');
                        setTempKeyInput(transcriptionEngine === 'openai' ? openaiKey : groqKey);
                        setByokModalOpen(true);
                    }}
                >
                    <Key size={13} />
                    API Keys
                </button>
            </section>

            {/* Teleprompter handoff */}
            {pendingHandoff && !file && !isProcessing && (
                <div
                    className="brutalist-card"
                    style={{
                        marginBottom: 16,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <span style={{ ...BRUT_LABEL, display: 'block', marginBottom: 2 }}>Teleprompter take ready</span>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#666' }}>
                            {pendingHandoff.fileName} · {(pendingHandoff.mediaBlob.size / (1024 * 1024)).toFixed(1)} MB · script attached
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="brutalist-button brutalist-button-primary"
                            style={{ fontSize: '0.74rem', padding: '7px 14px' }}
                            onClick={async () => {
                                const transferredFile = new File(
                                    [pendingHandoff.mediaBlob],
                                    pendingHandoff.fileName || 'teleprompter_take.webm',
                                    { type: pendingHandoff.mediaBlob.type || 'audio/webm' }
                                );
                                await clearHandoffSession();
                                setPendingHandoff(null);
                                handleFile(transferredFile);
                            }}
                        >
                            Transcribe
                        </button>
                        <button
                            type="button"
                            className="brutalist-button"
                            style={{ fontSize: '0.74rem', padding: '7px 14px' }}
                            onClick={async () => {
                                await clearHandoffSession();
                                setPendingHandoff(null);
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Magic metadata detected */}
            {magicMetadata && !magicBannerDismissed && (
                <div
                    style={{
                        marginBottom: 16,
                        padding: '10px 14px',
                        background: '#dcfce7',
                        border: '2px solid #000',
                        borderRadius: 4,
                        boxShadow: '3px 3px 0 #000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                    }}
                >
                    <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#000' }}>
                        TELEPROMPTER SCRIPT DETECTED — TIMINGS & SPELLING MATCH 100%
                    </span>
                    <button
                        type="button"
                        onClick={() => setMagicBannerDismissed(true)}
                        style={{ background: '#000', border: 'none', color: '#fff', cursor: 'pointer', padding: '3px 6px', borderRadius: 3 }}
                        aria-label="Dismiss"
                    >
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* BYOK modal */}
            {byokModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.55)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                    onClick={() => setByokModalOpen(false)}
                >
                    <div
                        className="brutalist-card"
                        style={{
                            maxWidth: 440,
                            width: '100%',
                            padding: 24,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ ...BRUT_LABEL, margin: '0 0 4px', fontSize: '0.95rem' }}>API Key</h3>
                                <p style={{ margin: 0, fontSize: '0.72rem', fontFamily: 'monospace', color: '#666' }}>
                                    Stored only in this browser — keeps transcription free and fast.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setByokModalOpen(false)}
                                style={{ background: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '4px 7px', color: '#fff' }}
                                aria-label="Close"
                            >
                                <X size={13} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                type="button"
                                style={brutChip(byokModalProvider === 'groq')}
                                onClick={() => {
                                    setByokModalProvider('groq');
                                    setTempKeyInput(groqKey);
                                }}
                            >
                                Groq (free)
                            </button>
                            <button
                                type="button"
                                style={brutChip(byokModalProvider === 'openai')}
                                onClick={() => {
                                    setByokModalProvider('openai');
                                    setTempKeyInput(openaiKey);
                                }}
                            >
                                OpenAI
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input
                                type="password"
                                value={tempKeyInput}
                                onChange={(e) => setTempKeyInput(e.target.value)}
                                placeholder={byokModalProvider === 'groq' ? 'gsk_…' : 'sk-…'}
                                style={{ ...BRUT_INPUT, fontFamily: 'monospace' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', fontFamily: 'monospace', color: '#888' }}>
                                <span>NEVER LEAVES YOUR DEVICE</span>
                                <a
                                    href={byokModalProvider === 'groq' ? 'https://console.groq.com/keys' : 'https://platform.openai.com/api-keys'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#000', fontWeight: 900, textDecoration: 'underline' }}
                                >
                                    GET A KEY →
                                </a>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                            {(byokModalProvider === 'groq' ? groqKey : openaiKey) && (
                                <button
                                    type="button"
                                    className="brutalist-button"
                                    style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                                    onClick={() => {
                                        handleClearApiKey(byokModalProvider);
                                        setTempKeyInput('');
                                    }}
                                >
                                    Clear key
                                </button>
                            )}
                            <button
                                type="button"
                                className="brutalist-button"
                                style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                                onClick={() => setByokModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="brutalist-button brutalist-button-primary"
                                style={{ fontSize: '0.7rem', padding: '6px 14px' }}
                                onClick={() => handleSaveApiKey(byokModalProvider, tempKeyInput.trim())}
                            >
                                Save key
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error banner with recovery */}
            {!isProcessing && progress.stage === 'error' && (
                <div
                    style={{
                        marginBottom: 16,
                        padding: '12px 16px',
                        background: '#fee2e2',
                        border: '2px solid #000',
                        borderRadius: 4,
                        boxShadow: '3px 3px 0 #000',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                    role="alert"
                >
                    <p style={{ margin: 0, fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', lineHeight: 1.5 }}>
                        ⚠ {progress.message}
                    </p>
                    {file && file.size > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button" className="brutalist-button" style={{ fontSize: '0.7rem', padding: '6px 12px' }} onClick={() => handleFile(file, 'local')}>
                                Retry locally
                            </button>
                            <button type="button" className="brutalist-button brutalist-button-primary" style={{ fontSize: '0.7rem', padding: '6px 12px' }} onClick={() => handleFile(file, 'groq')}>
                                Retry with Groq
                            </button>
                            <button type="button" className="brutalist-button" style={{ fontSize: '0.7rem', padding: '6px 12px' }} onClick={() => handleFile(file, 'openai')}>
                                Retry with OpenAI
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Upload zone */}
            {!file && !isProcessing && (
                <div
                    className="brutalist-card"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '3px dashed #000',
                        padding: '48px 24px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        minHeight: 280,
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*,video/*"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        style={{ display: 'none' }}
                    />

                    <div
                        style={{
                            width: 52,
                            height: 52,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#FFE500',
                            border: '2px solid #000',
                            borderRadius: 8,
                            boxShadow: '3px 3px 0 #000',
                            marginBottom: 16,
                        }}
                    >
                        <Upload size={24} color="#000" strokeWidth={2.4} />
                    </div>

                    <h3
                        style={{
                            margin: '0 0 6px',
                            fontSize: '1.05rem',
                            fontWeight: 900,
                            fontFamily: 'monospace, system-ui, sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '-0.01em',
                            color: '#000',
                        }}
                    >
                        Drop an audio or video file
                    </h3>
                    <p style={{ margin: '0 0 18px', fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: '#666' }}>
                        MP3 · WAV · M4A · MP4 · MOV · WEBM
                    </p>
                    <span className="brutalist-button brutalist-button-primary" style={{ padding: '10px 22px', fontSize: '0.82rem' }}>
                        <Upload size={15} />
                        Choose file
                    </span>
                </div>
            )}

            {/* Processing */}
            {isProcessing && (
                <div
                    className="brutalist-card"
                    style={{
                        padding: '28px 24px',
                        maxWidth: 560,
                        margin: '40px auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }}
                >
                    <BrutProgress
                        percent={progress.percent ?? (progress.stage === 'complete' ? 100 : 15)}
                        label={progress.message || 'GENERATING CAPTIONS...'}
                    />
                    <p style={{ margin: 0, fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 600, color: '#666' }}>
                        Transcribing speech and aligning word timestamps — this only takes a moment.
                    </p>
                </div>
            )}

            {/* Workspace */}
            {file && !isProcessing && (
                <div className="matchcut-workspace-grid">
                    {/* ── Left column: player & overlay studio ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                        <div
                            className="brutalist-card tool-canvas-frame"
                            style={{ padding: 14, display: 'flex', flexDirection: 'column' }}
                        >
                            {/* Viewport meta bar */}
                            <div
                                className="tool-viewport-meta"
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 10,
                                    fontSize: '0.7rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: '#666',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 9,
                                            height: 9,
                                            background: cues.length > 0 ? '#22c55e' : '#eab308',
                                            border: '1.5px solid #000',
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span
                                        style={{
                                            color: '#000',
                                            fontWeight: 900,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 240,
                                        }}
                                    >
                                        {file.name.replace(/\.[^/.]+$/, '').toUpperCase()}
                                    </span>
                                    <span style={{ color: '#aaa' }}>|</span>
                                    <span style={{ textTransform: 'uppercase', color: '#333', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                        {cues.length} CUES{elapsed ? ` · ${elapsed}` : ''}
                                    </span>
                                    {!audioUrl && (
                                        <span style={{ color: '#dc2626', fontWeight: 900, whiteSpace: 'nowrap' }}>| NO CACHED AUDIO</span>
                                    )}
                                </div>
                                <span
                                    className="tool-viewport-meta-right"
                                    style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.64rem', color: '#000' }}
                                >
                                    {activeStudioDeck === 'cassette' ? 'CASSETTE PLAYER' : 'OVERLAY RENDER'}
                                </span>
                            </div>

                            {/* Deck: cassette player */}
                            {activeStudioDeck === 'cassette' && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        background: '#f4f4f5',
                                        border: '2px solid #000',
                                        borderRadius: 4,
                                        padding: '14px 8px',
                                        minHeight: 260,
                                    }}
                                >
                                    <CassettePlayer
                                        audioSrc={audioUrl || undefined}
                                        duration={audioDuration || (cues.length > 0 ? cues[cues.length - 1].end : undefined)}
                                        captionTracks={
                                            vttUrl
                                                ? [
                                                    {
                                                        default: true,
                                                        label: 'Subtitles',
                                                        src: vttUrl,
                                                        srcLang: 'en',
                                                    },
                                                ]
                                                : []
                                        }
                                        trackTitle={file.name.replace(/\.[^/.]+$/, '')}
                                    />
                                </div>
                            )}

                            {/* Deck: overlay studio */}
                            {activeStudioDeck === 'overlay' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {audioUrl && (
                                        <audio
                                            ref={overlayAudioRef}
                                            src={audioUrl}
                                            onEnded={() => setOverlayPlaying(false)}
                                            onPause={() => setOverlayPlaying(false)}
                                            onPlay={() => setOverlayPlaying(true)}
                                            style={{ display: 'none' }}
                                        />
                                    )}

                                    {/* Stage viewport */}
                                    <div
                                        className="tool-canvas-viewport"
                                        style={{
                                            position: 'relative',
                                            width: '100%',
                                            minHeight: 300,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background:
                                                overlayBackground === 'green-screen'
                                                    ? '#00FF00'
                                                    : overlayBackground === 'magenta-screen'
                                                        ? '#FF00FF'
                                                        : 'repeating-conic-gradient(#f4f4f5 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
                                            border: '3px solid #000',
                                            boxShadow: '4px 4px 0 rgba(0,0,0,0.18)',
                                            borderRadius: 4,
                                            overflow: 'hidden',
                                            padding: 12,
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <canvas
                                            ref={overlayCanvasRef}
                                            style={{
                                                maxWidth: '100%',
                                                height: overlayAspectRatio === '9:16' ? 340 : 200,
                                                borderRadius: 4,
                                                background: 'transparent',
                                                display: 'block',
                                            }}
                                        />
                                    </div>

                                    {/* Transport & scrubber bar */}
                                    <div
                                        className="tool-transport-bar"
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '2px solid #000',
                                            background: '#f4f4f5',
                                            borderRadius: 4,
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 10,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={toggleOverlayPlayback}
                                            className="brutalist-button"
                                            style={{ padding: '6px 10px' }}
                                            aria-label={overlayPlaying ? 'Pause' : 'Play'}
                                        >
                                            {overlayPlaying ? <Pause size={14} /> : <Play size={14} />}
                                        </button>

                                        <div style={{ flex: 1, minWidth: 120 }}>
                                            <TactileScrubber
                                                value={overlayCurrentTime}
                                                min={0}
                                                max={audioDuration || (cues.length > 0 ? cues[cues.length - 1].end : 10)}
                                                step={0.05}
                                                stepDelta={0.5}
                                                height={14}
                                                showSteppers={false}
                                                onChange={(t) => {
                                                    setOverlayCurrentTime(t);
                                                    if (overlayAudioRef.current) {
                                                        overlayAudioRef.current.currentTime = t;
                                                    }
                                                }}
                                            />
                                        </div>

                                        <span
                                            style={{
                                                fontSize: '0.66rem',
                                                fontFamily: 'monospace',
                                                fontWeight: 900,
                                                color: '#000',
                                                background: '#FFE500',
                                                padding: '1px 5px',
                                                border: '1.5px solid #000',
                                                borderRadius: 3,
                                                minWidth: 52,
                                                textAlign: 'center',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {overlayCurrentTime.toFixed(1)}s
                                        </span>
                                    </div>

                                    {/* Caption style & font */}
                                    <div
                                        style={{
                                            border: '2px solid #000',
                                            borderRadius: 4,
                                            background: '#f4f4f5',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 10,
                                        }}
                                    >
                                        <span style={BRUT_LABEL}>Caption style</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {CAPTION_STYLE_PRESETS.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => applyStylePreset(p)}
                                                    style={brutChip(activePresetId === p.id)}
                                                    title={`One-tap style: ${p.name}`}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                                gap: 6,
                                            }}
                                        >
                                            {[
                                                { id: 'teleprompter', label: 'Highlight', desc: 'Teleprompter' },
                                                { id: 'kinetic-pop', label: 'Kinetic pop', desc: 'Shorts' },
                                                { id: 'minimal', label: 'Minimal', desc: 'TV & film' },
                                            ].map((m) => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setVideoMode(m.id as CaptionVideoMode);
                                                        setActivePresetId(null);
                                                    }}
                                                    style={{
                                                        padding: '8px 4px',
                                                        border: '2px solid #000',
                                                        background: videoMode === m.id ? '#000' : '#fff',
                                                        color: videoMode === m.id ? '#FFE500' : '#000',
                                                        fontFamily: 'monospace, system-ui, sans-serif',
                                                        fontWeight: 900,
                                                        fontSize: '0.66rem',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase',
                                                        textAlign: 'center',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                    }}
                                                >
                                                    <span>{m.label}</span>
                                                    <span style={{ fontSize: '0.58rem', fontWeight: 700, opacity: 0.65 }}>{m.desc}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {(POPULAR_OVERLAY_FONTS || DEFAULT_OVERLAY_FONTS).map((f) => (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => setCaptionFont(f.id)}
                                                    style={{
                                                        ...brutChip(captionFont === f.id),
                                                        fontFamily: f.family,
                                                        textTransform: 'none',
                                                    }}
                                                >
                                                    {f.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Pill, colors & layout */}
                                    <div
                                        style={{
                                            border: '2px solid #000',
                                            borderRadius: 4,
                                            background: '#f4f4f5',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 10,
                                        }}
                                    >
                                        <span style={BRUT_LABEL}>Pill background</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                            {(
                                                [
                                                    { id: 'clear', label: 'Clear' },
                                                    { id: 'dark', label: 'Dark' },
                                                    { id: 'light', label: 'Light' },
                                                    { id: 'custom', label: 'Custom' },
                                                ] as { id: CaptionPillBackground; label: string }[]
                                            ).map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setCaptionPillBg(p.id)}
                                                    style={brutChip(captionPillBg === p.id)}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                            {captionPillBg === 'custom' && (
                                                <input
                                                    type="color"
                                                    value={captionPillCustomColor}
                                                    onChange={(e) => setCaptionPillCustomColor(e.target.value)}
                                                    aria-label="Custom pill color"
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        padding: 1,
                                                        border: '2px solid #000',
                                                        borderRadius: 4,
                                                        background: '#fff',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <span style={BRUT_LABEL}>Highlight color</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                            {['#FFE500', '#22C55E', '#06B6D4', '#EC4899', '#F97316', '#FFFFFF'].map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setOverlayColor(c)}
                                                    aria-label={`Highlight ${c}`}
                                                    style={{
                                                        width: 30,
                                                        height: 30,
                                                        padding: 0,
                                                        backgroundColor: c,
                                                        border: overlayColor === c ? '3px solid #000' : '2px solid #ccc',
                                                        boxShadow: overlayColor === c ? '2px 2px 0 #000' : 'none',
                                                        cursor: 'pointer',
                                                        transform: overlayColor === c ? 'scale(1.1)' : 'none',
                                                        borderRadius: 0,
                                                    }}
                                                />
                                            ))}
                                            <input
                                                type="color"
                                                value={overlayColor}
                                                onChange={(e) => setOverlayColor(e.target.value)}
                                                aria-label="Custom highlight color"
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    padding: 1,
                                                    border: '2px solid #000',
                                                    borderRadius: 4,
                                                    background: '#fff',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                                gap: '10px 14px',
                                                paddingTop: 4,
                                            }}
                                        >
                                            <TactileScrubber
                                                label="Size"
                                                value={captionFontSize}
                                                min={24}
                                                max={84}
                                                step={2}
                                                onChange={setCaptionFontSize}
                                                presets={[
                                                    { label: 'S', value: 24 },
                                                    { label: 'M ★', value: 48 },
                                                    { label: 'L', value: 84 },
                                                ]}
                                            />
                                            <TactileScrubber
                                                label="Spacing"
                                                value={captionLetterSpacing}
                                                min={-2}
                                                max={8}
                                                step={1}
                                                onChange={setCaptionLetterSpacing}
                                            />
                                            <TactileScrubber
                                                label="Vertical"
                                                value={captionYPosition}
                                                min={15}
                                                max={88}
                                                step={1}
                                                formatValue={(v) => `${v}%`}
                                                onChange={setCaptionYPosition}
                                            />
                                        </div>
                                    </div>

                                    {/* Motion & effects */}
                                    <div
                                        style={{
                                            border: '2px solid #000',
                                            borderRadius: 4,
                                            background: '#f4f4f5',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 10,
                                        }}
                                    >
                                        <span style={BRUT_LABEL}>Motion & effects</span>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px 14px' }}>
                                            {(
                                                [
                                                    ['Spring bounce', springPhysics, setSpringPhysics],
                                                    ['Karaoke word pop', wordPop, setWordPop],
                                                    ['Rotation tilt', wordRotation, setWordRotation],
                                                    ['Drop shadow', textShadow, setTextShadow],
                                                    ['All caps', uppercase, setUppercase],
                                                    ['Emoji mode', emojiMode, setEmojiMode],
                                                ] as [string, boolean, (v: boolean) => void][]
                                            ).map(([label, value, setter]) => (
                                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                                    <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', cursor: 'pointer' }}>
                                                        {label}
                                                    </label>
                                                    <input
                                                        type="checkbox"
                                                        checked={value}
                                                        onChange={(e) => setter(e.target.checked)}
                                                        style={{ width: 16, height: 16, accentColor: '#000', cursor: 'pointer', flexShrink: 0 }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        {springPhysics && (
                                            <TactileScrubber
                                                label="Bounce power"
                                                value={bounceIntensity}
                                                min={0.5}
                                                max={2.5}
                                                step={0.1}
                                                onChange={setBounceIntensity}
                                                presets={[
                                                    { label: 'Soft', value: 0.8 },
                                                    { label: 'Punch ★', value: 1.15 },
                                                    { label: 'Wild', value: 2.0 },
                                                ]}
                                            />
                                        )}
                                    </div>

                                    {/* Export */}
                                    <div
                                        className="tool-aspect-bar"
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {(['9:16', '16:9'] as VideoAspectRatio[]).map((ar) => (
                                                <button
                                                    key={ar}
                                                    type="button"
                                                    onClick={() => setOverlayAspectRatio(ar)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        border: '2px solid #000',
                                                        borderRadius: 4,
                                                        background: overlayAspectRatio === ar ? '#000' : '#ffffff',
                                                        color: overlayAspectRatio === ar ? '#ffffff' : '#000000',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        fontSize: '0.68rem',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    {ar}
                                                </button>
                                            ))}
                                            {(
                                                [
                                                    { id: 'transparent' as VideoBackgroundMode, label: 'Transparent' },
                                                    { id: 'green-screen' as VideoBackgroundMode, label: 'Green' },
                                                ]
                                            ).map((bg) => (
                                                <button
                                                    key={bg.id}
                                                    type="button"
                                                    onClick={() => setOverlayBackground(bg.id)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        border: '2px solid #000',
                                                        borderRadius: 4,
                                                        background: overlayBackground === bg.id ? '#000' : '#ffffff',
                                                        color: overlayBackground === bg.id ? '#FFE500' : '#000000',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        fontSize: '0.68rem',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    {bg.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {isRenderingVideo ? (
                                        <BrutProgress percent={videoRenderProgress} label="RENDERING VIDEO" />
                                    ) : (
                                        <div
                                            className="tool-export-grid"
                                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}
                                        >
                                            <button
                                                type="button"
                                                className="brutalist-button brutalist-button-primary"
                                                onClick={() => handleExportOverlayVideo('transparent')}
                                                disabled={cues.length === 0}
                                                style={{ padding: '12px 18px', fontSize: '0.82rem', boxShadow: '4px 4px 0 #000' }}
                                            >
                                                <Download size={16} /> Export .webm
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                onClick={() => handleExportOverlayVideo('green-screen')}
                                                disabled={cues.length === 0}
                                                style={{ padding: '12px 18px', fontSize: '0.82rem', boxShadow: '4px 4px 0 #000' }}
                                            >
                                                Green screen .webm
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Deck switch */}
                            <div
                                className="tool-aspect-bar"
                                style={{
                                    width: '100%',
                                    marginTop: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}
                            >
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        type="button"
                                        style={brutChip(activeStudioDeck === 'cassette')}
                                        onClick={() => setActiveStudioDeck('cassette')}
                                    >
                                        Player
                                    </button>
                                    <button
                                        type="button"
                                        style={brutChip(activeStudioDeck === 'overlay')}
                                        onClick={() => setActiveStudioDeck('overlay')}
                                    >
                                        Overlay studio
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className="brutalist-button"
                                    style={{ fontSize: '0.68rem', padding: '5px 10px' }}
                                    onClick={resetSession}
                                >
                                    New file
                                </button>
                            </div>

                            {/* Script anchor */}
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={BRUT_LABEL}>Script anchor (optional)</span>
                                    {teleprompterScript && teleprompterScript.trim().length > 0 && (
                                        <button
                                            type="button"
                                            style={{ ...brutChip(!scriptAligned), fontSize: '0.62rem', padding: '4px 8px' }}
                                            onClick={handleAlignWithTeleprompter}
                                            disabled={scriptAligned}
                                        >
                                            {scriptAligned ? '✓ Aligned' : 'Align timings'}
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={teleprompterScript || ''}
                                    onChange={(e) => {
                                        setTeleprompterScript(e.target.value);
                                        localStorage.setItem('creatorkit_teleprompter_script', e.target.value);
                                    }}
                                    placeholder="Paste your script to instantly fix AI caption mistakes…"
                                    style={{
                                        ...BRUT_INPUT,
                                        minHeight: 56,
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                    }}
                                />
                                {teleprompterScript && teleprompterScript.trim().length > 0 && (
                                    <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                                        {teleprompterScript.trim().split(/\s+/).length} WORDS DETECTED
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Right column: subtitle editor ── */}
                    <div className="tool-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                        {/* Exports card */}
                        <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={BRUT_LABEL}>Subtitles</span>
                                <button
                                    type="button"
                                    className="brutalist-button"
                                    style={{ fontSize: '0.68rem', padding: '5px 10px' }}
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check size={13} /> : <Copy size={13} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                                {(
                                    [
                                        ['VTT', handleDownloadVtt],
                                        ['SRT', handleDownloadSrt],
                                        ['TXT', handleDownloadTxt],
                                        ['JSON', handleDownloadJsonProject],
                                    ] as [string, () => void][]
                                ).map(([label, handler]) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={handler}
                                        style={{
                                            padding: '8px 4px',
                                            border: '2px solid #000',
                                            borderRadius: 4,
                                            background: '#ffffff',
                                            color: '#000',
                                            fontFamily: 'monospace',
                                            fontWeight: 900,
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            boxShadow: '2px 2px 0 #000',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                className="brutalist-button"
                                style={{ fontSize: '0.7rem', padding: '8px 10px' }}
                                onClick={handleDownloadWithEmbeddedMetadata}
                            >
                                <Download size={13} /> Embed metadata & download
                            </button>
                        </div>

                        {/* Tab bar */}
                        <div
                            className="tool-tab-bar"
                            style={{ display: 'flex', border: '3px solid #000', background: '#000', boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', overflow: 'hidden', borderRadius: 4 }}
                        >
                            {[
                                { id: 'cues' as const, label: `Cues (${cues.length})${paceSummarySuffix(cues)}` },
                                { id: 'text' as const, label: 'Transcript' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '10px 4px',
                                        border: 'none',
                                        background: activeTab === tab.id ? '#ffffff' : 'transparent',
                                        color: activeTab === tab.id ? '#000000' : '#ffffff',
                                        fontWeight: 900,
                                        fontFamily: 'monospace',
                                        fontSize: '0.68rem',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB 1: Cue editor */}
                        {activeTab === 'cues' && (
                            <div
                                className="brutalist-card"
                                style={{
                                    padding: 16,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12,
                                    maxHeight: 'calc(100vh - 380px)',
                                    overflowY: 'auto',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                    <button
                                        type="button"
                                        className="brutalist-button"
                                        style={{ fontSize: '0.68rem', padding: '5px 10px' }}
                                        onClick={handleAddCue}
                                    >
                                        <Plus size={12} /> Add Cue
                                    </button>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            style={{ ...brutChip(false), fontSize: '0.62rem', padding: '4px 8px' }}
                                            onClick={() => handleBulkShift(-0.2)}
                                        >
                                            −0.2s
                                        </button>
                                        <button
                                            type="button"
                                            style={{ ...brutChip(false), fontSize: '0.62rem', padding: '4px 8px' }}
                                            onClick={() => handleBulkShift(0.2)}
                                        >
                                            +0.2s
                                        </button>
                                        <button
                                            type="button"
                                            style={{ ...brutChip(showFindReplace), fontSize: '0.62rem', padding: '4px 8px' }}
                                            onClick={() => setShowFindReplace(!showFindReplace)}
                                        >
                                            Find & Replace
                                        </button>
                                    </div>
                                </div>

                                {showFindReplace && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                            background: '#f4f4f5',
                                            border: '2px solid #000',
                                            borderRadius: 4,
                                            padding: 10,
                                        }}
                                    >
                                        <input
                                            style={{ ...BRUT_INPUT, fontFamily: 'monospace', fontSize: '0.78rem' }}
                                            placeholder="Find…"
                                            value={findQuery}
                                            onChange={(e) => setFindQuery(e.target.value)}
                                        />
                                        <input
                                            style={{ ...BRUT_INPUT, fontFamily: 'monospace', fontSize: '0.78rem' }}
                                            placeholder="Replace with…"
                                            value={replaceQuery}
                                            onChange={(e) => setReplaceQuery(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="brutalist-button brutalist-button-primary"
                                            style={{ fontSize: '0.68rem', padding: '6px 10px' }}
                                            onClick={handleExecuteFindReplace}
                                        >
                                            Replace All
                                        </button>
                                    </div>
                                )}

                                {cues.length === 0 ? (
                                    <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700, color: '#888' }}>
                                        NO CUES YET — ADD ONE MANUALLY OR RE-TRANSCRIBE.
                                    </span>
                                ) : (
                                    cues.map((cue, index) => (
                                        <div
                                            key={`${cue.start}-${index}`}
                                            style={{
                                                padding: 12,
                                                border: '1.5px solid #ccc',
                                                background: '#ffffff',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                                    <span
                                                        style={{
                                                            fontSize: '0.65rem',
                                                            fontFamily: 'monospace',
                                                            fontWeight: 900,
                                                            background: '#000',
                                                            color: '#fff',
                                                            padding: '2px 6px',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        #{index + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSeekToTime(cue.start)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            background: '#FFE500',
                                                            border: '1.5px solid #000',
                                                            borderRadius: 3,
                                                            padding: '2px 6px',
                                                            fontSize: '0.6rem',
                                                            fontWeight: 900,
                                                            fontFamily: 'monospace',
                                                            color: '#000',
                                                            cursor: 'pointer',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                        title="Jump to this cue"
                                                    >
                                                        ▶ {formatVttTimestamp(cue.start)} → {formatVttTimestamp(cue.end)}
                                                    </button>
                                                    {cuePaceBadges(cue).map((badge) => (
                                                        <span
                                                            key={badge.label}
                                                            title={badge.title}
                                                            style={{
                                                                fontSize: '0.58rem',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 900,
                                                                letterSpacing: '0.04em',
                                                                background: badge.bg,
                                                                border: '1.5px solid #000',
                                                                borderRadius: 3,
                                                                padding: '2px 6px',
                                                                color: '#000',
                                                                flexShrink: 0,
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {badge.label}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                                    {(
                                                        [
                                                            ['S−', () => handleNudgeCue(index, 'start', -0.1)],
                                                            ['S+', () => handleNudgeCue(index, 'start', 0.1)],
                                                            ['E−', () => handleNudgeCue(index, 'end', -0.1)],
                                                            ['E+', () => handleNudgeCue(index, 'end', 0.1)],
                                                        ] as [string, () => void][]
                                                    ).map(([nudgeLabel, nudgeHandler]) => (
                                                        <button
                                                            key={nudgeLabel}
                                                            type="button"
                                                            onClick={nudgeHandler}
                                                            style={{
                                                                padding: '2px 6px',
                                                                border: '1.5px solid #000',
                                                                borderRadius: 3,
                                                                background: '#fff',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 900,
                                                                fontSize: '0.6rem',
                                                                cursor: 'pointer',
                                                            }}
                                                            title="Nudge timing by 0.1s"
                                                        >
                                                            {nudgeLabel}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <textarea
                                                value={cue.text}
                                                onChange={(e) => handleUpdateCueText(index, e.target.value)}
                                                style={{
                                                    ...BRUT_INPUT,
                                                    minHeight: 44,
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit',
                                                    fontSize: '0.82rem',
                                                }}
                                            />

                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSplitCue(index)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '3px 8px',
                                                        border: '1.5px solid #000',
                                                        borderRadius: 3,
                                                        background: '#fff',
                                                        color: '#000',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        fontSize: '0.6rem',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    <Scissors size={11} /> Split
                                                </button>
                                                {index < cues.length - 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMergeWithNextCue(index)}
                                                        style={{
                                                            padding: '3px 8px',
                                                            border: '1.5px solid #000',
                                                            borderRadius: 3,
                                                            background: '#fff',
                                                            color: '#000',
                                                            fontFamily: 'monospace',
                                                            fontWeight: 900,
                                                            fontSize: '0.6rem',
                                                            cursor: 'pointer',
                                                            textTransform: 'uppercase',
                                                        }}
                                                    >
                                                        Merge Next
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCue(index)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '3px 8px',
                                                        border: '1.5px solid #dc2626',
                                                        borderRadius: 3,
                                                        background: '#fff',
                                                        color: '#dc2626',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        fontSize: '0.6rem',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase',
                                                        marginLeft: 'auto',
                                                    }}
                                                >
                                                    <Trash2 size={11} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAB 2: Transcript */}
                        {activeTab === 'text' && (
                            <div className="brutalist-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <textarea
                                    value={fullText}
                                    onChange={(e) => setFullText(e.target.value)}
                                    placeholder="Full transcript…"
                                    style={{
                                        ...BRUT_INPUT,
                                        minHeight: 220,
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.55,
                                        fontSize: '0.84rem',
                                    }}
                                />
                                <button
                                    type="button"
                                    className="brutalist-button"
                                    style={{ fontSize: '0.72rem', padding: '9px 14px' }}
                                    onClick={() => setCues(alignScriptWithAudioCues(cues, fullText))}
                                    disabled={cues.length === 0 || fullText.trim().length === 0}
                                >
                                    Align edited transcript
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
