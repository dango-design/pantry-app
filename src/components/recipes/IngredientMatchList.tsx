import { Check, X, ShoppingCart } from 'lucide-react'
import type { IngredientMatch } from '@/utils/recipeMatching'
import { cn } from '@/utils/cn'

interface IngredientMatchListProps {
  available: IngredientMatch[]
  missing: IngredientMatch[]
  onAddToList?: (ingredientName: string, quantity: number, unit: string) => void
  compact?: boolean
}

export function IngredientMatchList({ available, missing, onAddToList, compact = false }: IngredientMatchListProps) {
  const allIngredients = [...available, ...missing]

  return (
    <div className="space-y-1">
      {allIngredients.map((match, index) => {
        const { ingredient, matched, isExpiring } = match
        return (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 py-1.5',
              !compact && 'px-2'
            )}
          >
            {/* Status icon */}
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
              matched ? 'bg-green-100' : 'bg-red-100'
            )}>
              {matched ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
            </div>

            {/* Ingredient info */}
            <div className="flex-1 min-w-0">
              <span className={cn(
                'text-sm',
                matched ? 'text-gray-900' : 'text-gray-500'
              )}>
                {ingredient.quantity} {ingredient.unit} {ingredient.name}
                {ingredient.preparation && (
                  <span className="text-gray-400"> ({ingredient.preparation})</span>
                )}
                {ingredient.isOptional && (
                  <span className="text-gray-400 text-xs ml-1">optional</span>
                )}
              </span>
              {isExpiring && (
                <span className="text-xs text-amber-600 ml-1">expiring soon</span>
              )}
            </div>

            {/* Add to list button for missing ingredients */}
            {!matched && !ingredient.isOptional && onAddToList && (
              <button
                onClick={() => onAddToList(ingredient.name, ingredient.quantity, ingredient.unit)}
                className="p-1.5 text-primary hover:bg-primary-soft rounded-lg flex-shrink-0"
                title="Add to shopping list"
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
