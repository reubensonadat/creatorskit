'use client';

/**
 * ONE centralized client-facing document printer.
 *
 * Every shared document — receipt, invoice, agreement or letterhead — animates
 * out of this thermal printer exactly as if it were being printed. The output
 * tray measures the real document and expands to its exact height, so any
 * template of any length is handled dynamically (no fixed heights).
 *
 * Used by /r/[id] (database short links) and /receipt (encoded payload links).
 */
import { useEffect, useRef, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { exportDocumentAsImage } from '@/lib/export-document-image';
import { ReceiptPrinter, receiptClipPath } from '@/components/receipt-printer';
import SharedDocumentView from '@/components/shared-document-view';
import { receiptTotals, type ReceiptPayload } from '@/lib/receipt/receipt-link';

/** Human label for the shared document kind (receipt stays the default). */
export function docLabel(k?: ReceiptPayload['k']): string {
    switch (k) {
        case 'invoice': return 'Invoice';
        case 'agreement': return 'Agreement';
        case 'letterhead': return 'Document';
        default: return 'Receipt';
    }
}

const PRINT_CSS = `
  @media print {
    body * { visibility: hidden; }
    .receipt-print-area, .receipt-print-area * { visibility: visible; }
    .receipt-print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: #fff; }
    .screen-only { display: none !important; }
  }
`;

export default function ClientDocumentPrinter({ data }: { data: ReceiptPayload }) {
    const [stage, setStage] = useState<'processing' | 'printing' | 'complete'>('processing');
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const [isSavingImage, setIsSavingImage] = useState(false);
    const paperRef = useRef<HTMLDivElement>(null);
    const [paperHeight, setPaperHeight] = useState<number | null>(null);

    useEffect(() => {
        timersRef.current = [
            setTimeout(() => setStage('printing'), 900),
            setTimeout(() => setStage('complete'), 2900),
        ];
        return () => timersRef.current.forEach(clearTimeout);
    }, []);

    // ─── Expandable output tray: measure the real document, grow to fit it ───
    // The tray starts compact, then expands IN SYNC with the print feed so the
    // growth is visible: height animates to the measured paper size over the
    // same duration as the printer's stepped feed motion.
    const TRAY_COMPACT = 256; // px — animation origin only, never a cap
    const FEED_MS = 1850; // mirrors ReceiptPrinter's stepped feed duration

    useEffect(() => {
        const el = paperRef.current;
        if (!el) return;
        const measure = () => setPaperHeight(el.scrollHeight);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const { sym, paid, total } = receiptTotals(data);
    // Receipts print on narrow thermal paper; invoices / agreements / letterheads
    // feed out of the same printer as full-width document sheets.
    const isThermal = !data.k || data.k === 'receipt' || !data.x;

    const saveImage = async () => {
        setIsSavingImage(true);
        try {
            const node = paperRef.current;
            if (!node) {
                setIsSavingImage(false);
                return;
            }

            await exportDocumentAsImage({
                node,
                filename: `${(data.k ?? 'receipt').toLowerCase()}-${data.rn || 'document'}.png`,
                title: `${docLabel(data.k)} ${data.rn} - ${data.n}`,
                text: `${docLabel(data.k)} from ${data.n}`,
            });
        } catch (err) {
            console.error('Error saving document image:', err);
        } finally {
            setIsSavingImage(false);
        }
    };

    // QR encodes this document's own link — scan any printed copy to reopen it
    const qrUrl = typeof window !== 'undefined' ? window.location.href : undefined;

    return (
        <div style={{ minHeight: '100vh', background: '#09090b', padding: '24px 16px 48px', display: 'flex' }}>
            <style>{PRINT_CSS}</style>

            {/* ─── ON-SCREEN: ANIMATED PRINTER — every document feeds out of the machine ─── */}
            <div className="screen-only" style={{ margin: 'auto', width: '100%', maxWidth: isThermal ? 420 : 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                    <span style={{ background: '#fef08a', color: '#000', fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Official {docLabel(data.k)}
                    </span>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', fontWeight: 700, color: '#d4d4d8' }}>
                        {data.n} issued you this {docLabel(data.k).toLowerCase()} <span style={{ fontFamily: 'monospace' }}>{data.rn}</span>
                    </p>
                </div>

                {/* The printer itself widens for full-sheet documents — thermal
                    receipts keep the compact slot, invoices/agreements/letterheads
                    get the wide machine (same behaviour as the business suite). */}
                <ReceiptPrinter.Root
                    stage={stage}
                    feedMotion="stepped"
                    className={isThermal ? 'max-w-sm' : 'max-w-4xl'}
                >
                    <ReceiptPrinter.Machine>
                        <ReceiptPrinter.Header>
                            <ReceiptPrinter.Status>
                                {stage === 'processing'
                                    ? 'Preparing document…'
                                    : stage === 'printing'
                                        ? `Printing ${docLabel(data.k)}…`
                                        : `${docLabel(data.k)} ready`}
                            </ReceiptPrinter.Status>
                            <span className="rounded-[0.25rem] bg-zinc-50 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-950">
                                CreatorKit
                            </span>
                        </ReceiptPrinter.Header>
                        <ReceiptPrinter.Screen>
                            <div className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-widest">
                                <span>{sym}{(data.k && data.k !== 'receipt' ? total : paid).toLocaleString()}</span>
                                <span>{data.k && data.k !== 'receipt' ? 'Total due' : paid >= total ? 'Paid in full' : 'Partial'}</span>
                            </div>
                            <p className="mt-1 truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                {data.c} · {data.rn}
                            </p>
                        </ReceiptPrinter.Screen>
                    </ReceiptPrinter.Machine>

                    {/* Expandable tray — grows with the feed, ends at the exact
                        measured document height. Never a fixed height. */}
                    <ReceiptPrinter.Output
                        className="px-0"
                        style={{
                            height: stage === 'processing'
                                ? TRAY_COMPACT
                                : paperHeight
                                    ? paperHeight + 24
                                    : 576, // safety net until the measure lands
                            transition: `height ${FEED_MS}ms linear`,
                        }}
                    >
                        <ReceiptPrinter.Paper variant={isThermal ? 'receipt' : 'document'}>
                            <div ref={paperRef}>
                                <SharedDocumentView data={data} qrUrl={qrUrl} showBranding={data.br !== 0} />
                            </div>
                        </ReceiptPrinter.Paper>
                    </ReceiptPrinter.Output>
                </ReceiptPrinter.Root>

                {stage === 'complete' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%', maxWidth: 360 }}>
                        <button
                            onClick={() => window.print()}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#FFE500', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 12px', fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            <Printer size={14} /> Print PDF
                        </button>
                        <button
                            onClick={saveImage}
                            disabled={isSavingImage}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 12px', fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            <Download size={14} /> {isSavingImage ? 'Saving…' : 'Save Image'}
                        </button>
                    </div>
                )}
            </div>

            {/* ─── PRINT-ONLY AREA ─── */}
            <div className="receipt-print-area" style={{ display: 'none' }}>
                {isThermal ? (
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
                        <SharedDocumentView data={data} qrUrl={qrUrl} showBranding={data.br !== 0} />
                    </div>
                ) : (
                    <div style={{ width: '100%', background: '#ffffff', color: '#09090b' }}>
                        <SharedDocumentView data={data} qrUrl={qrUrl} showBranding={data.br !== 0} />
                    </div>
                )}
            </div>
        </div>
    );
}
