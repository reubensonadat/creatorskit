"""Auto-captions routes — same instant-job pattern as /resolve.

  POST /transcribe/ticket   (X-Worker-Token) → one-time browser upload grant
  POST /transcribe          (multipart 'file' + ticket OR X-Worker-Token)
                            → {jobId, token, status: 'processing'} INSTANTLY
  GET  /transcribe/job/{id}?t=… → {status: processing|ready|failed,
                                    text, language, duration, words}

Why tickets: the browser must upload audio DIRECTLY to the worker (pushing
50MB through the Supabase edge function would double-bill bandwidth and
fight body limits), but X-Worker-Token can never appear in client code.
So the edge function — which holds the real token — mints short-lived
one-time tickets, and the browser presents one per upload. Server-to-server
callers (curl, tests, the edge itself) may present X-Worker-Token directly.

Failure isolation: own job dict, own sweeper, own lock — nothing here
touches the video _JOBS store, and vice versa.
"""

from __future__ import annotations

import os
import re
import secrets
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse

from . import engine

router = APIRouter()

WORKER_TOKEN = os.environ.get('WORKER_TOKEN', '')   # '' = open (dev only)

# 16kHz mono WAV ≈ 32KB/s → 100MB ≈ 52 minutes of speech. Plenty for
# talking-head content; keeps a hostile upload from eating the 512MB box.
MAX_AUDIO_BYTES = int(os.environ.get('CAPTIONS_MAX_BYTES', str(100 * 1024 * 1024)))
# Queued uploads wait ON DISK for their turn (one inference at a time) —
# cap running+queued so a burst can't pile temp files, pollers and hours.
_MAX_PENDING = int(os.environ.get('CAPTIONS_MAX_PENDING', '3'))
TICKET_TTL_SECONDS = 600
JOB_TTL_SECONDS = 3600

_CAP_DIR = Path(os.environ.get('CAPTIONS_DIR', str(Path(tempfile.gettempdir()) / 'captions')))
_CAP_DIR.mkdir(parents=True, exist_ok=True)

_JOBS: dict[str, dict] = {}
_JOBS_LOCK = threading.Lock()
_TICKETS: dict[str, float] = {}          # ticket → expires (consumed on use)
_TICKETS_LOCK = threading.Lock()
# One inference at a time — engine._model_lock serializes anyway; this lock
# makes extra jobs WAIT their turn (FIFO) instead of piling up RAM.
_RUN_LOCK = threading.Lock()


def _require_token(x_worker_token: str | None) -> None:
    if WORKER_TOKEN and x_worker_token != WORKER_TOKEN:
        raise HTTPException(status_code=401, detail='bad worker token')


def _mint_ticket() -> str:
    ticket = secrets.token_urlsafe(24)
    with _TICKETS_LOCK:
        now = time.time()
        for stale in [k for k, exp in _TICKETS.items() if exp < now]:
            _TICKETS.pop(stale, None)
        _TICKETS[ticket] = now + TICKET_TTL_SECONDS
    return ticket


def _consume_ticket(ticket: str) -> bool:
    with _TICKETS_LOCK:
        expires = _TICKETS.pop(ticket, None)   # one-time: gone either way
    return expires is not None and expires >= time.time()


def _find_ffmpeg() -> str | None:
    """ffmpeg path: system PATH first, then the pip-bundled imageio-ffmpeg
    binary (same fallback order as the video pipeline in app.py — the
    Render image has no system ffmpeg, but imageio-ffmpeg ships one)."""
    found = shutil.which('ffmpeg')
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _normalize_audio(path: Path) -> Path:
    """Re-encode anything that isn't plain WAV into 16kHz mono PCM WAV.

    faster-whisper decodes via PyAV, which chokes on several browser
    outputs — MediaRecorder WebM/Opus chief among them (PyAV dies with
    AVERROR_INVALIDDATA, "[Errno 1094995529] Invalid data found when
    processing input", on files every desktop player accepts). System
    ffmpeg eats every container PyAV rejects, so run it as a pre-pass.
    Best effort by design: no ffmpeg, or ffmpeg fails → hand back the
    original path unchanged, i.e. exactly the pre-fix behavior."""
    if path.suffix.lower() == '.wav':
        return path          # browser path already uploads 16k mono PCM
    ffmpeg = _find_ffmpeg()
    if not ffmpeg:
        return path
    out = path.with_name(path.name + '.norm.wav')
    try:
        proc = subprocess.run(
            [ffmpeg, '-y', '-hide_banner', '-loglevel', 'error',
             '-i', str(path), '-vn', '-ac', '1', '-ar', '16000',
             '-c:a', 'pcm_s16le', '-f', 'wav', str(out)],
            capture_output=True, text=True, timeout=600,
        )
    except Exception:
        out.unlink(missing_ok=True)
        return path
    if proc.returncode == 0 and out.is_file() and out.stat().st_size > 44:
        return out
    out.unlink(missing_ok=True)
    return path


