import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Spinner } from '@/components/common'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, setupError, retrySetup, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // The user's household could not be created or checked. Every page behind this
  // route needs a household, so show the error here and offer a retry.
  if (setupError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center" role="alert">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-6">{setupError}</p>
          <div className="space-y-2">
            <Button className="w-full" onClick={retrySetup}>
              Try again
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
