import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Copy,
  RefreshCw,
  UserPlus,
  Crown,
  Shield,
  User,
  Trash2,
  LogOut,
  Check,
} from 'lucide-react'
import { Card, CardContent, Button, Input } from '@/components/common'
import { PageHeader, pageContainer } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCurrentHousehold,
  getHouseholdMembers,
  updateHousehold,
  regenerateInviteCode,
  joinHouseholdByInvite,
  leaveHousehold,
  removeHouseholdMember,
  type HouseholdRow,
  type HouseholdMemberWithProfile,
} from '@/services'
import { cn } from '@/utils/cn'

type View = 'main' | 'join'

// Supabase errors aren't always Error instances, so read `message` off any object
function getErrorMessage(err: unknown, fallback: string): string {
  const message = typeof err === 'object' && err !== null && 'message' in err ? err.message : undefined
  return typeof message === 'string' && message ? message : fallback
}

export function HouseholdPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [view, setView] = useState<View>('main')
  const [household, setHousehold] = useState<HouseholdRow | null>(null)
  const [members, setMembers] = useState<HouseholdMemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [editing, setEditing] = useState(false)
  const [householdName, setHouseholdName] = useState('')

  useEffect(() => {
    loadHouseholdData()
  }, [])

  async function loadHouseholdData() {
    try {
      setLoading(true)
      setError(null)
      const h = await getCurrentHousehold()
      setHousehold(h)
      setHouseholdName(h?.name || '')
      if (h) {
        const m = await getHouseholdMembers(h.id)
        setMembers(m)
      }
    } catch (err) {
      setError('Failed to load household data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyInviteCode() {
    if (!household?.invite_code) return
    await navigator.clipboard.writeText(household.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerateCode() {
    if (!household) return
    try {
      const newCode = await regenerateInviteCode(household.id)
      setHousehold({ ...household, invite_code: newCode })
    } catch {
      setError('Failed to regenerate code')
    }
  }

  async function handleSaveName() {
    if (!household || !householdName.trim()) return
    try {
      await updateHousehold(household.id, { name: householdName.trim() })
      setHousehold({ ...household, name: householdName.trim() })
      setEditing(false)
    } catch {
      setError('Failed to update household name')
    }
  }

  async function handleJoinHousehold() {
    if (!inviteCode.trim()) return
    try {
      setJoining(true)
      setError(null)
      await joinHouseholdByInvite(inviteCode)
      await loadHouseholdData()
      setView('main')
      setInviteCode('')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to join household'))
    } finally {
      setJoining(false)
    }
  }

  async function handleLeaveHousehold() {
    if (!confirm('Are you sure you want to leave this household? You will be moved to a new personal household.')) {
      return
    }
    try {
      await leaveHousehold()
      await loadHouseholdData()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to leave household'))
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Are you sure you want to remove ${memberName} from the household?`)) {
      return
    }
    try {
      await removeHouseholdMember(memberId)
      setMembers(members.filter(m => m.id !== memberId))
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove member'))
    }
  }

  const isOwner = household?.owner_id === user?.id

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner':
        return Crown
      case 'admin':
        return Shield
      default:
        return User
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Household" onBack={() => navigate('/settings')} />
        <div className="flex items-center justify-center p-8">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  if (view === 'join') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Join household" onBack={() => setView('main')} />

        <div className={cn(pageContainer('narrow'), 'py-4 space-y-4 md:py-6')}>
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Enter the invite code shared by a household member to join their household.
              </p>
              <Input
                label="Invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABC12345"
                maxLength={8}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                onClick={handleJoinHousehold}
                disabled={joining || !inviteCode.trim()}
                className="w-full"
              >
                {joining ? 'Joining...' : 'Join household'}
              </Button>
            </CardContent>
          </Card>

          <p className="text-sm text-gray-500 text-center">
            Note: Joining a new household will move you out of your current household.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Household" onBack={() => navigate('/settings')} />

      <div className={cn(pageContainer('narrow'), 'py-4 space-y-4 md:py-6')}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Household name */}
        <Card>
          <CardContent className="p-4">
            {editing ? (
              <div className="flex gap-2">
                <Input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveName} size="sm">Save</Button>
                <Button
                  onClick={() => {
                    setEditing(false)
                    setHouseholdName(household?.name || '')
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Household name</p>
                  <p className="font-medium text-lg">{household?.name}</p>
                </div>
                {isOwner && (
                  <Button onClick={() => setEditing(true)} variant="secondary" size="sm">
                    Edit
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite code */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Invite code</p>
                <p className="font-mono text-xl font-semibold tracking-wider">
                  {household?.invite_code}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyInviteCode}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                {isOwner && (
                  <Button
                    onClick={handleRegenerateCode}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Share this code with family members to let them join your household.
            </p>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Members ({members.length})</h2>
            </div>
            <div className="space-y-2">
              {members.map((member) => {
                const RoleIcon = getRoleIcon(member.role)
                const isCurrentUser = member.user_id === user?.id
                return (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg',
                      isCurrentUser ? 'bg-blue-50' : 'bg-gray-50'
                    )}
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.profile?.display_name || 'User'}
                        {isCurrentUser && (
                          <span className="text-gray-500 font-normal"> (you)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <RoleIcon className="h-3 w-3" />
                        <span className="capitalize">{member.role}</span>
                      </div>
                    </div>
                    {isOwner && !isCurrentUser && (
                      <Button
                        onClick={() =>
                          handleRemoveMember(
                            member.id,
                            member.profile?.display_name || 'this member'
                          )
                        }
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-2">
            <button
              onClick={() => setView('join')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Join another household</p>
                <p className="text-sm text-gray-500">
                  Use an invite code to join a different household
                </p>
              </div>
            </button>
            {members.length > 1 && (
              <button
                onClick={handleLeaveHousehold}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-red-600"
              >
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Leave household</p>
                  <p className="text-sm text-red-400">
                    Create a new personal household
                  </p>
                </div>
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
