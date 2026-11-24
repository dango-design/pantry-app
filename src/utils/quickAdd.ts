import type { FoodCategory, FoodItem, QuantityUnit, ShoppingListItem, Staple } from '@/types'
import { QUANTITY_UNITS } from './constants'
import { GENERIC_FOOD_NAMES, isFoodName, lookupFood } from './foodDatabase'
import { formatQuantity } from './mealPlan'
import { findInPantry, isLowStock } from './pantryMatch'
import {
  describeRunOut,
  findProductMemory,
  findStaple,
  formatStockCount,
  getStock,
  isOnShoppingList,
  productKey,
  type ProductMemory,
  type StockInfo,
} from './stock'

// The logic behind the "add to shopping list" field: reading a quantity out of
// the typed text, suggesting products while typing, and picking the usual
// items to offer when the field is empty.

/** What goes on the shopping list */
export interface QuickAddItem {
  name: string
  category: FoodCategory
  quantity?: number
  /** Only set together with `quantity` */
  unit?: QuantityUnit
}

export interface ParsedQuickAdd {
  name: string
  quantity?: number
  unit?: QuantityUnit
}

export interface QuickAddSuggestion extends QuickAddItem {
  key: string
  /** `bought` is a product from the household's pantry history. `generic` is a name from the food database */
  source: 'bought' | 'generic'
  /** The list already covers it, so it should not be added again */
  onList: boolean
}

export interface UsualItem extends QuickAddItem {
  key: string
  status: StockInfo['status']
}

/** Why adding an item may not be needed: there is enough of it at home */
export type AtHome =
  | { kind: 'staple'; name: string; stock: StockInfo }
  | { kind: 'row'; name: string; item: FoodItem }

// ---------------------------------------------------------------------------
// Reading the typed text
// ---------------------------------------------------------------------------

// Every word that names a unit: the unit values, their short labels, and
// their full labels in singular and plural ("lb", "pound", "pounds").
const UNIT_WORDS: Map<string, QuantityUnit> = (() => {
  const words = new Map<string, QuantityUnit>()
  for (const unit of Object.keys(QUANTITY_UNITS) as QuantityUnit[]) {
    const { label, shortLabel } = QUANTITY_UNITS[unit]
    const full = label.toLowerCase()
    const singular = full.endsWith('s') ? full.slice(0, -1) : full
    for (const word of [unit, shortLabel.toLowerCase(), singular, `${singular}s`]) {
      if (word) words.set(word, unit)
    }
  }
  // Common spellings the labels do not cover
  words.set('lbs', 'lb').set('bunches', 'bunch').set('litre', 'l').set('litres', 'l').set('pkg', 'pack').set('ct', 'count')
  return words
})()

function unitFromWord(word: string): QuantityUnit | undefined {
  return UNIT_WORDS.get(word.toLowerCase())
}

function isTimesSign(word: string): boolean {
  return word === 'x' || word === 'X' || word === '×'
}

// "2 lb of chicken" names chicken, not "of chicken"
function dropLeadingOf(name: string): string {
  return name.replace(/^of\s+/i, '') || name
}

function toQuantity(digits: string): number | undefined {
  const quantity = Number(digits)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : undefined
}

// A quantity at the start: "2 milk", "2x milk", "2 x milk", "3 lb chicken", "3lb chicken"
function parseLeadingQuantity(text: string): ParsedQuickAdd | undefined {
  const match = /^(\d+(?:\.\d+)?)( ?)(\S+)(?: (.+))?$/.exec(text)
  if (!match) return undefined

  const [, digits, gap, word, rest] = match
  const quantity = toQuantity(digits)
  if (quantity === undefined) return undefined

  if (rest && isTimesSign(word)) return { name: rest, quantity }
  const unit = unitFromWord(word)
  if (rest && unit) return { name: dropLeadingOf(rest), quantity, unit }

  // Letters straight after the digits that are not a unit belong to the name: "7up", "2% milk"
  if (!gap) return undefined
  return { name: rest ? `${word} ${rest}` : word, quantity }
}

// A quantity at the end: "milk x2", "milk x 2", "milk 2x", "chicken 3 lb", "chicken 3lb".
// A bare number at the end stays in the name, because many product names end in one ("Heinz 57").
function parseTrailingQuantity(text: string): ParsedQuickAdd | undefined {
  const times = /^(.+) (?:[x×] ?(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?) ?[x×])$/i.exec(text)
  if (times) {
    const quantity = toQuantity(times[2] ?? times[3])
    if (quantity !== undefined) return { name: times[1], quantity }
  }

  const withUnit = /^(.+) (\d+(?:\.\d+)?) ?([a-z]+)$/i.exec(text)
  if (withUnit) {
    const quantity = toQuantity(withUnit[2])
    const unit = unitFromWord(withUnit[3])
    if (quantity !== undefined && unit) return { name: withUnit[1], quantity, unit }
  }

  return undefined
}