@router.post('/transcribe/ticket')
def transcribe_ticket(
    x_worker_token: str | None = Header(default=None),
) -> dict:
    """Edge function calls this (with the real token) to mint a one-time
    browser upload grant — keeps X-Worker-Token out of client code."""
    _require_token(x_worker_token)
    return {'ticket': _mint_ticket(), 'expiresIn': TICKET_TTL_SECONDS}


@router.post('/transcribe')
async def transcribe(
    file: UploadFile = File(...),
    ticket: str | None = None,
    x_worker_token: str | None = Header(default=None),
) -> dict:
    """Accept an audio file, answer INSTANTLY with a job id — transcribing
    ten minutes of speech takes minutes, not seconds, and a held-open
    request would die at the ~100s proxy timeout (the /resolve lesson)."""
    if WORKER_TOKEN:
        authorized = (x_worker_token == WORKER_TOKEN) or bool(ticket and _consume_ticket(ticket))
        if not authorized:
            raise HTTPException(status_code=401, detail='bad worker token or ticket')
    elif ticket:
        _consume_ticket(ticket)   # dev mode: burn it anyway so tests match prod

    # Backpressure BEFORE storing anything: reject fast with 429 so the
    # client can say "busy — retry in a minute" and we write zero orphan
    # temp files. (A tiny over-admit race vs. the registration below is
    # acceptable by design — the cap is a guardrail, not a meter.)
    with _JOBS_LOCK:
        pending = sum(1 for m in _JOBS.values() if m.get('status') == 'processing')
    if pending >= _MAX_PENDING:
        raise HTTPException(status_code=429, detail='transcriber busy — try again shortly')

    job_id = secrets.token_urlsafe(12)
    token = secrets.token_urlsafe(16)
    # UploadFile.filename is client-controlled — keep ONLY a sanitized
    # extension (word chars + dot, tiny). The random job_id is the real
    # file name; this is purely a decoder hint, never a trusted path.
    raw_suffix = Path(file.filename or 'audio').suffix or '.wav'
    suffix = re.sub(r'[^\w.]', '', raw_suffix)[:12] or '.wav'
    audio_path = _CAP_DIR / f'{job_id}{suffix}'

    # Stream to disk in 1MB chunks — never hold the upload in RAM (512MB box!).
    size = 0
    try:
        with audio_path.open('wb') as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_AUDIO_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f'audio too large (max {MAX_AUDIO_BYTES // (1024 * 1024)}MB)',
                    )
                out.write(chunk)
    except HTTPException:
        audio_path.unlink(missing_ok=True)
        raise
    except OSError as exc:
        audio_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f'could not store upload: {exc}') from exc
    finally:
        await file.close()

    if size == 0:
        audio_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail='empty upload')

    queued_ahead = _RUN_LOCK.locked()   # advisory: is another job transcribing?
    with _JOBS_LOCK:
        _JOBS[job_id] = {
            'status': 'processing',
            'token': token,
            'path': audio_path,
            'queued_ahead': queued_ahead,
            'expires': time.time() + JOB_TTL_SECONDS,
        }

    threading.Thread(target=_run_job, args=(job_id,), daemon=True).start()
    return {
        'jobId': job_id,
        'token': token,
        'status': 'processing',
        'queuedAhead': queued_ahead,
    }


