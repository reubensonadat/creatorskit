'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    type CaptionVideoMode,
    type CaptionPillBackground,
    type VideoAspectRatio,
    type VideoBackgroundMode,
    type CaptionStylePresetConfig,
    type ActiveWordEffect,
    CAPTION_STYLE_PRESETS,
    drawCaptionFrame,
    renderCaptionsToVideo,
    ensureOverlayFontReady,
    POPULAR_OVERLAY_FONTS,
} from '@/lib/captions/overlay-renderer';
import { type SubtitleCue } from '@/lib/captions/vtt-formatter';
import { downloadBlob } from '@/lib/canvas-video-exporter';
import { getAudioBlobFromCache } from '@/lib/captions/audio-cache';
import { TactileScrubber } from '@/components/tactile-scrubber';
import { Play, Pause, Download } from 'lucide-react';

const STORAGE_KEYS = {
    CUES: 'creatorkit_autoCaptions_cues',
    AUDIO_KEY: 'current_caption_audio',
};

const BRUT_LABEL: React.CSSProperties = {
    fontSize: '0.72rem',
    fontFamily: 'monospace',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#000',
};

function brutChip(active: boolean): React.CSSProperties {
    return {
        padding: '5px 10px',
        border: '2px solid #000',
        borderRadius: 4,
        background: active ? '#000' : '#fff',
        color: active ? '#FFE500' : '#000',
        fontFamily: 'monospace',
        fontWeight: 900,
        fontSize: '0.68rem',
        cursor: 'pointer',
        boxShadow: active ? 'none' : '2px 2px 0 #000',
        transform: active ? 'translate(1px, 1px)' : 'none',
        textTransform: 'uppercase',
    };
}

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

export interface OverlayStudioProps {
    cues: SubtitleCue[];
    setCues?: React.Dispatch<React.SetStateAction<SubtitleCue[]>>;
    audioUrl?: string | null;
    audioDuration: number;
    file?: File | null;
    onResetSession?: () => void;
}

