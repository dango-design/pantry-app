import { addDays, parseISO } from 'date-fns'
import type { FoodCategory, StorageLocation, QuantityUnit } from '@/types'
import { DEFAULT_EXPIRATION_DAYS, DEFAULT_STORAGE_LOCATIONS } from './constants'
import { todayDateString, toLocalDateString } from './dates'
import { FOOD_TABLE, type FoodEntry, type Keeps } from './foodTable'

// Guesses a new pantry item's category, storage place, unit and shelf life
// from its name, using the food table in foodTable.ts.
//
// How a name is matched:
// - Words are lowercased and made singular, so "Strawberries" finds "strawberry".
// - The food named last in the name wins, because English puts the main noun
//   last: "peanut butter cookies" is cookies, "chocolate milk" is milk.
// - Among foods that end at the same word, the longest name wins: "ice cream"
//   beats "cream", "peanut butter" beats "butter".
// - Words like "frozen", "canned" and "leftover" change where the food goes and
//   how long it keeps.

export type { Keeps }

export interface FoodInfo {
  /** What the name matched, lowercase, for messages: "spinach", "frozen peas" */
  name: string
  category: FoodCategory
  unit: QuantityUnit
  defaultQty: number
  /** Where it usually goes */
  storage: StorageLocation
  /** Days it keeps in `storage` */
  expirationDays: number
  /** Days it keeps in each place it can go */
  keeps: Keeps
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const IRREGULAR: Record<string, string> = { leaves: 'leaf', loaves: 'loaf', halves: 'half' }

/**
 * One word without its plural ending. Both "cookie" and "cookies" become
 * "cooky": the result only has to be the same for both spellings.
 */
function singular(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word]
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.length > 4 && word.endsWith('ie')) return `${word.slice(0, -2)}y`
  if (word.length > 4 && word.endsWith('oes')) return word.slice(0, -2)
  if (/(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2)
  // "hummus", "asparagus" and "swiss" are not plurals
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1)
  return word
}

/** A name as singular lowercase words, without numbers, sizes or accents: "Jalapeños 12 oz" → ["jalapeno", "oz"] */
export function foodWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(singular)
}

// Words that start a description of the food, not its name:
// "tuna in water", "chicken breast with garlic", "seasoning for tacos"
const DESCRIPTION_STARTS = new Set(['with', 'w', 'in', 'for', 'from'])

/**
 * The part of a name before any description: "Tuna in water" → "Tuna",
 * "Noodle soup, lobster" → "Noodle soup", "Ramen (shrimp)" → "Ramen".
 */
function mainPart(name: string): string {
  const beforePunctuation = name.replace(/\([^)]*\)/g, ' ').split(/,| - | – /)[0]
  const words = beforePunctuation.trim().split(/\s+/)
  const cut = words.findIndex((word, index) => index > 0 && DESCRIPTION_STARTS.has(word.toLowerCase().replace(/[^a-z]/g, '')))
  return cut > 0 ? words.slice(0, cut).join(' ') : beforePunctuation
}

// Foods often written after the main food as its flavor: "chips sea salt",
// "hummus lemon dill", "protein cookie chocolate chip". In a name that also
// names another food, the other food wins. Spices count too.
const FLAVORS = new Set([
  'garlic', 'ginger', 'lemons', 'limes', 'cilantro', 'parsley', 'basil', 'mint', 'dill', 'rosemary', 'thyme', 'herbs',
  'chocolate chips', 'vanilla extract', 'honey',
])

function isFlavor(food: FoodInfo): boolean {
  return food.storage === 'spice_rack' || FLAVORS.has(food.name)
}

// ---------------------------------------------------------------------------
// The table, indexed by name
// ---------------------------------------------------------------------------

function toInfo(entry: FoodEntry): FoodInfo {
  return {
    name: entry.name.toLowerCase(),
    category: entry.category,
    unit: entry.unit ?? 'count',
    defaultQty: entry.qty ?? 1,
    storage: entry.storage,
    expirationDays: entry.keeps[entry.storage] ?? 0,
    keeps: entry.keeps,
  }
}

const INDEX = new Map<string, FoodInfo>()
let longestName = 1

for (const entry of FOOD_TABLE) {
  const info = toInfo(entry)
  for (const name of [entry.name, ...(entry.aliases ?? [])]) {
    const words = foodWords(name)
    const key = words.join(' ')
    // The first entry with a name keeps it
    if (!key || INDEX.has(key)) continue
    INDEX.set(key, info)
    longestName = Math.max(longestName, words.length)
  }
}

/** The display name of every food, for suggestions while typing: "Spinach", "Greek yogurt" */
export const GENERIC_FOOD_NAMES: string[] = FOOD_TABLE.map((entry) => entry.name)

/**
 * True when the whole text is the name of a food, such as "milk" or "Hot
 * dogs". Text with a number is not, so "2 milk" can be read as 2 of milk.
 */
export function isFoodName(text: string): boolean {
  return !/\d/.test(text) && INDEX.has(foodWords(text).join(' '))
}

// The longest food name ending at word `end` (exclusive), and how many words it has
function foodEndingAt(words: string[], end: number): { food: FoodInfo; size: number } | undefined {
  for (let size = Math.min(longestName, end); size > 0; size--) {
    const food = INDEX.get(words.slice(end - size, end).join(' '))
    if (food) return { food, size }
  }
  return undefined
}

/**
 * The food named in `words`. Tries the last word first, then earlier ones,
 * and at each word the longest name ending there. A flavor is used only
 * when no other food is named. With `lastWordOnly`, only names ending at the
 * last word count.
 */
