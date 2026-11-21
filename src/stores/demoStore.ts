import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FoodItem, ShoppingListItem, Household, Recipe, FoodCategory, StorageLocation, QuantityUnit, MealPlanEntry, Staple } from '@/types'
import { dateStringFromToday, toLocalDateString } from '@/utils/dates'
import { estimateExpirationDate, getDefaultStorageLocation, lookupFood } from '@/utils/foodDatabase'
import { calculateFreshnessScore } from '@/utils/freshness'
import { findStaple, getStock, isOnShoppingList, productKey, roundStockCount, withStockCount } from '@/utils/stock'
import { roundQuantity } from '@/utils/units'

// Store version - increment this when schema changes to clear old data
const STORE_VERSION = 4

// Unique id for new records. Date.now() alone repeats when several items are
// added in the same loop (e.g. adding all checked shopping items at once).
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// Valid categories for validation
const VALID_CATEGORIES: FoodCategory[] = [
  'produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen',
  'pantry', 'beverages', 'condiments', 'snacks', 'prepared', 'other'
]

// Demo user
export const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@pantry.app',
  displayName: 'Demo User',
}

// Demo household
export const DEMO_HOUSEHOLD: Household = {
  id: 'demo-household-id',
  name: 'Demo Household',
  inviteCode: 'DEMO123',
  ownerId: DEMO_USER.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Demo item config type
interface DemoItemConfig {
  name: string
  category: FoodCategory
  quantity: number
  quantityUnit: QuantityUnit
  storageLocation: StorageLocation
  daysUntilExpiry: number
}

// Initial demo inventory
const createDemoInventory = (): FoodItem[] => {
  const now = new Date()
  const items: DemoItemConfig[] = [
    { name: 'Banana', category: 'produce', quantity: 2, quantityUnit: 'count', storageLocation: 'counter', daysUntilExpiry: 5 },
    { name: 'Almond Milk', category: 'dairy', quantity: 2, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 7 },
    { name: 'Chicken Thighs', category: 'meat', quantity: 1.34, quantityUnit: 'lb', storageLocation: 'refrigerator', daysUntilExpiry: 2 },
    { name: 'Spaghetti Pasta', category: 'pantry', quantity: 2, quantityUnit: 'pack', storageLocation: 'pantry', daysUntilExpiry: 730 },
    { name: 'Pork Gyoza', category: 'frozen', quantity: 1, quantityUnit: 'pack', storageLocation: 'freezer', daysUntilExpiry: 90 },
    { name: 'Spinach', category: 'produce', quantity: 1, quantityUnit: 'pack', storageLocation: 'refrigerator', daysUntilExpiry: 3 },
    { name: 'Greek Yogurt', category: 'dairy', quantity: 4, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 14 },
    { name: 'Eggs', category: 'dairy', quantity: 8, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 21 },
    { name: 'Cheddar Cheese', category: 'dairy', quantity: 1, quantityUnit: 'pack', storageLocation: 'refrigerator', daysUntilExpiry: 30 },
    { name: 'Ground Beef', category: 'meat', quantity: 1, quantityUnit: 'lb', storageLocation: 'freezer', daysUntilExpiry: 120 },
    { name: 'Bread', category: 'bakery', quantity: 1, quantityUnit: 'unit', storageLocation: 'counter', daysUntilExpiry: 4 },
    { name: 'Apples', category: 'produce', quantity: 5, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 14 },
    { name: 'Rice', category: 'pantry', quantity: 2, quantityUnit: 'lb', storageLocation: 'pantry', daysUntilExpiry: 365 },
    { name: 'Olive Oil', category: 'condiments', quantity: 1, quantityUnit: 'unit', storageLocation: 'pantry', daysUntilExpiry: 180 },
    { name: 'Salsa', category: 'condiments', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 30 },
  ]

  return items.map((item, index) => {
    const purchaseDate = new Date(now)
    purchaseDate.setDate(purchaseDate.getDate() - Math.floor(Math.random() * 7))

    const expirationDate = new Date(now)
    expirationDate.setDate(expirationDate.getDate() + item.daysUntilExpiry)

    const purchaseDateString = toLocalDateString(purchaseDate)
    const expirationDateString = toLocalDateString(expirationDate)

    return {
      id: `demo-item-${index + 1}`,
      householdId: DEMO_HOUSEHOLD.id,
      name: item.name!,
      category: item.category as FoodCategory,
      quantity: item.quantity!,
      quantityUnit: item.quantityUnit!,
      originalQuantity: item.quantity!,
      storageLocation: item.storageLocation as StorageLocation,
      purchaseDate: purchaseDateString,
      expirationDate: expirationDateString,
      expirationSource: 'calculated' as const,
      freshnessScore: calculateFreshnessScore(purchaseDateString, expirationDateString),
      tags: [],
      addedBy: DEMO_USER.id,
      addedVia: 'manual' as const,
      status: 'active' as const,
      createdAt: purchaseDate.toISOString(),
      updatedAt: purchaseDate.toISOString(),
    }
  })
}

// The demo staple: a drink the household has about one of a day
const DEMO_STAPLE_NAME = 'BODYARMOR Lite'

// Three purchases of 12, bought 12 days apart. The first two are used up.
// That history gives a learned use of 1 a day, so 9 days after the last
// purchase about 3 are left: below "keep at least 6".
const createDemoStapleHistory = (): FoodItem[] => {
  const purchases = [
    { daysAgo: 33, usedUpDaysAgo: 21 },
    { daysAgo: 21, usedUpDaysAgo: 9 },
    { daysAgo: 9 },
  ]

  return purchases.map(({ daysAgo, usedUpDaysAgo }, index) => {
    const purchaseDate = dateStringFromToday(-daysAgo)
    const expirationDate = dateStringFromToday(270 - daysAgo)
    const usedUp = usedUpDaysAgo !== undefined
    const purchasedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

    return {
      id: `demo-staple-item-${index + 1}`,
      householdId: DEMO_HOUSEHOLD.id,
      name: DEMO_STAPLE_NAME,
      brand: 'BODYARMOR',
      category: 'beverages' as const,
      quantity: usedUp ? 0 : 12,
      quantityUnit: 'count' as const,
      originalQuantity: 12,
      storageLocation: 'pantry',
      purchaseDate,
      expirationDate,
      expirationSource: 'calculated' as const,
      freshnessScore: calculateFreshnessScore(purchaseDate, expirationDate),
      tags: [],
      addedBy: DEMO_USER.id,
      addedVia: 'manual' as const,
      status: usedUp ? 'consumed' as const : 'active' as const,
      consumedAt: usedUp ? new Date(Date.now() - usedUpDaysAgo * 24 * 60 * 60 * 1000).toISOString() : undefined,
      createdAt: purchasedAt,
      updatedAt: purchasedAt,
    }
  })
}

const createDemoStaples = (): Staple[] => {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo-staple-1',
      name: DEMO_STAPLE_NAME,
      category: 'beverages',
      unit: 'count',
      minQuantity: 6,
      buyQuantity: 12,
      dailyUse: 1,
      autoAdd: true,
      // The pantry count was last right when the latest 12 were bought
      countedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    },
  ]
}

