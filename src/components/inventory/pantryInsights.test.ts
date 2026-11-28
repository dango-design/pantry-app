import { describe, expect, it } from 'vitest'
import { addDays, format } from 'date-fns'
import type { FoodItem, FoodRole, QuantityUnit, Recipe, Staple } from '@/types'
import type { StockInfo } from '@/utils/stock'
import {
  countCookableRecipes,
  describeLimit,
  describeUntouched,
  estimateDinners,
  getFlavorStatus,
  getStaplesSummary,
  isFlavor,
  selectForgotten,
} from './pantryInsights'

const NOW = new Date(2026, 10, 28, 12, 0, 0)
const inDays = (days: number) => format(addDays(NOW, days), 'yyyy-MM-dd')
const daysAgoIso = (days: number) => addDays(NOW, -days).toISOString()

interface ProductOptions {
  role?: FoodRole
  quantity?: number
  unit?: QuantityUnit
  servings?: number
  expiresIn?: number
  touchedDaysAgo?: number
  status?: StockInfo['status']
  staple?: Partial<Staple>
  daysLeft?: number
  estimated?: number
  /** Extra rows of the same product */
  extraRows?: Partial<FoodItem>[]
}

let nextId = 0
function row(name: string, options: ProductOptions, overrides: Partial<FoodItem> = {}): FoodItem {
  nextId++
  return {
    id: `id-${nextId}`,
    name,
    category: 'other',
    role: options.role ?? 'snack',
    quantity: options.quantity ?? 1,
    quantityUnit: options.unit ?? 'count',
    servings: options.servings,
    expirationDate: inDays(options.expiresIn ?? 30),
    purchaseDate: inDays(-60),
    createdAt: daysAgoIso(60),
    touchedAt: daysAgoIso(options.touchedDaysAgo ?? 1),
    status: 'active',
    ...overrides,
  } as FoodItem
}

function product(name: string, options: ProductOptions = {}): StockInfo {
  const items = [row(name, options), ...(options.extraRows ?? []).map((extra) => row(name, options, extra))]
  const staple = options.staple
    ? ({ id: `s-${name}`, name, minQuantity: 2, unit: 'count', ...options.staple } as Staple)
    : undefined
  const estimated = options.estimated ?? options.quantity ?? 1
  return {
    name,
    key: name.toLowerCase(),
    category: 'other',
    unit: options.unit ?? 'count',
    items,
    counted: estimated,
    estimated,
    isEstimate: false,
    staple,
    daysLeft: options.daysLeft,
    status: options.status ?? 'ok',
  }
}

describe('getStaplesSummary', () => {
  it('counts stocked, low and out staples and skips other products', () => {
    const summary = getStaplesSummary([
      product('Milk', { staple: {}, status: 'out', estimated: 0 }),
      product('Eggs', { staple: {}, status: 'low', daysLeft: 2 }),
      product('Rice', { staple: {}, status: 'ok', daysLeft: 40 }),
      product('Pasta', { staple: {}, status: 'ok', daysLeft: 12 }),
      product('Chips'),
    ])
    expect(summary).toMatchObject({ total: 4, stocked: 2, low: 1, out: 1 })
  })

  it('sorts out first, then by days left, then staples without a daily use by name', () => {
    const summary = getStaplesSummary([
      product('Salt', { staple: {}, quantity: 5 }),
      product('Rice', { staple: {}, daysLeft: 40 }),
      product('Eggs', { staple: {}, status: 'low', daysLeft: 2 }),
      product('Milk', { staple: {}, status: 'out', estimated: 0 }),
      product('Pasta', { staple: {}, daysLeft: 12 }),
      product('Flour', { staple: {}, quantity: 1 }),
    ])
    expect(summary.gauges.map((gauge) => gauge.name)).toEqual(['Milk', 'Eggs', 'Pasta', 'Rice', 'Flour', 'Salt'])
  })

  it('colours each gauge by the staple’s own status, not by its days left', () => {
    const summary = getStaplesSummary([
      // Few days but above its minimum: still green
      product('Bread', { staple: {}, status: 'ok', daysLeft: 3 }),
      // Many days but at its minimum: orange
      product('Salt', { staple: {}, status: 'low', daysLeft: 45 }),
      product('Milk', { staple: {}, status: 'out', estimated: 0 }),
    ])
    const tone = Object.fromEntries(summary.gauges.map((gauge) => [gauge.name, gauge.tone]))
    expect(tone).toEqual({ Milk: 'red', Bread: 'green', Salt: 'orange' })
  })

  it('labels and fills gauges by days left, capped at 30', () => {
    const [milk, eggs, rice] = getStaplesSummary([
      product('Milk', { staple: {}, status: 'out', estimated: 0 }),
      product('Eggs', { staple: {}, status: 'low', daysLeft: 2.7 }),
      product('Rice', { staple: {}, daysLeft: 45 }),
    ]).gauges
    expect(milk).toMatchObject({ label: 'out', fill: 0 })
    expect(eggs).toMatchObject({ label: '2 d' })
    expect(eggs.fill).toBeCloseTo(0.09, 2)
    expect(rice).toMatchObject({ label: '30+ d', fill: 1 })
  })

  it('shows the amount when the daily use is not known', () => {
    const [salt] = getStaplesSummary([product('Salt', { staple: { minQuantity: 1 }, quantity: 2 })]).gauges
    expect(salt.label).toBe('2 left')
    expect(salt.fill).toBeCloseTo(2 / 3)
  })

  it('is empty with no staples', () => {
    expect(getStaplesSummary([product('Chips')])).toEqual({ total: 0, stocked: 0, low: 0, out: 0, gauges: [] })
  })
})

