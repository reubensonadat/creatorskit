/**
 * Shareable receipt links for the CreatorKit Business Suite.
 *
 * A creator builds a receipt in /business?tab=receipt and shares a link of the
 * form `/receipt?r=<payload>`. The payload is a compact JSON object with short
 * keys, UTF-8-safe base64url-encoded so it survives WhatsApp / email / SMS.
 * The client opens the link, watches the thermal printer animation, and can
 * print or download the receipt — no account needed, no server round-trip.
 */

export type ReceiptLinkItem = {
    /** Deliverable description */
    d: string;
    /** Quantity */
    q: number;
    /** Unit rate */
    r: number;
};

export type ReceiptPayload = {
    // ── Creator ──────────────────────────────────────────────
    /** Creator / business name */
    n: string;
    /** Creator handle */
    h: string;
    /** Creator email */
    e: string;
    /** Creator phone */
    p: string;
    /** Creator location */
    l: string;
    // ── Client ───────────────────────────────────────────────
    /** Client / brand name */
    c: string;
    /** Client contact person */
    a: string;
    // ── Money ────────────────────────────────────────────────
    /** Currency code (GHS, NGN, USD…) */
    cu: string;
    /** Receipt number */
    rn: string;
    /** Issue date (display string) */
    dt: string;
    /** Line items */
    it: ReceiptLinkItem[];
    /** Discount amount */
    da: number;
    /** Tax percentage */
    tp: number;
    /** Amount actually paid */
    ap: number;
    // ── Payment channel ──────────────────────────────────────
    /** Payment type: momo | bank | paystack | wire */
    pt: string;
    /** MoMo network */
    mn: string;
    /** MoMo number */
    mu: string;
    /** Bank name */
    bn: string;
    /** Bank account number */
    ba: string;
    // ── Branding ─────────────────────────────────────────────
    /** Optional logo as a data URL (skipped when too large for a URL) */
    lg?: string;
    /** "Powered by CreatorKit" badge on the printed document: 1 = on (default), 0 = off */
    br?: 0 | 1;
    // ── Document kind ─────────────────────────────────────────
    /** Which business-suite document this payload represents (client view adapts title/labels) */
    k?: 'invoice' | 'receipt' | 'agreement' | 'letterhead';
    // ── Template extras ───────────────────────────────────────
    /** Per-kind template data (template id, styling, kind-specific fields) so the
     *  client view renders the creator's real invoice/agreement/letterhead template.
     *  Lives in the database payload_string — stripped from offline fallback URLs. */
    x?: Record<string, any>;
};

export const RECEIPT_CURRENCY_SYMBOLS: Record<string, string> = {
    GHS: 'GH₵',
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
};

/** Data URLs larger than this are dropped so shared links stay manageable. */
const MAX_LOGO_LENGTH = 100_000;

/** Encode a receipt payload into a URL-safe base64 string. */
export function encodeReceipt(payload: ReceiptPayload): string {
    const clean: ReceiptPayload = {
        ...payload,
        lg:
            payload.lg && payload.lg.length <= MAX_LOGO_LENGTH
                ? payload.lg
                : undefined,
    };
    const json = JSON.stringify(clean);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a receipt link payload. Returns null for malformed input. */
export function decodeReceipt(encoded: string): ReceiptPayload | null {
    try {
        const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(escape(atob(base64)));
        const parsed = JSON.parse(json) as ReceiptPayload;
        if (!parsed || typeof parsed.n !== 'string' || !Array.isArray(parsed.it)) {
            return null;
        }
        return {
            ...parsed,
            it: parsed.it.filter(
                (item) => item && typeof item.d === 'string',
            ),
        };
    } catch {
        return null;
    }
}

/** Derived money figures shared by the link generator and the client view. */
export function receiptTotals(payload: ReceiptPayload) {
    const sym = RECEIPT_CURRENCY_SYMBOLS[payload.cu] ?? payload.cu;
    const subtotal = payload.it.reduce((sum, item) => sum + item.q * item.r, 0);
    const discount = Math.min(Math.max(payload.da || 0, 0), subtotal);
    const taxable = subtotal - discount;
    const tax = Math.round(((taxable * (payload.tp || 0)) / 100) * 100) / 100;
    const total = taxable + tax;
    const paid = payload.ap || 0;
    const balance = Math.max(total - paid, 0);
    return { sym, subtotal, discount, tax, total, paid, balance };
}
