import { addDays, format, parseISO } from 'date-fns'

// Calendar dates (purchase/expiration) are stored as local 'yyyy-MM-dd' strings.
// Never build them with toISOString() (UTC) or read them with new Date(str) (UTC midnight):
// both shift the date by a day in time zones west of UTC.

export function toLocalDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayDateString(): string {
  return toLocalDateString(new Date())
}

export function dateStringFromToday(days: number): string {
  return toLocalDateString(addDays(new Date(), days))
}

export function formatDateString(dateString: string): string {
  return parseISO(dateString).toLocaleDateString()
}
