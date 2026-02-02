import { useNavigate } from 'react-router-dom'
import {
  User,
  Users,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/common'
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

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      {/* Custom header with back button */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
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

        {/* Support */}
        <Card>
          <CardContent className="p-2">
            <SettingItem
              icon={HelpCircle}
              label="Help & Support"
              description="FAQs and contact support"
            />
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="p-2">
            <SettingItem
              icon={LogOut}
              label="Sign Out"
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
