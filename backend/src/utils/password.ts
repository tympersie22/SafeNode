import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

const ROUNDS = 12

/**
 * bcrypt silently truncates its input at 72 bytes. Concatenating a pepper AFTER
 * the password (`pw + pepper`) means a long password can push the pepper past
 * the 72-byte boundary, weakening or entirely voiding it. To avoid this we
 * pre-hash `pw + pepper` with SHA-256 and base64-encode it, yielding a fixed
 * 44-byte input that preserves the full entropy of both password and pepper.
 */
const preprocess = (pw: string, pepper: string): string =>
  createHash('sha256').update(pw + pepper).digest('base64')

export const hashPassword = (pw: string, pepper = process.env.PASSWORD_PEPPER || '') =>
  bcrypt.hash(preprocess(pw, pepper), ROUNDS)

/**
 * Verifies a password against a stored hash.
 * Tries the current (pre-hashed) scheme first, then falls back to the legacy
 * raw `pw + pepper` scheme so hashes created before this change still verify.
 * Legacy hashes should be transparently re-hashed on next successful login
 * (see `needsRehash`).
 */
export const verifyPassword = async (
  pw: string,
  hash: string,
  pepper = process.env.PASSWORD_PEPPER || ''
): Promise<boolean> => {
  if (await bcrypt.compare(preprocess(pw, pepper), hash)) return true
  // Legacy fallback: pre-change hashes were bcrypt(pw + pepper)
  return bcrypt.compare(pw + pepper, hash)
}

/**
 * Returns true if a stored hash verifies only under the legacy scheme and
 * should be upgraded. Callers can use this after a successful login to
 * re-hash and persist with the current scheme.
 */
export const needsRehash = async (
  pw: string,
  hash: string,
  pepper = process.env.PASSWORD_PEPPER || ''
): Promise<boolean> => {
  const currentOk = await bcrypt.compare(preprocess(pw, pepper), hash)
  if (currentOk) return false
  return bcrypt.compare(pw + pepper, hash)
}

// Helper for diagnostics (optional)
export const getPasswordConfig = () => {
  const pepper = process.env.PASSWORD_PEPPER || ''
  return {
    pepperConfigured: !!pepper,
    pepperLength: pepper.length,
    hashingParamsVersion: '2.0',
    rounds: ROUNDS
  }
}
