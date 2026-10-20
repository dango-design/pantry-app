import { Minus, Plus, Users } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ServingsStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
}

export function ServingsStepper({ value, onChange, min = 1, max = 20, size = 'sm' }: ServingsStepperProps) {
  const buttonClass = cn(
    'flex items-center justify-center rounded-full border border-gray-300 text-gray-600 bg-white',
    'hover:border-gray-400 hover:text-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors',
    size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  )
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Fewer servings"
        className={buttonClass}
      >
        <Minus className={iconClass} />
      </button>
      <span
        className={cn(
          'flex items-center gap-1 justify-center tabular-nums text-gray-700',
          size === 'sm' ? 'min-w-[3rem] text-xs' : 'min-w-[5rem] text-sm font-medium'
        )}
        aria-live="polite"
      >
        <Users className={iconClass} />
        {value}
        {size === 'md' && <span className="font-normal text-gray-500">serving{value !== 1 ? 's' : ''}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="More servings"
        className={buttonClass}
      >
        <Plus className={iconClass} />
      </button>
    </div>
  )
}
