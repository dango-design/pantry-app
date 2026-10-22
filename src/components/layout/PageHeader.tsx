import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/utils/cn'
import { pageContainer, type PageWidth } from './pageWidth'

interface PageHeaderProps {
  title: string
  /** Where the back arrow goes. Defaults to the previous page. */
  onBack?: () => void
  /** Hide the back arrow from tablet width up, for pages the side nav links to (Settings) */
  hideBackOnDesktop?: boolean
  /** Icon buttons on the right */
  actions?: ReactNode
  /** Matches the page body's width so the edges line up */
  width?: PageWidth
}

/** Sticky top bar for sub-pages (details, forms, settings): back arrow, title, actions */
export function PageHeader({ title, onBack, hideBackOnDesktop, actions, width = 'narrow' }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className={cn(pageContainer(width), 'flex items-center gap-2 h-14 md:h-16')}>
        <button
          onClick={onBack ?? (() => navigate(-1))}
          aria-label="Back"
          className={cn(
            'w-10 h-10 -ml-2 flex-shrink-0 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors',
            hideBackOnDesktop && 'md:hidden'
          )}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 min-w-0 truncate text-lg font-semibold text-gray-900 md:text-xl">{title}</h1>
        {actions && <div className="flex items-center -mr-2 flex-shrink-0">{actions}</div>}
      </div>
    </header>
  )
}
