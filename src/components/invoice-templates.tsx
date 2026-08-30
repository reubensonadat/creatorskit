'use client';

import React, { useEffect } from 'react';
import { numberToWords, injectInvoiceGoogleFont } from '@/lib/invoice-fonts';

export type InvoiceTemplateId = 'navy' | 'ledger' | 'slate' | 'brutalist';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  platform?: string;
}

export interface InvoiceData {
  // Creator / Seller
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
  creatorPhone: string;
  creatorLocation: string;
  creatorNiche: string;
  logoUrl?: string | null;

  // Client
  clientName: string;
  clientContact: string;
  clientEmail: string;
  clientAddress: string;
  shippingAddress?: string;

  // Invoice Details
  invoiceNumber: string;
  poNumber?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  sym: string;

  // Deliverables & Pricing
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxPercentage: number;
  tax: number;
  totalAmount: number;
  depositPercentage: number;
  depositRequired: number;
  amountPaid: number;
  balanceDue: number;

  // Payment
  paymentType: 'momo' | 'bank' | 'paystack' | 'wire';
  momoNetwork: string;
  momoNumber: string;
  momoName: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paystackLink: string;
  wireSwift: string;
  wireIban: string;

  // Terms & Signature
  usagePeriod: string;
  revisionRounds: number;
  turnaroundDays: number;
  signatureName?: string;
  customNotes?: string;

  // Typography & Color Customization
  headingFont?: string;
  bodyFont?: string;
  signatureFont?: string;
  primaryColor?: string;
  accentColor?: string;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  /** Show the "Powered by CreatorKit" badge. Default true. */
  showBranding?: boolean;
}

/* =========================================================================
   TEMPLATE 1: MINIMAL EXECUTIVE (Clean, crisp, standard A4 layout)
   ========================================================================= */
