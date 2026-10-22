import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Settings } from 'lucide-react'
import { pageContainer, type PageWidth } from './pageWidth'

interface TabHeaderProps {
  /** Page name. On phones it's for screen readers only (the bottom nav says where you are); wider screens show it. */
  title: string
  /** The tab's main tool (search, week switcher), 40px tall to line up with the settings button */
  tool: ReactNode
  /** Extra rows under the tool, like filter chips */
  children?: ReactNode
  /** Matches the page body's width so the edges line up */
  width?: PageWidth
}

/**
 * The sticky top of every main tab.
 * Phones: the tab's tool with the settings button beside it, then optional rows such as filters.
 * Wider screens: the page title with the tool on the right (settings lives in the side nav).
 */
export function TabHeader({ title, tool, children, width = 'wide' }: TabHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-white pt-4 pb-3 md:pt-6 md:pb-4 md:border-b md:border-gray-200">
      <div className={pageContainer(width)}>
        {/* Top-aligned so a note under the tool (e.g. the shopping add field) doesn't move the button */}
        <div className="flex items-start gap-3 md:items-center md:gap-6">
          <h1 className="sr-only md:not-sr-only md:flex-shrink-0 md:text-2xl md:font-semibold md:text-gray-900">{title}</h1>
          <div className="flex-1 min-w-0 md:flex-none md:w-80 md:ml-auto">{tool}</div>
          <button
            onClick={() => navigate('/settings')}
            aria-label="Settings"
            className="md:hidden w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="mt-3 md:mt-4">{children}</div>}
      </div>
    </header>
  )
}

interface TabSearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

/** Search field for a tab header's tool row. With a keyboard, "/" jumps to it. */
export function TabSearchField({ value, onChange, placeholder }: TabSearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      // Not while a dialog or sheet is open over the page
      if (document.querySelector('[aria-modal="true"]')) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        aria-keyshortcuts="/"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
        // 16px on phones so iOS doesn't zoom in on focus
        className="peer w-full h-10 pl-10 pr-4 can-hover:pr-10 bg-white border border-gray-200 rounded-lg text-base md:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
      />
      {/* Shortcut hint for keyboard users, hidden once there's text or focus */}
      {!value && (
        <kbd
          aria-hidden="true"
          className="hidden can-hover:flex peer-focus:!hidden absolute right-2.5 top-1/2 -translate-y-1/2 h-5 min-w-5 px-1.5 items-center justify-center rounded border border-gray-200 bg-gray-50 font-sans text-xs text-gray-400"
        >
          /
        </kbd>
      )}
    </div>
  )
}
