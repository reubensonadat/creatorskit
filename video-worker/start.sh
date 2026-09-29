#!/bin/sh
# CreatorKit Video Worker entrypoint.
#
# The PO-token provider (Node, port 4416) must NEVER block the API from
# booting — Render kills deploys whose port doesn't open fast. So ONE
# background subshell owns pot end-to-end:
#
#   1. BUILD (only if needed): the Docker build's pot step is best-effort
#      and Render's registry cache can resurrect a FAILED layer, so if
#      /pot/build/main.js is missing we rebuild HERE: just tsc when the
#      clone + node_modules survived, else full clone + npm install + tsc.
#   2. SUPERVISE: node has been observed dying minutes after boot; restart
#      it every 3s instead of leaving yt-dlp tokenless forever.
#
# Every step logs to /tmp/pot.log, which /health exposes as pot_log —
# the Edge Function swallows worker errors, so this is our only window.
set -e

(
  if [ ! -f /pot/build/main.js ]; then
    echo "[pot] $(date -u '+%Y-%m-%dT%H:%M:%SZ') build/main.js missing — building at boot" >> /tmp/pot.log
    if [ -d /pot/node_modules ]; then
      ( cd /pot && npx tsc ) >> /tmp/pot.log 2>&1 \
        && echo "[pot] tsc OK" >> /tmp/pot.log \
        || echo "[pot] tsc FAILED — compiler errors above" >> /tmp/pot.log
    else
      ( rm -rf /pot \
        && git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot \
        && cd /pot && npm install --no-audit --no-fund && npx tsc ) >> /tmp/pot.log 2>&1 \
        && echo "[pot] full build OK" >> /tmp/pot.log \
        || echo "[pot] full build FAILED — errors above" >> /tmp/pot.log
    fi
  fi

  if [ -f /pot/build/main.js ]; then
    cd /pot
    while true; do
      echo "[pot] $(date -u '+%Y-%m-%dT%H:%M:%SZ') starting node build/main.js" >> /tmp/pot.log
      code=0
      node build/main.js >> /tmp/pot.log 2>&1 || code=$?
      echo "[pot] $(date -u '+%Y-%m-%dT%H:%M:%SZ') node exited ($code) — restarting in 3s" >> /tmp/pot.log
      sleep 3
    done
  else
    echo "[pot] giving up until next boot — yt-dlp runs without PO tokens" >> /tmp/pot.log
  fi
) &

cd /app
exec uvicorn app:app --host 0.0.0.0 --port "${PORT:-7860}" --proxy-headers --forwarded-allow-ips '*'
