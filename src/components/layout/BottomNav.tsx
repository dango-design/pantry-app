import type { ComponentType } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PantryIcon } from '@/components/icons'
import { cn } from '@/utils/cn'

// Outline tab icons. The active tab is marked by color and an underline, not a filled icon,
// so the filled add button stays the one solid shape in the bar.
// The Pantry tab reuses the pantry location icon shown on item cards.
function RecipeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3h12a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2z" />
      <line x1="6" y1="7" x2="14" y2="7" />
      <line x1="6" y1="11" x2="14" y2="11" />
      <line x1="6" y1="15" x2="12" y2="15" />
      <path d="M20 7v10a2 2 0 01-2 2" />
    </svg>
  )
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  )
}

interface TabLinkProps {
  to: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

function TabLink({ to, label, Icon }: TabLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
          isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-6 w-6" />
          <span className="relative text-[10px] font-medium">
            {label}
            <span
              aria-hidden="true"
              className={cn(
                'absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-primary transition-opacity',
                isActive ? 'opacity-100' : 'opacity-0'
              )}
            />
          </span>
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        <TabLink to="/" label="Pantry" Icon={PantryIcon} />
        <TabLink to="/recipes" label="Recipes" Icon={RecipeIcon} />

        {/* Add Button */}
        <button
          onClick={() => navigate('/add')}
          aria-label="Add item"
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover active:scale-95 transition-all">
            <Plus className="h-6 w-6 text-white" />
          </div>
        </button>

        <TabLink to="/plan" label="Plan" Icon={PlanIcon} />
        <TabLink to="/shopping" label="Shopping" Icon={CartIcon} />
      </div>
    </nav>
  )
}
