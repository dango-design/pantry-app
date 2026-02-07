import { supabase } from './supabase'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'
import { getUserHouseholdId } from './inventoryApi'

export type RecipeRow = Tables<'recipes'>
export type RecipeInsert = InsertTables<'recipes'>
export type RecipeUpdate = UpdateTables<'recipes'>

/**
 * Get all recipes for the current household (includes builtin recipes)
 */
export async function getRecipes(): Promise<RecipeRow[]> {
  const householdId = await getUserHouseholdId()
  if (!householdId) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .or(`household_id.eq.${householdId},household_id.is.null`)
    .order('name')

  if (error) {
    console.error('Error fetching recipes:', error)
    throw error
  }

  return data ?? []
}

/**
 * Get a single recipe by ID
 */
export async function getRecipe(id: string): Promise<RecipeRow | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching recipe:', error)
    return null
  }

  return data
}

/**
 * Create a new recipe
 */
export async function createRecipe(recipe: Omit<RecipeInsert, 'household_id' | 'created_by'>): Promise<RecipeRow> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const householdId = await getUserHouseholdId()
  if (!householdId) throw new Error('No household found')

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      ...recipe,
      household_id: householdId,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating recipe:', error)
    throw error
  }

  return data
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(id: string, updates: RecipeUpdate): Promise<RecipeRow> {
  const { data, error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating recipe:', error)
    throw error
  }

  return data
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting recipe:', error)
    throw error
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(id: string): Promise<RecipeRow> {
  const recipe = await getRecipe(id)
  if (!recipe) throw new Error('Recipe not found')

  return updateRecipe(id, { is_favorite: !recipe.is_favorite })
}

/**
 * Mark a recipe as cooked
 */
export async function markAsCooked(id: string): Promise<RecipeRow> {
  const recipe = await getRecipe(id)
  if (!recipe) throw new Error('Recipe not found')

  return updateRecipe(id, {
    times_cooked: recipe.times_cooked + 1,
    last_cooked_at: new Date().toISOString(),
  })
}

/**
 * Search recipes by name
 */
export async function searchRecipes(query: string): Promise<RecipeRow[]> {
  const householdId = await getUserHouseholdId()
  if (!householdId) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .or(`household_id.eq.${householdId},household_id.is.null`)
    .ilike('name', `%${query}%`)
    .order('name')

  if (error) {
    console.error('Error searching recipes:', error)
    throw error
  }

  return data ?? []
}

/**
 * Subscribe to real-time recipe changes
 */
export function subscribeToRecipes(
  householdId: string,
  callback: (payload: { eventType: string; new: RecipeRow | null; old: RecipeRow | null }) => void
) {
  return supabase
    .channel(`recipes:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recipes',
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as RecipeRow | null,
          old: payload.old as RecipeRow | null,
        })
      }
    )
    .subscribe()
}
