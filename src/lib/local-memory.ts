/**
 * CreatorsKit local memory — plan §8 Phase 7.1.
 *
 * ONE IndexedDB home for every tool's working assets + a JSON state slot per
 * tool. Zero server by construction: nothing here ever leaves the device.
 * `/your-data` (Phase 7.3) enumerates these same stores for view/delete/export.
 *
 * Semantics:
 * - `saveAssets(tool, ...)` REPLACES that tool's asset set (mirror of UI queue)
 * - `saveState(tool, ...)` upserts one JSON blob of settings/working state
 * - every call is best-effort: private mode / quota failures never crash a tool
 */

export type MemoryAsset = {
    slot: string;
    blob: Blob;
    name?: string;
    meta?: Record<string, unknown>;
};

export type MemoryRecord = {
    key: string; // `${tool}:${slot}`
    tool: string;
    slot: string;
    label: string; // human label shown on /your-data
    name?: string;
    blob: Blob;
    updatedAt: number;
};

export type MemoryStateRecord = {
    tool: string;
    label: string;
    state: unknown;
    updatedAt: number;
};

export type MemoryToolSummary = {
    tool: string;
    label: string;
    assets: number;
    bytes: number;
    updatedAt: number;
    hasState: boolean;
};

const DB_NAME = 'ck_local_memory';
const DB_VERSION = 1;
const ASSETS = 'assets';
const STATES = 'states';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: 'key' });
            if (!db.objectStoreNames.contains(STATES)) db.createObjectStore(STATES, { keyPath: 'tool' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('open failed'));
    });
}

/** Replace-all persistence for a tool's asset queue (blobs). */
export async function saveAssets(tool: string, label: string, assets: MemoryAsset[]): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(ASSETS, 'readwrite');
            const store = tx.objectStore(ASSETS);
            const now = Date.now();
            // Wipe the tool's previous slots, then write the fresh set.
            const allReq = store.getAllKeys();
            allReq.onsuccess = () => {
                for (const key of allReq.result as IDBValidKey[]) {
                    if (String(key).startsWith(tool + ':')) store.delete(key);
                }
                for (const a of assets) {
                    const rec: MemoryRecord = {
                        key: tool + ':' + a.slot,
                        tool,
                        slot: a.slot,
                        label,
                        name: a.name,
                        blob: a.blob,
                        updatedAt: now,
                    };
                    store.put(rec);
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('write failed'));
        });
        db.close();
    } catch {
        /* private mode / quota — non-fatal by contract */
    }
}

/** Load a tool's persisted asset queue (oldest slot first). */
export async function loadAssets(tool: string): Promise<MemoryRecord[]> {
    try {
        const db = await openDb();
        const recs = await new Promise<MemoryRecord[]>((resolve, reject) => {
            const tx = db.transaction(ASSETS, 'readonly');
            const req = tx.objectStore(ASSETS).getAll();
            req.onsuccess = () => resolve((req.result as MemoryRecord[]).filter((r) => r.tool === tool));
            req.onerror = () => reject(req.error ?? new Error('read failed'));
        });
        db.close();
        return recs.sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));
    } catch {
        return [];
    }
}

/** Upsert a tool's JSON working state (settings, layout, palette…). */
export async function saveState<T>(tool: string, label: string, state: T): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STATES, 'readwrite');
            tx.objectStore(STATES).put({ tool, label, state, updatedAt: Date.now() } satisfies MemoryStateRecord);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('write failed'));
        });
        db.close();
    } catch {
        /* non-fatal */
    }
}

/** Read a tool's JSON working state. */
export async function loadState<T>(tool: string): Promise<{ state: T; updatedAt: number } | null> {
    try {
        const db = await openDb();
        const rec = await new Promise<MemoryStateRecord | undefined>((resolve, reject) => {
            const tx = db.transaction(STATES, 'readonly');
            const req = tx.objectStore(STATES).get(tool);
            req.onsuccess = () => resolve(req.result as MemoryStateRecord | undefined);
            req.onerror = () => reject(req.error ?? new Error('read failed'));
        });
        db.close();
        return rec ? { state: rec.state as T, updatedAt: rec.updatedAt } : null;
    } catch {
        return null;
    }
}

/** Wipe one tool's memory (assets + state) — the /your-data delete button. */
export async function clearTool(tool: string): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction([ASSETS, STATES], 'readwrite');
            const assets = tx.objectStore(ASSETS);
            const allReq = assets.getAllKeys();
            allReq.onsuccess = () => {
                for (const key of allReq.result as IDBValidKey[]) {
                    if (String(key).startsWith(tool + ':')) assets.delete(key);
                }
            };
            tx.objectStore(STATES).delete(tool);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('delete failed'));
        });
        db.close();
    } catch {
        /* non-fatal */
    }
}

/** Per-tool summaries for the /your-data page (Phase 7.3). */
export async function listMemory(): Promise<MemoryToolSummary[]> {
    const byTool = new Map<string, MemoryToolSummary>();
    const fold = (tool: string, label: string) => {
        let s = byTool.get(tool);
        if (!s) {
            s = { tool, label, assets: 0, bytes: 0, updatedAt: 0, hasState: false };
            byTool.set(tool, s);
        }
        if (label) s.label = label;
        return s;
    };
    try {
        const db = await openDb();
        const [assets, states] = await Promise.all([
            new Promise<MemoryRecord[]>((resolve, reject) => {
                const tx = db.transaction(ASSETS, 'readonly');
                const req = tx.objectStore(ASSETS).getAll();
                req.onsuccess = () => resolve(req.result as MemoryRecord[]);
                req.onerror = () => reject(req.error ?? new Error('read failed'));
            }),
            new Promise<MemoryStateRecord[]>((resolve, reject) => {
                const tx = db.transaction(STATES, 'readonly');
                const req = tx.objectStore(STATES).getAll();
                req.onsuccess = () => resolve(req.result as MemoryStateRecord[]);
                req.onerror = () => reject(req.error ?? new Error('read failed'));
            }),
        ]);
        db.close();
        for (const a of assets) {
            const s = fold(a.tool, a.label);
            s.assets += 1;
            s.bytes += a.blob.size;
            s.updatedAt = Math.max(s.updatedAt, a.updatedAt);
        }
        for (const st of states) {
            const s = fold(st.tool, st.label);
            s.hasState = true;
            s.updatedAt = Math.max(s.updatedAt, st.updatedAt);
        }
    } catch {
        /* private mode — report nothing */
    }
    return Array.from(byTool.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Every asset record across all tools (device-transfer collector reads them all). */
export async function loadAllRecords(): Promise<MemoryRecord[]> {
    try {
        const db = await openDb();
        const recs = await new Promise<MemoryRecord[]>((resolve, reject) => {
            const tx = db.transaction(ASSETS, 'readonly');
            const req = tx.objectStore(ASSETS).getAll();
            req.onsuccess = () => resolve(req.result as MemoryRecord[]);
            req.onerror = () => reject(req.error ?? new Error('read failed'));
        });
        db.close();
        return recs;
    } catch {
        return [];
    }
}

/** Every persisted tool state (device-transfer collector reads them all). */
export async function loadAllStates(): Promise<MemoryStateRecord[]> {
    try {
        const db = await openDb();
        const recs = await new Promise<MemoryStateRecord[]>((resolve, reject) => {
            const tx = db.transaction(STATES, 'readonly');
            const req = tx.objectStore(STATES).getAll();
            req.onsuccess = () => resolve(req.result as MemoryStateRecord[]);
            req.onerror = () => reject(req.error ?? new Error('read failed'));
        });
        db.close();
        return recs;
    } catch {
        return [];
    }
}
