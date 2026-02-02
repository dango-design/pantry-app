import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsPage } from '@/pages/SettingsPage'

const meta = {
  title: 'Pages/SettingsPage',
  component: SettingsPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'User settings and preferences page.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

// Note: The page shows different user info based on auth context.
// In demo mode, it shows "User" with the demo email.
// With a real authenticated user, it shows their display name and email.
