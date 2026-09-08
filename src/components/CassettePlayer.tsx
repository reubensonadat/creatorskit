'use client';

/**
 * Cassette Audio Player
 * =====================
 * A tactile skeuomorphic audio player inspired by the labels, reels,
 * and mechanical controls of a compact cassette.
 *
 * Supports live synchronized .vtt captions and 100% local audio playback.
 */

import React, {
    type ComponentPropsWithRef,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    RotateCcw,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Subtitles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TactileScrubber } from '@/components/tactile-scrubber';

const DEFAULT_VOLUME = 0.8;
const REEL_SPOKES = [0, 60, 120, 180, 240, 300] as const;
const TAPE_WINDOW_DIVIDERS = [0, 1, 2, 3, 4] as const;
const MIN_REWIND_DURATION = 220;
const MAX_REWIND_DURATION = 900;
const CASSETTE_TEXTURE =
    "url(\"data:image/svg+xml,%3Csvg width='180' height='180' viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const BUTTON_CLASSES =
    'grid aspect-square cursor-pointer place-items-center rounded-full border text-[#fdfdfc] transition-[background-color,opacity,transform] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100';

export interface CassetteCaptionTrack {
    default?: boolean;
    label: string;
    src: string;
    srcLang: string;
}

export interface CassettePlayerProps
    extends Omit<ComponentPropsWithRef<'section'>, 'children'> {
    archiveLabel?: string;
    audioSrc?: string;
    captionTracks?: readonly CassetteCaptionTrack[];
    catalogueNumber?: string;
    duration?: number;
    initialVolume?: number;
    loop?: boolean;
    onPlaybackChange?: (isPlaying: boolean) => void;
    onPlaybackError?: (error: unknown) => void;
    preload?: 'auto' | 'metadata' | 'none';
    sideLabel?: string;
    trackTitle?: string;
    showLiveCaptionBar?: boolean;
}

