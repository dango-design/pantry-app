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
  brand?: string
  productId?: string

  imageUrl?: string
  notes?: string
  tags: string[]

  addedBy: string
  addedVia: AddedVia

  status: ItemStatus
  consumedAt?: string

  createdAt: string
  updatedAt: string
}

export type FoodItemInsert = Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt' | 'freshnessScore'>
export type FoodItemUpdate = Partial<Omit<FoodItem, 'id' | 'createdAt' | 'householdId'>>

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
