import { NavLink, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/utils/cn'

// Custom icons with filled variants
function ListIcon({ filled = false, className }: { filled?: boolean; className?: string }) {
  return filled ? (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
    </svg>
  ) : (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

function CartIcon({ filled = false, className }: { filled?: boolean; className?: string }) {
  // Same icon shape for both states - filled version just has fill instead of stroke
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? '0' : '2'}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {filled ? (
        <>
          {/* Filled cart body */}
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" fill="currentColor" />
          {/* Filled wheels */}
          <circle cx="9" cy="21" r="1.5" fill="currentColor" />
          <circle cx="20" cy="21" r="1.5" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
        </>
      )}
    </svg>
  )
}

export function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-bottom">
      <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto">
        {/* Pantry List */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center w-20 h-full gap-0.5 transition-colors',
              isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
            )
          }
        >
          {({ isActive }) => <ListIcon filled={isActive} className="h-6 w-6" />}
        </NavLink>

        {/* Center Add Button */}
        <button
          onClick={() => navigate('/add')}
          className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 active:scale-95 transition-all"
        >
          <Plus className="h-7 w-7 text-white" />
        </button>

        {/* Spacer for center button */}
        <div className="w-20" />

        {/* Shopping Cart */}
        <NavLink
          to="/shopping"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center w-20 h-full gap-0.5 transition-colors',
              isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
            )
          }
        >
          {({ isActive }) => <CartIcon filled={isActive} className="h-6 w-6" />}
        </NavLink>
      </div>
    </nav>
  )
}