describe('estimateDinners', () => {
  it('divides the smallest of mains, bases and veg by household size, rounded down', () => {
    const estimate = estimateDinners(
      [
        product('Chicken', { role: 'main', servings: 14 }),
        product('Rice', { role: 'base', servings: 30 }),
        product('Carrots', { role: 'produce', servings: 20 }),
      ],
      3,
      NOW
    )
    expect(estimate.servings).toEqual({ main: 14, base: 30, produce: 20 })
    expect(estimate.dinners).toBe(4)
    expect(estimate.limitedBy).toBe('main')
  })

  it('names whichever role runs out first', () => {
    const estimate = estimateDinners(
      [
        product('Chicken', { role: 'main', servings: 10 }),
        product('Rice', { role: 'base', servings: 10 }),
        product('Carrots', { role: 'produce', servings: 4 }),
      ],
      2,
      NOW
    )
    expect(estimate.limitedBy).toBe('produce')
    expect(estimate.dinners).toBe(2)
    expect(describeLimit(estimate.limitedBy)).toBe('veg runs out first')
    expect(describeLimit('main')).toBe('mains run out first')
  })

  it('counts breakfast and snacks in the role bar but not in the dinner count', () => {
    const estimate = estimateDinners(
      [
        product('Chicken', { role: 'main', servings: 4 }),
        product('Rice', { role: 'base', servings: 4 }),
        product('Carrots', { role: 'produce', servings: 4 }),
        product('Yogurt', { role: 'breakfast', servings: 40 }),
        product('Chips', { role: 'snack', servings: 40 }),
        product('Salt', { role: 'flavor' }),
        product('Pepper', { role: 'flavor' }),
      ],
      2,
      NOW
    )
    expect(estimate.dinners).toBe(2)
    expect(estimate.totalProducts).toBe(7)
    expect(estimate.roleCounts).toEqual([
      { role: 'main', count: 1 },
      { role: 'base', count: 1 },
      { role: 'produce', count: 1 },
      { role: 'breakfast', count: 1 },
      { role: 'snack', count: 1 },
      { role: 'flavor', count: 2 },
    ])
  })

  it('adds up every row of a product and leaves out expired rows', () => {
    const estimate = estimateDinners(
      [
        product('Chicken', {
          role: 'main',
          servings: 3,
          extraRows: [{ servings: 5 }, { servings: 100, expirationDate: inDays(-1) }],
        }),
        product('Rice', { role: 'base', servings: 50 }),
        product('Carrots', { role: 'produce', servings: 50 }),
      ],
      1,
      NOW
    )
    expect(estimate.servings.main).toBe(8)
    expect(estimate.dinners).toBe(8)
  })

  it('estimates servings from the amount when none were typed', () => {
    // 2 lb of a main at the default portion is several servings
    const estimate = estimateDinners([product('Ground Beef', { role: 'main', quantity: 2, unit: 'lb' })], 1, NOW)
    expect(estimate.servings.main).toBeGreaterThan(4)
  })

  it('is zero dinners with no bases or veg, limited by the first empty role', () => {
    const estimate = estimateDinners([product('Chicken', { role: 'main', servings: 10 })], 2, NOW)
    expect(estimate.dinners).toBe(0)
    expect(estimate.limitedBy).toBe('base')
  })

  it('treats a household size below 1 as 1', () => {
    const estimate = estimateDinners(
      [
        product('A', { role: 'main', servings: 3 }),
        product('B', { role: 'base', servings: 3 }),
        product('C', { role: 'produce', servings: 3 }),
      ],
      0,
      NOW
    )
    expect(estimate.dinners).toBe(3)
  })
})

