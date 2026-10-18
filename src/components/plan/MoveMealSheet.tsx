import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { BottomSheet } from '@/components/common'
import { todayDateString } from '@/utils/dates'
import { formatMealTime } from '@/utils/mealPlan'
import type { MealPlanEntry, MealSlot, Recipe } from '@/types'
import { PlanSlotPicker } from './PlanSlotPicker'

interface MoveMealSheetProps {
  entry: MealPlanEntry
  recipe: Recipe
  onClose: () => void
  onMove: (date: string, slot: MealSlot) => void
}

// Move a planned meal to another day or meal. Missed meals start from today.
export function MoveMealSheet({ entry, recipe, onClose, onMove }: MoveMealSheetProps) {
  const [date, setDate] = useState(() => {
    const today = todayDateString()
    return entry.date >= today ? entry.date : today
  })
  const [slot, setSlot] = useState<MealSlot>(entry.slot)

  const unchanged = date === entry.date && slot === entry.slot

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Move meal"
      subtitle={`${recipe.name} · now ${formatMealTime(entry.date, entry.slot)}`}
      footer={
        <button
          onClick={() => onMove(date, slot)}
          disabled={unchanged}
          className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <ArrowRightLeft className="h-5 w-5" />
          {unchanged ? 'Pick a new day or meal' : `Move to ${formatMealTime(date, slot)}`}
        </button>
      }
    >
      <div className="p-4 space-y-6">
        <PlanSlotPicker
          date={date}
          slot={slot}
          onDateChange={setDate}
          onSlotChange={setSlot}
          ignoreEntryId={entry.id}
        />
      </div>
    </BottomSheet>
  )
}
