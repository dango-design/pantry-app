import { useState } from 'react'
import { Clock } from 'lucide-react'
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

function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

// The name a screen reader reads for one gauge, e.g. "Eggs, 2 days left, low".
// A staple with no known daily use reads its amount instead: "Rice, 3 left, stocked".
// One that goes bad before it runs out says so: "Bread, goes bad today, stocked".
function gaugeName(gauge: StapleGauge): string {
  const status = gauge.stock.status
  if (status === 'out') return `${gauge.name}, out`
  let amount = gauge.label
  if (gauge.goesBadFirst) {
    const days = gauge.daysLeft ?? 0
    if (gauge.label === 'expired') amount = 'expired'
    else amount = days === 0 ? 'goes bad today' : `goes bad in ${plural(days, 'day')}`
  } else if (gauge.daysLeft !== undefined) {
    const days = Math.floor(gauge.daysLeft + 1e-9)
    if (days >= GAUGE_FULL_DAYS) amount = `${GAUGE_FULL_DAYS}+ days left`
    else amount = `${days} ${days === 1 ? 'day' : 'days'} left`
  }
  return `${gauge.name}, ${amount}, ${STATUS_WORDS[status]}`
}

/**
 * The body of the Staples panel on the Pantry tab: one gauge per staple, two
 * across, showing how many days are left until it runs out at the usual pace
 * or goes bad, whichever comes first (a clock marks the second). Tapping a gauge
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
  const anyGoesBadFirst = visible.some((gauge) => gauge.goesBadFirst)

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
                <span className={cn('flex shrink-0 items-center gap-0.5 text-xs tabular-nums', LABEL_CLASS[gauge.tone])}>
                  {gauge.goesBadFirst && <Clock aria-hidden className="h-3 w-3" />}
                  {gauge.label}
                </span>
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
      {anyGoesBadFirst && (
        <p aria-hidden className="flex items-center gap-1 border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" /> goes bad before it runs out
        </p>
      )}
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
