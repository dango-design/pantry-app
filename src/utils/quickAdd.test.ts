import { describe, expect, it } from 'vitest'
import type { FoodItem, ShoppingListItem, Staple } from '@/types'
import {
  describeItem,
  describeStapleStock,
  findAtHome,
  formatItemQuantity,
  getSuggestions,
  getUsualItems,
  matchRank,
  parseQuickAdd,
  resolveQuickAdd,
} from './quickAdd'
import { getProductMemory, productKey } from './stock'

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
  return row({ quantity: 0, originalQuantity: 1, status: 'consumed', consumedAt: nov(1).toISOString(), ...overrides })
}

// Keep at least 6, about 1 a day, buy 12, counted on Nov 1
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

describe('parseQuickAdd', () => {
  it('leaves text with no quantity as the name', () => {
    expect(parseQuickAdd('milk')).toEqual({ name: 'milk' })
    expect(parseQuickAdd('  almond   milk ')).toEqual({ name: 'almond milk' })
    expect(parseQuickAdd('')).toEqual({ name: '' })
  })

  it('reads a quantity at the start', () => {
    expect(parseQuickAdd('2 milk')).toEqual({ name: 'milk', quantity: 2 })
    expect(parseQuickAdd('2x milk')).toEqual({ name: 'milk', quantity: 2 })
    expect(parseQuickAdd('2 x almond milk')).toEqual({ name: 'almond milk', quantity: 2 })
    expect(parseQuickAdd('12 BODYARMOR Lite')).toEqual({ name: 'BODYARMOR Lite', quantity: 12 })
  })

  it('reads a quantity and unit at the start', () => {
    expect(parseQuickAdd('3 lb chicken')).toEqual({ name: 'chicken', quantity: 3, unit: 'lb' })
    expect(parseQuickAdd('3lb chicken')).toEqual({ name: 'chicken', quantity: 3, unit: 'lb' })
    expect(parseQuickAdd('1.5 lbs ground beef')).toEqual({ name: 'ground beef', quantity: 1.5, unit: 'lb' })
    expect(parseQuickAdd('2 pounds of chicken')).toEqual({ name: 'chicken', quantity: 2, unit: 'lb' })
    expect(parseQuickAdd('1 dozen eggs')).toEqual({ name: 'eggs', quantity: 1, unit: 'dozen' })
    expect(parseQuickAdd('2 L soda')).toEqual({ name: 'soda', quantity: 2, unit: 'l' })
    expect(parseQuickAdd('2 packs gum')).toEqual({ name: 'gum', quantity: 2, unit: 'pack' })
  })

  it('reads a quantity at the end', () => {
    expect(parseQuickAdd('milk x2')).toEqual({ name: 'milk', quantity: 2 })
    expect(parseQuickAdd('milk x 2')).toEqual({ name: 'milk', quantity: 2 })
    expect(parseQuickAdd('milk 2x')).toEqual({ name: 'milk', quantity: 2 })
    expect(parseQuickAdd('almond milk ×3')).toEqual({ name: 'almond milk', quantity: 3 })
  })

  it('reads a quantity and unit at the end', () => {
    expect(parseQuickAdd('chicken 3 lb')).toEqual({ name: 'chicken', quantity: 3, unit: 'lb' })
    expect(parseQuickAdd('chicken 3lb')).toEqual({ name: 'chicken', quantity: 3, unit: 'lb' })
    expect(parseQuickAdd('ground beef 1.5 lb')).toEqual({ name: 'ground beef', quantity: 1.5, unit: 'lb' })
  })

  it('keeps a name that starts with a digit', () => {
    expect(parseQuickAdd('7up')).toEqual({ name: '7up' })
    expect(parseQuickAdd('7up x2')).toEqual({ name: '7up', quantity: 2 })
    expect(parseQuickAdd('2% milk')).toEqual({ name: '2% milk' })
    expect(parseQuickAdd('3-in-1 coffee')).toEqual({ name: '3-in-1 coffee' })
    expect(parseQuickAdd('50/50 mix')).toEqual({ name: '50/50 mix' })
  })

  it('keeps a number or a number with a unit when there is no name left', () => {
    expect(parseQuickAdd('12')).toEqual({ name: '12' })
    expect(parseQuickAdd('2.5')).toEqual({ name: '2.5' })
    expect(parseQuickAdd('3lb')).toEqual({ name: '3lb' })
    expect(parseQuickAdd('2x')).toEqual({ name: '2x' })
    expect(parseQuickAdd('x2')).toEqual({ name: 'x2' })
  })

  it('keeps a bare number at the end in the name', () => {
    expect(parseQuickAdd('Heinz 57')).toEqual({ name: 'Heinz 57' })
    expect(parseQuickAdd('milk 2 percent')).toEqual({ name: 'milk 2 percent' })
  })

  it('does not read zero as a quantity', () => {
    expect(parseQuickAdd('0 milk')).toEqual({ name: '0 milk' })
    expect(parseQuickAdd('milk x0')).toEqual({ name: 'milk x0' })
  })
})

