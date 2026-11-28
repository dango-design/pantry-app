// Plain functions behind the Staples, Dinners on hand and "Haven't touched in
// a while" parts of the Pantry tab. They hold no React state and take `now`
// as an argument, so they can be tested on their own (pantryInsights.test.ts).

import { estimateServings, getRole, getTouchedAt, daysSinceTouched, isSnackingFruit, FOOD_ROLES } from '@/utils/foodRoles'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { matchAllRecipes } from '@/utils/recipeMatching'
import { formatStockCount, roundStockCount, type StockInfo } from '@/utils/stock'
import type { FoodItem, FoodRole, Recipe } from '@/types'
import { getGroupStatus, type GroupStatus } from './pantryOverview'

// ---------------------------------------------------------------------------
// Staples
// ---------------------------------------------------------------------------

/** A gauge's colour. It comes from the staple's own status, not from a fixed number of days. */
export type GaugeTone = 'green' | 'orange' | 'red'

/** A full gauge means this many days or more */
export const GAUGE_FULL_DAYS = 30

export interface StapleGauge {
  stock: StockInfo
  name: string
  /** "out", "2 d", "30+ d", "today", "expired", or the amount ("3 left") when the daily use is not known */
  label: string
  /** How full the bar is, from 0 to 1 */
  fill: number
  tone: GaugeTone
  /**
   * Days until it runs out at the usual pace or goes bad, whichever comes
   * first. Not set when the daily use is not known and nothing goes bad soon.
   */
  daysLeft?: number
  /** True when the expiry date comes before running out, so the bar counts down to that date */
  goesBadFirst: boolean
}

/** A staple that goes bad within this many days is at least orange, whatever its amount */
export const GOES_BAD_SOON_DAYS = 3

export interface StaplesSummary {
  total: number
  /** Above the "keep at least" amount */
  stocked: number
  low: number
  out: number
  /** Out first, then fewest days left. Staples with no daily use come last, by name. */
  gauges: StapleGauge[]
}

// Calendar days from `now` to a yyyy-MM-dd date; negative once it has passed
function daysUntil(date: string, now: Date): number {
  return differenceInCalendarDays(parseISO(date), now)
}

const TONE_BY_STATUS: Record<StockInfo['status'], GaugeTone> = { ok: 'green', low: 'orange', out: 'red' }

const TONE_RANK: Record<GaugeTone, number> = { green: 0, orange: 1, red: 2 }

function worseTone(a: GaugeTone, b: GaugeTone): GaugeTone {
  return TONE_RANK[a] >= TONE_RANK[b] ? a : b
}

function gaugeFor(stock: StockInfo, now: Date): StapleGauge {
  const tone = TONE_BY_STATUS[stock.status]
  const base = { stock, name: stock.name, tone, daysLeft: stock.daysLeft, goesBadFirst: false }

  if (stock.status === 'out') return { ...base, label: 'out', fill: 0 }

  // items[0] is the soonest-expiring row. When it goes bad before the staple
  // would run out, the bar counts down to that date instead. Bread eaten over
  // 4 days that expires today should not look fine.
  const soonest = stock.items[0]?.expirationDate
  const expiresIn = soonest ? daysUntil(soonest, now) : undefined
  const goesBadFirst =
    expiresIn !== undefined &&
    (stock.daysLeft !== undefined ? expiresIn < stock.daysLeft : expiresIn < GAUGE_FULL_DAYS)
  if (goesBadFirst) {
    const days = Math.max(0, expiresIn)
    const label = expiresIn < 0 ? 'expired' : expiresIn === 0 ? 'today' : `${expiresIn} d`
    const expiryTone: GaugeTone = expiresIn < 0 ? 'red' : expiresIn <= GOES_BAD_SOON_DAYS ? 'orange' : 'green'
    return {
      ...base,
      label,
      fill: Math.min(1, days / GAUGE_FULL_DAYS),
      tone: worseTone(tone, expiryTone),
      daysLeft: days,
      goesBadFirst: true,
    }
  }

  if (stock.daysLeft !== undefined) {
    const days = Math.floor(stock.daysLeft + 1e-9)
    const label = days >= GAUGE_FULL_DAYS ? `${GAUGE_FULL_DAYS}+ d` : `${days} d`
    return { ...base, label, fill: Math.min(1, stock.daysLeft / GAUGE_FULL_DAYS) }
  }

  // No daily use yet: show the amount, and fill the bar against three times the minimum
  const shown = roundStockCount(stock.estimated, stock.unit)
  const min = stock.staple?.minQuantity ?? 0
  const fill = min > 0 ? Math.min(1, shown / (min * 3)) : shown > 0 ? 1 : 0
  return { ...base, label: `${formatStockCount(stock)} left`, fill }
}

