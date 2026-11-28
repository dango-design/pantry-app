import { describe, expect, it } from 'vitest'
import type { FoodItem } from '@/types'
import { describeExpiry, estimateExpiry, formatShelfLife, guessItem, parseCategory } from './itemDefaults'
import { getProductMemory } from './stock'
import { parseUnit } from './units'

function row(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: 'item-1',
    householdId: 'household',
    name: 'Oat Milk',
    brand: 'Oatly',
    category: 'beverages',
    quantity: 2,
    quantityUnit: 'count',
    originalQuantity: 2,
    storageLocation: 'refrigerator',
    purchaseDate: '2026-11-01',
    expirationDate: '2026-11-11',
    expirationSource: 'manual',
    freshnessScore: 100,
    tags: [],
    addedBy: 'user',
    addedVia: 'manual',
    status: 'active',
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('guessItem', () => {
  it('uses what the household saved last time for a product bought before', () => {
    const memory = getProductMemory([row()], [])
    expect(guessItem('oat milk', memory)).toEqual({
      category: 'beverages',
      unit: 'count',
      quantity: 2,
      storageLocation: 'refrigerator',
      brand: 'Oatly',
      source: 'history',
    })
  })

  it('uses the food table for a name not bought before', () => {
    expect(guessItem('Eggs', [])).toMatchObject({ category: 'dairy', quantity: 12, storageLocation: 'refrigerator', source: 'food' })
  })

  it("files an unknown name as 'other' in the fridge", () => {
    expect(guessItem('Birthday candles', [])).toEqual({
      category: 'other',
      unit: 'count',
      quantity: 1,
      storageLocation: 'refrigerator',
      source: 'none',
    })
  })
})

describe('estimateExpiry', () => {
  it('reuses a shelf life the household typed, for the same place', () => {
    const memory = getProductMemory([row()], [])
    expect(estimateExpiry('Oat milk', 'beverages', 'refrigerator', '2026-11-20', memory)).toMatchObject({
      date: '2026-11-30',
      days: 10,
      basis: 'history',
    })
  })

  it('estimates again when the last date was only an estimate', () => {
    const memory = getProductMemory([row({ name: 'Spinach', category: 'produce', expirationSource: 'calculated', expirationDate: '2026-11-15' })], [])
    expect(estimateExpiry('Spinach', 'produce', 'refrigerator', '2026-11-20', memory)).toMatchObject({
      date: '2026-11-25',
      basis: 'food',
      foodName: 'spinach',
    })
  })

  it('estimates again for a different place', () => {
    const memory = getProductMemory([row()], [])
    expect(estimateExpiry('Oat milk', 'beverages', 'freezer', '2026-11-20', memory).basis).not.toBe('history')
  })

  it("uses the category's time for an unknown name", () => {
    expect(estimateExpiry('Mystery item', 'dairy', 'refrigerator', '2026-11-20')).toMatchObject({
      date: '2026-12-04',
      basis: 'category',
    })
  })
})

describe('describeExpiry', () => {
  it('says where the date came from', () => {
    const memory = getProductMemory([row()], [])
    expect(describeExpiry(estimateExpiry('Oat milk', 'beverages', 'refrigerator', '2026-11-20', memory)))
      .toBe('10 days, the same as the date you entered last time')
    expect(describeExpiry(estimateExpiry('Spinach', 'produce', 'refrigerator', '2026-11-20')))
      .toBe('About 5 days in the fridge, typical for spinach')
    expect(describeExpiry(estimateExpiry('Mystery item', 'dairy', 'refrigerator', '2026-11-20')))
      .toBe('About 2 weeks in the fridge, typical for dairy')
    expect(describeExpiry(estimateExpiry('Mystery item', 'other', 'refrigerator', '2026-11-20')))
      .toBe('About 7 days in the fridge. Pick a category for a better guess')
  })
})

describe('formatShelfLife', () => {
  it('rounds to a unit that reads naturally', () => {
    expect(formatShelfLife(1)).toBe('1 day')
    expect(formatShelfLife(10)).toBe('10 days')
    expect(formatShelfLife(21)).toBe('3 weeks')
    expect(formatShelfLife(90)).toBe('3 months')
    expect(formatShelfLife(240)).toBe('8 months')
    expect(formatShelfLife(365)).toBe('1 year')
    expect(formatShelfLife(548)).toBe('1.5 years')
    expect(formatShelfLife(1095)).toBe('3 years')
  })
})

describe('parseCategory', () => {
  it('accepts category names in any case and nothing else', () => {
    expect(parseCategory('Dairy')).toBe('dairy')
    expect(parseCategory(' produce ')).toBe('produce')
    expect(parseCategory('spices')).toBeUndefined()
    expect(parseCategory('toString')).toBeUndefined()
    expect(parseCategory(undefined)).toBeUndefined()
  })
})

describe('parseUnit', () => {
  it('maps scan spellings to the app units', () => {
    expect(parseUnit('gallon')).toBe('gal')
    expect(parseUnit('L')).toBe('l')
    expect(parseUnit('mL')).toBe('ml')
    expect(parseUnit('lbs')).toBe('lb')
    expect(parseUnit('Count')).toBe('count')
    expect(parseUnit('pkg.')).toBe('pack')
  })

  it("uses 'count' for units the app does not have", () => {
    expect(parseUnit('pint')).toBe('count')
    expect(parseUnit('')).toBe('count')
    expect(parseUnit(undefined)).toBe('count')
  })
})
