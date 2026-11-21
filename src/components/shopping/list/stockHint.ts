import type { FoodItem, Staple } from '@/types'
import { describeRunOut, findStaple, formatStockCount, getStock, type StockInfo } from '@/utils/stock'

export interface StapleHint {
  /** "About 3 left · out by Nov 22", "12 left", "Out" */
  text: string
  status: StockInfo['status']
}

/**
 * The stock line for a list item whose name matches a staple. It uses the
 * estimate, not the pantry rows' quantities: the rows only change when
 * someone edits them. Returns nothing when the name is not a staple.
 */
export function getStapleHint(
  name: string,
  inventory: FoodItem[],
  staples: Staple[],
  now: Date = new Date(),
): StapleHint | undefined {
  if (!findStaple(name, staples)) return undefined

  const stock = getStock(name, inventory, staples, now)
  if (stock.status === 'out') return { text: 'Out', status: 'out' }

  const left = `${formatStockCount(stock)} left`
  const runOut = describeRunOut(stock, now)
  return {
    text: runOut ? `${left} · ${runOut.charAt(0).toLowerCase()}${runOut.slice(1)}` : left,
    status: stock.status,
  }
}
