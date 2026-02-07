import type { Meta, StoryObj } from '@storybook/react-vite'
import { FoodItemCard, FoodItemCheckboxCard } from '@/components/inventory/FoodItemCard'
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
        component: 'M3-styled horizontal card displaying a food item with quantity, location, expiration status, and quick actions.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '382px' }}>
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
      name: 'Honeycrisp Apple',
      category: 'produce',
      quantity: 1,
      quantityUnit: 'unit',
      storageLocation: 'refrigerator',
      expirationDate: format(addDays(new Date(), 9), 'yyyy-MM-dd'),
    }),
  },
}

export const Dairy: Story = {
  args: {
    item: createMockItem({
      name: 'Almond Milk',
      category: 'dairy',
      quantity: 1,
      quantityUnit: 'unit',
      storageLocation: 'pantry',
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
      expirationDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
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

export const Bakery: Story = {
  args: {
    item: createMockItem({
      name: 'Whole Wheat Bread',
      category: 'bakery',
      quantity: 1,
      quantityUnit: 'unit',
      storageLocation: 'counter',
      expirationDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
    }),
  },
}

export const Pantry: Story = {
  args: {
    item: createMockItem({
      name: 'Dried Spaghetti',
      category: 'pantry',
      quantity: 1,
      quantityUnit: 'pack',
      storageLocation: 'pantry',
      expirationDate: format(addDays(new Date(), 730), 'yyyy-MM-dd'),
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
          name: 'Almond Milk',
          category: 'dairy',
          quantity: 1,
          quantityUnit: 'unit',
          storageLocation: 'pantry',
          expirationDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Banana',
          category: 'produce',
          quantity: 1,
          quantityUnit: 'unit',
          storageLocation: 'pantry',
          expirationDate: format(addDays(new Date(), 9), 'yyyy-MM-dd'),
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Chicken Thighs',
          category: 'meat',
          quantity: 1.34,
          quantityUnit: 'lb',
          storageLocation: 'refrigerator',
          expirationDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Pork Gyoza',
          category: 'frozen',
          quantity: 1,
          quantityUnit: 'pack',
          storageLocation: 'freezer',
          expirationDate: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Whole Wheat Bread',
          category: 'bakery',
          quantity: 1,
          quantityUnit: 'unit',
          storageLocation: 'counter',
          expirationDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Dried Spaghetti',
          category: 'pantry',
          quantity: 1,
          quantityUnit: 'pack',
          storageLocation: 'pantry',
          expirationDate: format(addDays(new Date(), 730), 'yyyy-MM-dd'),
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Salmon Fillet',
          category: 'seafood',
          quantity: 1,
          quantityUnit: 'lb',
          storageLocation: 'refrigerator',
          expirationDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        })}
      />
      <FoodItemCard
        item={createMockItem({
          name: 'Orange Juice',
          category: 'beverages',
          quantity: 1,
          quantityUnit: 'gal',
          storageLocation: 'refrigerator',
          expirationDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
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
      <p className="text-sm mb-2" style={{ color: '#1D1B20' }}>Fresh (&gt;7 days)</p>
      <FoodItemCard
        item={createMockItem({
          name: 'Fresh Apples',
          expirationDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
        })}
      />
      <p className="text-sm mb-2 mt-4" style={{ color: '#1D1B20' }}>Warning (4-7 days)</p>
      <FoodItemCard
        item={createMockItem({
          name: 'Use Soon Milk',
          category: 'dairy',
          storageLocation: 'refrigerator',
          expirationDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
        })}
      />
      <p className="text-sm mb-2 mt-4" style={{ color: '#1D1B20' }}>Urgent (&le;3 days)</p>
      <FoodItemCard
        item={createMockItem({
          name: 'Expiring Yogurt',
          category: 'dairy',
          storageLocation: 'refrigerator',
          expirationDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        })}
      />
      <p className="text-sm mb-2 mt-4" style={{ color: '#1D1B20' }}>Expired</p>
      <FoodItemCard
        item={createMockItem({
          name: 'Expired Bread',
          category: 'bakery',
          storageLocation: 'counter',
          expirationDate: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
        })}
      />
    </div>
  ),
}

// Checkbox variant stories
export const CheckboxUnchecked: Story = {
  args: {
    item: createMockItem({
      name: 'Almond Milk',
      category: 'dairy',
      quantity: 1,
      quantityUnit: 'unit',
      storageLocation: 'pantry',
      expirationDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    }),
  },
  render: (args) => <FoodItemCheckboxCard {...args} checked={false} />,
}

export const CheckboxChecked: Story = {
  args: {
    item: createMockItem({
      name: 'Almond Milk',
      category: 'dairy',
      quantity: 1,
      quantityUnit: 'unit',
      storageLocation: 'pantry',
      expirationDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    }),
  },
  render: (args) => <FoodItemCheckboxCard {...args} checked={true} />,
}
