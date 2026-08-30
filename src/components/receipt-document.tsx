'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';

/**
 * ReceiptDocument — the canonical THERMAL receipt layout.
 *
 * Single source of truth for the receipt style. Rendered inside
 * ReceiptPrinter.Paper by BOTH the Business Suite animated printer overlay and
 * the client-facing /receipt link page, and reused verbatim by the /receipt
 * print-only (download) output — so the animated print, the on-screen client
 * view and the printed/downloaded receipt are pixel-identical and can never
 * drift apart.
 *
 * The component is tone-agnostic: it inherits `currentColor` from its parent
 * (light text on the dark-mode paper, dark text on the print output) and uses
 * opacity for muted elements, dashed currentColor dividers, and a
 * repeating-linear-gradient barcode.
 */

export type ReceiptDocumentItem = {
    id?: string;
    description: string;
    quantity: number;
    rate: number;
};

export type ReceiptDocumentData = {
    logoUrl?: string | null;
    creatorName: string;
    creatorHandle: string;
    creatorEmail: string;
    creatorPhone: string;
    creatorLocation: string;
    clientName: string;
    clientContact: string;
    currency: string;
    sym: string;
    receiptNumber: string;
    issueDate: string;
    items: ReceiptDocumentItem[];
    discountAmount: number;
    taxPercentage: number;
    subtotal: number;
    tax: number;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    paymentType: string;
    payChannel: string;
};

export type ReceiptDocumentProps = {
    data: ReceiptDocumentData;
    /** Cap line items — the printer paper has finite height. Default 6. */
    maxItems?: number;
    /** URL encoded into the scannable QR code (the Supabase short link). */
    qrUrl?: string;
    /** Show the "Powered by CreatorKit" badge. Default true. */
    showBranding?: boolean;
    style?: CSSProperties;
};

const MONO_FONT =
    "'DM Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const MUTED_OPACITY = 0.62;

function Divider() {
    return (
        <div
            aria-hidden="true"
            style={{ borderTop: '1px dashed currentColor', opacity: 0.35, margin: '12px 0' }}
        />
    );
}

function Row({
    label,
    value,
    emphasizeValue = true,
}: {
    label: string;
    value: string;
    emphasizeValue?: boolean;
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10, lineHeight: 1.6 }}>
            <span style={{ opacity: MUTED_OPACITY, flexShrink: 0 }}>{label}</span>
            <span
                style={{
                    fontWeight: emphasizeValue ? 700 : 400,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {value}
            </span>
        </div>
    );
}

