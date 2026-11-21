// Checks that a request comes from a signed-in person, not only from someone
// who holds the project's public anon key.
//
// The platform's verify_jwt check accepts any token the project signed, and
// the anon key is one of those. The anon key is in the public web code of
// every app in this Supabase project, so that check alone would let anyone
// call these functions and spend OpenAI credit.
//
// This asks the Auth server who the token belongs to. The anon key has no
// user, so the Auth server refuses it. Asking the Auth server works whether
// the project signs tokens with the legacy JWT secret or the newer signing
// keys.
//
// Returns null when the caller is a signed-in, non-anonymous user, and a 401
// response otherwise.
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const authorization = req.headers.get('Authorization') ?? ''
  const apikey = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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

function unauthorized(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ success: false, error: 'Sign in to use this feature' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
