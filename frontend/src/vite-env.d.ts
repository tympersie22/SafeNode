/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_DSN_FRONTEND?: string
  readonly VITE_SENTRY_ENV?: string
  readonly VITE_SENTRY_ENABLED_IN_DEV?: string
  readonly VITE_APP_VERSION?: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

