import { describe, expect, it } from 'vitest'
import { buildPaddleInitializeOptions } from '../src/services/paddleClient'

describe('Paddle client', () => {
  it('builds a secure overlay checkout configuration', () => {
    expect(
      buildPaddleInitializeOptions(
        'live_public_client_token',
        'https://safe-node.app/billing/success'
      )
    ).toEqual({
      token: 'live_public_client_token',
      checkout: {
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'en',
          successUrl: 'https://safe-node.app/billing/success'
        }
      }
    })
  })
})
