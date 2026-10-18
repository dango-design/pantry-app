import { useState } from 'react'
import { Check, X, Edit2, Trash2, ChevronDown } from 'lucide-react'
import { Button, Input } from '@/components/common'
import { CATEGORIES, QUANTITY_UNITS, STORAGE_LOCATIONS } from '@/utils/constants'
import { FoodThumbnail } from '@/components/icons'
import { cn } from '@/utils/cn'
import type { FoodCategory, StorageLocation, QuantityUnit } from '@/types'

interface ReviewItem {
  id: string
  name: string
  category: FoodCategory
  quantity: number
  quantityUnit: QuantityUnit
  storageLocation: StorageLocation
  brand?: string
  selected: boolean
}

interface ItemReviewListProps {
  items: ReviewItem[]
  onItemsChange: (items: ReviewItem[]) => void
  onConfirm: (items: ReviewItem[]) => void
  onCancel: () => void
  title?: string
  loading?: boolean
}

export function ItemReviewList({
  items,
  onItemsChange,
  onConfirm,
  onCancel,
  title = 'Review Items',
  loading = false,
}: ItemReviewListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const toggleItem = (id: string) => {
    onItemsChange(
      items.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, updates: Partial<ReviewItem>) => {
    onItemsChange(
      items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    )
  }

  const selectedCount = items.filter(item => item.selected).length

  const handleConfirm = () => {
    onConfirm(items.filter(item => item.selected))
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button onClick={onCancel} className="p-2 -ml-2">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Instructions */}
      <div className="flex-shrink-0 px-4 py-3 bg-blue-50 border-b border-blue-100">
        <p className="text-sm text-blue-800">
          Review the detected items. Tap to select/deselect, or edit details as needed.
        </p>
      </div>

      {/* Items list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>No items detected</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {items.map(item => {
              const isEditing = editingId === item.id

              return (
                <div
                  key={item.id}
                  className={cn(
                    'bg-white rounded-xl border-2 transition-colors',
                    item.selected ? 'border-primary' : 'border-transparent'
                  )}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        item.selected
                          ? 'bg-primary border-primary'
                          : 'border-gray-300'
                      )}
                    >
                      {item.selected && <Check className="h-4 w-4 text-white" />}
                    </button>

                    <FoodThumbnail
                      name={item.name}
                      category={item.category}
                      iconSize={20}
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.name}
                        {item.brand && (
                          <span className="text-gray-500 font-normal"> - {item.brand}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} {QUANTITY_UNITS[item.quantityUnit]?.label || item.quantityUnit}
                        {' '}&middot;{' '}
                        {CATEGORIES[item.category]?.label || item.category}
                      </p>
                    </div>

                    <button
                      onClick={() => setEditingId(isEditing ? null : item.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Expandable edit form */}
                  {isEditing && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Name</label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 1 })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                          <div className="relative">
                            <select
                              value={item.quantityUnit}
                              onChange={(e) => updateItem(item.id, { quantityUnit: e.target.value as QuantityUnit })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none bg-white"
                            >
                              {Object.entries(QUANTITY_UNITS).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Category</label>
                          <div className="relative">
                            <select
                              value={item.category}
                              onChange={(e) => updateItem(item.id, { category: e.target.value as FoodCategory })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none bg-white"
                            >
                              {Object.entries(CATEGORIES).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Storage</label>
                          <div className="relative">
                            <select
                              value={item.storageLocation}
                              onChange={(e) => updateItem(item.id, { storageLocation: e.target.value as StorageLocation })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none bg-white"
                            >
                              {Object.entries(STORAGE_LOCATIONS).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-200 p-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            loading={loading}
            disabled={selectedCount === 0}
            className="flex-1 bg-primary hover:bg-primary-hover"
          >
            Add {selectedCount} {selectedCount === 1 ? 'Item' : 'Items'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export type { ReviewItem }
