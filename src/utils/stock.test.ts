import { describe, expect, it } from 'vitest'
import type { FoodItem, ShoppingListItem, Staple } from '@/types'
import {
  describeRunOut,
  findProductMemory,
  findStaple,
  formatStockCount,
  getDailyUse,
  getProductMemory,
  getRestockSuggestions,
  getStock,
  groupByProduct,
  isOnShoppingList,
  learnDailyUse,
  productKey,
  withStockCount,
} from './stock'

// Local dates in November 2026, at noon unless an hour is given
const nov = (day: number, hour = 12) => new Date(2026, 10, day, hour)
const novDate = (day: number) => `2026-11-${String(day).padStart(2, '0')}`

let nextId = 1

function row(overrides: Partial<FoodItem> = {}): FoodItem {
  const id = `item-${nextId++}`
  const quantity = overrides.quantity ?? 12
  return {
    id,
    householdId: 'household',
    name: 'BODYARMOR Lite',
    category: 'beverages',
    quantity,
    quantityUnit: 'count',
    originalQuantity: quantity,
    storageLocation: 'pantry',
    purchaseDate: novDate(1),
    expirationDate: '2027-08-01',
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

// A purchase that has since been used up
function usedUp(overrides: Partial<FoodItem> = {}): FoodItem {
  return row({ quantity: 0, originalQuantity: 12, status: 'consumed', consumedAt: nov(1).toISOString(), ...overrides })
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
    id: `shop-${nextId++}`,
    shoppingListId: 'demo-list',
    name: 'BODYARMOR Lite',
    source: 'manual',
    isChecked: false,
    priority: 'normal',
    createdAt: nov(1).toISOString(),
    updatedAt: nov(1).toISOString(),
    ...overrides,
  }
}

describe('productKey and findStaple', () => {
  it('ignores case, punctuation, and a plural s', () => {
    expect(productKey('Eggs!')).toBe('egg')
    expect(productKey('bodyarmor  LITE')).toBe(productKey('BodyArmor Lite'))
  })

  it('keeps names that have no letters a to z', () => {
    expect(productKey(' 牛奶 ')).toBe('牛奶')
    expect(productKey('牛奶')).not.toBe(productKey('豆腐'))
  })

  it('finds a staple by name', () => {
    const staples = [staple()]
    expect(findStaple('bodyarmor lite', staples)?.id).toBe('staple-1')
    expect(findStaple('Gatorade', staples)).toBeUndefined()
  })
})

describe('getStock estimate', () => {
  const inventory = [row()]
  const staples = [staple()]

  it('equals the count on the day of the count', () => {
    const stock = getStock('BODYARMOR Lite', inventory, staples, nov(1, 23))
    expect(stock.counted).toBe(12)
    expect(stock.estimated).toBe(12)
    expect(stock.isEstimate).toBe(false)
    expect(stock.status).toBe('ok')
  })

  it('goes down by the daily use for each day since the count', () => {
    const stock = getStock('BODYARMOR Lite', inventory, staples, nov(9))
    expect(stock.counted).toBe(12)
    expect(stock.estimated).toBe(4)
    expect(stock.isEstimate).toBe(true)
    expect(stock.dailyUse).toBe(1)
    expect(stock.dailyUseSource).toBe('typed')
    expect(stock.daysLeft).toBe(4)
    expect(stock.runOutDate).toBe(novDate(13))
  })

  it('never goes below zero', () => {
    const stock = getStock('BODYARMOR Lite', inventory, staples, nov(25))
    expect(stock.estimated).toBe(0)
    expect(stock.status).toBe('out')
    expect(stock.runOutDate).toBeUndefined()
  })

  it('stays at the count when the daily use is not known', () => {
    const stock = getStock('BODYARMOR Lite', inventory, [staple({ dailyUse: undefined })], nov(9))
    expect(stock.estimated).toBe(12)
    expect(stock.isEstimate).toBe(false)
    expect(stock.daysLeft).toBeUndefined()
  })

  it('stays at the count for a product that is not a staple', () => {
    const stock = getStock('BODYARMOR Lite', inventory, [], nov(9))
    expect(stock.estimated).toBe(12)
    expect(stock.staple).toBeUndefined()
  })

  it('adds up rows in the staple unit and leaves out rows that cannot convert', () => {
    const rows = [row({ quantity: 6 }), row({ quantity: 1, quantityUnit: 'dozen' }), row({ quantity: 2, quantityUnit: 'pack' })]
    const stock = getStock('BODYARMOR Lite', rows, staples, nov(1))
    expect(stock.counted).toBe(18)
    expect(stock.items).toHaveLength(3)
  })

  it('lists rows with the soonest expiry first', () => {
    const rows = [row({ id: 'later', expirationDate: '2027-09-01' }), row({ id: 'sooner', expirationDate: '2027-03-01' })]
    expect(getStock('BODYARMOR Lite', rows, [], nov(1)).items.map((item) => item.id)).toEqual(['sooner', 'later'])
  })
})

describe('getStock status', () => {
  // 12 counted on Nov 1 at 1 a day, keep at least 6
  const statusOn = (day: number) => getStock('BODYARMOR Lite', [row()], [staple()], nov(day)).status

  it('is ok above the minimum', () => {
    expect(statusOn(6)).toBe('ok') // 7 left
  })

  it('is low at the minimum and below it', () => {
    expect(statusOn(7)).toBe('low') // 6 left
    expect(statusOn(12)).toBe('low') // 1 left
  })

  it('is out at zero', () => {
    expect(statusOn(13)).toBe('out')
  })

  it('is out for a counted unit when the estimate rounds to zero', () => {
    // 1 counted, 0.3 a day: 0.4 left after two days
    const stock = getStock('BODYARMOR Lite', [row({ quantity: 1 })], [staple({ dailyUse: 0.3, minQuantity: 0 })], nov(3))
    expect(stock.estimated).toBeCloseTo(0.4)
    expect(stock.status).toBe('out')
  })

  it('is out for a staple with no rows', () => {
    expect(getStock('BODYARMOR Lite', [], [staple()], nov(1)).status).toBe('out')
  })

  it('uses the quarter rule for products that are not staples', () => {
    const low = row({ name: 'Eggs', quantity: 1, originalQuantity: 12 })
    const fresh = row({ name: 'Eggs', quantity: 12 })
    expect(getStock('Eggs', [low], [], nov(1)).status).toBe('low')
    expect(getStock('Eggs', [low, fresh], [], nov(1)).status).toBe('ok')
    expect(getStock('Eggs', [], [], nov(1)).status).toBe('out')
  })
})

describe('learnDailyUse', () => {
  const first = usedUp({ purchaseDate: novDate(1) })
  const second = usedUp({ purchaseDate: novDate(13) })
  const third = row({ purchaseDate: novDate(25) })

  it('needs three purchase dates', () => {
    expect(learnDailyUse('BODYARMOR Lite', [first, second])).toBeUndefined()
  })

  it('divides what was bought before the latest purchase by the days it lasted', () => {
    // 24 bought over the 24 days from Nov 1 to Nov 25
    expect(learnDailyUse('BODYARMOR Lite', [first, second, third])).toBe(1)
  })

  it('counts two purchases on one date as one', () => {
    const sameDay = usedUp({ purchaseDate: novDate(13) })
    expect(learnDailyUse('BODYARMOR Lite', [first, second, sameDay])).toBeUndefined()
    expect(learnDailyUse('BODYARMOR Lite', [first, second, sameDay, third])).toBe(1.5)
  })

  it('converts units and skips rows that cannot convert', () => {
    const dozen = usedUp({ purchaseDate: novDate(13), quantityUnit: 'dozen', originalQuantity: 1 })
    const pack = usedUp({ purchaseDate: novDate(19), quantityUnit: 'pack', originalQuantity: 2 })
    expect(learnDailyUse('BODYARMOR Lite', [first, dozen, pack, third], 'count')).toBe(1)
  })

  it('ignores other products', () => {
    const other = usedUp({ name: 'Gatorade', purchaseDate: novDate(13) })
    expect(learnDailyUse('BODYARMOR Lite', [first, other, third])).toBeUndefined()
  })

  it('wins over the typed rate in getDailyUse', () => {
    const typed = staple({ dailyUse: 3 })
    expect(getDailyUse(typed, [first, second, third])).toEqual({ rate: 1, source: 'learned' })
    expect(getDailyUse(typed, [first, third])).toEqual({ rate: 3, source: 'typed' })
    expect(getDailyUse(staple({ dailyUse: undefined }), [first, third])).toBeUndefined()
  })
})

describe('groupByProduct', () => {
  it('has one entry per product in stock, then staples with nothing in stock', () => {
    const inventory = [
      row({ name: 'Eggs', quantity: 6 }),
      row({ name: 'eggs', quantity: 6 }),
      row({ name: 'Rice', quantity: 2, quantityUnit: 'lb' }),
      usedUp(),
    ]
    const stocks = groupByProduct(inventory, [staple()], nov(1))
    expect(stocks.map((stock) => stock.key)).toEqual(['egg', 'rice', 'bodyarmor lite'])
    expect(stocks[0].counted).toBe(12)
    expect(stocks[2]).toMatchObject({ name: 'BODYARMOR Lite', category: 'beverages', unit: 'count', status: 'out', counted: 0 })
  })
})

describe('getRestockSuggestions', () => {
  const now = nov(9)
  const lowStaple = [row()] // 12 counted Nov 1, about 4 left on Nov 9
  const lowEggs = row({ name: 'Eggs', category: 'dairy', quantity: 1, originalQuantity: 12 })
  const usedUpMilk = usedUp({ name: 'Milk', category: 'dairy', originalQuantity: 2, consumedAt: nov(5).toISOString() })

  it('suggests a low staple with how much to buy', () => {
    expect(getRestockSuggestions(lowStaple, [staple()], [], now)).toEqual([
      {
        name: 'BODYARMOR Lite',
        category: 'beverages',
        quantity: 12,
        unit: 'count',
        reason: 'low',
        detail: 'About 4 left, out by Nov 13',
        stapleId: 'staple-1',
      },
    ])
  })

  it('suggests a product that is low and one used up in the last 14 days', () => {
    const suggestions = getRestockSuggestions([lowEggs, usedUpMilk], [], [], now)
    expect(suggestions).toEqual([
      { name: 'Milk', category: 'dairy', quantity: 2, unit: 'count', reason: 'out', detail: 'Out' },
      { name: 'Eggs', category: 'dairy', quantity: 12, unit: 'count', reason: 'low', detail: '1 left' },
    ])
  })

  it('leaves out a product used up more than 14 days ago', () => {
    const oldMilk = usedUp({ name: 'Milk', consumedAt: new Date(2026, 9, 20).toISOString() })
    expect(getRestockSuggestions([oldMilk], [], [], now)).toEqual([])
  })

  it('leaves out a used-up product that is back in stock', () => {
    const newMilk = row({ name: 'Milk', quantity: 2 })
    expect(getRestockSuggestions([usedUpMilk, newMilk], [], [], now)).toEqual([])
  })

  it('leaves out what is already on the list', () => {
    const list = [listItem({ name: 'bodyarmor lite' }), listItem({ name: 'milk' }), listItem({ name: 'Egg' })]
    expect(getRestockSuggestions([...lowStaple, lowEggs, usedUpMilk], [staple()], list, now)).toEqual([])
  })

  it('still suggests when the list item was checked off long ago', () => {
    const list = [listItem({ name: 'Milk', isChecked: true, checkedAt: new Date(2026, 9, 1).toISOString() })]
    expect(getRestockSuggestions([usedUpMilk], [], list, now)).toHaveLength(1)
  })

  it('puts out before low, and staples first within each', () => {
    const outStaple = staple({ id: 'staple-2', name: 'Coffee', category: 'pantry' })
    const suggestions = getRestockSuggestions([...lowStaple, lowEggs, usedUpMilk], [staple(), outStaple], [], now)
    expect(suggestions.map((s) => `${s.name}: ${s.reason}`)).toEqual([
      'Coffee: out',
      'Milk: out',
      'BODYARMOR Lite: low',
      'Eggs: low',
    ])
  })
})

describe('isOnShoppingList', () => {
  const now = nov(9)

  it('is true for an unchecked item of the same name', () => {
    expect(isOnShoppingList('Eggs', [listItem({ name: 'egg' })], now)).toBe(true)
    expect(isOnShoppingList('Eggs', [listItem({ name: 'Milk' })], now)).toBe(false)
  })

  it('is true for an item checked off in the last 3 days only', () => {
    const recent = listItem({ name: 'Eggs', isChecked: true, checkedAt: nov(8).toISOString() })
    const old = listItem({ name: 'Eggs', isChecked: true, checkedAt: nov(2).toISOString() })
    const undated = listItem({ name: 'Eggs', isChecked: true })
    expect(isOnShoppingList('Eggs', [recent], now)).toBe(true)
    expect(isOnShoppingList('Eggs', [old], now)).toBe(false)
    expect(isOnShoppingList('Eggs', [undated], now)).toBe(false)
  })
})

describe('getProductMemory', () => {
  const inventory = [
    usedUp({ purchaseDate: novDate(1), brand: 'BODYARMOR' }),
    row({ name: 'Bodyarmor Lite', purchaseDate: novDate(13), expirationDate: '2026-12-13', storageLocation: 'refrigerator', quantity: 5, originalQuantity: 24 }),
    row({ name: 'Eggs', category: 'dairy', purchaseDate: novDate(3), expirationDate: novDate(24) }),
    usedUp({ name: 'Eggs', category: 'dairy', purchaseDate: novDate(10) }),
    usedUp({ name: 'eggs', category: 'dairy', purchaseDate: novDate(17) }),
    row({ name: 'Rice', category: 'pantry', quantityUnit: 'lb', quantity: 2, purchaseDate: novDate(20) }),
  ]
  const staples = [staple(), staple({ id: 'staple-2', name: 'Coffee', category: 'pantry', unit: 'pack', buyQuantity: 2 })]
  const memory = getProductMemory(inventory, staples)

  it('sorts staples first, then the most times bought, then the most recent', () => {
    expect(memory.map((entry) => entry.key)).toEqual(['bodyarmor lite', 'coffee', 'egg', 'rice'])
  })

  it('remembers the last purchase of a product', () => {
    // The last purchase was 24, but a staple's usual amount is its buy quantity
    expect(findProductMemory('BODYARMOR LITE', memory)).toEqual({
      name: 'Bodyarmor Lite',
      key: 'bodyarmor lite',
      category: 'beverages',
      unit: 'count',
      usualQuantity: 12,
      storageLocation: 'refrigerator',
      shelfLifeDays: 30,
      shelfLifeFromUser: false,
      timesBought: 2,
      lastPurchased: novDate(13),
      brand: 'BODYARMOR',
      isStaple: true,
    })
    expect(findProductMemory('egg', memory)).toMatchObject({ name: 'eggs', timesBought: 3, isStaple: false })
  })

  it('remembers the latest shelf life someone typed for the same place', () => {
    const rows = [
      row({ name: 'Oat Milk', purchaseDate: novDate(1), expirationDate: novDate(11), storageLocation: 'refrigerator', expirationSource: 'manual' }),
      // Kept somewhere else: not the same shelf life
      row({ name: 'Oat Milk', purchaseDate: novDate(5), expirationDate: '2027-02-05', storageLocation: 'freezer', expirationSource: 'manual' }),
      // The app's own estimate: a typed date beats it
      row({ name: 'Oat Milk', purchaseDate: novDate(9), expirationDate: novDate(16), storageLocation: 'refrigerator' }),
    ]
    expect(findProductMemory('oat milk', getProductMemory(rows, []))).toMatchObject({
      storageLocation: 'refrigerator',
      shelfLifeDays: 10,
      shelfLifeFromUser: true,
    })
  })

  it('includes a staple that was never bought', () => {
    expect(findProductMemory('coffee', memory)).toMatchObject({
      name: 'Coffee',
      unit: 'pack',
      usualQuantity: 2,
      timesBought: 0,
      lastPurchased: '',
      isStaple: true,
    })
  })

  it('finds nothing for an unknown name', () => {
    expect(findProductMemory('Tofu', memory)).toBeUndefined()
  })
})

describe('display', () => {
  it('formats an estimate as "About" with a whole number for counted units', () => {
    const stock = getStock('BODYARMOR Lite', [row()], [staple({ dailyUse: 0.7 })], nov(4)) // 12 - 2.1
    expect(stock.estimated).toBeCloseTo(9.9)
    expect(formatStockCount(stock)).toBe('About 10')
  })

  it('formats a count as it is', () => {
    expect(formatStockCount(getStock('BODYARMOR Lite', [row()], [staple()], nov(1)))).toBe('12')
    expect(formatStockCount(getStock('Rice', [row({ name: 'Rice', quantity: 1.5, quantityUnit: 'lb' })], [], nov(1)))).toBe('1.5 lb')
  })

  it('keeps decimals in an estimate for measured units', () => {
    const rice = [row({ name: 'Rice', quantity: 2, quantityUnit: 'lb' })]
    const stock = getStock('Rice', rice, [staple({ name: 'Rice', unit: 'lb', dailyUse: 0.25, minQuantity: 1 })], nov(4))
    expect(formatStockCount(stock)).toBe('About 1.25 lb')
  })

  it('describes when a staple runs out', () => {
    const stockOn = (day: number) => getStock('BODYARMOR Lite', [row()], [staple({ dailyUse: 1.5 })], nov(day))
    expect(describeRunOut(stockOn(2), nov(2))).toBe('Out by Nov 9') // 10.5 left, 7 full days
    expect(describeRunOut(stockOn(8), nov(8))).toBe('Out tomorrow') // 1.5 left
    // 1 left at 2 a day: less than a day's use
    const lastOne = getStock('BODYARMOR Lite', [row({ quantity: 1 })], [staple({ dailyUse: 2, minQuantity: 0 })], nov(1))
    expect(describeRunOut(lastOne, nov(1))).toBe('Out today')
  })

  it('says nothing about running out when out or when the use is not known', () => {
    expect(describeRunOut(getStock('BODYARMOR Lite', [row()], [staple()], nov(25)), nov(25))).toBeUndefined()
    expect(describeRunOut(getStock('BODYARMOR Lite', [row()], [], nov(9)), nov(9))).toBeUndefined()
  })
})

describe('withStockCount', () => {
  const now = nov(9)
  const sooner = () => row({ id: 'sooner', quantity: 4, expirationDate: '2027-03-01', purchaseDate: novDate(1) })
  const later = () => row({ id: 'later', quantity: 12, expirationDate: '2027-09-01', purchaseDate: novDate(5) })
  const quantities = (inventory: FoodItem[] | null) => inventory?.map((item) => `${item.id}: ${item.quantity} ${item.status}`)

  it('returns the same array when the count is already right', () => {
    const inventory = [sooner(), later()]
    expect(withStockCount(inventory, 'BODYARMOR Lite', 16, 'count', now)).toBe(inventory)
  })

  it('lowers by taking from the row that expires soonest', () => {
    const lowered = withStockCount([later(), sooner()], 'BODYARMOR Lite', 14, 'count', now)
    expect(quantities(lowered)).toEqual(['later: 12 active', 'sooner: 2 active'])
  })

  it('marks a row that reaches zero as used up', () => {
    const lowered = withStockCount([later(), sooner()], 'BODYARMOR Lite', 9, 'count', now)
    expect(quantities(lowered)).toEqual(['later: 9 active', 'sooner: 0 consumed'])
    expect(lowered?.[1].consumedAt).toBe(now.toISOString())
  })

  it('raises by adding to the most recently bought row', () => {
    const raised = withStockCount([later(), sooner()], 'BODYARMOR Lite', 20, 'count', now)
    expect(quantities(raised)).toEqual(['later: 16 active', 'sooner: 4 active'])
  })

  it('brings back the latest used-up row when nothing is in stock', () => {
    const inventory = [
      usedUp({ id: 'old', purchaseDate: novDate(1) }),
      usedUp({ id: 'new', purchaseDate: novDate(5) }),
    ]
    const raised = withStockCount(inventory, 'BODYARMOR Lite', 3, 'count', now)
    expect(raised).toHaveLength(2)
    expect(quantities(raised)).toEqual(['old: 0 consumed', 'new: 3 active'])
    expect(raised?.[1]).toMatchObject({ originalQuantity: 12, purchaseDate: novDate(5), consumedAt: undefined })
  })

  it('gives a row brought back after its date a new expiration date', () => {
    const milk = usedUp({ name: 'Milk', purchaseDate: '2026-10-01', expirationDate: '2026-10-08' })
    const raised = withStockCount([milk], 'Milk', 1, 'count', now)
    expect(raised?.[0]).toMatchObject({ quantity: 1, status: 'active', purchaseDate: '2026-10-01', expirationDate: novDate(16) })
  })

  it('returns null when the product has no row to hold the count', () => {
    expect(withStockCount([row({ name: 'Eggs' })], 'BODYARMOR Lite', 3, 'count', now)).toBeNull()
    expect(withStockCount([], 'BODYARMOR Lite', 0, 'count', now)).toEqual([])
  })

  it('leaves other products and rows in other units alone', () => {
    const inventory = [row({ id: 'eggs', name: 'Eggs' }), row({ id: 'packs', quantity: 2, quantityUnit: 'pack' }), sooner()]
    const lowered = withStockCount(inventory, 'BODYARMOR Lite', 0, 'count', now)
    expect(quantities(lowered)).toEqual(['eggs: 12 active', 'packs: 2 active', 'sooner: 0 consumed'])
  })
})