// Demo recipes that use items from the demo inventory
const createDemoRecipes = (): Recipe[] => {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo-recipe-1',
      householdId: DEMO_HOUSEHOLD.id,
      name: 'Spinach & Egg Scramble',
      description: 'A quick and healthy breakfast using fresh spinach and eggs.',
      ingredients: [
        { name: 'Eggs', quantity: 3, unit: 'count', isOptional: false },
        { name: 'Spinach', quantity: 1, unit: 'cup', isOptional: false },
        { name: 'Cheddar Cheese', quantity: 0.25, unit: 'cup', preparation: 'shredded', isOptional: true },
        { name: 'Olive Oil', quantity: 1, unit: 'tbsp', isOptional: false },
      ],
      instructions: [
        'Heat olive oil in a non-stick skillet over medium heat.',
        'Add spinach and cook until wilted, about 2 minutes.',
        'Crack eggs into the pan and scramble with the spinach.',
        'Top with shredded cheddar cheese and serve.',
      ],
      prepTimeMinutes: 5,
      cookTimeMinutes: 8,
      servings: 2,
      difficulty: 'easy',
      cuisine: 'American',
      tags: ['breakfast', 'quick'],
      dietaryInfo: ['vegetarian'],
      isFavorite: true,
      timesCooked: 3,
      lastCookedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'user',
      createdBy: DEMO_USER.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-recipe-2',
      householdId: DEMO_HOUSEHOLD.id,
      name: 'Chicken Stir-Fry with Rice',
      description: 'Simple chicken stir-fry served over steamed rice.',
      ingredients: [
        { name: 'Chicken Thighs', quantity: 1, unit: 'lb', preparation: 'sliced', isOptional: false },
        { name: 'Rice', quantity: 1, unit: 'cup', isOptional: false },
        { name: 'Spinach', quantity: 2, unit: 'cup', isOptional: false },
        { name: 'Olive Oil', quantity: 2, unit: 'tbsp', isOptional: false },
        { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', isOptional: false },
      ],
      instructions: [
        'Cook rice according to package directions.',
        'Heat olive oil in a large skillet or wok over high heat.',
        'Add sliced chicken thighs and cook until browned, 5-6 minutes.',
        'Add spinach and soy sauce, stir-fry for 2 more minutes.',
        'Serve over steamed rice.',
      ],
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      servings: 3,
      difficulty: 'easy',
      cuisine: 'Asian',
      tags: ['dinner', 'stir-fry'],
      dietaryInfo: [],
      isFavorite: false,
      timesCooked: 1,
      source: 'user',
      createdBy: DEMO_USER.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-recipe-3',
      householdId: DEMO_HOUSEHOLD.id,
      name: 'Classic Spaghetti Bolognese',
      description: 'A hearty Italian classic with ground beef and pasta.',
      ingredients: [
        { name: 'Spaghetti Pasta', quantity: 1, unit: 'pack', isOptional: false },
        { name: 'Ground Beef', quantity: 1, unit: 'lb', isOptional: false },
        { name: 'Olive Oil', quantity: 1, unit: 'tbsp', isOptional: false },
        { name: 'Salsa', quantity: 0.5, unit: 'cup', preparation: 'as sauce base', isOptional: false, substitutes: ['Tomato Sauce', 'Marinara'] },
        { name: 'Cheddar Cheese', quantity: 0.25, unit: 'cup', preparation: 'grated', isOptional: true, substitutes: ['Parmesan'] },
      ],
      instructions: [
        'Cook spaghetti according to package directions, drain and set aside.',
        'Heat olive oil in a large pan over medium-high heat.',
        'Add ground beef and cook until browned, breaking it apart.',
        'Add salsa/tomato sauce and simmer for 10 minutes.',
        'Serve sauce over spaghetti, topped with cheese.',
      ],
      prepTimeMinutes: 5,
      cookTimeMinutes: 25,
      servings: 4,
      difficulty: 'easy',
      cuisine: 'Italian',
      tags: ['dinner', 'pasta', 'comfort food'],
      dietaryInfo: [],
      isFavorite: true,
      timesCooked: 5,
      lastCookedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'user',
      createdBy: DEMO_USER.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-recipe-4',
      householdId: DEMO_HOUSEHOLD.id,
      name: 'Greek Yogurt Banana Bowl',
      description: 'A creamy and nutritious yogurt bowl with fresh banana.',
      ingredients: [
        { name: 'Greek Yogurt', quantity: 1, unit: 'cup', isOptional: false },
        { name: 'Banana', quantity: 1, unit: 'count', preparation: 'sliced', isOptional: false },
        { name: 'Honey', quantity: 1, unit: 'tbsp', isOptional: true },
        { name: 'Granola', quantity: 0.25, unit: 'cup', isOptional: true },
      ],
      instructions: [
        'Add Greek yogurt to a bowl.',
        'Top with sliced banana.',
        'Drizzle with honey and sprinkle granola if desired.',
      ],
      prepTimeMinutes: 3,
      cookTimeMinutes: 0,
      servings: 1,
      difficulty: 'easy',
      cuisine: 'American',
      tags: ['breakfast', 'snack', 'no-cook'],
      dietaryInfo: ['vegetarian'],
      isFavorite: false,
      timesCooked: 0,
      source: 'user',
      createdBy: DEMO_USER.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-recipe-5',
      householdId: DEMO_HOUSEHOLD.id,
      name: 'Beef Tacos',
      description: 'Quick beef tacos with all the fixings.',
      ingredients: [
        { name: 'Ground Beef', quantity: 1, unit: 'lb', isOptional: false },
        { name: 'Cheddar Cheese', quantity: 0.5, unit: 'cup', preparation: 'shredded', isOptional: false },
        { name: 'Salsa', quantity: 0.5, unit: 'cup', isOptional: false },
        { name: 'Taco Shells', quantity: 8, unit: 'count', isOptional: false },
        { name: 'Lettuce', quantity: 1, unit: 'cup', preparation: 'shredded', isOptional: true, substitutes: ['Spinach'] },
      ],
      instructions: [
        'Brown ground beef in a skillet over medium-high heat.',
        'Season with taco seasoning (salt, cumin, chili powder, garlic powder).',
        'Warm taco shells according to package directions.',
        'Fill shells with beef, cheese, salsa, and lettuce.',
      ],
      prepTimeMinutes: 5,
      cookTimeMinutes: 15,
      servings: 4,
      difficulty: 'easy',
      cuisine: 'Mexican',
      tags: ['dinner', 'quick'],
      dietaryInfo: [],
      isFavorite: false,
      timesCooked: 2,
      source: 'user',
      createdBy: DEMO_USER.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-recipe-6',
      householdId: DEMO_HOUSEHOLD.id,
      name: 'Pan-Fried Gyoza',
      description: 'Crispy pan-fried pork gyoza with dipping sauce.',
      ingredients: [
        { name: 'Pork Gyoza', quantity: 1, unit: 'pack', isOptional: false },
        { name: 'Olive Oil', quantity: 1, unit: 'tbsp', isOptional: false, substitutes: ['Sesame Oil'] },
        { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', isOptional: true },
        { name: 'Rice Vinegar', quantity: 1, unit: 'tbsp', isOptional: true },
      ],
      instructions: [
        'Heat olive oil in a non-stick skillet over medium-high heat.',
        'Place gyoza in a single layer and cook until bottoms are golden, about 3 minutes.',
        'Add 1/4 cup water to the pan and cover immediately.',
        'Steam for 5 minutes until water evaporates and gyoza are cooked through.',
        'Mix soy sauce and rice vinegar for dipping sauce.',
      ],
      prepTimeMinutes: 2,
      cookTimeMinutes: 10,
      servings: 2,
      difficulty: 'easy',
      cuisine: 'Japanese',
      tags: ['dinner', 'appetizer', 'quick'],
      dietaryInfo: [],
      isFavorite: false,
      timesCooked: 0,
      source: 'user',
      createdBy: DEMO_USER.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-recipe-7',
      householdId: DEMO_HOUSEHOLD.id,
      name: 'Cheesy Egg Toast',
      description: 'Comfort food classic — toasted bread with melted cheese and a fried egg.',
      ingredients: [
        { name: 'Bread', quantity: 2, unit: 'count', preparation: 'sliced', isOptional: false },
        { name: 'Eggs', quantity: 2, unit: 'count', isOptional: false },
        { name: 'Cheddar Cheese', quantity: 2, unit: 'count', preparation: 'slices', isOptional: false },
        { name: 'Olive Oil', quantity: 1, unit: 'tsp', isOptional: false, substitutes: ['Butter'] },
      ],
      instructions: [
        'Toast bread slices until golden.',
        'Fry eggs in olive oil to your liking.',
        'Place cheese on toast and top with fried eggs.',
        'Season with salt and pepper.',
      ],
      prepTimeMinutes: 2,
      cookTimeMinutes: 5,
      servings: 1,
      difficulty: 'easy',
      cuisine: 'American',
      tags: ['breakfast', 'quick', 'comfort food'],
      dietaryInfo: ['vegetarian'],
      isFavorite: false,
      timesCooked: 0,
      source: 'user',
      createdBy: DEMO_USER.id,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

// Initial demo shopping list
const createDemoShoppingList = (): ShoppingListItem[] => [
  { id: 'shop-1', shoppingListId: 'demo-list', name: 'Avocados', quantity: 3, category: 'produce', isChecked: false, source: 'manual', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'shop-2', shoppingListId: 'demo-list', name: 'Tomatoes', category: 'produce', isChecked: false, source: 'manual', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'shop-3', shoppingListId: 'demo-list', name: 'Butter', quantity: 2, category: 'dairy', isChecked: true, source: 'manual', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'shop-4', shoppingListId: 'demo-list', name: 'Chicken Breast', quantity: 2, quantityUnit: 'lb', category: 'meat', isChecked: false, source: 'manual', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

// Demo meal plan around today, using the demo recipes
const createDemoMealPlan = (): MealPlanEntry[] => {
  const now = new Date().toISOString()
  const entries: Array<Pick<MealPlanEntry, 'slot' | 'recipeId' | 'servings' | 'status'> & { daysFromToday: number }> = [
    { daysFromToday: -1, slot: 'dinner', recipeId: 'demo-recipe-3', servings: 4, status: 'cooked' },
    { daysFromToday: 0, slot: 'dinner', recipeId: 'demo-recipe-2', servings: 3, status: 'planned' },
    { daysFromToday: 1, slot: 'breakfast', recipeId: 'demo-recipe-4', servings: 2, status: 'planned' },
    { daysFromToday: 2, slot: 'dinner', recipeId: 'demo-recipe-5', servings: 4, status: 'planned' },
  ]
  return entries.map(({ daysFromToday, ...entry }, index) => ({
    ...entry,
    id: `demo-meal-${index + 1}`,
    date: dateStringFromToday(daysFromToday),
    createdAt: now,
    updatedAt: now,
  }))
}

interface DemoState {
  isDemoMode: boolean
  inventory: FoodItem[]
  shoppingList: ShoppingListItem[]
  recipes: Recipe[]
  mealPlan: MealPlanEntry[]
  staples: Staple[]

  // Actions
  enableDemoMode: () => void
  disableDemoMode: () => void

  // Inventory actions
  addItem: (item: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>) => FoodItem
  updateItem: (id: string, updates: Partial<FoodItem>) => FoodItem | null
  deleteItem: (id: string) => void
  consumeItem: (id: string, quantityUsed: number) => FoodItem | null

  // Staple actions
  /** Adds a staple. If one with the same name exists, it is updated and returned instead. */
  addStaple: (data: Pick<Staple, 'name' | 'category' | 'unit' | 'minQuantity' | 'buyQuantity' | 'dailyUse' | 'autoAdd'>) => Staple
  updateStaple: (id: string, updates: Partial<Omit<Staple, 'id' | 'createdAt'>>) => void
  removeStaple: (id: string) => void
  /** Make the pantry rows for this product add up to exactly `count` */
  setStock: (name: string, count: number) => void
  /** Add to or take from the current estimate, e.g. -1 for "used one" */
  adjustStock: (name: string, delta: number) => void
  /** Put low staples on the shopping list. Safe to call often: it changes state only when needed. */
  syncStapleList: () => void

  // Shopping list actions
  addShoppingItem: (item: Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'>) => ShoppingListItem
  updateShoppingItem: (
    id: string,
    updates: Partial<Pick<ShoppingListItem, 'name' | 'quantity' | 'quantityUnit' | 'notes' | 'category' | 'store' | 'priority'>>
  ) => void
  toggleShoppingItem: (id: string) => void
  removeShoppingItem: (id: string) => void
  clearCheckedItems: () => ShoppingListItem[]

  // Recipe actions
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Recipe
  updateRecipe: (id: string, updates: Partial<Recipe>) => Recipe | null
  deleteRecipe: (id: string) => void
  toggleRecipeFavorite: (id: string) => void
  markRecipeCooked: (id: string) => void

  // Meal plan actions
  addMealPlanEntry: (entry: Omit<MealPlanEntry, 'id' | 'createdAt' | 'updatedAt'>) => MealPlanEntry
  updateMealPlanEntry: (id: string, updates: Partial<Omit<MealPlanEntry, 'id' | 'createdAt' | 'updatedAt'>>) => void
  removeMealPlanEntry: (id: string) => MealPlanEntry | null
}

// Validate and clean inventory data
function validateInventory(items: FoodItem[]): FoodItem[] {
  if (!Array.isArray(items)) return []

  // Filter out invalid items and deduplicate by id
  const seen = new Set<string>()
  return items.filter((item) => {
    // Must have required fields
    if (!item || !item.id || !item.name) return false

    // Deduplicate
    if (seen.has(item.id)) return false
    seen.add(item.id)

    // Validate category
    if (!item.category || !VALID_CATEGORIES.includes(item.category)) {
      item.category = 'other'
    }

    return true
  })
}

// ---------------------------------------------------------------------------
// Stock counts
//
// For a staple, the app estimates what is left: the amount in the pantry rows
// when they were last known to be right (`countedAt`), minus daily use since
// then. So the rows and `countedAt` always have to change together.
// ---------------------------------------------------------------------------

type StockState = Pick<DemoState, 'inventory' | 'staples'>

// The staples with one of them marked as counted now
function markCounted(staples: Staple[], stapleId: string, nowIso: string): Staple[] {
  return staples.map((staple) =>
    staple.id === stapleId ? { ...staple, countedAt: nowIso, updatedAt: nowIso } : staple
  )
}

// A pantry row for a product that has never had one
function createStockRow(name: string, count: number, unit: QuantityUnit, staple: Staple | undefined, now: Date): FoodItem {
  const nowIso = now.toISOString()
  const category = staple?.category ?? lookupFood(name)?.category ?? 'other'
  const storageLocation = getDefaultStorageLocation(name, category)
  const purchaseDate = toLocalDateString(now)
  const expirationDate = estimateExpirationDate(name, category, storageLocation, purchaseDate)

  return {
    id: createId('demo-item'),
    householdId: DEMO_HOUSEHOLD.id,
    name: staple?.name ?? name.trim(),
    category,
    quantity: count,
    quantityUnit: unit,
    originalQuantity: count,
    storageLocation,
    purchaseDate,
    expirationDate,
    expirationSource: 'calculated',
    freshnessScore: calculateFreshnessScore(purchaseDate, expirationDate),
    tags: [],
    addedBy: DEMO_USER.id,
    addedVia: 'manual',
    status: 'active',
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

// Make a product's pantry rows add up to `count`. A matching staple is marked as counted now.
function writeStockCount(state: StockState, name: string, count: number, now: Date): StockState {
  const staple = findStaple(name, state.staples)
  const key = productKey(name)
  const hasRows = state.inventory.some((item) => productKey(item.name) === key)
  const unit = staple || hasRows
    ? getStock(name, state.inventory, state.staples, now).unit
    : lookupFood(name)?.unit ?? 'count'

  let inventory = withStockCount(state.inventory, name, count, unit, now)
  // No row can hold the count, so this is the first one for the product
  if (inventory === null) {
    inventory = [...state.inventory, createStockRow(name, count, unit, staple, now)]
  }

  return {
    inventory,
    staples: staple ? markCounted(state.staples, staple.id, now.toISOString()) : state.staples,
  }
}

// For a staple, write the current estimate into the pantry rows and mark it as
// counted now. Every action that changes a staple's quantities does this first.
// Otherwise the old count, the time since it, and the new amount get mixed:
// 12 bought two weeks ago at 1 a day, plus 12 bought today, must give about
// 12 and not 24.
function settleStaple(state: StockState, name: string, now: Date): StockState {
  const stock = getStock(name, state.inventory, state.staples, now)
  if (!stock.staple) return state
  if (!stock.isEstimate) {
    return { inventory: state.inventory, staples: markCounted(state.staples, stock.staple.id, now.toISOString()) }
  }
  return writeStockCount(state, name, roundStockCount(stock.estimated, stock.unit), now)
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      isDemoMode: false,
      inventory: [],
      shoppingList: [],
      recipes: [],
      mealPlan: [],
      staples: [],

      enableDemoMode: () => {
        set({
          isDemoMode: true,
          inventory: [...createDemoInventory(), ...createDemoStapleHistory()],
          shoppingList: createDemoShoppingList(),
          recipes: createDemoRecipes(),
          mealPlan: createDemoMealPlan(),
          staples: createDemoStaples(),
        })
        // The demo staple is low, so it goes on the list right away
        get().syncStapleList()
      },

      disableDemoMode: () => {
        set({
          isDemoMode: false,
          inventory: [],
          shoppingList: [],
          recipes: [],
          mealPlan: [],
          staples: [],
        })
      },

      addItem: (itemData) => {
        const now = new Date()
        const nowIso = now.toISOString()
        const newItem: FoodItem = {
          ...itemData,
          id: createId('demo-item'),
          createdAt: nowIso,
          updatedAt: nowIso,
        }
        set((state) => {
          const staple = findStaple(newItem.name, state.staples)
          if (!staple) return { inventory: [...state.inventory, newItem] }

          // Settle what was left before adding the new purchase. Buying more
          // also ends any hold on putting the staple back on the list.
          const settled = settleStaple(state, newItem.name, now)
          return {
            inventory: [...settled.inventory, newItem],
            staples: settled.staples.map((s) =>
              s.id === staple.id ? { ...s, countedAt: nowIso, skippedAt: undefined, updatedAt: nowIso } : s
            ),
          }
        })
        return newItem
      },

      updateItem: (id, updates) => {
        const now = new Date()
        const nowIso = now.toISOString()
        let updatedItem: FoodItem | null = null
        set((state) => {
          const target = state.inventory.find((item) => item.id === id)
          if (!target) return state

          // A new quantity on a staple's row is a new count, so settle first.
          // Forms send the quantity even when it did not change; that is not a count.
          const changesQuantity = updates.quantity !== undefined && updates.quantity !== target.quantity
          const staple = changesQuantity ? findStaple(target.name, state.staples) : undefined
          const settled = staple ? settleStaple(state, target.name, now) : state

          const inventory = settled.inventory.map((item) => {
            if (item.id !== id) return item
            const next: FoodItem = { ...item, ...updates, updatedAt: nowIso }
            // Settling can mark this row used up. A quantity above 0 puts it back in stock.
            if (staple && target.status === 'active' && updates.status === undefined && next.quantity > 0) {
              next.status = 'active'
              next.consumedAt = undefined
            }
            updatedItem = next
            return next
          })

          return staple
            ? { inventory, staples: markCounted(settled.staples, staple.id, nowIso) }
            : { inventory }
        })
        return updatedItem
      },

      deleteItem: (id) => {
        set((state) => ({
          inventory: state.inventory.filter((item) => item.id !== id),
        }))
      },

      consumeItem: (id, quantityUsed) => {
        const now = new Date()
        const nowIso = now.toISOString()
        let updatedItem: FoodItem | null = null
        set((state) => {
          const target = state.inventory.find((item) => item.id === id)
          if (!target) return state

          // For a staple, settle the estimate first, then take the amount used from what is left
          const staple = findStaple(target.name, state.staples)
          const settled = staple ? settleStaple(state, target.name, now) : state

          const inventory = settled.inventory.map((item) => {
            if (item.id !== id) return item
            const newQuantity = Math.max(0, roundQuantity(item.quantity - quantityUsed))
            const next: FoodItem = {
              ...item,
              quantity: newQuantity,
              status: newQuantity === 0 ? 'consumed' : 'active',
              consumedAt: newQuantity === 0 ? nowIso : undefined,
              updatedAt: nowIso,
            }
            updatedItem = next
            return next
          })

          return staple
            ? { inventory, staples: markCounted(settled.staples, staple.id, nowIso) }
            : { inventory }
        })
        return updatedItem
      },

      addStaple: (data) => {
        const nowIso = new Date().toISOString()
        const existing = findStaple(data.name, get().staples)
        // Two staples with one name would both try to track the same pantry rows
        const staple: Staple = existing
          ? { ...existing, ...data, updatedAt: nowIso }
          : { ...data, id: createId('staple'), countedAt: nowIso, createdAt: nowIso, updatedAt: nowIso }
        set((state) => ({
          staples: existing
            ? state.staples.map((s) => (s.id === existing.id ? staple : s))
            : [...state.staples, staple],
        }))
        return staple
      },

      updateStaple: (id, updates) => {
        set((state) => ({
          staples: state.staples.map((staple) =>
            staple.id === id
              ? { ...staple, ...updates, updatedAt: new Date().toISOString() }
              : staple
          ),
        }))
      },

      removeStaple: (id) => {
        set((state) => {
          const staple = state.staples.find((s) => s.id === id)
          if (!staple) return state
          // Write the estimate into the pantry rows first. Once the staple is
          // gone the rows are the only count left, and without this they would
          // show the last count again (12, when the estimate said about 3).
          const settled = settleStaple(state, staple.name, new Date())
          return {
            inventory: settled.inventory,
            staples: settled.staples.filter((s) => s.id !== id),
          }
        })
      },

      setStock: (name, count) => {
        set((state) => writeStockCount(state, name, Math.max(0, count), new Date()))
      },

      adjustStock: (name, delta) => {
        const { inventory, staples } = get()
        const stock = getStock(name, inventory, staples)
        const base = roundStockCount(stock.estimated, stock.unit)
        get().setStock(name, Math.max(0, base + delta))
      },

      syncStapleList: () => {
        const { inventory, staples, shoppingList } = get()
        if (staples.length === 0) return

        const now = new Date()
        const nowIso = now.toISOString()
        const toAdd: ShoppingListItem[] = []
        const restocked = new Set<string>()

        for (const staple of staples) {
          const stock = getStock(staple.name, inventory, staples, now)
          // With two staples of one name only the first is tracked
          if (stock.staple?.id !== staple.id) continue

          if (stock.status === 'ok') {
            // Back in stock: the next time it runs low it can go on the list again
            if (staple.skippedAt) restocked.add(staple.id)
            continue
          }
          if (!staple.autoAdd || staple.skippedAt) continue
          if (isOnShoppingList(staple.name, [...shoppingList, ...toAdd], now)) continue

          toAdd.push({
            id: createId('shop'),
            shoppingListId: 'demo-list',
            name: staple.name,
            category: staple.category,
            quantity: staple.buyQuantity,
            quantityUnit: staple.unit,
            source: 'low_stock',
            isChecked: false,
            priority: 'normal',
            createdAt: nowIso,
            updatedAt: nowIso,
          })
        }

        // This runs from an effect that depends on this state, so only set when something changes
        if (toAdd.length === 0 && restocked.size === 0) return
        set((state) => ({
          shoppingList: toAdd.length > 0 ? [...state.shoppingList, ...toAdd] : state.shoppingList,
          staples: restocked.size > 0
            ? state.staples.map((staple) =>
                restocked.has(staple.id) ? { ...staple, skippedAt: undefined, updatedAt: nowIso } : staple
              )
            : state.staples,
        }))
      },

      addShoppingItem: (itemData) => {
        const now = new Date().toISOString()
        const newItem: ShoppingListItem = {
          ...itemData,
          id: createId('shop'),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          shoppingList: [...state.shoppingList, newItem],
        }))
        return newItem
      },

      updateShoppingItem: (id, updates) => {
        set((state) => ({
          shoppingList: state.shoppingList.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date().toISOString() }
              : item
          ),
        }))
      },

      toggleShoppingItem: (id) => {
        const nowIso = new Date().toISOString()
        set((state) => ({
          shoppingList: state.shoppingList.map((item) =>
            item.id === id
              ? { ...item, isChecked: !item.isChecked, checkedAt: item.isChecked ? undefined : nowIso, updatedAt: nowIso }
              : item
          ),
        }))
      },

      removeShoppingItem: (id) => {
        const now = new Date()
        const nowIso = now.toISOString()
        set((state) => {
          const removed = state.shoppingList.find((item) => item.id === id)
          const shoppingList = state.shoppingList.filter((item) => item.id !== id)
          if (!removed || removed.source !== 'low_stock' || removed.isChecked) return { shoppingList }

          // Taking a low staple off the list means "not now". Without this
          // note syncStapleList would put it straight back.
          const stock = getStock(removed.name, state.inventory, state.staples, now)
          const stapleId = stock.staple?.id
          if (!stapleId || stock.status === 'ok') return { shoppingList }
          return {
            shoppingList,
            staples: state.staples.map((staple) =>
              staple.id === stapleId ? { ...staple, skippedAt: nowIso, updatedAt: nowIso } : staple
            ),
          }
        })
      },

      clearCheckedItems: () => {
        const checkedItems = get().shoppingList.filter((item) => item.isChecked)
        set((state) => ({
          shoppingList: state.shoppingList.filter((item) => !item.isChecked),
        }))
        return checkedItems
      },

      addRecipe: (recipeData) => {
        const now = new Date().toISOString()
        const newRecipe: Recipe = {
          ...recipeData,
          id: createId('demo-recipe'),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          recipes: [...state.recipes, newRecipe],
        }))
        return newRecipe
      },

      updateRecipe: (id, updates) => {
        let updatedRecipe: Recipe | null = null
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            if (recipe.id === id) {
              updatedRecipe = { ...recipe, ...updates, updatedAt: new Date().toISOString() }
              return updatedRecipe
            }
            return recipe
          }),
        }))
        return updatedRecipe
      },

      deleteRecipe: (id) => {
        set((state) => ({
          recipes: state.recipes.filter((recipe) => recipe.id !== id),
          mealPlan: state.mealPlan.filter((entry) => entry.recipeId !== id),
        }))
      },

      toggleRecipeFavorite: (id) => {
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id
              ? { ...recipe, isFavorite: !recipe.isFavorite, updatedAt: new Date().toISOString() }
              : recipe
          ),
        }))
      },

      markRecipeCooked: (id) => {
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id
              ? {
                  ...recipe,
                  timesCooked: recipe.timesCooked + 1,
                  lastCookedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : recipe
          ),
        }))
      },

      addMealPlanEntry: (entryData) => {
        const now = new Date().toISOString()
        const newEntry: MealPlanEntry = {
          ...entryData,
          id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          mealPlan: [...state.mealPlan, newEntry],
        }))
        return newEntry
      },

      updateMealPlanEntry: (id, updates) => {
        set((state) => ({
          mealPlan: state.mealPlan.map((entry) =>
            entry.id === id
              ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
              : entry
          ),
        }))
      },

      removeMealPlanEntry: (id) => {
        const removed = get().mealPlan.find((entry) => entry.id === id) ?? null
        set((state) => ({
          mealPlan: state.mealPlan.filter((entry) => entry.id !== id),
        }))
        return removed
      },
    }),
    {
      name: 'pantry-demo-store',
      version: STORE_VERSION,
      migrate: (persistedState: unknown, version: number) => {
        // If version doesn't match, reset to fresh state
        if (version !== STORE_VERSION) {
          console.log('Store version mismatch, resetting data')
          return {
            isDemoMode: false,
            inventory: [],
            shoppingList: [],
            recipes: [],
            staples: [],
          } as Partial<DemoState> as DemoState
        }

        // Validate and clean existing data
        const state = persistedState as Partial<DemoState> | undefined
        if (state) {
          state.inventory = validateInventory(state.inventory || [])
        }

        return state as DemoState
      },
      // Custom merge to validate data on load
      merge: (persistedState: unknown, currentState: DemoState) => {
        if (!persistedState) return currentState
        const state = persistedState as Partial<DemoState>

        return {
          ...currentState,
          ...state,
          inventory: validateInventory(state.inventory || []),
          // Data saved before staples existed has no list of them
          staples: Array.isArray(state.staples) ? state.staples : [],
        }
      },
    }
  )
)
