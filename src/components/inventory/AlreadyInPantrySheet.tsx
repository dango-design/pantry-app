import type { ReactNode } from 'react'
import { BottomSheet, Button } from '@/components/common'
import { describeStock } from '@/utils/pantryMatch'
import { formatQuantity } from '@/utils/mealPlan'
import { cn } from '@/utils/cn'
import type { FoodItem } from '@/types'

interface AlreadyInPantrySheetProps {
  item: FoodItem
  /** Add to the shopping list and keep the pantry item as it is */
  onAdd: () => void
  /** Clear the pantry item, then add it to the shopping list */
  onUsedUpAndAdd: () => void
  onClose: () => void
}

// A choice button that says what it does and what happens to the pantry
function ChoiceButton({ title, detail, primary, onClick }: { title: string; detail: ReactNode; primary?: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant={primary ? 'primary' : 'secondary'}
      className="w-full h-auto py-3 flex-col gap-0.5"
    >
      <span className="text-base font-medium">{title}</span>
      <span className={cn('text-xs font-normal', primary ? 'text-white/75' : 'text-gray-500')}>{detail}</span>
    </Button>
  )
}

// Asked before adding something to the shopping list that's still in stock
export function AlreadyInPantrySheet({ item, onAdd, onUsedUpAndAdd, onClose }: AlreadyInPantrySheetProps) {
  const amount = formatQuantity(item.quantity, item.quantityUnit)

  return (
    <BottomSheet open onClose={onClose} title={`You still have ${item.name}`} subtitle={describeStock(item)}>
      <div className="p-4 space-y-2 safe-area-bottom">
        <ChoiceButton
          primary
          title="Buy more"
          detail={`Add to shopping list, keep the ${amount} you have`}
          onClick={onAdd}
        />
        <ChoiceButton
          title="I'm out of it"
          detail="Add to shopping list, remove from pantry"
          onClick={onUsedUpAndAdd}
        />
        <Button onClick={onClose} variant="ghost" className="w-full text-gray-600" size="lg">
          Cancel
        </Button>
      </div>
    </BottomSheet>
  )
}
