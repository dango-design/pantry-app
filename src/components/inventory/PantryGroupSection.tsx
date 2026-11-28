import { useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { StockInfo } from '@/utils/stock'
import { daysLeft, USE_SOON_DAYS, type GroupStatus } from './pantryOverview'
import { StatusPill } from './StatusPill'

export interface PantryGroupSectionProps {
  label: string
  /** Colour of the small square before the name */
  color: string
  /** Every product in the group */
  count: number
  status: GroupStatus
  open: boolean
  onToggle: () => void
  /** Products in this group that the selected tile's list already shows, so they are left out here */
  shownAbove?: { count: number; tileLabel: string }
  /** The rows, cards or chips. Only rendered while open. */
  children?: React.ReactNode
}

/**
 * A group under "Everything else": a 46 px header with the group's name, how
 * many products it holds, and whether any need attention. Closed by default;
 * tapping the header opens it.
 */
export function PantryGroupSection({
  label,
  color,
  count,
  status,
  open,
  onToggle,
  shownAbove,
  children,
}: PantryGroupSectionProps) {
  const bodyId = useId()
  const hasNote = shownAbove !== undefined && shownAbove.count > 0

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex h-[46px] w-full items-center gap-2 px-3 text-left touch-manipulation hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <span aria-hidden className="h-5 w-5 shrink-0 rounded-md opacity-30" style={{ backgroundColor: color }} />
          <span className="min-w-0 truncate text-sm font-semibold text-gray-900">{label}</span>
          {' '}
          <span className="shrink-0 text-sm text-gray-500 tabular-nums">
            {count}
            <span className="sr-only"> {count === 1 ? 'item' : 'items'}</span>
          </span>
          <span className="flex-1" />{' '}
          <StatusPill tone={status.tone} className="shrink-0">{status.text}</StatusPill>
          <ChevronDown
            aria-hidden
            className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')}
          />
        </button>
      </h3>

      {open && (
        <div id={bodyId} className="border-t border-gray-100">
          {children}
          {hasNote && (
            <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
              {shownAbove.count} more in “{shownAbove.tileLabel}” above
            </p>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * A group's products as small chips instead of rows, for long lists of small
 * things such as oils, spices and sauces. A chip opens the item.
 *
 * Chips whose key is in `lowKeys` get an orange outline and the word "low".
 * Other chips for things expiring soon get an orange outline and hidden
 * "(use soon)" text. A chip that is both shows as low.
 */
export function GroupChips({ products, lowKeys }: { products: StockInfo[]; lowKeys?: Set<string> }) {
  const navigate = useNavigate()
  return (
    <ul className="flex flex-wrap gap-1.5 px-3 py-3">
      {products.map((stock) => {
        const low = lowKeys?.has(stock.key) ?? false
        const soon = !low && daysLeft(stock) <= USE_SOON_DAYS
        return (
          <li key={stock.key}>
            <button
              type="button"
              onClick={() => navigate(`/item/${stock.items[0].id}`)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs touch-manipulation hover:bg-gray-50',
                low || soon ? 'border-orange-500 text-orange-700' : 'border-gray-200 text-gray-700'
              )}
            >
              {stock.name}
              {low && <span className="text-orange-700"> · low</span>}
              {soon && <span className="sr-only"> (use soon)</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
