import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { StockInfo } from '@/utils/stock'
import { describeUntouched, type ForgottenProduct } from './pantryInsights'

export interface ForgottenCardProps {
  /** From selectForgotten, oldest first. The card renders nothing when this is empty. */
  products: ForgottenProduct[]
  /** Sets the product's touchedAt to now */
  onStillHave: (stock: StockInfo) => void
  /** Uses the product up (the page's existing mark-used path, with undo) */
  onUsedUp: (stock: StockInfo) => void
  /** Same as used up, but recorded as thrown out */
  onThrewOut: (stock: StockInfo) => void
  /** How many rows show before "See all N". Default 5. */
  initialCount?: number
}

// The visible text stays short. Each button adds the product name as hidden
// text, so a screen reader hears "Still have it, Frozen Peas".
const QUICK_BUTTON =
  'inline-flex min-h-[32px] items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

/**
 * A card that lists products nobody has touched for 3 weeks or more, one line
 * each. A row shows "Still have it", the usual answer, and a More button that
 * opens "Used it up" and "Threw it out" under that row. Tapping the name opens
 * the item. Shows the first few rows, with a button to see the rest.
 */
export function ForgottenCard({ products, onStillHave, onUsedUp, onThrewOut, initialCount = 5 }: ForgottenCardProps) {
  const navigate = useNavigate()
  const titleId = useId()
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  // The row whose "Used it up" and "Threw it out" buttons are showing. One at a time.
  const [openKey, setOpenKey] = useState<string | null>(null)

  if (products.length === 0) return null

  const hasMore = products.length > initialCount
  const shown = expanded || !hasMore ? products : products.slice(0, initialCount)

  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-baseline justify-between gap-3 px-3 pt-2.5">
        <h2 id={titleId} className="text-sm font-semibold text-gray-900">
          Haven&apos;t touched in a while
        </h2>
        <span className="shrink-0 text-xs text-gray-500 tabular-nums">
          {products.length}
          <span className="sr-only"> {products.length === 1 ? 'item' : 'items'}</span>
        </span>
      </div>
      <p className="px-3 pb-2 pt-0.5 text-xs text-gray-500">
        Still in date, but nobody has used or changed these for 3 weeks or more.
      </p>

      <ul id={listId}>
        {shown.map(({ stock, days }, index) => {
          const name = stock.name
          const open = openKey === stock.key
          const moreId = `${listId}-more-${index}`
          return (
            <li key={stock.key} className="border-t border-gray-100 px-3">
              {/* One line: name, how long, the common answer, and More for the other two */}
              <div className="flex min-h-[44px] items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/item/${stock.items[0].id}`)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {name}
                </button>
                <span className="shrink-0 whitespace-nowrap text-xs text-gray-500">
                  {describeUntouched(days)}
                  <span className="sr-only"> since last touched</span>
                </span>
                <button type="button" onClick={() => onStillHave(stock)} className={QUICK_BUTTON}>
                  Still have it
                  <span className="sr-only">, {name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : stock.key)}
                  aria-expanded={open}
                  aria-controls={moreId}
                  aria-label={`More for ${name}`}
                  className={cn(QUICK_BUTTON, 'w-8 px-0', open && 'bg-gray-100')}
                >
                  <MoreHorizontal aria-hidden className="h-4 w-4" />
                </button>
              </div>
              {open && (
                <div id={moreId} className="-mt-1 flex flex-wrap justify-end gap-1.5 pb-2">
                  <button type="button" onClick={() => onUsedUp(stock)} className={QUICK_BUTTON}>
                    Used it up
                    <span className="sr-only">, {name}</span>
                  </button>
                  <button type="button" onClick={() => onThrewOut(stock)} className={QUICK_BUTTON}>
                    Threw it out
                    <span className="sr-only">, {name}</span>
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={listId}
          className={cn(
            'flex min-h-[40px] w-full items-center justify-center border-t border-gray-100 px-3 text-xs font-semibold text-gray-600 touch-manipulation',
            'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
          )}
        >
          {expanded ? 'Show fewer' : `See all ${products.length}`}
        </button>
      )}
    </section>
  )
}
