'use client';

// Web Audio API Synthesizer Engine for Botanical & Keepsake Ambience
// Synthesizes 10 lush, organic soundscapes entirely in the browser with 0 external network dependencies

export interface SoundPreset {
  id: string;
  name: string;
  label: string;
  trackNumber: string;
  description: string;
}

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'music-box',
    name: 'Music Box Melody',
    label: 'Music Box',
    trackNumber: '01',
    description: 'Nostalgic, sparkling music box bells playing a romantic melody',
  },
  {
    id: 'gentle-piano',
    name: 'Gentle Piano Romance',
    label: 'Gentle Piano',
    trackNumber: '02',
    description: 'Soft, heartfelt romantic piano chords and warm harmonies',
  },
  {
    id: 'spring-garden',
    name: 'Spring Garden & Birds',
    label: 'Spring Garden',
    trackNumber: '03',
    description: 'Serene morning breeze with sweet chirping garden birds',
  },
  {
    id: 'harp-melody',
    name: 'Angelic Harp Arpeggio',
    label: 'Angelic Harp',
    trackNumber: '04',
    description: 'Celestial, flowing harp strings and shimmers',
  },
  {
    id: 'acoustic-guitar',
    name: 'Acoustic Serenade',
    label: 'Acoustic Guitar',
    trackNumber: '05',
    description: 'Warm, intimate fingerpicked nylon guitar chords',
  },
  {
    id: 'wind-chimes',
    name: 'Celestial Wind Chimes',
    label: 'Wind Chimes',
    trackNumber: '06',
    description: 'Peaceful, resonant wind chimes tingling in the breeze',
  },
  {
    id: 'rain-window',
    name: 'Cozy Rain & Droplets',
    label: 'Cozy Rain',
    trackNumber: '07',
    description: 'Gentle, soothing rainfall with cozy window water droplet plinks',
  },
  {
    id: 'lofi-chill',
    name: 'Lo-Fi Vinyl Chords',
    label: 'Lo-Fi Chill',
    trackNumber: '08',
    description: 'Warm electric piano jazz chords with vintage vinyl crackle',
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves & Breeze',
    label: 'Ocean Waves',
    trackNumber: '09',
    description: 'Rhythmic, calming sea swells and peaceful coastal air',
  },
  {
    id: 'starlight-celesta',
    name: 'Starlight Celesta',
    label: 'Starlight',
    trackNumber: '10',
    description: 'Dreamy crystal celesta bells drifting under peaceful stars',
  },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentLoopTimer: any = null;
  private currentActiveNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private currentPresetId: string | null = null;

  private initCtx() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const targetGain = muted ? 0 : 0.7;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public getCurrentPreset() {
    return this.currentPresetId;
  }

  public stop() {
    if (this.currentLoopTimer) {
      clearInterval(this.currentLoopTimer);
      clearTimeout(this.currentLoopTimer);
      this.currentLoopTimer = null;
    }
    this.currentActiveNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    });
    this.currentActiveNodes = [];
    this.currentPresetId = null;
  }

  public play(presetId: string): boolean {
    this.stop();
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return false;

    this.currentPresetId = presetId;

    switch (presetId) {
      case 'music-box':
        this.startMusicBox(ctx);
        break;
      case 'gentle-piano':
        this.startGentlePiano(ctx);
        break;
      case 'spring-garden':
        this.startSpringGarden(ctx);
        break;
      case 'harp-melody':
        this.startHarpMelody(ctx);
        break;
      case 'acoustic-guitar':
        this.startAcousticGuitar(ctx);
        break;
      case 'wind-chimes':
        this.startWindChimes(ctx);
        break;
      case 'rain-window':
        this.startRainWindow(ctx);
        break;
      case 'lofi-chill':
        this.startLofiChill(ctx);
        break;
      case 'ocean-waves':
        this.startOceanWaves(ctx);
        break;
      case 'starlight-celesta':
        this.startStarlightCelesta(ctx);
        break;
      default:
        return false;
    }
    return true;
  }

  // 1. MUSIC BOX: Pure crystalline sine tones with gentle decay & harmonic shimmer
  private startMusicBox(ctx: AudioContext) {
    const melody = [
      { note: 659.25, time: 0 },    // E5
      { note: 783.99, time: 350 },  // G5
      { note: 987.77, time: 700 },  // B5
      { note: 1046.5, time: 1050 }, // C6
      { note: 880.0, time: 1400 },  // A5
      { note: 1046.5, time: 1750 }, // C6
      { note: 1174.66, time: 2100 },// D6
      { note: 1318.51, time: 2450 },// E6
      { note: 987.77, time: 2800 }, // B5
      { note: 880.0, time: 3150 },  // A5
      { note: 783.99, time: 3500 }, // G5
      { note: 659.25, time: 3850 }, // E5
      { note: 587.33, time: 4200 }, // D5
      { note: 523.25, time: 4550 }, // C5
      { note: 659.25, time: 4900 }, // E5
      { note: 783.99, time: 5250 }, // G5
    ];
    const loopDuration = 5600;

    const playCycle = () => {
      melody.forEach(({ note, time }) => {
        setTimeout(() => {
          if (this.currentPresetId !== 'music-box') return;
          this.triggerBell(ctx, note, 0.28, 1.6);
          if (Math.random() > 0.4) {
            this.triggerBell(ctx, note * 2, 0.08, 0.8);
          }
        }, time);
      });
    };

    playCycle();
    this.currentLoopTimer = setInterval(playCycle, loopDuration);
  }

  private triggerBell(ctx: AudioContext, freq: number, gain: number, duration: number) {
    if (this.isMuted || !this.masterGain) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // 2. GENTLE PIANO: Filtered warm chords with soft pedal sustain
  private startGentlePiano(ctx: AudioContext) {
    const chords = [
      [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
      [220.0, 261.63, 329.63, 392.0, 493.88],  // Am9
      [174.61, 261.63, 329.63, 349.23, 440.0], // Fmaj7
      [196.0, 293.66, 392.0, 440.0, 523.25],   // Gsus
    ];
    let chordIdx = 0;

    const playNextChord = () => {
      if (this.currentPresetId !== 'gentle-piano') return;
      const notes = chords[chordIdx % chords.length];
      chordIdx++;

      notes.forEach((freq, i) => {
        setTimeout(() => {
          if (this.currentPresetId !== 'gentle-piano') return;
          this.triggerPianoKey(ctx, freq, 0.22 - i * 0.02, 3.2);
        }, i * 160);
      });
    };

    playNextChord();
    this.currentLoopTimer = setInterval(playNextChord, 3800);
  }

  private triggerPianoKey(ctx: AudioContext, freq: number, gainVal: number, duration: number) {
    if (this.isMuted || !this.masterGain) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + duration);

    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // 3. SPRING GARDEN: Filtered warm breeze + sweet bird chirps
  private startSpringGarden(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.08;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const breezeFilter = ctx.createBiquadFilter();
    breezeFilter.type = 'bandpass';
    breezeFilter.frequency.setValueAtTime(450, ctx.currentTime);
    breezeFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    const breezeGain = ctx.createGain();
    breezeGain.gain.setValueAtTime(0.12, ctx.currentTime);

    whiteNoise.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    if (this.masterGain) breezeGain.connect(this.masterGain);
    whiteNoise.start();

    this.currentActiveNodes.push(whiteNoise);

    const triggerBirdPhrase = () => {
      if (this.currentPresetId !== 'spring-garden') return;
      const baseFreq = 2200 + Math.random() * 900;
      const chirps = 2 + Math.floor(Math.random() * 3);

      for (let c = 0; c < chirps; c++) {
        setTimeout(() => {
          if (this.currentPresetId !== 'spring-garden') return;
          this.triggerChirp(ctx, baseFreq + (Math.random() * 300 - 150));
        }, c * 140);
      }
    };

    triggerBirdPhrase();
    this.currentLoopTimer = setInterval(() => {
      triggerBirdPhrase();
    }, 2800 + Math.random() * 2200);
  }

  private triggerChirp(ctx: AudioContext, freq: number) {
    if (this.isMuted || !this.masterGain) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(freq * 1.35, ctx.currentTime + 0.04);
    osc.frequency.linearRampToValueAtTime(freq * 0.95, ctx.currentTime + 0.1);

    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  }

  // 4. ANGELIC HARP: Pentatonic celestial harp sweeps
  private startHarpMelody(ctx: AudioContext) {
    const harpScale = [
      392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51
    ];

    const playArpeggio = () => {
      if (this.currentPresetId !== 'harp-melody') return;
      const notes = [...harpScale].sort(() => (Math.random() > 0.5 ? 1 : -1)).slice(0, 6);
      notes.forEach((freq, i) => {
        setTimeout(() => {
          if (this.currentPresetId !== 'harp-melody') return;
          this.triggerHarpPluck(ctx, freq, 0.22, 2.6);
        }, i * 220);
      });
    };

    playArpeggio();
    this.currentLoopTimer = setInterval(playArpeggio, 3600);
  }

  private triggerHarpPluck(ctx: AudioContext, freq: number, gainVal: number, duration: number) {
    if (this.isMuted || !this.masterGain) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // 5. ACOUSTIC GUITAR: Warm fingerpicked chords
  private startAcousticGuitar(ctx: AudioContext) {
    const patterns = [
      [146.83, 220.0, 293.66, 369.99, 440.0], // D
      [196.0, 246.94, 293.66, 392.0, 493.88], // G
      [220.0, 261.63, 329.63, 440.0, 523.25], // Am
      [174.61, 220.0, 261.63, 349.23, 440.0], // F
    ];
    let patIdx = 0;

    const playGuitarPattern = () => {
      if (this.currentPresetId !== 'acoustic-guitar') return;
      const chord = patterns[patIdx % patterns.length];
      patIdx++;

      chord.forEach((freq, i) => {
        setTimeout(() => {
          if (this.currentPresetId !== 'acoustic-guitar') return;
          this.triggerGuitarPluck(ctx, freq, 0.24 - i * 0.02, 2.2);
        }, i * 260);
      });
    };

    playGuitarPattern();
    this.currentLoopTimer = setInterval(playGuitarPattern, 3200);
  }

  private triggerGuitarPluck(ctx: AudioContext, freq: number, gainVal: number, duration: number) {
    if (this.isMuted || !this.masterGain) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + duration);

    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // 6. WIND CHIMES: Shimmering metallic breeze chimes
  private startWindChimes(ctx: AudioContext) {
    const chimeFreqs = [1200, 1420, 1680, 1890, 2140, 2480, 2800];

    const ringChimes = () => {
      if (this.currentPresetId !== 'wind-chimes') return;
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          if (this.currentPresetId !== 'wind-chimes') return;
          const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
          this.triggerBell(ctx, freq, 0.12, 2.8);
        }, i * 180 + Math.random() * 80);
      }
    };

    ringChimes();
    this.currentLoopTimer = setInterval(ringChimes, 3200);
  }

  // 7. COZY RAIN: Soft soothing rainfall with delicate window droplet plinks
  private startRainWindow(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(800, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.18, ctx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    if (this.masterGain) rainGain.connect(this.masterGain);
    rainSource.start();
    this.currentActiveNodes.push(rainSource);

    // Droplet plinks
    const triggerDroplet = () => {
      if (this.currentPresetId !== 'rain-window') return;
      const freq = 1200 + Math.random() * 1400;
      this.triggerBell(ctx, freq, 0.08, 0.4);
    };

    triggerDroplet();
    this.currentLoopTimer = setInterval(() => {
      triggerDroplet();
    }, 450 + Math.random() * 400);
  }

  // 8. LO-FI CHILL: Warm electric piano chords with vintage vinyl tone
  private startLofiChill(ctx: AudioContext) {
    const lofiChords = [
      [293.66, 349.23, 440.0, 523.25, 659.25], // Dm9
      [196.0, 293.66, 329.63, 392.0, 493.88],  // G13
      [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
      [220.0, 277.18, 329.63, 415.30, 493.88], // A7alt
    ];
    let chordIdx = 0;

    const playLofiProgression = () => {
      if (this.currentPresetId !== 'lofi-chill') return;
      const chord = lofiChords[chordIdx % lofiChords.length];
      chordIdx++;

      chord.forEach((freq, i) => {
        setTimeout(() => {
          if (this.currentPresetId !== 'lofi-chill') return;
          this.triggerLofiKey(ctx, freq, 0.2 - i * 0.02, 3.4);
        }, i * 90);
      });
    };

    playLofiProgression();
    this.currentLoopTimer = setInterval(playLofiProgression, 3800);
  }

  private triggerLofiKey(ctx: AudioContext, freq: number, gainVal: number, duration: number) {
    if (this.isMuted || !this.masterGain) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Warm vintage warmth
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, ctx.currentTime);

    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // 9. OCEAN WAVES: Calming sea swells with rhythmic filtering
  private startOceanWaves(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.14;
    }

    const waveSource = ctx.createBufferSource();
    waveSource.buffer = noiseBuffer;
    waveSource.loop = true;

    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.setValueAtTime(200, ctx.currentTime);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.12, ctx.currentTime);

    waveSource.connect(waveFilter);
    waveFilter.connect(waveGain);
    if (this.masterGain) waveGain.connect(this.masterGain);
    waveSource.start();
    this.currentActiveNodes.push(waveSource);

    // Swell loop: frequency rises and falls every 6 seconds
    const swell = () => {
      if (this.currentPresetId !== 'ocean-waves') return;
      const now = ctx.currentTime;
      waveFilter.frequency.cancelScheduledValues(now);
      waveFilter.frequency.setValueAtTime(180, now);
      waveFilter.frequency.linearRampToValueAtTime(750, now + 3.0);
      waveFilter.frequency.linearRampToValueAtTime(180, now + 6.0);

      waveGain.gain.cancelScheduledValues(now);
      waveGain.gain.setValueAtTime(0.08, now);
      waveGain.gain.linearRampToValueAtTime(0.24, now + 3.0);
      waveGain.gain.linearRampToValueAtTime(0.08, now + 6.0);
    };

    swell();
    this.currentLoopTimer = setInterval(swell, 6000);
  }

  // 10. STARLIGHT CELESTA: Dreamy crystal chimes drifting under the stars
  private startStarlightCelesta(ctx: AudioContext) {
    const celestaScale = [
      1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32, 2637.02
    ]; // High C6-E7 celestial notes

    const playStarlightPhrase = () => {
      if (this.currentPresetId !== 'starlight-celesta') return;
      const notesCount = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < notesCount; i++) {
        setTimeout(() => {
          if (this.currentPresetId !== 'starlight-celesta') return;
          const freq = celestaScale[Math.floor(Math.random() * celestaScale.length)];
          this.triggerCelesta(ctx, freq, 0.16, 2.8);
        }, i * 360 + Math.random() * 120);
      }
    };

    playStarlightPhrase();
    this.currentLoopTimer = setInterval(playStarlightPhrase, 3600);
  }

  private triggerCelesta(ctx: AudioContext, freq: number, gain: number, duration: number) {
    if (this.isMuted || !this.masterGain) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

// Global Singleton Instance
export const soundEngine = new SoundEngine();
