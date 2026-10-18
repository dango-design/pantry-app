import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FoodItem, ShoppingListItem, Household, Recipe, FoodCategory, StorageLocation, QuantityUnit, MealPlanEntry } from '@/types'
import { dateStringFromToday, toLocalDateString } from '@/utils/dates'
import { calculateFreshnessScore } from '@/utils/freshness'
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

  // Actions
  enableDemoMode: () => void
  disableDemoMode: () => void

  // Inventory actions
  addItem: (item: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>) => FoodItem
  updateItem: (id: string, updates: Partial<FoodItem>) => FoodItem | null
  deleteItem: (id: string) => void
  consumeItem: (id: string, quantityUsed: number) => FoodItem | null

  // Shopping list actions
  addShoppingItem: (item: Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'>) => ShoppingListItem
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

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      isDemoMode: false,
      inventory: [],
      shoppingList: [],
      recipes: [],
      mealPlan: [],

      enableDemoMode: () => {
        set({
          isDemoMode: true,
          inventory: createDemoInventory(),
          shoppingList: createDemoShoppingList(),
          recipes: createDemoRecipes(),
          mealPlan: createDemoMealPlan(),
        })
      },

      disableDemoMode: () => {
        set({
          isDemoMode: false,
          inventory: [],
          shoppingList: [],
          recipes: [],
          mealPlan: [],
        })
      },

      addItem: (itemData) => {
        const now = new Date().toISOString()
        const newItem: FoodItem = {
          ...itemData,
          id: createId('demo-item'),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          inventory: [...state.inventory, newItem],
        }))
        return newItem
      },

      updateItem: (id, updates) => {
        let updatedItem: FoodItem | null = null
        set((state) => ({
          inventory: state.inventory.map((item) => {
            if (item.id === id) {
              updatedItem = { ...item, ...updates, updatedAt: new Date().toISOString() }
              return updatedItem
            }
            return item
          }),
        }))
        return updatedItem
      },

      deleteItem: (id) => {
        set((state) => ({
          inventory: state.inventory.filter((item) => item.id !== id),
        }))
      },

      consumeItem: (id, quantityUsed) => {
        let updatedItem: FoodItem | null = null
        set((state) => ({
          inventory: state.inventory.map((item) => {
            if (item.id === id) {
              const newQuantity = Math.max(0, roundQuantity(item.quantity - quantityUsed))
              updatedItem = {
                ...item,
                quantity: newQuantity,
                status: newQuantity === 0 ? 'consumed' : 'active',
                consumedAt: newQuantity === 0 ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString(),
              }
              return updatedItem
            }
            return item
          }),
        }))
        return updatedItem
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

      toggleShoppingItem: (id) => {
        set((state) => ({
          shoppingList: state.shoppingList.map((item) =>
            item.id === id
              ? { ...item, isChecked: !item.isChecked, updatedAt: new Date().toISOString() }
              : item
          ),
        }))
      },

      removeShoppingItem: (id) => {
        set((state) => ({
          shoppingList: state.shoppingList.filter((item) => item.id !== id),
        }))
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
      migrate: (persistedState, version) => {
        // If version doesn't match, reset to fresh state
        if (version !== STORE_VERSION) {
          console.log('Store version mismatch, resetting data')
          return {
            isDemoMode: false,
            inventory: [],
            shoppingList: [],
            recipes: [],
          } as Partial<DemoState> as DemoState
        }

        // Validate and clean existing data
        const state = persistedState as DemoState
        if (state) {
          state.inventory = validateInventory(state.inventory || [])
        }

        return state
      },
      // Custom merge to validate data on load
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState
        const state = persistedState as Partial<DemoState>

        return {
          ...currentState,
          ...state,
          inventory: validateInventory(state.inventory || []),
        }
      },
    }
  )
)
