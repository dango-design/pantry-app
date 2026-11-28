import { describe, expect, it } from 'vitest'
import type { FoodItem } from '@/types'
import { FOOD_TABLE } from './foodTable'
import {
  clampHouseholdSize,
  daysSinceTouched,
  estimateServings,
  FOOD_ROLE_LABELS,
  FOOD_ROLES,
  getRole,
  getTouchedAt,
  guessRole,
  ROLE_BY_FOOD,
  SERVINGS_BY_FOOD,
  SNACKING_FRUIT,
  isSnackingFruit,
} from './foodRoles'
import { guessItem, roleForNewItem } from './itemDefaults'
import { getProductMemory } from './stock'

function item(overrides: Partial<FoodItem>): FoodItem {
  return {
    id: 'item',
    householdId: 'household',
    name: 'Thing',
    category: 'other',
    quantity: 1,
    quantityUnit: 'count',
    originalQuantity: 1,
    storageLocation: 'pantry',
    purchaseDate: '2026-11-20',
    expirationDate: '2027-01-01',
    expirationSource: 'calculated',
    freshnessScore: 100,
    tags: [],
    addedBy: 'user',
    addedVia: 'manual',
    status: 'active',
    createdAt: '2026-11-20T15:00:00.000Z',
    updatedAt: '2026-11-20T15:00:00.000Z',
    ...overrides,
  }
}

describe('role labels', () => {
  it('has a US English label for every role', () => {
    expect(FOOD_ROLES.map((role) => FOOD_ROLE_LABELS[role])).toEqual([
      'Main', 'Base', 'Veg & fruit', 'Breakfast & dairy', 'Snack', 'Flavor', 'Drink',
    ])
  })
})

describe('guessRole', () => {
  it('uses the category when the name has no exception', () => {
    expect(guessRole('Chicken thighs', 'meat')).toBe('main')
    expect(guessRole('Salmon', 'seafood')).toBe('main')
    expect(guessRole('Spaghetti', 'pantry')).toBe('base')
    expect(guessRole('Jasmine rice', 'pantry')).toBe('base')
    expect(guessRole('Flour tortillas', 'bakery')).toBe('base')
    expect(guessRole('Spinach', 'produce')).toBe('produce')
    expect(guessRole('Greek yogurt', 'dairy')).toBe('breakfast')
    expect(guessRole('Tortilla chips', 'snacks')).toBe('snack')
    expect(guessRole('Soy sauce', 'condiments')).toBe('flavor')
    expect(guessRole('Kombucha', 'beverages')).toBe('drink')
  })

  it('makes eggs, tofu, beans and frozen meals mains whatever their category', () => {
    expect(guessRole('Large brown eggs', 'dairy')).toBe('main')
    expect(guessRole('Firm tofu', 'produce')).toBe('main')
    expect(guessRole('Black beans', 'pantry')).toBe('main')
    expect(guessRole('Canned black beans', 'pantry')).toBe('main')
    expect(guessRole('Chickpeas', 'pantry')).toBe('main')
    expect(guessRole('Frozen meal', 'frozen')).toBe('main')
    expect(guessRole('Frozen dinners', 'frozen')).toBe('main')
    expect(guessRole('Lean Cuisine frozen entree', 'frozen')).toBe('main')
    expect(guessRole('Tempeh', 'other')).toBe('main')
  })

  it('makes peanut butter breakfast, but not peanut butter cookies', () => {
    expect(guessRole('Peanut butter', 'pantry')).toBe('breakfast')
    expect(guessRole('Peanut butter cookies', 'snacks')).toBe('snack')
  })

  it('puts oils, spices, sauces and baking basics under flavor', () => {
    expect(guessRole('Sesame oil', 'pantry')).toBe('flavor')
    expect(guessRole('Kosher salt', 'pantry')).toBe('flavor')
    expect(guessRole('Ground cumin', 'pantry')).toBe('flavor')
    expect(guessRole('Sugar', 'pantry')).toBe('flavor')
    expect(guessRole('All-purpose flour', 'pantry')).toBe('flavor')
    expect(guessRole('Marinara sauce', 'condiments')).toBe('flavor')
    expect(guessRole('Garlic', 'produce')).toBe('flavor')
    expect(guessRole('Butter', 'dairy')).toBe('flavor')
  })

  it('keeps the food’s role for frozen and canned versions', () => {
    expect(guessRole('Frozen spinach', 'frozen')).toBe('produce')
    expect(guessRole('Frozen chicken breast', 'frozen')).toBe('main')
    expect(guessRole('Frozen peas', 'frozen')).toBe('produce')
  })

  it('does not let a flavor word at the end decide', () => {
    expect(guessRole('Chips sea salt', 'snacks')).toBe('snack')
    expect(guessRole('Green beans', 'produce')).toBe('produce')
    expect(guessRole('Egg noodles', 'pantry')).toBe('base')
  })

  it('makes unknown items snacks, so they never count as dinners', () => {
    expect(guessRole('Mystery thing', 'other')).toBe('snack')
  })

  it('only lists foods that are in the food table', () => {
    const names = new Set(FOOD_TABLE.map((entry) => entry.name.toLowerCase()))
    expect(Object.keys(ROLE_BY_FOOD).filter((name) => !names.has(name))).toEqual([])
    expect(Object.keys(SERVINGS_BY_FOOD).filter((name) => !names.has(name))).toEqual([])
    expect([...SNACKING_FRUIT].filter((name) => !names.has(name))).toEqual([])
  })
})