/**
 * Every staple with its days-left gauge. Pass the full list from
 * groupByProduct: products without a staple are skipped, and staples that are
 * out (with nothing in the pantry) are included. The stocked / low / out
 * counts go by amount only; a gauge's colour and days also count the expiry date.
 */
export function getStaplesSummary(stocks: StockInfo[], now: Date = new Date()): StaplesSummary {
  const staples = stocks.filter((stock) => stock.staple)
  const gauges = staples.map((stock) => gaugeFor(stock, now)).sort((a, b) => {
    const outA = a.stock.status === 'out' ? 0 : 1
    const outB = b.stock.status === 'out' ? 0 : 1
    if (outA !== outB) return outA - outB
    const daysA = a.daysLeft ?? Infinity
    const daysB = b.daysLeft ?? Infinity
    if (daysA !== daysB) return daysA - daysB
    return a.name.localeCompare(b.name)
  })
  return {
    total: staples.length,
    stocked: staples.filter((stock) => stock.status === 'ok').length,
    low: staples.filter((stock) => stock.status === 'low').length,
    out: staples.filter((stock) => stock.status === 'out').length,
    gauges,
  }
}

// ---------------------------------------------------------------------------
// Roles and dinners on hand
// ---------------------------------------------------------------------------

/** The three roles a dinner is built from. Breakfast, snacks, flavor and drinks don't count. */
export const DINNER_ROLES = ['main', 'base', 'produce'] as const
export type DinnerRole = (typeof DINNER_ROLES)[number]

/** Plural names for the legend and the "runs out first" line */
export const ROLE_PLURALS: Record<FoodRole, string> = {
  main: 'Mains',
  base: 'Bases',
  produce: 'Veg & fruit',
  breakfast: 'Breakfast & dairy',
  snack: 'Snacks',
  flavor: 'Flavor',
  drink: 'Drinks',
}

/** One colour per food role, used for the role bar, its legend and the meters */
export const ROLE_COLORS: Record<FoodRole, string> = {
  main: '#E0533D',
  base: '#C9962A',
  produce: '#3FA45B',
  breakfast: '#4F86E8',
  snack: '#9A6FD8',
  flavor: '#B5B5BF',
  drink: '#2BA9BF',
}

/** Short names for the three meters */
export const DINNER_ROLE_LABELS: Record<DinnerRole, string> = { main: 'Mains', base: 'Bases', produce: 'Veg' }

/**
 * Servings one person eats at one dinner. A main's serving is the 4 oz on a
 * nutrition label, and a dinner portion is about 6 oz, so a dinner takes 1.5.
 * Bases and veg servings are already about one dinner's worth.
 */
export const DINNER_PORTIONS: Record<DinnerRole, number> = { main: 1.5, base: 1, produce: 1 }

export interface RoleCount {
  role: FoodRole
  count: number
}

export interface DinnerEstimate {
  /** Products by role, in FOOD_ROLES order, roles with none left out */
  roleCounts: RoleCount[]
  /** Products counted in roleCounts */
  totalProducts: number
  /** Servings left of mains, bases and veg, rounded to one decimal. Expired food and snacking fruit are left out. */
  servings: Record<DinnerRole, number>
  householdSize: number
  /** Dinners for the household each role would last on its own (servings ÷ portion ÷ people), one decimal */
  dinnersBy: Record<DinnerRole, number>
  /** The smallest of dinnersBy, rounded down */
  dinners: number
  /** The role that runs out first. Ties go main, then base, then veg. */
  limitedBy: DinnerRole
}

/**
 * Item counts by role, servings of the three dinner roles, and how many
 * dinners those make for the household. An estimate: servings are guessed
 * from amounts unless a person typed them.
 *
 * `products` is one entry per product in stock (from groupByProduct). Each
 * product's role comes from its soonest row.
 */
