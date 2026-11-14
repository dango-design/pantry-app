import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { PersonChips } from '@/components/allergy/PersonChips'
import { alex, sam } from './sampleData'

const meta = {
  title: 'Allergy/PersonChips',
  component: PersonChips,
  parameters: {
    layout: 'padded',
    docs: { description: { component: 'Who you are checking for. Each person is a toggle button.' } },
  },
  tags: ['autodocs'],
  argTypes: { onChange: { action: 'changed' } },
} satisfies Meta<typeof PersonChips>

export default meta
type Story = StoryObj<typeof meta>
// Stories that draw their own demo through `render` and take no args.
type RenderOnlyStory = StoryObj

const kai = { ...sam, id: 'kai', name: 'Kai', color: '#7C3AED' }

export const BothSelected: Story = {
  args: { profiles: [sam, alex], selectedIds: ['sam', 'alex'], onChange: () => {} },
}

export const OneSelected: Story = {
  args: { profiles: [sam, alex, kai], selectedIds: ['alex'], onChange: () => {} },
}

export const Interactive: RenderOnlyStory = {
  render: function InteractivePersonChips() {
    const [ids, setIds] = useState(['sam'])
    return <PersonChips profiles={[sam, alex, kai]} selectedIds={ids} onChange={setIds} />
  },
}
