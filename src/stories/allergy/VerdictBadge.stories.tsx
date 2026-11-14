import type { Meta, StoryObj } from '@storybook/react-vite'
import { VerdictBadge } from '@/components/allergy/VerdictBadge'

const meta = {
  title: 'Allergy/VerdictBadge',
  component: VerdictBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An allergy verdict: a shield icon and words, never color alone. The shield keeps it apart from the freshness colors on pantry cards.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    verdict: { control: 'select', options: ['red', 'yellow', 'green', 'unknown'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof VerdictBadge>

export default meta
type Story = StoryObj<typeof meta>
// Stories that draw their own demo through `render` and take no args.
type RenderOnlyStory = StoryObj

export const NotSafe: Story = { args: { verdict: 'red' } }
export const CheckFirst: Story = { args: { verdict: 'yellow' } }
export const NoListedAllergens: Story = { args: { verdict: 'green' } }
export const Unknown: Story = { args: { verdict: 'unknown' } }

export const PantryCardWording: RenderOnlyStory = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <VerdictBadge verdict="red" size="sm" label="Not safe for Sam" detail="Contains peanut (peanut butter, peanuts)" />
      <VerdictBadge verdict="yellow" size="sm" label="Check first for Alex" detail="Check: soybean oils" />
      <VerdictBadge verdict="green" size="sm" />
      <VerdictBadge verdict="unknown" size="sm" label="No ingredient list" />
      <VerdictBadge verdict="unknown" size="sm" label="Store-made: ask staff" />
    </div>
  ),
}

export const Sizes: RenderOnlyStory = {
  render: () => (
    <div className="flex items-center gap-2">
      <VerdictBadge verdict="red" size="sm" />
      <VerdictBadge verdict="red" size="md" />
      <VerdictBadge verdict="red" size="lg" />
    </div>
  ),
}