def _run_job(job_id: str) -> None:
    """Background: wait for the inference slot, transcribe, publish result."""
    job = _JOBS.get(job_id)
    if job is None:   # sweeper won the race — only possible past the 1h TTL
        return
    source_path = Path(job['path'])
    try:
        with _RUN_LOCK:
            result = engine.transcribe(str(_normalize_audio(source_path)))
        with _JOBS_LOCK:
            job.update({
                'status': 'ready',
                'result': result,
                'expires': time.time() + JOB_TTL_SECONDS,
            })
    except Exception as exc:  # noqa: BLE001 — background thread boundary
        with _JOBS_LOCK:
            job.update({
                'status': 'failed',
                'error': str(exc)[:300],
                'expires': time.time() + 600,
            })
    finally:
        # the audio bytes are worthless after transcription — free the disk
        # now (the normalized copy too, when ffmpeg made one)
        source_path.unlink(missing_ok=True)
        source_path.with_name(source_path.name + '.norm.wav').unlink(missing_ok=True)


@router.get('/transcribe/job/{job_id}')
def transcribe_job(job_id: str, t: str) -> dict:
    # No X-Worker-Token here: the BROWSER polls this. The random per-job
    # token from the POST response is the credential (same as /job/{jid}).
    job = _JOBS.get(job_id)
    if not job or job['token'] != t:
        raise HTTPException(status_code=404, detail='unknown job')

    if job['status'] == 'ready':
        return {'status': 'ready', **job['result']}
    if job['status'] == 'failed':
        return {'status': 'failed', 'error': job.get('error') or 'transcribe failed'}
    return {'status': 'processing', 'queuedAhead': bool(job.get('queued_ahead'))}


def _sweeper() -> None:
    while True:
        time.sleep(120)
        now = time.time()
        with _JOBS_LOCK:
            for jid in [j for j, m in _JOBS.items() if m.get('expires', 0) < now]:
                Path(_JOBS[jid]['path']).unlink(missing_ok=True)
                _JOBS.pop(jid, None)


threading.Thread(target=_sweeper, daemon=True).start()


# ── Background matte (/matte) — same ticket pool, own job store ────────────
# The browser's FIRST choice is the in-page @imgly WASM engine (runs on the
# user's CPU, costs the worker nothing); this route is the fallback for
# machines where WASM matting failed or is too slow. Reuses the SAME
# one-time tickets as /transcribe (edge action 'captions-ticket') so no
# edge changes are needed. Own job dict / lock / sweeper: a matte bug must
# never touch transcription state.

MAX_IMAGE_BYTES = int(os.environ.get('MATTE_MAX_BYTES', str(99 * 1024 * 1024)))

_MATTE_JOBS: dict[str, dict] = {}
_MATTE_JOBS_LOCK = threading.Lock()
# rembg inference is serialized inside matte.py (one session at a time on
# the 512MB box); this lock makes extra jobs WAIT their turn, not pile RAM.
_MATTE_RUN_LOCK = threading.Lock()


@router.post('/matte')
async def matte_upload(
    file: UploadFile = File(...),
    ticket: str | None = None,
    x_worker_token: str | None = Header(default=None),
) -> dict:
    """Image → transparent-PNG cutout, same instant-job contract."""
    if WORKER_TOKEN:
        authorized = (x_worker_token == WORKER_TOKEN) or bool(ticket and _consume_ticket(ticket))
        if not authorized:
            raise HTTPException(status_code=401, detail='bad worker token or ticket')
    elif ticket:
        _consume_ticket(ticket)   # dev mode: burn it anyway so tests match prod

    # Shared backpressure: whisper AND rembg fight for the same 512MB, so
    # count BOTH queues before admitting another heavy job.
    with _JOBS_LOCK:
        pending = sum(1 for m in _JOBS.values() if m.get('status') == 'processing')
    with _MATTE_JOBS_LOCK:
        pending += sum(1 for m in _MATTE_JOBS.values() if m.get('status') == 'processing')
    if pending >= _MAX_PENDING:
        raise HTTPException(status_code=429, detail='matte busy — try again shortly')

    job_id = secrets.token_urlsafe(12)
    token = secrets.token_urlsafe(16)
    raw_suffix = Path(file.filename or 'image').suffix or '.png'
    suffix = re.sub(r'[^\w.]', '', raw_suffix)[:12] or '.png'
    image_path = _CAP_DIR / f'{job_id}{suffix}'

    # Stream to disk in 1MB chunks — never hold the upload in RAM.
    size = 0
    try:
        with image_path.open('wb') as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_IMAGE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f'image too large (max {MAX_IMAGE_BYTES // (1024 * 1024)}MB)',
                    )
                out.write(chunk)
    except HTTPException:
        image_path.unlink(missing_ok=True)
        raise
    except OSError as exc:
        image_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f'could not store upload: {exc}') from exc
    finally:
        await file.close()

    if size == 0:
        image_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail='empty upload')

    queued_ahead = _MATTE_RUN_LOCK.locked()
    with _MATTE_JOBS_LOCK:
        _MATTE_JOBS[job_id] = {
            'status': 'processing',
            'token': token,
            'path': image_path,
            'queued_ahead': queued_ahead,
            'expires': time.time() + JOB_TTL_SECONDS,
        }

    threading.Thread(target=_run_matte_job, args=(job_id,), daemon=True).start()
    return {'jobId': job_id, 'token': token, 'status': 'processing', 'queuedAhead': queued_ahead}


