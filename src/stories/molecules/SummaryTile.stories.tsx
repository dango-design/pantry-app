import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { SummaryTile, SummaryTileGrid } from '@/components/inventory'

const meta = {
  title: 'Molecules/SummaryTile',
  component: SummaryTile,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A tile at the top of the Pantry tab: a label, a big number, and a status line or a small bar. Tapping it shows its list below the tiles.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    // One tile is shown at its width in the phone grid. The Grid story sets `fullWidth`.
    (Story, context) =>
      context.parameters.fullWidth ? (
        <Story />
      ) : (
        <div style={{ width: 168 }}>
          <Story />
        </div>
      ),
  ],
  args: {
    label: 'Use soon',
    value: 6,
    status: { text: '2 already expired', tone: 'red' },
    selected: false,
    onClick: fn(),
  },
} satisfies Meta<typeof SummaryTile>

export default meta
type Story = StoryObj<typeof meta>

export const UseSoon: Story = {}

export const Selected: Story = { args: { selected: true } }

export const RunningLow: Story = {
  args: { label: 'Running low', value: 4, status: { text: '3 on your list', tone: 'muted' } },
}

/** A count of zero says so in green instead of hiding the tile */
export const NothingToReport: Story = {
  args: { label: 'Use soon', value: 0, status: { text: 'Nothing to use up', tone: 'green' } },
}

/** With a bar instead of a status line, as the Staples tile will use */
export const WithBar: Story = {
  args: {
    label: 'Staples',
    value: 18,
    valueSuffix: '/22',
    status: undefined,
    bar: [
      { value: 18, tone: 'green' },
      { value: 3, tone: 'orange' },
      { value: 1, tone: 'red' },
    ],
  },
}

/**
 * Four tiles in the grid: two across on a phone, four across from tablet width.
 * Staples and Dinners are examples of tiles still to come.
 */
export const Grid: Story = {
  // The grid switches at the md breakpoint, which depends on the window, so show it on a phone
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { fullWidth: true },
  render: () => {
    const [selected, setSelected] = useState<string | null>('soon')
    const toggle = (key: string) => () => setSelected(selected === key ? null : key)
    return (
      <SummaryTileGrid label="Pantry summary">
        <SummaryTile label="Use soon" value={6} status={{ text: '2 already expired', tone: 'red' }} selected={selected === 'soon'} onClick={toggle('soon')} />
        <SummaryTile label="Running low" value={4} status={{ text: '3 on your list', tone: 'muted' }} selected={selected === 'low'} onClick={toggle('low')} />
        <SummaryTile
          label="Staples"
          value={18}
          valueSuffix="/22"
          bar={[
            { value: 18, tone: 'green' },
            { value: 3, tone: 'orange' },
            { value: 1, tone: 'red' },
          ]}
          selected={selected === 'staples'}
          onClick={toggle('staples')}
        />
        <SummaryTile label="Dinners on hand" value="~5" status={{ text: 'mains run out first', tone: 'muted' }} selected={selected === 'dinners'} onClick={toggle('dinners')} />
      </SummaryTileGrid>
    )
  },
}
