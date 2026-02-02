import type { Meta, StoryObj } from '@storybook/react-vite'
import { HomePage } from '@/pages/HomePage'
import { useDemoStore } from '@/stores/demoStore'
import { useEffect } from 'react'
import { addDays, subDays, format } from 'date-fns'
import type { FoodItem } from '@/types'

// Helper to create mock food items
const createMockItem = (overrides: Partial<FoodItem> = {}): FoodItem => ({
  id: `item-${Math.random().toString(36).substr(2, 9)}`,
  householdId: 'household-1',
  name: 'Test Item',
  category: 'produce',
  quantity: 5,
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
function StoreInitializer({ items }: { items: FoodItem[] }) {
  useEffect(() => {
    useDemoStore.setState({ inventory: items })
  }, [items])
  return null
}

const meta = {
  title: 'Pages/HomePage',
  component: HomePage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The main dashboard showing expiring items and storage locations.',
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
} satisfies Meta<typeof HomePage>

export default meta
type Story = StoryObj<typeof meta>

// Empty pantry state
export const EmptyPantry: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={[]} />
        <Story />
      </>
    ),
  ],
}

// Populated with various items across locations
const populatedItems: FoodItem[] = [
  createMockItem({ id: '1', name: 'Milk', category: 'dairy', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 5), 'yyyy-MM-dd') }),
  createMockItem({ id: '2', name: 'Eggs', category: 'dairy', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 14), 'yyyy-MM-dd') }),
  createMockItem({ id: '3', name: 'Chicken Breast', category: 'meat', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 3), 'yyyy-MM-dd') }),
  createMockItem({ id: '4', name: 'Frozen Pizza', category: 'frozen', storageLocation: 'freezer', expirationDate: format(addDays(new Date(), 60), 'yyyy-MM-dd') }),
  createMockItem({ id: '5', name: 'Ice Cream', category: 'frozen', storageLocation: 'freezer', expirationDate: format(addDays(new Date(), 90), 'yyyy-MM-dd') }),
  createMockItem({ id: '6', name: 'Rice', category: 'pantry', storageLocation: 'pantry', expirationDate: format(addDays(new Date(), 365), 'yyyy-MM-dd') }),
  createMockItem({ id: '7', name: 'Pasta', category: 'pantry', storageLocation: 'pantry', expirationDate: format(addDays(new Date(), 300), 'yyyy-MM-dd') }),
  createMockItem({ id: '8', name: 'Bananas', category: 'produce', storageLocation: 'counter', expirationDate: format(addDays(new Date(), 4), 'yyyy-MM-dd') }),
]

export const Populated: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={populatedItems} />
        <Story />
      </>
    ),
  ],
}

// With expiring items (warning state)
const expiringItems: FoodItem[] = [
  createMockItem({ id: '1', name: 'Milk', category: 'dairy', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'), freshnessScore: 20 }),
  createMockItem({ id: '2', name: 'Yogurt', category: 'dairy', storageLocation: 'refrigerator', expirationDate: format(new Date(), 'yyyy-MM-dd'), freshnessScore: 10 }),
  createMockItem({ id: '3', name: 'Chicken Breast', category: 'meat', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'), freshnessScore: 30 }),
  createMockItem({ id: '4', name: 'Spinach', category: 'produce', storageLocation: 'refrigerator', expirationDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'), freshnessScore: 0 }),
  createMockItem({ id: '5', name: 'Bread', category: 'bakery', storageLocation: 'counter', expirationDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'), freshnessScore: 40 }),
  createMockItem({ id: '6', name: 'Rice', category: 'pantry', storageLocation: 'pantry', expirationDate: format(addDays(new Date(), 365), 'yyyy-MM-dd') }),
]

export const WithExpiringItems: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={expiringItems} />
        <Story />
      </>
    ),
  ],
}

// Many expiring items (overflow state)
const manyExpiringItems: FoodItem[] = [
  createMockItem({ id: '1', name: 'Milk', category: 'dairy', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 1), 'yyyy-MM-dd') }),
  createMockItem({ id: '2', name: 'Yogurt', category: 'dairy', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd') }),
  createMockItem({ id: '3', name: 'Cheese', category: 'dairy', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 3), 'yyyy-MM-dd') }),
  createMockItem({ id: '4', name: 'Chicken', category: 'meat', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd') }),
  createMockItem({ id: '5', name: 'Salmon', category: 'seafood', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 1), 'yyyy-MM-dd') }),
  createMockItem({ id: '6', name: 'Spinach', category: 'produce', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd') }),
  createMockItem({ id: '7', name: 'Lettuce', category: 'produce', storageLocation: 'refrigerator', expirationDate: format(addDays(new Date(), 3), 'yyyy-MM-dd') }),
  createMockItem({ id: '8', name: 'Bread', category: 'bakery', storageLocation: 'counter', expirationDate: format(addDays(new Date(), 1), 'yyyy-MM-dd') }),
]

export const ManyExpiringItems: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={manyExpiringItems} />
        <Story />
      </>
    ),
  ],
}
