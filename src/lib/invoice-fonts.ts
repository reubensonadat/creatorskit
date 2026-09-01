/**
 * Google Fonts & Financial Typography Utilities for CreatorKit Invoice Generator
 * Uses canonical GOOGLE_FONTS_LIST from match-cut/google-fonts.
 */

import { GOOGLE_FONTS_LIST, GoogleFontOption, getGoogleFontsStylesheetUrl } from '@/app/match-cut/google-fonts';

export { GOOGLE_FONTS_LIST, getGoogleFontsStylesheetUrl };
export type { GoogleFontOption };

/**
 * Injects Google Font link tags dynamically if not already loaded
 */
export function injectInvoiceGoogleFont(fontFamily: string) {
  if (typeof document === 'undefined') return;
  const slug = fontFamily.replace(/ /g, '+');
  const id = `gfont-inv-${slug.toLowerCase()}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  // crossorigin makes cssRules readable so html-to-image can embed fonts during export
  link.crossOrigin = 'anonymous';
  link.href = `https://fonts.googleapis.com/css2?family=${slug}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

/**
 * Converts numbers to written English words (e.g. 1650.50 => "ONE THOUSAND SIX HUNDRED FIFTY USD AND 50 CENTS")
 */
export function numberToWords(amount: number, currencyCode: string = 'USD'): string {
  if (isNaN(amount) || amount === 0) {
    return `ZERO ${currencyCode.toUpperCase()} AND 00 CENTS`;
  }

  const ones = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ];

  const tens = [
    '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'
  ];

  function convertHundreds(n: number): string {
    let str = '';
    if (n >= 100) {
      str += `${ones[Math.floor(n / 100)]} HUNDRED `;
      n %= 100;
    }
    if (n >= 20) {
      str += `${tens[Math.floor(n / 10)]} `;
      n %= 10;
    }
    if (n > 0) {
      str += `${ones[n]} `;
    }
    return str.trim();
  }

  const intPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - intPart) * 100);

  let result = '';

  if (intPart >= 1000000) {
    const millions = Math.floor(intPart / 1000000);
    result += `${convertHundreds(millions)} MILLION `;
  }
  if (intPart >= 1000) {
    const thousands = Math.floor((intPart % 1000000) / 1000);
    if (thousands > 0) {
      result += `${convertHundreds(thousands)} THOUSAND `;
    }
  }
  const remaining = intPart % 1000;
  if (remaining > 0 || result === '') {
    result += `${convertHundreds(remaining)} `;
  }

  const cents = decimalPart.toString().padStart(2, '0');
  return `${result.trim()} ${currencyCode.toUpperCase()} AND ${cents} CENTS`.replace(/\s+/g, ' ');
}
