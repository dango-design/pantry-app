import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Snackbar } from '@/components/common/Snackbar'
import { Button } from '@/components/common'

const meta = {
  title: 'Molecules/Snackbar',
  component: Snackbar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Toast notification that appears at the bottom of the screen with optional undo action.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-[400px] bg-gray-100 p-4 relative">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Snackbar>

export default meta
type Story = StoryObj<typeof meta>

export const InfoMessage: Story = {
  args: {
    open: true,
    message: 'Item added to your pantry',
    onClose: () => {},
  },
}

export const WithUndoAction: Story = {
  args: {
    open: true,
    message: 'Milk removed from pantry',
    onClose: () => {},
    onUndo: () => alert('Undo clicked!'),
  },
}

export const LongMessage: Story = {
  args: {
    open: true,
    message: 'Successfully added 5 items to your shopping list from the expiring items suggestion',
    onClose: () => {},
    onUndo: () => {},
  },
}

export const ShortDuration: Story = {
  args: {
    open: true,
    message: 'Quick notification',
    onClose: () => {},
    duration: 2000,
  },
}

// Interactive demo showing snackbar trigger (manages its own state, so it takes no args)
export const Interactive: StoryObj = {
  render: function InteractiveSnackbar() {
    const [snackbar, setSnackbar] = useState<{
      open: boolean
      message: string
      hasUndo: boolean
    }>({ open: false, message: '', hasUndo: false })

    const showSnackbar = (message: string, hasUndo: boolean) => {
      setSnackbar({ open: true, message, hasUndo })
    }

    const handleUndo = () => {
      alert('Action undone!')
      setSnackbar({ ...snackbar, open: false })
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => showSnackbar('Item saved successfully', false)}>
            Show info snackbar
          </Button>
          <Button onClick={() => showSnackbar('Item deleted', true)}>
            Show with undo
          </Button>
          <Button onClick={() => showSnackbar('Added to grocery list', true)}>
            Show another
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Click a button to trigger a snackbar. It will auto-dismiss after 4 seconds.
        </p>
        <Snackbar
          open={snackbar.open}
          message={snackbar.message}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          onUndo={snackbar.hasUndo ? handleUndo : undefined}
        />
      </div>
    )
  },
}
