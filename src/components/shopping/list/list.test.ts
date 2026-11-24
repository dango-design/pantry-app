import { describe, expect, it } from 'vitest'
import type { FoodItem, ShoppingListItem, Staple } from '@/types'
import { dateStringFromToday } from '@/utils/dates'
import { getProductMemory } from '@/utils/stock'
import { toReviewItem } from './putAway'
import { getStapleHint } from './stockHint'

// Local dates in November 2026, at noon unless an hour is given
const nov = (day: number, hour = 12) => new Date(2026, 10, day, hour)

function row(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: 'item-1',
    householdId: 'household',
    name: 'BODYARMOR Lite',
    brand: 'BODYARMOR',
    category: 'beverages',
    quantity: 12,
    quantityUnit: 'count',
    originalQuantity: 12,
    storageLocation: 'pantry',
    purchaseDate: '2026-11-01',
    expirationDate: '2027-07-29', // 270 days after the purchase
    expirationSource: 'calculated',
    freshnessScore: 100,
    tags: [],
    addedBy: 'user',
    addedVia: 'manual',
    status: 'active',
    createdAt: nov(1).toISOString(),
    updatedAt: nov(1).toISOString(),
    ...overrides,
  }
}

function staple(overrides: Partial<Staple> = {}): Staple {
  return {
    id: 'staple-1',
    name: 'BODYARMOR Lite',
    category: 'beverages',
    unit: 'count',
    minQuantity: 6,
    buyQuantity: 12,
    dailyUse: 1,
    autoAdd: true,
    countedAt: nov(1, 9).toISOString(),
    createdAt: nov(1, 9).toISOString(),
    updatedAt: nov(1, 9).toISOString(),
    ...overrides,
  }
}

function listItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: 'shop-1',
    shoppingListId: 'demo-list',
    name: 'BODYARMOR Lite',
    source: 'manual',
    isChecked: true,
    priority: 'normal',
    createdAt: nov(1).toISOString(),
    updatedAt: nov(1).toISOString(),
    ...overrides,
  }
}

describe('toReviewItem', () => {
  it('uses what was saved the last time the product was bought', () => {
    const memory = getProductMemory([row({ expirationSource: 'manual' })], [])
    const review = toReviewItem(listItem({ name: 'bodyarmor lite', category: 'other' }), memory)

    expect(review).toMatchObject({
      id: 'shop-1',
      name: 'bodyarmor lite',
      category: 'beverages',
      quantity: 12,
      quantityUnit: 'count',
      storageLocation: 'pantry',
      brand: 'BODYARMOR',
      expirationDate: dateStringFromToday(270),
      selected: true,
    })
  })

  it('keeps the quantity and unit of the list item', () => {
    const memory = getProductMemory([row()], [])
    const review = toReviewItem(listItem({ quantity: 2, quantityUnit: 'pack' }), memory)

    expect(review.quantity).toBe(2)
    expect(review.quantityUnit).toBe('pack')
  })

  it('uses the remembered unit when the list item has a quantity but no unit', () => {
    const memory = getProductMemory([row({ name: 'Chicken Thighs', quantityUnit: 'lb' })], [])
    const review = toReviewItem(listItem({ name: 'Chicken Thighs', quantity: 2 }), memory)

    expect(review.quantity).toBe(2)
    expect(review.quantityUnit).toBe('lb')
  })

  it('estimates the date again when the last one was an estimate', () => {
    const memory = getProductMemory([row({ name: 'Spinach', category: 'produce', storageLocation: 'refrigerator', expirationDate: '2026-11-20' })], [])
    const review = toReviewItem(listItem({ name: 'Spinach' }), memory)

    expect(review).toMatchObject({ category: 'produce', storageLocation: 'refrigerator', expirationDate: dateStringFromToday(5) })
  })

  it('estimates the date when the last purchase has no shelf life', () => {
    const memory = getProductMemory([row({ expirationDate: '2026-11-01' })], [])
    const review = toReviewItem(listItem(), memory)

    expect(review.expirationDate! > dateStringFromToday(0)).toBe(true)
  })

  it('falls back to the food table for a product never bought', () => {
    const review = toReviewItem(listItem({ name: 'Milk', category: 'dairy' }), getProductMemory([], []))

    expect(review).toMatchObject({ name: 'Milk', category: 'dairy', quantity: 1, storageLocation: 'refrigerator' })
    expect(review.brand).toBeUndefined()
  })

  it("uses the staple's buy quantity for a staple never bought", () => {
    const memory = getProductMemory([], [staple()])
    const review = toReviewItem(listItem({ category: 'beverages' }), memory)

    expect(review.quantity).toBe(12)
  })
})

describe('getStapleHint', () => {
  it('returns nothing for a name that is not a staple', () => {
    expect(getStapleHint('Milk', [row()], [staple()], nov(10))).toBeUndefined()
  })

  it('shows the estimate and the run-out date, not the pantry quantity', () => {
    // 12 counted on Nov 1 at 1 a day leaves about 3 on Nov 10
    expect(getStapleHint('bodyarmor lite', [row()], [staple()], nov(10))).toEqual({
      text: 'About 3 left · out by Nov 13',
      status: 'low',
    })
  })

  it('says "Out" when nothing is left', () => {
    expect(getStapleHint('BODYARMOR Lite', [], [staple()], nov(10))).toEqual({ text: 'Out', status: 'out' })
    expect(getStapleHint('BODYARMOR Lite', [row()], [staple()], nov(20))).toEqual({ text: 'Out', status: 'out' })
  })

  it('shows the counted amount when it is not an estimate', () => {
    expect(getStapleHint('BODYARMOR Lite', [row()], [staple({ dailyUse: undefined })], nov(10))).toEqual({
      text: '12 left',
      status: 'ok',
    })
  })
})
