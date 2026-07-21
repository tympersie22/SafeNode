import { getExpectedOrigins } from '../src/services/webauthnService'

describe('WebAuthn origins', () => {
  const originalOrigin = process.env.WEBAUTHN_ORIGIN

  afterEach(() => {
    if (originalOrigin === undefined) delete process.env.WEBAUTHN_ORIGIN
    else process.env.WEBAUTHN_ORIGIN = originalOrigin
  })

  it('accepts native Android APK key-hash origins from configuration', () => {
    const androidOrigin = 'android:apk-key-hash:test-release-certificate'
    process.env.WEBAUTHN_ORIGIN = `https://safe-node.app,${androidOrigin}`

    expect(getExpectedOrigins()).toContain(androidOrigin)
  })
})
