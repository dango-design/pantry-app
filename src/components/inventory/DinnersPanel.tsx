import { cn } from '@/utils/cn'
import { DINNER_ROLES, DINNER_ROLE_LABELS, ROLE_COLORS, ROLE_PLURALS, describeLimit, type DinnerEstimate } from './pantryInsights'

export interface DinnersPanelProps {
  estimate: DinnerEstimate
  /** From countCookableRecipes. Leave out, or total 0, to hide the recipe line. */
  recipes?: { cookable: number; total: number }
}

// Whole numbers from 10 up ("66"), one decimal below that ("2.5"). These are estimates, so more detail would mislead.
function formatServings(value: number): string {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${rounded === 1 ? 'serving' : 'servings'}`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function recipeLine({ cookable, total }: { cookable: number; total: number }): string {
  const recipes = `your ${total} ${total === 1 ? 'recipe' : 'recipes'}`
  if (cookable === 0) return `None of ${recipes} can be made with what you have now.`
  return `You can make ${cookable} of ${recipes} now.`
}

/**
 * The body of the "Dinners on hand" panel on the Pantry tab. It shows what
 * the pantry's items are for (a bar split by role), servings of mains, bases
 * and veg, and about how many dinners those make for the household. Pass the
 * result of estimateDinners. Render it inside a TilePanel.
 */
export function DinnersPanel({ estimate, recipes }: DinnersPanelProps) {
  const { roleCounts, totalProducts, servings, householdSize, dinners, limitedBy } = estimate
  const maxServings = Math.max(...DINNER_ROLES.map((role) => servings[role]))
  const people = `${householdSize} ${householdSize === 1 ? 'person' : 'people'}`
  const limit = `${capitalize(describeLimit(limitedBy))}.`
  const barLabel = `Items by role: ${roleCounts.map(({ role, count }) => `${ROLE_PLURALS[role]} ${count}`).join(', ')}`

  return (
    <div className="space-y-3 px-3 py-3">
      {/* What the items are for */}
      <div>
        <p className="text-xs font-semibold text-gray-900">
          What your {totalProducts} {totalProducts === 1 ? 'item is' : 'items are'} for
        </p>
        {roleCounts.length > 0 && (
          <>
            <div role="img" aria-label={barLabel} className="mt-1.5 flex h-3.5 gap-0.5 overflow-hidden rounded">
              {roleCounts.map(({ role, count }) => (
                <span key={role} className="h-full min-w-[2px]" style={{ flexGrow: count, flexBasis: 0, backgroundColor: ROLE_COLORS[role] }} />
              ))}
            </div>
            <ul aria-hidden className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {roleCounts.map(({ role, count }) => (
                <li key={role} className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: ROLE_COLORS[role] }} />
                  {ROLE_PLURALS[role]} <span className="tabular-nums text-gray-900">{count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Servings of the three dinner roles */}
      <ul className="space-y-1.5">
        {DINNER_ROLES.map((role) => {
          const fill = maxServings > 0 ? servings[role] / maxServings : 0
          return (
            <li key={role} className="grid grid-cols-[58px_1fr_auto] items-center gap-2 text-xs">
              <span className={cn('text-gray-700', role === limitedBy && 'font-semibold text-gray-900')}>
                {DINNER_ROLE_LABELS[role]}
              </span>
              <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-gray-100">
                <span className="block h-full rounded-full" style={{ width: `${fill * 100}%`, backgroundColor: ROLE_COLORS[role] }} />
              </span>
              <span className="text-right tabular-nums text-gray-600">{formatServings(servings[role])}</span>
            </li>
          )
        })}
      </ul>

      {/* The estimate */}
      <div className="rounded-lg bg-gray-100 px-3 py-2.5">
        <p className="text-sm text-gray-900">
          {dinners > 0 ? (
            <strong className="font-semibold">
              About {dinners} {dinners === 1 ? 'dinner' : 'dinners'}
            </strong>
          ) : (
            <strong className="font-semibold">Not enough for a full dinner</strong>
          )}{' '}
          for {people}. {limit}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          An estimate from amounts and usual portion sizes. Expired food is left out.
        </p>
      </div>

      {recipes && recipes.total > 0 && <p className="text-xs text-gray-600">{recipeLine(recipes)}</p>}
    </div>
  )
}
