import { useState } from 'react'
import { useDemoStore } from '@/stores/demoStore'
import { isSameName } from '@/utils/pantryMatch'
import { getStock } from '@/utils/stock'
import type { FoodItem } from '@/types'
import { AlreadyInPantrySheet } from './AlreadyInPantrySheet'
import { emptyProduct, snapshotStock } from './stockHelpers'

export interface AddToListResult {
  message: string
  undo?: () => void
  /** The product was cleared from the pantry (the "I'm out of it" choice) */
  usedUp: boolean
}

/**
 * Add a pantry product to the shopping list. Pass any of its rows. Products
 * that are running low, or already used up, are added right away. Products
 * still in stock open a sheet asking whether to keep them or mark them used
 * up first, and products already on the list aren't added twice. Render
 * `sheet` somewhere in the page.
 */
export function useAddToList(onDone: (result: AddToListResult) => void) {
  const { inventory, staples, shoppingList, addShoppingItem, removeShoppingItem, updateStaple } = useDemoStore()
  const [pending, setPending] = useState<FoodItem | null>(null)

  const addToList = (item: FoodItem, usedUp: boolean) => {
    const stock = getStock(item.name, inventory, staples)
    const staple = stock.staple

    // "I'm out of it" clears every row of the product. Remember them first so undo is exact.
    const restoreStock = usedUp ? snapshotStock(item.name) : undefined
    if (usedUp) emptyProduct(item.name)

    // A staple asks for its "buy this many". Anything else restocks what was bought last time.
    const listItem = addShoppingItem({
      shoppingListId: 'demo-list',
      name: item.name,
      quantity: staple ? staple.buyQuantity : item.originalQuantity || item.quantity,
      quantityUnit: staple ? staple.unit : item.quantityUnit,
      category: item.category,
      isChecked: false,
      source: usedUp || stock.status !== 'ok' ? 'low_stock' : 'manual',
      sourceItemId: item.id,
      priority: 'normal',
    })

    onDone({
      message: usedUp
        ? `${item.name} removed from your pantry and added to your shopping list`
        : `${item.name} added to your shopping list`,
      usedUp,
      undo: () => {
        removeShoppingItem(listItem.id)
        if (restoreStock) {
          restoreStock()
        } else if (staple) {
          // Taking a low staple off the list marks it "not now". Put that mark back as it was.
          updateStaple(staple.id, { skippedAt: staple.skippedAt })
        }
      },
    })
  }

  /** Returns true when the product was added straight away (no sheet, not a duplicate) */
  const requestAdd = (item: FoodItem): boolean => {
    if (shoppingList.some((listItem) => !listItem.isChecked && isSameName(listItem.name, item.name))) {
      onDone({ message: `${item.name} is already on your shopping list`, usedUp: false })
      return false
    }
    // Low or out, so buying more needs no question. For a staple this goes by the estimate.
    if (getStock(item.name, inventory, staples).status !== 'ok') {
      addToList(item, false)
      return true
    }
    setPending(item)
    return false
  }

  const sheet = pending && (
    <AlreadyInPantrySheet
      stock={getStock(pending.name, inventory, staples)}
      onAdd={() => {
        setPending(null)
        addToList(pending, false)
      }}
      onUsedUpAndAdd={() => {
        setPending(null)
        addToList(pending, true)
      }}
      onClose={() => setPending(null)}
    />
  )

  return { requestAdd, sheet }
}
