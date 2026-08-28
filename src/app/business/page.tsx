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
} from 'lucide-react';
import StudioToolsDropdown from '@/components/StudioToolsDropdown';

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
  const copyWhatsAppSummary = () => {
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

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const sym = CURRENCY_SYMBOLS[currency];

  return (
    <div style={{ background: '#f4f4f5', minHeight: '100%', color: '#000', padding: '16px 20px 80px' }}>
      {/* Main Container */}
      <div style={{ maxWidth: 1380, margin: '0 auto' }}>
        {/* Banner / Title */}
        <div
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

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {[
            { id: 'invoice', label: '1. Brand Deal Invoice', icon: FileText, desc: 'Bill brands with MoMo/Bank & 50% deposit' },
            { id: 'receipt', label: '2. Payment Receipt', icon: Receipt, desc: 'Official proof of payment acknowledgment' },
            { id: 'agreement', label: '3. Influencer Agreement', icon: ShieldCheck, desc: 'Usage rights, revision limits & kill fee contract' },
            { id: 'letterhead', label: '4. Pitch Letterhead', icon: Award, desc: 'Branded header for proposals & media kits' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 18px',
                  background: isSelected ? '#000' : '#fff',
                  color: isSelected ? '#fff' : '#000',
                  border: '2px solid #000',
                  boxShadow: isSelected ? '4px 4px 0 #000' : '2px 2px 0 #000',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.1s',
                }}
              >
                <Icon size={16} />
                <div style={{ textAlign: 'left' }}>
                  <div>{tab.label}</div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 500, color: isSelected ? '#aaa' : '#666', textTransform: 'none' }}>
                    {tab.desc}
                  </div>
                </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            style={{
              background: '#ffffff',
              border: '2px solid #000',
              boxShadow: '6px 6px 0 #000',
              padding: 'clamp(20px, 4vw, 40px)',
              position: 'sticky',
              top: 80,
              minHeight: 680,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            {/* Header / Watermark badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 20, marginBottom: 24, gap: 16 }}>
              <div>
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

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    background: '#000',
                    color: '#fff',
                    padding: '6px 14px',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                  }}
                >
                  {activeTab === 'invoice' && 'OFFICIAL INVOICE'}
                  {activeTab === 'receipt' && 'PAYMENT RECEIPT'}
                  {activeTab === 'agreement' && 'DEAL CONTRACT'}
                  {activeTab === 'letterhead' && 'OFFICIAL PITCH'}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'monospace', marginTop: 6 }}>
                  NO: {activeTab === 'receipt' ? receiptNumber : invoiceNumber}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#666' }}>
                  Date: {issueDate}
                </div>
              </div>
            </div>

            {/* ─── TAB CONTENT 1: INVOICE PREVIEW ─── */}
            {activeTab === 'invoice' && (
              <div>
                {/* Billed To / Due Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24, padding: 12, background: '#f9f9f9', border: '1px solid #e5e7eb' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', color: '#888', textTransform: 'uppercase' }}>
                      BILLED TO (BRAND / AGENCY):
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: 3 }}>
                      {clientName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: 2 }}>
                      Attn: {clientContact}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#777' }}>
                      {clientEmail} {clientAddress && `· ${clientAddress}`}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', color: '#888', textTransform: 'uppercase' }}>
                      PAYMENT TERMS:
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, marginTop: 3 }}>
                      {depositPercentage}% Deposit Required to Lock Shoot Date
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, marginTop: 2 }}>
                      Due Date: {dueDate}
                    </div>
                  </div>
                </div>

                {/* Deliverables Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
                      <th style={{ padding: '8px 4px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace' }}>#</th>
                      <th style={{ padding: '8px 4px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace' }}>CAMPAIGN DELIVERABLE / SCOPE</th>
                      <th style={{ padding: '8px 4px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textAlign: 'center' }}>QTY</th>
                      <th style={{ padding: '8px 4px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textAlign: 'right' }}>RATE</th>
                      <th style={{ padding: '8px 4px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textAlign: 'right' }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px 4px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 4px', fontSize: '0.82rem', fontWeight: 600 }}>{item.description}</td>
                        <td style={{ padding: '10px 4px', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 4px', fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }}>{sym}{item.rate.toLocaleString()}</td>
                        <td style={{ padding: '10px 4px', fontSize: '0.82rem', fontWeight: 900, textAlign: 'right' }}>{sym}{(item.quantity * item.rate).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & Deposit Summary */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                  <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555' }}>
                      <span>Subtotal:</span>
                      <span style={{ fontWeight: 700 }}>{sym}{subtotal.toLocaleString()}</span>
                    </div>
                    {taxPercentage > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555' }}>
                        <span>WHT ({taxPercentage}%):</span>
                        <span style={{ fontWeight: 700 }}>{sym}{tax.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 900, borderTop: '2px solid #000', paddingTop: 6 }}>
                      <span>Total Campaign Fee:</span>
                      <span>{sym}{totalAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, background: '#fef08a', padding: '4px 6px', border: '1px solid #000' }}>
                      <span>50% Deposit Due Now:</span>
                      <span>{sym}{depositRequired.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#666', padding: '0 6px' }}>
                      <span>Balance on Approval:</span>
                      <span>{sym}{balanceDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions & Deal Protections */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, borderTop: '2px solid #000', paddingTop: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>
                      PAYMENT INSTRUCTIONS:
                    </div>
                    {paymentType === 'momo' && (
                      <div style={{ fontSize: '0.78rem', background: '#f3f4f6', padding: 8, border: '1px solid #000' }}>
                        <div><strong>Network:</strong> {momoNetwork}</div>
                        <div><strong>MoMo Number:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{momoNumber}</span></div>
                        <div><strong>Account Name:</strong> {momoName}</div>
                      </div>
                    )}
                    {paymentType === 'bank' && (
                      <div style={{ fontSize: '0.78rem', background: '#f3f4f6', padding: 8, border: '1px solid #000' }}>
                        <div><strong>Bank:</strong> {bankName}</div>
                        <div><strong>Account No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{bankAccountNumber}</span></div>
                        <div><strong>Account Name:</strong> {bankAccountName}</div>
                      </div>
                    )}
                    {paymentType === 'paystack' && (
                      <div style={{ fontSize: '0.78rem', background: '#f3f4f6', padding: 8, border: '1px solid #000' }}>
                        <div><strong>Online Paystack:</strong> {paystackLink}</div>
                      </div>
                    )}
                    {paymentType === 'wire' && (
                      <div style={{ fontSize: '0.78rem', background: '#f3f4f6', padding: 8, border: '1px solid #000' }}>
                        <div><strong>SWIFT:</strong> {wireSwift}</div>
                        <div><strong>IBAN:</strong> {wireIban}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>
                      INFLUENCER DEAL TERMS:
                    </div>
                    <ul style={{ fontSize: '0.68rem', color: '#444', paddingLeft: 16, margin: 0, lineHeight: 1.5 }}>
                      <li>Production begins after deposit is confirmed.</li>
                      <li>Includes max <strong>{revisionRounds} rounds</strong> of minor edits.</li>
                      <li>Usage license: <strong>{usagePeriod}</strong>.</li>
                      <li>Paid Whitelisting / Spark ads requires additional written consent.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB CONTENT 2: RECEIPT PREVIEW ─── */}
            {activeTab === 'receipt' && (
              <div>
                <div style={{ textAlign: 'center', margin: '20px 0', padding: '24px', background: '#fef08a', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace', color: '#000', letterSpacing: '0.1em' }}>
                    OFFICIAL PAYMENT RECEIPT
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, margin: '8px 0' }}>
                    {sym}{amountPaid.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#000' }}>
                    {amountPaid >= totalAmount ? 'PAYMENT COMPLETED IN FULL' : 'PARTIAL DEPOSIT RECEIVED'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, fontSize: '0.82rem' }}>
                  <div>
                    <div style={{ color: '#888', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace' }}>RECEIVED FROM:</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{clientName}</div>
                    <div style={{ color: '#555' }}>Attn: {clientContact}</div>
                  </div>
                  <div>
                    <div style={{ color: '#888', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace' }}>PAYMENT METHOD:</div>
                    <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>{paymentType} ({momoNetwork || bankName})</div>
                    <div style={{ color: '#555' }}>Issued on: {issueDate}</div>
                  </div>
                </div>

                <div style={{ borderTop: '2px solid #000', paddingTop: 16, fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
                  Thank you for partnering with {creatorName}. For inquiries, contact {creatorEmail} or {creatorPhone}.
                </div>
              </div>
            )}

            {/* ─── TAB CONTENT 3: INFLUENCER AGREEMENT CONTRACT PREVIEW ─── */}
            {activeTab === 'agreement' && (
              <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#222' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 12 }}>
                  CONTENT CREATOR SPONSORSHIP &amp; LICENSING AGREEMENT
                </h3>
                <p>
                  This agreement is entered into on <strong>{issueDate}</strong> between <strong>{creatorName}</strong> (&quot;Creator&quot;) and <strong>{clientName}</strong> (&quot;Brand/Client&quot;).
                </p>

                <div style={{ marginTop: 10 }}>
                  <strong>1. SCOPE OF DELIVERABLES</strong>
                  <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                    {items.map((i) => (
                      <li key={i.id}>
                        {i.quantity}x {i.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: 10 }}>
                  <strong>2. COMPENSATION &amp; PAYMENT TERMS</strong>
                  <p style={{ margin: 0 }}>
                    Total compensation is <strong>{sym}{totalAmount.toLocaleString()}</strong>. A non-refundable deposit of <strong>{depositPercentage}% ({sym}{depositRequired.toLocaleString()})</strong> is required prior to production commencement. The balance of <strong>{sym}{balanceDue.toLocaleString()}</strong> is due upon draft approval prior to public release.
                  </p>
                </div>

                <div style={{ marginTop: 10 }}>
                  <strong>3. REVISIONS &amp; APPROVALS</strong>
                  <p style={{ margin: 0 }}>
                    The campaign includes up to <strong>{revisionRounds} rounds of minor revisions</strong> aligned with the agreed creative brief. Full script changes or re-shoots requested after filming will incur a separate 50% re-shoot fee.
                  </p>
                </div>

                <div style={{ marginTop: 10 }}>
                  <strong>4. USAGE RIGHTS &amp; WHITELISTING</strong>
                  <p style={{ margin: 0 }}>
                    Creator grants Brand the right to use the content for <strong>{usagePeriod}</strong> across organic social media channels. Paid ad whitelisting, Meta Spark Ads, TikTok Dark Posting, or TV broadcast rights require separate written licensing agreement.
                  </p>
                </div>

                <div style={{ marginTop: 10 }}>
                  <strong>5. CANCELLATION &amp; KILL FEE</strong>
                  <p style={{ margin: 0 }}>
                    If Brand cancels the campaign after filming has occurred, Creator shall retain the {depositPercentage}% deposit as a kill fee to cover production expenses.
                  </p>
                </div>

                {/* Signatures */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 30, borderTop: '2px solid #000', paddingTop: 20 }}>
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
            )}

            {/* ─── TAB CONTENT 4: PITCH LETTERHEAD PREVIEW ─── */}
            {activeTab === 'letterhead' && (
              <div style={{ fontSize: '0.82rem', lineHeight: 1.7 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, background: '#000', color: '#fff', padding: 12 }}>
                  <div style={{ fontWeight: 900, fontFamily: 'monospace' }}>AUDIENCE HIGHLIGHTS:</div>
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

                <div style={{ background: '#f4f4f5', padding: 12, border: '1px solid #000', margin: '14px 0' }}>
                  {items.map((i) => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4 }}>
                      <span>• {i.quantity}x {i.description}</span>
                      <span>{sym}{(i.quantity * i.rate).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #ccc', paddingTop: 6, marginTop: 6, fontWeight: 900, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Package Investment:</span>
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
            )}
          </div>
        </div>
      </div>
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
