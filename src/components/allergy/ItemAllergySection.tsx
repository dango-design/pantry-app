import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShieldQuestion } from 'lucide-react'
import { useAllergyStore, useRecordsForGtin } from '@/allergy/store'
import { parseBarcode } from '@/allergy/lookup'
import { productName } from '@/allergy/products'
import { verdictFor } from '@/allergy/verdict'
import { AllergyResult } from './AllergyResult'

/**
 * The allergy result on a pantry item's page, for everyone in the household. Items without product
 * data say so plainly instead of showing a verdict.
 */
export function ItemAllergySection({ gtin, itemName, onScanBarcode }: { gtin?: string; itemName: string; onScanBarcode?: () => void }) {
  const profiles = useAllergyStore((s) => s.profiles)
  const records = useRecordsForGtin(gtin)
  const storeMade = useMemo(() => {
    if (!gtin) return false
    try {
      return parseBarcode(gtin).storeMade
    } catch {
      return false
    }
  }, [gtin])
  const result = useMemo(
    () => (gtin && (records.length > 0 || storeMade) ? verdictFor(gtin, records, profiles) : null),
    [gtin, records, profiles, storeMade],
  )

  if (!result) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
        <ShieldQuestion aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-2">
          <p>
            <span className="font-semibold">Not checked: no ingredient list.</span>{' '}
            {gtin
              ? 'Open Food Facts has no record for this barcode. Read the label on the package.'
              : 'Scan the barcode to check it for allergens.'}
          </p>
          {!gtin && onScanBarcode && (
            <button type="button" onClick={onScanBarcode} className="font-medium text-purple-700 underline">
              Scan barcode
            </button>
          )}
        </div>
      </div>
    )
  }

  const { name, brand } = productName(records)
  const fetchedAt = records.map((r) => r.fetchedAt).sort().pop()
  return (
    <AllergyResult
      result={result}
      title={records.length > 0 ? name : itemName}
      brand={brand}
      profiles={profiles}
      fetchedAt={fetchedAt}
      emptyPeopleMessage={
        <>
          Nobody to check for yet.{' '}
          <Link to="/settings/allergies" className="font-medium text-purple-700 underline">
            Add people and their allergies
          </Link>
          .
        </>
      }
    />
  )
}
