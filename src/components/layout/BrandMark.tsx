import { PantryIcon } from '@/components/icons'
import { cn } from '@/utils/cn'

interface BrandMarkProps {
  /** Show "Pantry" beside the mark. Hidden in the narrow nav rail. */
  showName?: boolean | 'lg'
  className?: string
}

// Soft tile rather than a filled one, so the Add button stays the one solid shape in the nav
export function BrandMark({ showName = true, className }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="w-9 h-9 rounded-xl bg-primary-soft border border-primary-muted text-primary flex items-center justify-center flex-shrink-0">
        <PantryIcon size={20} />
      </span>
      {showName && (
        <span className={cn('text-lg font-semibold text-gray-900', showName === 'lg' && 'hidden lg:inline')}>
          Pantry
        </span>
      )}
    </span>
  )
}
