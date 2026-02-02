import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CATEGORIES, STORAGE_LOCATIONS } from '@/utils/constants'
import type { FoodCategory, StorageLocation } from '@/types'

// Expiration filter options
export type ExpirationFilter = 'all' | 'expired' | 'today' | 'week' | 'month'

export const EXPIRATION_OPTIONS: { key: ExpirationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expired', label: 'Expired' },
  { key: 'today', label: 'Expiring Today' },
  { key: 'week', label: 'Within 7 Days' },
  { key: 'month', label: 'Within 30 Days' },
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
  const sheetRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)

  // Handle open/close animation
  useEffect(() => {
    if (open) {
      // Small delay to trigger animation
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
    }
  }, [open])

  // Touch handlers for swipe to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const diff = currentY - dragStartY.current
    // Only allow dragging down
    if (diff > 0) {
      setDragY(diff)
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    // If dragged more than 100px, close the sheet
    if (dragY > 100) {
      onClose()
    }
    setDragY(0)
  }

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
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden transition-transform duration-300 ease-out',
          isVisible && !isDragging ? 'translate-y-0' : ''
        )}
        style={{
          transform: isVisible
            ? `translateY(${isDragging ? dragY : 0}px)`
            : 'translateY(100%)',
        }}
      >
        {/* Handle - draggable area */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={onReset}
                className="text-sm text-purple-600 font-medium"
              >
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-6 max-h-[calc(85vh-100px)]">
          {/* Category Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Type of Food</h3>
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
                      ? 'bg-purple-50 text-purple-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <span className="text-sm">{option.label}</span>
                  {expirationFilter === option.key && (
                    <Check className="h-4 w-4 text-purple-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 safe-area-bottom">
          <button
            onClick={onClose}
            className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Apply Filters
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
        </div>
      </div>
    </div>
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
          ? 'text-white border-transparent'
          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
      )}
      style={selected ? {
        backgroundColor: color || '#8B5CF6',
        borderColor: color || '#8B5CF6'
      } : undefined}
    >
      {label}
    </button>
  )
}
