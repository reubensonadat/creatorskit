/**
 * src/lib/business-vault.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Business Suite's memory (Tier 1 of the retention plan):
 *
 *  - VAULT: every document the creator ever issued (printed / shared / linked)
 *    is snapshotted here, so they can reopen, remind, or mark it paid later.
 *    The snapshot is the SAME encoded payload string the share link carries,
 *    so restoring reuses the exact /r/[id] hydration path.
 *  - CLIENTS: every client ever invoiced, auto-remembered (upsert by name).
 *    Surfaces as one-tap chips on the client fields.
 *  - SERVICES (rate card): line items from issued documents + explicitly saved
 *    rows. Surfaces as one-tap "quick add" rows in the deliverables editor.
 *
 * Storage contract: plain localStorage (same trust level as the working draft
 * in ck_business_draft_v2 — device-local, no accounts, no servers). All reads
 * and writes are defensive: private mode / quota errors must never break the
 * builder, the vault is a convenience layer, not a dependency.
 */

export type VaultKind = 'invoice' | 'receipt' | 'agreement' | 'letterhead';
export type VaultStatus = 'sent' | 'paid';

export interface VaultEntry {
    /** Stable identity: `${kind}|${docNumber}` — editing + re-issuing updates in place. */
    id: string;
    kind: VaultKind;
    docNumber: string;
    clientName: string;
    /** Grand total at issue time (already includes tax/discount). */
    total: number;
    currency: string;
    dueDate?: string;
    status: VaultStatus;
    /** encodeReceipt(buildReceiptPayload()) — the full-fidelity restore snapshot. */
    payloadString: string;
    /** Supabase short id when a /r/<id> link exists for this document. */
    shortId?: string;
    createdAt: number;
    updatedAt: number;
}

export interface SavedClient {
    name: string;
    contact: string;
    currency?: string;
    momoNumber?: string;
    momoNetwork?: string;
    lastUsed: number;
}

export interface SavedService {
    id: string;
    description: string;
    quantity: number;
    rate: number;
    platform: string;
    savedAt: number;
}

const VAULT_KEY = 'ck_business_vault_v1';
const CLIENTS_KEY = 'ck_business_clients_v1';
const SERVICES_KEY = 'ck_business_services_v1';

const MAX_VAULT_ENTRIES = 200;
const MAX_CLIENTS = 60;
const MAX_SERVICES = 40;

function readJSON<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as T) : fallback;
    } catch {
        return fallback;
    }
}

function writeJSON(key: string, value: unknown): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* quota / private mode — memory features degrade silently by design */
    }
}

// ─── VAULT ───────────────────────────────────────────────────────────────────