export function OverlayStudio({
    cues,
    setCues,
    audioUrl,
    audioDuration,
    file,
    onResetSession,
}: OverlayStudioProps) {
    // Overlay styling & animation options
    const [videoMode, setVideoMode] = useState<CaptionVideoMode>('kinetic-pop');
    const [activePresetId, setActivePresetId] = useState<string | null>('hormozi-yellow');
    const [captionFont, setCaptionFont] = useState<string>('montserrat');
    const [captionFontSize, setCaptionFontSize] = useState<number>(64);
    const [captionLetterSpacing, setCaptionLetterSpacing] = useState<number>(-1);
    const [captionYPosition, setCaptionYPosition] = useState<number>(72);
    const [captionPillBg, setCaptionPillBg] = useState<CaptionPillBackground>('dark');
    const [captionPillCustomColor, setCaptionPillCustomColor] = useState<string>('#000000');
    const [overlayColor, setOverlayColor] = useState<string>('#FFE500');
    const [overlayBackground, setOverlayBackground] = useState<VideoBackgroundMode>('transparent');
    const [overlayAspectRatio, setOverlayAspectRatio] = useState<VideoAspectRatio>('9:16');
    const [overlayDelay, setOverlayDelay] = useState<number>(0);
    const [emojiMode, setEmojiMode] = useState<boolean>(false);
    const [springPhysics, setSpringPhysics] = useState<boolean>(true);
    const [bounceIntensity, setBounceIntensity] = useState<number>(1.15);
    const [wordRotation, setWordRotation] = useState<boolean>(false);
    const [wordPop, setWordPop] = useState<boolean>(false);
    const [textShadow, setTextShadow] = useState<boolean>(true);
    const [uppercase, setUppercase] = useState<boolean>(true);
    const [activeWordEffect, setActiveWordEffect] = useState<ActiveWordEffect>('fill');
    const [glowColor, setGlowColor] = useState<string>('#22D3EE');
    const [tapeBackdrop, setTapeBackdrop] = useState<boolean>(false);
    // Motion-as-code extras: word-onset impact shake (decaying sine) and
    // export-time sub-frame motion blur. Off by default — existing styles
    // render exactly as before until the user opts in.
    const [impactShakeOn, setImpactShakeOn] = useState<boolean>(false);
    const [motionBlurOn, setMotionBlurOn] = useState<boolean>(false);

    // Transport & Playback
    const [overlayCurrentTime, setOverlayCurrentTime] = useState<number>(0);
    const [overlayPlaying, setOverlayPlaying] = useState<boolean>(false);
    const [overlayPlaybackRate, setOverlayPlaybackRate] = useState<number>(1);
    const [isRenderingVideo, setIsRenderingVideo] = useState(false);
    const [videoRenderProgress, setVideoRenderProgress] = useState(0);

    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayAudioRef = useRef<HTMLAudioElement | null>(null);
    const lastScrubberUpdateRef = useRef<number>(0);
    const cueTrackRef = useRef<HTMLDivElement | null>(null);
    const cueTrackScrollRef = useRef<HTMLDivElement | null>(null);
    const [cueDragView, setCueDragView] = useState<{ index: number; newStart: number } | null>(null);
    const cueDragRef = useRef<{
        index: number;
        startX: number;
        origStart: number;
        width: number;
        dur: number;
        len: number;
        newStart: number;
        movedPx: number;
    } | null>(null);

    // Apply preset
    const applyStylePreset = (preset: CaptionStylePresetConfig) => {
        setActivePresetId(preset.id);
        setVideoMode(preset.videoMode);
        setCaptionFont(preset.fontFamily);
        setCaptionFontSize(preset.fontSize);
        setCaptionLetterSpacing(preset.letterSpacing);
        setCaptionYPosition(preset.yPositionPercent);
        setCaptionPillBg(preset.pillBackground);
        if (preset.pillCustomColor) setCaptionPillCustomColor(preset.pillCustomColor);
        setOverlayColor(preset.highlighterColor);
        setSpringPhysics(preset.springPhysics);
        setBounceIntensity(preset.bounceIntensity);
        setWordRotation(preset.wordRotation);
        setWordPop(preset.wordPop);
        setActiveWordEffect(preset.activeWordEffect);
        if (preset.glowColor) setGlowColor(preset.glowColor);
        setTapeBackdrop(preset.tapeBackdrop);
        setTextShadow(preset.textShadow);
        setUppercase(preset.uppercase);
        setEmojiMode(preset.emojiMode);
        setImpactShakeOn((preset.shakeIntensity ?? 0) > 0);
        setMotionBlurOn((preset.motionBlurSamples ?? 1) > 1);
    };

    // Live Canvas Preview Draw
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
                activeWordEffect: activeWordEffect,
                glowColor: glowColor,
                tapeBackdrop: tapeBackdrop,
                shakeIntensity: impactShakeOn ? 1.25 : 0,
                motionBlurSamples: motionBlurOn ? 4 : 1,
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
        activeWordEffect,
        glowColor,
        tapeBackdrop,
        impactShakeOn,
        motionBlurOn,
    ]);

    useEffect(() => {
        renderPreviewCanvas(overlayCurrentTime);
    }, [renderPreviewCanvas, overlayCurrentTime]);

    useEffect(() => {
        let cancelled = false;
        ensureOverlayFontReady(captionFont).then(() => {
            if (!cancelled) renderPreviewCanvas(overlayCurrentTime);
        });
        return () => {
            cancelled = true;
        };
    }, [captionFont, renderPreviewCanvas, overlayCurrentTime]);

    // Live Audio Playback & Animation Loop
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

    useEffect(() => {
        const audio = overlayAudioRef.current;
        if (!audio) return;
        audio.preservesPitch = true;
        audio.playbackRate = overlayPlaybackRate;
    }, [overlayPlaybackRate, audioUrl, overlayPlaying]);

    const toggleOverlayPlayback = () => {
        const audio = overlayAudioRef.current;
        if (!audio) {
            setOverlayPlaying(!overlayPlaying);
            return;
        }
        if (audio.paused) {
            audio.play().catch(() => { });
            setOverlayPlaying(true);
        } else {
            audio.pause();
            setOverlayPlaying(false);
        }
    };

    // Retiming & Timing Sync
    const handleMoveCue = (index: number, newStart: number) => {
        if (!setCues) return;
        setCues((prev) => {
            const cue = prev[index];
            if (!cue) return prev;
            const len = cue.end - cue.start;
            const delta = newStart - cue.start;
            const updated: SubtitleCue = {
                ...cue,
                start: newStart,
                end: parseFloat((newStart + len).toFixed(2)),
                words: cue.words?.map((w) => ({
                    ...w,
                    start: parseFloat((w.start + delta).toFixed(3)),
                    end: parseFloat((w.end + delta).toFixed(3)),
                })),
            };
            const next = [...prev];
            next[index] = updated;
            next.sort((a, b) => a.start - b.start);
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    const handleSyncCueTimings = () => {
        if (!setCues) return;
        setCues((prev) => {
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
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    // Deterministic Video Export (Fixed Download Pipeline)
    const handleExportOverlayVideo = async (bg: VideoBackgroundMode) => {
        if (cues.length === 0) return;
        setIsRenderingVideo(true);
        setVideoRenderProgress(0);

        try {
            const effectiveDur = audioDuration || (cues.length > 0 ? cues[cues.length - 1].end : 5);

            // Mux audio track if available
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
                console.warn('Audio decode for export skipped:', aErr);
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
                    activeWordEffect: activeWordEffect,
                    glowColor: glowColor,
                    tapeBackdrop: tapeBackdrop,
                    shakeIntensity: impactShakeOn ? 1.25 : 0,
                    motionBlurSamples: motionBlurOn ? 4 : 1,
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

            {/* Stage Viewport */}
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

            {/* Transport & Scrubber Bar */}
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

            {/* Playback speed */}
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

            {/* CapCut-style horizontal cue timeline with lanes & drag-to-retime */}
            {cues.length > 0 && (() => {
                const trackDur = Math.max(1, audioDuration || cues[cues.length - 1].end);
                const activeIdx = cues.findIndex((c) => overlayCurrentTime >= c.start && overlayCurrentTime <= c.end);
                const tickStep = trackDur > 120 ? 30 : trackDur > 40 ? 10 : 5;
                const ticks: number[] = [];
                for (let t = 0; t <= trackDur; t += tickStep) ticks.push(parseFloat(t.toFixed(1)));
                const basePx = Math.max(900, Math.ceil(trackDur * 48));
                const CARD_GAP = 6;
                const textPx = (t: string) => Math.min(180, t.trim().length * 6 + 18);
                const laneEnds: number[] = [];
                const laneOf: number[] = new Array(cues.length).fill(0);
                for (let k = 0; k < cues.length; k++) {
                    const c = cues[k];
                    const leftPx = (c.start / trackDur) * basePx;
                    const wPx = Math.max((Math.max(0.05, c.end - c.start) / trackDur) * basePx, textPx(c.text));
                    let minLane = 0;
                    if (k > 0 && c.start < cues[k - 1].end) {
                        minLane = laneOf[k - 1] + 1;
                    }
                    let lane = -1;
                    for (let l = minLane; l < Math.max(minLane + 1, laneEnds.length); l++) {
                        if (l >= laneEnds.length || leftPx >= laneEnds[l] + CARD_GAP) {
                            lane = l;
                            break;
                        }
                    }
                    if (lane === -1) lane = Math.max(minLane, laneEnds.length);
                    while (laneEnds.length <= lane) laneEnds.push(0);
                    laneEnds[lane] = leftPx + wPx;
                    laneOf[k] = lane;
                }
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
                        <div style={{ fontSize: '0.56rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.02em' }}>
                            <span>CUE TIMELINE — DRAG TO RETIME · SCROLL → FOR MORE</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{overlayCurrentTime.toFixed(1)} / {trackDur.toFixed(1)}s</span>
                                <button
                                    type="button"
                                    onClick={handleSyncCueTimings}
                                    title="Rebuild word-level timings for every cue — fixes manually typed or edited text"
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
                                background: '#fff',
                                borderRadius: 3,
                            }}
                        >
                            <div
                                ref={cueTrackRef}
                                style={{
                                    position: 'relative',
                                    width: innerWidth,
                                    minWidth: '100%',
                                    height: trackH,
                                    background: '#f4f4f5',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    seekTo((clickX / rect.width) * trackDur);
                                }}
                            >
                                {ticks.map((t) => (
                                    <div
                                        key={t}
                                        style={{
                                            position: 'absolute',
                                            left: `${(t / trackDur) * 100}%`,
                                            top: 0,
                                            bottom: 0,
                                            borderLeft: '1px dashed #d4d4d8',
                                            pointerEvents: 'none',
                                            paddingLeft: 3,
                                            fontSize: '0.5rem',
                                            fontFamily: 'monospace',
                                            color: '#a1a1aa',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {t}s
                                    </div>
                                ))}

                                {cues.map((c, i) => {
                                    const isCur = activeIdx === i;
                                    const len = Math.max(0.05, c.end - c.start);
                                    const curStart = cueDragView && cueDragView.index === i ? cueDragView.newStart : c.start;
                                    const leftPct = (curStart / trackDur) * 100;
                                    return (
                                        <div
                                            key={i}
                                            title={`[${c.start.toFixed(2)}s - ${c.end.toFixed(2)}s] ${c.text}`}
                                            style={{
                                                position: 'absolute',
                                                top: 4 + laneOf[i] * 37,
                                                height: 32,
                                                left: `${leftPct}%`,
                                                background: isCur ? '#FFE500' : '#ffffff',
                                                border: isCur ? '2px solid #000' : '1.5px solid #000',
                                                boxShadow: isCur ? '2px 2px 0 #000' : '1px 1px 0 rgba(0,0,0,0.2)',
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
                                                    origStart: c.start,
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

                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        bottom: 0,
                                        left: `${(overlayCurrentTime / trackDur) * 100}%`,
                                        width: 2,
                                        background: '#000',
                                        boxShadow: '0 0 1px rgba(255,255,255,0.75)',
                                        pointerEvents: 'none',
                                        zIndex: 2,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Presets & Typography */}
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

                {/* Active word effect (kinetic-pop artistic treatments) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ ...BRUT_LABEL, fontSize: '0.62rem' }}>Active word</span>
                    {(['fill', 'marker', 'box', 'underline', 'glow'] as ActiveWordEffect[]).map((fx) => (
                        <button
                            key={fx}
                            type="button"
                            onClick={() => {
                                setActiveWordEffect(fx);
                                setActivePresetId(null);
                            }}
                            style={brutChip(activeWordEffect === fx)}
                            title={`Active word effect: ${fx}`}
                        >
                            {fx === 'fill' ? 'Color fill' : fx === 'marker' ? 'Marker swipe' : fx === 'box' ? 'Hand box' : fx === 'underline' ? 'Swipe underline' : 'Neon glow'}
                        </button>
                    ))}
                </div>

                {/* Font Family */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>FONT</span>
                    {POPULAR_OVERLAY_FONTS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setCaptionFont(f.id)}
                            style={brutChip(captionFont === f.id)}
                        >
                            {f.name}
                        </button>
                    ))}
                </div>

                {/* Highlight Color */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>COLOR</span>
                    {['#FFE500', '#22C55E', '#06B6D4', '#EC4899', '#A78BFA', '#F97316', '#FFFFFF'].map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setOverlayColor(c)}
                            aria-label={`Highlight ${c}`}
                            style={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                backgroundColor: c,
                                border: overlayColor === c ? '3px solid #000' : '2px solid #ccc',
                                boxShadow: overlayColor === c ? '2px 2px 0 #000' : 'none',
                                cursor: 'pointer',
                                transform: overlayColor === c ? 'scale(1.1)' : 'none',
                            }}
                        />
                    ))}
                    <input
                        type="color"
                        value={overlayColor}
                        onChange={(e) => setOverlayColor(e.target.value)}
                        aria-label="Custom highlight color"
                        style={{
                            width: 30,
                            height: 30,
                            padding: 1,
                            border: '2px solid #000',
                            borderRadius: 4,
                            background: '#fff',
                            cursor: 'pointer',
                        }}
                    />
                </div>

                {/* Sizing & Position Scrubbers */}
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
                        min={32}
                        max={96}
                        step={2}
                        onChange={setCaptionFontSize}
                        presets={[
                            { label: 'S (48)', value: 48 },
                            { label: 'M ★ (64)', value: 64 },
                            { label: 'L (84)', value: 84 },
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
                        />
                    </div>
                </div>
            </div>

            {/* Motion & Effects */}
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
                            ['Rotation tilt', wordRotation, setWordRotation],
                            ['Drop shadow', textShadow, setTextShadow],
                            ['Tape backdrop', tapeBackdrop, setTapeBackdrop],
                            ['All caps', uppercase, setUppercase],
                            ['Emoji mode', emojiMode, setEmojiMode],
                            ['Impact shake', impactShakeOn, setImpactShakeOn],
                            ['Motion blur', motionBlurOn, setMotionBlurOn],
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

            {/* Aspect & Background Settings */}
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
                            {ar} {ar === '9:16' ? '(Portrait Shorts)' : '(Landscape)'}
                        </button>
                    ))}
                    {(
                        [
                            { id: 'transparent' as VideoBackgroundMode, label: 'Transparent' },
                            { id: 'green-screen' as VideoBackgroundMode, label: 'Green Screen' },
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

            {/* Export Actions */}
            {isRenderingVideo ? (
                <BrutProgress percent={videoRenderProgress} label="RENDERING HD VIDEO OVERLAY" />
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
                        <Download size={16} /> Export 1080p .mp4
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
                        1080p WebCodecs H.264 MP4 with synchronized audio — ready to chroma-key directly over video timelines in Premiere, DaVinci, CapCut, and Final Cut.
                    </div>
                </div>
            )}
        </div>
    );
}