/**
 * Splits typed text into a name and, when one was typed, a quantity and unit.
 * "2 milk" gives 2 of "milk". "chicken 3 lb" gives 3 lb of "chicken". Text
 * with no quantity, or with only one word such as "7up", is all name.
 */
export function parseQuickAdd(text: string): ParsedQuickAdd {
  const clean = text.trim().replace(/\s+/g, ' ')
  return parseLeadingQuantity(clean) ?? parseTrailingQuantity(clean) ?? { name: clean }
}

// ---------------------------------------------------------------------------
// From text to a list item
// ---------------------------------------------------------------------------

// What the household usually buys of a product bought before. For a staple
// this is its "buy" amount: the user set it, and the last pantry row may come
// from a count correction and not from a purchase.
function usualAmount(remembered: ProductMemory, staples: Staple[]): { quantity?: number; unit: QuantityUnit } {
  const staple = remembered.isStaple ? findStaple(remembered.name, staples) : undefined
  const quantity = staple ? staple.buyQuantity : remembered.usualQuantity
  return { quantity: quantity > 0 ? quantity : undefined, unit: staple ? staple.unit : remembered.unit }
}

// A typed quantity wins. Without one, a product bought before brings its
// usual quantity. Its saved spelling and category are used either way.
function buildItem(
  name: string,
  typed: ParsedQuickAdd | undefined,
  remembered: ProductMemory | undefined,
  staples: Staple[],
): QuickAddItem {
  const usual = remembered ? usualAmount(remembered, staples) : undefined
  const item: QuickAddItem = {
    name: remembered?.name ?? name,
    category: remembered?.category ?? lookupFood(name)?.category ?? 'other',
  }
  const quantity = typed?.quantity ?? usual?.quantity
  if (quantity !== undefined) {
    item.quantity = quantity
    const unit = typed?.unit ?? usual?.unit
    if (unit) item.unit = unit
  }
  return item
}

/**
 * The list item for what was typed, or null when nothing was typed.
 *
 * A saved product or a food database name is never split, so a product called
 * "7 Up" is not read as 7 of "Up".
 */
export function resolveQuickAdd(text: string, memory: ProductMemory[], staples: Staple[]): QuickAddItem | null {
  const whole = text.trim().replace(/\s+/g, ' ')
  if (!whole) return null

  const known = findProductMemory(whole, memory)
  if (known || isFoodName(whole)) return buildItem(whole, undefined, known, staples)

  const parsed = parseQuickAdd(whole)
  return buildItem(parsed.name, parsed, findProductMemory(parsed.name, memory), staples)
}

// ---------------------------------------------------------------------------
// Suggestions while typing
// ---------------------------------------------------------------------------

