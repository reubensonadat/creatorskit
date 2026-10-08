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
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Printer,
    Download,
    Share2,
    Check,
    PenLine,
    ShieldCheck,
    X,
    RotateCcw,
    Smartphone,
    Building2,
    Copy,
    ExternalLink,
    CreditCard,
} from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { exportDocumentAsImage } from '@/lib/export-document-image';
import { ReceiptPrinter, receiptClipPath } from '@/components/receipt-printer';
import SharedDocumentView from '@/components/shared-document-view';
import { receiptTotals, type ReceiptPayload } from '@/lib/receipt/receipt-link';
import { updateReceiptSignature } from '@/lib/supabase';
import { DocumentLockedIcon, DocumentUnlockedIcon } from '@/components/contract-templates';
import { formatPhoneNumberForDisplay, sanitizeNumberForCopy, sanitizeAccountForCopy } from '@/lib/phone-format';

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

export default function ClientDocumentPrinter({ data, docId }: { data: ReceiptPayload; docId?: string }) {
    const [currentData, setCurrentData] = useState<ReceiptPayload>(data);
    const [stage, setStage] = useState<'processing' | 'printing' | 'complete'>('processing');
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const [isSavingImage, setIsSavingImage] = useState(false);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [payCopied, setPayCopied] = useState<string | null>(null);
    const [fitMode, setFitMode] = useState<'fit' | 'full'>('fit');
    const paperRef = useRef<HTMLDivElement>(null);
    const captureRef = useRef<HTMLDivElement>(null);
    const [paperHeight, setPaperHeight] = useState<number | null>(null);

    // ─── 1-Click "Approve & Sign" State ───
    const [isSigningOpen, setIsSigningOpen] = useState(false);
    const [signerName, setSignerName] = useState(data.c || data.a || '');
    const [signerTitle, setSignerTitle] = useState('Authorized Representative');
    const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
    const [typedSign, setTypedSign] = useState(data.c || data.a || '');
    const [agreementChecked, setAgreementChecked] = useState(false);
    const [isSubmittingSign, setIsSubmittingSign] = useState(false);
    const [justSignedBanner, setJustSignedBanner] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);

    const isAgreement = currentData.k === 'agreement';
    const isSigned = Boolean(currentData.x?.isSigned || currentData.x?.sigClient);

    useEffect(() => {
        setCurrentData(data);
    }, [data]);

    // Canvas drawing helpers
    const clearCanvas = useCallback(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        setHasDrawn(false);
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;
        isDrawingRef.current = true;
        const rect = cvs.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;
        const rect = cvs.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1e3a8a'; // ink blue
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
        setHasDrawn(true);
    };

    const stopDrawing = () => {
        isDrawingRef.current = false;
    };

    const handleConfirmSign = async () => {
        if (!signerName.trim() || !agreementChecked) return;
        setIsSubmittingSign(true);

        let drawingUrl: string | undefined = undefined;
        if (signMode === 'draw' && canvasRef.current && hasDrawn) {
            drawingUrl = canvasRef.current.toDataURL('image/png');
        }

        const now = new Date();
        const signedDate = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
        const auditId = `CK-ESIGN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // 1. Update local document data immediately
        const updatedPayload: ReceiptPayload = {
            ...currentData,
            x: {
                ...(currentData.x || {}),
                isSigned: true,
                sigClient: signerName.trim(),
                sigClientTitle: signerTitle.trim() || 'Authorized Representative',
                sigClientDate: signedDate,
                sigClientDrawing: drawingUrl,
                signedAuditId: auditId,
            },
        };
        setCurrentData(updatedPayload);

        // 2. Persist to Supabase and API if document id is present
        if (docId) {
            try {
                await updateReceiptSignature(docId, {
                    clientName: signerName.trim(),
                    clientTitle: signerTitle.trim(),
                    signatureDrawing: drawingUrl,
                    auditId,
                });
            } catch (err) {
                console.error('Failed to save signature to database:', err);
            }
        }

        setIsSubmittingSign(false);
        setIsSigningOpen(false);
        setJustSignedBanner(true);
    };

    useEffect(() => {
        const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
        const mobileUA = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
        setIsMobileDevice(coarsePointer || mobileUA);
    }, []);

    useEffect(() => {
        timersRef.current = [
            setTimeout(() => setStage('printing'), 900),
            setTimeout(() => setStage('complete'), 2900),
        ];
        return () => timersRef.current.forEach(clearTimeout);
    }, []);

    // ─── Expandable output tray: measure the real document, grow to fit it ───
    const TRAY_COMPACT = 256;
    const FEED_MS = 1850;

    useEffect(() => {
        const el = paperRef.current;
        if (!el) return;
        const measure = () => setPaperHeight(el.scrollHeight);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [currentData]);

    const { sym, paid, total } = receiptTotals(currentData);
    const balance = Math.max(0, total - paid);
    const isThermal = !currentData.k || currentData.k === 'receipt' || !currentData.x;
    const isInvoice = currentData.k === 'invoice';
    const isReceipt = !currentData.k || currentData.k === 'receipt';

    // Deposit calculations if creator specified deposit on invoice
    const depositPercent = currentData.x?.dep ? Number(currentData.x.dep) : 0;
    const depositAmount = depositPercent > 0 ? (total * depositPercent) / 100 : null;
    const payableAmount = depositAmount && depositAmount > 0 && paid < depositAmount
        ? depositAmount
        : (balance > 0 ? balance : total);

    // Channel filtering:
    // If pt === 'momo', ONLY show MoMo.
    // If pt === 'bank' or 'wire', ONLY show Bank.
    // If pt === 'paystack', show Paystack.
    // If !pt or pt === 'all', show whichever are populated.
    const paymentChannel = (currentData.pt || '').toLowerCase();
    const isMomo = (paymentChannel === 'momo' || paymentChannel === 'all' || !paymentChannel) && Boolean(currentData.mu && currentData.mu.trim());
    const isBank = (paymentChannel === 'bank' || paymentChannel === 'wire' || paymentChannel === 'all' || (!paymentChannel && !currentData.mu)) && Boolean(currentData.ba && currentData.ba.trim());
    const isPaystack = paymentChannel === 'paystack' && Boolean(currentData.x?.ps);

    // Tier 3 pay strip: the client can act on the invoice right here
    const showPayStrip =
        stage === 'complete' &&
        isInvoice &&
        (balance > 0 || (paid === 0 && total > 0)) &&
        (isMomo || isBank || isPaystack);

    // Reassuring paid banner for Receipts or fully settled invoices
    const showPaidNotice =
        stage === 'complete' &&
        ((isInvoice && balance <= 0 && paid > 0) || isReceipt);

    // ─── Tier 3 pay strip: one tap copies the payment details the client needs ───
    const copyPayDetail = async (label: string, value: string) => {
        try {
            // CRITICAL: Strip spaces for MoMo / Phone & Bank numbers!
            // USSD prompts (*170#, *110#) and SMS gateways immediately reject numbers with spaces.
            let textToCopy = value;
            if (label === 'momo') {
                textToCopy = sanitizeNumberForCopy(value);
            } else if (label === 'bank') {
                textToCopy = sanitizeAccountForCopy(value);
            } else if (label === 'amount') {
                textToCopy = value.replace(/[^\d.]/g, '');
            }

            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(textToCopy);
            setPayCopied(label);
            setTimeout(() => setPayCopied(null), 2200);
        } catch {
            /* clipboard blocked — the value is still visible to read manually */
        }
    };
    const payRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
        background: '#141417',
        border: '1px solid #27272a',
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        color: '#fff',
        fontFamily: 'inherit',
        fontSize: '0.82rem',
        textAlign: 'left',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxSizing: 'border-box',
    };

    const saveImage = async () => {
        setIsSavingImage(true);
        try {
            const node = captureRef.current;
            if (!node) {
                setIsSavingImage(false);
                return;
            }

            await exportDocumentAsImage({
                node,
                filename: `${(data.k ?? 'receipt').toLowerCase()}-${data.rn || 'document'}.png`,
                // Capture at the document's original design width — 307px
                // thermal (355px sheet minus the thermal paper's 24px side
                // padding) or 820px full sheet — never the squeezed screen width.
                designWidth: isThermal ? 307 : 820,
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

    const printCss = isThermal
        ? `
      @page {
        size: auto;
        margin: 4mm auto;
      }
      @media print {
        body * { visibility: hidden; }
        .receipt-print-area, .receipt-print-area * { visibility: visible; }
        .receipt-print-area {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 auto !important;
          background: #fff;
        }
        .screen-only { display: none !important; }
      }
    `
        : `
      @page {
        size: A4 portrait;
        margin: 8mm 10mm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body * { visibility: hidden; }
        .receipt-print-area, .receipt-print-area * { visibility: visible; }
        .receipt-print-area {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        .document-print-full {
          display: block !important;
          width: 100% !important;
          max-width: 820px !important;
          min-width: 760px !important;
          margin: 0 auto !important;
          background: #ffffff !important;
        }
        .screen-only { display: none !important; }
      }
    `;

    return (
        <div style={{ minHeight: '100vh', background: '#09090b', padding: '24px 16px 48px', display: 'flex' }}>
            <style>{printCss}</style>

            {/* ─── ON-SCREEN: ANIMATED PRINTER — every document feeds out of the machine ─── */}
            <div className="screen-only" style={{ margin: 'auto', width: '100%', maxWidth: isThermal ? 420 : 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                    <span style={{ background: '#fef08a', color: '#000', fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Official {docLabel(currentData.k)}
                    </span>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', fontWeight: 700, color: '#d4d4d8' }}>
                        {currentData.n} issued you this {docLabel(currentData.k).toLowerCase()} <span style={{ fontFamily: 'monospace' }}>{currentData.rn}</span>
                    </p>
                </div>

                {justSignedBanner && (
                    <div
                        style={{
                            background: '#064e3b',
                            border: '1.5px solid #10b981',
                            color: '#ecfdf5',
                            padding: '10px 16px',
                            borderRadius: 6,
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            maxWidth: 520,
                            width: '100%',
                            boxSizing: 'border-box',
                            boxShadow: '0 8px 24px rgba(6, 78, 59, 0.4)',
                        }}
                    >
                        <DocumentLockedIcon size={22} color="#34d399" />
                        <span>Agreement locked &amp; executed! You and {currentData.n} can now download or print the official executed copy.</span>
                    </div>
                )}

                {/* The printer itself widens for full-sheet documents */}
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
                                        ? `Printing ${docLabel(currentData.k)}…`
                                        : `${docLabel(currentData.k)} ready`}
                            </ReceiptPrinter.Status>
                            <span className="rounded-[0.25rem] bg-zinc-50 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-950">
                                CreatorsKit
                            </span>
                        </ReceiptPrinter.Header>
                        <ReceiptPrinter.Screen>
                            <div className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-widest">
                                <span>{sym}{(currentData.k && currentData.k !== 'receipt' ? total : paid).toLocaleString()}</span>
                                <span>{currentData.k && currentData.k !== 'receipt' ? 'Total due' : paid >= total ? 'Paid in full' : 'Partial'}</span>
                            </div>
                            <p className="mt-1 truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                {currentData.c} · {currentData.rn}
                            </p>
                        </ReceiptPrinter.Screen>
                    </ReceiptPrinter.Machine>

                    {/* Expandable tray — grows with the feed */}
                    <ReceiptPrinter.Output
                        style={{
                            height: stage === 'processing'
                                ? TRAY_COMPACT
                                : paperHeight
                                    ? paperHeight + 24
                                    : 576,
                            transition: `height ${FEED_MS}ms linear`,
                        }}
                    >
                        <div ref={paperRef}>
                            <ReceiptPrinter.Paper
                                variant={isThermal ? 'receipt' : 'document'}
                                scaleToFit={fitMode === 'fit'}
                            >
                                <div ref={captureRef}>
                                    <SharedDocumentView data={currentData} qrUrl={qrUrl} showBranding={currentData.br !== 0} />
                                </div>
                            </ReceiptPrinter.Paper>
                        </div>
                    </ReceiptPrinter.Output>
                </ReceiptPrinter.Root>

                {/* Tier 3 — PAY strip: modern, executive payment card with channel filtering */}
                {showPayStrip && (
                    <div
                        className="screen-only"
                        style={{
                            width: '100%',
                            maxWidth: 460,
                            background: 'linear-gradient(180deg, #18181b 0%, #101013 100%)',
                            border: '1px solid #27272a',
                            borderRadius: 10,
                            padding: '16px 18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            boxSizing: 'border-box',
                            boxShadow: '0 16px 36px -12px rgba(0, 0, 0, 0.6)',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 6, borderBottom: '1px solid #27272a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f4f4f5' }}>
                                    Payment Options
                                </span>
                                {depositPercent > 0 && (
                                    <span style={{ background: '#27272a', color: '#fef08a', fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid #3f3f46' }}>
                                        {depositPercent}% Deposit
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '0.62rem', color: '#71717a' }}>Tap row to copy</span>
                        </div>

                        {/* Mobile Money Row (Only rendered if creator configured Mobile Money) */}
                        {isMomo && (
                            <button
                                type="button"
                                onClick={() => copyPayDetail('momo', currentData.mu!)}
                                style={payRowStyle}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 6, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f59e0b' }}>
                                        <Smartphone size={17} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textAlign: 'left' }}>
                                        <span style={{ fontSize: '0.6rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                                            {currentData.mn || 'Mobile Money'} {currentData.x?.mnm ? `· ${currentData.x.mnm}` : ''}
                                        </span>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {formatPhoneNumberForDisplay(currentData.mu)}
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '5px 10px',
                                    borderRadius: 5,
                                    fontSize: '0.66rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    background: payCopied === 'momo' ? '#064e3b' : '#27272a',
                                    color: payCopied === 'momo' ? '#34d399' : '#e4e4e7',
                                    border: payCopied === 'momo' ? '1px solid #10b981' : '1px solid #3f3f46',
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease',
                                }}>
                                    {payCopied === 'momo' ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
                                    <span>{payCopied === 'momo' ? 'Copied (No Spaces)' : 'Copy'}</span>
                                </div>
                            </button>
                        )}

                        {/* Bank Transfer Row (Only rendered if creator configured Bank Transfer) */}
                        {isBank && (
                            <button
                                type="button"
                                onClick={() => copyPayDetail('bank', currentData.ba!)}
                                style={payRowStyle}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 6, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#60a5fa' }}>
                                        <Building2 size={17} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textAlign: 'left' }}>
                                        <span style={{ fontSize: '0.6rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                                            {currentData.bn || 'Bank Transfer'} {currentData.x?.ban ? `· ${currentData.x.ban}` : ''}
                                        </span>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {currentData.ba}
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '5px 10px',
                                    borderRadius: 5,
                                    fontSize: '0.66rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    background: payCopied === 'bank' ? '#064e3b' : '#27272a',
                                    color: payCopied === 'bank' ? '#34d399' : '#e4e4e7',
                                    border: payCopied === 'bank' ? '1px solid #10b981' : '1px solid #3f3f46',
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease',
                                }}>
                                    {payCopied === 'bank' ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
                                    <span>{payCopied === 'bank' ? 'Copied' : 'Copy'}</span>
                                </div>
                            </button>
                        )}

                        {/* Paystack Online Row (Only rendered if Paystack enabled) */}
                        {isPaystack && currentData.x?.ps && (
                            <a
                                href={currentData.x.ps}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    ...payRowStyle,
                                    textDecoration: 'none',
                                    background: '#09090b',
                                    borderColor: '#22c55e',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 6, background: '#052e16', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#22c55e' }}>
                                        <CreditCard size={17} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textAlign: 'left' }}>
                                        <span style={{ fontSize: '0.6rem', color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                                            Instant Online Checkout
                                        </span>
                                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff' }}>
                                            Pay with Card / MoMo / Apple Pay
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '5px 12px',
                                    borderRadius: 5,
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    background: '#22c55e',
                                    color: '#000000',
                                    flexShrink: 0,
                                }}>
                                    <span>Pay Online</span>
                                    <ExternalLink size={12} />
                                </div>
                            </a>
                        )}

                        {/* Amount Due Row */}
                        <button
                            type="button"
                            onClick={() => copyPayDetail('amount', `${payableAmount}`)}
                            style={payRowStyle}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 6, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#e4e4e7', fontSize: '0.85rem', fontWeight: 900 }}>
                                    {sym}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textAlign: 'left' }}>
                                    <span style={{ fontSize: '0.6rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                                        {depositAmount && depositAmount > 0 ? `Deposit Due (${depositPercent}%)` : 'Total Amount Due'}
                                    </span>
                                    <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#ffffff' }}>
                                        {sym}{payableAmount.toLocaleString()}
                                        {depositAmount && depositAmount > 0 ? (
                                            <span style={{ fontSize: '0.66rem', color: '#a1a1aa', fontWeight: 500, marginLeft: 8 }}>
                                                (Total: {sym}{total.toLocaleString()})
                                            </span>
                                        ) : null}
                                    </span>
                                </div>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 10px',
                                borderRadius: 5,
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: payCopied === 'amount' ? '#064e3b' : '#27272a',
                                color: payCopied === 'amount' ? '#34d399' : '#e4e4e7',
                                border: payCopied === 'amount' ? '1px solid #10b981' : '1px solid #3f3f46',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                            }}>
                                {payCopied === 'amount' ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
                                <span>{payCopied === 'amount' ? 'Copied' : 'Copy'}</span>
                            </div>
                        </button>

                        {/* MoMo Helper tips */}
                        {isMomo && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: '#09090b', borderRadius: 6, border: '1px solid #27272a' }}>
                                <span style={{ fontSize: '0.65rem', color: '#a1a1aa', lineHeight: 1.4 }}>
                                    <strong style={{ color: '#e4e4e7' }}>MoMo:</strong> Dial <strong>*170#</strong> (MTN) or <strong>*110#</strong> (Telecel) → Send Money → Paste copied number (<strong style={{ color: '#34d399' }}>{sanitizeNumberForCopy(currentData.mu)}</strong>, zero spaces) &amp; amount.
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Reassurance banner for Official Receipts or settled Invoices */}
                {showPaidNotice && (
                    <div
                        className="screen-only"
                        style={{
                            width: '100%',
                            maxWidth: 460,
                            background: 'linear-gradient(180deg, #064e3b20 0%, #064e3b0a 100%)',
                            border: '1px solid #059669',
                            borderRadius: 8,
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            boxSizing: 'border-box',
                        }}
                    >
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ffffff' }}>
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textAlign: 'left' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ecfdf5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {isReceipt ? 'Official Receipt · Paid in Full' : 'Invoice Settled · Paid in Full'}
                            </span>
                            <span style={{ fontSize: '0.67rem', color: '#a7f3d0' }}>
                                Payment of {sym}{(paid || total).toLocaleString()} confirmed. No further payment required.
                            </span>
                        </div>
                    </div>
                )}

                {/* Mobile View Mode Switcher for Full-Sheet Documents */}
                {!isThermal && stage === 'complete' && isMobileDevice && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '2px 0 2px' }}>
                        <button
                            onClick={() => setFitMode('fit')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                fontSize: '0.68rem',
                                fontFamily: 'monospace',
                                fontWeight: fitMode === 'fit' ? 900 : 600,
                                textTransform: 'uppercase',
                                background: fitMode === 'fit' ? '#FFE500' : '#18181b',
                                color: fitMode === 'fit' ? '#000' : '#a1a1aa',
                                border: fitMode === 'fit' ? '1.5px solid #000' : '1px solid #3f3f46',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }}
                        >
                            Fit Sheet
                        </button>
                        <button
                            onClick={() => setFitMode('full')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                fontSize: '0.68rem',
                                fontFamily: 'monospace',
                                fontWeight: fitMode === 'full' ? 900 : 600,
                                textTransform: 'uppercase',
                                background: fitMode === 'full' ? '#FFE500' : '#18181b',
                                color: fitMode === 'full' ? '#000' : '#a1a1aa',
                                border: fitMode === 'full' ? '1.5px solid #000' : '1px solid #3f3f46',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }}
                        >
                            100% Actual Size
                        </button>
                    </div>
                )}

                {stage === 'complete' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, width: '100%', maxWidth: 460 }}>
                        {/* 1-Click "Approve & Sign" Button for Agreements */}
                        {isAgreement && !isSigned && (
                            <>
                                <div
                                    style={{
                                        gridColumn: '1 / -1',
                                        background: '#18181b',
                                        border: '1.5px solid #52525b',
                                        borderRadius: 4,
                                        padding: '7px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        fontFamily: 'monospace',
                                        color: '#f4f4f5',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    <DocumentUnlockedIcon size={15} color="#fbbf24" />
                                    <span>Agreement Currently Unlocked &bull; Sign below to lock &amp; execute</span>
                                </div>
                                <button
                                    onClick={() => setIsSigningOpen(true)}
                                    style={{
                                        gridColumn: '1 / -1',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        background: '#22c55e',
                                        color: '#000000',
                                        border: '2px solid #000000',
                                        borderRadius: 4,
                                        boxShadow: '3px 3px 0 #000000',
                                        height: 44,
                                        padding: '0 16px',
                                        fontSize: '0.82rem',
                                        fontWeight: 900,
                                        fontFamily: 'monospace',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        transition: 'transform 0.1s ease',
                                    }}
                                >
                                    <PenLine size={16} /> 1-Click Approve &amp; Lock Agreement
                                </button>
                            </>
                        )}

                        {isAgreement && isSigned && (
                            <div
                                style={{
                                    gridColumn: '1 / -1',
                                    background: '#064e3b',
                                    border: '1.5px solid #10b981',
                                    borderRadius: 4,
                                    padding: '9px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    color: '#ecfdf5',
                                    textTransform: 'uppercase',
                                }}
                            >
                                <DocumentLockedIcon size={18} color="#34d399" />
                                <span>Agreement Locked &amp; Executed ({currentData.x?.sigClient || currentData.c})</span>
                            </div>
                        )}

                        {isMobileDevice ? (
                            <>
                                <button
                                    onClick={saveImage}
                                    disabled={isSavingImage}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#000', color: '#fff', border: '2px solid #000', borderRadius: '4px', boxShadow: '3px 3px 0 #000', height: 40, padding: '0 12px', fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: isSavingImage ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                                >
                                    {isSavingImage ? <ThinkingOrb size={20} state="working" /> : <Download size={14} />} {isSavingImage ? 'Saving…' : 'Save Picture (PNG)'}
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#000', border: '2px solid #000', borderRadius: '4px', boxShadow: '3px 3px 0 #000', height: 40, padding: '0 12px', fontSize: '0.74rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                    <Printer size={14} /> Print / PDF
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => window.print()}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#000', color: '#fff', border: '2px solid #000', borderRadius: '4px', boxShadow: '3px 3px 0 #000', height: 40, padding: '0 12px', fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                    <Printer size={14} /> Print / Save PDF
                                </button>
                                <button
                                    onClick={saveImage}
                                    disabled={isSavingImage}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#000', border: '2px solid #000', borderRadius: '4px', boxShadow: '3px 3px 0 #000', height: 40, padding: '0 12px', fontSize: '0.74rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', cursor: isSavingImage ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                                >
                                    {isSavingImage ? <ThinkingOrb size={20} state="working" /> : <Download size={14} />} {isSavingImage ? 'Saving…' : 'Save Picture (PNG)'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => {
                                if (navigator.clipboard) {
                                    navigator.clipboard.writeText(window.location.href);
                                    setLinkCopied(true);
                                    setTimeout(() => setLinkCopied(false), 2500);
                                }
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#000', border: '2px solid #000', borderRadius: '4px', boxShadow: '3px 3px 0 #000', height: 40, padding: '0 12px', fontSize: '0.74rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            {linkCopied ? <Check size={14} /> : <Share2 size={14} />} {linkCopied ? 'Link Copied' : 'Share Link'}
                        </button>
                    </div>
                )}
            </div>

            {/* ─── 1-CLICK "APPROVE & SIGN" MODAL ─── */}
            {isSigningOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        boxSizing: 'border-box',
                    }}
                    onClick={() => setIsSigningOpen(false)}
                >
                    <div
                        style={{
                            background: '#09090b',
                            color: '#ffffff',
                            border: '2px solid #27272a',
                            borderRadius: 8,
                            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.7)',
                            width: '100%',
                            maxWidth: 480,
                            padding: '24px 22px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ background: '#22c55e', color: '#000', fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 2 }}>
                                        LEGAL eSIGN
                                    </span>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>Approve &amp; Sign Agreement</h3>
                                </div>
                                <p style={{ margin: '6px 0 0', fontSize: '0.76rem', color: '#a1a1aa', lineHeight: 1.4 }}>
                                    Enter your name and sign below to officially execute this agreement with {currentData.n}.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSigningOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: 4 }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Signer Info Form */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', color: '#d4d4d8', marginBottom: 4 }}>
                                    Your Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={signerName}
                                    onChange={(e) => {
                                        setSignerName(e.target.value);
                                        if (signMode === 'type') setTypedSign(e.target.value);
                                    }}
                                    placeholder="e.g. Jane Doe"
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        background: '#18181b',
                                        border: '1.5px solid #3f3f46',
                                        borderRadius: 4,
                                        padding: '8px 10px',
                                        fontSize: '0.82rem',
                                        color: '#ffffff',
                                        fontWeight: 600,
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', color: '#d4d4d8', marginBottom: 4 }}>
                                    Your Title / Role
                                </label>
                                <input
                                    type="text"
                                    value={signerTitle}
                                    onChange={(e) => setSignerTitle(e.target.value)}
                                    placeholder="e.g. Brand Director"
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        background: '#18181b',
                                        border: '1.5px solid #3f3f46',
                                        borderRadius: 4,
                                        padding: '8px 10px',
                                        fontSize: '0.82rem',
                                        color: '#ffffff',
                                        fontWeight: 600,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Signature Mode Toggle */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', color: '#d4d4d8' }}>
                                    Signature
                                </label>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                        type="button"
                                        onClick={() => setSignMode('draw')}
                                        style={{
                                            background: signMode === 'draw' ? '#ffffff' : '#27272a',
                                            color: signMode === 'draw' ? '#000000' : '#a1a1aa',
                                            border: 'none',
                                            borderRadius: 3,
                                            padding: '2px 8px',
                                            fontSize: '0.65rem',
                                            fontFamily: 'monospace',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        DRAW
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignMode('type')}
                                        style={{
                                            background: signMode === 'type' ? '#ffffff' : '#27272a',
                                            color: signMode === 'type' ? '#000000' : '#a1a1aa',
                                            border: 'none',
                                            borderRadius: 3,
                                            padding: '2px 8px',
                                            fontSize: '0.65rem',
                                            fontFamily: 'monospace',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        TYPE
                                    </button>
                                </div>
                            </div>

                            {signMode === 'draw' ? (
                                <div style={{ position: 'relative' }}>
                                    <canvas
                                        ref={canvasRef}
                                        width={436}
                                        height={110}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                        style={{
                                            width: '100%',
                                            height: 110,
                                            background: '#ffffff',
                                            border: '2px solid #3f3f46',
                                            borderRadius: 4,
                                            cursor: 'crosshair',
                                            touchAction: 'none',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={clearCanvas}
                                        title="Clear drawing"
                                        style={{
                                            position: 'absolute',
                                            bottom: 8,
                                            right: 8,
                                            background: 'rgba(0, 0, 0, 0.08)',
                                            border: '1px solid #d4d4d8',
                                            borderRadius: 3,
                                            padding: '3px 8px',
                                            fontSize: '0.65rem',
                                            fontFamily: 'monospace',
                                            fontWeight: 700,
                                            color: '#52525b',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        <RotateCcw size={11} /> Clear
                                    </button>
                                    <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '0.62rem', color: '#9ca3af', fontFamily: 'monospace', pointerEvents: 'none' }}>
                                        Draw signature with finger or mouse
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: '#ffffff', border: '2px solid #3f3f46', borderRadius: 4, padding: '16px 20px', minHeight: 78, display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontFamily: 'Caveat, cursive, sans-serif', fontSize: '32px', color: '#1e3a8a', lineHeight: 1, transform: 'rotate(-2deg)' }}>
                                        {typedSign || signerName || 'Your Signature'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Consent Checkbox */}
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', margin: '14px 0 16px' }}>
                            <input
                                type="checkbox"
                                checked={agreementChecked}
                                onChange={(e) => setAgreementChecked(e.target.checked)}
                                style={{ marginTop: 2, accentColor: '#22c55e', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#d4d4d8', lineHeight: 1.4 }}>
                                I confirm I am authorized to execute this agreement and accept the deliverables, terms, and payment conditions detailed herein.
                            </span>
                        </label>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                onClick={() => setIsSigningOpen(false)}
                                style={{
                                    flex: 1,
                                    background: '#27272a',
                                    border: '1px solid #3f3f46',
                                    borderRadius: 4,
                                    color: '#ffffff',
                                    height: 42,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSign}
                                disabled={!signerName.trim() || !agreementChecked || isSubmittingSign}
                                style={{
                                    flex: 2,
                                    background: !signerName.trim() || !agreementChecked ? '#3f3f46' : '#22c55e',
                                    color: '#000000',
                                    border: '2px solid #000000',
                                    borderRadius: 4,
                                    boxShadow: '3px 3px 0 #000000',
                                    height: 42,
                                    fontSize: '0.78rem',
                                    fontWeight: 900,
                                    fontFamily: 'monospace',
                                    textTransform: 'uppercase',
                                    cursor: !signerName.trim() || !agreementChecked || isSubmittingSign ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                            >
                                {isSubmittingSign ? <ThinkingOrb size={20} state="working" /> : <DocumentLockedIcon size={16} color="#000000" />}
                                {isSubmittingSign ? 'Signing…' : 'Sign & Lock Agreement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                        <SharedDocumentView data={currentData} qrUrl={qrUrl} showBranding={currentData.br !== 0} />
                    </div>
                ) : (
                    <div className="document-print-full" style={{ width: '100%', maxWidth: 820, margin: '0 auto', background: '#ffffff', color: '#09090b' }}>
                        <SharedDocumentView data={currentData} qrUrl={qrUrl} showBranding={currentData.br !== 0} />
                    </div>
                )}
            </div>
        </div>
    );
}

