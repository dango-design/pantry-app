import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginPage } from '@/pages/LoginPage'

const meta = {
  title: 'Pages/LoginPage',
  component: LoginPage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Login page with demo mode option and email/password authentication.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LoginPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

// Note: Loading and error states are transient form states
// that are difficult to capture in static stories.
// The form uses react-hook-form with zod validation,
// so validation errors appear on field blur/submit.
