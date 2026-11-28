import type { FoodCategory } from '@/types'
import { foodWords, lookupFoodLabel } from './foodDatabase'

// Guess pantry's category from a barcode product's category labels. Open Food
// Facts gives tags such as "en:potato-crisps", listed from general to
// specific. USDA gives one label such as "Cookies & Biscuits". This only picks
// a shelf; it has nothing to do with allergens.

// Labels that cover too much to say anything. "Plant-based foods and
// beverages" holds both pasta and juice, and "cereals and potatoes" holds chips.
const TOO_BROAD = new Set(
  ['plant based foods and beverages', 'plant based foods', 'foods', 'cereals and potatoes', 'groceries']
    .map((label) => foodWords(label).join(' '))
)

// Labels the food table has no entry for, matched on the whole label first and then on its last word
const LABELS: Record<string, FoodCategory> = Object.fromEntries(
  Object.entries<FoodCategory>({
    // Open Food Facts uses "biscuits" for cookies
    'biscuits': 'snacks',
    'biscuits and cakes': 'snacks',
    'biscuits and crackers': 'snacks',
    'cookies and biscuits': 'snacks',
    'confectioneries': 'snacks',
    'sweet snacks': 'snacks',
    'salty snacks': 'snacks',
    'appetizers': 'snacks',
    'desserts': 'snacks',
    'beverages': 'beverages',
    'drinks': 'beverages',
    'dairies': 'dairy',
    'fermented milk products': 'dairy',
    'poultries': 'meat',
    'meats and their products': 'meat',
    'pastries': 'bakery',
    'viennoiseries': 'bakery',
    'condiments': 'condiments',
    'dips': 'condiments',
    'spices': 'pantry',
    'spreads': 'pantry',
    'cocoa and hazelnuts spreads': 'pantry',
    'legumes': 'pantry',
    'pulses': 'pantry',
    'pastas': 'pantry',
    'breakfast cereals': 'pantry',
    'meals': 'prepared',
  }).map(([label, category]) => [foodWords(label).join(' '), category])
)

// Language-tagged labels other than English ("fr:pates-a-tartiner") are skipped
function labelText(label: string): string | undefined {
  const tagged = /^([a-z]{2}):(.*)$/i.exec(label.trim())
  if (tagged && tagged[1].toLowerCase() !== 'en') return undefined
  // "salty snacks made from potato" is about the snacks
  return (tagged ? tagged[2] : label).replace(/-/g, ' ').replace(/\bmade from\b.*$/i, '').trim()
}

function categoryForLabel(text: string): FoodCategory | undefined {
  const words = foodWords(text)
  const key = words.join(' ')
  if (!key || TOO_BROAD.has(key)) return undefined
  return LABELS[key] ?? lookupFoodLabel(text)?.category ?? LABELS[words[words.length - 1]]
}

/**
 * Pantry's category for a product's category labels, or undefined when they
 * say nothing useful. Accepts Open Food Facts tags ("en:dairies"), its
 * comma-separated categories text, or a USDA label.
 *
 * Frozen and canned products go by how they are sold. Otherwise the most
 * specific label that names something wins: for potato chips that is
 * "en:potato-crisps", not "en:plant-based-foods-and-beverages".
 */
export function categoryFromLabels(categories: string | string[] | null | undefined): FoodCategory | undefined {
  if (!categories || categories.length === 0) return undefined
  const labels = (Array.isArray(categories) ? categories : categories.split(','))
    .map(labelText)
    .filter((text): text is string => Boolean(text))

  if (labels.some((text) => /\bfrozen\b/i.test(text))) return 'frozen'
  if (labels.some((text) => /\bcanned\b/i.test(text))) return 'pantry'

  for (let i = labels.length - 1; i >= 0; i--) {
    const category = categoryForLabel(labels[i])
    if (category) return category
  }
  return undefined
}

/**
 * Like categoryFromLabels, but always gives a category: 'other' when there
 * are no labels, and 'pantry' when they name nothing known, since most
 * packaged goods are kept there.
 */
export function mapCategory(categories: string | string[] | null | undefined): FoodCategory {
  if (!categories || categories.length === 0) return 'other'
  return categoryFromLabels(categories) ?? 'pantry'
}
