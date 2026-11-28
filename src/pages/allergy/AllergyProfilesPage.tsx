import { Link, useNavigate } from 'react-router-dom'
import { ChefHat, ChevronRight, Plus } from 'lucide-react'
import { allergenName, unreviewedTermCount } from '@/allergy/dictionary'
import { useAllergyStore } from '@/allergy/store'
import type { AllergyProfile } from '@/allergy/types'
import { Button, Card, CardContent } from '@/components/common'
import { PageHeader, pageContainer } from '@/components/layout'
import { cn } from '@/utils/cn'

function allergySummary(p: AllergyProfile): string {
  const parts = [
    ...p.allergens.map((a) => `${allergenName(a.allergenId)} (${a.severity})`),
    ...(p.customAvoids ?? []).map((c) => c.term),
  ]
  return parts.length > 0 ? parts.join(', ') : 'No allergies added'
}

/** Settings, then Allergies: the people the household checks food for. */
export function AllergyProfilesPage() {
  const navigate = useNavigate()
  const profiles = useAllergyStore((s) => s.profiles)
  const unreviewed = unreviewedTermCount()

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Allergies" onBack={() => navigate('/settings')} />
      <div className={cn(pageContainer('narrow'), 'py-4 space-y-4 md:py-6')}>
        <p className="text-sm text-gray-600">
          Add each person you check food for. They don't need an account. Every product check shows a result for each of them.
        </p>

        {profiles.length > 0 && (
          <Card>
            <ul className="divide-y divide-gray-100">
              {profiles.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/settings/allergies/${p.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-gray-900">{p.name}</span>
                      <span className="block truncate text-sm text-gray-500">{allergySummary(p)}</span>
                    </span>
                    <ChevronRight aria-hidden className="h-5 w-5 text-gray-400" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Button onClick={() => navigate('/settings/allergies/new')} className="w-full" size="lg">
          <Plus aria-hidden className="mr-2 h-5 w-5" />
          Add a person
        </Button>

        {profiles.length > 0 && (
          <Link
            to="/chef-card"
            className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-primary hover:bg-primary-soft"
          >
            <ChefHat aria-hidden className="h-4 w-4" />
            Chef card for restaurants
          </Link>
        )}

        <Card>
          <CardContent className="space-y-1 text-xs text-gray-500">
            <p>
              Verdicts come from a fixed allergen dictionary with a source for every word (FARE, FDA, Open Food Facts, EU
              1169/2011, Celiac Disease Foundation). No AI decides whether food is safe.
            </p>
            {unreviewed > 0 && (
              <p>
                {unreviewed} dictionary words were suggested by Claude and are waiting for a person to review them. Until then
                a match on one of them gives only "Check first", and they never hide another word.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
