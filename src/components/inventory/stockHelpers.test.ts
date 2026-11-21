import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FoodItem } from '@/types'
import { formatStockCount, getStock } from '@/utils/stock'

// The store saves to localStorage, which does not exist in the test runner.
// Put a simple in-memory one in place before the store is loaded.
const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => void saved.set(key, value),
  removeItem: (key: string) => void saved.delete(key),
})

let useDemoStore: typeof import('@/stores/demoStore').useDemoStore
let helpers: typeof import('./stockHelpers')

beforeAll(async () => {
  useDemoStore = (await import('@/stores/demoStore')).useDemoStore
  helpers = await import('./stockHelpers')
})

const STAPLE = 'BODYARMOR Lite'
const store = () => useDemoStore.getState()
const stock = (name = STAPLE) => getStock(name, store().inventory, store().staples)
const staple = () => store().staples[0]

// A row without the time it was last written, which every change moves on
const withoutUpdatedAt = (items: FoodItem[]) => items.map((item) => ({ ...item, updatedAt: '' }))
const rows = (name = STAPLE) => withoutUpdatedAt(store().inventory.filter((item) => item.name === name))

// The demo data: 12 counted 9 days ago at 1 a day, so about 3 are left
beforeEach(() => {
  store().disableDemoMode()
  store().enableDemoMode()
})

describe('snapshotStock', () => {
  it('puts a staple back exactly after the whole product was used up', () => {
    const rowsBefore = rows()
    const countedAt = staple().countedAt
    expect(formatStockCount(stock())).toBe('About 3')

    const restore = helpers.snapshotStock(STAPLE)
    helpers.emptyProduct(STAPLE)
    expect(stock().status).toBe('out')
    expect(stock().items).toHaveLength(0)

    restore()
    expect(rows()).toEqual(rowsBefore)
    expect(staple().countedAt).toBe(countedAt)
    expect(formatStockCount(stock())).toBe('About 3')
  })

  it('puts a staple back exactly after -1 took it to zero', () => {
    // 11 days of use leaves about 1
    store().updateStaple(staple().id, { countedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString() })
    const rowsBefore = rows()
    const countedAt = staple().countedAt
    expect(formatStockCount(stock())).toBe('About 1')

    const restore = helpers.snapshotStock(STAPLE)
    store().adjustStock(STAPLE, -1)
    expect(helpers.shownCount(stock())).toBe(0)

    restore()
    expect(rows()).toEqual(rowsBefore)
    expect(staple().countedAt).toBe(countedAt)
    expect(formatStockCount(stock())).toBe('About 1')
  })

  it('takes an automatically added list item off again when the staple is back above its minimum', () => {
    const onList = () => store().shoppingList.filter((item) => item.name === STAPLE)

    // With no minimum, about 3 is enough, so the demo's list item can go
    store().updateStaple(staple().id, { minQuantity: 0 })
    for (const item of onList()) store().removeShoppingItem(item.id)
    expect(stock().status).toBe('ok')

    const restore = helpers.snapshotStock(STAPLE)
    helpers.emptyProduct(STAPLE)
    // What the app does on its own after a change to the pantry
    store().syncStapleList()
    expect(onList()).toHaveLength(1)

    restore()
    expect(onList()).toHaveLength(0)
    expect(staple().skippedAt).toBeUndefined()
  })

  it('puts back every row of a product that is not a staple', () => {
    const rowsBefore = rows('Eggs')
    const restore = helpers.snapshotStock('Eggs')
    helpers.emptyProduct('Eggs')
    expect(stock('Eggs').items).toHaveLength(0)

    restore()
    expect(rows('Eggs')).toEqual(rowsBefore)
  })
})

describe('restoreStaple', () => {
  it('keeps the estimate when a staple is removed and put back', () => {
    const before = staple()
    store().removeStaple(before.id)
    expect(stock().staple).toBeUndefined()
    // Removing wrote the estimate into the rows: 3, not the last count of 12
    expect(stock().counted).toBe(3)

    helpers.restoreStaple(before)
    expect(staple().minQuantity).toBe(before.minQuantity)
    expect(stock().estimated).toBe(3)
  })
})

describe('describeDailyUse', () => {
  it('says the rate in plain words', () => {
    expect(helpers.describeDailyUse(1, 'count')).toBe('About 1 a day')
    expect(helpers.describeDailyUse(0.86, 'count')).toBe('About 0.86 a day')
    expect(helpers.describeDailyUse(0.33, 'count')).toBe('About 1 every 3 days')
    expect(helpers.describeDailyUse(0.25, 'lb')).toBe('About 0.25 lb a day')
  })
})
