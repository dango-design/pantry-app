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

  // A user belongs to at most one household (unique index on user_id)
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle()

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
 * Generate a new invite code for the household (owner only)
 */
export async function regenerateInviteCode(householdId: string): Promise<string> {
  // The database generates the code, so it always has the format joining expects
  const { data, error } = await supabase.rpc('regenerate_invite_code', {
    p_household_id: householdId,
  })

  if (error) {
    console.error('Error regenerating invite code:', error)
    throw error
  }

  if (!data) throw new Error('Only the household owner can change the invite code')

  return data
}

/**
 * Join a household using an invite code. This moves the user out of their
 * current household, and deletes it if they were its only member.
 */
export async function joinHouseholdByInvite(inviteCode: string): Promise<string> {
  // The database ignores case, spaces and dashes in the code
  const { data, error } = await supabase.rpc('join_household_by_invite', {
    p_invite_code: inviteCode.trim(),
  })

  if (error) {
    console.error('Error joining household:', error)
    const message = error.message.toLowerCase()
    if (message.includes('invalid invite code')) {
      throw new Error('Invalid invite code')
    }
    if (message.includes('already a member')) {
      throw new Error('You are already a member of this household')
    }
    throw error
  }

  return data
}

/**
 * Leave the current household and create a new one. If the user owns it,
 * ownership passes to the member who joined first.
 */
export async function leaveHousehold(): Promise<void> {
  const { error } = await supabase.rpc('leave_household')

  if (error) {
    console.error('Error leaving household:', error)
    throw error
  }
}

/**
 * Remove a member from the household. The owner can remove anyone else;
 * admins can remove plain members.
 */
export async function removeHouseholdMember(memberId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: member } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('id', memberId)
    .maybeSingle()

  if (!member) throw new Error('Member not found')

  if (member.user_id === user.id) {
    throw new Error('Cannot remove yourself. Use "Leave household" instead.')
  }

  // RLS decides who can remove whom, and a refused delete matches 0 rows
  const { data, error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', memberId)
    .select('id')

  if (error) {
    console.error('Error removing member:', error)
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('You can’t remove this member')
  }
}

/**
 * Change a member's role (owner only). Making someone the owner transfers
 * ownership, and the current owner becomes an admin.
 */
export async function updateMemberRole(
  memberId: string,
  role: 'owner' | 'admin' | 'member'
): Promise<HouseholdMemberRow> {
  const { data, error } = role === 'owner'
    ? await supabase.rpc('transfer_household_ownership', { p_member_id: memberId })
    : await supabase.rpc('set_household_member_role', { p_member_id: memberId, p_role: role })

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
