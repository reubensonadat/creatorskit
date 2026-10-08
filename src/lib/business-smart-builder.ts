/**
 * src/lib/business-smart-builder.ts
 *
 * Smart AI/NLP Document Generation & Document Ingestion Engine:
 * - Concept A: Natural language prompt parsing & quick guided builder
 * - Concept B: Uploaded document / screenshot reconstruction
 * - Palette Extractor: Extract dominant brand colors from uploaded logos/documents
 */

import JSZip from 'jszip';

export interface ParsedDeliverable {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  platform: 'TikTok' | 'Instagram' | 'YouTube' | 'Podcast' | 'UGC' | 'Event' | 'Other';
}

export interface DocumentSection {
  heading: string;
  lines: string[];
}

export interface ParsedDocumentData {
  clientName?: string;
  clientEmail?: string;
  currency?: 'GHS' | 'NGN' | 'USD' | 'GBP' | 'EUR';
  invoiceNumber?: string;
  receiptNumber?: string;
  items: ParsedDeliverable[];
  totalAmount?: number;
  dueDate?: string;
  issueDate?: string;
  depositPercentage?: number;
  notes?: string;
  extractedColors?: string[];
  docType?: 'invoice' | 'receipt' | 'agreement' | 'letterhead';
  // Full Document / Multi-Page preservation
  fullDocumentText?: string;
  documentSections?: DocumentSection[];
  // Agreement / Contract specifics
  contractTitle?: string;
  contractScope?: string;
  contractCustomTerms?: string;
  contractGoverningLaw?: string;
  contractTemplate?: 'service' | 'business' | 'creator';
  // Letterhead specifics
  letterheadTitle?: string;
  letterheadIntro?: string;
}

// ─────────────────────────────────────────────────────────────
// 1. BRAND COLOR PALETTE EXTRACTION (From Logos, Docs & Photos)
// ─────────────────────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export async function extractColorsFromImage(imageSource: string | File): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const SIZE = 120;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(['#162a45', '#e15b3c']);

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
        let visibleCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue; // Skip transparency

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Skip pure black/white to capture actual brand colors
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 245 || brightness < 15) continue;

          visibleCount++;
          const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
          const bucket = buckets.get(key);
          if (bucket) {
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
            bucket.n++;
          } else {
            buckets.set(key, { r, g, b, n: 1 });
          }
        }

        if (visibleCount === 0) {
          return resolve(['#162a45', '#e15b3c', '#2563EB', '#059669']);
        }

        const sorted = [...buckets.values()]
          .sort((a, b) => b.n - a.n)
          .slice(0, 5)
          .map((b) => rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n));

        resolve(sorted.length > 0 ? sorted : ['#162a45', '#e15b3c']);
      } catch {
        resolve(['#162a45', '#e15b3c']);
      }
    };

    img.onerror = () => resolve(['#162a45', '#e15b3c']);

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(['#162a45', '#e15b3c']);
      reader.readAsDataURL(imageSource);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 2. CONCEPT A: NATURAL LANGUAGE & PROMPT PARSER
// ─────────────────────────────────────────────────────────────

