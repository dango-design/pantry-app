import { addDays, addWeeks, differenceInCalendarDays, format, isSameMonth, parseISO, startOfWeek } from 'date-fns'
import type {
  FoodCategory,
  FoodItem,
  MealPlanEntry,
  MealSlot,
  QuantityUnit,
  Recipe,
  RecipeIngredient,
  ShoppingListItem,
} from '@/types'
import { QUANTITY_UNITS } from './constants'
import { toLocalDateString, todayDateString } from './dates'
import { ingredientMatchesItem } from './recipeMatching'

export const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
]

export function getSlotLabel(slot: MealSlot): string {
  return MEAL_SLOTS.find((s) => s.key === slot)?.label ?? slot
}

// ---------------------------------------------------------------------------
// Dates. Plan dates are local 'yyyy-MM-dd' strings, so they compare as strings.
// Weeks run Monday to Sunday.
// ---------------------------------------------------------------------------

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function getWeekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => toLocalDateString(addDays(weekStart, i)))
}

// "Oct 12 – 18", or "Sep 28 – Oct 4" across months
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const end = isSameMonth(weekStart, weekEnd) ? format(weekEnd, 'd') : format(weekEnd, 'MMM d')
  return `${format(weekStart, 'MMM d')} – ${end}`
}

// Weeks from the current one: 0 this week, 1 next week, -1 last week
export function getWeekOffset(weekStart: Date, today = new Date()): number {
  return Math.round(differenceInCalendarDays(weekStart, getWeekStart(today)) / 7)
}

const RELATIVE_WEEKS: Record<number, string> = { [-1]: 'last week', 0: 'this week', 1: 'next week' }

// "This week", "Next week", "Last week", otherwise the date range
export function getWeekTitle(weekStart: Date, today = new Date()): string {
  const relative = RELATIVE_WEEKS[getWeekOffset(weekStart, today)]
  return relative ? relative.charAt(0).toUpperCase() + relative.slice(1) : formatWeekRange(weekStart)
}

// "Shop for this week", "Shop for Oct 26 – Nov 1"
export function getShopTitle(weekStart: Date, today = new Date()): string {
  return `Shop for ${RELATIVE_WEEKS[getWeekOffset(weekStart, today)] ?? formatWeekRange(weekStart)}`
}

export function shiftWeek(weekStart: Date, weeks: number): Date {
  return addWeeks(weekStart, weeks)
}

// "Today", "Tomorrow", "Yesterday", otherwise "Tue, Oct 20"
export function formatRelativeDay(dateString: string, today = new Date()): string {
  const days = differenceInCalendarDays(parseISO(dateString), today)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return format(parseISO(dateString), 'EEE, MMM d')
}

// formatRelativeDay for the middle of a sentence: "tomorrow", "Tue, Oct 20"
export function formatRelativeDayInline(dateString: string, today = new Date()): string {
  const day = formatRelativeDay(dateString, today)
  return /^(Today|Tomorrow|Yesterday)$/.test(day) ? day.toLowerCase() : day
}

// "dinner tomorrow", "lunch on Tue, Oct 20"
export function formatMealTime(dateString: string, slot: MealSlot, today = new Date()): string {
  const meal = getSlotLabel(slot).toLowerCase()
  const day = formatRelativeDay(dateString, today)
  return /^(Today|Tomorrow|Yesterday)$/.test(day) ? `${meal} ${day.toLowerCase()}` : `${meal} on ${day}`
}

// The day after a meal, but never in the past: a missed meal moves to today
export function getNextPlanDay(date: string, today = todayDateString()): string {
  const next = toLocalDateString(addDays(parseISO(date), 1))
  return next > today ? next : today
}

// ---------------------------------------------------------------------------
// Servings
// ---------------------------------------------------------------------------

// Guess a slot from the recipe's tags
export function getDefaultSlot(recipe: Recipe): MealSlot {
  const tags = recipe.tags.map((t) => t.toLowerCase())
  if (tags.includes('breakfast')) return 'breakfast'
  if (tags.includes('lunch')) return 'lunch'
  return 'dinner'
}

export function getDefaultServings(recipe: Recipe): number {
  return recipe.servings || 1
}

// How many batches of the recipe an entry needs.
// A recipe without a serving count is treated as one batch per serving.
export function getScaleFactor(entry: MealPlanEntry, recipe: Recipe): number {
  return entry.servings / (recipe.servings || 1)
}

// ---------------------------------------------------------------------------
// Quantities
// ---------------------------------------------------------------------------

// Units you buy whole: half a pack means buying a pack
const WHOLE_UNITS: QuantityUnit[] = ['count', 'unit', 'pack', 'bunch', 'dozen']

function roundForUnit(quantity: number, unit: QuantityUnit): number {
  if (WHOLE_UNITS.includes(unit)) return Math.ceil(quantity - 1e-9)
  return Math.max(0.01, Math.round(quantity * 100) / 100)
}

// "2 tbsp", "0.67 lb", "8" (count has no label)
export function formatQuantity(quantity: number, unit: QuantityUnit): string {
  const amount = String(Math.round(quantity * 100) / 100)
  const label = QUANTITY_UNITS[unit]?.shortLabel ?? unit
  return label ? `${amount} ${label}` : amount
}

