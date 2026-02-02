import { Outlet } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 py-8">
        <ShoppingBag className="h-8 w-8 text-green-600" />
        <span className="text-2xl font-bold text-gray-900">Pantry</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 pt-8">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
