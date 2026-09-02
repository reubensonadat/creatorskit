// Shared synthesized studio SFX for the newspaper-style tools.
// Both the Text Match Cut and Text Highlighter engines/pages use these —
// no network audio, fully deterministic on OfflineAudioContext for exports.

export type StudioSoundType =
    | 'highlighter-1'
    | 'highlighter-2'
    | 'shutter'
    | 'typewriter'
    | 'motor'
    | 'paper'
    | 'marker'
    | 'mute';

/**
 * Natural hand-stroke easing for the highlighter sweep timeline.
 * easeInOutSine: slow take-off → fast glide through the middle → gentle settle.
 * Applied identically in live preview and video export so both feel the same.
 */
export function easeHighlightSweep(t: number): number {
    const x = Math.min(1, Math.max(0, t));
    return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

export function synthesizeCutSound(
    ctx: BaseAudioContext,
    dest: AudioNode,
    soundType: StudioSoundType = 'highlighter-1',
    volume = 0.5,
    scheduledTime?: number,
    duration = 1.8,
    numPhrases = 1
) {
    if (soundType === 'mute') return;
    const t = scheduledTime !== undefined ? scheduledTime : ctx.currentTime;

    try {
        if (soundType === 'highlighter-1' || soundType === 'highlighter-2' || soundType === 'marker') {
            // Fully synthesized marker stroke. A short looped recording always
            // sounds mechanical/droney — generated noise follows the exact sweep
            // velocity, never loops, and every phrase gets a subtly different nib.
            const sr = ctx.sampleRate;
            // Texture per variant:
            //   highlighter-1 → classic chisel marker (broad, ~1.55 kHz)
            //   highlighter-2 → fine-tip (brighter, ~2.3 kHz)
            //   marker        → fat chisel (dark, ~1.15 kHz)
            const baseFreq =
                soundType === 'highlighter-2' ? 2300 : soundType === 'marker' ? 1150 : 1550;

            const phrases = Math.max(1, numPhrases);
            for (let k = 0; k < phrases; k++) {
                const phraseStart = t + (k / phrases) * duration;
                const sweepDur = (duration / phrases) * (phrases > 1 ? 0.78 : 1.0);
                const phraseEnd = phraseStart + sweepDur;

                const frames = Math.max(1, Math.floor(sweepDur * sr));
                const buf = ctx.createBuffer(2, frames, sr);
                // Deterministic per-phrase tonal variation keeps rapid strokes organic.
                const center = baseFreq * (0.9 + 0.2 * ((k * 0.618033988749895) % 1));

                for (let ch = 0; ch < 2; ch++) {
                    const data = buf.getChannelData(ch);
                    let lp = 0; // one-pole integrator → warm pinkish nib texture
                    for (let i = 0; i < frames; i++) {
                        const t01 = i / frames;
                        // Velocity envelope: slow take-off, glide through the middle,
                        // gentle settle — matches the eased on-screen sweep.
                        const env = Math.pow(Math.sin(Math.PI * t01), 1.4);
                        // Fibrous paper contact crackle.
                        const crackle = 0.72 + 0.28 * Math.random();
                        const white = Math.random() * 2 - 1;
                        lp += 0.42 * (white - lp);
                        data[i] = lp * env * crackle;
                    }
                }

                const src = ctx.createBufferSource();
                src.buffer = buf;

                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.value = center;
                bp.Q.value = 0.55;

                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 300;

                const gain = ctx.createGain();
                gain.gain.value = Math.min(1.0, volume);

                src.connect(bp);
                bp.connect(hp);
                hp.connect(gain);
                gain.connect(dest);

                src.start(phraseStart);
                src.stop(phraseEnd + 0.02);
            }
            return;
        }

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(Math.min(0.4, Math.max(0, volume * 0.4)), t);
        masterGain.connect(dest);

        if (soundType === 'paper') {
            const bufferSize = Math.floor(ctx.sampleRate * 0.04);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(2400, t);
            noise.connect(filter);
            filter.connect(masterGain);
            noise.start(t);
            noise.stop(t + 0.04);
        } else if (soundType === 'shutter') {
            const bufferSize = Math.floor(ctx.sampleRate * 0.03);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, t);
            noise.connect(filter);
            filter.connect(masterGain);
            noise.start(t);
            noise.stop(t + 0.035);
        } else if (soundType === 'typewriter') {
            const bufferSize = Math.floor(ctx.sampleRate * 0.025);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(900, t);
            noise.connect(filter);
            filter.connect(masterGain);
            noise.start(t);
            noise.stop(t + 0.03);
        }
    } catch (err) {
        console.warn('Audio playback error:', err);
    }
}

// Low-latency live preview context (lazily created, shared across calls).
let liveAudioCtx: AudioContext | null = null;

export function playSynchronizedHighlighterSound(
    soundId: StudioSoundType = 'highlighter-1',
    durationSeconds: number = 2.0,
    numPhrases: number = 1,
    volume = 0.5
) {
    if (soundId === 'mute' || typeof window === 'undefined') return;
    try {
        const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        if (!liveAudioCtx || liveAudioCtx.state === 'suspended') {
            liveAudioCtx = new AudioContextClass();
        }
        if (liveAudioCtx.state === 'suspended') {
            liveAudioCtx.resume();
        }

        synthesizeCutSound(liveAudioCtx, liveAudioCtx.destination, soundId, volume, undefined, durationSeconds, numPhrases);
    } catch (err) {
        console.warn('Highlighter sound error:', err);
    }
}

export function playHighlighterStroke(
    durationSeconds: number = 2.0,
    volume: number = 0.5,
    numPhrases: number = 1
) {
    playSynchronizedHighlighterSound('highlighter-1', durationSeconds, numPhrases, volume);
}

export function playCutSound(
    soundType: StudioSoundType = 'highlighter-1',
    volume = 0.5,
    duration = 2.0,
    numPhrases = 1
) {
    playSynchronizedHighlighterSound(soundType, duration, numPhrases, volume);
}
