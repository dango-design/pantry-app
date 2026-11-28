// Shown when someone signs up with an email that already has an account.
// Sign-in is shared with DoDone, so the account may have been created there.
export const EXISTING_ACCOUNT_MESSAGE =
  'This email already has an account. It may be from DoDone, which uses the same sign-in. Sign in instead.'

interface SignUpData {
  user: { identities?: unknown[] | null } | null
}

interface SignUpError {
  message: string
  code?: string
}

/**
 * Says whether a sign-up response means the email already has an account.
 * Supabase reports this in two ways:
 * - an error such as "User already registered"
 * - when email confirmation is on, a success response whose user has an empty
 *   identities array (Supabase hides the error so emails can't be probed)
 */
export function isExistingAccount(data: SignUpData | null, error: SignUpError | null): boolean {
  if (error) {
    return (
      error.code === 'user_already_exists' ||
      error.code === 'email_exists' ||
      /already (been )?registered|already exists/i.test(error.message)
    )
  }

  const identities = data?.user?.identities
  return Array.isArray(identities) && identities.length === 0
}
