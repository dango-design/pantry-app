import { supabase } from './supabase'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type FoodItemRow = Tables<'food_items'>
export type FoodItemInsert = InsertTables<'food_items'>
export type FoodItemUpdate = UpdateTables<'food_items'>

/**
 * Get the current user's household ID
 */
export async function getUserHouseholdId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()

  return data?.household_id ?? null
}

/**
 * Get all active food items for the current household
 */
export async function getInventory(): Promise<FoodItemRow[]> {
  const householdId = await getUserHouseholdId()
  if (!householdId) return []

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'active')
    .order('expiration_date', { ascending: true })

  if (error) {
    console.error('Error fetching inventory:', error)
    throw error
  }

  return data ?? []
}

/**
 * Get a single food item by ID
 */
export async function getFoodItem(id: string): Promise<FoodItemRow | null> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching food item:', error)
    return null
  }

  return data
}

/**
 * Add a new food item to inventory
 */
export async function addFoodItem(item: Omit<FoodItemInsert, 'household_id' | 'added_by'>): Promise<FoodItemRow> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const householdId = await getUserHouseholdId()
  if (!householdId) throw new Error('No household found')

  const { data, error } = await supabase
    .from('food_items')
    .insert({
      ...item,
      household_id: householdId,
      added_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding food item:', error)
    throw error
  }

  return data
}

/**
 * Update an existing food item
 */
export async function updateFoodItem(id: string, updates: FoodItemUpdate): Promise<FoodItemRow> {
  const { data, error } = await supabase
    .from('food_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating food item:', error)
    throw error
  }

  return data
}

/**
 * Delete a food item
 */
export async function deleteFoodItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('food_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting food item:', error)
    throw error
  }
}

/**
 * Mark a food item as consumed (fully or partially)
 */
export async function consumeFoodItem(
  id: string,
  quantityUsed: number,
  action: 'consumed' | 'partial_use' | 'discarded' | 'expired' = 'consumed'
): Promise<FoodItemRow> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current item
  const item = await getFoodItem(id)
  if (!item) throw new Error('Food item not found')

  const newQuantity = item.quantity - quantityUsed
  const isFullyConsumed = newQuantity <= 0

  // Update the food item
  const { data: updatedItem, error: updateError } = await supabase
    .from('food_items')
    .update({
      quantity: Math.max(0, newQuantity),
      status: isFullyConsumed ? 'consumed' : 'active',
      consumed_at: isFullyConsumed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('Error consuming food item:', updateError)
    throw updateError
  }

  // Log the usage
  const { error: logError } = await supabase
    .from('food_usage_log')
    .insert({
      food_item_id: id,
      household_id: item.household_id,
      user_id: user.id,
      action: isFullyConsumed ? action : 'partial_use',
      quantity_changed: quantityUsed,
      quantity_remaining: Math.max(0, newQuantity),
    })

  if (logError) {
    console.error('Error logging food usage:', logError)
    // Don't throw - the main operation succeeded
  }

  return updatedItem
}

/**
 * Subscribe to real-time inventory changes
 */
export function subscribeToInventory(
  householdId: string,
  callback: (payload: { eventType: string; new: FoodItemRow | null; old: FoodItemRow | null }) => void
) {
  return supabase
    .channel(`inventory:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'food_items',
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as FoodItemRow | null,
          old: payload.old as FoodItemRow | null,
        })
      }
    )
    .subscribe()
}

/**
 * Get items expiring soon
 */
export async function getExpiringItems(daysAhead: number = 7): Promise<FoodItemRow[]> {
  const householdId = await getUserHouseholdId()
  if (!householdId) return []

  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'active')
    .lte('expiration_date', futureDate.toISOString().split('T')[0])
    .order('expiration_date', { ascending: true })

  if (error) {
    console.error('Error fetching expiring items:', error)
    throw error
  }

  return data ?? []
}

/**
 * Search inventory by name
 */
export async function searchInventory(query: string): Promise<FoodItemRow[]> {
  const householdId = await getUserHouseholdId()
  if (!householdId) return []

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'active')
    .ilike('name', `%${query}%`)
    .order('name')

  if (error) {
    console.error('Error searching inventory:', error)
    throw error
  }

  return data ?? []
}
