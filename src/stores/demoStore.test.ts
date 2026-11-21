import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FoodItem } from '@/types'
import { toLocalDateString } from '@/utils/dates'
import { getStock } from '@/utils/stock'

// The store saves to localStorage, which does not exist in the test runner.
// Put a simple in-memory one in place before the store is loaded.
const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => void saved.set(key, value),
  removeItem: (key: string) => void saved.delete(key),
})

let useDemoStore: typeof import('./demoStore').useDemoStore

beforeAll(async () => {
  useDemoStore = (await import('./demoStore')).useDemoStore
})

const nov = (day: number, hour = 12) => new Date(2026, 10, day, hour)
const store = () => useDemoStore.getState()
const stock = (name = 'BODYARMOR Lite') => getStock(name, store().inventory, store().staples)
const rows = (name = 'BODYARMOR Lite') => store().inventory.filter((item) => item.name === name)

function purchase(quantity = 12, overrides: Partial<FoodItem> = {}): Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    householdId: 'household',
    name: 'BODYARMOR Lite',
    category: 'beverages',
    quantity,
    quantityUnit: 'count',
    originalQuantity: quantity,
    storageLocation: 'pantry',
    purchaseDate: toLocalDateString(new Date()),
    expirationDate: '2027-08-01',
    expirationSource: 'calculated',
    freshnessScore: 100,
    tags: [],
    addedBy: 'user',
    addedVia: 'manual',
    status: 'active',
    ...overrides,
  }
}

