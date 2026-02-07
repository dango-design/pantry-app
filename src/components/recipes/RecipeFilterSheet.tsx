import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
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
  { key: 'gluten_free', label: 'Gluten-Free' },
  { key: 'dairy_free', label: 'Dairy-Free' },
  { key: 'low_carb', label: 'Low Carb' },
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
  const sheetRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
    }
  }, [open])

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const diff = currentY - dragStartY.current
    if (diff > 0) setDragY(diff)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragY > 100) onClose()
    setDragY(0)
  }

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
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden transition-transform duration-300 ease-out'
        )}
        style={{
          transform: isVisible
            ? `translateY(${isDragging ? dragY : 0}px)`
            : 'translateY(100%)',
        }}
      >
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recipe Filters</h2>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button onClick={onReset} className="text-sm text-purple-600 font-medium">
                Reset
              </button>
            )}
            <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-6 max-h-[calc(85vh-100px)]">
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
                      ? 'bg-purple-600 text-white border-transparent'
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
                      ? 'bg-purple-50 text-purple-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <span className="text-sm">{option.label}</span>
                  {difficulty === option.key && <Check className="h-4 w-4 text-purple-600" />}
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
                      ? 'bg-purple-600 text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Cook Time */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Max Cook Time</h3>
            <div className="flex flex-wrap gap-2">
              {MAX_COOK_TIME_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => onMaxCookTimeChange(option.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                    maxCookTime === option.key
                      ? 'bg-purple-600 text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 safe-area-bottom">
          <button
            onClick={onClose}
            className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Apply Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
