// HTTP calls to the four public data sources. Each call has a timeout and returns parsed results.
// Rate limits (callers must pace themselves):
//   USDA FoodData Central: 1,000 requests/hour per key. Keep the key on the server.
//   Open Food Facts: 15 product reads/min and 10 searches/min per IP; always send a User-Agent
//   with app name, version and a contact email.
//   openFDA: 240 requests/min without a key.
//   FSIS: returns the whole dataset on every call; poll once a day.

import type { Dictionary } from '@allergy/verdict-engine';

import { normalizeOffResponse, normalizeOffSearch, normalizeUsdaSearch, type NormalizedProduct } from './products.ts';
import { parseFsisRecalls, parseOpenFdaEnforcement, type RecallRecord } from './recalls.ts';

export const OFF_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'ingredients_text',
  'ingredients_text_en',
  'allergens_tags',
  'traces_tags',
  'countries_tags',
  'last_modified_t',
  'categories_tags',
  'image_front_small_url',
  'quantity',
].join(',');

export class SourceError extends Error {
  constructor(
    public readonly source: string,
    message: string,
    public readonly status?: number,
  ) {
    super(`${source}: ${message}`);
  }
}

async function getJson(source: string, url: string, init: { timeoutMs: number; headers?: Record<string, string> }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', ...init.headers }, signal: controller.signal });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new SourceError(source, `not JSON (HTTP ${res.status})`, res.status);
    }
    return { status: res.status, body };
  } catch (e) {
    if (e instanceof SourceError) throw e;
    if ((e as Error).name === 'AbortError') throw new SourceError(source, `timed out after ${init.timeoutMs} ms`);
    throw new SourceError(source, (e as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

/** OFF stores UPC-A as 13 digits and EAN-8 as 8 digits. */
export function offCode(gtin14: string): string {
  if (gtin14.startsWith('000000')) return gtin14.slice(6);
  return gtin14.startsWith('0') ? gtin14.slice(1) : gtin14;
}

/**
 * How to send the app's name and contact to Open Food Facts. Browsers refuse to let a web page set
 * User-Agent, so web pages send it as X-User-Agent, which OFF also accepts.
 */
export type OffUserAgentHeader = 'User-Agent' | 'X-User-Agent';

export interface OffRequestOptions {
  userAgent: string;
  /** Defaults to "User-Agent". Use "X-User-Agent" in a browser. */
  userAgentHeader?: OffUserAgentHeader;
  timeoutMs?: number;
}

function offHeaders(opts: OffRequestOptions): Record<string, string> {
  return { [opts.userAgentHeader ?? 'User-Agent']: opts.userAgent };
}

export async function fetchOffProduct(gtin14: string, opts: OffRequestOptions): Promise<NormalizedProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${offCode(gtin14)}?fields=${OFF_FIELDS}`;
  const { status, body } = await getJson('Open Food Facts', url, { timeoutMs: opts.timeoutMs ?? 4000, headers: offHeaders(opts) });
  if (status === 404) return null;
  if (status >= 400) throw new SourceError('Open Food Facts', `HTTP ${status}`, status);
  const product = normalizeOffResponse(body as Record<string, unknown>);
  if (product) product.gtin = gtin14;
  return product;
}

export async function searchOff(
  query: string,
  opts: OffRequestOptions & { page?: number; pageSize?: number },
): Promise<{ products: NormalizedProduct[]; count: number }> {
  const params = new URLSearchParams({
    search_terms: query,
    tagtype_0: 'countries',
    tag_contains_0: 'contains',
    tag_0: 'united-states',
    json: '1',
    page: String(opts.page ?? 1),
    page_size: String(opts.pageSize ?? 24),
    fields: OFF_FIELDS,
  });
  const { status, body } = await getJson('Open Food Facts', `https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
    timeoutMs: opts.timeoutMs ?? 8000,
    headers: offHeaders(opts),
  });
  if (status >= 400) throw new SourceError('Open Food Facts', `HTTP ${status}`, status);
  const b = body as Record<string, unknown>;
  return { products: normalizeOffSearch(b), count: Number(b.count ?? 0) };
}

/** The forms FoodData Central may store a barcode under, most common first. */
export function usdaQueries(gtin14: string): string[] {
  const forms = [gtin14.startsWith('00') ? gtin14.slice(2) : null, gtin14, gtin14.startsWith('0') ? gtin14.slice(1) : null];
  return [...new Set(forms.filter((f): f is string => f !== null))];
}

/**
 * FDC search is full text: a made-up code returns thousands of unrelated foods, so only foods whose
 * gtinUpc equals the barcode count. Most US barcodes are stored as 12-digit UPC-A, some only as 14 digits.
 */
export async function fetchUsdaProduct(gtin14: string, opts: { apiKey: string; timeoutMs?: number }): Promise<NormalizedProduct | null> {
  for (const query of usdaQueries(gtin14).slice(0, 2)) {
    const params = new URLSearchParams({ query, dataType: 'Branded', pageSize: '10', api_key: opts.apiKey });
    const { status, body } = await getJson('USDA FoodData Central', `https://api.nal.usda.gov/fdc/v1/foods/search?${params}`, {
      timeoutMs: opts.timeoutMs ?? 4000,
    });
    if (status === 429) throw new SourceError('USDA FoodData Central', 'rate limit reached', status);
    if (status >= 400) throw new SourceError('USDA FoodData Central', `HTTP ${status}`, status);
    const found = normalizeUsdaSearch(body as Record<string, unknown>, gtin14);
    if (found) return found;
  }
  return null;
}

/** openFDA food enforcement reports between two dates (YYYYMMDD), following pagination. */
export async function fetchOpenFdaRecalls(
  from: string,
  to: string,
  dictionary: Dictionary,
  opts: { apiKey?: string; timeoutMs?: number; maxPages?: number } = {},
): Promise<RecallRecord[]> {
  const out: RecallRecord[] = [];
  const limit = 100;
  for (let page = 0; page < (opts.maxPages ?? 10); page++) {
    const params = new URLSearchParams({ search: `report_date:[${from} TO ${to}]`, limit: String(limit), skip: String(page * limit) });
    if (opts.apiKey) params.set('api_key', opts.apiKey);
    const { status, body } = await getJson('openFDA', `https://api.fda.gov/food/enforcement.json?${params}`, { timeoutMs: opts.timeoutMs ?? 15000 });
    if (status === 404) break; // "No matches found"
    if (status >= 400) throw new SourceError('openFDA', `HTTP ${status}`, status);
    const batch = parseOpenFdaEnforcement(body as Record<string, unknown>, dictionary);
    out.push(...batch);
    const total = Number((body as { meta?: { results?: { total?: number } } }).meta?.results?.total ?? 0);
    if ((page + 1) * limit >= total || batch.length === 0) break;
  }
  return out;
}

/**
 * FSIS blocked automated requests from the development Mac with HTTP 403 on 2026-11-08, so this has
 * not been seen to work. Callers treat a SourceError here as "FSIS skipped", not as a failed sync.
 * It identifies itself honestly; it does not pretend to be a browser.
 */
export async function fetchFsisRecalls(dictionary: Dictionary, opts: { timeoutMs?: number; userAgent: string }): Promise<RecallRecord[]> {
  const { status, body } = await getJson('FSIS', 'https://www.fsis.usda.gov/fsis/api/recall/v/1', {
    timeoutMs: opts.timeoutMs ?? 30000,
    headers: { 'User-Agent': opts.userAgent },
  });
  if (status >= 400) throw new SourceError('FSIS', `HTTP ${status}`, status);
  return parseFsisRecalls(body, dictionary);
}
