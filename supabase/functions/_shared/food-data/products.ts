// Turns Open Food Facts and USDA FoodData Central responses into ProductRecords.

import { normalizeGtin, type LabelRegion, type ProductRecord } from '../verdict-engine/index.ts';

/** A product record plus the fields we store but the engine does not need. */
export interface NormalizedProduct extends ProductRecord {
  gtin: string | null;
  categories: string[];
  imageUrl: string | null;
  quantity: string | null;
}

type Json = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Normalize a scanned or stored barcode to 14 digits, or null when it is not a valid barcode shape. */
export function toGtin14(code: string | null | undefined): string | null {
  if (!code) return null;
  return normalizeGtin(code)?.gtin14 ?? null;
}

function offRegion(countries: string[]): LabelRegion {
  if (countries.includes('en:united-states')) return 'us';
  return countries.length > 0 ? 'other' : 'unknown';
}

/** One OFF product object (the "product" field of /api/v2/product, or an item of a search). */
export function normalizeOffProduct(p: Json): NormalizedProduct | null {
  const code = str(p.code);
  if (!code) return null;
  const countries = strArray(p.countries_tags);
  const lastModified = typeof p.last_modified_t === 'number' ? p.last_modified_t : Number(p.last_modified_t);
  return {
    source: 'off',
    sourceId: code,
    gtin: toGtin14(code),
    name: str(p.product_name_en) ?? str(p.product_name),
    brand: str(p.brands)?.split(',')[0]?.trim() ?? null,
    // English text first; OFF often has several languages.
    ingredientsText: str(p.ingredients_text_en) ?? str(p.ingredients_text),
    containsStatement: null,
    mayContainStatement: null,
    allergenTags: strArray(p.allergens_tags),
    traceTags: strArray(p.traces_tags),
    sourceUpdatedAt: Number.isFinite(lastModified) && lastModified > 0 ? new Date(lastModified * 1000).toISOString() : null,
    extraction: 'database',
    confirmed: true,
    labelRegion: offRegion(countries),
    categories: strArray(p.categories_tags),
    imageUrl: str(p.image_front_small_url) ?? str(p.image_front_url),
    quantity: str(p.quantity),
  };
}

/** The whole /api/v2/product/<code> response. Returns null when OFF does not know the product. */
export function normalizeOffResponse(body: Json): NormalizedProduct | null {
  if (body.status !== 1 && body.status !== '1') return null;
  const product = body.product as Json | undefined;
  return product ? normalizeOffProduct({ code: body.code, ...product }) : null;
}

/** A /cgi/search.pl response. */
export function normalizeOffSearch(body: Json): NormalizedProduct[] {
  const products = Array.isArray(body.products) ? (body.products as Json[]) : [];
  return products.map(normalizeOffProduct).filter((p): p is NormalizedProduct => p !== null);
}

function usdaTime(food: Json): string | null {
  const dates = [str(food.modifiedDate), str(food.publishedDate)].filter((d): d is string => d !== null);
  const times = dates.map((d) => Date.parse(d)).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

/**
 * Pick the record for one barcode out of a FoodData Central /foods/search response.
 * The search is full-text, so only foods whose gtinUpc normalizes to the same GTIN count.
 * When several match (resubmissions), the most recently updated wins.
 */
export function normalizeUsdaSearch(body: Json, gtin14: string): NormalizedProduct | null {
  const foods = Array.isArray(body.foods) ? (body.foods as Json[]) : [];
  const matches = foods.filter((f) => f.dataType === 'Branded' && toGtin14(str(f.gtinUpc)) === gtin14);
  if (matches.length === 0) return null;
  matches.sort((a, b) => (Date.parse(usdaTime(b) ?? '') || 0) - (Date.parse(usdaTime(a) ?? '') || 0));
  const f = matches[0]!;
  const country = str(f.marketCountry);
  return {
    source: 'usda',
    sourceId: String(f.fdcId),
    gtin: gtin14,
    name: str(f.description),
    brand: str(f.brandName) ?? str(f.brandOwner),
    ingredientsText: str(f.ingredients),
    containsStatement: null,
    mayContainStatement: null,
    allergenTags: [],
    traceTags: [],
    sourceUpdatedAt: usdaTime(f),
    extraction: 'database',
    confirmed: true,
    labelRegion: !country || /united states/i.test(country) ? 'us' : 'other',
    categories: str(f.foodCategory) ? [str(f.foodCategory)!] : [],
    imageUrl: null,
    quantity: str(f.householdServingFullText),
  };
}

/** Stable short hash of normalized ingredient text, to detect changes. Not for security. */
export function ingredientsHash(text: string | null | undefined): string {
  const s = (text ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  // cyrb53: two 32-bit FNV-style lanes, combined to 53 bits; plenty for change detection.
  let h1 = 0xdeadbeef ^ s.length;
  let h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
