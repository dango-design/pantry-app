import type { ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'
import { BrandMark } from './BrandMark'
import { CART_TARGET_ATTR, NAV_ITEMS, isNavItemActive } from './navItems'

interface SideNavLinkProps {
  to: string
  label: string
  Icon: ComponentType<{ className?: string }>
  active: boolean
}

// Tablet: an icon rail with the label under each icon, the active one on a soft pill.
// Desktop: a sidebar row with the label beside the icon, the whole row on the pill.
function SideNavLink({ to, label, Icon, active }: SideNavLinkProps) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex flex-col items-center gap-1 py-1.5 rounded-xl text-xs font-medium transition-colors',
        'lg:flex-row lg:gap-3 lg:px-3 lg:py-2 lg:text-sm',
        active ? 'text-primary lg:bg-primary-soft' : 'text-gray-500 hover:text-gray-900 lg:hover:bg-gray-50'
      )}
    >
      <span
        {...(to === '/shopping' ? { [CART_TARGET_ATTR]: '' } : {})}
        className={cn(
          'w-14 h-8 flex items-center justify-center rounded-full transition-colors lg:w-6 lg:h-6',
          active ? 'bg-primary-soft lg:bg-transparent' : 'group-hover:bg-gray-100 lg:group-hover:bg-transparent'
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      {label}
    </Link>
  )
}

interface SideNavProps {
  addOpen: boolean
  onAddClick: () => void
}

/**
 * Main navigation from tablet width up: a rail (md) that widens into a labeled
 * sidebar (lg). Its width is --side-nav-width, which the page content and fixed
 * bars inset by.
 */
export function SideNav({ addOpen, onAddClick }: SideNavProps) {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Main"
      className={cn(
        'hidden md:flex fixed inset-y-0 left-0 w-[var(--side-nav-width)] pl-[env(safe-area-inset-left)] flex-col bg-white border-r border-gray-200',
        // Above the Add popover's backdrop while it's open, so the + (now ×) closes it
        addOpen ? 'z-[52]' : 'z-40'
      )}
    >
      <Link to="/" aria-label="Pantry home" className="h-16 flex-shrink-0 flex items-center justify-center lg:justify-start lg:px-5">
        <BrandMark showName="lg" />
      </Link>

      <div className="px-3 pb-5 lg:px-4">
        <button
          onClick={onAddClick}
          aria-label={addOpen ? 'Close add menu' : 'Add'}
          aria-expanded={addOpen}
          aria-haspopup="dialog"
          className="mx-auto w-12 h-12 flex items-center justify-center gap-2 rounded-2xl bg-primary text-white shadow-sm hover:bg-primary-hover active:scale-95 transition-all lg:w-full lg:h-11 lg:rounded-xl lg:justify-start lg:px-4 lg:active:scale-[0.98]"
        >
          <Plus className={cn('h-6 w-6 lg:h-5 lg:w-5 transition-transform duration-200', addOpen && 'rotate-45')} />
          <span className="hidden lg:inline font-medium">Add</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-2 px-2 lg:gap-1 lg:px-3">
        {NAV_ITEMS.map((item) => (
          <SideNavLink key={item.to} to={item.to} label={item.label} Icon={item.Icon} active={isNavItemActive(item, pathname)} />
        ))}
      </div>

      <div className="px-2 pb-4 lg:px-3">
        <SideNavLink to="/settings" label="Settings" Icon={Settings} active={isNavItemActive({ to: '/settings' }, pathname)} />
      </div>
    </nav>
  )
}
