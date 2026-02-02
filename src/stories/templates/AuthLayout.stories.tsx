import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShoppingBag } from 'lucide-react'
import { Card, CardContent, Button, Input } from '@/components/common'

// Recreate the AuthLayout inline since it uses Outlet
function AuthLayoutPreview({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 py-8">
        <ShoppingBag className="h-8 w-8 text-green-600" />
        <span className="text-2xl font-bold text-gray-900">Pantry</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 pt-8">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: 'Templates/AuthLayout',
  component: AuthLayoutPreview,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Centered layout with branding for authentication screens (login, signup, forgot password).',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AuthLayoutPreview>

export default meta
type Story = StoryObj<typeof meta>

// Sample login form
function SampleLoginForm() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
          Welcome back
        </h2>
        <div className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" />
          <Input label="Password" type="password" placeholder="••••••••" />
          <Button className="w-full">Sign in</Button>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <a href="#" className="text-blue-600 font-medium">Sign up</a>
        </p>
      </CardContent>
    </Card>
  )
}

// Sample signup form
function SampleSignupForm() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
          Create an account
        </h2>
        <div className="space-y-4">
          <Input label="Name" placeholder="Your name" />
          <Input label="Email" type="email" placeholder="you@example.com" />
          <Input label="Password" type="password" placeholder="••••••••" />
          <Button className="w-full">Sign up</Button>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <a href="#" className="text-blue-600 font-medium">Sign in</a>
        </p>
      </CardContent>
    </Card>
  )
}

// Sample forgot password form
function SampleForgotPasswordForm() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Reset password
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your email and we'll send you a reset link.
        </p>
        <div className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" />
          <Button className="w-full">Send reset link</Button>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          <a href="#" className="text-blue-600 font-medium">Back to sign in</a>
        </p>
      </CardContent>
    </Card>
  )
}

export const WithLoginForm: Story = {
  render: () => (
    <AuthLayoutPreview>
      <SampleLoginForm />
    </AuthLayoutPreview>
  ),
}

export const WithSignupForm: Story = {
  render: () => (
    <AuthLayoutPreview>
      <SampleSignupForm />
    </AuthLayoutPreview>
  ),
}

export const WithForgotPasswordForm: Story = {
  render: () => (
    <AuthLayoutPreview>
      <SampleForgotPasswordForm />
    </AuthLayoutPreview>
  ),
}
