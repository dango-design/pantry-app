import { useState } from 'react'
import { cn } from '@/utils/cn'
import { GAUGE_FULL_DAYS, type GaugeTone, type StapleGauge, type StaplesSummary } from './pantryInsights'

export interface StaplesBoardProps {
  summary: StaplesSummary
  /** Opens the existing "Keep in stock" sheet for this product name */
  onOpenStaple: (name: string) => void
  /** How many gauges show before "See all N". Default 12. */
  initialCount?: number
}

const FILL_CLASS: Record<GaugeTone, string> = {
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
}

const LABEL_CLASS: Record<GaugeTone, string> = {
  green: 'text-gray-500',
  orange: 'text-orange-700',
  red: 'text-red-700',
}

const STATUS_WORDS: Record<StapleGauge['stock']['status'], string> = {
  ok: 'stocked',
  low: 'low',
  out: 'out',
}

// The name a screen reader reads for one gauge, e.g. "Eggs, 2 days left, low".
// A staple with no known daily use reads its amount instead: "Rice, 3 left, stocked".
function gaugeName(gauge: StapleGauge): string {
  const status = gauge.stock.status
  if (status === 'out') return `${gauge.name}, out`
  let amount = gauge.label
  if (gauge.daysLeft !== undefined) {
    const days = Math.floor(gauge.daysLeft + 1e-9)
    if (days >= GAUGE_FULL_DAYS) amount = `${GAUGE_FULL_DAYS}+ days left`
    else amount = `${days} ${days === 1 ? 'day' : 'days'} left`
  }
  return `${gauge.name}, ${amount}, ${STATUS_WORDS[status]}`
}

/**
 * The body of the Staples panel on the Pantry tab: one gauge per staple, two
 * across, showing how many days are left at the usual pace. Tapping a gauge
 * opens that staple's "Keep in stock" sheet. Only the first `initialCount`
 * gauges show until "See all" is tapped. Render it inside a TilePanel.
 */
export function StaplesBoard({ summary, onOpenStaple, initialCount = 12 }: StaplesBoardProps) {
  const [showAll, setShowAll] = useState(false)

  if (summary.total === 0) {
    return (
      <p className="px-3 py-4 text-sm text-gray-500">
        No staples yet. Open an item and turn on “Keep in stock” to track it here.
      </p>
    )
  }

  const hasMore = summary.gauges.length > initialCount
  const visible = showAll || !hasMore ? summary.gauges : summary.gauges.slice(0, initialCount)

  return (
    <div>
      <ul className="grid grid-cols-2">
        {visible.map((gauge, i) => (
          <li key={gauge.stock.key} className={cn('min-w-0 border-t border-gray-100', i % 2 === 0 && 'border-r')}>
            <button
              type="button"
              onClick={() => onOpenStaple(gauge.name)}
              aria-label={gaugeName(gauge)}
              className="block w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-gray-900">{gauge.name}</span>
                <span className={cn('shrink-0 text-xs tabular-nums', LABEL_CLASS[gauge.tone])}>{gauge.label}</span>
              </span>
              <span aria-hidden className="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-gray-100">
                <span
                  className={cn('block h-full rounded-full', FILL_CLASS[gauge.tone])}
                  style={{ width: `${Math.max(0, Math.min(1, gauge.fill)) * 100}%` }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          className="block w-full border-t border-gray-100 py-2.5 text-center text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          {showAll ? 'Show fewer' : `See all ${summary.total} staples`}
        </button>
      )}
    </div>
  )
}
