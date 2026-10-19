import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, ArrowUpDown, Check, Settings } from 'lucide-react'
import { FoodItemCard, useAddToList } from '@/components/inventory'
import { FilterSheet, type ExpirationFilter } from '@/components/inventory/FilterSheet'
import { TonightBanner } from '@/components/plan'
import { Snackbar } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { getDaysUntilExpiration } from '@/utils/freshness'
import type { FoodCategory, StorageLocation, FoodItem } from '@/types'

// Category chips configuration
const CATEGORY_CHIPS: { key: FoodCategory | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#6B7280' },
  { key: 'produce', label: 'Produce', color: '#22C55E' },
  { key: 'dairy', label: 'Dairy', color: '#3B82F6' },
  { key: 'meat', label: 'Meat', color: '#EF4444' },
  { key: 'pantry', label: 'Shelf', color: '#8B5CF6' },
  { key: 'frozen', label: 'Frozen', color: '#6366F1' },
  { key: 'bakery', label: 'Bakery', color: '#F59E0B' },
  { key: 'beverages', label: 'Drinks', color: '#06B6D4' },
  { key: 'condiments', label: 'Condiments', color: '#EC4899' },
  { key: 'snacks', label: 'Snacks', color: '#F97316' },
]

// Sort options
type SortOption = 'expiration' | 'category' | 'location' | 'name'
const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'expiration', label: 'Expiration date' },
  { key: 'category', label: 'Type of food' },
  { key: 'location', label: 'Location' },
  { key: 'name', label: 'Name' },
]

// Snackbar state type
interface SnackbarState {
  open: boolean
  message: string
  undoAction?: () => void
}

export function InventoryPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<FoodCategory | 'all'>>(new Set(['all']))
  const [selectedLocations, setSelectedLocations] = useState<Set<StorageLocation | 'all'>>(new Set(['all']))
  const [expirationFilter, setExpirationFilter] = useState<ExpirationFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('expiration')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '' })

  const { inventory, consumeItem, updateItem } = useDemoStore()

  // Count active filters for badge
  const activeFilterCount =
    (selectedCategories.has('all') ? 0 : selectedCategories.size) +
    (selectedLocations.has('all') ? 0 : selectedLocations.size) +
    (expirationFilter === 'all' ? 0 : 1)

  const handleResetFilters = () => {
    setSelectedCategories(new Set(['all']))
    setSelectedLocations(new Set(['all']))
    setExpirationFilter('all')
  }

  // Handle marking an item as used
  const handleMarkUsed = useCallback((item: FoodItem) => {
    const previousQuantity = item.quantity
    consumeItem(item.id, item.quantity) // Sets quantity to 0

    setSnackbar({
      open: true,
      message: `${item.name} removed from pantry`,
      undoAction: () => {
        updateItem(item.id, { quantity: previousQuantity, status: 'active', consumedAt: undefined })
      },
    })
  }, [consumeItem, updateItem])

  // Cart action on a card: asks first when the item is still in stock
  const { requestAdd, sheet: addToListSheet } = useAddToList(({ message, undo }) => {
    setSnackbar({ open: true, message, undoAction: undo })
  })

  // Filter active items
  const activeItems = useMemo(() => {
    return inventory.filter((item) => item.status === 'active')
  }, [inventory])

  const handleChipClick = (categoryKey: FoodCategory | 'all') => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev)

      if (categoryKey === 'all') {
        // If clicking "All", clear everything and select only "All"
        return new Set(['all'])
      }

      // Remove "all" if selecting a specific category
      newSet.delete('all')

      if (newSet.has(categoryKey)) {
        // Deselect this category
        newSet.delete(categoryKey)
        // If nothing is selected, select "All"
        if (newSet.size === 0) {
          return new Set(['all'])
        }
      } else {
        // Select this category
        newSet.add(categoryKey)
      }

      return newSet
    })
  }

  // Filter and sort inventory
  const filteredInventory = useMemo(() => {
    let items = activeItems

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter((item) => item.name.toLowerCase().includes(query))
    }

    // Category filter (multi-select)
    if (!selectedCategories.has('all')) {
      items = items.filter((item) => selectedCategories.has(item.category))
    }

    // Location filter (multi-select)
    if (!selectedLocations.has('all')) {
      items = items.filter((item) => selectedLocations.has(item.storageLocation))
    }

    // Expiration filter
    if (expirationFilter !== 'all') {
      items = items.filter((item) => {
        const days = getDaysUntilExpiration(item.expirationDate)
        switch (expirationFilter) {
          case 'expired':
            return days < 0
          case 'today':
            return days === 0
          case 'week':
            return days >= 0 && days <= 7
          case 'month':
            return days >= 0 && days <= 30
          default:
            return true
        }
      })
    }

    // Sort
    return items.sort((a, b) => {
      switch (sortBy) {
        case 'expiration':
          return getDaysUntilExpiration(a.expirationDate) - getDaysUntilExpiration(b.expirationDate)
        case 'category':
          return a.category.localeCompare(b.category)
        case 'location':
          return a.storageLocation.localeCompare(b.storageLocation)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
  }, [activeItems, selectedCategories, selectedLocations, expirationFilter, searchQuery, sortBy])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Responsive container */}
      <div className="max-w-lg mx-auto pb-24">
        {/* Header with Search Bar */}
        <header className="sticky top-0 z-40 bg-white px-4 pt-4 pb-3">
          {/* Search row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search pantry"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          {/* Filter, Sort, and chips row */}
          <div className="flex items-center gap-2 mt-3">
            {/* Filter icon */}
            <button
              onClick={() => setShowFilterSheet(true)}
              className="relative w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>

              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setSortBy(option.key)
                          setShowSortMenu(false)
                        }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50',
                          sortBy === option.key && 'text-primary'
                        )}
                      >
                        {option.label}
                        {sortBy === option.key && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Category chips - scrollable container */}
            <div className="flex-1 overflow-x-auto scrollbar-hide -mr-4 pr-4">
              <div className="flex gap-2 w-max">
                {CATEGORY_CHIPS.map((chip) => {
                  const isSelected = selectedCategories.has(chip.key)
                  return (
                    <button
                      key={chip.key}
                      onClick={() => handleChipClick(chip.key)}
                      className={cn(
                        'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                        isSelected
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      )}
                      style={isSelected ? { backgroundColor: chip.color, borderColor: chip.color } : undefined}
                    >
                      {chip.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 pt-2 space-y-2">
          <TonightBanner />

          {filteredInventory.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg font-medium mb-1">No items found</p>
              <p className="text-sm">
                {searchQuery ? 'Try a different search' : 'Add items to get started'}
              </p>
            </div>
          ) : (
            filteredInventory.map((item) => (
              <FoodItemCard
                key={item.id}
                item={item}
                onMarkUsed={handleMarkUsed}
                onAddToCart={requestAdd}
              />
            ))
          )}
        </div>
      </div>

      {/* Filter Sheet */}
      <FilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        selectedCategories={selectedCategories}
        onCategoryChange={setSelectedCategories}
        selectedLocations={selectedLocations}
        onLocationChange={setSelectedLocations}
        expirationFilter={expirationFilter}
        onExpirationChange={setExpirationFilter}
        onReset={handleResetFilters}
      />

      {/* "You still have …" confirmation for the cart action */}
      {addToListSheet}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
        onUndo={snackbar.undoAction}
      />
    </div>
  )
}
