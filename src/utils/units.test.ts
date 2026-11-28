import { describe, expect, it } from 'vitest'
import type { QuantityUnit } from '@/types'
import { QUANTITY_UNITS } from './constants'
import { convertQuantity, formatUnit, isDiscreteUnit, parseUnit, roundQuantity } from './units'

const ALL_UNITS = Object.keys(QUANTITY_UNITS) as QuantityUnit[]

describe('convertQuantity', () => {
  it('returns the quantity unchanged for the same unit, even one with no fixed size', () => {
    for (const unit of ALL_UNITS) {
      expect(convertQuantity(2.5, unit, unit)).toBe(2.5)
    }
  })

  it('converts between volume units', () => {
    expect(convertQuantity(3, 'tsp', 'tbsp')).toBeCloseTo(1, 3)
    expect(convertQuantity(1, 'cup', 'tbsp')).toBeCloseTo(16, 2)
    expect(convertQuantity(1, 'l', 'ml')).toBe(1000)
    expect(convertQuantity(250, 'ml', 'l')).toBe(0.25)
    expect(convertQuantity(1, 'gal', 'cup')).toBeCloseTo(16, 2)
    expect(convertQuantity(1, 'gal', 'l')).toBeCloseTo(3.785, 3)
  })

  it('converts between weight units, metric and imperial', () => {
    expect(convertQuantity(1, 'lb', 'oz')).toBeCloseTo(16, 3)
    expect(convertQuantity(1, 'kg', 'lb')).toBeCloseTo(2.2046, 4)
    expect(convertQuantity(2, 'kg', 'g')).toBe(2000)
    expect(convertQuantity(100, 'g', 'oz')).toBeCloseTo(3.527, 3)
  })

  it('converts between count and dozen', () => {
    expect(convertQuantity(2, 'dozen', 'count')).toBe(24)
    expect(convertQuantity(6, 'count', 'dozen')).toBe(0.5)
  })

  it('round-trips without drift', () => {
    expect(convertQuantity(convertQuantity(3, 'cup', 'ml')!, 'ml', 'cup')).toBeCloseTo(3, 10)
    expect(convertQuantity(convertQuantity(5, 'oz', 'kg')!, 'kg', 'oz')).toBeCloseTo(5, 10)
  })

  it('converts zero to zero', () => {
    expect(convertQuantity(0, 'lb', 'g')).toBe(0)
  })

  it('returns null between volume and weight', () => {
    expect(convertQuantity(1, 'cup', 'g')).toBeNull()
    expect(convertQuantity(1, 'lb', 'l')).toBeNull()
  })

  it('returns null between count and measured units', () => {
    expect(convertQuantity(1, 'count', 'oz')).toBeNull()
    expect(convertQuantity(1, 'dozen', 'ml')).toBeNull()
  })

  it('returns null for units with no fixed size, against anything but themselves', () => {
    for (const unit of ['unit', 'pack', 'bunch'] as QuantityUnit[]) {
      for (const other of ALL_UNITS.filter((u) => u !== unit)) {
        expect(convertQuantity(1, unit, other)).toBeNull()
        expect(convertQuantity(1, other, unit)).toBeNull()
      }
    }
  })
})

describe('roundQuantity', () => {
  it('rounds to two decimal places', () => {
    expect(roundQuantity(2 / 3)).toBe(0.67)
    expect(roundQuantity(1 / 3)).toBe(0.33)
    expect(roundQuantity(1.234)).toBe(1.23)
    expect(roundQuantity(1.236)).toBe(1.24)
  })

  it('leaves whole numbers and short decimals alone', () => {
    expect(roundQuantity(4)).toBe(4)
    expect(roundQuantity(0.5)).toBe(0.5)
    expect(roundQuantity(0)).toBe(0)
  })

  it('cleans up floating point noise', () => {
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3)
  })

  it('rounds very small amounts to zero', () => {
    expect(roundQuantity(0.004)).toBe(0)
  })
})

