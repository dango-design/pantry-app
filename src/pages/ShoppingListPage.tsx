import { useState, useMemo } from 'react'
import { Lightbulb, Trash2, Home } from 'lucide-react'
import { TabHeader, TabSearchField, pageContainer } from '@/components/layout'
import { Badge, Button } from '@/components/common'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { QuickAddToList } from '@/components/shopping'
import { ItemReviewList, type ReviewItem } from '@/components/smart-input'
import { useDemoStore, DEMO_HOUSEHOLD, DEMO_USER } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { formatQuantity } from '@/utils/mealPlan'
import { CATEGORIES } from '@/utils/constants'
import { todayDateString } from '@/utils/dates'
import { calculateFreshnessScore } from '@/utils/freshness'
import { estimateExpirationDate, getDefaultStorageLocation, lookupFood } from '@/utils/foodDatabase'
import { findStockedInPantry, isLowStock, isSameName } from '@/utils/pantryMatch'
import type { FoodCategory, FoodItem, ShoppingListItem } from '@/types'


function toReviewItem(item: ShoppingListItem): ReviewItem {
  const food = lookupFood(item.name)
  const category = item.category && item.category !== 'other' ? item.category : food?.category ?? 'other'
  const storageLocation = getDefaultStorageLocation(item.name, category)
  return {
    id: item.id,
    name: item.name,
    category,
    quantity: item.quantity || 1,
    quantityUnit: item.quantityUnit || food?.unit || 'count',
    storageLocation,
    expirationDate: estimateExpirationDate(item.name, category, storageLocation),
    selected: true,
  }
}

