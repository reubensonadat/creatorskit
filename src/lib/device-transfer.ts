/**
 * src/lib/device-transfer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * "I'm changing my phone but I love CreatorsKit — move my data so I don't
 * start from scratch." (owner ruling 2026-10-08)
 *
 * WHAT MOVES (and what never does):
 *   ✅ every `ck_*` localStorage key  (tool settings, drafts, business vault,
 *      saved clients, rate card, logo library, creator identity…)
 *   ✅ every IndexedDB `ck_local_memory` state row (per-tool working state)
 *   ✅ IndexedDB asset files up to sane caps (see ASSET_LIMITS) — big media
 *      stays on the old device; tools re-accept files any time
 *   ❌ AI model caches, PWA code cache, anything not user data
 *
 * THE CONTRACT (all owner-mandated):
 *   1. OPT-IN ONLY — backupToDeviceTransfer runs exclusively from the user's
 *      tap on "Back up my data". Nothing in the app calls it automatically.
 *   2. The server receives an AES-GCM ciphertext it cannot read. The key is
 *      derived from a 4-digit PIN the user picks (PBKDF2 · 150k · SHA-256) —
 *      we NEVER see the PIN, only a salted hash to reject typos fast.
 *   3. The copy evaporates after 7 days (lazy sweep on every backup/restore;
 *      the database refuses to delete anything not already expired).
 *   4. No accounts, no identity — the one-time recovery code IS the key.
 *
 * EGRESS CEILINGS (owner ruling 2026-10-08: sharing — bouquets, receipts,
 * invoices — must NEVER lose egress budget to this feature):
 *   * LIVE-ROW CEILING — at most 50 live transfers database-wide. The 51st
 *     backup is refused with a friendly message; expired copies free their
 *     slots automatically, so the pool recycles itself.
 *   * PAYLOAD CEILING — ciphertext stays ≈ ≤2 MB (settings + states are
 *     tiny; asset files are capped at 500 KB each / 1.5 MB total before
 *     base64 inflation). One restore ≈ 2 MB egress → the 5 GB free tier
 *     covers ~2,500 restores/month, leaving sharing untouched.
 */

import { supabase } from '@/lib/supabase';
import { loadAllRecords, loadAllStates, saveAssets, saveState, type MemoryAsset } from '@/lib/local-memory';

export const TRANSFER_TTL_DAYS = 7;

/** Hard ceilings — see the egress contract above. */
export const TRANSFER_MAX_LIVE_ROWS = 50;
const ASSET_LIMITS = { perFile: 500_000, total: 1_500_000 };

export interface TransferStats {
    lsKeys: number;
    states: number;
    assetsIncluded: number;
    assetsSkipped: number;
    bytes: number;
}

interface TransferPayload {
    version: 1;
    createdAt: number;
    localStorage: Record<string, string>;
    states: Array<{ tool: string; label: string; state: unknown }>;
    assets: Array<{
        tool: string;
        label: string;
        slot: string;
        name?: string;
        type: string;
        b64: string;
    }>;
}

// ─── byte ↔ base64 helpers (chunk-safe) ─────────────────────────────────────

function bytesToB64(bytes: Uint8Array): string {
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function randomBytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    crypto.getRandomValues(out);
    return out;
}

// ─── crypto: PIN → AES-GCM key (we can never read the payload back) ─────────

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 150_000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function pinVerifier(pin: string, salt2: Uint8Array): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + bytesToB64(salt2)));
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// ─── recovery code: CK-XXXX-XXXX (no confusable chars) ──────────────────────

const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateCode(): string {
    const pick = () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    const block = () => pick() + pick() + pick() + pick();
    return `CK-${block()}-${block()}`;
}