describe('resolveQuickAdd', () => {
  const inventory = [
    row(),
    row({ name: 'Chicken Thighs', category: 'meat', quantity: 1.5, quantityUnit: 'lb' }),
    row({ name: '7 Up', quantity: 6 }),
  ]
  const staples = [staple()]
  const memory = getProductMemory(inventory, staples)

  it('returns null for empty text', () => {
    expect(resolveQuickAdd('   ', memory, staples)).toBeNull()
  })

  it('uses the usual quantity, unit, spelling, and category of a product bought before', () => {
    expect(resolveQuickAdd('bodyarmor lite', memory, staples)).toEqual({
      name: 'BODYARMOR Lite',
      category: 'beverages',
      quantity: 12,
      unit: 'count',
    })
  })

  it('uses the amount to buy for a staple, not the size of its last pantry row', () => {
    // A count correction left a row of 5. The staple says to buy 12
    const corrected = [row({ quantity: 5 })]
    const item = resolveQuickAdd('bodyarmor lite', getProductMemory(corrected, staples), staples)
    expect(item).toMatchObject({ quantity: 12, unit: 'count' })

    const usual = getUsualItems(getProductMemory(corrected, staples), corrected, staples, [], nov(1))
    expect(usual[0]).toMatchObject({ name: 'BODYARMOR Lite', quantity: 12 })
    const [suggestion] = getSuggestions('bod', getProductMemory(corrected, staples), staples, [], nov(1))
    expect(suggestion).toMatchObject({ name: 'BODYARMOR Lite', quantity: 12 })
  })

  it('lets a typed quantity replace the usual one and keeps the usual unit', () => {
    expect(resolveQuickAdd('3 bodyarmor lite', memory, staples)).toMatchObject({ name: 'BODYARMOR Lite', quantity: 3, unit: 'count' })
    expect(resolveQuickAdd('2 chicken thighs', memory, staples)).toMatchObject({ name: 'Chicken Thighs', quantity: 2, unit: 'lb' })
  })

  it('lets a typed unit replace the usual one', () => {
    expect(resolveQuickAdd('chicken thighs 2 pack', memory, staples)).toEqual({
      name: 'Chicken Thighs',
      category: 'meat',
      quantity: 2,
      unit: 'pack',
    })
  })

  it('takes the category from the food database for a name not bought before', () => {
    expect(resolveQuickAdd('2 milk', memory, staples)).toEqual({ name: 'milk', category: 'dairy', quantity: 2 })
    expect(resolveQuickAdd('spinach', memory, staples)).toEqual({ name: 'spinach', category: 'produce' })
    expect(resolveQuickAdd('birthday candles', memory, staples)).toEqual({ name: 'birthday candles', category: 'other' })
  })

  it('does not split a saved product whose name starts with a number', () => {
    expect(resolveQuickAdd('7 up', memory, staples)).toMatchObject({ name: '7 Up', quantity: 6 })
  })

  it('leaves the quantity out when the usual quantity is not above zero', () => {
    const odd = getProductMemory([row({ name: 'Salt', quantity: 0, originalQuantity: 0 })], [])
    expect(resolveQuickAdd('salt', odd, [])).toEqual({ name: 'Salt', category: 'beverages' })
  })
})

