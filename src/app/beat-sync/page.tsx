'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Upload,
  Download,
  Flame,
  Zap,
  Film,
  Music,
  Activity,
  Layers,
  Sliders,
  CheckCircle2,
  Copy,
  ChevronDown,
  Layout,
  Clock,
  Settings,
  Share2,
  ZoomIn,
  ZoomOut,
  Radio,
  FileCode,
  FileSpreadsheet,
  Tv,
  Eye,
  Info,
  Repeat,
  Gauge,
  Plus,
  Trash2,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Square,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';

export type PacingPreset = 'adaptive' | 'hyper' | 'dynamic' | 'story' | 'drops';
export type FrameRate = 23.976 | 24 | 25 | 29.97 | 30 | 59.94 | 60;
export type AspectRatio = '9:16' | '16:9' | '1:1';
export type NLEExportFormat = 'premiere-csv' | 'davinci-edl' | 'fcp-xml' | 'capcut-txt';

export interface BeatMarker {
  id: string;
  time: number;
  duration?: number;
  frame: number;
  timecode: string;
  type: 'drop' | 'downbeat' | 'snare' | 'subbeat' | 'custom';
  label: string;
  color: string;
  energy: number;
  motionTag: string;
}

export interface BRollItem {
  id: string;
  url: string;
  name: string;
}

export interface SongSection {
  name: string;
  startTime: number;
  endTime: number;
  color: string;
  isDrop?: boolean;
}

import StudioToolsDropdown from '@/components/StudioToolsDropdown';

