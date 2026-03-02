const env = (import.meta as any).env || {}
const isDev = env.DEV || env.MODE === 'development' || env.NODE_ENV === 'development'

export function devLog(...args: unknown[]): void {
  if (isDev) {
    console.log(...args)
  }
}

export function devWarn(...args: unknown[]): void {
  if (isDev) {
    console.warn(...args)
  }
}
