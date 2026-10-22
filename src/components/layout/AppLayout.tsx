import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { AddSheet } from './AddSheet'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'

interface AppLayoutProps {
  /**
   * Show the bottom nav on phones. The main tabs have it; sub-pages (details,
   * forms, settings) leave it out for their own back button and action bars.
   * From tablet width up every page gets the side nav instead.
   */
  bottomNav?: boolean
}

export function AppLayout({ bottomNav = false }: AppLayoutProps) {
  const { pathname } = useLocation()
  const [addOpen, setAddOpen] = useState(false)
  const toggleAdd = useCallback(() => setAddOpen((open) => !open), [])
  const closeAdd = useCallback(() => setAddOpen(false), [])

  // Going to another page while the Add menu is open closes it
  useEffect(() => {
    setAddOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-gray-50">
      <SideNav addOpen={addOpen} onAddClick={toggleAdd} />

      <main
        className={cn(
          'pl-[var(--side-nav-width)] pr-[env(safe-area-inset-right)]',
          bottomNav && 'pb-bottom-nav md:pb-0'
        )}
      >
        <Outlet />
      </main>

      {bottomNav && <BottomNav addOpen={addOpen} onAddClick={toggleAdd} />}
      <AddSheet open={addOpen} onClose={closeAdd} />
    </div>
  )
}
