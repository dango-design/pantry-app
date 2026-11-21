import { useCallback, useMemo, useState } from 'react'
import { Lightbulb, Plus, ShoppingCart } from 'lucide-react'
import { TabHeader, TabSearchField, pageContainer } from '@/components/layout'
import { Button, Snackbar } from '@/components/common'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { QuickAddToList } from '@/components/shopping'
import { ShoppingRow } from '@/components/shopping/list/ShoppingRow'
import { toReviewItem } from '@/components/shopping/list/putAway'
import { getStapleHint } from '@/components/shopping/list/stockHint'
import { ItemReviewList, type ReviewItem } from '@/components/smart-input'
import { useDemoStore, DEMO_HOUSEHOLD, DEMO_USER } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { formatQuantity } from '@/utils/mealPlan'
import { CATEGORIES } from '@/utils/constants'
import { todayDateString } from '@/utils/dates'
import { calculateFreshnessScore } from '@/utils/freshness'
import { estimateExpirationDate } from '@/utils/foodDatabase'
import { findStockedInPantry } from '@/utils/pantryMatch'
import { findStaple, getProductMemory, getRestockSuggestions, getStock, type RestockSuggestion } from '@/utils/stock'
import type { FoodCategory, ShoppingListItem } from '@/types'

// The message shown after a row is removed, with what Undo does
interface RemovalNotice {
  /** Changes with each removal, so the snackbar starts its timer again */
  id: number
  message: string
  undo: () => void
}

