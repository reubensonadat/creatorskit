"""The ONLY file that imports rembg — u2netp background removal.

RAM discipline on the 512MB free box (whisper ~180MB resident when loaded):
a rembg session is created PER REQUEST inside _LOCK, then dropped + gc'd —
no idle residency. Before creating it, whisper is released (one heavy model
at a time, always — engine.release() is a no-op when whisper is idle).
Uploads are downscaled to <=2048px long edge before inference: a 6000px
phone photo decodes to 100MB+ of pixels, and poster text-behind never needs
more than 2048.

Worker-agnostic on purpose: this module never touches FastAPI — the VPS
compose plan (docs/VPS_SCALE_PLAN.md) mounts it in its own service later.
"""

from __future__ import annotations

import gc
import os
import threading
import time
from io import BytesIO

_LOCK = threading.Lock()          # one matte at a time — extra jobs queue on disk
MODEL_NAME = os.environ.get('MATTE_MODEL', 'u2netp')
MAX_EDGE = int(os.environ.get('MATTE_MAX_EDGE', '2048'))

_last_used = 0.0
_last_error: str | None = None
_last_s = 0.0


def remove_subject_png(image_bytes: bytes) -> bytes:
    """Image bytes in → PNG bytes with the subject on transparent background."""
    global _last_used, _last_error, _last_s
    from PIL import Image  # Pillow ships with rembg

    img = Image.open(BytesIO(image_bytes))
    img.load()

    # Downscale BEFORE inference — caps decode + session RAM and keeps
    # u2netp latency in the 1-3s range on the shared vCPU.
    w, h = img.size
    if max(w, h) > MAX_EDGE:
        scale = MAX_EDGE / max(w, h)
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # One heavy model at a time: if whisper is resident, hand its ~180MB
    # back first. It reloads on the next transcription — a fair trade.
    from . import engine as whisper_engine
    whisper_engine.release()

    with _LOCK:
        t0 = time.time()
        try:
            # rembg is imported HERE (not at module top) so a missing/broken
            # wheel can never take the whole captions module down at boot —
            # the same optional-module boundary app.py enforces.
            from rembg import new_session, remove

            session = new_session(MODEL_NAME)
            try:
                out = remove(img, session=session)
            finally:
                del session
                gc.collect()   # hand the session's ~200MB straight back

            buf = BytesIO()
            out.save(buf, format='PNG')
            _last_used = time.time()
            _last_s = round(_last_used - t0, 2)
            _last_error = None
            return buf.getvalue()
        except Exception as exc:  # noqa: BLE001 — surfaced via /health
            _last_error = str(exc)[:300]
            raise


def status() -> dict:
    """Cheap /health peek — never imports rembg, never takes the lock."""
    return {
        'model': MODEL_NAME,
        'busy': _LOCK.locked(),
        'max_edge': MAX_EDGE,
        'last_used_ago_s': round(time.time() - _last_used, 1) if _last_used else None,
        'last_s': _last_s or None,
        'last_error': _last_error,
    }