export function ShoppingListPage() {
  const {
    shoppingList,
    inventory,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    addItem: addInventoryItem,
  } = useDemoStore()

  const isDesktop = useIsDesktop()
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const query = searchQuery.trim().toLowerCase()

  // Suggest restocking items that are running low
  const suggestions = useMemo(() => {
    const activeItems = inventory.filter((item) => item.status === 'active')

    // Group by name: having a fresh one alongside an almost-empty one isn't low
    const byName = new Map<string, FoodItem[]>()
    for (const item of activeItems) {
      const key = item.name.toLowerCase()
      byName.set(key, [...(byName.get(key) || []), item])
    }

    // Filter out items already on the shopping list
    const existingNames = new Set(shoppingList.map((i) => i.name.toLowerCase()))
    return [...byName.entries()]
      .filter(([key, items]) => !existingNames.has(key) && items.every(isLowStock))
      .map(([, items]) => ({
        name: items[0].name,
        category: items[0].category,
        source: 'low_stock' as const,
        reason: 'low stock',
      }))
  }, [inventory, shoppingList])

  const handleAcceptSuggestion = (suggestion: { name: string; category: FoodCategory; source: 'low_stock' }) => {
    addShoppingItem({
      shoppingListId: 'demo-list',
      name: suggestion.name,
      category: suggestion.category,
      isChecked: false,
      source: suggestion.source,
      priority: 'normal',
    })
  }

  // Let the user confirm location and expiry for each checked item before adding
  const handleReviewChecked = () => {
    setReviewItems(shoppingList.filter((item) => item.isChecked).map(toReviewItem))
  }

  const handleAddReviewedToInventory = (items: ReviewItem[]) => {
    const purchaseDate = todayDateString()

    for (const item of items) {
      const expirationDate = item.expirationDate ||
        estimateExpirationDate(item.name, item.category, item.storageLocation)
      addInventoryItem({
        householdId: DEMO_HOUSEHOLD.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        originalQuantity: item.quantity,
        storageLocation: item.storageLocation,
        purchaseDate,
        expirationDate,
        expirationSource: item.expirationEdited ? 'manual' : 'calculated',
        freshnessScore: calculateFreshnessScore(purchaseDate, expirationDate),
        tags: [],
        addedBy: DEMO_USER.id,
        addedVia: 'manual',
        status: 'active',
      })
      // Only items that made it into the pantry leave the list
      removeShoppingItem(item.id)
    }

    setReviewItems(null)
  }

  // Search narrows both the list and the suggestions
  const visibleSuggestions = suggestions.filter((s) => !query || s.name.toLowerCase().includes(query))

  // Group items by category
  const groupedItems = useMemo(() => {
    const visible = query ? shoppingList.filter((item) => item.name.toLowerCase().includes(query)) : shoppingList
    return visible.reduce((acc, item) => {
      const category = item.category || 'other'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {} as Record<FoodCategory | 'other', typeof shoppingList>)
  }, [shoppingList, query])

  const checkedCount = shoppingList.filter((i) => i.isChecked).length

  const checkedSummary = `${checkedCount} item${checkedCount > 1 ? 's' : ''} checked`

  return (
    <div className="min-h-screen">
      <TabHeader
        title="Shopping list"
        width="regular"
        tool={<TabSearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search shopping list" />}
      >
        {/* Phones keep the add field in the sticky header; wider screens put it at the top of the list */}
        {!isDesktop && <QuickAddToList placeholder="Add to shopping list" />}
      </TabHeader>

      {/* Desktop: the list, with checked items and suggestions in a side column */}
      <div
        className={cn(
          pageContainer('regular'),
          'pt-2 pb-4 space-y-4 md:pt-6 md:pb-10 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8 lg:items-start',
          checkedCount > 0 && 'pb-24 md:pb-28 lg:pb-10'
        )}
      >
        {(checkedCount > 0 || visibleSuggestions.length > 0) && (
          <aside className="space-y-4 lg:order-last lg:sticky lg:top-28">
            {checkedCount > 0 && (
              <div className="hidden lg:block p-4 bg-white border border-gray-200 rounded-xl">
                <p className="text-sm text-gray-500 mb-3">{checkedSummary}</p>
                {/* Secondary so the + in the nav stays the only filled button on screen */}
                <Button variant="secondary" className="w-full" onClick={handleReviewChecked}>
                  Add to pantry
                </Button>
              </div>
            )}

            {/* Suggestions */}
            {visibleSuggestions.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Suggested ({visibleSuggestions.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {visibleSuggestions.slice(0, 5).map((suggestion, index) => (
                    <button
                      key={`${suggestion.name}-${index}`}
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="w-full flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-left hover:bg-yellow-100 transition-colors"
                    >
                      <div className="w-5 h-5 rounded border-2 border-dashed border-yellow-400" />
                      <span className="flex-1 text-gray-700">{suggestion.name}</span>
                      <Badge variant="warning" size="sm">
                        {suggestion.reason}
                      </Badge>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        )}

        <div className="space-y-4">
          {isDesktop && <QuickAddToList placeholder="Add to shopping list" />}

          {/* Items by category */}
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
            const categoryConfig = CATEGORIES[category as FoodCategory]
            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: categoryConfig?.color || '#6B7280' }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {categoryConfig?.label || category}
                  </span>
                </div>
                <div className="space-y-1">
                  {categoryItems.map((item) => {
                    // Flag list items that are still stocked at home (e.g. added from a recipe)
                    const atHome = item.isChecked ? undefined : findStockedInPantry(item.name, inventory)
                    return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg transition-colors',
                        item.isChecked && 'bg-gray-50'
                      )}
                    >
                      <button
                        onClick={() => toggleShoppingItem(item.id)}
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                          item.isChecked
                            ? 'bg-primary border-primary'
                            : 'border-gray-300 hover:border-gray-400'
                        )}
                      >
                        {item.isChecked && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>

                      <span
                        className={cn(
                          'flex-1',
                          item.isChecked && 'line-through text-gray-400'
                        )}
                      >
                        {item.name}
                        {item.quantity && (
                          <span className="text-gray-500">
                            {' '}({item.quantityUnit ? formatQuantity(item.quantity, item.quantityUnit) : item.quantity})
                          </span>
                        )}
                        {item.notes && (
                          <span className="block text-xs text-gray-400">{item.notes}</span>
                        )}
                        {atHome && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
                            <Home className="h-3 w-3 flex-shrink-0" />
                            {formatQuantity(atHome.quantity, atHome.quantityUnit)} at home
                            {!isSameName(atHome.name, item.name) && ` (${atHome.name})`}
                          </span>
                        )}
                      </span>

                      <button
                        onClick={() => removeShoppingItem(item.id)}
                        aria-label={`Remove ${item.name} from list`}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {/* Empty states */}
          {!query && shoppingList.length === 0 && suggestions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">Your shopping list is empty</p>
              <p className="text-sm">Add items above or accept suggestions</p>
            </div>
          )}
          {query && Object.keys(groupedItems).length === 0 && visibleSuggestions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">Nothing on your list matches "{searchQuery.trim()}"</p>
              <p className="text-sm">Add it with the field above</p>
            </div>
          )}
        </div>
      </div>

      {/* Phones and tablets: a bar over the bottom nav. Desktop shows this in the side column. */}
      {checkedCount > 0 && (
        <div className="lg:hidden fixed bottom-16 md:bottom-0 left-[var(--side-nav-width)] right-0 py-4 bg-white border-t border-gray-200">
          <div className={cn(pageContainer('regular'), 'flex items-center justify-between')}>
            <span className="text-sm text-gray-500">{checkedSummary}</span>
            {/* Secondary so the + in the nav stays the only filled button on screen */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleReviewChecked}
            >
              Add to pantry
            </Button>
          </div>
        </div>
      )}

      {/* Review checked items before adding to inventory */}
      {reviewItems && (
        <ItemReviewList
          items={reviewItems}
          onItemsChange={setReviewItems}
          onConfirm={handleAddReviewedToInventory}
          onCancel={() => setReviewItems(null)}
          title="Add to pantry"
          description="Check where each item goes and when it expires. Tap the pencil to change details."
        />
      )}
    </div>
  )
}
