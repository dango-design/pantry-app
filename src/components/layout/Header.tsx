import { Menu, Search, Plus } from 'lucide-react'
import { Button } from '@/components/common'
import { cn } from '@/utils/cn'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  showAdd?: boolean
  onSearchClick?: () => void
  onAddClick?: () => void
  onMenuClick?: () => void
  className?: string
}

export function Header({
  title = 'Pantry',
  showSearch = true,
  showAdd = true,
  onSearchClick,
  onAddClick,
  onMenuClick,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-white border-b border-gray-200',
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="p-2" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {showSearch && (
            <Button variant="ghost" size="sm" className="p-2" onClick={onSearchClick}>
              <Search className="h-5 w-5" />
            </Button>
          )}
          {showAdd && (
            <Button variant="ghost" size="sm" className="p-2" onClick={onAddClick}>
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
