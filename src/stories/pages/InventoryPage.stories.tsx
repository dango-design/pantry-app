import type { Meta, StoryObj } from '@storybook/react-vite'
import { InventoryPage } from '@/pages/InventoryPage'
import { useDemoStore } from '@/stores/demoStore'
import { useEffect } from 'react'

// Component to initialize demo store
function DemoStoreInitializer({ children }: { children: React.ReactNode }) {
  const { enableDemoMode, isDemoMode } = useDemoStore()

  useEffect(() => {
    if (!isDemoMode) {
      enableDemoMode()
    }
  }, [enableDemoMode, isDemoMode])

  return <>{children}</>
}

const meta = {
  title: 'Pages/InventoryPage',
  component: InventoryPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Main inventory page showing all pantry items with filtering and sorting.',
      },
    },
  },
  decorators: [
    (Story) => (
      <DemoStoreInitializer>
        <div className="max-w-lg mx-auto min-h-screen">
          <Story />
        </div>
      </DemoStoreInitializer>
    ),
  ],
} satisfies Meta<typeof InventoryPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}
