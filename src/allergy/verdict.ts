// The only place the web app asks for a verdict. The engine decides; this file only passes it the
// dictionary.
//
// Never pass a product name, pantry item name, receipt line or recipe ingredient here as if it were a
// label's ingredient list. records must come from a real label: Open Food Facts, USDA or a photo.

import { evaluate, type EvaluationResult, type Profile, type ProductRecord } from '@allergy/verdict-engine'
import { getDictionary } from './dictionary'

export function verdictFor(gtin: string | null, records: ProductRecord[], profiles: Profile[]): EvaluationResult {
  return evaluate({ gtin, records, profiles, dictionary: getDictionary() })
}
