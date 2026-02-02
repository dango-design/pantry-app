import type { Meta, StoryObj } from '@storybook/react-vite'
import { SignupPage } from '@/pages/SignupPage'

const meta = {
  title: 'Pages/SignupPage',
  component: SignupPage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Account creation page with form validation.',
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
} satisfies Meta<typeof SignupPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

// Note: The success state (email confirmation message) is shown after
// successful form submission. This would require mocking the auth context
// to demonstrate in Storybook.
