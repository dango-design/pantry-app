import { useMemo } from 'react'
import { badgeSummary } from '@/allergy/display'
import { useAllergyStore, useRecordsForGtin } from '@/allergy/store'
import { parseBarcode } from '@/allergy/lookup'
import { verdictFor } from '@/allergy/verdict'
import { VerdictBadge } from './VerdictBadge'

/**
 * The allergy badge on a pantry card, for everyone in the household. It shows only for items that
 * have product data from a barcode. Items typed by hand were never checked, so they get no badge.
 */
export function PantryAllergyBadge({ gtin, className }: { gtin: string; className?: string }) {
  const profiles = useAllergyStore((s) => s.profiles)
  const records = useRecordsForGtin(gtin)
  const storeMade = useMemo(() => {
    try {
      return parseBarcode(gtin).storeMade
    } catch {
      return false
    }
  }, [gtin])
  const summary = useMemo(() => {
    if (profiles.length === 0 || (records.length === 0 && !storeMade)) return null
    return badgeSummary(verdictFor(gtin, records, profiles))
  }, [gtin, records, profiles, storeMade])
  if (!summary) return null
  return <VerdictBadge verdict={summary.verdict} label={summary.text} detail={summary.detail} size="sm" className={className} />
}
