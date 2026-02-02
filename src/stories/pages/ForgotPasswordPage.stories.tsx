import type { Meta, StoryObj } from '@storybook/react-vite'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'

const meta = {
  title: 'Pages/ForgotPasswordPage',
  component: ForgotPasswordPage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Password reset request form.',
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
} satisfies Meta<typeof ForgotPasswordPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

// Note: The success state (email sent confirmation) is shown after
// successful form submission. This would require mocking the auth context
// to demonstrate in Storybook.
