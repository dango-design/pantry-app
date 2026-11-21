import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common'
import { CARD_GRID } from '@/components/layout/pageWidth'
import { useDemoStore } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
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

interface RunningLowSectionProps {
  /** Open the "Keep in stock" sheet for this product */
  onOpenStaple: (name: string) => void
  /** Show a message, with undo when the action can be taken back */
  onNotify: (message: string, undo?: () => void) => void
}

interface LowRow {
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

// Rows shown before "Show all"
const MAX_ROWS = 5

// "Out", "About 3 left, out by Nov 22", "2 left". The same wording as the shopping list's suggestions.
function stapleDetail(stock: StockInfo, now: Date): string {
  if (stock.status === 'out') return 'Out'
  const left = `${formatStockCount(stock)} left`
  const runOut = describeRunOut(stock, now)
  return runOut ? `${left}, ${runOut.charAt(0).toLowerCase()}${runOut.slice(1)}` : left
}

/**
 * What needs buying, at the top of the pantry: staples that are low or out,
 * then other products that are low or were used up lately. A staple that is
 * out has no pantry card, so this is the only place it shows.
 *
 * Staples stay listed after they go on the shopping list, marked "On your
 * list". Other products leave once they are on the list.
 */
export function RunningLowSection({ onOpenStaple, onNotify }: RunningLowSectionProps) {
  const navigate = useNavigate()
  const { inventory, staples, shoppingList, addShoppingItem, removeShoppingItem, updateStaple } = useDemoStore()
  const [showAll, setShowAll] = useState(false)

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

  if (rows.length === 0) return null

  // Out before low, and staples first within each
  const order = (row: LowRow) => (row.reason === 'out' ? 0 : 2) + (row.staple ? 0 : 1)
  rows.sort((a, b) => order(a) - order(b))
  const visible = showAll ? rows : rows.slice(0, MAX_ROWS)

  const handleOpen = (row: LowRow) => {
    // A product with something left has a pantry row to show. A staple, or a
    // product with nothing left, opens the "Keep in stock" sheet.
    if (!row.staple && row.itemId) navigate(`/item/${row.itemId}`)
    else onOpenStaple(row.name)
  }

  const handleAdd = (row: LowRow) => {
    const staple = row.staple
    const listItem = addShoppingItem({
      shoppingListId: 'demo-list',
      name: row.name,
      quantity: row.quantity,
      quantityUnit: row.unit,
      category: row.category,
      isChecked: false,
      source: 'low_stock',
      priority: 'normal',
    })
    onNotify(`${row.name} added to your shopping list`, () => {
      removeShoppingItem(listItem.id)
      // Taking a low staple off the list marks it "not now". Put that mark back as it was.
      if (staple) updateStaple(staple.id, { skippedAt: staple.skippedAt })
    })
  }

  return (
    <section aria-labelledby="running-low-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-3 min-h-[28px]">
        <h2 id="running-low-heading" className="text-sm font-semibold text-gray-700">
          Out and running low
        </h2>
        {rows.length > MAX_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
            className="-my-2 py-2 pl-3 text-sm font-medium text-primary hover:text-primary-hover"
          >
            {showAll ? 'Show fewer' : `Show all ${rows.length}`}
          </button>
        )}
      </div>

      <ul className={CARD_GRID}>
        {visible.map((row) => (
          <li
            key={row.key}
            className="flex items-center gap-2 rounded-xl border border-primary-muted bg-white pl-4 pr-3"
          >
            <button
              type="button"
              onClick={() => handleOpen(row)}
              className="flex-1 min-w-0 py-2.5 text-left"
            >
              <span className="block font-medium text-base leading-6 text-gray-900 truncate">{row.name}</span>
              <span className={cn('block text-sm leading-5 truncate', row.reason === 'out' ? 'text-red-600' : 'text-gray-600')}>
                {row.detail}
              </span>
            </button>

            {row.onList ? (
              <span className="shrink-0 px-1 text-sm text-gray-500">On your list</span>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAdd(row)}
                className="shrink-0 min-h-[40px]"
                aria-label={`Add ${row.name} to shopping list`}
              >
                Add to list
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
