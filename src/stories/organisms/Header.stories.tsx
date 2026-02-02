import type { Meta, StoryObj } from '@storybook/react-vite'
import { Header } from '@/components/layout/Header'

const meta = {
  title: 'Organisms/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'App header with menu, title, search, and add actions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Header title',
    },
    showSearch: {
      control: 'boolean',
      description: 'Show search button',
    },
    showAdd: {
      control: 'boolean',
      description: 'Show add button',
    },
    onMenuClick: { action: 'menuClicked' },
    onSearchClick: { action: 'searchClicked' },
    onAddClick: { action: 'addClicked' },
  },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Pantry',
  },
}

export const ShoppingList: Story = {
  args: {
    title: 'Shopping List',
    showSearch: false,
  },
}

export const Settings: Story = {
  args: {
    title: 'Settings',
    showSearch: false,
    showAdd: false,
  },
}

export const CustomTitle: Story = {
  args: {
    title: 'My Custom Page',
  },
}

export const NoActions: Story = {
  args: {
    title: 'Simple Header',
    showSearch: false,
    showAdd: false,
  },
}