def _run_matte_job(job_id: str) -> None:
    """Background: rembg the stored upload → write {input}.out.png."""
    from . import matte as matte_engine   # late: importing rembg is heavy

    job = _MATTE_JOBS.get(job_id)
    if job is None:   # sweeper won the race — only possible past the 1h TTL
        return
    source_path = Path(job['path'])
    out_path = source_path.with_name(source_path.name + '.out.png')
    try:
        with _MATTE_RUN_LOCK:
            png_bytes = matte_engine.remove_subject_png(source_path.read_bytes())
        out_path.write_bytes(png_bytes)
        with _MATTE_JOBS_LOCK:
            job.update({
                'status': 'ready',
                'path': out_path,
                'expires': time.time() + JOB_TTL_SECONDS,
            })
    except Exception as exc:  # noqa: BLE001 — background thread boundary
        out_path.unlink(missing_ok=True)
        with _MATTE_JOBS_LOCK:
            job.update({
                'status': 'failed',
                'error': str(exc)[:300],
                'expires': time.time() + 600,
            })
    finally:
        # INPUT bytes are worthless after matting — free the disk now (the
        # .out.png lives until the browser fetches it or the TTL sweep).
        source_path.unlink(missing_ok=True)


@router.get('/matte/job/{job_id}')
def matte_job(job_id: str, t: str) -> dict:
    # No X-Worker-Token here: the BROWSER polls this; the random per-job
    # token from the POST response is the credential (same as /transcribe).
    job = _MATTE_JOBS.get(job_id)
    if not job or job['token'] != t:
        raise HTTPException(status_code=404, detail='unknown job')

    if job['status'] == 'ready':
        return {'status': 'ready'}
    if job['status'] == 'failed':
        return {'status': 'failed', 'error': job.get('error') or 'matte failed'}
    return {'status': 'processing', 'queuedAhead': bool(job.get('queued_ahead'))}


@router.get('/matte/file/{job_id}')
def matte_file(job_id: str, t: str) -> FileResponse:
    """The cutout PNG — browser fetches with the job token, TTL sweep reaps."""
    job = _MATTE_JOBS.get(job_id)
    if not job or job['token'] != t:
        raise HTTPException(status_code=404, detail='unknown job')
    if job.get('status') != 'ready':
        raise HTTPException(status_code=409, detail='not ready yet')
    path = Path(job['path'])
    if not path.exists():
        raise HTTPException(status_code=410, detail='result expired')
    return FileResponse(path, media_type='image/png', filename='cutout.png')


def _matte_sweeper() -> None:
    while True:
        time.sleep(120)
        now = time.time()
        with _MATTE_JOBS_LOCK:
            for jid in [j for j, m in _MATTE_JOBS.items() if m.get('expires', 0) < now]:
                Path(_MATTE_JOBS[jid]['path']).unlink(missing_ok=True)
                _MATTE_JOBS.pop(jid, None)


threading.Thread(target=_matte_sweeper, daemon=True).start()
