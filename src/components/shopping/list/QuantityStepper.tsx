import { Minus, Plus } from 'lucide-react'
import { formatQuantity } from '@/utils/mealPlan'
import { roundQuantity } from '@/utils/units'
import type { QuantityUnit } from '@/types'

interface QuantityStepperProps {
  /** The item's name, for the button labels */
  name: string
  /** Not set means "one": the row then shows only the plus button */
  quantity?: number
  unit?: QuantityUnit
  onChange: (quantity: number) => void
}

// Each button is 40px so it is easy to hit. The circle drawn inside is smaller.
const buttonClass =
  'group flex h-10 w-10 items-center justify-center rounded-full focus:outline-none disabled:pointer-events-none'
const circleClass =
  'flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors ' +
  'group-hover:border-primary-muted group-hover:bg-primary-soft group-hover:text-primary ' +
  'group-focus-visible:ring-2 group-focus-visible:ring-primary ' +
  'group-disabled:border-gray-100 group-disabled:text-gray-300'

/**
 * Minus and plus buttons around a quantity, in steps of 1. The quantity never
 * goes below 1: removing a row is the trash button's job.
 */
export function QuantityStepper({ name, quantity, unit, onChange }: QuantityStepperProps) {
  return (
    <div className="flex flex-shrink-0 items-center" role="group" aria-label={`Quantity of ${name}`}>
      {quantity !== undefined && (
        <>
          <button
            type="button"
            onClick={() => onChange(Math.max(1, roundQuantity(quantity - 1)))}
            disabled={quantity <= 1}
            aria-label={`Decrease quantity of ${name}`}
            className={buttonClass}
          >
            <span className={circleClass}>
              <Minus className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
          <span className="min-w-6 px-0.5 text-center text-sm font-medium tabular-nums text-gray-900">
            {unit ? formatQuantity(quantity, unit) : quantity}
          </span>
        </>
      )}
      <button
        type="button"
        onClick={() => onChange(roundQuantity((quantity ?? 1) + 1))}
        aria-label={`Increase quantity of ${name}`}
        className={buttonClass}
      >
        <span className={circleClass}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
    </div>
  )
}
