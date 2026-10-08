/**
 * src/lib/teleprompter-scripts.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * "MY SCRIPTS" — the teleprompter's script library.
 *
 * Scripts are the only irreplaceable work a creator types into CreatorsKit
 * (settings can be re-picked; a written script cannot). This library gives
 * them a home: save, reload, delete — with word counts and dates.
 *
 * STORAGE   localStorage `ck_teleprompter_scripts_v1` — the ck_ prefix means
 *           the whole library rides the encrypted device transfer
 *           (src/lib/device-transfer.ts collects every ck_* key), so scripts
 *           survive the move to a new phone. No server, no egress.
 *
 * CAPS      100 scripts · 200,000 characters each — localStorage safety so
 *           one giant paste can never break the tool (or the transfer).
 */

export interface SavedScript {
    id: string;
    title: string;
    text: string;
    createdAt: number;
    updatedAt: number;
}

export const SCRIPTS_STORAGE_KEY = 'ck_teleprompter_scripts_v1';
export const MAX_SAVED_SCRIPTS = 100;
export const MAX_SCRIPT_CHARS = 200_000;

/** Words that are actually read — [CUE TAGS] are stage directions, not speech. */
export function countWords(text: string): number {
    const t = text.replace(/\[[^\]]*\]/g, ' ').trim();
    return t ? t.split(/\s+/).length : 0;
}

/** First meaningful line, cue tags stripped, capped at 48 chars. */
export function titleFromScript(text: string): string {
    for (const line of text.split('\n')) {
        const cleaned = line.replace(/\[[^\]]*\]/g, '').trim();
        if (cleaned) {
            return cleaned.length > 48 ? cleaned.slice(0, 48).trimEnd() + '…' : cleaned;
        }
    }
    return 'Untitled script';
}

function loadRaw(): SavedScript[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(SCRIPTS_STORAGE_KEY) ?? '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((s) => s && typeof s === 'object')
            .map((s: any) => ({
                id: String(s.id ?? ''),
                title: typeof s.title === 'string' && s.title.trim() ? s.title : 'Untitled script',
                text: typeof s.text === 'string' ? s.text : '',
                createdAt: Number(s.createdAt) || Date.now(),
                updatedAt: Number(s.updatedAt) || Date.now(),
            }))
            .filter((s) => s.id && s.text);
    } catch {
        return [];
    }
}

function persist(list: SavedScript[]): boolean {
    try {
        localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(list));
        return true;
    } catch {
        return false;
    }
}

/** Most recently saved first. */
export function listScripts(): SavedScript[] {
    return loadRaw().sort((a, b) => b.updatedAt - a.updatedAt);
}

export type SaveScriptResult =
    | { ok: true; script: SavedScript; duplicate?: boolean }
    | { ok: false; error: string };

/**
 * Save the current script. Saving identical text again does NOT duplicate —
 * it bumps the existing entry to the top (rehearsed again = relevant again).
 */
export function saveScript(text: string, title?: string): SaveScriptResult {
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: 'Nothing to save — the script is empty.' };
    if (trimmed.length > MAX_SCRIPT_CHARS) {
        return { ok: false, error: 'That script is too long to save (over 200,000 characters).' };
    }

    const list = loadRaw();
    const existing = list.find((s) => s.text.trim() === trimmed);
    if (existing) {
        existing.updatedAt = Date.now();
        if (title && title.trim()) existing.title = title.trim().slice(0, 80);
        if (persist(list)) return { ok: true, script: existing, duplicate: true };
        return { ok: false, error: 'Could not save — storage is full.' };
    }

    if (list.length >= MAX_SAVED_SCRIPTS) {
        return { ok: false, error: 'Script library is full (100) — delete one to save another.' };
    }

    const script: SavedScript = {
        id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        title: (title && title.trim()) || titleFromScript(trimmed),
        text: trimmed,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    list.push(script);
    if (persist(list)) return { ok: true, script };
    return { ok: false, error: 'Could not save — storage is full.' };
}

export function deleteScript(id: string): SavedScript[] {
    const list = loadRaw().filter((s) => s.id !== id);
    persist(list);
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function renameScript(id: string, title: string): SavedScript[] {
    const list = loadRaw();
    const s = list.find((x) => x.id === id);
    if (s && title.trim()) {
        s.title = title.trim().slice(0, 80);
        s.updatedAt = Date.now();
        persist(list);
    }
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
}
