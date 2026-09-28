'use client';

/**
 * MediaStagePlayer
 * ================
 * The house media player for any grabbed / local video or audio file.
 *
 * - video → brutalist custom controls on the shared TactileScrubber
 *   (play/pause, seek, time, mute, fullscreen, save-again)
 * - audio → the skeuomorphic CassettePlayer (same one auto-captions uses)
 *
 * One component, reused everywhere — no duplicated inline players.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Maximize2 } from 'lucide-react';
import { TactileScrubber } from '@/components/tactile-scrubber';
import { CassettePlayer } from '@/components/CassettePlayer';

const BLACK = '#000000';
const WHITE = '#FFFFFF';

export interface MediaStagePlayerProps {
  src: string;
  kind: 'video' | 'audio';
  title?: string;
  /** When set, a SAVE AGAIN button appears inside the player. */
  downloadName?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const CTRL_BTN: React.CSSProperties = {
  width: 38,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fff',
  border: `2px solid ${BLACK}`,
  color: BLACK,
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
};

export function MediaStagePlayer({ src, kind, title, downloadName }: MediaStagePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const seek = useCallback((value: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(value)) return;
    v.currentTime = value;
    setTime(value);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const goFullscreen = useCallback(() => {
    const el = stageRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!el) return;
    if (typeof el.requestFullscreen === 'function') el.requestFullscreen().catch(() => undefined);
    else el.webkitRequestFullscreen?.();
  }, []);

  // Reset the transport whenever a new file is loaded.
  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, [src]);

  if (kind === 'audio') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CassettePlayer
          audioSrc={src}
          trackTitle={title || 'Grabbed Audio'}
          sideLabel="CREATORKIT"
          archiveLabel="VIDEO GRABBER"
          catalogueNumber="CK-GRAB"
          showLiveCaptionBar={false}
        />
        {downloadName && (
          <a
            href={src}
            download={downloadName}
            style={{
              ...CTRL_BTN,
              width: 'auto',
              padding: '0 14px',
              gap: 8,
              fontFamily: 'monospace',
              fontWeight: 900,
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              textDecoration: 'none',
              display: 'inline-flex',
              height: 38,
              justifySelf: 'start',
            }}
          >
            <Download size={14} /> SAVE AGAIN
          </a>
        )}
      </div>
    );
  }

  return (
    <div ref={stageRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#000' }}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#000',
          border: `2px solid ${WHITE}`,
          objectFit: 'contain',
          display: 'block',
          cursor: 'pointer',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} style={CTRL_BTN}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div style={{ flex: '1 1 140px', minWidth: 120 }}>
          <TactileScrubber
            value={time}
            min={0}
            max={duration > 0 ? duration : 1}
            step={0.01}
            onChange={seek}
            fillColor={WHITE}
            showSteppers={false}
            height={12}
            formatValue={(v) => formatTime(v)}
          />
        </div>
        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.68rem', color: WHITE, flexShrink: 0 }}>
          {formatTime(time)} / {formatTime(duration)}
        </span>
        <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} style={CTRL_BTN}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button onClick={goFullscreen} aria-label="Fullscreen" style={CTRL_BTN}>
          <Maximize2 size={15} />
        </button>
        {downloadName && (
          <a
            href={src}
            download={downloadName}
            aria-label="Save again"
            style={{ ...CTRL_BTN, textDecoration: 'none' }}
          >
            <Download size={15} />
          </a>
        )}
      </div>
    </div>
  );
}

export default MediaStagePlayer;
