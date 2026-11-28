import type { Meta, StoryObj } from '@storybook/react-vite'
import { AllergyProfileEditor } from '@/components/allergy/AllergyProfileEditor'
import { alex } from './sampleData'

const meta = {
  title: 'Allergy/AllergyProfileEditor',
  component: AllergyProfileEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Edit one person: name, color, allergens with severity and whether "may contain" counts, and other words to avoid.',
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
  argTypes: {
    onSave: { action: 'saved' },
    onCancel: { action: 'cancelled' },
    onDelete: { action: 'deleted' },
  },
} satisfies Meta<typeof AllergyProfileEditor>

export default meta
type Story = StoryObj<typeof meta>

export const NewPerson: Story = {
  args: { onSave: () => {}, onCancel: () => {} },
}

export const EditingAlex: Story = {
  args: { initial: alex, onSave: () => {}, onCancel: () => {}, onDelete: () => {} },
}
