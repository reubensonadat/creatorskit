/**
 * Persistent IndexedDB cache for the local background-removal AI model.
 *
 * @imgly/background-removal@1.7.0 ships NO persistent storage: every fresh
 * page load re-downloads ~40–80 MB of model chunks via plain fetch(). We
 * transparently wrap window.fetch so matching resource URLs are
 *
 *   (a) served straight from IndexedDB on cache hit, and
 *   (b) written to IndexedDB the MOMENT their download completes.
 *
 * Resetting/removing the photo or reloading the page therefore never costs
 * the user another model download. The dedicated worker carries its own
 * self-contained copy of this logic (public/workers/bg-removal-worker.js)
 * because it runs in a separate JS realm.
 *
 * Every intercepted request that misses the cache still streams through the
 * native fetch untouched, so progress reporting and the proxy's stall
 * watchdog keep working exactly as before.
 */

const DB_NAME = 'ck-imgly-model-cache';
const STORE = 'chunks';
const MAX_CACHED_BYTES = 220 * 1024 * 1024;

interface CachedChunk {
    blob: Blob;
    mime: string;
    storedAt: number;
}

let patched = false;
let dbPromise: Promise<IDBDatabase | null> | null = null;

/** Only model-ish binaries and version-pinned manifests are worth caching. */
function shouldIntercept(url: URL): boolean {
    const p = url.pathname;
    if (url.origin === window.location.origin && p.includes('/api/imgly/')) return true;
    if (/\.(wasm|onnx)(\?|$)/i.test(p)) return true;
    const host = url.hostname;
    if (!/(^|\.)staticimgly\.com$|(^|\.)cdn\.jsdelivr\.net$|(^|\.)unpkg\.com$/.test(host)) {
        return false;
    }
    return p.includes('@imgly/background-removal') || p.includes('onnxruntime');
}

function openDb(): Promise<IDBDatabase | null> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(STORE)) {
                    req.result.createObjectStore(STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
    return dbPromise;
}

function idbGet(key: string): Promise<CachedChunk | null> {
    return openDb().then((db) => {
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
                req.onsuccess = () => resolve((req.result as CachedChunk) || null);
                req.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    });
}

function idbPut(key: string, value: CachedChunk): Promise<void> {
    return openDb().then((db) => {
        if (!db) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).put(value, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch {
                resolve();
            }
        });
    });
}

/**
 * Idempotently wraps window.fetch. Must be installed before the first
 * background-removal call on the main thread (the bundled lib resolves its
 * resources lazily at inference time, never at import time).
 */
export function ensureModelFetchPatch(): void {
    if (patched || typeof window === 'undefined') return;
    patched = true;

    const nativeFetch = window.fetch.bind(window);

    // Best effort: ask the browser to mark this origin's storage persistent so
    // the downloaded model survives eviction pressure.
    try {
        void navigator.storage?.persist?.().catch(() => undefined);
    } catch {
        /* storage API unavailable — ignore */
    }

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        try {
            const url =
                typeof input === 'string'
                    ? new URL(input, window.location.href)
                    : input instanceof URL
                        ? input
                        : new URL(input.url, window.location.href);
            const isGet =
                typeof input === 'string' || input instanceof URL
                    ? !(init && init.method && init.method.toUpperCase() !== 'GET')
                    : input.method === 'GET';
            if (isGet && !init?.body && shouldIntercept(url)) {
                const key = url.toString();
                const hit = await idbGet(key);
                if (hit && hit.blob) {
                    return new Response(hit.blob, {
                        status: 200,
                        headers: {
                            'Content-Type': hit.mime || 'application/octet-stream',
                            'X-CK-Model-Cache': 'hit',
                        },
                    });
                }
                const response = await nativeFetch(input as RequestInfo, init);
                if (response.ok && response.status === 200) {
                    const ct = response.headers.get('Content-Type') || 'application/octet-stream';
                    const clone = response.clone();
                    void clone
                        .blob()
                        .then((blob) => {
                            if (blob.size > 0 && blob.size <= MAX_CACHED_BYTES) {
                                void idbPut(key, { blob, mime: ct, storedAt: Date.now() });
                            }
                        })
                        .catch(() => undefined);
                }
                return response;
            }
        } catch {
            /* any wrapper failure falls through to the native fetch */
        }
        return nativeFetch(input as RequestInfo, init);
    }) as typeof window.fetch;
}