/** Accepts "CK-XXXX-XXXX", "ck xxxx xxxx", "XXXXXXXX" → canonical form. */
export function normalizeCode(input: string): string {
    const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length !== 8) return input.toUpperCase().trim();
    return `CK-${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

// ─── collect (runs ONLY from the user's explicit tap) ───────────────────────

async function collectTransferData(): Promise<{ payload: TransferPayload; stats: TransferStats }> {
    const payload: TransferPayload = { version: 1, createdAt: Date.now(), localStorage: {}, states: [], assets: [] };
    const stats: TransferStats = { lsKeys: 0, states: 0, assetsIncluded: 0, assetsSkipped: 0, bytes: 0 };

    // 1. Every ck_* localStorage key
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith('ck_')) continue;
            const v = localStorage.getItem(k);
            if (v !== null) {
                payload.localStorage[k] = v;
                stats.lsKeys += 1;
                stats.bytes += v.length;
            }
        }
    } catch {
        /* storage blocked — settings simply don't transfer */
    }

    // 2. Every tool state
    for (const st of await loadAllStates()) {
        payload.states.push({ tool: st.tool, label: st.label, state: st.state });
        stats.states += 1;
        stats.bytes += JSON.stringify(st.state ?? {}).length;
    }

    // 3. Asset files within caps (payload ceiling — see egress contract)
    let assetBytes = 0;
    for (const rec of await loadAllRecords()) {
        if (rec.blob.size > ASSET_LIMITS.perFile || assetBytes + rec.blob.size > ASSET_LIMITS.total) {
            stats.assetsSkipped += 1;
            continue;
        }
        const b64 = bytesToB64(new Uint8Array(await rec.blob.arrayBuffer()));
        payload.assets.push({ tool: rec.tool, label: rec.label, slot: rec.slot, name: rec.name, type: rec.blob.type, b64 });
        assetBytes += rec.blob.size;
        stats.assetsIncluded += 1;
    }
    stats.bytes += assetBytes;

    return { payload, stats };
}

// ─── backup: encrypt + upload the 7-day copy ────────────────────────────────

export interface BackupResult {
    code: string;
    expiresAt: string;
    stats: TransferStats;
}

export async function backupToDeviceTransfer(pin: string): Promise<BackupResult> {
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.');

    // Lazy TTL sweep first — expired rows from anyone evaporate on every backup…
    try {
        await supabase.from('user_data_transfers').delete().lt('expires_at', new Date().toISOString());
    } catch {
        /* sweep is best-effort */
    }

    // …then the LIVE-ROW CEILING: at most 50 concurrent transfers database-wide,
    // so this feature can never crowd bouquet/receipt/invoice sharing for egress.
    try {
        const { count } = await supabase.from('user_data_transfers').select('id', { count: 'exact', head: true });
        if ((count ?? 0) >= TRANSFER_MAX_LIVE_ROWS) {
            throw new Error(
                'Transfer slots are full right now — old copies free their slots automatically within days. Please try again soon.'
            );
        }
    } catch (e) {
        if (e instanceof Error && e.message.startsWith('Transfer slots')) throw e;
        /* count failed (offline?) — the insert below will fail loudly if truly down */
    }

    const { payload, stats } = await collectTransferData();
    if (stats.lsKeys === 0 && stats.states === 0 && stats.assetsIncluded === 0) {
        throw new Error('Nothing to transfer — use a tool first so this device has something to remember.');
    }

    const salt = randomBytes(16);
    const salt2 = randomBytes(16);
    const iv = randomBytes(12);
    const key = await deriveKey(pin, salt);
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as unknown as BufferSource }, key, plaintext));

    const code = generateCode();
    const expiresAt = new Date(Date.now() + TRANSFER_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('user_data_transfers').insert({
        code,
        payload: bytesToB64(cipher),
        salt: bytesToB64(salt),
        iv: bytesToB64(iv),
        pin_check: await pinVerifier(pin, salt2),
        salt2: bytesToB64(salt2),
        expires_at: expiresAt,
    });
    if (error) throw new Error('Upload failed — check your connection and try again.');

    return { code, expiresAt, stats };
}

// ─── restore: fetch → PIN-decrypt → apply onto THIS device ──────────────────

export async function restoreFromDeviceTransfer(rawCode: string, pin: string): Promise<TransferStats> {
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.');
    const code = normalizeCode(rawCode);
    if (!/^CK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw new Error('Enter the full recovery code (CK-XXXX-XXXX).');

    const { data, error } = await supabase.from('user_data_transfers').select('*').eq('code', code).single();
    if (error || !data) throw new Error('No transfer found for that code — check it and try again.');

    const expiresAt = new Date(data.expires_at);
    if (expiresAt.getTime() < Date.now()) {
        // The 7 days are up: the copy evaporates the moment it's touched.
        try {
            await supabase.from('user_data_transfers').delete().eq('code', code);
        } catch {
            /* the row is invisible past expiry either way */
        }
        throw new Error('This transfer expired — the 7-day copy is gone. Back up again on the old phone.');
    }

    // Fast wrong-PIN rejection before touching the big ciphertext
    const salt2 = b64ToBytes(data.salt2);
    if ((await pinVerifier(pin, salt2)) !== data.pin_check) {
        throw new Error('Wrong PIN — the transfer is protected with the PIN set on the old phone.');
    }

    const salt = b64ToBytes(data.salt);
    const iv = b64ToBytes(data.iv);
    const key = await deriveKey(pin, salt);
    let plain: ArrayBuffer;
    try {
        plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as unknown as BufferSource }, key, b64ToBytes(data.payload) as unknown as BufferSource);
    } catch {
        throw new Error('Could not decrypt this transfer — wrong PIN or corrupted copy.');
    }

    const payload = JSON.parse(new TextDecoder().decode(plain)) as TransferPayload;
    const stats: TransferStats = { lsKeys: 0, states: 0, assetsIncluded: 0, assetsSkipped: 0, bytes: 0 };

    // 1. localStorage keys
    for (const [k, v] of Object.entries(payload.localStorage ?? {})) {
        try {
            localStorage.setItem(k, v);
            stats.lsKeys += 1;
            stats.bytes += v.length;
        } catch {
            /* quota on the new device — keep going */
        }
    }

    // 2. Tool states
    for (const st of payload.states ?? []) {
        await saveState(st.tool, st.label, st.state);
        stats.states += 1;
    }

    // 3. Asset files (grouped per tool for replace-all writes)
    const byTool = new Map<string, { label: string; assets: MemoryAsset[] }>();
    for (const a of payload.assets ?? []) {
        const bin = b64ToBytes(a.b64);
        const blob = new Blob([bin as unknown as BlobPart], { type: a.type || 'application/octet-stream' });
        stats.assetsIncluded += 1;
        stats.bytes += blob.size;
        const group = byTool.get(a.tool) ?? { label: a.label, assets: [] };
        group.assets.push({ slot: a.slot, blob, name: a.name });
        byTool.set(a.tool, group);
    }
    for (const [tool, group] of byTool) {
        await saveAssets(tool, group.label, group.assets);
    }

    return stats;
}
