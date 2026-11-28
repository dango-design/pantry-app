import type { Meta, StoryObj } from '@storybook/react-vite'
import { DinnersPanel } from '@/components/inventory/DinnersPanel'
import { TilePanel } from '@/components/inventory/SummaryTile'
import type { DinnerEstimate } from '@/components/inventory/pantryInsights'

const ROLE_COUNTS: DinnerEstimate['roleCounts'] = [
  { role: 'main', count: 7 },
  { role: 'base', count: 9 },
  { role: 'produce', count: 12 },
  { role: 'breakfast', count: 8 },
  { role: 'snack', count: 7 },
  { role: 'flavor', count: 21 },
  { role: 'drink', count: 5 },
]

// 3 people, 14 servings of mains at 1.5 a dinner: 14 / 1.5 / 3 = 3.1, so 3 dinners
const DEFAULT_ESTIMATE: DinnerEstimate = {
  roleCounts: ROLE_COUNTS,
  totalProducts: ROLE_COUNTS.reduce((sum, { count }) => sum + count, 0),
  servings: { main: 14, base: 30, produce: 20 },
  householdSize: 3,
  dinnersBy: { main: 3.1, base: 10, produce: 6.7 },
  dinners: 3,
  limitedBy: 'main',
}

const meta = {
  title: 'Molecules/DinnersPanel',
  component: DinnersPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The body of the "Dinners on hand" panel on the Pantry tab. A bar shows what the pantry\'s items are for, by role. Three meters show how many dinners the mains, bases and veg would each last. The grey box says about how many dinners those make for the household and which role runs out first. A line under it says how many saved recipes can be made now.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    // Shown in its card at the width it has on a 375 px phone
    (Story) => (
      <div style={{ width: 343 }}>
        <TilePanel title="Dinners on hand" hint="an estimate">
          <Story />
        </TilePanel>
      </div>
    ),
  ],
  args: {
    estimate: DEFAULT_ESTIMATE,
    recipes: { cookable: 2, total: 6 },
  },
} satisfies Meta<typeof DinnersPanel>

export default meta
type Story = StoryObj<typeof meta>

/** Three people with enough mains for about 3 dinners. Mains run out first. */
export const Default: Story = {}

/** Veg runs out first, so it sets the number of dinners */
export const VegRunsOutFirst: Story = {
  args: {
    estimate: {
      ...DEFAULT_ESTIMATE,
      servings: { main: 18, base: 30, produce: 7.5 },
      dinnersBy: { main: 4, base: 10, produce: 2.5 },
      dinners: 2,
      limitedBy: 'produce',
    },
  },
}

/** Fewer mains than people: not one full dinner, and no recipe can be made */
export const NotEnough: Story = {
  args: {
    estimate: {
      ...DEFAULT_ESTIMATE,
      servings: { main: 2, base: 12, produce: 6 },
      dinnersBy: { main: 0.4, base: 4, produce: 2 },
      dinners: 0,
      limitedBy: 'main',
    },
    recipes: { cookable: 0, total: 6 },
  },
}

/** With no saved recipes, the recipe line is hidden */
export const NoRecipes: Story = {
  args: { recipes: undefined },
}
