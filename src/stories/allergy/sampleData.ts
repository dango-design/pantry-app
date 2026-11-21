// Sample people and product records for the allergy stories. The Nutter Butter text is from Open
// Food Facts (fixtures/api/off/product-0044000037451.json), shortened.

import type { AllergyProfile, StoredRecord } from '@/allergy/types'

export const sam: AllergyProfile = {
  id: 'sam',
  name: 'Sam',
  householdId: 'demo-household-id',
  color: '#3E7CB1',
  allergens: [{ allergenId: 'peanut', severity: 'severe', avoidMayContain: true }],
  createdAt: '2026-11-13T00:00:00Z',
  updatedAt: '2026-11-13T00:00:00Z',
}

export const alex: AllergyProfile = {
  id: 'alex',
  name: 'Alex',
  householdId: 'demo-household-id',
  color: '#C2410C',
  allergens: [
    { allergenId: 'milk', severity: 'moderate', avoidMayContain: false },
    { allergenId: 'soy', severity: 'mild', avoidMayContain: false },
  ],
  customAvoids: [{ term: 'kiwi', severity: 'moderate' }],
  createdAt: '2026-11-13T00:00:00Z',
  updatedAt: '2026-11-13T00:00:00Z',
}

export const nutterButter: StoredRecord = {
  key: 'off:0044000037451',
  gtin: '00044000037451',
  source: 'off',
  sourceId: '0044000037451',
  name: 'Peanut Butter Sandwich Cookie',
  brand: 'Nutter Butter',
  ingredientsText:
    'unbleached enriched flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid), sugar, peanut butter (roasted peanuts, corn syrup solids, hydrogenated vegetable oil (rapeseed, cottonseed, and soybean oils), salt, peanut oil), canola oil, whole grain oat flour, salt, leavening (baking soda, calcium phosphate), soy lecithin, artificial flavor.',
  allergenTags: ['en:gluten', 'en:peanuts', 'en:soybeans'],
  traceTags: [],
  sourceUpdatedAt: '2026-10-02T00:00:00Z',
  extraction: 'database',
  confirmed: true,
  labelRegion: 'us',
  fetchedAt: '2026-11-13T00:00:00Z',
}

export const plainRice: StoredRecord = {
  key: 'off:sample-rice',
  gtin: '00012345678905',
  source: 'off',
  sourceId: 'sample-rice',
  name: 'Long Grain White Rice',
  brand: 'Sample Brand',
  ingredientsText: 'Long grain rice, iron, niacin, thiamin, folic acid.',
  allergenTags: [],
  traceTags: [],
  sourceUpdatedAt: '2026-09-01T00:00:00Z',
  extraction: 'database',
  confirmed: true,
  labelRegion: 'us',
  fetchedAt: '2026-11-13T00:00:00Z',
}

export const noIngredients: StoredRecord = {
  ...plainRice,
  key: 'off:sample-none',
  sourceId: 'sample-none',
  name: 'Mystery Snack',
  ingredientsText: null,
}
