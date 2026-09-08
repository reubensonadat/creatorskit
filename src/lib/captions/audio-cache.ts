/**
 * Client-Side IndexedDB Audio Cache
 * =================================
 * Stores and retrieves audio blobs locally in the creator's browser.
 * $0 server cost, 0 bytes uploaded, persistent across page refreshes.
 */

const DB_NAME = 'creatorkit_captions_db';
const STORE_NAME = 'audio_cache';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not supported'));
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveAudioBlobToCache(key: string, blob: Blob): Promise<void> {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(blob, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (err) {
        console.warn('Could not cache audio to IndexedDB:', err);
    }
}

export async function getAudioBlobFromCache(key: string): Promise<Blob | null> {
    try {
        const db = await openDatabase();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve((req.result as Blob) || null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

export async function clearAudioCache(key: string): Promise<void> {
    try {
        const db = await openDatabase();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
        });
    } catch {
        // ignore
    }
}
