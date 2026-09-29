"""
CreatorKit Video Worker — the Phase-2 "muscle".

Runs yt-dlp (armed with the bgutil PO-token provider so datacenter IPs
survive YouTube's checks) and answers the supervisor Edge Function:

  POST /formats {url}              → which resolutions are downloadable
  POST /resolve {url, variantId?}  → starts a background job, returns
                                     {jobId, token} INSTANTLY (a held-open
                                     request dies at ~100s behind Cloudflare)
  GET  /job/{id}?t=<token>         → {status: processing|ready|failed, ...}
  GET  /file/{id}?t=<token>        → the bytes (Range supported)
  GET  /health                     → keep-alive ping target

Everything is protected by the X-Worker-Token header (set WORKER_TOKEN both
here and in Supabase: `supabase secrets set VIDEO_WORKER_TOKEN=...`).

Deploy: any Docker host (Render free tier) or bare Python (`python app.py`).
See README.md in this folder.
"""

from __future__ import annotations

import json
import os
import re
import secrets
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request
from pathlib import Path
from typing import Iterator, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from yt_dlp import version as ytdlp_version

# ── Config ────────────────────────────────────────────────────────────────

GRAB_DIR = Path(os.environ.get('GRAB_DIR', str(Path(tempfile.gettempdir()) / 'grab')))
JOB_TTL_SECONDS = int(os.environ.get('JOB_TTL_SECONDS', '900'))   # files live 15 min
RESOLVE_TIMEOUT = int(os.environ.get('RESOLVE_TIMEOUT', '420'))   # per yt-dlp run (slow home hosts)
DEFAULT_HEIGHT = int(os.environ.get('DEFAULT_HEIGHT', '720'))     # when user didn't pick
WORKER_TOKEN = os.environ.get('WORKER_TOKEN', '')                 # '' = open (dev only)
PUBLIC_BASE = os.environ.get('PUBLIC_BASE_URL', '')               # override base URL if behind proxy quirks
YTDLP = 'yt-dlp'

GRAB_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title='CreatorKit Video Worker', docs_url=None, redoc_url=None, openapi_url=None)

# The browser itself polls /job and fetches /file after a "pending" handoff
# (slow jobs outlive the edge function's time budget) — so these two routes
# must be readable cross-origin. The per-job token is the credential.
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['GET'],
    allow_headers=['*'],
)

# job record: {status, token, expires, dir?, path?, name?, size?, mime?, kind?,
#              variant_id?, label?, error?}
_JOBS: dict[str, dict] = {}
_JOBS_LOCK = threading.Lock()
# One download at a time: free tiers have ~2 vCPUs and this keeps merges smooth.
_YTDLP_LOCK = threading.Lock()

# Diagnostics surfaced via the OPEN /health route: the Edge Function collapses
# worker errors to "worker_502" (it discards our JSON body), so /health is the
# only window into WHICH wall YouTube served and WHY the pot provider died.
_BOOT_AT = time.time()
POT_LOG = Path(os.environ.get('POT_LOG', '/tmp/pot.log'))
_LAST_YTDLP_ERROR: dict[str, str] = {}
_LAST_ERR_LOCK = threading.Lock()

MIME_BY_EXT = {
    'mp4': 'video/mp4', 'webm': 'video/webm', 'mkv': 'video/x-matroska',
    'mp3': 'audio/mpeg', 'm4a': 'audio/mp4', 'ogg': 'audio/ogg', 'opus': 'audio/opus',
}


def _ffmpeg_args() -> list[str]:
    """Find ffmpeg: system PATH first, then the pip-bundled binary
    (imageio-ffmpeg) — lets this run on bare Windows / Render / a laptop
    with no system-wide ffmpeg install."""
    if shutil.which('ffmpeg'):
        return []
    try:
        import imageio_ffmpeg
        return ['--ffmpeg-location', imageio_ffmpeg.get_ffmpeg_exe()]
    except Exception:
        return []


FFMPEG_ARGS = _ffmpeg_args()


