import { useNavigate } from 'react-router-dom'
import {
  User,
  Users,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/common'
import { usePantryView, type Density } from '@/components/inventory'
import { PageHeader, pageContainer } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

interface SettingItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  onClick?: () => void
  danger?: boolean
}

function SettingItem({ icon: Icon, label, description, onClick, danger }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-gray-50',
        danger && 'text-red-600 hover:bg-red-50'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          danger ? 'bg-red-100' : 'bg-gray-100'
        )}
      >
        <Icon className={cn('h-5 w-5', danger ? 'text-red-600' : 'text-gray-600')} />
      </div>
      <div className="flex-1">
        <p className={cn('font-medium', danger ? 'text-red-600' : 'text-gray-900')}>
          {label}
        </p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <ChevronRight className={cn('h-5 w-5', danger ? 'text-red-400' : 'text-gray-400')} />
    </button>
  )
}

const DENSITY_CHOICES: { key: Density; label: string; description: string }[] = [
  { key: 'compact', label: 'Compact', description: 'One line per item' },
  { key: 'comfortable', label: 'Comfortable', description: 'Large cards with pictures' },
]

/** How the Pantry tab draws each item. Saved on this device only. */
function PantryDensitySetting() {
  const { density, setDensity } = usePantryView()
  return (
    <div className="p-3">
      <p id="pantry-density-label" className="font-medium text-gray-900">Pantry list</p>
      <p className="text-sm text-gray-500">How items show on the Pantry tab, on this device</p>
      <div role="radiogroup" aria-labelledby="pantry-density-label" className="mt-3 grid grid-cols-2 gap-2">
        {DENSITY_CHOICES.map((choice) => (
          <button
            key={choice.key}
            type="button"
            role="radio"
            aria-checked={density === choice.key}
            onClick={() => setDensity(choice.key)}
            className={cn(
              'rounded-lg border px-3 py-2 text-left transition-colors',
              density === choice.key ? 'border-primary bg-primary-soft' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <span className="block text-sm font-medium text-gray-900">{choice.label}</span>
            <span className="block text-xs text-gray-500">{choice.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      {/* The side nav links here on wider screens, so only phones need the way back */}
      <PageHeader title="Settings" hideBackOnDesktop />

      <div className={cn(pageContainer('narrow'), 'py-4 space-y-4 md:py-6')}>
        {/* Profile Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {user?.user_metadata?.display_name || 'User'}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardContent className="p-2">
            <SettingItem
              icon={User}
              label="Profile"
              description="Edit your profile information"
            />
            <SettingItem
              icon={Users}
              label="Household"
              description="Manage household members"
              onClick={() => navigate('/settings/household')}
            />
            <SettingItem
              icon={ShieldCheck}
              label="Allergies"
              description="People and their food allergies"
              onClick={() => navigate('/settings/allergies')}
            />
            <SettingItem
              icon={Bell}
              label="Notifications"
              description="Configure alerts and reminders"
            />
            <SettingItem
              icon={Shield}
              label="Privacy"
              description="Data and privacy settings"
            />
          </CardContent>
        </Card>

        {/* Display */}
        <Card>
          <CardContent className="p-2">
            <PantryDensitySetting />
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardContent className="p-2">
            <SettingItem
              icon={HelpCircle}
              label="Help & support"
              description="FAQs and contact support"
            />
          </CardContent>
        </Card>

        {/* Sign out */}
        <Card>
          <CardContent className="p-2">
            <SettingItem
              icon={LogOut}
              label="Sign out"
              onClick={handleSignOut}
              danger
            />
          </CardContent>
        </Card>

        {/* Version */}
        <p className="text-center text-sm text-gray-400">
          Pantry v0.1.0
        </p>
      </div>
    </div>
  )
}
