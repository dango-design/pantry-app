import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/services/supabase'
import { useDemoStore, DEMO_USER } from '@/stores/demoStore'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface DemoUser {
  id: string
  email: string
  user_metadata: {
    display_name: string
  }
}

type AuthUser = SupabaseUser | DemoUser

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  isDemoMode: boolean
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInDemo: () => void
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const { isDemoMode, enableDemoMode, disableDemoMode } = useDemoStore()

  useEffect(() => {
    // Check if we're in demo mode first
    if (isDemoMode) {
      setUser({
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        user_metadata: {
          display_name: DEMO_USER.displayName,
        },
      })
      setLoading(false)
      return
    }

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [isDemoMode])

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    })
    return { error: error as Error | null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  const signInDemo = () => {
    enableDemoMode()
    setUser({
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      user_metadata: {
        display_name: DEMO_USER.displayName,
      },
    })
  }

  const signOut = async () => {
    if (isDemoMode) {
      disableDemoMode()
      setUser(null)
      return
    }
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error as Error | null }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isDemoMode,
        signUp,
        signIn,
        signInDemo,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
