import { Link } from 'react-router-dom'
import { ChevronRight, UtensilsCrossed } from 'lucide-react'
import { useDemoStore } from '@/stores/demoStore'
import { todayDateString } from '@/utils/dates'

// "Tonight: <recipe>" when today has a planned dinner
export function TonightBanner() {
  const { mealPlan, recipes } = useDemoStore()
  const today = todayDateString()

  const dinners = mealPlan
    .filter((e) => e.date === today && e.slot === 'dinner' && e.status === 'planned')
    .map((e) => recipes.find((r) => r.id === e.recipeId))
    .filter((r) => r !== undefined)

  if (dinners.length === 0) return null
  const [recipe, ...others] = dinners

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-purple-50 border border-purple-100 text-sm hover:bg-purple-100 transition-colors"
    >
      <UtensilsCrossed className="h-4 w-4 text-purple-600 flex-shrink-0" />
      <span className="flex-1 min-w-0 truncate text-gray-900">
        <span className="font-medium text-purple-700">Tonight:</span> {recipe.name}
        {others.length > 0 && <span className="text-gray-500"> +{others.length} more</span>}
      </span>
      <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0" />
    </Link>
  )
}
