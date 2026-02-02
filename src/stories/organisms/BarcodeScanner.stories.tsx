import type { Meta, StoryObj } from '@storybook/react-vite'
import { BarcodeScanner } from '@/components/smart-input/BarcodeScanner'

const meta = {
  title: 'Organisms/BarcodeScanner',
  component: BarcodeScanner,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full-screen barcode scanning interface with camera and manual entry options.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onScan: { action: 'scanned' },
    onCancel: { action: 'cancelled' },
  },
} satisfies Meta<typeof BarcodeScanner>

export default meta
type Story = StoryObj<typeof meta>

// Note: The BarcodeScanner component is a full-screen overlay.
// It supports both camera scanning (using BarcodeDetector API where available)
// and manual barcode entry.

export const Default: Story = {
  args: {
    onScan: (product) => console.log('Scanned product:', product),
    onCancel: () => console.log('Cancelled'),
  },
}
