import type { ReactNode } from 'react'
import { BottomSheet, Button } from '@/components/common'
import { describeStock } from '@/utils/pantryMatch'
import { formatStockCount, type StockInfo } from '@/utils/stock'
import { cn } from '@/utils/cn'
import { shownCount } from './stockHelpers'

interface AlreadyInPantrySheetProps {
  /** The product, counted across all of its pantry rows */
  stock: StockInfo
  /** Add to the shopping list and keep the pantry as it is */
  onAdd: () => void
  /** Mark the whole product used up, then add it to the shopping list */
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
export function AlreadyInPantrySheet({ stock, onAdd, onUsedUpAndAdd, onClose }: AlreadyInPantrySheetProps) {
  const soonest = stock.items[0]

  // e.g. "About 3 in the pantry · expires in 8 months". The place and date
  // come from the row that expires soonest, the amount from the whole product.
  const where = soonest && describeStock({ ...soonest, quantity: shownCount(stock), quantityUnit: stock.unit })
  const subtitle = where && (stock.isEstimate ? `About ${where}` : where)

  return (
    <BottomSheet open onClose={onClose} title={`You still have ${stock.name}`} subtitle={subtitle}>
      <div className="p-4 space-y-2 safe-area-bottom">
        <ChoiceButton
          primary
          title="Buy more"
          detail={
            stock.isEstimate
              ? 'Add to shopping list, keep what you have'
              : `Add to shopping list, keep the ${formatStockCount(stock)} you have`
          }
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
