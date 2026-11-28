import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryFromLabels, mapCategory } from './productCategory'

// Category tags from real Open Food Facts responses saved in fixtures/api/off
function offTags(barcode: string): string[] {
  const file = path.resolve(__dirname, `../../fixtures/api/off/product-${barcode}.json`)
  return JSON.parse(readFileSync(file, 'utf8')).product.categories_tags
}

describe('categoryFromLabels with Open Food Facts tags', () => {
  it.each([
    // "plant-based-foods-and-beverages" used to make these beverages
    ['0028400199148', "Lay's Classic potato chips", 'snacks'],
    ['0040822346108', 'Sabra classic hummus', 'condiments'],
    // "vegetable-fats" used to make this produce
    ['0009800895250', 'Nutella hazelnut spread', 'pantry'],
    // "Meat sauces" used to make this meat
    ['0051600000013', 'Lea & Perrins Worcestershire sauce', 'condiments'],
    ['0040000424314', 'Snickers', 'snacks'],
    ['0044000037451', 'Nutter Butter cookies', 'snacks'],
    ['0879890002995', 'Crunchmaster crackers', 'snacks'],
    ['0096619267934', 'Kirkland frozen tempura shrimp', 'frozen'],
  ])('%s (%s) is %s', (barcode, _product, expected) => {
    expect(categoryFromLabels(offTags(barcode))).toBe(expected)
  })

  it('skips labels in other languages', () => {
    expect(categoryFromLabels(['fr:pates-a-tartiner'])).toBeUndefined()
  })

  it('files canned goods in the pantry', () => {
    expect(categoryFromLabels(['en:plant-based-foods-and-beverages', 'en:canned-foods', 'en:canned-vegetables', 'en:canned-corn'])).toBe('pantry')
  })
})

describe('categoryFromLabels with other labels', () => {
  it('reads USDA categories', () => {
    expect(categoryFromLabels(['Cookies & Biscuits'])).toBe('snacks')
    expect(categoryFromLabels(['Cheese'])).toBe('dairy')
    expect(categoryFromLabels(['Frozen Dinners & Entrees'])).toBe('frozen')
  })

  it("reads Open Food Facts' comma-separated text", () => {
    expect(categoryFromLabels('Dairies, Fermented foods, Fermented milk products, Cheeses')).toBe('dairy')
  })

  it('gives nothing for labels that name nothing', () => {
    expect(categoryFromLabels(['en:plant-based-foods-and-beverages', 'en:plant-based-foods'])).toBeUndefined()
    expect(categoryFromLabels([])).toBeUndefined()
    expect(categoryFromLabels(null)).toBeUndefined()
  })
})

describe('mapCategory', () => {
  it("is 'other' with no labels and 'pantry' when they name nothing", () => {
    expect(mapCategory([])).toBe('other')
    expect(mapCategory(['en:plant-based-foods'])).toBe('pantry')
    expect(mapCategory(['en:dairies'])).toBe('dairy')
  })
})