export function BoldNavyInvoice({ data, showBranding = true }: InvoiceTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  const primaryColor = data.primaryColor || '#111827';
  const accentColor = data.accentColor || '#e15b3c';

  return (
    <div
      style={{
        fontFamily: `"${bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        color: '#111827',
        background: '#ffffff',
        padding: 'clamp(28px, 4vw, 44px)',
        fontSize: '11px',
        lineHeight: 1.6,
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${primaryColor}`, paddingBottom: 20, marginBottom: 24, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {data.logoUrl && (
            <img
              src={data.logoUrl}
              alt="Logo"
              style={{
                height: 48,
                width: 48,
                objectFit: 'contain',
                border: '1px solid #e5e7eb',
                background: '#fff',
                padding: 2,
              }}
            />
          )}
          <div>
            <div
              style={{
                fontFamily: `"${headingFont}", sans-serif`,
                fontSize: '1.35rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: primaryColor,
              }}
            >
              {data.creatorName}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', marginTop: 1 }}>
              {data.creatorHandle} · {data.creatorNiche}
            </div>
            <div style={{ fontSize: '9.5px', color: '#6b7280', marginTop: 2 }}>
              {data.creatorPhone} | {data.creatorEmail} | {data.creatorLocation}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <h1
            style={{
              fontFamily: `"${headingFont}", sans-serif`,
              fontSize: '1.5rem',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              color: primaryColor,
              lineHeight: 1,
            }}
          >
            INVOICE
          </h1>
          <div style={{ fontSize: '9.5px', fontWeight: 800, fontFamily: 'monospace', color: '#4b5563', marginTop: 6 }}>
            NO: {data.invoiceNumber}
          </div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280' }}>
            DATE: {data.issueDate}
          </div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280' }}>
            DUE: {data.dueDate}
          </div>
        </div>
      </div>

      {/* Bill To & Payment Channel 2-Column Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 24, background: '#fafafa', border: '1px solid #e5e7eb', padding: '14px 18px' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 4 }}>
            BILLED TO:
          </div>
          <div style={{ fontWeight: 800, fontSize: '12px', color: '#111827' }}>
            {data.clientName}
          </div>
          {data.clientContact && <div style={{ fontWeight: 600, color: '#374151', fontSize: '10.5px' }}>{data.clientContact}</div>}
          <div style={{ color: '#4b5563', fontSize: '10px' }}>{data.clientAddress}</div>
          {data.clientEmail && <div style={{ color: '#6b7280', fontSize: '9.5px' }}>{data.clientEmail}</div>}
        </div>

        <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 18 }}>
          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 4 }}>
            PAYMENT INSTRUCTIONS:
          </div>
          <div style={{ fontSize: '10px', color: '#374151', lineHeight: 1.5 }}>
            {data.paymentType === 'momo' && (
              <>
                <div><strong>Network:</strong> {data.momoNetwork}</div>
                <div><strong>MoMo Number:</strong> {data.momoNumber}</div>
                <div><strong>Account Name:</strong> {data.momoName || data.creatorName}</div>
              </>
            )}
            {data.paymentType === 'bank' && (
              <>
                <div><strong>Bank:</strong> {data.bankName}</div>
                <div><strong>Account No:</strong> {data.bankAccountNumber}</div>
                <div><strong>Account Name:</strong> {data.bankAccountName || data.creatorName}</div>
              </>
            )}
            {data.paymentType === 'paystack' && (
              <div><strong>Pay Online:</strong> {data.paystackLink}</div>
            )}
            {data.paymentType === 'wire' && (
              <>
                <div><strong>SWIFT:</strong> {data.wireSwift}</div>
                <div><strong>IBAN:</strong> {data.wireIban}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div style={{ marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${primaryColor}`, background: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 800, width: '55%' }}>
                DESCRIPTION
              </th>
              <th style={{ textAlign: 'center', padding: '8px', fontWeight: 800, width: '12%' }}>
                QTY
              </th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 800, width: '16%' }}>
                RATE
              </th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 800, width: '17%' }}>
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '9px 10px', color: '#1f2937', fontWeight: 500 }}>
                  {i.description}
                </td>
                <td style={{ padding: '9px', textAlign: 'center', fontWeight: 600 }}>
                  {i.quantity}
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#4b5563' }}>
                  {data.sym}{i.rate.toLocaleString()}
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                  {data.sym}{(i.quantity * i.rate).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Notes Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Deal Terms / Notes */}
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', marginBottom: 4 }}>
            TERMS &amp; CONDITIONS
          </div>
          <div style={{ fontSize: '10px', color: '#4b5563', lineHeight: 1.5 }}>
            <div>• Payment due within <strong>{data.turnaroundDays || 15} days</strong> of invoice date.</div>
            <div>• Includes up to <strong>{data.revisionRounds} rounds of minor revisions</strong>.</div>
            <div>• Usage license: <strong>{data.usagePeriod}</strong>.</div>
            {data.customNotes && <div style={{ marginTop: 4, fontStyle: 'italic' }}>{data.customNotes}</div>}
          </div>
        </div>

        {/* Financial Calculation Box */}
        <div style={{ border: '1px solid #e5e7eb', background: '#fafafa', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#4b5563', fontSize: '10px' }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{data.sym}{data.subtotal.toLocaleString()}</span>
          </div>

          {data.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#16a34a', fontSize: '10px' }}>
              <span>Discount</span>
              <span>-{data.sym}{data.discountAmount.toLocaleString()}</span>
            </div>
          )}

          {data.tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#4b5563', fontSize: '10px' }}>
              <span>Tax ({data.taxPercentage}%)</span>
              <span>+{data.sym}{data.tax.toLocaleString()}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #111827', marginTop: 6, paddingTop: 6, fontWeight: 900, fontSize: '12px', color: primaryColor }}>
            <span>TOTAL AMOUNT</span>
            <span>{data.sym}{data.totalAmount.toLocaleString()}</span>
          </div>

          {data.depositPercentage < 100 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 2px', fontSize: '10px', color: '#4b5563', marginTop: 4 }}>
                <span>Upfront Deposit ({data.depositPercentage}%)</span>
                <span style={{ fontWeight: 700 }}>{data.sym}{data.depositRequired.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 2px', fontSize: '10px', color: '#4b5563' }}>
                <span>Amount Paid</span>
                <span style={{ fontWeight: 600 }}>{data.sym}{data.amountPaid.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 4, marginTop: 4, fontWeight: 800, fontSize: '11px', color: accentColor }}>
                <span>BALANCE DUE</span>
                <span>{data.sym}{data.balanceDue.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Signature Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, marginBottom: 20 }}>
        <div style={{ width: 220 }}>
          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
            AUTHORIZED SIGNATURE:
          </div>
          {/* Fixed blank manual signing space with solid underline */}
          <div
            style={{
              height: 64,
              borderBottom: '1.5px solid #000',
              marginBottom: 4,
            }}
          />
          <div style={{ fontWeight: 800, fontSize: '10px' }}>{data.creatorName}</div>
          <div style={{ fontSize: '9px', color: '#6b7280' }}>Date: {data.issueDate}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#9ca3af' }}>
        <div>Thank you for your business.</div>
        {showBranding && (
          <div style={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Powered by CreatorKit
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   TEMPLATE 2: LEDGER GRID (Clean tabular accounting standard)
   ========================================================================= */
export function LedgerGridInvoice({ data, showBranding = true }: InvoiceTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  const primaryColor = data.primaryColor || '#000000';
  const writtenAmount = numberToWords(data.totalAmount, data.currency);

  return (
    <div
      style={{
        fontFamily: `"${bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        color: '#000000',
        background: '#ffffff',
        padding: 'clamp(28px, 4vw, 44px)',
        fontSize: '11px',
        lineHeight: 1.5,
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            {data.creatorName}
          </div>
          <div style={{ fontSize: '9.5px', color: '#4b5563', marginTop: 2 }}>
            {data.creatorHandle} | {data.creatorEmail} | {data.creatorPhone}
          </div>
          <div style={{ fontSize: '9px', color: '#6b7280' }}>
            {data.creatorLocation}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            INVOICE
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 800, fontFamily: 'monospace', marginTop: 4 }}>
            NO: {data.invoiceNumber}
          </div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280' }}>
            DATE: {data.issueDate} | DUE: {data.dueDate}
          </div>
        </div>
      </div>

      {/* Bill To Info */}
      <div style={{ border: '1px solid #000', padding: '10px 14px', marginBottom: 18, background: '#fafafa' }}>
        <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
          CUSTOMER / CLIENT:
        </div>
        <div style={{ fontWeight: 800, fontSize: '11.5px', marginTop: 2 }}>{data.clientName}</div>
        {data.clientContact && <div style={{ fontSize: '10px', color: '#374151' }}>Attn: {data.clientContact}</div>}
        <div style={{ fontSize: '9.5px', color: '#4b5563' }}>{data.clientAddress}</div>
      </div>

      {/* Ledger Grid Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginBottom: 18 }}>
        <thead>
          <tr style={{ background: '#000000', color: '#ffffff' }}>
            <th style={{ border: '1px solid #000', padding: '7px 10px', textAlign: 'left', fontWeight: 800, width: '55%' }}>
              ITEM DESCRIPTION
            </th>
            <th style={{ border: '1px solid #000', padding: '7px', textAlign: 'center', fontWeight: 800, width: '12%' }}>
              QTY
            </th>
            <th style={{ border: '1px solid #000', padding: '7px 10px', textAlign: 'right', fontWeight: 800, width: '16%' }}>
              UNIT RATE
            </th>
            <th style={{ border: '1px solid #000', padding: '7px 10px', textAlign: 'right', fontWeight: 800, width: '17%' }}>
              AMOUNT
            </th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((i) => (
            <tr key={i.id}>
              <td style={{ border: '1px solid #e5e7eb', padding: '8px 10px', fontWeight: 500 }}>
                {i.description}
              </td>
              <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', fontWeight: 600 }}>
                {i.quantity}
              </td>
              <td style={{ border: '1px solid #e5e7eb', padding: '8px 10px', textAlign: 'right' }}>
                {data.sym}{i.rate.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #e5e7eb', padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                {data.sym}{(i.quantity * i.rate).toLocaleString()}
              </td>
            </tr>
          ))}
          <tr style={{ background: '#f9fafb', fontWeight: 800 }}>
            <td colSpan={3} style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'right' }}>
              TOTAL INVOICE AMOUNT
            </td>
            <td style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'right', fontSize: '11.5px' }}>
              {data.sym}{data.totalAmount.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount in words */}
      <div style={{ background: '#f4f4f5', border: '1px solid #e5e7eb', padding: '6px 10px', marginBottom: 18, fontSize: '9.5px' }}>
        <strong>Amount in words:</strong> <em>{writtenAmount}</em>
      </div>

      {/* Payment & Signature Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', marginBottom: 4 }}>
            PAYMENT INSTRUCTIONS
          </div>
          <div style={{ fontSize: '10px', color: '#374151', lineHeight: 1.5 }}>
            {data.paymentType === 'momo' && (
              <div>MoMo: <strong>{data.momoNetwork} - {data.momoNumber}</strong> ({data.momoName || data.creatorName})</div>
            )}
            {data.paymentType === 'bank' && (
              <div>Bank: <strong>{data.bankName}</strong> · Acct: <strong>{data.bankAccountNumber}</strong> ({data.bankAccountName || data.creatorName})</div>
            )}
            {data.paymentType === 'paystack' && <div>Pay Online: {data.paystackLink}</div>}
            {data.paymentType === 'wire' && <div>SWIFT: {data.wireSwift} · IBAN: {data.wireIban}</div>}
            <div style={{ marginTop: 4, color: '#6b7280', fontSize: '9px' }}>
              Due Date: {data.dueDate} · Terms: Net {data.turnaroundDays || 15}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280' }}>
            AUTHORIZED SIGNATURE:
          </div>
          <div style={{ height: 64, borderBottom: '1.5px solid #000', marginBottom: 4 }} />
          <div style={{ fontWeight: 800, fontSize: '10px' }}>{data.creatorName}</div>
        </div>
      </div>

      {/* Footer */}
      {showBranding && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, textAlign: 'center', fontSize: '9px', color: '#9ca3af', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Powered by CreatorKit
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   TEMPLATE 3: EXECUTIVE SLATE (Modern Editorial Style)
   ========================================================================= */
export function ExecutiveSlateInvoice({ data, showBranding = true }: InvoiceTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  const primaryColor = data.primaryColor || '#1e293b';

  return (
    <div
      style={{
        fontFamily: `"${bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        color: '#111827',
        background: '#ffffff',
        padding: 'clamp(28px, 4vw, 44px)',
        fontSize: '11px',
        lineHeight: 1.6,
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1.5px solid ${primaryColor}`, paddingBottom: 18, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {data.creatorName}
          </div>
          <div style={{ fontSize: '9.5px', color: '#4b5563', marginTop: 2 }}>
            {data.creatorHandle} | {data.creatorNiche}
          </div>
          <div style={{ fontSize: '9px', color: '#6b7280' }}>
            {data.creatorEmail} · {data.creatorPhone} · {data.creatorLocation}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            INVOICE
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 800, fontFamily: 'monospace', color: '#4b5563', marginTop: 4 }}>
            REF: {data.invoiceNumber}
          </div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280' }}>
            DATE: {data.issueDate}
          </div>
        </div>
      </div>

      {/* 3-Column Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 14, marginBottom: 24, fontSize: '10px' }}>
        <div style={{ border: '1px solid #e5e7eb', padding: '10px 12px', background: '#fafafa' }}>
          <div style={{ fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', fontSize: '9px', marginBottom: 3 }}>
            BILLED TO
          </div>
          <div style={{ fontWeight: 800, fontSize: '11px' }}>{data.clientName}</div>
          {data.clientContact && <div style={{ color: '#374151' }}>{data.clientContact}</div>}
          <div style={{ color: '#6b7280' }}>{data.clientAddress}</div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', padding: '10px 12px', background: '#fafafa' }}>
          <div style={{ fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', fontSize: '9px', marginBottom: 3 }}>
            TIMELINE &amp; TERMS
          </div>
          <div><strong>Due Date:</strong> {data.dueDate}</div>
          <div><strong>Turnaround:</strong> {data.turnaroundDays} Days</div>
          <div><strong>Revisions:</strong> {data.revisionRounds} Rounds</div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', padding: '10px 12px', background: '#fafafa' }}>
          <div style={{ fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', fontSize: '9px', marginBottom: 3 }}>
            PAYMENT CHANNEL
          </div>
          {data.paymentType === 'momo' && <div>MoMo: {data.momoNetwork} - {data.momoNumber}</div>}
          {data.paymentType === 'bank' && <div>Bank: {data.bankName} ({data.bankAccountNumber})</div>}
          {data.paymentType === 'paystack' && <div>Paystack: {data.paystackLink}</div>}
          {data.paymentType === 'wire' && <div>SWIFT: {data.wireSwift}</div>}
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginBottom: 20 }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid #111827', background: '#f9fafb' }}>
            <th style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 800, width: '55%' }}>DELIVERABLE</th>
            <th style={{ textAlign: 'center', padding: '7px', fontWeight: 800, width: '12%' }}>QTY</th>
            <th style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 800, width: '16%' }}>UNIT PRICE</th>
            <th style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 800, width: '17%' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((i) => (
            <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 10px', fontWeight: 500 }}>{i.description}</td>
              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{i.quantity}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{data.sym}{i.rate.toLocaleString()}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{data.sym}{(i.quantity * i.rate).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Box */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ width: 260, border: '1px solid #e5e7eb', background: '#fafafa', padding: '10px 14px', fontSize: '10.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#6b7280' }}>Subtotal</span>
            <span>{data.sym}{data.subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #111827', marginTop: 4, paddingTop: 4, fontWeight: 900, fontSize: '12px' }}>
            <span>Total</span>
            <span>{data.sym}{data.totalAmount.toLocaleString()}</span>
          </div>
          {data.depositPercentage < 100 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', marginTop: 4, paddingTop: 4, fontWeight: 800, color: '#e11d48' }}>
              <span>Balance Due</span>
              <span>{data.sym}{data.balanceDue.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signature */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ width: 220 }}>
          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280' }}>
            SIGNATURE:
          </div>
          <div style={{ height: 64, borderBottom: '1.5px solid #000', marginBottom: 4 }} />
          <div style={{ fontWeight: 800, fontSize: '10px' }}>{data.creatorName}</div>
        </div>
      </div>

      {/* Footer */}
      {showBranding && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, textAlign: 'center', fontSize: '9px', color: '#9ca3af', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Powered by CreatorKit
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   TEMPLATE 4: STUDIO BRUTALIST (High-contrast monochrome)
   ========================================================================= */
export function StudioBrutalistInvoice({ data, showBranding = true }: InvoiceTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  return (
    <div
      style={{
        fontFamily: `"${bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        color: '#000000',
        background: '#ffffff',
        padding: 'clamp(28px, 4vw, 44px)',
        fontSize: '11px',
        lineHeight: 1.5,
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #000', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            {data.creatorName}
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#374151' }}>
            {data.creatorHandle} · {data.creatorNiche}
          </div>
          <div style={{ fontSize: '9px', color: '#6b7280' }}>
            {data.creatorPhone} | {data.creatorEmail} | {data.creatorLocation}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            INVOICE
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 900, fontFamily: 'monospace' }}>
            NO: {data.invoiceNumber}
          </div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#4b5563' }}>
            DATE: {data.issueDate}
          </div>
        </div>
      </div>

      {/* Bill To Box */}
      <div style={{ border: '2px solid #000', padding: '10px 14px', marginBottom: 18 }}>
        <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          BILLED TO:
        </div>
        <div style={{ fontWeight: 900, fontSize: '12px', marginTop: 2 }}>{data.clientName}</div>
        {data.clientContact && <div style={{ fontWeight: 600 }}>{data.clientContact}</div>}
        <div style={{ fontSize: '9.5px', color: '#4b5563' }}>{data.clientAddress}</div>
      </div>

      {/* Deliverable Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginBottom: 18, border: '2px solid #000' }}>
        <thead>
          <tr style={{ background: '#000', color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 900, width: '55%' }}>DELIVERABLE</th>
            <th style={{ padding: '8px', textAlign: 'center', fontWeight: 900, width: '12%' }}>QTY</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, width: '16%' }}>RATE</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, width: '17%' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((i) => (
            <tr key={i.id} style={{ borderBottom: '1px solid #000' }}>
              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{i.description}</td>
              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{i.quantity}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{data.sym}{i.rate.toLocaleString()}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{data.sym}{(i.quantity * i.rate).toLocaleString()}</td>
            </tr>
          ))}
          <tr style={{ background: '#f4f4f5', fontWeight: 900 }}>
            <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right' }}>TOTAL AMOUNT</td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '12px' }}>{data.sym}{data.totalAmount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {/* Payment and Signature */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ border: '1.5px solid #000', padding: '10px 12px' }}>
          <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            PAYMENT DETAILS
          </div>
          <div style={{ fontSize: '10px', lineHeight: 1.5 }}>
            {data.paymentType === 'momo' && <div>MoMo: <strong>{data.momoNetwork} - {data.momoNumber}</strong></div>}
            {data.paymentType === 'bank' && <div>Bank: <strong>{data.bankName} - {data.bankAccountNumber}</strong></div>}
            {data.paymentType === 'paystack' && <div>Pay Online: {data.paystackLink}</div>}
            {data.paymentType === 'wire' && <div>SWIFT: {data.wireSwift}</div>}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>
            AUTHORIZED SIGNATURE:
          </div>
          <div style={{ height: 64, borderBottom: '2px solid #000', marginBottom: 4 }} />
          <div style={{ fontWeight: 900, fontSize: '10px' }}>{data.creatorName}</div>
        </div>
      </div>

      {/* Footer */}
      {showBranding && (
        <div style={{ borderTop: '1px solid #000', paddingTop: 8, textAlign: 'center', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Powered by CreatorKit
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   ROUTER RENDERER
   ========================================================================= */
export default function InvoiceDocumentRenderer({
  templateId,
  data,
  showBranding = true,
}: {
  templateId: InvoiceTemplateId;
  data: InvoiceData;
  showBranding?: boolean;
}) {
  switch (templateId) {
    case 'ledger':
      return <LedgerGridInvoice data={data} showBranding={showBranding} />;
    case 'slate':
      return <ExecutiveSlateInvoice data={data} showBranding={showBranding} />;
    case 'brutalist':
      return <StudioBrutalistInvoice data={data} showBranding={showBranding} />;
    case 'navy':
    default:
      return <BoldNavyInvoice data={data} showBranding={showBranding} />;
  }
}
