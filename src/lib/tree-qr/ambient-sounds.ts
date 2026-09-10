/**
 * Ambient Sound Manager for Voxel QR Diorama
 * Synthesizes 5 distinct ambient sound profiles using the Web Audio API.
 */

export type AmbientSoundType = 'none' | 'breeze' | 'birds' | 'chimes' | 'zen' | 'river';

export class AmbientSoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private currentType: AmbientSoundType = 'none';
    private nodes: AudioNode[] = [];
    private intervals: number[] = [];
    private isPlaying = false;

    constructor() {}

    private initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = 0; // Start faded out
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    private stopCurrent() {
        if (!this.ctx) return;
        
        // Stop all oscillators and disconnect nodes
        for (const node of this.nodes) {
            if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                try { node.stop(); } catch (e) {}
            }
            node.disconnect();
        }
        this.nodes = [];

        // Clear intervals for random events (like birds/chimes)
        for (const id of this.intervals) {
            window.clearInterval(id);
        }
        this.intervals = [];
    }

    private playBreeze() {
        if (!this.ctx || !this.masterGain) return;
        
        // Pink noise for breeze
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; // compensation
            b6 = white * 0.115926;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400; // Deep breeze
        
        // Modulate the filter frequency for wind swells
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // Slow swell
        
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 300;
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        const localGain = this.ctx.createGain();
        localGain.gain.value = 0.3;

        noise.connect(filter);
        filter.connect(localGain);
        localGain.connect(this.masterGain);
        
        noise.start();

        this.nodes.push(noise, filter, lfo, lfoGain, localGain);
    }

    private playBirds() {
        if (!this.ctx || !this.masterGain) return;

        // Background gentle breeze
        this.playBreeze();

        // Random bird chirps
        const chirp = () => {
            if (!this.ctx || !this.masterGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            const freq = 2000 + Math.random() * 2000;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq - 500, this.ctx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.02);
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
        if (!this.ctx || !this.masterGain) return;

        this.playBreeze(); // Background

        const strikeChime = () => {
            if (!this.ctx || !this.masterGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            const baseNotes = [1046.50, 1174.66, 1318.51, 1567.98, 1760.00]; // Pentatonic C6 scale
            const freq = baseNotes[Math.floor(Math.random() * baseNotes.length)];
            
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + 2.5);
            
            this.nodes.push(osc, gain);
        };

        this.intervals.push(window.setInterval(() => {
            if (Math.random() > 0.6) strikeChime();
        }, 800));
    }

    private playZen() {
        if (!this.ctx || !this.masterGain) return;

        // Drone
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const osc3 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc3.type = 'triangle';

        osc1.frequency.value = 100; // Deep drone
        osc2.frequency.value = 101.5; // Beating effect
        osc3.frequency.value = 50; // Sub

        gain.gain.value = 0.15;

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
        
        // Brown noise
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        let lastOut = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // compensation
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 600;
        filter.Q.value = 0.5;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.4;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start();
        this.nodes.push(noise, filter, gain);
    }

    public play(type: AmbientSoundType) {
        this.initContext();
        if (this.currentType === type && this.isPlaying) return;
        
        this.stopCurrent();
        this.currentType = type;
        
        if (type === 'none') {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        
        // Fade in
        if (this.ctx && this.masterGain) {
            this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.0);
        }

        switch (type) {
            case 'breeze': this.playBreeze(); break;
            case 'birds': this.playBirds(); break;
            case 'chimes': this.playChimes(); break;
            case 'zen': this.playZen(); break;
            case 'river': this.playRiver(); break;
        }
    }

    public stop() {
        if (this.ctx && this.masterGain) {
            this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
            setTimeout(() => {
                this.stopCurrent();
                this.isPlaying = false;
                this.currentType = 'none';
            }, 500);
        }
    }
}