# ── Helpers ───────────────────────────────────────────────────────────────

# YouTube bot-walls datacenter IPs (Render/AWS). Two counters:
#  1. the bgutil PO-token provider (Node, 127.0.0.1:4416 — see Dockerfile);
#  2. a cookies.txt mounted as a Render SECRET FILE at /etc/secrets/cookies.txt
#     (exported from a logged-in browser; absent locally → args stay empty).
COOKIES_PATH = os.environ.get('COOKIES_PATH', '/etc/secrets/cookies.txt')
# yt-dlp WRITES rotated cookies back to the file it reads (--cookies loads AND
# saves the jar — YouTube rotates session tokens mid-session). Render mounts
# Secret Files read-only, so handing yt-dlp the secret path directly dies with
# "OSError: [Errno 30] Read-only file system". Fix: keep a WRITABLE working
# copy under /tmp and RE-COPY from the secret on EVERY call — a rotation that
# YouTube rejected would otherwise poison the jar with stale tokens whose
# mtime is always newer than the secret's, out-living every retry and every
# re-paste until a full container restart.
_COOKIES_WORK = Path(tempfile.gettempdir()) / 'grab' / 'cookies.txt'


def _cookie_args() -> list[str]:
    try:
        src = Path(COOKIES_PATH)
        if not src.is_file():
            return []
        work = _COOKIES_WORK
        work.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, work)
        return ['--cookies', str(work)]
    except OSError:
        return []


def _pot_status() -> str:
    """Is the bgutil PO-token provider (127.0.0.1:4416) answering?"""
    try:
        with urllib.request.urlopen('http://127.0.0.1:4416/ping', timeout=0.8) as r:
            return 'up' if r.status == 200 else f'http_{r.status}'
    except Exception:
        return 'down'


def _require_token(x_worker_token: Optional[str]) -> None:
    if WORKER_TOKEN and x_worker_token != WORKER_TOKEN:
        raise HTTPException(status_code=401, detail='bad worker token')


def _safe_name(raw: str, fallback: str = 'video') -> str:
    name = re.sub(r"[^\w\-. ]+", '_', raw).strip().strip('.')
    return name[:80] or fallback


# YouTube playability walls ("The page needs to be reloaded", "Sign in to
# confirm you're not a bot") are per-client: replaying the SAME request
# through a DIFFERENT innertube client often clears them. Auth already
# passes via cookies — these are the last-mile interstitials.
_CLIENT_FALLBACKS = [
    [],  # yt-dlp's default client first
    ['--extractor-args', 'youtube:player_client=tv'],
    ['--extractor-args', 'youtube:player_client=web_embedded'],
]
_PLAYABILITY_HINTS = ('needs to be reloaded', 'sign in to confirm', 'not a bot')


def _tail_of(proc: 'subprocess.CompletedProcess[str]') -> str:
    return ' | '.join((proc.stderr or proc.stdout or '').strip().splitlines()[-3:])[:400]


def _record_ytdlp_error(tail: str) -> None:
    with _LAST_ERR_LOCK:
        _LAST_YTDLP_ERROR.clear()
        _LAST_YTDLP_ERROR.update({
            'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'detail': tail[:400],
        })


def _pot_log_tail(lines: int = 25) -> str:
    """Last lines of the PO-token provider's log (written by start.sh's
    supervisor) — tells us WHY it crashed/restarted."""
    try:
        text = POT_LOG.read_text(errors='replace').strip()
        return '\n'.join(text.splitlines()[-lines:])[:1500]
    except OSError:
        return ''


def _is_playability_wall(msg: str) -> bool:
    low = msg.lower()
    return any(h in low for h in _PLAYABILITY_HINTS)


