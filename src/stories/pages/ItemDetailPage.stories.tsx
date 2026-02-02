import type { Meta, StoryObj } from '@storybook/react-vite'
import { ItemDetailPage } from '@/pages/ItemDetailPage'
import { useDemoStore } from '@/stores/demoStore'
import { useEffect } from 'react'
import { addDays, subDays, format } from 'date-fns'
import type { FoodItem } from '@/types'

// Helper to create mock food items
const createMockItem = (overrides: Partial<FoodItem> = {}): FoodItem => ({
  id: 'test-item-1',
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
  title: 'Pages/ItemDetailPage',
  component: ItemDetailPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Detailed view of a food item with actions to use, remove, or add to grocery list.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md mx-auto">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ItemDetailPage>

export default meta
type Story = StoryObj<typeof meta>

// Fresh item - good freshness score
const freshItem = createMockItem({
  id: 'fresh-item',
  name: 'Fresh Apples',
  category: 'produce',
  quantity: 6,
  quantityUnit: 'count',
  storageLocation: 'refrigerator',
  purchaseDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
  expirationDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
  freshnessScore: 95,
})

export const FreshItem: Story = {
  parameters: {
    reactRouter: {
      initialPath: '/item/fresh-item',
      routePath: '/item/:id',
    },
  },
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={[freshItem]} />
        <Story />
      </>
    ),
  ],
}

// Expiring soon - warning state (orange)
const expiringSoonItem = createMockItem({
  id: 'expiring-item',
  name: 'Milk',
  category: 'dairy',
  quantity: 0.5,
  quantityUnit: 'gal',
  storageLocation: 'refrigerator',
  purchaseDate: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
  expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
  freshnessScore: 35,
})

export const ExpiringSoon: Story = {
  parameters: {
    reactRouter: {
      initialPath: '/item/expiring-item',
      routePath: '/item/:id',
    },
  },
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={[expiringSoonItem]} />
        <Story />
      </>
    ),
  ],
}

// Expired item - danger state (red)
const expiredItem = createMockItem({
  id: 'expired-item',
  name: 'Old Yogurt',
  category: 'dairy',
  quantity: 1,
  quantityUnit: 'count',
  storageLocation: 'refrigerator',
  purchaseDate: format(subDays(new Date(), 14), 'yyyy-MM-dd'),
  expirationDate: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
  freshnessScore: 0,
})

export const ExpiredItem: Story = {
  parameters: {
    reactRouter: {
      initialPath: '/item/expired-item',
      routePath: '/item/:id',
    },
  },
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={[expiredItem]} />
        <Story />
      </>
    ),
  ],
}

// Item not found state
export const ItemNotFound: Story = {
  parameters: {
    reactRouter: {
      initialPath: '/item/nonexistent-item',
      routePath: '/item/:id',
    },
  },
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={[]} />
        <Story />
      </>
    ),
  ],
}

// Meat item (different category styling)
const meatItem = createMockItem({
  id: 'meat-item',
  name: 'Chicken Thighs',
  category: 'meat',
  quantity: 1.5,
  quantityUnit: 'lb',
  storageLocation: 'refrigerator',
  purchaseDate: format(new Date(), 'yyyy-MM-dd'),
  expirationDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
  freshnessScore: 80,
  addedVia: 'barcode',
})

export const MeatItem: Story = {
  parameters: {
    reactRouter: {
      initialPath: '/item/meat-item',
      routePath: '/item/:id',
    },
  },
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={[meatItem]} />
        <Story />
      </>
    ),
  ],
}

// Frozen item (long shelf life)
const frozenItem = createMockItem({
  id: 'frozen-item',
  name: 'Frozen Peas',
  category: 'frozen',
  quantity: 1,
  quantityUnit: 'pack',
  storageLocation: 'freezer',
  purchaseDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  expirationDate: format(addDays(new Date(), 180), 'yyyy-MM-dd'),
  freshnessScore: 98,
  addedVia: 'photo',
})

export const FrozenItem: Story = {
  parameters: {
    reactRouter: {
      initialPath: '/item/frozen-item',
      routePath: '/item/:id',
    },
  },
  decorators: [
    (Story) => (
      <>
        <StoreInitializer items={[frozenItem]} />
        <Story />
      </>
    ),
  ],
}