function findInWords(words: string[], lastWordOnly = false): FoodInfo | undefined {
  if (lastWordOnly) return foodEndingAt(words, words.length)?.food

  let flavor: FoodInfo | undefined
  let end = words.length
  while (end > 0) {
    const found = foodEndingAt(words, end)
    if (!found) {
      end--
    } else if (isFlavor(found.food)) {
      flavor ??= found.food
      end -= found.size
    } else {
      return found.food
    }
  }
  return flavor
}

// ---------------------------------------------------------------------------
// Words that change how a food is kept
// ---------------------------------------------------------------------------

// For a modified name that matched no food
const PLAIN: Pick<FoodInfo, 'unit' | 'defaultQty'> = { unit: 'count', defaultQty: 1 }

const FROZEN = new Set(['frozen'])
const CANNED = new Set(['canned', 'can', 'tinned'])
const DRIED = new Set(['dried', 'dehydrated'])
const COOKED = new Set(['leftover', 'homemade', 'cooked'])

function withModifiers(food: FoodInfo | undefined, words: Set<string>): FoodInfo | undefined {
  const has = (set: Set<string>) => [...set].some((word) => words.has(word))

  if (has(FROZEN) && food?.category !== 'frozen') {
    const freezer = food?.keeps.freezer ?? 180
    return {
      ...(food ?? PLAIN),
      name: food ? `frozen ${food.name}` : 'frozen food',
      category: 'frozen',
      storage: 'freezer',
      expirationDays: freezer,
      keeps: { ...food?.keeps, freezer },
    }
  }

  if (has(CANNED) && food?.storage !== 'pantry') {
    // A canned drink is still a drink
    const category = food?.category === 'beverages' ? 'beverages' : 'pantry'
    return {
      ...(food ?? PLAIN),
      name: food ? `canned ${food.name}` : 'canned food',
      category,
      storage: 'pantry',
      expirationDays: 730,
      keeps: { pantry: 730, refrigerator: 4 },
    }
  }

  if (has(DRIED) && food && food.storage !== 'pantry' && food.storage !== 'spice_rack') {
    return {
      ...food,
      name: `dried ${food.name}`,
      category: 'pantry',
      storage: 'pantry',
      expirationDays: 365,
      keeps: { pantry: 365 },
    }
  }

  // Homemade bread and cookies are still bread and cookies
  if (has(COOKED) && food?.category !== 'bakery' && food?.category !== 'snacks' && food?.category !== 'prepared') {
    return {
      ...(food ?? PLAIN),
      name: food ? `cooked ${food.name}` : 'leftovers',
      category: 'prepared',
      storage: 'refrigerator',
      expirationDays: 4,
      keeps: { refrigerator: 4, freezer: 90 },
    }
  }

  return food
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/**
 * What the food table knows about a name, or undefined when it names no
 * known food. "Organic baby spinach" finds spinach. "Peanut butter cookies"
 * finds cookies, not butter. "Frozen peas" finds peas, kept in the freezer.
 */
export function lookupFood(name: string): FoodInfo | undefined {
  const words = foodWords(name)
  if (words.length === 0) return undefined

  // The name without its description, unless that part names no food: "Bites with almonds" is almonds
  const main = foodWords(mainPart(name))
  const food = (main.length < words.length ? findInWords(main) : undefined) ?? findInWords(words)
  return withModifiers(food, new Set(words))
}

/**
 * The food a category label names, such as Open Food Facts' "potato crisps"
 * or USDA's "Cheese". Only the label's last word counts, so "salty snacks"
 * is snacks and "vegetable fats" is nothing.
 */
export function lookupFoodLabel(label: string): FoodInfo | undefined {
  const words = foodWords(label)
  return words.length === 0 ? undefined : findInWords(words, true)
}

// The table's food for a name, only when it agrees with the category. An item
// filed under another category is probably a different product: "Chicken"
// filed as prepared food is a cooked chicken, not raw meat. The exception is
// frozen: "Strawberries" filed as frozen are frozen strawberries.
function foodFor(name: string, category: FoodCategory): FoodInfo | undefined {
  const food = lookupFood(name)
  if (food && category === 'frozen' && food.category !== 'frozen') return withModifiers(food, new Set(['frozen']))
  return food && food.category === category ? food : undefined
}

export function getDefaultStorageLocation(name: string, category: FoodCategory): StorageLocation {
  return foodFor(name, category)?.storage ?? DEFAULT_STORAGE_LOCATIONS[category] ?? 'refrigerator'
}

export interface ShelfLife {
  days: number
  /** The food the estimate is for. Not set when it comes from the category */
  food?: FoodInfo
}

/**
 * How long an item keeps where it is stored. Uses the food table when the
 * name matches a food of the same category that can be kept there. Otherwise
 * the category's time for that place, or its shortest time when the category
 * has none for that place.
 */
export function estimateShelfLife(name: string, category: FoodCategory, location: StorageLocation): ShelfLife {
  const food = foodFor(name, category)
  const days = food?.keeps[location as keyof Keeps]
  if (food && days) return { days, food }

  const byLocation = DEFAULT_EXPIRATION_DAYS[category] ?? DEFAULT_EXPIRATION_DAYS.other
  return { days: byLocation[location] ?? Math.min(...Object.values(byLocation)) }
}

export function estimateExpirationDate(
  name: string,
  category: FoodCategory,
  location: StorageLocation,
  purchaseDate: string = todayDateString()
): string {
  return toLocalDateString(addDays(parseISO(purchaseDate), estimateShelfLife(name, category, location).days))
}