function addBodyarmorStaple() {
  return store().addStaple({
    name: 'BODYARMOR Lite',
    category: 'beverages',
    unit: 'count',
    minQuantity: 6,
    buyQuantity: 12,
    dailyUse: 1,
    autoAdd: true,
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(nov(1))
  store().disableDemoMode()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('staple quantities', () => {
  it('counts what is left before adding a new purchase', () => {
    addBodyarmorStaple()
    store().addItem(purchase(12))

    // 13 days at 1 a day uses up the first 12
    vi.setSystemTime(nov(14))
    expect(stock().estimated).toBe(0)
    store().addItem(purchase(12))

    expect(stock()).toMatchObject({ counted: 12, estimated: 12, isEstimate: false })
    expect(rows().map((item) => `${item.quantity} ${item.status}`)).toEqual(['0 consumed', '12 active'])
    expect(store().staples[0].countedAt).toBe(nov(14).toISOString())
  })

  it('takes a used amount from the estimate, not from the old count', () => {
    addBodyarmorStaple()
    const item = store().addItem(purchase(12))

    vi.setSystemTime(nov(5)) // about 8 left
    store().consumeItem(item.id, 1)

    expect(stock()).toMatchObject({ counted: 7, estimated: 7 })
    vi.setSystemTime(nov(6))
    expect(stock().estimated).toBe(6)
  })

  it('treats a new quantity on a row as a new count', () => {
    addBodyarmorStaple()
    const item = store().addItem(purchase(12))

    vi.setSystemTime(nov(20)) // estimate is 0
    store().updateItem(item.id, { quantity: 5 })

    expect(rows()[0]).toMatchObject({ quantity: 5, status: 'active' })
    expect(stock()).toMatchObject({ counted: 5, estimated: 5 })
  })

  it('leaves the count alone when an edit does not change the quantity', () => {
    addBodyarmorStaple()
    const item = store().addItem(purchase(12))

    vi.setSystemTime(nov(5))
    store().updateItem(item.id, { quantity: 12, notes: 'top shelf' })

    expect(stock()).toMatchObject({ counted: 12, estimated: 8 })
  })

  it('sets and adjusts the stock without adding purchase rows', () => {
    addBodyarmorStaple()
    store().addItem(purchase(12))

    vi.setSystemTime(nov(5)) // about 8 left
    store().adjustStock('BODYARMOR Lite', -1)
    expect(stock()).toMatchObject({ counted: 7, estimated: 7 })

    store().setStock('BODYARMOR Lite', 0)
    expect(rows().map((item) => item.status)).toEqual(['consumed'])

    store().setStock('BODYARMOR Lite', 4)
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toMatchObject({ quantity: 4, status: 'active', originalQuantity: 12 })
  })

  it('creates a row only when the product has none', () => {
    addBodyarmorStaple()
    store().setStock('BODYARMOR Lite', 6)

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toMatchObject({ quantity: 6, quantityUnit: 'count', category: 'beverages', status: 'active' })
  })
})

describe('syncStapleList', () => {
  it('adds a low staple to the list once', () => {
    addBodyarmorStaple()
    store().addItem(purchase(12))

    store().syncStapleList()
    expect(store().shoppingList).toEqual([])

    vi.setSystemTime(nov(8)) // about 5 left
    store().syncStapleList()
    expect(store().shoppingList).toHaveLength(1)
    expect(store().shoppingList[0]).toMatchObject({
      name: 'BODYARMOR Lite',
      quantity: 12,
      quantityUnit: 'count',
      category: 'beverages',
      source: 'low_stock',
      shoppingListId: 'demo-list',
      isChecked: false,
    })

    // A second run finds it on the list and changes nothing
    const before = store()
    store().syncStapleList()
    expect(store()).toBe(before)
  })

  it('holds off after the user removes the item, until the staple is restocked', () => {
    addBodyarmorStaple()
    store().addItem(purchase(12))
    vi.setSystemTime(nov(8))
    store().syncStapleList()

    store().removeShoppingItem(store().shoppingList[0].id)
    expect(store().staples[0].skippedAt).toBe(nov(8).toISOString())
    store().syncStapleList()
    expect(store().shoppingList).toEqual([])

    // Buying more clears the hold
    store().addItem(purchase(12))
    expect(store().staples[0].skippedAt).toBeUndefined()

    vi.setSystemTime(nov(20)) // 17 on Nov 8, about 5 left
    store().syncStapleList()
    expect(store().shoppingList).toHaveLength(1)
  })

  it('clears the hold when a recount shows enough in stock', () => {
    addBodyarmorStaple()
    store().addItem(purchase(12))
    vi.setSystemTime(nov(8))
    store().syncStapleList()
    store().removeShoppingItem(store().shoppingList[0].id)

    store().setStock('BODYARMOR Lite', 10)
    store().syncStapleList()
    expect(store().staples[0].skippedAt).toBeUndefined()
    expect(store().shoppingList).toEqual([])
  })

  it('does not add a second item while a checked one waits to go into the pantry', () => {
    addBodyarmorStaple()
    store().addItem(purchase(12))
    vi.setSystemTime(nov(8))
    store().syncStapleList()

    store().toggleShoppingItem(store().shoppingList[0].id)
    expect(store().shoppingList[0].checkedAt).toBe(nov(8).toISOString())
    store().syncStapleList()
    expect(store().shoppingList).toHaveLength(1)

    store().toggleShoppingItem(store().shoppingList[0].id)
    expect(store().shoppingList[0].checkedAt).toBeUndefined()
  })

  it('skips staples with auto-add off', () => {
    const staple = addBodyarmorStaple()
    store().updateStaple(staple.id, { autoAdd: false })
    store().syncStapleList()
    expect(store().shoppingList).toEqual([])
  })
})

describe('demo data', () => {
  it('starts with a low staple that is already on the list', () => {
    store().enableDemoMode()

    expect(stock()).toMatchObject({
      counted: 12,
      estimated: 3,
      dailyUse: 1,
      dailyUseSource: 'learned',
      status: 'low',
    })
    expect(store().shoppingList.filter((item) => item.name === 'BODYARMOR Lite')).toHaveLength(1)

    store().disableDemoMode()
    expect(store().staples).toEqual([])
  })
})

describe('saved data', () => {
  it('loads data saved before staples existed', async () => {
    saved.set('pantry-demo-store', JSON.stringify({
      state: { isDemoMode: false, inventory: [], shoppingList: [], recipes: [], mealPlan: [] },
      version: 4,
    }))
    await useDemoStore.persist.rehydrate()
    expect(store().staples).toEqual([])
  })
})
