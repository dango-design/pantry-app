import { useState, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, Clock, Users, ChefHat, Edit2, Trash2, CookingPot, ShoppingCart } from 'lucide-react'
import { Button, Card, CardContent, Dialog, DialogActions, Snackbar } from '@/components/common'
import { IngredientMatchList } from '@/components/recipes'
import { useDemoStore } from '@/stores/demoStore'
import { matchRecipeToInventory } from '@/utils/recipeMatching'
import { cn } from '@/utils/cn'

interface SnackbarState {
  open: boolean
  message: string
  undoAction?: () => void
}

export function RecipeDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const {
    recipes, inventory, toggleRecipeFavorite, markRecipeCooked,
    deleteRecipe, useItem, addShoppingItem, updateItem,
  } = useDemoStore()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCookDialog, setShowCookDialog] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '' })

  const recipe = useMemo(() => recipes.find((r) => r.id === id), [recipes, id])

  const matchResult = useMemo(() => {
    if (!recipe) return null
    return matchRecipeToInventory(recipe, inventory)
  }, [recipe, inventory])

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

  // Initialize cook dialog: pre-check all available ingredients
  const handleOpenCookDialog = () => {
    if (!matchResult) return
    const checked = new Set<number>()
    recipe.ingredients.forEach((_, index) => {
      const isAvailable = matchResult.availableIngredients.some(
        (a) => a.ingredient === recipe.ingredients[index]
      )
      if (isAvailable) checked.add(index)
    })
    setCheckedIngredients(checked)
    setShowCookDialog(true)
  }

  const handleCook = useCallback(() => {
    if (!matchResult) return

    // Track what was consumed for undo
    const consumedItems: Array<{ id: string; previousQuantity: number }> = []

    // Deduct checked ingredients from inventory
    for (const index of checkedIngredients) {
      const ingredient = recipe.ingredients[index]
      const match = matchResult.availableIngredients.find(
        (a) => a.ingredient === ingredient
      )
      if (match?.matchedItem) {
        consumedItems.push({
          id: match.matchedItem.id,
          previousQuantity: match.matchedItem.quantity,
        })
        useItem(match.matchedItem.id, ingredient.quantity)
      }
    }

    markRecipeCooked(recipe.id)
    setShowCookDialog(false)

    setSnackbar({
      open: true,
      message: `Marked "${recipe.name}" as cooked!`,
      undoAction: () => {
        // Restore consumed inventory items
        for (const item of consumedItems) {
          updateItem(item.id, { quantity: item.previousQuantity, status: 'active', consumedAt: undefined })
        }
        // Undo the cooked count
        useDemoStore.getState().updateRecipe(recipe.id, {
          timesCooked: Math.max(0, recipe.timesCooked),
          lastCookedAt: recipe.lastCookedAt,
        })
      },
    })
  }, [recipe, matchResult, checkedIngredients, useItem, markRecipeCooked, updateItem])

  const handleAddMissingToList = useCallback(() => {
    if (!matchResult) return
    let count = 0
    for (const missing of matchResult.missingIngredients) {
      if (missing.ingredient.isOptional) continue
      addShoppingItem({
        shoppingListId: 'demo-list',
        name: missing.ingredient.name,
        quantity: missing.ingredient.quantity,
        quantityUnit: missing.ingredient.unit as any,
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
  }, [matchResult, addShoppingItem])

  const handleAddSingleToList = useCallback((name: string, quantity: number, unit: string) => {
    addShoppingItem({
      shoppingListId: 'demo-list',
      name,
      quantity,
      quantityUnit: unit as any,
      isChecked: false,
      source: 'recipe',
      priority: 'normal',
    })
    setSnackbar({ open: true, message: `${name} added to shopping list` })
  }, [addShoppingItem])

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
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
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
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-medium">
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
            className="flex-1 bg-purple-600 hover:bg-purple-700"
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
        description="Which ingredients did you use? We'll deduct them from your pantry."
      >
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recipe.ingredients.map((ingredient, index) => {
            const isAvailable = matchResult?.availableIngredients.some(
              (a) => a.ingredient === ingredient
            )
            return (
              <label
                key={index}
                className={cn(
                  'flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer',
                  !isAvailable && 'opacity-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={checkedIngredients.has(index)}
                  disabled={!isAvailable}
                  onChange={(e) => {
                    const newSet = new Set(checkedIngredients)
                    if (e.target.checked) {
                      newSet.add(index)
                    } else {
                      newSet.delete(index)
                    }
                    setCheckedIngredients(newSet)
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  {!isAvailable && ' (not in pantry)'}
                </span>
              </label>
            )
          })}
        </div>
        <DialogActions>
          <Button variant="secondary" onClick={() => setShowCookDialog(false)}>Cancel</Button>
          <Button onClick={handleCook}>Done Cooking</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
        onUndo={snackbar.undoAction}
      />
    </div>
  )
}
