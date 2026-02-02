import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/common/Card'
import { Button } from '@/components/common/Button'

const meta = {
  title: 'Atoms/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Container card component with optional header and footer sections.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '350px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <CardContent>
        <p className="text-gray-600">This is a basic card with content.</p>
      </CardContent>
    ),
  },
}

export const WithHeader: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Card Title</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Card content goes here.</p>
        </CardContent>
      </>
    ),
  },
}

export const WithHeaderAndFooter: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Settings</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Update your account settings and preferences.</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">Cancel</Button>
          <Button size="sm">Save</Button>
        </CardFooter>
      </>
    ),
  },
}

export const ProfileCard: Story = {
  args: {
    children: (
      <CardContent className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold">JD</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">John Doe</p>
          <p className="text-sm text-gray-500">john@example.com</p>
        </div>
      </CardContent>
    ),
  },
}

export const InfoCard: Story = {
  args: {
    className: 'bg-blue-50 border-blue-200',
    children: (
      <CardContent>
        <p className="text-blue-800 text-sm">
          Tip: You can add items to your pantry by scanning barcodes or taking photos of your groceries.
        </p>
      </CardContent>
    ),
  },
}

export const AllVariations: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Card>
        <CardContent>
          <p className="text-gray-600">Simple content card</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">With Header</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Card with header section</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">Full Card</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Card with all sections</p>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Action</Button>
        </CardFooter>
      </Card>
    </div>
  ),
}
