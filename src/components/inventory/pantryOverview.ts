// Plain functions behind the Pantry tab's overview: the freshness pill on each
// row, the "Use soon" list, and the "Everything else" groups. They hold no
// React state, so they can be tested on their own (pantryOverview.test.ts).

import { getDaysUntilExpiration } from '@/utils/freshness'
import { STORAGE_LOCATIONS } from '@/utils/constants'
import type { StockInfo } from '@/utils/stock'
import type { FoodCategory, StorageLocation } from '@/types'

// ---------------------------------------------------------------------------
// Freshness pill
// ---------------------------------------------------------------------------

/** red: expired. orange: today to 3 days. yellow: 4 to 7 days. green: later. */
export type PillTone = 'red' | 'orange' | 'yellow' | 'green' | 'grey'

export interface FreshnessPill {
  text: string
  tone: PillTone
}

/** Products that expire within this many days (or already did) go in "Use soon" */
export const USE_SOON_DAYS = 7

/**
 * The short label and colour for a row's freshness pill: "2 days ago" (red),
 * "Today" (orange), "5 days" (yellow), "3 wk" (green). Kept short so it fits
 * its own column on a 375 px screen without being cut off.
 */
export function getFreshnessPill(expirationDate: string): FreshnessPill {
  const days = getDaysUntilExpiration(expirationDate)

  if (days < 0) {
    const ago = -days
    if (ago === 1) return { text: 'Yesterday', tone: 'red' }
    if (ago < 14) return { text: `${ago} days ago`, tone: 'red' }
    return { text: `${Math.floor(ago / 7)} wk ago`, tone: 'red' }
  }
  if (days === 0) return { text: 'Today', tone: 'orange' }
  if (days === 1) return { text: 'Tomorrow', tone: 'orange' }
  if (days <= 3) return { text: `${days} days`, tone: 'orange' }
  if (days <= USE_SOON_DAYS) return { text: `${days} days`, tone: 'yellow' }
  if (days < 14) return { text: `${days} days`, tone: 'green' }
  if (days < 60) return { text: `${Math.floor(days / 7)} wk`, tone: 'green' }
  if (days < 365) return { text: `${Math.floor(days / 30)} mo`, tone: 'green' }
  return { text: `${Math.floor(days / 365)} yr`, tone: 'green' }
}

/** Days until a product's soonest row expires. `items[0]` is the soonest. */
export function daysLeft(stock: StockInfo): number {
  return getDaysUntilExpiration(stock.items[0].expirationDate)
}

// ---------------------------------------------------------------------------
// "Use soon"
// ---------------------------------------------------------------------------

export interface UseSoonSummary {
  /** Expired or expiring within USE_SOON_DAYS, soonest first */
  products: StockInfo[]
  /** How many of those already expired */
  expired: number
}

export function getUseSoon(products: StockInfo[]): UseSoonSummary {
  const soon = products
    .filter((stock) => daysLeft(stock) <= USE_SOON_DAYS)
    .sort((a, b) => daysLeft(a) - daysLeft(b) || a.name.localeCompare(b.name))
  return { products: soon, expired: soon.filter((stock) => daysLeft(stock) < 0).length }
}

// ---------------------------------------------------------------------------
// "Everything else" groups
// ---------------------------------------------------------------------------

export type Grouping = 'place' | 'category'

/** How a group shows its products: one row each, or small chips (for long lists of small things) */
export type GroupDisplay = 'rows' | 'chips'

/**
 * A group that pulls matching products out before the place or food-type
 * grouping runs. Session C adds "Oils, spices & sauces" this way, shown as chips.
 */
export interface SpecialGroup {
  key: string
  label: string
  color: string
  display: GroupDisplay
  match: (stock: StockInfo) => boolean
}

export interface PantryGroup {
  /** Unique within one grouping, e.g. "refrigerator" or "dairy" */
  key: string
  label: string
  /** Colour of the small square in the header */
  color: string
  display: GroupDisplay
  /** Every product in the group, including ones the selected tile already shows */
  products: StockInfo[]
}

export interface GroupStatus {
  text: string
  tone: PillTone
}

// Place groups, in the order people look: fridge, freezer, counter, shelf
const PLACE_ORDER: StorageLocation[] = ['refrigerator', 'freezer', 'counter', 'pantry', 'spice_rack']
const PLACE_LABELS: Record<StorageLocation, string> = {
  refrigerator: 'Fridge',
  freezer: 'Freezer',
  counter: 'Counter',
  pantry: 'Shelf',
  spice_rack: 'Spice rack',
}

