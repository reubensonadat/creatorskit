'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
    Undo2,
    Redo2,
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
    FileText,
    RotateCcw,
    Film,
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
    transcribeOnWorker,
    warmCaptionsWorker,
    WorkerTranscribeError,
} from '@/lib/captions/worker-transcribe';

/** Which transcription engine the captions page runs:
 *  server (our free Render worker — the DEFAULT, with a silent browser
 *  fallback) · local (browser Whisper, server rescue) · groq/openai (the
 *  user's own API key). */
type EngineChoice = CloudTranscriptionProvider | 'local' | 'server';
import {
    type CaptionVideoMode,
    type CaptionPillBackground,
    type VideoAspectRatio,
    type VideoBackgroundMode,
    type CaptionStylePresetConfig,
    CAPTION_STYLE_PRESETS,
    drawCaptionFrame,
    renderCaptionsToVideo,
    ensureOverlayFontReady,
    POPULAR_OVERLAY_FONTS,
} from '@/lib/captions/overlay-renderer';
import { downloadBlob } from '@/lib/canvas-video-exporter';
import { alignScriptWithAudioCues } from '@/lib/captions/script-aligner';
import { TactileScrubber } from '@/components/tactile-scrubber';
import { OverlayStudio } from '@/components/OverlayStudio';

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
    SESSIONS_INDEX: 'creatorkit_autoCaptions_sessions',
};

/* ── Session history: every finished transcription is archived (audio blob
 * in IndexedDB under `session:<id>`, cues + metadata in localStorage) so new
 * work never deletes old work, and any past session can be reopened later. */
interface SessionIndexEntry {
    id: string;
    name: string;
    createdAt: number;
    duration: number;
    cueCount: number;
}

const SESSIONS_INDEX_LIMIT = 12;

function loadSessionsIndex(): SessionIndexEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS_INDEX);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((s) => s && s.id && s.name) : [];
    } catch {
        return [];
    }
}

function saveSessionsIndex(list: SessionIndexEntry[]) {
    try {
        localStorage.setItem(STORAGE_KEYS.SESSIONS_INDEX, JSON.stringify(list.slice(0, SESSIONS_INDEX_LIMIT)));
    } catch {
        /* storage full — keep whatever already fits */
    }
}

function sessionMetaKey(id: string) {
    return `creatorkit_autoCaptions_session_meta_${id}`;
}

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

function getExactMediaDuration(mediaFile: File): Promise<number> {
    return new Promise((resolve) => {
        try {
            const url = URL.createObjectURL(mediaFile);
            const isVid = mediaFile.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(mediaFile.name);
            const el = document.createElement(isVid ? 'video' : 'audio');
            el.preload = 'metadata';
            const cleanup = () => {
                try { URL.revokeObjectURL(url); } catch { }
                el.removeAttribute('src');
                el.load();
            };
            el.onloadedmetadata = () => {
                const d = el.duration;
                cleanup();
                if (Number.isFinite(d) && d > 0) resolve(d);
                else resolve(0);
            };
            el.onerror = () => {
                cleanup();
                resolve(0);
            };
            el.src = url;
        } catch {
            resolve(0);
        }
    });
}