function easeInOutCubic(progress: number) {
    return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function normalizeVolume(volume: number) {
    return Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : DEFAULT_VOLUME;
}

function parseVttTime(timeStr: string): number {
    const parts = timeStr.trim().split(':');
    if (parts.length === 3) {
        const [h, m, s] = parts;
        return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
    } else if (parts.length === 2) {
        const [m, s] = parts;
        return parseFloat(m) * 60 + parseFloat(s);
    }
    return 0;
}

interface VttCue {
    start: number;
    end: number;
    text: string;
}

function Reel({ className }: { className: string }) {
    return (
        <div
            className={cn(
                'absolute top-1/2 z-3 aspect-square w-[78cqh] -translate-x-1/2 -translate-y-1/2',
                className
            )}
        >
            <svg
                aria-hidden="true"
                className="absolute inset-0 origin-center rotate-[var(--reel-rotation)] rounded-full will-change-transform motion-reduce:!rotate-0"
                viewBox="0 0 100 100"
            >
                <circle className="fill-zinc-100" cx="50" cy="50" r="48" />
                {REEL_SPOKES.map((spokeRotation) => (
                    <path
                        className="fill-[#1b1a18] stroke-[#11100f] [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.32))] [stroke-linejoin:round] [stroke-width:1.25]"
                        d="M46 3h8v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"
                        key={spokeRotation}
                        transform={`rotate(${spokeRotation} 50 50)`}
                    />
                ))}
                <circle
                    className="fill-none stroke-[#1b1a18] [stroke-width:3]"
                    cx="50"
                    cy="50"
                    r="48"
                />
            </svg>
        </div>
    );
}

function Screw({ className }: { className: string }) {
    const slotClasses =
        'absolute top-1/2 right-[18%] left-[18%] h-[14%] -translate-y-1/2 rounded-full bg-[#1d1d1b] shadow-[inset_0_1px_1px_rgba(0,0,0,0.82),0_1px_rgba(255,255,255,0.1)]';

    return (
        <div
            aria-hidden="true"
            className={cn(
                'absolute z-3 aspect-square w-[3.3%] rounded-full border border-[#060606] bg-[radial-gradient(circle_at_36%_30%,#5f5f5c,#30302e_48%,#171716_78%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.26),0_1px_1px_rgba(0,0,0,0.38)]',
                className
            )}
        >
            <span className={cn(slotClasses, 'rotate-45')} />
            <span className={cn(slotClasses, '-rotate-45')} />
        </div>
    );
}

export function CassettePlayer({
    archiveLabel = '',
    audioSrc,
    captionTracks,
    catalogueNumber = '',
    duration: externalDuration,
    className,
    initialVolume = DEFAULT_VOLUME,
    loop = false,
    onPlaybackChange,
    onPlaybackError,
    preload = 'metadata',
    sideLabel = '',
    trackTitle = 'One Small Step',
    showLiveCaptionBar = true,
    ...sectionProps
}: CassettePlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const cassetteRef = useRef<HTMLDivElement>(null);
    const durationRef = useRef(0);
    const isPlayingRef = useRef(false);
    const previousSourceRef = useRef(audioSrc);
    const rewindAnimationRef = useRef<number | null>(null);
    const resumeAfterRewindRef = useRef(false);
    const resumeAfterScrubRef = useRef(false);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [volume, setVolume] = useState(() => normalizeVolume(initialVolume));
    const [previousVolume, setPreviousVolume] = useState(() => normalizeVolume(initialVolume));

    // Captions parsing state
    const [cues, setCues] = useState<VttCue[]>([]);
    const [activeCaption, setActiveCaption] = useState<string>('');
    const [captionsVisible, setCaptionsVisible] = useState(true);

    // Parse captionTracks .vtt source if provided
    useEffect(() => {
        if (!captionTracks || captionTracks.length === 0) {
            setCues([]);
            return;
        }

        const activeTrack = captionTracks.find((t) => t.default) || captionTracks[0];
        if (!activeTrack?.src) return;

        let isMounted = true;
        fetch(activeTrack.src)
            .then((res) => res.text())
            .then((vttText) => {
                if (!isMounted) return;
                const parsedCues: VttCue[] = [];
                const lines = vttText.split(/\r?\n/);
                let currentStart = 0;
                let currentEnd = 0;
                let textBuffer: string[] = [];

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.includes('-->')) {
                        const [startStr, endStr] = line.split('-->');
                        currentStart = parseVttTime(startStr);
                        currentEnd = parseVttTime(endStr);
                        textBuffer = [];
                    } else if (line === '' && textBuffer.length > 0) {
                        parsedCues.push({
                            start: currentStart,
                            end: currentEnd,
                            text: textBuffer.join(' '),
                        });
                        textBuffer = [];
                    } else if (line && !line.startsWith('WEBVTT') && !line.startsWith('NOTE') && isNaN(Number(line))) {
                        textBuffer.push(line);
                    }
                }

                if (textBuffer.length > 0) {
                    parsedCues.push({
                        start: currentStart,
                        end: currentEnd,
                        text: textBuffer.join(' '),
                    });
                }

                setCues(parsedCues);
            })
            .catch((err) => {
                console.warn('Could not parse caption track:', err);
                setCues([]);
            });

        return () => {
            isMounted = false;
        };
    }, [captionTracks]);

    // Live update active caption cue based on currentTime with deduplication
    useEffect(() => {
        if (!captionsVisible || cues.length === 0) {
            setActiveCaption((prev) => (prev ? '' : prev));
            return;
        }
        const active = cues.find((c) => currentTime >= c.start && currentTime <= c.end);
        const nextText = active ? active.text : '';
        setActiveCaption((prev) => (prev !== nextText ? nextText : prev));
    }, [currentTime, cues, captionsVisible]);

    const maxCueEnd = cues.length > 0 ? cues[cues.length - 1].end : 0;
    const effectiveDuration = (externalDuration && externalDuration > 0)
        ? externalDuration
        : (duration > 0 ? duration : maxCueEnd);

    const updatePlaybackVisuals = useCallback((time: number) => {
        const cassette = cassetteRef.current;
        if (!cassette) return;

        const mediaDuration = durationRef.current || (cues.length > 0 ? cues[cues.length - 1].end : 0);
        const progress = mediaDuration > 0 ? Math.min(Math.max(time / mediaDuration, 0), 1) : 0;

        cassette.style.setProperty('--reel-rotation', `${(time * 300) % 360}deg`);
        cassette.style.setProperty('--left-tape-scale', `${1 - progress * 0.4}`);
        cassette.style.setProperty('--right-tape-scale', `${0.6 + progress * 0.4}`);
    }, [cues]);

    const reportPlaybackError = useCallback(
        (error: unknown, message: string) => {
            setPlaybackError(message);
            onPlaybackError?.(error);
        },
        [onPlaybackError]
    );

    const updatePlaybackState = useCallback(
        (nextIsPlaying: boolean) => {
            if (isPlayingRef.current === nextIsPlaying) return;
            isPlayingRef.current = nextIsPlaying;
            setIsPlaying(nextIsPlaying);
            onPlaybackChange?.(nextIsPlaying);
        },
        [onPlaybackChange]
    );

    const updateMediaDuration = useCallback(
        (audio: HTMLAudioElement) => {
            let nextDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
            if (nextDuration === 0) {
                if (externalDuration && externalDuration > 0) {
                    nextDuration = externalDuration;
                } else if (cues.length > 0) {
                    nextDuration = cues[cues.length - 1].end;
                }
            }
            durationRef.current = nextDuration;
            setDuration(nextDuration);
            updatePlaybackVisuals(audio.currentTime);
        },
        [externalDuration, cues, updatePlaybackVisuals]
    );

    // Keep duration synchronized if cues or externalDuration become available after mount
    useEffect(() => {
        const fallback = (externalDuration && externalDuration > 0)
            ? externalDuration
            : (cues.length > 0 ? cues[cues.length - 1].end : 0);
        if (fallback > 0 && (duration <= 0 || durationRef.current <= 0)) {
            durationRef.current = fallback;
            setDuration(fallback);
        }
    }, [externalDuration, cues, duration]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.volume = volume;
    }, [volume]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio && audio.readyState >= 1) {
            updateMediaDuration(audio);
        }
    }, [updateMediaDuration]);

    useEffect(() => {
        if (previousSourceRef.current === audioSrc) return;
        previousSourceRef.current = audioSrc;

        if (rewindAnimationRef.current !== null) {
            window.cancelAnimationFrame(rewindAnimationRef.current);
            rewindAnimationRef.current = null;
        }

        const audio = audioRef.current;
        audio?.pause();
        audio?.load();
        durationRef.current = 0;
        resumeAfterRewindRef.current = false;
        resumeAfterScrubRef.current = false;
        setCurrentTime(0);
        setDuration(0);
        updatePlaybackState(false);
        setPlaybackError(null);
        updatePlaybackVisuals(0);
    }, [audioSrc, updatePlaybackState, updatePlaybackVisuals]);

    // 60fps animation loop strictly for DOM CSS variables (reels rotation, tape scale)
    // Does NOT trigger React state updates to prevent re-render loops
    useEffect(() => {
        if (!isPlaying) return;

        let animationFrameId = 0;
        function syncPlaybackFrame() {
            const audio = audioRef.current;
            if (!audio || audio.paused) return;

            updatePlaybackVisuals(audio.currentTime);
            animationFrameId = window.requestAnimationFrame(syncPlaybackFrame);
        }

        animationFrameId = window.requestAnimationFrame(syncPlaybackFrame);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [isPlaying, updatePlaybackVisuals]);

    function cancelRewind() {
        if (rewindAnimationRef.current === null) return;
        window.cancelAnimationFrame(rewindAnimationRef.current);
        rewindAnimationRef.current = null;
        resumeAfterRewindRef.current = false;

        const audio = audioRef.current;
        if (audio) {
            audio.currentTime = currentTime;
            updatePlaybackVisuals(currentTime);
        }
    }

    async function togglePlayback() {
        const audio = audioRef.current;
        if (!audio) return;

        if (!audioSrc) {
            reportPlaybackError(null, 'No audio source loaded.');
            return;
        }

        cancelRewind();

        if (audio.paused) {
            try {
                await audio.play();
            } catch (error) {
                updatePlaybackState(false);
                reportPlaybackError(error, 'Playback could not start. Check audio source.');
            }
        } else {
            audio.pause();
        }
    }

    function restart() {
        const audio = audioRef.current;
        if (!audio) return;

        if (rewindAnimationRef.current !== null) {
            window.cancelAnimationFrame(rewindAnimationRef.current);
        }

        resumeAfterRewindRef.current = resumeAfterRewindRef.current || !audio.paused;
        if (!audio.paused) audio.pause();

        const rewindFrom = currentTime;
        const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function finishRewind() {
            if (!audio) return;
            rewindAnimationRef.current = null;
            audio.currentTime = 0;
            setCurrentTime(0);
            updatePlaybackVisuals(0);

            const shouldResume = resumeAfterRewindRef.current;
            resumeAfterRewindRef.current = false;

            if (shouldResume) {
                audio.play().catch((error) => {
                    updatePlaybackState(false);
                    reportPlaybackError(error, 'Playback could not resume after restarting.');
                });
            }
        }

        if (rewindFrom <= 0 || shouldReduceMotion) {
            finishRewind();
            return;
        }

        const rewindDistance = duration > 0 ? Math.min(Math.max(rewindFrom / duration, 0), 1) : 1;
        const rewindDuration =
            MIN_REWIND_DURATION + (MAX_REWIND_DURATION - MIN_REWIND_DURATION) * rewindDistance;
        const startedAt = performance.now();

        function animateRewind(now: number) {
            const linearProgress = Math.min((now - startedAt) / rewindDuration, 1);
            const easedProgress = easeInOutCubic(linearProgress);
            const nextTime = rewindFrom * (1 - easedProgress);

            updatePlaybackVisuals(nextTime);
            setCurrentTime(nextTime);

            if (linearProgress < 1) {
                rewindAnimationRef.current = window.requestAnimationFrame(animateRewind);
                return;
            }

            finishRewind();
        }

        rewindAnimationRef.current = window.requestAnimationFrame(animateRewind);
    }

    function seek(nextTime: number) {
        const audio = audioRef.current;
        if (!audio) return;

        cancelRewind();
        const maximumTime = durationRef.current || effectiveDuration;
        const clampedTime = Math.min(Math.max(nextTime, 0), maximumTime);
        audio.currentTime = clampedTime;
        setCurrentTime(clampedTime);
        updatePlaybackVisuals(clampedTime);
    }

    function changeVolume(nextVolume: number) {
        const audio = audioRef.current;
        if (!audio) return;
        const normalized = normalizeVolume(nextVolume);
        audio.volume = normalized;
        setVolume(normalized);
        if (normalized > 0) setPreviousVolume(normalized);
    }

    function toggleMute() {
        changeVolume(volume === 0 ? previousVolume || DEFAULT_VOLUME : 0);
    }

    const progressRatio = effectiveDuration > 0 ? Math.min(Math.max(currentTime / effectiveDuration, 0), 1) : 0;

    return (
        <section
            aria-label={`${trackTitle} audio player`}
            {...sectionProps}
            className={cn(
                'grid w-full place-items-center overflow-hidden rounded-[18px] bg-transparent text-[#25211d] [--label-bg:#ffffff] [--label-border:rgba(0,0,0,0.12)] [--label-catalogue:rgba(0,0,0,0.55)] [--label-ink:#18181b] [--label-kicker:rgba(0,0,0,0.7)] [--label-stripe-one:#FFE500] [--label-stripe-two:#18181b] [--label-stripe-three:#FFE500] [--progress-thumb-border:#000000] [--reel-teeth-stroke:#11100f] [--reel-teeth:#1b1a18] [container-type:inline-size]',
                className
            )}
        >
            <audio
                loop={loop}
                onDurationChange={(e) => updateMediaDuration(e.currentTarget)}
                onEnded={() => updatePlaybackState(false)}
                onError={(e) => {
                    if (audioSrc) {
                        reportPlaybackError(e.currentTarget.error, 'Audio track could not be loaded.');
                    }
                }}
                onLoadedMetadata={(e) => {
                    updateMediaDuration(e.currentTarget);
                    setPlaybackError(null);
                }}
                onPause={() => updatePlaybackState(false)}
                onPlay={() => {
                    updatePlaybackState(true);
                    setPlaybackError(null);
                }}
                onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime);
                    updatePlaybackVisuals(e.currentTarget.currentTime);
                }}
                preload={preload}
                ref={audioRef}
                src={audioSrc}
            />

            <div className="w-full max-w-[530px]">
                {/* ─── The Cassette Tape Shell ─── */}
                <div
                    className="dark relative aspect-[1.58] w-full overflow-hidden rounded-[18px] border border-[#050505] bg-[linear-gradient(165deg,#373735_0%,#20201f_52%,#0e0e0d_100%)] shadow-[0_28px_48px_rgba(0,0,0,0.35),0_8px_16px_rgba(0,0,0,0.22),inset_0_2px_1px_rgba(255,255,255,0.2),inset_0_-3px_3px_rgba(0,0,0,0.74)] [--left-tape-scale:1] [--reel-rotation:0deg] [--right-tape-scale:0.6] max-[560px]:rounded-xl"
                    ref={cassetteRef}
                >
                    {/* Inner Rim Accent */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-1.5 rounded-[13px] border border-white/[0.12] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.62)]"
                    />

                    {/* Plastic Noise Surface */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 opacity-100 mix-blend-multiply"
                        style={{ backgroundImage: CASSETTE_TEXTURE }}
                    />

                    {/* 4 Corner Screws */}
                    <Screw className="top-[4%] left-[2.53%]" />
                    <Screw className="top-[4%] right-[2.53%]" />
                    <Screw className="bottom-[4%] left-[2.53%]" />
                    <Screw className="right-[2.53%] bottom-[4%]" />

                    {/* ─── White Vinyl Sticker Label ─── */}
                    <div className="absolute top-[9.5%] right-[8.5%] bottom-[24%] left-[8.5%] z-1 overflow-clip rounded-[9px] border-4 border-transparent bg-white text-zinc-900 shadow-[inset_0_0_12px_rgba(92,74,49,0.12)] [container-type:inline-size] [overflow-clip-margin:border-box] max-[560px]:rounded-md">
                        {/* Title Centered */}
                        <div className="relative z-2 mx-4 mt-4 flex flex-col items-center justify-center text-center">
                            {archiveLabel ? (
                                <span className="relative z-2 font-bold font-mono text-[clamp(8px,2.5cqw,11px)] text-zinc-600 uppercase leading-none tracking-[0.12em] mb-1">
                                    {archiveLabel}
                                </span>
                            ) : null}
                            <span className="relative z-2 block max-w-full truncate font-sans font-extrabold text-[clamp(13px,4.8cqw,22px)] leading-tight tracking-[-0.04em] text-zinc-950 text-center">
                                {trackTitle}
                            </span>
                        </div>

                        {/* ─── Center Window with Stripes & Spools ─── */}
                        <div className="relative mt-4 h-[34%] max-[560px]:h-[31%]">
                            {/* 3 Color Stripes: CreatorKit Yellow / Black / CreatorKit Yellow */}
                            <div
                                aria-hidden="true"
                                className="absolute -inset-x-1 top-1/2 grid h-[58%] -translate-y-1/2 grid-rows-3 gap-y-1"
                            >
                                <span className="bg-[#FFE500]" />
                                <span className="bg-[#18181b]" />
                                <span className="bg-[#FFE500]" />
                            </div>

                            {/* Center Clear Acrylic Oval Window */}
                            <div className="absolute inset-y-0 inset-x-[17.5%] z-3 overflow-hidden rounded-full bg-[#1b1a18] bg-[linear-gradient(rgba(255,255,255,0.13),transparent_45%)] shadow-[0_0_0_4px_rgba(0,0,0,0.1),inset_0_3px_8px_rgba(0,0,0,0.58)] [--reel-window-color:#1b1a18] [container-type:size]">
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 opacity-25 mix-blend-multiply"
                                    style={{ backgroundImage: CASSETTE_TEXTURE }}
                                />

                                {/* Magnetic Tape Bridge */}
                                <div
                                    aria-hidden="true"
                                    className="absolute top-[12%] right-[28%] bottom-[12%] left-[28%] z-2 flex items-center justify-evenly overflow-hidden rounded-[3px] border-2 border-[#11100f] bg-[#393631] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1),transparent_42%)] shadow-[inset_0_3px_6px_rgba(0,0,0,0.72),0_0_0_2px_rgba(255,255,255,0.08)]"
                                >
                                    <span className="absolute top-1/2 left-[calc(50cqh-28cqw)] aspect-square h-[360%] -translate-x-1/2 -translate-y-1/2 scale-[var(--left-tape-scale)] rounded-full border border-[#0d0a08] bg-[repeating-radial-gradient(circle,#050505_0_2px,#171717_2px_4px)] shadow-[inset_0_0_5px_rgba(0,0,0,0.7),0_1px_2px_rgba(0,0,0,0.5)] will-change-transform" />
                                    <span className="absolute top-1/2 left-[calc(72cqw-50cqh)] aspect-square h-[360%] -translate-x-1/2 -translate-y-1/2 scale-[var(--right-tape-scale)] rounded-full border border-[#0d0a08] bg-[repeating-radial-gradient(circle,#050505_0_2px,#171717_2px_4px)] shadow-[inset_0_0_5px_rgba(0,0,0,0.7),0_1px_2px_rgba(0,0,0,0.5)] will-change-transform" />
                                    {TAPE_WINDOW_DIVIDERS.map((divider) => (
                                        <span
                                            className="relative z-1 h-[42%] w-0.5 bg-[rgba(224,215,195,0.28)]"
                                            key={divider}
                                        />
                                    ))}
                                </div>

                                {/* Rotating Reels */}
                                <Reel className="left-[50cqh]" />
                                <Reel className="left-[calc(100%-50cqh)]" />
                            </div>
                        </div>

                        {/* ─── Tactile Scrubber & Timers ─── */}
                        <div className="absolute right-4 bottom-3.5 left-4 z-5 grid gap-y-1">
                            <TactileScrubber
                                value={currentTime}
                                min={0}
                                max={effectiveDuration > 0 ? effectiveDuration : 100}
                                step={0.05}
                                stepDelta={1}
                                height={10}
                                fillColor="#FFE500"
                                showSteppers={false}
                                onChange={(val) => seek(val)}
                            />

                            <div className="relative z-2 flex items-baseline justify-between font-normal font-sans text-[11px] leading-none tabular-nums text-zinc-600">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(effectiveDuration)}</span>
                            </div>
                        </div>

                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-1 z-10 rounded-[inherit] border-4 border-black/5"
                        />
                    </div>

                    {/* ─── Bottom Trapezoid Control Deck ─── */}
                    <div className="absolute right-[27%] bottom-[3.5%] left-[27%] z-4 grid h-[16%] grid-cols-[1fr_auto_1fr] place-items-center gap-x-[clamp(6px,1.5cqw,10px)] bg-[color-mix(in_srgb,#63635e_20%,transparent)] px-[12%] shadow-[inset_0_3px_8px_rgba(0,0,0,0.5)] [clip-path:polygon(13%_0,87%_0,100%_100%,0_100%)]">
                        {/* Restart Button */}
                        <button
                            aria-label="Restart track"
                            className={cn(
                                BUTTON_CLASSES,
                                'w-[clamp(24px,6.5cqw,32px)] border-[#82827c] bg-[#63635e] shadow-[0_2px_5px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#7c7b74]'
                            )}
                            disabled={currentTime <= 0}
                            onClick={restart}
                            type="button"
                        >
                            <RotateCcw size={14} className="stroke-[2.5]" />
                        </button>

                        {/* Play / Pause Center Button */}
                        <button
                            aria-label={isPlaying ? `Pause ${trackTitle}` : `Play ${trackTitle}`}
                            className={cn(
                                BUTTON_CLASSES,
                                'w-[clamp(30px,8.2cqw,43px)] border-2 border-black bg-[#FFE500] shadow-[0_3px_8px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-[#ebd300] active:translate-y-0.5'
                            )}
                            onClick={togglePlayback}
                            type="button"
                        >
                            {isPlaying ? (
                                <Pause size={18} className="fill-black stroke-none" />
                            ) : (
                                <Play size={18} className="ml-0.5 fill-black stroke-none" />
                            )}
                        </button>

                        {/* Mute Button */}
                        <button
                            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                            className={cn(
                                BUTTON_CLASSES,
                                'w-[clamp(24px,6.5cqw,32px)] border-[#82827c] bg-[#63635e] shadow-[0_2px_5px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#7c7b74]'
                            )}
                            onClick={toggleMute}
                            type="button"
                        >
                            {volume === 0 ? (
                                <VolumeX size={15} className="stroke-[2.5]" />
                            ) : (
                                <Volume2 size={15} className="stroke-[2.5]" />
                            )}
                        </button>
                    </div>
                </div>

                {playbackError && (
                    <p className="mt-3 text-center text-xs font-bold text-red-500" role="alert">
                        {playbackError}
                    </p>
                )}

                {/* ─── Live Synchronized Subtitle / Caption Display ─── */}
                {showLiveCaptionBar && (
                    <div className="mt-4 flex flex-col items-center">
                        <div className="flex w-full max-w-[530px] items-center justify-between px-1 text-[11px] font-mono text-zinc-500">
                            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                <Subtitles size={13} className="text-yellow-500" />
                                <span>Live Subtitles</span>
                            </span>
                            {cues.length > 0 && (
                                <button
                                    onClick={() => setCaptionsVisible(!captionsVisible)}
                                    className={cn(
                                        'rounded px-1.5 py-0.5 font-bold uppercase tracking-widest text-[10px] transition-colors',
                                        captionsVisible
                                            ? 'bg-yellow-400 text-black'
                                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                    )}
                                >
                                    {captionsVisible ? 'CC ON' : 'CC OFF'}
                                </button>
                            )}
                        </div>

                        <div className="mt-1.5 min-h-[44px] w-full max-w-[530px] rounded-xl border-2 border-zinc-950 bg-black p-3 text-center shadow-inner">
                            {activeCaption ? (
                                <p className="animate-fade-in font-sans text-sm font-bold text-yellow-400">
                                    &ldquo;{activeCaption}&rdquo;
                                </p>
                            ) : (
                                <p className="font-mono text-xs text-zinc-600">
                                    {audioSrc ? (isPlaying ? '...' : 'Press play to listen') : 'No audio loaded'}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default CassettePlayer;
