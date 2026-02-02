import { supabase } from './supabase'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'
import { getUserHouseholdId, addFoodItem } from './inventoryApi'

export type ShoppingListRow = Tables<'shopping_lists'>
export type ShoppingListItemRow = Tables<'shopping_list_items'>
export type ShoppingListItemInsert = InsertTables<'shopping_list_items'>
export type ShoppingListItemUpdate = UpdateTables<'shopping_list_items'>

/**
 * Get the default shopping list for the current household
 */
export async function getDefaultShoppingList(): Promise<ShoppingListRow | null> {
  const householdId = await getUserHouseholdId()
  if (!householdId) return null

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_default', true)
    .single()

  if (error) {
    console.error('Error fetching default shopping list:', error)
    return null
  }

  return data
}

/**
 * Get all shopping lists for the current household
 */
export async function getShoppingLists(): Promise<ShoppingListRow[]> {
  const householdId = await getUserHouseholdId()
  if (!householdId) return []

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('household_id', householdId)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) {
    console.error('Error fetching shopping lists:', error)
    throw error
  }

  return data ?? []
}

/**
 * Get all items in a shopping list
 */
export async function getShoppingListItems(listId: string): Promise<ShoppingListItemRow[]> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('shopping_list_id', listId)
    .order('is_checked')
    .order('category')
    .order('name')

  if (error) {
    console.error('Error fetching shopping list items:', error)
    throw error
  }

  return data ?? []
}

/**
 * Get items from the default shopping list
 */
export async function getDefaultShoppingListItems(): Promise<ShoppingListItemRow[]> {
  const list = await getDefaultShoppingList()
  if (!list) return []

  return getShoppingListItems(list.id)
}

/**
 * Add an item to a shopping list
 */
export async function addShoppingListItem(
  item: Omit<ShoppingListItemInsert, 'shopping_list_id'>,
  listId?: string
): Promise<ShoppingListItemRow> {
  // If no list ID provided, use default list
  let targetListId = listId
  if (!targetListId) {
    const defaultList = await getDefaultShoppingList()
    if (!defaultList) throw new Error('No shopping list found')
    targetListId = defaultList.id
  }

  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({
      ...item,
      shopping_list_id: targetListId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding shopping list item:', error)
    throw error
  }

  return data
}

/**
 * Update a shopping list item
 */
export async function updateShoppingListItem(
  id: string,
  updates: ShoppingListItemUpdate
): Promise<ShoppingListItemRow> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating shopping list item:', error)
    throw error
  }

  return data
}

/**
 * Toggle item checked status
 */
export async function toggleShoppingItemChecked(id: string): Promise<ShoppingListItemRow> {
  const { data: { user } } = await supabase.auth.getUser()

  // Get current state
  const { data: current } = await supabase
    .from('shopping_list_items')
    .select('is_checked')
    .eq('id', id)
    .single()

  const newChecked = !current?.is_checked

  const { data, error } = await supabase
    .from('shopping_list_items')
    .update({
      is_checked: newChecked,
      checked_by: newChecked ? user?.id : null,
      checked_at: newChecked ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error toggling shopping item:', error)
    throw error
  }

  return data
}

/**
 * Delete a shopping list item
 */
export async function deleteShoppingListItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting shopping list item:', error)
    throw error
  }
}

/**
 * Move checked items to inventory and remove from list
 */
export async function moveCheckedToInventory(listId: string): Promise<number> {
  // Get all checked items
  const { data: checkedItems, error: fetchError } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('shopping_list_id', listId)
    .eq('is_checked', true)

  if (fetchError) {
    console.error('Error fetching checked items:', fetchError)
    throw fetchError
  }

  if (!checkedItems || checkedItems.length === 0) return 0

  // Add each to inventory
  const today = new Date().toISOString().split('T')[0]
  const defaultExpiration = new Date()
  defaultExpiration.setDate(defaultExpiration.getDate() + 14) // Default 2 weeks

  for (const item of checkedItems) {
    try {
      await addFoodItem({
        name: item.name,
        category: item.category || 'other',
        quantity: item.quantity || 1,
        quantity_unit: item.quantity_unit || 'count',
        original_quantity: item.quantity || 1,
        storage_location: 'refrigerator', // Default
        purchase_date: today,
        expiration_date: defaultExpiration.toISOString().split('T')[0],
        expiration_source: 'calculated',
        added_via: 'manual',
        tags: [],
      })
    } catch (err) {
      console.error(`Error adding ${item.name} to inventory:`, err)
    }
  }

  // Delete checked items from shopping list
  const { error: deleteError } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('shopping_list_id', listId)
    .eq('is_checked', true)

  if (deleteError) {
    console.error('Error deleting checked items:', deleteError)
    throw deleteError
  }

  return checkedItems.length
}

/**
 * Clear all checked items without adding to inventory
 */
export async function clearCheckedItems(listId: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('shopping_list_id', listId)
    .eq('is_checked', true)

  if (error) {
    console.error('Error clearing checked items:', error)
    throw error
  }
}

/**
 * Subscribe to real-time shopping list changes
 */
export function subscribeToShoppingList(
  listId: string,
  callback: (payload: { eventType: string; new: ShoppingListItemRow | null; old: ShoppingListItemRow | null }) => void
) {
  return supabase
    .channel(`shopping:${listId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shopping_list_items',
        filter: `shopping_list_id=eq.${listId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as ShoppingListItemRow | null,
          old: payload.old as ShoppingListItemRow | null,
        })
      }
    )
    .subscribe()
}

/**
 * Create a new shopping list
 */
export async function createShoppingList(name: string): Promise<ShoppingListRow> {
  const householdId = await getUserHouseholdId()
  if (!householdId) throw new Error('No household found')

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      household_id: householdId,
      name,
      is_default: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating shopping list:', error)
    throw error
  }

  return data
}