def _run_ytdlp(args: list[str], url: str, timeout: int) -> None:
    """Run yt-dlp; on a playability wall, retry through alternate clients."""
    last = 'yt-dlp failed'
    for client_args in _CLIENT_FALLBACKS:
        try:
            proc = subprocess.run(
                [YTDLP, *args, *client_args, url],
                capture_output=True, text=True, timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail='yt-dlp timed out on this video')
        if proc.returncode == 0:
            return
        last = _tail_of(proc) or last
        if not _is_playability_wall(last):
            break  # hard error (gone/private/unsupported) — a new client won't help
    _record_ytdlp_error(last)
    raise HTTPException(status_code=502, detail=last)


def _probe_meta(url: str) -> dict:
    last = 'yt-dlp failed'
    for client_args in _CLIENT_FALLBACKS:
        try:
            proc = subprocess.run(
                [YTDLP, '--no-playlist', '--no-check-formats', '--no-warnings', '--skip-download',
                 *_cookie_args(), *client_args, '-J', url],
                capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail='yt-dlp timed out reading metadata')
        if proc.returncode == 0:
            try:
                return json.loads(proc.stdout)
            except json.JSONDecodeError:
                raise HTTPException(status_code=502, detail='could not read video metadata')
        last = _tail_of(proc) or last
        if not _is_playability_wall(last):
            break
    _record_ytdlp_error(last)
    raise HTTPException(status_code=502, detail=last)


def _variant_list(info: dict) -> list[dict]:
    """Turn yt-dlp's format dump into the sheet's variant rows."""
    formats = info.get('formats') or []
    by_height: dict[int, dict] = {}
    best_audio: Optional[dict] = None
    for f in formats:
        if f.get('vcodec') not in (None, 'none') and f.get('height'):
            h = int(f['height'])
            cur = by_height.get(h)
            score = (f.get('filesize') or f.get('filesize_approx') or 0) + (f.get('tbr') or 0)
            cur_score = 0 if not cur else (cur.get('filesize') or 0) + (cur.get('tbr') or 0)
            if not cur or (f.get('ext') == 'mp4' and cur.get('ext') != 'mp4') or score > cur_score:
                by_height[h] = f
        if (f.get('acodec') not in (None, 'none')) and (not f.get('vcodec') or f.get('vcodec') == 'none'):
            if not best_audio or (f.get('abr') or 0) > (best_audio.get('abr') or 0):
                best_audio = f

    variants: list[dict] = []
    for h in sorted(by_height, reverse=True):
        v = by_height[h]
        audio_bytes = (best_audio or {}).get('filesize') or (best_audio or {}).get('filesize_approx') or 0
        video_bytes = v.get('filesize') or v.get('filesize_approx') or 0
        variants.append({
            'id': f'v{h}',
            'label': f'{h}p · MP4',
            'kind': 'video',
            'sizeBytes': int(video_bytes + audio_bytes) if (video_bytes or audio_bytes) else None,
        })
    if best_audio:
        a_bytes = best_audio.get('filesize') or best_audio.get('filesize_approx')
        variants.append({
            'id': 'audio',
            'label': 'Audio only · MP3',
            'kind': 'audio',
            'sizeBytes': int(a_bytes) if a_bytes else None,
        })
    if not variants:
        raise HTTPException(status_code=422, detail='no downloadable formats found')
    return variants


def _sweep_jobs() -> None:
    """Delete finished jobs (and their files) once their TTL is up."""
    now = time.time()
    with _JOBS_LOCK:
        expired = [jid for jid, j in _JOBS.items() if j.get('expires', now + 1e9) < now]
        for jid in expired:
            shutil.rmtree(_JOBS[jid].get('dir') or '', ignore_errors=True)
            _JOBS.pop(jid, None)


def _sweeper_loop() -> None:
    while True:
        time.sleep(60)
        try:
            _sweep_jobs()
        except Exception:
            pass


threading.Thread(target=_sweeper_loop, daemon=True).start()


# ── The background resolve job ────────────────────────────────────────────

