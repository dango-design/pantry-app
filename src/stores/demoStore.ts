import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FoodItem, FoodRole, ShoppingListItem, Household, Recipe, FoodCategory, StorageLocation, QuantityUnit, MealPlanEntry, Staple } from '@/types'
import { dateStringFromToday, toLocalDateString } from '@/utils/dates'
import { estimateExpirationDate, getDefaultStorageLocation, lookupFood } from '@/utils/foodDatabase'
import { calculateFreshnessScore } from '@/utils/freshness'
import { clampHouseholdSize, DEFAULT_HOUSEHOLD_SIZE, guessRole, isFoodRole } from '@/utils/foodRoles'
import { roleForNewItem } from '@/utils/itemDefaults'
import { findStaple, getProductMemory, getStock, isOnShoppingList, productKey, roundStockCount, withStockCount } from '@/utils/stock'
import { roundQuantity } from '@/utils/units'

// Store version. Increment it when the saved data changes shape, and add a
// step to `migrate` below so saved data keeps working.
// 5: items gained role, roleSource, servings and touchedAt (all optional);
//    the store gained householdSize.
const STORE_VERSION = 5

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

// One demo product. Every product gets a role. A product with `staple` is
// also a staple: the household keeps it in stock and says how fast it goes.
interface DemoItemConfig {
  name: string
  category: FoodCategory
  role: FoodRole
  quantity: number
  quantityUnit: QuantityUnit
  storageLocation: StorageLocation
  /** Negative for a product that has already expired */
  daysUntilExpiry: number
  /** Default: 0 to 6 days ago, spread by position in the list */
  boughtDaysAgo?: number
  /** Default: the purchase time. Set for products nobody has used in a while */
  touchedDaysAgo?: number
  /** Used up: kept as a consumed row, so a staple shows as out */
  usedUp?: boolean
  staple?: Pick<Staple, 'minQuantity' | 'buyQuantity' | 'dailyUse'>
}

