#!/bin/sh
# CreatorKit Video Worker entrypoint.
# 1. Best-effort start of the PO-token provider (Node, port 4416).
# 2. Serve the API on $PORT (Hugging Face Spaces use 7860).
set -e

if [ -f /pot/build/main.js ]; then
  cd /pot
  nohup node build/main.js > /tmp/pot.log 2>&1 &
  echo "PO-token provider starting (log: /tmp/pot.log)"
else
  echo "PO-token provider not built — continuing without it."
fi

cd /app
exec uvicorn app:app --host 0.0.0.0 --port "${PORT:-7860}" --proxy-headers --forwarded-allow-ips '*'
