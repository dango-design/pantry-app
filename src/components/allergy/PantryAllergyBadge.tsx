import { useMemo } from 'react'
import { combinedBadge } from '@/allergy/display'
import { parseBarcode } from '@/allergy/lookup'
import { recordsForGtin, useAllergyStore } from '@/allergy/store'
import { verdictFor } from '@/allergy/verdict'
import { VerdictBadge } from './VerdictBadge'

function isStoreMade(gtin: string): boolean {
  try {
    return parseBarcode(gtin).storeMade
  } catch {
    return false
  }
}

/**
 * The allergy badge on a pantry card, for everyone in the household. A card can stand for several
 * batches of one product, so gtins has one entry per batch (undefined for a batch typed by hand).
 * Only batches with product data are checked; see combinedBadge for how they become one badge.
 */
export function PantryAllergyBadge({ gtins, className }: { gtins: (string | undefined)[]; className?: string }) {
  const profiles = useAllergyStore((s) => s.profiles)
  const products = useAllergyStore((s) => s.products)
  const summary = useMemo(() => {
    if (profiles.length === 0) return null
    const checked = new Set<string>()
    let unchecked = 0
    for (const gtin of gtins) {
      if (gtin && (recordsForGtin(products, gtin).length > 0 || isStoreMade(gtin))) checked.add(gtin)
      else unchecked++
    }
    const results = [...checked].map((gtin) => verdictFor(gtin, recordsForGtin(products, gtin), profiles))
    return combinedBadge(results, unchecked)
  }, [gtins, products, profiles])
  if (!summary) return null
  return <VerdictBadge verdict={summary.verdict} label={summary.text} detail={summary.detail} size="sm" className={className} />
}
