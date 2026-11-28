import { describe, expect, it } from 'vitest'
import { addDays, format } from 'date-fns'
import type { FoodCategory, FoodItem, StorageLocation } from '@/types'
import type { StockInfo } from '@/utils/stock'
import {
  buildGroups,
  countByCategory,
  getFreshnessPill,
  getGroupStatus,
  getUseSoon,
  groupStateKey,
} from './pantryOverview'

const inDays = (days: number) => format(addDays(new Date(), days), 'yyyy-MM-dd')

// A product with one row. Only the fields the overview reads are filled in.
function product(
  name: string,
  days: number,
  options: { category?: FoodCategory; place?: StorageLocation | string } = {}
): StockInfo {
  const category = options.category ?? 'produce'
  const item = {
    id: `id-${name}`,
    name,
    category,
    storageLocation: options.place ?? 'refrigerator',
    expirationDate: inDays(days),
    quantity: 1,
    quantityUnit: 'count',
  } as FoodItem
  return {
    name,
    key: name.toLowerCase(),
    category,
    unit: 'count',
    items: [item],
    counted: 1,
    estimated: 1,
    isEstimate: false,
    status: 'ok',
  }
}

describe('getFreshnessPill', () => {
  it.each([
    [-2, '2 days ago', 'red'],
    [-1, 'Yesterday', 'red'],
    [-21, '3 wk ago', 'red'],
    [0, 'Today', 'orange'],
    [1, 'Tomorrow', 'orange'],
    [3, '3 days', 'orange'],
    [5, '5 days', 'yellow'],
    [7, '7 days', 'yellow'],
    [8, '8 days', 'green'],
    [21, '3 wk', 'green'],
    [90, '3 mo', 'green'],
    [400, '1 yr', 'green'],
  ])('%i days → "%s" (%s)', (days, text, tone) => {
    expect(getFreshnessPill(inDays(days))).toEqual({ text, tone })
  })
})

describe('getUseSoon', () => {
  it('lists expired and next-7-day products, soonest first, and counts the expired ones', () => {
    const result = getUseSoon([product('Rice', 300), product('Milk', 5), product('Chicken', -2), product('Bread', 0), product('Eggs', 8)])
    expect(result.products.map((p) => p.name)).toEqual(['Chicken', 'Bread', 'Milk'])
    expect(result.expired).toBe(1)
  })

  it('is empty when nothing is close', () => {
    expect(getUseSoon([product('Rice', 300)])).toEqual({ products: [], expired: 0 })
  })
})

describe('buildGroups', () => {
  const products = [
    product('Ice cream', 60, { place: 'freezer', category: 'frozen' }),
    product('Rice', 300, { place: 'pantry', category: 'pantry' }),
    product('Milk', 5, { place: 'refrigerator', category: 'dairy' }),
    product('Bananas', 2, { place: 'counter' }),
    product('Cheese', 30, { place: 'refrigerator', category: 'dairy' }),
  ]

  it('groups by place in kitchen order: Fridge, Freezer, Counter, Shelf', () => {
    const groups = buildGroups(products, 'place')
    expect(groups.map((g) => g.label)).toEqual(['Fridge', 'Freezer', 'Counter', 'Shelf'])
    expect(groups[0].products.map((p) => p.name)).toEqual(['Milk', 'Cheese'])
  })

  it('puts a place it does not know at the end instead of dropping it', () => {
    const groups = buildGroups([...products, product('Wine', 400, { place: 'cellar' })], 'place')
    expect(groups[groups.length - 1]).toMatchObject({ key: 'cellar', label: 'cellar' })
  })

  it('groups by food type in chip order', () => {
    const groups = buildGroups(products, 'category')
    expect(groups.map((g) => g.label)).toEqual(['Produce', 'Dairy', 'Shelf', 'Frozen'])
  })

  it('lets a special group take its products first and shows it last', () => {
    const oils = product('Olive oil', 200, { place: 'pantry', category: 'condiments' })
    const groups = buildGroups([...products, oils], 'place', [
      { key: 'flavor', label: 'Oils, spices & sauces', color: '#999', display: 'chips', match: (s) => s.category === 'condiments' },
    ])
    expect(groups[groups.length - 1]).toMatchObject({ key: 'flavor', display: 'chips' })
    expect(groups[groups.length - 1]?.products.map((p) => p.name)).toEqual(['Olive oil'])
    expect(groups.find((g) => g.key === 'pantry')?.products.map((p) => p.name)).toEqual(['Rice'])
  })

  it('leaves out a special group with no matches', () => {
    const groups = buildGroups(products, 'place', [
      { key: 'flavor', label: 'Flavour', color: '#999', display: 'chips', match: () => false },
    ])
    expect(groups.some((g) => g.key === 'flavor')).toBe(false)
  })
})

describe('getGroupStatus', () => {
  it('says how many expired, ahead of how many are soon', () => {
    expect(getGroupStatus([product('A', -1), product('B', 3)])).toEqual({ text: '1 expired', tone: 'red' })
  })
  it('says how many are soon when none expired', () => {
    expect(getGroupStatus([product('A', 2), product('B', 7), product('C', 30)])).toEqual({ text: '2 soon', tone: 'orange' })
  })
  it('says all good otherwise', () => {
    expect(getGroupStatus([product('A', 30)])).toEqual({ text: 'All good', tone: 'green' })
  })
})

describe('small helpers', () => {
  it('keeps open-group keys apart per grouping', () => {
    expect(groupStateKey('place', 'pantry')).not.toBe(groupStateKey('category', 'pantry'))
  })
  it('counts products per category', () => {
    const counts = countByCategory([product('A', 1, { category: 'dairy' }), product('B', 1, { category: 'dairy' }), product('C', 1)])
    expect(counts.get('dairy')).toBe(2)
    expect(counts.get('produce')).toBe(1)
  })
})
