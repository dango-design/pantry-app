import type { FoodItem } from '@/types'
import { formatExpirationText, getDaysUntilExpiration } from './freshness'
import { formatQuantity } from './mealPlan'
import { isDiscreteUnit } from './units'

// Lowercase words with a plural "s" dropped, so "Eggs" and "egg" compare equal
function nameWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word))
}

/**
 * A name with case, punctuation, and plurals removed: "Eggs!" gives "egg".
 * Empty when the name has no letters a to z or digits.
 */
export function normalizeName(name: string): string {
  return nameWords(name).join(' ')
}

/** Same item name, ignoring case, punctuation, and plurals */
export function isSameName(a: string, b: string): boolean {
  const key = normalizeName(a)
  return key.length > 0 && key === normalizeName(b)
}

// Every word of `query` appears in `name` ("milk" is in "Almond Milk"; "egg" is not in "Eggplant")
function nameContains(name: string, query: string): boolean {
  const words = new Set(nameWords(name))
  const queryWords = nameWords(query)
  return queryWords.length > 0 && queryWords.every((word) => words.has(word))
}

/**
 * The pantry item in stock that a shopping item's name refers to, if any.
 * An exact name match wins over a broader one ("milk" finding "Almond Milk").
 */
export function findInPantry(name: string, inventory: FoodItem[]): FoodItem | undefined {
  const inStock = inventory.filter((item) => item.status === 'active' && item.quantity > 0)
  return inStock.find((item) => isSameName(item.name, name)) ?? inStock.find((item) => nameContains(item.name, name))
}

/**
 * Low when at or below a quarter of what was bought, or down to the last one
 * of several (e.g. 1 of 6 eggs). Buying more of a low item needs no warning.
 */
export function isLowStock(item: FoodItem): boolean {
  if (!(item.originalQuantity > 0)) return false
  if (item.quantity <= item.originalQuantity * 0.25) return true
  return isDiscreteUnit(item.quantityUnit) && item.originalQuantity > 1 && item.quantity <= 1
}

/** A pantry item in stock and not running low: worth flagging before buying more */
export function findStockedInPantry(name: string, inventory: FoodItem[]): FoodItem | undefined {
  const match = findInPantry(name, inventory)
  return match && !isLowStock(match) ? match : undefined
}

const LOCATION_PHRASES: Record<string, string> = {
  refrigerator: 'in the fridge',
  freezer: 'in the freezer',
  pantry: 'in the pantry',
  counter: 'on the counter',
  spice_rack: 'on the spice rack',
}

/** Where something is, as a phrase: "in the fridge", "on the counter". "at home" for a place the app does not know */
export function locationPhrase(location: string): string {
  return LOCATION_PHRASES[location] ?? 'at home'
}

/** e.g. "2 in the fridge · expires in 1 week" */
export function describeStock(item: FoodItem): string {
  const where = locationPhrase(item.storageLocation)
  const days = getDaysUntilExpiration(item.expirationDate)
  const expiry = days < 0
    ? 'expired'
    : days <= 1
      ? `expires ${formatExpirationText(item.expirationDate).toLowerCase()}`
      : `expires in ${formatExpirationText(item.expirationDate)}`
  return `${formatQuantity(item.quantity, item.quantityUnit)} ${where} · ${expiry}`
}
