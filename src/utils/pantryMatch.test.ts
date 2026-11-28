import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FoodItem } from '@/types'
import { dateStringFromToday } from './dates'
import {
  describeStock,
  findInPantry,
  findStockedInPantry,
  isLowStock,
  isSameName,
  locationPhrase,
  normalizeName,
} from './pantryMatch'

const NOW = new Date(2026, 10, 28, 12, 0, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

let nextId = 1

function item(overrides: Partial<FoodItem> = {}): FoodItem {
  const quantity = overrides.quantity ?? 6
  return {
    id: `item-${nextId++}`,
    householdId: 'household',
    name: 'Eggs',
    category: 'dairy',
    quantity,
    quantityUnit: 'count',
    originalQuantity: quantity,
    storageLocation: 'refrigerator',
    purchaseDate: dateStringFromToday(-2),
    expirationDate: dateStringFromToday(14),
    expirationSource: 'calculated',
    freshnessScore: 100,
    tags: [],
    addedBy: 'user',
    addedVia: 'manual',
    status: 'active',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  }
}

describe('normalizeName', () => {
  it('lowercases and drops punctuation and a plural s', () => {
    expect(normalizeName('Eggs!')).toBe('egg')
    expect(normalizeName('  Greek   Yogurt ')).toBe('greek yogurt')
    expect(normalizeName("Ben & Jerry's")).toBe('ben jerry s')
    expect(normalizeName('2% Milk')).toBe('2 milk')
  })

  it('drops the s from each word', () => {
    expect(normalizeName('Chicken Thighs')).toBe('chicken thigh')
    expect(normalizeName('Black Beans')).toBe('black bean')
  })

  it('keeps short words and double s endings', () => {
    expect(normalizeName('Bus')).toBe('bus')
    expect(normalizeName('Gas')).toBe('gas')
    expect(normalizeName('Swiss Cheese')).toBe('swiss cheese')
    expect(normalizeName('Watercress')).toBe('watercress')
  })

  it('is empty when there are no letters a to z or digits', () => {
    expect(normalizeName('')).toBe('')
    expect(normalizeName('  ')).toBe('')
    expect(normalizeName('!!!')).toBe('')
    expect(normalizeName('牛奶')).toBe('')
  })
})

describe('isSameName', () => {
  it('ignores case, punctuation, whitespace and a plural s', () => {
    expect(isSameName('Eggs', 'egg')).toBe(true)
    expect(isSameName('Almond-Milk', 'almond milk')).toBe(true)
    expect(isSameName('  Apples ', 'APPLE')).toBe(true)
  })

  it('is false for different names', () => {
    expect(isSameName('Milk', 'Almond Milk')).toBe(false)
    expect(isSameName('Egg', 'Eggplant')).toBe(false)
  })

  it('is false when either name has nothing to compare', () => {
    expect(isSameName('', '')).toBe(false)
    expect(isSameName('牛奶', '牛奶')).toBe(false)
    expect(isSameName('!!', '??')).toBe(false)
  })
})

describe('findInPantry', () => {
  it('finds an item by the same name', () => {
    const eggs = item()
    expect(findInPantry('egg', [eggs])).toBe(eggs)
  })

  it('finds an item whose name has every word of the query', () => {
    const almond = item({ name: 'Almond Milk' })
    expect(findInPantry('milk', [almond])).toBe(almond)
    expect(findInPantry('Milks', [almond])).toBe(almond)
  })

  it('prefers an exact name over a broader match, whatever the order', () => {
    const almond = item({ name: 'Almond Milk' })
    const milk = item({ name: 'Milk' })
    expect(findInPantry('milk', [almond, milk])).toBe(milk)
  })

  it('matches whole words only', () => {
    expect(findInPantry('egg', [item({ name: 'Eggplant' })])).toBeUndefined()
    expect(findInPantry('almond milk', [item({ name: 'Milk' })])).toBeUndefined()
  })

  it('skips items that are used up, out, or no longer active', () => {
    const inventory = [
      item({ quantity: 0 }),
      item({ status: 'consumed' }),
      item({ status: 'expired' }),
      item({ status: 'discarded' }),
    ]
    expect(findInPantry('eggs', inventory)).toBeUndefined()
  })

  it('finds nothing for an empty name or pantry', () => {
    expect(findInPantry('', [item()])).toBeUndefined()
    expect(findInPantry('!!', [item()])).toBeUndefined()
    expect(findInPantry('eggs', [])).toBeUndefined()
  })
})

describe('isLowStock', () => {
  it('is low at or below a quarter of what was bought', () => {
    expect(isLowStock(item({ quantity: 0.5, originalQuantity: 2, quantityUnit: 'lb' }))).toBe(true)
    expect(isLowStock(item({ quantity: 0.4, originalQuantity: 2, quantityUnit: 'lb' }))).toBe(true)
    expect(isLowStock(item({ quantity: 0.51, originalQuantity: 2, quantityUnit: 'lb' }))).toBe(false)
  })

  it('is low at the last one of several for counted units', () => {
    expect(isLowStock(item({ quantity: 1, originalQuantity: 3 }))).toBe(true)
    expect(isLowStock(item({ quantity: 1, originalQuantity: 2, quantityUnit: 'pack' }))).toBe(true)
    expect(isLowStock(item({ quantity: 2, originalQuantity: 3 }))).toBe(false)
  })

  it('is not low for a single item bought on its own', () => {
    expect(isLowStock(item({ quantity: 1, originalQuantity: 1 }))).toBe(false)
  })

  it('does not apply the last-one rule to measured units', () => {
    expect(isLowStock(item({ quantity: 1, originalQuantity: 2, quantityUnit: 'lb' }))).toBe(false)
  })

  it('is not low when the original quantity is unknown or zero', () => {
    expect(isLowStock(item({ quantity: 0, originalQuantity: 0 }))).toBe(false)
    expect(isLowStock(item({ quantity: 1, originalQuantity: Number.NaN }))).toBe(false)
  })
})

describe('findStockedInPantry', () => {
  it('returns an item in stock that is not running low', () => {
    const eggs = item({ quantity: 6, originalQuantity: 12 })
    expect(findStockedInPantry('Eggs', [eggs])).toBe(eggs)
  })

  it('returns nothing when the match is running low', () => {
    expect(findStockedInPantry('Eggs', [item({ quantity: 1, originalQuantity: 12 })])).toBeUndefined()
  })

  it('returns nothing when there is no match', () => {
    expect(findStockedInPantry('Milk', [item()])).toBeUndefined()
  })
})

describe('locationPhrase', () => {
  it('describes the known places', () => {
    expect(locationPhrase('refrigerator')).toBe('in the fridge')
    expect(locationPhrase('freezer')).toBe('in the freezer')
    expect(locationPhrase('pantry')).toBe('in the pantry')
    expect(locationPhrase('counter')).toBe('on the counter')
    expect(locationPhrase('spice_rack')).toBe('on the spice rack')
  })

  it('says "at home" for any other place', () => {
    expect(locationPhrase('garage')).toBe('at home')
    expect(locationPhrase('')).toBe('at home')
  })
})

describe('describeStock', () => {
  const describeIn = (days: number, overrides: Partial<FoodItem> = {}) =>
    describeStock(item({ quantity: 2, expirationDate: dateStringFromToday(days), ...overrides }))

  it('gives the amount, the place and how long until it expires', () => {
    expect(describeIn(7)).toBe('2 in the fridge · expires in 1 week')
    expect(describeIn(3)).toBe('2 in the fridge · expires in 3 days')
    expect(describeIn(45)).toBe('2 in the fridge · expires in 1 month')
  })

  it('says today and tomorrow without "in"', () => {
    expect(describeIn(0)).toBe('2 in the fridge · expires today')
    expect(describeIn(1)).toBe('2 in the fridge · expires tomorrow')
  })

  it('says expired after the date', () => {
    expect(describeIn(-1)).toBe('2 in the fridge · expired')
  })

  it('labels measured units and rounds the amount', () => {
    expect(describeIn(10, { quantity: 2 / 3, quantityUnit: 'lb', storageLocation: 'pantry' })).toBe(
      '0.67 lb in the pantry · expires in 1 week',
    )
    expect(describeIn(10, { quantity: 1.5, quantityUnit: 'l', storageLocation: 'garage' })).toBe(
      '1.5 L at home · expires in 1 week',
    )
  })
})