// A household of three that cooks most nights: about 65 products. About 20
// are oils, spices and sauces, about 20 are staples (four low, milk out), a
// handful are expired or close, and four have not been touched in 3+ weeks.
const DEMO_PANTRY: DemoItemConfig[] = [
  // Mains
  { name: 'Chicken Thighs', category: 'meat', role: 'main', quantity: 1.34, quantityUnit: 'lb', storageLocation: 'refrigerator', daysUntilExpiry: -1, boughtDaysAgo: 4 },
  { name: 'Ground Beef', category: 'meat', role: 'main', quantity: 1, quantityUnit: 'lb', storageLocation: 'freezer', daysUntilExpiry: 110, boughtDaysAgo: 10 },
  { name: 'Chicken Breast', category: 'meat', role: 'main', quantity: 2, quantityUnit: 'lb', storageLocation: 'freezer', daysUntilExpiry: 250, boughtDaysAgo: 12 },
  { name: 'Salmon Fillets', category: 'seafood', role: 'main', quantity: 0.75, quantityUnit: 'lb', storageLocation: 'refrigerator', daysUntilExpiry: 1, boughtDaysAgo: 1 },
  { name: 'Pork Gyoza', category: 'frozen', role: 'main', quantity: 1, quantityUnit: 'pack', storageLocation: 'freezer', daysUntilExpiry: 80, boughtDaysAgo: 9 },
  { name: 'Frozen Pizza', category: 'frozen', role: 'main', quantity: 2, quantityUnit: 'count', storageLocation: 'freezer', daysUntilExpiry: 150 },
  { name: 'Eggs', category: 'dairy', role: 'main', quantity: 4, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 18, staple: { minQuantity: 6, buyQuantity: 12, dailyUse: 1.5 } },
  { name: 'Firm Tofu', category: 'produce', role: 'main', quantity: 1, quantityUnit: 'pack', storageLocation: 'refrigerator', daysUntilExpiry: 20 },
  { name: 'Black Beans', category: 'pantry', role: 'main', quantity: 3, quantityUnit: 'count', storageLocation: 'pantry', daysUntilExpiry: 700, boughtDaysAgo: 20, touchedDaysAgo: 5, staple: { minQuantity: 2, buyQuantity: 4, dailyUse: 0.2 } },
  { name: 'Canned Tuna', category: 'pantry', role: 'main', quantity: 2, quantityUnit: 'count', storageLocation: 'pantry', daysUntilExpiry: 900, boughtDaysAgo: 18, touchedDaysAgo: 8 },
  { name: 'Lentil Soup', category: 'pantry', role: 'main', quantity: 2, quantityUnit: 'count', storageLocation: 'pantry', daysUntilExpiry: 600, boughtDaysAgo: 14, touchedDaysAgo: 3 },

  // Bases
  { name: 'Spaghetti Pasta', category: 'pantry', role: 'base', quantity: 2, quantityUnit: 'pack', storageLocation: 'pantry', daysUntilExpiry: 700, boughtDaysAgo: 15, touchedDaysAgo: 1, staple: { minQuantity: 1, buyQuantity: 2, dailyUse: 0.1 } },
  { name: 'Rice', category: 'pantry', role: 'base', quantity: 2, quantityUnit: 'lb', storageLocation: 'pantry', daysUntilExpiry: 340, boughtDaysAgo: 25, touchedDaysAgo: 2, staple: { minQuantity: 1, buyQuantity: 5, dailyUse: 0.1 } },
  { name: 'Bread', category: 'bakery', role: 'base', quantity: 1, quantityUnit: 'unit', storageLocation: 'counter', daysUntilExpiry: 0, boughtDaysAgo: 4, touchedDaysAgo: 0, staple: { minQuantity: 0, buyQuantity: 1, dailyUse: 0.25 } },
  { name: 'Flour Tortillas', category: 'bakery', role: 'base', quantity: 8, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 12, staple: { minQuantity: 4, buyQuantity: 10, dailyUse: 1 } },
  { name: 'Quinoa', category: 'pantry', role: 'base', quantity: 1, quantityUnit: 'lb', storageLocation: 'pantry', daysUntilExpiry: 300, boughtDaysAgo: 35 },
  { name: 'Frozen French Fries', category: 'frozen', role: 'base', quantity: 1, quantityUnit: 'pack', storageLocation: 'freezer', daysUntilExpiry: 200, boughtDaysAgo: 16, touchedDaysAgo: 6 },

  // Veg & fruit
  { name: 'Banana', category: 'produce', role: 'produce', quantity: 5, quantityUnit: 'count', storageLocation: 'counter', daysUntilExpiry: 4, boughtDaysAgo: 2, staple: { minQuantity: 2, buyQuantity: 6, dailyUse: 1 } },
  { name: 'Apples', category: 'produce', role: 'produce', quantity: 5, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 14, staple: { minQuantity: 2, buyQuantity: 6, dailyUse: 0.7 } },
  { name: 'Spinach', category: 'produce', role: 'produce', quantity: 1, quantityUnit: 'pack', storageLocation: 'refrigerator', daysUntilExpiry: -1, boughtDaysAgo: 6 },
  { name: 'Onions', category: 'produce', role: 'produce', quantity: 1, quantityUnit: 'count', storageLocation: 'pantry', daysUntilExpiry: 25, boughtDaysAgo: 10, touchedDaysAgo: 1, staple: { minQuantity: 2, buyQuantity: 3, dailyUse: 0.3 } },
  { name: 'Carrots', category: 'produce', role: 'produce', quantity: 1, quantityUnit: 'lb', storageLocation: 'refrigerator', daysUntilExpiry: 18 },
  { name: 'Broccoli', category: 'produce', role: 'produce', quantity: 1, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 4 },
  { name: 'Bell Peppers', category: 'produce', role: 'produce', quantity: 3, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 8 },
  { name: 'Avocados', category: 'produce', role: 'produce', quantity: 2, quantityUnit: 'count', storageLocation: 'counter', daysUntilExpiry: 2, boughtDaysAgo: 3 },
  { name: 'Tomatoes', category: 'produce', role: 'produce', quantity: 4, quantityUnit: 'count', storageLocation: 'counter', daysUntilExpiry: 4 },
  { name: 'Frozen Peas', category: 'frozen', role: 'produce', quantity: 0.5, quantityUnit: 'lb', storageLocation: 'freezer', daysUntilExpiry: 200, boughtDaysAgo: 42 },
  { name: 'Frozen Blueberries', category: 'frozen', role: 'produce', quantity: 1, quantityUnit: 'pack', storageLocation: 'freezer', daysUntilExpiry: 220, boughtDaysAgo: 20, touchedDaysAgo: 4 },

  // Breakfast & dairy
  { name: 'Greek Yogurt', category: 'dairy', role: 'breakfast', quantity: 4, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 5, staple: { minQuantity: 2, buyQuantity: 6, dailyUse: 0.5 } },
  { name: 'Almond Milk', category: 'dairy', role: 'breakfast', quantity: 2, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 7, staple: { minQuantity: 1, buyQuantity: 2, dailyUse: 0.15 } },
  { name: 'Milk', category: 'dairy', role: 'breakfast', quantity: 1, quantityUnit: 'gal', storageLocation: 'refrigerator', daysUntilExpiry: 3, boughtDaysAgo: 8, touchedDaysAgo: 1, usedUp: true, staple: { minQuantity: 0.5, buyQuantity: 1, dailyUse: 0.15 } },
  { name: 'Cheddar Cheese', category: 'dairy', role: 'breakfast', quantity: 8, quantityUnit: 'oz', storageLocation: 'refrigerator', daysUntilExpiry: 30, boughtDaysAgo: 9, staple: { minQuantity: 4, buyQuantity: 8, dailyUse: 0.5 } },
  { name: 'Cream Cheese', category: 'dairy', role: 'breakfast', quantity: 1, quantityUnit: 'pack', storageLocation: 'refrigerator', daysUntilExpiry: 21 },
  { name: 'Old-Fashioned Oats', category: 'pantry', role: 'breakfast', quantity: 2, quantityUnit: 'lb', storageLocation: 'pantry', daysUntilExpiry: 280, boughtDaysAgo: 30, touchedDaysAgo: 2 },
  { name: 'Granola', category: 'pantry', role: 'breakfast', quantity: 1, quantityUnit: 'pack', storageLocation: 'pantry', daysUntilExpiry: 120, boughtDaysAgo: 11, touchedDaysAgo: 1 },
  { name: 'Peanut Butter', category: 'pantry', role: 'breakfast', quantity: 1, quantityUnit: 'unit', storageLocation: 'pantry', daysUntilExpiry: 200, boughtDaysAgo: 24, touchedDaysAgo: 1, staple: { minQuantity: 0, buyQuantity: 1, dailyUse: 0.04 } },
  { name: 'Maple Syrup', category: 'pantry', role: 'breakfast', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 300, boughtDaysAgo: 60, touchedDaysAgo: 6 },

  // Snacks
  { name: 'Tortilla Chips', category: 'snacks', role: 'snack', quantity: 1, quantityUnit: 'pack', storageLocation: 'pantry', daysUntilExpiry: 60 },
  { name: 'Rice Crackers', category: 'snacks', role: 'snack', quantity: 1, quantityUnit: 'pack', storageLocation: 'pantry', daysUntilExpiry: 90, boughtDaysAgo: 23 },
  { name: 'Dark Chocolate', category: 'snacks', role: 'snack', quantity: 2, quantityUnit: 'count', storageLocation: 'pantry', daysUntilExpiry: 240, boughtDaysAgo: 13, touchedDaysAgo: 2 },
  { name: 'Almonds', category: 'snacks', role: 'snack', quantity: 12, quantityUnit: 'oz', storageLocation: 'pantry', daysUntilExpiry: 180, boughtDaysAgo: 19, touchedDaysAgo: 3 },
  { name: 'Hummus', category: 'condiments', role: 'snack', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 3, boughtDaysAgo: 5 },

  // Drinks (BODYARMOR Lite, a staple with purchase history, is added separately)
  { name: 'Coffee', category: 'beverages', role: 'drink', quantity: 6, quantityUnit: 'oz', storageLocation: 'pantry', daysUntilExpiry: 150, boughtDaysAgo: 14, touchedDaysAgo: 0, staple: { minQuantity: 8, buyQuantity: 24, dailyUse: 1.2 } },
  { name: 'Sparkling Water', category: 'beverages', role: 'drink', quantity: 4, quantityUnit: 'count', storageLocation: 'pantry', daysUntilExpiry: 300, boughtDaysAgo: 8, touchedDaysAgo: 0, staple: { minQuantity: 6, buyQuantity: 12, dailyUse: 1 } },
  { name: 'Kombucha', category: 'beverages', role: 'drink', quantity: 3, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 7 },
  { name: 'Orange Juice', category: 'beverages', role: 'drink', quantity: 1, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 9 },

  // Oils, spices and sauces: bought weeks or months ago, used now and then
  { name: 'Olive Oil', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'pantry', daysUntilExpiry: 150, boughtDaysAgo: 40, touchedDaysAgo: 0, staple: { minQuantity: 0, buyQuantity: 1, dailyUse: 0.03 } },
  { name: 'Butter', category: 'dairy', role: 'flavor', quantity: 3, quantityUnit: 'count', storageLocation: 'refrigerator', daysUntilExpiry: 45, boughtDaysAgo: 12, touchedDaysAgo: 1, staple: { minQuantity: 2, buyQuantity: 4, dailyUse: 0.2 } },
  { name: 'Garlic', category: 'produce', role: 'flavor', quantity: 2, quantityUnit: 'count', storageLocation: 'pantry', daysUntilExpiry: 60, boughtDaysAgo: 10, touchedDaysAgo: 1, staple: { minQuantity: 1, buyQuantity: 3, dailyUse: 0.1 } },
  { name: 'Salt', category: 'pantry', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'spice_rack', daysUntilExpiry: 1500, boughtDaysAgo: 120, touchedDaysAgo: 0, staple: { minQuantity: 0, buyQuantity: 1, dailyUse: 0.01 } },
  { name: 'Black Pepper', category: 'pantry', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'spice_rack', daysUntilExpiry: 900, boughtDaysAgo: 120, touchedDaysAgo: 0 },
  { name: 'Ground Cumin', category: 'pantry', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'spice_rack', daysUntilExpiry: 800, boughtDaysAgo: 90, touchedDaysAgo: 4 },
  { name: 'Smoked Paprika', category: 'pantry', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'spice_rack', daysUntilExpiry: 800, boughtDaysAgo: 90, touchedDaysAgo: 4 },
  { name: 'Garlic Powder', category: 'pantry', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'spice_rack', daysUntilExpiry: 900, boughtDaysAgo: 100, touchedDaysAgo: 9 },
  { name: 'Dried Oregano', category: 'pantry', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'spice_rack', daysUntilExpiry: 700, boughtDaysAgo: 100, touchedDaysAgo: 12 },
  { name: 'Ground Cinnamon', category: 'pantry', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'spice_rack', daysUntilExpiry: 900, boughtDaysAgo: 100, touchedDaysAgo: 2 },
  { name: 'Soy Sauce', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'pantry', daysUntilExpiry: 600, boughtDaysAgo: 50, touchedDaysAgo: 0 },
  { name: 'Salsa', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 25, boughtDaysAgo: 5 },
  { name: 'Ketchup', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 150, boughtDaysAgo: 45, touchedDaysAgo: 3 },
  { name: 'Mayonnaise', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 60, boughtDaysAgo: 30, touchedDaysAgo: 5 },
  { name: 'Dijon Mustard', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 300, boughtDaysAgo: 60, touchedDaysAgo: 10 },
  { name: 'Sriracha', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 400, boughtDaysAgo: 70, touchedDaysAgo: 2 },
  { name: 'Sesame Oil', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'pantry', daysUntilExpiry: 300, boughtDaysAgo: 80, touchedDaysAgo: 7 },
  { name: 'Worcestershire Sauce', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'pantry', daysUntilExpiry: 700, boughtDaysAgo: 150, touchedDaysAgo: 18 },
  { name: 'Basil Pesto', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'refrigerator', daysUntilExpiry: 12, boughtDaysAgo: 28 },
  { name: 'Marinara Sauce', category: 'condiments', role: 'flavor', quantity: 1, quantityUnit: 'unit', storageLocation: 'pantry', daysUntilExpiry: 400, boughtDaysAgo: 20, touchedDaysAgo: 9 },
]

