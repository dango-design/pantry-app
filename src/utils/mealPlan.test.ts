import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays } from 'date-fns'
import type { FoodItem, MealPlanEntry, MealSlot, Recipe, RecipeIngredient, ShoppingListItem } from '@/types'
import { toLocalDateString } from './dates'
import {
  buildShoppingPlan,
  formatMealTime,
  formatQuantity,
  formatRelativeDay,
  formatRelativeDayInline,
  formatWeekRange,
  getDefaultServings,
  getDefaultSlot,
  getNextOpenSlot,
  getNextPlanDay,
  getScaleFactor,
  getShoppableEntries,
  getShopTitle,
  getSlotLabel,
  getWeekDates,
  getWeekOffset,
  getWeekStart,
  getWeekTitle,
  MEAL_SLOTS,
  shiftWeek,
  toShoppingListItem,
  type ShopLine,
} from './mealPlan'

// A fixed clock: Saturday, November 28, 2026 at noon (local time).
// Its week runs Monday Nov 23 to Sunday Nov 29.
const NOW = new Date(2026, 10, 28, 12, 0, 0)
const at = (days: number, hours = 12, minutes = 0) => {
  const date = addDays(NOW, days)
  date.setHours(hours, minutes, 0, 0)
  return date
}
const day = (days: number) => toLocalDateString(addDays(NOW, days))
const TODAY = day(0)
const THIS_MONDAY = new Date(2026, 10, 23)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

let nextId = 1

function entry(overrides: Partial<MealPlanEntry> = {}): MealPlanEntry {
  return {
    id: `entry-${nextId++}`,
    date: TODAY,
    slot: 'dinner',
    recipeId: 'recipe-1',
    servings: 2,
    status: 'planned',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  }
}

function ing(name: string, quantity: number, unit: RecipeIngredient['unit'], overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return { name, quantity, unit, isOptional: false, ...overrides }
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    name: 'Pancakes',
    ingredients: [],
    instructions: [],
    servings: 2,
    tags: [],
    dietaryInfo: [],
    isFavorite: false,
    timesCooked: 0,
    source: 'builtin',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  }
}

function pantry(name: string, quantity: number, quantityUnit: FoodItem['quantityUnit'], overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: `item-${nextId++}`,
    householdId: 'household',
    name,
    category: 'other',
    quantity,
    quantityUnit,
    originalQuantity: quantity,
    storageLocation: 'pantry',
    purchaseDate: day(-1),
    expirationDate: day(30),
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

function listItem(name: string, overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: `shop-${nextId++}`,
    shoppingListId: 'demo-list',
    name,
    source: 'manual',
    isChecked: false,
    priority: 'normal',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  }
}

describe('meal slots', () => {
  it('lists breakfast, lunch and dinner in order', () => {
    expect(MEAL_SLOTS.map((s) => s.key)).toEqual(['breakfast', 'lunch', 'dinner'])
  })

  it('labels each slot', () => {
    expect(getSlotLabel('breakfast')).toBe('Breakfast')
    expect(getSlotLabel('lunch')).toBe('Lunch')
    expect(getSlotLabel('dinner')).toBe('Dinner')
  })

  it('falls back to the key for an unknown slot', () => {
    expect(getSlotLabel('brunch' as MealSlot)).toBe('brunch')
  })
})

