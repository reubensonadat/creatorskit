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
  Download,
  Plus,
  Trash2,
  Check,
  ImagePlus,
  X,
} from 'lucide-react';
import { exportDocumentAsImage } from '@/lib/export-document-image';
import StudioToolsDropdown from '@/components/StudioToolsDropdown';
import { ReceiptPrinter, receiptClipPath } from '@/components/receipt-printer';
import { encodeReceipt, type ReceiptPayload } from '@/lib/receipt/receipt-link';
import ReceiptDocument, { type ReceiptDocumentData } from '@/components/receipt-document';
import { saveReceiptToDatabase } from '@/lib/supabase';
import InvoiceDocumentRenderer, { type InvoiceData, type InvoiceTemplateId } from '@/components/invoice-templates';
import ContractDocumentRenderer, { type ContractData, type ContractTemplateId } from '@/components/contract-templates';
import LetterheadDocumentRenderer, { type LetterheadData, type LetterheadTemplateId } from '@/components/letterhead-templates';
import { GOOGLE_FONTS_LIST } from '@/app/match-cut/google-fonts';

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
  const [creatorName, setCreatorName] = useState('Creators Kit / Reubenson Adat');
  const [creatorHandle, setCreatorHandle] = useState('@reubenson_creates');
  const [creatorEmail, setCreatorEmail] = useState('hello@creatorskit.com');
  const [creatorPhone, setCreatorPhone] = useState('+233 24 000 0000');
  const [creatorLocation, setCreatorLocation] = useState('Accra, Ghana');
  const [creatorNiche, setCreatorNiche] = useState('Tech & Lifestyle Creator');

  const [clientName, setClientName] = useState('Synapse');
  const [clientContact, setClientContact] = useState('Synapse');
  const [clientEmail, setClientEmail] = useState('partnerships@synapse.com');
  const [clientAddress, setClientAddress] = useState('Airport Residential, Accra');

  const [currency, setCurrency] = useState<CurrencyType>('GHS');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-0042');
  const [poNumber, setPoNumber] = useState('PO-GH-2026');
  const [receiptNumber, setReceiptNumber] = useState('REC-2026-0042');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [shippingAddress, setShippingAddress] = useState('Airport Residential Area, Accra, Ghana');
  const [signatureName, setSignatureName] = useState('Kofi Mensah');
  const [customNotes, setCustomNotes] = useState('');

  // ─── INVOICE TEMPLATE, COLORS & TYPOGRAPHY STATE ──────────────
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplateId>('navy');
  const [headingFont, setHeadingFont] = useState('Oswald');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [signatureFont, setSignatureFont] = useState('Caveat');
  const [primaryColor, setPrimaryColor] = useState('#162a45');
  const [accentColor, setAccentColor] = useState('#e15b3c');
  // ─── BRANDING TOGGLE (Powered by CreatorKit badge on printed documents) ──
  const [brandingOn, setBrandingOn] = useState(true);
  // ─── COLLAPSIBLE BUILDER SECTIONS ─────────────────────────────────────
  // Every layer starts OFF — open only what you need, so the builder never
  // becomes an overwhelming wall of controls.
  const [openSections, setOpenSections] = useState({
    design: false,
    details: false,
    deliverables: false,
    payment: false,
    terms: false,
  });
  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const SectionToggle = ({ id, title }: { id: keyof typeof openSections; title: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        background: openSections[id] ? '#FFE500' : '#000',
        color: openSections[id] ? '#000' : '#fff',
        border: '2px solid #000',
        boxShadow: '3px 3px 0 #000',
        padding: '10px 14px',
        fontFamily: 'monospace',
        fontWeight: 900,
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        cursor: 'pointer',
      }}
    >
      <span>{openSections[id] ? '▾' : '▸'} {title}</span>
      <span
        style={{
          background: openSections[id] ? '#000' : '#fff',
          color: openSections[id] ? '#FFE500' : '#000',
          padding: '2px 8px',
          fontSize: '0.62rem',
        }}
      >
        {openSections[id] ? 'ON' : 'OFF'}
      </span>
    </button>
  );

  // ─── CONTRACT TEMPLATE, CLAUSES & META STATE ─────────────────
  const [contractTemplate, setContractTemplate] = useState<ContractTemplateId>('service');
  const [contractTitle, setContractTitle] = useState('SERVICE CONTRACT');
  const [contractScopeDescription, setContractScopeDescription] = useState('Production and distribution of authentic brand campaign content across social media channels.');
  const [contractConfidentiality, setContractConfidentiality] = useState(true);
  const [contractGoverningLaw, setContractGoverningLaw] = useState('Ghana');
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractExclusivity, setContractExclusivity] = useState('None');
  const [contractCustomTerms, setContractCustomTerms] = useState('');
  const [contractKillFee, setContractKillFee] = useState(50);

  // ─── LETTERHEAD TEMPLATE & PROPOSAL STATE ─────────────────────
  const [letterheadTemplate, setLetterheadTemplate] = useState<LetterheadTemplateId>('creative');
  const [letterheadTitle, setLetterheadTitle] = useState('Campaign Proposal');
  const [letterheadAudienceFocus, setLetterheadAudienceFocus] = useState('Ghana & West Africa Diaspora');
  const [letterheadEngagementRate, setLetterheadEngagementRate] = useState('82% Mobile · High Conversion');
  const [letterheadTrackRecord, setLetterheadTrackRecord] = useState('4K Cinematic Social Storytelling');
  const [letterheadIntro, setLetterheadIntro] = useState('');
  const [letterheadBody, setLetterheadBody] = useState('');

  const handleSelectContractPreset = (preset: string) => {
    if (preset === 'service') {
      setContractTemplate('service');
      setContractTitle('SERVICE CONTRACT');
      setContractScopeDescription('Provision of creative video production, brand integration, and organic social media posting.');
      setContractConfidentiality(true);
      setContractExclusivity('None');
    } else if (preset === 'sponsorship') {
      setContractTemplate('creator');
      setContractTitle('CONTENT CREATOR SPONSORSHIP & LICENSING AGREEMENT');
      setContractScopeDescription('Dedicated multi-platform influencer sponsorship campaign including custom content creation, product placement, and organic distribution.');
      setContractConfidentiality(true);
      setContractExclusivity('30 Days Category Exclusive');
    } else if (preset === 'business') {
      setContractTemplate('business');
      setContractTitle('BUSINESS CONTRACT AGREEMENT');
      setContractScopeDescription('Professional creative services, brand asset creation, and content consulting.');
      setContractConfidentiality(true);
      setContractExclusivity('None');
    } else if (preset === 'nda') {
      setContractTemplate('service');
      setContractTitle('NON-DISCLOSURE & PROPRIETARY INFORMATION AGREEMENT');
      setContractScopeDescription('Mutual protection of confidential business strategies, unreleased product features, and marketing campaigns.');
      setContractConfidentiality(true);
      setContractExclusivity('None');
    } else if (preset === 'contractor') {
      setContractTemplate('service');
      setContractTitle('INDEPENDENT CONTRACTOR AGREEMENT');
      setContractScopeDescription('Independent contractor creative production services.');
      setContractConfidentiality(true);
      setContractExclusivity('None');
    }
  };

  const handleSelectContractTemplate = (t: ContractTemplateId) => {
    setContractTemplate(t);
    if (t === 'service') {
      setContractTitle('SERVICE CONTRACT');
      setHeadingFont('Inter');
      setBodyFont('Inter');
      setSignatureFont('Caveat');
    } else if (t === 'business') {
      setContractTitle('BUSINESS CONTRACT AGREEMENT');
      setHeadingFont('Inter');
      setBodyFont('Inter');
      setSignatureFont('Caveat');
    } else {
      setContractTitle('CONTENT CREATOR SPONSORSHIP & LICENSING AGREEMENT');
      setHeadingFont('Inter');
      setBodyFont('Inter');
      setSignatureFont('Caveat');
    }
  };

  const handleSelectTemplate = (t: InvoiceTemplateId) => {
    setInvoiceTemplate(t);
    if (t === 'navy') {
      setHeadingFont('Oswald');
      setBodyFont('Inter');
      setSignatureFont('Caveat');
      setPrimaryColor('#162a45');
      setAccentColor('#e15b3c');
    } else if (t === 'ledger') {
      setHeadingFont('Inter');
      setBodyFont('Inter');
      setSignatureFont('Caveat');
      setPrimaryColor('#000000');
      setAccentColor('#10b981');
    } else if (t === 'slate') {
      setHeadingFont('DM Serif Display');
      setBodyFont('Inter');
      setSignatureFont('Caveat');
      setPrimaryColor('#283548');
      setAccentColor('#334155');
    } else {
      setHeadingFont('Inter');
      setBodyFont('Inter');
      setSignatureFont('Caveat');
      setPrimaryColor('#000000');
      setAccentColor('#FFE500');
    }
  };

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
  const [momoName, setMomoName] = useState('Reubenson Adat');

  // Bank Details
  const [bankName, setBankName] = useState('Stanbic Bank Ghana / Zenith Bank');
  const [bankAccountName, setBankAccountName] = useState('Creators Kit / Reubenson Adat');
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
  const printPaperRef = useRef<HTMLDivElement>(null);
  const [printPaperHeight, setPrintPaperHeight] = useState<number | null>(null);
  const isPrintOverlayOpen = printStage !== 'idle';

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
    setPrintPaperHeight(null);
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

  // Measure the real paper inside the print overlay so the output tray grows to
  // fit the FULL document (thermal padding + zigzag tear edge included). A fixed
  // tray height clips the bottom of long receipts / contracts. ResizeObserver
  // re-measures when late-loading content (QR code, logo) changes the height.
  useEffect(() => {
    if (!isPrintOverlayOpen) return;
    const el = printPaperRef.current;
    if (!el) return;
    const measure = () => setPrintPaperHeight(el.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isPrintOverlayOpen]);

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

  // Per-tab template extras stored alongside the payload in the database, so
  // shared links render the creator's real invoice/agreement/letterhead template
  // instead of a receipt-shaped summary.
  const buildShareExtras = (): Record<string, any> | undefined => {
    if (activeTab === 'invoice') {
      return {
        tpl: invoiceTemplate,
        niche: creatorNiche,
        ce: clientEmail,
        ca: clientAddress,
        sa: shippingAddress,
        po: poNumber,
        due: dueDate,
        dep: depositPercentage,
        depr: depositRequired,
        mnm: momoName,
        ban: bankAccountName,
        ps: paystackLink,
        sw: wireSwift,
        ib: wireIban,
        up: usagePeriod,
        rr: revisionRounds,
        td: turnaroundDays,
        sig: signatureName,
        nts: customNotes,
        hf: headingFont,
        bf: bodyFont,
        sf: signatureFont,
        pc: primaryColor,
        ac: accentColor,
      };
    }
    if (activeTab === 'agreement') {
      return {
        tpl: contractTemplate,
        ct: contractTitle,
        ced: contractEndDate,
        csd: contractScopeDescription,
        ce: clientEmail,
        ca: clientAddress,
        dep: depositPercentage,
        depr: depositRequired,
        pmd:
          paymentType === 'momo'
            ? `MTN / Vodafone Mobile Money (${momoNetwork}: ${momoNumber} - ${momoName})`
            : paymentType === 'bank'
              ? `Bank Transfer (${bankName} - Acct: ${bankAccountNumber} / ${bankAccountName})`
              : paymentType === 'paystack'
                ? 'Paystack Payment Link'
                : `USD Wire Transfer (SWIFT: ${wireSwift})`,
        up: usagePeriod,
        rr: revisionRounds,
        td: turnaroundDays,
        conf: contractConfidentiality,
        law: contractGoverningLaw,
        excl: contractExclusivity,
        cust: contractCustomTerms,
        kill: contractKillFee,
        sig: signatureName,
        hf: headingFont,
        bf: bodyFont,
        sf: signatureFont,
        pc: primaryColor,
        ac: accentColor,
      };
    }
    if (activeTab === 'letterhead') {
      return {
        tpl: letterheadTemplate,
        niche: creatorNiche,
        ce: clientEmail,
        ca: clientAddress,
        lt: letterheadTitle,
        af: letterheadAudienceFocus,
        er: letterheadEngagementRate,
        tr: letterheadTrackRecord,
        it: letterheadIntro,
        bt: letterheadBody,
        hf: headingFont,
        bf: bodyFont,
        pc: primaryColor,
        ac: accentColor,
      };
    }
    return undefined;
  };

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
      rn: activeTab === 'invoice' ? invoiceNumber : receiptNumber,
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
      br: brandingOn ? 1 : 0,
      k: activeTab as ReceiptPayload['k'],
      x: buildShareExtras(),
    };
  };

  const buildReceiptLink = async (): Promise<string> => {
    const payload = buildReceiptPayload();
    const encoded = encodeReceipt(payload);

    // Save to Supabase for clean short link
    const shortId = await saveReceiptToDatabase({
      receiptNumber: payload.rn,
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
      metadata: { kind: payload.k ?? 'receipt' },
    });

    if (shortId) {
      return `${window.location.origin}/r/${shortId}`;
    }

    // Offline fallback: keep the URL lean — never embed the heavy branding
    // payload (logo data URL) or template extras in a shareable link.
    const leanPayload = { ...payload, lg: undefined, x: undefined };
    return `${window.location.origin}/receipt?r=${encodeReceipt(leanPayload)}`;
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

  // Invalidate the cached short link whenever the document changes, so every
  // share stores the latest state in the database (never a stale link).
  const lastSharedPayloadRef = useRef<string | null>(null);
  useEffect(() => {
    const current = encodeReceipt(buildReceiptPayload());
    if (lastSharedPayloadRef.current === null) {
      lastSharedPayloadRef.current = current;
      return;
    }
    if (current !== lastSharedPayloadRef.current) {
      lastSharedPayloadRef.current = current;
      setReceiptShortUrl(null);
    }
  });

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

  // ─── WHATSAPP / SHARE — always a DB-backed short link, never a fat text blob ───
  const buildShareMessage = (link: string): string => {
    const sym = CURRENCY_SYMBOLS[currency];
    const who = clientContact || clientName;
    if (activeTab === 'invoice') {
      return `Hello ${who}! Here is invoice ${invoiceNumber} from ${creatorName} — total ${sym}${totalAmount.toLocaleString()}. Open it to view, print or download: ${link}`;
    }
    if (activeTab === 'receipt') {
      return `Hello ${who}! Here is your official payment receipt (${receiptNumber}) from ${creatorName}. Open it to view, print or download: ${link}`;
    }
    if (activeTab === 'agreement') {
      return `Hello ${who}! Here is the sponsorship agreement from ${creatorName} — total fee ${sym}${totalAmount.toLocaleString()}. Open it to review, print or download: ${link}`;
    }
    return `Hello ${who}! Here is the pitch document from ${creatorName}. Open it to view, print or download: ${link}`;
  };

  const copyWhatsAppSummary = async () => {
    const link = await ensureReceiptShortUrl();
    navigator.clipboard.writeText(buildShareMessage(link));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const sendWhatsAppSummary = async () => {
    const link = await ensureReceiptShortUrl();
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareMessage(link))}`, '_blank');
  };

  const [isSavingImage, setIsSavingImage] = useState(false);

  // ─── DEVICE-ADAPTIVE EXPORT (one action, no paradox of choice) ──
  // Desktop → print a PDF. Mobile → save/share a PNG image.
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const mobileUA = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
    setIsMobileDevice(coarsePointer || mobileUA);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const saveDocumentAsImage = async () => {
    setIsSavingImage(true);
    try {
      // On the receipt tab capture ONLY the thermal paper itself — never the
      // surrounding controls — so the saved image is the document, nothing else.
      const node =
        activeTab === 'receipt'
          ? document.getElementById('receipt-capture-root') ?? document.getElementById('printable-document')
          : document.getElementById('printable-document');
      if (!node) {
        setIsSavingImage(false);
        return;
      }

      const docId = activeTab === 'receipt' ? receiptNumber : invoiceNumber;
      const filename = `${activeTab}-${docId || 'document'}.png`;

      await exportDocumentAsImage({
        node,
        filename,
        // Always capture at the document's original design width — thermal
        // receipts are 355px, full-sheet documents are 820px — never at the
        // squeezed on-screen preview width.
        designWidth: activeTab === 'receipt' ? 355 : 820,
        title: `${activeTab.toUpperCase()} - ${creatorName}`,
        text: `${creatorName} - ${activeTab.toUpperCase()} (${docId})`,
      });
    } catch (err) {
      console.error('Error saving image:', err);
    } finally {
      setIsSavingImage(false);
    }
  };

  // Single export entry point for every action bar: desktop prints a PDF
  // (through the animated printer overlay), mobile saves the document image.
  const handleExport = () => {
    if (isMobileDevice) {
      saveDocumentAsImage();
    } else {
      startAnimatedPrint();
    }
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
      ? `${window.location.origin}/receipt?r=${encodeReceipt({ ...buildReceiptPayload(), lg: undefined, x: undefined })}`
      : undefined);

  // Full invoice data object passed to the chosen template
  const invoiceDocData: InvoiceData = {
    creatorName,
    creatorHandle,
    creatorEmail,
    creatorPhone,
    creatorLocation,
    creatorNiche,
    logoUrl,
    clientName,
    clientContact,
    clientEmail,
    clientAddress,
    shippingAddress,
    invoiceNumber,
    poNumber,
    issueDate,
    dueDate,
    currency,
    sym,
    items,
    subtotal,
    discountAmount,
    taxPercentage,
    tax,
    totalAmount,
    depositPercentage,
    depositRequired,
    amountPaid,
    balanceDue,
    paymentType,
    momoNetwork,
    momoNumber,
    momoName,
    bankName,
    bankAccountName,
    bankAccountNumber,
    paystackLink,
    wireSwift,
    wireIban,
    usagePeriod,
    revisionRounds,
    turnaroundDays,
    signatureName,
    customNotes,
    headingFont,
    bodyFont,
    signatureFont,
    primaryColor,
    accentColor,
  };

  const invoiceDocument = (
    <InvoiceDocumentRenderer templateId={invoiceTemplate} data={invoiceDocData} showBranding={brandingOn} />
  );

  const contractDocData: ContractData = {
    creatorName,
    creatorHandle,
    creatorEmail,
    creatorPhone,
    creatorLocation,
    creatorAddress: creatorLocation,
    logoUrl,
    clientName,
    clientContact,
    clientEmail,
    clientAddress,
    contractNumber: invoiceNumber.replace('INV-', 'AGR-'),
    contractTitle,
    effectiveDate: issueDate,
    endDate: contractEndDate || undefined,
    currency,
    sym,
    scopeDescription: contractScopeDescription || undefined,
    items,
    totalAmount,
    depositPercentage,
    depositRequired,
    balanceDue,
    paymentType: 'fixed',
    paymentMethodDetails:
      paymentType === 'momo'
        ? `MTN / Vodafone Mobile Money (${momoNetwork}: ${momoNumber} - ${momoName})`
        : paymentType === 'bank'
          ? `Bank Transfer (${bankName} - Acct: ${bankAccountNumber} / ${bankAccountName})`
          : paymentType === 'paystack'
            ? `Paystack Payment Link`
            : `USD Wire Transfer (SWIFT: ${wireSwift})`,
    usagePeriod,
    revisionRounds,
    turnaroundDays,
    confidentiality: contractConfidentiality,
    governingLaw: contractGoverningLaw,
    exclusivity: contractExclusivity,
    customTerms: contractCustomTerms || undefined,
    killFeePercentage: contractKillFee,
    serviceProviderSignName: signatureName || creatorName,
    clientSignName: '',
    headingFont,
    bodyFont,
    signatureFont,
    primaryColor,
    accentColor,
  };

  const agreementDocument = (
    <ContractDocumentRenderer
      templateId={contractTemplate}
      data={contractDocData}
      showBranding={brandingOn}
    />
  );

  const letterheadDocData: LetterheadData = {
    creatorName,
    creatorHandle,
    creatorEmail,
    creatorPhone,
    creatorLocation,
    creatorNiche,
    logoUrl,
    clientName,
    clientContact,
    clientEmail,
    clientAddress,
    issueDate,
    letterheadNumber: invoiceNumber,
    letterTitle: letterheadTitle,
    audienceFocus: letterheadAudienceFocus,
    engagementRate: letterheadEngagementRate,
    trackRecord: letterheadTrackRecord,
    introText: letterheadIntro || undefined,
    bodyText: letterheadBody || undefined,
    items,
    totalAmount,
    currency,
    sym,
    headingFont,
    bodyFont,
    primaryColor,
    accentColor,
  };

  const letterheadDocument = (
    <LetterheadDocumentRenderer
      templateId={letterheadTemplate}
      data={letterheadDocData}
      showBranding={brandingOn}
    />
  );

  return (
    <div className="ck-page" style={{ background: '#f4f4f5', minHeight: '100%', color: '#000', padding: '16px 20px 80px' }}>
      <style>{`
        .ck-tab { transition: transform 0.12s ease, box-shadow 0.12s ease; }
        .ck-tab:hover { transform: translate(-1px, -1px); }
        .ck-tab:active { transform: translate(1px, 1px); }
        #printable-document { outline: none; }
        @media (max-width: 900px) {
          .ck-page { padding: 12px 12px 96px !important; }
          .ck-workspace { gap: 16px !important; }
          /* Mobile: live document first, builder controls below it */
          .ck-preview-col { order: -1; }
        }
        @media print {
          .ck-noprint { display: none !important; }
          body * { visibility: hidden; }
          #printable-document, #printable-document * { 
            visibility: visible; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
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
            {/* CreatorKit badge toggle — controls branding on all printed documents */}
            <button
              onClick={() => setBrandingOn((v) => !v)}
              title="Show or hide the 'Powered by CreatorKit' badge on printed documents"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: brandingOn ? '#000' : '#fff',
                color: brandingOn ? '#fff' : '#000',
                border: '2px solid #000',
                fontWeight: 900,
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              {brandingOn ? <Check size={13} /> : <X size={13} />} BADGE: {brandingOn ? 'ON' : 'OFF'}
            </button>

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
              onClick={handleExport}
              disabled={isMobileDevice && isSavingImage}
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
              {isMobileDevice ? <Download size={14} /> : <Printer size={14} />}
              {isMobileDevice ? (isSavingImage ? 'SAVING…' : 'SAVE IMAGE') : 'PRINT / SAVE PDF'}
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
          className="ck-workspace"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* ─── LEFT COLUMN: BUILDER & SETTINGS CONTROLS ─── */}
          <div className="ck-noprint" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ─── CUSTOMIZATION LAYER — collapsible (templates · fonts · colors).
                  Receipts have no templates, so the whole layer hides on the
                  receipt tab. ─── */}
            {activeTab !== 'receipt' && (
              <>
                <SectionToggle id="design" title="Customize Design — Templates · Fonts · Colors" />

                {openSections.design && (
                  <>
                    {/* 0. Invoice Template Picker (When on Invoice Tab) */}
                    {activeTab === 'invoice' && (
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
                            INVOICE DESIGN TEMPLATE
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', background: '#000', color: '#fff', padding: '2px 6px' }}>
                            4 STYLES
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {[
                            { id: 'navy', title: 'Bold Navy', desc: 'East Repair · Terracotta line & signature' },
                            { id: 'ledger', title: 'Ledger Grid', desc: 'INV24 · Black bar header & grid lines' },
                            { id: 'slate', title: 'Executive Slate', desc: 'Invoice Fly · Dark frame & serif title' },
                            { id: 'brutalist', title: 'Studio Brutalist', desc: 'CreatorKit · Modern deposit layout' },
                          ].map((tpl) => {
                            const isCurrent = invoiceTemplate === tpl.id;
                            return (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => handleSelectTemplate(tpl.id as InvoiceTemplateId)}
                                style={{
                                  textAlign: 'left',
                                  padding: '10px 10px',
                                  background: isCurrent ? '#FFE500' : '#f9fafb',
                                  color: '#000',
                                  border: '2px solid #000',
                                  boxShadow: isCurrent ? '2px 2px 0 #000' : 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 3,
                                }}
                              >
                                <div style={{ fontWeight: 900, fontSize: '0.78rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                                  {isCurrent ? '✓ ' : ''}{tpl.title}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#4b5563', lineHeight: 1.25 }}>
                                  {tpl.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Typography Customization (When on Invoice Tab) */}
                    {activeTab === 'invoice' && (
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
                            TYPOGRAPHY (52 GOOGLE FONTS)
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', color: '#666' }}>
                            CUSTOMIZE FONTS
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              TITLE / HEADING FONT
                            </label>
                            <select
                              value={headingFont}
                              onChange={(e) => setHeadingFont(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              {GOOGLE_FONTS_LIST.map((f) => (
                                <option key={`heading-${f.id}`} value={f.name}>
                                  {f.name} ({f.category})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              BODY &amp; TABLE FONT
                            </label>
                            <select
                              value={bodyFont}
                              onChange={(e) => setBodyFont(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              {GOOGLE_FONTS_LIST.map((f) => (
                                <option key={`body-${f.id}`} value={f.name}>
                                  {f.name} ({f.category})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                            SIGNATURE &amp; SCRIPT FONT
                          </label>
                          <select
                            value={signatureFont}
                            onChange={(e) => setSignatureFont(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            {GOOGLE_FONTS_LIST.map((f) => (
                              <option key={`sig-${f.id}`} value={f.name}>
                                {f.name} ({f.category})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Color & Accent Highlights Customization (When on Invoice Tab) */}
                    {activeTab === 'invoice' && (
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
                            COLOR THEME &amp; HIGHLIGHTS
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', color: '#666' }}>
                            LIVE PALETTE
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          {/* Primary / Frame Color */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>
                              PRIMARY COLOR
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                style={{ width: 34, height: 28, border: '1.5px solid #000', padding: 0, cursor: 'pointer' }}
                              />
                              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }}>
                                {primaryColor.toUpperCase()}
                              </span>
                            </div>
                            {/* Quick Swatches */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {[
                                { label: 'Navy', hex: '#162a45' },
                                { label: 'Slate', hex: '#283548' },
                                { label: 'Black', hex: '#000000' },
                                { label: 'Royal', hex: '#1e3a8a' },
                                { label: 'Pine', hex: '#064e3b' },
                                { label: 'Wine', hex: '#7f1d1d' },
                              ].map((swatch) => (
                                <button
                                  key={swatch.hex}
                                  type="button"
                                  title={swatch.label}
                                  onClick={() => setPrimaryColor(swatch.hex)}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: swatch.hex,
                                    border: primaryColor.toLowerCase() === swatch.hex.toLowerCase() ? '2px solid #000' : '1px solid #ccc',
                                    boxShadow: primaryColor.toLowerCase() === swatch.hex.toLowerCase() ? '0 0 0 1.5px #FFE500' : 'none',
                                    cursor: 'pointer',
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Accent / Highlight Color */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>
                              ACCENT / HIGHLIGHT
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <input
                                type="color"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                style={{ width: 34, height: 28, border: '1.5px solid #000', padding: 0, cursor: 'pointer' }}
                              />
                              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }}>
                                {accentColor.toUpperCase()}
                              </span>
                            </div>
                            {/* Quick Swatches */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {[
                                { label: 'Terracotta', hex: '#e15b3c' },
                                { label: 'Gold', hex: '#eab308' },
                                { label: 'Emerald', hex: '#10b981' },
                                { label: 'Cyan', hex: '#06b6d4' },
                                { label: 'Rose', hex: '#e11d48' },
                                { label: 'Neon', hex: '#FFE500' },
                              ].map((swatch) => (
                                <button
                                  key={swatch.hex}
                                  type="button"
                                  title={swatch.label}
                                  onClick={() => setAccentColor(swatch.hex)}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: swatch.hex,
                                    border: accentColor.toLowerCase() === swatch.hex.toLowerCase() ? '2px solid #000' : '1px solid #ccc',
                                    boxShadow: accentColor.toLowerCase() === swatch.hex.toLowerCase() ? '0 0 0 1.5px #000' : 'none',
                                    cursor: 'pointer',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 0. Contract Template & Clause Customizer (When on Agreement Tab) */}
                    {activeTab === 'agreement' && (
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
                            CONTRACT LEGAL TEMPLATE
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', background: '#000', color: '#fff', padding: '2px 6px' }}>
                            3 FORMATS
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
                          {[
                            { id: 'service', title: 'Service Contract', desc: 'eSign Legal · Numbered clauses & checkboxes' },
                            { id: 'business', title: 'Business Agreement', desc: 'Editorial · Roman numerals & milestone table' },
                            { id: 'creator', title: 'Creator Sponsorship', desc: 'Deal Memo · Deliverables, deposit & kill fee' },
                          ].map((tpl) => {
                            const isCurrent = contractTemplate === tpl.id;
                            return (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => handleSelectContractTemplate(tpl.id as ContractTemplateId)}
                                style={{
                                  textAlign: 'left',
                                  padding: '10px 10px',
                                  background: isCurrent ? '#FFE500' : '#f9fafb',
                                  color: '#000',
                                  border: '2px solid #000',
                                  boxShadow: isCurrent ? '2px 2px 0 #000' : 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 3,
                                }}
                              >
                                <div style={{ fontWeight: 900, fontSize: '0.78rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                                  {isCurrent ? '✓ ' : ''}{tpl.title}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#4b5563', lineHeight: 1.25 }}>
                                  {tpl.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Quick Presets */}
                        <div style={{ marginBottom: 14, background: '#fafafa', border: '1px solid #e5e7eb', padding: '8px 10px' }}>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>
                            QUICK LEGAL PRESETS (1-CLICK LOAD)
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {[
                              { id: 'service', label: 'Standard Service' },
                              { id: 'sponsorship', label: 'Influencer Deal' },
                              { id: 'business', label: 'Agency Agreement' },
                              { id: 'nda', label: 'Mutual NDA' },
                              { id: 'contractor', label: 'Contractor' },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectContractPreset(p.id)}
                                style={{
                                  background: '#fff',
                                  border: '1px solid #000',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                + {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Contract Meta & Clauses Customization */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px dashed #e5e7eb', paddingTop: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              CONTRACT TITLE
                            </label>
                            <input
                              type="text"
                              value={contractTitle}
                              onChange={(e) => setContractTitle(e.target.value)}
                              placeholder="SERVICE CONTRACT"
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 700 }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              SCOPE OVERVIEW &amp; CAMPAIGN BRIEF
                            </label>
                            <textarea
                              value={contractScopeDescription}
                              onChange={(e) => setContractScopeDescription(e.target.value)}
                              placeholder="Describe the nature of the campaign and deliverables..."
                              rows={2}
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 500, resize: 'vertical' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                                EXCLUSIVITY CLAUSE
                              </label>
                              <select
                                value={contractExclusivity}
                                onChange={(e) => setContractExclusivity(e.target.value)}
                                style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                              >
                                <option value="None">None (Non-Exclusive)</option>
                                <option value="30 Days Category Exclusive">30 Days Category Exclusive</option>
                                <option value="60 Days Category Exclusive">60 Days Category Exclusive</option>
                                <option value="90 Days Competitor Lockout">90 Days Competitor Lockout</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                                KILL FEE / CANCEL DEPOSIT %
                              </label>
                              <input
                                type="number"
                                value={contractKillFee}
                                onChange={(e) => setContractKillFee(parseInt(e.target.value) || 0)}
                                style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                                GOVERNING LAW
                              </label>
                              <input
                                type="text"
                                value={contractGoverningLaw}
                                onChange={(e) => setContractGoverningLaw(e.target.value)}
                                placeholder="Ghana"
                                style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 600 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                                CONFIDENTIALITY (NDA)
                              </label>
                              <button
                                type="button"
                                onClick={() => setContractConfidentiality((v) => !v)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1.5px solid #000',
                                  background: contractConfidentiality ? '#000' : '#fff',
                                  color: contractConfidentiality ? '#fff' : '#000',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  fontFamily: 'monospace',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                }}
                              >
                                {contractConfidentiality ? '✓ INCLUDED' : '✕ EXCLUDED'}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              ADDITIONAL TERMS &amp; CUSTOM COVENANTS (OPTIONAL)
                            </label>
                            <textarea
                              value={contractCustomTerms}
                              onChange={(e) => setContractCustomTerms(e.target.value)}
                              placeholder="Add any specific conditions, delivery dates, or sponsor obligations..."
                              rows={2}
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 500, resize: 'vertical' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 0. Letterhead Template & Proposal Customizer (When on Letterhead Tab) */}
                    {activeTab === 'letterhead' && (
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
                            PITCH LETTERHEAD TEMPLATE
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', background: '#000', color: '#fff', padding: '2px 6px' }}>
                            2 FORMATS
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                          {[
                            { id: 'creative', title: 'Creative Pitch', desc: 'Media Kit & Highlights with Package table' },
                            { id: 'executive', title: 'Executive Proposal', desc: 'Corporate proposal layout with deliverables' },
                          ].map((tpl) => {
                            const isCurrent = letterheadTemplate === tpl.id;
                            return (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => setLetterheadTemplate(tpl.id as LetterheadTemplateId)}
                                style={{
                                  textAlign: 'left',
                                  padding: '10px 10px',
                                  background: isCurrent ? '#FFE500' : '#f9fafb',
                                  color: '#000',
                                  border: '2px solid #000',
                                  boxShadow: isCurrent ? '2px 2px 0 #000' : 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 3,
                                }}
                              >
                                <div style={{ fontWeight: 900, fontSize: '0.78rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                                  {isCurrent ? '✓ ' : ''}{tpl.title}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#4b5563', lineHeight: 1.25 }}>
                                  {tpl.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Letterhead Customization Inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px dashed #e5e7eb', paddingTop: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              PROPOSAL TITLE
                            </label>
                            <input
                              type="text"
                              value={letterheadTitle}
                              onChange={(e) => setLetterheadTitle(e.target.value)}
                              placeholder="Campaign Proposal"
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 700 }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                                AUDIENCE FOCUS
                              </label>
                              <input
                                type="text"
                                value={letterheadAudienceFocus}
                                onChange={(e) => setLetterheadAudienceFocus(e.target.value)}
                                placeholder="Ghana & Diaspora"
                                style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 600 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                                ENGAGEMENT HIGHLIGHT
                              </label>
                              <input
                                type="text"
                                value={letterheadEngagementRate}
                                onChange={(e) => setLetterheadEngagementRate(e.target.value)}
                                placeholder="82% Mobile · High Conversion"
                                style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 600 }}
                              />
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              CUSTOM INTRO / PROPOSAL HOOK (OPTIONAL)
                            </label>
                            <textarea
                              value={letterheadIntro}
                              onChange={(e) => setLetterheadIntro(e.target.value)}
                              placeholder="Leave blank to use smart generated intro or write custom..."
                              rows={2}
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 500, resize: 'vertical' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Typography Customization (When on Agreement or Letterhead Tab) */}
                    {(activeTab === 'agreement' || activeTab === 'letterhead') && (
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
                            DOCUMENT TYPOGRAPHY (52 GOOGLE FONTS)
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', color: '#666' }}>
                            CUSTOMIZE FONTS
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              TITLE / HEADING FONT
                            </label>
                            <select
                              value={headingFont}
                              onChange={(e) => setHeadingFont(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              {GOOGLE_FONTS_LIST.map((f) => (
                                <option key={`doc-heading-${f.id}`} value={f.name}>
                                  {f.name} ({f.category})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                              BODY &amp; CLAUSE FONT
                            </label>
                            <select
                              value={bodyFont}
                              onChange={(e) => setBodyFont(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              {GOOGLE_FONTS_LIST.map((f) => (
                                <option key={`doc-body-${f.id}`} value={f.name}>
                                  {f.name} ({f.category})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                  </>
                )}
              </>
            )}

            <SectionToggle id="details" title="1. Creator & Client Details" />

            {/* 1. Creator & Brand Info */}
            <div
              style={{
                display: openSections.details ? 'block' : 'none',
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                      CLIENT ADDRESS
                    </label>
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="2 Court Square, New York..."
                      style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                      CLIENT EMAIL
                    </label>
                    <input
                      type="text"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
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

                {activeTab === 'invoice' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                          DUE DATE
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                          P.O. NUMBER (OPTIONAL)
                        </label>
                        <input
                          type="text"
                          value={poNumber}
                          onChange={(e) => setPoNumber(e.target.value)}
                          placeholder="e.g. 2312/2019"
                          style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                          SHIPPING ADDRESS / SHIP TO
                        </label>
                        <input
                          type="text"
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="3787 Pineview Drive..."
                          style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                          SIGNATURE NAME (SCRIPT)
                        </label>
                        <input
                          type="text"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="e.g. John Smith"
                          style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <SectionToggle id="deliverables" title="2. Campaign Deliverables & Pricing" />

            {/* 2. Deliverables & Pricing */}
            <div
              style={{
                display: openSections.deliverables ? 'block' : 'none',
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, borderBottom: '1px dashed #ccc', paddingBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 2 }}>
                    TAX / VAT (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 2 }}>
                    DISCOUNT ({sym})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </div>
              </div>

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

            <SectionToggle id="payment" title="3. Payment Details (MoMo · Bank · Paystack · Wire)" />

            {/* 3. Payment Methods (MoMo, Bank, Paystack) */}
            <div
              style={{
                display: openSections.payment ? 'block' : 'none',
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

            <SectionToggle id="terms" title="4. Deal Terms & Protection" />

            {/* 4. Protection Terms & Contract Settings */}
            <div
              style={{
                display: openSections.terms ? 'block' : 'none',
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

          {/* ─── RIGHT COLUMN: PREVIEW & ACTIONS ─── */}
          <div className="ck-preview-col" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Top Document Action Bar (Only when not on receipt tab) */}
            {activeTab !== 'receipt' && (
              <div
                className="ck-noprint"
                style={{
                  background: '#fff',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0 #000',
                  padding: '12px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      background: '#000',
                      color: '#fff',
                      padding: '3px 8px',
                    }}
                  >
                    {activeTab === 'invoice' ? 'INVOICE' : activeTab === 'agreement' ? 'CONTRACT' : 'LETTERHEAD'}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555' }}>
                    Live Document Preview
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, width: '100%', maxWidth: 540 }}>
                  <button
                    onClick={handleExport}
                    disabled={isMobileDevice && isSavingImage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#FFE500',
                      color: '#000',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                      height: 38,
                      padding: '0 10px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isMobileDevice ? <Download size={14} /> : <Printer size={14} />}
                    {isMobileDevice ? (isSavingImage ? 'Saving…' : 'Save Image') : 'Print / PDF'}
                  </button>
                  <button
                    onClick={copyWhatsAppSummary}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#fff',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                      height: 38,
                      padding: '0 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copiedNotification ? <Check size={14} /> : <Share2 size={14} />} {copiedNotification ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={sendWhatsAppSummary}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#16a34a',
                      color: '#fff',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                      height: 38,
                      padding: '0 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Edit hint — the live document below is directly editable */}
            <div
              className="ck-noprint"
              style={{ fontSize: '0.62rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', color: '#666', textAlign: 'center', marginBottom: 8, letterSpacing: '0.04em' }}
            >
              ✎ Tap Any Text In The Document To Edit It Directly — Edits Are Included In Your Export
            </div>

            {/* ─── LIVE BRANDED DOCUMENT CANVAS (PRINTABLE + DIRECTLY EDITABLE) ─── */}
            <div
              ref={printAreaRef}
              id="printable-document"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              style={
                activeTab === 'receipt'
                  ? {}
                  : {
                    background: '#ffffff',
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)',
                    maxWidth: 820,
                    width: '100%',
                    margin: '0 auto',
                    minHeight: 700,
                    padding: (activeTab === 'invoice' || activeTab === 'agreement' || activeTab === 'letterhead') ? 0 : 'clamp(28px, 4vw, 48px)',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  }
              }
            >
              {activeTab === 'invoice' && invoiceDocument}

              {/* ─── TAB CONTENT 2: RECEIPT PREVIEW ─── */}
              {activeTab === 'receipt' && (
                <div>
                  {/* ─── THERMAL RECEIPT PREVIEW ─── */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 6px' }}>
                    <div
                      id="receipt-capture-root"
                      style={{
                        width: 355,
                        background: '#fafafa',
                        color: '#09090b',
                        padding: '28px 24px 32px',
                        clipPath: receiptClipPath,
                        boxShadow: '0 14px 28px -16px rgba(0,0,0,0.4)',
                      }}
                    >
                      <ReceiptDocument data={receiptDocData} qrUrl={receiptQrUrl} showBranding={brandingOn} />
                    </div>
                  </div>

                  {/* ─── BRAND LOGO + ANIMATED THERMAL PRINT CONTROLS ─── */}
                  <div className="ck-noprint" contentEditable={false} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 8, marginBottom: 24 }}>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => logoFileInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 8px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <ImagePlus size={14} /> {logoUrl ? 'Logo' : 'Upload Logo'}
                    </button>
                    {logoUrl && (
                      <button
                        onClick={() => setLogoUrl(null)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#fee2e2', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 8px', fontSize: '0.7rem', fontWeight: 800, fontFamily: 'monospace', cursor: 'pointer', color: '#991b1b', whiteSpace: 'nowrap' }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}

                    <button
                      onClick={handleExport}
                      disabled={isMobileDevice && isSavingImage}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#FFE500', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 8px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {isMobileDevice ? <Download size={14} /> : <Printer size={14} />}
                      {isMobileDevice ? (isSavingImage ? 'Saving…' : 'Save Image') : 'Print'}
                    </button>
                    <button
                      onClick={copyClientLink}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 8px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {clientLinkCopied ? <Check size={14} /> : <Share2 size={14} />} {clientLinkCopied ? 'Copied' : 'Client Link'}
                    </button>
                    <button
                      onClick={shareReceiptOnWhatsApp}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#16a34a', color: '#fff', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 8px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'agreement' && agreementDocument}

              {activeTab === 'letterhead' && letterheadDocument}
            </div>

            {/* Bottom Action Bar */}
            {activeTab !== 'receipt' && (
              <div
                className="ck-noprint"
                style={{
                  background: '#fff',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0 #000',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>
                  Ready to bill? Export your document in one tap.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: '100%' }}>
                  <button
                    onClick={handleExport}
                    disabled={isMobileDevice && isSavingImage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      background: '#FFE500',
                      color: '#000',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                      height: 38,
                      padding: '0 4px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isMobileDevice ? <Download size={13} /> : <Printer size={13} />}
                    {isMobileDevice ? (isSavingImage ? 'Saving…' : 'Save Image') : 'Print / PDF'}
                  </button>
                  <button
                    onClick={copyWhatsAppSummary}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      background: '#fff',
                      color: '#000',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                      height: 38,
                      padding: '0 4px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copiedNotification ? <Check size={13} /> : <Share2 size={13} />} {copiedNotification ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={sendWhatsAppSummary}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      background: '#16a34a',
                      color: '#fff',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                      height: 38,
                      padding: '0 4px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ANIMATED PRINTER OVERLAY (For all documents: Invoices, Receipts, Contracts, Letterheads) ─── */}
      {printStage !== 'idle' && (
        <div
          className="ck-noprint"
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
        >
          <div
            style={{
              margin: 'auto',
              width: '100%',
              maxWidth: activeTab === 'receipt' ? 420 : 860,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#fff' }}>
                {activeTab === 'receipt'
                  ? 'THERMAL RECEIPT PRINTER'
                  : activeTab === 'invoice'
                    ? 'INVOICE PRINTER'
                    : activeTab === 'agreement'
                      ? 'CONTRACT PRINTER'
                      : 'LETTERHEAD PRINTER'}
              </span>
              <button
                onClick={closeAnimatedPrint}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 #000', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                <X size={14} /> Close
              </button>
            </div>

            <ReceiptPrinter.Root
              stage={printStage}
              feedMotion="stepped"
              className={activeTab === 'receipt' ? 'max-w-sm' : 'max-w-4xl'}
            >
              <ReceiptPrinter.Machine>
                <ReceiptPrinter.Header>
                  <ReceiptPrinter.Status>
                    {printStage === 'processing'
                      ? 'Processing document…'
                      : printStage === 'printing'
                        ? `Printing ${activeTab === 'invoice' ? 'Invoice' : activeTab === 'agreement' ? 'Contract' : activeTab === 'letterhead' ? 'Letterhead' : 'Receipt'}…`
                        : 'Document ready'}
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
                        ? (amountPaid >= totalAmount ? 'Paid in full' : 'Partial')
                        : activeTab === 'invoice'
                          ? 'INVOICE READY'
                          : activeTab === 'agreement'
                            ? 'CONTRACT READY'
                            : 'PITCH READY'}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                    {clientName} · {activeTab === 'receipt' ? receiptNumber : invoiceNumber}
                  </p>
                </ReceiptPrinter.Screen>
              </ReceiptPrinter.Machine>

              <ReceiptPrinter.Output
                className={activeTab === 'receipt' ? 'h-[36rem]' : 'h-[44rem] sm:h-[48rem] px-0'}
                style={
                  printPaperHeight
                    ? { height: printPaperHeight + 24, transition: 'height 1850ms linear' }
                    : undefined
                }
              >
                <div ref={printPaperRef}>
                  <ReceiptPrinter.Paper variant={activeTab === 'receipt' ? 'receipt' : 'document'}>
                    {activeTab === 'receipt' && (
                      <ReceiptDocument data={receiptDocData} qrUrl={receiptQrUrl} showBranding={brandingOn} />
                    )}
                    {activeTab === 'invoice' && invoiceDocument}
                    {activeTab === 'agreement' && agreementDocument}
                    {activeTab === 'letterhead' && letterheadDocument}
                  </ReceiptPrinter.Paper>
                </div>
              </ReceiptPrinter.Output>
            </ReceiptPrinter.Root>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8, width: '100%', maxWidth: 480, marginTop: 4 }}>
              <button
                onClick={isMobileDevice ? saveDocumentAsImage : handlePrint}
                disabled={isMobileDevice && isSavingImage}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#FFE500', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 8px', fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {isMobileDevice ? <Download size={14} /> : <Printer size={14} />}
                {isMobileDevice ? (isSavingImage ? 'Saving…' : 'Save Image') : 'Print PDF'}
              </button>
              <button
                onClick={copyWhatsAppSummary}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 8px', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'monospace', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {copiedNotification ? <Check size={14} /> : <Share2 size={14} />} {copiedNotification ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={sendWhatsAppSummary}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#16a34a', color: '#fff', border: '2px solid #000', boxShadow: '2px 2px 0 #000', height: 38, padding: '0 8px', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'monospace', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                WhatsApp
              </button>
            </div>
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
