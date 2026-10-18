import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, isValid, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, ShoppingCart } from 'lucide-react'
import { Snackbar } from '@/components/common'
import { MealPlanEntryCard, RecipePickerSheet, ShopForWeekSheet } from '@/components/plan'
import { useDemoStore } from '@/stores/demoStore'
import { toLocalDateString, todayDateString } from '@/utils/dates'
import {
  MEAL_SLOTS,
  buildShoppingPlan,
  formatWeekRange,
  getDefaultServings,
  getShopTitle,
  getShoppableEntries,
  getSlotLabel,
  getWeekDates,
  getWeekStart,
  getWeekTitle,
  shiftWeek,
  toShoppingListItem,
  type ShopLine,
} from '@/utils/mealPlan'
import { matchRecipeToInventory, type RecipeMatchResult } from '@/utils/recipeMatching'
import { cn } from '@/utils/cn'
import type { MealPlanEntry, MealSlot, Recipe } from '@/types'

interface SnackbarState {
  open: boolean
  message: string
  undoAction?: () => void
}

const SLOT_ORDER: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2 }

export function PlanPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    mealPlan, recipes, inventory, shoppingList,
    addMealPlanEntry, updateMealPlanEntry, removeMealPlanEntry,
    addShoppingItem, removeShoppingItem,
  } = useDemoStore()

  const [pickerTarget, setPickerTarget] = useState<{ date: string; slot: MealSlot } | null>(null)
  const [showShopSheet, setShowShopSheet] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '' })

  const today = todayDateString()

  // The shown week lives in the URL (?week=yyyy-MM-dd) so it survives going to a recipe and back
  const weekParam = searchParams.get('week')
  const weekStart = useMemo(() => {
    const parsed = weekParam ? parseISO(weekParam) : new Date()
    return getWeekStart(isValid(parsed) ? parsed : new Date())
  }, [weekParam])
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const isCurrentWeek = weekDates.includes(today)
  const weekTitle = getWeekTitle(weekStart)
  const shopTitle = getShopTitle(weekStart)

  const goToWeek = (start: Date) => {
    const isThisWeek = toLocalDateString(start) === toLocalDateString(getWeekStart(new Date()))
    setSearchParams(isThisWeek ? {} : { week: toLocalDateString(start) }, { replace: true })
  }

  const recipesById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  // Entries for each day of the shown week, by slot then when they were added
  const entriesByDate = useMemo(() => {
    const byDate = new Map<string, MealPlanEntry[]>(weekDates.map((d) => [d, []]))
    for (const entry of mealPlan) {
      if (!recipesById.has(entry.recipeId)) continue
      byDate.get(entry.date)?.push(entry)
    }
    for (const entries of byDate.values()) {
      entries.sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.createdAt.localeCompare(b.createdAt))
    }
    return byDate
  }, [mealPlan, weekDates, recipesById])

  // Pantry match per planned recipe, for the "need N items" hint
  const matchByRecipeId = useMemo(() => {
    const matches = new Map<string, RecipeMatchResult>()
    for (const entries of entriesByDate.values()) {
      for (const entry of entries) {
        const recipe = recipesById.get(entry.recipeId)
        if (recipe && !matches.has(recipe.id)) {
          matches.set(recipe.id, matchRecipeToInventory(recipe, inventory))
        }
      }
    }
    return matches
  }, [entriesByDate, recipesById, inventory])

  // What the rest of the week's meals need
  const shoppableEntries = useMemo(
    () => getShoppableEntries(mealPlan, weekDates, today).filter((e) => recipesById.has(e.recipeId)),
    [mealPlan, weekDates, today, recipesById]
  )
  const shopLines = useMemo(
    () => buildShoppingPlan(shoppableEntries, recipes, inventory, shoppingList),
    [shoppableEntries, recipes, inventory, shoppingList]
  )
  const toBuyCount = shopLines.filter((l) => l.status === 'buy' && !l.optional).length
  const toCheckCount = shopLines.filter((l) => l.status === 'check').length
  const plannedCount = weekDates.reduce(
    (sum, d) => sum + (entriesByDate.get(d)?.filter((e) => e.status !== 'skipped').length ?? 0),
    0
  )

  const shopSummary = (() => {
    if (shoppableEntries.length === 0) {
      return weekDates[6] < today ? 'This week is over' : 'Plan a meal to build your list'
    }
    const meals = `${shoppableEntries.length} meal${shoppableEntries.length !== 1 ? 's' : ''} to go`
    if (toBuyCount > 0) return `${meals} · ${toBuyCount} item${toBuyCount !== 1 ? 's' : ''} to buy`
    if (toCheckCount > 0) return `${meals} · check ${toCheckCount} in your pantry`
    return `${meals} · nothing to buy`
  })()

  const handlePick = (recipe: Recipe) => {
    if (!pickerTarget) return
    const entry = addMealPlanEntry({
      date: pickerTarget.date,
      slot: pickerTarget.slot,
      recipeId: recipe.id,
      servings: getDefaultServings(recipe),
      status: 'planned',
    })
    setPickerTarget(null)
    setSnackbar({
      open: true,
      message: `${recipe.name} added to ${getSlotLabel(entry.slot).toLowerCase()}`,
      undoAction: () => removeMealPlanEntry(entry.id),
    })
  }

  const handleRemove = (entry: MealPlanEntry) => {
    const removed = removeMealPlanEntry(entry.id)
    if (!removed) return
    const { date, slot, recipeId, servings, status } = removed
    setSnackbar({
      open: true,
      message: `${recipesById.get(recipeId)?.name ?? 'Meal'} removed from plan`,
      undoAction: () => addMealPlanEntry({ date, slot, recipeId, servings, status }),
    })
  }

  const handleAddToList = (lines: ShopLine[]) => {
    const added = lines.map((line) => addShoppingItem(toShoppingListItem(line)))
    setShowShopSheet(false)
    setSnackbar({
      open: true,
      message: `Added ${added.length} item${added.length !== 1 ? 's' : ''} to your shopping list`,
      undoAction: () => added.forEach((item) => removeShoppingItem(item.id)),
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto pb-24">
        {/* Header with week navigation */}
        <header className="sticky top-0 z-30 bg-white px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToWeek(shiftWeek(weekStart, -1))}
              aria-label="Previous week"
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">{weekTitle}</h1>
              <p className="text-xs text-gray-500">
                {formatWeekRange(weekStart)} · {plannedCount} meal{plannedCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => goToWeek(shiftWeek(weekStart, 1))}
              aria-label="Next week"
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {!isCurrentWeek && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => goToWeek(getWeekStart(new Date()))}
                className="px-3 py-1 rounded-full border border-gray-300 text-xs font-medium text-gray-600 hover:border-gray-400"
              >
                Back to this week
              </button>
            </div>
          )}
        </header>

        <div className="px-4 pt-3 space-y-3">
          {/* Shop for the week */}
          <button
            onClick={() => setShowShopSheet(true)}
            disabled={shoppableEntries.length === 0}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-600 text-white text-left shadow-sm hover:bg-purple-700 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{shopTitle}</p>
              <p className="text-xs opacity-80">{shopSummary}</p>
            </div>
            {shoppableEntries.length > 0 && <ChevronRight className="h-5 w-5 opacity-80" />}
          </button>

          {/* Days */}
          {weekDates.map((date) => {
            const entries = entriesByDate.get(date) ?? []
            const isPast = date < today
            const isToday = date === today
            const day = parseISO(date)

            return (
              <section
                key={date}
                aria-label={format(day, 'EEEE, MMMM d')}
                className={cn(
                  'bg-white rounded-xl border shadow-sm',
                  isToday ? 'border-purple-300' : 'border-gray-200'
                )}
              >
                <div className={cn('flex items-center gap-2 px-3', isPast && entries.length === 0 ? 'py-2.5' : 'pt-3 pb-1')}>
                  <h2 className={cn('font-semibold', isPast ? 'text-gray-400' : 'text-gray-900')}>
                    {format(day, 'EEEE')}
                  </h2>
                  <span className={cn('text-sm', isPast ? 'text-gray-400' : 'text-gray-500')}>
                    {format(day, 'MMM d')}
                  </span>
                  {isToday && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                      Today
                    </span>
                  )}
                  {isPast && entries.length === 0 && (
                    <span className="ml-auto text-xs text-gray-400">Nothing planned</span>
                  )}
                </div>

                {(!isPast || entries.length > 0) && (
                  <div className="px-3 pb-2 divide-y divide-gray-100">
                    {MEAL_SLOTS.map(({ key: slot, label }) => {
                      const slotEntries = entries.filter((e) => e.slot === slot)
                      // Past days only show what was planned
                      if (isPast && slotEntries.length === 0) return null

                      return (
                        <div key={slot} className="flex gap-3 py-2">
                          <div className="w-[4.5rem] flex-shrink-0 pt-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
                            {slotEntries.length > 0 && !isPast && (
                              <button
                                onClick={() => setPickerTarget({ date, slot })}
                                aria-label={`Add another ${label.toLowerCase()} on ${format(day, 'EEEE')}`}
                                className="mt-1 flex items-center gap-0.5 text-xs font-medium text-purple-600 hover:text-purple-700"
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </button>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            {slotEntries.length === 0 ? (
                              <button
                                onClick={() => setPickerTarget({ date, slot })}
                                aria-label={`Add ${label.toLowerCase()} on ${format(day, 'EEEE')}`}
                                className="w-full h-9 flex items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/50 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                                Add
                              </button>
                            ) : (
                              slotEntries.map((entry) => {
                                const recipe = recipesById.get(entry.recipeId)
                                if (!recipe) return null
                                return (
                                  <MealPlanEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    recipe={recipe}
                                    matchResult={matchByRecipeId.get(recipe.id)}
                                    onServingsChange={(servings) => updateMealPlanEntry(entry.id, { servings })}
                                    onStatusChange={(status) => updateMealPlanEntry(entry.id, { status })}
                                    onRemove={() => handleRemove(entry)}
                                  />
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>

      {pickerTarget && (
        <RecipePickerSheet
          date={pickerTarget.date}
          slot={pickerTarget.slot}
          onClose={() => setPickerTarget(null)}
          onPick={handlePick}
        />
      )}

      {showShopSheet && (
        <ShopForWeekSheet
          title={shopTitle}
          mealCount={shoppableEntries.length}
          lines={shopLines}
          onClose={() => setShowShopSheet(false)}
          onConfirm={handleAddToList}
        />
      )}

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
        onUndo={snackbar.undoAction}
      />
    </div>
  )
}