export function estimateDinners(products: StockInfo[], householdSize: number, now: Date = new Date()): DinnerEstimate {
  const counts = new Map<FoodRole, number>()
  const servings: Record<DinnerRole, number> = { main: 0, base: 0, produce: 0 }
  let totalProducts = 0

  for (const stock of products) {
    if (stock.items.length === 0) continue
    totalProducts++
    const role = getRole(stock.items[0])
    counts.set(role, (counts.get(role) ?? 0) + 1)
    if (!(DINNER_ROLES as readonly string[]).includes(role)) continue

    // Apples and bananas are "Veg & fruit" in the bar, but not dinner veg
    if (role === 'produce' && isSnackingFruit(stock.name)) continue

    for (const item of stock.items) {
      if (daysUntil(item.expirationDate, now) < 0) continue
      // A row keeps the product's role, so servings use the same role as the count
      servings[role as DinnerRole] += estimateServings({ ...item, role })
    }
  }

  for (const role of DINNER_ROLES) servings[role] = Math.round(servings[role] * 10) / 10

  const people = Math.max(1, householdSize)
  const exact = {} as Record<DinnerRole, number>
  const dinnersBy = {} as Record<DinnerRole, number>
  for (const role of DINNER_ROLES) {
    exact[role] = servings[role] / DINNER_PORTIONS[role] / people
    dinnersBy[role] = Math.round(exact[role] * 10) / 10
  }

  let limitedBy: DinnerRole = 'main'
  for (const role of DINNER_ROLES) if (exact[role] < exact[limitedBy]) limitedBy = role

  return {
    roleCounts: FOOD_ROLES.filter((role) => counts.has(role)).map((role) => ({ role, count: counts.get(role)! })),
    totalProducts,
    servings,
    householdSize: people,
    dinnersBy,
    dinners: Math.floor(exact[limitedBy] + 1e-9),
    limitedBy,
  }
}

/** "mains run out first", "veg runs out first" */
export function describeLimit(role: DinnerRole): string {
  return role === 'produce' ? 'veg runs out first' : `${DINNER_ROLE_LABELS[role].toLowerCase()} run out first`
}

/**
 * Saved recipes with every required ingredient in the pantry. The same rule
 * the Recipes tab's "Can make now" filter uses (match score 100).
 */
export function countCookableRecipes(recipes: Recipe[], inventory: FoodItem[]): { cookable: number; total: number } {
  if (recipes.length === 0) return { cookable: 0, total: 0 }
  const cookable = matchAllRecipes(recipes, inventory).filter((result) => result.matchScore === 100).length
  return { cookable, total: recipes.length }
}

// ---------------------------------------------------------------------------
// Flavor group
// ---------------------------------------------------------------------------

/** A product whose role is flavor: oils, spices, sauces, condiments */
export function isFlavor(stock: StockInfo): boolean {
  return stock.items.length > 0 && getRole(stock.items[0]) === 'flavor'
}

/**
 * The flavor group's pill: "N low" (orange) when a flavor staple is low.
 * Otherwise the usual group pill, which is "All good" unless something
 * expired or expires soon.
 */
export function getFlavorStatus(products: StockInfo[]): GroupStatus {
  const low = products.filter((stock) => stock.staple && stock.status !== 'ok').length
  return low > 0 ? { text: `${low} low`, tone: 'orange' } : getGroupStatus(products)
}

// ---------------------------------------------------------------------------
// Haven't touched in a while
// ---------------------------------------------------------------------------

/** Products untouched for this many days or more go in "Haven't touched in a while" */
export const FORGOTTEN_DAYS = 21

export interface ForgottenProduct {
  stock: StockInfo
  /** Days since any of its rows was last touched */
  days: number
}

/**
 * Products still in date that nobody has touched for FORGOTTEN_DAYS or more,
 * oldest first. A product counts as touched when any of its rows was.
 */
export function selectForgotten(products: StockInfo[], now: Date = new Date()): ForgottenProduct[] {
  const result: ForgottenProduct[] = []
  for (const stock of products) {
    if (stock.items.length === 0) continue
    if (daysUntil(stock.items[0].expirationDate, now) < 0) continue
    const newest = stock.items.reduce((latest, item) =>
      getTouchedAt(item).getTime() > getTouchedAt(latest).getTime() ? item : latest
    )
    const days = daysSinceTouched(newest, now)
    if (days >= FORGOTTEN_DAYS) result.push({ stock, days })
  }
  return result.sort((a, b) => b.days - a.days || a.stock.name.localeCompare(b.stock.name))
}

/** "3 weeks", "6 weeks", "2 months" */
export function describeUntouched(days: number): string {
  if (days < 60) return `${Math.floor(days / 7)} weeks`
  return `${Math.floor(days / 30)} months`
}