const DAY_MS = 24 * 60 * 60 * 1000

// Initial demo inventory: one row per product in DEMO_PANTRY
const createDemoInventory = (): FoodItem[] => {
  const now = Date.now()

  return DEMO_PANTRY.map((item, index) => {
    const boughtDaysAgo = item.boughtDaysAgo ?? index % 7
    const purchasedAt = new Date(now - boughtDaysAgo * DAY_MS)
    const touchedAt = new Date(now - (item.touchedDaysAgo ?? boughtDaysAgo) * DAY_MS)
    const purchaseDate = toLocalDateString(purchasedAt)
    const expirationDate = dateStringFromToday(item.daysUntilExpiry)

    return {
      id: `demo-item-${index + 1}`,
      householdId: DEMO_HOUSEHOLD.id,
      name: item.name,
      category: item.category,
      role: item.role,
      roleSource: 'guessed' as const,
      quantity: item.usedUp ? 0 : item.quantity,
      quantityUnit: item.quantityUnit,
      originalQuantity: item.quantity,
      storageLocation: item.storageLocation,
      purchaseDate,
      expirationDate,
      expirationSource: 'calculated' as const,
      freshnessScore: calculateFreshnessScore(purchaseDate, expirationDate),
      tags: [],
      addedBy: DEMO_USER.id,
      addedVia: 'manual' as const,
      status: item.usedUp ? 'consumed' as const : 'active' as const,
      consumedAt: item.usedUp ? touchedAt.toISOString() : undefined,
      touchedAt: touchedAt.toISOString(),
      createdAt: purchasedAt.toISOString(),
      updatedAt: touchedAt.toISOString(),
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
      role: 'drink' as const,
      roleSource: 'guessed' as const,
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
      touchedAt: usedUp ? new Date(Date.now() - usedUpDaysAgo * 24 * 60 * 60 * 1000).toISOString() : purchasedAt,
      createdAt: purchasedAt,
      updatedAt: purchasedAt,
    }
  })
}

