import { cn } from '@/utils/cn'
import type { PillTone } from './pantryOverview'

// Text and background for each tone. Each pair is at least 4.5:1.
const PILL_TONES: Record<PillTone, string> = {
  red: 'bg-red-50 text-red-700',
  orange: 'bg-orange-50 text-orange-700',
  yellow: 'bg-yellow-50 text-yellow-800',
  green: 'bg-green-50 text-green-700',
  grey: 'bg-gray-100 text-gray-600',
}

interface StatusPillProps {
  tone: PillTone
  children: React.ReactNode
  className?: string
}

/** A small rounded label: a row's freshness ("3 wk") or a group's status ("4 soon") */
export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        PILL_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
