import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { badgeSummary, condenseReasons, LABEL_NOTICE, redPeople } from '@/allergy/display'
import { useAllergyStore, useRecordsForGtin } from '@/allergy/store'
import { parseBarcode } from '@/allergy/lookup'
import { SOURCE_LABEL } from '@/allergy/products'
import { verdictFor } from '@/allergy/verdict'
import { VerdictBadge } from './VerdictBadge'
import { VERDICT_ICON } from './verdictStyle'

/**
 * The verdict for everyone in the household, shown on the add page after a scan and before saving.
 * Reports who it is not safe for, so the page can ask for a second tap.
 */
export function AddItemAllergyCheck({
  gtin,
  onRedPeople,
}: {
  gtin: string
  onRedPeople: (people: { name: string; reason: string }[]) => void
}) {
  const profiles = useAllergyStore((s) => s.profiles)
  const records = useRecordsForGtin(gtin)
  const storeMade = useMemo(() => {
    try {
      return parseBarcode(gtin).storeMade
    } catch {
      return false
    }
  }, [gtin])
  const result = useMemo(() => (profiles.length > 0 ? verdictFor(gtin, records, profiles) : null), [gtin, records, profiles])
  const red = useMemo(() => (result ? redPeople(result) : []), [result])

  useEffect(() => {
    onRedPeople(red)
  }, [red, onRedPeople])

  if (!result) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
        Allergy check: nobody to check for yet.{' '}
        <Link to="/settings/allergies" className="font-medium text-primary underline">
          Add people
        </Link>
      </div>
    )
  }

  const summary = badgeSummary(result)
  const notGreen = result.profiles.filter((p) => p.verdict !== 'green')
  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-700">Allergy check</p>
        <VerdictBadge verdict={summary.verdict} label={summary.text} detail={summary.detail} size="sm" />
      </div>
      {!storeMade &&
        notGreen.map((p) => (
          <div key={p.profileId} className="text-sm">
            <p className="font-medium text-gray-900">{p.profileName}</p>
            <ul>
              {condenseReasons(p.reasons).map((l, i) => {
                const Icon = VERDICT_ICON[l.verdict]
                return (
                  <li key={i} className="flex items-start gap-1.5 text-gray-700">
                    <Icon aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {l.message}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      {result.display.source && (
        <p className="text-xs text-gray-500">Source: {SOURCE_LABEL[result.display.source]}</p>
      )}
      <p className="flex items-start gap-1.5 text-xs text-gray-600">
        <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {LABEL_NOTICE}
      </p>
    </div>
  )
}
