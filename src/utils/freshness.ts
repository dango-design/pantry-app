import { differenceInCalendarDays, parseISO } from 'date-fns'

export type FreshnessLevel = 'fresh' | 'warning' | 'urgent'

export function calculateFreshnessScore(purchaseDate: string, expirationDate: string): number {
  const purchase = parseISO(purchaseDate)
  const expiration = parseISO(expirationDate)
  const today = new Date()

  const totalDays = differenceInCalendarDays(expiration, purchase)
  const daysRemaining = differenceInCalendarDays(expiration, today)

  if (daysRemaining <= 0) return 0
  if (totalDays <= 0) return 100

  const score = Math.round((daysRemaining / totalDays) * 100)
  return Math.max(0, Math.min(100, score))
}

export function getFreshnessLevel(
  expirationDate: string,
  _freshnessScore?: number
): FreshnessLevel {
  const days = getDaysUntilExpiration(expirationDate)

  // 3 days or less, or expired = red (urgent)
  if (days <= 3) return 'urgent'
  // 4-7 days = orange (warning)
  if (days <= 7) return 'warning'
  // More than 7 days = default gray (fresh)
  return 'fresh'
}

// Calendar days from today, so an item expiring tomorrow is 1 at any time of day
export function getDaysUntilExpiration(expirationDate: string): number {
  return differenceInCalendarDays(parseISO(expirationDate), new Date())
}

export function formatExpirationText(expirationDate: string): string {
  const days = getDaysUntilExpiration(expirationDate)

  if (days < 0) return 'Expired'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `${days} days`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? '1 week' : `${weeks} weeks`
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return months === 1 ? '1 month' : `${months} months`
  }
  const years = Math.floor(days / 365)
  return years === 1 ? '1 year' : `${years} years`
}

// Colors: gray (>7 days), orange (4-7 days), red (<=3 days or expired)
export const FRESHNESS_COLORS: Record<FreshnessLevel, string> = {
  fresh: '#6B7280',    // Gray - more than 7 days
  warning: '#F97316',  // Orange - 4-7 days
  urgent: '#EF4444',   // Red - 3 days or less / expired
}
