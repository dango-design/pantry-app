// Lazy versions of the allergy pieces that sit on pantry's own pages. The engine and the dictionary
// load only when one of these first renders, so the main bundle does not grow.

import { lazy } from 'react'

export const LazyPantryAllergyBadge = lazy(() => import('./PantryAllergyBadge').then((m) => ({ default: m.PantryAllergyBadge })))

export const LazyItemAllergySection = lazy(() => import('./ItemAllergySection').then((m) => ({ default: m.ItemAllergySection })))

export const LazyAddItemAllergyCheck = lazy(() => import('./AddItemAllergyCheck').then((m) => ({ default: m.AddItemAllergyCheck })))
