import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ForgottenCard } from '@/components/inventory/ForgottenCard'
import type { ForgottenProduct } from '@/components/inventory/pantryInsights'
import type { FoodItem } from '@/types'
import type { StockInfo } from '@/utils/stock'

// A product with one row. The card only reads the name, key and the row's id.
function forgotten(name: string, days: number): ForgottenProduct {
  const key = name.toLowerCase()
  const stock = {
    name,
    key,
    category: 'other',
    unit: 'count',
    items: [{ id: `${key}-1`, name } as FoodItem],
    counted: 1,
    estimated: 1,
    isEstimate: false,
    status: 'ok',
  } as StockInfo
  return { stock, days }
}

const meta = {
  title: 'Molecules/ForgottenCard',
  component: ForgottenCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A card on the Pantry tab that lists products nobody has touched for 3 weeks or more, oldest first. Each row has three buttons: "Still have it" resets the date, "Used it up" and "Threw it out" remove the product. Tap a name to open the item.',
      },
    },
  },
  tags: ['autodocs'],
  // The global Storybook decorator already wraps every story in a MemoryRouter
  decorators: [
    (Story) => (
      // A 375 px phone minus the page gutters
      <div style={{ width: 343 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    products: [forgotten('Frozen Peas', 42), forgotten('Quinoa', 35), forgotten('Basil Pesto', 28)],
    onStillHave: fn(),
    onUsedUp: fn(),
    onThrewOut: fn(),
  },
} satisfies Meta<typeof ForgottenCard>

export default meta
type Story = StoryObj<typeof meta>

/** Three products, oldest first */
export const Default: Story = {}

/** More than five products: the first five show, with a "See all 8" button under them */
export const ManyItems: Story = {
  args: {
    products: [
      forgotten('Frozen Peas', 75),
      forgotten('Coconut Milk', 63),
      forgotten('Quinoa', 42),
      forgotten('Basil Pesto', 35),
      forgotten('Rice Noodles', 30),
      forgotten('Chickpeas', 28),
      forgotten('Frozen Spinach', 24),
      forgotten('Tahini', 21),
    ],
  },
}

/** With no products the card renders nothing, so this story is blank on purpose */
export const Empty: Story = {
  args: { products: [] },
  parameters: {
    docs: {
      description: {
        story: 'When nothing has gone untouched for 3 weeks, the card returns null and takes no space on the page.',
      },
    },
  },
}
