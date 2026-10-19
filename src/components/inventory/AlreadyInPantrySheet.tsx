import { BottomSheet, Button } from '@/components/common'
import { describeStock } from '@/utils/pantryMatch'
import type { FoodItem } from '@/types'

interface AlreadyInPantrySheetProps {
  item: FoodItem
  /** Add to the list and keep the pantry item as it is */
  onAdd: () => void
  /** Clear the pantry item, then add it to the list */
  onUsedUpAndAdd: () => void
  onClose: () => void
}

// Asked before adding something to the shopping list that's still in stock
export function AlreadyInPantrySheet({ item, onAdd, onUsedUpAndAdd, onClose }: AlreadyInPantrySheetProps) {
  return (
    <BottomSheet open onClose={onClose} title={`You still have ${item.name}`} subtitle={describeStock(item)}>
      <div className="p-4 space-y-2 safe-area-bottom">
        <Button onClick={onAdd} className="w-full" size="lg">
          Add to list
        </Button>
        <Button onClick={onUsedUpAndAdd} variant="secondary" className="w-full" size="lg">
          Used it up, add to list
        </Button>
        <Button onClick={onClose} variant="ghost" className="w-full text-gray-600" size="lg">
          Cancel
        </Button>
      </div>
    </BottomSheet>
  )
}
