import { useMemo } from 'react'
import { useDemoStore } from '@/stores/demoStore'
import {
  describeRunOut,
  formatStockCount,
  getRestockSuggestions,
  groupByProduct,
  isOnShoppingList,
  productKey,
  type StockInfo,
} from '@/utils/stock'
import type { FoodCategory, QuantityUnit, Staple } from '@/types'

export interface LowRow {
  key: string
  name: string
  category: FoodCategory
  reason: 'out' | 'low'
  detail: string
  /** What goes on the shopping list */
  quantity?: number
  unit?: QuantityUnit
  staple?: Staple
  onList: boolean
  /** The pantry row to open, for a product that still has some */
  itemId?: string
}

// "Out", "About 3 left, out by Nov 22", "2 left". The same wording as the shopping list's suggestions.
function stapleDetail(stock: StockInfo, now: Date): string {
  if (stock.status === 'out') return 'Out'
  const left = `${formatStockCount(stock)} left`
  const runOut = describeRunOut(stock, now)
  return runOut ? `${left}, ${runOut.charAt(0).toLowerCase()}${runOut.slice(1)}` : left
}

/**
 * The rows for "Running low": staples that are low or out, then other
 * products that are low or were used up lately, out before low and staples
 * first. A staple that is out has no pantry row, so this is the only place it
 * shows.
 *
 * Staples stay listed after they go on the shopping list, marked "On your
 * list". Other products leave once they are on the list.
 */
export function useRunningLowRows(): LowRow[] {
  const { inventory, staples, shoppingList } = useDemoStore()

  return useMemo(() => {
    const now = new Date()
    const stocks = groupByProduct(inventory, staples, now)
    const stockByKey = new Map(stocks.map((stock) => [stock.key, stock]))

    const rows: LowRow[] = []
    for (const stock of stocks) {
      if (!stock.staple || stock.status === 'ok') continue
      rows.push({
        key: stock.key,
        name: stock.name,
        category: stock.category,
        reason: stock.status,
        detail: stapleDetail(stock, now),
        quantity: stock.staple.buyQuantity,
        unit: stock.unit,
        staple: stock.staple,
        onList: isOnShoppingList(stock.name, shoppingList, now),
      })
    }
    for (const suggestion of getRestockSuggestions(inventory, staples, shoppingList, now)) {
      if (suggestion.stapleId) continue
      const key = productKey(suggestion.name)
      rows.push({
        key,
        name: suggestion.name,
        category: suggestion.category,
        reason: suggestion.reason,
        detail: suggestion.detail,
        quantity: suggestion.quantity,
        unit: suggestion.unit,
        onList: false,
        itemId: stockByKey.get(key)?.items[0]?.id,
      })
    }

    // Out before low, and staples first within each
    const order = (row: LowRow) => (row.reason === 'out' ? 0 : 2) + (row.staple ? 0 : 1)
    return rows.sort((a, b) => order(a) - order(b))
  }, [inventory, staples, shoppingList])
}

