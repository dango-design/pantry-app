// Re-export database types
export * from './database'

// Food Categories
export type FoodCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'bakery'
  | 'frozen'
  | 'pantry'
  | 'beverages'
  | 'condiments'
  | 'snacks'
  | 'prepared'
  | 'other'

// Storage Locations
export type StorageLocation =
  | 'refrigerator'
  | 'freezer'
  | 'pantry'
  | 'counter'
  | 'spice_rack'
  | string

// Quantity Units
export type QuantityUnit =
  | 'count'
  | 'oz'
  | 'lb'
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'gal'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'unit'
  | 'pack'
  | 'bunch'
  | 'dozen'

// Item Status
export type ItemStatus = 'active' | 'consumed' | 'expired' | 'discarded'

// Input Methods
export type AddedVia = 'photo' | 'receipt' | 'barcode' | 'manual' | 'voice'

// Expiration Source
export type ExpirationSource = 'scanned' | 'calculated' | 'manual'

/**
 * What a food does in a meal, as opposed to what it is (the category).
 * Labels and helpers are in src/utils/foodRoles.ts.
 * - main: protein or a ready meal
 * - base: rice, pasta, bread, tortillas, grains
 * - produce: vegetables and fruit
 * - breakfast: breakfast foods and dairy
 * - snack
 * - flavor: oils, spices, sauces, condiments, baking basics such as salt and sugar
 * - drink
 */
export type FoodRole = 'main' | 'base' | 'produce' | 'breakfast' | 'snack' | 'flavor' | 'drink'

/** 'guessed': the app chose the role and may choose again. 'manual': a person chose it, and no guess replaces it */
export type RoleSource = 'guessed' | 'manual'

// User
export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

// Household
export interface Household {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface HouseholdMember {
  id: string
  householdId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

// Food Item
export interface FoodItem {
  id: string
  householdId: string
  name: string
  category: FoodCategory
  subcategory?: string

  quantity: number
  quantityUnit: QuantityUnit
  originalQuantity: number

  storageLocation: StorageLocation
  purchaseDate: string
  expirationDate: string
  expirationSource: ExpirationSource
  freshnessScore: number

  barcode?: string
  /** The barcode as a 14-digit GTIN. Set only when the item was added by barcode; the allergy check uses it. */
  gtin?: string
  brand?: string
  productId?: string

  imageUrl?: string
  notes?: string
  tags: string[]

  addedBy: string
  addedVia: AddedVia

  status: ItemStatus
  consumedAt?: string

  /** Not set on items saved before roles existed. Read it with getRole(), which guesses when it is missing */
  role?: FoodRole
  roleSource?: RoleSource
  /**
   * Servings left in this item, when a person typed it. Not set means "estimate
   * it" (estimateServings). The store scales it when the quantity changes, so
   * using half of an item with 6 servings leaves 3.
   */
  servings?: number
  /**
   * ISO time a person last used, counted, adjusted or edited this item. Not set
   * on items saved before this field existed. Read it with getTouchedAt(),
   * which falls back to the purchase date.
   */
  touchedAt?: string

  createdAt: string
  updatedAt: string
}

export type FoodItemInsert = Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt' | 'freshnessScore'>
export type FoodItemUpdate = Partial<Omit<FoodItem, 'id' | 'createdAt' | 'householdId'>>

// A product the household wants to keep in stock, tracked across purchases
export interface Staple {
  id: string
  name: string            // matched to pantry and list items by name (isSameName rules)
  category: FoodCategory
  unit: QuantityUnit
  minQuantity: number     // "keep at least": at or below this it needs buying
  buyQuantity: number     // how many go on the shopping list
  dailyUse?: number       // the user's own guess, in `unit` per day
  autoAdd: boolean        // put it on the shopping list automatically when low
  countedAt: string       // ISO time the pantry quantities were last known to be right
  skippedAt?: string      // the user removed the auto-added list item; hold off until restocked
  role?: FoodRole         // set when a person picks a role for the product; getRole() guesses otherwise
  createdAt: string
  updatedAt: string
}

// Shopping List
export interface ShoppingList {
  id: string
  householdId: string
  name: string
  isDefault: boolean
  items: ShoppingListItem[]
  createdAt: string
  updatedAt: string
}

export interface ShoppingListItem {
  id: string
  shoppingListId: string
  name: string
  category?: FoodCategory
  quantity?: number
  quantityUnit?: QuantityUnit
  notes?: string

  source: 'manual' | 'low_stock' | 'expiring' | 'recipe' | 'pattern'
  sourceItemId?: string

  isChecked: boolean
  checkedBy?: string
  checkedAt?: string

  priority: 'low' | 'normal' | 'high'
  store?: string
  aisle?: string

  createdAt: string
  updatedAt: string
}

// Recipe
export interface Recipe {
  id: string
  householdId?: string
  name: string
  description?: string

  ingredients: RecipeIngredient[]
  instructions: string[]

  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  cuisine?: string
  tags: string[]
  dietaryInfo: DietaryRestriction[]

  imageUrl?: string
  sourceUrl?: string

  isFavorite: boolean
  timesCooked: number
  lastCookedAt?: string
  rating?: number
  notes?: string

  source: 'builtin' | 'imported' | 'user' | 'ai_generated'
  createdBy?: string

  createdAt: string
  updatedAt: string
}

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: QuantityUnit
  preparation?: string
  isOptional: boolean
  substitutes?: string[]
}

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'low_carb'
  | 'keto'
  | 'halal'
  | 'kosher'

// Meal Plan
export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export type MealPlanStatus = 'planned' | 'cooked' | 'skipped'

export interface MealPlanEntry {
  id: string
  date: string // local calendar date, yyyy-MM-dd
  slot: MealSlot
  recipeId: string
  servings: number
  status: MealPlanStatus
  createdAt: string
  updatedAt: string
}
