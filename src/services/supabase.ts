import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if we're in demo mode (no Supabase credentials)
export const isDemoMode = !supabaseUrl || !supabaseAnonKey

if (isDemoMode) {
  console.warn(
    'Supabase credentials not found. Running in demo mode with local data.\n' +
    'To enable full functionality, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Re-export database types for convenience
export type { Database, Tables, InsertTables, UpdateTables } from '@/types/database'
