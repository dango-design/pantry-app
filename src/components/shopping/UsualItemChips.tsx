import { Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { describeItem, formatItemQuantity, type UsualItem } from '@/utils/quickAdd'

// Shown on a chip for a product that is out or low. `spoken` is the screen reader wording
const STATUS_TAGS: Partial<Record<UsualItem['status'], { text: string; spoken: string; color: string }>> = {
  out: { text: 'Out', spoken: 'out at home', color: 'text-red-700' },
  low: { text: 'Low', spoken: 'running low', color: 'text-amber-700' },
}

interface UsualItemChipsProps {
  items: UsualItem[]
  /** Keep the row's height but show nothing. Hidden chips cannot be tapped or focused */
  hidden?: boolean
  /** `fromKeyboard` is true when the chip was pressed with Enter or Space */
  onAdd: (item: UsualItem, fromKeyboard: boolean) => void
}

/**
 * One chip per usual item. Tapping a chip adds the item with its usual
 * quantity. On phones the chips stay on one line that scrolls sideways,
 * because the shopping page header is sticky and must stay short. Wider
 * screens wrap them.
 */
export function UsualItemChips({ items, hidden, onAdd }: UsualItemChipsProps) {
  return (
    // The strip runs to the right edge of the screen on phones (the page has 16px of padding)
    <div
      className={cn(
        'mt-2 -mr-4 overflow-x-auto pr-4 scrollbar-hide md:mr-0 md:overflow-visible md:pr-0',
        hidden && 'invisible'
      )}
    >
      <ul aria-label="Usual items" className="flex w-max gap-2 md:w-auto md:flex-wrap">
        {items.map((item) => {
          const quantity = formatItemQuantity(item)
          const status = STATUS_TAGS[item.status]
          return (
            <li key={item.key} className="flex-shrink-0">
              <button
                type="button"
                aria-label={`Add ${describeItem(item)}${status ? `, ${status.spoken}` : ''}`}
                // A tap must not take focus from the field: that would close the on-screen keyboard.
                // The focus ring is drawn inside the chip, because the scrolling strip clips anything outside it.
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => onAdd(item, e.detail === 0)}
                className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-primary-muted bg-primary-soft pl-2 pr-3 text-sm text-primary transition-colors hover:bg-primary-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20"
              >
                <Plus className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" aria-hidden="true" />
                <span className="max-w-[11rem] truncate">{item.name}</span>
                {quantity && <span className="tabular-nums text-gray-600">{quantity}</span>}
                {status && <span className={cn('text-xs font-medium', status.color)}>{status.text}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