describe('countCookableRecipes', () => {
  const recipe = (id: string, ingredients: string[]): Recipe =>
    ({ id, name: id, ingredients: ingredients.map((name) => ({ name, quantity: 1, unit: 'count', isOptional: false })) }) as unknown as Recipe

  it('counts recipes with every required ingredient in the pantry', () => {
    const inventory = [row('Eggs', {}), row('Rice', {})]
    const result = countCookableRecipes([recipe('Fried rice', ['Eggs', 'Rice']), recipe('Omelette', ['Eggs', 'Cheese'])], inventory)
    expect(result).toEqual({ cookable: 1, total: 2 })
  })

  it('is zero of zero without recipes', () => {
    expect(countCookableRecipes([], [])).toEqual({ cookable: 0, total: 0 })
  })
})

describe('flavor group', () => {
  it('matches products whose role is flavor', () => {
    expect(isFlavor(product('Salt', { role: 'flavor' }))).toBe(true)
    expect(isFlavor(product('Rice', { role: 'base' }))).toBe(false)
  })

  it('says how many flavor staples are low, or "All good"', () => {
    expect(getFlavorStatus([product('Salt', { role: 'flavor' })])).toEqual({ text: 'All good', tone: 'green' })
    expect(
      getFlavorStatus([
        product('Salt', { role: 'flavor', staple: {}, status: 'low' }),
        product('Soy sauce', { role: 'flavor', staple: {}, status: 'low' }),
        product('Oil', { role: 'flavor', staple: {}, status: 'ok' }),
        // Not a staple: its own low flag doesn't count
        product('Cumin', { role: 'flavor', status: 'low' }),
      ])
    ).toEqual({ text: '2 low', tone: 'orange' })
  })

  it('still warns about expired flavor items when none is low', () => {
    expect(getFlavorStatus([product('Pesto', { role: 'flavor', expiresIn: -2 })])).toEqual({ text: '1 expired', tone: 'red' })
  })
})

describe('selectForgotten', () => {
  it('lists in-date products untouched for 21 days or more, oldest first', () => {
    const result = selectForgotten(
      [
        product('Peas', { touchedDaysAgo: 42 }),
        product('Crackers', { touchedDaysAgo: 23 }),
        product('Quinoa', { touchedDaysAgo: 35 }),
        product('Milk', { touchedDaysAgo: 20 }),
        product('Pesto', { touchedDaysAgo: 21 }),
      ],
      NOW
    )
    expect(result.map((entry) => [entry.stock.name, entry.days])).toEqual([
      ['Peas', 42],
      ['Quinoa', 35],
      ['Crackers', 23],
      ['Pesto', 21],
    ])
  })

  it('leaves out expired products', () => {
    expect(selectForgotten([product('Old cheese', { touchedDaysAgo: 40, expiresIn: -2 })], NOW)).toEqual([])
  })

  it('counts a product as touched when any of its rows was', () => {
    const result = selectForgotten(
      [product('Rice', { touchedDaysAgo: 50, extraRows: [{ touchedAt: daysAgoIso(3) }] })],
      NOW
    )
    expect(result).toEqual([])
  })

  it('falls back to the purchase date for rows with no touchedAt', () => {
    const result = selectForgotten([product('Beans', { extraRows: [] })].map((stock) => ({
      ...stock,
      items: stock.items.map((item) => ({ ...item, touchedAt: undefined, purchaseDate: inDays(-30) })),
    })), NOW)
    expect(result.map((entry) => entry.days)).toEqual([30])
  })
})

describe('describeUntouched', () => {
  it.each([
    [21, '3 weeks'],
    [42, '6 weeks'],
    [59, '8 weeks'],
    [75, '2 months'],
  ])('%i days → %s', (days, text) => {
    expect(describeUntouched(days)).toBe(text)
  })
})
