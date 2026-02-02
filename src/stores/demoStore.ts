import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FoodItem, ShoppingListItem, Household, FoodCategory, StorageLocation, QuantityUnit } from '@/types'

// Store version - increment this when schema changes to clear old data
const STORE_VERSION = 2

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

    const totalDays = Math.ceil((expirationDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const freshnessScore = Math.max(0, Math.min(100, Math.round((daysRemaining / totalDays) * 100)))

    return {
      id: `demo-item-${index + 1}`,
      householdId: DEMO_HOUSEHOLD.id,
      name: item.name!,
      category: item.category as FoodCategory,
      quantity: item.quantity!,
      quantityUnit: item.quantityUnit!,
      originalQuantity: item.quantity!,
      storageLocation: item.storageLocation as StorageLocation,
      purchaseDate: purchaseDate.toISOString().split('T')[0],
      expirationDate: expirationDate.toISOString().split('T')[0],
      expirationSource: 'calculated' as const,
      freshnessScore,
      tags: [],
      addedBy: DEMO_USER.id,
      addedVia: 'manual' as const,
      status: 'active' as const,
      createdAt: purchaseDate.toISOString(),
      updatedAt: purchaseDate.toISOString(),
    }
  })
}

// Initial demo shopping list
const createDemoShoppingList = (): ShoppingListItem[] => [
  { id: 'shop-1', shoppingListId: 'demo-list', name: 'Avocados', quantity: 3, category: 'produce', isChecked: false, source: 'manual', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'shop-2', shoppingListId: 'demo-list', name: 'Tomatoes', category: 'produce', isChecked: false, source: 'manual', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'shop-3', shoppingListId: 'demo-list', name: 'Butter', quantity: 2, category: 'dairy', isChecked: true, source: 'manual', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'shop-4', shoppingListId: 'demo-list', name: 'Chicken Breast', quantity: 2, quantityUnit: 'lb', category: 'meat', isChecked: false, source: 'manual', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

interface DemoState {
  isDemoMode: boolean
  inventory: FoodItem[]
  shoppingList: ShoppingListItem[]

  // Actions
  enableDemoMode: () => void
  disableDemoMode: () => void

  // Inventory actions
  addItem: (item: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>) => FoodItem
  updateItem: (id: string, updates: Partial<FoodItem>) => FoodItem | null
  deleteItem: (id: string) => void
  useItem: (id: string, quantityUsed: number) => FoodItem | null

  // Shopping list actions
  addShoppingItem: (item: Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'>) => ShoppingListItem
  toggleShoppingItem: (id: string) => void
  removeShoppingItem: (id: string) => void
  clearCheckedItems: () => ShoppingListItem[]
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

      enableDemoMode: () => {
        set({
          isDemoMode: true,
          inventory: createDemoInventory(),
          shoppingList: createDemoShoppingList(),
        })
      },

      disableDemoMode: () => {
        set({
          isDemoMode: false,
          inventory: [],
          shoppingList: [],
        })
      },

      addItem: (itemData) => {
        const now = new Date().toISOString()
        const newItem: FoodItem = {
          ...itemData,
          id: `demo-item-${Date.now()}`,
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

      useItem: (id, quantityUsed) => {
        let updatedItem: FoodItem | null = null
        set((state) => ({
          inventory: state.inventory.map((item) => {
            if (item.id === id) {
              const newQuantity = Math.max(0, item.quantity - quantityUsed)
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
          id: `shop-${Date.now()}`,
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
    }),
    {
      name: 'pantry-demo-store',
      version: STORE_VERSION,
      migrate: (persistedState: any, version: number) => {
        // If version doesn't match, reset to fresh state
        if (version !== STORE_VERSION) {
          console.log('Store version mismatch, resetting data')
          return {
            isDemoMode: false,
            inventory: [],
            shoppingList: [],
          }
        }

        // Validate and clean existing data
        if (persistedState) {
          persistedState.inventory = validateInventory(persistedState.inventory || [])
        }

        return persistedState
      },
      // Custom merge to validate data on load
      merge: (persistedState: any, currentState: DemoState) => {
        if (!persistedState) return currentState

        return {
          ...currentState,
          ...persistedState,
          inventory: validateInventory(persistedState.inventory || []),
        }
      },
    }
  )
)
