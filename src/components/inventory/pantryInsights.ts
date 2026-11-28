// Plain functions behind the Staples, Dinners on hand and "Haven't touched in
// a while" parts of the Pantry tab. They hold no React state and take `now`
// as an argument, so they can be tested on their own (pantryInsights.test.ts).

import { estimateServings, getRole, getTouchedAt, daysSinceTouched, FOOD_ROLES } from '@/utils/foodRoles'
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
  /** "out", "2 d", "30+ d", or the amount ("3 left") when the daily use is not known */
  label: string
  /** How full the bar is, from 0 to 1 */
  fill: number
  tone: GaugeTone
  /** Days left at the usual pace. Not set when the daily use is not known. */
  daysLeft?: number
}

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

function gaugeFor(stock: StockInfo): StapleGauge {
  const tone = TONE_BY_STATUS[stock.status]
  const base = { stock, name: stock.name, tone, daysLeft: stock.daysLeft }

  if (stock.status === 'out') return { ...base, label: 'out', fill: 0 }

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
 * out (with nothing in the pantry) are included.
 */
export function getStaplesSummary(stocks: StockInfo[]): StaplesSummary {
  const staples = stocks.filter((stock) => stock.staple)
  const gauges = staples.map(gaugeFor).sort((a, b) => {
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

export interface RoleCount {
  role: FoodRole
  count: number
}

export interface DinnerEstimate {
  /** Products by role, in FOOD_ROLES order, roles with none left out */
  roleCounts: RoleCount[]
  /** Products counted in roleCounts */
  totalProducts: number
  /** Servings left of mains, bases and veg, rounded to one decimal. Expired food is left out. */
  servings: Record<DinnerRole, number>
  householdSize: number
  /** The smallest of the three servings, divided by household size, rounded down */
  dinners: number
  /** The role with the fewest servings. Ties go main, then base, then veg. */
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

    for (const item of stock.items) {
      if (daysUntil(item.expirationDate, now) < 0) continue
      // A row keeps the product's role, so servings use the same role as the count
      servings[role as DinnerRole] += estimateServings({ ...item, role })
    }
  }

  for (const role of DINNER_ROLES) servings[role] = Math.round(servings[role] * 10) / 10

  const people = Math.max(1, householdSize)
  let limitedBy: DinnerRole = 'main'
  for (const role of DINNER_ROLES) if (servings[role] < servings[limitedBy]) limitedBy = role

  return {
    roleCounts: FOOD_ROLES.filter((role) => counts.has(role)).map((role) => ({ role, count: counts.get(role)! })),
    totalProducts,
    servings,
    householdSize: people,
    dinners: Math.floor(servings[limitedBy] / people + 1e-9),
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