def _run_resolve_job(jid: str, url: str, variant_id: str, base: str) -> None:
    """Download + merge in the background; flip the job to ready/failed."""
    job = _JOBS[jid]
    try:
        kind = 'audio' if variant_id == 'audio' else 'video'
        if kind == 'video':
            m = re.match(r'v(\d+)', variant_id)
            height = int(m.group(1)) if m else DEFAULT_HEIGHT
            args = [
                '-f', f'bv*[height<={height}]+ba/b[height<={height}]',
                '--merge-output-format', 'mp4',
            ]
            label = f'{height}p · MP4'
        else:
            args = ['-x', '--audio-format', 'mp3', '--audio-quality', '0']
            label = 'Audio · MP3'

        with _YTDLP_LOCK:
            _run_ytdlp(
                [
                    '--no-playlist', '--no-warnings', '--no-progress',
                    *_cookie_args(), *args, *FFMPEG_ARGS,
                    '-o', str(job['dir'] / '%(title).80s.%(ext)s'),
                ],
                url,
                timeout=RESOLVE_TIMEOUT,
            )

        files = [p for p in job['dir'].iterdir() if p.is_file()]
        if not files:
            raise RuntimeError('yt-dlp produced no file')
        final = max(files, key=lambda p: p.stat().st_size)
        ext = final.suffix.lstrip('.').lower() or ('mp3' if kind == 'audio' else 'mp4')
        size = final.stat().st_size
        stream_url = f'{base}/file/{jid}?t={job["token"]}'

        with _JOBS_LOCK:
            job.update({
                'status': 'ready',
                'path': final,
                'name': final.name,
                'size': size,
                'mime': MIME_BY_EXT.get(ext, 'application/octet-stream'),
                'kind': kind,
                'label': label,
                'variant_id': variant_id or ('audio' if kind == 'audio' else 'original'),
                'stream_url': stream_url,
                'expires': time.time() + JOB_TTL_SECONDS,
            })
    except Exception as exc:  # noqa: BLE001 — background thread boundary
        with _JOBS_LOCK:
            job.update({'status': 'failed', 'error': str(exc)[:300], 'expires': time.time() + 300})
        shutil.rmtree(job.get('dir') or '', ignore_errors=True)


# ── Models ────────────────────────────────────────────────────────────────

class ResolveBody(BaseModel):
    url: str
    variantId: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────

@app.get('/')
@app.get('/health')
def health() -> dict:
    """Open on purpose: cron-job.org pings this so free hosts never sleep."""
    with _LAST_ERR_LOCK:
        last_error = dict(_LAST_YTDLP_ERROR) or None
    return {
        'ok': True,
        'service': 'creatorkit-video-worker',
        'ytdlp': ytdlp_version.__version__,
        'pot': _pot_status(),
        'pot_log': _pot_log_tail(),
        'cookies': bool(_cookie_args()),
        'jobs': len(_JOBS),
        'uptime_s': int(time.time() - _BOOT_AT),
        'last_error': last_error,
    }


# Format lists are expensive — yt-dlp must interrogate the platform for every
# quality's size. Cache them so repeat links answer instantly (10 min TTL).
_FORMATS_CACHE: dict[str, tuple[float, dict]] = {}
_FORMATS_LOCK = threading.Lock()
FORMATS_TTL_SECONDS = 600


def _formats_payload(url: str) -> dict:
    key = url.strip().lower()
    now = time.time()
    with _FORMATS_LOCK:
        hit = _FORMATS_CACHE.get(key)
        if hit and now - hit[0] < FORMATS_TTL_SECONDS:
            return hit[1]
    info = _probe_meta(url)
    payload = {
        'title': _safe_name(info.get('title') or 'video'),
        'variants': _variant_list(info),
    }
    with _FORMATS_LOCK:
        _FORMATS_CACHE[key] = (now, payload)
        if len(_FORMATS_CACHE) > 64:
            for old in sorted(_FORMATS_CACHE, key=lambda k: _FORMATS_CACHE[k][0])[:-64]:
                _FORMATS_CACHE.pop(old, None)
    return payload


@app.post('/formats')
def formats(
    body: ResolveBody,
    x_worker_token: Optional[str] = Header(default=None),
) -> dict:
    _require_token(x_worker_token)
    return _formats_payload(body.url)


