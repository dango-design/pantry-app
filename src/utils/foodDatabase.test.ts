import { describe, expect, it } from 'vitest'
import { addDays, format } from 'date-fns'
import { estimateExpirationDate, estimateShelfLife, foodWords, getDefaultStorageLocation, isFoodName, lookupFood, lookupFoodLabel } from './foodDatabase'
import { FOOD_TABLE } from './foodTable'

const category = (name: string) => lookupFood(name)?.category
const matched = (name: string) => lookupFood(name)?.name

describe('the food table', () => {
  it('keeps every food where it has a shelf life', () => {
    for (const entry of FOOD_TABLE) {
      expect(entry.keeps[entry.storage], entry.name).toBeGreaterThan(0)
    }
  })

  it('finds every food by its own name and aliases', () => {
    for (const entry of FOOD_TABLE) {
      for (const name of [entry.name, ...(entry.aliases ?? [])]) {
        expect(matched(name), name).toBe(entry.name.toLowerCase())
      }
    }
  })
})

describe('foodWords', () => {
  it('makes words singular, so both spellings of a name compare equal', () => {
    expect(foodWords('Strawberries')).toEqual(foodWords('strawberry'))
    expect(foodWords('Tomatoes')).toEqual(foodWords('tomato'))
    expect(foodWords('Peaches')).toEqual(foodWords('peach'))
    expect(foodWords('Cookies')).toEqual(foodWords('cookie'))
    expect(foodWords('Bay leaves')).toEqual(foodWords('bay leaf'))
  })

  it('leaves words that only look plural alone', () => {
    expect(foodWords('Hummus')).toEqual(['hummus'])
    expect(foodWords('Asparagus')).toEqual(['asparagus'])
    expect(foodWords('Swiss')).toEqual(['swiss'])
  })

  it('drops numbers, accents and apostrophes', () => {
    expect(foodWords("Jalapeños 2% Lay's")).toEqual(['jalapeno', 'lay'])
  })
})

describe('lookupFood', () => {
  it('finds a food named anywhere in a longer name', () => {
    expect(matched('Organic Baby Spinach')).toBe('spinach')
    expect(matched('Boneless skinless chicken breast')).toBe('chicken breast')
    expect(matched('bananas')).toBe('bananas')
    expect(matched('Almond Breeze Almondmilk Unsweetened')).toBe('almond milk')
  })

  it('goes by the food named last, so the main noun wins over a flavor', () => {
    expect(category('Peanut butter cookies')).toBe('snacks')
    expect(category('Chocolate milk')).toBe('dairy')
    expect(category('Milk chocolate')).toBe('snacks')
    expect(category('Butter lettuce')).toBe('produce')
    expect(category('Strawberry yogurt')).toBe('dairy')
  })

  it('prefers the longest name ending at the same word', () => {
    expect(matched('Peanut butter')).toBe('peanut butter')
    expect(matched('Vanilla ice cream')).toBe('ice cream')
    expect(matched('Cream cheese')).toBe('cream cheese')
    expect(matched('Soy sauce')).toBe('soy sauce')
  })

  it('ignores a description after "with", "in", a comma or in brackets', () => {
    expect(category('Chicken breast with garlic')).toBe('meat')
    expect(category('Tuna in water')).toBe('pantry')
    expect(matched('Savory bowl noodle soup, lobster')).toBe('soup')
    expect(category('Tom Yum Ramen (Shrimp)')).toBe('pantry')
    // Unless the name before it names no food
    expect(matched('Bites with almonds')).toBe('almonds')
  })

  it('lets a flavor written after the food lose to the food', () => {
    expect(category('Sweet Potato Chips Sea Salt')).toBe('snacks')
    expect(matched('hummus lemon dill')).toBe('hummus')
    expect(matched('Protein Cookie Chocolate Chip')).toBe('cookies')
    // A flavor on its own is still found
    expect(matched('Garlic')).toBe('garlic')
    expect(matched('Sea salt')).toBe('salt')
  })

  it('moves a frozen food to the freezer', () => {
    const peas = lookupFood('Frozen blueberries')
    expect(peas).toMatchObject({ name: 'frozen blueberries', category: 'frozen', storage: 'freezer' })
    expect(peas!.expirationDays).toBeGreaterThan(30)
    expect(lookupFood('Frozen bean and cheese burritos')).toMatchObject({ category: 'frozen', storage: 'freezer' })
    expect(lookupFood('Frozen mystery thing')).toMatchObject({ name: 'frozen food', category: 'frozen', storage: 'freezer', expirationDays: 180 })
  })

  it('moves a canned food to the pantry, but a canned drink stays a drink', () => {
    expect(lookupFood('Canned salmon')).toMatchObject({ category: 'pantry', storage: 'pantry', expirationDays: 730 })
    expect(lookupFood('Canned coconut milk')).toMatchObject({ category: 'pantry', storage: 'pantry' })
    expect(lookupFood('Can of soda')?.category).toBe('beverages')
  })

  it('keeps leftovers in the fridge for a few days', () => {
    expect(lookupFood('Leftover rice')).toMatchObject({ category: 'prepared', storage: 'refrigerator', expirationDays: 4 })
    // Homemade bread is still bread
    expect(lookupFood('Homemade bread')?.category).toBe('bakery')
  })

  it('finds nothing for things that are not food', () => {
    expect(lookupFood('Paper towels')).toBeUndefined()
    expect(lookupFood('birthday candles')).toBeUndefined()
    expect(lookupFood('')).toBeUndefined()
  })
})

describe('lookupFoodLabel', () => {
  it('only counts a food named by the last word', () => {
    expect(lookupFoodLabel('potato crisps')?.category).toBe('snacks')
    expect(lookupFoodLabel('vegetable fats')).toBeUndefined()
  })
})

describe('isFoodName', () => {
  it('is true only when the whole text names a food', () => {
    expect(isFoodName('Hot dogs')).toBe(true)
    expect(isFoodName('milk')).toBe(true)
    expect(isFoodName('7 Up')).toBe(false)
    expect(isFoodName('Organic milk')).toBe(false)
  })
})

describe('shelf life', () => {
  it("uses the food's own time for where it is kept", () => {
    expect(estimateShelfLife('Spinach', 'produce', 'refrigerator')).toMatchObject({ days: 5 })
    expect(estimateShelfLife('Chicken breast', 'meat', 'freezer').days).toBeGreaterThan(30)
  })

  it("uses the category's time when the food is filed under another category", () => {
    // Chicken filed as prepared food is cooked chicken, not raw meat
    expect(estimateShelfLife('Chicken', 'prepared', 'refrigerator')).toEqual({ days: 4 })
    expect(getDefaultStorageLocation('Bananas', 'frozen')).toBe('freezer')
  })

  it('treats a food filed as frozen as that food, frozen', () => {
    expect(estimateShelfLife('Strawberries', 'frozen', 'freezer')).toMatchObject({
      days: lookupFood('Frozen strawberries')!.expirationDays,
      food: { name: 'frozen strawberries' },
    })
  })

  it("uses the category's time for an unknown name", () => {
    expect(estimateShelfLife('Mystery item', 'dairy', 'refrigerator')).toEqual({ days: 14 })
    expect(getDefaultStorageLocation('Mystery item', 'pantry')).toBe('pantry')
  })

  it('counts from the purchase date', () => {
    expect(estimateExpirationDate('Milk', 'dairy', 'refrigerator', '2026-11-01')).toBe(
      format(addDays(new Date(2026, 10, 1), lookupFood('milk')!.expirationDays), 'yyyy-MM-dd')
    )
  })
})
