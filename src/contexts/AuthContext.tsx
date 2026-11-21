import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase, isDemoMode as supabaseNotConfigured } from '@/services/supabase'
import { useDemoStore, DEMO_USER } from '@/stores/demoStore'
import { EXISTING_ACCOUNT_MESSAGE, isExistingAccount } from '@/utils/signUp'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

const SETUP_ERROR_MESSAGE = 'We couldn’t finish setting up your pantry. Check your connection and try again.'

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
  // True until the session is known and the user's pantry setup has finished
  loading: boolean
  // Set when the first-use setup call failed. Pages that need a household must not render.
  setupError: string | null
  retrySetup: () => void
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
  const [setupError, setSetupError] = useState<string | null>(null)

  const { isDemoMode, enableDemoMode, disableDemoMode } = useDemoStore()

  // The setup call for the most recent user id. Token refreshes and repeated
  // auth events for the same user reuse it, so the database is called once.
  const setupRef = useRef<{ userId: string; promise: Promise<void>; done: boolean } | null>(null)
  // Counts session updates, so a slow setup call for an older session is ignored
  const latestRequestRef = useRef(0)

  // Sign-up no longer creates pantry data in the database, because the other app
  // in this Supabase project shares the users table. This call creates the user's
  // profile, household and default shopping list if they are missing.
  const ensureUserSetup = useCallback((userId: string): Promise<void> => {
    if (supabaseNotConfigured) return Promise.resolve()
    if (setupRef.current?.userId === userId) return setupRef.current.promise

    const entry = {
      userId,
      done: false,
      promise: (async () => {
        const { error } = await supabase.rpc('ensure_user_setup')
        if (error) throw error
      })(),
    }
    setupRef.current = entry
    entry.promise.then(
      () => {
        entry.done = true
      },
      () => {
        // Forget a failed call so the next attempt runs it again
        if (setupRef.current === entry) setupRef.current = null
      }
    )
    return entry.promise
  }, [])

  // Runs the setup for the session's user, then makes the session visible to the app.
  // `loading` stays true until then, so no page can query the household too early.
  const applySession = useCallback(
    async (next: Session | null) => {
      const request = ++latestRequestRef.current

      if (!next) {
        setSession(null)
        setUser(null)
        setSetupError(null)
        setLoading(false)
        return
      }

      let failure: string | null = null
      try {
        await ensureUserSetup(next.user.id)
      } catch (err) {
        console.error('Error setting up user:', err)
        failure = SETUP_ERROR_MESSAGE
      }

      // A newer session update arrived while this one was waiting
      if (request !== latestRequestRef.current) return

      setSession(next)
      setUser(next.user)
      setSetupError(failure)
      setLoading(false)
    },
    [ensureUserSetup]
  )

  // Makes any setup call that is still running leave the auth state alone
  const ignorePendingSetup = useCallback(() => {
    latestRequestRef.current++
  }, [])

  const retrySetup = () => {
    if (!session) return
    setSetupError(null)
    setLoading(true)
    void applySession(session)
  }

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

    // False once this effect is cleaned up, so late results are dropped
    let active = true

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) void applySession(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Show the loading state right away for a user who is not set up yet.
      // Otherwise the login page's redirect could render a page before setup ends.
      const setup = setupRef.current
      if (session && !(setup?.userId === session.user.id && setup.done)) {
        setLoading(true)
      }
      // Supabase holds its auth lock while this callback runs, and the setup call
      // waits for that lock. Start it after the callback returns to avoid a deadlock.
      setTimeout(() => {
        if (active) void applySession(session)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
      ignorePendingSetup()
    }
  }, [isDemoMode, applySession, ignorePendingSetup])

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // The project's default Site URL belongs to the other app. Without this,
        // the confirmation link would send people there.
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
          // The shared email template uses this to pick the pantry wording
          app: 'pantry',
        },
      },
    })
    if (isExistingAccount(data, error)) {
      return { error: new Error(EXISTING_ACCOUNT_MESSAGE) }
    }
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
    // Sign out of this browser only. The default scope ends every session the
    // user has, which would also sign them out of the other app.
    await supabase.auth.signOut({ scope: 'local' })
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
        setupError,
        retrySetup,
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
