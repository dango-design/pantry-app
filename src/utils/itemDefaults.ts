import { addDays, parseISO } from 'date-fns'
import type { FoodCategory, QuantityUnit, StorageLocation } from '@/types'
import { CATEGORIES } from './constants'
import { todayDateString, toLocalDateString } from './dates'
import { estimateShelfLife, getDefaultStorageLocation, lookupFood } from './foodDatabase'
import { locationPhrase } from './pantryMatch'
import { findProductMemory, type ProductMemory } from './stock'

// Defaults for a new pantry item, from what the household did before and
// then from the food table. Every way of adding an item uses these, so a name
// gets the same guess whether it is typed, scanned or put away from the list.

/** The app's category for a category name from a scan, ignoring case: "Dairy" is 'dairy'. Undefined for anything else */
export function parseCategory(text: string | null | undefined): FoodCategory | undefined {
  const key = (text ?? '').trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(CATEGORIES, key) ? (key as FoodCategory) : undefined
}

export interface ItemGuess {
  category: FoodCategory
  unit: QuantityUnit
  quantity: number
  storageLocation: StorageLocation
  brand?: string
  /** 'history': the household bought it before. 'food': the food table knows it. 'none': neither */
  source: 'history' | 'food' | 'none'
}

/**
 * Category, unit, quantity, storage and brand for a new item called `name`.
 * A product bought before gets what was saved last time. Anything else gets
 * the food table's answer, or 'other' in the fridge when the name is unknown.
 */
export function guessItem(name: string, memory: ProductMemory[]): ItemGuess {
  const known = findProductMemory(name, memory)
  if (known) {
    return {
      category: known.category,
      unit: known.unit,
      quantity: known.usualQuantity > 0 ? known.usualQuantity : 1,
      storageLocation: known.storageLocation,
      brand: known.brand,
      source: 'history',
    }
  }

  const food = lookupFood(name)
  if (food) {
    return { category: food.category, unit: food.unit, quantity: food.defaultQty, storageLocation: food.storage, source: 'food' }
  }

  return { category: 'other', unit: 'count', quantity: 1, storageLocation: getDefaultStorageLocation(name, 'other'), source: 'none' }
}

export interface ExpiryEstimate {
  /** yyyy-MM-dd */
  date: string
  days: number
  /** 'history': a date the household typed last time. 'food': the food table. 'category': the category's usual time */
  basis: 'history' | 'food' | 'category'
  /** For 'food': what the name matched, lowercase */
  foodName?: string
  category: FoodCategory
  location: StorageLocation
}

/**
 * The expiration date for an item bought on `purchaseDate`. A product the
 * household gave its own date for last time, kept in the same place, gets
 * the same shelf life. Otherwise the food table or the category decides.
 */
export function estimateExpiry(
  name: string,
  category: FoodCategory,
  location: StorageLocation,
  purchaseDate: string = todayDateString(),
  memory: ProductMemory[] = [],
): ExpiryEstimate {
  const dateAfter = (days: number) => toLocalDateString(addDays(parseISO(purchaseDate), days))

  const known = findProductMemory(name, memory)
  if (known?.shelfLifeFromUser && known.shelfLifeDays > 0 && known.storageLocation === location) {
    return { date: dateAfter(known.shelfLifeDays), days: known.shelfLifeDays, basis: 'history', category, location }
  }

  const { days, food } = estimateShelfLife(name, category, location)
  return {
    date: dateAfter(days),
    days,
    basis: food ? 'food' : 'category',
    foodName: food?.name,
    category,
    location,
  }
}

/** A length of time in rough words: "5 days", "3 weeks", "8 months", "2 years" */
export function formatShelfLife(days: number): string {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
  if (days < 14) return plural(days, 'day')
  if (days < 56) return plural(Math.round(days / 7), 'week')
  if (days < 365) return plural(Math.round(days / 30.4), 'month')
  return plural(Math.round((days / 365) * 2) / 2, 'year')
}

/**
 * Why the date is what it is, for under the date field:
 * "About 5 days in the fridge, typical for spinach",
 * "10 days, the same as the date you entered last time".
 */
export function describeExpiry(estimate: ExpiryEstimate): string {
  const time = formatShelfLife(estimate.days)
  if (estimate.basis === 'history') return `${time}, the same as the date you entered last time`

  const where = locationPhrase(estimate.location)
  if (estimate.basis === 'food') return `About ${time} ${where}, typical for ${estimate.foodName}`
  if (estimate.category === 'other') return `About ${time} ${where}. Pick a category for a better guess`
  return `About ${time} ${where}, typical for ${CATEGORY_PHRASES[estimate.category]}`
}

// Each category as it reads after "typical for"
const CATEGORY_PHRASES: Record<Exclude<FoodCategory, 'other'>, string> = {
  produce: 'produce',
  dairy: 'dairy',
  meat: 'meat',
  seafood: 'seafood',
  bakery: 'baked goods',
  frozen: 'frozen food',
  pantry: 'pantry goods',
  beverages: 'drinks',
  condiments: 'condiments',
  snacks: 'snacks',
  prepared: 'prepared food',
}
