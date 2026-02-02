import type { Meta, StoryObj } from '@storybook/react-vite'
import { AddItemPage } from '@/pages/AddItemPage'
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
function StoreInitializer({ items = [] }: { items?: FoodItem[] }) {
  useEffect(() => {
    useDemoStore.setState({ inventory: items })
  }, [items])
  return null
}

const meta = {
  title: 'Pages/AddItemPage',
  component: AddItemPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Add new food items via manual entry, photo, barcode, or receipt scanning.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md mx-auto bg-gray-100 min-h-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddItemPage>

export default meta
type Story = StoryObj<typeof meta>

// Default empty form
export const Default: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={[]} />
        <Story />
      </>
    ),
  ],
}

// With personalized quick-add chips from history
const frequentItems: FoodItem[] = [
  // Items the user frequently adds
  createMockItem({ id: '1', name: 'Almond Milk' }),
  createMockItem({ id: '2', name: 'Almond Milk' }),
  createMockItem({ id: '3', name: 'Almond Milk' }),
  createMockItem({ id: '4', name: 'Bananas' }),
  createMockItem({ id: '5', name: 'Bananas' }),
  createMockItem({ id: '6', name: 'Eggs' }),
  createMockItem({ id: '7', name: 'Eggs' }),
  createMockItem({ id: '8', name: 'Greek Yogurt' }),
  createMockItem({ id: '9', name: 'Chicken Breast' }),
]

export const WithPersonalizedQuickAdds: Story = {
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={frequentItems} />
        <Story />
      </>
    ),
  ],
}

// Note: The photo capture, barcode scanner, and receipt scanner modes
// are full-screen overlays that are better tested in their own component stories.
// These stories focus on the main form states.
