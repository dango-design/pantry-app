// Barcode helpers. Every barcode is stored as a 14-digit GTIN.

export interface GtinInfo {
  /** 14 digits, zero-padded. */
  gtin14: string;
  /** The check digit matches. */
  valid: boolean;
  /** Price or weight barcodes printed in-store (deli, bakery). Not a product identity. */
  restrictedCirculation: boolean;
  /** 12-digit UPC-A form when the GTIN has one, else null. */
  upcA: string | null;
}

export function checkDigit(body: string): number {
  // GS1: from the right, weights alternate 3, 1, 3, 1...
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = body.charCodeAt(body.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidGtin(digits: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return false;
  return checkDigit(digits.slice(0, -1)) === Number(digits.slice(-1));
}

/** Expand an 8-digit UPC-E code to its 12-digit UPC-A form. Returns null if it is not UPC-E. */
export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const ns = code[0]!;
  const d = code.slice(1, 7);
  const check = code[7]!;
  const last = d[5]!;
  let body: string;
  if (last === '0' || last === '1' || last === '2') {
    body = d.slice(0, 2) + last + '0000' + d.slice(2, 5);
  } else if (last === '3') {
    body = d.slice(0, 3) + '00000' + d.slice(3, 5);
  } else if (last === '4') {
    body = d.slice(0, 4) + '00000' + d[4];
  } else {
    body = d.slice(0, 5) + '0000' + last;
  }
  const upcA = ns + body + check;
  return isValidGtin(upcA) ? upcA : null;
}

/**
 * Normalize any scanned EAN-13, EAN-8, UPC-A or UPC-E to GTIN-14.
 * hint tells us an 8-digit code is UPC-E (scanners report the symbology).
 */
export function normalizeGtin(raw: string, hint?: 'upc_e' | 'ean8'): GtinInfo | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0 || digits.length > 14) return null;
  let full = digits;
  if (digits.length === 8 && hint !== 'ean8') {
    const expanded = expandUpcE(digits);
    if (expanded && (hint === 'upc_e' || !isValidGtin(digits))) full = expanded;
  } else if (digits.length === 6 || digits.length === 7) {
    // UPC-E printed without number system or check digit is ambiguous; refuse.
    return null;
  } else if (digits.length < 8 || (digits.length > 8 && digits.length < 12)) {
    return null;
  }
  const gtin14 = full.padStart(14, '0');
  const ean13 = gtin14.slice(1);
  const prefix2 = ean13.slice(0, 2);
  const restrictedCirculation =
    gtin14[0] === '0' && (prefix2 === '02' || prefix2 === '04' || (prefix2 >= '20' && prefix2 <= '29'));
  return {
    gtin14,
    valid: isValidGtin(gtin14),
    restrictedCirculation,
    upcA: gtin14.startsWith('00') ? gtin14.slice(2) : null,
  };
}
