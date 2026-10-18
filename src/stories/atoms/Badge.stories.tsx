import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@/components/common/Badge'

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Small status indicator badges with color variants.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default',
    variant: 'default',
  },
}

export const Success: Story = {
  args: {
    children: 'Fresh',
    variant: 'success',
  },
}

export const Warning: Story = {
  args: {
    children: 'Expiring Soon',
    variant: 'warning',
  },
}

export const Danger: Story = {
  args: {
    children: 'Expired',
    variant: 'danger',
  },
}

export const Info: Story = {
  args: {
    children: '5 items',
    variant: 'info',
  },
}

export const Small: Story = {
  args: {
    children: 'SM',
    size: 'sm',
  },
}

export const AllVariants: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
}

export const AllSizes: StoryObj = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm" variant="info">Small</Badge>
      <Badge size="md" variant="info">Medium</Badge>
    </div>
  ),
}

export const UseCases: StoryObj = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-700">Freshness Status:</span>
        <Badge variant="success">Fresh</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-700">Expiration Warning:</span>
        <Badge variant="warning">2 days left</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-700">Item Count:</span>
        <Badge variant="info">12 items</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-700">Status:</span>
        <Badge variant="danger">Expired</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-700">Category:</span>
        <Badge variant="default">Dairy</Badge>
      </div>
    </div>
  ),
}
