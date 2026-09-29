# CreatorKit Video Worker — Phase-2 resolver muscle.
# Runs anywhere Docker runs: Hugging Face Space (free), a VPS, or a laptop.
FROM python:3.12-slim

# ffmpeg merges YouTube's split video+audio streams (and encodes MP3s);
# node powers the bgutil PO-token provider that keeps YouTube from
# blocking our datacenter IP.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg nodejs npm git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python side: the API + yt-dlp + the POT plugin (plugin half)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Node side of the PO-token provider (the server the plugin calls on
# 127.0.0.1:4416). Retries the flaky network steps, but DON'T trust this
# alone: Render's registry cache can resurrect a FAILED layer as "good"
# (the || echo makes the step exit 0, so the broken state gets cached and
# no marker ever prints again). start.sh re-verifies at boot and rebuilds
# in the background if build/main.js is missing — output lands in
# /tmp/pot.log, which /health exposes as pot_log.
RUN (git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot \
 || (rm -rf /pot && sleep 3 \
     && git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot)) \
 && cd /pot \
 && (npm install --no-audit --no-fund || npm install --no-audit --no-fund) \
 && npx tsc \
 && echo "POT_BUILD_OK") \
 || echo "POT_BUILD_FAILED - start.sh retries at boot (see /health pot_log)"

COPY app.py start.sh ./
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
