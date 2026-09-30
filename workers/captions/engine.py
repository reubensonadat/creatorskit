"""The ONLY file that touches faster-whisper.

Design constraints (Render free tier: 512MB RAM, ~1 shared vCPU, ephemeral
disk — see docs/AUDIO_TRANSCRIPTION_PLAN.md):

- base.en int8 ≈ 78MB weights / ~150-180MB resident — the only model that
  comfortably fits next to uvicorn + yt-dlp. tiny.en works as an env
  override; small.en does NOT (it OOMs the container).
- Lazy load: the first /transcribe pays ~2-4s; until then zero RAM used.
- One inference at a time: the lock serializes BOTH load and transcribe —
  a 1-vCPU box gains nothing from parallel runs and RAM would double.
- Speed knobs for the 1-vCPU reality: beam_size=1 (greedy — beam 5 costs
  ~5x decoder work for near-identical captions), condition_on_previous_text
  off (no context re-feed every window: faster on long audio and it kills
  whisper's repetition loops), cpu_threads=1 (CTranslate2 defaults to 4,
  which thrashes on one shared core; os.cpu_count() in the container can't
  be trusted — it reports the HOST's cores).
- Idle unload: a daemon drops the model after 30min without a request so a
  quiet container doesn't sit on ~180MB it isn't using (kept warm longer
  than the old 10min — the reload cost outweighs the RAM on this box).
- Baked-at-build preferred (Dockerfile prints CAPTIONS_MODEL_BAKED); if
  the bake failed, WhisperModel() downloads to MODELS_DIR on first use —
  the dir is chowned to the runtime user (uid 1000) for exactly that.
"""

from __future__ import annotations

import gc
import os
import tempfile
import threading
import time
from pathlib import Path

MODEL_ID = os.environ.get('WHISPER_MODEL', 'base.en')
MODELS_DIR = os.environ.get(
    'WHISPER_MODELS_DIR', str(Path(tempfile.gettempdir()) / 'whisper-models')
)
IDLE_UNLOAD_SECONDS = int(os.environ.get('WHISPER_IDLE_UNLOAD', '1800'))
CPU_THREADS = int(os.environ.get('WHISPER_CPU_THREADS', '1'))

_model = None            # the WhisperModel once loaded
_model_lock = threading.Lock()
_last_used = 0.0
_last_error = ''
_load_s: float | None = None   # how long the (first) load took — surfaces HF stalls
_load_failed_at = 0.0          # fail-fast cooldown clock (see _load)

LOAD_FAIL_COOLDOWN_S = 30


def _load():
    """Import + instantiate WhisperModel. Called under _model_lock.

    Fail-fast guard: if the last attempt just failed (wheel missing,
    Hugging Face down, disk full) DON'T let every queued job retry — each
    attempt can cost a full 78MB download before dying. New attempts wait
    out a short cooldown and fail instantly with the SAME error, so the
    job response and /health stay informative instead of hanging."""
    global _last_error, _load_s, _load_failed_at
    now = time.time()
    if _load_failed_at and now - _load_failed_at < LOAD_FAIL_COOLDOWN_S:
        raise RuntimeError(
            f'model load failed recently, cooling down — {_last_error or "unknown error"}'
        )
    started = now
    try:
        from faster_whisper import WhisperModel   # lazy: wheel may be absent in dev
        model = WhisperModel(
            MODEL_ID, device='cpu', compute_type='int8', download_root=MODELS_DIR,
            cpu_threads=CPU_THREADS,
        )
        _load_s = round(time.time() - started, 1)
        _load_failed_at = 0.0
        return model
    except Exception as exc:  # noqa: BLE001 — surfaced via /health + job error
        _load_failed_at = now
        _last_error = f'load failed: {exc}'[:300]
        raise


def baked() -> bool:
    """Did the Docker build bake model files into MODELS_DIR?"""
    try:
        return any(p.name != '.locks' for p in os.scandir(MODELS_DIR))
    except OSError:
        return False


