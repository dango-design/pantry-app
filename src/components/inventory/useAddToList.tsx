import { useState } from 'react'
import { useDemoStore } from '@/stores/demoStore'
import { isLowStock, isSameName } from '@/utils/pantryMatch'
import type { FoodItem } from '@/types'
import { AlreadyInPantrySheet } from './AlreadyInPantrySheet'

export interface AddToListResult {
  message: string
  undo?: () => void
  /** The pantry item was cleared (the "I'm out of it" choice) */
  usedUp: boolean
}

/**
 * Add a pantry item to the shopping list. Items that are running low, or
 * already used up, are added right away. Items still in stock open a sheet
 * asking whether to keep them or mark them used up first, and items already
 * on the list aren't added twice. Render `sheet` somewhere in the page.
 */
export function useAddToList(onDone: (result: AddToListResult) => void) {
  const { shoppingList, addShoppingItem, removeShoppingItem, consumeItem, updateItem } = useDemoStore()
  const [pending, setPending] = useState<FoodItem | null>(null)

  const addToList = (item: FoodItem, usedUp: boolean) => {
    const previousQuantity = item.quantity
    if (usedUp) consumeItem(item.id, item.quantity)

    // Restock what was bought last time
    const listItem = addShoppingItem({
      shoppingListId: 'demo-list',
      name: item.name,
      quantity: item.originalQuantity || item.quantity,
      quantityUnit: item.quantityUnit,
      category: item.category,
      isChecked: false,
      source: usedUp || isLowStock(item) ? 'low_stock' : 'manual',
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
        if (usedUp) updateItem(item.id, { quantity: previousQuantity, status: 'active', consumedAt: undefined })
      },
    })
  }

  /** Returns true when the item was added straight away (no sheet, not a duplicate) */
  const requestAdd = (item: FoodItem): boolean => {
    if (shoppingList.some((listItem) => !listItem.isChecked && isSameName(listItem.name, item.name))) {
      onDone({ message: `${item.name} is already on your shopping list`, usedUp: false })
      return false
    }
    if (item.quantity <= 0 || isLowStock(item)) {
      addToList(item, false)
      return true
    }
    setPending(item)
    return false
  }

  const sheet = pending && (
    <AlreadyInPantrySheet
      item={pending}
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
