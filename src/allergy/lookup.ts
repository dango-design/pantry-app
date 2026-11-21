// Barcode lookup in the browser: the local cache first, then Open Food Facts.
//
// Open Food Facts answers browser requests (access-control-allow-origin: *). USDA needs a key, so USDA
// lookups wait for the lookup-product Edge Function in step 3.

import { fetchOffProduct, type NormalizedProduct } from '@allergy/food-data'
import { normalizeGtin } from '@allergy/verdict-engine'
import { useAllergyStore, recordsForGtin } from './store'
import type { StoredRecord } from './types'

/** Cached records younger than this are used without asking Open Food Facts again. */
const FRESH_MS = 30 * 24 * 60 * 60 * 1000

/** Open Food Facts allows 15 product reads a minute per IP (see packages/food-data/src/fetchers.ts). */
const OFF_READS_PER_MINUTE = 15
const recentOffReads: number[] = []

/** Sent as X-User-Agent, because browsers do not let a page set User-Agent. */
export const OFF_USER_AGENT = `PantryAllergyCheck/0.1 (${import.meta.env.VITE_OFF_CONTACT_EMAIL || 'no contact set'})`

export interface LookupResult {
  /** 14 digits. */
  gtin: string
  /** In-store barcodes (prefixes 02, 04, 20-29): not a product identity. The engine says "ask staff". */
  storeMade: boolean
  records: StoredRecord[]
  /** True when the answer came from the cache because Open Food Facts could not be asked. */
  fromCacheOnly: boolean
  sourceErrors: string[]
}

export class NotABarcodeError extends Error {
  constructor() {
    super('That is not a product barcode. Check the digits and try again.')
  }
}

export function recordKey(r: Pick<StoredRecord, 'source' | 'sourceId'>): string {
  return `${r.source}:${r.sourceId ?? 'unknown'}`
}

function toStored(p: NormalizedProduct, gtin: string): StoredRecord {
  return { ...p, key: recordKey(p), gtin, fetchedAt: new Date().toISOString() }
}

function takeOffRead(): boolean {
  const now = Date.now()
  while (recentOffReads.length && now - recentOffReads[0]! > 60_000) recentOffReads.shift()
  if (recentOffReads.length >= OFF_READS_PER_MINUTE) return false
  recentOffReads.push(now)
  return true
}

/** Normalizes a typed or scanned barcode to 14 digits, or throws NotABarcodeError. */
export function parseBarcode(raw: string, symbology?: string): { gtin: string; storeMade: boolean } {
  const hint = symbology === 'upc_e' || symbology === 'ean8' ? symbology : undefined
  const info = normalizeGtin(raw, hint)
  if (!info || !info.valid) throw new NotABarcodeError()
  return { gtin: info.gtin14, storeMade: info.restrictedCirculation }
}

/**
 * Look up a barcode. Not found is records = [], never an error. Results are cached in the allergy
 * store, so the pantry can show the same verdict later without asking again.
 */
export async function lookupProduct(raw: string, opts: { symbology?: string; force?: boolean } = {}): Promise<LookupResult> {
  const { gtin, storeMade } = parseBarcode(raw, opts.symbology)
  if (storeMade) return { gtin, storeMade: true, records: [], fromCacheOnly: false, sourceErrors: [] }

  const store = useAllergyStore.getState()
  const cached = recordsForGtin(store.products, gtin)
  const fresh = cached.length > 0 && cached.every((r) => Date.now() - Date.parse(r.fetchedAt) < FRESH_MS)
  if (fresh && !opts.force) return { gtin, storeMade: false, records: cached, fromCacheOnly: false, sourceErrors: [] }

  if (!takeOffRead()) {
    const message = 'Open Food Facts allows 15 lookups a minute. Wait a minute and try again.'
    return { gtin, storeMade: false, records: cached, fromCacheOnly: true, sourceErrors: [message] }
  }
  try {
    const off = await fetchOffProduct(gtin, { userAgent: OFF_USER_AGENT, userAgentHeader: 'X-User-Agent', timeoutMs: 8000 })
    const records = off ? [toStored(off, gtin)] : []
    store.cacheRecords(records)
    // Keep household photo records (step 3) next to the fresh database records.
    const others = cached.filter((c) => !records.some((r) => r.key === c.key) && c.source === 'household_photo')
    return { gtin, storeMade: false, records: [...records, ...others], fromCacheOnly: false, sourceErrors: [] }
  } catch (e) {
    return { gtin, storeMade: false, records: cached, fromCacheOnly: true, sourceErrors: [(e as Error).message] }
  }
}
