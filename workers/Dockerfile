# CreatorKit Workers — the all-in-one Docker service.
# Render Root Directory = workers/ (one service, route-module isolation).
# Runs anywhere Docker runs: Render free tier (the DECISION — see
# docs/AUDIO_TRANSCRIPTION_PLAN.md), a VPS, or a laptop.
FROM python:3.12-slim

# ffmpeg merges YouTube's split video+audio streams (and encodes MP3s).
# Node (installed below) powers the bgutil PO-token provider that keeps
# YouTube from blocking our datacenter IP.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg git ca-certificates curl xz-utils \
 && rm -rf /var/lib/apt/lists/*

# The bgutil pot server declares "engines": node >=22. Debian slim ships
# Node 18, which the server (express 5, jsdom 29, youtubei.js 18) refuses
# or crashes on. Official Node 22 tarball into /usr/local shadows any
# system node — pinned so the layer cache stays deterministic.
RUN curl -fsSL https://nodejs.org/dist/v22.17.0/node-v22.17.0-linux-x64.tar.xz \
 | tar -xJ -C /usr/local --strip-components=1 \
 && node --version \
 && npm --version

WORKDIR /app

# Python side: the API + yt-dlp + the POT plugin (plugin half) + the
# captions stack (faster-whisper decodes audio via its bundled PyAV).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Node side of the PO-token provider (the server the plugin calls on
# 127.0.0.1:4416). IMPORTANT: upstream's server lives in the repo's
# SERVER/ subdirectory — package.json + tsconfig are NOT at the repo
# root (npm ENOENT on /pot/package.json was the long-hidden failure).
# tsc emits /pot/server/build/main.js. Best-effort with retries, but
# DON'T trust this alone: Render's registry cache can resurrect a FAILED
# layer as "good" (the || echo makes the step exit 0). start.sh
# re-verifies at boot and rebuilds in the background if main.js is
# missing — output lands in /tmp/pot.log, exposed via /health pot_log.
RUN ( (git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot \
      || (rm -rf /pot && sleep 3 \
          && git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot)) \
     && cd /pot/server \
     && (npm install --no-audit --no-fund || npm install --no-audit --no-fund) \
     && npx tsc \
     && echo "POT_BUILD_OK") \
 || echo "POT_BUILD_FAILED - start.sh retries at boot (see /health pot_log)"

# Auto-captions model — BAKED at build (Render's disk is ephemeral, so a
# runtime download would repeat on EVERY boot). Whisper base.en int8 is
# ~78MB → fits the 512MB plan with room to run. Same marker pattern as the
# pot build: a failed download must not kill the deploy; engine.py then
# downloads at first use (dir is chowned to uid 1000 for exactly that)
# and /health captions.baked tells us which path we're on.
ENV WHISPER_MODELS_DIR=/models/captions
RUN ( (mkdir -p /models/captions \
      && python -c "from faster_whisper import WhisperModel; WhisperModel('base.en', device='cpu', compute_type='int8', download_root='/models/captions'); print('CAPTIONS_MODEL_BAKED')") \
     || echo "CAPTIONS_BAKE_FAILED - engine.py downloads at first use" ) \
 && (chown -R 1000:1000 /models 2>/dev/null || true)

COPY app.py start.sh ./
COPY captions ./captions/
RUN chmod +x start.sh \
 && useradd -m -u 1000 user \
 && mkdir -p /tmp/grab \
 && chown -R user:user /app /tmp/grab \
 && (chown -R user:user /pot 2>/dev/null || true)

# Hugging Face Spaces expect a non-root user on port 7860.
USER user
ENV PORT=7860
EXPOSE 7860

CMD ["./start.sh"]
