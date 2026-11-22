'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
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
  PenTool,
  Upload,
  FileUp,
  Palette,
  ArrowRight,
  Zap,
  SlidersHorizontal,
  RefreshCw,
  Undo2,
  Redo2,
  FolderOpen,
  PenLine,
  RotateCcw,
  Sparkles,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { ByokModal, ByokButton } from '@/components/ai/ByokModal';
import { generateBusinessDocumentWithAi } from '@/lib/business-ai';
import {
  extractColorsFromImage,
  parseNaturalPrompt,
  reconstructDocumentFromText,
  extractTextFromDocx,
  type ParsedDocumentData,
  type DocumentSection,
} from '@/lib/business-smart-builder';
import { ThinkingOrb } from 'thinking-orbs';
import { exportDocumentAsImage } from '@/lib/export-document-image';
import StudioToolsDropdown from '@/components/nav/SiteNav';
import { ReceiptPrinter, receiptClipPath } from '@/components/receipt-printer';
import { encodeReceipt, decodeReceipt, type ReceiptPayload } from '@/lib/receipt/receipt-link';
import ReceiptDocument, { type ReceiptDocumentData } from '@/components/receipt-document';
import { saveReceiptToDatabase, getReceiptByShortId } from '@/lib/supabase';
import {
  listVault,
  upsertVaultEntry,
  setVaultStatus,
  deleteVaultEntry,
  nextDocNumber,
  listClients,
  rememberClient,
  listServices,
  rememberServices,
  forgetService,
  shortIdFromLink,
  type VaultEntry,
  type SavedClient,
  type SavedService,
} from '@/lib/business-vault';
import InvoiceDocumentRenderer, { type InvoiceData, type InvoiceTemplateId } from '@/components/invoice-templates';
import ContractDocumentRenderer, { type ContractData, type ContractTemplateId } from '@/components/contract-templates';
import LetterheadDocumentRenderer, { type LetterheadData, type LetterheadTemplateId } from '@/components/letterhead-templates';
import { GOOGLE_FONTS_LIST } from '@/app/match-cut/google-fonts';
import { loadBrandKit, brandKitHasAnything, learnBrandKitFromUse, updateBrandKit } from '@/lib/brand-kit';
import { formatPhoneNumberForDisplay } from '@/lib/phone-format';
import CreatorSignatureModal from '@/components/CreatorSignatureModal';

type TabType = 'invoice' | 'receipt' | 'agreement' | 'letterhead';
type CurrencyType = 'GHS' | 'NGN' | 'USD' | 'GBP' | 'EUR';

// ─── LOCAL-DATE + NUMBERING HELPERS ──────────────────────────────────────────
// Every builder date is typed into <input type="date"> as YYYY-MM-DD. Using
// toISOString() for those strings shifts by timezone (UTC midnight vs local
// midnight), which made issue/due dates drift and mismatch the saved vault
// rows. These helpers always produce the LOCAL calendar day.
function localDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayLocalISO(): string {
  return localDateISO(new Date());
}

function addDaysLocalISO(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return todayLocalISO();
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}

/** Fresh doc numbers follow the current year instead of a hardcoded one. */
function defaultDocNumber(prefix: 'INV' | 'REC'): string {
  return `${prefix}-${new Date().getFullYear()}-0001`;
}

type CreatorTypeId =
  | 'influencer'
  | 'photographer'
  | 'videographer'
  | 'editor'
  | 'designer'
  | 'producer'
  | 'writer'
  | 'agency'
  | 'other';

interface CreatorTypePreset {
  id: CreatorTypeId;
  emoji: string;
  label: string;
  sub: string;
  niche: string;
  items: Array<{ description: string; quantity: number; rate: number; platform: DeliverableItem['platform'] }>;
  depositPercentage: number;
  turnaroundDays: number;
  revisionRounds: number;
  usagePeriod: string;
  contractScope: string;
  contractTitle: string;
}

const CREATOR_TYPE_PRESETS: CreatorTypePreset[] = [
  {
    id: 'influencer',
    emoji: '🎬',
    label: 'Content Creator / Influencer',
    sub: 'TikTok, Reels, YouTube, Podcasts',
    niche: 'Lifestyle & Social Media Creator',
    items: [
      { description: '1x Dedicated TikTok Video (60s with Hook & CTA)', quantity: 1, rate: 2500, platform: 'TikTok' },
      { description: '1x Instagram Reel + 3x Story Slides with Brand Tag', quantity: 1, rate: 3000, platform: 'Instagram' },
    ],
    depositPercentage: 50,
    turnaroundDays: 5,
    revisionRounds: 2,
    usagePeriod: '30 Days Organic Social',
    contractScope: 'Production and distribution of authentic brand campaign content across social media platforms, including sponsored video creation, product integration, and organic audience engagement.',
    contractTitle: 'CONTENT CREATOR SPONSORSHIP AGREEMENT',
  },
  {
    id: 'photographer',
    emoji: '📸',
    label: 'Photographer',
    sub: 'Portrait, Commercial, Event',
    niche: 'Commercial & Portrait Photographer',
    items: [
      { description: '1x Full-Day Studio Session (8hrs) + 30 Edited Selects', quantity: 1, rate: 3200, platform: 'UGC' },
      { description: 'Commercial License — Unlimited Digital Usage, 12 Months', quantity: 1, rate: 1500, platform: 'Other' },
    ],
    depositPercentage: 50,
    turnaroundDays: 10,
    revisionRounds: 1,
    usagePeriod: '12 Months Commercial Digital',
    contractScope: 'Professional photography services including on-location or studio shooting, post-production editing, and delivery of final licensed images for agreed brand usage.',
    contractTitle: 'PHOTOGRAPHY SERVICES AGREEMENT',
  },
  {
    id: 'videographer',
    emoji: '🎥',
    label: 'Videographer / Filmmaker',
    sub: 'Brand films, Shoots, Drone',
    niche: 'Commercial Videographer & Filmmaker',
    items: [
      { description: '1x Full Shoot Day (8hrs) — Crew, Camera & Lighting Kit', quantity: 1, rate: 5000, platform: 'UGC' },
      { description: '1x Final Edited Brand Video (2-3min) — Color Grade & Mix', quantity: 1, rate: 3500, platform: 'Other' },
    ],
    depositPercentage: 40,
    turnaroundDays: 14,
    revisionRounds: 2,
    usagePeriod: '12 Months Broadcast & Digital',
    contractScope: 'Professional video production services including pre-production planning, on-location filming, post-production editing, color grading, audio mixing, and delivery of final video assets.',
    contractTitle: 'VIDEO PRODUCTION SERVICES AGREEMENT',
  },
  {
    id: 'editor',
    emoji: '✂️',
    label: 'Video Editor',
    sub: 'Post-production, Shorts, Reels',
    niche: 'Video Editor & Post-Production',
    items: [
      { description: '1x Long-Form YouTube Edit (10–20min) with Graphics Package', quantity: 1, rate: 2000, platform: 'YouTube' },
      { description: '3x Short-Form Clip Edits (TikTok / Reels) from same footage', quantity: 3, rate: 400, platform: 'TikTok' },
    ],
    depositPercentage: 50,
    turnaroundDays: 5,
    revisionRounds: 3,
    usagePeriod: 'One-Time Delivery — All Rights Transferred',
    contractScope: 'Post-production editing services including assembly cut, color correction, motion graphics, audio sync, and delivery of final video files in agreed formats and resolutions.',
    contractTitle: 'VIDEO EDITING SERVICES AGREEMENT',
  },
  {
    id: 'designer',
    emoji: '🎨',
    label: 'Designer / Brand Creative',
    sub: 'Identity, Social, Branding',
    niche: 'Brand Designer & Creative Director',
    items: [
      { description: 'Brand Identity System — Logo Suite, Color Palette, Typography', quantity: 1, rate: 4500, platform: 'Other' },
      { description: 'Social Media Template Pack — 10 Editable Canva / Figma Frames', quantity: 1, rate: 1800, platform: 'Instagram' },
    ],
    depositPercentage: 50,
    turnaroundDays: 14,
    revisionRounds: 2,
    usagePeriod: 'Perpetual License — Full Brand Ownership Transferred',
    contractScope: 'Brand design services including concept development, visual identity creation, asset delivery in agreed formats, and transfer of commercial usage rights upon final payment.',
    contractTitle: 'BRAND DESIGN SERVICES AGREEMENT',
  },
  {
    id: 'producer',
    emoji: '🎵',
    label: 'Music Producer / Audio',
    sub: 'Beats, Sync, Mixing, Mastering',
    niche: 'Music Producer & Sound Designer',
    items: [
      { description: '1x Custom Beat Production — Exclusive License', quantity: 1, rate: 3500, platform: 'Other' },
      { description: 'Mixing & Mastering — Full Track (Stereo + Stems Delivery)', quantity: 1, rate: 1500, platform: 'Other' },
    ],
    depositPercentage: 50,
    turnaroundDays: 7,
    revisionRounds: 2,
    usagePeriod: 'Perpetual Exclusive License — All Platforms',
    contractScope: 'Music production, mixing, and mastering services including original composition, arrangement, and delivery of stems and master files under agreed licensing terms.',
    contractTitle: 'MUSIC PRODUCTION & LICENSING AGREEMENT',
  },
  {
    id: 'writer',
    emoji: '✍️',
    label: 'Copywriter / Scriptwriter',
    sub: 'Scripts, Captions, Ad Copy',
    niche: 'Creative Copywriter & Scriptwriter',
    items: [
      { description: '1x Long-Form Brand Script (3–5min video, 2 revisions)', quantity: 1, rate: 1200, platform: 'Other' },
      { description: '30-Day Social Media Caption Pack (3x posts/week)', quantity: 1, rate: 2500, platform: 'Instagram' },
    ],
    depositPercentage: 50,
    turnaroundDays: 5,
    revisionRounds: 2,
    usagePeriod: 'Full Ghostwriting Transfer — No Attribution Required',
    contractScope: 'Copywriting and scripting services including research, original drafting, revision rounds, and final delivery of written assets for brand campaigns, video productions, and social media.',
    contractTitle: 'COPYWRITING SERVICES AGREEMENT',
  },
  {
    id: 'agency',
    emoji: '🏢',
    label: 'Studio / Creative Agency',
    sub: 'Full-service, Retainer, Teams',
    niche: 'Creative Studio & Agency',
    items: [
      { description: 'Monthly Retainer — Full Creative Direction & Content Production', quantity: 1, rate: 12000, platform: 'Other' },
      { description: 'Campaign Launch Package — Strategy, Production & Distribution', quantity: 1, rate: 8500, platform: 'Other' },
    ],
    depositPercentage: 30,
    turnaroundDays: 21,
    revisionRounds: 3,
    usagePeriod: '12 Months Retainer — Unlimited Internal Use',
    contractScope: 'Full-service creative production and campaign management services including strategy, content production, brand partnership management, and performance reporting.',
    contractTitle: 'CREATIVE AGENCY RETAINER AGREEMENT',
  },
  {
    id: 'other',
    emoji: '🙋',
    label: 'Other / Custom',
    sub: 'Blank slate — full custom',
    niche: 'Creative Professional',
    items: [
      { description: 'Custom Creative Deliverable', quantity: 1, rate: 1500, platform: 'Other' },
    ],
    depositPercentage: 50,
    turnaroundDays: 14,
    revisionRounds: 0,
    usagePeriod: 'None',
    contractScope: 'Professional creative services as agreed between both parties.',
    contractTitle: 'SERVICE CONTRACT',
  },
];

const CREATOR_TYPE_KEY = 'ck_creator_type_v1';

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

interface TabInfo {
  id: TabType;
  label: string;
  desc: string;
}