// Amount of `quantity` (in `from`) expressed in `to`, or null when the units
// can't be compared. Only identical units for now; swap in a unit-conversion
// helper here to also merge e.g. tbsp with tsp.
function amountInUnit(quantity: number, from: QuantityUnit, to: QuantityUnit): number | null {
  return from === to ? quantity : null
}

// ---------------------------------------------------------------------------
// Plan → shopping list
// ---------------------------------------------------------------------------

/** Planned (not cooked or skipped) entries in the given dates, from today on */
export function getShoppableEntries(
  mealPlan: MealPlanEntry[],
  dates: string[],
  today: string,
): MealPlanEntry[] {
  const dateSet = new Set(dates)
  return mealPlan.filter((e) => e.status === 'planned' && dateSet.has(e.date) && e.date >= today)
}

export type ShopLineStatus =
  | 'buy' // not in the pantry (or not enough of it): add to the list
  | 'check' // in the pantry in another unit, so we can't tell if there's enough
  | 'on_list' // already on the shopping list
  | 'covered' // the pantry has enough

export interface ShopLine {
  key: string
  name: string
  unit: QuantityUnit
  /** Total the planned meals need, scaled by servings */
  needed: number
  /** Pantry stock in the same unit */
  inPantry: number
  /** What to put on the list, rounded up for whole units */
  toBuy: number
  /** Optional in every recipe that uses it */
  optional: boolean
  /** Names of the recipes that use it, in plan order */
  recipes: string[]
  /** Matching pantry items in any unit */
  pantryMatches: FoodItem[]
  category?: FoodCategory
  status: ShopLineStatus
}

const STATUS_ORDER: Record<ShopLineStatus, number> = { buy: 0, check: 1, on_list: 2, covered: 3 }

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Sum the ingredients of the given plan entries, scaled by servings, merged by
 * name and unit. Then subtract what the pantry has and flag what's already on
 * the shopping list.
 */
export function buildShoppingPlan(
  entries: MealPlanEntry[],
  recipes: Recipe[],
  inventory: FoodItem[],
  shoppingList: ShoppingListItem[],
): ShopLine[] {
  const recipesById = new Map(recipes.map((r) => [r.id, r]))
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  // Merge ingredients across entries
  const merged = new Map<string, { ingredient: RecipeIngredient; needed: number; optional: boolean; recipes: string[]; substitutes: Set<string> }>()
  for (const entry of sortedEntries) {
    const recipe = recipesById.get(entry.recipeId)
    if (!recipe) continue
    const factor = getScaleFactor(entry, recipe)

    for (const ingredient of recipe.ingredients) {
      const key = `${normalizeName(ingredient.name)}|${ingredient.unit}`
      let line = merged.get(key)
      if (!line) {
        line = { ingredient, needed: 0, optional: true, recipes: [], substitutes: new Set() }
        merged.set(key, line)
      }
      line.needed += ingredient.quantity * factor
      line.optional = line.optional && ingredient.isOptional
      if (!line.recipes.includes(recipe.name)) line.recipes.push(recipe.name)
      for (const sub of ingredient.substitutes ?? []) line.substitutes.add(sub)
    }
  }

  const activeItems = inventory.filter((item) => item.status === 'active' && item.quantity > 0)
  const listNames = new Set(shoppingList.map((item) => normalizeName(item.name)))

  const lines: ShopLine[] = []
  for (const [key, line] of merged) {
    const { name, unit } = line.ingredient
    // Match the pantry the same way the recipe pages do, including substitutes
    const probe: RecipeIngredient = { ...line.ingredient, substitutes: [...line.substitutes] }
    const pantryMatches = activeItems.filter((item) => ingredientMatchesItem(probe, item))

    let inPantry = 0
    let hasOtherUnit = false
    for (const item of pantryMatches) {
      const amount = amountInUnit(item.quantity, item.quantityUnit, unit)
      if (amount === null) hasOtherUnit = true
      else inPantry += amount
    }

    const remaining = line.needed - inPantry
    let status: ShopLineStatus
    if (remaining <= 1e-9) status = 'covered'
    else if (listNames.has(normalizeName(name))) status = 'on_list'
    else if (hasOtherUnit) status = 'check'
    else status = 'buy'

    lines.push({
      key,
      name: name.trim(),
      unit,
      needed: line.needed,
      inPantry,
      toBuy: remaining > 0 ? roundForUnit(remaining, unit) : 0,
      optional: line.optional,
      recipes: line.recipes,
      pantryMatches,
      category: pantryMatches[0]?.category,
      status,
    })
  }

  return lines.sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    Number(a.optional) - Number(b.optional) ||
    a.name.localeCompare(b.name)
  )
}

export function toShoppingListItem(line: ShopLine): Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    shoppingListId: 'demo-list',
    name: line.name,
    category: line.category ?? 'other',
    quantity: line.toBuy,
    quantityUnit: line.unit,
    notes: `For ${line.recipes.join(', ')}`,
    isChecked: false,
    source: 'recipe',
    priority: 'normal',
  }
}
