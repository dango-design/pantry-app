// Sample products for the Pantry tab stories (compact rows, groups, tiles).
import { addDays, format } from 'date-fns'
import type { FoodCategory, FoodItem, QuantityUnit, StorageLocation } from '@/types'
import type { StockInfo } from '@/utils/stock'

interface SampleOptions {
  /** Days until it expires. Negative means it already expired. */
  days?: number
  /** A fixed date instead of `days`, for stories that show the date itself */
  expirationDate?: string
  category?: FoodCategory
  place?: StorageLocation
  quantity?: number
  unit?: QuantityUnit
  batches?: number
}

/** One product as the Pantry tab sees it: totals plus its rows, soonest first */
export function sampleProduct(name: string, options: SampleOptions = {}): StockInfo {
  const {
    days = 14,
    category = 'produce',
    place = 'refrigerator',
    quantity = 2,
    unit = 'count',
    batches = 1,
  } = options
  const expirationDate = options.expirationDate ?? format(addDays(new Date(), days), 'yyyy-MM-dd')
  const items: FoodItem[] = Array.from({ length: batches }, (_, i) => ({
    id: `${name}-${i}`,
    householdId: 'household-1',
    name,
    category,
    quantity,
    quantityUnit: unit,
    originalQuantity: quantity,
    storageLocation: place,
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    expirationDate,
    expirationSource: 'calculated',
    freshnessScore: 80,
    tags: [],
    addedBy: 'user-1',
    addedVia: 'manual',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
  return {
    name,
    key: name.toLowerCase(),
    category,
    unit,
    items,
    counted: quantity * batches,
    estimated: quantity * batches,
    isEstimate: false,
    status: 'ok',
  }
}

/** A fridge with one product for each pill colour */
export const FRIDGE_SAMPLE: StockInfo[] = [
  sampleProduct('Chicken thighs', { days: -2, category: 'meat', quantity: 1.34, unit: 'lb' }),
  sampleProduct('Bread', { days: 0, category: 'bakery', place: 'counter', quantity: 1 }),
  sampleProduct('Greek yogurt', { days: 5, category: 'dairy', quantity: 4 }),
  sampleProduct('Cheddar', { days: 21, category: 'dairy', quantity: 8, unit: 'oz' }),
  sampleProduct('Butter', { days: 35, category: 'dairy', quantity: 2 }),
]