describe('isSnackingFruit', () => {
  it('finds fruit eaten on its own, including frozen', () => {
    expect(isSnackingFruit('Apples')).toBe(true)
    expect(isSnackingFruit('Banana')).toBe(true)
    expect(isSnackingFruit('Frozen Blueberries')).toBe(true)
  })

  it('leaves out fruit used in cooking, and vegetables', () => {
    expect(isSnackingFruit('Tomatoes')).toBe(false)
    expect(isSnackingFruit('Avocados')).toBe(false)
    expect(isSnackingFruit('Broccoli')).toBe(false)
    expect(isSnackingFruit('Mystery thing')).toBe(false)
  })
})

describe('getRole', () => {
  it('returns the stored role', () => {
    expect(getRole(item({ name: 'Peanut butter', category: 'pantry', role: 'main', roleSource: 'manual' }))).toBe('main')
  })

  it('guesses for items saved before roles existed', () => {
    expect(getRole(item({ name: 'Eggs', category: 'dairy' }))).toBe('main')
  })

  it('ignores a stored value that is not a role', () => {
    expect(getRole(item({ name: 'Eggs', category: 'dairy', role: 'dessert' as never }))).toBe('main')
  })

  it('works for staples', () => {
    expect(getRole({ name: 'Rice', category: 'pantry' })).toBe('base')
  })
})

describe('roleForNewItem and guessItem', () => {
  it('guesses for a product never bought before', () => {
    expect(roleForNewItem('Eggs', 'dairy', [])).toEqual({ role: 'main', roleSource: 'guessed' })
    expect(guessItem('Eggs', [])).toMatchObject({ category: 'dairy', role: 'main', roleSource: 'guessed' })
  })

  it('carries over a role a person chose for the product', () => {
    const rows = [item({ name: 'Peanut Butter', category: 'pantry', role: 'main', roleSource: 'manual' })]
    const memory = getProductMemory(rows, [])
    expect(roleForNewItem('peanut butter', 'pantry', memory)).toEqual({ role: 'main', roleSource: 'manual' })
    expect(guessItem('Peanut butter', memory)).toMatchObject({ role: 'main', roleSource: 'manual' })
  })

  it('does not carry over a guessed role', () => {
    const rows = [item({ name: 'Peanut Butter', category: 'pantry', role: 'snack', roleSource: 'guessed' })]
    expect(roleForNewItem('Peanut butter', 'pantry', getProductMemory(rows, []))).toEqual({ role: 'breakfast', roleSource: 'guessed' })
  })

  it('carries over a role set on the staple', () => {
    const staple = {
      id: 's', name: 'Tortillas', category: 'bakery' as const, unit: 'count' as const, minQuantity: 4, buyQuantity: 10,
      autoAdd: true, countedAt: '', createdAt: '', updatedAt: '', role: 'main' as const,
    }
    expect(roleForNewItem('Tortillas', 'bakery', getProductMemory([], [staple]))).toEqual({ role: 'main', roleSource: 'manual' })
  })
})

