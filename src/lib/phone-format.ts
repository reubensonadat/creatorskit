/**
 * Formatting and sanitization utilities for Mobile Money and Phone Numbers.
 *
 * CRITICAL RULE (Ghana MTN / Telecel / AT Money & Telecom SMS / USSD):
 * 1. VISUAL DISPLAY: Numbers should show readable spacing (e.g. "024 123 4567" or "+233 24 123 4567")
 *    so humans can read and verify digits easily.
 * 2. COPY TO CLIPBOARD: Numbers MUST NEVER contain spaces, hyphens, or invalid symbols.
 *    In USSD sessions (*170# on MTN, *110# on Telecel) and telecom SMS prompts, any space
 *    or '+' symbol causes the transaction prompt to immediately reject the recipient number.
 */

/**
 * Formats a phone or Mobile Money number visually with comfortable spacing.
 * E.g.:
 * - "0241234567" -> "024 123 4567"
 * - "0540000000" -> "054 000 0000"
 * - "+233241234567" -> "+233 24 123 4567"
 * - "08012345678" -> "0801 234 5678" (Nigeria)
 */
export function formatPhoneNumberForDisplay(val?: string | null): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (!trimmed) return '';

  // Extract raw digits
  const digits = trimmed.replace(/\D/g, '');

  // Ghana local 10-digit number (starts with 0, e.g. 024XXXXXXX, 055XXXXXXX, 020XXXXXXX)
  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Ghana international 12-digit number (starts with 233)
  if (digits.length === 12 && digits.startsWith('233')) {
    return `+233 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  // Nigeria local 11-digit number (starts with 0, e.g. 080XXXXXXXX, 070XXXXXXXX)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // Nigeria international 13-digit number (starts with 234)
  if (digits.length === 13 && digits.startsWith('234')) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }

  // If already formatted with spaces or custom grouping, clean multiple spaces and return
  return trimmed.replace(/\s+/g, ' ');
}

/**
 * Sanitizes a Mobile Money or phone number for copying to clipboard.
 *
 * CRITICAL BEHAVIOR:
 * - Strips all spaces, non-breaking spaces, zero-width chars, hyphens, and punctuation.
 * - For Ghana numbers:
 *   If provided in international format (+233 24 XXX XXXX or 23324XXXXXXX), converts it
 *   to local 10-digit format (024XXXXXXX) because USSD menus (*170#, *110#) and local SMS
 *   payment gateways in Ghana do NOT accept the '+' symbol or country code.
 * - Result is guaranteed clean, space-free continuous digits ready to paste into USSD or banking apps.
 */
export function sanitizeNumberForCopy(val?: string | null): string {
  if (!val) return '';

  // 1. Strip all spaces, non-breaking spaces, zero-width characters, and common separators
  let clean = val
    .replace(/\s+/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/[-–—_().]/g, '');

  // 2. Normalize Ghana international prefix (+233 or 233) to local '0' format for USSD compatibility
  if (clean.startsWith('+233') && clean.length === 13) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('233') && clean.length === 12) {
    clean = '0' + clean.slice(3);
  }

  // 3. Normalize Nigeria international prefix (+234 or 234) to local '0' format for USSD compatibility
  if (clean.startsWith('+234') && clean.length === 14) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('234') && clean.length === 13) {
    clean = '0' + clean.slice(3);
  }

  return clean;
}

/**
 * Sanitizes bank account numbers for copying (strips all spaces, dashes, and invisible characters).
 */
export function sanitizeAccountForCopy(val?: string | null): string {
  if (!val) return '';
  return val
    .replace(/\s+/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/[-–—_]/g, '');
}
