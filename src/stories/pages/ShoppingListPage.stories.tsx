import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShoppingListPage } from '@/pages/ShoppingListPage'
import { useDemoStore } from '@/stores/demoStore'
import { useEffect } from 'react'
import { addDays, subDays, format } from 'date-fns'
import type { FoodItem, ShoppingItem } from '@/types'

// Helper to create mock shopping items
const createShoppingItem = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: `shop-${Math.random().toString(36).substr(2, 9)}`,
  shoppingListId: 'demo-list',
  name: 'Test Item',
  category: 'other',
  quantity: 1,
  quantityUnit: 'count',
  isChecked: false,
  source: 'manual',
  priority: 'normal',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// Helper to create mock food items (for suggestions)
const createFoodItem = (overrides: Partial<FoodItem> = {}): FoodItem => ({
  id: `item-${Math.random().toString(36).substr(2, 9)}`,
  householdId: 'household-1',
  name: 'Test Item',
  category: 'produce',
  quantity: 1,
  quantityUnit: 'count',
  originalQuantity: 6,
  storageLocation: 'refrigerator',
  purchaseDate: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
  expirationDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  expirationSource: 'calculated',
  freshnessScore: 85,
  tags: [],
  addedBy: 'user-1',
  addedVia: 'manual',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// Store initializer component
function StoreInitializer({
  shoppingList = [],
  inventory = []
}: {
  shoppingList?: ShoppingItem[]
  inventory?: FoodItem[]
}) {
  useEffect(() => {
    useDemoStore.setState({ shoppingList, inventory })
  }, [shoppingList, inventory])
  return null
}

const meta = {
  title: 'Pages/ShoppingListPage',
  component: ShoppingListPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Shopping list with smart suggestions based on inventory.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ShoppingListPage>

export default meta
type Story = StoryObj<typeof meta>

// Empty shopping list, no suggestions
export const Empty: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer shoppingList={[]} inventory={[]} />
        <Story />
      </>
    ),
  ],
}

// With items in different categories
const populatedList: ShoppingItem[] = [
  createShoppingItem({ id: '1', name: 'Milk', category: 'dairy' }),
  createShoppingItem({ id: '2', name: 'Eggs', category: 'dairy' }),
  createShoppingItem({ id: '3', name: 'Bread', category: 'bakery' }),
  createShoppingItem({ id: '4', name: 'Apples', category: 'produce', quantity: 6 }),
  createShoppingItem({ id: '5', name: 'Bananas', category: 'produce', quantity: 5 }),
  createShoppingItem({ id: '6', name: 'Chicken Breast', category: 'meat', quantity: 2, quantityUnit: 'lb' }),
  createShoppingItem({ id: '7', name: 'Pasta', category: 'pantry' }),
]

export const WithItems: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer shoppingList={populatedList} inventory={[]} />
        <Story />
      </>
    ),
  ],
}

// With some checked items
const checkedList: ShoppingItem[] = [
  createShoppingItem({ id: '1', name: 'Milk', category: 'dairy', isChecked: true }),
  createShoppingItem({ id: '2', name: 'Eggs', category: 'dairy', isChecked: true }),
  createShoppingItem({ id: '3', name: 'Bread', category: 'bakery' }),
  createShoppingItem({ id: '4', name: 'Apples', category: 'produce', quantity: 6 }),
  createShoppingItem({ id: '5', name: 'Chicken Breast', category: 'meat', isChecked: true }),
  createShoppingItem({ id: '6', name: 'Pasta', category: 'pantry' }),
]

export const WithCheckedItems: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer shoppingList={checkedList} inventory={[]} />
        <Story />
      </>
    ),
  ],
}

// With smart suggestions from inventory
const inventoryForSuggestions: FoodItem[] = [
  // Low stock items (quantity < 2)
  createFoodItem({ id: '1', name: 'Milk', category: 'dairy', quantity: 1, expirationDate: format(addDays(new Date(), 5), 'yyyy-MM-dd') }),
  createFoodItem({ id: '2', name: 'Butter', category: 'dairy', quantity: 0.5, expirationDate: format(addDays(new Date(), 10), 'yyyy-MM-dd') }),
  // Expiring soon items (within 3 days)
  createFoodItem({ id: '3', name: 'Yogurt', category: 'dairy', quantity: 3, expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd') }),
  createFoodItem({ id: '4', name: 'Spinach', category: 'produce', quantity: 1, expirationDate: format(addDays(new Date(), 1), 'yyyy-MM-dd') }),
  // Normal items (won't show as suggestions)
  createFoodItem({ id: '5', name: 'Rice', category: 'pantry', quantity: 5, expirationDate: format(addDays(new Date(), 365), 'yyyy-MM-dd') }),
]

export const WithSuggestions: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer shoppingList={[]} inventory={inventoryForSuggestions} />
        <Story />
      </>
    ),
  ],
}

// Mixed: items + suggestions
const mixedList: ShoppingItem[] = [
  createShoppingItem({ id: '1', name: 'Bread', category: 'bakery' }),
  createShoppingItem({ id: '2', name: 'Cheese', category: 'dairy' }),
]

export const MixedItemsAndSuggestions: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer shoppingList={mixedList} inventory={inventoryForSuggestions} />
        <Story />
      </>
    ),
  ],
}