describe('estimateServings', () => {
  const servings = (overrides: Partial<FoodItem>) => estimateServings(item(overrides))

  it('uses the rules of thumb for weight', () => {
    expect(servings({ name: 'Chicken thighs', category: 'meat', quantity: 1, quantityUnit: 'lb' })).toBe(4)
    expect(servings({ name: 'Spaghetti', category: 'pantry', quantity: 1, quantityUnit: 'lb' })).toBeCloseTo(8, 0)
    expect(servings({ name: 'Rice', category: 'pantry', quantity: 1, quantityUnit: 'lb' })).toBeCloseTo(10, 0)
    expect(servings({ name: 'Ground beef', category: 'meat', quantity: 16, quantityUnit: 'oz' })).toBe(4)
  })

  it('counts a can of beans as 3 and two eggs as one serving', () => {
    expect(servings({ name: 'Black beans', category: 'pantry', quantity: 1, quantityUnit: 'count' })).toBe(3)
    expect(servings({ name: 'Eggs', category: 'dairy', quantity: 12, quantityUnit: 'count' })).toBe(6)
    expect(servings({ name: 'Eggs', category: 'dairy', quantity: 1, quantityUnit: 'dozen' })).toBe(6)
  })

  it('uses a container size for packs and units', () => {
    expect(servings({ name: 'Spaghetti Pasta', category: 'pantry', quantity: 2, quantityUnit: 'pack' })).toBe(16)
    expect(servings({ name: 'Bread', category: 'bakery', quantity: 1, quantityUnit: 'unit' })).toBe(8)
    expect(servings({ name: 'Frozen dinners', category: 'frozen', quantity: 3, quantityUnit: 'pack' })).toBe(3)
  })

  it('uses a cup for drinks by volume', () => {
    expect(servings({ name: 'Milk', category: 'dairy', quantity: 1, quantityUnit: 'gal' })).toBeCloseTo(15.8, 1)
  })

  it('uses the stored role', () => {
    // A pack of a main is 4 servings; the same pack as a snack is 6
    expect(servings({ name: 'Mystery thing', quantity: 1, quantityUnit: 'pack', role: 'main' })).toBe(4)
    expect(servings({ name: 'Mystery thing', quantity: 1, quantityUnit: 'pack' })).toBe(6)
  })

  it('returns the typed number when there is one', () => {
    expect(servings({ name: 'Chicken thighs', category: 'meat', quantity: 1, quantityUnit: 'lb', servings: 3 })).toBe(3)
    expect(servings({ name: 'Chicken thighs', category: 'meat', quantity: 1, quantityUnit: 'lb', servings: 0 })).toBe(0)
  })

  it('is 0 when nothing is left', () => {
    expect(servings({ name: 'Rice', category: 'pantry', quantity: 0, quantityUnit: 'lb' })).toBe(0)
  })
})

describe('getTouchedAt', () => {
  it('returns touchedAt when it is set', () => {
    expect(getTouchedAt(item({ touchedAt: '2026-11-27T10:00:00.000Z' })).toISOString()).toBe('2026-11-27T10:00:00.000Z')
  })

  it('falls back to the start of the purchase day, in local time', () => {
    const touched = getTouchedAt(item({ purchaseDate: '2026-11-20' }))
    expect([touched.getFullYear(), touched.getMonth(), touched.getDate(), touched.getHours()]).toEqual([2026, 10, 20, 0])
  })

  it('falls back to the creation time without a purchase date', () => {
    expect(getTouchedAt(item({ purchaseDate: '' })).toISOString()).toBe('2026-11-20T15:00:00.000Z')
  })

  it('counts whole days since then', () => {
    const now = new Date(2026, 11, 12, 9)
    expect(daysSinceTouched(item({ purchaseDate: '2026-11-20' }), now)).toBe(22)
    expect(daysSinceTouched(item({ touchedAt: new Date(2026, 11, 12, 1).toISOString() }), now)).toBe(0)
  })
})

describe('clampHouseholdSize', () => {
  it('keeps the size a whole number from 1 to 20', () => {
    expect(clampHouseholdSize(3)).toBe(3)
    expect(clampHouseholdSize(0)).toBe(1)
    expect(clampHouseholdSize(2.6)).toBe(3)
    expect(clampHouseholdSize(99)).toBe(20)
    expect(clampHouseholdSize('4')).toBe(4)
    expect(clampHouseholdSize('lots')).toBe(2)
  })
})
