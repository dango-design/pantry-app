import { Check } from 'lucide-react'
import { BottomSheet } from '@/components/common'
import { cn } from '@/utils/cn'
import { CATEGORIES, STORAGE_LOCATIONS } from '@/utils/constants'
import type { FoodCategory, StorageLocation } from '@/types'

// Expiration filter options
export type ExpirationFilter = 'all' | 'expired' | 'today' | 'week' | 'month'

export const EXPIRATION_OPTIONS: { key: ExpirationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expired', label: 'Expired' },
  { key: 'today', label: 'Expiring today' },
  { key: 'week', label: 'Within 7 days' },
  { key: 'month', label: 'Within 30 days' },
]

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  // Category filters
  selectedCategories: Set<FoodCategory | 'all'>
  onCategoryChange: (categories: Set<FoodCategory | 'all'>) => void
  // Location filters
  selectedLocations: Set<StorageLocation | 'all'>
  onLocationChange: (locations: Set<StorageLocation | 'all'>) => void
  // Expiration filter
  expirationFilter: ExpirationFilter
  onExpirationChange: (filter: ExpirationFilter) => void
  // Reset
  onReset: () => void
}

export function FilterSheet({
  open,
  onClose,
  selectedCategories,
  onCategoryChange,
  selectedLocations,
  onLocationChange,
  expirationFilter,
  onExpirationChange,
  onReset,
}: FilterSheetProps) {
  if (!open) return null

  const handleCategoryClick = (key: FoodCategory | 'all') => {
    const newSet = new Set(selectedCategories)
    if (key === 'all') {
      onCategoryChange(new Set(['all']))
    } else {
      newSet.delete('all')
      if (newSet.has(key)) {
        newSet.delete(key)
        if (newSet.size === 0) {
          onCategoryChange(new Set(['all']))
          return
        }
      } else {
        newSet.add(key)
      }
      onCategoryChange(newSet)
    }
  }

  const handleLocationClick = (key: StorageLocation | 'all') => {
    const newSet = new Set(selectedLocations)
    if (key === 'all') {
      onLocationChange(new Set(['all']))
    } else {
      newSet.delete('all')
      if (newSet.has(key)) {
        newSet.delete(key)
        if (newSet.size === 0) {
          onLocationChange(new Set(['all']))
          return
        }
      } else {
        newSet.add(key)
      }
      onLocationChange(newSet)
    }
  }

  const activeFilterCount =
    (selectedCategories.has('all') ? 0 : selectedCategories.size) +
    (selectedLocations.has('all') ? 0 : selectedLocations.size) +
    (expirationFilter === 'all' ? 0 : 1)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      headerAction={
        activeFilterCount > 0 && (
          <button onClick={onReset} className="text-sm text-primary font-medium">
            Reset
          </button>
        )
      }
      footer={
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
        >
          Apply filters
          {activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
      }
    >
      <div className="p-4 space-y-6">
        {/* Category Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Type of food</h3>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="All"
              selected={selectedCategories.has('all')}
              onClick={() => handleCategoryClick('all')}
            />
            {Object.entries(CATEGORIES).map(([key, config]) => (
              <FilterChip
                key={key}
                label={config.label}
                selected={selectedCategories.has(key as FoodCategory)}
                onClick={() => handleCategoryClick(key as FoodCategory)}
                color={config.color}
              />
            ))}
          </div>
        </div>

        {/* Location Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Location</h3>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="All"
              selected={selectedLocations.has('all')}
              onClick={() => handleLocationClick('all')}
            />
            {Object.entries(STORAGE_LOCATIONS).map(([key, config]) => (
              <FilterChip
                key={key}
                label={config.label}
                selected={selectedLocations.has(key as StorageLocation)}
                onClick={() => handleLocationClick(key as StorageLocation)}
              />
            ))}
          </div>
        </div>

        {/* Expiration Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Expiration</h3>
          <div className="space-y-1">
            {EXPIRATION_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => onExpirationChange(option.key)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-lg text-left',
                  expirationFilter === option.key
                    ? 'bg-primary-soft text-primary'
                    : 'hover:bg-gray-50 text-gray-700'
                )}
              >
                <span className="text-sm">{option.label}</span>
                {expirationFilter === option.key && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

interface FilterChipProps {
  label: string
  selected: boolean
  onClick: () => void
  color?: string
}

function FilterChip({ label, selected, onClick, color }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
        selected
          ? 'bg-primary text-white border-transparent'
          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
      )}
      // Category/location chips pass their own color; the rest use the primary token
      style={selected && color ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {label}
    </button>
  )
}
