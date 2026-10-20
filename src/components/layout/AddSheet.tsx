import { Fragment, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Barcode, BookOpen, CalendarPlus, Camera, ChevronRight, Link, Pencil, Receipt, ShoppingCart } from 'lucide-react'
import { PantryIcon } from '@/components/icons'
import { QuickAddToList } from '@/components/shopping'
import { useDemoStore } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { CATEGORY_TONES } from '@/utils/constants'
import { formatMealTime, getNextOpenSlot } from '@/utils/mealPlan'

type AddOption = 'pantry' | 'shopping' | 'plan' | 'recipe'

const DEFAULT_ORDER: AddOption[] = ['pantry', 'shopping', 'plan', 'recipe']

// The tab you're on puts its own option first; the rest keep their order
const TAB_OPTIONS: Record<string, AddOption> = {
  '/': 'pantry',
  '/recipes': 'recipe',
  '/plan': 'plan',
  '/shopping': 'shopping',
}

// Icon tiles borrow category tones so they sit in the same palette as the item cards
const TONES: Record<AddOption, { tint: string; ink: string }> = {
  pantry: CATEGORY_TONES.produce,
  shopping: CATEGORY_TONES.condiments,
  plan: CATEGORY_TONES.dairy,
  recipe: CATEGORY_TONES.pantry,
}

type IconComponent = ComponentType<{ className?: string }>

// The MUI shelf icon sizes itself by fontSize, so pin it to the Lucide icons' 20px
function PantryOptionIcon({ className }: { className?: string }) {
  return <PantryIcon className={className} size={20} />
}

interface OptionRowProps {
  option: AddOption
  icon: IconComponent
  title: string
  subtitle?: string
  /** Makes the heading a button that goes to the full add screen */
  onClick?: () => void
  children?: ReactNode
}

function OptionRow({ option, icon: Icon, title, subtitle, onClick, children }: OptionRowProps) {
  const tone = TONES[option]
  const heading = (
    <>
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: tone.tint, color: tone.ink }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block font-medium text-gray-900">{title}</span>
        {subtitle && <span className="block text-sm text-gray-500">{subtitle}</span>}
      </span>
      {onClick && <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />}
    </>
  )

  return (
    <div className="py-3 border-t border-gray-100 first:border-t-0">
      {onClick ? (
        <button onClick={onClick} className="w-full flex items-center gap-3 -mx-1 px-1 py-0.5 rounded-lg hover:bg-gray-50 transition-colors">
          {heading}
        </button>
      ) : (
        <div className="flex items-center gap-3">{heading}</div>
      )}
      {/* Shortcuts line up with the title, past the icon tile */}
      {children && <div className="mt-2 pl-[3.25rem]">{children}</div>}
    </div>
  )
}

function Chip({ icon: Icon, label, onClick }: { icon: IconComponent; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary-muted bg-primary-soft text-sm text-primary hover:bg-primary-muted transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

interface AddSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * What the + in the bottom nav opens: add a pantry item (or jump into a scanner),
 * type a shopping list item in place, plan a meal in the next open slot, or
 * start a recipe. It sits just above the nav so the + can turn into a close button.
 */
export function AddSheet({ open, onClose }: AddSheetProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mealPlan = useDemoStore((state) => state.mealPlan)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsVisible(false)
      return
    }
    requestAnimationFrame(() => setIsVisible(true))

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const currentOption = TAB_OPTIONS[pathname]
  const order = currentOption ? [currentOption, ...DEFAULT_ORDER.filter((o) => o !== currentOption)] : DEFAULT_ORDER
  const nextSlot = getNextOpenSlot(mealPlan)

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  const rows: Record<AddOption, ReactNode> = {
    pantry: (
      <OptionRow option="pantry" icon={PantryOptionIcon} title="Pantry item" subtitle="Type it in or scan it" onClick={() => go('/add')}>
        <div className="flex flex-wrap gap-2">
          <Chip icon={Barcode} label="Barcode" onClick={() => go('/add?mode=barcode')} />
          <Chip icon={Camera} label="Photo" onClick={() => go('/add?mode=photo')} />
          <Chip icon={Receipt} label="Receipt" onClick={() => go('/add?mode=receipt')} />
        </div>
      </OptionRow>
    ),
    shopping: (
      <OptionRow option="shopping" icon={ShoppingCart} title="Shopping list">
        <QuickAddToList autoFocus={currentOption === 'shopping'} confirmAdds />
      </OptionRow>
    ),
    plan: (
      <OptionRow
        option="plan"
        icon={CalendarPlus}
        title="Meal to the plan"
        subtitle={`Next open: ${formatMealTime(nextSlot.date, nextSlot.slot)}`}
        onClick={() => go(`/plan?add=${nextSlot.date}&slot=${nextSlot.slot}`)}
      />
    ),
    recipe: (
      <OptionRow option="recipe" icon={BookOpen} title="Recipe">
        <div className="flex flex-wrap gap-2">
          <Chip icon={Pencil} label="Write one" onClick={() => go('/recipe/new')} />
          <Chip icon={Link} label="Import from link" onClick={() => go('/recipe/new?import=1')} />
        </div>
      </OptionRow>
    ),
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 transition-opacity duration-200',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add"
        className={cn(
          'fixed left-0 right-0 z-[51] max-w-lg mx-auto max-h-[75vh] overflow-y-auto bg-white rounded-t-2xl shadow-lg transition-transform duration-200 ease-out',
          isVisible ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="px-4 pb-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Add</h2>
          {order.map((option) => (
            <Fragment key={option}>{rows[option]}</Fragment>
          ))}
        </div>
      </div>
    </>
  )
}
