import { Check } from 'lucide-react'
import { BottomSheet } from '@/components/common'
import { cn } from '@/utils/cn'
import type { DietaryRestriction } from '@/types'

export type RecipeDifficulty = 'all' | 'easy' | 'medium' | 'hard'

const CUISINE_OPTIONS = [
  'All', 'American', 'Asian', 'Italian', 'Mexican', 'Japanese', 'Indian', 'Mediterranean', 'French',
]

const DIFFICULTY_OPTIONS: { key: RecipeDifficulty; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
]

const DIETARY_OPTIONS: { key: DietaryRestriction; label: string }[] = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'gluten_free', label: 'Gluten-free' },
  { key: 'dairy_free', label: 'Dairy-free' },
  { key: 'low_carb', label: 'Low carb' },
  { key: 'keto', label: 'Keto' },
]

const MAX_COOK_TIME_OPTIONS = [
  { key: 0, label: 'Any' },
  { key: 15, label: '15 min' },
  { key: 30, label: '30 min' },
  { key: 60, label: '1 hour' },
]

interface RecipeFilterSheetProps {
  open: boolean
  onClose: () => void
  cuisine: string
  onCuisineChange: (cuisine: string) => void
  difficulty: RecipeDifficulty
  onDifficultyChange: (difficulty: RecipeDifficulty) => void
  dietaryFilters: Set<DietaryRestriction>
  onDietaryChange: (filters: Set<DietaryRestriction>) => void
  maxCookTime: number
  onMaxCookTimeChange: (minutes: number) => void
  onReset: () => void
}

export function RecipeFilterSheet({
  open,
  onClose,
  cuisine,
  onCuisineChange,
  difficulty,
  onDifficultyChange,
  dietaryFilters,
  onDietaryChange,
  maxCookTime,
  onMaxCookTimeChange,
  onReset,
}: RecipeFilterSheetProps) {
  if (!open) return null

  const activeFilterCount =
    (cuisine === 'All' ? 0 : 1) +
    (difficulty === 'all' ? 0 : 1) +
    dietaryFilters.size +
    (maxCookTime === 0 ? 0 : 1)

  const handleDietaryClick = (key: DietaryRestriction) => {
    const newSet = new Set(dietaryFilters)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    onDietaryChange(newSet)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Recipe filters"
      headerAction={
        activeFilterCount > 0 && (
          <button onClick={onReset} className="text-sm text-primary font-medium">
            Reset
          </button>
        )
      }
      footer={
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
        >
          Apply filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
      }
    >
      <div className="p-4 space-y-6">
        {/* Cuisine */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Cuisine</h3>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => onCuisineChange(c)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                  cuisine === c
                    ? 'bg-primary text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Difficulty</h3>
          <div className="space-y-1">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => onDifficultyChange(option.key)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-lg text-left',
                  difficulty === option.key
                    ? 'bg-primary-soft text-primary'
                    : 'hover:bg-gray-50 text-gray-700'
                )}
              >
                <span className="text-sm">{option.label}</span>
                {difficulty === option.key && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Dietary</h3>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => handleDietaryClick(option.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                  dietaryFilters.has(option.key)
                    ? 'bg-primary text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max cook time */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Max cook time</h3>
          <div className="flex flex-wrap gap-2">
            {MAX_COOK_TIME_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => onMaxCookTimeChange(option.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                  maxCookTime === option.key
                    ? 'bg-primary text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