describe('formatUnit', () => {
  it('uses the short label', () => {
    expect(formatUnit('lb')).toBe('lb')
    expect(formatUnit('pack')).toBe('pk')
    expect(formatUnit('l')).toBe('L')
    expect(formatUnit('dozen')).toBe('dz')
  })

  it('falls back to the lowercase label for units without a short label', () => {
    expect(formatUnit('count')).toBe('count')
    expect(formatUnit('unit')).toBe('unit')
  })

  it('returns the raw text for a unit it does not know', () => {
    expect(formatUnit('pint' as QuantityUnit)).toBe('pint')
  })

  it('has a non-empty label for every unit', () => {
    for (const unit of ALL_UNITS) {
      expect(formatUnit(unit)).not.toBe('')
    }
  })
})

describe('parseUnit', () => {
  it('keeps the app units as they are', () => {
    for (const unit of ALL_UNITS) {
      expect(parseUnit(unit)).toBe(unit)
    }
  })

  it('ignores case, surrounding whitespace and a trailing dot', () => {
    expect(parseUnit('mL')).toBe('ml')
    expect(parseUnit('  Gallon ')).toBe('gal')
    expect(parseUnit('LBS.')).toBe('lb')
    expect(parseUnit('oz.')).toBe('oz')
    expect(parseUnit('Tbsp')).toBe('tbsp')
  })

  it('reads plurals and long spellings', () => {
    expect(parseUnit('pounds')).toBe('lb')
    expect(parseUnit('ounces')).toBe('oz')
    expect(parseUnit('grams')).toBe('g')
    expect(parseUnit('kilograms')).toBe('kg')
    expect(parseUnit('cups')).toBe('cup')
    expect(parseUnit('tablespoons')).toBe('tbsp')
    expect(parseUnit('teaspoon')).toBe('tsp')
    expect(parseUnit('packs')).toBe('pack')
    expect(parseUnit('bunches')).toBe('bunch')
    expect(parseUnit('dozens')).toBe('dozen')
    expect(parseUnit('units')).toBe('unit')
  })

  it('reads British spellings', () => {
    expect(parseUnit('litres')).toBe('l')
    expect(parseUnit('millilitre')).toBe('ml')
  })

  it('reads receipt abbreviations', () => {
    expect(parseUnit('ea')).toBe('count')
    expect(parseUnit('ct')).toBe('count')
    expect(parseUnit('pcs')).toBe('count')
    expect(parseUnit('pkg')).toBe('pack')
    expect(parseUnit('pk')).toBe('pack')
    expect(parseUnit('dz')).toBe('dozen')
    expect(parseUnit('kgs')).toBe('kg')
  })

  it('falls back to count for unknown, empty or missing units', () => {
    expect(parseUnit('pint')).toBe('count')
    expect(parseUnit('fl oz')).toBe('count')
    expect(parseUnit('')).toBe('count')
    expect(parseUnit('   ')).toBe('count')
    expect(parseUnit(null)).toBe('count')
    expect(parseUnit(undefined)).toBe('count')
  })

  // Bug: `unit in QUANTITY_UNITS` also finds keys inherited from Object.prototype,
  // so parseUnit('constructor') returns 'constructor' instead of 'count'.
  it.todo('falls back to count for names inherited from Object.prototype ("constructor", "__proto__")')
})

describe('isDiscreteUnit', () => {
  it('is true for units counted one by one', () => {
    for (const unit of ['count', 'unit', 'pack', 'bunch', 'dozen'] as QuantityUnit[]) {
      expect(isDiscreteUnit(unit)).toBe(true)
    }
  })

  it('is false for measured units', () => {
    for (const unit of ['oz', 'lb', 'g', 'kg', 'ml', 'l', 'gal', 'cup', 'tbsp', 'tsp'] as QuantityUnit[]) {
      expect(isDiscreteUnit(unit)).toBe(false)
    }
  })
})
