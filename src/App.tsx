import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth'
import { AppLayout, AuthLayout } from '@/components/layout'
import { FlyToCartProvider } from '@/components/common'
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  InventoryPage,
  AddItemPage,
  ItemDetailPage,
  ShoppingListPage,
  RecipesPage,
  RecipeDetailPage,
  RecipeFormPage,
  PlanPage,
  SettingsPage,
  HouseholdPage,
} from '@/pages'

// Redirect authenticated users away from auth pages
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Simple layout without bottom nav for modal-like pages
function SimpleLayout() {
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route
        element={
          <AuthRoute>
            <AuthLayout />
          </AuthRoute>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Protected app routes with bottom nav */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<InventoryPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/shopping" element={<ShoppingListPage />} />
      </Route>

      {/* Protected routes without bottom nav */}
      <Route
        element={
          <ProtectedRoute>
            <SimpleLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/add" element={<AddItemPage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
        <Route path="/recipe/new" element={<RecipeFormPage />} />
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        <Route path="/recipe/:id/edit" element={<RecipeFormPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/household" element={<HouseholdPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <FlyToCartProvider>
        <AppRoutes />
      </FlyToCartProvider>
    </AuthProvider>
  )
}
