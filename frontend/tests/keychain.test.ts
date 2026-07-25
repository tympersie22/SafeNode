import { beforeEach, describe, expect, it } from 'vitest'
import { keychainService } from '../src/utils/keychain'

describe('keychainService sensitive secret handling', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('refuses to persist or read the legacy safenode master password entry', async () => {
    const legacyKey = 'keychain_safenode_master_password'
    localStorage.setItem(legacyKey, '{"encrypted":[1,2,3],"iv":[4,5,6]}')

    await keychainService.save({
      service: 'safenode',
      account: 'master_password',
      password: 'do-not-store-me'
    })

    expect(localStorage.getItem(legacyKey)).toBeFalsy()
    await expect(keychainService.get('safenode', 'master_password')).resolves.toBeNull()
    expect(localStorage.getItem(legacyKey)).toBeFalsy()
  })
})