describe('weeks', () => {
  it('start on Monday at midnight', () => {
    expect(getWeekStart(NOW)).toEqual(THIS_MONDAY)
    expect(getWeekStart(THIS_MONDAY)).toEqual(THIS_MONDAY)
    // Sunday is the last day of the week, not the first
    expect(getWeekStart(at(1, 23, 59))).toEqual(THIS_MONDAY)
    expect(getWeekStart(at(2, 0, 1))).toEqual(new Date(2026, 10, 30))
  })

  it('list seven local dates from the start', () => {
    expect(getWeekDates(THIS_MONDAY)).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ])
  })

  it('list dates across a month and a year', () => {
    const dates = getWeekDates(new Date(2026, 11, 28))
    expect(dates[0]).toBe('2026-12-28')
    expect(dates[3]).toBe('2026-12-31')
    expect(dates[4]).toBe('2027-01-01')
    expect(dates[6]).toBe('2027-01-03')
  })

  it('format a range in one month', () => {
    expect(formatWeekRange(new Date(2026, 9, 12))).toBe('Oct 12 – 18')
  })

  it('format a range across months and years', () => {
    expect(formatWeekRange(new Date(2026, 8, 28))).toBe('Sep 28 – Oct 4')
    expect(formatWeekRange(new Date(2026, 11, 28))).toBe('Dec 28 – Jan 3')
  })

  it('count the offset from the current week', () => {
    expect(getWeekOffset(THIS_MONDAY, NOW)).toBe(0)
    expect(getWeekOffset(shiftWeek(THIS_MONDAY, 1), NOW)).toBe(1)
    expect(getWeekOffset(shiftWeek(THIS_MONDAY, -1), NOW)).toBe(-1)
    expect(getWeekOffset(shiftWeek(THIS_MONDAY, 6), NOW)).toBe(6)
  })

  it('count the offset from the real current week by default', () => {
    expect(getWeekOffset(THIS_MONDAY)).toBe(0)
    expect(getWeekOffset(shiftWeek(THIS_MONDAY, 2))).toBe(2)
  })

  it('count the offset the same on any day of the current week', () => {
    expect(getWeekOffset(THIS_MONDAY, THIS_MONDAY)).toBe(0)
    expect(getWeekOffset(THIS_MONDAY, at(1, 23, 59))).toBe(0)
    expect(getWeekOffset(THIS_MONDAY, at(2, 0, 1))).toBe(-1)
  })

  it('count the offset across a daylight saving change', () => {
    // Weeks spanning the spring and autumn clock changes in most time zones
    const spring = getWeekStart(new Date(2027, 2, 10))
    expect(getWeekOffset(shiftWeek(spring, 3), spring)).toBe(3)
    const autumn = getWeekStart(new Date(2027, 9, 20))
    expect(getWeekOffset(shiftWeek(autumn, 3), autumn)).toBe(3)
  })

  it('title the nearby weeks in words and others by date', () => {
    expect(getWeekTitle(THIS_MONDAY, NOW)).toBe('This week')
    expect(getWeekTitle(shiftWeek(THIS_MONDAY, 1), NOW)).toBe('Next week')
    expect(getWeekTitle(shiftWeek(THIS_MONDAY, -1), NOW)).toBe('Last week')
    expect(getWeekTitle(shiftWeek(THIS_MONDAY, 2), NOW)).toBe('Dec 7 – 13')
    expect(getWeekTitle(shiftWeek(THIS_MONDAY, -2), NOW)).toBe('Nov 9 – 15')
  })

  it('title the shopping trip the same way, mid-sentence', () => {
    expect(getShopTitle(THIS_MONDAY, NOW)).toBe('Shop for this week')
    expect(getShopTitle(shiftWeek(THIS_MONDAY, 1), NOW)).toBe('Shop for next week')
    expect(getShopTitle(shiftWeek(THIS_MONDAY, -1), NOW)).toBe('Shop for last week')
    expect(getShopTitle(shiftWeek(THIS_MONDAY, 2), NOW)).toBe('Shop for Dec 7 – 13')
  })

  it('shift by whole weeks', () => {
    expect(shiftWeek(THIS_MONDAY, 1)).toEqual(new Date(2026, 10, 30))
    expect(shiftWeek(THIS_MONDAY, -2)).toEqual(new Date(2026, 10, 9))
    expect(shiftWeek(THIS_MONDAY, 0)).toEqual(THIS_MONDAY)
  })
})

