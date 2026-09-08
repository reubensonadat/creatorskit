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
} from 'lucide-react';
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

    // Session Persistence: restore from localStorage and IndexedDB on mount
    useEffect(() => {
        let isMounted = true;

        async function restoreSession() {
            try {
                if (typeof window === 'undefined') return;

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

    const handleFile = async (selectedFile: File) => {
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

        setIsProcessing(true);
        try {
            // Step 1: Decode audio
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

            // Step 2: Transcribe audio
            setProgress({
                stage: 'loading_model',
                message: 'Generating captions...',
                percent: 20,
            });

            if (!whisperClientRef.current) {
                whisperClientRef.current = new WhisperClient();
            }

            const result: TranscriptionResult = await whisperClientRef.current.transcribe(
                audioData,
                (prog) => {
                    setProgress(prog);
                }
            );

            // Step 3: Format subtitle output
            setCues(result.cues);
            setFullText(result.fullText);
            setElapsed(result.elapsedSeconds);

            // Generate .vtt blob for the CassettePlayer caption track
            const vttContent = generateVtt(result.cues);
            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
            const vttBlobUrl = URL.createObjectURL(vttBlob);
            setVttUrl(vttBlobUrl);

            // Step 4: Persist in browser (localStorage + IndexedDB)
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(result.cues));
                localStorage.setItem(STORAGE_KEYS.FULL_TEXT, result.fullText);
                localStorage.setItem(STORAGE_KEYS.FILE_NAME, selectedFile.name);
                localStorage.setItem(STORAGE_KEYS.ELAPSED, result.elapsedSeconds);
                if (decodedDuration > 0) {
                    localStorage.setItem(STORAGE_KEYS.DURATION, decodedDuration.toString());
                } else if (result.cues.length > 0) {
                    localStorage.setItem(STORAGE_KEYS.DURATION, result.cues[result.cues.length - 1].end.toString());
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
                    marginBottom: 20,
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
                        Generate subtitles for free.
                    </p>
                </div>
            </div>

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
                                    marginBottom: 16,
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

                            {/* View Switcher Tabs */}
                            <div
                                style={{
                                    display: 'flex',
                                    borderBottom: '1.5px solid #000',
                                    marginBottom: 12,
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
                                <div
                                    style={{
                                        maxHeight: 380,
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
                                                    gap: 4,
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
                                                    }}
                                                >
                                                    <span style={{ color: '#000' }}>#{String(idx + 1).padStart(2, '0')}</span>
                                                    <span
                                                        style={{
                                                            background: '#FFE500',
                                                            padding: '1px 5px',
                                                            border: '1px solid #000',
                                                            borderRadius: 2,
                                                        }}
                                                    >
                                                        {formatVttTimestamp(cue.start)} → {formatVttTimestamp(cue.end)}
                                                    </span>
                                                </div>
                                                <p
                                                    style={{
                                                        fontSize: '0.82rem',
                                                        margin: 0,
                                                        color: '#111',
                                                        lineHeight: 1.4,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {cue.text}
                                                </p>
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
                            ) : (
                                <textarea
                                    readOnly
                                    value={fullText}
                                    style={{
                                        width: '100%',
                                        height: 360,
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
                                    placeholder="Full transcript will display here..."
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
