import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { CalendarPlus } from 'lucide-react'
import { BottomSheet } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { toLocalDateString } from '@/utils/dates'
import { MEAL_SLOTS, getDefaultServings, getDefaultSlot } from '@/utils/mealPlan'
import { cn } from '@/utils/cn'
import type { MealPlanEntry, MealSlot, Recipe } from '@/types'
import { ServingsStepper } from './ServingsStepper'

const DAYS_AHEAD = 14

interface AddToPlanSheetProps {
  recipe: Recipe
  onClose: () => void
  onAdded: (entry: MealPlanEntry) => void
}

// Plan a recipe from its detail page: pick a day, a meal and servings
export function AddToPlanSheet({ recipe, onClose, onAdded }: AddToPlanSheetProps) {
  const { mealPlan, recipes, addMealPlanEntry } = useDemoStore()

  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const date = addDays(today, i)
      return {
        value: toLocalDateString(date),
        weekday: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : format(date, 'EEE'),
        day: format(date, 'MMM d'),
      }
    })
  }, [])

  const [date, setDate] = useState(days[0].value)
  const [slot, setSlot] = useState<MealSlot>(() => getDefaultSlot(recipe))
  const [servings, setServings] = useState(() => getDefaultServings(recipe))

  // Other recipes already in the chosen slot
  const alreadyPlanned = mealPlan
    .filter((e) => e.date === date && e.slot === slot && e.status !== 'skipped')
    .map((e) => recipes.find((r) => r.id === e.recipeId)?.name)
    .filter((name): name is string => !!name)

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
          className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          <CalendarPlus className="h-5 w-5" />
          Add to plan
        </button>
      }
    >
      <div className="p-4 space-y-6">
        {/* Day */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Day</h3>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 w-max">
              {days.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDate(d.value)}
                  aria-pressed={date === d.value}
                  className={cn(
                    'flex flex-col items-center w-14 py-2 rounded-xl border text-xs transition-all',
                    date === d.value
                      ? 'bg-purple-600 text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  )}
                >
                  <span className="font-medium">{d.weekday}</span>
                  <span className={cn('mt-0.5', date === d.value ? 'text-purple-100' : 'text-gray-400')}>{d.day}</span>
                </button>
              ))}
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
                onClick={() => setSlot(s.key)}
                aria-pressed={slot === s.key}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                  slot === s.key
                    ? 'bg-purple-600 text-white border-transparent'
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