export default function ReceiptDocument({
    data,
    maxItems = 6,
    qrUrl,
    showBranding = true,
    style,
}: ReceiptDocumentProps) {
    const { sym } = data;
    const [qrSrc, setQrSrc] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        if (!qrUrl) {
            setQrSrc(null);
            return;
        }
        QRCode.toDataURL(qrUrl, {
            margin: 1,
            width: 240,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000ff', light: '#ffffffff' },
        })
            .then((src) => {
                if (alive) setQrSrc(src);
            })
            .catch(() => {
                if (alive) setQrSrc(null);
            });
        return () => {
            alive = false;
        };
    }, [qrUrl]);
    const visibleItems = data.items.slice(0, maxItems);
    const hiddenCount = data.items.length - visibleItems.length;
    const paidInFull = data.amountPaid >= data.totalAmount;

    return (
        <div style={{ fontFamily: MONO_FONT, color: 'inherit', ...style }}>
            {/* ─── Header + logo ─── */}
            <div style={{ textAlign: 'center' }}>
                {data.logoUrl && (
                    <img
                        src={data.logoUrl}
                        alt={`${data.creatorName} logo`}
                        style={{ height: 44, width: 'auto', objectFit: 'contain', margin: '0 auto 4px', display: 'block' }}
                    />
                )}
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    {data.creatorName}
                </div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: MUTED_OPACITY, marginTop: 2 }}>
                    {data.creatorHandle} · {data.creatorLocation}
                </div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: MUTED_OPACITY }}>
                    {data.creatorPhone}
                </div>
            </div>

            <Divider />

            {/* ─── Receipt title ─── */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                    Payment Receipt
                </div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: MUTED_OPACITY, marginTop: 2 }}>
                    {data.receiptNumber} · {data.issueDate}
                </div>
            </div>

            <Divider />

            {/* ─── Parties + payment channel ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Row label="Received from" value={data.clientName} />
                <Row label="Channel" value={data.payChannel} />
            </div>

            <Divider />

            {/* ─── Line items (right-aligned prices) ─── */}
            <div style={{ fontSize: 10, lineHeight: 1.5 }}>
                {visibleItems.map((item, idx) => (
                    <div
                        key={item.id ?? idx}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}
                    >
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.quantity}× {item.description}
                        </span>
                        <span style={{ fontWeight: 700, flexShrink: 0 }}>
                            {sym}{(item.quantity * item.rate).toLocaleString()}
                        </span>
                    </div>
                ))}
                {hiddenCount > 0 && (
                    <div style={{ opacity: MUTED_OPACITY }}>
                        + {hiddenCount} more item{hiddenCount === 1 ? '' : 's'}
                    </div>
                )}
            </div>

            <Divider />

            {/* ─── Totals block ─── */}
            <div style={{ fontSize: 10, lineHeight: 1.7 }}>
                <Row label="Subtotal" value={`${sym}${data.subtotal.toLocaleString()}`} emphasizeValue={false} />
                {data.discountAmount > 0 && (
                    <Row label="Discount" value={`-${sym}${data.discountAmount.toLocaleString()}`} emphasizeValue={false} />
                )}
                {data.taxPercentage > 0 && (
                    <Row label={`WHT (${data.taxPercentage}%)`} value={`${sym}${data.tax.toLocaleString()}`} emphasizeValue={false} />
                )}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontWeight: 900,
                        fontSize: 11,
                        borderTop: '2px solid currentColor',
                        paddingTop: 4,
                        marginTop: 4,
                    }}
                >
                    <span>Total</span>
                    <span>{sym}{data.totalAmount.toLocaleString()}</span>
                </div>
            </div>

            <Divider />

            {/* ─── Emphasized amount paid ─── */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: MUTED_OPACITY }}>
                    Amount paid
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {sym}{data.amountPaid.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: MUTED_OPACITY }}>
                    {paidInFull
                        ? 'Paid in full'
                        : `Balance due: ${sym}${data.balanceDue.toLocaleString()}`}
                </div>
            </div>

            <Divider />

            {/* ─── Scannable QR (or barcode fallback) + receipt number ─── */}
            {qrSrc ? (
                <img
                    src={qrSrc}
                    alt="Scan to view and verify this receipt online"
                    style={{ display: 'block', margin: '0 auto', width: 116, height: 116 }}
                />
            ) : (
                <div
                    aria-hidden="true"
                    style={{
                        margin: '0 auto',
                        height: 32,
                        width: 176,
                        background:
                            'repeating-linear-gradient(90deg,currentColor 0 2px,transparent 2px 4px,currentColor 4px 7px,transparent 7px 9px,currentColor 9px 10px,transparent 10px 13px)',
                    }}
                />
            )}
            <div style={{ textAlign: 'center', fontSize: 9, letterSpacing: '0.3em', marginTop: 4 }}>
                {data.receiptNumber}
            </div>
            {qrSrc && (
                <div style={{ textAlign: 'center', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: MUTED_OPACITY, marginTop: 2 }}>
                    Scan to view & verify online
                </div>
            )}

            {/* ─── Footer ─── */}
            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 12 }}>
                Thank you!
            </div>
            <div style={{ textAlign: 'center', fontSize: 9, opacity: MUTED_OPACITY, marginTop: 2 }}>
                {data.creatorEmail}{showBranding ? ' · Powered by CreatorKit' : ''}
            </div>
        </div>
    );
}
