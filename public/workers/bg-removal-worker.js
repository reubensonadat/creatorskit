// public/workers/bg-removal-worker.js
// Dedicated Web Worker — resilient background removal via @imgly/background-removal (CDN ESM).
//
// Every incoming job walks a SELF-HEALING LADDER so a transient network hiccup,
// a GPU driver crash, a corrupted model chunk, or a blocked CDN never ends in a
// dead cutout:
//
//   R1  preferred device + same-origin proxy (/api/imgly/v2n/)
//   R2  alternate device  + same-origin proxy
//   R3  CPU               + staticimgly.com CDN (proxy outage / adblock rules)
//   R4  CPU               + same-origin proxy + alternate model (bad chunk cache)
//
// Failures are classified (network / resource / out-of-memory) and the ladder
// is RE-RANKED after each fall so the most likely fix runs next. All messages
// echo the request `id` so the main-thread bridge can multiplex jobs onto one
// long-lived warm worker.
//
// A `preload` message warms the weights without any inference — used by the
// app to make the FIRST real cut instant.

// IMPORTANT: the lib is loaded DYNAMICALLY so the IndexedDB model cache
// patch below is guaranteed to be installed before any imgly code (and its
// resource fetches) can possibly run.
const IGLY_CDN = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
let imglyModule = null;
const getImgly = async () => {
  if (!imglyModule) imglyModule = await import(IGLY_CDN);
  return imglyModule;
};