/** Short place name for rows and headers: "Fridge", "Shelf" */
export function placeLabel(location: StorageLocation | string): string {
  return PLACE_LABELS[location as StorageLocation] ?? STORAGE_LOCATIONS[location as StorageLocation]?.label ?? location
}

/** Food types, in the same order as the category chips, then the ones without a chip */
export const CATEGORY_GROUPS: { key: FoodCategory; label: string; color: string }[] = [
  { key: 'produce', label: 'Produce', color: '#22C55E' },
  { key: 'dairy', label: 'Dairy', color: '#3B82F6' },
  { key: 'meat', label: 'Meat', color: '#EF4444' },
  { key: 'seafood', label: 'Seafood', color: '#06B6D4' },
  { key: 'pantry', label: 'Shelf', color: '#8B5CF6' },
  { key: 'frozen', label: 'Frozen', color: '#6366F1' },
  { key: 'bakery', label: 'Bakery', color: '#F59E0B' },
  { key: 'beverages', label: 'Drinks', color: '#06B6D4' },
  { key: 'condiments', label: 'Condiments', color: '#EC4899' },
  { key: 'snacks', label: 'Snacks', color: '#F97316' },
  { key: 'prepared', label: 'Prepared', color: '#14B8A6' },
  { key: 'other', label: 'Other', color: '#6B7280' },
]

/**
 * Split products into groups by place (the soonest row's storage location) or
 * by food type. Special groups take their matches first and come last in the
 * list. Empty groups are left out. Products keep the order they came in.
 */
export function buildGroups(
  products: StockInfo[],
  grouping: Grouping,
  specialGroups: SpecialGroup[] = []
): PantryGroup[] {
  const special = specialGroups.map((group) => ({ ...group, products: [] as StockInfo[] }))
  const rest: StockInfo[] = []
  for (const stock of products) {
    const target = special.find((group) => group.match(stock))
    if (target) target.products.push(stock)
    else rest.push(stock)
  }

  const groups: PantryGroup[] = []
  if (grouping === 'place') {
    const byPlace = new Map<string, StockInfo[]>()
    for (const stock of rest) {
      const place = stock.items[0].storageLocation
      byPlace.set(place, [...(byPlace.get(place) ?? []), stock])
    }
    // Known places in kitchen order, then any place this list doesn't know yet
    const places = [
      ...PLACE_ORDER.filter((place) => byPlace.has(place)),
      ...[...byPlace.keys()].filter((place) => !PLACE_ORDER.includes(place as StorageLocation)),
    ]
    for (const place of places) {
      groups.push({
        key: place,
        label: placeLabel(place),
        color: STORAGE_LOCATIONS[place as StorageLocation]?.color ?? '#6B7280',
        display: 'rows',
        products: byPlace.get(place) ?? [],
      })
    }
  } else {
    for (const category of CATEGORY_GROUPS) {
      const inGroup = rest.filter((stock) => stock.category === category.key)
      if (inGroup.length > 0) groups.push({ ...category, display: 'rows', products: inGroup })
    }
    // A category missing from the list above still gets a group
    const known = new Set<string>(CATEGORY_GROUPS.map((category) => category.key))
    const unknown = rest.filter((stock) => !known.has(stock.category))
    if (unknown.length > 0) groups.push({ key: 'other-types', label: 'Other', color: '#6B7280', display: 'rows', products: unknown })
  }

  for (const group of special) {
    if (group.products.length === 0) continue
    groups.push({ key: group.key, label: group.label, color: group.color, display: group.display, products: group.products })
  }
  return groups
}

/** The header pill: "1 expired" (red) wins over "4 soon" (orange); otherwise "All good" (green) */
export function getGroupStatus(products: StockInfo[]): GroupStatus {
  let expired = 0
  let soon = 0
  for (const stock of products) {
    const days = daysLeft(stock)
    if (days < 0) expired++
    else if (days <= USE_SOON_DAYS) soon++
  }
  if (expired > 0) return { text: `${expired} expired`, tone: 'red' }
  if (soon > 0) return { text: `${soon} soon`, tone: 'orange' }
  return { text: 'All good', tone: 'green' }
}

/** Key under which a group's open or closed state is saved: one per grouping, so "Fridge" and "Dairy" don't share */
export function groupStateKey(grouping: Grouping, groupKey: string): string {
  return `${grouping}:${groupKey}`
}

/** How many products each food type has, for the counts on the category chips */
export function countByCategory(products: StockInfo[]): Map<FoodCategory, number> {
  const counts = new Map<FoodCategory, number>()
  for (const stock of products) counts.set(stock.category, (counts.get(stock.category) ?? 0) + 1)
  return counts
}
