import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { CompactItemRow, CompactRowList, GroupChips, PantryGroupSection, getGroupStatus } from '@/components/inventory'
import type { StockInfo } from '@/utils/stock'
import { FRIDGE_SAMPLE, sampleProduct } from './pantrySampleData'

const meta = {
  title: 'Molecules/PantryGroupSection',
  component: PantryGroupSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A group under "Everything else" on the Pantry tab. The header gives the item count and a status pill; tap it to open the group.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 343 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'Fridge',
    color: '#3B82F6',
    count: FRIDGE_SAMPLE.length,
    status: getGroupStatus(FRIDGE_SAMPLE),
    open: false,
    onToggle: fn(),
  },
} satisfies Meta<typeof PantryGroupSection>

export default meta
type Story = StoryObj<typeof meta>

function Rows({ products }: { products: StockInfo[] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <CompactRowList>
      {products.map((stock) => (
        <CompactItemRow
          key={stock.key}
          stock={stock}
          expanded={open === stock.key}
          onToggle={() => setOpen(open === stock.key ? null : stock.key)}
          onAdjust={fn()}
          onAddToCart={fn()}
          onMarkUsed={fn()}
        />
      ))}
    </CompactRowList>
  )
}

/** Groups start closed */
export const Closed: Story = {}

export const Open: Story = {
  args: { open: true },
  render: (args) => (
    <PantryGroupSection {...args}>
      <Rows products={FRIDGE_SAMPLE} />
    </PantryGroupSection>
  ),
}

/** Products the selected tile already lists are left out, with a note saying where they are */
export const OpenWithItemsShownAbove: Story = {
  args: { open: true, shownAbove: { count: 3, tileLabel: 'Use soon' } },
  render: (args) => (
    <PantryGroupSection {...args}>
      <Rows products={FRIDGE_SAMPLE.slice(3)} />
    </PantryGroupSection>
  ),
}

/** Header pills: red when anything expired, orange when some are soon, green otherwise */
export const HeaderStates: Story = {
  render: () => {
    const freezer = [sampleProduct('Ground beef', { days: 90, category: 'meat', place: 'freezer' })]
    const counter = [sampleProduct('Bananas', { days: 2, place: 'counter' }), sampleProduct('Bread', { days: 3, category: 'bakery', place: 'counter' })]
    return (
      <div className="space-y-2">
        <PantryGroupSection label="Fridge" color="#3B82F6" count={FRIDGE_SAMPLE.length} status={getGroupStatus(FRIDGE_SAMPLE)} open={false} onToggle={fn()} />
        <PantryGroupSection label="Counter" color="#F59E0B" count={counter.length} status={getGroupStatus(counter)} open={false} onToggle={fn()} />
        <PantryGroupSection label="Freezer" color="#6366F1" count={freezer.length} status={getGroupStatus(freezer)} open={false} onToggle={fn()} />
      </div>
    )
  },
}

/** Shown as chips instead of rows, for long lists of small things like spices */
export const Chips: Story = {
  render: () => {
    const names = ['Olive oil', 'Soy sauce', 'Salt', 'Black pepper', 'Cumin', 'Paprika', 'Ketchup', 'Mayo', 'Dijon', 'Sriracha']
    const products = names.map((name, i) => sampleProduct(name, { days: i === 7 ? 4 : 200, category: 'condiments', place: 'pantry' }))
    return (
      <PantryGroupSection label="Oils, spices & sauces" color="#9CA3AF" count={products.length} status={getGroupStatus(products)} open onToggle={fn()}>
        <GroupChips products={products} />
      </PantryGroupSection>
    )
  },
}

/** The flavor group as chips, with one staple running low. That chip has an orange outline and says "low". */
export const FlavorGroupWithLowChip: Story = {
  render: () => {
    const names = [
      'Olive oil', 'Vegetable oil', 'Sesame oil', 'Soy sauce', 'Fish sauce', 'Salt', 'Black pepper', 'Cumin', 'Paprika',
      'Chili flakes', 'Oregano', 'Cinnamon', 'Garlic powder', 'Ketchup', 'Mayo', 'Dijon', 'Sriracha', 'Honey',
      'Rice vinegar', 'Hoisin',
    ]
    const products = names.map((name) => sampleProduct(name, { days: 200, category: 'condiments', place: 'pantry' }))
    const soySauce = products.find((stock) => stock.name === 'Soy sauce')!
    return (
      <PantryGroupSection
        label="Oils, spices & sauces"
        color="#B5B5BF"
        count={products.length}
        status={{ text: '1 low', tone: 'orange' }}
        open
        onToggle={fn()}
      >
        <GroupChips products={products} lowKeys={new Set([soySauce.key])} />
      </PantryGroupSection>
    )
  },
}
