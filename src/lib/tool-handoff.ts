/**
 * Cross-tool image hand-off — let one tool "send" its current canvas/image
 * to another tool without a download → re-upload round trip. Same-origin
 * IndexedDB, one blob per target tool, consumed exactly once on the
 * target's mount.
 *
 * e.g. text-behind → "OPEN IN THUMBNAIL LAB" → thumbnail-lab picks it up
 * as a fresh candidate variation on load.
 */

const DB_NAME = 'ck_handoffs';
const STORE = 'images';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('could not open hand-off db'));
    });
}

export interface HandoffImageRecord {
    blob: Blob;
    format?: 'longform' | 'shorts';
    sourceTool?: string;
    timestamp?: number;
}

export async function putHandoffImage(
    tool: string,
    blob: Blob,
    options?: { format?: 'longform' | 'shorts'; sourceTool?: string }
): Promise<void> {
    const db = await openDb();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const data: HandoffImageRecord = {
                blob,
                format: options?.format,
                sourceTool: options?.sourceTool,
                timestamp: Date.now(),
            };
            tx.objectStore(STORE).put(data, tool);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('hand-off write failed'));
        });
    } finally {
        db.close();
    }
}

/** Reads and DELETES the pending hand-off for this tool (consume-once). */
export async function takeHandoffImage(
    tool: string
): Promise<{ blob: Blob; format?: 'longform' | 'shorts' } | null> {
    try {
        const db = await openDb();
        try {
            return await new Promise<{ blob: Blob; format?: 'longform' | 'shorts' } | null>((resolve) => {
                const tx = db.transaction(STORE, 'readwrite');
                const store = tx.objectStore(STORE);
                const get = store.get(tool);
                get.onsuccess = () => {
                    const res = get.result;
                    if (res != null) store.delete(tool);
                    if (!res) {
                        resolve(null);
                        return;
                    }
                    if (res instanceof Blob) {
                        resolve({ blob: res });
                    } else if (res.blob instanceof Blob) {
                        resolve({ blob: res.blob, format: res.format });
                    } else {
                        resolve(null);
                    }
                };
                get.onerror = () => resolve(null);
            });
        } finally {
            db.close();
        }
    } catch {
        return null;
    }
}

