import type { Meta, StoryObj } from '@storybook/react-vite'
import { Spinner } from '@/components/common/Spinner'

const meta = {
  title: 'Atoms/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Loading spinner indicator in multiple sizes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    size: 'md',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="sm" />
        <span className="text-xs text-gray-500">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="md" />
        <span className="text-xs text-gray-500">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" />
        <span className="text-xs text-gray-500">Large</span>
      </div>
    </div>
  ),
}

export const CustomColor: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="text-primary" />
      <Spinner className="text-green-600" />
      <Spinner className="text-red-600" />
      <Spinner className="text-gray-600" />
    </div>
  ),
}

export const InContext: Story = {
  render: () => (
    <div className="space-y-4">
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg" disabled>
        <Spinner size="sm" className="text-white" />
        Loading...
      </button>
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-2 text-gray-500">Processing image...</p>
        </div>
      </div>
    </div>
  ),
}
