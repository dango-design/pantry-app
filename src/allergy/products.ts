// Small helpers for product records that need no engine code, so pages in the main bundle can use
// them.

import type { StoredRecord } from './types'

/** The product's name and brand, preferring a household label photo, then Open Food Facts, then USDA. */
export function productName(records: Pick<StoredRecord, 'name' | 'brand' | 'source'>[]): { name: string; brand: string | null } {
  const order = ['household_photo', 'off', 'usda']
  const sorted = [...records].sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source))
  const withName = sorted.find((r) => r.name)
  return { name: withName?.name ?? 'Unknown product', brand: sorted.find((r) => r.brand)?.brand ?? null }
}

export const SOURCE_LABEL: Record<string, string> = {
  usda: 'USDA FoodData Central',
  off: 'Open Food Facts',
  household_photo: 'Your label photo',
}
