'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { decodeReceipt } from '@/lib/receipt/receipt-link';
import ClientDocumentPrinter from '@/components/client-document-printer';

/**
 * Encoded-payload client view (/receipt?r=<payload>).
 *
 * Offline fallback for the Business Suite share flow (used when the database
 * short link can't be created). All presentation — the animated printer, the
 * real invoice/agreement/letterhead template, print & save — lives in the ONE
 * centralized ClientDocumentPrinter.
 */
function ReceiptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const encoded = params.get('r');
  const data = useMemo(() => (encoded ? decodeReceipt(encoded) : null), [encoded]);

  useEffect(() => {
    if (!encoded) {
      router.replace('/business?tab=receipt');
    }
  }, [encoded, router]);

  if (encoded && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'monospace' }}>
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase' }}>Invalid document link</p>
          <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>This link is corrupted or incomplete. Please ask the creator to resend it.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>Loading document…</div>;
  }

  return <ClientDocumentPrinter data={data} />;
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>Loading document…</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
