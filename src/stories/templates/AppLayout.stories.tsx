import type { Meta, StoryObj } from '@storybook/react-vite'
import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'

// Recreate the AppLayout component inline since it uses Outlet
function AppLayoutPreview({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-20 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

// Sample content component
function SampleContent({ title }: { title: string }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{title}</h1>
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-gray-600">This is sample content inside the AppLayout.</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-gray-600">The bottom navigation stays fixed at the bottom.</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-gray-600">Content scrolls independently of the navigation.</p>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: 'Templates/AppLayout',
  component: AppLayoutPreview,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Main app shell with bottom navigation. Used for all authenticated screens.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppLayoutPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    reactRouter: { initialPath: '/' },
  },
  render: () => (
    <AppLayoutPreview>
      <SampleContent title="Home" />
    </AppLayoutPreview>
  ),
}

export const OnInventoryPage: Story = {
  parameters: {
    reactRouter: { initialPath: '/inventory' },
  },
  render: () => (
    <AppLayoutPreview>
      <SampleContent title="Inventory" />
    </AppLayoutPreview>
  ),
}

export const OnShoppingPage: Story = {
  parameters: {
    reactRouter: { initialPath: '/shopping' },
  },
  render: () => (
    <AppLayoutPreview>
      <SampleContent title="Shopping List" />
    </AppLayoutPreview>
  ),
}

export const OnRecipesPage: Story = {
  parameters: {
    reactRouter: { initialPath: '/recipes' },
  },
  render: () => (
    <AppLayoutPreview>
      <SampleContent title="Recipes" />
    </AppLayoutPreview>
  ),
}

export const OnSettingsPage: Story = {
  parameters: {
    reactRouter: { initialPath: '/settings' },
  },
  render: () => (
    <AppLayoutPreview>
      <SampleContent title="Settings" />
    </AppLayoutPreview>
  ),
}

// Long scrolling content
function LongContent() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Scrolling Content</h1>
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-gray-600">Item {i + 1} - Scroll to see more content</p>
        </div>
      ))}
    </div>
  )
}

export const WithScrollingContent: Story = {
  parameters: {
    reactRouter: { initialPath: '/' },
  },
  render: () => (
    <AppLayoutPreview>
      <LongContent />
    </AppLayoutPreview>
  ),
}
