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
    FileText,
    Copy,
    Check,
    RotateCcw,
    Film,
    Sparkles,
    Palette,
    Play,
    Pause,
    Layers,
    Disc,
    Sliders,
    Type,
    Key,
    Settings,
    Plus,
    Trash2,
    Scissors,
    GitMerge,
    Search,
    Wand2,
    ExternalLink,
    ShieldCheck,
    X,
    ChevronUp,
    ChevronDown,
    Cpu,
    Zap,
    Globe,
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

const STORAGE_KEYS = {
    CUES: 'creatorkit_autoCaptions_cues',
    FULL_TEXT: 'creatorkit_autoCaptions_fullText',
    FILE_NAME: 'creatorkit_autoCaptions_fileName',
    ELAPSED: 'creatorkit_autoCaptions_elapsed',
    DURATION: 'creatorkit_autoCaptions_duration',
    AUDIO_KEY: 'current_caption_audio',
};

/**
 * Tactile Segmented Loading Bar matching the transport scrubber from Text Match CUT
 */
function TactileProgressBar({
    percent,
    label,
    statusText,
}: {
    percent: number;
    label?: string;
    statusText?: string;
}) {
    const clamped = Math.min(100, Math.max(0, percent));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                }}
            >
                <span
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        color: '#000',
                        letterSpacing: '0.08em',
                    }}
                >
                    {label || 'Processing...'}
                </span>
                {statusText && (
                    <span
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#555',
                        }}
                    >
                        {statusText}
                    </span>
                )}
            </div>

            {/* Scrubber Capsule (no + / - buttons, matching Text Match CUT) */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#fff',
                    padding: '4px 8px',
                    border: '2px solid #000',
                    borderRadius: 4,
                    boxShadow: '2px 2px 0 #000',
                    width: '100%',
                    boxSizing: 'border-box',
                }}
            >
                {/* Tactile Fill Track */}
                <div
                    style={{
                        position: 'relative',
                        flex: 1,
                        height: 18,
                        background: '#e5e7eb',
                        border: '1.5px solid #000',
                        borderRadius: 3,
                        overflow: 'hidden',
                        userSelect: 'none',
                    }}
                >
                    {/* Active Yellow Fill */}
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${clamped}%`,
                            background: '#FFE500',
                            borderRight: clamped > 0 && clamped < 100 ? '1.5px solid #000' : 'none',
                            transition: 'width 0.25s ease-out',
                        }}
                    />

                    {/* Tactile Gauge Grip Grooves */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-evenly',
                            pointerEvents: 'none',
                            opacity: 0.35,
                        }}
                    >
                        <div style={{ width: 1.5, height: 10, background: '#000' }} />
                        <div style={{ width: 1.5, height: 10, background: '#000' }} />
                        <div style={{ width: 1.5, height: 10, background: '#000' }} />
                        <div style={{ width: 1.5, height: 10, background: '#000' }} />
                        <div style={{ width: 1.5, height: 10, background: '#000' }} />
                        <div style={{ width: 1.5, height: 10, background: '#000' }} />
                        <div style={{ width: 1.5, height: 10, background: '#000' }} />
                    </div>
                </div>

                {/* Monospace percentage readout badge */}
                <div
                    style={{
                        padding: '2px 8px',
                        background: '#FFE500',
                        border: '1.5px solid #000',
                        borderRadius: 3,
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        minWidth: 48,
                        textAlign: 'center',
                        color: '#000',
                        boxShadow: '1px 1px 0 #000',
                    }}
                >
                    {Math.round(clamped)}%
                </div>
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
            } catch {}
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
            } catch {}
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
                try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch {}
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
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch {}
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
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch {}
            return next;
        });
    };

    const handleDeleteCue = (index: number) => {
        setCues((prev) => {
            const next = prev.filter((_, i) => i !== index);
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch {}
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
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch {}
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
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch {}
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
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch {}
            return next;
        });
        setFullText((prev) => {
            const regex = new RegExp(findQuery, 'gi');
            const next = prev.replace(regex, replaceQuery);
            try { localStorage.setItem(STORAGE_KEYS.FULL_TEXT, next); } catch {}
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
        setByokSavedToast(`${provider === 'groq' ? 'Groq' : 'OpenAI'} API Key Saved!`);
        setTimeout(() => setByokSavedToast(null), 3000);
        setByokModalOpen(false);
    };

    const handleClearApiKey = (provider: CloudTranscriptionProvider) => {
        setStoredApiKey(provider, '');
        if (provider === 'groq') setGroqKey('');
        if (provider === 'openai') setOpenaiKey('');
        setByokSavedToast(`${provider === 'groq' ? 'Groq' : 'OpenAI'} API Key Cleared`);
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
            {/* Top Studio Title Section matching Text Match CUT / Text Highlighter */}
            <div
                className="tool-page-header"
                style={{
                    marginBottom: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                }}
            >
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
                        CREATORKIT STUDIO
                    </span>
                    <span
                        style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#666',
                            fontFamily: 'monospace',
                        }}
                    >
                        STUDIO SUBTITLES
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                        marginTop: 4,
                    }}
                >
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
                    <p
                        style={{
                            fontSize: '0.85rem',
                            color: '#555',
                            maxWidth: 720,
                            lineHeight: 1.5,
                            fontWeight: 500,
                            margin: 0,
                        }}
                    >
                        100% Free speech-to-text subtitles. Use offline browser Whisper or bring your own free Groq/OpenAI key.
                    </p>
                </div>
            </div>

            {/* Toast Notification */}
            {byokSavedToast && (
                <div
                    style={{
                        marginBottom: 12,
                        padding: '8px 14px',
                        background: '#22c55e',
                        color: '#000',
                        border: '2px solid #000',
                        boxShadow: '2px 2px 0 #000',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: '0.76rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <Check size={16} strokeWidth={3} />
                    <span>{byokSavedToast}</span>
                </div>
            )}

            {/* Transcription Engine Selector Bar */}
            <div
                style={{
                    background: '#fff',
                    border: '2px solid #000',
                    borderRadius: 4,
                    boxShadow: '3px 3px 0 #000',
                    padding: '10px 14px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                        }}
                    >
                        TRANSCRIPTION ENGINE:
                    </span>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setTranscriptionEngine('local')}
                            style={{
                                padding: '5px 10px',
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                background: transcriptionEngine === 'local' ? '#FFE500' : '#f4f4f5',
                                color: '#000',
                                border: '1.5px solid #000',
                                borderRadius: 3,
                                cursor: 'pointer',
                                boxShadow: transcriptionEngine === 'local' ? '1.5px 1.5px 0 #000' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}
                        >
                            <Cpu size={12} strokeWidth={2.5} />
                            <span>LOCAL WHISPER (OFFLINE)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setTranscriptionEngine('groq');
                                if (!groqKey) {
                                    setByokModalProvider('groq');
                                    setTempKeyInput('');
                                    setByokModalOpen(true);
                                }
                            }}
                            style={{
                                padding: '5px 10px',
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                background: transcriptionEngine === 'groq' ? '#FFE500' : '#f4f4f5',
                                color: '#000',
                                border: '1.5px solid #000',
                                borderRadius: 3,
                                cursor: 'pointer',
                                boxShadow: transcriptionEngine === 'groq' ? '1.5px 1.5px 0 #000' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}
                        >
                            <Zap size={12} strokeWidth={2.5} />
                            <span>GROQ CLOUD (10x FAST · BYOK)</span>
                            {groqKey && (
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} title="Key active" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setTranscriptionEngine('openai');
                                if (!openaiKey) {
                                    setByokModalProvider('openai');
                                    setTempKeyInput('');
                                    setByokModalOpen(true);
                                }
                            }}
                            style={{
                                padding: '5px 10px',
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                background: transcriptionEngine === 'openai' ? '#FFE500' : '#f4f4f5',
                                color: '#000',
                                border: '1.5px solid #000',
                                borderRadius: 3,
                                cursor: 'pointer',
                                boxShadow: transcriptionEngine === 'openai' ? '1.5px 1.5px 0 #000' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}
                        >
                            <Globe size={12} strokeWidth={2.5} />
                            <span>OPENAI WHISPER (BYOK)</span>
                            {openaiKey && (
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} title="Key active" />
                            )}
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setByokModalProvider(transcriptionEngine === 'openai' ? 'openai' : 'groq');
                        setTempKeyInput(transcriptionEngine === 'openai' ? openaiKey : groqKey);
                        setByokModalOpen(true);
                    }}
                    style={{
                        padding: '5px 10px',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: '#fff',
                        color: '#000',
                        border: '1.5px solid #000',
                        borderRadius: 3,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                    }}
                >
                    <Key size={12} strokeWidth={2.5} />
                    <span>MANAGE API KEYS</span>
                </button>
            </div>

            {/* 1-Click Teleprompter Handoff Banner */}
            {pendingHandoff && !file && !isProcessing && (
                <div
                    style={{
                        marginBottom: 16,
                        background: '#FFE500',
                        border: '2px solid #000',
                        borderRadius: 4,
                        boxShadow: '3px 3px 0 #000',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                background: '#000',
                                color: '#FFE500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 3,
                                flexShrink: 0,
                            }}
                        >
                            <Sparkles size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 900, color: '#000' }}>
                                TELEPROMPTER TAKE READY TO TRANSCRIBE!
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700, color: '#333' }}>
                                File: {pendingHandoff.fileName} ({(pendingHandoff.mediaBlob.size / (1024 * 1024)).toFixed(1)} MB) · Script automatically embedded
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            onClick={async () => {
                                const transferredFile = new File(
                                    [pendingHandoff.mediaBlob],
                                    pendingHandoff.fileName || 'teleprompter_take.webm',
                                    {
                                        type: pendingHandoff.mediaBlob.type || 'audio/webm',
                                    }
                                );
                                await clearHandoffSession();
                                setPendingHandoff(null);
                                handleFile(transferredFile);
                            }}
                            style={{
                                padding: '8px 14px',
                                background: '#000',
                                color: '#FFE500',
                                border: '2px solid #000',
                                borderRadius: 3,
                                fontFamily: 'monospace',
                                fontSize: '0.76rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '2px 2px 0 rgba(0,0,0,0.3)',
                            }}
                        >
                            <Sparkles size={14} strokeWidth={2.5} />
                            <span>1-CLICK: TRANSCRIBE TAKE</span>
                        </button>

                        <button
                            type="button"
                            onClick={async () => {
                                await clearHandoffSession();
                                setPendingHandoff(null);
                            }}
                            style={{
                                padding: '8px 10px',
                                background: '#fff',
                                color: '#000',
                                border: '1.5px solid #000',
                                borderRadius: 3,
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                            }}
                        >
                            DISMISS
                        </button>
                    </div>
                </div>
            )}

            {/* Magic Metadata Detected Banner */}
            {magicMetadata && !magicBannerDismissed && (
                <div
                    style={{
                        marginBottom: 16,
                        background: '#dcfce7',
                        border: '2px solid #16a34a',
                        borderRadius: 4,
                        boxShadow: '3px 3px 0 #16a34a',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Sparkles size={18} color="#16a34a" strokeWidth={2.5} />
                        <div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 900, color: '#166534' }}>
                                ✨ MAGIC METADATA DETECTED: TELEPROMPTER SCRIPT ALIGNED!
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700, color: '#15803d' }}>
                                Auto Captions extracted the exact reading script directly from your media file. Timings and spelling match 100%.
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMagicBannerDismissed(true)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#166534',
                            cursor: 'pointer',
                            padding: 4,
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* BYOK Settings Modal */}
            {byokModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            border: '3px solid #000',
                            boxShadow: '6px 6px 0 #000',
                            borderRadius: 4,
                            maxWidth: 520,
                            width: '100%',
                            padding: 24,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Key size={18} strokeWidth={2.5} />
                                    <h3 style={{ margin: 0, fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                        Bring Your Own Key (BYOK)
                                    </h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#555', fontFamily: 'monospace' }}>
                                    Keep your transcription 100% free and lightning fast with your personal API key.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setByokModalOpen(false)}
                                style={{
                                    background: '#f4f4f5',
                                    border: '1.5px solid #000',
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    padding: '4px 6px',
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Provider Tabs in Modal */}
                        <div style={{ display: 'flex', borderBottom: '2px solid #000', gap: 6 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setByokModalProvider('groq');
                                    setTempKeyInput(groqKey);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.74rem',
                                    fontWeight: 900,
                                    background: byokModalProvider === 'groq' ? '#FFE500' : '#f4f4f5',
                                    borderTop: '2px solid #000',
                                    borderLeft: '2px solid #000',
                                    borderRight: '2px solid #000',
                                    borderBottom: byokModalProvider === 'groq' ? '2px solid #FFE500' : 'none',
                                    marginBottom: byokModalProvider === 'groq' ? -2 : 0,
                                    borderRadius: '3px 3px 0 0',
                                    cursor: 'pointer',
                                }}
                            >
                                GROQ (RECOMMENDED · FREE)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setByokModalProvider('openai');
                                    setTempKeyInput(openaiKey);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.74rem',
                                    fontWeight: 900,
                                    background: byokModalProvider === 'openai' ? '#FFE500' : '#f4f4f5',
                                    borderTop: '2px solid #000',
                                    borderLeft: '2px solid #000',
                                    borderRight: '2px solid #000',
                                    borderBottom: byokModalProvider === 'openai' ? '2px solid #FFE500' : 'none',
                                    marginBottom: byokModalProvider === 'openai' ? -2 : 0,
                                    borderRadius: '3px 3px 0 0',
                                    cursor: 'pointer',
                                }}
                            >
                                OPENAI
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                {byokModalProvider === 'groq' ? 'Groq API Key (Starts with gsk_)' : 'OpenAI API Key (Starts with sk-)'}
                            </label>

                            <input
                                type="password"
                                value={tempKeyInput}
                                onChange={(e) => setTempKeyInput(e.target.value)}
                                placeholder={byokModalProvider === 'groq' ? 'gsk_xxxxxxxxxxxxxxxxxxxx' : 'sk-xxxxxxxxxxxxxxxxxxxx'}
                                style={{
                                    padding: '10px 12px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                    border: '2px solid #000',
                                    borderRadius: 3,
                                    width: '100%',
                                    boxSizing: 'border-box',
                                }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#666', fontFamily: 'monospace' }}>
                                <span>🔒 Keys are stored strictly in your browser&apos;s localStorage</span>
                                {byokModalProvider === 'groq' ? (
                                    <a
                                        href="https://console.groq.com/keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#000', textDecoration: 'underline', fontWeight: 800 }}
                                    >
                                        Get Free Groq Key →
                                    </a>
                                ) : (
                                    <a
                                        href="https://platform.openai.com/api-keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#000', textDecoration: 'underline', fontWeight: 800 }}
                                    >
                                        Get OpenAI Key →
                                    </a>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            {(byokModalProvider === 'groq' ? groqKey : openaiKey) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleClearApiKey(byokModalProvider);
                                        setTempKeyInput('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        background: '#fee2e2',
                                        color: '#b91c1c',
                                        border: '1.5px solid #b91c1c',
                                        borderRadius: 3,
                                        fontFamily: 'monospace',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                    }}
                                >
                                    CLEAR KEY
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setByokModalOpen(false)}
                                style={{
                                    padding: '8px 14px',
                                    background: '#f4f4f5',
                                    color: '#000',
                                    border: '1.5px solid #000',
                                    borderRadius: 3,
                                    fontFamily: 'monospace',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                }}
                            >
                                CANCEL
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSaveApiKey(byokModalProvider, tempKeyInput.trim())}
                                style={{
                                    padding: '8px 18px',
                                    background: '#FFE500',
                                    color: '#000',
                                    border: '2px solid #000',
                                    borderRadius: 3,
                                    boxShadow: '2px 2px 0 #000',
                                    fontFamily: 'monospace',
                                    fontSize: '0.74rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                }}
                            >
                                SAVE KEY
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Decode / Transcription Error Banner with Cloud Fallback */}
            {!isProcessing && progress.stage === 'error' && (
                <div
                    style={{
                        marginBottom: 16,
                        background: '#fee2e2',
                        border: '2px solid #b91c1c',
                        borderRadius: 4,
                        boxShadow: '3px 3px 0 #b91c1c',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                    role="alert"
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                color: '#fff',
                                background: '#b91c1c',
                                padding: '3px 8px',
                                borderRadius: 3,
                                flexShrink: 0,
                            }}
                        >
                            ⚠ FAILED
                        </span>
                        <p
                            style={{
                                margin: 0,
                                fontFamily: 'monospace',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#7f1d1d',
                                lineHeight: 1.5,
                            }}
                        >
                            {progress.message}
                        </p>
                    </div>

                    {file && file.size > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => handleFile(file, 'local')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '7px 12px',
                                    background: '#fff',
                                    color: '#000',
                                    border: '2px solid #000',
                                    borderRadius: 3,
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    boxShadow: '2px 2px 0 #000',
                                }}
                            >
                                <RotateCcw size={13} strokeWidth={2.5} />
                                <span>RETRY LOCAL WHISPER</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFile(file, 'groq')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '7px 12px',
                                    background: '#FFE500',
                                    color: '#000',
                                    border: '2px solid #000',
                                    borderRadius: 3,
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    boxShadow: '2px 2px 0 #000',
                                }}
                            >
                                <Zap size={13} strokeWidth={2.5} />
                                <span>RETRY WITH GROQ CLOUD</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFile(file, 'openai')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '7px 12px',
                                    background: '#fff',
                                    color: '#000',
                                    border: '2px solid #000',
                                    borderRadius: 3,
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    boxShadow: '2px 2px 0 #000',
                                }}
                            >
                                <Globe size={13} strokeWidth={2.5} />
                                <span>RETRY WITH OPENAI</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* File Upload Zone (When idle and no file active) */}
            {!file && !isProcessing && (
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fff',
                        border: '2px dashed #000',
                        borderRadius: 4,
                        boxShadow: '4px 4px 0 #000',
                        padding: '60px 24px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        minHeight: 280,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
                            width: 56,
                            height: 56,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#FFE500',
                            border: '2px solid #000',
                            borderRadius: 4,
                            boxShadow: '2px 2px 0 #000',
                            marginBottom: 16,
                        }}
                    >
                        <Upload size={26} color="#000" strokeWidth={2.5} />
                    </div>

                    <h3
                        style={{
                            fontSize: '1.2rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            color: '#000',
                            letterSpacing: '-0.02em',
                            margin: '0 0 6px 0',
                        }}
                    >
                        Drop Audio or Video File Here
                    </h3>
                    <p
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: '#666',
                            margin: '0 0 20px 0',
                        }}
                    >
                        MP3 · WAV · M4A · AAC · MP4 · MOV · WEBM
                    </p>

                    <button
                        type="button"
                        style={{
                            background: '#000',
                            color: '#fff',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            padding: '8px 18px',
                            border: '2px solid #000',
                            borderRadius: 3,
                            boxShadow: '2px 2px 0 #000',
                            cursor: 'pointer',
                        }}
                    >
                        Select Media File
                    </button>
                </div>
            )}

            {/* Processing State with Tactile Segmented Loading Bar */}
            {isProcessing && (
                <div
                    style={{
                        background: '#fff',
                        border: '2px solid #000',
                        borderRadius: 4,
                        boxShadow: '4px 4px 0 #000',
                        padding: '32px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        maxWidth: 720,
                        margin: '40px auto',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                background: '#FFE500',
                                padding: '2px 6px',
                                border: '1.5px solid #000',
                                boxShadow: '1px 1px 0 #000',
                            }}
                        >
                            PROCESSING
                        </span>
                        <span
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#666',
                            }}
                        >
                            GENERATING SUBTITLES
                        </span>
                    </div>

                    {/* Tactile Progress Capsule */}
                    <TactileProgressBar
                        percent={progress.percent ?? (progress.stage === 'complete' ? 100 : 50)}
                        label="Generating captions..."
                    />

                    <p
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            color: '#666',
                            margin: 0,
                            lineHeight: 1.4,
                        }}
                    >
                        Transcribing speech and aligning word timestamps. This will only take a moment.
                    </p>
                </div>
            )}

            {/* Active Results: 2-Column Brutalist Studio Grid */}
            {file && !isProcessing && (
                <div
                    className="captions-workspace-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.22fr) minmax(360px, 460px)',
                        gap: 20,
                        alignItems: 'start',
                    }}
                >
                    {/* Left Column: Cassette Player & Live Subtitle Visualizer */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div
                            style={{
                                background: '#fff',
                                border: '2px solid #000',
                                borderRadius: 4,
                                boxShadow: '3px 3px 0 #000',
                                padding: '16px 18px',
                            }}
                        >
                            {/* Deck Mode Toggle Header: Cassette Player vs Video Overlay Studio */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 16,
                                    borderBottom: '2px solid #000',
                                    paddingBottom: 10,
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveStudioDeck('cassette')}
                                        style={{
                                            padding: '4px 10px',
                                            fontFamily: 'monospace',
                                            fontSize: '0.72rem',
                                            fontWeight: 900,
                                            background: activeStudioDeck === 'cassette' ? '#FFE500' : '#f4f4f5',
                                            color: '#000',
                                            border: '1.5px solid #000',
                                            borderRadius: 3,
                                            cursor: 'pointer',
                                            boxShadow: activeStudioDeck === 'cassette' ? '2px 2px 0 #000' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        <Disc size={13} strokeWidth={2.5} />
                                        <span>CASSETTE MONITOR</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveStudioDeck('overlay')}
                                        style={{
                                            padding: '4px 10px',
                                            fontFamily: 'monospace',
                                            fontSize: '0.72rem',
                                            fontWeight: 900,
                                            background: activeStudioDeck === 'overlay' ? '#FFE500' : '#f4f4f5',
                                            color: '#000',
                                            border: '1.5px solid #000',
                                            borderRadius: 3,
                                            cursor: 'pointer',
                                            boxShadow: activeStudioDeck === 'overlay' ? '2px 2px 0 #000' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        <Film size={13} strokeWidth={2.5} />
                                        <span>VIDEO OVERLAY STUDIO</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={resetSession}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        background: '#fff',
                                        border: '1.5px solid #000',
                                        borderRadius: 3,
                                        padding: '3px 8px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '1px 1px 0 #000',
                                    }}
                                    title="Choose a new file to transcribe"
                                >
                                    <RotateCcw size={12} />
                                    <span>RESET / NEW FILE</span>
                                </button>
                            </div>

                            {/* Teleprompter Script Sync Box */}
                            <div
                                style={{
                                    marginBottom: 14,
                                    padding: '8px 12px',
                                    background: '#f9fafb',
                                    border: '2px solid #000',
                                    borderRadius: 4,
                                    boxShadow: '2px 2px 0 #000',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 900, color: '#000', textTransform: 'uppercase' }}>
                                        Teleprompter Script Anchor (Optional)
                                    </span>
                                    {teleprompterScript && teleprompterScript.trim().length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleAlignWithTeleprompter}
                                            disabled={scriptAligned}
                                            style={{
                                                background: scriptAligned ? '#22c55e' : '#FFE500',
                                                color: '#000',
                                                fontFamily: 'monospace',
                                                fontSize: '0.62rem',
                                                fontWeight: 900,
                                                padding: '3px 8px',
                                                border: '1.5px solid #000',
                                                borderRadius: 3,
                                                cursor: scriptAligned ? 'default' : 'pointer',
                                                boxShadow: '1px 1px 0 #000',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            {scriptAligned ? '✓ ALIGNED' : 'ALIGN AUDIO TIMESTAMPS'}
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={teleprompterScript || ''}
                                    onChange={(e) => {
                                        setTeleprompterScript(e.target.value);
                                        localStorage.setItem('creatorkit_teleprompter_script', e.target.value);
                                    }}
                                    placeholder="Paste your Teleprompter script here to instantly fix all AI caption mistakes..."
                                    style={{
                                        width: '100%',
                                        minHeight: 50,
                                        padding: 8,
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        border: '1.5px solid #000',
                                        borderRadius: 3,
                                        resize: 'vertical',
                                        background: teleprompterScript ? '#FEF08A' : '#fff',
                                        color: '#000',
                                    }}
                                />
                                {teleprompterScript && teleprompterScript.trim().length > 0 && (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.6rem', color: '#b45309', fontFamily: 'monospace', fontWeight: 700 }}>
                                        {teleprompterScript.trim().split(/\s+/).length} words detected. Click "ALIGN AUDIO TIMESTAMPS" to override the AI!
                                    </p>
                                )}
                            </div>

                            {/* DECK 1: Cassette Player View */}
                            {activeStudioDeck === 'cassette' && (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
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

                            {/* DECK 2: Video Overlay Studio View */}
                            {activeStudioDeck === 'overlay' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {/* Audio element for overlay sync */}
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

                                    {/* Canvas Live Preview Stage with Checkerboard Transparency */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            background: overlayBackground === 'green-screen'
                                                ? '#00FF00'
                                                : overlayBackground === 'magenta-screen'
                                                    ? '#FF00FF'
                                                    : 'repeating-conic-gradient(#f4f4f5 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
                                            border: '2px solid #000',
                                            borderRadius: 4,
                                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
                                            padding: 16,
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <canvas
                                            ref={overlayCanvasRef}
                                            style={{
                                                maxWidth: '100%',
                                                height: overlayAspectRatio === '9:16' ? 360 : 200,
                                                borderRadius: 4,
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                                                border: '1.5px solid #000',
                                                background: 'transparent',
                                                display: 'block',
                                            }}
                                        />

                                        {/* Overlay Transport Control Bar */}
                                        <div
                                            style={{
                                                marginTop: 12,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                background: '#fff',
                                                padding: '4px 10px',
                                                border: '1.5px solid #000',
                                                borderRadius: 4,
                                                boxShadow: '2px 2px 0 #000',
                                                width: '100%',
                                                maxWidth: 420,
                                                boxSizing: 'border-box',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={toggleOverlayPlayback}
                                                style={{
                                                    background: overlayPlaying ? '#FFE500' : '#000',
                                                    color: overlayPlaying ? '#000' : '#fff',
                                                    border: '1.5px solid #000',
                                                    borderRadius: '50%',
                                                    width: 28,
                                                    height: 28,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {overlayPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                                            </button>

                                            {/* Tactile Transport Scrubber */}
                                            <div style={{ flex: 1 }}>
                                                <TactileScrubber
                                                    value={overlayCurrentTime}
                                                    min={0}
                                                    max={audioDuration || (cues.length > 0 ? cues[cues.length - 1].end : 10)}
                                                    step={0.05}
                                                    stepDelta={0.5}
                                                    height={12}
                                                    fillColor={overlayColor}
                                                    showSteppers={false}
                                                    onChange={(t) => {
                                                        setOverlayCurrentTime(t);
                                                        if (overlayAudioRef.current) {
                                                            overlayAudioRef.current.currentTime = t;
                                                        }
                                                    }}
                                                />
                                            </div>

                                            <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 900, minWidth: 42, textAlign: 'right' }}>
                                                {overlayCurrentTime.toFixed(1)}s
                                            </span>
                                        </div>
                                    </div>

                                    {/* 3 Video Caption Modes Selector */}
                                    <div style={{ background: '#f4f4f5', padding: '10px 12px', border: '1.5px solid #000', borderRadius: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <label style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                                Caption Style Mode
                                            </label>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', fontWeight: 700, color: '#666' }}>
                                                {videoMode === 'teleprompter' ? 'Word-by-word active tracking' : videoMode === 'kinetic-pop' ? 'Kinetic scale bounce with outline' : 'Clean lower-third, silent during pauses'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                            {[
                                                { id: 'teleprompter', label: 'WORD HIGHLIGHT', desc: 'Teleprompter' },
                                                { id: 'kinetic-pop', label: 'KINETIC POP', desc: 'Creator Shorts' },
                                                { id: 'minimal', label: 'MINIMAL SUBTITLES', desc: 'TV & Film' },
                                            ].map((m) => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => setVideoMode(m.id as CaptionVideoMode)}
                                                    style={{
                                                        padding: '8px 4px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.68rem',
                                                        fontWeight: 900,
                                                        background: videoMode === m.id ? '#FFE500' : '#fff',
                                                        color: '#000',
                                                        border: '1.5px solid #000',
                                                        borderRadius: 3,
                                                        cursor: 'pointer',
                                                        boxShadow: videoMode === m.id ? '2px 2px 0 #000' : 'none',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                    }}
                                                >
                                                    <span>{m.label}</span>
                                                    <span style={{ fontSize: '0.58rem', fontWeight: 600, color: '#555' }}>{m.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Typography & Position Controls Suite */}
                                    <div style={{ background: '#f4f4f5', padding: '10px 12px', border: '1.5px solid #000', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                                Typography & Positioning
                                            </span>
                                        </div>

                                        {/* Font Family Selector */}
                                        <div>
                                            <label style={{ fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                                                Font Family
                                            </label>
                                            <div style={{ display: 'flex', overflowX: 'auto', gap: 6, paddingBottom: 6 }}>
                                                {(POPULAR_OVERLAY_FONTS || DEFAULT_OVERLAY_FONTS).map((f) => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        onClick={() => setCaptionFont(f.id)}
                                                        style={{
                                                            padding: '5px 8px',
                                                            fontFamily: f.family,
                                                            fontSize: '0.68rem',
                                                            fontWeight: 900,
                                                            background: captionFont === f.id ? '#FFE500' : '#fff',
                                                            color: '#000',
                                                            border: '1.5px solid #000',
                                                            borderRadius: 3,
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                        }}
                                                        title={f.name}
                                                    >
                                                        {f.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Emoji Mode Toggle */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '6px 10px', border: '1.5px solid #000', borderRadius: 4 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                                    Emoji Mode
                                                </span>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', fontWeight: 700, color: '#666' }}>
                                                    Auto-inject emojis for common words
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEmojiMode(!emojiMode)}
                                                style={{
                                                    width: 40,
                                                    height: 22,
                                                    background: emojiMode ? '#22c55e' : '#e5e7eb',
                                                    border: '1.5px solid #000',
                                                    borderRadius: 12,
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 14,
                                                        height: 14,
                                                        background: '#fff',
                                                        border: '1.5px solid #000',
                                                        borderRadius: '50%',
                                                        position: 'absolute',
                                                        top: 2,
                                                        left: emojiMode ? 20 : 2,
                                                        transition: 'left 0.2s',
                                                    }}
                                                />
                                            </button>
                                        </div>

                                        {/* Caption Pill Background Selector */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <label style={{ fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                                    Caption Pill Background
                                                </label>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.60rem', fontWeight: 700, color: '#666' }}>
                                                    {captionPillBg === 'clear' ? 'Transparent (Floating text)' : captionPillBg === 'dark' ? 'Onyx Dark Pill' : captionPillBg === 'light' ? 'Snow White Pill' : 'Custom'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                                                {[
                                                    { id: 'clear', label: 'CLEAR', desc: 'No Pill' },
                                                    { id: 'dark', label: 'DARK', desc: 'Onyx' },
                                                    { id: 'light', label: 'LIGHT', desc: 'Snow' },
                                                    { id: 'custom', label: 'CUSTOM', desc: 'Hex' },
                                                ].map((p) => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => setCaptionPillBg(p.id as CaptionPillBackground)}
                                                        style={{
                                                            padding: '5px 2px',
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.66rem',
                                                            fontWeight: 900,
                                                            background: captionPillBg === p.id ? '#FFE500' : '#fff',
                                                            color: '#000',
                                                            border: '1.5px solid #000',
                                                            borderRadius: 3,
                                                            cursor: 'pointer',
                                                            boxShadow: captionPillBg === p.id ? '2px 2px 0 #000' : 'none',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                        }}
                                                    >
                                                        <span>{p.label}</span>
                                                        <span style={{ fontSize: '0.54rem', fontWeight: 600, color: '#555' }}>{p.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {captionPillBg === 'custom' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, background: '#fff', padding: '4px 6px', border: '1.5px solid #000', borderRadius: 3 }}>
                                                    <input
                                                        type="color"
                                                        value={captionPillCustomColor}
                                                        onChange={(e) => setCaptionPillCustomColor(e.target.value)}
                                                        style={{ width: 24, height: 24, border: '1.5px solid #000', borderRadius: 3, cursor: 'pointer', padding: 0 }}
                                                        title="Pick custom pill color"
                                                    />
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 800 }}>
                                                        Pill Fill: {captionPillCustomColor}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tactile Sliders Grid: Font Size, Letter Spacing, Vertical Position */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                                            {/* Font Size */}
                                            <TactileScrubber
                                                label="Size"
                                                value={captionFontSize}
                                                min={24}
                                                max={84}
                                                step={2}
                                                stepDelta={2}
                                                height={12}
                                                fillColor="#FFE500"
                                                showSteppers={false}
                                                formatValue={(v) => `${v}px`}
                                                onChange={setCaptionFontSize}
                                            />

                                            {/* Letter Spacing */}
                                            <TactileScrubber
                                                label="Spacing"
                                                value={captionLetterSpacing}
                                                min={-2}
                                                max={8}
                                                step={1}
                                                stepDelta={1}
                                                height={12}
                                                fillColor="#FFE500"
                                                showSteppers={false}
                                                formatValue={(v) => `${v}px`}
                                                onChange={setCaptionLetterSpacing}
                                            />

                                            {/* Vertical Position */}
                                            <TactileScrubber
                                                label="Vertical Y"
                                                value={captionYPosition}
                                                min={15}
                                                max={88}
                                                step={1}
                                                stepDelta={2}
                                                height={12}
                                                fillColor="#FFE500"
                                                showSteppers={false}
                                                formatValue={(v) => `${v}%`}
                                                onChange={setCaptionYPosition}
                                            />
                                        </div>

                                        {/* Dynamic Animation & Physics Engine Controls */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', padding: '8px 10px', border: '1.5px solid #000', borderRadius: 4 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                                    Animation & Dynamic Physics
                                                </span>
                                            </div>

                                            {/* Spring Physics Switch */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 900 }}>
                                                        Spring Physics Bounce
                                                    </span>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.56rem', color: '#666' }}>
                                                        Dynamic overshoot & settle curves on active words
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSpringPhysics(!springPhysics)}
                                                    style={{
                                                        width: 36,
                                                        height: 20,
                                                        background: springPhysics ? '#22c55e' : '#e5e7eb',
                                                        border: '1.5px solid #000',
                                                        borderRadius: 10,
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: 12,
                                                            height: 12,
                                                            background: '#fff',
                                                            border: '1px solid #000',
                                                            borderRadius: '50%',
                                                            position: 'absolute',
                                                            top: 2,
                                                            left: springPhysics ? 18 : 2,
                                                            transition: 'left 0.2s',
                                                        }}
                                                    />
                                                </button>
                                            </div>

                                            {/* Bounce Intensity Scrubber */}
                                            {springPhysics && (
                                                <TactileScrubber
                                                    label="Bounce Power"
                                                    value={bounceIntensity}
                                                    min={0.5}
                                                    max={2.5}
                                                    step={0.1}
                                                    stepDelta={0.1}
                                                    height={12}
                                                    fillColor="#FFE500"
                                                    showSteppers={false}
                                                    formatValue={(v) => `${v.toFixed(1)}x`}
                                                    onChange={setBounceIntensity}
                                                />
                                            )}

                                            {/* Word Rotation Tilt & Text Shadow & Uppercase Row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, paddingTop: 4, borderTop: '1px solid #e5e7eb' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setWordRotation(!wordRotation)}
                                                    style={{
                                                        padding: '5px 4px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 900,
                                                        background: wordRotation ? '#FFE500' : '#f4f4f5',
                                                        border: '1.5px solid #000',
                                                        borderRadius: 3,
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    ROTATION TILT
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setTextShadow(!textShadow)}
                                                    style={{
                                                        padding: '5px 4px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 900,
                                                        background: textShadow ? '#FFE500' : '#f4f4f5',
                                                        border: '1.5px solid #000',
                                                        borderRadius: 3,
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    DROP SHADOW
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setUppercase(!uppercase)}
                                                    style={{
                                                        padding: '5px 4px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 900,
                                                        background: uppercase ? '#FFE500' : '#f4f4f5',
                                                        border: '1.5px solid #000',
                                                        borderRadius: 3,
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    ALL CAPS
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Highlighter Color & Aspect Ratio Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                        {/* Highlight Color Picker */}
                                        <div style={{ background: '#f4f4f5', padding: '8px 10px', border: '1.5px solid #000', borderRadius: 4 }}>
                                            <label style={{ fontFamily: 'monospace', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                                Highlighter Color
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                {[
                                                    { color: '#FFE500', name: 'Yellow' },
                                                    { color: '#22C55E', name: 'Neon Green' },
                                                    { color: '#06B6D4', name: 'Cyan' },
                                                    { color: '#EC4899', name: 'Pink' },
                                                    { color: '#F97316', name: 'Orange' },
                                                    { color: '#FFFFFF', name: 'White' },
                                                ].map((swatch) => (
                                                    <button
                                                        key={swatch.color}
                                                        type="button"
                                                        title={swatch.name}
                                                        onClick={() => setOverlayColor(swatch.color)}
                                                        style={{
                                                            width: 22,
                                                            height: 22,
                                                            borderRadius: '50%',
                                                            background: swatch.color,
                                                            border: overlayColor === swatch.color ? '2.5px solid #000' : '1.5px solid #888',
                                                            cursor: 'pointer',
                                                            boxShadow: overlayColor === swatch.color ? '0 0 0 1.5px #FFE500' : 'none',
                                                        }}
                                                    />
                                                ))}
                                                <input
                                                    type="color"
                                                    value={overlayColor}
                                                    onChange={(e) => setOverlayColor(e.target.value)}
                                                    style={{ width: 26, height: 26, border: '1.5px solid #000', borderRadius: 3, cursor: 'pointer', padding: 0 }}
                                                    title="Custom color"
                                                />
                                            </div>
                                        </div>

                                        {/* Aspect Ratio */}
                                        <div style={{ background: '#f4f4f5', padding: '8px 10px', border: '1.5px solid #000', borderRadius: 4 }}>
                                            <label style={{ fontFamily: 'monospace', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                                Aspect Ratio
                                            </label>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {[
                                                    { id: '9:16', label: '9:16 Shorts' },
                                                    { id: '16:9', label: '16:9 Landscape' },
                                                ].map((ar) => (
                                                    <button
                                                        key={ar.id}
                                                        type="button"
                                                        onClick={() => setOverlayAspectRatio(ar.id as VideoAspectRatio)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '5px 2px',
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.66rem',
                                                            fontWeight: 900,
                                                            background: overlayAspectRatio === ar.id ? '#FFE500' : '#fff',
                                                            border: '1.5px solid #000',
                                                            borderRadius: 3,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {ar.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video Overlay Export Section */}
                                    <div
                                        style={{
                                            padding: '12px',
                                            background: '#fff',
                                            border: '2px solid #000',
                                            borderRadius: 4,
                                            boxShadow: '2px 2px 0 #000',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                                EXPORT VIDEO OVERLAY (DROP ON TRACK V2)
                                            </span>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', fontWeight: 700, color: '#666' }}>
                                                {overlayAspectRatio} · 1080p · Client-side
                                            </span>
                                        </div>

                                        {isRenderingVideo ? (
                                            <TactileProgressBar
                                                percent={videoRenderProgress}
                                                label="Rendering video overlay..."
                                            />
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleExportOverlayVideo('transparent')}
                                                    style={{
                                                        background: '#FFE500',
                                                        color: '#000',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.74rem',
                                                        fontWeight: 900,
                                                        padding: '10px 8px',
                                                        border: '2px solid #000',
                                                        borderRadius: 4,
                                                        boxShadow: '2px 2px 0 #000',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <Download size={14} strokeWidth={2.5} />
                                                    <span>TRANSPARENT VIDEO (.WEBM)</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleExportOverlayVideo('green-screen')}
                                                    style={{
                                                        background: '#fff',
                                                        color: '#000',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.74rem',
                                                        fontWeight: 900,
                                                        padding: '10px 8px',
                                                        border: '2px solid #000',
                                                        borderRadius: 4,
                                                        boxShadow: '2px 2px 0 #000',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '1px solid #000' }} />
                                                    <span>GREEN SCREEN (.MP4)</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Bottom Metadata Strip */}
                            <div
                                style={{
                                    marginTop: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    borderTop: '1.5px solid #e5e7eb',
                                    paddingTop: 12,
                                    fontFamily: 'monospace',
                                    fontSize: '0.72rem',
                                }}
                            >
                                <span style={{ color: '#000', fontWeight: 800 }}>
                                    FILE: {file.name}
                                </span>
                                {!audioUrl && (
                                    <span style={{ color: '#b45309', fontWeight: 800, background: '#fef3c7', padding: '1px 6px', border: '1px solid #d97706', borderRadius: 2 }}>
                                        AUDIO NOT CACHED · RE-SELECT FILE TO PLAY
                                    </span>
                                )}
                                <span
                                    style={{
                                        background: '#FFE500',
                                        border: '1px solid #000',
                                        padding: '1px 6px',
                                        fontWeight: 800,
                                        borderRadius: 2,
                                    }}
                                >
                                    {cues.length} CUES
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Subtitle Export Suite & Cues List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div
                            style={{
                                background: '#fff',
                                border: '2px solid #000',
                                borderRadius: 4,
                                boxShadow: '3px 3px 0 #000',
                                padding: '16px 18px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 14,
                                    borderBottom: '2px solid #000',
                                    paddingBottom: 10,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 900,
                                        fontFamily: 'monospace',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                    }}
                                >
                                    SUBTITLE EXPORT SUITE
                                </span>

                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        background: copied ? '#FFE500' : '#fff',
                                        border: '1.5px solid #000',
                                        borderRadius: 3,
                                        padding: '3px 8px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '1px 1px 0 #000',
                                    }}
                                >
                                    {copied ? <Check size={12} /> : <Copy size={12} />}
                                    <span>{copied ? 'COPIED' : 'COPY TEXT'}</span>
                                </button>
                            </div>

                            {/* Export Action Buttons */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: 6,
                                    marginBottom: 10,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={handleDownloadVtt}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 5,
                                        background: '#FFE500',
                                        color: '#000',
                                        border: '2px solid #000',
                                        borderRadius: 4,
                                        padding: '8px 2px',
                                        fontFamily: 'monospace',
                                        fontWeight: 900,
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        boxShadow: '2px 2px 0 #000',
                                    }}
                                >
                                    <Download size={12} strokeWidth={2.5} />
                                    <span>.VTT</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownloadSrt}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 5,
                                        background: '#fff',
                                        color: '#000',
                                        border: '2px solid #000',
                                        borderRadius: 4,
                                        padding: '8px 2px',
                                        fontFamily: 'monospace',
                                        fontWeight: 900,
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        boxShadow: '2px 2px 0 #000',
                                    }}
                                >
                                    <Download size={12} strokeWidth={2.5} />
                                    <span>.SRT</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownloadTxt}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 5,
                                        background: '#fff',
                                        color: '#000',
                                        border: '2px solid #000',
                                        borderRadius: 4,
                                        padding: '8px 2px',
                                        fontFamily: 'monospace',
                                        fontWeight: 900,
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        boxShadow: '2px 2px 0 #000',
                                    }}
                                >
                                    <FileText size={12} strokeWidth={2.5} />
                                    <span>.TXT</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownloadJsonProject}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 5,
                                        background: '#fff',
                                        color: '#000',
                                        border: '2px solid #000',
                                        borderRadius: 4,
                                        padding: '8px 2px',
                                        fontFamily: 'monospace',
                                        fontWeight: 900,
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        boxShadow: '2px 2px 0 #000',
                                    }}
                                    title="Export complete caption & style project data"
                                >
                                    <Sliders size={12} strokeWidth={2.5} />
                                    <span>.JSON</span>
                                </button>
                            </div>

                            {/* Embed Metadata & Audio Bundle Export */}
                            <button
                                type="button"
                                onClick={handleDownloadWithEmbeddedMetadata}
                                style={{
                                    width: '100%',
                                    marginBottom: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    background: '#f4f4f5',
                                    color: '#000',
                                    border: '1.5px solid #000',
                                    borderRadius: 3,
                                    padding: '7px 10px',
                                    fontFamily: 'monospace',
                                    fontWeight: 900,
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                }}
                                title="Download media with script metadata embedded inside for other CreatorKit tools"
                            >
                                <Sparkles size={13} strokeWidth={2.5} />
                                <span>EXPORT MEDIA WITH EMBEDDED METADATA</span>
                            </button>

                            {/* View Switcher Tabs */}
                            <div
                                style={{
                                    display: 'flex',
                                    borderBottom: '1.5px solid #000',
                                    marginBottom: 10,
                                    gap: 6,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('cues')}
                                    style={{
                                        padding: '4px 10px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.72rem',
                                        fontWeight: 900,
                                        borderTop: '2px solid #000',
                                        borderLeft: '2px solid #000',
                                        borderRight: '2px solid #000',
                                        borderBottom: activeTab === 'cues' ? '2px solid #fff' : 'none',
                                        marginBottom: activeTab === 'cues' ? -2 : 0,
                                        background: activeTab === 'cues' ? '#fff' : '#e5e7eb',
                                        cursor: 'pointer',
                                        borderRadius: '3px 3px 0 0',
                                    }}
                                >
                                    CUES ({cues.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('text')}
                                    style={{
                                        padding: '4px 10px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.72rem',
                                        fontWeight: 900,
                                        borderTop: '2px solid #000',
                                        borderLeft: '2px solid #000',
                                        borderRight: '2px solid #000',
                                        borderBottom: activeTab === 'text' ? '2px solid #fff' : 'none',
                                        marginBottom: activeTab === 'text' ? -2 : 0,
                                        background: activeTab === 'text' ? '#fff' : '#e5e7eb',
                                        cursor: 'pointer',
                                        borderRadius: '3px 3px 0 0',
                                    }}
                                >
                                    PLAIN TRANSCRIPT
                                </button>
                            </div>

                            {/* Content Body */}
                            {activeTab === 'cues' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {/* Cues Editing Toolbar */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: 6,
                                            padding: '6px 8px',
                                            background: '#f4f4f5',
                                            border: '1.5px solid #000',
                                            borderRadius: 3,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={handleAddCue}
                                                style={{
                                                    padding: '3px 7px',
                                                    background: '#FFE500',
                                                    border: '1.5px solid #000',
                                                    borderRadius: 2,
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.64rem',
                                                    fontWeight: 900,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                + ADD CUE
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setShowFindReplace(!showFindReplace)}
                                                style={{
                                                    padding: '3px 7px',
                                                    background: showFindReplace ? '#000' : '#fff',
                                                    color: showFindReplace ? '#FFE500' : '#000',
                                                    border: '1.5px solid #000',
                                                    borderRadius: 2,
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.64rem',
                                                    fontWeight: 900,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                FIND & REPLACE
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', fontWeight: 800, color: '#666' }}>
                                                NUDGE ALL:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleBulkShift(-0.2)}
                                                style={{
                                                    padding: '2px 5px',
                                                    background: '#fff',
                                                    border: '1px solid #000',
                                                    borderRadius: 2,
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.6rem',
                                                    fontWeight: 900,
                                                    cursor: 'pointer',
                                                }}
                                                title="Shift all cues -0.2s earlier"
                                            >
                                                -0.2s
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleBulkShift(0.2)}
                                                style={{
                                                    padding: '2px 5px',
                                                    background: '#fff',
                                                    border: '1px solid #000',
                                                    borderRadius: 2,
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.6rem',
                                                    fontWeight: 900,
                                                    cursor: 'pointer',
                                                }}
                                                title="Shift all cues +0.2s later"
                                            >
                                                +0.2s
                                            </button>
                                        </div>
                                    </div>

                                    {/* Find & Replace Strip */}
                                    {showFindReplace && (
                                        <div
                                            style={{
                                                padding: '8px 10px',
                                                background: '#fef3c7',
                                                border: '1.5px solid #d97706',
                                                borderRadius: 3,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 6,
                                            }}
                                        >
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <input
                                                    type="text"
                                                    value={findQuery}
                                                    onChange={(e) => setFindQuery(e.target.value)}
                                                    placeholder="Find text..."
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 6px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.72rem',
                                                        border: '1px solid #000',
                                                        borderRadius: 2,
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    value={replaceQuery}
                                                    onChange={(e) => setReplaceQuery(e.target.value)}
                                                    placeholder="Replace with..."
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 6px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.72rem',
                                                        border: '1px solid #000',
                                                        borderRadius: 2,
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleExecuteFindReplace}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: '#000',
                                                        color: '#FFE500',
                                                        border: '1px solid #000',
                                                        borderRadius: 2,
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.68rem',
                                                        fontWeight: 900,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    REPLACE ALL
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cues Scrollable List */}
                                    <div
                                        style={{
                                            maxHeight: 460,
                                            overflowY: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                            paddingRight: 4,
                                        }}
                                    >
                                        {cues.length > 0 ? (
                                            cues.map((cue, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        background: '#fafafa',
                                                        border: '1.5px solid #000',
                                                        borderRadius: 3,
                                                        padding: '8px 10px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 800,
                                                            flexWrap: 'wrap',
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ color: '#000', fontWeight: 900 }}>
                                                                #{String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSeekToTime(cue.start)}
                                                                style={{
                                                                    background: '#FFE500',
                                                                    padding: '2px 6px',
                                                                    border: '1px solid #000',
                                                                    borderRadius: 2,
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 900,
                                                                    cursor: 'pointer',
                                                                }}
                                                                title="Click to jump audio to this cue"
                                                            >
                                                                ▶ {formatVttTimestamp(cue.start)} → {formatVttTimestamp(cue.end)}
                                                            </button>
                                                        </div>

                                                        {/* Micro-nudging Steppers for Start & End */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <span style={{ fontSize: '0.58rem', color: '#666' }}>START:</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleNudgeCue(idx, 'start', -0.1)}
                                                                style={{ padding: '1px 4px', background: '#fff', border: '1px solid #000', borderRadius: 2, cursor: 'pointer', fontSize: '0.58rem', fontWeight: 900 }}
                                                            >
                                                                -0.1
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleNudgeCue(idx, 'start', 0.1)}
                                                                style={{ padding: '1px 4px', background: '#fff', border: '1px solid #000', borderRadius: 2, cursor: 'pointer', fontSize: '0.58rem', fontWeight: 900 }}
                                                            >
                                                                +0.1
                                                            </button>

                                                            <span style={{ fontSize: '0.58rem', color: '#666', marginLeft: 4 }}>END:</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleNudgeCue(idx, 'end', -0.1)}
                                                                style={{ padding: '1px 4px', background: '#fff', border: '1px solid #000', borderRadius: 2, cursor: 'pointer', fontSize: '0.58rem', fontWeight: 900 }}
                                                            >
                                                                -0.1
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleNudgeCue(idx, 'end', 0.1)}
                                                                style={{ padding: '1px 4px', background: '#fff', border: '1px solid #000', borderRadius: 2, cursor: 'pointer', fontSize: '0.58rem', fontWeight: 900 }}
                                                            >
                                                                +0.1
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Editable Text Area for each Cue */}
                                                    <textarea
                                                        value={cue.text}
                                                        onChange={(e) => handleUpdateCueText(idx, e.target.value)}
                                                        rows={2}
                                                        style={{
                                                            width: '100%',
                                                            fontFamily: 'inherit',
                                                            fontSize: '0.82rem',
                                                            fontWeight: 600,
                                                            lineHeight: 1.4,
                                                            padding: '6px 8px',
                                                            border: '1px solid #000',
                                                            borderRadius: 2,
                                                            background: '#fff',
                                                            color: '#000',
                                                            resize: 'vertical',
                                                            boxSizing: 'border-box',
                                                        }}
                                                    />

                                                    {/* Cue Actions: Split, Merge, Delete */}
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSplitCue(idx)}
                                                            style={{
                                                                padding: '2px 6px',
                                                                background: '#fff',
                                                                border: '1px solid #000',
                                                                borderRadius: 2,
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 800,
                                                                cursor: 'pointer',
                                                            }}
                                                            title="Split into two cues"
                                                        >
                                                            ✂ SPLIT
                                                        </button>

                                                        {idx < cues.length - 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMergeWithNextCue(idx)}
                                                                style={{
                                                                    padding: '2px 6px',
                                                                    background: '#fff',
                                                                    border: '1px solid #000',
                                                                    borderRadius: 2,
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.6rem',
                                                                    fontWeight: 800,
                                                                    cursor: 'pointer',
                                                                }}
                                                                title="Merge with next cue"
                                                            >
                                                                🔗 MERGE NEXT
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCue(idx)}
                                                            style={{
                                                                padding: '2px 6px',
                                                                background: '#fee2e2',
                                                                color: '#b91c1c',
                                                                border: '1px solid #b91c1c',
                                                                borderRadius: 2,
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 800,
                                                                cursor: 'pointer',
                                                            }}
                                                            title="Delete this cue"
                                                        >
                                                            🗑 DELETE
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p
                                                style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.75rem',
                                                    color: '#777',
                                                    textAlign: 'center',
                                                    padding: '24px 0',
                                                }}
                                            >
                                                No cues transcribed yet.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <textarea
                                        value={fullText}
                                        onChange={(e) => {
                                            setFullText(e.target.value);
                                            try { localStorage.setItem(STORAGE_KEYS.FULL_TEXT, e.target.value); } catch {}
                                        }}
                                        style={{
                                            width: '100%',
                                            height: 380,
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem',
                                            lineHeight: 1.5,
                                            padding: 10,
                                            border: '1.5px solid #000',
                                            borderRadius: 3,
                                            background: '#fafafa',
                                            color: '#000',
                                            resize: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                        placeholder="Full transcript will display here... You can edit this text directly."
                                    />
                                    {cues.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!fullText.trim()) return;
                                                const aligned = alignScriptWithAudioCues(cues, fullText.trim());
                                                setCues(aligned);
                                                const vtt = generateVtt(aligned);
                                                setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
                                                try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(aligned)); } catch {}
                                                setActiveTab('cues');
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                background: '#FFE500',
                                                border: '2px solid #000',
                                                borderRadius: 3,
                                                fontFamily: 'monospace',
                                                fontSize: '0.74rem',
                                                fontWeight: 900,
                                                cursor: 'pointer',
                                                boxShadow: '2px 2px 0 #000',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            <Sparkles size={14} strokeWidth={2.5} />
                                            <span>ALIGN EDITED TRANSCRIPT TO AUDIO TIMESTAMPS</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