const DEFAULT_BROLL_ITEMS: BRollItem[] = [
  { id: 'broll-1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80', name: 'Creator Face Close-Up' },
  { id: 'broll-2', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80', name: 'Cinema Camera Lens' },
  { id: 'broll-3', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80', name: 'Studio Editing Desk' },
  { id: 'broll-4', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', name: 'Cyber Neon Horizon' },
  { id: 'broll-5', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80', name: 'Executive Suite' },
  { id: 'broll-6', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80', name: 'High-Tech Lab' },
];

const DEMO_TEMPOS = [
  { name: '🔥 Viral Phonk Trap', bpm: 130, genre: 'High Retention', desc: 'Heavy 808s & 2/4 snares' },
  { name: '⚡ Hyper-Pop Sped Up', bpm: 160, genre: 'Ultra-Fast', desc: 'Rapid 1/8 note cuts' },
  { name: '🎬 Cinematic Bass Drop', bpm: 110, genre: 'Story & Drop', desc: 'Dramatic impact swells' },
];

export default function BeatSyncPage() {
  // Audio State
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [trackName, setTrackName] = useState<string>('Viral_Phonk_Trap_130BPM.wav');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(28);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // DSP Analysis Outputs
  const [bpm, setBpm] = useState<number>(130);
  const [confidenceScore, setConfidenceScore] = useState<number>(96);
  const [kickOnsets, setKickOnsets] = useState<number[]>([]);
  const [snareOnsets, setSnareOnsets] = useState<number[]>([]);
  const [dropTimestamps, setDropTimestamps] = useState<number[]>([]);
  const [songSections, setSongSections] = useState<SongSection[]>([]);
  const [firstBeatOffset, setFirstBeatOffset] = useState<number>(0.08);
  const [customMarkers, setCustomMarkers] = useState<BeatMarker[]>([]);

  // Pacing Config
  const [pacingPreset, setPacingPreset] = useState<PacingPreset>('adaptive');
  const [frameRate, setFrameRate] = useState<FrameRate>(30);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');

  // In / Out Loop Region
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [loopIn, setLoopIn] = useState<number | null>(null);
  const [loopOut, setLoopOut] = useState<number | null>(null);

  // Tap Tempo State
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  // B-Roll Items Tray
  const [brollItems, setBrollItems] = useState<BRollItem[]>(DEFAULT_BROLL_ITEMS);

  // UI & Canvas
  const [showToolsDropdown, setShowToolsDropdown] = useState<boolean>(false);
  const [activeDeckTab, setActiveDeckTab] = useState<'pacing' | 'broll' | 'export'>('pacing');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Visual Cut State
  const [currentCutIndex, setCurrentCutIndex] = useState<number>(0);
  const [isCutImpactFlash, setIsCutImpactFlash] = useState<boolean>(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  // Format SMPTE Timecode
  const formatTimecode = useCallback((seconds: number, fps: number = frameRate) => {
    const totalFrames = Math.round(seconds * fps);
    const ff = Math.floor(totalFrames % fps);
    const totalSeconds = Math.floor(totalFrames / fps);
    const ss = totalSeconds % 60;
    const mm = Math.floor(totalSeconds / 60) % 60;
    const hh = Math.floor(totalSeconds / 3600);

    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
  }, [frameRate]);

  // Format MM:SS.ms
  const formatStandardTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  // Generate Synthetic Demo Track
  const generateSyntheticDemoTrack = useCallback((targetBpm: number = 130) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);

    const sampleRate = ctx.sampleRate;
    const trackDuration = 28;
    const buffer = ctx.createBuffer(2, sampleRate * trackDuration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    const secondsPerBeat = 60 / targetBpm;
    const totalBeats = Math.floor(trackDuration / secondsPerBeat);
    const dropBeatStart = 32;

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = beat * secondsPerBeat;
      const beatSample = Math.floor(beatTime * sampleRate);
      const isIntro = beat < 16;
      const isBuildUp = beat >= 16 && beat < dropBeatStart;
      const isDrop = beat >= dropBeatStart;

      // Kick Drum / 808
      if (isDrop || (isIntro && beat % 4 === 0) || (isBuildUp && beat >= 24)) {
        const kickLen = Math.floor(sampleRate * 0.22);
        const pitchMultiplier = isDrop ? 1.0 : 0.8;
        for (let i = 0; i < kickLen && beatSample + i < leftData.length; i++) {
          const t = i / sampleRate;
          const freq = (150 * pitchMultiplier) * Math.exp(-t * 22);
          const sub = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t * 8) * (isDrop ? 0.9 : 0.4);
          const punch = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 18) * 0.85;
          const val = punch + sub;
          leftData[beatSample + i] += val;
          rightData[beatSample + i] += val;
        }
      }

      // Snare / Clap
      const isSnareBeat = isBuildUp ? (beat >= 24 ? true : beat % 2 === 1) : (beat % 4 === 2);
      if (isSnareBeat) {
        const snareLen = Math.floor(sampleRate * 0.16);
        for (let i = 0; i < snareLen && beatSample + i < leftData.length; i++) {
          const t = i / sampleRate;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 24);
          const body = Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t * 30) * 0.5;
          const val = (noise + body) * (isDrop ? 0.75 : 0.6);
          leftData[beatSample + i] += val;
          rightData[beatSample + i] += val;
        }
      }

      // Hi-Hats
      const hatLen = Math.floor(sampleRate * 0.04);
      const subSample = beatSample + Math.floor((secondsPerBeat / 2) * sampleRate);
      for (let i = 0; i < hatLen; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 75) * 0.25;
        if (beatSample + i < leftData.length) {
          leftData[beatSample + i] += noise;
          rightData[beatSample + i] += noise;
        }
        if (subSample + i < leftData.length) {
          leftData[subSample + i] += noise * 0.8;
          rightData[subSample + i] += noise * 0.8;
        }
      }
    }

    setAudioBuffer(buffer);
    setDuration(trackDuration);
    setBpm(targetBpm);
  }, []);

  useEffect(() => {
    generateSyntheticDemoTrack(130);
  }, [generateSyntheticDemoTrack]);

  // DSP Analysis
  const runDSPAnalysis = useCallback(async (buffer: AudioBuffer) => {
    const sampleRate = buffer.sampleRate;
    const durationSec = buffer.duration;

    const numChannels = buffer.numberOfChannels;
    const monoData = new Float32Array(buffer.length);
    for (let c = 0; c < numChannels; c++) {
      const channel = buffer.getChannelData(c);
      for (let i = 0; i < buffer.length; i++) {
        monoData[i] += channel[i] / numChannels;
      }
    }

    const hopSize = 512;
    const windowSize = 1024;
    const numFrames = Math.floor((monoData.length - windowSize) / hopSize);

    const lowFlux = new Float32Array(numFrames);
    const midFlux = new Float32Array(numFrames);
    const subEnergyCurve = new Float32Array(numFrames);

    let lowPrev = 0;
    let midPrev = 0;
    let highPrev = 0;
    let prevLowEnergy = 0;
    let prevMidEnergy = 0;

    for (let f = 0; f < numFrames; f++) {
      const start = f * hopSize;
      let lowSum = 0;
      let midSum = 0;

      for (let i = 0; i < windowSize; i++) {
        const x = monoData[start + i];

        const low = lowPrev + 0.025 * (x - lowPrev);
        lowPrev = low;
        lowSum += low * low;

        const high = x - (highPrev + 0.35 * (x - highPrev));
        highPrev = high;

        const mid = (x - low) - high;
        midSum += mid * mid;
      }

      const curLowEnergy = Math.sqrt(lowSum / windowSize);
      const curMidEnergy = Math.sqrt(midSum / windowSize);
      subEnergyCurve[f] = curLowEnergy;

      const dLow = curLowEnergy - prevLowEnergy;
      lowFlux[f] = dLow > 0 ? dLow : 0;
      prevLowEnergy = curLowEnergy;

      const dMid = curMidEnergy - prevMidEnergy;
      midFlux[f] = dMid > 0 ? dMid : 0;
      prevMidEnergy = curMidEnergy;
    }

    const extractPeaks = (flux: Float32Array, multiplier = 1.6, minDistanceSec = 0.18) => {
      const peaks: number[] = [];
      const minDistanceFrames = Math.floor((minDistanceSec * sampleRate) / hopSize);
      const windowFrames = 20;
      let lastPeakFrame = -minDistanceFrames;

      for (let f = windowFrames; f < numFrames - windowFrames; f++) {
        let sum = 0;
        for (let j = f - windowFrames; j <= f + windowFrames; j++) {
          sum += flux[j];
        }
        const localMean = sum / (2 * windowFrames + 1);
        const threshold = localMean * multiplier + 0.005;

        if (flux[f] > threshold && flux[f] > flux[f - 1] && flux[f] >= flux[f + 1]) {
          if (f - lastPeakFrame >= minDistanceFrames) {
            peaks.push((f * hopSize) / sampleRate);
            lastPeakFrame = f;
          }
        }
      }
      return peaks;
    };

    const kicks = extractPeaks(lowFlux, 1.7, 0.22);
    const snares = extractPeaks(midFlux, 1.6, 0.25);

    setKickOnsets(kicks);
    setSnareOnsets(snares);

    const combinedFlux = new Float32Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
      combinedFlux[f] = lowFlux[f] * 1.5 + midFlux[f] * 1.2;
    }

    const minBpm = 70;
    const maxBpm = 180;
    const minLag = Math.floor(((60 / maxBpm) * sampleRate) / hopSize);
    const maxLag = Math.floor(((60 / minBpm) * sampleRate) / hopSize);

    let bestLag = minLag;
    let maxCorr = 0;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let f = 0; f < numFrames - lag; f++) {
        corr += combinedFlux[f] * combinedFlux[f + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }

    const detectedSecondsPerBeat = (bestLag * hopSize) / sampleRate;
    let calculatedBpm = Math.round(60 / detectedSecondsPerBeat);
    while (calculatedBpm < 80) calculatedBpm *= 2;
    while (calculatedBpm > 180) calculatedBpm /= 2;

    setBpm(calculatedBpm);
    setConfidenceScore(Math.min(99, Math.round((maxCorr / (numFrames * 0.05)) * 20 + 80)));

    const beatIntervalSec = 60 / calculatedBpm;
    let bestPhaseOffset = 0;
    let maxPhaseScore = 0;
    const phaseSteps = 30;

    for (let p = 0; p < phaseSteps; p++) {
      const testOffset = (p / phaseSteps) * beatIntervalSec;
      let score = 0;
      for (let t = testOffset; t < durationSec; t += beatIntervalSec) {
        for (let k = 0; k < kicks.length; k++) {
          if (Math.abs(kicks[k] - t) < 0.06) score += 2.0;
        }
        for (let s = 0; s < snares.length; s++) {
          if (Math.abs(snares[s] - t) < 0.06) score += 1.5;
        }
      }
      if (score > maxPhaseScore) {
        maxPhaseScore = score;
        bestPhaseOffset = testOffset;
      }
    }
    setFirstBeatOffset(bestPhaseOffset);

    const drops: number[] = [];
    const sectionList: SongSection[] = [];
    const frameDuration = hopSize / sampleRate;

    for (let f = 20; f < numFrames - 20; f++) {
      const curEnergy = subEnergyCurve[f];
      const prevWindowEnergy = (subEnergyCurve[f - 10] + subEnergyCurve[f - 5] + subEnergyCurve[f - 1]) / 3;

      if (curEnergy > 0.12 && curEnergy > prevWindowEnergy * 2.2) {
        const dropTime = f * frameDuration;
        if (!drops.some((d) => Math.abs(d - dropTime) < 4.0)) {
          drops.push(dropTime);
        }
      }
    }

    setDropTimestamps(drops);

    if (drops.length > 0) {
      const mainDrop = drops[0];
      if (mainDrop > 4.0) {
        sectionList.push({ name: 'INTRO / VERSE', startTime: 0, endTime: Math.max(0, mainDrop - 4.0), color: '#3b82f6' });
        sectionList.push({ name: '⚡ BUILD-UP', startTime: Math.max(0, mainDrop - 4.0), endTime: mainDrop, color: '#f59e0b' });
      }
      sectionList.push({ name: '💥 BASS DROP', startTime: mainDrop, endTime: Math.min(durationSec, mainDrop + 8.0), color: '#ef4444', isDrop: true });
      if (mainDrop + 8.0 < durationSec) {
        sectionList.push({ name: 'CHORUS / OUTRO', startTime: mainDrop + 8.0, endTime: durationSec, color: '#10b981' });
      }
    } else {
      sectionList.push({ name: 'VERSE', startTime: 0, endTime: durationSec * 0.45, color: '#3b82f6' });
      sectionList.push({ name: 'CHORUS', startTime: durationSec * 0.45, endTime: durationSec, color: '#10b981' });
    }

    setSongSections(sectionList);
  }, []);

  useEffect(() => {
    if (audioBuffer) {
      runDSPAnalysis(audioBuffer);
    }
  }, [audioBuffer, runDSPAnalysis]);

  // Tap-Tempo
  const handleTapTempo = () => {
    const now = Date.now();
    const newTaps = [...tapTimes, now].filter((t) => now - t < 3000);
    setTapTimes(newTaps);

    if (newTaps.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push((newTaps[i] - newTaps[i - 1]) / 1000);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 0) {
        const tappedBpm = Math.round(60 / avgInterval);
        if (tappedBpm >= 60 && tappedBpm <= 220) {
          setBpm(tappedBpm);
        }
      }
    }
  };

  // Pacing Cut Calculation
  const activeMarkers = useMemo<BeatMarker[]>(() => {
    if (!audioBuffer) return [];

    const beatInterval = 60 / bpm;
    const markers: BeatMarker[] = [];
    const totalDuration = duration;

    let markerIndex = 1;

    if (pacingPreset === 'adaptive') {
      const isNearDrop = (t: number) => dropTimestamps.some((d) => Math.abs(d - t) < 0.15);

      for (let t = firstBeatOffset; t < totalDuration;) {
        const beatNum = Math.round((t - firstBeatOffset) / beatInterval);
        const currentSection = songSections.find((s) => t >= s.startTime && t < s.endTime);

        let step = beatInterval * 4;
        let motion = '⚡ PUSH-IN';
        let markerColor = '#3b82f6';
        let markerType: BeatMarker['type'] = 'downbeat';

        if (isNearDrop(t)) {
          motion = '💥 BASS DROP IMPACT';
          markerColor = '#ef4444';
          markerType = 'drop';
          step = beatInterval;
        } else if (currentSection?.name.includes('BUILD-UP')) {
          motion = '⚡ ACCELERATED CUT';
          markerColor = '#f59e0b';
          markerType = 'subbeat';
          step = beatInterval / 2;
        } else if (currentSection?.isDrop) {
          motion = beatNum % 2 === 1 ? '🔄 WHIP-CUT' : '🔍 MACRO DETAIL';
          markerColor = '#FFE500';
          markerType = beatNum % 2 === 1 ? 'snare' : 'downbeat';
          step = beatInterval * 2;
        } else {
          motion = '🎬 SCENE CUT';
          markerColor = '#10b981';
          markerType = 'downbeat';
          step = beatInterval * 4;
        }

        markers.push({
          id: `marker-${markerIndex}`,
          time: t,
          duration: step,
          frame: Math.round(t * frameRate),
          timecode: formatTimecode(t, frameRate),
          type: markerType,
          label: `CUT_${String(markerIndex).padStart(2, '0')}`,
          color: markerColor,
          energy: markerType === 'drop' ? 1.0 : 0.8,
          motionTag: motion,
        });

        markerIndex++;
        t += step;
      }
    } else if (pacingPreset === 'hyper') {
      const step = beatInterval / 2;
      for (let t = firstBeatOffset; t < totalDuration; t += step) {
        const isDownbeat = Math.abs((t - firstBeatOffset) % (beatInterval * 4)) < 0.05;
        markers.push({
          id: `marker-${markerIndex}`,
          time: t,
          duration: step,
          frame: Math.round(t * frameRate),
          timecode: formatTimecode(t, frameRate),
          type: isDownbeat ? 'downbeat' : 'subbeat',
          label: `HYPER_${String(markerIndex).padStart(3, '0')}`,
          color: isDownbeat ? '#FFE500' : '#a855f7',
          energy: isDownbeat ? 1.0 : 0.5,
          motionTag: '⚡ RAPID CUT',
        });
        markerIndex++;
      }
    } else if (pacingPreset === 'dynamic') {
      const step = beatInterval;
      for (let t = firstBeatOffset; t < totalDuration; t += step) {
        const beatNum = Math.round((t - firstBeatOffset) / beatInterval);
        const isDownbeat = beatNum % 4 === 0;

        markers.push({
          id: `marker-${markerIndex}`,
          time: t,
          duration: step,
          frame: Math.round(t * frameRate),
          timecode: formatTimecode(t, frameRate),
          type: isDownbeat ? 'downbeat' : 'snare',
          label: isDownbeat ? `BAR_${Math.floor(beatNum / 4) + 1}` : `SNARE_${markerIndex}`,
          color: isDownbeat ? '#FFE500' : '#06b6d4',
          energy: isDownbeat ? 1.0 : 0.85,
          motionTag: isDownbeat ? '⚡ HARD CUT' : '🔄 WHIP-CUT',
        });
        markerIndex++;
      }
    } else if (pacingPreset === 'story') {
      const step = beatInterval * 4;
      for (let t = firstBeatOffset; t < totalDuration; t += step) {
        const barNum = Math.round((t - firstBeatOffset) / (beatInterval * 4)) + 1;
        markers.push({
          id: `marker-${markerIndex}`,
          time: t,
          duration: step,
          frame: Math.round(t * frameRate),
          timecode: formatTimecode(t, frameRate),
          type: 'downbeat',
          label: `SCENE_BAR_${barNum}`,
          color: '#10b981',
          energy: 1.0,
          motionTag: '🎬 CINEMATIC PASS',
        });
        markerIndex++;
      }
    } else {
      dropTimestamps.forEach((t, idx) => {
        markers.push({
          id: `drop-${idx + 1}`,
          time: t,
          duration: 2.0,
          frame: Math.round(t * frameRate),
          timecode: formatTimecode(t, frameRate),
          type: 'drop',
          label: `BASS_DROP_${idx + 1}`,
          color: '#ef4444',
          energy: 1.0,
          motionTag: '💥 BASS DROP IMPACT',
        });
      });
    }

    if (customMarkers.length > 0) {
      markers.push(...customMarkers);
      markers.sort((a, b) => a.time - b.time);
    }

    for (let i = 0; i < markers.length; i++) {
      const nextTime = markers[i + 1]?.time || totalDuration;
      markers[i].duration = Math.max(0.1, nextTime - markers[i].time);
    }

    return markers;
  }, [audioBuffer, bpm, duration, firstBeatOffset, pacingPreset, frameRate, dropTimestamps, songSections, customMarkers, formatTimecode]);

  // Audio Playback
  const handlePlay = useCallback(() => {
    if (!audioBuffer) return;

    let ctx = audioContext;
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    gainNode.gain.value = isMuted ? 0 : volume;

    source.buffer = audioBuffer;
    source.playbackRate.value = playbackSpeed;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const startPos = loopEnabled && loopIn !== null ? loopIn : pauseTimeRef.current % audioBuffer.duration;
    source.start(0, startPos);

    audioSourceRef.current = source;
    gainNodeRef.current = gainNode;
    startTimeRef.current = ctx.currentTime - startPos / playbackSpeed;
    setIsPlaying(true);

    let lastMatchedCut = -1;

    const updatePlayhead = () => {
      if (!audioSourceRef.current || !ctx) return;
      const current = (ctx.currentTime - startTimeRef.current) * playbackSpeed;

      if (loopEnabled && loopOut !== null && current >= loopOut) {
        handleSeek(loopIn !== null ? loopIn : 0);
        return;
      }

      if (current >= duration) {
        handleStop();
        return;
      }
      setCurrentTime(current);

      const cutIdx = activeMarkers.findIndex((m, i) => {
        const nextTime = activeMarkers[i + 1]?.time || duration;
        return current >= m.time && current < nextTime;
      });

      if (cutIdx >= 0 && cutIdx !== lastMatchedCut) {
        lastMatchedCut = cutIdx;
        setCurrentCutIndex(cutIdx);
        setIsCutImpactFlash(true);
        setTimeout(() => setIsCutImpactFlash(false), 90);
      }

      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    };
    animationFrameRef.current = requestAnimationFrame(updatePlayhead);
  }, [audioBuffer, audioContext, duration, isMuted, volume, playbackSpeed, loopEnabled, loopIn, loopOut, activeMarkers]);

  const handlePause = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) { }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    pauseTimeRef.current = currentTime;
    setIsPlaying(false);
  }, [currentTime]);

  const handleStop = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) { }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    pauseTimeRef.current = loopEnabled && loopIn !== null ? loopIn : 0;
    setCurrentTime(pauseTimeRef.current);
    setIsPlaying(false);
    setCurrentCutIndex(0);
  }, [loopEnabled, loopIn]);

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newTime));
    pauseTimeRef.current = clamped;
    setCurrentTime(clamped);
    if (isPlaying) {
      handlePause();
      setTimeout(() => {
        pauseTimeRef.current = clamped;
        handlePlay();
      }, 50);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) handlePause();
        else handlePlay();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        handleTapTempo();
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        setLoopIn(currentTime);
        setLoopEnabled(true);
      } else if (e.code === 'KeyO') {
        e.preventDefault();
        setLoopOut(currentTime);
        setLoopEnabled(true);
      } else if (e.code === 'KeyR' || e.code === 'Home') {
        e.preventDefault();
        handleStop();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(currentTime - (60 / bpm));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(currentTime + (60 / bpm));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handlePlay, handlePause, handleStop, currentTime, bpm]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setShowToolsDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTrackName(file.name);
    handleStop();

    let ctx = audioContext;
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Try direct decode on slice
      let decoded: AudioBuffer | null = null;

      try {
        decoded = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx!.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
        });
      } catch (directErr) {
        // Fallback for WebM / MP4 / recording files
        decoded = await new Promise<AudioBuffer>((resolve, reject) => {
          const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.name.endsWith('.mov');
          const media = document.createElement(isVideo ? 'video' : 'audio');
          const blobUrl = URL.createObjectURL(file);
          media.src = blobUrl;
          media.preload = 'auto';
          media.muted = true;

          media.onloadedmetadata = async () => {
            const dur = media.duration;
            if (!dur || !isFinite(dur) || dur <= 0) {
              URL.revokeObjectURL(blobUrl);
              reject(new Error('Invalid media duration.'));
              return;
            }

            try {
              const sampleRate = ctx!.sampleRate || 44100;
              const offlineCtx = new OfflineAudioContext(1, Math.ceil(sampleRate * Math.min(dur, 600)), sampleRate);
              // createMediaElementSource exists on OfflineAudioContext per the Web Audio spec
              // (BaseAudioContext), but TS DOM lib only declares it on AudioContext.
              const source = (offlineCtx as unknown as AudioContext).createMediaElementSource(media);
              source.connect(offlineCtx.destination);
              media.currentTime = 0;
              media.play().catch(() => { });

              const rendered = await offlineCtx.startRendering();
              URL.revokeObjectURL(blobUrl);
              resolve(rendered);
            } catch (renderErr) {
              URL.revokeObjectURL(blobUrl);
              reject(renderErr);
            }
          };

          media.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error('Media load error'));
          };
        });
      }

      if (decoded) {
        setAudioBuffer(decoded);
        setDuration(decoded.duration);
      }
    } catch (err) {
      console.error('Audio decoding error:', err);
      alert('Could not decode audio from this file. Please ensure it contains a valid audio stream (MP3, WAV, M4A, AAC, WebM, MP4).');
    }
  };

  const handleBRollUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newItem: BRollItem = {
          id: `broll-upload-${Date.now()}-${i}`,
          url,
          name: file.name,
        };
        setBrollItems((prev) => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
  };

  // ═════════════════════════════════════════════════════════════════════════
  // 🎨 SLEEK, FILLED MULTI-BAND WAVEFORM (PREMIERE / ABLETON STYLE)
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = audioBuffer.getChannelData(0);

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#0e0e11';
    ctx.fillRect(0, 0, width, height);

    // Loop Region Overlay
    if (loopEnabled && loopIn !== null && loopOut !== null) {
      const inX = (loopIn / duration) * width;
      const outX = (loopOut / duration) * width;
      ctx.fillStyle = 'rgba(255, 229, 0, 0.12)';
      ctx.fillRect(inX, 0, outX - inX, height);
      ctx.strokeStyle = '#FFE500';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(inX, 0, outX - inX, height);
    }

    // Center Baseline
    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Render Smooth Solid Waveform with Gradient
    const step = Math.ceil(data.length / width);
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#38bdf8'); // Sky blue
    grad.addColorStop(0.5, '#4ade80'); // Green
    grad.addColorStop(1, '#38bdf8');

    ctx.fillStyle = grad;

    for (let x = 0; x < width; x++) {
      let min = 1.0;
      let max = -1.0;
      const start = Math.floor(x * step);
      for (let j = 0; j < step && start + j < data.length; j++) {
        const val = data[start + j];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      const curSec = (x / width) * duration;
      const isDropNear = dropTimestamps.some((d) => Math.abs(d - curSec) < 0.08);

      if (isDropNear) {
        ctx.fillStyle = '#ef4444'; // Red for drop
      } else {
        ctx.fillStyle = grad;
      }

      const yMin = (1 + min) * (height / 2);
      const yMax = (1 + max) * (height / 2);
      const barHeight = Math.max(2, yMax - yMin);
      ctx.fillRect(x, yMin, 1, barHeight);
    }

    // Draw Subtle Top Beat Marker Pips (No harsh vertical fence lines)
    activeMarkers.forEach((m) => {
      const markerX = (m.time / duration) * width;
      if (markerX < 0 || markerX > width) return;

      // Draw top pip
      ctx.fillStyle = m.color;
      ctx.fillRect(markerX - 1, 0, 2, 8);

      if (m.type === 'drop') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(markerX, 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Playhead Line
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#FFE500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = '#FFE500';
    ctx.beginPath();
    ctx.arc(playheadX, 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [audioBuffer, duration, currentTime, activeMarkers, loopEnabled, loopIn, loopOut, dropTimestamps]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;

    if (e.shiftKey) {
      const newMarker: BeatMarker = {
        id: `custom-${Date.now()}`,
        time: newTime,
        duration: 1.0,
        frame: Math.round(newTime * frameRate),
        timecode: formatTimecode(newTime, frameRate),
        type: 'custom',
        label: `USER_PIN_${customMarkers.length + 1}`,
        color: '#f97316',
        energy: 1.0,
        motionTag: '📍 MANUAL PIN',
      };
      setCustomMarkers((prev) => [...prev, newMarker]);
    } else {
      handleSeek(newTime);
    }
  };

  // NLE Exporters
  const generatePremiereCsv = useCallback(() => {
    let csv = `Marker Name\tDescription\tIn\tOut\tDuration\tMarker Type\n`;
    activeMarkers.forEach((m) => {
      const tc = formatTimecode(m.time, frameRate);
      csv += `${m.label} [${m.motionTag}]\tBeat Cut (${pacingPreset.toUpperCase()})\t${tc}\t${tc}\t00:00:00:01\tComment\n`;
    });
    return csv;
  }, [activeMarkers, frameRate, formatTimecode, pacingPreset]);

  const generateDavinciEdl = useCallback(() => {
    let edl = `TITLE: ${trackName.replace(/[^a-zA-Z0-9_]/g, '_')}_BEAT_SYNC\nFCM: NON-DROP FRAME\n\n`;
    activeMarkers.forEach((m, idx) => {
      const eventNum = String(idx + 1).padStart(3, '0');
      const inTc = formatTimecode(m.time, frameRate);
      const outTc = formatTimecode(m.time + 1 / frameRate, frameRate);
      edl += `${eventNum}  AX       V     C        ${inTc} ${outTc} ${inTc} ${outTc}\n`;
      edl += `* LOC: ${inTc} Blue ${m.label} (${m.motionTag})\n\n`;
    });
    return edl;
  }, [activeMarkers, trackName, frameRate, formatTimecode]);

  const generateFinalCutXml = useCallback(() => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n<fcpxml version="1.9">\n  <resources>\n    <format id="r1" frameDuration="1/${frameRate}s" />\n  </resources>\n  <library>\n    <event name="Beat Sync Markers">\n      <project name="${trackName}">\n        <sequence format="r1">\n          <spine>\n`;
    activeMarkers.forEach((m) => {
      const startFr = Math.round(m.time * frameRate);
      xml += `            <marker start="${startFr}/${frameRate}s" duration="1/${frameRate}s" value="${m.label} (${m.motionTag})" note="Beat Cut" />\n`;
    });
    xml += `          </spine>\n        </sequence>\n      </project>\n    </event>\n  </library>\n</fcpxml>`;
    return xml;
  }, [activeMarkers, trackName, frameRate]);

  const downloadNleFile = (format: NLEExportFormat) => {
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (format === 'premiere-csv') {
      content = generatePremiereCsv();
      filename = `${trackName.replace(/\.[^/.]+$/, '')}_Premiere_Markers.csv`;
      mimeType = 'text/csv';
    } else if (format === 'davinci-edl') {
      content = generateDavinciEdl();
      filename = `${trackName.replace(/\.[^/.]+$/, '')}_DaVinci_Resolve.edl`;
    } else if (format === 'fcp-xml') {
      content = generateFinalCutXml();
      filename = `${trackName.replace(/\.[^/.]+$/, '')}_FinalCutPro.fcpxml`;
      mimeType = 'application/xml';
    } else {
      content = activeMarkers.map((m) => `${m.timecode} - ${m.label} [${m.motionTag}] (${m.time.toFixed(3)}s)`).join('\n');
      filename = `${trackName.replace(/\.[^/.]+$/, '')}_CapCut_Timestamps.txt`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentBRoll = brollItems.length > 0 ? brollItems[currentCutIndex % brollItems.length] : null;
  const currentActiveMarker = activeMarkers[currentCutIndex];

  return (
    <div
      className="fs-app-root"
      style={{
        width: '100vw',
        overflow: 'hidden',
        background: '#09090b',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ── Studio Top Header HUD ── */}
      <header
        className="fs-header"
        style={{
          height: 44,
          background: '#000000',
          borderBottom: '1px solid #1f1f23',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        <div className="fs-header-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Unified Tools Dropdown */}
          <StudioToolsDropdown currentHref="/beat-sync" theme="dark" />

          <span
            className="fs-header-badge"
            style={{
              fontSize: '0.66rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              background: '#FFE500',
              color: '#000',
              padding: '2px 7px',
              borderRadius: 3,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Music size={12} />
            BEAT & PACING ARRANGER
          </span>

          <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#fff', fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trackName}
          </span>
        </div>

        {/* Top Header Actions */}
        <div className="fs-header-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            style={{
              background: '#FFE500',
              color: '#000000',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: '0.68rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Upload size={12} />
            Drop Audio / Video (.mp3/.wav/.webm/.mp4)
            <input type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.mp4,.mov" onChange={handleAudioUpload} style={{ display: 'none' }} />
          </label>

          <select
            onChange={(e) => {
              const selected = DEMO_TEMPOS.find((t) => t.bpm === parseInt(e.target.value));
              if (selected) {
                setTrackName(selected.name);
                generateSyntheticDemoTrack(selected.bpm);
              }
            }}
            style={{
              padding: '4px 8px',
              fontSize: '0.66rem',
              fontFamily: 'monospace',
              fontWeight: 800,
              background: '#141417',
              color: '#fff',
              border: '1px solid #27272a',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <option value="130">Demo: 130 BPM Phonk Trap</option>
            <option value="160">Demo: 160 BPM Speed Up</option>
            <option value="110">Demo: 110 BPM Cinematic Bass</option>
          </select>
        </div>
      </header>

      {/* ── Top Workspace: Left Preview Player + Right Control Deck ── */}
      <div className="fs-workspace" style={{ flex: '1 1 50%', display: 'flex', borderBottom: '1px solid #1f1f23', minHeight: 0, overflow: 'hidden' }}>
        {/* Left Video Player Preview (Strict Overflow Hidden & Pro Aspect Containment) */}
        <div
          className="fs-panel-left"
          style={{
            flex: '0 0 42%',
            background: '#0a0a0c',
            borderRight: '1px solid #1f1f23',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Player Toolbar */}
          <div style={{ height: 36, borderBottom: '1px solid #1f1f23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0 }}>
            {/* Aspect Ratio Switcher */}
            <div style={{ display: 'flex', border: '1px solid #27272a', borderRadius: 4, overflow: 'hidden', background: '#141417' }}>
              <button
                onClick={() => setAspectRatio('9:16')}
                style={{
                  padding: '3px 8px',
                  border: 'none',
                  borderRight: '1px solid #27272a',
                  background: aspectRatio === '9:16' ? '#FFE500' : '#141417',
                  color: aspectRatio === '9:16' ? '#000' : '#888',
                  fontSize: '0.62rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Smartphone size={11} /> 9:16 Shorts
              </button>
              <button
                onClick={() => setAspectRatio('16:9')}
                style={{
                  padding: '3px 8px',
                  border: 'none',
                  borderRight: '1px solid #27272a',
                  background: aspectRatio === '16:9' ? '#FFE500' : '#141417',
                  color: aspectRatio === '16:9' ? '#000' : '#888',
                  fontSize: '0.62rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Monitor size={11} /> 16:9 YouTube
              </button>
              <button
                onClick={() => setAspectRatio('1:1')}
                style={{
                  padding: '3px 8px',
                  border: 'none',
                  background: aspectRatio === '1:1' ? '#FFE500' : '#141417',
                  color: aspectRatio === '1:1' ? '#000' : '#888',
                  fontSize: '0.62rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Square size={11} /> 1:1 Post
              </button>
            </div>

            {/* Timecode Clock */}
            <div style={{ background: '#141417', border: '1px solid #27272a', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.68rem', color: '#FFE500', fontWeight: 900 }}>
              {formatStandardTime(currentTime)} / {formatStandardTime(duration)}
            </div>
          </div>

          {/* Video Preview Center (Strict max-height & overflow contain) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                height: '100%',
                maxHeight: '100%',
                aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
                borderRadius: 8,
                border: currentActiveMarker?.type === 'drop' ? '2px solid #ef4444' : '1px solid #333',
                boxShadow: currentActiveMarker?.type === 'drop' ? '0 0 30px rgba(239,68,68,0.4)' : '0 8px 24px rgba(0,0,0,0.8)',
                position: 'relative',
                overflow: 'hidden',
                background: '#141417',
                transform: isCutImpactFlash ? 'scale(1.04)' : 'scale(1.0)',
                transition: 'transform 0.08s ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {currentBRoll ? (
                <img
                  src={currentBRoll.url}
                  alt={currentBRoll.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    filter: isCutImpactFlash ? 'brightness(1.3)' : 'none',
                  }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Film size={32} color="#FFE500" />
                </div>
              )}

              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />

              <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 5 }}>
                <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, background: currentActiveMarker?.type === 'drop' ? '#ef4444' : '#FFE500', color: currentActiveMarker?.type === 'drop' ? '#fff' : '#000', padding: '2px 5px', borderRadius: 2 }}>
                  SHOT #{currentCutIndex + 1}
                </div>
                {currentActiveMarker?.motionTag && (
                  <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 5px', borderRadius: 2, border: '1px solid #444' }}>
                    {currentActiveMarker.motionTag}
                  </div>
                )}
              </div>

              <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: '#fff' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, fontFamily: 'monospace' }}>
                    {currentActiveMarker?.label || 'BEAT CUT'}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#aaa', fontFamily: 'monospace' }}>
                    {currentBRoll?.name || 'Stock Clip'}
                  </div>
                </div>
                <div style={{ fontSize: '0.66rem', fontFamily: 'monospace', color: '#FFE500', fontWeight: 800 }}>
                  {formatTimecode(currentTime, frameRate)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rhythm & Retention Control Deck */}
        <div className="fs-panel-right" style={{ flex: '0 0 58%', background: '#111114', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Deck Nav Tabs */}
          <div style={{ height: 36, borderBottom: '1px solid #1f1f23', display: 'flex', background: '#0a0a0c', flexShrink: 0 }}>
            {[
              { id: 'pacing', label: 'Rhythm & Pacing', icon: SlidersHorizontal },
              { id: 'broll', label: `B-Roll Stock (${brollItems.length})`, icon: ImageIcon },
              { id: 'export', label: '1-Click NLE Export', icon: Download },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveDeckTab(t.id as any)}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRight: '1px solid #1f1f23',
                  background: activeDeckTab === t.id ? '#111114' : '#0a0a0c',
                  color: activeDeckTab === t.id ? '#FFE500' : '#888',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }} className="no-scrollbar">
            {/* PACING DECK TAB */}
            {activeDeckTab === 'pacing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Tempo Bar */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: '#16161a', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#888', fontWeight: 800 }}>DETECTED TEMPO</div>
                      <div style={{ fontSize: '1.3rem', fontFamily: 'monospace', fontWeight: 900, color: '#FFE500', lineHeight: 1 }}>{bpm} <span style={{ fontSize: '0.7rem', color: '#888' }}>BPM</span></div>
                    </div>
                    <div style={{ width: 110 }}>
                      <input
                        type="range"
                        min="60"
                        max="200"
                        value={bpm}
                        onChange={(e) => setBpm(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#FFE500' }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleTapTempo}
                    style={{
                      width: 90,
                      background: '#16161a',
                      border: '1px solid #FFE500',
                      borderRadius: 6,
                      color: '#FFE500',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <Gauge size={15} />
                    <span>TAP (T)</span>
                  </button>
                </div>

                {/* 4 Pacing Preset Cards */}
                <div>
                  <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#888', fontWeight: 800, marginBottom: 5 }}>
                    SELECT PACING ALGORITHM
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {[
                      { id: 'adaptive', title: '🧠 Smart Adaptive', desc: 'Slow verse (3s), rapid build-up, anchor drop hit', tag: 'BEST FOR REELS' },
                      { id: 'hyper', title: '⚡ TikTok Hyper-Speed', desc: 'Rapid 1/4 note cuts (0.4s) for high dopamine', tag: 'TRENDING' },
                      { id: 'dynamic', title: '🔥 Snare Beat Match', desc: 'Cuts locked strictly on 2 & 4 snare hits (0.9s)', tag: 'HYPE / VLOG' },
                      { id: 'story', title: '🎬 Story & Cinematic', desc: 'Full 1-2 bar cuts (2.0s - 4.0s) with room to breathe', tag: 'CINEMATIC' },
                    ].map((p) => {
                      const isSel = pacingPreset === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setPacingPreset(p.id as any)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            background: isSel ? '#1f1f26' : '#141417',
                            border: isSel ? '1.5px solid #FFE500' : '1px solid #27272a',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isSel ? '#FFE500' : '#fff' }}>{p.title}</span>
                            <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', background: '#27272a', color: isSel ? '#FFE500' : '#888', padding: '1px 4px', borderRadius: 2 }}>{p.tag}</span>
                          </div>
                          <p style={{ fontSize: '0.6rem', color: '#888', margin: 0, lineHeight: 1.25 }}>{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Structure Analysis Summary */}
                <div style={{ background: '#16161a', border: '1px solid #27272a', borderRadius: 6, padding: '7px 10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', fontFamily: 'monospace', color: '#aaa' }}>
                  <div>• Kicks: <strong style={{ color: '#ef4444' }}>{kickOnsets.length}</strong> | Snares: <strong style={{ color: '#3b82f6' }}>{snareOnsets.length}</strong></div>
                  <div>• Drops: <strong style={{ color: '#FFE500' }}>{dropTimestamps.length}</strong> | Cuts: <strong style={{ color: '#4ade80' }}>{activeMarkers.length}</strong></div>
                </div>
              </div>
            )}

            {/* B-ROLL TAB */}
            {activeDeckTab === 'broll' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', color: '#888', fontWeight: 800 }}>DRAGGABLE CLIP POOL</span>
                  <label style={{ background: '#FFE500', color: '#000', borderRadius: 4, padding: '3px 8px', fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer' }}>
                    + Upload Images
                    <input type="file" multiple accept="image/*" onChange={handleBRollUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {brollItems.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        aspectRatio: '16/9',
                        borderRadius: 4,
                        overflow: 'hidden',
                        position: 'relative',
                        border: currentCutIndex % brollItems.length === idx ? '2px solid #FFE500' : '1px solid #27272a',
                      }}
                    >
                      <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 2, left: 4, right: 4, fontSize: '0.5rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        #{idx + 1} {item.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EXPORT NLE TAB */}
            {activeDeckTab === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', color: '#888', fontWeight: 800 }}>EXPORT NLE TIMELINE MARKERS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  <button
                    onClick={() => downloadNleFile('premiere-csv')}
                    style={{ padding: '10px', background: '#16161a', border: '1px solid #3b82f6', borderRadius: 6, color: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>Premiere Pro</span>
                      <span style={{ fontSize: '0.52rem', background: '#3b82f6', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>.CSV</span>
                    </div>
                    <span style={{ fontSize: '0.56rem', color: '#888' }}>File › Import Markers</span>
                  </button>

                  <button
                    onClick={() => downloadNleFile('davinci-edl')}
                    style={{ padding: '10px', background: '#16161a', border: '1px solid #ef4444', borderRadius: 6, color: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>DaVinci Resolve</span>
                      <span style={{ fontSize: '0.52rem', background: '#ef4444', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>.EDL</span>
                    </div>
                    <span style={{ fontSize: '0.56rem', color: '#888' }}>Timeline Markers from EDL</span>
                  </button>

                  <button
                    onClick={() => downloadNleFile('fcp-xml')}
                    style={{ padding: '10px', background: '#16161a', border: '1px solid #a855f7', borderRadius: 6, color: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>Final Cut Pro</span>
                      <span style={{ fontSize: '0.52rem', background: '#a855f7', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>.FCPXML</span>
                    </div>
                    <span style={{ fontSize: '0.56rem', color: '#888' }}>Import FCPXML Markers</span>
                  </button>

                  <button
                    onClick={() => downloadNleFile('capcut-txt')}
                    style={{ padding: '10px', background: '#16161a', border: '1px solid #10b981', borderRadius: 6, color: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>CapCut / Mobile</span>
                      <span style={{ fontSize: '0.52rem', background: '#10b981', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>.TXT</span>
                    </div>
                    <span style={{ fontSize: '0.56rem', color: '#888' }}>Timecode Cut List</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Half: Professional Multi-Track NLE Timeline ── */}
      <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', minHeight: 0, background: '#09090b' }}>
        {/* Track V1: Video Clip Blocks Track */}
        <div
          style={{
            height: 38,
            background: '#121215',
            borderBottom: '1px solid #1f1f23',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ position: 'absolute', left: 4, top: 4, zIndex: 10, fontSize: '0.52rem', fontFamily: 'monospace', color: '#FFE500', background: '#000', padding: '1px 4px', borderRadius: 2 }}>
            V1
          </div>
          {activeMarkers.map((m, idx) => {
            const leftPct = (m.time / duration) * 100;
            const widthPct = ((m.duration || 1) / duration) * 100;
            const isCur = currentCutIndex === idx;
            return (
              <div
                key={m.id}
                onClick={() => handleSeek(m.time)}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: '84%',
                  borderRadius: 3,
                  background: isCur ? '#FFE500' : idx % 2 === 0 ? '#22222a' : '#18181f',
                  border: isCur ? '1.5px solid #fff' : '1px solid #2e2e38',
                  color: isCur ? '#000' : '#fff',
                  padding: '2px 4px',
                  fontSize: '0.55rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
                title={`${m.label} (${m.duration?.toFixed(2)}s) - ${m.motionTag}`}
              >
                <span>#{idx + 1}</span>
                <span style={{ fontSize: '0.5rem', opacity: 0.8 }}>{m.duration?.toFixed(2)}s</span>
              </div>
            );
          })}
        </div>

        {/* Track A1: Audio Waveform Canvas */}
        <div className="fs-timeline" style={{ flex: 1, position: 'relative', background: '#0c0c0e', display: 'flex', minHeight: 0 }}>
          <div style={{ position: 'absolute', left: 4, top: 4, zIndex: 10, fontSize: '0.52rem', fontFamily: 'monospace', color: '#4ade80', background: '#000', padding: '1px 4px', borderRadius: 2 }}>
            A1
          </div>
          <canvas
            ref={canvasRef}
            width={1200}
            height={100}
            onClick={handleCanvasClick}
            style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
          />
        </div>

        {/* Transport Toolbar */}
        <div
          className="fs-bottom-bar"
          style={{
            height: 42,
            background: '#000000',
            borderTop: '1px solid #1f1f23',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              style={{
                width: 30,
                height: 30,
                borderRadius: 4,
                border: 'none',
                background: '#FFE500',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(255,229,0,0.3)',
              }}
              title="Spacebar (Play/Pause)"
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
            </button>

            <button
              onClick={handleStop}
              style={{
                width: 26,
                height: 26,
                borderRadius: 4,
                border: '1px solid #27272a',
                background: '#141417',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Reset (R / Home)"
            >
              <RotateCcw size={12} />
            </button>

            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: loopEnabled ? '1px solid #FFE500' : '1px solid #27272a',
                background: loopEnabled ? '#FFE500' : '#141417',
                color: loopEnabled ? '#000' : '#888',
                fontSize: '0.62rem',
                fontFamily: 'monospace',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Loop Region (I/O)"
            >
              <Repeat size={11} />
              <span>LOOP (I/O)</span>
            </button>

            <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', color: isMuted ? '#ef4444' : '#aaa', cursor: 'pointer' }}>
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              style={{ width: 60, accentColor: '#FFE500' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.64rem', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#888' }}>Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => {
                  const spd = parseFloat(e.target.value);
                  setPlaybackSpeed(spd);
                  if (audioSourceRef.current) audioSourceRef.current.playbackRate.value = spd;
                }}
                style={{ padding: '2px 4px', background: '#141417', color: '#fff', border: '1px solid #27272a', borderRadius: 3, fontFamily: 'monospace' }}
              >
                <option value="0.8">0.8x</option>
                <option value="1.0">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#888' }}>FPS:</span>
              <select
                value={frameRate}
                onChange={(e) => setFrameRate(parseFloat(e.target.value) as any)}
                style={{ padding: '2px 4px', background: '#141417', color: '#fff', border: '1px solid #27272a', borderRadius: 3, fontFamily: 'monospace' }}
              >
                <option value="24">24 fps</option>
                <option value="25">25 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
