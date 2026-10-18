import { useEffect, useRef, useState } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { useDemoStore } from '@/stores/demoStore'
import { toLocalDateString } from '@/utils/dates'
import { MEAL_SLOTS } from '@/utils/mealPlan'
import { cn } from '@/utils/cn'
import type { MealSlot } from '@/types'

const MIN_DAYS = 14

interface PlanSlotPickerProps {
  date: string
  slot: MealSlot
  onDateChange: (date: string) => void
  onSlotChange: (slot: MealSlot) => void
  /** The entry being moved, left out of the "also planned" hints */
  ignoreEntryId?: string
}

// Day and meal chips for putting a recipe on the plan, from today onwards
export function PlanSlotPicker({ date, slot, onDateChange, onSlotChange, ignoreEntryId }: PlanSlotPickerProps) {
  const { mealPlan, recipes } = useDemoStore()
  const dayStripRef = useRef<HTMLDivElement>(null)
  const selectedDayRef = useRef<HTMLButtonElement>(null)

  // Two weeks from today, or enough to reach a week past the starting date
  const [days] = useState(() => {
    const today = new Date()
    const count = Math.max(MIN_DAYS, differenceInCalendarDays(parseISO(date), today) + 8)
    return Array.from({ length: count }, (_, i) => {
      const day = addDays(today, i)
      return {
        value: toLocalDateString(day),
        weekday: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : format(day, 'EEE'),
        label: format(day, 'MMM d'),
      }
    })
  })

  // Center the starting day in the strip. Only the strip scrolls: scrollIntoView
  // would also scroll the page while the sheet is still sliding in.
  useEffect(() => {
    const strip = dayStripRef.current
    const chip = selectedDayRef.current
    if (strip && chip) strip.scrollLeft = chip.offsetLeft - (strip.clientWidth - chip.clientWidth) / 2
  }, [])

  const otherEntries = mealPlan.filter((e) => e.id !== ignoreEntryId && e.status !== 'skipped')
  const mealsPerDay = new Map<string, number>()
  for (const e of otherEntries) mealsPerDay.set(e.date, (mealsPerDay.get(e.date) ?? 0) + 1)

  const alreadyPlanned = otherEntries
    .filter((e) => e.date === date && e.slot === slot)
    .map((e) => recipes.find((r) => r.id === e.recipeId)?.name)
    .filter((name): name is string => !!name)

  return (
    <>
      {/* Day */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Day</h3>
        <div ref={dayStripRef} className="relative overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 w-max">
            {days.map((d) => {
              const isSelected = date === d.value
              const meals = mealsPerDay.get(d.value) ?? 0
              return (
                <button
                  key={d.value}
                  ref={isSelected ? selectedDayRef : undefined}
                  onClick={() => onDateChange(d.value)}
                  aria-pressed={isSelected}
                  aria-label={`${format(parseISO(d.value), 'EEEE, MMMM d')}, ${meals} meal${meals !== 1 ? 's' : ''} planned`}
                  className={cn(
                    'flex flex-col items-center w-14 pt-2 pb-1.5 rounded-xl border text-xs transition-all',
                    isSelected
                      ? 'bg-primary text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  )}
                >
                  <span className="font-medium">{d.weekday}</span>
                  <span className={cn('mt-0.5', isSelected ? 'text-white/70' : 'text-gray-400')}>{d.label}</span>
                  {/* One dot per meal already planned that day */}
                  <span className="flex gap-0.5 h-1.5 mt-1" aria-hidden="true">
                    {Array.from({ length: Math.min(meals, 3) }, (_, i) => (
                      <span
                        key={i}
                        className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-white/70' : 'bg-primary/40')}
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Meal */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Meal</h3>
        <div className="flex flex-wrap gap-2">
          {MEAL_SLOTS.map((s) => (
            <button
              key={s.key}
              onClick={() => onSlotChange(s.key)}
              aria-pressed={slot === s.key}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                slot === s.key
                  ? 'bg-primary text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {alreadyPlanned.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">Also planned: {alreadyPlanned.join(', ')}</p>
        )}
      </div>
    </>
  )
}