export function parseNaturalPrompt(prompt: string): ParsedDocumentData {
  const result: ParsedDocumentData = {
    items: [],
  };

  const text = prompt.trim();
  if (!text) return result;

  // 1. Detect Currency
  if (/(\$|usd|dollars?)/i.test(text)) result.currency = 'USD';
  else if (/(gh¢|ghs|cedis?)/i.test(text)) result.currency = 'GHS';
  else if (/(₦|ngn|naira)/i.test(text)) result.currency = 'NGN';
  else if (/(£|gbp|pounds?)/i.test(text)) result.currency = 'GBP';
  else if (/(€|eur|euros?)/i.test(text)) result.currency = 'EUR';

  // 2. Detect Client Name
  // Matches "for [Client Name]" or "to [Client Name]" or "client: [Client Name]"
  const clientMatch = text.match(/(?:for|to|client[:\s]+)\s+([A-Z0-9][A-Za-z0-9&.\-'\s]{1,30}?)(?=\s+(?:for|\$|gh|₦|due|with|dated|total|at|\d|$|,|\.))/i);
  if (clientMatch && clientMatch[1]) {
    const rawClient = clientMatch[1].trim();
    if (!/^(the|a|an|usd|ghs|ngn|deal|package|invoice|receipt)$/i.test(rawClient)) {
      result.clientName = rawClient;
    }
  }

  // 3. Detect Due Date / Payment Window
  const dueDaysMatch = text.match(/due\s+(?:in\s+)?(\d+)\s*days?/i);
  if (dueDaysMatch) {
    const days = parseInt(dueDaysMatch[1], 10);
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    result.dueDate = d.toISOString().split('T')[0];
  } else if (/due\s+on\s+([A-Za-z0-9,\s\-]+)/i.test(text)) {
    const rawDate = text.match(/due\s+on\s+([A-Za-z0-9,\s\-]+)/i)?.[1];
    if (rawDate) {
      const parsed = Date.parse(rawDate);
      if (!isNaN(parsed)) result.dueDate = new Date(parsed).toISOString().split('T')[0];
    }
  }

  // 4. Detect Deposit / Upfront Percentage
  const depositMatch = text.match(/(\d+)%\s*(?:deposit|upfront|advance)/i);
  if (depositMatch) {
    result.depositPercentage = parseInt(depositMatch[1], 10);
  }

  // 5. Parse Deliverables & Line Items
  // Look for patterns like: "2 TikToks for $1000", "1x Reel ($1500)", "Photography package 4000"
  const itemRegex = /(?:(\d+)\s*x?\s+)?([A-Za-z0-9\s&/\-]{3,40}?)\s*(?:for|at|[:=]|\()\s*[\$GH₵₦£€]?\s*([\d,]+(?:\.\d{2})?)/gi;
  let match: RegExpExecArray | null;
  const items: ParsedDeliverable[] = [];

  while ((match = itemRegex.exec(text)) !== null) {
    const qty = match[1] ? parseInt(match[1], 10) : 1;
    let desc = match[2].trim().replace(/^(and|plus|,)\s*/i, '');
    const rate = parseFloat(match[3].replace(/,/g, ''));

    if (rate > 0 && desc.length > 2 && !/^(total|deposit|balance|due)$/i.test(desc)) {
      let platform: ParsedDeliverable['platform'] = 'Other';
      if (/tiktok/i.test(desc)) platform = 'TikTok';
      else if (/instagram|reel|story/i.test(desc)) platform = 'Instagram';
      else if (/youtube|short/i.test(desc)) platform = 'YouTube';
      else if (/podcast/i.test(desc)) platform = 'Podcast';
      else if (/ugc|raw/i.test(desc)) platform = 'UGC';
      else if (/event|hosting/i.test(desc)) platform = 'Event';

      items.push({
        id: `gen-${Date.now()}-${items.length}`,
        description: `${qty > 1 ? qty + 'x ' : ''}${desc.toUpperCase()}`,
        quantity: qty,
        rate: Math.round(rate / qty),
        platform,
      });
    }
  }

  // Fallback: If no item regex matched but total amount exists
  if (items.length === 0) {
    const totalMatch = text.match(/[\$GH₵₦£€]?\s*([\d,]+(?:\.\d{2})?)\s*(?:usd|ghs|ngn|dollars?|cedis?|naira)?/i);
    const amount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 2500;
    items.push({
      id: `gen-${Date.now()}-1`,
      description: 'BRAND COLLABORATION & CONTENT DELIVERABLES',
      quantity: 1,
      rate: isNaN(amount) || amount === 0 ? 2500 : amount,
      platform: 'TikTok',
    });
  }

  result.items = items;

  // 6. Detect Document Type (Leave undefined if neutral, so current tab is preserved)
  if (/receipt|proof of payment|paid in full|payment received|acknowledged/i.test(text)) {
    result.docType = 'receipt';
  } else if (/agreement|contract|nda|scope of work|rights|licensing/i.test(text)) {
    result.docType = 'agreement';
  } else if (/letterhead|proposal|pitch deck|media kit/i.test(text)) {
    result.docType = 'letterhead';
  } else if (/invoice|bill to|tax invoice/i.test(text)) {
    result.docType = 'invoice';
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// 3. WORD (.DOCX) EXTRACTION VIA JSZIP
// ─────────────────────────────────────────────────────────────

export async function extractTextFromDocx(file: File | Blob | ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    const loaded = await zip.loadAsync(file);
    const docXmlFile = loaded.file('word/document.xml');
    if (!docXmlFile) return '';
    const xml = await docXmlFile.async('text');

    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, 'text/xml');
        const paragraphs = xmlDoc.getElementsByTagName('w:p');
        const lines: string[] = [];
        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          let pText = '';
          const textNodes = p.getElementsByTagName('w:t');
          for (let j = 0; j < textNodes.length; j++) {
            pText += textNodes[j].textContent || '';
          }
          if (pText.trim()) {
            lines.push(pText.trim());
          }
        }
        if (lines.length > 0) return lines.join('\n');
      } catch { }
    }

    const text = xml
      .replace(/<w:br[^>]*>/gi, '\n')
      .replace(/<\/w:p>/gi, '\n')
      .replace(/<w:tab[^>]*>/gi, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    return text.trim();
  } catch (err) {
    console.error('Failed to parse .docx with JSZip:', err);
    return '';
  }
}

// ─────────────────────────────────────────────────────────────
// 4. CONCEPT B: DOCUMENT RECONSTRUCTION FROM RAW TEXT / OCR / DOCX
// ─────────────────────────────────────────────────────────────

export function reconstructDocumentFromText(rawText: string): ParsedDocumentData {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result: ParsedDocumentData = {
    items: [],
    fullDocumentText: rawText,
  };

  if (lines.length === 0) return result;

  // Extract all document sections (headings + clause paragraphs)
  const sections: DocumentSection[] = [];
  let currentSection: DocumentSection = { heading: '', lines: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = (
      (line === line.toUpperCase() && line.length > 3 && line.length < 80 && !line.includes(':') && !line.startsWith('•') && !/^\d+[\s,.]/.test(line)) ||
      /^(?:section|article|[0-9]+\.)\s+[A-Z]/i.test(line)
    );

    if (isHeading && currentSection.lines.length > 0) {
      sections.push({ ...currentSection });
      currentSection = { heading: line, lines: [] };
    } else if (isHeading && !currentSection.heading) {
      currentSection.heading = line;
    } else {
      currentSection.lines.push(line);
    }
  }
  if (currentSection.heading || currentSection.lines.length > 0) {
    sections.push(currentSection);
  }
  if (sections.length > 1) {
    result.documentSections = sections;
  }

  // 1. Detect Document Category
  const isAgreement = /agreement|contract|operating\s+agreement|revenue[\s\-_]*sharing|commercial\s+terms|memorandum|nda/i.test(rawText) || sections.length >= 3;
  const isReceipt = !isAgreement && /receipt|proof of payment|received from|amount received|paid in full/i.test(rawText);
  const isLetterhead = !isAgreement && /letterhead|proposal|pitch kit|media kit|campaign proposal/i.test(rawText);

  if (isAgreement) {
    result.docType = 'agreement';
    if (/revenue[\s\-_]*sharing|operating|commercial|fleet|business/i.test(rawText) || sections.length >= 3) {
      result.contractTemplate = 'business';
    } else if (/creator|influencer|sponsorship|social/i.test(rawText)) {
      result.contractTemplate = 'creator';
    } else {
      result.contractTemplate = 'service';
    }
  } else if (isReceipt) {
    result.docType = 'receipt';
  } else if (isLetterhead) {
    result.docType = 'letterhead';
  } else if (/invoice|tax invoice|bill to/i.test(rawText)) {
    result.docType = 'invoice';
  }

  // 2. Extract Document Title
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const line = lines[i];
    if (/(?:agreement|contract|proposal|invoice|receipt)/i.test(line) && line.length > 5 && line.length < 80) {
      if (isAgreement) result.contractTitle = line.toUpperCase();
      else if (isLetterhead) result.letterheadTitle = line;
      break;
    }
  }

  // 3. Currency Search
  for (const line of lines) {
    if (/(gh¢|ghs|cedi)/i.test(line)) { result.currency = 'GHS'; break; }
    if (/(₦|ngn|naira)/i.test(line)) { result.currency = 'NGN'; break; }
    if (/(\$|usd)/i.test(line)) { result.currency = 'USD'; break; }
    if (/(£|gbp)/i.test(line)) { result.currency = 'GBP'; break; }
    if (/(€|eur)/i.test(line)) { result.currency = 'EUR'; break; }
  }

  // 4. Invoice / Receipt Number
  for (const line of lines) {
    const invMatch = line.match(/(?:invoice|inv|bill)[\s#:]*([A-Za-z0-9\-_]+)/i);
    if (invMatch) { result.invoiceNumber = invMatch[1]; break; }
    const recMatch = line.match(/(?:receipt|rec)[\s#:]*([A-Za-z0-9\-_]+)/i);
    if (recMatch) { result.receiptNumber = recMatch[1]; break; }
  }

  // 5. Client / Partner Name Search
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const line = lines[i];
    const betweenMatch = line.match(/between\s+([A-Za-z0-9\s.,&'\-]+?)\s+(?:and|\&)\s+([A-Za-z0-9\s.,&'\-]+)/i);
    if (betweenMatch) {
      result.clientName = betweenMatch[2].trim().replace(/\s+(?:dated|effective).*/i, '');
      break;
    }
    const billToMatch = line.match(/(?:bill\s+to|client|to|billed\s+to|customer|operator|partner|party\s+b)[:\s]+(.+)/i);
    if (billToMatch && billToMatch[1]) {
      result.clientName = billToMatch[1].trim();
      break;
    }
  }

  // 6. Agreement Scope & Custom Clauses Extraction
  if (isAgreement) {
    // Look for Scope / Purpose / Operations paragraphs
    const scopeLines: string[] = [];
    const customClauseLines: string[] = [];

    for (const line of lines) {
      if (/^(?:1\.|2\.|section\s+1|scope|purpose|operations|recitals)[:\s]/i.test(line) && line.length > 20) {
        scopeLines.push(line);
      }
      if (/(revenue|share|sharing|split|percentage|remittance|commission|kill fee)/i.test(line) && line.length > 15) {
        customClauseLines.push(line);
      }
      const govMatch = line.match(/governed\s+by.*laws\s+of\s+([A-Za-z\s]+)/i);
      if (govMatch) {
        result.contractGoverningLaw = govMatch[1].trim();
      }
    }

    if (scopeLines.length > 0) {
      result.contractScope = scopeLines.slice(0, 3).join(' ');
    } else if (result.contractTitle) {
      result.contractScope = `Comprehensive operating framework and deliverables under the ${result.contractTitle}.`;
    }

    if (customClauseLines.length > 0) {
      result.contractCustomTerms = customClauseLines.slice(0, 3).join('\n• ');
    }

    // Look for revenue percentage split
    const splitMatch = rawText.match(/(\d+)%\s*(?:revenue|split|share|profit|remittance)/i);
    if (splitMatch) {
      result.depositPercentage = parseInt(splitMatch[1], 10);
    }
  }

  // 7. Date Search
  const dateRegex = /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/;
  for (const line of lines) {
    if (/date/i.test(line)) {
      const dMatch = line.match(dateRegex);
      if (dMatch) {
        const parsed = Date.parse(dMatch[1]);
        if (!isNaN(parsed)) {
          result.issueDate = new Date(parsed).toISOString().split('T')[0];
          break;
        }
      }
    }
  }

  // 8. Line Item Extraction: Look for lines containing description and numeric rate
  const candidateItems: ParsedDeliverable[] = [];
  for (const line of lines) {
    if (/^(subtotal|total|tax|vat|balance|amount due|paid)/i.test(line)) continue;

    const lineMatch = line.match(/^([0-9]+[xX]?\s+)?(.+?)[\s\t]+[\$GH₵₦£€]?\s*([0-9,]+(?:\.[0-9]{2})?)$/);
    if (lineMatch) {
      const qty = lineMatch[1] ? parseInt(lineMatch[1], 10) : 1;
      const desc = lineMatch[2].trim();
      const rate = parseFloat(lineMatch[3].replace(/,/g, ''));

      if (desc.length > 2 && rate > 0) {
        let platform: ParsedDeliverable['platform'] = 'Other';
        if (/tiktok/i.test(desc)) platform = 'TikTok';
        else if (/instagram|reel/i.test(desc)) platform = 'Instagram';
        else if (/youtube/i.test(desc)) platform = 'YouTube';
        else if (/podcast/i.test(desc)) platform = 'Podcast';
        else if (/ugc/i.test(desc)) platform = 'UGC';
        else if (/event/i.test(desc)) platform = 'Event';

        candidateItems.push({
          id: `rec-${Date.now()}-${candidateItems.length}`,
          description: desc.toUpperCase(),
          quantity: qty,
          rate: Math.round(rate / qty),
          platform,
        });
      }
    }
  }

  // 9. If Agreement has no numeric price lines, extract numbered operational sections as deliverables
  if (candidateItems.length === 0 && isAgreement) {
    const numberedSections = lines.filter((l) => /^[0-9]+\.\s+[A-Za-z]/.test(l) && l.length < 80);
    if (numberedSections.length > 0) {
      numberedSections.slice(0, 5).forEach((sec, idx) => {
        candidateItems.push({
          id: `agr-sec-${Date.now()}-${idx}`,
          description: sec.replace(/^[0-9]+\.\s*/, '').toUpperCase(),
          quantity: 1,
          rate: 0,
          platform: 'Other',
        });
      });
    } else {
      candidateItems.push(
        { id: `agr-1`, description: 'PRIMARY OPERATIONS & MANAGEMENT', quantity: 1, rate: 0, platform: 'Other' },
        { id: `agr-2`, description: 'REVENUE COLLECTION & REMITTANCE', quantity: 1, rate: 0, platform: 'Other' },
        { id: `agr-3`, description: 'STANDARDS & REGULATORY COMPLIANCE', quantity: 1, rate: 0, platform: 'Other' }
      );
    }
  }

  if (candidateItems.length > 0) {
    result.items = candidateItems;
  } else {
    // Fallback: parse using natural language engine on aggregated text
    const fallback = parseNaturalPrompt(rawText);
    if (fallback.items.length > 0) result.items = fallback.items;
    if (fallback.clientName && !result.clientName) result.clientName = fallback.clientName;
  }

  return result;
}
