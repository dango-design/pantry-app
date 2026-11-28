import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { CompactItemRow, CompactRowList } from '@/components/inventory'
import type { StockInfo } from '@/utils/stock'
import { FRIDGE_SAMPLE, sampleProduct } from './pantrySampleData'

const meta = {
  title: 'Molecules/CompactItemRow',
  component: CompactItemRow,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'One pantry product on a 42 px line: category dot, name, amount and a freshness pill. Tap the line to open its actions: use one / add one, add to list, used up, and details.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      // A 375 px phone minus the page gutters
      <div style={{ width: 343 }} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Story />
      </div>
    ),
  ],
  args: {
    stock: FRIDGE_SAMPLE[2],
    expanded: false,
    onToggle: fn(),
    onAdjust: fn(),
    onAddToCart: fn(),
    onMarkUsed: fn(),
  },
} satisfies Meta<typeof CompactItemRow>

export default meta
type Story = StoryObj<typeof meta>

/** A list where tapping a row opens its actions, one at a time */
function RowList({ products, showLocation = false }: { products: StockInfo[]; showLocation?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <CompactRowList>
      {products.map((stock) => (
        <CompactItemRow
          key={stock.key}
          stock={stock}
          expanded={open === stock.key}
          onToggle={() => setOpen(open === stock.key ? null : stock.key)}
          showLocation={showLocation}
          onAdjust={fn()}
          onAddToCart={fn()}
          onMarkUsed={fn()}
        />
      ))}
    </CompactRowList>
  )
}

export const Default: Story = {
  render: (args) => (
    <CompactRowList>
      <CompactItemRow {...args} />
    </CompactRowList>
  ),
}

/** Red: expired. Orange: today to 3 days. Yellow: 4 to 7 days. Green: later. */
export const FreshnessColours: Story = {
  render: () => <RowList products={FRIDGE_SAMPLE} />,
}

/** Lists outside a place group also say where each product is */
export const WithLocation: Story = {
  render: () => <RowList products={FRIDGE_SAMPLE} showLocation />,
}

/** Actions open under the row. The date is fixed so the snapshot does not change each day. */
export const Expanded: Story = {
  args: {
    stock: sampleProduct('Greek yogurt', { expirationDate: '2027-06-15', category: 'dairy', quantity: 4, batches: 2 }),
    expanded: true,
  },
  render: (args) => (
    <CompactRowList>
      <CompactItemRow {...args} />
    </CompactRowList>
  ),
}

/** Weighed products have no use one / add one buttons, like the large card */
export const ExpandedWeighed: Story = {
  args: {
    stock: sampleProduct('Chicken thighs', { expirationDate: '2027-06-15', category: 'meat', quantity: 1.34, unit: 'lb' }),
    expanded: true,
  },
  render: (args) => (
    <CompactRowList>
      <CompactItemRow {...args} />
    </CompactRowList>
  ),
}

/** A long name wraps to a second line; the amount and pill are never cut off */
export const LongNames: Story = {
  render: () => (
    <RowList
      showLocation
      products={[
        sampleProduct('Peanut Butter Sandwich Cookies', { days: 60, category: 'snacks', place: 'pantry', quantity: 1 }),
        sampleProduct('Worcestershire Sauce', { days: -4, category: 'condiments', quantity: 2 }),
        sampleProduct('BODYARMOR Lite', { days: 240, category: 'beverages', place: 'pantry', quantity: 5 }),
      ]}
    />
  ),
}
