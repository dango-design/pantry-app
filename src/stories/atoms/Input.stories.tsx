import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from '@/components/common/Input'

const meta = {
  title: 'Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Text input component with optional label, error, and hint states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label displayed above the input',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    error: {
      control: 'text',
      description: 'Error message displayed below the input',
    },
    hint: {
      control: 'text',
      description: 'Hint text displayed below the input (hidden when error is shown)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the input',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'date', 'tel'],
      description: 'Input type',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
    type: 'email',
  },
}

export const WithHint: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    hint: 'Must be at least 8 characters',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    value: 'Cannot edit this',
    disabled: true,
  },
}

export const NumberInput: Story = {
  args: {
    label: 'Quantity',
    type: 'number',
    placeholder: '0',
    min: 0,
    step: 1,
  },
}

export const DateInput: Story = {
  args: {
    label: 'Expiration Date',
    type: 'date',
  },
}

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-80">
      <Input placeholder="Default state" />
      <Input label="With Label" placeholder="Enter value..." />
      <Input label="With Hint" placeholder="Enter value..." hint="This is a helpful hint" />
      <Input label="With Error" value="Bad value" error="This field has an error" />
      <Input label="Disabled" value="Cannot edit" disabled />
    </div>
  ),
}