@app.post('/resolve')
def resolve(
    body: ResolveBody,
    request: Request,
    x_worker_token: Optional[str] = Header(default=None),
) -> dict:
    """Kick off the download job and answer INSTANTLY with a job id.

    The supervisor polls GET /job/{id} — this avoids the ~100s proxy timeout
    (Cloudflare 524) that killed held-open resolve requests.
    """
    _require_token(x_worker_token)

    jid = secrets.token_urlsafe(12)
    out_dir = GRAB_DIR / jid
    out_dir.mkdir(parents=True, exist_ok=True)
    token = secrets.token_urlsafe(16)
    base = PUBLIC_BASE.rstrip('/') if PUBLIC_BASE else str(request.base_url).rstrip('/')

    with _JOBS_LOCK:
        _JOBS[jid] = {'status': 'processing', 'token': token, 'dir': out_dir, 'base': base,
                      'expires': time.time() + 1800}

    threading.Thread(
        target=_run_resolve_job, args=(jid, body.url, body.variantId or '', base), daemon=True,
    ).start()

    return {'jobId': jid, 'token': token, 'status': 'processing'}


@app.get('/job/{jid}')
def job_status(
    jid: str,
    t: str,
) -> dict:
    # No X-Worker-Token here: the BROWSER polls this after a pending handoff.
    # The random per-job token above is the credential.
    job = _JOBS.get(jid)
    if not job or job['token'] != t:
        raise HTTPException(status_code=404, detail='unknown job')

    if job['status'] == 'ready':
        return {
            'status': 'ready',
            'streamUrl': job['stream_url'],
            'filename': job['name'],
            'kind': job['kind'],
            'sizeBytes': job['size'],
            'variants': [{
                'id': job['variant_id'],
                'label': job['label'],
                'kind': job['kind'],
                'streamUrl': job['stream_url'],
                'sizeBytes': job['size'],
            }],
        }
    if job['status'] == 'failed':
        return {'status': 'failed', 'error': job.get('error') or 'resolve failed'}
    return {'status': 'processing'}


def _file_iterator(path: Path, start: int, length: int, chunk: int = 256 * 1024) -> Iterator[bytes]:
    with path.open('rb') as f:
        f.seek(start)
        remaining = length
        while remaining > 0:
            data = f.read(min(chunk, remaining))
            if not data:
                break
            remaining -= len(data)
            yield data


@app.get('/file/{jid}')
def file_bytes(
    jid: str,
    t: str,
    request: Request,
):
    # No X-Worker-Token here: the BROWSER downloads directly after a pending
    # handoff. The random per-job token above is the credential.
    job = _JOBS.get(jid)
    if not job or job['token'] != t or job.get('status') != 'ready':
        raise HTTPException(status_code=404, detail='unknown download')
    if time.time() > job['expires']:
        raise HTTPException(status_code=410, detail='download expired')

    size = job['size']
    range_header = request.headers.get('range')
    headers = {
        'Accept-Ranges': 'bytes',
        'Content-Disposition': f'attachment; filename="{_safe_name(job["name"], "download")}"',
        'Cache-Control': 'no-store',
    }

    if range_header:
        m = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if m:
            start = int(m.group(1))
            end = min(int(m.group(2)) if m.group(2) else size - 1, size - 1)
            if start > end or start >= size:
                return StreamingResponse(iter([]), status_code=416, headers={
                    **headers, 'Content-Range': f'bytes */{size}',
                })
            return StreamingResponse(
                _file_iterator(job['path'], start, end - start + 1),
                status_code=206,
                headers={**headers, 'Content-Length': str(end - start + 1),
                         'Content-Range': f'bytes {start}-{end}/{size}'},
                media_type=job['mime'],
            )

    return StreamingResponse(
        _file_iterator(job['path'], 0, size),
        status_code=200,
        headers={**headers, 'Content-Length': str(size)},
        media_type=job['mime'],
    )


if __name__ == '__main__':
    # Local run without Docker:  python app.py  →  http://localhost:8000
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', '8000')))
