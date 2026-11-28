import type { Meta, StoryObj } from '@storybook/react-vite'
import { AllergyResult } from '@/components/allergy/AllergyResult'
import { verdictFor } from '@/allergy/verdict'
import { alex, noIngredients, nutterButter, plainRice, sam } from './sampleData'

const meta = {
  title: 'Allergy/AllergyResult',
  component: AllergyResult,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The full verdict for a product: overall result, a row per person with reasons, ingredients with trigger words marked, source and date, and the "check the label" notice. Every story runs the real verdict engine.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AllergyResult>

export default meta
type Story = StoryObj<typeof meta>

export const NotSafeForOne: Story = {
  args: {
    result: verdictFor(nutterButter.gtin, [nutterButter], [sam, alex]),
    title: nutterButter.name!,
    brand: nutterButter.brand,
    profiles: [sam, alex],
    fetchedAt: nutterButter.fetchedAt,
  },
}

export const NoListedAllergens: Story = {
  args: {
    result: verdictFor(plainRice.gtin, [plainRice], [sam, alex]),
    title: plainRice.name!,
    brand: plainRice.brand,
    profiles: [sam, alex],
  },
}

export const NoIngredientList: Story = {
  args: {
    result: verdictFor(noIngredients.gtin, [noIngredients], [sam]),
    title: noIngredients.name!,
    profiles: [sam],
  },
}

export const StoreMade: Story = {
  args: {
    result: verdictFor('0212345012345', [], [sam]),
    title: 'Store-made item',
    profiles: [sam],
  },
}

export const NobodySelected: Story = {
  args: {
    result: verdictFor(nutterButter.gtin, [nutterButter], []),
    title: nutterButter.name!,
    brand: nutterButter.brand,
    profiles: [],
  },
}
