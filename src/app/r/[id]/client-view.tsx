'use client';

import { useEffect, useState } from 'react';
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
export default function ShortLinkClientView() {
    const params = useParams<{ id: string }>();
    const [data, setData] = useState<ReceiptPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function loadDocument() {
            if (!params?.id) return;
            try {
                const stored = await getReceiptByShortId(params.id);
                if (stored?.payload_string) {
                    const decoded = decodeReceipt(stored.payload_string);
                    if (decoded) {
                        setData(decoded);
                        setLoading(false);
                        return;
                    }
                }
                setError(true);
                setLoading(false);
            } catch (err) {
                setError(true);
                setLoading(false);
            }
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

    return <ClientDocumentPrinter data={data} />;
}
