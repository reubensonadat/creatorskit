/**
 * Whisper Web Worker for CreatorsKit
 * =================================
 * Runs @huggingface/transformers in a dedicated worker thread with WebGPU or WebAssembly.
 * 100% Client-Side. $0 Server Cost.
 */

import { pipeline, env } from '@huggingface/transformers';

// Disallow local models so it fetches onnx weights directly from HuggingFace CDN & caches locally
env.allowLocalModels = false;

// Cloudflare Pages rejects any single file over 25 MiB, and onnxruntime-web's
// compat binary (ort-wasm-simd-threaded.asyncify.wasm, 25.6 MiB) ships inside
// the bundle by default. Point ORT at the jsDelivr mirror of the EXACT
// installed version instead — every ort-wasm binary is fetched from the CDN
// at runtime, and scripts/strip-ort-wasm.mjs removes the bundled copies after
// the build so Cloudflare accepts the deploy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(env.backends.onnx as any).wasm.wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/';

// Pipeline singleton to prevent re-instantiating model on subsequent runs
class WhisperPipelineSingleton {
    static task = 'automatic-speech-recognition' as const;
    static model = 'onnx-community/whisper-base.en';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static instance: any = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async getInstance(progress_callback?: (data: any) => void) {
        if (this.instance === null) {
            // Test if WebGPU is available in the worker environment
            const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
            const device = hasWebGPU ? 'webgpu' : 'wasm';

            self.postMessage({
                type: 'status',
                message: 'Initializing...',
                device,
            });

            this.instance = await pipeline(this.task, this.model, {
                device: device,
                dtype: device === 'webgpu' ? 'fp32' : 'q8',
                progress_callback,
            });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event: MessageEvent) => {
    const { type, audioData } = event.data;

    if (type === 'transcribe') {
        try {
            self.postMessage({ type: 'status', message: 'Generating captions...' });

            const transcriber = await WhisperPipelineSingleton.getInstance((progressData) => {
                // Forward model downloading & loading progress
                self.postMessage({
                    type: 'model_progress',
                    data: progressData,
                });
            });

            self.postMessage({ type: 'status', message: 'Generating captions...' });

            const startTime = performance.now();
            let output;
            try {
                output = await transcriber(audioData, {
                    chunk_length_s: 30,
                    stride_length_s: 5,
                    return_timestamps: 'word',
                });
            } catch (wordErr) {
                console.warn('Word-level timestamps fallback to segment level:', wordErr);
                output = await transcriber(audioData, {
                    chunk_length_s: 30,
                    stride_length_s: 5,
                    return_timestamps: true,
                });
            }
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

            self.postMessage({
                type: 'complete',
                output,
                elapsed,
            });
        } catch (error) {
            console.error('Whisper worker error:', error);
            self.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
});
