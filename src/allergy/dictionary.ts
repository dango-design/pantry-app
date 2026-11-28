// The allergen dictionary, bundled with the app. It is the same file the Edge Functions use:
// packages/verdict-engine/data/dictionary.json. Edit it only there.

import compact from '@allergy/verdict-engine/data/dictionary.json'
import { expandDictionary, type Allergen, type CompactDictionary, type Dictionary } from '@allergy/verdict-engine'

let cached: Dictionary | null = null

/** Expands the dictionary once and reuses it. The engine caches its compiled form per object. */
export function getDictionary(): Dictionary {
  cached ??= expandDictionary(compact as unknown as CompactDictionary)
  return cached
}

export function allergenName(id: string): string {
  return getDictionary().allergens.find((a) => a.id === id)?.displayName ?? id
}

/** The allergens offered when editing a person: the 9 US majors first. */
export function allergenChoices(): Allergen[] {
  const all = getDictionary().allergens
  return [...all.filter((a) => a.isUsMajor), ...all.filter((a) => !a.isUsMajor)]
}

/** Short notes shown under an allergen where the name alone could mislead. */
export const ALLERGEN_HINTS: Record<string, string> = {
  shellfish: 'Crustaceans: shrimp, crab, lobster',
  mollusc: 'Clams, mussels, oysters, squid',
  tree_nut: 'The 12 FDA tree nuts; not coconut',
  gluten: 'Wheat, barley, rye',
  coconut: 'Not a tree nut under FDA rules',
}

/** How many dictionary terms Claude added that nobody has reviewed. They count only as "check". */
export function unreviewedTermCount(): number {
  return getDictionary().terms.filter((t) => t.addedBy === 'claude' && !t.reviewed).length
}
