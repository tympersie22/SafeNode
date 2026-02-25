/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_BILLING_PROVIDER?: 'paddle' | 'stripe'
  readonly VITE_PADDLE_CHECKOUT_INDIVIDUAL_MONTHLY?: string
  readonly VITE_PADDLE_CHECKOUT_INDIVIDUAL_ANNUAL?: string
  readonly VITE_PADDLE_CHECKOUT_FAMILY_MONTHLY?: string
  readonly VITE_PADDLE_CHECKOUT_FAMILY_ANNUAL?: string
  readonly VITE_PADDLE_CHECKOUT_TEAMS_MONTHLY?: string
  readonly VITE_PADDLE_CHECKOUT_TEAMS_ANNUAL?: string
  readonly VITE_STRIPE_PRICE_INDIVIDUAL_MONTHLY?: string
  readonly VITE_STRIPE_PRICE_INDIVIDUAL_ANNUAL?: string
  readonly VITE_STRIPE_PRICE_FAMILY_MONTHLY?: string
  readonly VITE_STRIPE_PRICE_FAMILY_ANNUAL?: string
  readonly VITE_STRIPE_PRICE_TEAMS_MONTHLY?: string
  readonly VITE_STRIPE_PRICE_TEAMS_ANNUAL?: string
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
