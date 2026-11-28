import { useDemoStore } from '@/stores/demoStore'
import { formatQuantity } from '@/utils/mealPlan'
import { findStaple, getStock, productKey, roundStockCount, type StockInfo } from '@/utils/stock'
import { isDiscreteUnit } from '@/utils/units'
import type { QuantityUnit, Staple } from '@/types'

// Helpers the pantry screens share for product-level changes.
// They read and write the store directly, so they work outside components.

/** The number shown for a product: the rounded estimate for a staple, otherwise the counted amount */
export function shownCount(stock: StockInfo): number {
  return stock.isEstimate ? roundStockCount(stock.estimated, stock.unit) : stock.counted
}

/** "About 1 a day", "About 1 every 3 days", "About 0.5 lb a day" */
export function describeDailyUse(rate: number, unit: QuantityUnit): string {
  const days = Math.round(1 / rate)
  if (isDiscreteUnit(unit) && days >= 2) return `About ${formatQuantity(1, unit)} every ${days} days`
  const amount = rate >= 1 ? Math.round(rate * 10) / 10 : Math.round(rate * 100) / 100
  return `About ${formatQuantity(amount, unit)} a day`
}

/**
 * Remembers a product's pantry rows and its staple's dates. Call it before
 * changing the product. The function it returns puts everything back.
 *
 * Restoring a row's quantity marks a staple as counted now, which would stop
 * the estimate from going down for the days already passed. So the staple's
 * `countedAt` goes back last.
 */
export function snapshotStock(name: string): () => void {
  const before = useDemoStore.getState()
  const key = productKey(name)
  const rows = before.inventory.filter((item) => productKey(item.name) === key)
  const staple = findStaple(name, before.staples)
  const listIds = new Set(before.shoppingList.map((item) => item.id))

  return () => {
    const { updateItem, updateStaple, removeShoppingItem } = useDemoStore.getState()

    for (const saved of rows) {
      const current = useDemoStore.getState().inventory.find((item) => item.id === saved.id)
      if (!current) continue
      const unchanged =
        current.quantity === saved.quantity &&
        current.status === saved.status &&
        current.expirationDate === saved.expirationDate
      if (unchanged) continue
      updateItem(saved.id, {
        quantity: saved.quantity,
        status: saved.status,
        consumedAt: saved.consumedAt,
        // Bringing back a used-up row can give it a new date. Put the old one back too.
        expirationDate: saved.expirationDate,
        expirationSource: saved.expirationSource,
        freshnessScore: saved.freshnessScore,
        // Undo is not a new touch, and the servings were for the old amount
        touchedAt: saved.touchedAt,
        servings: saved.servings,
      })
    }

    if (!staple) return
    updateStaple(staple.id, { countedAt: staple.countedAt, skippedAt: staple.skippedAt })

    // Running out can put a staple on the shopping list automatically. When
    // the product is back above its minimum, take that new list item off.
    const after = useDemoStore.getState()
    if (getStock(name, after.inventory, after.staples).status !== 'ok') return
    for (const listItem of after.shoppingList) {
      const addedSince = !listIds.has(listItem.id)
      if (addedSince && !listItem.isChecked && listItem.source === 'low_stock' && productKey(listItem.name) === key) {
        removeShoppingItem(listItem.id)
      }
    }
  }
}

/** Takes a product to zero: every row in stock is marked used up */
export function emptyProduct(name: string): void {
  useDemoStore.getState().setStock(name, 0)

  // setStock skips rows whose unit it cannot convert. Use those up one by one.
  const key = productKey(name)
  const { inventory, consumeItem } = useDemoStore.getState()
  for (const item of inventory) {
    if (productKey(item.name) === key && item.status === 'active' && item.quantity > 0) {
      consumeItem(item.id, item.quantity)
    }
  }
}

/**
 * Puts back a staple that was removed. Removing it wrote the estimate into the
 * pantry rows, so the restored staple counts from now, not from its old date.
 */
export function restoreStaple(staple: Staple): void {
  const { addStaple, updateStaple } = useDemoStore.getState()
  const restored = addStaple({
    name: staple.name,
    category: staple.category,
    unit: staple.unit,
    minQuantity: staple.minQuantity,
    buyQuantity: staple.buyQuantity,
    dailyUse: staple.dailyUse,
    autoAdd: staple.autoAdd,
  })
  updateStaple(restored.id, { skippedAt: staple.skippedAt })
}
