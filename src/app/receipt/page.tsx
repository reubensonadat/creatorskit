'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { ReceiptPrinter, receiptClipPath } from '@/components/receipt-printer';
import ReceiptDocument, {
  type ReceiptDocumentData,
} from '@/components/receipt-document';
import {
  decodeReceipt,
  receiptTotals,
  type ReceiptPayload,
} from '@/lib/receipt/receipt-link';

/**
 * Client-facing receipt view.
 *
 * Creators share links like /receipt?r=<encoded payload> from the Business
 * Suite. The client lands here, watches the thermal printer animate the exact
 * same receipt the creator previewed, then prints or saves it as a PDF — no
 * account needed. The on-screen paper and the print/download output both
 * render the shared ReceiptDocument, so they are pixel-identical.
 */

function payChannelLabel(data: ReceiptPayload): string {
  if (data.pt === 'momo') return `MoMo · ${data.mn || 'Mobile Money'} · ${data.mu || ''}`.trim();
  if (data.pt === 'bank') return `Bank · ${data.bn || 'Bank'} · ${data.ba || ''}`.trim();
  if (data.pt === 'paystack') return 'Paystack Payment Link';
  return 'Bank Wire Transfer';
}

/** Print output mirrors ReceiptPrinter.Paper: 355px wide, pt-7 px-6 pb-8, torn edge. */
const PRINT_CSS = `
  @media print {
    body * { visibility: hidden; }
    .receipt-print-area, .receipt-print-area * { visibility: visible; }
    .receipt-print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: #fff; }
    .screen-only { display: none !important; }
  }
`;

function ReceiptClientView({ data }: { data: ReceiptPayload }) {
  const [stage, setStage] = useState<'processing' | 'printing' | 'complete'>('processing');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current = [
      setTimeout(() => setStage('printing'), 900),
      setTimeout(() => setStage('complete'), 2900),
    ];
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const { sym, subtotal, discount, tax, total, paid, balance } = receiptTotals(data);

  const docData: ReceiptDocumentData = {
    logoUrl: data.lg ?? null,
    creatorName: data.n,
    creatorHandle: data.h,
    creatorEmail: data.e,
    creatorPhone: data.p,
    creatorLocation: data.l,
    clientName: data.c,
    clientContact: data.a,
    currency: data.cu,
    sym,
    receiptNumber: data.rn,
    issueDate: data.dt,
    items: data.it.map((item, idx) => ({
      id: String(idx),
      description: item.d,
      quantity: item.q,
      rate: item.r,
    })),
    discountAmount: data.da,
    taxPercentage: data.tp,
    subtotal,
    tax,
    totalAmount: total,
    amountPaid: paid,
    balanceDue: balance,
    paymentType: data.pt,
    payChannel: payChannelLabel(data),
  };

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', padding: '24px 16px 48px', display: 'flex' }}>
      <style>{PRINT_CSS}</style>

      {/* ─── ON-SCREEN: ANIMATED THERMAL PRINTER (same composition as the Business Suite overlay) ─── */}
      <div className="screen-only" style={{ margin: 'auto', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <span style={{ background: '#fef08a', color: '#000', fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Official Payment Receipt
          </span>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', fontWeight: 700, color: '#d4d4d8' }}>
            {data.n} issued you receipt <span style={{ fontFamily: 'monospace' }}>{data.rn}</span>
          </p>
        </div>

        <ReceiptPrinter.Root stage={stage} feedMotion="stepped">
          <ReceiptPrinter.Machine>
            <ReceiptPrinter.Header>
              <ReceiptPrinter.Status>
                {stage === 'processing' ? 'Processing payment…' : stage === 'printing' ? 'Printing receipt…' : 'Receipt ready'}
              </ReceiptPrinter.Status>
              <span className="rounded-[0.25rem] bg-zinc-50 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-950">
                CreatorKit
              </span>
            </ReceiptPrinter.Header>
            <ReceiptPrinter.Screen>
              <div className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-widest">
                <span>{sym}{paid.toLocaleString()}</span>
                <span>{paid >= total ? 'Paid in full' : 'Partial'}</span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                {data.c} · {data.rn}
              </p>
            </ReceiptPrinter.Screen>
          </ReceiptPrinter.Machine>

          <ReceiptPrinter.Output className="h-[38rem]">
            <ReceiptPrinter.Paper>
              <ReceiptDocument data={docData} />
            </ReceiptPrinter.Paper>
          </ReceiptPrinter.Output>
        </ReceiptPrinter.Root>

        {stage === 'complete' && (
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef08a', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '8px 16px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        )}
      </div>

      {/* ─── PRINT-ONLY: the same receipt, clean white paper with torn edge ─── */}
      <div className="receipt-print-area" style={{ display: 'none' }}>
        <div
          style={{
            width: 355,
            margin: '0 auto',
            background: '#ffffff',
            color: '#09090b',
            padding: '28px 24px 32px',
            clipPath: receiptClipPath,
          }}
        >
          <ReceiptDocument data={docData} />
        </div>
      </div>
    </div>
  );
}

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
          <p style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase' }}>Invalid receipt link</p>
          <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>This receipt link is corrupted or incomplete. Please ask the creator to resend it.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>Loading receipt…</div>;
  }

  return <ReceiptClientView data={data} />;
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>Loading receipt…</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
