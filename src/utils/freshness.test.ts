import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dateStringFromToday } from './dates'
import {
  calculateFreshnessScore,
  formatExpirationText,
  FRESHNESS_COLORS,
  getDaysUntilExpiration,
  getFreshnessLevel,
} from './freshness'

// A fixed clock so the day counts below do not depend on when the tests run
const NOW = new Date(2026, 10, 28, 12, 0, 0)
const inDays = dateStringFromToday

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

// Same calendar day as NOW at another time
function setTimeOfDay(hours: number, minutes = 0, seconds = 0) {
  vi.setSystemTime(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), hours, minutes, seconds))
}

describe('calculateFreshnessScore', () => {
  it('is 100 on the day of purchase', () => {
    expect(calculateFreshnessScore(inDays(0), inDays(10))).toBe(100)
  })

  it('is the share of the shelf life left, rounded', () => {
    expect(calculateFreshnessScore(inDays(-5), inDays(5))).toBe(50)
    expect(calculateFreshnessScore(inDays(-2), inDays(1))).toBe(33)
    expect(calculateFreshnessScore(inDays(-1), inDays(2))).toBe(67)
    expect(calculateFreshnessScore(inDays(-9), inDays(1))).toBe(10)
  })

  it('is 0 on the expiration day and after it', () => {
    expect(calculateFreshnessScore(inDays(-7), inDays(0))).toBe(0)
    expect(calculateFreshnessScore(inDays(-7), inDays(-1))).toBe(0)
    expect(calculateFreshnessScore(inDays(-30), inDays(-20))).toBe(0)
  })

  it('is 100 when there is no shelf life to measure but it has not expired', () => {
    // Bought and expiring on the same future day, or a purchase date after the expiration
    expect(calculateFreshnessScore(inDays(3), inDays(3))).toBe(100)
    expect(calculateFreshnessScore(inDays(5), inDays(3))).toBe(100)
  })

  it('never goes above 100 for a purchase date in the future', () => {
    expect(calculateFreshnessScore(inDays(1), inDays(10))).toBe(100)
  })

  it('counts calendar days, whatever the time of day', () => {
    const purchase = inDays(-5)
    const expiration = inDays(5)
    setTimeOfDay(0, 0, 1)
    expect(calculateFreshnessScore(purchase, expiration)).toBe(50)
    setTimeOfDay(23, 59, 59)
    expect(calculateFreshnessScore(purchase, expiration)).toBe(50)
  })
})

describe('getDaysUntilExpiration', () => {
  it('counts calendar days from today', () => {
    expect(getDaysUntilExpiration(inDays(0))).toBe(0)
    expect(getDaysUntilExpiration(inDays(1))).toBe(1)
    expect(getDaysUntilExpiration(inDays(30))).toBe(30)
    expect(getDaysUntilExpiration(inDays(-1))).toBe(-1)
  })

  it('is 1 for tomorrow at any time of day', () => {
    const tomorrow = inDays(1)
    setTimeOfDay(0, 0, 1)
    expect(getDaysUntilExpiration(tomorrow)).toBe(1)
    setTimeOfDay(23, 59, 59)
    expect(getDaysUntilExpiration(tomorrow)).toBe(1)
  })

  it('crosses month and year boundaries', () => {
    // NOW is Nov 28, so these cross into December and the next year
    expect(getDaysUntilExpiration(inDays(5))).toBe(5)
    expect(getDaysUntilExpiration(inDays(40))).toBe(40)
  })
})

describe('getFreshnessLevel', () => {
  it('is urgent at 3 days or less, including expired', () => {
    expect(getFreshnessLevel(inDays(-10))).toBe('urgent')
    expect(getFreshnessLevel(inDays(0))).toBe('urgent')
    expect(getFreshnessLevel(inDays(3))).toBe('urgent')
  })

  it('is warning from 4 to 7 days', () => {
    expect(getFreshnessLevel(inDays(4))).toBe('warning')
    expect(getFreshnessLevel(inDays(7))).toBe('warning')
  })

  it('is fresh at more than 7 days', () => {
    expect(getFreshnessLevel(inDays(8))).toBe('fresh')
    expect(getFreshnessLevel(inDays(365))).toBe('fresh')
  })

  it('goes by the date, not the freshness score', () => {
    expect(getFreshnessLevel(inDays(30), 0)).toBe('fresh')
    expect(getFreshnessLevel(inDays(1), 100)).toBe('urgent')
  })
})

describe('formatExpirationText', () => {
  it.each([
    [-30, 'Expired'],
    [-1, 'Expired'],
    [0, 'Today'],
    [1, 'Tomorrow'],
    [2, '2 days'],
    [6, '6 days'],
    [7, '1 week'],
    [13, '1 week'],
    [14, '2 weeks'],
    [29, '4 weeks'],
    [30, '1 month'],
    [59, '1 month'],
    [60, '2 months'],
    [364, '12 months'],
    [365, '1 year'],
    [729, '1 year'],
    [730, '2 years'],
  ])('%i days from today is "%s"', (days, text) => {
    expect(formatExpirationText(inDays(days))).toBe(text)
  })
})

describe('FRESHNESS_COLORS', () => {
  it('has a distinct color for each level', () => {
    const colors = [FRESHNESS_COLORS.fresh, FRESHNESS_COLORS.warning, FRESHNESS_COLORS.urgent]
    expect(new Set(colors).size).toBe(3)
    for (const color of colors) expect(color).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
