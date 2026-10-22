import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, UtensilsCrossed } from 'lucide-react'
import { RecipeCard } from '@/components/recipes'
import { CARD_GRID, TabHeader, TabSearchField, pageContainer } from '@/components/layout'
import { RecipeFilterSheet, type RecipeDifficulty } from '@/components/recipes/RecipeFilterSheet'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* New recipes come from the + in the nav (Add sheet) */}
      <TabHeader
        title="Recipes"
        tool={<TabSearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search recipes" />}
      >
        {/* Filter + Quick filter chips */}
        <div className="flex items-center gap-2 md:items-start">
          <button
            onClick={() => setShowFilterSheet(true)}
            aria-label="Filters"
            title="Filters"
            className="relative w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex-1 overflow-x-auto scrollbar-hide -mr-4 pr-4 md:mr-0 md:pr-0 md:overflow-visible">
            <div className="flex gap-2 w-max md:w-auto md:flex-wrap">
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
      </TabHeader>

      {/* Content: one column of cards on phones, a grid on wider screens */}
      <div className={cn(pageContainer('wide'), 'pt-2 pb-6 md:pt-6 md:pb-10')}>
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
          <div className={CARD_GRID}>
            {filteredResults.map((result) => (
              <RecipeCard
                key={result.recipe.id}
                recipe={result.recipe}
                matchResult={result}
              />
            ))}
          </div>
        )}
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
    </div>
  )
}
