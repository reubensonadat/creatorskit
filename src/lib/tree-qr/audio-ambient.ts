/**
 * 3D Tree Diorama — Ambient Audio Synthesizer (Web Audio API)
 * ==========================================================
 * Generates 5 organic ambient soundscapes.
 * 100% self-contained, zero external network downloads.
 */

export type AmbientSoundType = 'breeze' | 'birds' | 'chimes' | 'zen' | 'river';
export const AMBIENT_SOUND_TYPES: AmbientSoundType[] = ['breeze', 'birds', 'chimes', 'zen', 'river'];

class AmbientSoundscape {
    private ctx: AudioContext | null = null;
    private isPlaying = false;
    private masterGain: GainNode | null = null;
    private currentType: AmbientSoundType = 'breeze';
    private nodes: AudioNode[] = [];
    private intervals: number[] = [];

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

    private clearCurrent() {
        for (const node of this.nodes) {
            try {
                if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                    node.stop();
                }
                node.disconnect();
            } catch (e) {}
        }
        this.nodes = [];

        for (const id of this.intervals) {
            window.clearInterval(id);
        }
        this.intervals = [];
    }

    public setType(type: AmbientSoundType) {
        this.currentType = type;
        if (this.isPlaying) {
            this.clearCurrent();
            this.playCurrentType();
        }
    }

    public getType(): AmbientSoundType {
        return this.currentType;
    }

    public start(): void {
        if (this.isPlaying) return;
        try {
            const ctx = this.initContext();
            this.masterGain = ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
            this.masterGain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 2.0);
            this.masterGain.connect(ctx.destination);
            this.isPlaying = true;

            this.playCurrentType();
        } catch (e) {
            console.warn('AudioContext not allowed yet:', e);
        }
    }

    private playCurrentType() {
        switch (this.currentType) {
            case 'breeze': this.playBreeze(); break;
            case 'birds': this.playBirds(); break;
            case 'chimes': this.playChimes(); break;
            case 'zen': this.playZen(); break;
            case 'river': this.playRiver(); break;
        }
    }

    private playBreeze() {
        if (!this.ctx || !this.masterGain) return;
        const ctx = this.ctx;

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
        breezeGain.gain.setValueAtTime(0.12, ctx.currentTime);

        whiteNoise.connect(bandpass);
        bandpass.connect(breezeGain);
        breezeGain.connect(this.masterGain);
        whiteNoise.start();

        this.nodes.push(whiteNoise, bandpass, breezeGain);
    }

    private playBirds() {
        this.playBreeze();
        if (!this.ctx || !this.masterGain) return;

        const chirp = () => {
            if (!this.ctx || !this.masterGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            const freq = 2000 + Math.random() * 2000;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq - 500, this.ctx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + 0.15);
            
            this.nodes.push(osc, gain);
        };

        this.intervals.push(window.setInterval(() => {
            if (Math.random() > 0.4) chirp();
            if (Math.random() > 0.8) setTimeout(chirp, 150);
        }, 1200));
    }

    private playChimes() {
        this.playBreeze();
        if (!this.ctx || !this.masterGain) return;

        const chimeNotes = [659.25, 783.99, 880.0, 987.77, 1174.66, 1318.51];
        
        this.intervals.push(window.setInterval(() => {
            if (!this.ctx || !this.masterGain) return;
            if (Math.random() < 0.65) {
                const freq = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
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
                this.nodes.push(osc, gain);
            }
        }, 1800));
    }

    private playZen() {
        if (!this.ctx || !this.masterGain) return;
        const ctx = this.ctx;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc3.type = 'triangle';

        osc1.frequency.value = 100; // Deep drone
        osc2.frequency.value = 101.5; // Beating effect
        osc3.frequency.value = 50; // Sub

        gain.gain.value = 0.05;

        osc1.connect(gain);
        osc2.connect(gain);
        osc3.connect(gain);
        gain.connect(this.masterGain);

        osc1.start();
        osc2.start();
        osc3.start();

        this.nodes.push(osc1, osc2, osc3, gain);
    }

    private playRiver() {
        if (!this.ctx || !this.masterGain) return;
        const ctx = this.ctx;

        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[i];
            output[i] *= 4.0;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        const filter2 = ctx.createBiquadFilter();
        filter2.type = 'highpass';
        filter2.frequency.setValueAtTime(200, ctx.currentTime);

        const riverGain = ctx.createGain();
        riverGain.gain.setValueAtTime(0.15, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(filter2);
        filter2.connect(riverGain);
        riverGain.connect(this.masterGain);
        whiteNoise.start();

        this.nodes.push(whiteNoise, filter, filter2, riverGain);
    }

    public stop(): void {
        if (!this.isPlaying) return;
        if (this.masterGain && this.ctx) {
            try {
                this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
                setTimeout(() => {
                    this.clearCurrent();
                    this.isPlaying = false;
                }, 800);
            } catch {
                this.clearCurrent();
                this.isPlaying = false;
            }
        } else {
            this.clearCurrent();
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
