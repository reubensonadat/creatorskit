/**
 * 3D Tree Diorama — Ambient Audio Synthesizer (Web Audio API)
 * ==========================================================
 * Generates an organic ambient soundscape:
 * - Gentle breeze atmospheric white/pink filtered noise
 * - Wind-chime pentatonic crystalline bells on leaves rustle
 * 100% self-contained, zero external network downloads.
 */

class AmbientSoundscape {
    private ctx: AudioContext | null = null;
    private isPlaying = false;
    private masterGain: GainNode | null = null;
    private chimeTimer: ReturnType<typeof setInterval> | null = null;

    private initContext(): AudioContext {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    public start(): void {
        if (this.isPlaying) return;
        try {
            const ctx = this.initContext();
            this.masterGain = ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
            this.masterGain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 2.0);
            this.masterGain.connect(ctx.destination);

            // 1. Soft wind noise generator (brownian filtered breeze)
            const bufferSize = ctx.sampleRate * 2;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + 0.02 * white) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5;
            }

            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            const bandpass = ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(420, ctx.currentTime);
            bandpass.Q.setValueAtTime(1.8, ctx.currentTime);

            const breezeGain = ctx.createGain();
            breezeGain.gain.setValueAtTime(0.08, ctx.currentTime);

            whiteNoise.connect(bandpass);
            bandpass.connect(breezeGain);
            breezeGain.connect(this.masterGain);
            whiteNoise.start();

            // 2. Pentatonic wind chimes (E-minor pentatonic: E5, G5, A5, B5, D6, E6)
            const chimeNotes = [659.25, 783.99, 880.0, 987.77, 1174.66, 1318.51];

            this.chimeTimer = setInterval(() => {
                if (!this.isPlaying || !this.ctx || !this.masterGain) return;
                if (Math.random() < 0.65) {
                    this.playChime(chimeNotes[Math.floor(Math.random() * chimeNotes.length)]);
                }
            }, 1800);

            this.isPlaying = true;
        } catch (e) {
            console.warn('AudioContext not allowed yet:', e);
        }
    }

    private playChime(freq: number): void {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 2.5);
    }

    public stop(): void {
        if (!this.isPlaying) return;
        if (this.chimeTimer) {
            clearInterval(this.chimeTimer);
            this.chimeTimer = null;
        }
        if (this.masterGain && this.ctx) {
            try {
                this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
                setTimeout(() => {
                    this.isPlaying = false;
                }, 800);
            } catch {
                this.isPlaying = false;
            }
        } else {
            this.isPlaying = false;
        }
    }

    public toggle(): boolean {
        if (this.isPlaying) {
            this.stop();
            return false;
        } else {
            this.start();
            return true;
        }
    }

    public get active(): boolean {
        return this.isPlaying;
    }
}

export const ambientSoundscape = new AmbientSoundscape();
