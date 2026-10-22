import { Outlet } from 'react-router-dom'
import { BrandMark } from './BrandMark'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-8 md:pt-16">
        <BrandMark />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 pt-8 md:pt-4">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
