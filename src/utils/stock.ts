import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { FoodCategory, FoodItem, QuantityUnit, ShoppingListItem, Staple, StorageLocation } from '@/types'
import { toLocalDateString } from './dates'
import { calculateFreshnessScore } from './freshness'
import { estimateExpirationDate, getDefaultStorageLocation } from './foodDatabase'
import { formatQuantity } from './mealPlan'
import { isLowStock, normalizeName } from './pantryMatch'
import { convertQuantity, isDiscreteUnit, roundQuantity } from './units'

// Stock for a product: how much is in the pantry across all its purchases.
//
// Each purchase is its own pantry row. A staple is a product the household
// wants to keep in stock. Nobody logs every drink, so for a staple the count
// is estimated: the amount in the rows when they were last known to be right
// (`countedAt`), minus daily use for each day since then.

export interface StockInfo {
  name: string
  key: string
  category: FoodCategory
  unit: QuantityUnit
  /** Active rows with quantity above 0 for this product, soonest expiry first */
  items: FoodItem[]
  /** Sum of those rows' quantities, in `unit` */
  counted: number
  /** Counted minus use since the staple's `countedAt`, never below 0. Equals `counted` when there is no staple or no rate */
  estimated: number
  /** True when `estimated` differs from `counted` */
  isEstimate: boolean
  staple?: Staple
  dailyUse?: number
  dailyUseSource?: 'learned' | 'typed'
  /** `estimated` divided by `dailyUse` */
  daysLeft?: number
  /** First day with less than a day's use left, as a local yyyy-MM-dd date. Not set when already out */
  runOutDate?: string
  status: 'out' | 'low' | 'ok'
}

export interface RestockSuggestion {
  name: string
  category: FoodCategory
  quantity?: number
  unit?: QuantityUnit
  reason: 'out' | 'low'
  /** Short text for the UI, e.g. "Out", "About 4 left, out by Nov 13", "1 left" */
  detail: string
  stapleId?: string
}

