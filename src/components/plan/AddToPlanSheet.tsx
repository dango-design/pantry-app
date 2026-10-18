import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { BottomSheet } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { todayDateString } from '@/utils/dates'
import { getDefaultServings, getDefaultSlot } from '@/utils/mealPlan'
import type { MealPlanEntry, MealSlot, Recipe } from '@/types'
import { PlanSlotPicker } from './PlanSlotPicker'
import { ServingsStepper } from './ServingsStepper'

interface AddToPlanSheetProps {
  recipe: Recipe
  onClose: () => void
  onAdded: (entry: MealPlanEntry) => void
}

// Plan a recipe from its detail page: pick a day, a meal and servings
export function AddToPlanSheet({ recipe, onClose, onAdded }: AddToPlanSheetProps) {
  const addMealPlanEntry = useDemoStore((state) => state.addMealPlanEntry)

  const [date, setDate] = useState(todayDateString)
  const [slot, setSlot] = useState<MealSlot>(() => getDefaultSlot(recipe))
  const [servings, setServings] = useState(() => getDefaultServings(recipe))

  const handleAdd = () => {
    const entry = addMealPlanEntry({ date, slot, recipeId: recipe.id, servings, status: 'planned' })
    onAdded(entry)
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Add to meal plan"
      subtitle={recipe.name}
      footer={
        <button
          onClick={handleAdd}
          className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
        >
          <CalendarPlus className="h-5 w-5" />
          Add to plan
        </button>
      }
    >
      <div className="p-4 space-y-6">
        <PlanSlotPicker date={date} slot={slot} onDateChange={setDate} onSlotChange={setSlot} />

        {/* Servings */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Servings</h3>
          <ServingsStepper value={servings} onChange={setServings} size="md" />
          {recipe.servings && servings !== recipe.servings && (
            <p className="text-xs text-gray-500 mt-2">
              Recipe makes {recipe.servings}. Shopping amounts scale to {servings}.
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
