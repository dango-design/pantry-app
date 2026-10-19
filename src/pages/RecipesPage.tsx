import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Plus, Sparkles, UtensilsCrossed } from 'lucide-react'
import { RecipeCard } from '@/components/recipes'
import { RecipeFilterSheet, type RecipeDifficulty } from '@/components/recipes/RecipeFilterSheet'
import { Snackbar } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { matchAllRecipes } from '@/utils/recipeMatching'
import { cn } from '@/utils/cn'
import type { DietaryRestriction } from '@/types'

type QuickFilter = 'all' | 'can_cook' | 'almost' | 'quick' | 'favorites'

const QUICK_FILTER_CHIPS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'can_cook', label: 'Can cook' },
  { key: 'almost', label: 'Almost' },
  { key: 'quick', label: 'Quick' },
  { key: 'favorites', label: 'Favorites' },
]

export function RecipesPage() {
  const navigate = useNavigate()
  const { recipes, inventory } = useDemoStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  // Filter sheet state
  const [cuisine, setCuisine] = useState('All')
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>('all')
  const [dietaryFilters, setDietaryFilters] = useState<Set<DietaryRestriction>>(new Set())
  const [maxCookTime, setMaxCookTime] = useState(0)

  const activeFilterCount =
    (cuisine === 'All' ? 0 : 1) +
    (difficulty === 'all' ? 0 : 1) +
    dietaryFilters.size +
    (maxCookTime === 0 ? 0 : 1)

  const handleResetFilters = () => {
    setCuisine('All')
    setDifficulty('all')
    setDietaryFilters(new Set())
    setMaxCookTime(0)
  }

  // Compute match results for all recipes
  const matchResults = useMemo(() => {
    return matchAllRecipes(recipes, inventory)
  }, [recipes, inventory])

  // Apply filters
  const filteredResults = useMemo(() => {
    let results = matchResults

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      results = results.filter((r) =>
        r.recipe.name.toLowerCase().includes(query) ||
        r.recipe.description?.toLowerCase().includes(query) ||
        r.recipe.tags.some((t) => t.toLowerCase().includes(query))
      )
    }

    // Quick filter
    switch (quickFilter) {
      case 'can_cook':
        results = results.filter((r) => r.matchScore === 100)
        break
      case 'almost':
        results = results.filter((r) => r.matchScore >= 80)
        break
      case 'quick': {
        results = results.filter((r) => {
          const total = (r.recipe.prepTimeMinutes || 0) + (r.recipe.cookTimeMinutes || 0)
          return total > 0 && total <= 30
        })
        break
      }
      case 'favorites':
        results = results.filter((r) => r.recipe.isFavorite)
        break
    }

    // Sheet filters
    if (cuisine !== 'All') {
      results = results.filter((r) => r.recipe.cuisine === cuisine)
    }

    if (difficulty !== 'all') {
      results = results.filter((r) => r.recipe.difficulty === difficulty)
    }

    if (dietaryFilters.size > 0) {
      results = results.filter((r) =>
        [...dietaryFilters].every((d) => r.recipe.dietaryInfo.includes(d))
      )
    }

    if (maxCookTime > 0) {
      results = results.filter((r) => {
        const total = (r.recipe.prepTimeMinutes || 0) + (r.recipe.cookTimeMinutes || 0)
        return total > 0 && total <= maxCookTime
      })
    }

    return results
  }, [matchResults, searchQuery, quickFilter, cuisine, difficulty, dietaryFilters, maxCookTime])

  const handleAiSuggest = () => {
    setSnackbar({
      open: true,
      message: 'AI suggestions require Supabase. Configure your .env to enable this feature.',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto pb-24">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white px-4 pt-4 pb-3">
          {/* Search row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search recipes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={handleAiSuggest}
              className="w-10 h-10 flex items-center justify-center text-primary hover:text-primary-hover"
              title="AI suggest"
            >
              <Sparkles className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/recipe/new')}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-800"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Filter + Quick filter chips */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setShowFilterSheet(true)}
              className="relative w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex-1 overflow-x-auto scrollbar-hide -mr-4 pr-4">
              <div className="flex gap-2 w-max">
                {QUICK_FILTER_CHIPS.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setQuickFilter(chip.key)}
                    className={cn(
                      'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                      quickFilter === chip.key
                        ? 'bg-primary text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 pt-2 space-y-2">
          {filteredResults.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-1">
                {recipes.length === 0 ? 'No recipes yet' : 'No matching recipes'}
              </p>
              <p className="text-sm">
                {recipes.length === 0
                  ? 'Add your first recipe to get started'
                  : 'Try adjusting your filters'
                }
              </p>
              {recipes.length === 0 && (
                <button
                  onClick={() => navigate('/recipe/new')}
                  className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
                >
                  Add recipe
                </button>
              )}
            </div>
          ) : (
            filteredResults.map((result) => (
              <RecipeCard
                key={result.recipe.id}
                recipe={result.recipe}
                matchResult={result}
              />
            ))
          )}
        </div>
      </div>

      <RecipeFilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        cuisine={cuisine}
        onCuisineChange={setCuisine}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        dietaryFilters={dietaryFilters}
        onDietaryChange={setDietaryFilters}
        maxCookTime={maxCookTime}
        onMaxCookTimeChange={setMaxCookTime}
        onReset={handleResetFilters}
      />

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
      />
    </div>
  )
}
