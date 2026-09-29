#!/bin/sh
# Mirror of the captions-bake RUN in workers/Dockerfile — for `sh -n` only.
( (mkdir -p /models/captions \
      && python -c "from faster_whisper import WhisperModel; WhisperModel('base.en', device='cpu', compute_type='int8', download_root='/models/captions'); print('CAPTIONS_MODEL_BAKED')") \
     || echo "CAPTIONS_BAKE_FAILED - engine.py downloads at first use" ) \
 && (chown -R 1000:1000 /models 2>/dev/null || true)
