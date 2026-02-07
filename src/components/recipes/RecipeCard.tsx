import { useNavigate } from 'react-router-dom'
import { Clock, Users, Heart, ChefHat } from 'lucide-react'
import { Card, CardContent } from '@/components/common'
import { cn } from '@/utils/cn'
import type { Recipe } from '@/types'
import type { RecipeMatchResult } from '@/utils/recipeMatching'

interface RecipeCardProps {
  recipe: Recipe
  matchResult?: RecipeMatchResult
  onCook?: () => void
}

function getMatchColor(score: number): string {
  if (score === 100) return 'bg-green-100 text-green-700'
  if (score >= 80) return 'bg-amber-100 text-amber-700'
  if (score >= 50) return 'bg-orange-100 text-orange-700'
  return 'bg-gray-100 text-gray-600'
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

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={() => navigate(`/recipe/${recipe.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="font-semibold text-gray-900 truncate">{recipe.name}</h3>

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

          {/* Right side: match score + favorite */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {matchResult && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                getMatchColor(matchResult.matchScore)
              )}>
                {matchResult.matchScore}%
              </span>
            )}
            {recipe.isFavorite && (
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
