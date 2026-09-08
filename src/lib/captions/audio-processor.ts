/**
 * Client-Side Audio Processor for CreatorKit Whisper Engine
 * ========================================================
 * Decodes any audio/video file directly in the browser using Web Audio API
 * and resamples it to 16,000 Hz Mono Float32Array (Whisper's native input).
 *
 * 100% Client-Side. $0 Server Bandwidth.
 */

export interface DecodedAudioResult {
    audioData: Float32Array;
    duration: number;
    sampleRate: number;
}

/**
 * Decodes an uploaded Audio or Video File into a 16kHz mono Float32Array.
 */
export async function processAudioForWhisper(
    file: File | Blob,
    onProgress?: (stage: string) => void
): Promise<DecodedAudioResult> {
    onProgress?.('Reading audio file...');
    const arrayBuffer = await file.arrayBuffer();

    onProgress?.('Decoding audio stream in browser...');
    // Create an AudioContext for decoding
    const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextClass();

    try {
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const originalSampleRate = decodedBuffer.sampleRate;
        const duration = decodedBuffer.duration;

        onProgress?.('Resampling to 16kHz mono for Whisper...');
        // Resample to 16,000 Hz Mono using OfflineAudioContext
        const targetSampleRate = 16000;
        const offlineCtx = new OfflineAudioContext(
            1, // mono
            Math.ceil(duration * targetSampleRate),
            targetSampleRate
        );

        // Mix down channels if stereo/multichannel
        const bufferSource = offlineCtx.createBufferSource();
        bufferSource.buffer = decodedBuffer;
        bufferSource.connect(offlineCtx.destination);
        bufferSource.start(0);

        const resampledBuffer = await offlineCtx.startRendering();
        const float32Data = resampledBuffer.getChannelData(0);

        return {
            audioData: float32Data,
            duration,
            sampleRate: targetSampleRate,
        };
    } finally {
        // Clean up audio context
        if (audioCtx.state !== 'closed') {
            await audioCtx.close().catch(() => {});
        }
    }
}