const CDN_DATA = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// NOTE: this worker imports the CDN +esm build of @imgly, which bundles
// onnxruntime-web 1.21.0 glue — it MUST be fed the UNPATCHED 1.21 manifest
// (served at /api/imgly/v2n/). Feeding it the patched 1.26 wasm pair raised
// "_OrtGetInputName is not a function" on every session create.
const NETWORK_ERR = /fetch|network|cors|offline|timed?[\s-]?out|aborted|50[234]|load failed|failed to load/i;
const RESOURCE_ERR = /chunk|manifest|checksum|resource|wasm|onnx|ort|metadata|_ort|create session|publicpath/i;
const OOM_ERR = /memory|alloc|out of mem|abort\(|RuntimeError|LinkError|CompileError|RangeError/i;

// ---------------------------------------------------------------------------
// Persistent IndexedDB cache for the AI model chunks.
//
// @imgly/background-removal@1.7.0 ships NO persistent storage: every fresh
// worker would re-download ~40–80 MB of weights. We wrap self.fetch so
// matching resource URLs are (a) served from IndexedDB on hit and (b) written
// to IndexedDB the MOMENT their download completes — resetting/removing the
// photo or reloading the page never costs the user another download.
const MODEL_CACHE_DB = 'ck-imgly-model-cache';
const MODEL_CACHE_STORE = 'chunks';
const MODEL_CACHE_MAX_BYTES = 220 * 1024 * 1024;

function modelCacheShouldIntercept(url) {
  const p = url.pathname || '';
  if (url.origin === self.location.origin && p.includes('/api/imgly/')) return true;
  if (/\.(wasm|onnx)(\?|$)/i.test(p)) return true;
  if (/(^|\.)staticimgly\.com$|(^|\.)cdn\.jsdelivr\.net$|(^|\.)unpkg\.com$/.test(url.hostname) &&
    (p.includes('@imgly/background-removal') || p.includes('onnxruntime'))) return true;
  return false;
}

function modelCacheDb() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(MODEL_CACHE_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(MODEL_CACHE_STORE)) {
          req.result.createObjectStore(MODEL_CACHE_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function modelCacheGet(key) {
  return modelCacheDb().then((db) => {
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const req = db.transaction(MODEL_CACHE_STORE, 'readonly').objectStore(MODEL_CACHE_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

function modelCachePut(key, value) {
  return modelCacheDb().then((db) => {
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(MODEL_CACHE_STORE, 'readwrite');
        tx.objectStore(MODEL_CACHE_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

function installModelIdbCache() {
  const nativeFetch = self.fetch.bind(self);
  self.fetch = async function (input, init) {
    try {
      const url =
        typeof input === 'string' ? new URL(input, self.location.href)
          : input instanceof URL ? input
            : new URL(input.url, self.location.href);
      const isGet =
        typeof input === 'string' || input instanceof URL
          ? !(init && init.method && init.method.toUpperCase() !== 'GET')
          : input.method === 'GET';
      if (isGet && !(init && init.body) && modelCacheShouldIntercept(url)) {
        const hit = await modelCacheGet(url.toString());
        if (hit && hit.blob) {
          return new Response(hit.blob, {
            status: 200,
            headers: {
              'Content-Type': hit.mime || 'application/octet-stream',
              'X-CK-Model-Cache': 'hit',
            },
          });
        }
        const response = await nativeFetch(input, init);
        if (response.ok && response.status === 200) {
          const ct = response.headers.get('Content-Type') || 'application/octet-stream';
          const clone = response.clone();
          clone
            .blob()
            .then((blob) => {
              if (blob.size > 0 && blob.size <= MODEL_CACHE_MAX_BYTES) {
                modelCachePut(url.toString(), { blob, mime: ct, storedAt: Date.now() });
              }
            })
            .catch(() => { /* cache write failure must never break a cut */ });
        }
        return response;
      }
    } catch {
      /* fall through to native fetch */
    }
    return nativeFetch(input, init);
  };
}

installModelIdbCache();

function classifyError(err) {
  const message = (err && (err.message || String(err))) || '';
  if (OOM_ERR.test(message)) return 'oom';
  if (RESOURCE_ERR.test(message) && !NETWORK_ERR.test(message)) return 'resource';
  if (NETWORK_ERR.test(message)) return 'network';
  return 'unknown';
}

let _busy = false;

self.onmessage = async function (event) {
  const { type, id, blob, blobUrl, device, model, publicPath } = event.data || {};
  const reply = (payload) => self.postMessage({ ...payload, id });

  if (type !== 'process' && type !== 'preload') return;

  if (_busy) {
    reply({ type: 'error', message: 'Already processing an image. Please wait.' });
    return;
  }

  _busy = true;

  const origin = self.location && self.location.origin ? self.location.origin : '';
  const localProxy = origin ? `${origin}/api/imgly/v2n/` : CDN_DATA;
  const primaryPath = publicPath || localProxy;
  const altPath = primaryPath.includes('staticimgly.com') ? localProxy : CDN_DATA;
  const requestedModel = model || 'isnet_quint8';
  const altModel = requestedModel === 'isnet_fp16' ? 'isnet_quint8' : 'isnet_fp16';
  const hasGpu = typeof navigator !== 'undefined' && !!navigator.gpu;
  const requestedDevice = device === 'gpu' || device === 'cpu' ? device : hasGpu ? 'gpu' : 'cpu';

  let targetUrl = blobUrl;
  let createdUrl = null;
  if (!targetUrl && blob) {
    try {
      createdUrl = URL.createObjectURL(blob);
      targetUrl = createdUrl;
    } catch {
      targetUrl = blob;
    }
  }

  const runWithConfig = async (attempt) =>
    (await getImgly()).removeBackground(targetUrl || blob, {
      device: attempt.device,
      model: attempt.model,
      publicPath: attempt.path,
      proxyToWorker: false, // crucial: avoid nested worker spawning
      debug: false,
      progress: (key, current, total) => {
        const phase = key.split(':')[0];
        const currentMB = (current / (1024 * 1024)).toFixed(1);
        const totalMB = (total / (1024 * 1024)).toFixed(1);
        const pct = total > 0 ? Math.round((current / total) * 100) : -1;
        self.postMessage({
          type: 'progress',
          id,
          phase,
          message: total > 0 ? `${phase} — ${currentMB} MB / ${totalMB} MB` : `${phase}…`,
          current,
          total,
          pct,
          device: attempt.device,
          route: attempt.label,
        });
      },
      output: { format: 'image/png' },
    });

  try {
    reply({
      type: 'progress',
      phase: 'init',
      message: type === 'preload' ? 'Pre-loading AI engine…' : 'Starting AI cutout model…',
      current: 0,
      total: 0,
      pct: 0,
      device: requestedDevice,
    });

    // ---- prewarm-only job: fetch weights, skip inference entirely ----
    if (type === 'preload') {
      const warm = async (path) => {
        const lib = await getImgly();
        return typeof lib.preload === 'function'
          ? lib.preload({ publicPath: path, device: 'cpu' })
          : runWithConfig({ device: 'cpu', model: requestedModel, path, label: 'warmup' });
      };
      try {
        await warm(primaryPath);
      } catch (err) {
        console.warn('[bgRemovalWorker] Preload via proxy failed, trying CDN:', err);
        await sleep(700);
        await warm(altPath);
      }
      reply({ type: 'done', device: 'cpu' });
      return;
    }

    // ---- full cutout ladder ----
    const ladder = [
      { device: requestedDevice, path: primaryPath, model: requestedModel, label: `${requestedDevice.toUpperCase()} + local engine`, weight: 0 },
      { device: requestedDevice === 'gpu' ? 'cpu' : 'gpu', path: primaryPath, model: requestedModel, label: 'backup device + local engine', weight: 1 },
      { device: 'cpu', path: altPath, model: requestedModel, label: 'CPU + CDN engine', weight: 2 },
      { device: 'cpu', path: primaryPath, model: altModel, label: 'CPU + backup model', weight: 3 },
    ].filter((attempt) => attempt.device !== 'gpu' || hasGpu);

    let lastError = null;
    let resultBlob = null;

    while (ladder.length > 0) {
      ladder.sort((a, b) => a.weight - b.weight); // stable → ties keep original order
      const attempt = ladder.shift();
      try {
        resultBlob = await runWithConfig(attempt);
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[bgRemovalWorker] Attempt "${attempt.label}" failed:`, err && err.message ? err.message : err);
        const kind = classifyError(err);
        // Re-rank the remaining rungs toward whatever this failure suggests.
        for (const remaining of ladder) {
          if (kind === 'network') {
            if (remaining.path !== attempt.path) remaining.weight -= 2;
          } else if (kind === 'oom') {
            if (remaining.device === 'cpu') remaining.weight -= 2;
            if (remaining.model !== attempt.model) remaining.weight -= 1;
            if (remaining.device === 'gpu') remaining.weight += 3;
          } else if (kind === 'resource') {
            if (remaining.model !== attempt.model) remaining.weight -= 2;
            if (remaining.path !== attempt.path) remaining.weight -= 1;
          }
        }
        if (ladder.length > 0) {
          await sleep(700); // let transient network blips recover
          reply({
            type: 'progress',
            phase: 'init',
            message: `Switching engine (${ladder[0].label})…`,
            current: 0,
            total: 0,
            pct: 0,
            device: ladder[0].device,
          });
        }
      }
    }

    if (!resultBlob) {
      reply({
        type: 'error',
        message: lastError && lastError.message ? lastError.message : String(lastError || 'unknown engine failure'),
      });
      return;
    }

    reply({ type: 'done', blob: resultBlob, device: requestedDevice });
  } catch (err) {
    console.error('[bgRemovalWorker] Fatal failure:', err);
    reply({ type: 'error', message: err && err.message ? err.message : String(err) });
  } finally {
    if (createdUrl) {
      try { URL.revokeObjectURL(createdUrl); } catch { }
    }
    _busy = false;
  }
};
