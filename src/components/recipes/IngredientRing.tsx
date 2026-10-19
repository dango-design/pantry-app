import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface IngredientRingProps {
  /** Required ingredients in the pantry */
  have: number
  /** Required ingredients in the recipe */
  total: number
  /** Diameter in px */
  size?: number
  className?: string
}

/**
 * How many of a recipe's required ingredients are in the pantry, as a small ring
 * with "4/5" inside. When nothing is missing it turns green with a check.
 */
export function IngredientRing({ have, total, size = 40, className }: IngredientRingProps) {
  const complete = have >= total
  const strokeWidth = size >= 40 ? 4 : 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = total > 0 ? Math.min(have / total, 1) : 1
  const center = size / 2

  return (
    <span
      role="img"
      aria-label={complete ? 'All ingredients in your pantry' : `${have} of ${total} ingredients in your pantry`}
      className={cn('relative inline-flex flex-shrink-0', complete ? 'text-green-700' : 'text-primary', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-gray-200" />
        {fraction > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        {complete ? (
          <Check className={size >= 40 ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={3} />
        ) : (
          <span className={cn('font-medium tabular-nums leading-none', total >= 10 ? 'text-[9px]' : 'text-[11px]')}>
            {have}/{total}
          </span>
        )}
      </span>
    </span>
  )
}
