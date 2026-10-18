import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, Clock, Users, ChefHat, Edit2, Trash2, CookingPot, ShoppingCart, CalendarPlus } from 'lucide-react'
import { Button, Card, CardContent, Dialog, DialogActions, Snackbar } from '@/components/common'
import { IngredientMatchList } from '@/components/recipes'
import { AddToPlanSheet } from '@/components/plan'
import { useDemoStore } from '@/stores/demoStore'
import { matchRecipeToInventory, type IngredientMatch } from '@/utils/recipeMatching'
import { convertQuantity, formatUnit, roundQuantity } from '@/utils/units'
import { cn } from '@/utils/cn'
import type { QuantityUnit } from '@/types'
import { todayDateString } from '@/utils/dates'
import { formatMealTime, formatRelativeDay, getSlotLabel } from '@/utils/mealPlan'

interface SnackbarState {
  open: boolean
  message: string
  undoAction?: () => void
}

// How much of the matched pantry item an ingredient uses, in the pantry item's unit.
// null when the units can't be converted (e.g. 1 cup of spinach from a 1 pack item).
function getPantryAmount(match: IngredientMatch): number | null {
  if (!match.matchedItem) return null
  const converted = convertQuantity(match.ingredient.quantity, match.ingredient.unit, match.matchedItem.quantityUnit)
  if (converted === null) return null
  return roundQuantity(Math.min(converted, match.matchedItem.quantity))
}

