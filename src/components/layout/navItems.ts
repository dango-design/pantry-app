import type { ComponentType } from 'react'
import { PantryIcon } from '@/components/icons'
import { CartIcon, PlanIcon, RecipeIcon } from './NavIcons'

export interface NavItem {
  to: string
  label: string
  Icon: ComponentType<{ className?: string }>
  /** Sub-pages that belong to this section, so it stays highlighted on them (e.g. a recipe under Recipes) */
  sections?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Pantry', Icon: PantryIcon, sections: ['/item', '/add'] },
  { to: '/recipes', label: 'Recipes', Icon: RecipeIcon, sections: ['/recipe'] },
  { to: '/plan', label: 'Plan', Icon: PlanIcon },
  { to: '/shopping', label: 'Shopping', Icon: CartIcon },
]

export function isNavItemActive(item: Pick<NavItem, 'to' | 'sections'>, pathname: string): boolean {
  if (pathname === item.to) return true
  const prefixes = [...(item.to === '/' ? [] : [item.to]), ...(item.sections ?? [])]
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Marks the shopping tab's icon in whichever nav is showing, so "add to list"
 * animations can fly to it.
 */
export const CART_TARGET_ATTR = 'data-cart-target'
