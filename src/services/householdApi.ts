import { supabase } from './supabase'
import type { Tables, UpdateTables } from '@/types/database'

export type HouseholdRow = Tables<'households'>
export type HouseholdMemberRow = Tables<'household_members'>
export type UserProfileRow = Tables<'user_profiles'>

export type HouseholdMemberWithProfile = HouseholdMemberRow & {
  profile: UserProfileRow | null
}

/**
 * Get the current user's household
 */
export async function getCurrentHousehold(): Promise<HouseholdRow | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return null

  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', membership.household_id)
    .single()

  if (error) {
    console.error('Error fetching household:', error)
    return null
  }

  return data
}

/**
 * Get all members of a household with their profiles
 */
export async function getHouseholdMembers(householdId: string): Promise<HouseholdMemberWithProfile[]> {
  const { data: members, error: membersError } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .order('joined_at')

  if (membersError) {
    console.error('Error fetching household members:', membersError)
    throw membersError
  }

  if (!members || members.length === 0) return []

  // Fetch profiles for all members
  const userIds = members.map(m => m.user_id)
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', userIds)

  if (profilesError) {
    console.error('Error fetching member profiles:', profilesError)
  }

  // Combine members with their profiles
  return members.map(member => ({
    ...member,
    profile: profiles?.find(p => p.id === member.user_id) ?? null,
  }))
}

/**
 * Update household settings
 */
export async function updateHousehold(
  householdId: string,
  updates: UpdateTables<'households'>
): Promise<HouseholdRow> {
  const { data, error } = await supabase
    .from('households')
    .update(updates)
    .eq('id', householdId)
    .select()
    .single()

  if (error) {
    console.error('Error updating household:', error)
    throw error
  }

  return data
}

/**
 * Generate a new invite code for the household
 */
export async function regenerateInviteCode(householdId: string): Promise<string> {
  // Generate a random 8-character code
  const newCode = generateInviteCode()

  const { data, error } = await supabase
    .from('households')
    .update({ invite_code: newCode })
    .eq('id', householdId)
    .select('invite_code')
    .single()

  if (error) {
    console.error('Error regenerating invite code:', error)
    throw error
  }

  return data.invite_code
}

/**
 * Join a household using an invite code
 */
export async function joinHouseholdByInvite(inviteCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_household_by_invite', {
    p_invite_code: inviteCode.toUpperCase().trim(),
  })

  if (error) {
    console.error('Error joining household:', error)
    if (error.message.includes('not found')) {
      throw new Error('Invalid invite code')
    }
    if (error.message.includes('already a member')) {
      throw new Error('You are already a member of this household')
    }
    throw error
  }

  return data as string
}

/**
 * Leave the current household and create a new one
 */
export async function leaveHousehold(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current membership
  const { data: membership } = await supabase
    .from('household_members')
    .select('*, households(*)')
    .eq('user_id', user.id)
    .single()

  if (!membership) throw new Error('No household membership found')

  // Check if user is the owner
  const household = membership.households as unknown as HouseholdRow
  if (household.owner_id === user.id) {
    // Get other members
    const { data: otherMembers } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', membership.household_id)
      .neq('user_id', user.id)
      .order('joined_at')
      .limit(1)

    if (otherMembers && otherMembers.length > 0) {
      // Transfer ownership to the next member
      await supabase
        .from('households')
        .update({ owner_id: otherMembers[0].user_id })
        .eq('id', membership.household_id)

      await supabase
        .from('household_members')
        .update({ role: 'owner' })
        .eq('id', otherMembers[0].id)
    } else {
      // Delete the household if no other members
      await supabase
        .from('households')
        .delete()
        .eq('id', membership.household_id)
    }
  }

  // Remove user from current household
  await supabase
    .from('household_members')
    .delete()
    .eq('user_id', user.id)

  // Create a new household for the user
  const { data: newHousehold, error: householdError } = await supabase
    .from('households')
    .insert({
      name: 'My household',
      owner_id: user.id,
      invite_code: generateInviteCode(),
    })
    .select()
    .single()

  if (householdError) {
    console.error('Error creating new household:', householdError)
    throw householdError
  }

  // Add user to new household
  await supabase
    .from('household_members')
    .insert({
      household_id: newHousehold.id,
      user_id: user.id,
      role: 'owner',
    })

  // Create default shopping list
  await supabase
    .from('shopping_lists')
    .insert({
      household_id: newHousehold.id,
      name: 'Shopping list',
      is_default: true,
    })
}

/**
 * Remove a member from the household (owner only)
 */
export async function removeHouseholdMember(memberId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get the member being removed
  const { data: member } = await supabase
    .from('household_members')
    .select('*, households(*)')
    .eq('id', memberId)
    .single()

  if (!member) throw new Error('Member not found')

  const household = member.households as unknown as HouseholdRow

  // Check if current user is the owner
  if (household.owner_id !== user.id) {
    throw new Error('Only the household owner can remove members')
  }

  // Cannot remove yourself as owner
  if (member.user_id === user.id) {
    throw new Error('Cannot remove yourself. Use "Leave household" instead.')
  }

  // Remove the member
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', memberId)

  if (error) {
    console.error('Error removing member:', error)
    throw error
  }
}

/**
 * Update current user's role in household
 */
export async function updateMemberRole(
  memberId: string,
  role: 'owner' | 'admin' | 'member'
): Promise<HouseholdMemberRow> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get the member being updated
  const { data: member } = await supabase
    .from('household_members')
    .select('*, households(*)')
    .eq('id', memberId)
    .single()

  if (!member) throw new Error('Member not found')

  const household = member.households as unknown as HouseholdRow

  // Check if current user is the owner
  if (household.owner_id !== user.id) {
    throw new Error('Only the household owner can change roles')
  }

  // If making someone else owner, transfer ownership
  if (role === 'owner') {
    await supabase
      .from('households')
      .update({ owner_id: member.user_id })
      .eq('id', member.household_id)

    // Demote current owner to admin
    await supabase
      .from('household_members')
      .update({ role: 'admin' })
      .eq('household_id', member.household_id)
      .eq('user_id', user.id)
  }

  const { data, error } = await supabase
    .from('household_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single()

  if (error) {
    console.error('Error updating member role:', error)
    throw error
  }

  return data
}

/**
 * Subscribe to household member changes
 */
export function subscribeToHouseholdMembers(
  householdId: string,
  callback: (payload: { eventType: string; new: HouseholdMemberRow | null; old: HouseholdMemberRow | null }) => void
) {
  return supabase
    .channel(`household:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'household_members',
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as HouseholdMemberRow | null,
          old: payload.old as HouseholdMemberRow | null,
        })
      }
    )
    .subscribe()
}

/**
 * Generate a random invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes confusing chars like 0/O, 1/I
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
