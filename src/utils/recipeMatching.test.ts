import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FoodItem, Recipe, RecipeIngredient } from '@/types'
import { dateStringFromToday } from './dates'
import {
  countRequiredIngredients,
  ingredientMatchesItem,
  matchAllRecipes,
  matchRecipeToInventory,
} from './recipeMatching'

const NOW = new Date(2026, 10, 28, 12, 0, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

let nextId = 1

function item(name: string, overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: `item-${nextId++}`,
    householdId: 'household',
    name,
    category: 'other',
    quantity: 1,
    quantityUnit: 'count',
    originalQuantity: 1,
    storageLocation: 'pantry',
    purchaseDate: dateStringFromToday(-1),
    // Well away from expiring unless a test sets it
    expirationDate: dateStringFromToday(30),
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

function ing(name: string, overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return { name, quantity: 1, unit: 'count', isOptional: false, ...overrides }
}

function recipe(name: string, ingredients: RecipeIngredient[], overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: `recipe-${name}`,
    name,
    ingredients,
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

describe('ingredientMatchesItem', () => {
  it('matches the same name, ignoring case', () => {
    expect(ingredientMatchesItem(ing('Butter'), item('butter'))).toBe(true)
    expect(ingredientMatchesItem(ing('olive oil'), item('OLIVE OIL'))).toBe(true)
  })

  it('matches when the item name contains the ingredient', () => {
    expect(ingredientMatchesItem(ing('chicken'), item('Chicken Thighs'))).toBe(true)
  })

  it('matches when the ingredient name contains the item', () => {
    expect(ingredientMatchesItem(ing('fresh basil'), item('Basil'))).toBe(true)
  })

  it('matches singular and plural spellings', () => {
    expect(ingredientMatchesItem(ing('eggs'), item('Egg'))).toBe(true)
    expect(ingredientMatchesItem(ing('tomato'), item('Tomatoes'))).toBe(true)
  })

  it('matches a substitute, in the same ways', () => {
    const butter = ing('butter', { substitutes: ['Margarine', 'ghee'] })
    expect(ingredientMatchesItem(butter, item('margarine'))).toBe(true)
    expect(ingredientMatchesItem(butter, item('Organic Ghee'))).toBe(true)
  })

  it('does not match an unrelated item', () => {
    expect(ingredientMatchesItem(ing('butter'), item('Milk'))).toBe(false)
    expect(ingredientMatchesItem(ing('butter', { substitutes: ['ghee'] }), item('Milk'))).toBe(false)
    expect(ingredientMatchesItem(ing('butter', { substitutes: [] }), item('Milk'))).toBe(false)
  })

  // Suspected bug: the raw substring check matches inside other words, so these
  // all match today (pantryMatch.ts matches whole words and avoids this).
  it.todo('does not match an ingredient inside another word ("ham" / "Graham Crackers", "egg" / "Eggplant", "salt" / "Unsalted Butter")')
  it.todo('does not match an item with an empty name to every ingredient')
})

describe('matchRecipeToInventory', () => {
  const pancakes = recipe('Pancakes', [ing('flour'), ing('eggs'), ing('milk'), ing('blueberries', { isOptional: true })])

  it('scores 100 when every required ingredient is in the pantry', () => {
    const result = matchRecipeToInventory(pancakes, [item('Flour'), item('Eggs'), item('Whole Milk')])
    expect(result.matchScore).toBe(100)
    expect(result.availableIngredients.map((m) => m.ingredient.name)).toEqual(['flour', 'eggs', 'milk'])
    expect(result.missingIngredients.map((m) => m.ingredient.name)).toEqual(['blueberries'])
    expect(result.recipe).toBe(pancakes)
  })

  it('scores the share of required ingredients found, rounded', () => {
    expect(matchRecipeToInventory(pancakes, [item('Flour')]).matchScore).toBe(33)
    expect(matchRecipeToInventory(pancakes, [item('Flour'), item('Eggs')]).matchScore).toBe(67)
  })

  it('does not count optional ingredients toward the score', () => {
    expect(matchRecipeToInventory(pancakes, [item('Blueberries')]).matchScore).toBe(0)
  })

  it('scores 0 with an empty pantry and lists everything as missing', () => {
    const result = matchRecipeToInventory(pancakes, [])
    expect(result.matchScore).toBe(0)
    expect(result.availableIngredients).toEqual([])
    expect(result.missingIngredients).toHaveLength(4)
    expect(result.missingIngredients.every((m) => !m.matched && m.matchedItem === undefined)).toBe(true)
  })

  it('scores 100 for a recipe with no required ingredients', () => {
    expect(matchRecipeToInventory(recipe('Toast', []), []).matchScore).toBe(100)
    expect(matchRecipeToInventory(recipe('Salad', [ing('croutons', { isOptional: true })]), []).matchScore).toBe(100)
  })

  it('records which pantry item matched', () => {
    const milk = item('Oat Milk')
    const [match] = matchRecipeToInventory(recipe('Latte', [ing('milk')]), [milk]).availableIngredients
    expect(match).toMatchObject({ matched: true, matchedItem: milk, isExpiring: false })
  })

  it('ignores items that are used up or no longer active', () => {
    const inventory = [
      item('Flour', { quantity: 0 }),
      item('Eggs', { status: 'consumed' }),
      item('Milk', { status: 'discarded' }),
    ]
    expect(matchRecipeToInventory(pancakes, inventory).matchScore).toBe(0)
  })

  it('counts matched items that expire within 3 days, including expired ones', () => {
    const inventory = [
      item('Flour', { expirationDate: dateStringFromToday(4) }),
      item('Eggs', { expirationDate: dateStringFromToday(3) }),
      item('Milk', { expirationDate: dateStringFromToday(-1) }),
    ]
    const result = matchRecipeToInventory(pancakes, inventory)
    expect(result.expiringIngredientsUsed).toBe(2)
    expect(result.availableIngredients.map((m) => [m.ingredient.name, m.isExpiring])).toEqual([
      ['flour', false],
      ['eggs', true],
      ['milk', true],
    ])
  })

  it('counts an expiring optional ingredient too', () => {
    const result = matchRecipeToInventory(pancakes, [item('Blueberries', { expirationDate: dateStringFromToday(1) })])
    expect(result.expiringIngredientsUsed).toBe(1)
  })

  it('uses the first matching item in pantry order', () => {
    const first = item('Milk', { expirationDate: dateStringFromToday(20) })
    const second = item('Milk', { expirationDate: dateStringFromToday(1) })
    const [match] = matchRecipeToInventory(recipe('Latte', [ing('milk')]), [first, second]).availableIngredients
    expect(match.matchedItem).toBe(first)
  })
})

describe('matchAllRecipes', () => {
  it('puts recipes that use more expiring items first, then the best match', () => {
    const inventory = [
      item('Spinach', { expirationDate: dateStringFromToday(1) }),
      item('Mushrooms', { expirationDate: dateStringFromToday(2) }),
      item('Rice'),
      item('Beans'),
    ]
    const results = matchAllRecipes(
      [
        recipe('Rice and Beans', [ing('rice'), ing('beans')]), // 100, none expiring
        recipe('Spinach Omelette', [ing('spinach'), ing('eggs')]), // 50, one expiring
        recipe('Mushroom Risotto', [ing('mushrooms'), ing('spinach'), ing('arborio'), ing('stock')]), // 50, two expiring
        recipe('Bean Salad', [ing('beans'), ing('lettuce')]), // 50, none expiring
        recipe('Spinach Rice', [ing('spinach'), ing('rice')]), // 100, one expiring
      ],
      inventory,
    )
    expect(results.map((r) => r.recipe.name)).toEqual([
      'Mushroom Risotto',
      'Spinach Rice',
      'Spinach Omelette',
      'Rice and Beans',
      'Bean Salad',
    ])
  })

  it('returns an empty list for no recipes', () => {
    expect(matchAllRecipes([], [item('Rice')])).toEqual([])
  })
})

describe('countRequiredIngredients', () => {
  it('counts required ingredients in the pantry out of all required ones', () => {
    const pancakes = recipe('Pancakes', [ing('flour'), ing('eggs'), ing('milk'), ing('blueberries', { isOptional: true })])
    expect(countRequiredIngredients(matchRecipeToInventory(pancakes, [item('Flour'), item('Blueberries')]))).toEqual({
      have: 1,
      total: 3,
    })
    expect(countRequiredIngredients(matchRecipeToInventory(pancakes, []))).toEqual({ have: 0, total: 3 })
  })

  it('is 0 of 0 for a recipe with only optional ingredients', () => {
    const salad = recipe('Salad', [ing('croutons', { isOptional: true })])
    expect(countRequiredIngredients(matchRecipeToInventory(salad, []))).toEqual({ have: 0, total: 0 })
  })
})