const createDemoStaples = (): Staple[] => {
  const now = new Date().toISOString()
  const bodyarmor: Staple = {
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
  }
  // The other staples count as checked now, so their estimates start at the
  // amounts in DEMO_PANTRY and go down from tomorrow
  const others = DEMO_PANTRY.flatMap((item, index): Staple[] => {
    if (!item.staple) return []
    return [{
      id: `demo-staple-${index + 2}`,
      name: item.name,
      category: item.category,
      unit: item.quantityUnit,
      ...item.staple,
      autoAdd: true,
      countedAt: now,
      createdAt: now,
      updatedAt: now,
    }]
  })
  return [bodyarmor, ...others]
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
  /** "People eating at home". Kept when demo mode is turned on or off */
  householdSize: number

  // Actions
  enableDemoMode: () => void
  setHouseholdSize: (size: number) => void
  disableDemoMode: () => void

  // Inventory actions
  addItem: (item: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>) => FoodItem
  updateItem: (id: string, updates: Partial<FoodItem>) => FoodItem | null
  deleteItem: (id: string) => void
  consumeItem: (id: string, quantityUsed: number) => FoodItem | null
  /** A person picked a role for a product: every row with this name, and its staple, gets it. No later guess replaces it */
  setProductRole: (name: string, role: FoodRole) => void

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

// ---------------------------------------------------------------------------
// Touched rows
//
// Every action that changes a pantry row marks it touched now. A servings
// number a person typed covers the row's current amount, so it is scaled with
// the quantity: using half of 6 servings leaves 3.
// ---------------------------------------------------------------------------

/** The servings on `next`, scaled for its new quantity. Exported for tests */
export function scaleServings(next: FoodItem, prev: FoodItem): FoodItem {
  if (next.servings === undefined) return next
  if (next.quantity === prev.quantity && next.quantityUnit === prev.quantityUnit) return next
  // From nothing, or in another unit, the old number says nothing: go back to the estimate
  if (next.quantityUnit !== prev.quantityUnit || !(prev.quantity > 0)) return { ...next, servings: undefined }
  return { ...next, servings: Math.round(((next.servings * next.quantity) / prev.quantity) * 10) / 10 }
}

// What an update set by hand on one row, so touchChangedRows leaves it alone.
// Undo uses this to put back a row exactly as it was.
interface ExplicitFields {
  id: string
  servings: boolean
  touchedAt: boolean
}

// `after` with every row that differs from `before` marked touched at `nowIso`
function touchChangedRows(before: FoodItem[], after: FoodItem[], nowIso: string, explicit?: ExplicitFields): FoodItem[] {
  if (before === after) return after
  const old = new Map(before.map((item) => [item.id, item]))
  return after.map((item) => {
    const prev = old.get(item.id)
    if (prev === item) return item
    const set = explicit?.id === item.id ? explicit : undefined
    const touched = set?.touchedAt ? item : { ...item, touchedAt: nowIso }
    return prev && !set?.servings ? scaleServings(touched, prev) : touched
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
      staples: [],
      householdSize: DEFAULT_HOUSEHOLD_SIZE,

      setHouseholdSize: (size) => {
        set({ householdSize: clampHouseholdSize(size) })
      },

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
        const state = get()
        // Every way of adding an item comes through here, so this is where a
        // new item gets its role: the one passed in, one a person chose for
        // the product before, or a guess from the name and category
        const role = isFoodRole(itemData.role)
          ? { role: itemData.role, roleSource: itemData.roleSource ?? 'manual' as const }
          : roleForNewItem(itemData.name, itemData.category, getProductMemory(state.inventory, state.staples))
        const newItem: FoodItem = {
          ...itemData,
          ...role,
          id: createId('demo-item'),
          touchedAt: nowIso,
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
            inventory: [...touchChangedRows(state.inventory, settled.inventory, nowIso), newItem],
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

          const edited = settled.inventory.map((item) => {
            if (item.id !== id) return item
            const next: FoodItem = { ...item, ...updates, updatedAt: nowIso }
            // Settling can mark this row used up. A quantity above 0 puts it back in stock.
            if (staple && target.status === 'active' && updates.status === undefined && next.quantity > 0) {
              next.status = 'active'
              next.consumedAt = undefined
            }
            // A role passed in is a person's choice. A new name or category
            // gets a new guess, unless a person chose the role.
            if (updates.role !== undefined) {
              next.roleSource = updates.roleSource ?? 'manual'
            } else if ((next.name !== target.name || next.category !== target.category) && target.roleSource !== 'manual') {
              next.role = guessRole(next.name, next.category)
              next.roleSource = 'guessed'
            }
            return next
          })
          const inventory = touchChangedRows(state.inventory, edited, nowIso, {
            id,
            servings: 'servings' in updates,
            touchedAt: 'touchedAt' in updates,
          })
          updatedItem = inventory.find((item) => item.id === id) ?? null

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

          const used = settled.inventory.map((item) => {
            if (item.id !== id) return item
            const newQuantity = Math.max(0, roundQuantity(item.quantity - quantityUsed))
            return {
              ...item,
              quantity: newQuantity,
              status: newQuantity === 0 ? 'consumed' as const : 'active' as const,
              consumedAt: newQuantity === 0 ? nowIso : undefined,
              updatedAt: nowIso,
            }
          })
          const inventory = touchChangedRows(state.inventory, used, nowIso)
          updatedItem = inventory.find((item) => item.id === id) ?? null

          return staple
            ? { inventory, staples: markCounted(settled.staples, staple.id, nowIso) }
            : { inventory }
        })
        return updatedItem
      },

      setProductRole: (name, role) => {
        const nowIso = new Date().toISOString()
        const key = productKey(name)
        set((state) => ({
          inventory: state.inventory.map((item) =>
            productKey(item.name) === key
              ? { ...item, role, roleSource: 'manual', touchedAt: nowIso, updatedAt: nowIso }
              : item
          ),
          staples: state.staples.map((staple) =>
            productKey(staple.name) === key ? { ...staple, role, updatedAt: nowIso } : staple
          ),
        }))
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
          const now = new Date()
          const settled = settleStaple(state, staple.name, now)
          return {
            inventory: touchChangedRows(state.inventory, settled.inventory, now.toISOString()),
            staples: settled.staples.filter((s) => s.id !== id),
          }
        })
      },

      setStock: (name, count) => {
        set((state) => {
          const now = new Date()
          const written = writeStockCount(state, name, Math.max(0, count), now)
          return { ...written, inventory: touchChangedRows(state.inventory, written.inventory, now.toISOString()) }
        })
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
        // Version 4 data needs no change: the fields added in 5 are optional,
        // getRole() and getTouchedAt() fill them in when read, and `merge`
        // adds the household size. Anything older is reset.
        if (version < 4) {
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
          // Data saved before version 5 has no household size
          householdSize: clampHouseholdSize(state.householdSize ?? DEFAULT_HOUSEHOLD_SIZE),
        }
      },
    }
  )
)
