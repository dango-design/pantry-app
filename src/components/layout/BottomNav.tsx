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

function RecipeIcon({ filled = false, className }: { filled?: boolean; className?: string }) {
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
          <path d="M4 2h12a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" />
          <rect x="6" y="6" width="8" height="2" rx="0.5" fill="white" />
          <rect x="6" y="10" width="8" height="1.5" rx="0.5" fill="white" opacity="0.7" />
          <rect x="6" y="13" width="6" height="1.5" rx="0.5" fill="white" opacity="0.7" />
          <rect x="6" y="16" width="7" height="1.5" rx="0.5" fill="white" opacity="0.7" />
          <path d="M20 6v10a2 2 0 01-2 2" stroke="currentColor" strokeWidth="2" fill="none" />
        </>
      ) : (
        <>
          <path d="M4 3h12a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2z" />
          <line x1="6" y1="7" x2="14" y2="7" />
          <line x1="6" y1="11" x2="14" y2="11" />
          <line x1="6" y1="15" x2="12" y2="15" />
          <path d="M20 7v10a2 2 0 01-2 2" />
        </>
      )}
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
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {/* Pantry List */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors',
              isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
            )
          }
        >
          {({ isActive }) => (
            <>
              <ListIcon filled={isActive} className="h-6 w-6" />
              <span className="text-[10px] font-medium">Pantry</span>
            </>
          )}
        </NavLink>

        {/* Recipes */}
        <NavLink
          to="/recipes"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors',
              isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
            )
          }
        >
          {({ isActive }) => (
            <>
              <RecipeIcon filled={isActive} className="h-6 w-6" />
              <span className="text-[10px] font-medium">Recipes</span>
            </>
          )}
        </NavLink>

        {/* Add Button */}
        <button
          onClick={() => navigate('/add')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover active:scale-95 transition-all">
            <Plus className="h-6 w-6 text-white" />
          </div>
        </button>

        {/* Shopping Cart */}
        <NavLink
          to="/shopping"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors',
              isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
            )
          }
        >
          {({ isActive }) => (
            <>
              <CartIcon filled={isActive} className="h-6 w-6" />
              <span className="text-[10px] font-medium">Shopping</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  )
}
