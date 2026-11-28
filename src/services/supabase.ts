import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// The publishable key (sb_publishable_...). It is safe to ship in the browser:
// it only reaches what row-level security allows. Supabase is retiring the
// legacy anon key in early 2027, so do not use it here.
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Check if we're in demo mode (no Supabase credentials)
export const isDemoMode = !supabaseUrl || !supabaseKey

if (isDemoMode) {
  console.warn(
    'Supabase credentials not found. Running in demo mode with local data.\n' +
    'To enable full functionality, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.'
  )
}

// The other app in this Supabase project owns the public schema, so all pantry
// tables and functions are in this one. Use this constant wherever a schema name
// is needed, including realtime subscriptions.
export const DB_SCHEMA = 'pantry'

export const supabase = createClient<Database, typeof DB_SCHEMA>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    db: { schema: DB_SCHEMA },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Re-export database types for convenience
export type { Database, Tables, InsertTables, UpdateTables } from '@/types/database'
