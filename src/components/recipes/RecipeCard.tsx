import { useNavigate } from 'react-router-dom'
import { Clock, Users, Heart, ChefHat } from 'lucide-react'
import { Card, CardContent } from '@/components/common'
import type { Recipe } from '@/types'
import { countRequiredIngredients, type RecipeMatchResult } from '@/utils/recipeMatching'
import { IngredientRing } from './IngredientRing'

interface RecipeCardProps {
  recipe: Recipe
  matchResult?: RecipeMatchResult
  onCook?: () => void
}

function getDifficultyLabel(difficulty?: string): string {
  switch (difficulty) {
    case 'easy': return 'Easy'
    case 'medium': return 'Medium'
    case 'hard': return 'Hard'
    default: return ''
  }
}

export function RecipeCard({ recipe, matchResult }: RecipeCardProps) {
  const navigate = useNavigate()
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)
  const counts = matchResult ? countRequiredIngredients(matchResult) : null

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={() => navigate(`/recipe/${recipe.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {/* Name, with a heart for favorites */}
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{recipe.name}</h3>
              {recipe.isFavorite && (
                <Heart className="h-3.5 w-3.5 flex-shrink-0 text-red-500 fill-red-500" aria-label="Favorite" />
              )}
            </div>

            {/* Description */}
            {recipe.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{recipe.description}</p>
            )}

            {/* Metadata row */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              {totalTime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {totalTime}m
                </span>
              )}
              {recipe.difficulty && (
                <span className="flex items-center gap-1">
                  <ChefHat className="h-3.5 w-3.5" />
                  {getDifficultyLabel(recipe.difficulty)}
                </span>
              )}
              {recipe.servings && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {recipe.servings}
                </span>
              )}
              {recipe.cuisine && (
                <span className="text-gray-400">{recipe.cuisine}</span>
              )}
            </div>
          </div>

          {/* How many ingredients are in the pantry; the recipe page lists which */}
          {counts && <IngredientRing have={counts.have} total={counts.total} />}
        </div>
      </CardContent>
    </Card>
  )
}
