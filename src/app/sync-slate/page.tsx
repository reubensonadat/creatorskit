'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  Layers,
  FileSpreadsheet,
  FileText,
  Settings,
  Share2,
  Film,
  Camera,
  Flame,
  Star,
  Tag,
  Palette,
  Radio,
  QrCode,
  Zap,
  Mic,
  MicOff,
  Crosshair,
  Volume1,
  RotateCw,
  HelpCircle,
  Grid,
} from 'lucide-react';

export type TakeStatus = 'GOOD' | 'HOLD' | 'NG' | 'FALSE_START' | 'DIRECTOR_PICK';

export interface TakeRecord {
  id: string;
  takeNumber: number;
  scene: string;
  roll: string;
  timecode: string;
  timestamp: string;
  status: TakeStatus;
  notes: string;
  isTailSlate?: boolean;
}

const FPS_OPTIONS = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60] as const;

const CAM_PRESETS = [
  { roll: 'A-CAM', label: 'A-CAM (Wide)', lens: '24mm f/2.8' },
  { roll: 'B-CAM', label: 'B-CAM (Tight)', lens: '85mm f/1.4' },
  { roll: 'C-CAM', label: 'C-CAM (Side)', lens: '50mm f/1.8' },
  { roll: 'TOP-CAM', label: 'Overhead', lens: '35mm f/2.0' },
  { roll: 'POV', label: 'POV / Action', lens: '16mm Ultra' },
  { roll: 'B-ROLL', label: 'B-Roll / Cutaways', lens: 'Macro 90mm' },
];

// Macbeth 10-Color Camera Calibration Swatches
const COLOR_CALIBRATION_PATCHES = [
  { name: 'Primary Red', hex: '#E53935', label: 'R' },
  { name: 'Primary Green', hex: '#43A047', label: 'G' },
  { name: 'Primary Blue', hex: '#1E88E5', label: 'B' },
  { name: 'Cyan', hex: '#00ACC1', label: 'C' },
  { name: 'Magenta', hex: '#D81B60', label: 'M' },
  { name: 'Yellow', hex: '#FDD835', label: 'Y' },
  { name: '18% Neutral Gray', hex: '#777777', label: '18% GRAY', isKey: true },
  { name: '90% White', hex: '#EEEEEE', label: '90% W' },
  { name: '5% Black', hex: '#111111', label: 'BLACK' },
  { name: 'Skin Tone Reference', hex: '#E0AC69', label: 'SKIN' },
];

