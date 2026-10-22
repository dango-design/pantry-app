import type { Meta, StoryObj } from '@storybook/react-vite'
import { BottomNav } from '@/components/layout/BottomNav'

const meta = {
  title: 'Organisms/BottomNav',
  component: BottomNav,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Bottom navigation bar with pantry, add button, and shopping cart.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    addOpen: false,
    onAddClick: () => {},
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-gray-100 relative">
        <div className="p-4">
          <p className="text-gray-400 text-xs">
            The bottom nav highlights the active route.
          </p>
        </div>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BottomNav>

export default meta
type Story = StoryObj<typeof meta>

export const OnHome: Story = {
  parameters: {
    reactRouter: { initialPath: '/' },
  },
}

export const OnInventory: Story = {
  parameters: {
    reactRouter: { initialPath: '/inventory' },
  },
}

export const OnShopping: Story = {
  parameters: {
    reactRouter: { initialPath: '/shopping' },
  },
}

export const OnRecipes: Story = {
  parameters: {
    reactRouter: { initialPath: '/recipes' },
  },
}

export const OnSettings: Story = {
  parameters: {
    reactRouter: { initialPath: '/settings' },
  },
}