describe('formatRelativeDay', () => {
  it('names today, tomorrow and yesterday', () => {
    expect(formatRelativeDay(day(0), NOW)).toBe('Today')
    expect(formatRelativeDay(day(1), NOW)).toBe('Tomorrow')
    expect(formatRelativeDay(day(-1), NOW)).toBe('Yesterday')
  })

  it('gives the weekday and date for other days', () => {
    expect(formatRelativeDay(day(3), NOW)).toBe('Tue, Dec 1')
    expect(formatRelativeDay(day(-2), NOW)).toBe('Thu, Nov 26')
  })

  it('counts calendar days, whatever the time of day', () => {
    expect(formatRelativeDay(day(1), at(0, 0, 1))).toBe('Tomorrow')
    expect(formatRelativeDay(day(1), at(0, 23, 59))).toBe('Tomorrow')
  })

  it('uses the real today by default', () => {
    expect(formatRelativeDay(TODAY)).toBe('Today')
  })

  it('lowercases the relative words for use inside a sentence', () => {
    expect(formatRelativeDayInline(day(0), NOW)).toBe('today')
    expect(formatRelativeDayInline(day(1), NOW)).toBe('tomorrow')
    expect(formatRelativeDayInline(day(-1), NOW)).toBe('yesterday')
    expect(formatRelativeDayInline(day(3), NOW)).toBe('Tue, Dec 1')
  })
})

describe('formatMealTime', () => {
  it('puts the meal before a relative day', () => {
    expect(formatMealTime(day(0), 'breakfast', NOW)).toBe('breakfast today')
    expect(formatMealTime(day(1), 'dinner', NOW)).toBe('dinner tomorrow')
    expect(formatMealTime(day(-1), 'lunch', NOW)).toBe('lunch yesterday')
  })

  it('says "on" before a date', () => {
    expect(formatMealTime(day(3), 'lunch', NOW)).toBe('lunch on Tue, Dec 1')
  })
})

describe('getNextPlanDay', () => {
  it('is the day after the meal', () => {
    expect(getNextPlanDay(day(0), TODAY)).toBe(day(1))
    expect(getNextPlanDay(day(5), TODAY)).toBe(day(6))
  })

  it('crosses month and year ends', () => {
    expect(getNextPlanDay('2026-11-30', TODAY)).toBe('2026-12-01')
    expect(getNextPlanDay('2026-12-31', TODAY)).toBe('2027-01-01')
  })

  it('moves a missed meal to today, never into the past', () => {
    expect(getNextPlanDay(day(-1), TODAY)).toBe(TODAY)
    expect(getNextPlanDay(day(-10), TODAY)).toBe(TODAY)
  })

  it('uses the real today by default', () => {
    expect(getNextPlanDay(day(-3))).toBe(TODAY)
    expect(getNextPlanDay(day(0))).toBe(day(1))
  })
})