export default function CaptionsPage({ initialDeck }: { initialDeck?: 'cassette' | 'overlay' } = {}) {
    const [file, setFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    // Where the current transcript came from — shown as a chip on the cue list.
    const [engineSourceLabel, setEngineSourceLabel] = useState<string | null>(null);
    // True when a restored session has cues but its audio blob could not be
    // recovered from IndexedDB (quota / private mode / cleared storage) — the
    // workspace stays fully usable, but the player needs a loud heads-up.
    const [sessionAudioMissing, setSessionAudioMissing] = useState(false);
    // Recent-session history: loaded from localStorage on mount, refreshed
    // after each finished transcription. Opening one restores its audio too.
    const [sessionsIndex, setSessionsIndex] = useState<SessionIndexEntry[]>([]);
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
    const [displayPercent, setDisplayPercent] = useState<number>(0);
    const maxPercentRef = useRef<number>(0);
    const progressStartTimeRef = useRef<number>(0);
    const autoRetryCountRef = useRef<number>(0);
    const MAX_AUTO_RETRIES = 2;

    const resetProgressForNewAttempt = useCallback((initialMessage: string) => {
        progressStartTimeRef.current = Date.now();
        maxPercentRef.current = 0;
        setDisplayPercent(0);
        setProgress({
            stage: 'loading_model',
            message: initialMessage,
            percent: 0,
        });
    }, []);

    // Strictly monotonic & eased progress ticker:
    // Starts fast (lying nicely up to ~65% in a few seconds), gradually decelerates towards ~92-95%,
    // and NEVER drops backward (unless resetProgressForNewAttempt explicitly starts a new attempt).
    const handleProgressUpdate = useCallback((prog: WhisperProgress) => {
        setProgress(prog);
        if (typeof prog.percent === 'number' && !isNaN(prog.percent)) {
            if (prog.percent > maxPercentRef.current) {
                const capped = prog.stage === 'complete' ? 100 : Math.min(95, prog.percent);
                maxPercentRef.current = capped;
                setDisplayPercent(Math.round(capped));
            }
        }
        if (prog.stage === 'complete') {
            maxPercentRef.current = 100;
            setDisplayPercent(100);
        }
    }, []);

    useEffect(() => {
        if (!isProcessing) {
            if (progress.stage === 'complete') {
                maxPercentRef.current = 100;
                setDisplayPercent(100);
            }
            return;
        }

        const timer = setInterval(() => {
            if (!progressStartTimeRef.current) return;
            const elapsed = (Date.now() - progressStartTimeRef.current) / 1000;
            // Eased curve: fast initial acceleration, then asymptotic braking
            // 1s: ~25%, 2s: ~41%, 3s: ~53%, 5s: ~69%, 8s: ~81%, 12s: ~88%, 20s: ~92%, 30s: ~94%
            const easedVal = 95 * (1 - Math.exp(-elapsed / 4.5));
            const newTarget = Math.min(95, Math.max(maxPercentRef.current, easedVal));
            if (newTarget > maxPercentRef.current) {
                maxPercentRef.current = newTarget;
                setDisplayPercent(Math.round(newTarget));
            }
        }, 80);

        return () => clearInterval(timer);
    }, [isProcessing, progress.stage]);

    const [activeTab, setActiveTab] = useState<'cues' | 'text'>('cues');
    const [copied, setCopied] = useState(false);
    const whisperClientRef = useRef<WhisperClient | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Left Studio Deck Mode: 'cassette' | 'overlay'
    const [activeStudioDeck, setActiveStudioDeck] = useState<'cassette' | 'overlay'>(initialDeck || 'cassette');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (window.location.pathname.startsWith('/overlay')) {
                setActiveStudioDeck('overlay');
            }
        }
    }, []);

    const handleSwitchDeck = (deck: 'cassette' | 'overlay') => {
        setActiveStudioDeck(deck);
        if (typeof window !== 'undefined') {
            const targetPath = deck === 'overlay' ? '/overlay' : '/auto-captions';
            if (window.location.pathname !== targetPath) {
                window.history.pushState(null, '', targetPath);
            }
        }
    };

    // Video Overlay Studio Configuration (3 Modes: Teleprompter Highlight, Kinetic Pop, Minimal)
    // Video playback & script-to-captions states
    const isVideoFile = !!(file && (file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(file.name)));
    const [mediaViewMode, setMediaViewMode] = useState<'video' | 'cassette'>('video');
    const [scriptModalOpen, setScriptModalOpen] = useState(false);
    const [customScriptInput, setCustomScriptInput] = useState('');
    const [scriptEstimatedDuration, setScriptEstimatedDuration] = useState(30);

    const [videoMode, setVideoMode] = useState<CaptionVideoMode>('kinetic-pop');
    const [captionFont, setCaptionFont] = useState<string>('montserrat');
    const [captionFontSize, setCaptionFontSize] = useState<number>(48);
    const [captionLetterSpacing, setCaptionLetterSpacing] = useState<number>(0);
    const [captionYPosition, setCaptionYPosition] = useState<number>(70);
    const [captionPillBg, setCaptionPillBg] = useState<CaptionPillBackground>('dark');
    const [captionPillCustomColor, setCaptionPillCustomColor] = useState<string>('#18181b');
    const [emojiMode, setEmojiMode] = useState<boolean>(false);
    const [overlayColor, setOverlayColor] = useState<string>('#FFE500');
    const [overlayAspectRatio, setOverlayAspectRatio] = useState<VideoAspectRatio>('9:16');
    const [overlayBackground, setOverlayBackground] = useState<VideoBackgroundMode>('transparent');
    const [overlayDelay, setOverlayDelay] = useState<number>(0);
    // Per-cue drag-to-retime state for the overlay studio cue timeline strip
    const [cueDragView, setCueDragView] = useState<{ index: number; newStart: number } | null>(null);
    const cueDragRef = useRef<{ index: number; startX: number; origStart: number; width: number; dur: number; len: number; newStart: number; movedPx: number } | null>(null);
    const cueTrackRef = useRef<HTMLDivElement | null>(null);
    const cueTrackScrollRef = useRef<HTMLDivElement | null>(null);
    const [overlayPlaybackRate, setOverlayPlaybackRate] = useState<number>(1);
    const [isRenderingVideo, setIsRenderingVideo] = useState(false);
    const [videoRenderProgress, setVideoRenderProgress] = useState(0);

    // Cue timeline undo/redo history stacks
    const [pastCues, setPastCues] = useState<SubtitleCue[][]>([]);
    const [futureCues, setFutureCues] = useState<SubtitleCue[][]>([]);

    const handleUndoCue = useCallback(() => {
        setPastCues((past) => {
            if (past.length === 0) return past;
            const previous = past[past.length - 1];
            const newPast = past.slice(0, -1);

            setCues((current) => {
                setFutureCues((future) => [current, ...future.slice(0, 40)]);
                const vtt = generateVtt(previous);
                setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
                try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(previous)); } catch { }
                return previous;
            });

            return newPast;
        });
    }, []);

    const handleRedoCue = useCallback(() => {
        setFutureCues((future) => {
            if (future.length === 0) return future;
            const next = future[0];
            const newFuture = future.slice(1);

            setCues((current) => {
                setPastCues((past) => [...past.slice(-40), current]);
                const vtt = generateVtt(next);
                setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
                try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
                return next;
            });

            return newFuture;
        });
    }, []);

    // Global keyboard shortcuts for Undo / Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    handleRedoCue();
                } else {
                    e.preventDefault();
                    handleUndoCue();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedoCue();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndoCue, handleRedoCue]);

    // ✨ Visual Kinetic Typography & Physics Controls
    const [springPhysics, setSpringPhysics] = useState<boolean>(true);
    const [bounceIntensity, setBounceIntensity] = useState<number>(1.15);
    const [wordRotation, setWordRotation] = useState<boolean>(true);
    const [textShadow, setTextShadow] = useState<boolean>(true);
    const [uppercase, setUppercase] = useState<boolean>(false);
    const [wordPop, setWordPop] = useState<boolean>(false);
    const [activePresetId, setActivePresetId] = useState<string | null>(null);

    // 🚀 BYOK (Bring Your Own Key) Engine Settings + our free server engine
    const [transcriptionEngine, setTranscriptionEngine] = useState<EngineChoice>('server');
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
    const [showHandoffReplacePrompt, setShowHandoffReplacePrompt] = useState<boolean>(false);

    const handleConfirmHandoffReplace = async () => {
        if (!pendingHandoff || !pendingHandoff.mediaBlob) return;

        try {
            localStorage.removeItem(STORAGE_KEYS.CUES);
            localStorage.removeItem(STORAGE_KEYS.FULL_TEXT);
            localStorage.removeItem(STORAGE_KEYS.FILE_NAME);
            localStorage.removeItem(STORAGE_KEYS.ELAPSED);
            localStorage.removeItem(STORAGE_KEYS.DURATION);
            await clearAudioCache(STORAGE_KEYS.AUDIO_KEY);
        } catch (e) {
            console.warn('Error clearing old session:', e);
        }

        if (audioUrlRef.current && audioUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrlRef.current);
        }
        if (vttUrlRef.current && vttUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(vttUrlRef.current);
        }

        const transferredFile = new File(
            [pendingHandoff.mediaBlob],
            pendingHandoff.fileName || 'teleprompter_take.webm',
            { type: pendingHandoff.mediaBlob.type || 'audio/webm' }
        );

        await clearHandoffSession();
        setPendingHandoff(null);
        setShowHandoffReplacePrompt(false);
        handleFile(transferredFile);
    };

    const handleCancelHandoffReplace = async () => {
        await clearHandoffSession();
        setPendingHandoff(null);
        setShowHandoffReplacePrompt(false);
    };

    // 🔄 Fresh Session: completely wipe current active audio & cues from IndexedDB and storage
    const handleStartNewSession = async () => {
        if (typeof window !== 'undefined') {
            const confirmed = window.confirm('Start a fresh video session? This will wipe the active cues and audio cache so you can start with a clean slate.');
            if (!confirmed) return;
        }

        try {
            await clearAudioCache(STORAGE_KEYS.AUDIO_KEY);
            localStorage.removeItem(STORAGE_KEYS.CUES);
            localStorage.removeItem(STORAGE_KEYS.FULL_TEXT);
            localStorage.removeItem(STORAGE_KEYS.FILE_NAME);
            localStorage.removeItem(STORAGE_KEYS.ELAPSED);
            localStorage.removeItem(STORAGE_KEYS.DURATION);
            localStorage.removeItem('creatorkit_teleprompter_script');
        } catch (e) {
            console.warn('Error clearing session cache:', e);
        }

        if (audioUrlRef.current && audioUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrlRef.current);
        }
        if (vttUrlRef.current && vttUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(vttUrlRef.current);
        }

        setFile(null);
        setAudioUrl(null);
        setCues([]);
        setFullText('');
        setElapsed('');
        setAudioDuration(0);
        setTeleprompterScript(null);
        setScriptAligned(false);
        setMagicMetadata(null);
        setOverlayCurrentTime(0);
        if (overlayAudioRef.current) overlayAudioRef.current.currentTime = 0;
    };

    // ✂️ Split cue at specific timestamp (e.g. playhead position)
    const handleSplitCueAtTime = (cueIndex: number, splitTime: number) => {
        if (cueIndex < 0 || cueIndex >= cues.length) return;
        const targetCue = cues[cueIndex];
        const minBuffer = 0.15;
        if (splitTime <= targetCue.start + minBuffer || splitTime >= targetCue.end - minBuffer) return;

        const words = targetCue.text.trim().split(/\s+/).filter(Boolean);
        if (words.length <= 1) return;

        const dur = targetCue.end - targetCue.start;
        const ratio = (splitTime - targetCue.start) / dur;
        const splitWordIdx = Math.max(1, Math.min(words.length - 1, Math.round(words.length * ratio)));

        const text1 = words.slice(0, splitWordIdx).join(' ');
        const text2 = words.slice(splitWordIdx).join(' ');

        const splitRounded = parseFloat(splitTime.toFixed(2));

        const cue1: SubtitleCue = {
            start: targetCue.start,
            end: splitRounded,
            text: text1,
        };

        const cue2: SubtitleCue = {
            start: splitRounded,
            end: targetCue.end,
            text: text2,
        };

        const next = [...cues.slice(0, cueIndex), cue1, cue2, ...cues.slice(cueIndex + 1)]
            .map((c, i) => ({ ...c, id: i + 1 }));

        setPastCues((prev) => [...prev.slice(-30), cues]);
        setFutureCues([]);
        setCues(next);

        try {
            localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));
        } catch { }

        const nextVtt = generateVtt(next);
        const vttBlob = new Blob([nextVtt], { type: 'text/vtt' });
        setVttUrl(URL.createObjectURL(vttBlob));
    };

    // ✂️ Quick split cue in half at midpoint
    const handleSplitCueInHalf = (cueIndex: number) => {
        if (cueIndex < 0 || cueIndex >= cues.length) return;
        const targetCue = cues[cueIndex];
        const mid = (targetCue.start + targetCue.end) / 2;
        handleSplitCueAtTime(cueIndex, mid);
    };

    // 📝 Script-to-Captions: Generate evenly timed subtitle cues from user's provided text
    const handleGenerateCaptionsFromScript = (scriptText: string) => {
        const trimmed = scriptText.trim();
        if (!trimmed) return;

        // Split sentences on punctuation or lines
        const rawSegments = trimmed
            .replace(/([.?!,;:\n]+)/g, '$1|')
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean);

        const chunks: string[] = [];
        for (const seg of rawSegments) {
            const words = seg.split(/\s+/).filter(Boolean);
            if (words.length <= 7) {
                chunks.push(seg);
            } else {
                for (let i = 0; i < words.length; i += 5) {
                    chunks.push(words.slice(i, i + 5).join(' '));
                }
            }
        }

        if (chunks.length === 0) return;

        const targetDur = audioDuration > 0 ? audioDuration : Math.max(10, scriptEstimatedDuration || (chunks.length * 2.5));
        const totalWords = chunks.reduce((sum, c) => sum + c.split(/\s+/).length, 0);

        let curTime = 0.25;
        const availableTime = Math.max(1, targetDur - 0.5);

        const generatedCues: SubtitleCue[] = chunks.map((chunk, idx) => {
            const wordList = chunk.split(/\s+/).filter(Boolean);
            const dur = (wordList.length / Math.max(1, totalWords)) * availableTime;
            const start = parseFloat(curTime.toFixed(2));
            const end = parseFloat(Math.min(targetDur, curTime + Math.max(0.8, dur)).toFixed(2));
            curTime = end + 0.08;

            const wDur = (end - start) / Math.max(1, wordList.length);
            const words = wordList.map((w, wIdx) => ({
                word: w,
                start: parseFloat((start + wIdx * wDur).toFixed(2)),
                end: parseFloat((start + (wIdx + 1) * wDur).toFixed(2)),
            }));

            return {
                id: idx + 1,
                start,
                end,
                text: chunk,
                words,
            };
        });

        setPastCues((prev) => [...prev.slice(-30), cues]);
        setFutureCues([]);
        setCues(generatedCues);
        setFullText(trimmed);

        if (audioDuration === 0) {
            setAudioDuration(targetDur);
            try {
                localStorage.setItem(STORAGE_KEYS.DURATION, targetDur.toString());
            } catch { }
        }

        const vtt = generateVtt(generatedCues);
        setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));

        try {
            localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(generatedCues));
            localStorage.setItem(STORAGE_KEYS.FULL_TEXT, trimmed);
        } catch { }

        setScriptModalOpen(false);
        setCustomScriptInput('');
    };

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

    const handleFile = async (selectedFile: File, engineOverride?: EngineChoice) => {
        const activeEngine = engineOverride || transcriptionEngine;
        autoRetryCountRef.current = 0;

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
        setSessionAudioMissing(false);
        setCues([]);
        setFullText('');
        setVttUrl(null);

        // Clean out any stale teleprompter script from previous takes
        setTeleprompterScript(null);
        setScriptAligned(false);
        setMagicMetadata(null);
        localStorage.removeItem('creatorkit_teleprompter_script');

        // Immediately measure true media duration from container header (guarantees accurate timeline for video uploads)
        let containerDuration = 0;
        try {
            containerDuration = await getExactMediaDuration(selectedFile);
            if (containerDuration > 0) {
                setAudioDuration(containerDuration);
                localStorage.setItem(STORAGE_KEYS.DURATION, containerDuration.toString());
            }
        } catch { }

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

        progressStartTimeRef.current = Date.now();
        maxPercentRef.current = 8;
        setDisplayPercent(8);
        setIsProcessing(true);
        try {
            let result: TranscriptionResult;
            // Only use script for forced alignment if embedded in the file or provided explicitly
            const effectiveScript = extractedScript || undefined;

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

                handleProgressUpdate({
                    stage: 'loading_model',
                    message: `Connecting to ${activeEngine === 'groq' ? 'Groq Cloud' : 'OpenAI'} Whisper...`,
                    percent: 20,
                });

                result = await transcribeWithCloudProvider(
                    selectedFile,
                    activeEngine,
                    userKey,
                    effectiveScript,
                    (prog) => handleProgressUpdate(prog)
                );
                setEngineSourceLabel(activeEngine === 'groq' ? 'GROQ' : 'OPENAI');
            } else if (activeEngine === 'server') {
                // SERVER (the DEFAULT): free Render worker first (one-time
                // ticket minted by the edge function — the real worker token
                // never enters client code). The browser engine is a silent
                // bodyguard: only when BOTH paths fail does the user see an
                // error with retry options.
                handleProgressUpdate({
                    stage: 'decoding',
                    message: 'Analyzing audio...',
                    percent: 10,
                });

                let browserPcm: Float32Array | null = null;
                let decodedDuration: number | undefined;
                try {
                    const decoded = await processAudioForWhisper(selectedFile, () => {
                        handleProgressUpdate({
                            stage: 'decoding',
                            message: 'Analyzing audio...',
                            percent: 20,
                        });
                    });
                    browserPcm = decoded.audioData;
                    decodedDuration = decoded.duration;
                    setAudioDuration(decoded.duration);
                } catch {
                    // Undecodable in this browser (MKV / AC-3 …) — raw upload it is.
                }

                handleProgressUpdate({
                    stage: 'loading_model',
                    message: 'Generating captions on the free server...',
                    percent: 30,
                });

                try {
                    result = await transcribeOnWorker({
                        file: selectedFile,
                        audioData: browserPcm,
                        durationSeconds: decodedDuration,
                        onProgress: (prog) => handleProgressUpdate(prog),
                    });
                    setEngineSourceLabel('SERVER');
                } catch (serverErr) {
                    if (
                        serverErr instanceof WorkerTranscribeError &&
                        (serverErr.code === 'too_large' || serverErr.code === 'edge_offline')
                    ) {
                        throw serverErr;
                    }
                    if (!browserPcm) {
                        try {
                            const decoded = await processAudioForWhisper(selectedFile);
                            browserPcm = decoded.audioData;
                            decodedDuration = decoded.duration;
                            setAudioDuration(decoded.duration);
                        } catch {
                            throw serverErr;
                        }
                    }

                    // Automatic failure recovery: switch to Local engine and restart progress from 0%
                    // Allows a maximum of 2 automatic retries as requested.
                    if (autoRetryCountRef.current < MAX_AUTO_RETRIES) {
                        autoRetryCountRef.current += 1;
                        const attempt = autoRetryCountRef.current;

                        // 1. Visually switch the active engine chip from 'server' to 'local'
                        setTranscriptionEngine('local');

                        const failReason =
                            serverErr instanceof WorkerTranscribeError && serverErr.code === 'timeout'
                                ? 'Server timed out'
                                : 'Server failed';

                        // 2. Clear notice explaining what happened
                        handleProgressUpdate({
                            stage: 'loading_model',
                            message: `${failReason} · Retrying using local offline engine (Attempt ${attempt} of ${MAX_AUTO_RETRIES})...`,
                        });

                        // 3. Briefly pause so user sees the engine switch, then restart progress bar all over from 0%
                        await new Promise((r) => setTimeout(r, 650));
                        resetProgressForNewAttempt(`${failReason} · Starting local offline AI (Attempt ${attempt} of ${MAX_AUTO_RETRIES})...`);

                        // 4. Run in-browser local engine
                        if (!whisperClientRef.current) {
                            whisperClientRef.current = new WhisperClient();
                        }
                        result = await whisperClientRef.current.transcribe(browserPcm, (prog) => {
                            handleProgressUpdate({
                                ...prog,
                                message: prog.message ? `${prog.message} (Local Attempt ${attempt})` : `Generating captions (Local Attempt ${attempt})`,
                            });
                        });
                        setEngineSourceLabel('BROWSER FALLBACK');
                    } else {
                        // Max retries reached — do not retry again
                        throw serverErr;
                    }
                }
            } else {
                // LOCAL: fully-offline browser Whisper first. The free
                // server engine rescues only when the browser can't
                // (undecodable codec, OOM on a weak device). When the
                // failed local run got as far as decoding, that PCM
                // upgrades the rescue to a tiny WAV upload; otherwise the
                // raw file goes up and the worker's ffmpeg decodes it.
                let browserPcm: Float32Array | null = null;

                const runBrowserEngine = async (): Promise<TranscriptionResult> => {
                    // Step 1: Decode audio locally
                    handleProgressUpdate({
                        stage: 'decoding',
                        message: 'Analyzing audio...',
                        percent: 10,
                    });

                    const { audioData, duration: decodedDuration } = await processAudioForWhisper(selectedFile, () => {
                        handleProgressUpdate({
                            stage: 'decoding',
                            message: 'Analyzing audio...',
                            percent: 25,
                        });
                    });
                    browserPcm = audioData;
                    setAudioDuration(decodedDuration);

                    // Step 2: Transcribe audio with in-browser Web Worker Whisper
                    handleProgressUpdate({
                        stage: 'loading_model',
                        message: 'Generating captions...',
                    });

                    if (!whisperClientRef.current) {
                        whisperClientRef.current = new WhisperClient();
                    }

                    return whisperClientRef.current.transcribe(audioData, (prog) => {
                        handleProgressUpdate(prog);
                    });
                };

                try {
                    result = await runBrowserEngine();
                    setEngineSourceLabel('BROWSER');
                } catch (localErr) {
                    if (autoRetryCountRef.current < MAX_AUTO_RETRIES) {
                        autoRetryCountRef.current += 1;
                        const attempt = autoRetryCountRef.current;
                        setTranscriptionEngine('server');
                        handleProgressUpdate({
                            stage: 'loading_model',
                            message: `Local failed · Retrying on server (Attempt ${attempt} of ${MAX_AUTO_RETRIES})...`,
                        });
                        await new Promise((r) => setTimeout(r, 650));
                        resetProgressForNewAttempt(`Retrying on server (Attempt ${attempt} of ${MAX_AUTO_RETRIES})...`);
                        result = await transcribeOnWorker({
                            file: selectedFile,
                            audioData: browserPcm,
                            onProgress: (prog) => handleProgressUpdate(prog),
                        });
                        setEngineSourceLabel('SERVER');
                    } else {
                        throw localErr;
                    }
                }
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
                    const dur = (containerDuration > 0 ? containerDuration : (audioDuration > 0 ? audioDuration : finalCues[finalCues.length - 1].end));
                    setAudioDuration(dur);
                    localStorage.setItem(STORAGE_KEYS.DURATION, dur.toString());
                }
                await saveAudioBlobToCache(STORAGE_KEYS.AUDIO_KEY, selectedFile);

                // Archive into session history — new work never deletes old
                // sessions; re-transcribing the same file replaces its entry.
                const sessionDuration = finalCues.length > 0 ? finalCues[finalCues.length - 1].end : 0;
                const sessionId = `s_${Date.now()}`;
                await saveAudioBlobToCache(`session:${sessionId}`, selectedFile);
                localStorage.setItem(
                    sessionMetaKey(sessionId),
                    JSON.stringify({
                        cues: finalCues,
                        fullText: result.fullText,
                        elapsed: result.elapsedSeconds,
                        duration: sessionDuration,
                    })
                );
                const prevIndex = loadSessionsIndex();
                for (const old of prevIndex) {
                    if (old.name === selectedFile.name) {
                        localStorage.removeItem(sessionMetaKey(old.id));
                        clearAudioCache(`session:${old.id}`).catch(() => {});
                    }
                }
                saveSessionsIndex([
                    { id: sessionId, name: selectedFile.name, createdAt: Date.now(), duration: sessionDuration, cueCount: finalCues.length },
                    ...prevIndex.filter((s) => s.name !== selectedFile.name),
                ]);
                setSessionsIndex(loadSessionsIndex());
            } catch (cacheErr) {
                console.warn('Session caching warning:', cacheErr);
            }

            handleProgressUpdate({
                stage: 'complete',
                message: 'Transcription complete',
                percent: 100,
            });
        } catch (err) {
            console.error('Transcription error:', err);
            handleProgressUpdate({
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

                // Load the saved-session history (queue of past work)
                setSessionsIndex(loadSessionsIndex());

                // Load stored BYOK keys
                const storedGroq = getStoredApiKey('groq');
                if (storedGroq) setGroqKey(storedGroq);
                const storedOpenai = getStoredApiKey('openai');
                if (storedOpenai) setOpenaiKey(storedOpenai);

                // Check for 1-Click Handoff from Teleprompter
                const handoff = await getHandoffSession();
                const hasExistingSession = !!(
                    localStorage.getItem(STORAGE_KEYS.CUES) ||
                    localStorage.getItem(STORAGE_KEYS.FILE_NAME)
                );
                const urlParams = new URLSearchParams(window.location.search);
                const fromTeleprompter =
                    urlParams.get('from') === 'teleprompter' || urlParams.get('auto') === 'true';

                if (handoff && isMounted) {
                    setPendingHandoff(handoff);
                    if (handoff.script) {
                        setTeleprompterScript(handoff.script);
                    }

                    if (handoff.mediaBlob) {
                        if (hasExistingSession && fromTeleprompter) {
                            // User came from teleprompter with a new take, but already has a saved captions project.
                            // Prompt: "Do you want to cancel or remove what is already inside Auto Captions and start a new one?"
                            setShowHandoffReplacePrompt(true);
                        } else if (!hasExistingSession && urlParams.get('auto') === 'true') {
                            const transferredFile = new File([handoff.mediaBlob], handoff.fileName || 'teleprompter_take.webm', {
                                type: handoff.mediaBlob.type || 'audio/webm',
                            });
                            await clearHandoffSession();
                            setPendingHandoff(null);
                            handleFile(transferredFile);
                            return;
                        }
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
                        if (pendingScript && fromTeleprompter && isMounted) {
                            setTeleprompterScript(pendingScript);
                        } else if (!fromTeleprompter) {
                            localStorage.removeItem('creatorkit_teleprompter_script');
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
                        setEngineSourceLabel('RESTORED');
                    } else if (savedCues && isMounted) {
                        // In case audio was not cached (quota / private mode / cleared
                        // storage), still restore the caption work — and be LOUD
                        // about the missing audio instead of a silently dead player.
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

                        // Keep the overlay timeline & export length correct even
                        // without the audio file.
                        const savedDur = localStorage.getItem(STORAGE_KEYS.DURATION);
                        setAudioDuration(savedDur ? parseFloat(savedDur) : parsedCues[parsedCues.length - 1]?.end || 0);

                        setSessionAudioMissing(true);

                        if (parsedCues.length > 0) {
                            const vttContent = generateVtt(parsedCues);
                            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
                            setVttUrl(URL.createObjectURL(vttBlob));
                        }

                        setProgress({
                            stage: 'complete',
                            message: 'Session restored — audio missing from browser storage',
                            percent: 100,
                        });
                        setEngineSourceLabel('RESTORED');
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
                const origStart = cue.start;
                cue.start = Math.max(0, parseFloat((cue.start + delta).toFixed(2)));
                if (cue.start >= cue.end) cue.start = Math.max(0, cue.end - 0.05);
                // Word timings drive the karaoke reveal — shift them with the
                // cue start so edited cue times actually move the overlay.
                const appliedShift = cue.start - origStart;
                if (appliedShift !== 0 && cue.words && cue.words.length > 0) {
                    cue.words = cue.words.map((w) => ({
                        ...w,
                        start: parseFloat((w.start + appliedShift).toFixed(2)),
                        end: parseFloat((w.end + appliedShift).toFixed(2)),
                    }));
                }
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
            // Split word timings at the word whose center is closest to the
            // time midpoint so both halves keep accurate karaoke reveal.
            let splitWordIdx = midWordIdx;
            if (cue.words && cue.words.length > 0) {
                let bestDist = Infinity;
                cue.words.forEach((w, wi) => {
                    const dist = Math.abs((w.start + w.end) / 2 - midTime);
                    if (dist < bestDist) {
                        bestDist = dist;
                        splitWordIdx = wi + 1;
                    }
                });
            }
            const c1: SubtitleCue = { start: cue.start, end: midTime, text: firstHalf };
            const c2: SubtitleCue = { start: midTime, end: cue.end, text: secondHalf };
            if (cue.words && cue.words.length > 0) {
                c1.words = cue.words.slice(0, splitWordIdx);
                c2.words = cue.words.slice(splitWordIdx);
            }
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
            if (c1.words && c2.words && c1.words.length > 0 && c2.words.length > 0) {
                merged.words = [...c1.words, ...c2.words];
            }
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
            const next = prev.map((c) => {
                const newStart = Math.max(0, parseFloat((c.start + deltaSeconds).toFixed(2)));
                const appliedShift = newStart - c.start;
                const shifted: SubtitleCue = {
                    ...c,
                    start: newStart,
                    end: Math.max(newStart + 0.05, parseFloat((c.end + deltaSeconds).toFixed(2))),
                };
                if (appliedShift !== 0 && c.words && c.words.length > 0) {
                    shifted.words = c.words.map((w) => ({
                        ...w,
                        start: parseFloat((w.start + appliedShift).toFixed(2)),
                        end: parseFloat((w.end + appliedShift).toFixed(2)),
                    }));
                }
                return shifted;
            });
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
            return next;
        });
    };

    // Physically move a cue (and its word timings) to a new start time —
    // the commit step of drag-to-retime on the cue timeline strip.
    const handleMoveCue = (index: number, newStartSeconds: number) => {
        setCues((prev) => {
            const cue = prev[index];
            if (!cue) return prev;
            const len = Math.max(0.05, cue.end - cue.start);
            const newStart = Math.max(0, parseFloat(newStartSeconds.toFixed(2)));
            if (Math.abs(newStart - cue.start) < 0.01) return prev;
            setPastCues((past) => [...past.slice(-40), prev]);
            setFutureCues([]);
            const appliedShift = newStart - cue.start;
            const moved: SubtitleCue = {
                ...cue,
                start: newStart,
                end: parseFloat((newStart + len).toFixed(2)),
            };
            if (appliedShift !== 0 && cue.words && cue.words.length > 0) {
                moved.words = cue.words.map((w) => ({
                    ...w,
                    start: parseFloat((w.start + appliedShift).toFixed(2)),
                    end: parseFloat((w.end + appliedShift).toFixed(2)),
                }));
            }
            const next = [...prev];
            next[index] = moved;
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    // One stone, two birds: rebuild word-level timings for EVERY cue.
    // Cues whose text was typed or edited by hand (the local model can get
    // the text but not real timestamps) get char-weighted word timings
    // inside their slot, and degenerate cue durations get room to actually
    // be spoken — so the drag timeline, preview and export stay in sync.
    const handleSyncCueTimings = () => {
        setCues((prev) => {
            setPastCues((past) => [...past.slice(-40), prev]);
            setFutureCues([]);
            const next = prev.map((c) => {
                const textWords = c.text.trim().split(/\s+/).filter(Boolean);
                if (textWords.length === 0) return c;
                const minSpan = Math.max(0.4, textWords.length * 0.28);
                const end = c.end - c.start < minSpan ? parseFloat((c.start + minSpan).toFixed(2)) : c.end;
                const span = Math.max(0.05, end - c.start);
                const totalChars = textWords.reduce((s, w) => s + w.length, 0) || 1;
                let t = c.start;
                const words = textWords.map((w) => {
                    const ws = parseFloat(t.toFixed(3));
                    t = Math.min(end, t + Math.max(0.06, (w.length / totalChars) * span));
                    return { word: w, start: ws, end: parseFloat(t.toFixed(3)) };
                });
                return { ...c, end, words };
            });
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));
            } catch { }
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
            const nameParts = file.name.split('.');
            const ext = nameParts.pop() || 'webm';
            const base = nameParts.join('.');
            downloadBlob(blobWithMeta, `${base}_with_metadata.${ext}`);
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
        setSessionAudioMissing(false);
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

    // ── Session history ─────────────────────────────────────────
    // Open a past session: restore its cues, text AND its archived audio
    // blob — then keep the legacy single-slot keys in sync so a refresh
    // restores this exact session too.
    const openSession = async (id: string) => {
        const entry = sessionsIndex.find((s) => s.id === id);
        if (!entry) return;
        try {
            const metaRaw = localStorage.getItem(sessionMetaKey(id));
            if (!metaRaw) return;
            const meta = JSON.parse(metaRaw) as { cues: SubtitleCue[]; fullText: string; elapsed: string; duration: number };
            const parsedCues = ensureSingleLineCues(meta.cues || []);
            const blob = await getAudioBlobFromCache(`session:${id}`);

            if (vttUrl) URL.revokeObjectURL(vttUrl);
            if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);

            // Legacy single-slot sync — refresh continuity keeps working.
            localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(parsedCues));
            localStorage.setItem(STORAGE_KEYS.FULL_TEXT, meta.fullText || '');
            localStorage.setItem(STORAGE_KEYS.FILE_NAME, entry.name);
            if (meta.elapsed) localStorage.setItem(STORAGE_KEYS.ELAPSED, String(meta.elapsed));
            if (meta.duration) localStorage.setItem(STORAGE_KEYS.DURATION, String(meta.duration));

            setCues(parsedCues);
            setFullText(meta.fullText || '');
            setElapsed(meta.elapsed ? String(meta.elapsed) : '');
            setAudioDuration(meta.duration || entry.duration || 0);

            if (blob) {
                const restoredFile = new File([blob], entry.name, { type: blob.type || 'audio/webm' });
                await saveAudioBlobToCache(STORAGE_KEYS.AUDIO_KEY, restoredFile);
                setFile(restoredFile);
                setAudioUrl(URL.createObjectURL(blob));
                setSessionAudioMissing(false);
            } else {
                await clearAudioCache(STORAGE_KEYS.AUDIO_KEY);
                setFile(new File([], entry.name, { type: 'audio/webm' }));
                setAudioUrl(null);
                setSessionAudioMissing(true);
            }

            const vttContent = generateVtt(parsedCues);
            setVttUrl(URL.createObjectURL(new Blob([vttContent], { type: 'text/vtt' })));

            setProgress({
                stage: 'complete',
                message: blob ? `Session restored — ${entry.name}` : `Session restored — audio missing (${entry.name})`,
                percent: 100,
            });
            setEngineSourceLabel('RESTORED');
        } catch (err) {
            console.warn('Could not open saved session:', err);
        }
    };

    const deleteSession = async (id: string) => {
        const next = sessionsIndex.filter((s) => s.id !== id);
        setSessionsIndex(next);
        saveSessionsIndex(next);
        try {
            localStorage.removeItem(sessionMetaKey(id));
            await clearAudioCache(`session:${id}`);
        } catch (err) {
            console.warn('Could not delete saved session:', err);
        }
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
            time - overlayDelay,
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
        overlayDelay,
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

    // Canvas draws synchronously and does NOT wait for webfonts — the
    // first paints after a font switch show the system fallback. Redraw
    // once the selected webfont has actually finished loading.
    useEffect(() => {
        let cancelled = false;
        ensureOverlayFontReady(captionFont).then(() => {
            if (!cancelled) renderPreviewCanvas(overlayCurrentTime);
        });
        return () => {
            cancelled = true;
        };
    }, [captionFont, renderPreviewCanvas, overlayCurrentTime]);

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

    // Keep the cue-timeline playhead inside the visible scroll window
    useEffect(() => {
        const wrap = cueTrackScrollRef.current;
        const track = cueTrackRef.current;
        if (!wrap || !track) return;
        const trackDur = Math.max(1, audioDuration || (cues.length > 0 ? cues[cues.length - 1].end : 10));
        const trackW = track.getBoundingClientRect().width || 1;
        const px = (overlayCurrentTime / trackDur) * trackW;
        const view = wrap.clientWidth || 1;
        if (px < wrap.scrollLeft + view * 0.1 || px > wrap.scrollLeft + view * 0.9) {
            wrap.scrollLeft = Math.max(0, px - view * 0.35);
        }
    }, [overlayCurrentTime, audioDuration, cues]);

    // Apply playback rate to the overlay audio (pitch-preserved) whenever
    // it changes or a fresh audio element mounts.
    useEffect(() => {
        const audio = overlayAudioRef.current;
        if (!audio) return;
        audio.preservesPitch = true;
        audio.playbackRate = overlayPlaybackRate;
    }, [overlayPlaybackRate, audioUrl, overlayPlaying]);

    // Wake the free Render worker the moment this page opens so its
    // cold-start burns off while the user is still picking a file.
    useEffect(() => {
        warmCaptionsWorker();
    }, []);

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
            let audioBuffer: AudioBuffer | null = null;
            try {
                const audioBlob = file || (await getAudioBlobFromCache(STORAGE_KEYS.AUDIO_KEY));
                if (audioBlob) {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const arrayBuf = await audioBlob.arrayBuffer();
                    audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
                    await audioCtx.close();
                }
            } catch (aErr) {
                console.warn('Audio mux decode skipped:', aErr);
            }

            const videoBlob = await renderCaptionsToVideo({
                cues,
                duration: effectiveDur,
                videoMode,
                highlighterColor: overlayColor,
                aspectRatio: overlayAspectRatio,
                delaySeconds: overlayDelay,
                background: bg,
                audioBuffer,
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

            const baseName = file?.name?.replace(/\.[^/.]+$/, '') || 'captions';
            const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
            downloadBlob(videoBlob, `${baseName}_overlay_${videoMode}_${overlayAspectRatio.replace(':', 'x')}.${ext}`);
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
                        FREE SERVER + BROWSER AI · SRT/VTT EXPORT · 1080P OVERLAY RENDER
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
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
                        <p style={{ fontSize: '0.85rem', color: '#555', maxWidth: 640, lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                            Free speech-to-text — our fast free server by default (offline browser mode included), or your own Groq / OpenAI key.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ ...brutChip(true), cursor: 'default' }}>
                            Captions & Transcript
                        </span>
                        <Link
                            href="/overlay"
                            style={{
                                ...brutChip(false),
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            Overlay Studio →
                        </Link>
                    </div>
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
                        style={brutChip(transcriptionEngine === 'server')}
                        onClick={() => setTranscriptionEngine('server')}
                        title="Transcribe on CreatorKit's free server — works on any device, handles files the browser can't decode. Falls back to your browser automatically if the server is busy."
                    >
                        Server · Free ★
                    </button>
                    <button
                        type="button"
                        style={brutChip(transcriptionEngine === 'local')}
                        onClick={() => setTranscriptionEngine('local')}
                        title="Fully offline — Whisper runs in your browser. The free server rescues files this browser can't decode."
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

            {/* Teleprompter Handoff: Replace Existing Captions Modal */}
            {showHandoffReplacePrompt && pendingHandoff && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    <div
                        className="brutalist-card"
                        style={{
                            maxWidth: 480,
                            width: '100%',
                            padding: 24,
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            boxShadow: '6px 6px 0 #000',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.04em' }}>
                                REPLACE EXISTING CAPTIONS PROJECT?
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontFamily: 'monospace', color: '#222', lineHeight: 1.55 }}>
                            You already have saved captions inside Auto Captions{file?.name ? ` ("${file.name}")` : ''}.
                            Do you want to cancel or remove what is already inside Auto Captions and start a new one for your teleprompter take?
                        </p>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#555', background: '#f4f4f5', padding: '10px 12px', border: '1.5px solid #000' }}>
                            📁 New Teleprompter Take: <strong>{pendingHandoff.fileName || 'teleprompter_take.webm'}</strong>
                            {pendingHandoff.mediaBlob && (
                                <span> · {(pendingHandoff.mediaBlob.size / (1024 * 1024)).toFixed(1)} MB</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 6 }}>
                            <button
                                type="button"
                                className="brutalist-button"
                                style={{ fontSize: '0.72rem', padding: '8px 14px' }}
                                onClick={handleCancelHandoffReplace}
                            >
                                Cancel · Keep Existing
                            </button>
                            <button
                                type="button"
                                className="brutalist-button brutalist-button-primary"
                                style={{ fontSize: '0.72rem', padding: '8px 16px', background: '#FFE500' }}
                                onClick={handleConfirmHandoffReplace}
                            >
                                Yes, Replace & Start New
                            </button>
                        </div>
                    </div>
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
                            <button type="button" className="brutalist-button brutalist-button-primary" style={{ fontSize: '0.7rem', padding: '6px 12px' }} onClick={() => handleFile(file, 'server')}>
                                Retry on Server (free)
                            </button>
                            <button type="button" className="brutalist-button" style={{ fontSize: '0.7rem', padding: '6px 12px' }} onClick={() => handleFile(file, 'groq')}>
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

            {/* Recent sessions — past transcriptions, never auto-deleted */}
            {!file && !isProcessing && sessionsIndex.length > 0 && (
                <div className="brutalist-card" style={{ padding: 16, margin: '16px 0' }}>
                    <div style={{ ...BRUT_LABEL, marginBottom: 10 }}>▦ Recent Sessions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sessionsIndex.map((s) => (
                            <div
                                key={s.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                    border: '2px solid #000',
                                    borderRadius: 4,
                                    padding: '8px 10px',
                                    background: '#fff',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 180 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, wordBreak: 'break-all' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#666' }}>
                                        {new Date(s.createdAt).toLocaleString()} · {Math.round(s.duration)}s · {s.cueCount} cues
                                    </div>
                                </div>
                                <button
                                    onClick={() => openSession(s.id)}
                                    className="brutalist-button brutalist-button-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.68rem' }}
                                >
                                    Open
                                </button>
                                <button
                                    onClick={() => deleteSession(s.id)}
                                    className="brutalist-button"
                                    style={{ padding: '6px 12px', fontSize: '0.68rem' }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
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
                        percent={progress.stage === 'complete' ? 100 : displayPercent}
                        label={progress.message || 'GENERATING CAPTIONS...'}
                    />
                    <p style={{ margin: 0, fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 600, color: '#666' }}>
                        Transcribing speech and aligning word timestamps — this only takes a moment.
                    </p>
                </div>
            )}

            {/* Restored without audio: warn loudly — the work is still usable */}
            {sessionAudioMissing && !isProcessing && (
                <div
                    className="brutalist-card"
                    style={{
                        padding: '12px 16px',
                        borderColor: '#eab308',
                        background: '#fef9c3',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                    }}
                >
                    ⚠ SESSION RESTORED WITHOUT AUDIO — the browser did not keep the recording
                    (storage quota or private mode). Your cues, SRT/VTT export and the overlay
                    render still work. Re-attach the audio file only if you want to listen along.
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
                                            padding: '6px 10px',
                                            border: '2px solid #000',
                                            background: '#f4f4f5',
                                            borderRadius: 4,
                                            display: 'flex',
                                            flexDirection: 'row',
                                            flexWrap: 'nowrap',
                                            alignItems: 'center',
                                            gap: 8,
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={toggleOverlayPlayback}
                                            className="brutalist-button"
                                            style={{
                                                padding: '5px 8px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                minWidth: 32,
                                                height: 28,
                                            }}
                                            aria-label={overlayPlaying ? 'Pause' : 'Play'}
                                        >
                                            {overlayPlaying ? <Pause size={14} /> : <Play size={14} />}
                                        </button>

                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                            <TactileScrubber
                                                value={overlayCurrentTime}
                                                min={0}
                                                max={audioDuration || (cues.length > 0 ? cues[cues.length - 1].end : 10)}
                                                step={0.05}
                                                stepDelta={0.5}
                                                height={14}
                                                showSteppers={false}
                                                formatValue={(t) => t.toFixed(2)}
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
                                                padding: '2px 6px',
                                                border: '1.5px solid #000',
                                                borderRadius: 3,
                                                flexShrink: 0,
                                                textAlign: 'center',
                                                fontVariantNumeric: 'tabular-nums',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {overlayCurrentTime.toFixed(2)}s
                                        </span>
                                    </div>

                                    {/* Playback speed — slow the audio to pinpoint exact moments while retiming */}
                                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>SPEED</span>
                                        {[0.5, 0.75, 1, 1.5, 2].map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setOverlayPlaybackRate(r)}
                                                title="Slow playback to pinpoint exact cue moments — captions follow automatically"
                                                style={{
                                                    padding: '2px 7px',
                                                    border: '1.5px solid #000',
                                                    background: overlayPlaybackRate === r ? '#000' : '#fff',
                                                    color: overlayPlaybackRate === r ? '#FFE500' : '#000',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    fontSize: '0.62rem',
                                                    cursor: 'pointer',
                                                    borderRadius: 3,
                                                }}
                                            >
                                                {r}×
                                            </button>
                                        ))}
                                    </div>


                                    {/* Per-cue timeline strip — scroll sideways, drag blocks to retime, gaps = silence */}
                                    {cues.length > 0 && (() => {
                                        // Normalized cue geometry: clamp negative starts, repair NaN/degenerate
                                        // timestamps — guarantees EVERY cue renders a visible, draggable card.
                                        const norm = cues.map((c) => {
                                            const st = Number.isFinite(c.start) ? Math.max(0, c.start) : 0;
                                            const en = Number.isFinite(c.end) && c.end > st ? c.end : st + 2;
                                            return { st, en, text: c.text };
                                        });
                                        // Track must span every cue end (audio metadata can be shorter).
                                        const trackDur = Math.max(1, audioDuration || 0, norm.reduce((m, n) => Math.max(m, n.en), 0));
                                        const activeIdx = cues.findIndex((c) => overlayCurrentTime >= c.start && overlayCurrentTime <= c.end);
                                        const tickStep = trackDur > 120 ? 30 : trackDur > 40 ? 10 : 5;
                                        const ticks: number[] = [];
                                        for (let t = 0; t <= trackDur; t += tickStep) ticks.push(parseFloat(t.toFixed(1)));
                                        const basePx = Math.max(480, Math.ceil(trackDur * 24));
                                        // Full-text cards, CapCut-style lanes: each cue is a separate
                                        // card sized to show its entire text; a card that would overlap
                                        // the previous one gets its own lane (row) so no two cues ever
                                        // look like they appear at the same time.
                                        const CARD_GAP = 6;
                                        const textPx = (t: string) => t.trim().length * 6 + 16;
                                        // Pack lanes in TIME order (dragging a cue earlier must not interleave
                                        // lanes) and key results back to the original cue index.
                                        const laneEnds: number[] = [];
                                        const laneOf: number[] = new Array(cues.length).fill(0);
                                        cues.map((_, k) => k)
                                            .sort((a, b) => (norm[a].st - norm[b].st) || (a - b))
                                            .forEach((k) => {
                                                const leftPx = (norm[k].st / trackDur) * basePx;
                                                const wPx = Math.max(((norm[k].en - norm[k].st) / trackDur) * basePx, textPx(norm[k].text));
                                                let lane = laneEnds.findIndex((end) => leftPx >= end + CARD_GAP);
                                                if (lane === -1) {
                                                    lane = laneEnds.length;
                                                    laneEnds.push(0);
                                                }
                                                laneEnds[lane] = leftPx + wPx;
                                                laneOf[k] = lane;
                                            });
                                        const laneCount = Math.max(1, laneEnds.length);
                                        const trackH = laneCount * 37 + 16;
                                        const innerWidth = `max(100%, ${Math.max(basePx, ...laneEnds, 0) + 8}px)`;
                                        const seekTo = (t: number) => {
                                            const clamped = Math.min(Math.max(0, t), trackDur);
                                            setOverlayCurrentTime(clamped);
                                            if (overlayAudioRef.current) overlayAudioRef.current.currentTime = clamped;
                                        };
                                        return (
                                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                <div
                                                    style={{
                                                        fontSize: '0.56rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        color: '#000',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        flexWrap: 'wrap',
                                                        gap: '4px 8px',
                                                        letterSpacing: '0.02em',
                                                    }}
                                                >
                                                    {/* On desktop: left side of 1 line. On mobile: line 1 */}
                                                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
                                                        <span>CUE TIMELINE — DRAG TO RETIME · SCROLL → FOR MORE</span>
                                                    </div>

                                                    {/* On desktop: right side of 1 line. On mobile: line 2 */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 'auto' }}>
                                                        <span style={{ whiteSpace: 'nowrap' }}>{overlayCurrentTime.toFixed(1)} / {trackDur.toFixed(1)}s</span>

                                                        {/* Small icon-only Undo button */}
                                                        <button
                                                            type="button"
                                                            onClick={handleUndoCue}
                                                            disabled={pastCues.length === 0}
                                                            title="Undo (Ctrl+Z)"
                                                            aria-label="Undo cue re-time"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 20,
                                                                height: 20,
                                                                padding: 0,
                                                                border: '1.5px solid #000',
                                                                background: pastCues.length > 0 ? '#fff' : '#f4f4f5',
                                                                color: pastCues.length > 0 ? '#000' : '#a1a1aa',
                                                                borderRadius: 3,
                                                                cursor: pastCues.length > 0 ? 'pointer' : 'not-allowed',
                                                                boxShadow: pastCues.length > 0 ? '1px 1px 0 #000' : 'none',
                                                                opacity: pastCues.length > 0 ? 1 : 0.45,
                                                            }}
                                                        >
                                                            <Undo2 size={11} strokeWidth={2.6} />
                                                        </button>

                                                        {/* Small icon-only Redo button */}
                                                        <button
                                                            type="button"
                                                            onClick={handleRedoCue}
                                                            disabled={futureCues.length === 0}
                                                            title="Redo (Ctrl+Y)"
                                                            aria-label="Redo cue re-time"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 20,
                                                                height: 20,
                                                                padding: 0,
                                                                border: '1.5px solid #000',
                                                                background: futureCues.length > 0 ? '#fff' : '#f4f4f5',
                                                                color: futureCues.length > 0 ? '#000' : '#a1a1aa',
                                                                borderRadius: 3,
                                                                cursor: futureCues.length > 0 ? 'pointer' : 'not-allowed',
                                                                boxShadow: futureCues.length > 0 ? '1px 1px 0 #000' : 'none',
                                                                opacity: futureCues.length > 0 ? 1 : 0.45,
                                                            }}
                                                        >
                                                            <Redo2 size={11} strokeWidth={2.6} />
                                                        </button>

                                                        {/* Sync timings button */}
                                                        <button
                                                            type="button"
                                                            onClick={handleSyncCueTimings}
                                                            title="Rebuild word-level timings for every cue — fixes manually typed or edited text so the karaoke reveal matches the timeline"
                                                            style={{
                                                                padding: '1px 6px',
                                                                border: '1.5px solid #000',
                                                                background: '#FFE500',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 900,
                                                                fontSize: '0.56rem',
                                                                color: '#000',
                                                                borderRadius: 3,
                                                                cursor: 'pointer',
                                                                textTransform: 'uppercase',
                                                                whiteSpace: 'nowrap',
                                                                boxShadow: '1px 1px 0 #000',
                                                            }}
                                                        >
                                                            SYNC TIMINGS
                                                        </button>
                                                    </div>
                                                </div>
                                                <div
                                                    ref={cueTrackScrollRef}
                                                    style={{
                                                        width: '100%',
                                                        overflowX: 'auto',
                                                        overflowY: 'hidden',
                                                        border: '2px solid #000',
                                                        borderRadius: 4,
                                                        background: '#ffffff',
                                                        WebkitOverflowScrolling: 'touch',
                                                    }}
                                                >
                                                    <div
                                                        ref={cueTrackRef}
                                                        style={{
                                                            position: 'relative',
                                                            width: innerWidth,
                                                            minWidth: '100%',
                                                            height: trackH,
                                                            cursor: 'pointer',
                                                            userSelect: 'none',
                                                        }}
                                                        onClick={(e) => {
                                                            if (e.target !== e.currentTarget) return;
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            seekTo(((e.clientX - rect.left) / rect.width) * trackDur);
                                                        }}
                                                    >
                                                        {ticks.map((t) => (
                                                            <div key={`tick-${t}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(t / trackDur) * 100}%`, borderLeft: '1px solid rgba(0,0,0,0.12)', pointerEvents: 'none' }}>
                                                                <span style={{ position: 'absolute', bottom: 1, left: 2, fontSize: '0.5rem', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)', fontWeight: 700 }}>{t}s</span>
                                                            </div>
                                                        ))}
                                                        {cues.map((c, i) => {
                                                            const len = Math.max(0.05, norm[i].en - norm[i].st);
                                                            const rawStart = cueDragView && cueDragView.index === i ? cueDragView.newStart : norm[i].st;
                                                            const posStart = Number.isFinite(rawStart) ? Math.max(0, Math.min(trackDur - 0.05, rawStart)) : 0;
                                                            const leftPct = Math.min(99.2, (posStart / trackDur) * 100);
                                                            const widthPct = Math.max(0.8, (len / trackDur) * 100);
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    title={`#${i + 1}  ${c.start.toFixed(2)}s → ${c.end.toFixed(2)}s — ${c.text}`}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: 4 + laneOf[i] * 37,
                                                                        height: 32,
                                                                        left: `${leftPct}%`,
                                                                        width: `${widthPct}%`,
                                                                        minWidth: Math.max(14, Math.ceil(c.text.trim().length * 6 + 16)),
                                                                        background: cueDragView && cueDragView.index === i ? '#FFE500' : i === activeIdx ? '#FFF3B0' : '#FFFFFF',
                                                                        border: i === activeIdx ? '2px solid #000' : '1.5px solid rgba(0,0,0,0.6)',
                                                                        borderRadius: 3,
                                                                        opacity: cueDragView && cueDragView.index !== i ? 0.6 : 1,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        padding: '0 4px',
                                                                        overflow: 'hidden',
                                                                        whiteSpace: 'nowrap',
                                                                        fontSize: '0.56rem',
                                                                        fontFamily: 'monospace',
                                                                        fontWeight: 900,
                                                                        color: '#000',
                                                                        cursor: 'grab',
                                                                        touchAction: 'none',
                                                                        zIndex: 1,
                                                                    }}
                                                                    onPointerDown={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
                                                                        cueDragRef.current = {
                                                                            index: i,
                                                                            startX: e.clientX,
                                                                            origStart: norm[i].st,
                                                                            width: cueTrackRef.current?.getBoundingClientRect().width ?? 1,
                                                                            dur: trackDur,
                                                                            len,
                                                                            newStart: c.start,
                                                                            movedPx: 0,
                                                                        };
                                                                    }}
                                                                    onPointerMove={(e) => {
                                                                        const d = cueDragRef.current;
                                                                        if (!d || d.index !== i) return;
                                                                        const dx = e.clientX - d.startX;
                                                                        const ns = Math.min(Math.max(0, d.origStart + (dx / d.width) * d.dur), Math.max(0, d.dur - d.len));
                                                                        d.newStart = ns;
                                                                        d.movedPx = Math.abs(dx);
                                                                        setCueDragView({ index: i, newStart: ns });
                                                                    }}
                                                                    onPointerUp={(e) => {
                                                                        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { }
                                                                        const d = cueDragRef.current;
                                                                        cueDragRef.current = null;
                                                                        setCueDragView(null);
                                                                        if (!d || d.index !== i) return;
                                                                        if (d.movedPx < 4) {
                                                                            seekTo(d.origStart);
                                                                        } else {
                                                                            handleMoveCue(i, parseFloat(d.newStart.toFixed(2)));
                                                                        }
                                                                    }}
                                                                    onPointerCancel={() => {
                                                                        cueDragRef.current = null;
                                                                        setCueDragView(null);
                                                                    }}
                                                                >
                                                                    {c.text.trim() || '·'}
                                                                </div>
                                                            );
                                                        })}
                                                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(overlayCurrentTime / trackDur) * 100}%`, width: 2, background: '#000', boxShadow: '0 0 1px rgba(255,255,255,0.75)', pointerEvents: 'none', zIndex: 2 }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
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
                                                { id: 'kinetic-pop', label: 'Kinetic pop', desc: 'Shorts' },
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
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <TactileScrubber
                                                    label="Delay"
                                                    value={overlayDelay}
                                                    min={-5}
                                                    max={10}
                                                    step={0.1}
                                                    formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}s`}
                                                    onChange={setOverlayDelay}
                                                    presets={[
                                                        { label: '0.5s', value: 0.5 },
                                                        { label: '1s', value: 1 },
                                                    ]}
                                                />
                                            </div>
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
                                                <Download size={16} /> Export .mp4
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                onClick={() => handleExportOverlayVideo('green-screen')}
                                                disabled={cues.length === 0}
                                                style={{ padding: '12px 18px', fontSize: '0.82rem', boxShadow: '4px 4px 0 #000' }}
                                            >
                                                Green screen .mp4
                                            </button>
                                            <div style={{ gridColumn: '1 / -1', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>
                                                MP4 exports use a green key background (H.264 has no alpha) — chroma key it over your footage.
                                            </div>
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
                                        onClick={() => handleSwitchDeck('cassette')}
                                    >
                                        Player
                                    </button>
                                    <button
                                        type="button"
                                        style={brutChip(activeStudioDeck === 'overlay')}
                                        onClick={() => handleSwitchDeck('overlay')}
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

                                {engineSourceLabel && cues.length > 0 && (
                                    <span
                                        title="Engine that produced this transcript"
                                        style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            border: '1.5px solid #000',
                                            borderRadius: 3,
                                            background: '#FFE500',
                                            fontFamily: 'monospace',
                                            fontWeight: 900,
                                            fontSize: '0.56rem',
                                            letterSpacing: '0.04em',
                                            marginBottom: 8,
                                        }}
                                    >
                                        ENGINE: {engineSourceLabel}
                                    </span>
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