describe('matchRank', () => {
  it('matches the start of the name', () => {
    expect(matchRank('BODYARMOR Lite', 'bod')).toBe(0)
    expect(matchRank('Almond Milk', 'almond m')).toBe(0)
  })

  it('matches the start of a later word', () => {
    expect(matchRank('Almond Milk', 'milk')).toBe(1)
    expect(matchRank('BODYARMOR Lite', 'LI')).toBe(1)
  })

  it('does not match the middle of a word', () => {
    expect(matchRank('BODYARMOR Lite', 'armor')).toBeNull()
    expect(matchRank('Eggplant', 'plant')).toBeNull()
  })

  it('matches a plural to a name saved in the singular', () => {
    expect(matchRank('Apple', 'apples')).toBe(0)
  })

  it('matches names not written in a to z', () => {
    expect(matchRank('牛奶', '牛')).toBe(0)
  })

  it('matches nothing for empty text', () => {
    expect(matchRank('Milk', '  ')).toBeNull()
  })
})

describe('getSuggestions', () => {
  // Almond Milk was bought three times, Milk Chocolate once
  const inventory = [
    row(),
    usedUp({ name: 'Almond Milk', category: 'dairy', purchaseDate: novDate(1) }),
    usedUp({ name: 'Almond Milk', category: 'dairy', purchaseDate: novDate(5) }),
    row({ name: 'Almond Milk', category: 'dairy', quantity: 1, purchaseDate: novDate(9) }),
    row({ name: 'Milk Chocolate', category: 'snacks', quantity: 2 }),
    row({ name: 'Eggs', category: 'dairy' }),
  ]
  const staples = [staple()]
  const memory = getProductMemory(inventory, staples)
  const names = (text: string, list: ShoppingListItem[] = []) =>
    getSuggestions(text, memory, staples, list, nov(10)).map((suggestion) => suggestion.name)

  it('returns nothing for empty text', () => {
    expect(names('')).toEqual([])
    expect(names('   ')).toEqual([])
  })

  it('finds a product by the start of any word, ignoring case', () => {
    expect(names('bod')).toEqual(['BODYARMOR Lite'])
    expect(names('LITE')).toEqual(['BODYARMOR Lite'])
  })

  it('puts products bought before above generic names, and name starts above later words', () => {
    // Bought: "Milk Chocolate" starts with it, "Almond Milk" has it as a later word.
    // Generic: "Milk" starts with it. Generic "Almond milk" is the bought product, so it is left out.
    const found = names('milk')
    expect(found.slice(0, 3)).toEqual(['Milk Chocolate', 'Almond Milk', 'Milk'])
    // Then generic names with it as a later word, such as "Oat milk"
    expect(found.length).toBeGreaterThan(3)
    expect(found.slice(3).every((name) => matchRank(name, 'milk') === 1)).toBe(true)
    expect(found.filter((name) => productKey(name) === 'almond milk')).toEqual(['Almond Milk'])
  })

  it('carries the usual quantity for products bought before and none for generic names', () => {
    const suggestions = getSuggestions('milk', memory, staples, [], nov(10))
    expect(suggestions[0]).toEqual({
      key: 'milk chocolate',
      name: 'Milk Chocolate',
      category: 'snacks',
      quantity: 2,
      unit: 'count',
      source: 'bought',
      onList: false,
    })
    expect(suggestions[2]).toEqual({ key: 'milk', name: 'Milk', category: 'dairy', source: 'generic', onList: false })
  })

  it('offers one generic name per product, and none for a product bought before', () => {
    // "Honeycrisp" is another name for apples, not a second product
    expect(names('app')).toEqual(['Apples', 'Applesauce', 'Apple juice'])
    expect(names('egg').filter((name) => productKey(name) === 'egg')).toEqual(['Eggs'])
    expect(getSuggestions('egg', memory, staples, [], nov(10))[0].source).toBe('bought')
  })

  it('applies a typed quantity to the suggestions', () => {
    const [first] = getSuggestions('3 bod', memory, staples, [], nov(10))
    expect(first).toMatchObject({ name: 'BODYARMOR Lite', quantity: 3, unit: 'count' })

    const generic = getSuggestions('spin x2', memory, staples, [], nov(10))
    expect(generic).toMatchObject([{ name: 'Spinach', quantity: 2 }])
    expect(generic[0].unit).toBeUndefined()
  })

  it('matches the whole text before taking a quantity out of it', () => {
    const withNumber = getProductMemory([row({ name: '7 Up', quantity: 6 })], [])
    expect(getSuggestions('7 u', withNumber, [], [], nov(10))).toMatchObject([{ name: '7 Up', quantity: 6 }])
  })

  it('marks products the list already covers', () => {
    const list = [listItem({ name: 'almond milk' })]
    const suggestions = getSuggestions('milk', memory, staples, list, nov(10))
    expect(suggestions.slice(0, 3).map((s) => [s.name, s.onList])).toEqual([
      ['Milk Chocolate', false],
      ['Almond Milk', true],
      ['Milk', false],
    ])
  })

  it('counts an item checked off in the last 3 days as on the list, by the time passed in', () => {
    const list = [listItem({ isChecked: true, checkedAt: nov(8).toISOString() })]
    expect(getSuggestions('bod', memory, staples, list, nov(10))[0].onList).toBe(true)
    expect(getSuggestions('bod', memory, staples, list, nov(20))[0].onList).toBe(false)
  })

  it('returns at most the limit', () => {
    const many = getProductMemory(
      ['Soda', 'Salt', 'Sugar', 'Soup', 'Salmon', 'Sausage', 'Seltzer'].map((name) => row({ name })),
      [],
    )
    expect(getSuggestions('s', many, [], [], nov(10))).toHaveLength(5)
    expect(getSuggestions('s', many, [], [], nov(10), 2)).toHaveLength(2)
  })
})

