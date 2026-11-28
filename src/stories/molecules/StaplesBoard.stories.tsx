import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { StaplesBoard } from '@/components/inventory/StaplesBoard'
import { TilePanel } from '@/components/inventory/SummaryTile'
import type { GaugeTone, StapleGauge, StaplesSummary } from '@/components/inventory/pantryInsights'
import type { StockInfo } from '@/utils/stock'

// Builds one gauge. The board only reads `key` and `status` from `stock`, so the rest is left out.
function gauge(
  name: string,
  status: StockInfo['status'],
  label: string,
  fill: number,
  daysLeft?: number,
  // goesBadFirst: the expiry date comes before running out. tone: when the date makes it worse than its status.
  options: { goesBadFirst?: boolean; tone?: GaugeTone } = {}
): StapleGauge {
  const tone = options.tone ?? (status === 'out' ? 'red' : status === 'low' ? 'orange' : 'green')
  return {
    stock: { name, key: name.toLowerCase(), status, daysLeft } as StockInfo,
    name,
    label,
    fill,
    tone,
    daysLeft,
    goesBadFirst: options.goesBadFirst ?? false,
  }
}

// Builds a summary from gauges that are already in board order: out, then fewest days left
function summaryOf(gauges: StapleGauge[]): StaplesSummary {
  return {
    total: gauges.length,
    stocked: gauges.filter((g) => g.stock.status === 'ok').length,
    low: gauges.filter((g) => g.stock.status === 'low').length,
    out: gauges.filter((g) => g.stock.status === 'out').length,
    gauges,
  }
}

const ALL_GAUGES: StapleGauge[] = [
  gauge('Milk', 'out', 'out', 0),
  // Eaten over a few days, but the loaf goes bad today
  gauge('Bread', 'ok', 'today', 0, 0, { goesBadFirst: true, tone: 'orange' }),
  gauge('Eggs', 'low', '2 d', 2 / 30, 2),
  gauge('Bananas', 'ok', '5 d', 5 / 30, 5),
  gauge('Greek yogurt', 'ok', '6 d', 6 / 30, 6, { goesBadFirst: true }),
  gauge('Butter', 'ok', '9 d', 9 / 30, 9),
  gauge('Cheddar cheese', 'ok', '11 d', 11 / 30, 11),
  gauge('Coffee beans', 'ok', '12 d', 12 / 30, 12),
  gauge('Oat milk', 'ok', '14 d', 14 / 30, 14),
  gauge('Onions', 'ok', '16 d', 16 / 30, 16),
  gauge('Garlic', 'ok', '18 d', 18 / 30, 18),
  gauge('Chicken stock', 'ok', '21 d', 21 / 30, 21),
  gauge('Tinned tomatoes', 'ok', '24 d', 24 / 30, 24),
  gauge('Peanut butter', 'ok', '27 d', 27 / 30, 27),
  gauge('Pasta', 'ok', '30+ d', 1, 34),
  gauge('Basmati rice', 'ok', '30+ d', 1, 45),
  gauge('Olive oil', 'ok', '30+ d', 1, 52),
  gauge('Rolled oats', 'ok', '30+ d', 1, 60),
  // No daily use yet: the label is the amount
  gauge('Black beans', 'ok', '3 left', 1),
  gauge('Dish soap', 'ok', '1 left', 0.33),
  gauge('Paper towels', 'ok', '4 left', 0.67),
  gauge('Soy sauce', 'ok', '2 left', 0.67),
]

const meta = {
  title: 'Molecules/StaplesBoard',
  component: StaplesBoard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The body of the Staples panel on the Pantry tab. Each staple has a gauge that shows the days left at the usual pace. Red means out, orange means low, green means stocked. A staple with no known daily use shows its amount instead. Tapping a gauge opens its "Keep in stock" sheet. The first 12 gauges show until "See all" is tapped.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    // Shown in its card at the width it has on a 375 px phone
    (Story) => (
      <div style={{ width: 343 }}>
        <TilePanel title="Staples" hint="days left at your usual pace">
          <Story />
        </TilePanel>
      </div>
    ),
  ],
  args: {
    summary: summaryOf(ALL_GAUGES),
    onOpenStaple: fn(),
  },
} satisfies Meta<typeof StaplesBoard>

export default meta
type Story = StoryObj<typeof meta>

/** 22 staples: one out, two low, and four with no known daily use. "See all 22 staples" shows the rest. */
export const Default: Story = {}

/** Five staples fit without a "See all" button */
export const FewStaples: Story = {
  args: {
    summary: summaryOf([
      gauge('Eggs', 'low', '2 d', 2 / 30, 2),
      gauge('Butter', 'ok', '9 d', 9 / 30, 9),
      gauge('Coffee beans', 'ok', '12 d', 12 / 30, 12),
      gauge('Basmati rice', 'ok', '30+ d', 1, 45),
      gauge('Black beans', 'ok', '3 left', 1),
    ]),
  },
}

/** No staples yet: the board says how to add one */
export const Empty: Story = {
  args: { summary: summaryOf([]) },
}