function getTabsForCreatorType(typeId: CreatorTypeId | null): TabInfo[] {
  switch (typeId) {
    case 'agency':
      return [
        { id: 'invoice', label: 'Agency Retainer Invoice', desc: 'Bill client retainers, milestones & multi-team fees' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment & accounting acknowledgment' },
        { id: 'agreement', label: 'Agency Master Agreement', desc: 'Retainers, SOW deliverables, IP transfer & terms' },
        { id: 'letterhead', label: 'Studio Letterhead', desc: 'Executive proposals, pitch briefs & scope estimates' },
      ];
    case 'editor':
      return [
        { id: 'invoice', label: 'Video Editing Invoice', desc: 'Post-production, cuts, rushes & milestone billing' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
        { id: 'agreement', label: 'Editor Service Agreement', desc: 'Revision caps, raw footage & delivery rights' },
        { id: 'letterhead', label: 'Editor Letterhead', desc: 'Client briefs, scope quotes & turnaround terms' },
      ];
    case 'videographer':
      return [
        { id: 'invoice', label: 'Production Invoice', desc: 'Shoot day rate, crew kit, drone & gear billing' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
        { id: 'agreement', label: 'Production Agreement', desc: 'Shoot dates, raw footage, licensing & weather terms' },
        { id: 'letterhead', label: 'Production Letterhead', desc: 'Treatment proposals, call sheets & quotes' },
      ];
    case 'photographer':
      return [
        { id: 'invoice', label: 'Photography Invoice', desc: 'Shoot day rate, studio fee & commercial licensing' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
        { id: 'agreement', label: 'Photography Agreement', desc: 'Image selects, commercial usage & shoot terms' },
        { id: 'letterhead', label: 'Photography Letterhead', desc: 'Rate cards, creative proposals & treatment sheets' },
      ];
    case 'designer':
      return [
        { id: 'invoice', label: 'Design Services Invoice', desc: 'Branding milestones, logo suite & vector assets' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
        { id: 'agreement', label: 'Design Services Agreement', desc: 'IP transfer, revision rounds & asset handoff' },
        { id: 'letterhead', label: 'Design Letterhead', desc: 'Design proposals, brand strategy & project briefs' },
      ];
    case 'producer':
      return [
        { id: 'invoice', label: 'Music Production Invoice', desc: 'Custom beats, stems & mix/master delivery billing' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
        { id: 'agreement', label: 'Music Licensing Agreement', desc: 'Master rights, publishing, sync & stem licensing' },
        { id: 'letterhead', label: 'Audio Studio Letterhead', desc: 'Track proposals, cue sheets & project estimates' },
      ];
    case 'writer':
      return [
        { id: 'invoice', label: 'Copywriting Invoice', desc: 'Scripts, campaign copy, ad copy & article billing' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
        { id: 'agreement', label: 'Writer Services Agreement', desc: 'Ghostwriting rights, revision rounds & handoff' },
        { id: 'letterhead', label: 'Writer Letterhead', desc: 'Project proposals, editorial briefs & quotes' },
      ];
    case 'influencer':
      return [
        { id: 'invoice', label: 'Brand Deal Invoice', desc: 'Bill brands with MoMo / Bank & upfront deposit' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
        { id: 'agreement', label: 'Influencer Agreement', desc: 'Usage rights, revisions & kill fee contract' },
        { id: 'letterhead', label: 'Pitch Letterhead', desc: 'Branded header for proposals & media kits' },
      ];
    default:
      return [
        { id: 'invoice', label: 'Service Invoice', desc: 'Bill clients with MoMo / Bank & upfront deposit' },
        { id: 'receipt', label: 'Payment Receipt', desc: 'Official proof of payment acknowledgment' },
        { id: 'agreement', label: 'Service Agreement', desc: 'Scope of work, revisions, deliverables & terms' },
        { id: 'letterhead', label: 'Official Letterhead', desc: 'Proposals, rate cards & business letters' },
      ];
  }
}

function BusinessSuiteContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'invoice';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(() => searchParams.get('id') || null);

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && ['invoice', 'receipt', 'agreement', 'letterhead'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // ─── GENERAL CREATOR & CLIENT STATE ──────────────────────────
  // Blank by design: identity comes from the saved Brand Kit (or the user's
  // own typing). Hardcoded demo identity here is what made deleted business
  // info resurrect on the next visit.
  const [creatorName, setCreatorName] = useState('');
  const [creatorHandle, setCreatorHandle] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorPhone, setCreatorPhone] = useState('');
  const [creatorLocation, setCreatorLocation] = useState('');
  const [creatorNiche, setCreatorNiche] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [currency, setCurrency] = useState<CurrencyType>('GHS');
  const [invoiceNumber, setInvoiceNumber] = useState(() => defaultDocNumber('INV'));
  const [poNumber, setPoNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState(() => defaultDocNumber('REC'));
  const [issueDate, setIssueDate] = useState(todayLocalISO);
  const [dueDate, setDueDate] = useState(() => addDaysLocalISO(todayLocalISO(), 14));
  const [shippingAddress, setShippingAddress] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // ─── CREATOR ELECTRONIC SIGNATURE (Device-Persistent) ─────────
  const CREATOR_SIGNATURE_KEY = 'ck_creator_signature_v1';
  const [creatorSignatureDrawing, setCreatorSignatureDrawing] = useState<string | null>(null);
  const [isCreatorSignatureModalOpen, setIsCreatorSignatureModalOpen] = useState(false);

  useEffect(() => {
    try {
      const savedSig = localStorage.getItem(CREATOR_SIGNATURE_KEY);
      if (savedSig) {
        setCreatorSignatureDrawing(savedSig);
      } else {
        const kit = loadBrandKit();
        if (kit.signature?.drawingUrl) {
          setCreatorSignatureDrawing(kit.signature.drawingUrl);
        }
        if (kit.signature?.signatureName) {
          setSignatureName(kit.signature.signatureName);
        }
      }
    } catch { }
  }, []);

  const handleSaveCreatorSignature = (dataUrl: string, name?: string) => {
    setCreatorSignatureDrawing(dataUrl);
    const chosenName = name || signatureName || creatorName;
    if (name) {
      setSignatureName(name);
    }
    try {
      localStorage.setItem(CREATOR_SIGNATURE_KEY, dataUrl);
    } catch { }
    // Update Brand Kit so signature is part of universal creator identity
    updateBrandKit({
      signature: {
        drawingUrl: dataUrl,
        signatureName: chosenName,
        font: signatureFont || 'Caveat',
      },
    });
    setIsCreatorSignatureModalOpen(false);
    setSmartStatusMessage('Electronic signature saved to Brand Kit & ready on all documents.');
    setTimeout(() => setSmartStatusMessage(null), 3500);
  };

  const handleClearCreatorSignature = () => {
    setCreatorSignatureDrawing(null);
    try {
      localStorage.removeItem(CREATOR_SIGNATURE_KEY);
    } catch { }
    updateBrandKit({
      signature: {
        drawingUrl: null,
        signatureName: '',
        font: 'Caveat',
      },
    });
    setSmartStatusMessage('Electronic signature removed from Brand Kit and this device.');
    setTimeout(() => setSmartStatusMessage(null), 3000);
  };

  // ─── INVOICE TEMPLATE, COLORS & TYPOGRAPHY STATE ──────────────
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplateId>('navy');
  const [headingFont, setHeadingFont] = useState('Oswald');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [signatureFont, setSignatureFont] = useState('Caveat');
  const [primaryColor, setPrimaryColor] = useState('#162a45');
  const [accentColor, setAccentColor] = useState('#e15b3c');
  // PAPER view (owner ruling 2026-10-07): print-accurate preview — the
  // sheet renders at TRUE print size (820px design width, A4-tall) and is
  // scaled down to fit whatever column it's in (mirrors receipt-printer's
  // DocumentPaper scaleToFit), so it looks exactly like the printed page,
  // beautifully contained — even with the ad rail narrowing the column.
  const [paperMode, setPaperMode] = useState(false);
  const [paperScale, setPaperScale] = useState(1);
  const [paperHeight, setPaperHeight] = useState<number | null>(null);

  // ─── AI (BYOK) & MOBILE RESPONSIVE STATES ─────────────────────────────
  const [isByokModalOpen, setIsByokModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Measure the preview column and the unscaled sheet; keep scale synced.
  useEffect(() => {
    const sheet = printAreaRef.current;
    const col = sheet?.parentElement;
    if (!sheet || !col) return;
    const measure = () => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;
      const avail = isMobile
        ? Math.min(window.innerWidth - 20, 820)
        : (col?.clientWidth || window.innerWidth - 40);
      const targetWidth = activeTab === 'receipt' ? 355 : 820;
      const usable = Math.max(240, avail - (isMobile ? 8 : 24));
      const next = Math.min(1, usable / targetWidth);
      setPaperScale(next);
      setPaperHeight(sheet.scrollHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(col);
    ro.observe(sheet);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [paperMode, activeTab, mobileTab]);
  // ─── BRANDING TOGGLE (Powered by CreatorsKit badge on printed documents) ──
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

  // ─── MY DOCUMENTS VAULT (Tier 1 memory: every client, service & document) ───
  // Device-local (localStorage, same trust level as the working draft): every
  // document the creator prints or shares is recorded once, clients and line
  // items are learned automatically, and each new document numbers itself.
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [savedServices, setSavedServices] = useState<SavedService[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [confirmDeleteVaultId, setConfirmDeleteVaultId] = useState<string | null>(null);
  // Destructive actions always confirm: first tap arms ("ARE YOU SURE?"),
  // second tap within the window removes; anything else disarms.
  const removeVaultEntry = (id: string) => {
    if (confirmDeleteVaultId !== id) {
      setConfirmDeleteVaultId(id);
      setTimeout(() => setConfirmDeleteVaultId((cur) => (cur === id ? null : cur)), 2600);
      return;
    }
    setConfirmDeleteVaultId(null);
    setVaultEntries(deleteVaultEntry(id));
  };
  useEffect(() => {
    setVaultEntries(listVault());
    setSavedClients(listClients());
    setSavedServices(listServices());
  }, []);
  const vaultActionStyle: React.CSSProperties = {
    padding: '4px 7px',
    background: '#f4f4f5',
    border: '1px solid #000',
    fontSize: '0.58rem',
    fontWeight: 900,
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
    cursor: 'pointer',
  };

  const SectionToggle = ({ id, title }: { id: keyof typeof openSections; title: string }) => {
    const isOpen = openSections[id];
    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: isOpen ? '#ffffff' : '#fcfcfd',
          color: '#000000',
          border: isOpen ? '2px solid #000' : '1.5px solid #d4d4d8',
          boxShadow: isOpen ? '2px 2px 0 #000' : '1px 1px 0 rgba(0,0,0,0.06)',
          padding: '10px 14px',
          fontFamily: 'monospace',
          fontWeight: 800,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          cursor: 'pointer',
          borderRadius: 4,
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', minWidth: 0 }}>
          <span
            style={{
              fontSize: '0.65rem',
              width: 18,
              height: 18,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isOpen ? '#000' : '#f4f4f5',
              color: isOpen ? '#fff' : '#52525b',
              border: isOpen ? '1px solid #000' : '1px solid #e4e4e7',
              borderRadius: 3,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {isOpen ? '−' : '+'}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
        </span>
        <span
          style={{
            background: isOpen ? '#ecfdf5' : '#f4f4f5',
            color: isOpen ? '#047857' : '#71717a',
            border: isOpen ? '1px solid #a7f3d0' : '1px solid #e4e4e7',
            padding: '2px 8px',
            fontSize: '0.58rem',
            fontWeight: 800,
            borderRadius: 3,
            flexShrink: 0,
            letterSpacing: '0.04em',
          }}
        >
          {isOpen ? 'ACTIVE' : 'OFF'}
        </span>
      </button>
    );
  };

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
  const [fullDocumentText, setFullDocumentText] = useState<string>('');
  const [documentSections, setDocumentSections] = useState<DocumentSection[]>([]);
  const [showRedFlagAudit, setShowRedFlagAudit] = useState(false);

  // ─── LETTERHEAD TEMPLATE & PROPOSAL STATE ─────────────────────
  const [letterheadTemplate, setLetterheadTemplate] = useState<LetterheadTemplateId>('creative');
  const [letterheadTitle, setLetterheadTitle] = useState('Campaign Proposal');
  const [letterheadAudienceFocus, setLetterheadAudienceFocus] = useState('Ghana & West Africa Diaspora');
  const [letterheadEngagementRate, setLetterheadEngagementRate] = useState('82% Mobile · High Conversion');
  const [letterheadTrackRecord, setLetterheadTrackRecord] = useState('4K Cinematic Social Storytelling');
  const [letterheadIntro, setLetterheadIntro] = useState('');
  const [letterheadBody, setLetterheadBody] = useState('');

  const handleSelectContractPreset = (preset: string) => {
    pushUndo();
    if (preset === 'video-editor') {
      setContractTemplate('service');
      setContractTitle('VIDEO EDITING & POST-PRODUCTION AGREEMENT');
      setContractScopeDescription('Assembly cut, timeline audio sync, color grading, sound design, motion graphics, and delivery of final master files in 4K ProRes & MP4.');
      setDepositPercentage(50);
      setTurnaroundDays(5);
      setRevisionRounds(3);
      setUsagePeriod('Full Commercial Rights Transferred Upon Final Payment');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Video Editor contract preset.');
    } else if (preset === 'photography') {
      setContractTemplate('creator');
      setContractTitle('PHOTOGRAPHY SERVICES & COMMERCIAL LICENSING AGREEMENT');
      setContractScopeDescription('On-location or studio photoshoot, color grading, high-resolution edited selects, and commercial license for digital and print distribution.');
      setDepositPercentage(50);
      setTurnaroundDays(7);
      setRevisionRounds(1);
      setUsagePeriod('12 Months Worldwide Commercial Digital License');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Photography contract preset.');
    } else if (preset === 'videography') {
      setContractTemplate('creator');
      setContractTitle('COMMERCIAL VIDEO PRODUCTION AGREEMENT');
      setContractScopeDescription('Principal photography, lighting & sound equipment package, director of photography services, and post-production editing for brand campaign.');
      setDepositPercentage(40);
      setTurnaroundDays(14);
      setRevisionRounds(2);
      setUsagePeriod('12 Months Broadcast & Digital Marketing License');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Videographer contract preset.');
    } else if (preset === 'design') {
      setContractTemplate('service');
      setContractTitle('BRAND IDENTITY & GRAPHIC DESIGN AGREEMENT');
      setContractScopeDescription('Brand visual identity design, primary and secondary logo marks, typography pairings, color palette, vector master files, and brand guidelines deck.');
      setDepositPercentage(50);
      setTurnaroundDays(14);
      setRevisionRounds(2);
      setUsagePeriod('Full Ownership & Copyright Assignment Upon Final Balance');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Brand Design contract preset.');
    } else if (preset === 'music') {
      setContractTemplate('creator');
      setContractTitle('MUSIC PRODUCTION & SYNC LICENSING AGREEMENT');
      setContractScopeDescription('Custom musical composition, arrangement, mixing, mastering, multi-track stems delivery, and commercial synchronization licensing.');
      setDepositPercentage(50);
      setTurnaroundDays(7);
      setRevisionRounds(2);
      setUsagePeriod('Perpetual Commercial Synchronization License');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Music Production contract preset.');
    } else if (preset === 'copywriting') {
      setContractTemplate('service');
      setContractTitle('COPYWRITING & SCRIPTWRITING SERVICES AGREEMENT');
      setContractScopeDescription('Concept research, brand messaging, video scriptwriting, social captions drafting, and revision cycles for brand campaign.');
      setDepositPercentage(50);
      setTurnaroundDays(5);
      setRevisionRounds(2);
      setUsagePeriod('Full Ghostwriting Transfer — No Attribution Required');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Copywriter contract preset.');
    } else if (preset === 'agency') {
      setContractTemplate('business');
      setContractTitle('CREATIVE AGENCY MASTER SERVICES AGREEMENT');
      setContractScopeDescription('Monthly retainer creative direction, multi-channel content production, brand management, campaign optimization, and bi-weekly performance reporting.');
      setDepositPercentage(30);
      setTurnaroundDays(21);
      setRevisionRounds(3);
      setUsagePeriod('12-Month Ongoing Retainer License');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Creative Agency MSA preset.');
    } else if (preset === 'service') {
      setContractTemplate('service');
      setContractTitle('SERVICE CONTRACT');
      setContractScopeDescription('Provision of creative video production, brand integration, and organic social media posting.');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Standard Service preset.');
    } else if (preset === 'sponsorship') {
      setContractTemplate('creator');
      setContractTitle('CONTENT CREATOR SPONSORSHIP & LICENSING AGREEMENT');
      setContractScopeDescription('Dedicated multi-platform influencer sponsorship campaign including custom content creation, product placement, and organic distribution.');
      setContractConfidentiality(true);
      setContractExclusivity('30 Days Category Exclusive');
      setSmartStatusMessage('Loaded Influencer Deal preset.');
    } else if (preset === 'business') {
      setContractTemplate('business');
      setContractTitle('BUSINESS CONTRACT AGREEMENT');
      setContractScopeDescription('Professional creative services, brand asset creation, and content consulting.');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Business Contract preset.');
    } else if (preset === 'nda') {
      setContractTemplate('service');
      setContractTitle('NON-DISCLOSURE & PROPRIETARY INFORMATION AGREEMENT');
      setContractScopeDescription('Mutual protection of confidential business strategies, unreleased product features, and marketing campaigns.');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Mutual NDA preset.');
    } else if (preset === 'contractor') {
      setContractTemplate('service');
      setContractTitle('INDEPENDENT CONTRACTOR AGREEMENT');
      setContractScopeDescription('Independent contractor creative production services.');
      setContractConfidentiality(true);
      setContractExclusivity('None');
      setSmartStatusMessage('Loaded Contractor Agreement preset.');
    }
  };

  const handleSelectContractTemplate = (t: ContractTemplateId) => {
    setContractTemplate(t);
    if (t === 'full-legal') {
      setContractTitle('OPERATING AND REVENUE-SHARING AGREEMENT');
      setHeadingFont('Inter');
      setBodyFont('Inter');
      setSignatureFont('Caveat');
    } else if (t === 'service') {
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
  const [amountPaid, setAmountPaid] = useState(0);

  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
  const discount = discountAmount;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = (taxableAmount * taxPercentage) / 100;
  const totalAmount = taxableAmount + tax;
  const depositRequired = (totalAmount * depositPercentage) / 100;
  // The printed balance respects the stated deposit: an unpaid invoice with
  // a 50% deposit shows the remaining 50% as BALANCE DUE, consistent with
  // the "Upfront Deposit" row right above it (and with payments once they
  // land). totalAmount − amountPaid alone printed the FULL total there.
  const committedDeposit = depositPercentage > 0 && depositPercentage < 100 ? depositRequired : 0;
  const balanceDue = Math.max(0, totalAmount - Math.max(amountPaid, committedDeposit));

  // ─── PAYMENT CHANNELS ─────────────────────────────────────────
  const [paymentType, setPaymentType] = useState<'momo' | 'bank' | 'paystack' | 'wire'>('momo');

  // MoMo Details — payment details start EMPTY. They are the creator's own
  // money rails, never demo placeholders (a forgotten default here would put
  // someone else's momo/bank account on a real invoice).
  const [momoNetwork, setMomoNetwork] = useState('MTN Mobile Money');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoName, setMomoName] = useState('');

  // Bank Details
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  // Online / International
  const [paystackLink, setPaystackLink] = useState('');
  const [wireSwift, setWireSwift] = useState('');
  const [wireIban, setWireIban] = useState('');

  // ─── CONTRACT / AGREEMENT SPECIFIC CLAUSES ────────────────────
  // '' = "No usage rights — one-time delivery only". Licensing must be an
  // explicit choice, never a forced default.
  const [usagePeriod, setUsagePeriod] = useState('');
  const [revisionRounds, setRevisionRounds] = useState(2);
  const [turnaroundDays, setTurnaroundDays] = useState(5);

  // ─── UI INTERACTION STATE ─────────────────────────────────────
  const [copiedNotification, setCopiedNotification] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // ─── BRAND LOGO UPLOAD STATE ──────────────────────────────────
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // ─── CONCEPT A & B: SMART BUILDER & COLOR PALETTE EXTRACTION ───
  type BuilderMode = 'guided' | 'reconstruct' | 'manual';
  const [builderMode, setBuilderMode] = useState<BuilderMode>('guided');
  const [promptInput, setPromptInput] = useState('');
  const [guidedClient, setGuidedClient] = useState('');
  const [guidedDeliverable, setGuidedDeliverable] = useState('');
  const [guidedRate, setGuidedRate] = useState('');
  const [guidedCurrency, setGuidedCurrency] = useState<CurrencyType>('USD');
  const [guidedTerms, setGuidedTerms] = useState('50% Upfront, Balance on Delivery (Net 14)');
  const [reconstructText, setReconstructText] = useState('');
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const [smartStatusMessage, setSmartStatusMessage] = useState<string | null>(null);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  // ─── CREATOR TYPE ONBOARDING ──────────────────────────────────
  const [creatorType, setCreatorType] = useState<CreatorTypeId | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ─── DRAFT AUTO-SAVE & SESSION PERSISTENCE ─────────────────────
  const DRAFT_STORAGE_KEY = 'ck_business_draft_v2';
  const isDraftHydratedRef = useRef(false);
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'ready'>('ready');
  const [isMounted, setIsMounted] = useState(false);

  const applyReceiptPayloadToState = useCallback((payload: ReceiptPayload) => {
    if (payload.k) switchTab(payload.k);
    if (payload.n) setCreatorName(payload.n);
    if (payload.h) setCreatorHandle(payload.h);
    if (payload.e) setCreatorEmail(payload.e);
    if (payload.p) setCreatorPhone(payload.p);
    if (payload.l) setCreatorLocation(payload.l);
    if (payload.c) {
      setClientName(payload.c);
      setClientContact(payload.a || payload.c);
    }
    if (payload.cu) setCurrency(payload.cu as CurrencyType);
    if (payload.dt) setIssueDate(payload.dt);
    if (payload.rn) {
      if (payload.k === 'receipt') setReceiptNumber(payload.rn);
      else setInvoiceNumber(payload.rn);
    }
    if (Array.isArray(payload.it) && payload.it.length > 0) {
      setItems(payload.it.map((item, idx) => ({
        id: `it_${idx}`,
        description: item.d,
        quantity: item.q,
        rate: item.r,
        platform: 'Other',
      })));
    }
    if (payload.da !== undefined) setDiscountAmount(payload.da);
    if (payload.tp !== undefined) setTaxPercentage(payload.tp);
    if (payload.ap !== undefined) setAmountPaid(payload.ap);
    if (payload.pt) setPaymentType(payload.pt as any);
    if (payload.mn) setMomoNetwork(payload.mn);
    if (payload.mu) setMomoNumber(payload.mu);
    if (payload.bn) setBankName(payload.bn);
    if (payload.ba) setBankAccountNumber(payload.ba);
    if (payload.lg) setLogoUrl(payload.lg);
    if (payload.br !== undefined) setBrandingOn(payload.br === 1);

    const x = payload.x;
    if (x) {
      if (x.tpl) {
        if (payload.k === 'agreement') setContractTemplate(x.tpl);
        else if (payload.k === 'invoice') setInvoiceTemplate(x.tpl);
        else if (payload.k === 'letterhead') setLetterheadTemplate(x.tpl);
      }
      if (x.ct) setContractTitle(x.ct);
      if (x.csd) setContractScopeDescription(x.csd);
      if (x.ce) setClientEmail(x.ce);
      if (x.ca) setClientAddress(x.ca);
      if (x.fdt) setFullDocumentText(x.fdt);
      if (Array.isArray(x.fsec)) setDocumentSections(x.fsec);
      if (x.dep !== undefined) setDepositPercentage(x.dep);
      if (x.law) setContractGoverningLaw(x.law);
      if (x.ced) setContractEndDate(x.ced);
      if (x.conf !== undefined) setContractConfidentiality(Boolean(x.conf));
      if (x.excl) setContractExclusivity(x.excl);
      if (x.cust) setContractCustomTerms(x.cust);
      if (x.kill !== undefined) setContractKillFee(x.kill);
      if (x.up) setUsagePeriod(x.up);
      if (x.rr !== undefined) setRevisionRounds(x.rr);
      if (x.td !== undefined) setTurnaroundDays(x.td);
      if (x.hf) setHeadingFont(x.hf);
      if (x.bf) setBodyFont(x.bf);
      if (x.sf) setSignatureFont(x.sf);
      if (x.pc) setPrimaryColor(x.pc);
      if (x.ac) setAccentColor(x.ac);
      if (x.lt) setLetterheadTitle(x.lt);
      if (x.af) setLetterheadAudienceFocus(x.af);
      if (x.er) setLetterheadEngagementRate(x.er);
      if (x.tr) setLetterheadTrackRecord(x.tr);
      if (x.it) setLetterheadIntro(x.it);
      if (x.bt) setLetterheadBody(x.bt);
    }
  }, [switchTab]);

  const applyDraftToState = useCallback((d: any) => {
    const urlTab = searchParams.get('tab') as TabType;
    const targetTab = (urlTab && ['invoice', 'receipt', 'agreement', 'letterhead'].includes(urlTab))
      ? urlTab
      : (d.activeTab || 'invoice');
    switchTab(targetTab);

    // The draft is rewritten whole on every keystroke, so every key below is
    // either present (apply it — even when the user deliberately cleared the
    // field) or absent (legacy partial draft: keep the current default).
    // Truthy-only checks here are what made deleted business info resurrect
    // as the old hardcoded demo data on the next visit.
    if (d.creatorName !== undefined) setCreatorName(d.creatorName);
    if (d.creatorHandle !== undefined) setCreatorHandle(d.creatorHandle);
    if (d.creatorEmail !== undefined) setCreatorEmail(d.creatorEmail);
    if (d.creatorPhone !== undefined) setCreatorPhone(d.creatorPhone);
    if (d.creatorLocation !== undefined) setCreatorLocation(d.creatorLocation);
    if (d.creatorNiche !== undefined) setCreatorNiche(d.creatorNiche);

    if (d.clientName !== undefined) setClientName(d.clientName);
    if (d.clientContact !== undefined) setClientContact(d.clientContact);
    if (d.clientEmail !== undefined) setClientEmail(d.clientEmail);
    if (d.clientAddress !== undefined) setClientAddress(d.clientAddress);

    if (d.currency) setCurrency(d.currency);
    if (d.invoiceNumber !== undefined) setInvoiceNumber(d.invoiceNumber);
    if (d.poNumber !== undefined) setPoNumber(d.poNumber);
    if (d.receiptNumber !== undefined) setReceiptNumber(d.receiptNumber);
    if (d.issueDate) setIssueDate(d.issueDate);
    if (d.dueDate) setDueDate(d.dueDate);
    if (d.shippingAddress !== undefined) setShippingAddress(d.shippingAddress);
    if (d.signatureName !== undefined) setSignatureName(d.signatureName);
    if (d.customNotes !== undefined) setCustomNotes(d.customNotes);

    if (Array.isArray(d.items) && d.items.length > 0) setItems(d.items);
    if (d.depositPercentage !== undefined) setDepositPercentage(d.depositPercentage);
    if (d.taxPercentage !== undefined) setTaxPercentage(d.taxPercentage);
    if (d.discountAmount !== undefined) setDiscountAmount(d.discountAmount);
    if (d.amountPaid !== undefined) setAmountPaid(d.amountPaid);

    if (d.paymentType) setPaymentType(d.paymentType);
    if (d.momoNetwork) setMomoNetwork(d.momoNetwork);
    if (d.momoNumber !== undefined) setMomoNumber(d.momoNumber);
    if (d.momoName !== undefined) setMomoName(d.momoName);
    if (d.bankName !== undefined) setBankName(d.bankName);
    if (d.bankAccountName !== undefined) setBankAccountName(d.bankAccountName);
    if (d.bankAccountNumber !== undefined) setBankAccountNumber(d.bankAccountNumber);
    if (d.paystackLink !== undefined) setPaystackLink(d.paystackLink);
    if (d.wireSwift !== undefined) setWireSwift(d.wireSwift);
    if (d.wireIban !== undefined) setWireIban(d.wireIban);

    if (d.invoiceTemplate) setInvoiceTemplate(d.invoiceTemplate);
    if (d.headingFont) setHeadingFont(d.headingFont);
    if (d.bodyFont) setBodyFont(d.bodyFont);
    if (d.signatureFont) setSignatureFont(d.signatureFont);
    if (d.primaryColor) setPrimaryColor(d.primaryColor);
    if (d.accentColor) setAccentColor(d.accentColor);
    if (d.brandingOn !== undefined) setBrandingOn(d.brandingOn);

    if (d.contractTemplate) setContractTemplate(d.contractTemplate);
    if (d.contractTitle) setContractTitle(d.contractTitle);
    if (d.contractScopeDescription) setContractScopeDescription(d.contractScopeDescription);
    if (d.contractConfidentiality !== undefined) setContractConfidentiality(d.contractConfidentiality);
    if (d.contractGoverningLaw) setContractGoverningLaw(d.contractGoverningLaw);
    if (d.contractEndDate) setContractEndDate(d.contractEndDate);
    if (d.contractExclusivity) setContractExclusivity(d.contractExclusivity);
    if (d.contractCustomTerms !== undefined) setContractCustomTerms(d.contractCustomTerms);
    if (d.contractKillFee !== undefined) setContractKillFee(d.contractKillFee);
    if (d.fullDocumentText) setFullDocumentText(d.fullDocumentText);
    if (Array.isArray(d.documentSections)) setDocumentSections(d.documentSections);
    if (d.usagePeriod !== undefined) setUsagePeriod(d.usagePeriod);
    if (d.revisionRounds !== undefined) setRevisionRounds(d.revisionRounds);
    if (d.turnaroundDays !== undefined) setTurnaroundDays(d.turnaroundDays);

    if (d.letterheadTemplate) setLetterheadTemplate(d.letterheadTemplate);
    if (d.letterheadTitle !== undefined) setLetterheadTitle(d.letterheadTitle);
    if (d.letterheadAudienceFocus !== undefined) setLetterheadAudienceFocus(d.letterheadAudienceFocus);
    if (d.letterheadEngagementRate !== undefined) setLetterheadEngagementRate(d.letterheadEngagementRate);
    if (d.letterheadTrackRecord !== undefined) setLetterheadTrackRecord(d.letterheadTrackRecord);
    if (d.letterheadIntro !== undefined) setLetterheadIntro(d.letterheadIntro);
    if (d.letterheadBody !== undefined) setLetterheadBody(d.letterheadBody);

    if (d.logoUrl) setLogoUrl(d.logoUrl);
    if (Array.isArray(d.extractedPalette)) setExtractedPalette(d.extractedPalette);
  }, [searchParams, switchTab]);

  useEffect(() => {
    async function initSession() {
      if (typeof window === 'undefined') return;

      const inlineDoc = searchParams.get('d') || searchParams.get('r');
      if (inlineDoc) {
        const decoded = decodeReceipt(inlineDoc);
        if (decoded) {
          applyReceiptPayloadToState(decoded);
          isDraftHydratedRef.current = true;
          setIsMounted(true);
          // Clean the URL immediately to remove any legacy long payload strings
          const url = new URL(window.location.href);
          url.searchParams.delete('d');
          url.searchParams.delete('r');
          window.history.replaceState({}, '', url.toString());
          return;
        }
      }

      const docId = searchParams.get('id');
      if (docId) {
        try {
          const stored = await getReceiptByShortId(docId);
          if (stored?.payload_string) {
            const decoded = decodeReceipt(stored.payload_string);
            if (decoded) {
              applyReceiptPayloadToState(decoded);
              setActiveDocumentId(docId);
              isDraftHydratedRef.current = true;
              setIsMounted(true);
              return;
            }
          }
        } catch (e) {
          console.error('Failed to load document by id from database:', e);
        }
      }

      let hadDraft = false;
      let draftUpdatedAt = 0;
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d) {
            applyDraftToState(d);
            hadDraft = true;
            draftUpdatedAt = typeof d.updatedAt === 'number' ? d.updatedAt : 0;
            // A restored draft can carry an impossible timeline (due date
            // before the issue date, e.g. an old draft reopened weeks later).
            // Re-anchor the due date so every printed document stays
            // self-consistent with its own issue date.
            if (typeof d.issueDate === 'string' && typeof d.dueDate === 'string' && d.dueDate < d.issueDate) {
              setDueDate(addDaysLocalISO(d.issueDate, 14));
            }
          }
        }
      } catch (e) {
        console.error('Failed to restore draft from localStorage:', e);
      } finally {
        const urlTab = searchParams.get('tab') as TabType;
        if (!urlTab && typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', activeTab);
          window.history.replaceState({}, '', url.toString());
        }
        isDraftHydratedRef.current = true;
        setIsMounted(true);

        // Universal identity: a first visit (no draft, no shared doc) starts
        // from the user's saved Brand Kit instead of the demo defaults. On
        // later visits the kit re-stamps itself whenever it changed MORE
        // RECENTLY than the draft — so Brand Kit edits always win over stale
        // draft identity. That is the "it remembers what I told it" contract.
        const kit = loadBrandKit();
        const kitReady = brandKitHasAnything(kit);
        setBrandKitReady(kitReady);
        if (!docId && kitReady && (!hadDraft || kit.updatedAt > draftUpdatedAt)) applyBrandKit();

        // Show onboarding if creator type not yet set
        // Don't show when user came via a direct ?id= share link
        if (!docId) {
          const savedType = localStorage.getItem(CREATOR_TYPE_KEY) as CreatorTypeId | null;
          if (savedType) {
            setCreatorType(savedType);
          } else {
            setShowOnboarding(true);
          }
        }
      }
    }

    initSession();
  }, []);

  useEffect(() => {
    if (!isDraftHydratedRef.current) return;
    setDraftStatus('saving');
    const timer = setTimeout(() => {
      try {
        const draft = {
          activeTab,
          creatorName,
          creatorHandle,
          creatorEmail,
          creatorPhone,
          creatorLocation,
          creatorNiche,
          clientName,
          clientContact,
          clientEmail,
          clientAddress,
          currency,
          invoiceNumber,
          poNumber,
          receiptNumber,
          issueDate,
          dueDate,
          shippingAddress,
          signatureName,
          customNotes,
          items,
          depositPercentage,
          taxPercentage,
          discountAmount,
          amountPaid,
          paymentType,
          momoNetwork,
          momoNumber,
          momoName,
          bankName,
          bankAccountNumber,
          bankAccountName,
          wireSwift,
          wireIban,
          paystackLink,
          invoiceTemplate,
          headingFont,
          bodyFont,
          signatureFont,
          primaryColor,
          accentColor,
          brandingOn,
          contractTemplate,
          contractTitle,
          contractScopeDescription,
          contractConfidentiality,
          contractGoverningLaw,
          contractEndDate,
          contractExclusivity,
          contractCustomTerms,
          contractKillFee,
          fullDocumentText,
          documentSections,
          usagePeriod,
          revisionRounds,
          turnaroundDays,
          letterheadTemplate,
          letterheadTitle,
          letterheadAudienceFocus,
          letterheadEngagementRate,
          letterheadTrackRecord,
          letterheadIntro,
          letterheadBody,
          logoUrl,
          extractedPalette,
          updatedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setDraftStatus('saved');
      } catch (e) {
        // quota
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [
    activeTab, creatorName, creatorHandle, creatorEmail, creatorPhone, creatorLocation, creatorNiche,
    clientName, clientContact, clientEmail, clientAddress, currency, invoiceNumber, poNumber, receiptNumber,
    issueDate, dueDate, shippingAddress, signatureName, customNotes, items, depositPercentage, taxPercentage,
    discountAmount, amountPaid, paymentType, momoNetwork, momoNumber, momoName, bankName, bankAccountNumber,
    bankAccountName, wireSwift, wireIban, paystackLink, invoiceTemplate, headingFont, bodyFont, signatureFont,
    primaryColor, accentColor, brandingOn, contractTemplate, contractTitle, contractScopeDescription,
    contractConfidentiality, contractGoverningLaw, contractEndDate, contractExclusivity, contractCustomTerms,
    contractKillFee, fullDocumentText, documentSections, usagePeriod, revisionRounds, turnaroundDays,
    letterheadTemplate, letterheadTitle, letterheadAudienceFocus, letterheadEngagementRate, letterheadTrackRecord,
    letterheadIntro, letterheadBody, logoUrl, extractedPalette
  ]);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Allow pressing Escape to close the reset confirmation modal
  useEffect(() => {
    if (!showResetConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResetConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetConfirm]);

  const saveDraftManually = () => {
    try {
      const draft = {
        activeTab,
        creatorName,
        creatorHandle,
        creatorEmail,
        creatorPhone,
        creatorLocation,
        creatorNiche,
        clientName,
        clientContact,
        clientEmail,
        clientAddress,
        currency,
        invoiceNumber,
        poNumber,
        receiptNumber,
        issueDate,
        dueDate,
        shippingAddress,
        signatureName,
        customNotes,
        items,
        depositPercentage,
        taxPercentage,
        discountAmount,
        amountPaid,
        paymentType,
        momoNetwork,
        momoNumber,
        momoName,
        bankName,
        bankAccountNumber,
        bankAccountName,
        wireSwift,
        wireIban,
        paystackLink,
        invoiceTemplate,
        headingFont,
        bodyFont,
        signatureFont,
        primaryColor,
        accentColor,
        brandingOn,
        contractTemplate,
        contractTitle,
        contractScopeDescription,
        contractConfidentiality,
        contractGoverningLaw,
        contractEndDate,
        contractExclusivity,
        contractCustomTerms,
        contractKillFee,
        fullDocumentText,
        documentSections,
        usagePeriod,
        revisionRounds,
        turnaroundDays,
        letterheadTemplate,
        letterheadTitle,
        letterheadAudienceFocus,
        letterheadEngagementRate,
        letterheadTrackRecord,
        letterheadIntro,
        letterheadBody,
        logoUrl,
        extractedPalette,
        updatedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setDraftStatus('saved');
      setSmartStatusMessage('Draft saved locally. All edits, clauses and sections preserved.');
      setTimeout(() => setSmartStatusMessage(null), 3500);
    } catch {
      // quota or private browsing
    }
  };

  // ─── MINIMAL UNDO / REDO SYSTEM (Styled & designed identically to text-behind) ───
  interface BusinessUndoSnapshot {
    activeTab: TabType;
    creatorName: string;
    creatorHandle: string;
    creatorEmail: string;
    creatorPhone: string;
    creatorLocation: string;
    creatorNiche: string;
    clientName: string;
    clientContact: string;
    clientEmail: string;
    clientAddress: string;
    currency: CurrencyType;
    invoiceNumber: string;
    poNumber: string;
    receiptNumber: string;
    issueDate: string;
    dueDate: string;
    shippingAddress: string;
    signatureName: string;
    customNotes: string;
    items: DeliverableItem[];
    depositPercentage: number;
    taxPercentage: number;
    discountAmount: number;
    amountPaid: number;
    paymentType: any;
    momoNetwork: string;
    momoNumber: string;
    momoName: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    wireSwift: string;
    wireIban: string;
    paystackLink: string;
    invoiceTemplate: any;
    headingFont: string;
    bodyFont: string;
    signatureFont: string;
    primaryColor: string;
    accentColor: string;
    brandingOn: boolean;
    contractTemplate: any;
    contractTitle: string;
    contractScopeDescription: string;
    contractConfidentiality: boolean;
    contractGoverningLaw: string;
    contractEndDate: string;
    contractExclusivity: string;
    contractCustomTerms: string;
    contractKillFee: number;
    fullDocumentText: string;
    documentSections: DocumentSection[];
    usagePeriod: string;
    revisionRounds: number;
    turnaroundDays: number;
    letterheadTemplate: any;
    letterheadTitle: string;
    letterheadAudienceFocus: string;
    letterheadEngagementRate: string;
    letterheadTrackRecord: string;
    letterheadIntro: string;
    letterheadBody: string;
    logoUrl: string | null;
    extractedPalette: string[];
  }

  const undoStackRef = useRef<BusinessUndoSnapshot[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const redoStackRef = useRef<BusinessUndoSnapshot[]>([]);
  const [redoCount, setRedoCount] = useState(0);
  const lastUndoPushAtRef = useRef(0);
  const isApplyingUndoRedoRef = useRef(false);
  const undoStateRef = useRef<BusinessUndoSnapshot | null>(null);

  const getCurrentSnapshot = useCallback((): BusinessUndoSnapshot => {
    return {
      activeTab,
      creatorName,
      creatorHandle,
      creatorEmail,
      creatorPhone,
      creatorLocation,
      creatorNiche,
      clientName,
      clientContact,
      clientEmail,
      clientAddress,
      currency,
      invoiceNumber,
      poNumber,
      receiptNumber,
      issueDate,
      dueDate,
      shippingAddress,
      signatureName,
      customNotes,
      items,
      depositPercentage,
      taxPercentage,
      discountAmount,
      amountPaid,
      paymentType,
      momoNetwork,
      momoNumber,
      momoName,
      bankName,
      bankAccountNumber,
      bankAccountName,
      wireSwift,
      wireIban,
      paystackLink,
      invoiceTemplate,
      headingFont,
      bodyFont,
      signatureFont,
      primaryColor,
      accentColor,
      brandingOn,
      contractTemplate,
      contractTitle,
      contractScopeDescription,
      contractConfidentiality,
      contractGoverningLaw,
      contractEndDate,
      contractExclusivity,
      contractCustomTerms,
      contractKillFee,
      fullDocumentText,
      documentSections,
      usagePeriod,
      revisionRounds,
      turnaroundDays,
      letterheadTemplate,
      letterheadTitle,
      letterheadAudienceFocus,
      letterheadEngagementRate,
      letterheadTrackRecord,
      letterheadIntro,
      letterheadBody,
      logoUrl,
      extractedPalette,
    };
  }, [
    activeTab, creatorName, creatorHandle, creatorEmail, creatorPhone, creatorLocation, creatorNiche,
    clientName, clientContact, clientEmail, clientAddress, currency, invoiceNumber, poNumber, receiptNumber,
    issueDate, dueDate, shippingAddress, signatureName, customNotes, items, depositPercentage, taxPercentage,
    discountAmount, amountPaid, paymentType, momoNetwork, momoNumber, momoName, bankName, bankAccountNumber,
    bankAccountName, wireSwift, wireIban, paystackLink, invoiceTemplate, headingFont, bodyFont, signatureFont,
    primaryColor, accentColor, brandingOn, contractTemplate, contractTitle, contractScopeDescription,
    contractConfidentiality, contractGoverningLaw, contractEndDate, contractExclusivity, contractCustomTerms,
    contractKillFee, fullDocumentText, documentSections, usagePeriod, revisionRounds, turnaroundDays,
    letterheadTemplate, letterheadTitle, letterheadAudienceFocus, letterheadEngagementRate, letterheadTrackRecord,
    letterheadIntro, letterheadBody, logoUrl, extractedPalette
  ]);

  const pushUndo = useCallback(() => {
    const snap = undoStateRef.current || getCurrentSnapshot();
    if (!snap) return;
    const stack = undoStackRef.current;
    undoStackRef.current = [...stack.slice(-39), snap];
    setUndoCount(undoStackRef.current.length);
    if (redoStackRef.current.length > 0) {
      redoStackRef.current = [];
      setRedoCount(0);
    }
  }, [getCurrentSnapshot]);

  const applySnapshot = useCallback((snap: BusinessUndoSnapshot) => {
    isApplyingUndoRedoRef.current = true;
    switchTab(snap.activeTab);
    setCreatorName(snap.creatorName);
    setCreatorHandle(snap.creatorHandle);
    setCreatorEmail(snap.creatorEmail);
    setCreatorPhone(snap.creatorPhone);
    setCreatorLocation(snap.creatorLocation);
    setCreatorNiche(snap.creatorNiche);
    setClientName(snap.clientName);
    setClientContact(snap.clientContact);
    setClientEmail(snap.clientEmail);
    setClientAddress(snap.clientAddress);
    setCurrency(snap.currency);
    setInvoiceNumber(snap.invoiceNumber);
    setPoNumber(snap.poNumber);
    setReceiptNumber(snap.receiptNumber);
    setIssueDate(snap.issueDate);
    setDueDate(snap.dueDate);
    setShippingAddress(snap.shippingAddress);
    setSignatureName(snap.signatureName);
    setCustomNotes(snap.customNotes);
    setItems(snap.items);
    setDepositPercentage(snap.depositPercentage);
    setTaxPercentage(snap.taxPercentage);
    setDiscountAmount(snap.discountAmount);
    setAmountPaid(snap.amountPaid);
    setPaymentType(snap.paymentType);
    setMomoNetwork(snap.momoNetwork);
    setMomoNumber(snap.momoNumber);
    setMomoName(snap.momoName);
    setBankName(snap.bankName);
    setBankAccountNumber(snap.bankAccountNumber);
    setBankAccountName(snap.bankAccountName);
    setWireSwift(snap.wireSwift);
    setWireIban(snap.wireIban);
    setPaystackLink(snap.paystackLink);
    setInvoiceTemplate(snap.invoiceTemplate);
    setHeadingFont(snap.headingFont);
    setBodyFont(snap.bodyFont);
    setSignatureFont(snap.signatureFont);
    setPrimaryColor(snap.primaryColor);
    setAccentColor(snap.accentColor);
    setBrandingOn(snap.brandingOn);
    setContractTemplate(snap.contractTemplate);
    setContractTitle(snap.contractTitle);
    setContractScopeDescription(snap.contractScopeDescription);
    setContractConfidentiality(snap.contractConfidentiality);
    setContractGoverningLaw(snap.contractGoverningLaw);
    setContractEndDate(snap.contractEndDate);
    setContractExclusivity(snap.contractExclusivity);
    setContractCustomTerms(snap.contractCustomTerms);
    setContractKillFee(snap.contractKillFee);
    setFullDocumentText(snap.fullDocumentText);
    setDocumentSections(snap.documentSections);
    setUsagePeriod(snap.usagePeriod);
    setRevisionRounds(snap.revisionRounds);
    setTurnaroundDays(snap.turnaroundDays);
    setLetterheadTemplate(snap.letterheadTemplate);
    setLetterheadTitle(snap.letterheadTitle);
    setLetterheadAudienceFocus(snap.letterheadAudienceFocus);
    setLetterheadEngagementRate(snap.letterheadEngagementRate);
    setLetterheadTrackRecord(snap.letterheadTrackRecord);
    setLetterheadIntro(snap.letterheadIntro);
    setLetterheadBody(snap.letterheadBody);
    setLogoUrl(snap.logoUrl);
    setExtractedPalette(snap.extractedPalette);
  }, []);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const snap = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    setUndoCount(undoStackRef.current.length);
    const current = getCurrentSnapshot();
    redoStackRef.current = [...redoStackRef.current.slice(-39), current];
    setRedoCount(redoStackRef.current.length);
    applySnapshot(snap);
    setSmartStatusMessage('Action undone.');
    setTimeout(() => setSmartStatusMessage(null), 2000);
  }, [applySnapshot, getCurrentSnapshot]);

  const redo = useCallback(() => {
    const rstack = redoStackRef.current;
    if (rstack.length === 0) return;
    const snap = rstack[rstack.length - 1];
    redoStackRef.current = rstack.slice(0, -1);
    setRedoCount(redoStackRef.current.length);
    const current = getCurrentSnapshot();
    undoStackRef.current = [...undoStackRef.current, current];
    setUndoCount(undoStackRef.current.length);
    applySnapshot(snap);
    setSmartStatusMessage('Action redone.');
    setTimeout(() => setSmartStatusMessage(null), 2000);
  }, [applySnapshot, getCurrentSnapshot]);

  // Keep undo snapshot synchronized and record incremental changes
  useEffect(() => {
    const currentSnap = getCurrentSnapshot();
    if (isApplyingUndoRedoRef.current) {
      isApplyingUndoRedoRef.current = false;
      undoStateRef.current = currentSnap;
      return;
    }
    if (!isMounted) {
      undoStateRef.current = currentSnap;
      return;
    }
    const prevSnap = undoStateRef.current;
    if (prevSnap) {
      const now = Date.now();
      if (now - lastUndoPushAtRef.current > 500) {
        undoStackRef.current = [...undoStackRef.current.slice(-39), prevSnap];
        setUndoCount(undoStackRef.current.length);
        if (redoStackRef.current.length > 0) {
          redoStackRef.current = [];
          setRedoCount(0);
        }
        lastUndoPushAtRef.current = now;
      }
    }
    undoStateRef.current = currentSnap;
  }, [getCurrentSnapshot, isMounted]);

  // Global Ctrl/Cmd+Z undo · Ctrl/Cmd+Shift+Z or Ctrl+Y redo — never hijacks typing in text fields
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      const isUndo = k === 'z' && !e.shiftKey;
      const isRedo = (k === 'z' && e.shiftKey) || k === 'y';
      if (!isUndo && !isRedo) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      if (isUndo) undo();
      else redo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ─── BRAND KIT — the universal identity (src/lib/brand-kit.ts) ──────────────
  // The kit is DEFAULTS (variables): applying it stamps the saved identity
  // over the demo placeholders. Edits made inside a document afterwards are
  // one-off overrides and NEVER write back to the kit.
  const [brandKitReady, setBrandKitReady] = useState(false);
  const applyBrandKit = (): boolean => {
    const kit = loadBrandKit();
    if (!brandKitHasAnything(kit)) return false;
    if (kit.identity.name) setCreatorName(kit.identity.name);
    if (kit.identity.handle) setCreatorHandle(kit.identity.handle);
    if (kit.identity.niche) setCreatorNiche(kit.identity.niche);
    if (kit.identity.location) setCreatorLocation(kit.identity.location);
    if (kit.identity.email) setCreatorEmail(kit.identity.email);
    if (kit.identity.phone) setCreatorPhone(kit.identity.phone);
    if (kit.logoDataUrl) setLogoUrl(kit.logoDataUrl);
    if (kit.colors.primary) setPrimaryColor(kit.colors.primary);
    if (kit.colors.accent) setAccentColor(kit.colors.accent);
    if (kit.fonts.heading) setHeadingFont(kit.fonts.heading);
    if (kit.fonts.body) setBodyFont(kit.fonts.body);
    if (kit.money.currency) setCurrency(kit.money.currency as typeof currency);
    if (kit.money.momoNetwork) setMomoNetwork(kit.money.momoNetwork);
    if (kit.money.momoNumber) setMomoNumber(kit.money.momoNumber);
    if (kit.money.momoName) setMomoName(kit.money.momoName);
    if (kit.money.bankName) setBankName(kit.money.bankName);
    if (kit.money.bankAccountName) setBankAccountName(kit.money.bankAccountName);
    if (kit.money.bankAccountNumber) setBankAccountNumber(kit.money.bankAccountNumber);
    if (kit.money.paystackLink) setPaystackLink(kit.money.paystackLink);
    if (kit.signature?.drawingUrl) setCreatorSignatureDrawing(kit.signature.drawingUrl);
    if (kit.signature?.signatureName) setSignatureName(kit.signature.signatureName);
    if (kit.signature?.font) setSignatureFont(kit.signature.font);
    return true;
  };

  const confirmResetDraft = () => {
    pushUndo();
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('id');
        window.history.replaceState({}, '', url.toString());
      }
    } catch { }

    // Reset means CLEAN: no demo identity, no demo payment rails. The saved
    // Brand Kit re-stamps the user's own identity right after (below).
    setCreatorName('');
    setCreatorHandle('');
    setCreatorEmail('');
    setCreatorPhone('');
    setCreatorLocation('');
    setCreatorNiche('');
    setClientName('');
    setClientContact('');
    setClientEmail('');
    setClientAddress('');
    setCurrency('GHS');
    // Auto-numbering (Tier 1): a fresh document continues the creator's own
    // numbering scheme, cloned from the most recent same-kind vault entry.
    setInvoiceNumber(nextDocNumber('invoice') || defaultDocNumber('INV'));
    setPoNumber('');
    setReceiptNumber(nextDocNumber('receipt') || defaultDocNumber('REC'));
    setIssueDate(todayLocalISO());
    setDueDate(addDaysLocalISO(todayLocalISO(), 14));
    setShippingAddress('');
    setSignatureName('');
    setCustomNotes('');
    // Fresh document → re-stamp the user's Brand Kit identity over the demo defaults.
    applyBrandKit();
    setItems([
      {
        id: '1',
        description: '',
        quantity: 1,
        rate: 0,
        platform: 'Other',
      },
    ]);
    setDepositPercentage(50);
    setTaxPercentage(0);
    setDiscountAmount(0);
    setAmountPaid(0);
    setPaymentType('momo');
    setMomoNetwork('MTN Mobile Money');
    setMomoNumber('');
    setMomoName('');
    setBankName('');
    setBankAccountName('');
    setBankAccountNumber('');
    setPaystackLink('');
    setWireSwift('');
    setWireIban('');
    setInvoiceTemplate('navy');
    setHeadingFont('Oswald');
    setBodyFont('Inter');
    setSignatureFont('Caveat');
    setPrimaryColor('#162a45');
    setAccentColor('#e15b3c');
    setBrandingOn(true);
    setContractTemplate('service');
    setContractTitle('SERVICE CONTRACT');
    setContractScopeDescription('Production and distribution of authentic brand campaign content across social media channels.');
    setContractConfidentiality(true);
    setContractGoverningLaw('Ghana');
    setContractEndDate('');
    setContractExclusivity('None');
    setContractCustomTerms('');
    setContractKillFee(50);
    setFullDocumentText('');
    setDocumentSections([]);
    setUsagePeriod('');
    setRevisionRounds(2);
    setTurnaroundDays(5);
    setLetterheadTemplate('creative');
    setLetterheadTitle('');
    setLetterheadAudienceFocus('');
    setLetterheadEngagementRate('');
    setLetterheadTrackRecord('');
    setLetterheadIntro('');
    setLetterheadBody('');
    setLogoUrl(null);
    setExtractedPalette([]);
    setReceiptShortUrl(null);
    setShowResetConfirm(false);

    setSmartStatusMessage('Document reset to clean defaults. All draft changes cleared.');
    setTimeout(() => setSmartStatusMessage(null), 3500);
  };

  // ─── CREATOR TYPE PRESET APPLICATION ─────────────────────────
  const applyCreatorTypePreset = useCallback((typeId: CreatorTypeId) => {
    const preset = CREATOR_TYPE_PRESETS.find((p) => p.id === typeId);
    if (!preset) return;

    // Only apply deliverable presets if no draft items have been customized
    // (i.e., we're applying from a fresh selection, not loading from localStorage)
    setCreatorNiche(preset.niche);
    setItems(
      preset.items.map((item, idx) => ({
        id: `preset_${idx}`,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        platform: item.platform,
      }))
    );
    setDepositPercentage(preset.depositPercentage);
    setTurnaroundDays(preset.turnaroundDays);
    setRevisionRounds(preset.revisionRounds);
    setUsagePeriod(preset.usagePeriod);
    setContractScopeDescription(preset.contractScope);
    setContractTitle(preset.contractTitle);
    if (typeId === 'agency') {
      setContractTemplate('business');
    } else if (typeId === 'influencer') {
      setContractTemplate('creator');
    } else {
      setContractTemplate('service');
    }
  }, []);

  const selectCreatorType = (typeId: CreatorTypeId) => {
    setCreatorType(typeId);
    try { localStorage.setItem(CREATOR_TYPE_KEY, typeId); } catch { }
    applyCreatorTypePreset(typeId);
    setShowOnboarding(false);
    setSmartStatusMessage(`Workspace tuned for ${CREATOR_TYPE_PRESETS.find(p => p.id === typeId)?.label ?? typeId}. Templates & defaults updated.`);
    setTimeout(() => setSmartStatusMessage(null), 4000);
  };

  const applyParsedDocument = (parsed: ParsedDocumentData, sourceLabel: string) => {
    pushUndo();
    if (parsed.clientName) {
      setClientName(parsed.clientName);
      setClientContact(parsed.clientContact || parsed.clientName);
    }
    if (parsed.clientContact) setClientContact(parsed.clientContact);
    if (parsed.clientEmail) setClientEmail(parsed.clientEmail);
    if (parsed.clientAddress) setClientAddress(parsed.clientAddress);
    if (parsed.currency) setCurrency(parsed.currency);
    if (parsed.dueDate) setDueDate(parsed.dueDate);
    if (parsed.issueDate) setIssueDate(parsed.issueDate);
    if (parsed.invoiceNumber) setInvoiceNumber(parsed.invoiceNumber);
    if (parsed.receiptNumber) setReceiptNumber(parsed.receiptNumber);
    if (parsed.depositPercentage !== undefined) setDepositPercentage(parsed.depositPercentage);

    // Agreement / Contract specifics
    if (parsed.contractTitle) setContractTitle(parsed.contractTitle);
    if (parsed.contractTemplate) setContractTemplate(parsed.contractTemplate);
    if (parsed.contractScope) setContractScopeDescription(parsed.contractScope);
    if (parsed.contractCustomTerms) setContractCustomTerms(parsed.contractCustomTerms);
    if (parsed.contractGoverningLaw) setContractGoverningLaw(parsed.contractGoverningLaw);
    if (parsed.fullDocumentText) setFullDocumentText(parsed.fullDocumentText);
    if (parsed.documentSections && parsed.documentSections.length > 0) {
      setDocumentSections(parsed.documentSections);
      setContractTemplate('full-legal');
    }

    // Letterhead specifics
    if (parsed.letterheadTitle) setLetterheadTitle(parsed.letterheadTitle);
    if (parsed.letterheadIntro) setLetterheadIntro(parsed.letterheadIntro);

    const targetTab = parsed.docType || (parsed.documentSections && parsed.documentSections.length > 0 ? 'agreement' : activeTab);
    if (targetTab !== activeTab) {
      switchTab(targetTab);
    }

    if (parsed.items && parsed.items.length > 0) {
      setItems(parsed.items);
      const total = parsed.items.reduce((acc, item) => acc + item.quantity * item.rate, 0);

      // Tailor for Payment Receipt
      if (targetTab === 'receipt') {
        setAmountPaid(total > 0 ? total : 3750);
        if (!parsed.receiptNumber && !receiptNumber) {
          setReceiptNumber(nextDocNumber('receipt') || defaultDocNumber('REC'));
        }
      }

      // Tailor for Influencer / Business Agreement
      if (targetTab === 'agreement') {
        if (!parsed.contractScope) {
          const deliverablesList = parsed.items
            .map((i) => `${i.quantity > 1 ? i.quantity + 'x ' : ''}${i.description}`)
            .join(', ');
          setContractScopeDescription(
            `Production, delivery, and rights licensing for: ${deliverablesList}.`
          );
        }
        if (parsed.depositPercentage !== undefined) {
          setContractKillFee(parsed.depositPercentage);
        }
      }

      // Tailor for Pitch Letterhead
      if (targetTab === 'letterhead') {
        if (!parsed.letterheadTitle && parsed.clientName) {
          setLetterheadTitle(`${parsed.clientName} Campaign Proposal`);
        }
        if (!parsed.letterheadIntro) {
          const deliverablesList = parsed.items
            .map((i) => `${i.quantity > 1 ? i.quantity + 'x ' : ''}${i.description}`)
            .join(', ');
          setLetterheadIntro(
            `Creative partnership proposal and deliverables overview: ${deliverablesList}.`
          );
        }
      }
    }
    if (parsed.notes) setCustomNotes(parsed.notes);
    if (parsed.extractedColors && parsed.extractedColors.length > 0) {
      setExtractedPalette(parsed.extractedColors);
      setPrimaryColor(parsed.extractedColors[0]);
      if (parsed.extractedColors[1]) setAccentColor(parsed.extractedColors[1]);
    }
    const secCount = parsed.documentSections?.length || 0;
    const msg = secCount > 0
      ? `Document ingested from ${sourceLabel}: Structured into Full Legal Blueprint (${secCount} sections & signature spaces ready).`
      : `Document updated from ${sourceLabel} (${parsed.items.length} items parsed).`;
    setSmartStatusMessage(msg);
    setTimeout(() => setSmartStatusMessage(null), 7000);
  };

  const handleQuickPromptGenerate = () => {
    if (!promptInput.trim()) return;
    const parsed = parseNaturalPrompt(promptInput);
    applyParsedDocument(parsed, 'Quick Prompt');
  };

  const handleAiGenerate = async () => {
    if (!promptInput.trim()) return;
    setIsAiGenerating(true);
    setSmartStatusMessage(`AI is drafting your ${activeTab}...`);
    try {
      const res = await generateBusinessDocumentWithAi(promptInput, activeTab);
      if (res.success && res.data) {
        applyParsedDocument(res.data, `AI (${res.provider || 'BYOK'})`);
        setSmartStatusMessage(`Document drafted with AI (${res.model || res.provider})!`);
        if (typeof window !== 'undefined' && window.innerWidth <= 900) {
          setMobileTab('preview');
        }
      } else {
        if (res.error && (res.error.toLowerCase().includes('key') || res.error.includes('401'))) {
          setIsByokModalOpen(true);
        }
        const fallback = parseNaturalPrompt(promptInput);
        if (fallback.items.length > 0 || fallback.clientName) {
          applyParsedDocument(fallback, 'Quick Prompt (Offline)');
          setSmartStatusMessage(res.error ? `${res.error} (Drafted with offline parser)` : 'Drafted with offline parser.');
        } else {
          setSmartStatusMessage(res.error || 'Failed to generate document. Please check your AI key in Settings.');
        }
      }
    } catch {
      const fallback = parseNaturalPrompt(promptInput);
      applyParsedDocument(fallback, 'Quick Prompt (Offline)');
      setSmartStatusMessage('Drafted using offline parser.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleGuidedGenerate = () => {
    if (!guidedClient.trim() && !guidedDeliverable.trim()) return;
    pushUndo();

    const client = guidedClient.trim() || 'Brand Partner';
    setClientName(client);
    setClientContact('');
    setCurrency(guidedCurrency);

    const rateNum = parseFloat(guidedRate) || 0;
    const deliverableDesc = guidedDeliverable.trim() || 'Custom Deliverable';

    setItems([
      {
        id: `item-${Date.now()}`,
        description: deliverableDesc.toUpperCase(),
        quantity: 1,
        rate: rateNum,
        platform: 'Other',
      },
    ]);

    const todayStr = todayLocalISO();
    setIssueDate(todayStr);

    if (guidedTerms.includes('50%')) {
      setDepositPercentage(50);
      setDueDate(addDaysLocalISO(todayStr, 14));
      setAmountPaid(0);
    } else if (guidedTerms.includes('100% Paid')) {
      setDepositPercentage(100);
      setAmountPaid(rateNum);
      setDueDate(todayStr);
    } else if (guidedTerms.includes('Net 30')) {
      setDepositPercentage(0);
      setDueDate(addDaysLocalISO(todayStr, 30));
      setAmountPaid(0);
    } else if (guidedTerms.includes('Receipt')) {
      setDepositPercentage(100);
      setDueDate(todayStr);
      setAmountPaid(0);
    } else {
      setDepositPercentage(50);
      setDueDate(addDaysLocalISO(todayStr, 14));
      setAmountPaid(0);
    }

    setSmartStatusMessage(`Document created for ${client}!`);
    setTimeout(() => setSmartStatusMessage(null), 4000);

    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setMobileTab('preview');
    }
  };

  const handleGuidedAiAssist = async () => {
    if (!guidedClient.trim() && !guidedDeliverable.trim()) {
      setSmartStatusMessage('Enter a client or deliverable to polish with AI.');
      return;
    }
    setIsAiGenerating(true);
    setSmartStatusMessage(`AI is expanding your ${activeTab} deliverables...`);
    try {
      const prompt = `Client: ${guidedClient || 'Brand Partner'}. Deliverable: ${guidedDeliverable || 'Custom Services'}. Total: ${guidedRate} ${guidedCurrency}. Terms: ${guidedTerms}.`;
      const res = await generateBusinessDocumentWithAi(prompt, activeTab);
      if (res.success && res.data) {
        applyParsedDocument(res.data, `AI (${res.provider || 'BYOK'})`);
        if (res.data.clientName) setGuidedClient(res.data.clientName);
        if (res.data.items?.[0]) {
          setGuidedDeliverable(res.data.items.map((i) => `${i.quantity}x ${i.description}`).join(', '));
          const total = res.data.items.reduce((s, i) => s + i.quantity * i.rate, 0);
          setGuidedRate(String(total));
        }
        setSmartStatusMessage(`AI updated your ${activeTab}!`);
        if (typeof window !== 'undefined' && window.innerWidth <= 900) {
          setMobileTab('preview');
        }
      } else {
        if (res.error && (res.error.toLowerCase().includes('key') || res.error.includes('401'))) {
          setIsByokModalOpen(true);
        }
        handleGuidedGenerate();
        setSmartStatusMessage(res.error || 'Generated using guided inputs.');
      }
    } catch {
      handleGuidedGenerate();
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingDoc(true);
    let paletteColors: string[] = [];
    if (file.type.startsWith('image/')) {
      try {
        paletteColors = await extractColorsFromImage(file);
        if (paletteColors.length > 0) {
          setExtractedPalette(paletteColors);
          setPrimaryColor(paletteColors[0]);
          if (paletteColors[1]) setAccentColor(paletteColors[1]);
        }
      } catch { }
    }

    try {
      const isDocx =
        file.name.toLowerCase().endsWith('.docx') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (isDocx) {
        const text = await extractTextFromDocx(file);
        const parsed = reconstructDocumentFromText(text || file.name.replace(/\.[^/.]+$/, ''));
        if (paletteColors.length > 0) parsed.extractedColors = paletteColors;
        applyParsedDocument(parsed, file.name);
      } else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        const parsed = reconstructDocumentFromText(text);
        if (paletteColors.length > 0) parsed.extractedColors = paletteColors;
        applyParsedDocument(parsed, file.name);
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const parsed = reconstructDocumentFromText(nameWithoutExt);
        if (paletteColors.length > 0) parsed.extractedColors = paletteColors;
        applyParsedDocument(parsed, file.name);
        setSmartStatusMessage(`PDF loaded. Note: For full automatic multi-clause structuring, paste your agreement text or upload .docx!`);
        setTimeout(() => setSmartStatusMessage(null), 8000);
      } else {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const parsed = reconstructDocumentFromText(nameWithoutExt);
        if (paletteColors.length > 0) parsed.extractedColors = paletteColors;
        applyParsedDocument(parsed, file.name);
      }
    } catch (err) {
      console.error('Document ingestion error:', err);
    } finally {
      setIsProcessingDoc(false);
      e.target.value = '';
    }
  };

  const handleReconstructFromText = () => {
    if (!reconstructText.trim()) return;
    setIsProcessingDoc(true);
    try {
      const parsed = reconstructDocumentFromText(reconstructText);
      applyParsedDocument(parsed, 'Pasted Text');
    } finally {
      setTimeout(() => setIsProcessingDoc(false), 300);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const colors = await extractColorsFromImage(file);
      if (colors.length > 0) {
        setExtractedPalette(colors);
        setPrimaryColor(colors[0]);
        if (colors[1]) setAccentColor(colors[1]);
        setSmartStatusMessage(`Brand palette extracted from logo (${colors.length} swatches).`);
        setTimeout(() => setSmartStatusMessage(null), 4000);
      }
    } catch { }
    e.target.value = '';
  };

  // ─── ANIMATED THERMAL RECEIPT PRINTER STATE ───────────────────
  const [printStage, setPrintStage] = useState<'idle' | 'processing' | 'printing' | 'complete'>('idle');
  const printTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const printPaperRef = useRef<HTMLDivElement>(null);
  const [printPaperHeight, setPrintPaperHeight] = useState<number | null>(null);
  const isPrintOverlayOpen = printStage !== 'idle';

  const startAnimatedPrint = async () => {
    // Generate the Supabase short link in background so QR code and share links are live
    ensureReceiptShortUrl().catch(() => { });
    // Record to My Documents immediately (works offline too) — the short link
    // is merged into the same entry when the background call resolves.
    recordToVault();
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
  const [isCopyingLink, setIsCopyingLink] = useState(false);

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
        csig: creatorSignatureDrawing || undefined,
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
        fdt: fullDocumentText || undefined,
        fsec: documentSections.length > 0 ? documentSections : undefined,
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
        csig: creatorSignatureDrawing || undefined,
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
    const isMomo = paymentType === 'momo';
    const isBank = paymentType === 'bank';
    const isWire = paymentType === 'wire';
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
      mn: isMomo ? momoNetwork : '',
      mu: isMomo ? momoNumber : '',
      bn: isBank ? bankName : (isWire ? 'International Wire' : ''),
      ba: isBank ? bankAccountNumber : (isWire ? (wireIban || bankAccountNumber) : ''),
      lg: logoUrl ?? undefined,
      br: brandingOn ? 1 : 0,
      k: activeTab as ReceiptPayload['k'],
      x: buildShareExtras(),
    };
  };

  // Database upload fallback dialog states
  const [showDbFallbackModal, setShowDbFallbackModal] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<'copy' | 'whatsapp' | null>(null);
  const [pendingFallbackLink, setPendingFallbackLink] = useState<string | null>(null);

  const handleAcceptFallbackLink = async () => {
    if (!pendingFallbackLink) return;
    const link = pendingFallbackLink;
    setShowDbFallbackModal(false);

    if (pendingShareAction === 'copy') {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      }
      setClientLinkCopied(true);
      setSmartStatusMessage('Offline fallback link copied to clipboard!');
      setTimeout(() => {
        setClientLinkCopied(false);
        setSmartStatusMessage(null);
      }, 3000);
    } else if (pendingShareAction === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(buildShareMessage(link))}`, '_blank');
    }
    setPendingShareAction(null);
    setPendingFallbackLink(null);
  };

  const handleDeclineFallbackLink = () => {
    setShowDbFallbackModal(false);
    setPendingShareAction(null);
    setPendingFallbackLink(null);
    setSmartStatusMessage('Upload canceled. Tap "Print Document" or "Save Picture" to send directly.');
    setTimeout(() => setSmartStatusMessage(null), 4000);
  };

  const createOrGetDocumentLink = async (action: 'copy' | 'whatsapp') => {
    const payload = buildReceiptPayload();
    const encoded = encodeReceipt(payload);
    const currentId = activeDocumentId || searchParams.get('id') || undefined;

    // 1. Attempt database upload
    const saveResult = await saveReceiptToDatabase({
      id: currentId,
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
      metadata: { kind: payload.k ?? activeTab },
    });

    const finalId = saveResult.shortId;
    const cleanUrl = `${window.location.origin}/r/${finalId}`;
    const fallbackUrl = `${window.location.origin}/r/${finalId}?d=${encoded}`;

    if (saveResult.success) {
      setActiveDocumentId(finalId);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', activeTab);
        url.searchParams.set('id', finalId);
        url.searchParams.delete('d');
        url.searchParams.delete('r');
        window.history.replaceState({}, '', url.toString());
      }
      setReceiptShortUrl(cleanUrl);
      recordToVault(cleanUrl);

      if (action === 'copy') {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(cleanUrl);
        }
        setClientLinkCopied(true);
        setSmartStatusMessage('Document saved online · Short link copied!');
        setTimeout(() => {
          setClientLinkCopied(false);
          setSmartStatusMessage(null);
        }, 3000);
      } else if (action === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(buildShareMessage(cleanUrl))}`, '_blank');
      }
    } else {
      // Database upload failed — ask user whether to take fallback link or print directly
      setPendingShareAction(action);
      setPendingFallbackLink(fallbackUrl);
      setShowDbFallbackModal(true);
    }
  };

  const buildReceiptLink = async (): Promise<string> => {
    const payload = buildReceiptPayload();
    const encoded = encodeReceipt(payload);
    const currentId = activeDocumentId || searchParams.get('id') || undefined;
    const saveResult = await saveReceiptToDatabase({
      id: currentId,
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
      metadata: { kind: payload.k ?? activeTab },
    });
    const finalId = saveResult.shortId;
    setActiveDocumentId(finalId);
    return `${window.location.origin}/r/${finalId}`;
  };

  const copyClientLink = async () => {
    if (isCopyingLink) return;
    setIsCopyingLink(true);
    try {
      await createOrGetDocumentLink('copy');
    } catch (err) {
      console.error('Failed to copy client link:', err);
    } finally {
      setIsCopyingLink(false);
    }
  };

  const shareReceiptOnWhatsApp = async () => {
    await sendWhatsAppSummary();
  };

  // ─── SUPABASE SHORT LINK FOR THE SCANNABLE QR ──────────────────
  const [receiptShortUrl, setReceiptShortUrl] = useState<string | null>(null);

  const ensureReceiptShortUrl = async (): Promise<string> => {
    if (receiptShortUrl) return receiptShortUrl;
    const link = await buildReceiptLink();
    setReceiptShortUrl(link);
    recordToVault(link);
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
    pushUndo();
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
    pushUndo();
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof DeliverableItem, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // ─── MY DOCUMENTS VAULT ACTIONS (Tier 1+2+3 of the retention plan) ──────────
  const recordToVault = (link?: string | null) => {
    try {
      const docNumber = (activeTab === 'receipt' ? receiptNumber : invoiceNumber) || 'untitled';
      const entry: VaultEntry = {
        id: `${activeTab}|${docNumber}`,
        kind: activeTab,
        docNumber,
        clientName: clientName?.trim() || '—',
        total: totalAmount,
        currency,
        dueDate: activeTab === 'invoice' ? dueDate : undefined,
        status: 'sent',
        payloadString: encodeReceipt(buildReceiptPayload()),
        shortId: shortIdFromLink(link ?? receiptShortUrl),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setVaultEntries(upsertVaultEntry(entry));
      if (clientName?.trim()) {
        setSavedClients(
          rememberClient({ name: clientName, contact: clientContact, currency, momoNumber, momoNetwork, lastUsed: Date.now() })
        );
      }
      if (items.length > 0) setSavedServices(rememberServices(items));

      // AUTO-LEARN the Brand Kit (owner ruling): every committed document
      // teaches the kit the identity + payment details actually in use —
      // empty values and demo placeholders are ignored, so nobody has to
      // set the kit up by hand. It also keeps itself current when the user
      // updates their own details.
      if (
        learnBrandKitFromUse({
          identity: { name: creatorName, handle: creatorHandle, niche: creatorNiche, location: creatorLocation, email: creatorEmail, phone: creatorPhone },
          colors: { primary: primaryColor, accent: accentColor },
          fonts: { heading: headingFont, body: bodyFont },
          money: { currency, momoNetwork, momoNumber, momoName, bankName, bankAccountName, bankAccountNumber, paystackLink },
        })
      ) {
        setBrandKitReady(true);
      }
    } catch (e) {
      console.warn('[business-vault] record failed', e);
    }
  };

  const openVaultEntry = (entry: VaultEntry) => {
    const decoded = decodeReceipt(entry.payloadString);
    if (!decoded) {
      setSmartStatusMessage('Could not open this document (unrecognised snapshot format).');
      setTimeout(() => setSmartStatusMessage(null), 3000);
      return;
    }
    if (entry.shortId) {
      setActiveDocumentId(entry.shortId);
    }
    applyReceiptPayloadToState(decoded);
    setSmartStatusMessage(`Opened ${entry.docNumber} (${entry.clientName}) — edit and re-share freely.`);
    setTimeout(() => setSmartStatusMessage(null), 3500);
  };

  // Tier 2 — the deal chain: one tap on an unpaid invoice births its receipt.
  const markVaultEntryPaid = (entry: VaultEntry) => {
    setVaultEntries(setVaultStatus(entry.id, 'paid'));
    const decoded = decodeReceipt(entry.payloadString);
    if (decoded) applyReceiptPayloadToState(decoded);
    switchTab('receipt');
    setAmountPaid(entry.total);
    const nextReceiptNo = nextDocNumber('receipt');
    if (nextReceiptNo) setReceiptNumber(nextReceiptNo);
    setIssueDate(todayLocalISO());
    // A receipt is printed the moment money lands — its timeline starts today,
    // never the original invoice's due date (that mismatch printed receipts
    // with stale, already-passed due dates).
    setDueDate(todayLocalISO());
    setSmartStatusMessage(`Receipt ready — pre-filled from invoice ${entry.docNumber}. Print or share it below.`);
    setTimeout(() => setSmartStatusMessage(null), 4500);
  };

  // Tier 3 — unpaid-invoice chase: copies a polite, WhatsApp-ready reminder.
  const sendVaultReminder = async (entry: VaultEntry) => {
    const decoded = decodeReceipt(entry.payloadString);
    if (decoded) applyReceiptPayloadToState(decoded);
    let link: string | null = entry.shortId
      ? `${window.location.origin}/r/${entry.shortId}`
      : null;
    if (!link) {
      try {
        link = await buildReceiptLink();
      } catch {
        link = window.location.href;
      }
    }
    const sym = CURRENCY_SYMBOLS[entry.currency as CurrencyType] ?? entry.currency;
    const due = entry.dueDate ? ` (due ${entry.dueDate})` : '';
    const msg =
      `Hello ${entry.clientName}! A gentle reminder about invoice ${entry.docNumber} from ` +
      `${decoded?.n || creatorName} — total ${sym}${entry.total.toLocaleString()}${due}. ` +
      `Open it to view, print or pay: ${link}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(msg);
    }
    setSmartStatusMessage('Reminder copied — paste it into WhatsApp for the client.');
    setTimeout(() => setSmartStatusMessage(null), 3500);
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
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(buildShareMessage(link));
    }
    setCopiedNotification(true);
    setSmartStatusMessage('WhatsApp share summary copied to clipboard!');
    setTimeout(() => {
      setCopiedNotification(false);
      setSmartStatusMessage(null);
    }, 2500);
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

  // Standardized print entry point: desktop and mobile both launch the
  // real-time thermal printer animation so the user sees their document print!
  const handleExport = () => {
    startAnimatedPrint();
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
    signatureDrawing: creatorSignatureDrawing || undefined,
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
    fullDocumentText: fullDocumentText || undefined,
    documentSections: documentSections.length > 0 ? documentSections : undefined,
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
    creatorSignDrawing: creatorSignatureDrawing || undefined,
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
        *, *::before, *::after {
          box-sizing: border-box;
        }
        .ck-page {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
          box-sizing: border-box !important;
        }
        .ck-tab { transition: transform 0.12s ease, box-shadow 0.12s ease; }
        .ck-tab:hover { transform: translate(-1px, -1px); }
        .ck-tab:active { transform: translate(1px, 1px); }
        #printable-document { outline: none; }
        .ck-form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 640px) {
          .ck-form-grid-2 {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }
        @media (max-width: 900px) {
          .ck-page { padding: 8px 8px 110px !important; }
          .ck-workspace {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
          .ck-mobile-view-bar {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            background: #fff;
            border: 2px solid #000;
            box-shadow: 3px 3px 0 #000;
            padding: 4px;
            margin-bottom: 12px;
            position: sticky;
            top: 6px;
            z-index: 100;
          }
          .ck-mobile-view-bar button {
            display: flex;
            align-items: center;
            justifyContent: center;
            gap: 6px;
            padding: 10px 8px;
            background: #f4f4f5;
            color: #000;
            border: 1.5px solid transparent;
            font-family: monospace;
            font-weight: 900;
            font-size: 0.72rem;
            cursor: pointer;
            border-radius: 2px;
          }
          .ck-mobile-view-bar button.active {
            background: #000;
            color: #fff;
            border-color: #000;
            box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
          }
          .ck-mobile-item-badge {
            background: #fff;
            color: #000;
            font-size: 0.58rem;
            padding: 1px 6px;
            border-radius: 999px;
            font-weight: 900;
          }
          .ck-mobile-view-bar button.active .ck-mobile-item-badge {
            background: #eab308;
            color: #000;
          }
          .ck-tab-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin-bottom: 14px !important;
            overflow: visible !important;
          }
          .ck-tab {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 8px 8px !important;
            gap: 6px !important;
          }
          @media (max-width: 360px) {
            .ck-tab-grid {
              grid-template-columns: 1fr !important;
            }
          }
          .ck-top-banner {
            padding: 12px 10px !important;
            gap: 12px !important;
            margin-bottom: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
          .ck-top-banner h1 {
            font-size: 1.15rem !important;
          }
          .ck-top-actions {
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .ck-mobile-preview-back-bar {
            display: flex !important;
            margin-bottom: 8px !important;
          }
          /* Control column visibility on mobile based on view class */
          .ck-workspace.ck-view-editor .ck-editor-col {
            display: flex !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
          .ck-workspace.ck-view-editor .ck-preview-col {
            display: none !important;
          }
          .ck-workspace.ck-view-preview .ck-editor-col {
            display: none !important;
          }
          .ck-workspace.ck-view-preview .ck-preview-col {
            display: flex !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
        }
        @media (min-width: 901px) {
          .ck-mobile-view-bar {
            display: none !important;
          }
          .ck-mobile-preview-back-bar {
            display: none !important;
          }
          .ck-editor-col {
            display: flex !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .ck-preview-col {
            display: flex !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }
        @page {
          size: ${activeTab === 'receipt' ? 'auto' : 'A4 portrait'};
          margin: ${activeTab === 'receipt' ? '4mm auto' : '8mm 10mm'};
        }
        @media print {
          .ck-noprint { display: none !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          #printable-document, #printable-document * { 
            visibility: visible; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          #printable-document {
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            width: ${activeTab === 'receipt' ? '355px' : '100%'} !important;
            max-width: ${activeTab === 'receipt' ? '355px' : '820px'} !important;
            min-width: ${activeTab === 'receipt' ? '355px' : '760px'} !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            min-height: 0 !important;
            background: #fff !important;
          }
        }
        @keyframes ckToastSlideDown {
          0% {
            opacity: 0;
            transform: translate(-50%, -16px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>

      {/* ─── CREATOR TYPE ONBOARDING OVERLAY ─────────────────────── */}
      {isMounted && showOnboarding && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={(e) => {
            // Allow closing only if a type is already set (not first-time)
            if (e.target === e.currentTarget && creatorType) setShowOnboarding(false);
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '2px solid #000',
              boxShadow: '8px 8px 0 #000',
              width: '100%',
              maxWidth: 740,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px 28px 28px',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <span style={{
                background: '#000', color: '#fff',
                fontSize: '0.6rem', fontWeight: 900, fontFamily: 'monospace',
                padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Business Suite Setup
              </span>
              <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 900, letterSpacing: '-0.04em', margin: '10px 0 6px' }}>
                What kind of creative work do you do?
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#555', margin: 0, lineHeight: 1.5 }}>
                We&apos;ll tune your invoice templates, contract clauses, and deliverable presets to match your craft.
                You can always change this later.
              </p>
            </div>

            {/* Creator Type Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 10,
              marginBottom: 20,
            }}>
              {CREATOR_TYPE_PRESETS.map((preset) => {
                const isActive = creatorType === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectCreatorType(preset.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 4,
                      background: isActive ? '#000' : '#f9fafb',
                      color: isActive ? '#fff' : '#000',
                      border: `2px solid ${isActive ? '#000' : '#e5e7eb'}`,
                      boxShadow: isActive ? '4px 4px 0 #555' : '2px 2px 0 #ccc',
                      padding: '14px 14px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px, -2px)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = isActive ? '6px 6px 0 #555' : '4px 4px 0 #000';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = '';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = isActive ? '4px 4px 0 #555' : '2px 2px 0 #ccc';
                    }}
                  >
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{preset.emoji}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', fontFamily: 'monospace', letterSpacing: '0.01em', lineHeight: 1.2, marginTop: 4 }}>
                      {preset.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 500, lineHeight: 1.3 }}>
                      {preset.sub}
                    </span>
                    {isActive && (
                      <span style={{
                        marginTop: 6,
                        background: '#fff',
                        color: '#000',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        padding: '1px 6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        ✓ Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 16, borderTop: '1.5px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, fontFamily: 'monospace' }}>
                Presets only set starting defaults — you can change everything after.
              </p>
              {creatorType && (
                <button
                  type="button"
                  onClick={() => setShowOnboarding(false)}
                  style={{
                    background: '#000', color: '#fff',
                    border: '2px solid #000',
                    boxShadow: '3px 3px 0 #555',
                    padding: '8px 20px',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                  }}
                >
                  Continue →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: 1380, margin: '0 auto' }}>
        {/* Banner / Title */}
        <div
          className="ck-noprint ck-top-banner"
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
            <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
              Creator Invoice, Receipt &amp; Deal Contract Generator
            </h1>
          </div>
          {/* Creator type chip — only after mount to avoid SSR mismatch */}
          {isMounted && (() => {
            const preset = CREATOR_TYPE_PRESETS.find(p => p.id === creatorType);
            return (
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                title="Change your creator type & load presets"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#000',
                  color: '#fff',
                  border: '1.5px solid #000',
                  borderRadius: 3,
                  padding: '3px 10px',
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  marginTop: 4,
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
                }}
              >
                <span>{preset ? `${preset.emoji} ${preset.label}` : '⚙️ CHOOSE CREATOR NICHE'}</span>
                <span style={{ opacity: 0.6, fontSize: '0.6rem', borderLeft: '1px solid #444', paddingLeft: 6 }}>SWITCH</span>
              </button>
            );
          })()}

          {/* Quick Actions (Badge, Currency, Copy Link, WhatsApp, Print, BYOK) */}
          <div className="ck-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* BYOK AI Status & Config Button */}
            <ByokButton onClick={() => setIsByokModalOpen(true)} />

            {/* Auto-saved draft status indicator & reset (rendered client-side after mount to guarantee 100% SSR match) */}
            {isMounted && (
              <>
                {/* Minimal Undo / Redo controls (Styled identically to text-behind) */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={undo}
                    disabled={undoCount === 0}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3px 7px',
                      background: undoCount > 0 ? '#fff' : '#f1f1f1',
                      border: '1.5px solid #000',
                      boxShadow: undoCount > 0 ? '2px 2px 0 #000' : 'none',
                      cursor: undoCount > 0 ? 'pointer' : 'default',
                      color: undoCount > 0 ? '#000' : '#9ca3af',
                      borderRadius: '3px',
                      height: 28,
                    }}
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={redoCount === 0}
                    title="Redo (Ctrl+Shift+Z)"
                    aria-label="Redo"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3px 7px',
                      background: redoCount > 0 ? '#fff' : '#f1f1f1',
                      border: '1.5px solid #000',
                      boxShadow: redoCount > 0 ? '2px 2px 0 #000' : 'none',
                      cursor: redoCount > 0 ? 'pointer' : 'default',
                      color: redoCount > 0 ? '#000' : '#9ca3af',
                      borderRadius: '3px',
                      height: 28,
                    }}
                  >
                    <Redo2 size={14} />
                  </button>
                </span>

                <button
                  type="button"
                  onClick={saveDraftManually}
                  title="All edits are continuously auto-saved. Click to force instant save now."
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 11px',
                    background: '#fff',
                    color: '#000',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    boxShadow: '3px 3px 0 #000',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: draftStatus === 'saving' ? '#eab308' : '#16a34a',
                      display: 'inline-block',
                    }}
                  />
                  {draftStatus === 'saving' ? 'SAVING DRAFT...' : 'DRAFT SAVED'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  title="Reset document to blank default state"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 11px',
                    background: '#fff',
                    color: '#000',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    boxShadow: '3px 3px 0 #000',
                  }}
                >
                  <RefreshCw size={12} /> RESET
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreatorSignatureModalOpen(true)}
                  title={creatorSignatureDrawing ? "Your electronic signature is saved on this device. Click to redraw or edit." : "Draw or type your electronic signature to save it forever on this device."}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 11px',
                    background: creatorSignatureDrawing ? '#ecfdf5' : '#fff',
                    color: creatorSignatureDrawing ? '#047857' : '#000',
                    border: creatorSignatureDrawing ? '2px solid #059669' : '2px solid #000',
                    borderRadius: '4px',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    boxShadow: '3px 3px 0 #000',
                  }}
                >
                  <PenLine size={12} />
                  {creatorSignatureDrawing ? 'SIGNATURE: SAVED ✓' : '+ MY SIGNATURE'}
                </button>
              </>
            )}

            {/* CreatorsKit badge toggle — controls branding on all printed documents */}
            <button
              onClick={() => setBrandingOn((v) => !v)}
              title="Show or hide the 'Powered by CreatorsKit' badge on printed documents"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: brandingOn ? '#000' : '#fff',
                color: brandingOn ? '#fff' : '#000',
                border: '2px solid #000',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: '3px 3px 0 #000',
              }}
            >
              {brandingOn ? <Check size={13} /> : <X size={13} />} BADGE: {brandingOn ? 'ON' : 'OFF'}
            </button>

            {/* Currency Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '2px solid #000', borderRadius: '4px', padding: '4px 8px', background: '#fff', boxShadow: '3px 3px 0 #000' }}>
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
                    borderRadius: '2px',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={copyClientLink}
              disabled={isCopyingLink}
              title="Copy interactive client link that prints live in real-time"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: '#fff',
                color: '#000',
                border: '2px solid #000',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                cursor: isCopyingLink ? 'wait' : 'pointer',
                boxShadow: '3px 3px 0 #000',
                opacity: isCopyingLink ? 0.85 : 1,
              }}
            >
              {isCopyingLink ? (
                <ThinkingOrb size={20} state="working" />
              ) : clientLinkCopied ? (
                <Check size={14} />
              ) : (
                <Share2 size={14} />
              )}
              {isCopyingLink ? 'SAVING LINK...' : clientLinkCopied ? 'LINK COPIED!' : 'COPY LINK'}
            </button>

            <button
              onClick={sendWhatsAppSummary}
              title="Share document link via WhatsApp"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: '#16a34a',
                color: '#fff',
                border: '2px solid #000',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: '3px 3px 0 #000',
              }}
            >
              WHATSAPP
            </button>

            <button
              onClick={startAnimatedPrint}
              title="Watch document print out in real-time"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#000',
                color: '#fff',
                border: '2px solid #000',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: '3px 3px 0 #000',
              }}
            >
              <Printer size={15} /> PRINT / PREVIEW
            </button>
          </div>
        </div>

        {/* Tab Selection — receipt-index cards */}
        <div
          className="ck-tab-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 224px), 1fr))',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {getTabsForCreatorType(creatorType).map((tab, idx) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="ck-tab"
                onClick={() => switchTab(tab.id as TabType)}
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
                    background: isSelected ? '#fff' : '#f4f4f5',
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

        {/* ─── MY DOCUMENTS VAULT (Tier 1: every document ever issued lives here) ─── */}
        {isMounted && (
          <div
            className="ck-noprint"
            style={{ background: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 #000', marginBottom: 20 }}
          >
            <button
              type="button"
              onClick={() => setVaultOpen((v) => !v)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                padding: '11px 14px',
                background: vaultOpen ? '#000' : '#fff',
                color: vaultOpen ? '#fff' : '#000',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <FolderOpen size={14} /> My Documents
                {vaultEntries.length > 0 && (
                  <span
                    style={{
                      background: vaultOpen ? '#fff' : '#000',
                      color: vaultOpen ? '#000' : '#fff',
                      padding: '0 6px',
                      fontSize: '0.62rem',
                    }}
                  >
                    {vaultEntries.length}
                  </span>
                )}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', fontWeight: 800 }}>
                {vaultEntries.filter((e) => e.kind === 'invoice' && e.status === 'sent').length > 0 && (
                  <span style={{ background: '#eab308', color: '#000', padding: '1px 6px' }}>
                    {vaultEntries.filter((e) => e.kind === 'invoice' && e.status === 'sent').length} UNPAID
                  </span>
                )}
                <span>{vaultOpen ? '▾' : '▸'}</span>
              </span>
            </button>
            {vaultOpen && (
              <div style={{ maxHeight: 320, overflowY: 'auto', borderTop: '2px solid #000' }}>
                {vaultEntries.length === 0 ? (
                  <div style={{ padding: '14px 16px', fontSize: '0.72rem', color: '#666', fontFamily: 'monospace', lineHeight: 1.6 }}>
                    Nothing here yet. Every document you print or share is added to this list automatically — so you
                    can reopen it, send a payment reminder, or mark it paid with one tap.
                  </div>
                ) : (
                  vaultEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '9px 12px', borderTop: '1px solid #e5e7eb' }}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.6rem',
                          background: '#000',
                          color: '#fff',
                          padding: '2px 5px',
                          flexShrink: 0,
                        }}
                      >
                        {entry.kind === 'invoice' ? 'INV' : entry.kind === 'receipt' ? 'RCP' : entry.kind === 'agreement' ? 'AGR' : 'LTH'}
                      </span>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`${entry.docNumber} · ${entry.clientName}`}
                        >
                          {entry.docNumber} · {entry.clientName}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#666', fontFamily: 'monospace' }}>
                          {(CURRENCY_SYMBOLS[entry.currency as CurrencyType] ?? entry.currency)}
                          {entry.total.toLocaleString()} · {new Date(entry.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          padding: '2px 6px',
                          background: entry.status === 'paid' ? '#16a34a' : '#eab308',
                          color: entry.status === 'paid' ? '#fff' : '#000',
                          flexShrink: 0,
                        }}
                      >
                        {entry.status === 'paid' ? 'PAID' : 'UNPAID'}
                      </span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => openVaultEntry(entry)} title="Open this document for editing" style={vaultActionStyle}>
                          OPEN
                        </button>
                        {entry.kind === 'invoice' && entry.status === 'sent' && (
                          <>
                            <button
                              type="button"
                              onClick={() => markVaultEntryPaid(entry)}
                              title="Mark paid and generate the receipt, pre-filled"
                              style={{ ...vaultActionStyle, background: '#16a34a', color: '#fff' }}
                            >
                              PAID ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => sendVaultReminder(entry)}
                              title="Copy a polite WhatsApp reminder with the payment link"
                              style={vaultActionStyle}
                            >
                              REMIND
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => removeVaultEntry(entry.id)}
                          title={
                            confirmDeleteVaultId === entry.id
                              ? 'Are you sure you want to remove this document?'
                              : 'Remove from this list'
                          }
                          style={{
                            ...vaultActionStyle,
                            color: confirmDeleteVaultId === entry.id ? '#fff' : '#dc2626',
                            borderColor: '#dc2626',
                            background: confirmDeleteVaultId === entry.id ? '#dc2626' : undefined,
                          }}
                        >
                          {confirmDeleteVaultId === entry.id ? 'ARE YOU SURE?' : '✕'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Mobile View Switcher (1. Builder · 2. Live Preview) */}
        <div className="ck-mobile-view-bar ck-noprint">
          <button
            type="button"
            className={mobileTab === 'editor' ? 'active' : ''}
            onClick={() => setMobileTab('editor')}
          >
            <PenTool size={13} />
            <span>1. BUILDER</span>
          </button>
          <button
            type="button"
            className={mobileTab === 'preview' ? 'active' : ''}
            onClick={() => setMobileTab('preview')}
          >
            <Eye size={13} />
            <span>2. PREVIEW</span>
            <span className="ck-mobile-item-badge">{sym}{totalAmount.toLocaleString()}</span>
          </button>
        </div>

        {/* Workspace: 2-Column Split (Controls on Left, Live Branded Document on Right) */}
        <div
          className={`ck-workspace ck-view-${mobileTab}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
            gap: 24,
            alignItems: 'start',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* ─── LEFT COLUMN: BUILDER & SETTINGS CONTROLS ─── */}
          <div className="ck-noprint ck-editor-col" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>

            {/* ─── CREATION MODE SWITCHER (Guided · Document Ingestion · Manual) ─── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 5,
                background: '#fff',
                padding: 4,
                border: '2px solid #000',
                boxShadow: '3px 3px 0 #000',
              }}
            >
              {[
                { id: 'guided' as const, label: 'Guided Builder', icon: <PenTool size={12} /> },
                { id: 'reconstruct' as const, label: 'Import Doc', icon: <FileUp size={12} /> },
                { id: 'manual' as const, label: 'All Controls', icon: <SlidersHorizontal size={12} /> },
              ].map((mode) => {
                const isActive = builderMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setBuilderMode(mode.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '9px 4px',
                      background: isActive ? '#000' : '#f9fafb',
                      color: isActive ? '#fff' : '#000',
                      border: isActive ? '1.5px solid #000' : '1px solid #e5e7eb',
                      boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.69rem',
                      letterSpacing: '0.01em',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mode.icon}
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Smart status feedback — inline spacer removed; global toast handles display */}

            {/* Extracted Brand Palette Bar */}
            {extractedPalette.length > 0 && (
              <div
                style={{
                  background: '#fff',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0 #000',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Palette size={13} /> Extracted Brand Palette
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#666', fontFamily: 'monospace' }}>Tap to apply as accent</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {extractedPalette.map((color, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAccentColor(color);
                        if (idx === 0) setPrimaryColor(color);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#f9fafb',
                        color: '#000',
                        border: '1.5px solid #000',
                        boxShadow: '2px 2px 0 #000',
                        padding: '4px 8px',
                        fontSize: '0.66rem',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                      title={`Apply ${color} to document`}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '1px solid #000' }} />
                      <span>{color.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── GUIDED BUILDER MODE ─── */}
            {builderMode === 'guided' && (
              <div
                style={{
                  background: '#fff',
                  border: '2px solid #000',
                  boxShadow: '4px 4px 0 #000',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #000', paddingBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 900, fontSize: '0.78rem', fontFamily: 'monospace', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PenTool size={13} /> Guided Document Builder
                    </span>
                    <p style={{ margin: '3px 0 0', fontSize: '0.64rem', color: '#555' }}>
                      Build your {activeTab} in 3 clean steps — no messy prompts.
                    </p>
                  </div>
                  <ByokButton onClick={() => setIsByokModalOpen(true)} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>
                      1. WHO ARE YOU BILLING? (BRAND / CLIENT NAME)
                    </label>
                    <input
                      type="text"
                      value={guidedClient}
                      onChange={(e) => setGuidedClient(e.target.value)}
                      placeholder="e.g. Nike / Gymshark / Spotify / Lumina Studio"
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.78rem', fontFamily: 'monospace', border: '1.5px solid #000' }}
                    />
                    {savedClients.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#666', fontFamily: 'monospace' }}>PAST CLIENTS:</span>
                        {savedClients.slice(0, 4).map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              setGuidedClient(c.name);
                              if (c.currency) setGuidedCurrency(c.currency as CurrencyType);
                            }}
                            style={{
                              padding: '2px 7px',
                              background: '#f4f4f5',
                              border: '1px solid #000',
                              fontSize: '0.62rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>
                      2. WHAT ARE YOU DELIVERING? (DELIVERABLES)
                    </label>
                    <input
                      type="text"
                      value={guidedDeliverable}
                      onChange={(e) => setGuidedDeliverable(e.target.value)}
                      placeholder="e.g. 2x TikTok Videos (60s) + 1x Instagram Reel"
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.78rem', fontFamily: 'monospace', border: '1.5px solid #000' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>
                        3. TOTAL AMOUNT
                      </label>
                      <input
                        type="number"
                        value={guidedRate}
                        onChange={(e) => setGuidedRate(e.target.value)}
                        placeholder="e.g. 3500"
                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.78rem', fontFamily: 'monospace', border: '1.5px solid #000' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>
                        CURRENCY
                      </label>
                      <select
                        value={guidedCurrency}
                        onChange={(e) => setGuidedCurrency(e.target.value as CurrencyType)}
                        style={{ width: '100%', padding: '8px 8px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1.5px solid #000', background: '#fff' }}
                      >
                        <option value="GHS">GHS (GH₵)</option>
                        <option value="NGN">NGN (₦)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>
                      4. TIMELINE &amp; PAYMENT TERMS
                    </label>
                    <select
                      value={guidedTerms}
                      onChange={(e) => setGuidedTerms(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.74rem', fontFamily: 'monospace', border: '1.5px solid #000', background: '#fff' }}
                    >
                      <option value="50% Upfront, Balance on Delivery (Net 14)">50% Upfront Deposit, Balance on Delivery (Net 14)</option>
                      <option value="Net 30 Days">Net 30 Days</option>
                      <option value="100% Paid in Full">100% Paid in Full (Proof of Payment)</option>
                      <option value="100% Due Upon Receipt">100% Due Upon Receipt</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleGuidedGenerate}
                      style={{
                        flex: '1 1 180px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: '#000',
                        color: '#fff',
                        border: '2px solid #000',
                        boxShadow: '3px 3px 0 #000',
                        padding: '12px 18px',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      <span>Build {activeTab.toUpperCase()}</span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={handleGuidedAiAssist}
                      disabled={isAiGenerating}
                      title="AI polishes the deliverable wording and suggests line items"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#fff',
                        color: '#000',
                        border: '2px solid #000',
                        boxShadow: '2px 2px 0 #000',
                        padding: '12px 14px',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        textTransform: 'uppercase',
                        cursor: isAiGenerating ? 'wait' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isAiGenerating ? (
                        <>
                          <ThinkingOrb size={20} state="working" />
                          <span>AI Polishing...</span>
                        </>
                      ) : (
                        <span>AI Polish (BYOK)</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── CONCEPT B: DOCUMENT INGESTION & COLOR RECONSTRUCTION ─── */}
            {builderMode === 'reconstruct' && (
              <div
                style={{
                  background: '#fff',
                  border: '2px solid #000',
                  boxShadow: '4px 4px 0 #000',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ borderBottom: '1.5px solid #000', paddingBottom: 10 }}>
                  <span style={{ fontWeight: 900, fontSize: '0.78rem', fontFamily: 'monospace', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileUp size={14} /> Import Document &amp; Auto-Format Layout
                  </span>
                  <p style={{ margin: '3px 0 0', fontSize: '0.64rem', color: '#555' }}>
                    Upload a Word contract (.docx), text document (.txt, .md), invoice, or screenshot. Automatically structures into a multi-section legal blueprint with dual e-signature blocks.
                  </p>
                </div>

                <input
                  type="file"
                  ref={docFileInputRef}
                  onChange={handleDocFileUpload}
                  accept=".docx,.txt,.md,.pdf,image/*"
                  style={{ display: 'none' }}
                />

                {/* Dropzone */}
                <div
                  onClick={() => !isProcessingDoc && docFileInputRef.current?.click()}
                  style={{
                    border: isProcessingDoc ? '2px dashed #000' : '1.5px dashed #000',
                    background: isProcessingDoc ? '#fefce8' : '#fcfcfd',
                    padding: '22px 16px',
                    textAlign: 'center',
                    cursor: isProcessingDoc ? 'wait' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isProcessingDoc ? (
                    <>
                      <ThinkingOrb size={32} state="working" />
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.74rem', textTransform: 'uppercase' }}>
                        PARSING &amp; STRUCTURING LAYOUT...
                      </span>
                      <span style={{ fontSize: '0.62rem', color: '#666', fontFamily: 'monospace' }}>
                        Extracting articles, clauses, parties, and execution spaces
                      </span>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 34, height: 34, background: '#000', color: '#fff', border: '1.5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload size={16} />
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.74rem', textTransform: 'uppercase' }}>
                        Upload Document (.docx, .txt, .pdf, image)
                      </span>
                      <span style={{ fontSize: '0.62rem', color: '#666', fontFamily: 'monospace' }}>
                        Auto-structures articles, recitals, and e-signature execution spaces
                      </span>
                    </>
                  )}
                </div>

                {/* Or paste text */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                    Or Paste Agreement / Contract / Invoice Text:
                  </span>
                  <textarea
                    value={reconstructText}
                    onChange={(e) => setReconstructText(e.target.value)}
                    placeholder="Paste your raw agreement clauses, partnership contract, NDA, or invoice deliverables here... Auto-formats into multi-section legal blueprint with e-signature blocks."
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: 8,
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      border: '1.5px solid #000',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleReconstructFromText}
                    disabled={isProcessingDoc}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: '#000',
                      color: '#fff',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                      padding: '9px 14px',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      cursor: isProcessingDoc ? 'wait' : 'pointer',
                      marginTop: 8,
                      width: '100%',
                    }}
                  >
                    <span>Format Layout &amp; Prepare E-Signature</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── MANUAL / FINE-TUNE FORM CONTROLS ─── */}
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #000', paddingBottom: 6 }}>
              <span style={{ fontWeight: 900, fontSize: '0.72rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                {builderMode === 'manual' ? 'Granular Form Controls' : 'Fine-Tune Document Fields'}
              </span>
              <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#666' }}>
                {builderMode === 'manual' ? 'All Sections' : 'Optional Override'}
              </span>
            </div>

            {/* 0. Customization Layer (Design / Templates / Fonts / Colors) */}
            {activeTab !== 'receipt' && (
              <>
                <SectionToggle id="design" title="0. Templates, Fonts & Colors" />

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
                            { id: 'brutalist', title: 'Studio Brutalist', desc: 'CreatorsKit · Modern deposit layout' },
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
                                  background: isCurrent ? '#000' : '#f9fafb',
                                  color: isCurrent ? '#fff' : '#000',
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
                                <div style={{ fontSize: '0.65rem', color: isCurrent ? '#d4d4d8' : '#4b5563', lineHeight: 1.25 }}>
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
                                    border: primaryColor.toLowerCase() === swatch.hex.toLowerCase() ? '2px solid #fff' : '1px solid #ccc',
                                    boxShadow: primaryColor.toLowerCase() === swatch.hex.toLowerCase() ? '0 0 0 2px #000' : 'none',
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
                            4 FORMATS
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
                          {[
                            { id: 'service', title: 'Service Contract', desc: 'eSign Legal · Numbered clauses & checkboxes' },
                            { id: 'business', title: 'Business Agreement', desc: 'Editorial · Roman numerals & milestone table' },
                            { id: 'creator', title: 'Creator Sponsorship', desc: 'Deal Memo · Deliverables, deposit & kill fee' },
                            { id: 'full-legal', title: 'Full Legal Agreement', desc: 'Multi-Page · All sections, schedules & execution' },
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
                                  background: isCurrent ? '#000' : '#f9fafb',
                                  color: isCurrent ? '#fff' : '#000',
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
                                <div style={{ fontSize: '0.65rem', color: isCurrent ? '#d4d4d8' : '#4b5563', lineHeight: 1.25 }}>
                                  {tpl.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {documentSections.length > 0 && (
                          <div style={{ marginBottom: 14, background: '#fafafa', border: '1.5px solid #000', padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                                INGESTED LEGAL SECTIONS ({documentSections.length} SECTIONS)
                              </label>
                              <span style={{ fontSize: '0.62rem', background: '#000', color: '#fff', padding: '2px 6px', fontWeight: 800 }}>
                                MULTI-PAGE ACTIVE
                              </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#4b5563', marginBottom: 8 }}>
                              All {documentSections.length} sections and articles are preserved and will print in full across all pages.
                            </div>
                            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb', background: '#fff', padding: 6 }}>
                              {documentSections.map((sec, i) => (
                                <div key={i} style={{ fontSize: '0.68rem', padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}>
                                  <strong>{i + 1}. {sec.heading}</strong> ({sec.lines.length} lines)
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick Presets for Creators */}
                        <div style={{ marginBottom: 14, background: '#fafafa', border: '1.5px solid #000', padding: '10px 12px', boxShadow: '2px 2px 0 #000' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: '0.66rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                              CREATOR-SPECIFIC LEGAL PRESETS (1-CLICK LOAD)
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowRedFlagAudit(!showRedFlagAudit)}
                              style={{
                                background: showRedFlagAudit ? '#000' : '#fef08a',
                                color: showRedFlagAudit ? '#fff' : '#000',
                                border: '1px solid #000',
                                padding: '2px 8px',
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                cursor: 'pointer',
                              }}
                            >
                              {showRedFlagAudit ? '✕ CLOSE AUDIT' : '🛡️ AI RED-FLAG AUDIT'}
                            </button>
                          </div>

                          {/* Creator presets */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {[
                              { id: 'sponsorship', label: '🎬 Influencer Deal' },
                              { id: 'video-editor', label: '✂️ Video Editor' },
                              { id: 'photography', label: '📸 Photographer' },
                              { id: 'videography', label: '🎥 Videographer' },
                              { id: 'design', label: '🎨 Brand Designer' },
                              { id: 'music', label: '🎵 Music Producer' },
                              { id: 'copywriting', label: '✍️ Copy / Script' },
                              { id: 'agency', label: '🏢 Agency MSA' },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectContractPreset(p.id)}
                                style={{
                                  background: '#fff',
                                  border: '1.5px solid #000',
                                  boxShadow: '1.5px 1.5px 0 #000',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>

                          {/* Standard legal presets */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, borderTop: '1px dashed #e5e7eb', paddingTop: 6 }}>
                            {[
                              { id: 'service', label: 'Standard Service' },
                              { id: 'contractor', label: 'Independent Contractor' },
                              { id: 'nda', label: 'Mutual NDA' },
                              { id: 'business', label: 'General Business' },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectContractPreset(p.id)}
                                style={{
                                  background: '#f4f4f5',
                                  border: '1px solid #71717a',
                                  padding: '3px 7px',
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  color: '#27272a',
                                  cursor: 'pointer',
                                }}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>

                          {/* AI Contract Red-Flag Audit Drawer */}
                          {showRedFlagAudit && (
                            <div style={{ marginTop: 10, background: '#fff', border: '1.5px solid #000', padding: '10px 12px' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>🛡️</span>
                                <span>Contract Protection &amp; Red-Flag Assessment</span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {/* Deposit warning */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', background: depositPercentage < 50 ? '#fef2f2' : '#f0fdf4', border: depositPercentage < 50 ? '1px solid #f87171' : '1px solid #86efac', padding: '6px 8px' }}>
                                  <div>
                                    <span style={{ fontWeight: 800 }}>Deposit Commitment: </span>
                                    <span>{depositPercentage}% upfront {depositPercentage < 50 ? '(Risk: low deposit)' : '(Protected)'}</span>
                                  </div>
                                  {depositPercentage < 50 && (
                                    <button
                                      type="button"
                                      onClick={() => setDepositPercentage(50)}
                                      style={{ background: '#000', color: '#fff', border: 'none', padding: '3px 8px', fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                      Set 50%
                                    </button>
                                  )}
                                </div>

                                {/* Revision cap warning */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', background: revisionRounds > 3 ? '#fffbeb' : '#f0fdf4', border: revisionRounds > 3 ? '1px solid #fde047' : '1px solid #86efac', padding: '6px 8px' }}>
                                  <div>
                                    <span style={{ fontWeight: 800 }}>Revision Cap: </span>
                                    <span>{revisionRounds} rounds {revisionRounds > 3 ? '(Risk: scope creep)' : '(Protected)'}</span>
                                  </div>
                                  {revisionRounds > 3 && (
                                    <button
                                      type="button"
                                      onClick={() => setRevisionRounds(2)}
                                      style={{ background: '#000', color: '#fff', border: 'none', padding: '3px 8px', fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                      Cap at 2
                                    </button>
                                  )}
                                </div>

                                {/* Kill fee protection */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', background: contractKillFee < 50 ? '#fef2f2' : '#f0fdf4', border: contractKillFee < 50 ? '1px solid #f87171' : '1px solid #86efac', padding: '6px 8px' }}>
                                  <div>
                                    <span style={{ fontWeight: 800 }}>Cancellation Fee: </span>
                                    <span>{contractKillFee}% {contractKillFee < 50 ? '(Risk: client can cancel freely)' : '(Protected)'}</span>
                                  </div>
                                  {contractKillFee < 50 && (
                                    <button
                                      type="button"
                                      onClick={() => setContractKillFee(50)}
                                      style={{ background: '#000', color: '#fff', border: 'none', padding: '3px 8px', fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                      Set 50% Kill Fee
                                    </button>
                                  )}
                                </div>

                                {/* Confidentiality */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', background: !contractConfidentiality ? '#fffbeb' : '#f0fdf4', border: !contractConfidentiality ? '1px solid #fde047' : '1px solid #86efac', padding: '6px 8px' }}>
                                  <div>
                                    <span style={{ fontWeight: 800 }}>Confidentiality / NDA: </span>
                                    <span>{contractConfidentiality ? 'Enabled (Both parties protected)' : 'Disabled'}</span>
                                  </div>
                                  {!contractConfidentiality && (
                                    <button
                                      type="button"
                                      onClick={() => setContractConfidentiality(true)}
                                      style={{ background: '#000', color: '#fff', border: 'none', padding: '3px 8px', fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                      Enable
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
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
                                  background: isCurrent ? '#000' : '#f9fafb',
                                  color: isCurrent ? '#fff' : '#000',
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
                                <div style={{ fontSize: '0.65rem', color: isCurrent ? '#d4d4d8' : '#4b5563', lineHeight: 1.25 }}>
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

              {/* Brand Kit (universal identity): re-apply saved defaults, or set one up */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                {brandKitReady ? (
                  <button
                    type="button"
                    onClick={() => {
                      const ok = applyBrandKit();
                      setSmartStatusMessage(ok ? 'Brand Kit applied — your saved identity replaced the demo details.' : 'No Brand Kit saved yet — set one up from Your Data → Brand Kit.');
                    }}
                    style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', padding: '5px 10px', border: '1.5px solid #000', background: '#000', color: '#fff', cursor: 'pointer', letterSpacing: '0.03em' }}
                  >
                    ⚡ USE MY BRAND
                  </button>
                ) : (
                  <a
                    href="/brand-kit"
                    style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', padding: '5px 10px', border: '1.5px solid #000', background: '#fff', color: '#000', textDecoration: 'none', letterSpacing: '0.03em' }}
                  >
                    ＋ SET UP BRAND KIT
                  </a>
                )}
              </div>

              <div className="ck-form-grid-2" style={{ marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                    YOUR NAME / BRAND
                  </label>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    placeholder="e.g. Kofi Creates"
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
                    placeholder="@yourhandle · your niche"
                    style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div className="ck-form-grid-2" style={{ marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 3 }}>
                    PHONE (MOMO/WHATSAPP)
                  </label>
                  <input
                    type="text"
                    value={creatorPhone}
                    onChange={(e) => setCreatorPhone(e.target.value)}
                    placeholder="e.g. +233 24 000 0000"
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
                    placeholder="email · city, country"
                    style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Client Info */}
              <div style={{ borderTop: '1px dashed #ccc', paddingTop: 10, marginTop: 10 }}>
                {/* Past clients (Tier 1 memory) — one tap refills the whole client block */}
                {savedClients.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, fontFamily: 'monospace', color: '#555', marginBottom: 5 }}>
                      PAST CLIENTS — TAP TO FILL:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {savedClients.slice(0, 6).map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            setClientName(c.name);
                            if (c.contact) setClientContact(c.contact);
                            if (c.currency) setCurrency(c.currency as CurrencyType);
                            if (c.momoNumber) setMomoNumber(c.momoNumber);
                            if (c.momoNetwork) setMomoNetwork(c.momoNetwork);
                          }}
                          style={{
                            padding: '4px 9px',
                            background: '#f4f4f5',
                            border: '1.5px solid #000',
                            boxShadow: '2px 2px 0 #000',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                          }}
                          title={`Fill in ${c.name}${c.currency ? ` (${c.currency})` : ''}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="ck-form-grid-2" style={{ marginBottom: 10 }}>
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

                <div className="ck-form-grid-2" style={{ marginBottom: 10 }}>
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

                <div className="ck-form-grid-2">
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
                  <div className="ck-form-grid-2" style={{ marginTop: 10 }}>
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
                )}

                {activeTab !== 'letterhead' && (
                  <>
                    <div className={activeTab === 'invoice' ? 'ck-form-grid-2' : ''} style={{ marginTop: 10 }}>
                      {activeTab === 'invoice' && (
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
                      )}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace' }}>
                            SIGNATURE NAME (SCRIPT)
                          </label>
                          {creatorSignatureDrawing && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                              DRAWING SAVED ✓
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="e.g. John Smith"
                          style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #000', fontSize: '0.8rem', fontWeight: 600 }}
                        />
                      </div>
                    </div>

                    {/* Electronic Signature Box (Saved permanently to device) */}
                    <div
                      style={{
                        marginTop: 12,
                        padding: '12px 14px',
                        background: '#f9fafb',
                        border: '1.5px solid #000',
                        borderRadius: 4,
                        boxShadow: '2px 2px 0 #000',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.9rem' }}>🖋️</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                            Creator Electronic Signature
                          </span>
                        </div>
                        {creatorSignatureDrawing ? (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '2px 6px',
                              border: '1px solid #86efac',
                              borderRadius: 3,
                            }}
                          >
                            SAVED ON THIS DEVICE
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              color: '#6b7280',
                            }}
                          >
                            NOT SET YET
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '0 0 10px', fontSize: '0.7rem', color: '#4b5563', lineHeight: 1.4 }}>
                        Draw or type your signature once. It will stay saved on this device forever and automatically sign all your future invoices, receipts, and agreements.
                      </p>

                      {creatorSignatureDrawing ? (
                        <div
                          style={{
                            background: '#fff',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#fafafa',
                              border: '1px dashed #ccc',
                              borderRadius: 4,
                              padding: '8px 12px',
                              minHeight: 48,
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={creatorSignatureDrawing}
                              alt="Creator signature"
                              style={{ maxHeight: 42, maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <span style={{ fontSize: '0.68rem', color: '#4b5563', fontFamily: 'monospace' }}>
                              Signs as: <strong style={{ color: '#000' }}>{signatureName || creatorName}</strong>
                            </span>
                            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                              <button
                                type="button"
                                onClick={() => setIsCreatorSignatureModalOpen(true)}
                                style={{
                                  padding: '5px 10px',
                                  background: '#000',
                                  color: '#fff',
                                  border: '1.5px solid #000',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  fontFamily: 'monospace',
                                  cursor: 'pointer',
                                  borderRadius: 3,
                                }}
                              >
                                REDRAW
                              </button>
                              <button
                                type="button"
                                onClick={handleClearCreatorSignature}
                                style={{
                                  padding: '5px 10px',
                                  background: '#fff',
                                  color: '#dc2626',
                                  border: '1.5px solid #dc2626',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  fontFamily: 'monospace',
                                  cursor: 'pointer',
                                  borderRadius: 3,
                                }}
                              >
                                REMOVE
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsCreatorSignatureModalOpen(true)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '9px 12px',
                            background: '#000',
                            color: '#fff',
                            border: '2px solid #000',
                            borderRadius: 4,
                            boxShadow: '2px 2px 0 #000',
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          <PenLine size={14} /> Draw or Type Electronic Signature
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {activeTab !== 'letterhead' && (
              <>
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
                  <div className="ck-form-grid-2" style={{ marginBottom: 12, borderBottom: '1px dashed #ccc', paddingBottom: 10 }}>
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

                  {/* My usual services (Tier 1 rate card) — learned from documents you issue */}
                  {savedServices.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 6, color: '#555' }}>
                        MY USUAL SERVICES — ONE TAP TO ADD:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {savedServices.slice(0, 6).map((s) => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'stretch', gap: 5 }}>
                            <button
                              type="button"
                              onClick={() =>
                                addItem({ platform: s.platform as any, description: s.description, rate: s.rate })
                              }
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                textAlign: 'left',
                                padding: '5px 8px',
                                background: '#f4f4f5',
                                border: '1px solid #000',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title={`${s.description} — ${sym}${s.rate.toLocaleString()}`}
                            >
                              <Plus size={11} style={{ flexShrink: 0 }} />
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {s.description.length > 46 ? `${s.description.slice(0, 46)}…` : s.description}
                              </span>
                              <span style={{ color: '#555', flexShrink: 0 }}>({sym}{s.rate.toLocaleString()})</span>
                            </button>
                            <button
                              type="button"
                              title="Remove from my usual services"
                              onClick={() => setSavedServices(forgetService(s.id))}
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #dc2626',
                                padding: '4px 7px',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
              </>
            )}

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
                  <div className="ck-form-grid-2">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>MOMO NUMBER</label>
                      <input
                        type="text"
                        value={momoNumber}
                        onChange={(e) => setMomoNumber(e.target.value)}
                        placeholder="e.g. 024 123 4567"
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                      <span style={{ fontSize: '0.58rem', color: '#6b7280', marginTop: 3, display: 'block', lineHeight: 1.3 }}>
                        Shows formatted with spaces ({formatPhoneNumberForDisplay(momoNumber) || '024 123 4567'}), but copied automatically without spaces for instant USSD (*170# / *110#) approval.
                      </span>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>REGISTERED NAME</label>
                      <input
                        type="text"
                        value={momoName}
                        onChange={(e) => setMomoName(e.target.value)}
                        placeholder="Name registered on the momo account"
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
                  <div className="ck-form-grid-2">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>ACCOUNT NUMBER</label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="e.g. 9040001234567"
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>ACCOUNT NAME</label>
                      <input
                        type="text"
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        placeholder="Account name exactly as the bank holds it"
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
                  <div className="ck-form-grid-2">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>SWIFT / BIC CODE</label>
                      <input
                        type="text"
                        value={wireSwift}
                        onChange={(e) => setWireSwift(e.target.value)}
                        placeholder="e.g. SBICGHAC"
                        style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.78rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>IBAN / DOMICILIARY ACC</label>
                      <input
                        type="text"
                        value={wireIban}
                        onChange={(e) => setWireIban(e.target.value)}
                        placeholder="IBAN / domiciliary account number"
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

              <div className="ck-form-grid-2" style={{ marginBottom: 10 }}>
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

              <div className="ck-form-grid-2" style={{ marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', marginBottom: 2 }}>
                    USAGE RIGHTS (OPTIONAL)
                  </label>
                  <select
                    value={usagePeriod}
                    onChange={(e) => setUsagePeriod(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    <option value="">None — one-time delivery only</option>
                    <option value="30 Days Organic Social">30 Days Organic Social</option>
                    <option value="90 Days Organic Social">90 Days Organic Social</option>
                    <option value="1 Year Digital Usage">1 Year Digital Usage</option>
                    <option value="Perpetual Organic Only">Perpetual (Organic Only)</option>
                    <option value="Full Buyout — All Rights Transferred Upon Final Payment">Full Buyout — All Rights Transferred</option>
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
            {/* Mobile Back button */}
            <div className="ck-mobile-preview-back-bar ck-noprint" style={{ display: 'none' }}>
              <button
                type="button"
                onClick={() => setMobileTab('editor')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: '#000',
                  color: '#fff',
                  border: '2px solid #000',
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: 6,
                }}
              >
                <ArrowLeft size={14} />
                <span>← BACK TO GUIDED BUILDER</span>
              </button>
            </div>
            {/* Top Document Action Bar (Standardized across all tabs including receipt) */}
            <div
              className="ck-noprint"
              style={{
                background: '#fff',
                border: '2px solid #000',
                borderRadius: '4px',
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
                    borderRadius: '3px',
                    padding: '3px 8px',
                  }}
                >
                  {activeTab === 'invoice' ? 'INVOICE' : activeTab === 'receipt' ? 'RECEIPT' : activeTab === 'agreement' ? 'CONTRACT' : 'LETTERHEAD'}
                </span>
                <span className="ck-doc-mode-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555' }}>
                  {paperMode ? 'Paper View — Exactly How It Prints' : 'Live Document Preview'}
                </span>
                <div
                  className="ck-doc-mode-toggle"
                  style={{
                    display: 'inline-flex',
                    border: '2px solid #000',
                    borderRadius: 4,
                    overflow: 'hidden',
                    boxShadow: '2px 2px 0 #000',
                  }}
                >
                  {(['edit', 'paper'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaperMode(m === 'paper')}
                      style={{
                        background: (m === 'paper') === paperMode ? '#000' : '#fff',
                        color: (m === 'paper') === paperMode ? '#fff' : '#000',
                        border: 'none',
                        padding: '5px 10px',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                      }}
                    >
                      {m === 'edit' ? '✎ Edit' : '▤ Paper'}
                    </button>
                  ))}
                </div>

                {/* Minimal Undo / Redo buttons right above document */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
                  <button
                    type="button"
                    onClick={undo}
                    disabled={undoCount === 0}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3px 7px',
                      background: undoCount > 0 ? '#fff' : '#f1f1f1',
                      border: '1.5px solid #000',
                      boxShadow: undoCount > 0 ? '2px 2px 0 #000' : 'none',
                      cursor: undoCount > 0 ? 'pointer' : 'default',
                      color: undoCount > 0 ? '#000' : '#9ca3af',
                      borderRadius: '3px',
                      height: 27,
                    }}
                  >
                    <Undo2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={redoCount === 0}
                    title="Redo (Ctrl+Shift+Z)"
                    aria-label="Redo"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3px 7px',
                      background: redoCount > 0 ? '#fff' : '#f1f1f1',
                      border: '1.5px solid #000',
                      boxShadow: redoCount > 0 ? '2px 2px 0 #000' : 'none',
                      cursor: redoCount > 0 ? 'pointer' : 'default',
                      color: redoCount > 0 ? '#000' : '#9ca3af',
                      borderRadius: '3px',
                      height: 27,
                    }}
                  >
                    <Redo2 size={13} />
                  </button>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={startAnimatedPrint}
                  title="Watch document print out in real-time"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: '#000',
                    color: '#fff',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    boxShadow: '2px 2px 0 #000',
                    height: 38,
                    padding: '0 14px',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Printer size={14} /> Print Document
                </button>
                <button
                  onClick={copyClientLink}
                  disabled={isCopyingLink}
                  title="Copy interactive client link that prints live in real-time"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: '#fff',
                    color: '#000',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    boxShadow: '2px 2px 0 #000',
                    height: 38,
                    padding: '0 12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    cursor: isCopyingLink ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                    opacity: isCopyingLink ? 0.85 : 1,
                  }}
                >
                  {isCopyingLink ? (
                    <ThinkingOrb size={20} state="working" />
                  ) : clientLinkCopied ? (
                    <Check size={14} />
                  ) : (
                    <Share2 size={14} />
                  )}
                  {isCopyingLink ? 'Saving...' : clientLinkCopied ? 'Link Copied' : 'Copy Link'}
                </button>
                <button
                  onClick={sendWhatsAppSummary}
                  title="Share document link via WhatsApp"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: '#16a34a',
                    color: '#fff',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    boxShadow: '2px 2px 0 #000',
                    height: 38,
                    padding: '0 12px',
                    fontSize: '0.74rem',
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

            {/* Edit hint — the live document below is directly editable */}
            <div
              className="ck-noprint"
              style={{ fontSize: '0.62rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', color: '#666', textAlign: 'center', marginBottom: 8, letterSpacing: '0.04em' }}
            >
              {paperMode
                ? '▤ Paper View — Margins, Aspect & Line Breaks Match The Print · Switch To Edit To Change Anything'
                : '✎ Tap Any Text In The Document To Edit It Directly — Edits Are Included In Your Export'}
            </div>

            {/* ─── LIVE BRANDED DOCUMENT CANVAS (PRINTABLE + DIRECTLY EDITABLE) ─── */}
            <div
              style={{
                width: '100%',
                maxWidth: '100%',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <div
                ref={printAreaRef}
                id="printable-document"
                className={paperMode && activeTab !== 'receipt' ? 'ck-paper-doc' : undefined}
                contentEditable={!paperMode}
                suppressContentEditableWarning
                spellCheck={false}
                style={
                  activeTab === 'receipt'
                    ? {
                      width: '100%',
                      maxWidth: 380,
                      margin: '0 auto',
                    }
                    : {
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)',
                      width: 820,
                      maxWidth: 'none',
                      flex: '0 0 auto',
                      marginLeft: paperScale < 1 ? (820 * paperScale - 820) / 2 : 'auto',
                      marginRight: paperScale < 1 ? (820 * paperScale - 820) / 2 : 'auto',
                      marginBottom: paperHeight && paperScale < 1 ? -(paperHeight * (1 - paperScale)) : undefined,
                      transform: paperScale < 1 ? `scale(${paperScale})` : undefined,
                      transformOrigin: 'top center',
                      overflowX: 'visible',
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
                          maxWidth: '100%',
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

                    {/* ─── BRAND LOGO CONTROLS ─── */}
                    <div className="ck-noprint" contentEditable={false} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 20 }}>
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => logoFileInputRef.current?.click()}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', border: '2px solid #000', borderRadius: '4px', boxShadow: '2px 2px 0 #000', height: 36, padding: '0 12px', fontSize: '0.72rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <ImagePlus size={14} /> {logoUrl ? 'Change Receipt Logo' : 'Upload Receipt Logo'}
                      </button>
                      {logoUrl && (
                        <button
                          onClick={() => setLogoUrl(null)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#fee2e2', border: '2px solid #000', borderRadius: '4px', boxShadow: '2px 2px 0 #000', height: 36, padding: '0 10px', fontSize: '0.72rem', fontWeight: 800, fontFamily: 'monospace', cursor: 'pointer', color: '#991b1b', whiteSpace: 'nowrap' }}
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'agreement' && agreementDocument}

                {activeTab === 'letterhead' && letterheadDocument}
              </div>
            </div>
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
                    CreatorsKit
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
                className={activeTab === 'receipt' ? 'h-[36rem]' : 'h-[44rem] sm:h-[48rem]'}
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

            {/* Standardized Device-Adaptive Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, width: '100%', maxWidth: 540, marginTop: 6 }}>
              {isMobileDevice ? (
                <>
                  <button
                    onClick={saveDocumentAsImage}
                    disabled={isSavingImage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#000',
                      color: '#fff',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      boxShadow: '3px 3px 0 #000',
                      height: 40,
                      padding: '0 10px',
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      cursor: isSavingImage ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isSavingImage ? <ThinkingOrb size={20} state="working" /> : <Download size={14} />} {isSavingImage ? 'SAVING…' : 'SAVE PICTURE (PNG)'}
                  </button>
                  <button
                    onClick={handlePrint}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#fff',
                      color: '#000',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      boxShadow: '3px 3px 0 #000',
                      height: 40,
                      padding: '0 10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Printer size={14} /> PRINT / PDF
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handlePrint}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#000',
                      color: '#fff',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      boxShadow: '3px 3px 0 #000',
                      height: 40,
                      padding: '0 10px',
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Printer size={14} /> PRINT / SAVE PDF
                  </button>
                  <button
                    onClick={saveDocumentAsImage}
                    disabled={isSavingImage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#fff',
                      color: '#000',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      boxShadow: '3px 3px 0 #000',
                      height: 40,
                      padding: '0 10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      cursor: isSavingImage ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isSavingImage ? <ThinkingOrb size={20} state="working" /> : <Download size={14} />} {isSavingImage ? 'SAVING…' : 'SAVE PICTURE (PNG)'}
                  </button>
                </>
              )}
              <button
                onClick={copyClientLink}
                disabled={isCopyingLink}
                title="Copy client link that opens this live printer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: '#fff',
                  color: '#000',
                  border: '2px solid #000',
                  borderRadius: '4px',
                  boxShadow: '3px 3px 0 #000',
                  height: 40,
                  padding: '0 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  cursor: isCopyingLink ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: isCopyingLink ? 0.85 : 1,
                }}
              >
                {isCopyingLink ? (
                  <ThinkingOrb size={20} state="working" />
                ) : clientLinkCopied ? (
                  <Check size={14} />
                ) : (
                  <Share2 size={14} />
                )}
                {isCopyingLink ? 'SAVING LINK...' : clientLinkCopied ? 'LINK COPIED!' : 'COPY CLIENT LINK'}
              </button>
              <button
                onClick={sendWhatsAppSummary}
                title="Send document link via WhatsApp"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: '#16a34a',
                  color: '#fff',
                  border: '2px solid #000',
                  borderRadius: '4px',
                  boxShadow: '3px 3px 0 #000',
                  height: 40,
                  padding: '0 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                WHATSAPP
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Wide Top Status Notification Banner (Spacious horizontal layout, zero jagged line-breaks) */}
      {smartStatusMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            width: 'calc(100% - 24px)',
            maxWidth: 760,
            boxSizing: 'border-box',
            background: '#09090b',
            color: '#ffffff',
            border: '2px solid #000000',
            boxShadow: '4px 4px 0 #000000',
            borderRadius: 4,
            padding: '11px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            animation: 'ckToastSlideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.9)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.45,
                  wordBreak: 'normal',
                  overflowWrap: 'break-word',
                  fontFamily: 'inherit',
                  letterSpacing: '-0.01em',
                }}
              >
                {smartStatusMessage}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSmartStatusMessage(null)}
            aria-label="Dismiss notification"
            style={{
              background: '#27272a',
              border: '1.5px solid #3f3f46',
              borderRadius: 3,
              color: '#ffffff',
              cursor: 'pointer',
              padding: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Custom In-App Reset Confirmation Dialog (No window.alert / window.confirm) */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16,
          }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#000000',
              border: '3px solid #000000',
              boxShadow: '8px 8px 0 #000000',
              maxWidth: 440,
              width: '100%',
              padding: '24px 22px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Reset Current Document?
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: '#374151', margin: '0 0 20px', fontFamily: 'sans-serif' }}>
              This will clear your local draft, remove any uploaded documents or custom clauses, and reset all inputs back to clean default templates.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: '9px 16px',
                  background: '#f4f4f5',
                  color: '#000000',
                  border: '2px solid #000000',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 #000000',
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={confirmResetDraft}
                style={{
                  padding: '9px 16px',
                  background: '#000000',
                  color: '#ffffff',
                  border: '2px solid #000000',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
                }}
              >
                YES, RESET DOCUMENT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATOR ELECTRONIC SIGNATURE MODAL ─── */}
      <CreatorSignatureModal
        isOpen={isCreatorSignatureModalOpen}
        onClose={() => setIsCreatorSignatureModalOpen(false)}
        initialName={signatureName || creatorName}
        onSave={handleSaveCreatorSignature}
      />

      {/* ─── BYOK AI SETTINGS MODAL ─── */}
      <ByokModal
        isOpen={isByokModalOpen}
        onClose={() => setIsByokModalOpen(false)}
        initialProvider="gemini"
        onKeySaved={(provider) => {
          setSmartStatusMessage(`Saved ${provider.toUpperCase()} AI Key! Ready to generate.`);
          setTimeout(() => setSmartStatusMessage(null), 3500);
        }}
      />

      {/* ─── DATABASE UPLOAD FAILED FALLBACK CONFIRMATION MODAL ─── */}
      {showDbFallbackModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '2px solid #000',
              boxShadow: '6px 6px 0 #000',
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              fontFamily: 'monospace',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', textTransform: 'uppercase' }}>
                DATABASE UPLOAD FAILED
              </span>
            </div>

            <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#000' }}>
              Could Not Save Document Online
            </h3>

            <p style={{ fontSize: '0.74rem', color: '#444', lineHeight: 1.5, margin: '0 0 18px' }}>
              The database is currently unreachable or paused. Would you like to take the offline fallback link (contains your document data in the URL), or cancel and print/save the document directly?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={handleAcceptFallbackLink}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#000',
                  color: '#fff',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0 #000',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                ✓ Yes, Give Me The Offline Link (Long URL)
              </button>

              <button
                type="button"
                onClick={handleDeclineFallbackLink}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: '#fff',
                  color: '#000',
                  border: '2px solid #000',
                  boxShadow: '2px 2px 0 #000',
                  fontWeight: 900,
                  fontSize: '0.74rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                ✕ No, Cancel (I Will Print / Send PDF Directly)
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
