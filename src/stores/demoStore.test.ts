import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FoodItem } from '@/types'
import { toLocalDateString } from '@/utils/dates'
import { getStock } from '@/utils/stock'
import { daysSinceTouched, getRole, guessRole } from '@/utils/foodRoles'

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

describe('roles', () => {
  it('guesses a role for an item added without one', () => {
    const added = store().addItem(purchase(12, { name: 'Large Eggs', category: 'dairy' }))
    expect(added).toMatchObject({ role: 'main', roleSource: 'guessed' })
  })

  it('keeps a role passed in as a person’s choice', () => {
    const added = store().addItem(purchase(1, { name: 'Peanut Butter', category: 'pantry', role: 'main' }))
    expect(added).toMatchObject({ role: 'main', roleSource: 'manual' })
  })

  it('guesses again when the name or category changes, unless a person chose the role', () => {
    const guessed = store().addItem(purchase(1, { name: 'Mystery thing', category: 'other' }))
    expect(guessed.role).toBe('snack')
    expect(store().updateItem(guessed.id, { name: 'Black beans', category: 'pantry' })).toMatchObject({ role: 'main', roleSource: 'guessed' })

    const chosen = store().addItem(purchase(1, { name: 'Tortillas', category: 'bakery' }))
    store().setProductRole('Tortillas', 'main')
    expect(store().updateItem(chosen.id, { category: 'pantry', name: 'Corn tortillas' })).toMatchObject({ role: 'main', roleSource: 'manual' })
  })

  it('sets a chosen role on every batch and the staple, and later purchases keep it', () => {
    addBodyarmorStaple()
    store().addItem(purchase(12))
    store().addItem(purchase(12))
    store().setProductRole('bodyarmor lite', 'snack')

    expect(rows().map((row) => [row.role, row.roleSource])).toEqual([['snack', 'manual'], ['snack', 'manual']])
    expect(store().staples[0].role).toBe('snack')

    // A new purchase is not guessed back to a drink
    expect(store().addItem(purchase(12))).toMatchObject({ role: 'snack', roleSource: 'manual' })
  })
})

describe('touchedAt', () => {
  const row = (id: string) => store().inventory.find((item) => item.id === id)!

  // An item added three weeks ago
  function oldItem(overrides: Partial<FoodItem> = {}) {
    vi.setSystemTime(nov(1))
    const added = store().addItem(purchase(4, { name: 'Rice', category: 'pantry', quantityUnit: 'lb', ...overrides }))
    vi.setSystemTime(nov(22))
    return added
  }

  it('is set when an item is added', () => {
    vi.setSystemTime(nov(1))
    expect(store().addItem(purchase()).touchedAt).toBe(nov(1).toISOString())
  })

  it('moves when the item is used, edited, counted or adjusted', () => {
    const { id } = oldItem()
    expect(row(id).touchedAt).toBe(nov(1).toISOString())

    store().consumeItem(id, 1)
    expect(row(id).touchedAt).toBe(nov(22).toISOString())

    vi.setSystemTime(nov(23))
    store().updateItem(id, { notes: 'top shelf' })
    expect(row(id).touchedAt).toBe(nov(23).toISOString())

    vi.setSystemTime(nov(24))
    store().setStock('Rice', 2)
    expect(row(id).touchedAt).toBe(nov(24).toISOString())

    vi.setSystemTime(nov(25))
    store().adjustStock('Rice', -1)
    expect(row(id).touchedAt).toBe(nov(25).toISOString())

    vi.setSystemTime(nov(26))
    store().setProductRole('Rice', 'main')
    expect(row(id).touchedAt).toBe(nov(26).toISOString())
  })

  it('leaves other items alone', () => {
    const { id } = oldItem()
    const other = store().addItem(purchase(1, { name: 'Salt', category: 'pantry' }))
    vi.setSystemTime(nov(27))
    store().consumeItem(other.id, 1)
    expect(row(id).touchedAt).toBe(nov(1).toISOString())
  })

  it('is set on every batch a staple action changes', () => {
    addBodyarmorStaple()
    vi.setSystemTime(nov(1))
    store().addItem(purchase(12))
    vi.setSystemTime(nov(3))
    store().adjustStock('BODYARMOR Lite', -1)
    expect(rows().map((r) => r.touchedAt)).toEqual([nov(3).toISOString()])
  })
})

