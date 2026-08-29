'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Receipt,
  ShieldCheck,
  Award,
  Share2,
  Printer,
  Plus,
  Trash2,
  Check,
  ImagePlus,
  X,
} from 'lucide-react';
import StudioToolsDropdown from '@/components/StudioToolsDropdown';
import { ReceiptPrinter, receiptClipPath } from '@/components/receipt-printer';
import { encodeReceipt, type ReceiptPayload } from '@/lib/receipt/receipt-link';
import ReceiptDocument, { type ReceiptDocumentData } from '@/components/receipt-document';
import { saveReceiptToDatabase } from '@/lib/supabase';

type TabType = 'invoice' | 'receipt' | 'agreement' | 'letterhead';
type CurrencyType = 'GHS' | 'NGN' | 'USD' | 'GBP' | 'EUR';

interface DeliverableItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  platform: 'TikTok' | 'Instagram' | 'YouTube' | 'Podcast' | 'UGC' | 'Event' | 'Other';
}

const PRESET_DELIVERABLES = [
  { platform: 'TikTok', description: '1x Dedicated TikTok Video (60s with Hook & CTA)', rate: 2500 },
  { platform: 'Instagram', description: '1x Instagram Reel + 3x Story Slides', rate: 3000 },
  { platform: 'UGC', description: '1x Raw UGC Video Ad (30s Vertical for Brand Paid Ads)', rate: 2000 },
  { platform: 'YouTube', description: '1x Dedicated YouTube Review / 90s Integration', rate: 5000 },
  { platform: 'Podcast', description: '1x Podcast Sponsorship (60s Host-Read Mid-Roll)', rate: 1800 },
  { platform: 'Event', description: 'Event Hosting / Red Carpet Content & Live Posting', rate: 4000 },
];

const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  GHS: 'GH₵',
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
};

function BusinessSuiteContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'invoice';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && ['invoice', 'receipt', 'agreement', 'letterhead'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // ─── GENERAL CREATOR & CLIENT STATE ──────────────────────────
  const [creatorName, setCreatorName] = useState('Kofi Visuals / Ama K');
  const [creatorHandle, setCreatorHandle] = useState('@kofi_creates');
  const [creatorEmail, setCreatorEmail] = useState('contact@kofivisuals.com');
  const [creatorPhone, setCreatorPhone] = useState('+233 24 000 0000');
  const [creatorLocation, setCreatorLocation] = useState('Accra, Ghana');
  const [creatorNiche, setCreatorNiche] = useState('Tech & Lifestyle Creator');

  const [clientName, setClientName] = useState('Pulse Media / Brand X');
  const [clientContact, setClientContact] = useState('Marketing Lead (Kwame Mensah)');
  const [clientEmail, setClientEmail] = useState('partnerships@brandx.com');
  const [clientAddress, setClientAddress] = useState('Airport Residential, Accra');

  const [currency, setCurrency] = useState<CurrencyType>('GHS');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-0042');
  const [receiptNumber, setReceiptNumber] = useState('REC-2026-0042');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // ─── DELIVERABLES ─────────────────────────────────────────────
  const [items, setItems] = useState<DeliverableItem[]>([
    {
      id: '1',
      description: '1x Dedicated TikTok Video (60s with Hook, Key Message & Bio Link)',
      quantity: 1,
      rate: 3500,
      platform: 'TikTok',
    },
    {
      id: '2',
      description: '1x Instagram Reel + 3x Story Slides with Brand Tag & Link Sticker',
      quantity: 1,
      rate: 4000,
      platform: 'Instagram',
    },
  ]);

  // ─── FINANCIAL CALCULATIONS ───────────────────────────────────
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(3750);

  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
  const discount = discountAmount;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = (taxableAmount * taxPercentage) / 100;
  const totalAmount = taxableAmount + tax;
  const depositRequired = (totalAmount * depositPercentage) / 100;
  const balanceDue = totalAmount - depositRequired;

  // ─── PAYMENT CHANNELS ─────────────────────────────────────────
  const [paymentType, setPaymentType] = useState<'momo' | 'bank' | 'paystack' | 'wire'>('momo');

  // MoMo Details
  const [momoNetwork, setMomoNetwork] = useState('MTN Mobile Money');
  const [momoNumber, setMomoNumber] = useState('024 123 4567');
  const [momoName, setMomoName] = useState('Kofi Visuals Ent');

  // Bank Details
  const [bankName, setBankName] = useState('Stanbic Bank Ghana / Zenith Bank');
  const [bankAccountName, setBankAccountName] = useState('Kofi Visuals Creative Studio');
  const [bankAccountNumber, setBankAccountNumber] = useState('9040001234567');

  // Online / International
  const [paystackLink, setPaystackLink] = useState('https://paystack.shop/koficreates');
  const [wireSwift, setWireSwift] = useState('SBICGHAC');
  const [wireIban, setWireIban] = useState('GH12SBIC00001234567890');

  // ─── CONTRACT / AGREEMENT SPECIFIC CLAUSES ────────────────────
  const [usagePeriod, setUsagePeriod] = useState('30 Days Organic Social');
  const [revisionRounds, setRevisionRounds] = useState(2);
  const [turnaroundDays, setTurnaroundDays] = useState(5);

  // ─── UI INTERACTION STATE ─────────────────────────────────────
  const [copiedNotification, setCopiedNotification] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // ─── BRAND LOGO UPLOAD STATE ──────────────────────────────────
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── ANIMATED THERMAL RECEIPT PRINTER STATE ───────────────────
  const [printStage, setPrintStage] = useState<'idle' | 'processing' | 'printing' | 'complete'>('idle');
  const printTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const startAnimatedPrint = async () => {
    // Ensure the Supabase short link exists so the printed QR code is scannable (receipts only)
    if (activeTab === 'receipt') await ensureReceiptShortUrl();
    printTimersRef.current.forEach(clearTimeout);
    printTimersRef.current = [
      setTimeout(() => setPrintStage('processing'), 0),
      setTimeout(() => setPrintStage('printing'), 900),
      setTimeout(() => setPrintStage('complete'), 2900),
    ];
  };

  const closeAnimatedPrint = () => {
    printTimersRef.current.forEach(clearTimeout);
    printTimersRef.current = [];
    setPrintStage('idle');
  };

  useEffect(() => {
    if (printStage === 'idle') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAnimatedPrint();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [printStage]);

  useEffect(() => () => printTimersRef.current.forEach(clearTimeout), []);

  const payChannel =
    paymentType === 'momo'
      ? `MoMo · ${momoNetwork} · ${momoNumber}`
      : paymentType === 'bank'
        ? `Bank · ${bankName} · ${bankAccountNumber}`
        : paymentType === 'paystack'
          ? `Paystack · ${paystackLink}`
          : `Wire · ${wireIban}`;

  // ─── SHAREABLE CLIENT RECEIPT LINK ────────────────────────────
  const [clientLinkCopied, setClientLinkCopied] = useState(false);

  const buildReceiptPayload = (): ReceiptPayload => {
    return {
      n: creatorName,
      h: creatorHandle,
      e: creatorEmail,
      p: creatorPhone,
      l: creatorLocation,
      c: clientName,
      a: clientContact,
      cu: currency,
      rn: receiptNumber,
      dt: issueDate,
      it: items.map((i) => ({ d: i.description, q: i.quantity, r: i.rate })),
      da: discountAmount,
      tp: taxPercentage,
      ap: amountPaid,
      pt: paymentType,
      mn: momoNetwork,
      mu: momoNumber,
      bn: bankName,
      ba: bankAccountNumber,
      lg: logoUrl ?? undefined,
    };
  };

  const buildReceiptLink = async (): Promise<string> => {
    const payload = buildReceiptPayload();
    const encoded = encodeReceipt(payload);

    // Save to Supabase for clean short link
    const shortId = await saveReceiptToDatabase({
      receiptNumber,
      creatorName,
      creatorEmail,
      creatorPhone,
      clientName,
      currency,
      totalAmount,
      amountPaid,
      balanceDue,
      paymentChannel: paymentType,
      payloadString: encoded,
    });

    if (shortId) {
      return `${window.location.origin}/r/${shortId}`;
    }

    return `${window.location.origin}/receipt?r=${encoded}`;
  };

  const copyClientLink = async () => {
    const link = await ensureReceiptShortUrl();
    navigator.clipboard.writeText(link);
    setClientLinkCopied(true);
    setTimeout(() => setClientLinkCopied(false), 2500);
  };

  const shareReceiptOnWhatsApp = async () => {
    const link = await ensureReceiptShortUrl();
    const text = `Hello ${clientContact || clientName}! Here is your official payment receipt (${receiptNumber}) from ${creatorName}. Open it to view, print or download: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ─── SUPABASE SHORT LINK FOR THE SCANNABLE QR ──────────────────
  const [receiptShortUrl, setReceiptShortUrl] = useState<string | null>(null);

  const ensureReceiptShortUrl = async (): Promise<string> => {
    if (receiptShortUrl) return receiptShortUrl;
    const link = await buildReceiptLink();
    setReceiptShortUrl(link);
    return link;
  };

  const addItem = (preset?: typeof PRESET_DELIVERABLES[0]) => {
    if (preset) {
      setItems([
        ...items,
        {
          id: Math.random().toString(36).substring(2, 9),
          description: preset.description,
          quantity: 1,
          rate: preset.rate,
          platform: preset.platform as any,
        },
      ]);
    } else {
      setItems([
        ...items,
        {
          id: Math.random().toString(36).substring(2, 9),
          description: 'Custom Content Deliverable',
          quantity: 1,
          rate: 1500,
          platform: 'Other',
        },
      ]);
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof DeliverableItem, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // WhatsApp / Email Summary Copy
  const buildWhatsAppText = () => {
    const sym = CURRENCY_SYMBOLS[currency];
    const itemsList = items.map((i) => `• ${i.quantity}x ${i.description} — ${sym}${i.rate * i.quantity}`).join('\n');

    let payDetails = '';
    if (paymentType === 'momo') {
      payDetails = `MoMo: ${momoNetwork} | ${momoNumber} (${momoName})`;
    } else if (paymentType === 'bank') {
      payDetails = `Bank: ${bankName} | Acc: ${bankAccountNumber} (${bankAccountName})`;
    } else {
      payDetails = `Payment Link: ${paystackLink}`;
    }

    let text = '';
    if (activeTab === 'invoice') {
      text = `*INVOICE: ${invoiceNumber}*
Hi ${clientName}, here is the invoice summary for our campaign deliverables:

*Deliverables:*
${itemsList}

*Financial Breakdown:*
• Subtotal: ${sym}${subtotal.toLocaleString()}
• *Total Due:* ${sym}${totalAmount.toLocaleString()}
• *Required 50% Deposit:* ${sym}${depositRequired.toLocaleString()}
• Balance upon completion: ${sym}${balanceDue.toLocaleString()}

*Payment Details:*
${payDetails}

*Terms:* 50% deposit before shoot date. Max ${revisionRounds} rounds of minor edits. Usage: ${usagePeriod}.
Thank you! — ${creatorName} (${creatorHandle})`;
    } else if (activeTab === 'receipt') {
      text = `*OFFICIAL PAYMENT RECEIPT: ${receiptNumber}*
Received from: ${clientName}
Amount Received: ${sym}${amountPaid.toLocaleString()}
Date: ${issueDate}
Payment Channel: ${paymentType.toUpperCase()}
Status: ${amountPaid >= totalAmount ? 'PAID IN FULL [CONFIRMED]' : 'PARTIAL DEPOSIT RECEIVED [CONFIRMED]'}

Thank you for your business! — ${creatorName}`;
    } else {
      text = `*CREATOR SPONSORSHIP AGREEMENT*
Creator: ${creatorName} (${creatorHandle})
Brand/Client: ${clientName}
Total Fee: ${sym}${totalAmount.toLocaleString()}
Deliverables: ${items.map((i) => i.description).join(', ')}
Usage Rights: ${usagePeriod}
Turnaround: ${turnaroundDays} business days after product delivery & deposit.`;
    }

    return text;
  };

  const copyWhatsAppSummary = () => {
    navigator.clipboard.writeText(buildWhatsAppText());
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const sendWhatsAppSummary = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText())}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const sym = CURRENCY_SYMBOLS[currency];

  // Shared receipt data — drives the animated printer paper AND the client link view
  const receiptDocData: ReceiptDocumentData = {
    logoUrl: logoUrl,
    creatorName,
    creatorHandle,
    creatorEmail,
    creatorPhone,
    creatorLocation,
    clientName,
    clientContact,
    currency,
    sym,
    receiptNumber,
    issueDate,
    items,
    discountAmount,
    taxPercentage,
    subtotal,
    tax,
    totalAmount,
    amountPaid,
    balanceDue,
    paymentType,
    payChannel,
  };

  // QR target: the Supabase short link once created, else a logo-free payload link
  const receiptQrUrl =
    receiptShortUrl ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}/receipt?r=${encodeReceipt({ ...buildReceiptPayload(), lg: undefined })}`
      : undefined);

  // Document bodies (shared between the live preview and the animated printer)
  const invoiceDocument = (
    <div>
      {/* Billed To / Invoice Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Billed To
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: 8 }}>
            {clientName}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: 4 }}>
            Attn: {clientContact}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
            {clientEmail} {clientAddress && `· ${clientAddress}`}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
            <span style={{ color: '#6b7280' }}>Issue Date</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{issueDate}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
            <span style={{ color: '#6b7280' }}>Payment Due</span>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>{dueDate}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', gap: 16 }}>
            <span style={{ color: '#6b7280', flexShrink: 0 }}>Deposit Required</span>
            <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>{depositPercentage}% to lock shoot date</span>
          </div>
        </div>
      </div>

      {/* Deliverables Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
        <thead>
          <tr>
            <th style={{ padding: '9px 10px', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>#</th>
            <th style={{ padding: '9px 10px', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Campaign Deliverable / Scope</th>
            <th style={{ padding: '9px 10px', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'center', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Qty</th>
            <th style={{ padding: '9px 10px', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Rate</th>
            <th style={{ padding: '9px 10px', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', verticalAlign: 'top' }}>{idx + 1}</td>
              <td style={{ padding: '12px 10px', fontSize: '0.82rem', fontWeight: 500, color: '#374151', verticalAlign: 'top' }}>{item.description}</td>
              <td style={{ padding: '12px 10px', fontSize: '0.78rem', fontWeight: 600, color: '#374151', textAlign: 'center', verticalAlign: 'top' }}>{item.quantity}</td>
              <td style={{ padding: '12px 10px', fontSize: '0.78rem', fontWeight: 600, color: '#374151', textAlign: 'right', verticalAlign: 'top' }}>{sym}{item.rate.toLocaleString()}</td>
              <td style={{ padding: '12px 10px', fontSize: '0.82rem', fontWeight: 700, color: '#111827', textAlign: 'right', verticalAlign: 'top' }}>{sym}{(item.quantity * item.rate).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals & Deposit Summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{sym}{subtotal.toLocaleString()}</span>
          </div>
          {taxPercentage > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
              <span>Withholding Tax ({taxPercentage}%)</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{sym}{tax.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, color: '#111827', borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 2 }}>
            <span>Total Campaign Fee</span>
            <span>{sym}{totalAmount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', background: '#000', color: '#fff', padding: '12px 14px', marginTop: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.03em' }}>{depositPercentage}% DEPOSIT DUE NOW</span>
            <span style={{ fontSize: '1rem', fontWeight: 800 }}>{sym}{depositRequired.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', padding: '0 2px' }}>
            <span>Balance on approval</span>
            <span style={{ fontWeight: 600 }}>{sym}{balanceDue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment Details & Deal Terms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Payment Details
          </div>
          {paymentType === 'momo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Network</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{momoNetwork}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>MoMo Number</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{momoNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Account Name</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{momoName}</span>
              </div>
            </div>
          )}
          {paymentType === 'bank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Bank</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{bankName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Account Number</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{bankAccountNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Account Name</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{bankAccountName}</span>
              </div>
            </div>
          )}
          {paymentType === 'paystack' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ color: '#6b7280', flexShrink: 0 }}>Pay Online</span>
                <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right', wordBreak: 'break-all' }}>{paystackLink}</span>
              </div>
            </div>
          )}
          {paymentType === 'wire' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>SWIFT</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{wireSwift}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>IBAN</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{wireIban}</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Deal Terms
          </div>
          <ul style={{ fontSize: '0.74rem', color: '#4b5563', paddingLeft: 16, margin: 0, lineHeight: 1.7 }}>
            <li>Production begins after the deposit is confirmed.</li>
            <li>Includes max <strong>{revisionRounds} rounds</strong> of minor edits.</li>
            <li>Usage license: <strong>{usagePeriod}</strong>.</li>
            <li>Paid whitelisting / Spark ads requires separate written consent.</li>
          </ul>
        </div>
      </div>

      {/* Invoice footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid #f3f4f6', paddingTop: 14, marginTop: 24 }}>
        <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
          Thank you for your business — {creatorName}
        </div>
        <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Powered by CreatorKit
        </div>
      </div>
    </div>
  );

  const agreementDocument = (
    <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#222' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', borderBottom: '1px dashed #d4d4d8', paddingBottom: 8, marginBottom: 14 }}>
        CONTENT CREATOR SPONSORSHIP &amp; LICENSING AGREEMENT
      </div>
      <p>
        This agreement is entered into on <strong>{issueDate}</strong> between <strong>{creatorName}</strong> (&quot;Creator&quot;) and <strong>{clientName}</strong> (&quot;Brand/Client&quot;).
      </p>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>1. Scope of Deliverables</div>
        <ul style={{ paddingLeft: 18, marginTop: 4 }}>
          {items.map((i) => (
            <li key={i.id}>
              {i.quantity}x {i.description}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>2. Compensation &amp; Payment Terms</div>
        <p style={{ margin: 0 }}>
          Total compensation is <strong>{sym}{totalAmount.toLocaleString()}</strong>. A non-refundable deposit of <strong>{depositPercentage}% ({sym}{depositRequired.toLocaleString()})</strong> is required prior to production commencement. The balance of <strong>{sym}{balanceDue.toLocaleString()}</strong> is due upon draft approval prior to public release.
        </p>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>3. Revisions &amp; Approvals</div>
        <p style={{ margin: 0 }}>
          The campaign includes up to <strong>{revisionRounds} rounds of minor revisions</strong> aligned with the agreed creative brief. Full script changes or re-shoots requested after filming will incur a separate 50% re-shoot fee.
        </p>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>4. Usage Rights &amp; Whitelisting</div>
        <p style={{ margin: 0 }}>
          Creator grants Brand the right to use the content for <strong>{usagePeriod}</strong> across organic social media channels. Paid ad whitelisting, Meta Spark Ads, TikTok Dark Posting, or TV broadcast rights require separate written licensing agreement.
        </p>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>5. Cancellation &amp; Kill Fee</div>
        <p style={{ margin: 0 }}>
          If Brand cancels the campaign after filming has occurred, Creator shall retain the {depositPercentage}% deposit as a kill fee to cover production expenses.
        </p>
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 30, borderTop: '1px dashed #d4d4d8', paddingTop: 20 }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace' }}>FOR CREATOR:</div>
          <div style={{ height: 40, borderBottom: '1px solid #000', marginTop: 10 }} />
          <div style={{ fontWeight: 800, marginTop: 4 }}>{creatorName}</div>
          <div style={{ fontSize: '0.68rem', color: '#666' }}>Date: {issueDate}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace' }}>FOR BRAND / AGENCY:</div>
          <div style={{ height: 40, borderBottom: '1px solid #000', marginTop: 10 }} />
          <div style={{ fontWeight: 800, marginTop: 4 }}>{clientContact} ({clientName})</div>
          <div style={{ fontSize: '0.68rem', color: '#666' }}>Date: _______________</div>
        </div>
      </div>
    </div>
  );

  const letterheadDocument = (
    <div style={{ fontSize: '0.82rem', lineHeight: 1.7 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 20, background: '#fef08a', border: '2px solid #000', padding: '10px 12px' }}>
        <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>AUDIENCE HIGHLIGHTS</div>
        <div style={{ fontSize: '0.75rem' }}>Ghana &amp; Nigeria Diaspora Focus · 82% Mobile Engagement · High Conversion</div>
      </div>

      <p>Dear {clientContact || 'Partnerships Lead'},</p>
      <p>
        I am writing to officially propose a high-impact content partnership between <strong>{creatorName}</strong> ({creatorHandle}) and <strong>{clientName}</strong>.
      </p>
      <p>
        As an active {creatorNiche}, my community trusts my recommendations for authentic product storytelling, high-energy hooks, and engaging social video.
      </p>
      <p>
        Below is the recommended campaign package tailored for your marketing goals:
      </p>

      <div style={{ background: '#fafafa', padding: '12px 14px', border: '1px dashed #d4d4d8', margin: '14px 0' }}>
        {items.map((i) => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>
            <span>{i.quantity}x {i.description}</span>
            <span style={{ fontWeight: 800, flexShrink: 0 }}>{sym}{(i.quantity * i.rate).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ borderTop: '2px solid #000', paddingTop: 8, marginTop: 8, fontWeight: 900, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Package Investment</span>
          <span>{sym}{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <p>
        I look forward to discussing how we can bring this campaign to life. Please reach me directly at {creatorPhone} or {creatorEmail}.
      </p>

      <div style={{ marginTop: 24 }}>
        <div>Warm regards,</div>
        <div style={{ fontWeight: 900, fontSize: '0.95rem', marginTop: 4 }}>{creatorName}</div>
        <div style={{ fontSize: '0.72rem', color: '#666' }}>{creatorHandle} · {creatorLocation}</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f4f4f5', minHeight: '100%', color: '#000', padding: '16px 20px 80px' }}>
      <style>{`
        .ck-tab { transition: transform 0.12s ease, box-shadow 0.12s ease; }
        .ck-tab:hover { transform: translate(-1px, -1px); }
        .ck-tab:active { transform: translate(1px, 1px); }
        @media print {
          .ck-noprint { display: none !important; }
          body * { visibility: hidden; }
          #printable-document, #printable-document * { visibility: visible; }
          #printable-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            min-height: 0 !important;
            background: #fff !important;
          }
        }
      `}</style>
      {/* Main Container */}
      <div style={{ maxWidth: 1380, margin: '0 auto' }}>
        {/* Banner / Title */}
        <div
          className="ck-noprint"
          style={{
            background: '#fff',
            border: '2px solid #000',
            boxShadow: '4px 4px 0 #000',
            padding: '20px 24px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  background: '#000',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  textTransform: 'uppercase',
                }}
              >
                Money &amp; Legal Protection
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>
                Get paid on time, bill brands properly, and protect your content.
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
              Influencer Invoice, Receipt &amp; Deal Contract Generator
            </h1>
          </div>

          {/* Quick Actions (Print, WhatsApp copy, Currency) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Currency Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '2px solid #000', padding: '4px 8px', background: '#fff' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace' }}>CURRENCY:</span>
              {(['GHS', 'NGN', 'USD', 'GBP'] as CurrencyType[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    background: currency === c ? '#000' : 'transparent',
                    color: currency === c ? '#fff' : '#000',
                    border: 'none',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={copyWhatsAppSummary}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#FFE500',
                color: '#000',
                border: '2px solid #000',
                fontWeight: 900,
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              {copiedNotification ? <Check size={14} /> : <Share2 size={14} />}
              {copiedNotification ? 'COPIED TO CLIPBOARD' : 'COPY FOR WHATSAPP'}
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#000',
                color: '#fff',
                border: '2px solid #000',
                fontWeight: 900,
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              <Printer size={14} />
              PRINT / SAVE PDF
            </button>
          </div>
        </div>

        {/* Tab Selection — receipt-index cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 224px), 1fr))',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { id: 'invoice', label: 'Brand Deal Invoice', desc: 'Bill brands with MoMo / Bank & 50% deposit' },
            { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
            { id: 'agreement', label: 'Influencer Agreement', desc: 'Usage rights, revisions & kill fee contract' },
            { id: 'letterhead', label: 'Pitch Letterhead', desc: 'Branded header for proposals & media kits' },
          ].map((tab, idx) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="ck-tab"
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 14px',
                  background: isSelected ? '#000' : '#fff',
                  color: isSelected ? '#fff' : '#000',
                  border: '2px solid #000',
                  boxShadow: isSelected ? '4px 4px 0 #000' : '2px 2px 0 rgba(0,0,0,0.45)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    background: isSelected ? '#fef08a' : '#f4f4f5',
                    color: '#000',
                    border: '2px solid #000',
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: '0.76rem',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {tab.label}
                  </span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 500, color: isSelected ? '#d4d4d8' : '#666', lineHeight: 1.35 }}>
                    {tab.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Workspace: 2-Column Split (Controls on Left, Live Branded Document on Right) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* ─── LEFT COLUMN: BUILDER & SETTINGS CONTROLS ─── */}
          <div className="ck-noprint" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. Creator & Brand Info */}
            <div
              style={{
                background: '#fff',
                border: '2px solid #000',
                boxShadow: '3px 3px 0 #000',
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: '0.8rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  1. CREATOR &amp; CLIENT DETAILS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                    YOUR NAME / BRAND
                  </label>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                    HANDLE / NICHE
                  </label>
                  <input
                    type="text"
                    value={creatorHandle}
                    onChange={(e) => setCreatorHandle(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                    PHONE (MOMO/WHATSAPP)
                  </label>
                  <input
                    type="text"
                    value={creatorPhone}
                    onChange={(e) => setCreatorPhone(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                    EMAIL / LOCATION
                  </label>
                  <input
                    type="text"
                    value={creatorEmail}
                    onChange={(e) => setCreatorEmail(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Client Info */}
              <div style={{ borderTop: '1px dashed #ccc', paddingTop: 10, marginTop: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                      CLIENT / BRAND NAME
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                      CONTACT PERSON / AGENCY
                    </label>
                    <input
                      type="text"
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                      DOC NUMBER
                    </label>
                    <input
                      type="text"
                      value={activeTab === 'receipt' ? receiptNumber : invoiceNumber}
                      onChange={(e) =>
                        activeTab === 'receipt' ? setReceiptNumber(e.target.value) : setInvoiceNumber(e.target.value)
                      }
                      style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                      ISSUE DATE
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Deliverables & Pricing */}
            <div
              style={{
                background: '#fff',
                border: '2px solid #000',
                boxShadow: '3px 3px 0 #000',
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: '0.8rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  2. CAMPAIGN DELIVERABLES
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#666' }}>
                  {items.length} item(s)
                </span>
              </div>

              {/* 1-Click Preset Buttons */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 6, color: '#555' }}>
                  + QUICK ADD PRESET (GH/NG RATES):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRESET_DELIVERABLES.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => addItem(preset)}
                      style={{
                        padding: '4px 8px',
                        background: '#f4f4f5',
                        border: '1px solid #000',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#e4e4e7')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                    >
                      <Plus size={11} />
                      {preset.platform} ({sym}{preset.rate.toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1.5px solid #000',
                      padding: 10,
                      background: '#fafafa',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.72rem', fontFamily: 'monospace', background: '#000', color: '#fff', padding: '2px 5px' }}>
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Deliverable description..."
                        style={{ flex: 1, padding: '5px 8px', border: '1px solid #ccc', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #dc2626',
                          padding: '5px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 8, alignItems: 'center' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, fontFamily: 'monospace' }}>QTY</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', fontSize: '0.75rem', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, fontFamily: 'monospace' }}>RATE ({sym})</label>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', fontSize: '0.75rem', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, fontFamily: 'monospace' }}>TOTAL</label>
                        <div style={{ padding: '5px 6px', background: '#e5e7eb', fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace' }}>
                          {sym}{(item.quantity * item.rate).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addItem()}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#000',
                  color: '#fff',
                  border: '2px solid #000',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Plus size={14} /> ADD CUSTOM DELIVERABLE
              </button>
            </div>

            {/* 3. Payment Methods (MoMo, Bank, Paystack) */}
            <div
              style={{
                background: '#fff',
                border: '2px solid #000',
                boxShadow: '3px 3px 0 #000',
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: '0.8rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  3. PAYMENT DETAILS (GH / NG / USD)
                </span>
              </div>

              {/* Payment Type Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                {[
                  { id: 'momo', label: 'MOMO' },
                  { id: 'bank', label: 'BANK' },
                  { id: 'paystack', label: 'PAYSTACK' },
                  { id: 'wire', label: 'USD WIRE' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPaymentType(p.id as any)}
                    style={{
                      padding: '6px 4px',
                      background: paymentType === p.id ? '#000' : '#f4f4f5',
                      color: paymentType === p.id ? '#fff' : '#000',
                      border: '1.5px solid #000',
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {paymentType === 'momo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>MOMO NETWORK</label>
                    <select
                      value={momoNetwork}
                      onChange={(e) => setMomoNetwork(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 700 }}
                    >
                      <option value="MTN Mobile Money">MTN Mobile Money (Ghana)</option>
                      <option value="Telecel Cash">Telecel Cash (Ghana)</option>
                      <option value="AT Money">AT Money (AirtelTigo)</option>
                      <option value="OPay / Moniepoint">OPay / Moniepoint (Nigeria)</option>
                      <option value="M-Pesa">M-Pesa (Kenya/East Africa)</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>MOMO NUMBER</label>
                      <input
                        type="text"
                        value={momoNumber}
                        onChange={(e) => setMomoNumber(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>REGISTERED NAME</label>
                      <input
                        type="text"
                        value={momoName}
                        onChange={(e) => setMomoName(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentType === 'bank' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>BANK NAME & BRANCH</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Stanbic Bank, GTBank, Zenith, Access"
                      style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>ACCOUNT NUMBER</label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>ACCOUNT NAME</label>
                      <input
                        type="text"
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentType === 'paystack' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                    PAYSTACK / FLUTTERWAVE PAYMENT LINK
                  </label>
                  <input
                    type="text"
                    value={paystackLink}
                    onChange={(e) => setPaystackLink(e.target.value)}
                    placeholder="https://paystack.shop/yourname"
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.62rem', color: '#666', marginTop: 4, display: 'block' }}>
                    Clients can pay via Card, Apple Pay, MoMo, or USSD directly through your link.
                  </span>
                </div>
              )}

              {paymentType === 'wire' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>SWIFT / BIC CODE</label>
                      <input
                        type="text"
                        value={wireSwift}
                        onChange={(e) => setWireSwift(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>IBAN / DOMICILIARY ACC</label>
                      <input
                        type="text"
                        value={wireIban}
                        onChange={(e) => setWireIban(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Protection Terms & Contract Settings */}
            <div
              style={{
                background: '#fff',
                border: '2px solid #000',
                boxShadow: '3px 3px 0 #000',
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: '0.8rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  4. DEAL TERMS &amp; PROTECTION
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 2 }}>
                    UPFRONT DEPOSIT (%)
                  </label>
                  <select
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    <option value={50}>50% Upfront (Standard Best Practice)</option>
                    <option value={100}>100% Upfront (Full Payment)</option>
                    <option value={30}>30% Deposit</option>
                    <option value={0}>0% (Net 30 / Post-Delivery)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 2 }}>
                    REVISION LIMIT
                  </label>
                  <select
                    value={revisionRounds}
                    onChange={(e) => setRevisionRounds(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    <option value={2}>Max 2 Rounds (Recommended)</option>
                    <option value={1}>1 Round Only</option>
                    <option value={3}>3 Rounds</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 2 }}>
                    USAGE RIGHTS
                  </label>
                  <select
                    value={usagePeriod}
                    onChange={(e) => setUsagePeriod(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    <option value="30 Days Organic Social">30 Days Organic Social</option>
                    <option value="90 Days Organic Social">90 Days Organic Social</option>
                    <option value="1 Year Digital Usage">1 Year Digital Usage</option>
                    <option value="Perpetual Organic Only">Perpetual (Organic Only)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 2 }}>
                    TURNAROUND TIME (DAYS)
                  </label>
                  <input
                    type="number"
                    value={turnaroundDays}
                    onChange={(e) => setTurnaroundDays(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              {activeTab === 'receipt' && (
                <div style={{ marginTop: 10, borderTop: '1px dashed #ccc', paddingTop: 10 }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 2 }}>
                    ACTUAL AMOUNT RECEIVED ({sym})
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.85rem', fontWeight: 900, background: '#ffffff' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN: LIVE BRANDED DOCUMENT PREVIEW (PRINTABLE) ─── */}
          <div
            ref={printAreaRef}
            id="printable-document"
            style={
              activeTab !== 'receipt'
                ? {
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 24px 48px -24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.06)',
                  padding: 'clamp(28px, 4vw, 48px)',
                  maxWidth: 860,
                  margin: '0 auto',
                  position: 'sticky',
                  top: 80,
                  minHeight: 680,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                }
                : {
                  position: 'sticky',
                  top: 80,
                }
            }
          >
            {/* Header / Watermark badge (the receipt tab uses the thermal receipt's own header) */}
            {activeTab !== 'receipt' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 20, marginBottom: 24, gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={`${creatorName} logo`}
                      style={{ height: 54, width: 54, objectFit: 'contain', border: '1px solid #e4e4e7', background: '#fff', padding: 3, flexShrink: 0 }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
                      {creatorName}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#444', marginTop: 2 }}>
                      {creatorHandle} · {creatorNiche}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#666', marginTop: 4 }}>
                      {creatorPhone} | {creatorEmail} | {creatorLocation}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 1.15 }}>
                    {activeTab === 'invoice' && 'Brand Deal Invoice'}
                    {activeTab === 'agreement' && 'Influencer Agreement'}
                    {activeTab === 'letterhead' && 'Pitch Letterhead'}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, fontFamily: 'monospace', marginTop: 8, color: '#71717a', letterSpacing: '0.04em' }}>
                    NO: {invoiceNumber}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#71717a', letterSpacing: '0.04em' }}>
                    DATE: {issueDate}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoice' && invoiceDocument}

            {/* ─── TAB CONTENT 2: RECEIPT PREVIEW ─── */}
            {activeTab === 'receipt' && (
              <div>
                {/* ─── THERMAL RECEIPT PREVIEW — pixel-identical to the printer output ─── */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 6px' }}>
                  <div
                    style={{
                      width: 355,
                      background: '#fafafa',
                      color: '#09090b',
                      padding: '28px 24px 32px',
                      clipPath: receiptClipPath,
                      boxShadow: '0 14px 28px -16px rgba(0,0,0,0.4)',
                    }}
                  >
                    <ReceiptDocument data={receiptDocData} qrUrl={receiptQrUrl} />
                  </div>
                </div>

                {/* ─── BRAND LOGO + ANIMATED THERMAL PRINT CONTROLS ─── */}
                <div className="ck-noprint" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => logoFileInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '8px 14px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    <ImagePlus size={14} /> {logoUrl ? 'Change Logo' : 'Upload Your Logo'}
                  </button>
                  {logoUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '2px solid #000', background: '#fff', padding: '4px 8px', boxShadow: '3px 3px 0 #000' }}>
                      <img src={logoUrl} alt="Brand logo" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
                      <button
                        onClick={() => setLogoUrl(null)}
                        aria-label="Remove logo"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: '#000' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={startAnimatedPrint}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 rgba(0,0,0,0.35)', padding: '8px 14px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    <Printer size={14} /> Print Animated Receipt
                  </button>
                  <button
                    onClick={copyClientLink}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '8px 14px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    <Share2 size={14} /> {clientLinkCopied ? 'Link Copied!' : 'Copy Client Link'}
                  </button>
                  <button
                    onClick={shareReceiptOnWhatsApp}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '8px 14px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    Send on WhatsApp
                  </button>
                  <div style={{ flexBasis: '100%', fontSize: '0.68rem', color: '#666', fontFamily: 'monospace' }}>
                    CLIENT FLOW: they open the link, watch the receipt print itself, then download or print it — no account needed.
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'agreement' && agreementDocument}

            {activeTab === 'letterhead' && letterheadDocument}

            {/* ─── DOCUMENT ACTIONS: print & share any document (hidden when printing) ─── */}
            {activeTab !== 'receipt' && (
              <div className="ck-noprint" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 28 }}>
                <button
                  onClick={startAnimatedPrint}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 rgba(0,0,0,0.35)', padding: '8px 14px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  <Printer size={14} /> Print {activeTab === 'invoice' ? 'Invoice' : activeTab === 'agreement' ? 'Contract' : 'Pitch'}
                </button>
                <button
                  onClick={copyWhatsAppSummary}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '8px 14px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  {copiedNotification ? <Check size={14} /> : <Share2 size={14} />} {copiedNotification ? 'Summary Copied!' : 'Copy Summary'}
                </button>
                <button
                  onClick={sendWhatsAppSummary}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '8px 14px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Send on WhatsApp
                </button>
                <div style={{ flexBasis: '100%', fontSize: '0.68rem', color: '#666', fontFamily: 'monospace' }}>
                  Watch it print in the thermal printer, then Print / Save PDF — the file contains just the document.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ANIMATED THERMAL RECEIPT PRINTER OVERLAY ─── */}
      {printStage !== 'idle' && (
        <div
          className="ck-noprint"
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.82)', display: 'flex', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
        >
          <div style={{ margin: 'auto', width: '100%', maxWidth: activeTab === 'receipt' ? 420 : 560, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                onClick={closeAnimatedPrint}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                <X size={14} /> Close
              </button>
            </div>

            <ReceiptPrinter.Root stage={printStage} feedMotion="stepped" className={activeTab !== 'receipt' ? 'max-w-md' : undefined}>
              <ReceiptPrinter.Machine>
                <ReceiptPrinter.Header>
                  <ReceiptPrinter.Status>
                    {printStage === 'processing' ? 'Processing payment…' : printStage === 'printing' ? 'Printing receipt…' : 'Receipt ready'}
                  </ReceiptPrinter.Status>
                  <span className="rounded-[0.25rem] bg-zinc-50 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-950">
                    CreatorKit
                  </span>
                </ReceiptPrinter.Header>
                <ReceiptPrinter.Screen>
                  <div className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-widest">
                    <span>{sym}{activeTab === 'receipt' ? amountPaid.toLocaleString() : totalAmount.toLocaleString()}</span>
                    <span>
                      {activeTab === 'receipt'
                        ? amountPaid >= totalAmount ? 'Paid in full' : 'Partial'
                        : activeTab === 'invoice' ? 'Invoice' : activeTab === 'agreement' ? 'Contract' : 'Pitch'}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                    {clientName} · {activeTab === 'receipt' ? receiptNumber : invoiceNumber}
                  </p>
                </ReceiptPrinter.Screen>
              </ReceiptPrinter.Machine>

              <ReceiptPrinter.Output className={activeTab === 'receipt' ? 'h-[38rem]' : 'h-auto'}>
                <ReceiptPrinter.Paper>
                  {activeTab === 'receipt' ? (
                    <ReceiptDocument data={receiptDocData} qrUrl={receiptQrUrl} />
                  ) : (
                    <div style={{ width: '100%', background: '#ffffff', color: '#09090b', padding: '20px 16px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                      {activeTab === 'invoice' && invoiceDocument}
                      {activeTab === 'agreement' && agreementDocument}
                      {activeTab === 'letterhead' && letterheadDocument}
                    </div>
                  )}
                </ReceiptPrinter.Paper>
              </ReceiptPrinter.Output>
            </ReceiptPrinter.Root>

            {printStage === 'complete' && (
              <button
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef08a', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '8px 16px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                <Printer size={14} /> Print / Save PDF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatorBusinessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Business Suite...</div>}>
      <BusinessSuiteContent />
    </Suspense>
  );
}
