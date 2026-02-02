import type { Meta, StoryObj } from '@storybook/react-vite'
import { FoodItemCard } from '@/components/inventory/FoodItemCard'
import type { FoodItem } from '@/types'
import { addDays, subDays, format } from 'date-fns'

// Helper to create mock food items
const createMockItem = (overrides: Partial<FoodItem> = {}): FoodItem => ({
  id: `item-${Math.random().toString(36).substr(2, 9)}`,
  householdId: 'household-1',
  name: 'Banana',
  category: 'produce',
  quantity: 5,
  quantityUnit: 'count',
  originalQuantity: 6,
  storageLocation: 'counter',
  purchaseDate: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
  expirationDate: format(addDays(new Date(), 4), 'yyyy-MM-dd'),
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

const meta = {
  title: 'Organisms/FoodItemCard',
  component: FoodItemCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Card displaying a food item with quantity, location, expiration status, and quick actions.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '400px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onMarkUsed: { action: 'markUsed' },
    onAddToCart: { action: 'addToCart' },
  },
} satisfies Meta<typeof FoodItemCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    item: createMockItem(),
  },
}

export const Produce: Story = {
  args: {
    item: createMockItem({
      name: 'Spinach',
      category: 'produce',
      quantity: 1,
      quantityUnit: 'pack',
      storageLocation: 'refrigerator',
      expirationDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    }),
  },
}

export const Dairy: Story = {
  args: {
    item: createMockItem({
      name: 'Almond Milk',
      category: 'dairy',
      quantity: 2,
      quantityUnit: 'count',
      storageLocation: 'refrigerator',
      expirationDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    }),
  },
}

export const Meat: Story = {
  args: {
    item: createMockItem({
      name: 'Chicken Thighs',
      category: 'meat',
      quantity: 1.34,
      quantityUnit: 'lb',
      storageLocation: 'refrigerator',
      expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    }),
  },
}

export const Frozen: Story = {
  args: {
    item: createMockItem({
      name: 'Pork Gyoza',
      category: 'frozen',
      quantity: 1,
      quantityUnit: 'pack',
      storageLocation: 'freezer',
      expirationDate: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
    }),
  },
}

export const ExpiringSoon: Story = {
  args: {
    item: createMockItem({
      name: 'Milk',
      category: 'dairy',
      quantity: 1,
      quantityUnit: 'gal',
      storageLocation: 'refrigerator',
      expirationDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    }),
  },
}

export const ExpiresToday: Story = {
  args: {
    item: createMockItem({
      name: 'Yogurt',
      category: 'dairy',
      quantity: 1,
      quantityUnit: 'count',
      storageLocation: 'refrigerator',
      expirationDate: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
}

export const Expired: Story = {
  args: {
    item: createMockItem({
      name: 'Old Bread',
      category: 'bakery',
      quantity: 1,
      quantityUnit: 'unit',
      storageLocation: 'counter',
      expirationDate: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    }),
  },
}

export const LongShelfLife: Story = {
  args: {
    item: createMockItem({
      name: 'Rice',
      category: 'pantry',
      quantity: 2,
      quantityUnit: 'lb',
      storageLocation: 'pantry',
      expirationDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    }),
  },
}

export const AllCategories: Story = {
  args: {
    item: createMockItem(),
  },
  render: () => (
    <div className="space-y-2">
      <FoodItemCard
        item={createMockItem({
          name: 'Bananas',
          category: 'produce',
          quantity: 6,
          quantityUnit: 'count',
          storageLocation: 'counter',
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Milk',
          category: 'dairy',
          quantity: 1,
          quantityUnit: 'gal',
          storageLocation: 'refrigerator',
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Chicken Breast',
          category: 'meat',
          quantity: 2,
          quantityUnit: 'lb',
          storageLocation: 'refrigerator',
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Frozen Pizza',
          category: 'frozen',
          quantity: 1,
          quantityUnit: 'unit',
          storageLocation: 'freezer',
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Whole Wheat Bread',
          category: 'bakery',
          quantity: 1,
          quantityUnit: 'unit',
          storageLocation: 'counter',
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Pasta',
          category: 'pantry',
          quantity: 2,
          quantityUnit: 'pack',
          storageLocation: 'pantry',
        })}
      />
    </div>
  ),
}

export const ExpirationStates: Story = {
  args: {
    item: createMockItem(),
  },
  render: () => (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-2">Fresh (green)</p>
      <FoodItemCard
        item={createMockItem({
          name: 'Fresh Apples',
          expirationDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
        })}
      />
      <p className="text-sm text-gray-500 mb-2 mt-4">Expiring Soon (orange)</p>
      <FoodItemCard
        item={createMockItem({
          name: 'Use Soon Milk',
          expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        })}
      />
      <p className="text-sm text-gray-500 mb-2 mt-4">Expires Today (red)</p>
      <FoodItemCard
        item={createMockItem({
          name: 'Expires Today Yogurt',
          expirationDate: format(new Date(), 'yyyy-MM-dd'),
        })}
      />
      <p className="text-sm text-gray-500 mb-2 mt-4">Expired (dark red)</p>
      <FoodItemCard
        item={createMockItem({
          name: 'Expired Bread',
          expirationDate: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
        })}
      />
    </div>
  ),
}
