import { useId } from 'react'
import { Check, Home, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatQuantity } from '@/utils/mealPlan'
import { isSameName } from '@/utils/pantryMatch'
import type { FoodItem, ShoppingListItem } from '@/types'
import { QuantityStepper } from './QuantityStepper'
import type { StapleHint } from './stockHint'

interface ShoppingRowProps {
  item: ShoppingListItem
  /** Stock line for an item that matches a staple. Shown in place of the "at home" hint. */
  stapleHint?: StapleHint
  /** A pantry item still in stock under this name, for items that are not staples */
  atHome?: FoodItem
  onToggle: () => void
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

const HINT_COLORS: Record<StapleHint['status'], string> = {
  out: 'text-red-700',
  low: 'text-amber-700',
  ok: 'text-gray-500',
}

/**
 * One shopping list item. The checkbox and the name are a single button, so
 * the whole left side of the row checks the item off. The quantity buttons and
 * the trash button sit outside that button, so tapping them does not check it.
 */
export function ShoppingRow({ item, stapleHint, atHome, onToggle, onQuantityChange, onRemove }: ShoppingRowProps) {
  const nameId = useId()
  const detailId = useId()

  // A quantity of 0 is treated as not set, which means "one"
  const quantity = item.quantity !== undefined && item.quantity > 0 ? item.quantity : undefined
  // Hints help decide what to buy, so they stop once the item is in the cart
  const showStapleHint = !item.isChecked && stapleHint !== undefined
  const showAtHome = !item.isChecked && !stapleHint && atHome !== undefined
  const hasDetail = Boolean(item.notes) || showStapleHint || showAtHome

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg transition-colors',
        item.isChecked && 'bg-gray-50'
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.isChecked}
        aria-labelledby={nameId}
        aria-describedby={hasDetail ? detailId : undefined}
        onClick={onToggle}
        className="group flex flex-1 min-w-0 items-center gap-1 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* The box is 20px. The 40px area around it keeps it easy to hit. */}
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center" aria-hidden="true">
          <span
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              item.isChecked ? 'bg-primary border-primary' : 'border-gray-300 group-hover:border-gray-400'
            )}
          >
            {item.isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </span>
        </span>

        <span className="flex-1 min-w-0 py-1.5">
          <span id={nameId} className={cn('block break-words', item.isChecked && 'line-through text-gray-400')}>
            {item.name}
            {/* Unchecked rows show the quantity between the minus and plus buttons */}
            {item.isChecked && quantity !== undefined && (
              <> ({item.quantityUnit ? formatQuantity(quantity, item.quantityUnit) : quantity})</>
            )}
          </span>
          {hasDetail && (
            <span id={detailId} className="block">
              {item.notes && <span className="block text-xs text-gray-400">{item.notes}</span>}
              {showStapleHint && (
                <span className={cn('mt-0.5 block text-xs', HINT_COLORS[stapleHint.status])}>
                  {stapleHint.text}
                </span>
              )}
              {showAtHome && (
                <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
                  <Home className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  {formatQuantity(atHome.quantity, atHome.quantityUnit)} at home
                  {!isSameName(atHome.name, item.name) && ` (${atHome.name})`}
                </span>
              )}
            </span>
          )}
        </span>
      </button>

      {!item.isChecked && (
        <QuantityStepper
          name={item.name}
          quantity={quantity}
          unit={item.quantityUnit}
          onChange={onQuantityChange}
        />
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name} from list`}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