export function ShoppingListPage() {
  const {
    shoppingList,
    inventory,
    staples,
    addShoppingItem,
    updateShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    updateStaple,
    addItem: addInventoryItem,
  } = useDemoStore()

  const isDesktop = useIsDesktop()
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [removal, setRemoval] = useState<RemovalNotice | null>(null)
  const query = searchQuery.trim().toLowerCase()

  // What to buy again: staples that are low or out, other products that are
  // low, and products used up lately that are no longer in the pantry
  const suggestions = useMemo(
    () => getRestockSuggestions(inventory, staples, shoppingList),
    [inventory, staples, shoppingList]
  )

  const handleAcceptSuggestion = (suggestion: RestockSuggestion) => {
    addShoppingItem({
      shoppingListId: 'demo-list',
      name: suggestion.name,
      category: suggestion.category,
      quantity: suggestion.quantity,
      quantityUnit: suggestion.unit,
      isChecked: false,
      source: 'low_stock',
      priority: 'normal',
    })
  }

  // Remove a row and offer Undo
  const handleRemove = (item: ShoppingListItem) => {
    // Removing an unchecked, auto-added item of a low staple makes the store
    // hold off adding it again (it sets the staple's `skippedAt`). Work that
    // out before removing, so the message can say so and Undo can put it back.
    const staple = item.source === 'low_stock' && !item.isChecked ? findStaple(item.name, staples) : undefined
    const heldStaple = staple && getStock(item.name, inventory, staples).status !== 'ok' ? staple : undefined
    const skippedBefore = heldStaple?.skippedAt

    removeShoppingItem(item.id)

    setRemoval({
      id: Date.now(),
      message: heldStaple
        ? `${item.name} removed. It will not be added again until you restock.`
        : `${item.name} removed from list`,
      undo: () => {
        // The store gives the item a new id and puts it last in the list
        addShoppingItem(item)
        if (heldStaple) updateStaple(heldStaple.id, { skippedAt: skippedBefore })
      },
    })
  }

  // The snackbar restarts its timer when this function changes, so it only
  // changes with the notice. It closes only its own notice: the snackbar calls
  // this a moment after it fades, and a newer notice may be showing by then.
  const removalId = removal?.id
  const closeRemoval = useCallback(
    () => setRemoval((current) => (current?.id === removalId ? null : current)),
    [removalId]
  )

  // Let the user confirm location and expiry for each checked item before adding
  const handleReviewChecked = () => {
    // Products bought before go where they went last time
    const memory = getProductMemory(inventory, staples)
    setReviewItems(shoppingList.filter((item) => item.isChecked).map((item) => toReviewItem(item, memory)))
  }

  const handleAddReviewedToInventory = (items: ReviewItem[]) => {
    const purchaseDate = todayDateString()

    for (const item of items) {
      const expirationDate = item.expirationDate ||
        estimateExpirationDate(item.name, item.category, item.storageLocation)
      addInventoryItem({
        householdId: DEMO_HOUSEHOLD.id,
        name: item.name,
        brand: item.brand,
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

  const visibleItems = useMemo(
    () => (query ? shoppingList.filter((item) => item.name.toLowerCase().includes(query)) : shoppingList),
    [shoppingList, query]
  )

  // Items still to buy, grouped by category
  const groupedItems = useMemo(() => {
    return visibleItems
      .filter((item) => !item.isChecked)
      .reduce((acc, item) => {
        const category = item.category || 'other'
        if (!acc[category]) acc[category] = []
        acc[category].push(item)
        return acc
      }, {} as Record<FoodCategory | 'other', ShoppingListItem[]>)
  }, [visibleItems])

  // Checked items leave their category and collect in one group, the most
  // recently checked first. Items with no check time go last.
  const cartItems = useMemo(() => {
    return visibleItems
      .filter((item) => item.isChecked)
      .sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''))
  }, [visibleItems])

  const checkedCount = shoppingList.filter((i) => i.isChecked).length

  const checkedSummary = `${checkedCount} item${checkedCount > 1 ? 's' : ''} in the cart`

  const renderRow = (item: ShoppingListItem) => {
    // A staple shows its estimated count. Other items get flagged when they
    // are still stocked at home (e.g. added from a recipe).
    const stapleHint = item.isChecked ? undefined : getStapleHint(item.name, inventory, staples)
    const atHome = item.isChecked || stapleHint ? undefined : findStockedInPantry(item.name, inventory)
    return (
      <ShoppingRow
        key={item.id}
        item={item}
        stapleHint={stapleHint}
        atHome={atHome}
        onToggle={() => toggleShoppingItem(item.id)}
        onQuantityChange={(quantity) => updateShoppingItem(item.id, { quantity })}
        onRemove={() => handleRemove(item)}
      />
    )
  }

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
                  {visibleSuggestions.slice(0, 5).map((suggestion) => (
                    <button
                      key={suggestion.name}
                      type="button"
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      aria-label={`Add ${suggestion.name} to shopping list. ${suggestion.detail}`}
                      className="w-full flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-left hover:bg-yellow-100 transition-colors"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-gray-700 break-words">
                          {suggestion.name}
                          {suggestion.quantity !== undefined && suggestion.quantity > 0 && (
                            <span className="text-gray-500">
                              {' '}({suggestion.unit
                                ? formatQuantity(suggestion.quantity, suggestion.unit)
                                : suggestion.quantity})
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            'block text-xs',
                            suggestion.reason === 'out' ? 'text-red-700' : 'text-amber-700'
                          )}
                        >
                          {suggestion.detail}
                        </span>
                      </span>
                      <Plus className="h-4 w-4 flex-shrink-0 text-yellow-700" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        )}

        <div className="space-y-4">
          {isDesktop && <QuickAddToList placeholder="Add to shopping list" />}

          {/* Items still to buy, by category */}
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
                <div className="space-y-1">{categoryItems.map(renderRow)}</div>
              </section>
            )
          })}

          {/* Checked items, most recently checked first */}
          {cartItems.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700">In the cart ({cartItems.length})</span>
              </div>
              <div className="space-y-1">{cartItems.map(renderRow)}</div>
            </section>
          )}

          {/* Empty states */}
          {!query && shoppingList.length === 0 && suggestions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">Your shopping list is empty</p>
              <p className="text-sm">Add items above or accept suggestions</p>
            </div>
          )}
          {query && visibleItems.length === 0 && visibleSuggestions.length === 0 && (
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

      {/* Shown after a row is removed. Sits above the "Add to pantry" bar when that bar is showing. */}
      <Snackbar
        key={removal?.id}
        open={removal !== null}
        message={removal?.message ?? ''}
        onClose={closeRemoval}
        onUndo={removal?.undo}
        className={checkedCount > 0 ? 'bottom-36 md:bottom-24 lg:bottom-6' : undefined}
      />
    </div>
  )
}
