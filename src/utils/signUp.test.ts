import { describe, expect, it } from 'vitest'
import { isExistingAccount } from './signUp'

describe('isExistingAccount', () => {
  it('detects the "User already registered" error', () => {
    expect(isExistingAccount({ user: null }, { message: 'User already registered' })).toBe(true)
  })

  it('detects the error by its code', () => {
    expect(isExistingAccount({ user: null }, { message: 'Conflict', code: 'user_already_exists' })).toBe(true)
    expect(isExistingAccount({ user: null }, { message: 'Conflict', code: 'email_exists' })).toBe(true)
  })

  it('detects a success response with no identities', () => {
    expect(isExistingAccount({ user: { identities: [] } }, null)).toBe(true)
  })

  it('accepts a new account', () => {
    expect(isExistingAccount({ user: { identities: [{ id: '1' }] } }, null)).toBe(false)
    expect(isExistingAccount({ user: {} }, null)).toBe(false)
    expect(isExistingAccount({ user: null }, null)).toBe(false)
  })

  it('leaves other errors alone', () => {
    expect(isExistingAccount({ user: null }, { message: 'Password should be at least 6 characters', code: 'weak_password' })).toBe(false)
  })
})
