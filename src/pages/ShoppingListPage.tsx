import { useState, useMemo } from 'react'
import { Plus, Lightbulb, Trash2, Info, Home } from 'lucide-react'
import { Header } from '@/components/layout'
import { Input, Badge, Button } from '@/components/common'
import { ItemReviewList, type ReviewItem } from '@/components/smart-input'
import { useDemoStore, DEMO_HOUSEHOLD, DEMO_USER } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { formatQuantity } from '@/utils/mealPlan'
import { CATEGORIES } from '@/utils/constants'
import { todayDateString } from '@/utils/dates'
import { calculateFreshnessScore } from '@/utils/freshness'
import { estimateExpirationDate, getDefaultStorageLocation, lookupFood } from '@/utils/foodDatabase'
import { describeStock, findInPantry, isLowStock, isSameName } from '@/utils/pantryMatch'
import type { FoodCategory, FoodItem, ShoppingListItem } from '@/types'

// Shown under the add field instead of adding right away. Adding the same
// name again (Enter or "Add anyway") goes through.
type AddNote =
  | { kind: 'in_pantry'; name: string; item: FoodItem }
  | { kind: 'on_list'; name: string }

// A pantry item that's in stock and not running low: worth flagging before buying more
function stockedInPantry(name: string, inventory: FoodItem[]): FoodItem | undefined {
  const match = findInPantry(name, inventory)
  return match && !isLowStock(match) ? match : undefined
}

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

  const [newItemName, setNewItemName] = useState('')
  const [addNote, setAddNote] = useState<AddNote | null>(null)
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null)

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

  const handleAddItem = () => {
    const name = newItemName.trim()
    if (!name) return

    // First try: point out duplicates and items already at home. Once the note
    // is showing for this name, adding again goes through.
    if (addNote?.name !== name) {
      if (shoppingList.some((item) => !item.isChecked && isSameName(item.name, name))) {
        setAddNote({ kind: 'on_list', name })
        return
      }
      const stocked = stockedInPantry(name, inventory)
      if (stocked) {
        setAddNote({ kind: 'in_pantry', name, item: stocked })
        return
      }
    }

    setAddNote(null)
    addShoppingItem({
      shoppingListId: 'demo-list',
      name,
      category: lookupFood(name)?.category ?? 'other',
      isChecked: false,
      source: 'manual',
      priority: 'normal',
    })
    setNewItemName('')
  }

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

  // Group items by category
  const groupedItems = useMemo(() => {
    return shoppingList.reduce((acc, item) => {
      const category = item.category || 'other'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {} as Record<FoodCategory | 'other', typeof shoppingList>)
  }, [shoppingList])

  const checkedCount = shoppingList.filter((i) => i.isChecked).length

  return (
    <div className="min-h-screen pb-24">
      <Header
        title="Shopping list"
        showSearch={false}
        showAdd={false}
      />

      <div className="p-4 space-y-4">
        {/* Add item input */}
        <div>
          <div className="flex gap-2">
            <Input
              placeholder="Add item..."
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value)
                setAddNote(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <button
              onClick={handleAddItem}
              aria-label="Add to list"
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {addNote && (
            <div role="status" className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-900">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-700" />
              <div className="flex-1 min-w-0">
                {addNote.kind === 'on_list' ? (
                  <p>Already on your list</p>
                ) : (
                  <>
                    <p>You have {addNote.item.name} at home</p>
                    <p className="text-xs text-amber-800">{describeStock(addNote.item)}</p>
                  </>
                )}
              </div>
              <button onClick={handleAddItem} className="flex-shrink-0 font-medium underline underline-offset-2 hover:text-amber-950">
                Add anyway
              </button>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">
                Suggested ({suggestions.length})
              </span>
            </div>
            <div className="space-y-1">
              {suggestions.slice(0, 5).map((suggestion, index) => (
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
                  const atHome = item.isChecked ? undefined : stockedInPantry(item.name, inventory)
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

        {/* Empty state */}
        {shoppingList.length === 0 && suggestions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">Your shopping list is empty</p>
            <p className="text-sm">Add items above or accept suggestions</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {checkedCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {checkedCount} item{checkedCount > 1 ? 's' : ''} checked
            </span>
            <Button
              size="sm"
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
