/**
 * src/lib/brand-kit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * THE UNIVERSAL CREATOR IDENTITY ("Grand Kit" — owner ruling 2026-10-08).
 *
 * One local identity every tool pulls from: invoices open with your logo,
 * colors, fonts and MoMo/bank details already in place; the watermark tool
 * opens with your logo stamped; quote cards open in your fonts.
 *
 * STORAGE   localStorage `ck_brandkit_v1` — the ck_ prefix means the kit
 *           rides the encrypted device transfer (src/lib/device-transfer.ts
 *           collects every ck_* key) and ports to a new phone for FREE.
 *           No server, no accounts, no egress.
 *
 * SEMANTICS The kit is DEFAULTS (variables). A document that overrides a
 *           value — different bank account for one client, say — keeps
 *           that override for itself and never writes back. The next
 *           document starts from the kit again.
 */

export const BRAND_KIT_STORAGE_KEY = 'ck_brandkit_v1';

export interface BrandKitIdentity {
  name: string;
  handle: string;
  niche: string;
  location: string;
  email: string;
  phone: string;
  whatsapp: string;
}

export interface BrandKitMoney {
  /** '' | 'GHS' | 'NGN' | 'USD' | 'GBP' */
  currency: string;
  momoNetwork: string;
  momoNumber: string;
  momoName: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paystackLink: string;
}

export interface BrandKitSignature {
  drawingUrl: string | null;
  signatureName: string;
  font?: string;
}

export interface BrandKit {
  identity: BrandKitIdentity;
  logoDataUrl: string | null;
  /** hex or '' (= unset) */
  colors: { primary: string; accent: string };
  /** Google Font names, '' = unset */
  fonts: { heading: string; body: string };
  money: BrandKitMoney;
  signature?: BrandKitSignature;
  updatedAt: number;
}

export interface BrandKitPatch {
  identity?: Partial<BrandKitIdentity>;
  logoDataUrl?: string | null;
  colors?: Partial<BrandKit['colors']>;
  fonts?: Partial<BrandKit['fonts']>;
  money?: Partial<BrandKitMoney>;
  signature?: BrandKitSignature | null;
}

export const EMPTY_BRAND_KIT: BrandKit = {
  identity: { name: '', handle: '', niche: '', location: '', email: '', phone: '', whatsapp: '' },
  logoDataUrl: null,
  colors: { primary: '', accent: '' },
  fonts: { heading: '', body: '' },
  money: {
    currency: '',
    momoNetwork: '',
    momoNumber: '',
    momoName: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    paystackLink: '',
  },
  signature: {
    drawingUrl: null,
    signatureName: '',
    font: 'Caveat',
  },
  updatedAt: 0,
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Safe merge — unknown/corrupt rows fall back field-by-field to empty. */
function mergeKit(raw: unknown): BrandKit {
  const r = (raw ?? {}) as Record<string, any>;
  const i = (r.identity ?? {}) as Record<string, unknown>;
  const c = (r.colors ?? {}) as Record<string, unknown>;
  const f = (r.fonts ?? {}) as Record<string, unknown>;
  const m = (r.money ?? {}) as Record<string, unknown>;
  const s = (r.signature ?? {}) as Record<string, unknown>;
  return {
    identity: {
      name: str(i.name),
      handle: str(i.handle),
      niche: str(i.niche),
      location: str(i.location),
      email: str(i.email),
      phone: str(i.phone),
      whatsapp: str(i.whatsapp),
    },
    logoDataUrl: typeof r.logoDataUrl === 'string' ? r.logoDataUrl : null,
    colors: { primary: str(c.primary), accent: str(c.accent) },
    fonts: { heading: str(f.heading), body: str(f.body) },
    money: {
      currency: str(m.currency),
      momoNetwork: str(m.momoNetwork),
      momoNumber: str(m.momoNumber),
      momoName: str(m.momoName),
      bankName: str(m.bankName),
      bankAccountName: str(m.bankAccountName),
      bankAccountNumber: str(m.bankAccountNumber),
      paystackLink: str(m.paystackLink),
    },
    signature: {
      drawingUrl: typeof s.drawingUrl === 'string' ? s.drawingUrl : null,
      signatureName: str(s.signatureName),
      font: str(s.font) || 'Caveat',
    },
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0,
  };
}

export function loadBrandKit(): BrandKit {
  try {
    return mergeKit(JSON.parse(localStorage.getItem(BRAND_KIT_STORAGE_KEY) ?? 'null'));
  } catch {
    return { ...EMPTY_BRAND_KIT, identity: { ...EMPTY_BRAND_KIT.identity }, colors: { ...EMPTY_BRAND_KIT.colors }, fonts: { ...EMPTY_BRAND_KIT.fonts }, money: { ...EMPTY_BRAND_KIT.money } };
  }
}

export function saveBrandKit(kit: BrandKit): boolean {
  try {
    localStorage.setItem(BRAND_KIT_STORAGE_KEY, JSON.stringify(kit));
    return true;
  } catch {
    return false; // quota exceeded (giant logo?) — caller shows a friendly error
  }
}

/** Merge a patch into the stored kit and save. Returns the new kit. */
export function updateBrandKit(patch: BrandKitPatch): BrandKit {
  const current = loadBrandKit();
  const next: BrandKit = {
    identity: { ...current.identity, ...(patch.identity ?? {}) },
    logoDataUrl: patch.logoDataUrl !== undefined ? patch.logoDataUrl : current.logoDataUrl,
    colors: { ...current.colors, ...(patch.colors ?? {}) },
    fonts: { ...current.fonts, ...(patch.fonts ?? {}) },
    money: { ...current.money, ...(patch.money ?? {}) },
    signature: patch.signature !== undefined ? (patch.signature ?? undefined) : current.signature,
    updatedAt: Date.now(),
  };
  saveBrandKit(next);
  return next;
}

export function clearBrandKit(): void {
  try {
    localStorage.removeItem(BRAND_KIT_STORAGE_KEY);
  } catch {
    /* storage blocked — non-fatal */
  }
}

/**
 * Values that are the business suite's DEMO placeholders — never learn these
 * into the kit (a first-time user printing the sample invoice must not get
 * "Reubenson Adat" saved as THEIR brand).
 */
const DEMO_VALUES = new Set([
  'Creators Kit / Reubenson Adat',
  '@reubenson_creates',
  'hello@creatorskit.com',
  '+233 24 000 0000',
  'Accra, Ghana',
  'Tech & Lifestyle Creator',
  '024 123 4567',
  'Reubenson Adat',
  'Stanbic Bank Ghana / Zenith Bank',
  '9040001234567',
  'https://paystack.shop/koficreates',
  'MTN / Vodafone Mobile Money',
]);

const CURRENCIES_VALID = ['GHS', 'NGN', 'USD', 'GBP'];

function learnable(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t || DEMO_VALUES.has(t)) return null;
  return t;
}