describe('getNextOpenSlot', () => {
  it('starts at breakfast before 10:30', () => {
    expect(getNextOpenSlot([], at(0, 6))).toEqual({ date: TODAY, slot: 'breakfast' })
    expect(getNextOpenSlot([], at(0, 10, 29))).toEqual({ date: TODAY, slot: 'breakfast' })
  })

  it('starts at lunch from 10:30 until 3pm', () => {
    expect(getNextOpenSlot([], at(0, 10, 30))).toEqual({ date: TODAY, slot: 'lunch' })
    expect(getNextOpenSlot([], at(0, 14, 59))).toEqual({ date: TODAY, slot: 'lunch' })
  })

  it('starts at dinner from 3pm', () => {
    expect(getNextOpenSlot([], at(0, 15))).toEqual({ date: TODAY, slot: 'dinner' })
    expect(getNextOpenSlot([], at(0, 23, 59))).toEqual({ date: TODAY, slot: 'dinner' })
  })

  it('uses the real time by default', () => {
    expect(getNextOpenSlot([])).toEqual({ date: TODAY, slot: 'lunch' })
  })

  it('skips planned and cooked slots', () => {
    const entries = [
      entry({ date: TODAY, slot: 'lunch' }),
      entry({ date: TODAY, slot: 'dinner', status: 'cooked' }),
    ]
    expect(getNextOpenSlot(entries, at(0, 12))).toEqual({ date: day(1), slot: 'breakfast' })
  })

  it('treats a skipped meal as an open slot', () => {
    const entries = [entry({ date: TODAY, slot: 'lunch', status: 'skipped' })]
    expect(getNextOpenSlot(entries, at(0, 12))).toEqual({ date: TODAY, slot: 'lunch' })
  })

  it('finds a gap later in the week', () => {
    const entries = [
      entry({ date: TODAY, slot: 'dinner' }),
      entry({ date: day(1), slot: 'breakfast' }),
      entry({ date: day(1), slot: 'dinner' }),
    ]
    expect(getNextOpenSlot(entries, at(0, 16))).toEqual({ date: day(1), slot: 'lunch' })
  })

  it('ignores an earlier slot today that has already passed', () => {
    // Breakfast is open but it is already lunchtime
    const entries = [entry({ date: TODAY, slot: 'lunch' })]
    expect(getNextOpenSlot(entries, at(0, 12))).toEqual({ date: TODAY, slot: 'dinner' })
  })

  it('falls back to dinner two weeks out when the next two weeks are full', () => {
    const entries: MealPlanEntry[] = []
    for (let d = 0; d < 14; d++) {
      for (const { key } of MEAL_SLOTS) entries.push(entry({ date: day(d), slot: key }))
    }
    expect(getNextOpenSlot(entries, at(0, 8))).toEqual({ date: day(14), slot: 'dinner' })
  })
})

describe('servings', () => {
  it('guess a slot from the tags, ignoring case', () => {
    expect(getDefaultSlot(recipe({ tags: ['Breakfast'] }))).toBe('breakfast')
    expect(getDefaultSlot(recipe({ tags: ['quick', 'LUNCH'] }))).toBe('lunch')
    expect(getDefaultSlot(recipe({ tags: ['lunch', 'breakfast'] }))).toBe('breakfast')
    expect(getDefaultSlot(recipe({ tags: ['vegetarian'] }))).toBe('dinner')
    expect(getDefaultSlot(recipe({ tags: [] }))).toBe('dinner')
  })

  it('default to the recipe servings, or 1 without them', () => {
    expect(getDefaultServings(recipe({ servings: 4 }))).toBe(4)
    expect(getDefaultServings(recipe({ servings: undefined }))).toBe(1)
    expect(getDefaultServings(recipe({ servings: 0 }))).toBe(1)
  })

  it('scale a recipe by the servings planned', () => {
    expect(getScaleFactor(entry({ servings: 4 }), recipe({ servings: 2 }))).toBe(2)
    expect(getScaleFactor(entry({ servings: 1 }), recipe({ servings: 4 }))).toBe(0.25)
    expect(getScaleFactor(entry({ servings: 2 }), recipe({ servings: 2 }))).toBe(1)
  })

  it('treat a recipe without servings as one batch per serving', () => {
    expect(getScaleFactor(entry({ servings: 3 }), recipe({ servings: undefined }))).toBe(3)
    expect(getScaleFactor(entry({ servings: 3 }), recipe({ servings: 0 }))).toBe(3)
  })
})

describe('formatQuantity', () => {
  it('leaves counted units without a label', () => {
    expect(formatQuantity(8, 'count')).toBe('8')
    expect(formatQuantity(3, 'unit')).toBe('3')
  })

  it('adds the short label for other units', () => {
    expect(formatQuantity(2, 'tbsp')).toBe('2 tbsp')
    expect(formatQuantity(2, 'pack')).toBe('2 pk')
    expect(formatQuantity(1.5, 'l')).toBe('1.5 L')
    expect(formatQuantity(1, 'dozen')).toBe('1 dz')
  })

  it('rounds to two decimals', () => {
    expect(formatQuantity(2 / 3, 'lb')).toBe('0.67 lb')
    expect(formatQuantity(0.1 + 0.2, 'cup')).toBe('0.3 cup')
    expect(formatQuantity(1.999, 'kg')).toBe('2 kg')
  })
})