export default function ProductionSyncSlatePage() {
  // Slate Metadata
  const [production, setProduction] = useState('CREATOR HERO EP.01');
  const [scene, setScene] = useState('01');
  const [take, setTake] = useState(1);
  const [roll, setRoll] = useState('A-CAM');
  const [director, setDirector] = useState('ALEX CREATOR');
  const [dp, setDp] = useState('STUDIO CAM');
  const [fps, setFps] = useState<number>(24);
  const [shutterAngle, setShutterAngle] = useState('180°');
  const [lens, setLens] = useState('35mm f/1.8');
  const [iso, setIso] = useState('800');
  const [environment, setEnvironment] = useState<'INT' | 'EXT'>('INT');
  const [dayNight, setDayNight] = useState<'DAY' | 'NIGHT'>('DAY');
  const [soundType, setSoundType] = useState<'SYNC' | 'MOS'>('SYNC');
  const [themeMode, setThemeMode] = useState<'standard' | 'high-contrast' | 'oled-night'>('standard');

  // Advanced Pro Modes
  const [isTailSlate, setIsTailSlate] = useState(false); // Upside-down end slate
  const [showFramingGuides, setShowFramingGuides] = useState(false); // Crosshairs & Safe Zones
  const [voiceSlateEnabled, setVoiceSlateEnabled] = useState(true); // Assistant Director Voice
  const [micMonitorActive, setMicMonitorActive] = useState(false);
  const [micDbLevel, setMicDbLevel] = useState(-60);

  // Tone Generator Mode
  const [syncToneType, setSyncToneType] = useState<'1khz' | '2pop' | '400hz' | 'pink'>('1khz');

  // Timecode Engine State
  const [timecodeMode, setTimecodeMode] = useState<'TOD' | 'PERSONAL'>('TOD');
  const [isRunning, setIsRunning] = useState(true);
  const [timecodeStr, setTimecodeStr] = useState('00:00:00:00');
  const [subframeMs, setSubframeMs] = useState('000');

  // Personal Custom Start Timecode State
  const [personalHours, setPersonalHours] = useState('01');
  const [personalMinutes, setPersonalMinutes] = useState('00');
  const [personalSeconds, setPersonalSeconds] = useState('00');
  const [personalFrames, setPersonalFrames] = useState('00');
  const personalStartTimestampRef = useRef<number>(Date.now());
  const personalElapsedMsRef = useRef<number>(0);

  // Clapper Interaction State
  const [isClapping, setIsClapping] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownStep, setCountdownStep] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Take Logs History
  const [takes, setTakes] = useState<TakeRecord[]>([
    {
      id: 'take-init-1',
      takeNumber: 1,
      scene: '01',
      roll: 'A-CAM',
      timecode: '14:22:10:14',
      timestamp: '2:22 PM',
      status: 'GOOD',
      notes: 'Initial framing test. Great key light exposure.',
    },
  ]);

  // Audio Context Ref & Canvas
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dialCanvasRef = useRef<HTMLCanvasElement>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize Web Audio Context
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Voice Callout Announcement
  const speakVoiceCallout = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !voiceSlateEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }, [voiceSlateEnabled]);

  // Play selectable audio tone oscillator (1kHz SMPTE, 2-Pop, 400Hz, Pink Noise)
  const playSyncBeep = useCallback((tone = syncToneType, customDuration?: number) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const duration = customDuration || (tone === '2pop' ? 0.041 : 0.075);
      const freq = tone === '400hz' ? 400 : 1000;

      if (tone === 'pink') {
        const bufferSize = ctx.sampleRate * 0.15;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.connect(ctx.destination);
        whiteNoise.start();
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.003);
      gain.gain.setValueAtTime(0.9, ctx.currentTime + duration - 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);

      // Wooden clapper mechanical transient
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(220, ctx.currentTime);
      clickOsc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.025);
      clickGain.gain.setValueAtTime(0.85, ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(ctx.currentTime);
      clickOsc.stop(ctx.currentTime + 0.035);
    } catch {}
  }, [soundEnabled, getAudioContext, syncToneType]);

  // Execute The Clapper Strike
  const triggerClap = useCallback((autoIncrement = true) => {
    setIsClapping(true);
    setFlashActive(true);

    if (isTailSlate) {
      // 3 rapid beeps for Tail Slate (industry standard)
      playSyncBeep(syncToneType, 0.03);
      setTimeout(() => playSyncBeep(syncToneType, 0.03), 90);
      setTimeout(() => playSyncBeep(syncToneType, 0.03), 180);
    } else {
      playSyncBeep();
    }

    // Log the Take
    const now = new Date();
    const formattedTimestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newRecord: TakeRecord = {
      id: `take-${Date.now()}`,
      takeNumber: take,
      scene: scene,
      roll: roll,
      timecode: timecodeStr,
      timestamp: formattedTimestamp,
      status: 'GOOD',
      notes: `${isTailSlate ? '[TAIL SLATE] ' : ''}Roll ${roll} · Scene ${scene} · ${fps}fps`,
      isTailSlate,
    };

    setTakes((prev) => [newRecord, ...prev]);

    setTimeout(() => {
      setFlashActive(false);
    }, 65);

    setTimeout(() => {
      setIsClapping(false);
      if (autoIncrement) {
        setTake((prev) => prev + 1);
      }
    }, 180);
  }, [take, scene, roll, timecodeStr, fps, isTailSlate, syncToneType, playSyncBeep]);

  // 3-2-1 Visual Countdown Head-Leader with Voice Callout
  const startCountdown = useCallback(() => {
    if (countdownActive) return;
    setCountdownActive(true);
    setCountdownStep(3);

    // Voice announcement
    if (voiceSlateEnabled) {
      speakVoiceCallout(`Scene ${scene}, Take ${take}, Mark!`);
    } else {
      playSyncBeep('1khz');
    }

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownStep(count);
        playSyncBeep('1khz');
      } else {
        clearInterval(interval);
        setCountdownStep(null);
        setCountdownActive(false);
        triggerClap(true);
      }
    }, 1000);
  }, [countdownActive, scene, take, voiceSlateEnabled, speakVoiceCallout, playSyncBeep, triggerClap]);

  // Toggle Live Microphone Level Monitor
  const toggleMicMonitor = async () => {
    if (micMonitorActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      setMicMonitorActive(false);
      setMicDbLevel(-60);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const ctx = getAudioContext();
      if (!ctx) return;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      setMicMonitorActive(true);

      const buffer = new Float32Array(analyser.fftSize);
      const updateLevel = () => {
        if (!analyserRef.current || !micStreamRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSquares += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        const db = Math.max(-60, Math.min(0, 20 * Math.log10(rms || 0.0001)));
        setMicDbLevel(Math.round(db));
        requestAnimationFrame(updateLevel);
      };
      requestAnimationFrame(updateLevel);
    } catch {
      alert('Microphone access denied or unavailable.');
    }
  };

  // Draw Strobe Sync Rotating Dial (Sub-frame alignment detector)
  useEffect(() => {
    let animId: number;
    const drawDial = () => {
      const canvas = dialCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 96;
      canvas.width = size * 2;
      canvas.height = size * 2;
      const center = size;
      const radius = size * 0.82;

      ctx.clearRect(0, 0, size * 2, size * 2);

      // Dark bezel
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFE500';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Frame tick marks
      const tickCount = fps;
      for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2 - Math.PI / 2;
        const x1 = center + Math.cos(angle) * (radius - 6);
        const y1 = center + Math.sin(angle) * (radius - 6);
        const x2 = center + Math.cos(angle) * radius;
        const y2 = center + Math.sin(angle) * radius;

        ctx.strokeStyle = i % 6 === 0 ? '#FFE500' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = i % 6 === 0 ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Rotating Second Hand
      const now = new Date();
      const ms = now.getMilliseconds();
      const handAngle = (ms / 1000) * Math.PI * 2 - Math.PI / 2;

      ctx.strokeStyle = isClapping ? '#ffffff' : '#FFE500';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + Math.cos(handAngle) * (radius - 12), center + Math.sin(handAngle) * (radius - 12));
      ctx.stroke();

      // Center Hub
      ctx.fillStyle = '#FFE500';
      ctx.beginPath();
      ctx.arc(center, center, 5, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(drawDial);
    };

    animId = requestAnimationFrame(drawDial);
    return () => cancelAnimationFrame(animId);
  }, [fps, isClapping]);

  // Master Timecode Generator Loop (SMPTE Frame-Accurate)
  useEffect(() => {
    let animId: number;

    const updateTimecode = () => {
      if (!isRunning) {
        animId = requestAnimationFrame(updateTimecode);
        return; // Freeze timecode completely on pause
      }

      const now = new Date();

      if (timecodeMode === 'TOD') {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = now.getMilliseconds();

        const frameNumber = Math.floor((ms / 1000) * fps);
        const frames = String(frameNumber).padStart(2, '0');

        setTimecodeStr(`${hours}:${minutes}:${seconds}:${frames}`);
        setSubframeMs(String(ms).padStart(3, '0'));
      } else {
        const elapsed = Date.now() - personalStartTimestampRef.current + personalElapsedMsRef.current;
        const baseSeconds =
          parseInt(personalHours || '0', 10) * 3600 +
          parseInt(personalMinutes || '0', 10) * 60 +
          parseInt(personalSeconds || '0', 10) +
          parseInt(personalFrames || '0', 10) / fps;

        const currentTotalSec = baseSeconds + elapsed / 1000;
        const totalSecInt = Math.floor(currentTotalSec);
        const fractionSec = currentTotalSec - totalSecInt;

        const h = String(Math.floor((totalSecInt / 3600) % 24)).padStart(2, '0');
        const m = String(Math.floor((totalSecInt % 3600) / 60)).padStart(2, '0');
        const s = String(totalSecInt % 60).padStart(2, '0');
        const f = String(Math.floor(fractionSec * fps)).padStart(2, '0');
        const ms = Math.floor(fractionSec * 1000);

        setTimecodeStr(`${h}:${m}:${s}:${f}`);
        setSubframeMs(String(ms).padStart(3, '0'));
      }

      animId = requestAnimationFrame(updateTimecode);
    };

    animId = requestAnimationFrame(updateTimecode);
    return () => cancelAnimationFrame(animId);
  }, [timecodeMode, isRunning, fps, personalHours, personalMinutes, personalSeconds, personalFrames]);

  const handleResetPersonalTimecode = () => {
    personalStartTimestampRef.current = Date.now();
    personalElapsedMsRef.current = 0;
  };

  const handleSetPresetPersonalTime = (h: string, m: string, s: string, f: string) => {
    setPersonalHours(h);
    setPersonalMinutes(m);
    setPersonalSeconds(s);
    setPersonalFrames(f);
    personalStartTimestampRef.current = Date.now();
    personalElapsedMsRef.current = 0;
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        triggerClap(true);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        startCountdown();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        setIsTailSlate((prev) => !prev);
      } else if (e.code === 'KeyG') {
        // Mark latest take as GOOD
        if (takes.length > 0) {
          const updated = [...takes];
          updated[0].status = 'GOOD';
          setTakes(updated);
        }
      } else if (e.code === 'KeyN') {
        // Mark latest take as NG
        if (takes.length > 0) {
          const updated = [...takes];
          updated[0].status = 'NG';
          setTakes(updated);
        }
      } else if (e.code === 'Escape') {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerClap, startCountdown, takes]);

  // Export DaVinci / Premiere EDL Timeline Markers
  const exportEDL = () => {
    let edlContent = `TITLE: ${production} SHOT LOG\nFCM: NON-DROP FRAME\n\n`;
    takes.forEach((t, i) => {
      const eventNum = String(i + 1).padStart(3, '0');
      edlContent += `${eventNum}  AX       V     C        ${t.timecode} ${t.timecode} ${t.timecode} ${t.timecode}\n`;
      edlContent += `* FROM CLIP NAME: ${production}_SCENE_${t.scene}_TAKE_${t.takeNumber}\n`;
      edlContent += `* COMMENT: [${t.status}] ${t.notes}\n\n`;
    });

    const blob = new Blob([edlContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DaVinci_Markers_${production.replace(/\s+/g, '_')}_Scene_${scene}.edl`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Take #', 'Scene', 'Roll', 'Timecode', 'Timestamp', 'Status', 'Tail Slate', 'Notes', 'Production', 'Director', 'DP', 'FPS'];
    const rows = takes.map((t) => [
      t.takeNumber,
      `"${t.scene}"`,
      `"${t.roll}"`,
      `"${t.timecode}"`,
      `"${t.timestamp}"`,
      `"${t.status}"`,
      t.isTailSlate ? 'YES' : 'NO',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      `"${production}"`,
      `"${director}"`,
      `"${dp}"`,
      fps,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Production_Shot_Log_${production.replace(/\s+/g, '_')}_Scene_${scene}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isNight = themeMode === 'oled-night';
  const isHighContrast = themeMode === 'high-contrast';

  return (
    <div
      className="tool-page-padding"
      style={{
        minHeight: '100vh',
        background: isNight ? '#09090b' : isHighContrast ? '#000000' : '#f4f4f5',
        color: isNight ? '#f4f4f5' : isHighContrast ? '#ffffff' : '#000000',
        padding: isFullscreen ? 0 : '20px 24px 80px',
        position: 'relative',
        transition: 'background 0.2s ease',
        overflow: 'hidden',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Optical White Flash Overlay */}
      {flashActive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#ffffff',
            zIndex: 9999,
            pointerEvents: 'none',
            opacity: 0.98,
          }}
        />
      )}

      {/* Top Header Section */}
      {!isFullscreen && (
        <div style={{ maxWidth: 1380, margin: '0 auto 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Row 1: Badges & Title */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  background: '#FFE500',
                  color: '#000',
                  padding: '3px 8px',
                  border: '2px solid #000',
                  borderRadius: 4,
                }}
              >
                HOLLYWOOD PRODUCTION SLATE
              </span>
              <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 800, color: isNight ? '#a1a1aa' : '#666' }}>
                A/V OPTICAL SYNC · 18% GRAY CALIBRATION · NLE TIMELINE LOGS
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: isNight ? '#fff' : '#000', margin: 0, textTransform: 'uppercase' }}>
              Multi-Cam Production Slate
            </h1>
          </div>

          {/* Row 2: Quick Actions & Calibration Presets (Dedicated Row Directly Underneath) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Pause / Resume Timecode Button */}
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="brutalist-button"
                style={{
                  fontSize: '0.72rem',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isRunning ? '#ffffff' : '#fef08a',
                  color: isRunning ? '#000000' : '#854d0e',
                  fontWeight: 900,
                  boxShadow: '2px 2px 0 #000',
                }}
                title={isRunning ? 'Pause Timecode (Lifts clapper up)' : 'Resume Timecode'}
              >
                {isRunning ? <Pause size={14} /> : <Play size={14} />}
                {isRunning ? 'Pause Timecode' : 'Resume Run'}
              </button>

              {/* Mic Monitor Button */}
              <button
                onClick={toggleMicMonitor}
                className="brutalist-button"
                style={{
                  fontSize: '0.72rem',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: micMonitorActive ? '#dcfce7' : '#fff',
                }}
              >
                {micMonitorActive ? <Mic size={14} style={{ color: '#15803d' }} /> : <MicOff size={14} />}
                {micMonitorActive ? `Mic: ${micDbLevel}dB` : 'Live VU Meter'}
              </button>

              {/* Voice Slate Toggle */}
              <button
                onClick={() => setVoiceSlateEnabled(!voiceSlateEnabled)}
                className="brutalist-button"
                style={{
                  fontSize: '0.72rem',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: voiceSlateEnabled ? '#FFE500' : '#fff',
                }}
                title="Speak scene and take before clapping"
              >
                <Volume1 size={14} />
                Voice Callout: {voiceSlateEnabled ? 'ON' : 'OFF'}
              </button>

              {/* Framing Guides Toggle */}
              <button
                onClick={() => setShowFramingGuides(!showFramingGuides)}
                className="brutalist-button"
                style={{
                  fontSize: '0.72rem',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: showFramingGuides ? '#FFE500' : '#fff',
                }}
                title="Toggle framing crosshair & safe zone grid"
              >
                <Crosshair size={14} />
                Guides
              </button>

              {/* Tail Slate Toggle */}
              <button
                onClick={() => setIsTailSlate(!isTailSlate)}
                className="brutalist-button"
                style={{
                  fontSize: '0.72rem',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isTailSlate ? '#fee2e2' : '#fff',
                  color: isTailSlate ? '#dc2626' : '#000',
                }}
                title="End-slate mode (upside down clapper)"
              >
                <RotateCw size={14} />
                {isTailSlate ? 'TAIL SLATE (ON)' : 'Head Slate'}
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(true)}
                className="brutalist-button brutalist-button-primary"
                style={{ fontSize: '0.74rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Maximize2 size={14} />
                FULLSCREEN (F)
              </button>
            </div>
          </div>
      )}

      {/* Main Workspace Grid */}
      <div
        className="tool-inner-grid"
        style={{
          maxWidth: isFullscreen ? '100vw' : 1380,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isFullscreen ? '1fr' : 'minmax(0, 1.48fr) minmax(360px, 440px)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: The Physical Clapper Slate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Camera Rig Switcher (Elevated z-index to stay in front of moving clapper arm) */}
          {!isFullscreen && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                position: 'relative',
                zIndex: 60,
                background: isNight ? '#09090b' : '#f4f4f5',
                paddingBottom: 4,
              }}
            >
              <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>
                Camera Rigs:
              </span>
              {CAM_PRESETS.map((cam) => {
                const isActive = roll === cam.roll;
                return (
                  <button
                    key={cam.roll}
                    onClick={() => {
                      setRoll(cam.roll);
                      setLens(cam.lens);
                    }}
                    style={{
                      padding: '4px 10px',
                      border: '1.5px solid #000',
                      borderRadius: 4,
                      background: isActive ? '#FFE500' : '#ffffff',
                      color: '#000000',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.66rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                      transition: 'all 0.12s',
                    }}
                  >
                    {cam.label}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className="brutalist-card"
            style={{
              background: isNight ? '#121215' : '#ffffff',
              border: '3px solid #000000',
              boxShadow: isFullscreen ? 'none' : '6px 6px 0px #000000',
              padding: isFullscreen ? 28 : 20,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              minHeight: isFullscreen ? '100vh' : 'auto',
              transform: isTailSlate ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Fullscreen Exit */}
            {isFullscreen && (
              <button
                onClick={() => setIsFullscreen(false)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 30,
                  padding: '6px 12px',
                  background: '#000',
                  color: '#fff',
                  border: '2px solid #fff',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                EXIT (ESC)
              </button>
            )}

            {/* Framing Crosshair Overlay */}
            {showFramingGuides && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(239, 68, 68, 0.4)' }} />
                <div style={{ position: 'absolute', height: '100%', width: 1, background: 'rgba(239, 68, 68, 0.4)' }} />
                <div style={{ width: 40, height: 40, border: '2px solid #ef4444', borderRadius: '50%' }} />
              </div>
            )}

            {/* CLAPPER ARM (Contained cleanly inside the slate with dedicated headroom) */}
            <div
              onClick={() => triggerClap(true)}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                position: 'relative',
                paddingTop: 38,
                marginBottom: 6,
              }}
              title="Click or press SPACEBAR to strike clapper"
            >
              {/* Mechanical Hinge Pin */}
              <div
                style={{
                  position: 'absolute',
                  left: -4,
                  top: 66,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#FFE500',
                  border: '3px solid #000',
                  zIndex: 20,
                  boxShadow: '1px 1px 0 #000',
                }}
              />

              {/* Clapper Top Moving Arm (Controlled -8.5deg angle contained cleanly inside the slate) */}
              <div
                style={{
                  height: 38,
                  background: '#000',
                  border: '3px solid #000',
                  display: 'flex',
                  overflow: 'hidden',
                  transformOrigin: '0% 100%',
                  transform: (!isRunning || isClapping) ? 'rotate(-8.5deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: (!isRunning || isClapping) ? '0 6px 12px rgba(0,0,0,0.25)' : 'none',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '100%',
                      background: i % 2 === 0 ? '#ffffff' : '#000000',
                      transform: 'skewX(-28deg)',
                      transformOrigin: 'top left',
                    }}
                  />
                ))}
              </div>

              {/* Clapper Bottom Fixed Base */}
              <div
                style={{
                  height: 36,
                  background: '#000',
                  border: '3px solid #000',
                  display: 'flex',
                  overflow: 'hidden',
                  marginTop: -3,
                }}
              >
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '100%',
                      background: i % 2 === 0 ? '#ffffff' : '#000000',
                      transform: 'skewX(28deg)',
                      transformOrigin: 'top left',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* TIMECODE DISPLAY & ROTATING STROBE SYNC DIAL */}
            <div
              style={{
                background: '#09090b',
                border: '3px solid #000',
                padding: '16px 20px',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                color: '#fff',
              }}
            >
              {/* Top Controls Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid #1f1f23', paddingBottom: 10 }}>
                {/* Timecode Mode Switcher */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setTimecodeMode('TOD')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 4,
                      background: timecodeMode === 'TOD' ? '#FFE500' : '#141417',
                      color: timecodeMode === 'TOD' ? '#000000' : '#888888',
                      border: '1px solid ' + (timecodeMode === 'TOD' ? '#FFE500' : '#27272a'),
                      fontFamily: 'monospace',
                      fontSize: '0.64rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Clock size={12} />
                    TIME OF DAY (TOD)
                  </button>

                  <button
                    onClick={() => {
                      setTimecodeMode('PERSONAL');
                      handleResetPersonalTimecode();
                    }}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 4,
                      background: timecodeMode === 'PERSONAL' ? '#FFE500' : '#141417',
                      color: timecodeMode === 'PERSONAL' ? '#000000' : '#888888',
                      border: '1px solid ' + (timecodeMode === 'PERSONAL' ? '#FFE500' : '#27272a'),
                      fontFamily: 'monospace',
                      fontSize: '0.64rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Timer size={12} />
                    PERSONAL / CUSTOM TIME
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.66rem', fontFamily: 'monospace', color: '#888', fontWeight: 800 }}>
                  <span style={{ color: '#FFE500' }}>{fps} FPS</span>
                  <span>·</span>
                  <span>SUB-FRAME: {subframeMs} MS</span>
                </div>
              </div>

              {/* Personal Start Config Bar (Visible when in Personal Mode) */}
              {timecodeMode === 'PERSONAL' && (
                <div
                  style={{
                    background: '#141417',
                    border: '1px solid #27272a',
                    borderRadius: 4,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#FFE500', fontWeight: 900 }}>
                      START TIME:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'monospace', fontSize: '0.72rem', color: '#fff' }}>
                      <input
                        type="text"
                        maxLength={2}
                        value={personalHours}
                        onChange={(e) => {
                          setPersonalHours(e.target.value);
                          handleResetPersonalTimecode();
                        }}
                        style={{ width: 28, background: '#000', border: '1px solid #3f3f46', color: '#FFE500', textAlign: 'center', borderRadius: 2, padding: '2px 0', fontWeight: 900 }}
                      />
                      <span>:</span>
                      <input
                        type="text"
                        maxLength={2}
                        value={personalMinutes}
                        onChange={(e) => {
                          setPersonalMinutes(e.target.value);
                          handleResetPersonalTimecode();
                        }}
                        style={{ width: 28, background: '#000', border: '1px solid #3f3f46', color: '#FFE500', textAlign: 'center', borderRadius: 2, padding: '2px 0', fontWeight: 900 }}
                      />
                      <span>:</span>
                      <input
                        type="text"
                        maxLength={2}
                        value={personalSeconds}
                        onChange={(e) => {
                          setPersonalSeconds(e.target.value);
                          handleResetPersonalTimecode();
                        }}
                        style={{ width: 28, background: '#000', border: '1px solid #3f3f46', color: '#FFE500', textAlign: 'center', borderRadius: 2, padding: '2px 0', fontWeight: 900 }}
                      />
                      <span>:</span>
                      <input
                        type="text"
                        maxLength={2}
                        value={personalFrames}
                        onChange={(e) => {
                          setPersonalFrames(e.target.value);
                          handleResetPersonalTimecode();
                        }}
                        style={{ width: 28, background: '#000', border: '1px solid #3f3f46', color: '#FFE500', textAlign: 'center', borderRadius: 2, padding: '2px 0', fontWeight: 900 }}
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => handleSetPresetPersonalTime('00', '00', '00', '00')}
                      style={{ padding: '3px 7px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 3, color: '#fff', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, cursor: 'pointer' }}
                    >
                      00:00:00:00 (Zero)
                    </button>
                    <button
                      onClick={() => handleSetPresetPersonalTime('01', '00', '00', '00')}
                      style={{ padding: '3px 7px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 3, color: '#FFE500', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, cursor: 'pointer' }}
                    >
                      01:00:00:00 (Reel 1)
                    </button>
                    <button
                      onClick={() => handleSetPresetPersonalTime('10', '00', '00', '00')}
                      style={{ padding: '3px 7px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 3, color: '#fff', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, cursor: 'pointer' }}
                    >
                      10:00:00:00 (Reel 10)
                    </button>

                    <button
                      onClick={handleResetPersonalTimecode}
                      style={{ padding: '3px 7px', background: '#FFE500', border: 'none', borderRadius: 3, color: '#000', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                      title="Reset timecode to custom start"
                    >
                      <RotateCcw size={10} />
                      RESET
                    </button>

                    <button
                      onClick={() => setIsRunning(!isRunning)}
                      style={{ padding: '3px 7px', background: isRunning ? '#ef4444' : '#22c55e', border: 'none', borderRadius: 3, color: '#fff', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      {isRunning ? <Pause size={10} /> : <Play size={10} />}
                      {isRunning ? 'PAUSE' : 'RUN'}
                    </button>
                  </div>
                </div>
              )}

              {/* Main Digits Display & Rotating Dial */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{
                      fontSize: isFullscreen ? '4.8rem' : '3.6rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '0.04em',
                      color: isClapping ? '#FFE500' : '#ffffff',
                      lineHeight: 1,
                    }}
                  >
                    {timecodeStr}
                  </div>

                {/* Live Peak VU Meter */}
                {micMonitorActive && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#888' }}>PEAK:</span>
                    <div style={{ flex: 1, height: 6, background: '#27272a', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, ((micDbLevel + 60) / 60) * 100))}%`,
                          background: micDbLevel > -6 ? '#ef4444' : micDbLevel > -18 ? '#eab308' : '#22c55e',
                          transition: 'width 0.05s linear',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: micDbLevel > -6 ? '#ef4444' : '#22c55e', fontWeight: 900 }}>
                      {micDbLevel} dB
                    </span>
                  </div>
                )}
              </div>

              {/* Rotating Lip-Sync Strobe Sync Dial */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <canvas ref={dialCanvasRef} style={{ width: 96, height: 96 }} />
                <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, color: '#FFE500', textTransform: 'uppercase' }}>
                  LIP-SYNC DIAL
                </span>
              </div>
            </div>
          </div>

            {/* SLATE PRODUCTION METADATA GRID */}
            <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #000', borderRadius: 4, overflow: 'hidden' }}>
              {/* Row 1: Production Name */}
              <div style={{ background: '#000', color: '#fff', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 800 }}>PRODUCTION:</span>
                <input
                  type="text"
                  value={production}
                  onChange={(e) => setProduction(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#FFE500', fontWeight: 900, fontSize: '0.92rem', fontFamily: 'monospace', textAlign: 'right', outline: 'none' }}
                />
              </div>

              {/* Row 2: Scene / Take / Roll */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', background: '#fff', borderTop: '2px solid #000' }}>
                <div style={{ padding: '10px 14px', borderRight: '2px solid #000', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block' }}>SCENE</span>
                  <input
                    type="text"
                    value={scene}
                    onChange={(e) => setScene(e.target.value)}
                    style={{ width: '100%', textAlign: 'center', fontSize: '1.8rem', fontWeight: 900, border: 'none', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>

                <div style={{ padding: '10px 14px', borderRight: '2px solid #000', background: '#FFE500', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', display: 'block' }}>TAKE</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <button onClick={() => setTake((t) => Math.max(1, t - 1))} style={{ width: 26, height: 26, border: '2px solid #000', background: '#fff', fontWeight: 900, cursor: 'pointer' }}>-</button>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace' }}>{take}</span>
                    <button onClick={() => setTake((t) => t + 1)} style={{ width: 26, height: 26, border: '2px solid #000', background: '#fff', fontWeight: 900, cursor: 'pointer' }}>+</button>
                  </div>
                </div>

                <div style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block' }}>ROLL / CAM</span>
                  <input
                    type="text"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    style={{ width: '100%', textAlign: 'center', fontSize: '1.8rem', fontWeight: 900, border: 'none', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Row 3: Director / DP / Lens */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#fff', borderTop: '2px solid #000', fontSize: '0.78rem' }}>
                <div style={{ padding: '8px 12px', borderRight: '2px solid #000' }}>
                  <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block' }}>DIRECTOR:</span>
                  <input type="text" value={director} onChange={(e) => setDirector(e.target.value)} style={{ width: '100%', fontWeight: 800, border: 'none', outline: 'none', fontSize: '0.8rem' }} />
                </div>
                <div style={{ padding: '8px 12px', borderRight: '2px solid #000' }}>
                  <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block' }}>CAMERA / DP:</span>
                  <input type="text" value={dp} onChange={(e) => setDp(e.target.value)} style={{ width: '100%', fontWeight: 800, border: 'none', outline: 'none', fontSize: '0.8rem' }} />
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block' }}>LENS & FPS:</span>
                  <span style={{ fontWeight: 900, fontFamily: 'monospace' }}>{lens} · {fps}fps</span>
                </div>
              </div>
            </div>

            {/* MACBETH 10-COLOR CALIBRATION & 18% MIDDLE GRAY STRIP */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#666' }}>
                  🎯 CAMERA WHITE BALANCE & COLOR CALIBRATION STRIP
                </span>
                <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#888' }}>
                  DAVINCI RESOLVE / PREMIERE EYE-DROPPER COMPATIBLE
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', border: '2px solid #000', borderRadius: 4, overflow: 'hidden' }}>
                {COLOR_CALIBRATION_PATCHES.map((patch) => (
                  <div
                    key={patch.name}
                    style={{
                      background: patch.hex,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight: '1px solid rgba(0,0,0,0.2)',
                    }}
                    title={`${patch.name} (${patch.hex})`}
                  >
                    <span
                      style={{
                        fontSize: '0.52rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: patch.hex === '#111111' || patch.hex === '#777777' || patch.hex === '#E53935' ? '#ffffff' : '#000000',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      }}
                    >
                      {patch.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* STRIKE CLAPPER BIG ACTIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
              <button
                onClick={() => triggerClap(true)}
                className="brutalist-button brutalist-button-primary"
                style={{
                  padding: '16px 20px',
                  fontSize: '1rem',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '4px 4px 0 #000',
                }}
              >
                <Zap size={20} />
                STRIKE CLAPPER (SPACEBAR)
              </button>

              <button
                onClick={startCountdown}
                disabled={countdownActive}
                className="brutalist-button"
                style={{
                  padding: '16px 20px',
                  fontSize: '0.9rem',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '4px 4px 0 #000',
                  background: '#ffffff',
                }}
              >
                <Clock size={18} />
                {countdownActive ? `READY: ${countdownStep}` : '3-2-1 HEAD LEADER'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Director Take Log & Markers Export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Take Logs Header Card */}
          <div className="brutalist-card" style={{ padding: 16, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 900, fontSize: '0.88rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  DIRECTOR TAKE LOG
                </span>
                <span style={{ fontSize: '0.68rem', color: '#666', fontFamily: 'monospace', display: 'block' }}>
                  {takes.length} Takes Recorded
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={exportEDL}
                  className="brutalist-button brutalist-button-primary"
                  style={{ fontSize: '0.7rem', padding: '5px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Export DaVinci Resolve Timeline Markers (.EDL)"
                >
                  <FileText size={13} />
                  DaVinci EDL
                </button>
                <button
                  onClick={exportCSV}
                  className="brutalist-button"
                  style={{ fontSize: '0.7rem', padding: '5px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Export CSV Shot Log"
                >
                  <FileSpreadsheet size={13} />
                  CSV Log
                </button>
              </div>
            </div>

            {/* Take Status Quick Tally */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900 }}>
              <div style={{ padding: '6px', background: '#dcfce7', border: '1px solid #000', borderRadius: 3, textAlign: 'center' }}>
                GOOD: {takes.filter((t) => t.status === 'GOOD').length}
              </div>
              <div style={{ padding: '6px', background: '#fef08a', border: '1px solid #000', borderRadius: 3, textAlign: 'center' }}>
                HOLD: {takes.filter((t) => t.status === 'HOLD').length}
              </div>
              <div style={{ padding: '6px', background: '#fee2e2', border: '1px solid #000', borderRadius: 3, textAlign: 'center' }}>
                NG: {takes.filter((t) => t.status === 'NG').length}
              </div>
            </div>

            {/* List of Logged Takes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 440, overflowY: 'auto' }}>
              {takes.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: 10,
                    border: '1.5px solid #000',
                    borderRadius: 4,
                    background: t.status === 'GOOD' ? '#f0fdf4' : t.status === 'NG' ? '#fef2f2' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 900, fontSize: '0.78rem', fontFamily: 'monospace', background: '#000', color: '#fff', padding: '1px 5px', borderRadius: 2 }}>
                        TAKE {t.takeNumber}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800 }}>
                        SCENE {t.scene} · {t.roll}
                      </span>
                      {t.isTailSlate && (
                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, background: '#fee2e2', color: '#dc2626', padding: '1px 4px', border: '1px solid #dc2626', borderRadius: 2 }}>
                          TAIL
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#666' }}>
                      {t.timecode}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={t.notes}
                    onChange={(e) => {
                      const updated = takes.map((item) => (item.id === t.id ? { ...item, notes: e.target.value } : item));
                      setTakes(updated);
                    }}
                    placeholder="Add director / DP notes..."
                    style={{ fontSize: '0.74rem', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, outline: 'none' }}
                  />

                  {/* Status Toggle Buttons */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['GOOD', 'HOLD', 'NG'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          const updated = takes.map((item) => (item.id === t.id ? { ...item, status: st } : item));
                          setTakes(updated);
                        }}
                        style={{
                          flex: 1,
                          padding: '2px 4px',
                          fontSize: '0.6rem',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          border: '1px solid #000',
                          borderRadius: 2,
                          background: t.status === st ? (st === 'GOOD' ? '#22c55e' : st === 'NG' ? '#ef4444' : '#eab308') : '#fff',
                          color: t.status === st ? '#fff' : '#000',
                          cursor: 'pointer',
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Keyboard Shortcuts Reference */}
          <div className="brutalist-card" style={{ padding: 12, background: '#f4f4f5', borderRadius: 4, fontSize: '0.68rem', fontFamily: 'monospace' }}>
            <span style={{ fontWeight: 900, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              ⌨️ Set Hotkeys
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, color: '#444' }}>
              <div><strong style={{ color: '#000' }}>[SPACE]</strong> Strike Clapper</div>
              <div><strong style={{ color: '#000' }}>[C]</strong> 3-2-1 Countdown</div>
              <div><strong style={{ color: '#000' }}>[T]</strong> Tail Slate Mode</div>
              <div><strong style={{ color: '#000' }}>[F]</strong> Fullscreen</div>
              <div><strong style={{ color: '#000' }}>[G]</strong> Mark Good</div>
              <div><strong style={{ color: '#000' }}>[N]</strong> Mark No-Good</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