/**
 * AUTO-LEARN (owner ruling 2026-10-08): the kit keeps itself current. Every
 * time a document is committed (printed / shared), the suite feeds the
 * identity + payment fields it actually used into here — empty values and
 * demo placeholders are ignored, unchanged values are no-ops, and anything
 * new quietly updates the kit. The user never has to open the Brand Kit
 * page; it's optional. Returns whether anything actually changed (so
 * callers can flip their "USE MY BRAND" availability on).
 */
export function learnBrandKitFromUse(patch: BrandKitPatch): boolean {
  const current = loadBrandKit();
  const next: BrandKit = {
    ...current,
    identity: { ...current.identity },
    colors: { ...current.colors },
    fonts: { ...current.fonts },
    money: { ...current.money },
  };

  const idKeys = ['name', 'handle', 'niche', 'location', 'email', 'phone'] as const;
  for (const k of idKeys) {
    const v = learnable(patch.identity?.[k]);
    if (v && v !== next.identity[k]) next.identity[k] = v;
  }

  const moneyKeys = ['currency', 'momoNetwork', 'momoNumber', 'momoName', 'bankName', 'bankAccountName', 'bankAccountNumber', 'paystackLink'] as const;
  for (const k of moneyKeys) {
    const v = learnable(patch.money?.[k]);
    if (!v || v === next.money[k]) continue;
    if (k === 'currency' && !CURRENCIES_VALID.includes(v)) continue;
    next.money[k] = v;
  }

  const primary = learnable(patch.colors?.primary);
  if (primary && /^#[0-9a-f]{6}$/i.test(primary) && primary.toLowerCase() !== next.colors.primary.toLowerCase()) {
    next.colors.primary = primary.toLowerCase();
  }
  const accent = learnable(patch.colors?.accent);
  if (accent && /^#[0-9a-f]{6}$/i.test(accent) && accent.toLowerCase() !== next.colors.accent.toLowerCase()) {
    next.colors.accent = accent.toLowerCase();
  }
  const heading = learnable(patch.fonts?.heading);
  if (heading && heading !== next.fonts.heading) next.fonts.heading = heading;
  const body = learnable(patch.fonts?.body);
  if (body && body !== next.fonts.body) next.fonts.body = body;

  const strip = (k: BrandKit) => JSON.stringify({ ...k, updatedAt: 0 });
  if (strip(next) === strip(current)) return false;
  next.updatedAt = Date.now();
  saveBrandKit(next);
  return true;
}

export function brandKitHasAnything(kit: BrandKit): boolean {
  const vals = [
    ...Object.values(kit.identity),
    kit.colors.primary,
    kit.colors.accent,
    kit.fonts.heading,
    kit.fonts.body,
    ...Object.values(kit.money),
  ];
  return (
    vals.some((v) => Boolean(v)) ||
    Boolean(kit.logoDataUrl) ||
    Boolean(kit.signature?.drawingUrl || kit.signature?.signatureName)
  );
}

/**
 * Downscale any image to a compact PNG data URL (~512px max side keeps
 * localStorage — and the encrypted transfer payload — small while still
 * crisp on invoices). PNG preserves logo transparency.
 */
export function fileToLogoDataUrl(file: File, maxPx = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image.'));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