export function listVault(): VaultEntry[] {
    return readJSON<VaultEntry[]>(VAULT_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

function persistVault(entries: VaultEntry[]): VaultEntry[] {
    const trimmed = entries.slice(0, MAX_VAULT_ENTRIES);
    writeJSON(VAULT_KEY, trimmed);
    return trimmed;
}

/**
 * Insert or update a vault entry. Identity = kind + docNumber, so printing an
 * invoice twice or sharing it after printing merges into ONE row. An entry
 * already marked PAID is never downgraded back to SENT by a re-issue.
 */
export function upsertVaultEntry(entry: VaultEntry): VaultEntry[] {
    const entries = readJSON<VaultEntry[]>(VAULT_KEY, []);
    const idx = entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
        const prev = entries[idx];
        entries[idx] = {
            ...entry,
            shortId: entry.shortId || prev.shortId,
            status: prev.status === 'paid' ? 'paid' : entry.status,
            createdAt: prev.createdAt,
            updatedAt: Date.now(),
        };
    } else {
        entries.unshift({ ...entry, updatedAt: Date.now() });
    }
    return persistVault(entries);
}

export function setVaultStatus(id: string, status: VaultStatus): VaultEntry[] {
    const entries = readJSON<VaultEntry[]>(VAULT_KEY, []);
    const idx = entries.findIndex((e) => e.id === id);
    if (idx >= 0) {
        entries[idx] = { ...entries[idx], status, updatedAt: Date.now() };
    }
    return persistVault(entries);
}

/** Attach a /r/<shortId> to an already-recorded entry (link resolved late). */
export function setVaultShortId(id: string, shortId: string): VaultEntry[] {
    const entries = readJSON<VaultEntry[]>(VAULT_KEY, []);
    const idx = entries.findIndex((e) => e.id === id);
    if (idx >= 0 && !entries[idx].shortId) {
        entries[idx] = { ...entries[idx], shortId, updatedAt: Date.now() };
    }
    return persistVault(entries);
}

export function deleteVaultEntry(id: string): VaultEntry[] {
    const entries = readJSON<VaultEntry[]>(VAULT_KEY, []);
    return persistVault(entries.filter((e) => e.id !== id));
}

/**
 * Suggest the next document number for a kind by cloning the numbering format
 * of the most recent same-kind entry and bumping its trailing digit run.
 * Returns null when there is no history to infer from (caller keeps default).
 */
export function nextDocNumber(kind: VaultKind): string | null {
    const entries = readJSON<VaultEntry[]>(VAULT_KEY, [])
        .filter((e) => e.kind === kind)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    if (entries.length === 0) return null;

    const latest = entries[0].docNumber || '';
    const match = latest.match(/(\d+)\D*$/); // trailing digit run (e.g. INV-2026-0042 → 0042)
    if (!match || match.index === undefined) return null;
  
    const digits = match[1];
    const counter = parseInt(digits, 10) + 1;
    const padded = String(counter).padStart(digits.length, '0');
    return latest.slice(0, match.index) + padded + latest.slice(match.index + digits.length);
}

// ─── SAVED CLIENTS ───────────────────────────────────────────────────────────

export function listClients(): SavedClient[] {
    return readJSON<SavedClient[]>(CLIENTS_KEY, []).sort((a, b) => b.lastUsed - a.lastUsed);
}

export function rememberClient(client: SavedClient): SavedClient[] {
    const name = client.name?.trim();
    if (!name) return listClients();
    const entries = readJSON<SavedClient[]>(CLIENTS_KEY, []);
    const key = name.toLowerCase();
    const idx = entries.findIndex((c) => c.name.trim().toLowerCase() === key);
    const merged: SavedClient = {
        ...client,
        name,
        contact: client.contact || (idx >= 0 ? entries[idx].contact : ''),
        lastUsed: Date.now(),
    };
    if (idx >= 0) {
        entries[idx] = { ...entries[idx], ...merged, name };
    } else {
        entries.unshift(merged);
    }
    const recent = entries.slice(0, MAX_CLIENTS);
    writeJSON(CLIENTS_KEY, recent);
    return recent.sort((a, b) => b.lastUsed - a.lastUsed);
}

// ─── SAVED SERVICES (RATE CARD) ──────────────────────────────────────────────

function serviceIdentity(desc: string, rate: number): string {
    return `${(desc || '').trim().toLowerCase()}::${rate}`;
}

export function listServices(): SavedService[] {
    return readJSON<SavedService[]>(SERVICES_KEY, []).sort((a, b) => b.savedAt - a.savedAt);
}

export function rememberServices(
    items: Array<{ description: string; quantity: number; rate: number; platform: string }>
): SavedService[] {
    const entries = readJSON<SavedService[]>(SERVICES_KEY, []);
    let changed = false;
    for (const item of items) {
        const desc = (item.description || '').trim();
        if (!desc || !item.rate) continue; // one-offs and free lines never enter the rate card
        const id = serviceIdentity(desc, item.rate);
        const idx = entries.findIndex((s) => s.id === id);
        if (idx >= 0) {
            entries[idx] = { ...entries[idx], quantity: item.quantity, platform: item.platform, savedAt: Date.now() };
        } else {
            entries.unshift({
                id,
                description: desc,
                quantity: item.quantity,
                rate: item.rate,
                platform: item.platform,
                savedAt: Date.now(),
            });
            changed = true;
        }
    }
    const trimmed = entries.slice(0, MAX_SERVICES);
    writeJSON(SERVICES_KEY, trimmed);
    return trimmed.sort((a, b) => b.savedAt - a.savedAt);
}

export function forgetService(id: string): SavedService[] {
    const kept = readJSON<SavedService[]>(SERVICES_KEY, []).filter((s) => s.id !== id);
    writeJSON(SERVICES_KEY, kept);
    return kept.sort((a, b) => b.savedAt - a.savedAt);
}

/** Extract the /r/<id> segment from any share link form (or null). */
export function shortIdFromLink(link?: string | null): string | undefined {
    if (!link) return undefined;
    const m = link.match(/\/r\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : undefined;
}
