#!/bin/sh
# CreatorKit Video Worker entrypoint.
# 1. SUPERVISED start of the PO-token provider (Node, port 4416). Observed on
#    Render: the server is up right after boot, then dies within minutes.
#    A one-shot nohup left it dead forever; this wrapper restarts it every 3s
#    and timestamps every exit into /tmp/pot.log (surfaced via /health).
# 2. Serve the API on $PORT (Hugging Face Spaces use 7860).
set -e

if [ -f /pot/build/main.js ]; then
  cd /pot
  (
    while true; do
      echo "[pot-supervisor] $(date -u '+%Y-%m-%dT%H:%M:%SZ') starting node build/main.js" >> /tmp/pot.log
      code=0
      node build/main.js >> /tmp/pot.log 2>&1 || code=$?
      echo "[pot-supervisor] $(date -u '+%Y-%m-%dT%H:%M:%SZ') node exited ($code) — restarting in 3s" >> /tmp/pot.log
      sleep 3
    done
  ) &
  echo "PO-token provider supervised (log: /tmp/pot.log)"
else
  echo "PO-token provider not built — continuing without it."
fi

cd /app
exec uvicorn app:app --host 0.0.0.0 --port "${PORT:-7860}" --proxy-headers --forwarded-allow-ips '*'