describe('getUsualItems', () => {
  // On Nov 10 the staple is estimated at 12 - 9 = 3, which is low.
  // Rice was bought twice and is used up. Butter was bought once and is used up.
  // Yogurt is down to 1 of 6. Eggs are in stock.
  const inventory = [
    row(),
    row({ name: 'Eggs', category: 'dairy' }),
    row({ name: 'Yogurt', category: 'dairy', quantity: 1, originalQuantity: 6 }),
    usedUp({ name: 'Butter', category: 'dairy' }),
    usedUp({ name: 'Rice', category: 'pantry', quantityUnit: 'lb', originalQuantity: 2, purchaseDate: novDate(2) }),
    usedUp({ name: 'Rice', category: 'pantry', quantityUnit: 'lb', originalQuantity: 2, purchaseDate: novDate(6) }),
  ]
  const staples = [staple()]
  const memory = getProductMemory(inventory, staples)

  it('puts out first, then low, then the rest, with the most bought first in each group', () => {
    const usual = getUsualItems(memory, inventory, staples, [], nov(10))
    expect(usual.map((item) => [item.name, item.status])).toEqual([
      ['Rice', 'out'],
      ['Butter', 'out'],
      ['BODYARMOR Lite', 'low'],
      ['Yogurt', 'low'],
      ['Eggs', 'ok'],
    ])
  })

  it('uses the stock estimate at the time passed in', () => {
    const status = (now: Date) =>
      getUsualItems(memory, inventory, staples, [], now).find((item) => item.name === 'BODYARMOR Lite')?.status
    expect(status(nov(2))).toBe('ok')
    expect(status(nov(10))).toBe('low')
    expect(status(nov(20))).toBe('out')
  })

  it('carries the usual quantity, unit, and category', () => {
    const usual = getUsualItems(memory, inventory, staples, [], nov(10))
    expect(usual[0]).toEqual({ key: 'rice', name: 'Rice', category: 'pantry', quantity: 2, unit: 'lb', status: 'out' })
    expect(usual[2]).toMatchObject({ name: 'BODYARMOR Lite', quantity: 12, unit: 'count' })
  })

  it('leaves out what the list already covers', () => {
    const list = [listItem({ name: 'rice' }), listItem({ isChecked: true, checkedAt: nov(9).toISOString() })]
    const usual = getUsualItems(memory, inventory, staples, list, nov(10))
    expect(usual.map((item) => item.name)).toEqual(['Butter', 'Yogurt', 'Eggs'])
  })

  it('returns at most the limit', () => {
    expect(getUsualItems(memory, inventory, staples, [], nov(10), 2).map((item) => item.name)).toEqual(['Rice', 'Butter'])
  })

  it('returns nothing when there is no purchase history', () => {
    expect(getUsualItems([], [], [], [], nov(10))).toEqual([])
  })
})