export function RecipeDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const {
    recipes, inventory, toggleRecipeFavorite, markRecipeCooked,
    deleteRecipe, consumeItem, addShoppingItem, updateItem,
  } = useDemoStore()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCookDialog, setShowCookDialog] = useState(false)
  // Amount used per ingredient index, in the matched pantry item's unit
  const [usedAmounts, setUsedAmounts] = useState<Record<number, string>>({})
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '' })
  const [showPlanSheet, setShowPlanSheet] = useState(false)
  const mealPlan = useDemoStore((state) => state.mealPlan)

  const recipe = useMemo(() => recipes.find((r) => r.id === id), [recipes, id])

  const matchResult = useMemo(() => {
    if (!recipe) return null
    return matchRecipeToInventory(recipe, inventory)
  }, [recipe, inventory])

  // Upcoming planned meals for this recipe
  const upcomingPlans = useMemo(() => {
    const today = todayDateString()
    return mealPlan
      .filter((e) => e.recipeId === id && e.status === 'planned' && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [mealPlan, id])

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Recipe not found</p>
          <Button onClick={() => navigate('/recipes')}>Go to Recipes</Button>
        </div>
      </div>
    )
  }

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)

  const handleDelete = () => {
    deleteRecipe(recipe.id)
    navigate('/recipes')
  }

  // Initialize cook dialog: prefill amounts only where the recipe unit converts
  // to the pantry unit. Otherwise leave it empty so nothing is deducted by guesswork.
  const handleOpenCookDialog = () => {
    if (!matchResult) return
    const amounts: Record<number, string> = {}
    for (const match of matchResult.availableIngredients) {
      const amount = getPantryAmount(match)
      amounts[recipe.ingredients.indexOf(match.ingredient)] = amount === null ? '' : String(amount)
    }
    setUsedAmounts(amounts)
    setShowCookDialog(true)
  }

  const handleCook = () => {
    if (!matchResult) return

    // Quantities before cooking, for undo
    const previousQuantities = new Map<string, number>()

    // Deduct the amounts used from inventory
    for (const match of matchResult.availableIngredients) {
      if (!match.matchedItem) continue
      const amount = Number(usedAmounts[recipe.ingredients.indexOf(match.ingredient)])
      if (!(amount > 0)) continue
      if (!previousQuantities.has(match.matchedItem.id)) {
        previousQuantities.set(match.matchedItem.id, match.matchedItem.quantity)
      }
      consumeItem(match.matchedItem.id, amount)
    }

    markRecipeCooked(recipe.id)
    setShowCookDialog(false)

    setSnackbar({
      open: true,
      message: `Marked "${recipe.name}" as cooked!`,
      undoAction: () => {
        // Restore consumed inventory items
        for (const [itemId, previousQuantity] of previousQuantities) {
          updateItem(itemId, { quantity: previousQuantity, status: 'active', consumedAt: undefined })
        }
        // Undo the cooked count
        useDemoStore.getState().updateRecipe(recipe.id, {
          timesCooked: Math.max(0, recipe.timesCooked),
          lastCookedAt: recipe.lastCookedAt,
        })
      },
    })
  }

  const handleAddMissingToList = () => {
    if (!matchResult) return
    let count = 0
    for (const missing of matchResult.missingIngredients) {
      if (missing.ingredient.isOptional) continue
      addShoppingItem({
        shoppingListId: 'demo-list',
        name: missing.ingredient.name,
        quantity: missing.ingredient.quantity,
        quantityUnit: missing.ingredient.unit,
        isChecked: false,
        source: 'recipe',
        priority: 'normal',
      })
      count++
    }
    setSnackbar({
      open: true,
      message: `Added ${count} item${count !== 1 ? 's' : ''} to shopping list`,
    })
  }

  const handleAddSingleToList = (name: string, quantity: number, unit: string) => {
    addShoppingItem({
      shoppingListId: 'demo-list',
      name,
      quantity,
      quantityUnit: unit as QuantityUnit,
      isChecked: false,
      source: 'recipe',
      priority: 'normal',
    })
    setSnackbar({ open: true, message: `${name} added to shopping list` })
  }

  const requiredMissingCount = matchResult
    ? matchResult.missingIngredients.filter((m) => !m.ingredient.isOptional).length
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate mx-4">Recipe</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleRecipeFavorite(recipe.id)}
              className="p-2 text-gray-500 hover:text-red-500"
            >
              <Heart
                className={cn('h-5 w-5', recipe.isFavorite && 'fill-red-500 text-red-500')}
              />
            </button>
            <button
              onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <Edit2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4 pb-32">
        {/* Hero section */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-bold text-gray-900">{recipe.name}</h2>
            {recipe.description && (
              <p className="text-sm text-gray-500 mt-1">{recipe.description}</p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-600">
              {totalTime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes}m prep` : ''}
                  {recipe.prepTimeMinutes && recipe.cookTimeMinutes ? ' + ' : ''}
                  {recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes}m cook` : ''}
                </span>
              )}
              {recipe.servings && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {recipe.servings} servings
                </span>
              )}
              {recipe.difficulty && (
                <span className="flex items-center gap-1">
                  <ChefHat className="h-4 w-4" />
                  {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
                </span>
              )}
            </div>

            {/* Tags */}
            {(recipe.cuisine || recipe.tags.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {recipe.cuisine && (
                  <span className="px-2 py-0.5 bg-primary-soft text-primary rounded-full text-xs font-medium">
                    {recipe.cuisine}
                  </span>
                )}
                {recipe.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Meal plan */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={() => setShowPlanSheet(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
              >
                <CalendarPlus className="h-4 w-4" />
                Plan
              </button>
              {upcomingPlans.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => navigate(`/plan?week=${entry.date}`)}
                  className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors"
                >
                  {formatRelativeDay(entry.date)} · {getSlotLabel(entry.slot)}
                </button>
              ))}
            </div>

            {/* Match score */}
            {matchResult && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${matchResult.matchScore}%`,
                      backgroundColor: matchResult.matchScore === 100
                        ? '#22C55E'
                        : matchResult.matchScore >= 80
                          ? '#F59E0B'
                          : matchResult.matchScore >= 50
                            ? '#F97316'
                            : '#9CA3AF',
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {matchResult.matchScore}% match
                </span>
              </div>
            )}

            {recipe.timesCooked > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Cooked {recipe.timesCooked} time{recipe.timesCooked !== 1 ? 's' : ''}
                {recipe.lastCookedAt && ` · Last: ${new Date(recipe.lastCookedAt).toLocaleDateString()}`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Ingredients ({recipe.ingredients.length})
            </h3>
            {matchResult && (
              <IngredientMatchList
                available={matchResult.availableIngredients}
                missing={matchResult.missingIngredients}
                onAddToList={handleAddSingleToList}
              />
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
            <ol className="space-y-3">
              {recipe.instructions.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-muted text-primary rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Notes */}
        {recipe.notes && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{recipe.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed action buttons */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            onClick={handleOpenCookDialog}
            className="flex-1 bg-primary hover:bg-primary-hover"
            size="lg"
          >
            <CookingPot className="h-5 w-5 mr-2" />
            I Made This
          </Button>
          {requiredMissingCount > 0 && (
            <Button
              onClick={handleAddMissingToList}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add Missing ({requiredMissingCount})
            </Button>
          )}
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="secondary"
            size="lg"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Recipe"
        description={`Are you sure you want to delete "${recipe.name}"? This cannot be undone.`}
      >
        <DialogActions>
          <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Cook Dialog */}
      <Dialog
        open={showCookDialog}
        onClose={() => setShowCookDialog(false)}
        title="I Made This!"
        description="How much did you use? We'll deduct it from your pantry."
      >
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {recipe.ingredients.map((ingredient, index) => {
            const match = matchResult?.availableIngredients.find(
              (a) => a.ingredient === ingredient
            )
            const pantryItem = match?.matchedItem
            const ingredientLabel = `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`

            if (!match || !pantryItem) {
              return (
                <div key={index} className="py-2 text-sm text-gray-400">
                  {ingredientLabel} (not in pantry)
                </div>
              )
            }

            const pantryUnit = formatUnit(pantryItem.quantityUnit)
            const isConvertible = getPantryAmount(match) !== null
            return (
              <div key={index} className="py-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{ingredientLabel}</p>
                    <p className="text-xs text-gray-500 truncate">
                      Pantry: {pantryItem.name} · {pantryItem.quantity} {pantryUnit}
                    </p>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={pantryItem.quantity}
                    step="any"
                    placeholder="0"
                    value={usedAmounts[index] ?? ''}
                    onChange={(e) => setUsedAmounts({ ...usedAmounts, [index]: e.target.value })}
                    aria-label={`Amount of ${pantryItem.name} used, in ${pantryUnit}`}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <span className="w-10 text-sm text-gray-500">{pantryUnit}</span>
                </div>
                {!isConvertible && (
                  <p className="text-xs text-amber-700 mt-1">
                    Recipe is in {ingredient.unit}, pantry is in {pantryUnit}. Enter how much you used.
                  </p>
                )}
              </div>
            )
          })}
        </div>
        <DialogActions>
          <Button variant="secondary" onClick={() => setShowCookDialog(false)}>Cancel</Button>
          <Button onClick={handleCook}>Done Cooking</Button>
        </DialogActions>
      </Dialog>

      {showPlanSheet && (
        <AddToPlanSheet
          recipe={recipe}
          onClose={() => setShowPlanSheet(false)}
          onAdded={(entry) => {
            setShowPlanSheet(false)
            setSnackbar({
              open: true,
              message: `Planned for ${formatMealTime(entry.date, entry.slot)}`,
              undoAction: () => useDemoStore.getState().removeMealPlanEntry(entry.id),
            })
          }}
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
