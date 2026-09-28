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
# 127.0.0.1:4416). Best-effort: if it ever fails to build, the image
# still works — yt-dlp just faces moodier YouTube checks.
RUN git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot \
 && cd /pot && npm install --no-audit --no-fund && npx tsc || true

COPY app.py start.sh ./
RUN chmod +x start.sh \
 && useradd -m -u 1000 user \
 && mkdir -p /tmp/grab \
 && chown -R user:user /app /pot /tmp/grab

# Hugging Face Spaces expect a non-root user on port 7860.
USER user
ENV PORT=7860
EXPOSE 7860

CMD ["./start.sh"]