describe('getShoppableEntries', () => {
  const week = getWeekDates(THIS_MONDAY)

  it('keeps planned meals in the given dates from today on', () => {
    const today = entry({ id: 'today', date: TODAY })
    const tomorrow = entry({ id: 'tomorrow', date: day(1) })
    expect(getShoppableEntries([today, tomorrow], week, TODAY)).toEqual([today, tomorrow])
  })

  it('leaves out past days, other weeks, and cooked or skipped meals', () => {
    const plan = [
      entry({ id: 'yesterday', date: day(-1) }),
      entry({ id: 'next week', date: day(2) }),
      entry({ id: 'cooked', status: 'cooked' }),
      entry({ id: 'skipped', status: 'skipped' }),
      entry({ id: 'keep', date: day(1) }),
    ]
    expect(getShoppableEntries(plan, week, TODAY).map((e) => e.id)).toEqual(['keep'])
  })

  it('returns nothing for no dates or no plan', () => {
    expect(getShoppableEntries([entry()], [], TODAY)).toEqual([])
    expect(getShoppableEntries([], week, TODAY)).toEqual([])
  })
})

describe('buildShoppingPlan', () => {
  const pancakes = recipe({
    id: 'pancakes',
    name: 'Pancakes',
    servings: 2,
    ingredients: [ing('Flour', 1, 'cup'), ing('Eggs', 2, 'count'), ing('Blueberries', 0.5, 'cup', { isOptional: true })],
  })
  const omelette = recipe({
    id: 'omelette',
    name: 'Omelette',
    servings: 1,
    ingredients: [ing('eggs', 3, 'count'), ing('Butter', 1, 'tbsp')],
  })
  const plan = (...entries: MealPlanEntry[]) => entries
  const byName = (lines: ShopLine[], name: string) => lines.find((l) => l.name === name)

  it('is empty for no entries', () => {
    expect(buildShoppingPlan([], [pancakes], [], [])).toEqual([])
  })

  it('skips entries whose recipe is missing', () => {
    expect(buildShoppingPlan([entry({ recipeId: 'gone' })], [pancakes], [], [])).toEqual([])
  })

  it('scales each recipe by the servings planned', () => {
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'pancakes', servings: 4 })), [pancakes], [], [])
    expect(byName(lines, 'Flour')).toMatchObject({ needed: 2, toBuy: 2, unit: 'cup', status: 'buy' })
    expect(byName(lines, 'Eggs')).toMatchObject({ needed: 4, toBuy: 4 })
  })

  it('merges the same ingredient across recipes, ignoring case and whitespace', () => {
    const scramble = recipe({ id: 'scramble', name: 'Scramble', servings: 1, ingredients: [ing(' EGGS ', 1, 'count')] })
    const lines = buildShoppingPlan(
      plan(
        entry({ recipeId: 'pancakes', servings: 2, date: TODAY }),
        entry({ recipeId: 'omelette', servings: 1, date: day(1) }),
        entry({ recipeId: 'scramble', servings: 1, date: day(1) }),
      ),
      [pancakes, omelette, scramble],
      [],
      [],
    )
    const eggs = lines.filter((l) => l.name.toLowerCase() === 'eggs')
    expect(eggs).toHaveLength(1)
    expect(eggs[0]).toMatchObject({ key: 'eggs|count', name: 'Eggs', needed: 6, toBuy: 6, recipes: ['Pancakes', 'Omelette', 'Scramble'] })
  })

  it('trims the name shown for the line', () => {
    const scramble = recipe({ id: 'scramble', name: 'Scramble', servings: 1, ingredients: [ing('  Eggs ', 1, 'count')] })
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'scramble', servings: 1 })), [scramble], [], [])
    expect(lines.map((l) => [l.key, l.name])).toEqual([['eggs|count', 'Eggs']])
  })

  it('lists recipes in plan date order, each once', () => {
    const lines = buildShoppingPlan(
      plan(
        entry({ recipeId: 'omelette', servings: 1, date: day(1) }),
        entry({ recipeId: 'pancakes', servings: 2, date: TODAY }),
        entry({ recipeId: 'omelette', servings: 1, date: day(2) }),
      ),
      [pancakes, omelette],
      [],
      [],
    )
    expect(byName(lines, 'Eggs')).toMatchObject({ needed: 8, recipes: ['Pancakes', 'Omelette'] })
    expect(byName(lines, 'Butter')).toMatchObject({ needed: 2, recipes: ['Omelette'] })
  })

  it('keeps the same ingredient in different units on separate lines', () => {
    const cake = recipe({ id: 'cake', name: 'Cake', servings: 1, ingredients: [ing('Butter', 1, 'cup')] })
    const lines = buildShoppingPlan(
      plan(entry({ recipeId: 'omelette', servings: 1 }), entry({ recipeId: 'cake', servings: 1 })),
      [omelette, cake],
      [],
      [],
    )
    expect(lines.filter((l) => l.name === 'Butter').map((l) => l.key).sort()).toEqual(['butter|cup', 'butter|tbsp'])
  })

  it('subtracts pantry stock in the same unit', () => {
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'omelette', servings: 2 })), [omelette], [pantry('Eggs', 4, 'count')], [])
    expect(byName(lines, 'eggs')).toMatchObject({ needed: 6, inPantry: 4, toBuy: 2, status: 'buy' })
  })

  it('adds up several matching pantry items', () => {
    const inventory = [pantry('Eggs', 2, 'count'), pantry('Free Range Eggs', 3, 'count')]
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'omelette', servings: 2 })), [omelette], inventory, [])
    expect(byName(lines, 'eggs')).toMatchObject({ inPantry: 5, toBuy: 1 })
    expect(byName(lines, 'eggs')?.pantryMatches).toHaveLength(2)
  })

  it('is covered when the pantry has enough', () => {
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'omelette', servings: 1 })), [omelette], [pantry('Eggs', 12, 'count')], [])
    expect(byName(lines, 'eggs')).toMatchObject({ needed: 3, inPantry: 12, toBuy: 0, status: 'covered' })
  })

  it('is covered when the pantry has exactly enough', () => {
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'omelette', servings: 1 })), [omelette], [pantry('Eggs', 3, 'count')], [])
    expect(byName(lines, 'eggs')).toMatchObject({ toBuy: 0, status: 'covered' })
  })

  it('asks to check when the pantry has it in another unit', () => {
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'pancakes', servings: 2 })), [pancakes], [pantry('Flour', 2, 'lb')], [])
    const flour = byName(lines, 'Flour')
    expect(flour).toMatchObject({ inPantry: 0, toBuy: 1, status: 'check' })
    expect(flour?.pantryMatches.map((p) => p.quantityUnit)).toEqual(['lb'])
  })

  it('counts the same unit and still asks to check when another unit is short', () => {
    const inventory = [pantry('Flour', 0.5, 'cup'), pantry('Flour', 2, 'lb')]
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'pancakes', servings: 2 })), [pancakes], inventory, [])
    expect(byName(lines, 'Flour')).toMatchObject({ inPantry: 0.5, toBuy: 0.5, status: 'check' })
  })

  it('is covered by the same unit even when another unit is also there', () => {
    const inventory = [pantry('Flour', 3, 'cup'), pantry('Flour', 2, 'lb')]
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'pancakes', servings: 2 })), [pancakes], inventory, [])
    expect(byName(lines, 'Flour')?.status).toBe('covered')
  })

  it('flags what is already on the shopping list, ignoring case and whitespace', () => {
    const lines = buildShoppingPlan(
      plan(entry({ recipeId: 'pancakes', servings: 2 })),
      [pancakes],
      [pantry('Flour', 2, 'lb')],
      [listItem('  FLOUR '), listItem('eggs')],
    )
    // On the list wins over "check"
    expect(byName(lines, 'Flour')?.status).toBe('on_list')
    expect(byName(lines, 'Eggs')?.status).toBe('on_list')
    expect(byName(lines, 'Eggs')?.toBuy).toBe(2)
  })

  it('reports covered rather than on the list when the pantry has enough', () => {
    const lines = buildShoppingPlan(
      plan(entry({ recipeId: 'omelette', servings: 1 })),
      [omelette],
      [pantry('Eggs', 6, 'count')],
      [listItem('Eggs')],
    )
    expect(byName(lines, 'eggs')?.status).toBe('covered')
  })

  it('matches the pantry by substring, as the recipe pages do', () => {
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'pancakes', servings: 2 })), [pancakes], [pantry('All-Purpose Flour', 5, 'cup')], [])
    expect(byName(lines, 'Flour')?.status).toBe('covered')
  })

  it('counts substitutes from every recipe that uses the ingredient', () => {
    const toast = recipe({ id: 'toast', name: 'Toast', servings: 1, ingredients: [ing('Butter', 1, 'tbsp', { substitutes: ['Margarine'] })] })
    const eggsOnToast = recipe({ id: 'eot', name: 'Eggs on Toast', servings: 1, ingredients: [ing('butter', 1, 'tbsp', { substitutes: ['Ghee'] })] })
    const lines = buildShoppingPlan(
      plan(entry({ recipeId: 'toast', servings: 1 }), entry({ recipeId: 'eot', servings: 1, date: day(1) })),
      [toast, eggsOnToast],
      [pantry('Margarine', 1, 'tbsp'), pantry('Ghee', 1, 'tbsp')],
      [],
    )
    expect(byName(lines, 'Butter')).toMatchObject({ needed: 2, inPantry: 2, status: 'covered' })
  })

  it('ignores pantry items that are used up or no longer active', () => {
    const inventory = [
      pantry('Eggs', 0, 'count'),
      pantry('Eggs', 12, 'count', { status: 'consumed' }),
      pantry('Eggs', 12, 'count', { status: 'expired' }),
    ]
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'omelette', servings: 1 })), [omelette], inventory, [])
    expect(byName(lines, 'eggs')).toMatchObject({ inPantry: 0, status: 'buy', pantryMatches: [] })
  })

  it('is optional only when every recipe marks it optional', () => {
    const muffins = recipe({ id: 'muffins', name: 'Muffins', servings: 1, ingredients: [ing('blueberries', 1, 'cup')] })
    const alone = buildShoppingPlan(plan(entry({ recipeId: 'pancakes', servings: 2 })), [pancakes], [], [])
    expect(byName(alone, 'Blueberries')?.optional).toBe(true)
    expect(byName(alone, 'Flour')?.optional).toBe(false)

    const both = buildShoppingPlan(
      plan(entry({ recipeId: 'pancakes', servings: 2 }), entry({ recipeId: 'muffins', servings: 1, date: day(1) })),
      [pancakes, muffins],
      [],
      [],
    )
    expect(byName(both, 'Blueberries')).toMatchObject({ optional: false, needed: 1.5 })
  })

  it('rounds whole units up to what you can buy', () => {
    // 2 eggs for 2 servings, planned for 1: 1 egg; 3 servings: 3 eggs
    const halfPack = recipe({ id: 'half', name: 'Half', servings: 2, ingredients: [ing('Tortillas', 1, 'pack'), ing('Eggs', 3, 'count')] })
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'half', servings: 1 })), [halfPack], [], [])
    expect(byName(lines, 'Tortillas')).toMatchObject({ needed: 0.5, toBuy: 1 })
    expect(byName(lines, 'Eggs')).toMatchObject({ needed: 1.5, toBuy: 2 })
  })

  it('does not round a whole unit up for floating point noise', () => {
    // 0.1 × 30 is 3.0000000000000004
    const tiny = recipe({ id: 'tiny', name: 'Tiny', servings: 1, ingredients: [ing('Cloves', 0.1, 'count')] })
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'tiny', servings: 30 })), [tiny], [], [])
    expect(byName(lines, 'Cloves')?.toBuy).toBe(3)
  })

  it('rounds measured units to two decimals, and at least 0.01', () => {
    const sauce = recipe({ id: 'sauce', name: 'Sauce', servings: 3, ingredients: [ing('Cheese', 2, 'lb'), ing('Salt', 0.003, 'tsp')] })
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'sauce', servings: 1 })), [sauce], [], [])
    expect(byName(lines, 'Cheese')?.toBuy).toBe(0.67)
    expect(byName(lines, 'Salt')?.toBuy).toBe(0.01)
  })

  it('takes the category from the first pantry match', () => {
    const inventory = [pantry('Eggs', 1, 'count', { category: 'dairy' }), pantry('Duck Eggs', 1, 'count', { category: 'meat' })]
    const lines = buildShoppingPlan(plan(entry({ recipeId: 'omelette', servings: 1 })), [omelette], inventory, [])
    expect(byName(lines, 'eggs')?.category).toBe('dairy')
    expect(byName(lines, 'Butter')?.category).toBeUndefined()
  })

  it('sorts by status, then required before optional, then by name', () => {
    const big = recipe({
      id: 'big',
      name: 'Big',
      servings: 1,
      ingredients: [
        ing('Zucchini', 1, 'count'),
        ing('Apples', 1, 'count'),
        ing('Basil', 1, 'bunch', { isOptional: true }),
        ing('Onion', 1, 'count'),
        ing('Rice', 1, 'cup'),
        ing('Garlic', 1, 'count'),
      ],
    })
    const lines = buildShoppingPlan(
      plan(entry({ recipeId: 'big', servings: 1 })),
      [big],
      [pantry('Rice', 1, 'lb'), pantry('Garlic', 5, 'count')],
      [listItem('Onion')],
    )
    expect(lines.map((l) => `${l.name}: ${l.status}`)).toEqual([
      'Apples: buy',
      'Zucchini: buy',
      'Basil: buy',
      'Rice: check',
      'Onion: on_list',
      'Garlic: covered',
    ])
  })

  // Suspected bug: the merge key and the shown name are trimmed, but the pantry is
  // matched with the untrimmed ingredient name, so ' eggs ' finds "Eggs" but not
  // "Free Range Eggs" (which 'eggs' does find).
  it.todo('matches the pantry with the trimmed ingredient name')

  // Suspected bug: when floating point leaves a tiny positive remainder, the line is
  // 'covered' (remaining <= 1e-9) but toBuy is rounded up to the 0.01 minimum.
  it.todo('has nothing to buy on a covered line with a tiny floating point remainder (0.1 cup × 3 vs 0.3 cup in the pantry)')
})

describe('toShoppingListItem', () => {
  const line: ShopLine = {
    key: 'eggs|count',
    name: 'Eggs',
    unit: 'count',
    needed: 5,
    inPantry: 2,
    toBuy: 3,
    optional: false,
    recipes: ['Pancakes', 'Omelette'],
    pantryMatches: [],
    category: 'dairy',
    status: 'buy',
  }

  it('turns a shop line into a recipe item for the list', () => {
    expect(toShoppingListItem(line)).toEqual({
      shoppingListId: 'demo-list',
      name: 'Eggs',
      category: 'dairy',
      quantity: 3,
      quantityUnit: 'count',
      notes: 'For Pancakes, Omelette',
      isChecked: false,
      source: 'recipe',
      priority: 'normal',
    })
  })

  it('uses "other" when the line has no category', () => {
    expect(toShoppingListItem({ ...line, category: undefined, recipes: ['Toast'] })).toMatchObject({
      category: 'other',
      notes: 'For Toast',
    })
  })
})
