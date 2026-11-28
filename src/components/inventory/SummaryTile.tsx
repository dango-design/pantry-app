import { cn } from '@/utils/cn'

/** Colour of a tile's status line or a bar segment */
export type TileTone = 'red' | 'orange' | 'yellow' | 'green' | 'muted'

const STATUS_TEXT: Record<TileTone, string> = {
  red: 'text-red-700',
  orange: 'text-orange-700',
  yellow: 'text-yellow-800',
  green: 'text-green-700',
  muted: 'text-gray-500',
}

const BAR_FILL: Record<TileTone, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  muted: 'bg-gray-400',
}

export interface TileBarSegment {
  /** Share of the bar, in any unit: segments are scaled to their total */
  value: number
  tone: TileTone
}

export interface SummaryTileProps {
  label: string
  /** The big number: "6", "~5" */
  value: React.ReactNode
  /** Smaller text right after the number, e.g. "/22" for "18/22" */
  valueSuffix?: React.ReactNode
  /** One short line under the number. Leave out when the tile shows a bar instead. */
  status?: { text: string; tone: TileTone }
  /** A thin bar under the number, split into coloured parts (e.g. staples: ok, low, out) */
  bar?: TileBarSegment[]
  selected?: boolean
  onClick?: () => void
  /** id of the list this tile shows, for screen readers */
  controls?: string
  className?: string
}

/**
 * One tile in the summary grid at the top of the Pantry tab: a label, a big
 * number, and either a status line or a small bar. Tapping it shows that
 * tile's list below the grid.
 */
export function SummaryTile({
  label,
  value,
  valueSuffix,
  status,
  bar,
  selected = false,
  onClick,
  controls,
  className,
}: SummaryTileProps) {
  const barTotal = bar?.reduce((sum, segment) => sum + segment.value, 0) ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-controls={controls}
      className={cn(
        'flex min-w-0 flex-col items-stretch rounded-xl border bg-white px-3 py-2.5 text-left transition-colors touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        selected ? 'border-primary shadow-[inset_0_0_0_1px_theme(colors.primary.DEFAULT)]' : 'border-gray-200 hover:border-gray-300',
        className
      )}
    >
      <span className="truncate text-xs font-medium text-gray-600">{label}</span>
      <span className="text-2xl font-semibold leading-tight text-gray-900 tabular-nums">
        {value}
        {valueSuffix && <span className="text-sm font-medium text-gray-500">{valueSuffix}</span>}
      </span>
      {status && <span className={cn('truncate text-xs', STATUS_TEXT[status.tone])}>{status.text}</span>}
      {bar && barTotal > 0 && (
        <span aria-hidden className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-gray-100">
          {bar.map((segment, i) => (
            <span
              key={i}
              className={cn('h-full', BAR_FILL[segment.tone])}
              style={{ width: `${(segment.value / barTotal) * 100}%` }}
            />
          ))}
        </span>
      )}
    </button>
  )
}

/** The grid the tiles sit in: two across on phones, more on wider screens */
export function SummaryTileGrid({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      {children}
    </div>
  )
}

interface TilePanelProps {
  id?: string
  title: string
  /** Short note on the right of the header, e.g. "soonest first" */
  hint?: string
  children: React.ReactNode
}

/** The card under the tiles that holds the selected tile's list */
export function TilePanel({ id, title, hint, children }: TilePanelProps) {
  return (
    <section id={id} aria-label={title} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 px-3 pb-1.5 pt-2.5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
    </section>
  )
}
