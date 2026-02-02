import type { Meta, StoryObj } from '@storybook/react-vite'
import { PhotoCapture } from '@/components/smart-input/PhotoCapture'

const meta = {
  title: 'Organisms/PhotoCapture',
  component: PhotoCapture,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full-screen camera interface for capturing photos of food items or receipts.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onCapture: { action: 'captured' },
    onCancel: { action: 'cancelled' },
    title: { control: 'text' },
  },
} satisfies Meta<typeof PhotoCapture>

export default meta
type Story = StoryObj<typeof meta>

// Note: The PhotoCapture component is a full-screen overlay that
// requires camera permissions. In Storybook, the camera may not
// work depending on the browser and permissions.

export const Default: Story = {
  args: {
    title: 'Take Photo',
    onCapture: (base64) => console.log('Captured image:', base64.substring(0, 50) + '...'),
    onCancel: () => console.log('Cancelled'),
  },
}

export const ScanGroceries: Story = {
  args: {
    title: 'Scan Groceries',
    onCapture: (base64) => console.log('Captured groceries image'),
    onCancel: () => console.log('Cancelled'),
  },
}

export const ScanReceipt: Story = {
  args: {
    title: 'Scan Receipt',
    onCapture: (base64) => console.log('Captured receipt image'),
    onCancel: () => console.log('Cancelled'),
  },
}
