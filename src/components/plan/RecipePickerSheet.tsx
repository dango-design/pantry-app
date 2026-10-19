import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Plus, Search, TriangleAlert, UtensilsCrossed } from 'lucide-react'
import { BottomSheet } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { matchAllRecipes } from '@/utils/recipeMatching'
import { formatRelativeDay, getSlotLabel } from '@/utils/mealPlan'
import { cn } from '@/utils/cn'
import type { MealSlot, Recipe } from '@/types'

interface RecipePickerSheetProps {
  date: string
  slot: MealSlot
  onClose: () => void
  onPick: (recipe: Recipe) => void
}

function getMatchColor(score: number): string {
  if (score === 100) return 'bg-green-100 text-green-700'
  if (score >= 80) return 'bg-amber-100 text-amber-700'
  if (score >= 50) return 'bg-orange-100 text-orange-700'
  return 'bg-gray-100 text-gray-600'
}

// Pick a recipe for one day and meal. Recipes that use expiring food come first.
export function RecipePickerSheet({ date, slot, onClose, onPick }: RecipePickerSheetProps) {
  const navigate = useNavigate()
  const { recipes, inventory } = useDemoStore()
  const [searchQuery, setSearchQuery] = useState('')

  const results = useMemo(() => {
    const matched = matchAllRecipes(recipes, inventory)
    const query = searchQuery.trim().toLowerCase()
    if (!query) return matched
    return matched.filter((r) =>
      r.recipe.name.toLowerCase().includes(query) ||
      r.recipe.tags.some((t) => t.toLowerCase().includes(query))
    )
  }, [recipes, inventory, searchQuery])

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Add a recipe"
      subtitle={`${formatRelativeDay(date)} · ${getSlotLabel(slot)}`}
    >
      {recipes.length === 0 ? (
        <div className="text-center py-12 px-4 text-gray-500">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed className="h-7 w-7 text-gray-400" />
          </div>
          <p className="font-medium mb-1">No recipes yet</p>
          <p className="text-sm">Add a recipe, then plan it here</p>
          <button
            onClick={() => navigate('/recipe/new')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            Add recipe
          </button>
        </div>
      ) : (
        <>
          <div className="px-4 pt-3 pb-2 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search recipes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Recipes that use food expiring soon come first</p>
          </div>

          {results.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">No matching recipes</p>
          ) : (
            <ul className="pb-4">
              {results.map(({ recipe, matchScore, expiringIngredientsUsed }) => {
                const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)
                return (
                  <li key={recipe.id}>
                    <button
                      onClick={() => onPick(recipe)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{recipe.name}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-gray-500">
                          {totalTime > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {totalTime}m
                            </span>
                          )}
                          {recipe.cuisine && <span>{recipe.cuisine}</span>}
                          {expiringIngredientsUsed > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                              <TriangleAlert className="h-3 w-3" />
                              Uses {expiringIngredientsUsed} expiring
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', getMatchColor(matchScore))}>
                        {matchScore}%
                      </span>
                      <Plus className="h-5 w-5 text-primary flex-shrink-0" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </BottomSheet>
  )
}
