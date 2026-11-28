import { cn } from '@/utils/cn'
import { DINNER_ROLES, DINNER_ROLE_LABELS, ROLE_COLORS, ROLE_PLURALS, describeLimit, type DinnerEstimate } from './pantryInsights'

export interface DinnersPanelProps {
  estimate: DinnerEstimate
  /** From countCookableRecipes. Leave out, or total 0, to hide the recipe line. */
  recipes?: { cookable: number; total: number }
}

// Whole dinners, rounded down, since part of a dinner is not a dinner. "Under 1" below that.
function formatDinners(value: number): string {
  const whole = Math.floor(value + 1e-9)
  if (whole < 1) return value > 0 ? 'under 1' : 'none'
  return `${whole} ${whole === 1 ? 'dinner' : 'dinners'}`
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
 * the pantry's items are for (a bar split by role), how many dinners the
 * mains, bases and veg would each last, and the overall count for the
 * household. Pass the result of estimateDinners. Render it inside a TilePanel.
 */
export function DinnersPanel({ estimate, recipes }: DinnersPanelProps) {
  const { roleCounts, totalProducts, dinnersBy, householdSize, dinners, limitedBy } = estimate
  const maxDinners = Math.max(...DINNER_ROLES.map((role) => dinnersBy[role]))
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

      {/* How many dinners each of the three dinner roles would last */}
      <ul className="space-y-1.5">
        {DINNER_ROLES.map((role) => {
          const fill = maxDinners > 0 ? dinnersBy[role] / maxDinners : 0
          return (
            <li key={role} className="grid grid-cols-[58px_1fr_auto] items-center gap-2 text-xs">
              <span className={cn('text-gray-700', role === limitedBy && 'font-semibold text-gray-900')}>
                {DINNER_ROLE_LABELS[role]}
              </span>
              <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-gray-100">
                <span className="block h-full rounded-full" style={{ width: `${fill * 100}%`, backgroundColor: ROLE_COLORS[role] }} />
              </span>
              <span className="text-right tabular-nums text-gray-600">{formatDinners(dinnersBy[role])}</span>
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
          An estimate from amounts, at about 6 oz of a main per person. Expired food and snacking fruit are left out.
        </p>
      </div>

      {recipes && recipes.total > 0 && <p className="text-xs text-gray-600">{recipeLine(recipes)}</p>}
    </div>
  )
}
