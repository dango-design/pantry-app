import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Settings } from 'lucide-react'

interface TabHeaderProps {
  /** Page name for screen readers. It isn't shown: the bottom nav already says where you are. */
  title: string
  /** The tab's main tool (search, week switcher, add field), 40px tall to line up with the settings button */
  tool: ReactNode
  /** Extra rows under the tool, like filter chips */
  children?: ReactNode
}

/**
 * The sticky top of every main tab: the tab's tool with the settings button
 * beside it, then optional rows such as filters.
 */
export function TabHeader({ title, tool, children }: TabHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-white px-4 pt-4 pb-3">
      <h1 className="sr-only">{title}</h1>
      {/* Top-aligned so a note under the tool (e.g. the shopping add field) doesn't move the button */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">{tool}</div>
        <button
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </header>
  )
}

interface TabSearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

/** Search field for a tab header's tool row */
export function TabSearchField({ value, onChange, placeholder }: TabSearchFieldProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
      />
    </div>
  )
}