export interface ProductMemory {
  /** As last typed */
  name: string
  key: string
  category: FoodCategory
  unit: QuantityUnit
  /** The last purchase's starting quantity. The staple's `buyQuantity` when it was never bought */
  usualQuantity: number
  /** From the last purchase */
  storageLocation: StorageLocation
  /** The last purchase's expiration date minus its purchase date */
  shelfLifeDays: number
  /** Distinct purchase dates */
  timesBought: number
  /** yyyy-MM-dd. Empty for a staple that was never bought */
  lastPurchased: string
  brand?: string
  isStaple: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

// A product used up this recently is still worth suggesting
const USED_UP_DAYS = 14

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/**
 * One key per product. Names that `isSameName` treats as equal get the same
 * key. A name with no letters a to z or digits (for example one written in
 * Chinese) would normalize to nothing, so it keeps its lowercased text.
 */
export function productKey(name: string): string {
  return normalizeName(name) || name.trim().toLowerCase()
}

export function findStaple(name: string, staples: Staple[]): Staple | undefined {
  const key = productKey(name)
  return staples.find((staple) => productKey(staple.name) === key)
}

// All rows of each product, any status, in pantry order
function rowsByProduct(inventory: FoodItem[]): Map<string, FoodItem[]> {
  const byKey = new Map<string, FoodItem[]>()
  for (const item of inventory) {
    const key = productKey(item.name)
    const rows = byKey.get(key)
    if (rows) rows.push(item)
    else byKey.set(key, [item])
  }
  return byKey
}

function isInStock(item: FoodItem): boolean {
  return item.status === 'active' && item.quantity > 0
}

// Newest purchase first. Rows bought the same day go by when they were added
function byNewestPurchase(a: FoodItem, b: FoodItem): number {
  return b.purchaseDate.localeCompare(a.purchaseDate) || b.createdAt.localeCompare(a.createdAt)
}

function latestPurchase(rows: FoodItem[]): FoodItem | undefined {
  return [...rows].sort(byNewestPurchase)[0]
}

// ---------------------------------------------------------------------------
// Daily use
// ---------------------------------------------------------------------------

// Daily use worked out from one product's rows. See learnDailyUse.
function learnFromRows(rows: FoodItem[], unit?: QuantityUnit): number | undefined {
  const targetUnit = unit ?? latestPurchase(rows)?.quantityUnit
  if (!targetUnit) return undefined

  // Amount bought on each purchase date
  const boughtByDate = new Map<string, number>()
  for (const row of rows) {
    const amount = convertQuantity(row.originalQuantity, row.quantityUnit, targetUnit)
    if (amount === null || !(amount > 0)) continue
    boughtByDate.set(row.purchaseDate, (boughtByDate.get(row.purchaseDate) ?? 0) + amount)
  }

  const dates = [...boughtByDate.keys()].sort()
  if (dates.length < 3) return undefined

  const latest = dates[dates.length - 1]
  const days = differenceInCalendarDays(parseISO(latest), parseISO(dates[0]))
  if (!(days > 0)) return undefined

  // The latest purchase is still being used, so it does not count as used
  let used = 0
  for (const [date, amount] of boughtByDate) {
    if (date !== latest) used += amount
  }
  return used / days
}

/**
 * Daily use of a product, worked out from its purchase history (rows of any
 * status). Everything bought before the latest purchase is taken as used by
 * the time of the latest purchase. Needs at least 3 purchase dates.
 *
 * The result is in `unit` per day. Without `unit` it is in the unit of the
 * latest purchase. Rows whose unit cannot convert are skipped.
 */
export function learnDailyUse(name: string, inventory: FoodItem[], unit?: QuantityUnit): number | undefined {
  const key = productKey(name)
  return learnFromRows(inventory.filter((item) => productKey(item.name) === key), unit)
}

/**
 * Daily use of a staple in the staple's unit. The rate learned from purchase
 * history wins when there is one. Otherwise it is the user's own guess.
 */
export function getDailyUse(
  staple: Staple,
  inventory: FoodItem[],
): { rate: number; source: 'learned' | 'typed' } | undefined {
  const learned = learnDailyUse(staple.name, inventory, staple.unit)
  if (learned !== undefined) return { rate: learned, source: 'learned' }
  if (staple.dailyUse !== undefined && staple.dailyUse > 0) return { rate: staple.dailyUse, source: 'typed' }
  return undefined
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

/** A stock amount as it is stored: whole numbers for units you count, two decimals otherwise */
export function roundStockCount(quantity: number, unit: QuantityUnit): number {
  return isDiscreteUnit(unit) ? Math.round(quantity) : roundQuantity(quantity)
}

// Stock for one product, given all of that product's rows (any status)
function buildStock(name: string, key: string, rows: FoodItem[], staple: Staple | undefined, now: Date): StockInfo {
  const items = rows.filter(isInStock).sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
  const latest = latestPurchase(rows)
  const unit = staple?.unit ?? items[0]?.quantityUnit ?? latest?.quantityUnit ?? 'count'

  let counted = 0
  for (const item of items) {
    counted += convertQuantity(item.quantity, item.quantityUnit, unit) ?? 0
  }
  counted = roundQuantity(counted)

  // One day's use comes off for each calendar day since the count
  const use = staple ? getDailyUse(staple, rows) : undefined
  let estimated = counted
  if (staple && use) {
    const days = differenceInCalendarDays(now, parseISO(staple.countedAt))
    if (days > 0) estimated = Math.max(0, roundQuantity(counted - use.rate * days))
  }

  const info: StockInfo = {
    name: staple?.name ?? items[0]?.name ?? latest?.name ?? name,
    key,
    category: staple?.category ?? items[0]?.category ?? latest?.category ?? 'other',
    unit,
    items,
    counted,
    estimated,
    isEstimate: estimated !== counted,
    staple,
    status: 'ok',
  }

  if (use) {
    info.dailyUse = use.rate
    info.dailyUseSource = use.source
    info.daysLeft = estimated / use.rate
    if (estimated > 0) {
      info.runOutDate = toLocalDateString(addDays(now, Math.floor(info.daysLeft + 1e-9)))
    }
  }

  if (staple) {
    // Compare the amount as it is shown, so "About 6" with "keep at least 6" is low
    const shown = roundStockCount(estimated, unit)
    info.status = shown <= 0 ? 'out' : shown <= staple.minQuantity ? 'low' : 'ok'
  } else {
    info.status = items.length === 0 ? 'out' : items.every(isLowStock) ? 'low' : 'ok'
  }

  return info
}

/** Stock for one product by name. Works for products with no rows and no staple too (status `out`). */
export function getStock(name: string, inventory: FoodItem[], staples: Staple[], now: Date = new Date()): StockInfo {
  const key = productKey(name)
  const rows = inventory.filter((item) => productKey(item.name) === key)
  return buildStock(name, key, rows, findStaple(name, staples), now)
}

/**
 * One entry per product that has rows in stock, in pantry order. Then one
 * entry for each staple with nothing in stock (status `out`).
 */
export function groupByProduct(inventory: FoodItem[], staples: Staple[], now: Date = new Date()): StockInfo[] {
  const byKey = rowsByProduct(inventory)

  // The first staple wins when two have the same name, as in findStaple
  const stapleByKey = new Map<string, Staple>()
  for (const staple of staples) {
    const key = productKey(staple.name)
    if (!stapleByKey.has(key)) stapleByKey.set(key, staple)
  }

  const stocks: StockInfo[] = []
  const done = new Set<string>()
  for (const [key, rows] of byKey) {
    if (!rows.some(isInStock)) continue
    stocks.push(buildStock(rows[0].name, key, rows, stapleByKey.get(key), now))
    done.add(key)
  }
  for (const [key, staple] of stapleByKey) {
    if (done.has(key)) continue
    stocks.push(buildStock(staple.name, key, byKey.get(key) ?? [], staple, now))
  }
  return stocks
}

/**
 * The pantry rows after making a product's rows add up to `count` (in `unit`).
 *
 * Lowering takes from the rows that expire soonest. A row that reaches 0 is
 * marked used up. Raising adds to the most recently bought row in stock. With
 * nothing in stock it brings back the most recent row of that product instead,
 * so that no new purchase is recorded: purchases feed `learnDailyUse`.
 *
 * Returns the same array when nothing needs to change. Returns null when the
 * count is above 0 and the product has no row to hold it. The caller then
 * has to add a row. Rows whose unit cannot convert to `unit` are left alone.
 */
export function withStockCount(
  inventory: FoodItem[],
  name: string,
  count: number,
  unit: QuantityUnit,
  now: Date = new Date(),
): FoodItem[] | null {
  const key = productKey(name)
  const nowIso = now.toISOString()
  const rows = inventory.filter(
    (item) => productKey(item.name) === key && convertQuantity(1, item.quantityUnit, unit) !== null
  )
  const inStock = rows.filter(isInStock)
  const amountOf = (item: FoodItem) => convertQuantity(item.quantity, item.quantityUnit, unit) ?? 0

  const target = Math.max(0, count)
  const current = inStock.reduce((sum, item) => sum + amountOf(item), 0)
  const change = target - current
  if (Math.abs(change) < 0.005) return inventory

  const changed = new Map<string, FoodItem>()

  if (change < 0) {
    let toTake = -change
    const soonestFirst = [...inStock].sort(
      (a, b) => a.expirationDate.localeCompare(b.expirationDate) || a.purchaseDate.localeCompare(b.purchaseDate)
    )
    for (const item of soonestFirst) {
      if (toTake < 0.005) break
      const amount = amountOf(item)
      const take = Math.min(amount, toTake)
      toTake -= take
      const quantity = roundQuantity(convertQuantity(amount - take, unit, item.quantityUnit) ?? 0)
      changed.set(item.id, quantity > 0
        ? { ...item, quantity, updatedAt: nowIso }
        : { ...item, quantity: 0, status: 'consumed', consumedAt: nowIso, updatedAt: nowIso })
    }
  } else if (inStock.length > 0) {
    const newest = [...inStock].sort(byNewestPurchase)[0]
    const added = convertQuantity(change, unit, newest.quantityUnit) ?? 0
    changed.set(newest.id, { ...newest, quantity: roundQuantity(newest.quantity + added), updatedAt: nowIso })
  } else {
    const newest = latestPurchase(rows)
    if (!newest) return null

    const revived: FoodItem = {
      ...newest,
      quantity: roundQuantity(convertQuantity(target, unit, newest.quantityUnit) ?? 0),
      status: 'active',
      consumedAt: undefined,
      updatedAt: nowIso,
    }
    // An old row may be past its date. What is in the pantry now was bought
    // later, so give it the same shelf life counted from today.
    const today = toLocalDateString(now)
    if (revived.expirationDate < today) {
      const shelfLife = differenceInCalendarDays(parseISO(newest.expirationDate), parseISO(newest.purchaseDate))
      revived.expirationDate = toLocalDateString(addDays(now, shelfLife > 0 ? shelfLife : 0))
      revived.expirationSource = 'calculated'
      revived.freshnessScore = calculateFreshnessScore(today, revived.expirationDate)
    }
    changed.set(newest.id, revived)
  }

  return inventory.map((item) => changed.get(item.id) ?? item)
}

// ---------------------------------------------------------------------------
// Restock suggestions
// ---------------------------------------------------------------------------

// A checked item counts as on the list for this long after it was checked off
const CHECKED_OFF_DAYS = 3

/**
 * True when the list already covers this product, so it should not be
 * suggested or added again. An unchecked item covers it. So does an item
 * checked off in the last 3 days: it was bought and is not in the pantry yet.
 * Older checked items are ignored, so one left on the list cannot hide a
 * product that has run out since.
 */
export function isOnShoppingList(name: string, shoppingList: ShoppingListItem[], now: Date = new Date()): boolean {
  const key = productKey(name)
  const since = now.getTime() - CHECKED_OFF_DAYS * DAY_MS
  return shoppingList.some((item) => {
    if (productKey(item.name) !== key) return false
    if (!item.isChecked) return true
    return item.checkedAt !== undefined && Date.parse(item.checkedAt) >= since
  })
}

function restockDetail(info: StockInfo, now: Date): string {
  if (info.status === 'out') return 'Out'
  const left = `${formatStockCount(info)} left`
  const runOut = describeRunOut(info, now)
  return runOut ? `${left}, ${runOut.charAt(0).toLowerCase()}${runOut.slice(1)}` : left
}

/**
 * What to suggest buying: staples that are low or out, other products that are
 * low, and other products used up in the last 14 days. Leaves out anything
 * the list already covers (see isOnShoppingList). Out comes before low, and
 * staples come first within each.
 */
export function getRestockSuggestions(
  inventory: FoodItem[],
  staples: Staple[],
  shoppingList: ShoppingListItem[],
  now: Date = new Date(),
): RestockSuggestion[] {
  const onList = (name: string) => isOnShoppingList(name, shoppingList, now)
  const byKey = rowsByProduct(inventory)
  const suggestions: RestockSuggestion[] = []
  const handled = new Set<string>()

  for (const stock of groupByProduct(inventory, staples, now)) {
    handled.add(stock.key)
    if (stock.status === 'ok' || onList(stock.name)) continue

    if (stock.staple) {
      suggestions.push({
        name: stock.name,
        category: stock.category,
        quantity: stock.staple.buyQuantity,
        unit: stock.unit,
        reason: stock.status,
        detail: restockDetail(stock, now),
        stapleId: stock.staple.id,
      })
    } else {
      const last = latestPurchase(byKey.get(stock.key) ?? [])
      suggestions.push({
        name: stock.name,
        category: stock.category,
        quantity: last?.originalQuantity,
        unit: last?.quantityUnit,
        reason: stock.status,
        detail: restockDetail(stock, now),
      })
    }
  }

  // Products with nothing in stock that were used up recently
  const since = now.getTime() - USED_UP_DAYS * DAY_MS
  for (const [key, rows] of byKey) {
    if (handled.has(key)) continue
    const usedUpRecently = rows.some(
      (row) => row.status === 'consumed' && row.consumedAt !== undefined && Date.parse(row.consumedAt) >= since
    )
    const last = latestPurchase(rows)
    if (!usedUpRecently || !last || onList(last.name)) continue
    suggestions.push({
      name: last.name,
      category: last.category,
      quantity: last.originalQuantity,
      unit: last.quantityUnit,
      reason: 'out',
      detail: 'Out',
    })
  }

  const order = (s: RestockSuggestion) => (s.reason === 'out' ? 0 : 2) + (s.stapleId ? 0 : 1)
  return suggestions.sort((a, b) => order(a) - order(b))
}

// ---------------------------------------------------------------------------
// Product memory: what the app remembers about products bought before
// ---------------------------------------------------------------------------

/**
 * One entry per product ever in the pantry, plus staples that were never
 * bought. Used to fill in a form when the user types a known name. Staples
 * come first, then the most times bought, then the most recently bought.
 */
export function getProductMemory(inventory: FoodItem[], staples: Staple[]): ProductMemory[] {
  const memory: ProductMemory[] = []
  const byKey = rowsByProduct(inventory)

  for (const [key, rows] of byKey) {
    const last = latestPurchase(rows)
    if (!last) continue
    const shelfLife = differenceInCalendarDays(parseISO(last.expirationDate), parseISO(last.purchaseDate))
    // A staple says how many to buy. Its last row can hold a corrected count
    // (for example 5 after a recount), which is not a purchase amount.
    const staple = findStaple(last.name, staples)
    memory.push({
      name: last.name,
      key,
      category: last.category,
      unit: staple ? staple.unit : last.quantityUnit,
      usualQuantity: staple ? staple.buyQuantity : last.originalQuantity > 0 ? last.originalQuantity : last.quantity,
      storageLocation: last.storageLocation,
      shelfLifeDays: shelfLife > 0 ? shelfLife : 0,
      timesBought: new Set(rows.map((row) => row.purchaseDate)).size,
      lastPurchased: last.purchaseDate,
      brand: last.brand ?? rows.find((row) => row.brand)?.brand,
      isStaple: staple !== undefined,
    })
  }

  // Staples that were never bought still have a name, category, and unit to offer
  const today = toLocalDateString(new Date())
  for (const staple of staples) {
    const key = productKey(staple.name)
    if (memory.some((entry) => entry.key === key)) continue
    const storageLocation = getDefaultStorageLocation(staple.name, staple.category)
    const expires = estimateExpirationDate(staple.name, staple.category, storageLocation, today)
    memory.push({
      name: staple.name,
      key,
      category: staple.category,
      unit: staple.unit,
      usualQuantity: staple.buyQuantity,
      storageLocation,
      shelfLifeDays: differenceInCalendarDays(parseISO(expires), parseISO(today)),
      timesBought: 0,
      lastPurchased: '',
      isStaple: true,
    })
  }

  return memory.sort((a, b) =>
    Number(b.isStaple) - Number(a.isStaple) ||
    b.timesBought - a.timesBought ||
    b.lastPurchased.localeCompare(a.lastPurchased)
  )
}

export function findProductMemory(name: string, memory: ProductMemory[]): ProductMemory | undefined {
  const key = productKey(name)
  return memory.find((entry) => entry.key === key)
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** "About 4" for an estimate (whole numbers for units you count), otherwise the counted amount: "4", "1.5 lb" */
export function formatStockCount(info: StockInfo): string {
  if (!info.isEstimate) return formatQuantity(info.counted, info.unit)
  return `About ${formatQuantity(roundStockCount(info.estimated, info.unit), info.unit)}`
}

/** "Out today", "Out tomorrow", "Out by Nov 13". Nothing when the daily use is not known or it is already out */
export function describeRunOut(info: StockInfo, now: Date = new Date()): string | undefined {
  if (!info.runOutDate || info.status === 'out') return undefined
  const date = parseISO(info.runOutDate)
  const days = differenceInCalendarDays(date, now)
  if (days <= 0) return 'Out today'
  if (days === 1) return 'Out tomorrow'
  return `Out by ${format(date, 'MMM d')}`
}