def transcribe(path) -> dict:
    """Speech → {text, language, duration, words: [{word, start, end}]}.

    word_timestamps power the animated caption presets (karaoke pop etc.);
    vad_filter skips silence/music so long talks transcribe faster.
    """
    global _model, _last_used, _last_error
    with _model_lock:                    # load + inference serialized on purpose
        if _model is None:
            _model = _load()
        _last_used = time.time()
        try:
            # .en models are English-only — passing language='en' skips the
            # (unreliable on .en) auto-detect pass and saves seconds. Non-.en
            # models (WHISPER_MODEL override) keep auto-detection.
            # Speed: beam_size=1 (greedy decode) + no previous-text
            # conditioning — together roughly 2-3x faster than the library
            # defaults on this box, with caption-grade quality unchanged.
            kwargs: dict = {
                'word_timestamps': True,
                'vad_filter': True,
                'beam_size': 1,
                'condition_on_previous_text': False,
            }
            if MODEL_ID.endswith('.en'):
                kwargs['language'] = 'en'
            segments, info = _model.transcribe(str(path), **kwargs)
            words: list[dict] = []
            text_parts: list[str] = []
            seg_timings: list[tuple] = []   # (text, start, end) fallback
            for seg in segments:         # generator — this loop runs the decode
                text_parts.append(seg.text)
                seg_timings.append((seg.text.strip(), seg.start, seg.end))
                for w in seg.words or []:
                    word = (w.word or '').strip()
                    if word:
                        words.append({
                            'word': word,
                            'start': round(w.start, 3),
                            'end': round(w.end, 3),
                        })
            # Edge case: some audio makes word_timestamps return empty
            # (heavy VAD trimming, odd codecs) while SEGMENT timing stays
            # solid. The caption presets key off word timing, so degrade
            # gracefully instead of breaking: one pseudo-word per segment
            # keeps cue generation working at segment granularity.
            if not words and seg_timings:
                for seg_text, seg_start, seg_end in seg_timings:
                    if seg_text:
                        words.append({
                            'word': seg_text,
                            'start': round(seg_start, 3),
                            'end': round(seg_end, 3),
                        })
            _last_error = ''
            duration = getattr(info, 'duration', None) \
                or getattr(info, 'duration_after_vad', None) or 0
            return {
                'text': ''.join(text_parts).strip(),
                'language': getattr(info, 'language', 'en'),
                'duration': round(duration, 3),
                'words': words,
            }
        except Exception as exc:  # noqa: BLE001 — the job error must carry detail
            _last_error = f'transcribe failed: {exc}'[:300]
            raise


def _idle_unloader() -> None:
    global _model
    while True:
        time.sleep(60)
        try:
            with _model_lock:
                if _model is not None and time.time() - _last_used > IDLE_UNLOAD_SECONDS:
                    _model = None
                    gc.collect()   # hand the ~180MB back before the next job
        except Exception:
            pass


threading.Thread(target=_idle_unloader, daemon=True).start()


def release() -> bool:
    """Unload whisper NOW — the matte module calls this before rembg takes
    the RAM (the 512MB box fits one heavy model at a time)."""
    global _model
    with _model_lock:
        was_loaded = _model is not None
        _model = None
    if was_loaded:
        gc.collect()   # hand the ~180MB back before rembg loads
    return was_loaded


def status() -> dict:
    """Cheap /health peek — never blocks on _model_lock."""
    return {
        'loaded': _model is not None,
        'model': MODEL_ID,
        'baked': baked(),
        'load_s': _load_s,
        'load_cooling_down': bool(
            _load_failed_at and time.time() - _load_failed_at < LOAD_FAIL_COOLDOWN_S
        ),
        'last_used_ago_s': round(time.time() - _last_used, 1) if _last_used else None,
        'last_error': _last_error or None,
        'dir': MODELS_DIR,
    }
