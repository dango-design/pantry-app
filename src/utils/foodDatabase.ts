import { addDays, parseISO } from 'date-fns'
import type { FoodCategory, StorageLocation, QuantityUnit } from '@/types'
import { DEFAULT_EXPIRATION_DAYS, DEFAULT_STORAGE_LOCATIONS } from './constants'
import { todayDateString, toLocalDateString } from './dates'

export interface FoodInfo {
  category: FoodCategory
  unit: QuantityUnit
  defaultQty: number
  storage: StorageLocation
  expirationDays: number
}

// Food item database for autofill
export const FOOD_DATABASE: Record<string, FoodInfo> = {
  'almond milk': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 7 },
  'milk': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 7 },
  'banana': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'counter', expirationDays: 5 },
  'bananas': { category: 'produce', unit: 'count', defaultQty: 6, storage: 'counter', expirationDays: 5 },
  'apple': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 14 },
  'apples': { category: 'produce', unit: 'count', defaultQty: 6, storage: 'refrigerator', expirationDays: 14 },
  'honeycrisp apple': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 14 },
  'chicken thighs': { category: 'meat', unit: 'lb', defaultQty: 1, storage: 'refrigerator', expirationDays: 2 },
  'chicken breast': { category: 'meat', unit: 'lb', defaultQty: 1, storage: 'refrigerator', expirationDays: 2 },
  'ground beef': { category: 'meat', unit: 'lb', defaultQty: 1, storage: 'freezer', expirationDays: 120 },
  'eggs': { category: 'dairy', unit: 'count', defaultQty: 12, storage: 'refrigerator', expirationDays: 21 },
  'bread': { category: 'bakery', unit: 'count', defaultQty: 1, storage: 'counter', expirationDays: 5 },
  'cheese': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 30 },
  'cheddar cheese': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 30 },
  'yogurt': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 14 },
  'greek yogurt': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 14 },
  'spinach': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 5 },
  'pasta': { category: 'pantry', unit: 'count', defaultQty: 1, storage: 'pantry', expirationDays: 365 },
  'spaghetti': { category: 'pantry', unit: 'count', defaultQty: 1, storage: 'pantry', expirationDays: 365 },
  'rice': { category: 'pantry', unit: 'lb', defaultQty: 2, storage: 'pantry', expirationDays: 365 },
  'olive oil': { category: 'condiments', unit: 'count', defaultQty: 1, storage: 'pantry', expirationDays: 180 },
  'butter': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 30 },
  'pork gyoza': { category: 'frozen', unit: 'count', defaultQty: 1, storage: 'freezer', expirationDays: 90 },
  'avocado': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'counter', expirationDays: 4 },
  'avocados': { category: 'produce', unit: 'count', defaultQty: 3, storage: 'counter', expirationDays: 4 },
  'tomatoes': { category: 'produce', unit: 'count', defaultQty: 4, storage: 'counter', expirationDays: 7 },
  'salsa': { category: 'condiments', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 30 },
}

/**
 * Find a food by name. Tries an exact match, then the longest database entry
 * that appears as whole words in the name ("organic baby spinach" → spinach)
 * or that the name is the start of ("tomato" → tomatoes).
 */
export function lookupFood(name: string): FoodInfo | undefined {
  const normalizedName = name.toLowerCase().trim()
  if (!normalizedName) return undefined
  if (FOOD_DATABASE[normalizedName]) return FOOD_DATABASE[normalizedName]

  let bestKey: string | undefined
  for (const key of Object.keys(FOOD_DATABASE)) {
    const containsKey = new RegExp(`\\b${key}\\b`).test(normalizedName)
    const startsKey = normalizedName.length >= 3 && key.startsWith(normalizedName)
    if ((containsKey || startsKey) && (!bestKey || key.length > bestKey.length)) {
      bestKey = key
    }
  }
  return bestKey ? FOOD_DATABASE[bestKey] : undefined
}

export function getDefaultStorageLocation(name: string, category: FoodCategory): StorageLocation {
  return lookupFood(name)?.storage ?? DEFAULT_STORAGE_LOCATIONS[category] ?? 'refrigerator'
}

/**
 * Estimated shelf life for an item stored in a location. Uses the food
 * database when the item is kept where it normally is, otherwise the
 * category default for that location (or the shortest one for the category).
 */
function estimateExpirationDays(name: string, category: FoodCategory, location: StorageLocation): number {
  const food = lookupFood(name)
  if (food && food.storage === location) return food.expirationDays

  const byLocation = DEFAULT_EXPIRATION_DAYS[category] ?? DEFAULT_EXPIRATION_DAYS.other
  return byLocation[location] ?? Math.min(...Object.values(byLocation))
}

export function estimateExpirationDate(
  name: string,
  category: FoodCategory,
  location: StorageLocation,
  purchaseDate: string = todayDateString()
): string {
  return toLocalDateString(addDays(parseISO(purchaseDate), estimateExpirationDays(name, category, location)))
}
