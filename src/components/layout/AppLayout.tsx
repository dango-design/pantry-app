import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content area */}
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
