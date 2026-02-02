import { useState, useMemo } from 'react'
import { Plus, Lightbulb, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout'
import { Input, Badge, Button, Dialog, DialogActions } from '@/components/common'
import { useDemoStore, DEMO_HOUSEHOLD, DEMO_USER } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { CATEGORIES } from '@/utils/constants'
import { getDaysUntilExpiration } from '@/utils/freshness'
import type { FoodCategory } from '@/types'

export function ShoppingListPage() {
  const {
    shoppingList,
    inventory,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    clearCheckedItems,
    addItem: addInventoryItem,
  } = useDemoStore()

  const [newItemName, setNewItemName] = useState('')
  const [showAddToInventoryDialog, setShowAddToInventoryDialog] = useState(false)

  // Generate suggestions from inventory
  const suggestions = useMemo(() => {
    const activeItems = inventory.filter((item) => item.status === 'active')

    // Items low on stock (quantity < 2)
    const lowStock = activeItems
      .filter((item) => item.quantity < 2)
      .map((item) => ({
        name: item.name,
        category: item.category,
        source: 'low_stock' as const,
        reason: 'low stock',
      }))

    // Items expiring soon
    const expiring = activeItems
      .filter((item) => getDaysUntilExpiration(item.expirationDate) <= 3)
      .map((item) => ({
        name: item.name,
        category: item.category,
        source: 'expiring' as const,
        reason: 'expiring soon',
      }))

    // Filter out items already on the shopping list
    const existingNames = new Set(shoppingList.map((i) => i.name.toLowerCase()))
    return [...lowStock, ...expiring].filter(
      (s) => !existingNames.has(s.name.toLowerCase())
    )
  }, [inventory, shoppingList])

  const handleAddItem = () => {
    if (!newItemName.trim()) return
    addShoppingItem({
      shoppingListId: 'demo-list',
      name: newItemName.trim(),
      category: 'other',
      isChecked: false,
      source: 'manual',
      priority: 'normal',
    })
    setNewItemName('')
  }

  const handleAcceptSuggestion = (suggestion: { name: string; category: FoodCategory; source: 'low_stock' | 'expiring' }) => {
    addShoppingItem({
      shoppingListId: 'demo-list',
      name: suggestion.name,
      category: suggestion.category,
      isChecked: false,
      source: suggestion.source,
      priority: 'normal',
    })
  }

  const handleAddCheckedToInventory = () => {
    const checkedItems = clearCheckedItems()

    // Add each to inventory
    checkedItems.forEach((item) => {
      addInventoryItem({
        householdId: DEMO_HOUSEHOLD.id,
        name: item.name,
        category: item.category || 'other',
        quantity: item.quantity || 1,
        quantityUnit: item.quantityUnit || 'count',
        originalQuantity: item.quantity || 1,
        storageLocation: 'refrigerator',
        purchaseDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expirationSource: 'calculated',
        freshnessScore: 100,
        tags: [],
        addedBy: DEMO_USER.id,
        addedVia: 'manual',
        status: 'active',
      })
    })

    setShowAddToInventoryDialog(false)
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
        title="Shopping List"
        showSearch={false}
        showAdd={false}
      />

      <div className="p-4 space-y-4">
        {/* Add item input */}
        <div className="flex gap-2">
          <Input
            placeholder="Add item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <button
            onClick={handleAddItem}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
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
                <span className="text-sm font-medium text-gray-700 uppercase">
                  {categoryConfig?.label || category}
                </span>
              </div>
              <div className="space-y-1">
                {categoryItems.map((item) => (
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
                          ? 'bg-blue-600 border-blue-600'
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
                        <span className="text-gray-500"> ({item.quantity})</span>
                      )}
                    </span>

                    <button
                      onClick={() => removeShoppingItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
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
              onClick={() => setShowAddToInventoryDialog(true)}
            >
              Add to Pantry
            </Button>
          </div>
        </div>
      )}

      {/* Add to inventory dialog */}
      <Dialog
        open={showAddToInventoryDialog}
        onClose={() => setShowAddToInventoryDialog(false)}
        title="Add to Pantry"
        description={`Add ${checkedCount} checked item${checkedCount > 1 ? 's' : ''} to your pantry inventory?`}
      >
        <DialogActions>
          <Button variant="secondary" onClick={() => setShowAddToInventoryDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddCheckedToInventory}>
            Add to Pantry
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
