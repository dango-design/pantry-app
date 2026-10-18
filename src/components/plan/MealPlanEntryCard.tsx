import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Clock, MoreVertical, RotateCcw, SkipForward, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { MealPlanEntry, MealPlanStatus, Recipe } from '@/types'
import type { RecipeMatchResult } from '@/utils/recipeMatching'
import { ServingsStepper } from './ServingsStepper'

interface MealPlanEntryCardProps {
  entry: MealPlanEntry
  recipe: Recipe
  matchResult?: RecipeMatchResult
  onServingsChange: (servings: number) => void
  onStatusChange: (status: MealPlanStatus) => void
  onRemove: () => void
}

export function MealPlanEntryCard({
  entry,
  recipe,
  matchResult,
  onServingsChange,
  onStatusChange,
  onRemove,
}: MealPlanEntryCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)
  const isPlanned = entry.status === 'planned'
  const missingCount = matchResult
    ? matchResult.missingIngredients.filter((m) => !m.ingredient.isOptional).length
    : 0

  const menuItems: { label: string; icon: typeof Check; onClick: () => void; danger?: boolean }[] = [
    isPlanned
      ? { label: 'Mark as cooked', icon: Check, onClick: () => onStatusChange('cooked') }
      : { label: 'Back to planned', icon: RotateCcw, onClick: () => onStatusChange('planned') },
    ...(isPlanned ? [{ label: 'Skip', icon: SkipForward, onClick: () => onStatusChange('skipped') }] : []),
    { label: 'Remove', icon: Trash2, onClick: onRemove, danger: true },
  ]

  return (
    <div className={cn('rounded-xl bg-[#F7F2FA] px-3 py-2', entry.status === 'skipped' && 'opacity-60')}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => navigate(`/recipe/${recipe.id}`)}
          className="flex-1 min-w-0 text-left"
        >
          <p
            className={cn(
              'text-sm font-medium text-gray-900 truncate',
              entry.status === 'skipped' && 'line-through text-gray-500'
            )}
          >
            {recipe.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {totalTime}m
              </span>
            )}
            {entry.status === 'cooked' && (
              <span className="flex items-center gap-0.5 text-green-700 font-medium">
                <Check className="h-3 w-3" />
                Cooked
              </span>
            )}
            {entry.status === 'skipped' && <span className="font-medium">Skipped</span>}
            {isPlanned && matchResult && (
              missingCount === 0 ? (
                <span className="text-green-700">All in pantry</span>
              ) : (
                <span className="text-amber-700">Need {missingCount} item{missingCount !== 1 ? 's' : ''}</span>
              )
            )}
          </div>
        </button>

        <div className="relative -mr-1.5">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label={`Options for ${recipe.name}`}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-black/5"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[170px]">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setShowMenu(false)
                      item.onClick()
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-50',
                      item.danger ? 'text-red-600' : 'text-gray-700'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {isPlanned ? (
        <div className="mt-1.5">
          <ServingsStepper value={entry.servings} onChange={onServingsChange} />
        </div>
      ) : (
        <p className="mt-1 text-xs text-gray-500">
          {entry.servings} serving{entry.servings !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
