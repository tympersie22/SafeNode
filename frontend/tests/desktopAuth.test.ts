import { describe, expect, it } from 'vitest'
import { parseDesktopCallback } from '../src/desktop/desktopAuth'

describe('desktop authorization callback parsing', () => {
  const value = 'a'.repeat(43)

  it('accepts only the exact Safenode callback route', () => {
    expect(parseDesktopCallback(`safenode://auth/callback?flow=${value}&state=${value}&code=${value}`)).toEqual({
      flowId: value,
      state: value,
      code: value,
    })
  })

  it.each([
    `https://safe-node.app/callback?flow=${value}&state=${value}&code=${value}`,
    `safenode://evil/callback?flow=${value}&state=${value}&code=${value}`,
    `safenode://auth/other?flow=${value}&state=${value}&code=${value}`,
    `safenode://auth/callback?flow=${value}&state=${value}`,
    `safenode://auth/callback?flow=../bad&state=${value}&code=${value}`,
  ])('rejects untrusted or malformed URLs: %s', (url) => {
    expect(parseDesktopCallback(url)).toBeNull()
  })
})
