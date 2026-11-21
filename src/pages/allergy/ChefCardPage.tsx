import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Printer, Share2 } from 'lucide-react'
import { buildChefCard, chefCardToText } from '@allergy/food-data'
import { getDictionary } from '@/allergy/dictionary'
import { useAllergyStore, useSelectedProfiles } from '@/allergy/store'
import { PersonChips } from '@/components/allergy'
import { Button, Card, CardContent } from '@/components/common'
import { PageHeader, pageContainer } from '@/components/layout'
import { cn } from '@/utils/cn'

/**
 * A card to show restaurant staff, in English. The text is fixed wording built from the profiles
 * (buildChefCard), so it works offline. Translations come from the chef-card Edge Function in step 3.
 */
export function ChefCardPage() {
  const { profiles, selected, selectedIds } = useSelectedProfiles()
  const setSelectedProfileIds = useAllergyStore((s) => s.setSelectedProfileIds)
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const card = useMemo(() => {
    // People with nothing to avoid would give an empty sentence, so they are left off the card.
    const withAllergies = selected.filter((p) => p.allergens.length > 0 || (p.customAvoids?.length ?? 0) > 0)
    return withAllergies.length > 0 ? buildChefCard(withAllergies, getDictionary().allergens) : null
  }, [selected])

  const copy = async () => {
    if (!card) return
    await navigator.clipboard.writeText(chefCardToText(card))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = async () => {
    if (!card) return
    try {
      await navigator.share({ title: card.title, text: chefCardToText(card) })
    } catch {
      // The person closed the share sheet.
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <PageHeader title="Chef card" />
      <div className={cn(pageContainer('narrow'), 'py-4 space-y-4 md:py-6 print:max-w-none print:p-0')}>
        {profiles.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-gray-700">
              Add people and their allergies first.{' '}
              <Link to="/settings/allergies" className="font-medium text-primary underline">
                Settings, then Allergies
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="print:hidden">
            <PersonChips
              label="Card for"
              profiles={profiles}
              selectedIds={selectedIds}
              onChange={(ids) => setSelectedProfileIds(ids.length === profiles.length ? null : ids)}
            />
          </div>
        )}

        {card ? (
          <>
            <article className="rounded-2xl border-2 border-gray-900 bg-white p-6 print:rounded-none print:border-4 print:p-10">
              <h2 className="mb-4 text-2xl font-bold text-gray-900 print:text-4xl">{card.title}</h2>
              <div className="space-y-3 text-lg leading-relaxed text-gray-900 print:text-2xl">
                {card.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </article>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:hidden">
              <Button onClick={() => window.print()}>
                <Printer aria-hidden className="mr-1.5 h-4 w-4" />
                Print
              </Button>
              <Button variant="secondary" onClick={() => void copy()}>
                <Copy aria-hidden className="mr-1.5 h-4 w-4" />
                {copied ? 'Copied' : 'Copy text'}
              </Button>
              {canShare && (
                <Button variant="secondary" onClick={() => void share()}>
                  <Share2 aria-hidden className="mr-1.5 h-4 w-4" />
                  Share
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 print:hidden">Translated cards come later, with the family server.</p>
          </>
        ) : (
          profiles.length > 0 && (
            <p className="text-sm text-gray-600">
              {selected.length === 0 ? 'Choose who the card is for.' : 'The people chosen have no allergies listed yet.'}
            </p>
          )
        )}
      </div>
    </div>
  )
}
