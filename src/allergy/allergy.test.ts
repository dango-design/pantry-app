// Tests for the web app's allergy helpers. The engine has its own tests in packages/verdict-engine.
// These check that the web layer passes the engine's answers through without changing them.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizeOffResponse } from '@allergy/food-data'
import { describe, expect, it } from 'vitest'
import { badgeSummary, combinedBadge, condenseReasons, highlightWords, redPeople } from './display'
import { NotABarcodeError, parseBarcode } from './lookup'
import { verdictFor } from './verdict'
import type { AllergyProfile, StoredRecord } from './types'

const fixture = (path: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../fixtures/api/${path}`, import.meta.url)), 'utf8'))

function person(id: string, name: string, allergenIds: string[]): AllergyProfile {
  return {
    id,
    name,
    householdId: 'h',
    color: '#3E7CB1',
    allergens: allergenIds.map((allergenId) => ({ allergenId, severity: 'severe' as const })),
    createdAt: '',
    updatedAt: '',
  }
}

const sam = person('sam', 'Sam', ['peanut'])
const alex = person('alex', 'Alex', ['milk'])

// Nutter Butter, recorded from Open Food Facts on 2026-11-08.
const nutterButter = normalizeOffResponse(fixture('off/product-0044000037451.json'))!
const nutterRecord: StoredRecord = { ...nutterButter, key: 'off:0044000037451', gtin: '00044000037451', fetchedAt: '2026-11-08T00:00:00Z' }

describe('verdicts on the web', () => {
  it('a product with no ingredient text is unknown, never green', () => {
    const noText: StoredRecord = { ...nutterRecord, ingredientsText: null, allergenTags: [], traceTags: [] }
    const r = verdictFor('00044000037451', [noText], [alex])
    expect(r.overall).toBe('unknown')
    expect(badgeSummary(r)).toMatchObject({ verdict: 'unknown', text: 'No ingredient list' })
  })

  it('a barcode with no records at all is unknown', () => {
    const r = verdictFor('00044000037451', [], [alex])
    expect(r.overall).toBe('unknown')
  })

  it('an in-store barcode says "Store-made: ask staff"', () => {
    const r = verdictFor('0212345012345', [], [sam])
    expect(r.storeMade).toBe(true)
    expect(badgeSummary(r)).toMatchObject({ verdict: 'unknown', text: 'Store-made: ask staff' })
  })

  it('Nutter Butter is not safe for a peanut allergy, and the badge names the person', () => {
    const r = verdictFor('00044000037451', [nutterRecord], [sam, alex])
    expect(r.overall).toBe('red')
    expect(badgeSummary(r).text).toBe('Not safe for Sam')
    expect(redPeople(r)).toEqual([{ name: 'Sam', reason: expect.stringMatching(/peanut/i) }])
    const samRow = r.profiles.find((p) => p.profileId === 'sam')!
    expect(condenseReasons(samRow.reasons)[0]).toMatchObject({ verdict: 'red', message: expect.stringMatching(/^Contains peanut/i) })
  })

  it('highlights only the words that matter for the people shown', () => {
    const r = verdictFor('00044000037451', [nutterRecord], [sam, alex])
    const forAlex = highlightWords(r, [alex])
    const forSam = highlightWords(r, [sam])
    expect(forSam.some((w) => /peanut/i.test(w))).toBe(true)
    expect(forAlex.some((w) => /peanut/i.test(w))).toBe(false)
  })

  it('condenses several words for one allergen into one line', () => {
    const r = verdictFor('00044000037451', [nutterRecord], [sam])
    const lines = condenseReasons(r.profiles[0]!.reasons)
    expect(lines.filter((l) => /peanut/i.test(l.message))).toHaveLength(1)
  })
})

describe('barcodes', () => {
  it('normalizes a UPC-A to 14 digits', () => {
    expect(parseBarcode('044000037451')).toEqual({ gtin: '00044000037451', storeMade: false })
  })

  it('flags in-store barcodes', () => {
    expect(parseBarcode('0212345012345').storeMade).toBe(true)
  })

  it('rejects a wrong check digit instead of looking up some other product', () => {
    expect(() => parseBarcode('044000037452')).toThrow(NotABarcodeError)
    expect(() => parseBarcode('abc')).toThrow(NotABarcodeError)
  })
})

describe('one badge for a card with several batches', () => {
  const rice: StoredRecord = {
    ...nutterRecord,
    key: 'off:rice',
    sourceId: 'rice',
    gtin: '00012345678905',
    name: 'Rice',
    ingredientsText: 'Long grain rice.',
    allergenTags: [],
    traceTags: [],
  }
  const red = () => verdictFor('00044000037451', [nutterRecord], [sam])
  const green = () => verdictFor('00012345678905', [rice], [sam])

  it('shows nothing when no batch was checked', () => {
    expect(combinedBadge([], 2)).toBeNull()
  })

  it('shows green only when every batch was checked', () => {
    expect(green().overall).toBe('green')
    expect(combinedBadge([green()], 0)).toMatchObject({ verdict: 'green', text: 'No listed allergens' })
  })

  it('does not vouch for batches nobody checked', () => {
    expect(combinedBadge([green()], 1)).toMatchObject({ verdict: 'unknown', text: 'Not all checked' })
  })

  it('a red batch always shows, whatever the other batches are', () => {
    expect(combinedBadge([green(), red()], 0)).toMatchObject({ verdict: 'red', text: 'Not safe for Sam' })
    expect(combinedBadge([red()], 3)).toMatchObject({ verdict: 'red', text: 'Not safe for Sam' })
  })
})

