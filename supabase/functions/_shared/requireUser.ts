// Checks that a request comes from a signed-in person, not only from someone
// who holds one of the project's public keys.
//
// The platform's verify_jwt check is not enough. It accepts the legacy anon
// key, and it also accepts the publishable key (sb_publishable_...) on either
// header. Both keys are in the public web code of every app in this Supabase
// project, so that check alone would let anyone call these functions and
// spend OpenAI credit.
//
// This asks the Auth server who the bearer token belongs to. Neither public
// key has a user, so the Auth server refuses both. Asking the Auth server
// works whether the project signs tokens with the legacy JWT secret or the
// newer signing keys.
//
// Returns null when the caller is a signed-in, non-anonymous user, and a 401
// response otherwise.
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const authorization = req.headers.get('Authorization') ?? ''
  const apikey = req.headers.get('apikey') ?? publishableKey()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')

  if (!supabaseUrl || !authorization.startsWith('Bearer ')) {
    return unauthorized(corsHeaders)
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey },
  })
  if (!response.ok) {
    return unauthorized(corsHeaders)
  }

  const user = await response.json()
  if (!user?.id || user.is_anonymous) {
    return unauthorized(corsHeaders)
  }

  return null
}

// The key to send to the Auth server when the request has no apikey header.
// supabase-js always sends one, so this is only a fallback. Hosted projects
// provide SUPABASE_PUBLISHABLE_KEYS, a JSON object of keys by name; the local
// CLI provides SUPABASE_PUBLISHABLE_KEY. SUPABASE_ANON_KEY is the legacy key,
// which Supabase is retiring in early 2027, so it is the last resort.
function publishableKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}')
    if (typeof keys.default === 'string') return keys.default
  } catch {
    // Not set or not JSON: try the next source
  }
  return Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
}

function unauthorized(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ success: false, error: 'Sign in to use this feature' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