// Lowercase words. Letters and digits of any script count, so names not
// written in a to z still match.
function words(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

/**
 * How well `query` matches `name`: 0 when the name starts with it, 1 when a
 * later word starts with it, null when it does not match. "bod" matches
 * "BODYARMOR Lite" at 0. "milk" matches "Almond Milk" at 1. "armor" does not
 * match, because it is not the start of a word.
 */
export function matchRank(name: string, query: string): 0 | 1 | null {
  const typed = words(query).join(' ')
  if (!typed) return null

  const nameWords = words(name)
  for (let start = 0; start < nameWords.length; start++) {
    if (nameWords.slice(start).join(' ').startsWith(typed)) return start === 0 ? 0 : 1
  }
  // "apples" still finds a product saved as "Apple"
  return productKey(name) === productKey(query) ? 0 : null
}

// One generic name per food in the food table, as it reads on a shopping list
const GENERIC_NAMES = GENERIC_FOOD_NAMES.map((name) => ({ key: productKey(name), name }))

/**
 * Up to `limit` products matching the typed text. Products bought before come
 * first (in memory order: staples, then most bought), then generic food names.
 * Within each, names that start with the text come before names where a later
 * word starts with it.
 *
 * A product bought before carries its usual quantity. A quantity typed with
 * the text ("3 bod") replaces it and applies to generic names too.
 */
export function getSuggestions(
  text: string,
  memory: ProductMemory[],
  staples: Staple[],
  shoppingList: ShoppingListItem[],
  now: Date,
  limit = 5,
): QuickAddSuggestion[] {
  const whole = text.trim().replace(/\s+/g, ' ')
  if (!whole) return []

  const parsed = parseQuickAdd(whole)
  const hasQuantity = parsed.quantity !== undefined

  // The whole text is tried first, so "7 u" finds "7 Up". Then the text
  // without its quantity, so "3 bod" finds "BODYARMOR Lite" and adds 3.
  const match = (name: string): { rank: 0 | 1; typed?: ParsedQuickAdd } | undefined => {
    const asTyped = matchRank(name, whole)
    if (asTyped !== null) return { rank: asTyped }
    if (!hasQuantity) return undefined
    const withoutQuantity = matchRank(name, parsed.name)
    return withoutQuantity === null ? undefined : { rank: withoutQuantity, typed: parsed }
  }

  const found: { suggestion: Omit<QuickAddSuggestion, 'onList'>; order: number }[] = []
  const seen = new Set<string>()

  for (const entry of memory) {
    const hit = match(entry.name)
    if (!hit || seen.has(entry.key)) continue
    seen.add(entry.key)
    found.push({
      suggestion: { ...buildItem(entry.name, hit.typed, entry, staples), key: entry.key, source: 'bought' },
      order: hit.rank,
    })
  }

  for (const generic of GENERIC_NAMES) {
    const hit = match(generic.name)
    if (!hit || seen.has(generic.key)) continue
    seen.add(generic.key)
    found.push({
      suggestion: { ...buildItem(generic.name, hit.typed, undefined, staples), key: generic.key, source: 'generic' },
      order: 2 + hit.rank,
    })
  }

  // The sort is stable, so entries with the same order keep their source order
  return found
    .sort((a, b) => a.order - b.order)
    .slice(0, limit)
    .map(({ suggestion }) => ({ ...suggestion, onList: isOnShoppingList(suggestion.name, shoppingList, now) }))
}

// ---------------------------------------------------------------------------
// Usual items, offered when the field is empty
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<StockInfo['status'], number> = { out: 0, low: 1, ok: 2 }

/**
 * Up to `limit` products the household is most likely to need, each with its
 * usual quantity. Leaves out anything the list already covers. Products that
 * are out come first, then low ones, then the rest. Within each group the
 * memory order holds: staples, then most bought.
 */
export function getUsualItems(
  memory: ProductMemory[],
  inventory: FoodItem[],
  staples: Staple[],
  shoppingList: ShoppingListItem[],
  now: Date,
  limit = 6,
): UsualItem[] {
  return memory
    .filter((entry) => !isOnShoppingList(entry.name, shoppingList, now))
    .map((entry) => ({
      ...buildItem(entry.name, undefined, entry, staples),
      key: entry.key,
      status: getStock(entry.name, inventory, staples, now).status,
    }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// Already at home
// ---------------------------------------------------------------------------

/**
 * What the household has at home that makes adding `name` worth a second
 * look, if anything.
 *
 * For a staple the answer comes from the stock estimate, and only when the
 * estimate is above the "keep at least" amount. Its pantry rows are not used:
 * their quantities only change when someone edits them. For anything else it
 * is a pantry row in stock that is not running low.
 */
export function findAtHome(name: string, inventory: FoodItem[], staples: Staple[], now: Date): AtHome | undefined {
  let stapleName = findStaple(name, staples) ? name : undefined
  let row: FoodItem | undefined
  if (!stapleName) {
    row = findInPantry(name, inventory)
    // A broader match can land on a staple's row: "lite" finds "BODYARMOR Lite"
    if (row && findStaple(row.name, staples)) stapleName = row.name
  }

  if (stapleName) {
    const stock = getStock(stapleName, inventory, staples, now)
    return stock.status === 'ok' ? { kind: 'staple', name: stock.name, stock } : undefined
  }
  return row && !isLowStock(row) ? { kind: 'row', name: row.name, item: row } : undefined
}

/** The stock line for a staple that is at home: "About 9 left · out by Nov 28", "12 left" */
export function describeStapleStock(stock: StockInfo, now: Date): string {
  const left = `${formatStockCount(stock)} left`
  const runOut = describeRunOut(stock, now)
  return runOut ? `${left} · ${runOut.charAt(0).toLowerCase()}${runOut.slice(1)}` : left
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** The quantity as shown beside a name: "12", "3 lb". Nothing when the item has no quantity */
export function formatItemQuantity(item: QuickAddItem): string | undefined {
  return item.quantity === undefined ? undefined : formatQuantity(item.quantity, item.unit ?? 'count')
}

/** The item with its quantity in front, for "Added … to your shopping list": "12 BODYARMOR Lite", "Milk" */
export function describeItem(item: QuickAddItem): string {
  const quantity = formatItemQuantity(item)
  return quantity ? `${quantity} ${item.name}` : item.name
}
