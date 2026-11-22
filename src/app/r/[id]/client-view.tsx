'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { decodeReceipt, type ReceiptPayload } from '@/lib/receipt/receipt-link';
import { getReceiptByShortId } from '@/lib/supabase';
import ClientDocumentPrinter from '@/components/client-document-printer';

/**
 * Client half of the short-link view (/r/<id>).
 *
 * The creator's share button stores the full document payload in Supabase and
 * hands the client this short link. All presentation — the animated printer,
 * the real invoice/agreement/letterhead template, print & save — lives in the
 * ONE centralized ClientDocumentPrinter.
 */
/** Send-history metadata stored alongside the payload (living links). */
type DocMeta = {
    revision?: number;
    first_sent_at?: string;
    updated_at?: string;
};

export default function ShortLinkClientView() {
    const params = useParams<{ id: string }>();
    const [data, setData] = useState<ReceiptPayload | null>(null);
    const [meta, setMeta] = useState<DocMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function loadDocument() {
            if (!params?.id) return;

            // 1. Check if document payload is embedded in URL (?d= or ?r=) for backward compatibility
            if (typeof window !== 'undefined') {
                const search = new URLSearchParams(window.location.search);
                const inline = search.get('d') || search.get('r');
                if (inline) {
                    const decoded = decodeReceipt(inline);
                    if (decoded) {
                        setData(decoded);
                        setLoading(false);
                        const url = new URL(window.location.href);
                        url.searchParams.delete('d');
                        url.searchParams.delete('r');
                        window.history.replaceState({}, '', url.toString());
                        return;
                    }
                }
            }

            try {
                const stored = await getReceiptByShortId(params.id);
                if (stored?.payload_string) {
                    const decoded = decodeReceipt(stored.payload_string);
                    if (decoded) {
                        setData(decoded);
                        setMeta((stored.metadata as DocMeta) || null);
                        setLoading(false);
                        return;
                    }
                }
            } catch (err) {
                // fall through
            }

            // Fallback: Check local cache (e.g. testing locally or creator preview)
            if (typeof window !== 'undefined') {
                try {
                    const cached = localStorage.getItem(`ck_doc_${params.id}`);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed?.payload_string) {
                            const decoded = decodeReceipt(parsed.payload_string);
                            if (decoded) {
                                setData(decoded);
                                setLoading(false);
                                return;
                            }
                        }
                    }
                } catch (e) { }
            }

            setError(true);
            setLoading(false);
        }

        loadDocument();
    }, [params?.id]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
                Loading document…
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'monospace' }}>
                <div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', color: '#f87171' }}>Document Not Found</p>
                    <p style={{ fontSize: '0.82rem', color: '#a1a1aa', maxWidth: 360, margin: '8px auto 0' }}>
                        This link does not exist or has expired. Please contact the creator for a new link.
                    </p>
                </div>
            </div>
        );
    }

    const revision = Number(meta?.revision || 1);
    const updatedLabel = meta?.updated_at
        ? new Date(meta.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

    return (
        <div style={{ minHeight: '100vh', background: '#09090b' }}>
            {/* Living links: the sender corrected this document after sharing.
                Hidden when the client prints or saves — the paper is clean. */}
            <style>{`@media print { .ck-updated-banner { display: none !important; } }`}</style>
            {revision > 1 && (
                <div
                    className="ck-updated-banner"
                    role="status"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        padding: '10px 16px',
                        background: '#78350f',
                        color: '#fde68a',
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        textAlign: 'center',
                    }}
                >
                    <span style={{ fontSize: '0.8rem' }}>✦</span>
                    <span>
                        This document was updated by the sender after it was first sent — you are viewing the latest
                        version (v{revision}{updatedLabel ? `, updated ${updatedLabel}` : ''}).
                    </span>
                </div>
            )}
            <ClientDocumentPrinter data={data} docId={params?.id} />
            {/* Stage 0 growth loop (docs/BUSINESS_MODEL_PLAN.md §8): every
                shared invoice/receipt/agreement advertises the free suite. */}
            <footer
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: '22px 16px 28px',
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#a1a1aa',
                    textTransform: 'uppercase',
                }}
            >
                <span>Made with</span>
                <Link
                    href="/"
                    style={{
                        color: '#ffffff',
                        fontWeight: 900,
                        textDecoration: 'none',
                        border: '1.5px solid #ffffff',
                        padding: '3px 8px',
                    }}
                >
                    CreatorsKit
                </Link>
                <span>— free creator tools</span>
            </footer>
        </div>
    );
}
