import { useState } from 'react'
import { Check, Info, Plus } from 'lucide-react'
import { Input } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { lookupFood } from '@/utils/foodDatabase'
import { describeStock, findStockedInPantry, isSameName } from '@/utils/pantryMatch'
import type { FoodItem } from '@/types'

// Shown under the field instead of adding right away. Adding the same name
// again (Enter or "Add anyway") goes through.
type AddNote =
  | { kind: 'in_pantry'; name: string; item: FoodItem }
  | { kind: 'on_list'; name: string }

interface QuickAddToListProps {
  placeholder?: string
  autoFocus?: boolean
  /** Say "Added …" after each add, for places where the list itself isn't visible */
  confirmAdds?: boolean
}

/** Type an item onto the shopping list, with a heads-up for duplicates and things already at home */
export function QuickAddToList({ placeholder = 'Add item...', autoFocus, confirmAdds }: QuickAddToListProps) {
  const { shoppingList, inventory, addShoppingItem } = useDemoStore()
  const [name, setName] = useState('')
  const [note, setNote] = useState<AddNote | null>(null)
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    // First try: point out duplicates and items already at home. Once the note
    // is showing for this name, adding again goes through.
    if (note?.name !== trimmed) {
      if (shoppingList.some((item) => !item.isChecked && isSameName(item.name, trimmed))) {
        setNote({ kind: 'on_list', name: trimmed })
        return
      }
      const stocked = findStockedInPantry(trimmed, inventory)
      if (stocked) {
        setNote({ kind: 'in_pantry', name: trimmed, item: stocked })
        return
      }
    }

    addShoppingItem({
      shoppingListId: 'demo-list',
      name: trimmed,
      category: lookupFood(trimmed)?.category ?? 'other',
      isChecked: false,
      source: 'manual',
      priority: 'normal',
    })
    setNote(null)
    setName('')
    setLastAdded(trimmed)
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          className="h-10 border-gray-200"
          aria-label="Item to add to your shopping list"
          value={name}
          autoFocus={autoFocus}
          onChange={(e) => {
            setName(e.target.value)
            setNote(null)
            setLastAdded(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          aria-label="Add to list"
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {note && (
        <div role="status" className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-900">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-700" />
          <div className="flex-1 min-w-0">
            {note.kind === 'on_list' ? (
              <p>Already on your list</p>
            ) : (
              <>
                <p>You have {note.item.name} at home</p>
                <p className="text-xs text-amber-800">{describeStock(note.item)}</p>
              </>
            )}
          </div>
          <button onClick={handleAdd} className="flex-shrink-0 font-medium underline underline-offset-2 hover:text-amber-950">
            Add anyway
          </button>
        </div>
      )}

      {confirmAdds && lastAdded && !note && (
        <p role="status" className="mt-2 flex items-center gap-1 text-sm text-green-700">
          <Check className="h-4 w-4" />
          Added {lastAdded} to your list
        </p>
      )}
    </div>
  )
}
