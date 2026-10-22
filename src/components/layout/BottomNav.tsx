import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CART_TARGET_ATTR, NAV_ITEMS, type NavItem } from './navItems'

// Outline tab icons. The active tab is marked by color and an underline, not a filled icon,
// so the filled add button stays the one solid shape in the bar.
function TabLink({ to, label, Icon }: NavItem) {
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
          <span {...(to === '/shopping' ? { [CART_TARGET_ATTR]: '' } : {})} className="flex">
            <Icon className="h-6 w-6" />
          </span>
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

interface BottomNavProps {
  addOpen: boolean
  onAddClick: () => void
}

/** Main navigation on phones. From tablet width up, the side nav takes over. */
export function BottomNav({ addOpen, onAddClick }: BottomNavProps) {
  const [pantry, recipes, plan, shopping] = NAV_ITEMS

  return (
    // Above the Add sheet's backdrop while it's open, so the + (now ×) closes it
    <nav
      aria-label="Main"
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom',
        addOpen ? 'z-[52]' : 'z-40'
      )}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        <TabLink {...pantry} />
        <TabLink {...recipes} />

        {/* Add button: opens the Add sheet */}
        <button
          onClick={onAddClick}
          aria-label={addOpen ? 'Close add menu' : 'Add'}
          aria-expanded={addOpen}
          aria-haspopup="dialog"
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover active:scale-95 transition-all">
            <Plus className={cn('h-6 w-6 text-white transition-transform duration-200', addOpen && 'rotate-45')} />
          </div>
        </button>

        <TabLink {...plan} />
        <TabLink {...shopping} />
      </div>
    </nav>
  )
}
