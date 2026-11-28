import { Suspense, useId, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ChevronRight, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { getFoodIcon } from '@/components/icons'
import { useFlyToCart } from '@/components/common'
import { LazyPantryAllergyBadge } from '@/components/allergy/lazy'
import { cn } from '@/utils/cn'
import { CATEGORY_TONES } from '@/utils/constants'
import { formatStockCount, type StockInfo } from '@/utils/stock'
import { isDiscreteUnit } from '@/utils/units'
import type { FoodItem } from '@/types'
import { getFreshnessPill, placeLabel } from './pantryOverview'
import { StatusPill } from './StatusPill'

export interface CompactItemRowProps {
  /** The product. `items[0]` is its soonest-expiring row, which the actions use. */
  stock: StockInfo
  /** Whether the action bar under the row is showing */
  expanded: boolean
  /** Tapping the row opens or closes its action bar */
  onToggle: () => void
  /** Show where it is kept. Off inside a place group, where the header already says it. */
  showLocation?: boolean
  onMarkUsed?: (item: FoodItem) => void
  /** Return false when the item wasn't added right away (e.g. the page asks first) */
  onAddToCart?: (item: FoodItem) => boolean | void
  /** One down or up. The buttons only show for units you count. */
  onAdjust?: (item: FoodItem, delta: 1 | -1) => void
  className?: string
}

const ACTION_BUTTON =
  'h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

/**
 * One product on a 42 px line: category dot, name, amount, and a freshness
 * pill in its own column on the right. A long name wraps to a second line. Tapping the line opens an
 * action bar under it with use one / add one, add to list, used up, and a
 * link to the item page.
 */
export function CompactItemRow({
  stock,
  expanded,
  onToggle,
  showLocation = false,
  onMarkUsed,
  onAddToCart,
  onAdjust,
  className,
}: CompactItemRowProps) {
  const navigate = useNavigate()
  const panelId = useId()
  const listButtonRef = useRef<HTMLButtonElement>(null)
  const { triggerAnimation } = useFlyToCart()

  const item = stock.items[0]
  const tone = CATEGORY_TONES[stock.category] ?? CATEGORY_TONES.other
  const pill = getFreshnessPill(item.expirationDate)
  const amount = formatStockCount(stock)
  const place = placeLabel(item.storageLocation)
  const showStepper = onAdjust !== undefined && isDiscreteUnit(stock.unit)
  const batchCount = stock.items.length
  const allergyGtins = useMemo(() => stock.items.map((row) => row.gtin), [stock])

  const handleAddToCart = () => {
    // Fly to the cart only when it went straight onto the list
    const added = onAddToCart?.(item)
    if (added !== false && listButtonRef.current) {
      const FoodIcon = getFoodIcon(item.name, item.category)
      triggerAnimation(listButtonRef.current, <FoodIcon size={28} strokeWidth={1.75} color={tone.ink} />)
    }
  }

  return (
    <li className={cn('list-none', className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          'flex min-h-[42px] w-full items-center gap-2 px-3 py-1.5 text-left touch-manipulation',
          'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
          expanded && 'bg-gray-50'
        )}
      >
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone.strip }} />
        {/* A long name wraps to a second line rather than being cut off */}
        <span className="min-w-0 flex-1 line-clamp-2 break-words text-sm font-medium leading-tight text-gray-900">{stock.name}</span>
        <span className="shrink-0 whitespace-nowrap text-xs text-gray-500 tabular-nums">
          {amount}
          {showLocation && <span> · {place}</span>}
        </span>
        {/* Fixed-width column so the pills line up down the list */}
        <span className="flex w-[5.5rem] shrink-0 justify-end">
          <StatusPill tone={pill.tone}>{pill.text}</StatusPill>
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-2 bg-gray-50 px-3 pb-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="min-w-0 flex-1 truncate">
              {place}
              {batchCount > 1 && ` · ${batchCount} batches`}
              {` · Use by ${format(parseISO(item.expirationDate), 'EEE, MMM d')}`}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/item/${item.id}`)}
              className="-my-2 inline-flex shrink-0 items-center gap-0.5 py-2 pl-2 font-medium text-gray-900 hover:text-primary-hover"
            >
              Details
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {allergyGtins.some(Boolean) && (
            <Suspense fallback={null}>
              <LazyPantryAllergyBadge gtins={allergyGtins} />
            </Suspense>
          )}

          <div className="flex items-center gap-1.5">
            {showStepper && (
              <>
                <button
                  type="button"
                  onClick={() => onAdjust?.(item, -1)}
                  aria-label={`Use one ${stock.name}`}
                  title="Use one"
                  className={cn(ACTION_BUTTON, 'w-10')}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjust?.(item, 1)}
                  aria-label={`Add one ${stock.name}`}
                  title="Add one"
                  className={cn(ACTION_BUTTON, 'w-10')}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </>
            )}
            <span className="flex-1" />
            {onAddToCart && (
              <button
                ref={listButtonRef}
                type="button"
                onClick={handleAddToCart}
                aria-label={`Add ${stock.name} to shopping list`}
                className={cn(ACTION_BUTTON, 'px-2.5')}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to list
              </button>
            )}
            {onMarkUsed && (
              <button
                type="button"
                onClick={() => onMarkUsed(item)}
                aria-label={`Mark ${stock.name} used up`}
                className={cn(ACTION_BUTTON, 'px-2.5 text-red-700')}
              >
                <Trash2 className="h-4 w-4" />
                Used up
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

/** The white card that holds a run of compact rows, with a line between each */
export function CompactRowList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn('divide-y divide-gray-100', className)}>{children}</ul>
}