describe('findAtHome', () => {
  const inventory = [
    row(),
    row({ name: 'Almond Milk', category: 'dairy', quantity: 1 }),
    row({ name: 'Yogurt', category: 'dairy', quantity: 1, originalQuantity: 6 }),
  ]
  const staples = [staple()]

  it('reports a staple only while its estimate is above the amount to keep', () => {
    expect(findAtHome('bodyarmor lite', inventory, staples, nov(2))).toMatchObject({ kind: 'staple', name: 'BODYARMOR Lite' })
    // The row still says 12, but the estimate is 3
    expect(findAtHome('bodyarmor lite', inventory, staples, nov(10))).toBeUndefined()
    expect(findAtHome('bodyarmor lite', inventory, staples, nov(20))).toBeUndefined()
  })

  it('gives the estimate for a staple, not the row quantity', () => {
    const atHome = findAtHome('BODYARMOR Lite', inventory, staples, nov(4))
    expect(atHome?.kind).toBe('staple')
    if (atHome?.kind !== 'staple') return
    expect(atHome.stock.estimated).toBe(9)
    expect(describeStapleStock(atHome.stock, nov(4))).toBe('About 9 left · out by Nov 13')
  })

  it('uses the estimate when a broader match lands on a staple', () => {
    expect(findAtHome('lite', inventory, staples, nov(2))).toMatchObject({ kind: 'staple', name: 'BODYARMOR Lite' })
    expect(findAtHome('lite', inventory, staples, nov(10))).toBeUndefined()
  })

  it('reports a pantry row in stock for other products', () => {
    expect(findAtHome('almond milk', inventory, staples, nov(10))).toMatchObject({ kind: 'row', name: 'Almond Milk' })
    expect(findAtHome('milk', inventory, staples, nov(10))).toMatchObject({ kind: 'row', name: 'Almond Milk' })
  })

  it('reports nothing for a row that is running low or a product not at home', () => {
    expect(findAtHome('yogurt', inventory, staples, nov(10))).toBeUndefined()
    expect(findAtHome('rice', inventory, staples, nov(10))).toBeUndefined()
  })
})

describe('describeStapleStock', () => {
  it('leaves out the run-out date when the daily use is not known', () => {
    const atHome = findAtHome('BODYARMOR Lite', [row()], [staple({ dailyUse: undefined })], nov(10))
    expect(atHome?.kind).toBe('staple')
    if (atHome?.kind !== 'staple') return
    expect(describeStapleStock(atHome.stock, nov(10))).toBe('12 left')
  })
})

describe('formatItemQuantity and describeItem', () => {
  it('shows the quantity with its unit', () => {
    expect(formatItemQuantity({ name: 'BODYARMOR Lite', category: 'beverages', quantity: 12, unit: 'count' })).toBe('12')
    expect(formatItemQuantity({ name: 'Chicken', category: 'meat', quantity: 3, unit: 'lb' })).toBe('3 lb')
    expect(formatItemQuantity({ name: 'Milk', category: 'dairy', quantity: 2 })).toBe('2')
    expect(formatItemQuantity({ name: 'Milk', category: 'dairy' })).toBeUndefined()
  })

  it('puts the quantity in front of the name', () => {
    expect(describeItem({ name: 'BODYARMOR Lite', category: 'beverages', quantity: 12, unit: 'count' })).toBe('12 BODYARMOR Lite')
    expect(describeItem({ name: 'Chicken', category: 'meat', quantity: 3, unit: 'lb' })).toBe('3 lb Chicken')
    expect(describeItem({ name: 'Milk', category: 'dairy' })).toBe('Milk')
  })
})
