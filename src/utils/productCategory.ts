import type { FoodCategory } from '@/types'

/**
 * Guess pantry's category from Open Food Facts categories. Accepts OFF's category tags
 * ("en:dairies") or its free-text categories string. Moved here from the barcode-lookup Edge Function
 * so the browser can use it. This only picks a shelf; it has nothing to do with allergens.
 */
export function mapCategory(categories: string | string[] | null | undefined): FoodCategory {
  if (!categories || categories.length === 0) return 'other'

  const lower = (Array.isArray(categories) ? categories.join(' ') : categories).toLowerCase().replace(/-/g, ' ')

  if (lower.includes('fruit') || lower.includes('vegetable') || lower.includes('produce')) {
    return 'produce'
  }
  if (lower.includes('dairy') || lower.includes('dairies') || lower.includes('milk') || lower.includes('cheese') || lower.includes('yogurt')) {
    return 'dairy'
  }
  if (lower.includes('meat') || lower.includes('poultry') || lower.includes('beef') || lower.includes('chicken') || lower.includes('pork')) {
    return 'meat'
  }
  if (lower.includes('frozen')) {
    return 'frozen'
  }
  if (lower.includes('bread') || lower.includes('bakery') || lower.includes('pastry') || lower.includes('pastries')) {
    return 'bakery'
  }
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('juice') || lower.includes('soda') || lower.includes('water')) {
    return 'beverages'
  }
  if (lower.includes('condiment') || lower.includes('sauce') || lower.includes('dressing')) {
    return 'condiments'
  }
  if (lower.includes('snack') || lower.includes('chip') || lower.includes('cookie') || lower.includes('biscuit') || lower.includes('candy')) {
    return 'snacks'
  }
  if (lower.includes('seafood') || lower.includes('fish') || lower.includes('shrimp')) {
    return 'seafood'
  }

  return 'pantry'
}
