import type { ReviewItem } from '@/components/smart-input'
import type { ShoppingListItem } from '@/types'
import { dateStringFromToday } from '@/utils/dates'
import { estimateExpirationDate, getDefaultStorageLocation, lookupFood } from '@/utils/foodDatabase'
import { findProductMemory, type ProductMemory } from '@/utils/stock'

/**
 * The "Add to pantry" review row for a checked list item.
 *
 * A product bought before goes where it went last time, with the same
 * category and brand. It keeps as long as last time when someone typed or
 * scanned that date; a date the app estimated is estimated again. The list
 * item's own quantity wins. Without one, the row gets the amount bought last
 * time.
 *
 * A product never bought before gets its details from the general food table.
 */
export function toReviewItem(item: ShoppingListItem, memory: ProductMemory[]): ReviewItem {
  const quantity = item.quantity !== undefined && item.quantity > 0 ? item.quantity : undefined
  const known = findProductMemory(item.name, memory)

  // A staple counts even before its first purchase: it knows its unit and how many to buy
  if (known && (known.timesBought > 0 || known.isStaple)) {
    return {
      id: item.id,
      name: item.name,
      category: known.category,
      quantity: quantity ?? (known.usualQuantity || 1),
      // The remembered amount is in the remembered unit, so they go together
      quantityUnit: quantity !== undefined ? item.quantityUnit ?? known.unit : known.unit,
      storageLocation: known.storageLocation,
      brand: known.brand,
      expirationDate: known.shelfLifeFromUser && known.shelfLifeDays > 0
        ? dateStringFromToday(known.shelfLifeDays)
        : estimateExpirationDate(item.name, known.category, known.storageLocation),
      selected: true,
    }
  }

  const food = lookupFood(item.name)
  const category = item.category && item.category !== 'other' ? item.category : food?.category ?? 'other'
  const storageLocation = getDefaultStorageLocation(item.name, category)
  return {
    id: item.id,
    name: item.name,
    category,
    quantity: quantity ?? 1,
    quantityUnit: item.quantityUnit || food?.unit || 'count',
    storageLocation,
    expirationDate: estimateExpirationDate(item.name, category, storageLocation),
    selected: true,
  }
}
