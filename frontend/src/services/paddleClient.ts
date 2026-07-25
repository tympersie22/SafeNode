const PADDLE_SCRIPT_ID = 'safenode-paddle-js'
const PADDLE_SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js'

type PaddleEvent = {
  name?: string
}

type PaddleInitializeOptions = {
  token: string
  eventCallback?: (event: PaddleEvent) => void
  checkout: {
    settings: {
      displayMode: 'overlay'
      locale: string
      successUrl: string
      theme: 'light'
    }
  }
}

type PaddleSdk = {
  Initialize: (options: PaddleInitializeOptions) => void
}

declare global {
  interface Window {
    Paddle?: PaddleSdk
  }
}

let paddleLoadPromise: Promise<PaddleSdk> | null = null
let initializedToken: string | null = null

function loadPaddleSdk(): Promise<PaddleSdk> {
  if (window.Paddle) {
    return Promise.resolve(window.Paddle)
  }

  if (paddleLoadPromise) {
    return paddleLoadPromise
  }

  paddleLoadPromise = new Promise<PaddleSdk>((resolve, reject) => {
    const existingScript = document.getElementById(PADDLE_SCRIPT_ID) as HTMLScriptElement | null
    const script = existingScript || document.createElement('script')

    const handleLoad = () => {
      if (!window.Paddle) {
        reject(new Error('Paddle.js loaded without exposing the checkout SDK'))
        return
      }
      resolve(window.Paddle)
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', () => reject(new Error('Unable to load Paddle checkout')), {
      once: true
    })

    if (!existingScript) {
      script.id = PADDLE_SCRIPT_ID
      script.src = PADDLE_SCRIPT_URL
      script.async = true
      document.head.appendChild(script)
    }
  })

  return paddleLoadPromise
}

export function buildPaddleInitializeOptions(
  token: string,
  successUrl: string
): PaddleInitializeOptions {
  return {
    token,
    checkout: {
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        locale: 'en',
        successUrl
      }
    }
  }
}

export async function initializePaddleCheckout(successUrl: string): Promise<void> {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim()
  if (!token) {
    throw new Error('Paddle checkout is not configured. Missing VITE_PADDLE_CLIENT_TOKEN.')
  }

  const paddle = await loadPaddleSdk()
  if (initializedToken === token) {
    return
  }

  paddle.Initialize(buildPaddleInitializeOptions(token, successUrl))
  initializedToken = token
}

