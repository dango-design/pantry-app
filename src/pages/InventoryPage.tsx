import { useState, useMemo, useCallback } from 'react'
import { SlidersHorizontal, ArrowUpDown, Check } from 'lucide-react'
import {
  FoodItemCard,
  RunningLowSection,
  StapleSheet,
  emptyProduct,
  restoreStaple,
  shownCount,
  snapshotStock,
  useAddToList,
} from '@/components/inventory'
import { FilterSheet, type ExpirationFilter } from '@/components/inventory/FilterSheet'
import { TonightBanner } from '@/components/plan'
import { CARD_GRID, TabHeader, TabSearchField, pageContainer } from '@/components/layout'
import { Snackbar } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { getDaysUntilExpiration } from '@/utils/freshness'
import { getStock, groupByProduct } from '@/utils/stock'
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
  /** Goes up with each message, so a new message gets its own full time on screen */
  id: number
}

export function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<FoodCategory | 'all'>>(new Set(['all']))
  const [selectedLocations, setSelectedLocations] = useState<Set<StorageLocation | 'all'>>(new Set(['all']))
  const [expirationFilter, setExpirationFilter] = useState<ExpirationFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('expiration')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', id: 0 })
  // The product whose "Keep in stock" sheet is open
  const [stapleName, setStapleName] = useState<string | null>(null)

  const { inventory, staples, adjustStock } = useDemoStore()

  const showSnackbar = useCallback((message: string, undoAction?: () => void) => {
    setSnackbar((prev) => ({ open: true, message, undoAction, id: prev.id + 1 }))
  }, [])
  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ open: false, message: '', id: prev.id }))
  }, [])

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

  // "Mark used" on a card: the whole product goes to zero. The rows are
  // remembered first, so undo puts back exactly what was there.
  const handleMarkUsed = useCallback((item: FoodItem) => {
    const restore = snapshotStock(item.name)
    emptyProduct(item.name)
    showSnackbar(`${item.name} removed from pantry`, restore)
  }, [showSnackbar])

  // -1 / +1 on a card. No message unless that was the last one: then offer undo.
  const handleAdjust = useCallback((item: FoodItem, delta: 1 | -1) => {
    const restore = snapshotStock(item.name)
    adjustStock(item.name, delta)
    const after = useDemoStore.getState()
    if (shownCount(getStock(item.name, after.inventory, after.staples)) <= 0) {
      showSnackbar(`You are out of ${item.name}`, restore)
    }
  }, [adjustStock, showSnackbar])

  // Cart action on a card: asks first when the product is still in stock
  const { requestAdd, sheet: addToListSheet } = useAddToList(({ message, undo }) => {
    showSnackbar(message, undo)
  })

  // One entry per product that has something in the pantry. A staple that is
  // out shows in "Out and running low" only. That includes one whose estimate
  // has reached zero while its rows still hold the last count.
  const products = useMemo(() => {
    return groupByProduct(inventory, staples).filter(
      (stock) => stock.items.length > 0 && !(stock.staple && stock.status === 'out')
    )
  }, [inventory, staples])

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

  // Filter and sort the products. `items[0]` is a product's soonest-expiring
  // row, so expiry filters and sorting go by that one.
  const filteredProducts = useMemo(() => {
    let list = products

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      list = list.filter((stock) =>
        stock.name.toLowerCase().includes(query) ||
        stock.items.some((item) => item.name.toLowerCase().includes(query))
      )
    }

    // Category filter (multi-select)
    if (!selectedCategories.has('all')) {
      list = list.filter((stock) => selectedCategories.has(stock.items[0].category))
    }

    // Location filter (multi-select): a product matches when any of its rows is there
    if (!selectedLocations.has('all')) {
      list = list.filter((stock) => stock.items.some((item) => selectedLocations.has(item.storageLocation)))
    }

    // Expiration filter
    if (expirationFilter !== 'all') {
      list = list.filter((stock) => {
        const days = getDaysUntilExpiration(stock.items[0].expirationDate)
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

    // Sort a copy, so the list from groupByProduct keeps its order
    return [...list].sort((a, b) => {
      const rowA = a.items[0]
      const rowB = b.items[0]
      switch (sortBy) {
        case 'expiration':
          return getDaysUntilExpiration(rowA.expirationDate) - getDaysUntilExpiration(rowB.expirationDate)
        case 'category':
          return rowA.category.localeCompare(rowB.category)
        case 'location':
          return rowA.storageLocation.localeCompare(rowB.storageLocation)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
  }, [products, selectedCategories, selectedLocations, expirationFilter, searchQuery, sortBy])

  // The "Out and running low" section only shows on the plain, unfiltered pantry
  const isBrowsing = searchQuery.trim() === '' && activeFilterCount === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <TabHeader
        title="Pantry"
        tool={<TabSearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search pantry" />}
      >
        {/* Filter, Sort, and chips row. Top-aligned so the icons sit with the first row when chips wrap. */}
        <div className="flex items-center gap-2 md:items-start">
          {/* Filter icon */}
          <button
            onClick={() => setShowFilterSheet(true)}
            aria-label="Filters"
            title="Filters"
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
              aria-label="Sort"
              title="Sort"
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

          {/* Category chips: a sideways-scrolling strip on phones, wrapping rows on wider screens */}
          <div className="flex-1 overflow-x-auto scrollbar-hide -mr-4 pr-4 md:mr-0 md:pr-0 md:overflow-visible">
            <div className="flex gap-2 w-max md:w-auto md:flex-wrap">
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
      </TabHeader>

      {/* Content: one column of cards on phones, a grid on wider screens */}
      <div className={cn(pageContainer('wide'), 'pt-2 pb-6 space-y-2 md:pt-6 md:pb-10 md:space-y-3')}>
        <TonightBanner />

        {isBrowsing && <RunningLowSection onOpenStaple={setStapleName} onNotify={showSnackbar} />}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium mb-1">No items found</p>
            <p className="text-sm">
              {searchQuery ? 'Try a different search' : 'Add items to get started'}
            </p>
          </div>
        ) : (
          <div className={CARD_GRID}>
            {filteredProducts.map((stock) => (
              <FoodItemCard
                key={stock.key}
                item={stock.items[0]}
                stock={stock}
                onMarkUsed={handleMarkUsed}
                onAddToCart={requestAdd}
                onAdjust={handleAdjust}
              />
            ))}
          </div>
        )}
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

      {/* "Keep in stock" sheet, opened from the "Out and running low" section */}
      {stapleName && (
        <StapleSheet
          key={stapleName}
          name={stapleName}
          onClose={() => setStapleName(null)}
          onRemoved={(staple) =>
            showSnackbar(`Stopped keeping ${staple.name} in stock`, () => restoreStaple(staple))
          }
        />
      )}

      {/* Snackbar */}
      <Snackbar
        key={snackbar.id}
        open={snackbar.open}
        message={snackbar.message}
        onClose={closeSnackbar}
        onUndo={snackbar.undoAction}
      />
    </div>
  )
}
