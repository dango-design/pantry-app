import type { QuantityUnit } from '@/types'
import { QUANTITY_UNITS } from './constants'

// Units that can be converted between each other, as a factor of a base unit.
// 'unit', 'pack' and 'bunch' have no fixed size, so they only match themselves.
const UNIT_GROUPS: Partial<Record<QuantityUnit, number>>[] = [
  // Volume, in ml
  { tsp: 4.92892, tbsp: 14.7868, cup: 236.588, ml: 1, l: 1000, gal: 3785.41 },
  // Weight, in g
  { oz: 28.3495, lb: 453.592, g: 1, kg: 1000 },
  // Count
  { count: 1, dozen: 12 },
]

/**
 * Convert a quantity between units. Returns null when the units can't be
 * converted (e.g. cups to packs, or volume to weight).
 */
export function convertQuantity(quantity: number, from: QuantityUnit, to: QuantityUnit): number | null {
  if (from === to) return quantity

  for (const group of UNIT_GROUPS) {
    const fromFactor = group[from]
    const toFactor = group[to]
    if (fromFactor !== undefined && toFactor !== undefined) {
      return (quantity * fromFactor) / toFactor
    }
  }

  return null
}

export function roundQuantity(quantity: number): number {
  return Math.round(quantity * 100) / 100
}

// Label for a unit after a number, e.g. "2 lb", "3 count", "1 pk"
export function formatUnit(unit: QuantityUnit): string {
  const config = QUANTITY_UNITS[unit]
  if (!config) return unit
  return config.shortLabel || config.label.toLowerCase()
}

// Other spellings of the app's units, as photo and receipt scans write them
const UNIT_SPELLINGS: Record<string, QuantityUnit> = {
  each: 'count', ea: 'count', ct: 'count', pc: 'count', pcs: 'count', piece: 'count', pieces: 'count', item: 'count', items: 'count',
  ounce: 'oz', ounces: 'oz',
  pound: 'lb', pounds: 'lb', lbs: 'lb',
  gram: 'g', grams: 'g',
  kilogram: 'kg', kilograms: 'kg', kgs: 'kg',
  milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  gallon: 'gal', gallons: 'gal',
  cups: 'cup',
  tablespoon: 'tbsp', tablespoons: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp',
  units: 'unit',
  pk: 'pack', pkg: 'pack', package: 'pack', packages: 'pack', packs: 'pack',
  bunches: 'bunch',
  dz: 'dozen', dozens: 'dozen',
}

/**
 * The app's unit for a unit name, ignoring case and plurals: "Gallon" is
 * 'gal', "mL" is 'ml', "lbs" is 'lb'. Units the app has no match for, such as
 * "pint", become 'count'.
 */
export function parseUnit(text: string | null | undefined): QuantityUnit {
  const unit = (text ?? '').trim().toLowerCase().replace(/\.$/, '')
  if (unit in QUANTITY_UNITS) return unit as QuantityUnit
  return UNIT_SPELLINGS[unit] ?? 'count'
}

// Units where "1 left" means you're down to the last one
const DISCRETE_UNITS: QuantityUnit[] = ['count', 'unit', 'pack', 'bunch', 'dozen']

export function isDiscreteUnit(unit: QuantityUnit): boolean {
  return DISCRETE_UNITS.includes(unit)
}
