import bcrypt from 'bcryptjs'

const ROUNDS = 12

export const hashPassword = (pw: string, pepper = process.env.PASSWORD_PEPPER || '') => 
  bcrypt.hash(pw + pepper, ROUNDS)

export const verifyPassword = (pw: string, hash: string, pepper = process.env.PASSWORD_PEPPER || '') => 
  bcrypt.compare(pw + pepper, hash)

// Helper for diagnostics (optional)
export const getPasswordConfig = () => {
  const pepper = process.env.PASSWORD_PEPPER || ''
  return {
    pepperConfigured: !!pepper,
    pepperLength: pepper.length,
    hashingParamsVersion: '1.0',
    rounds: ROUNDS
  }
}