describe('servings', () => {
  const row = (id: string) => store().inventory.find((item) => item.id === id)!

  it('scales a typed number when some is used', () => {
    const { id } = store().addItem(purchase(4, { name: 'Lasagna', category: 'prepared', quantityUnit: 'lb' }))
    store().updateItem(id, { servings: 8 })
    store().consumeItem(id, 1)
    expect(row(id).servings).toBe(6)
    store().updateItem(id, { quantity: 1.5 })
    expect(row(id).servings).toBe(3)
  })

  it('keeps a number set together with a new quantity', () => {
    const { id } = store().addItem(purchase(4, { name: 'Lasagna', category: 'prepared', quantityUnit: 'lb' }))
    store().updateItem(id, { quantity: 2, servings: 5 })
    expect(row(id).servings).toBe(5)
  })

  it('goes back to the estimate when the unit changes or the item was empty', () => {
    const { id } = store().addItem(purchase(4, { name: 'Lasagna', category: 'prepared', quantityUnit: 'lb', servings: 8 }))
    store().updateItem(id, { quantity: 1, quantityUnit: 'pack' })
    expect(row(id).servings).toBeUndefined()
  })

  it('can be cleared', () => {
    const { id } = store().addItem(purchase(4, { name: 'Lasagna', category: 'prepared', quantityUnit: 'lb', servings: 8 }))
    store().updateItem(id, { servings: undefined })
    expect(row(id).servings).toBeUndefined()
  })
})

describe('household size', () => {
  it('defaults to 2, stays between 1 and 20, and survives demo mode', () => {
    expect(store().householdSize).toBe(2)
    store().setHouseholdSize(0)
    expect(store().householdSize).toBe(1)
    store().setHouseholdSize(4)
    store().enableDemoMode()
    store().disableDemoMode()
    expect(store().householdSize).toBe(4)
    store().setHouseholdSize(2)
  })
})

describe('large demo pantry', () => {
  it('has a realistic household of 60 to 70 products, each with a role', () => {
    store().enableDemoMode()
    const products = new Set(store().inventory.map((item) => item.name))
    expect(products.size).toBeGreaterThanOrEqual(60)
    expect(products.size).toBeLessThanOrEqual(70)
    expect(store().inventory.every((item) => item.role !== undefined)).toBe(true)
  })

  it('stores the same roles the guesser gives', () => {
    store().enableDemoMode()
    const wrong = store().inventory
      .filter((item) => item.role !== guessRole(item.name, item.category))
      .map((item) => `${item.name}: ${item.role} vs ${guessRole(item.name, item.category)}`)
    expect(wrong).toEqual([])
  })

  it('has about 20 flavor items and about 20 staples, a few low and one out', () => {
    store().enableDemoMode()
    const flavor = store().inventory.filter((item) => item.role === 'flavor')
    expect(flavor.length).toBeGreaterThanOrEqual(18)
    expect(flavor.length).toBeLessThanOrEqual(23)

    const staples = store().staples
    expect(staples.length).toBeGreaterThanOrEqual(18)
    expect(staples.every((s) => s.dailyUse !== undefined)).toBe(true)
    const statuses = staples.map((s) => stock(s.name).status)
    expect(statuses.filter((s) => s === 'out')).toHaveLength(1)
    const low = statuses.filter((s) => s === 'low').length
    expect(low).toBeGreaterThanOrEqual(3)
    expect(low).toBeLessThanOrEqual(6)
  })

  it('has items expiring soon or expired, and some untouched for 3+ weeks', () => {
    store().enableDemoMode()
    const active = store().inventory.filter((item) => item.status === 'active')
    const soon = active.filter((item) => item.expirationDate <= toLocalDateString(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)))
    expect(soon.length).toBeGreaterThanOrEqual(4)
    expect(active.some((item) => item.expirationDate < toLocalDateString(new Date()))).toBe(true)
    expect(active.filter((item) => daysSinceTouched(item) >= 21).length).toBeGreaterThanOrEqual(3)
  })
})

describe('saved version 4 data', () => {
  it('keeps the items and adds the household size', async () => {
    saved.set('pantry-demo-store', JSON.stringify({
      state: {
        isDemoMode: true,
        inventory: [{ ...purchase(2, { name: 'Eggs', category: 'dairy' }), id: 'old-1', createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z' }],
        shoppingList: [],
        recipes: [],
        mealPlan: [],
        staples: [],
      },
      version: 4,
    }))
    await useDemoStore.persist.rehydrate()
    expect(store().inventory.map((item) => item.id)).toEqual(['old-1'])
    expect(getRole(store().inventory[0])).toBe('main')
    expect(store().householdSize).toBe(2)
  })
})

describe('undo', () => {
  it('can put back a row’s touchedAt and servings exactly', () => {
    vi.setSystemTime(nov(1))
    const { id } = store().addItem(purchase(4, { name: 'Lasagna', category: 'prepared', quantityUnit: 'lb', servings: 8 }))
    const before = store().inventory.find((item) => item.id === id)!
    vi.setSystemTime(nov(5))
    store().consumeItem(id, 4)
    store().updateItem(id, { quantity: 4, status: 'active', touchedAt: before.touchedAt, servings: before.servings })
    expect(store().inventory.find((item) => item.id === id)).toMatchObject({ quantity: 4, touchedAt: nov(1).toISOString(), servings: 8 })
  })
})
