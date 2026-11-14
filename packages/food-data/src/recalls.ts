// Normalizes FDA (openFDA food enforcement) and USDA FSIS recalls, finds allergens in the reason
// text, and matches recalls to products by UPC or, less reliably, by brand and name.

import {
  compileDictionary,
  findTerms,
  isValidGtin,
  normalizeText,
  type Dictionary,
} from '@allergy/verdict-engine';

export interface RecallRecord {
  agency: 'fda' | 'fsis';
  recallNumber: string;
  reason: string | null;
  productDescription: string | null;
  codeInfo: string | null;
  classification: string | null;
  status: string | null;
  /** YYYY-MM-DD */
  reportDate: string | null;
  firm: string | null;
  /** Valid GTIN-14s found in the description and code info. */
  upcs: string[];
  allergensMentioned: string[];
  raw: unknown;
}

type Json = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** "20261028" or "2026-10-28" or "10/28/2026" -> "2026-10-28". */
export function isoDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`;
  return null;
}

/**
 * Pull UPC/EAN codes out of free text such as "UPC 0 12345 67890 5" or "UPC: 071072012349".
 * Only digit runs of 12-14 digits (spaces and dashes allowed inside) with a valid check digit count.
 */
export function extractUpcs(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const m of text.matchAll(/(?<![\d])(\d[\d\s-]{10,20}\d)(?![\d])/g)) {
    const digits = m[1]!.replace(/[\s-]/g, '');
    if (digits.length >= 12 && digits.length <= 14 && isValidGtin(digits)) found.add(digits.padStart(14, '0'));
  }
  return [...found];
}

/** Allergens named in a recall reason or summary, e.g. "undeclared milk and soy". */
export function recallAllergens(text: string | null | undefined, dictionary: Dictionary): string[] {
  if (!text) return [];
  const compiled = compileDictionary(dictionary);
  const normalized = normalizeText(text);
  const out = new Set<string>();
  for (const m of findTerms(normalized, compiled, 'statement')) {
    if (m.term.strength !== 'none') out.add(m.term.allergenId);
  }
  return [...out].sort();
}

/** openFDA /food/enforcement.json response -> recalls. A 404 "No matches found" body gives []. */
export function parseOpenFdaEnforcement(body: Json, dictionary: Dictionary): RecallRecord[] {
  const results = Array.isArray(body.results) ? (body.results as Json[]) : [];
  return results
    .filter((r) => str(r.recall_number))
    .map((r) => {
      const description = str(r.product_description);
      const codeInfo = [str(r.code_info), str(r.more_code_info)].filter(Boolean).join(' ') || null;
      const reason = str(r.reason_for_recall);
      return {
        agency: 'fda' as const,
        recallNumber: str(r.recall_number)!,
        reason,
        productDescription: description,
        codeInfo,
        classification: str(r.classification),
        status: str(r.status),
        reportDate: isoDate(r.report_date),
        firm: str(r.recalling_firm),
        upcs: [...new Set([...extractUpcs(description), ...extractUpcs(codeInfo)])],
        allergensMentioned: recallAllergens(reason, dictionary),
        raw: r,
      };
    });
}

/**
 * FSIS recall API (https://www.fsis.usda.gov/fsis/api/recall/v/1) -> recalls. It returns every recall
 * ever published, so callers diff against what they already stored.
 */
export function parseFsisRecalls(body: unknown, dictionary: Dictionary): RecallRecord[] {
  const items = Array.isArray(body) ? (body as Json[]) : [];
  return items
    .filter((r) => str(r.field_recall_number))
    .map((r) => {
      const summary = str(r.field_summary)?.replace(/<[^>]+>/g, ' ') ?? null;
      const products = str(r.field_product_items)?.replace(/<[^>]+>/g, ' ') ?? null;
      const reasonText = [str(r.field_recall_reason), summary].filter(Boolean).join('. ');
      return {
        agency: 'fsis' as const,
        recallNumber: str(r.field_recall_number)!,
        reason: str(r.field_recall_reason),
        productDescription: [str(r.field_title), products].filter(Boolean).join(' - ') || null,
        codeInfo: products,
        classification: str(r.field_recall_classification) ?? str(r.field_risk_level),
        status: str(r.field_active_notice) === 'True' ? 'Ongoing' : str(r.field_closed_date) ? 'Closed' : null,
        reportDate: isoDate(r.field_recall_date),
        firm: str(r.field_establishment),
        upcs: [...new Set([...extractUpcs(products), ...extractUpcs(summary)])],
        allergensMentioned: recallAllergens(reasonText, dictionary),
        raw: r,
      };
    });
}

export interface ProductRef {
  gtin: string;
  name: string | null;
  brand: string | null;
}

export interface RecallMatch {
  gtin: string;
  matchType: 'upc' | 'name';
  confidence: number;
}

/**
 * Match one recall to products. A UPC match is certain. A name match needs the brand to appear in the
 * recall text and most of the product name's words too; it is shown as "Possible match".
 */
export function matchRecall(recall: RecallRecord, products: ProductRef[]): RecallMatch[] {
  const out: RecallMatch[] = [];
  const upcs = new Set(recall.upcs);
  const haystack = normalizeText([recall.productDescription, recall.firm, recall.codeInfo].filter(Boolean).join(' '));
  for (const p of products) {
    if (upcs.has(p.gtin)) {
      out.push({ gtin: p.gtin, matchType: 'upc', confidence: 1 });
      continue;
    }
    if (!p.brand || !p.name) continue;
    const brand = normalizeText(p.brand);
    if (brand.length < 3 || !new RegExp(`(?<![\\p{L}])${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').test(haystack)) continue;
    const nameWords = normalizeText(p.name).split(/\s+/).filter((w) => w.length > 2 && w !== brand);
    if (nameWords.length === 0) continue;
    const hits = nameWords.filter((w) => haystack.includes(w)).length / nameWords.length;
    if (hits >= 0.6) out.push({ gtin: p.gtin, matchType: 'name', confidence: Math.round(hits * 0.8 * 100) / 100 });
  }
  return out;
}

