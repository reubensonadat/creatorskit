/**
 * src/lib/media-cleanup.ts
 *
 * Global Media Lifecycle & Anti-Leak Safety Net.
 *
 * Guarantees that microphone/camera streams, speech recognition sessions,
 * and Web Audio contexts NEVER leak across page transitions or unmounts.
 */

const activeStreams = new Set<MediaStream>();
const activeSpeechRecognitions = new Set<any>();
const activeAudioContexts = new Set<AudioContext>();

/**
 * Register a MediaStream to be tracked globally.
 */
export function registerMediaStream(stream: MediaStream): MediaStream {
  if (!stream) return stream;
  activeStreams.add(stream);

  const checkTracks = () => {
    try {
      const hasLiveTracks = stream.getTracks().some((t) => t.readyState === 'live');
      if (!hasLiveTracks) {
        activeStreams.delete(stream);
      }
    } catch {
      activeStreams.delete(stream);
    }
  };

  try {
    stream.getTracks().forEach((track) => {
      track.addEventListener('ended', checkTracks, { once: true });
    });
  } catch { }

  return stream;
}

/**
 * Unregister a MediaStream.
 */
export function unregisterMediaStream(stream: MediaStream | null | undefined): void {
  if (stream) {
    activeStreams.delete(stream);
  }
}

/**
 * Register a SpeechRecognition instance to be tracked globally.
 */
export function registerSpeechRecognition(recognition: any): any {
  if (!recognition) return recognition;
  activeSpeechRecognitions.add(recognition);
  return recognition;
}

/**
 * Unregister a SpeechRecognition instance.
 */
export function unregisterSpeechRecognition(recognition: any): void {
  if (recognition) {
    activeSpeechRecognitions.delete(recognition);
  }
}

/**
 * Register an AudioContext.
 */
export function registerAudioContext(ctx: AudioContext): AudioContext {
  if (!ctx) return ctx;
  activeAudioContexts.add(ctx);
  return ctx;
}

/**
 * Unregister an AudioContext.
 */
export function unregisterAudioContext(ctx: AudioContext | null | undefined): void {
  if (ctx) {
    activeAudioContexts.delete(ctx);
  }
}

/**
 * Force-stop ALL active microphones, cameras, and media streams globally.
 * Called on route transitions or emergency teardown so NO microphone ever leaks.
 */
export function forceStopAllMediaStreams(): void {
  // 1. Force-stop all registered MediaStreams
  activeStreams.forEach((stream) => {
    try {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch { }
      });
    } catch { }
  });
  activeStreams.clear();

  // 2. Abort all registered SpeechRecognition instances
  activeSpeechRecognitions.forEach((recognition) => {
    try {
      recognition.onstart = null;
      recognition.onaudiostart = null;
      recognition.onsoundstart = null;
      recognition.onspeechstart = null;
      recognition.onspeechend = null;
      recognition.onsoundend = null;
      recognition.onaudioend = null;
      recognition.onresult = null;
      recognition.onnomatch = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch { }
      try { recognition.stop(); } catch { }
    } catch { }
  });
  activeSpeechRecognitions.clear();

  // 3. Close or suspend all registered AudioContexts
  activeAudioContexts.forEach((ctx) => {
    try {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => { });
      }
    } catch { }
  });
  activeAudioContexts.clear();
}

/**
 * Intercept navigator.mediaDevices.getUserMedia & SpeechRecognition globally
 * on the client side so that ANY stream or recognition acquired anywhere
 * in the application is automatically registered and guaranteed to be killed
 * when moving to another page.
 */
let isInterceptorInstalled = false;

export function installGlobalMediaSafetyNet(): void {
  if (typeof window === 'undefined' || isInterceptorInstalled) return;

  // 1. Intercept getUserMedia
  if (navigator?.mediaDevices?.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function (constraints?: MediaStreamConstraints) {
      const stream = await originalGetUserMedia(constraints);
      registerMediaStream(stream);
      return stream;
    };
  }

  // 2. Intercept SpeechRecognition / webkitSpeechRecognition
  const win = window as any;
  const OriginalSR = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (OriginalSR) {
    try {
      const PatchedSR = new Proxy(OriginalSR, {
        construct(target: any, argArray: any[], newTarget?: any): object {
          const instance = Reflect.construct(target, argArray, newTarget ?? target);
          registerSpeechRecognition(instance);
          return instance as object;
        },
      });

      if (win.SpeechRecognition) win.SpeechRecognition = PatchedSR;
      if (win.webkitSpeechRecognition) win.webkitSpeechRecognition = PatchedSR;
    } catch { }
  }

  isInterceptorInstalled = true;
}
