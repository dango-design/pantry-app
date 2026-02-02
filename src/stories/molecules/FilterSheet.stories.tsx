import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FilterSheet, type ExpirationFilter } from '@/components/inventory/FilterSheet'
import { Button } from '@/components/common'
import type { FoodCategory, StorageLocation } from '@/types'

const meta = {
  title: 'Molecules/FilterSheet',
  component: FilterSheet,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Bottom sheet for filtering inventory by category, location, and expiration.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FilterSheet>

export default meta
type Story = StoryObj<typeof meta>

// Interactive wrapper
function FilterSheetDemo({
  initialCategories = new Set<FoodCategory | 'all'>(['all']),
  initialLocations = new Set<StorageLocation | 'all'>(['all']),
  initialExpiration = 'all' as ExpirationFilter,
  startOpen = false,
}: {
  initialCategories?: Set<FoodCategory | 'all'>
  initialLocations?: Set<StorageLocation | 'all'>
  initialExpiration?: ExpirationFilter
  startOpen?: boolean
}) {
  const [open, setOpen] = useState(startOpen)
  const [categories, setCategories] = useState(initialCategories)
  const [locations, setLocations] = useState(initialLocations)
  const [expiration, setExpiration] = useState(initialExpiration)

  const handleReset = () => {
    setCategories(new Set(['all']))
    setLocations(new Set(['all']))
    setExpiration('all')
  }

  const activeCount =
    (categories.has('all') ? 0 : categories.size) +
    (locations.has('all') ? 0 : locations.size) +
    (expiration === 'all' ? 0 : 1)

  return (
    <div className="min-h-[600px] bg-gray-100 p-4">
      <Button onClick={() => setOpen(true)}>
        Open Filters {activeCount > 0 && `(${activeCount} active)`}
      </Button>
      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        selectedCategories={categories}
        onCategoryChange={setCategories}
        selectedLocations={locations}
        onLocationChange={setLocations}
        expirationFilter={expiration}
        onExpirationChange={setExpiration}
        onReset={handleReset}
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <FilterSheetDemo startOpen={true} />,
}

export const WithFiltersApplied: Story = {
  render: () => (
    <FilterSheetDemo
      startOpen={true}
      initialCategories={new Set(['dairy', 'produce'] as (FoodCategory | 'all')[])}
      initialLocations={new Set(['refrigerator'] as (StorageLocation | 'all')[])}
      initialExpiration="week"
    />
  ),
}

export const Interactive: Story = {
  render: () => <FilterSheetDemo startOpen={false} />,
}

export const CategoryFiltersOnly: Story = {
  render: () => (
    <FilterSheetDemo
      startOpen={true}
      initialCategories={new Set(['meat', 'seafood', 'frozen'] as (FoodCategory | 'all')[])}
    />
  ),
}

export const ExpirationFilterOnly: Story = {
  render: () => (
    <FilterSheetDemo
      startOpen={true}
      initialExpiration="today"
    />
  ),
}
