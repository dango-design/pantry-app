import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, isValid, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, ShoppingCart } from 'lucide-react'
import { Snackbar } from '@/components/common'
import { TabHeader } from '@/components/layout'
import { MealPlanEntryCard, MoveMealSheet, RecipePickerSheet, ShopForWeekSheet } from '@/components/plan'
import { useMealDrag } from '@/components/plan/useMealDrag'
import { useDemoStore } from '@/stores/demoStore'
import { toLocalDateString, todayDateString } from '@/utils/dates'
import {
  MEAL_SLOTS,
  buildShoppingPlan,
  formatMealTime,
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
  const [moveTarget, setMoveTarget] = useState<MealPlanEntry | null>(null)
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

  // /plan?add=yyyy-MM-dd&slot=dinner (from the Add sheet) opens the recipe picker for
  // that slot on its week, then drops the params so going back doesn't reopen it
  useEffect(() => {
    const date = searchParams.get('add')
    const slot = searchParams.get('slot')
    if (!date) return
    const parsed = parseISO(date)
    const target = isValid(parsed) && MEAL_SLOTS.some((s) => s.key === slot) ? { date, slot: slot as MealSlot } : null
    if (target) setPickerTarget(target)
    const start = toLocalDateString(getWeekStart(isValid(parsed) ? parsed : new Date()))
    const isThisWeek = start === toLocalDateString(getWeekStart(new Date()))
    setSearchParams(isThisWeek ? {} : { week: start }, { replace: true })
  }, [searchParams, setSearchParams])

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

  // Move a meal to another day/slot. Skipped meals become planned again.
  const moveEntry = (entry: MealPlanEntry, date: string, slot: MealSlot) => {
    if (entry.date === date && entry.slot === slot) return
    const previous = { date: entry.date, slot: entry.slot, status: entry.status }
    updateMealPlanEntry(entry.id, { date, slot, status: 'planned' })
    setSnackbar({
      open: true,
      message: `Moved to ${formatMealTime(date, slot)}`,
      undoAction: () => updateMealPlanEntry(entry.id, previous),
    })
  }

  const { drag, getHandleProps, getCardProps } = useMealDrag((entryId, target) => {
    const entry = mealPlan.find((e) => e.id === entryId)
    if (entry) moveEntry(entry, target.date, target.slot)
  })

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
        <TabHeader
          title="Meal plan"
          tool={
            <div className="h-10 flex items-center rounded-lg border border-gray-200">
              <button
                onClick={() => goToWeek(shiftWeek(weekStart, -1))}
                aria-label="Previous week"
                className="w-10 h-full flex items-center justify-center rounded-l-lg text-gray-600 hover:bg-gray-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="flex-1 min-w-0 truncate text-center text-sm" aria-live="polite">
                <span className="font-medium text-gray-900">{weekTitle}</span>
                <span className="text-gray-500"> · {formatWeekRange(weekStart)}</span>
              </p>
              <button
                onClick={() => goToWeek(shiftWeek(weekStart, 1))}
                aria-label="Next week"
                className="w-10 h-full flex items-center justify-center rounded-r-lg text-gray-600 hover:bg-gray-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          }
        >
          {!isCurrentWeek && (
            <div className="flex justify-center">
              <button
                onClick={() => goToWeek(getWeekStart(new Date()))}
                className="px-3 py-1 rounded-full border border-gray-300 text-xs font-medium text-gray-600 hover:border-gray-400"
              >
                Back to this week
              </button>
            </div>
          )}
        </TabHeader>

        <div className="px-4 pt-2 space-y-3">
          {/* Shop for the week */}
          <button
            onClick={() => setShowShopSheet(true)}
            disabled={shoppableEntries.length === 0}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary text-white text-left shadow-sm hover:bg-primary-hover transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
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
                  isToday ? 'border-primary/40' : 'border-gray-200'
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
                    <span className="px-2 py-0.5 rounded-full bg-primary-muted text-primary text-xs font-medium">
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
                      const isDropTarget = drag?.target?.date === date && drag.target.slot === slot

                      return (
                        <div
                          key={slot}
                          // Meals can be dragged onto today and later
                          data-drop-date={isPast ? undefined : date}
                          data-drop-slot={isPast ? undefined : slot}
                          className={cn(
                            'flex gap-3 py-2 -mx-2 px-2 rounded-lg transition-colors',
                            isDropTarget && 'bg-primary-soft ring-2 ring-inset ring-primary/30'
                          )}
                        >
                          {/* Label lines up with the dashed Add button, or with the first card's title */}
                          <div className={cn('w-[4.5rem] flex-shrink-0', slotEntries.length > 0 ? 'pt-3.5' : 'pt-2.5')}>
                            <p className="text-xs font-medium text-gray-500">{label}</p>
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            {slotEntries.map((entry) => {
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
                                  onMove={() => setMoveTarget(entry)}
                                  onMoveToDate={(newDate) => moveEntry(entry, newDate, entry.slot)}
                                  dragHandleProps={getHandleProps(entry.id, recipe.name, () => setMoveTarget(entry))}
                                  cardProps={getCardProps(entry.id, recipe.name, () => setMoveTarget(entry))}
                                  isDragging={drag?.entryId === entry.id}
                                />
                              )
                            })}

                            {/* Empty slots and filled ones both end in the same Add button; past days are read-only */}
                            {!isPast && (
                              <button
                                onClick={() => setPickerTarget({ date, slot })}
                                aria-label={`Add ${slotEntries.length > 0 ? 'another ' : ''}${label.toLowerCase()} on ${format(day, 'EEEE')}`}
                                className="w-full h-9 flex items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary/40 hover:text-primary hover:bg-primary-soft/50 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                                {isDropTarget ? 'Drop here' : 'Add'}
                              </button>
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

      {moveTarget && recipesById.get(moveTarget.recipeId) && (
        <MoveMealSheet
          entry={moveTarget}
          recipe={recipesById.get(moveTarget.recipeId)!}
          onClose={() => setMoveTarget(null)}
          onMove={(date, slot) => {
            moveEntry(moveTarget, date, slot)
            setMoveTarget(null)
          }}
        />
      )}

      {/* What's being dragged follows the pointer, just above it so a finger doesn't hide it */}
      {drag && (
        <div
          className="fixed z-50 pointer-events-none max-w-[14rem] truncate px-3 py-2 rounded-xl bg-white border border-primary-muted shadow-lg text-sm font-medium text-gray-900"
          style={{ left: drag.x, top: drag.y, transform: 'translate(-50%, calc(-100% - 0.75rem)) rotate(-2deg)' }}
        >
          {drag.label}
        </div>
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
