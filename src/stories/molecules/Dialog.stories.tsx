import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Dialog, DialogActions } from '@/components/common/Dialog'
import { Button, Input } from '@/components/common'
import { Trash2, AlertTriangle } from 'lucide-react'

const meta = {
  title: 'Molecules/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Modal dialog for confirmations, forms, and alerts.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

// Interactive wrapper for dialogs
function DialogDemo({ children, buttonText = 'Open Dialog' }: { children: (props: { open: boolean; onClose: () => void }) => React.ReactNode; buttonText?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{buttonText}</Button>
      {children({ open, onClose: () => setOpen(false) })}
    </>
  )
}

export const ConfirmAction: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Confirm action',
    description: 'Are you sure you want to proceed? This action cannot be undone.',
    children: (
      <DialogActions>
        <Button variant="secondary">Cancel</Button>
        <Button>Confirm</Button>
      </DialogActions>
    ),
  },
}

export const DestructiveAction: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Delete item',
    description: 'Are you sure you want to delete this item? This action cannot be undone.',
    children: (
      <DialogActions>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </DialogActions>
    ),
  },
}

export const WithFormContent: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Edit item',
    children: (
      <div className="space-y-4">
        <Input label="Name" defaultValue="Milk" />
        <Input label="Quantity" type="number" defaultValue="1" />
        <DialogActions>
          <Button variant="secondary">Cancel</Button>
          <Button>Save changes</Button>
        </DialogActions>
      </div>
    ),
  },
}

export const WarningDialog: Story = {
  args: {
    open: true,
    onClose: () => {},
    children: (
      <div className="text-center">
        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Items expiring soon</h2>
        <p className="text-gray-500 mb-6">
          You have 5 items expiring in the next 3 days. Would you like to view them?
        </p>
        <DialogActions className="justify-center">
          <Button variant="secondary">Dismiss</Button>
          <Button>View items</Button>
        </DialogActions>
      </div>
    ),
  },
}

export const QuantitySelector: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Use item',
    description: 'How much Milk did you use?',
    children: (
      <>
        <div className="flex items-center justify-center gap-4 py-4">
          <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            -
          </button>
          <div className="text-center">
            <p className="text-3xl font-bold">1</p>
            <p className="text-sm text-gray-500">gallon</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            +
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mb-4">0.5 gallon will remain</p>
        <DialogActions>
          <Button variant="secondary">Cancel</Button>
          <Button>Use 1 gallon</Button>
        </DialogActions>
      </>
    ),
  },
}

// Manages its own open state, so it takes no args
export const Interactive: StoryObj = {
  render: () => (
    <DialogDemo>
      {({ open, onClose }) => (
        <Dialog
          open={open}
          onClose={onClose}
          title="Interactive dialog"
          description="Click outside or press Escape to close."
        >
          <p className="text-gray-600 mb-4">
            This dialog demonstrates the interactive behavior. Try clicking outside or pressing the Escape key.
          </p>
          <DialogActions>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={onClose}>Confirm</Button>
          </DialogActions>
        </Dialog>
      )}
    </DialogDemo>
  ),
}
