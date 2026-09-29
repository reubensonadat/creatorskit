( (git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot \
      || (rm -rf /pot && sleep 3 \
          && git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot)) \
     && cd /pot/server \
     && (npm install --no-audit --no-fund || npm install --no-audit --no-fund) \
     && npx tsc \
     && echo "POT_BUILD_OK") \
 || echo "POT_BUILD_FAILED - start.sh retries at boot (see /health pot_log)"
