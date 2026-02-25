import { Building2, Shield, Users, Zap } from 'lucide-react'

export type BillingCycle = 'monthly' | 'annual'
export type PlanId = 'free' | 'individual' | 'family' | 'teams'

export interface PricingPlan {
  id: PlanId
  name: string
  tagline: string
  cta: string
  highlight: boolean
  icon: typeof Shield
  features: string[]
  price:
    | 0
    | {
        monthly: number
        annual: number
      }
  stripePriceIds?: {
    monthly?: string
    annual?: string
  }
  paddleCheckoutUrls?: {
    monthly?: string
    annual?: string
  }
}

const env = import.meta.env
const BILLING_PROVIDER = (env.VITE_BILLING_PROVIDER || 'paddle').toLowerCase()

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start secure today',
    cta: 'Get Started',
    highlight: false,
    icon: Shield,
    price: 0,
    features: [
      'Unlimited passwords',
      '1 device',
      'AES-256 encryption',
      'Password generator',
      'Breach monitoring'
    ]
  },
  {
    id: 'individual',
    name: 'Personal',
    tagline: 'Most popular',
    cta: 'Start Free Trial',
    highlight: true,
    icon: Zap,
    price: {
      monthly: 2.49,
      annual: 24.9
    },
    features: [
      'Everything in Free',
      '5 devices',
      'Real-time sync',
      '2FA + Biometric',
      'Priority support'
    ],
    stripePriceIds: {
      monthly: env.VITE_STRIPE_PRICE_INDIVIDUAL_MONTHLY,
      annual: env.VITE_STRIPE_PRICE_INDIVIDUAL_ANNUAL
    },
    paddleCheckoutUrls: {
      monthly: env.VITE_PADDLE_CHECKOUT_INDIVIDUAL_MONTHLY,
      annual: env.VITE_PADDLE_CHECKOUT_INDIVIDUAL_ANNUAL
    }
  },
  {
    id: 'family',
    name: 'Family',
    tagline: 'Share with family',
    cta: 'Start Free Trial',
    highlight: false,
    icon: Users,
    price: {
      monthly: 4.16,
      annual: 41.6
    },
    features: [
      'Everything in Personal',
      '10 devices',
      '20 shared vaults',
      '5GB file storage',
      'Family controls'
    ],
    stripePriceIds: {
      monthly: env.VITE_STRIPE_PRICE_FAMILY_MONTHLY,
      annual: env.VITE_STRIPE_PRICE_FAMILY_ANNUAL
    },
    paddleCheckoutUrls: {
      monthly: env.VITE_PADDLE_CHECKOUT_FAMILY_MONTHLY,
      annual: env.VITE_PADDLE_CHECKOUT_FAMILY_ANNUAL
    }
  },
  {
    id: 'teams',
    name: 'Teams',
    tagline: 'For businesses',
    cta: 'Start Free Trial',
    highlight: false,
    icon: Building2,
    price: {
      monthly: 8.32,
      annual: 83.2
    },
    features: [
      'Everything in Family',
      '50 devices',
      'Admin dashboard',
      'RBAC + SSO',
      '24/7 support'
    ],
    stripePriceIds: {
      monthly: env.VITE_STRIPE_PRICE_TEAMS_MONTHLY,
      annual: env.VITE_STRIPE_PRICE_TEAMS_ANNUAL
    },
    paddleCheckoutUrls: {
      monthly: env.VITE_PADDLE_CHECKOUT_TEAMS_MONTHLY,
      annual: env.VITE_PADDLE_CHECKOUT_TEAMS_ANNUAL
    }
  }
]

export type CheckoutProvider = 'paddle' | 'stripe'

export function getStripePriceId(plan: PricingPlan, cycle: BillingCycle): string | undefined {
  if (plan.price === 0) {
    return undefined
  }

  return plan.stripePriceIds?.[cycle]
}

export function getPaddleCheckoutUrl(plan: PricingPlan, cycle: BillingCycle): string | undefined {
  if (plan.price === 0) {
    return undefined
  }

  return plan.paddleCheckoutUrls?.[cycle]
}

export function getCheckoutTarget(
  plan: PricingPlan,
  cycle: BillingCycle
): { provider: CheckoutProvider; value: string } | null {
  if (plan.price === 0) {
    return null
  }

  const paddle = getPaddleCheckoutUrl(plan, cycle)
  const stripe = getStripePriceId(plan, cycle)

  if (BILLING_PROVIDER === 'stripe') {
    if (stripe) return { provider: 'stripe', value: stripe }
    if (paddle) return { provider: 'paddle', value: paddle }
    return null
  }

  if (paddle) return { provider: 'paddle', value: paddle }
  if (stripe) return { provider: 'stripe', value: stripe }
  return null
}

export function getPlanMonthlyPrice(plan: PricingPlan, cycle: BillingCycle): string {
  if (plan.price === 0) {
    return '$0'
  }

  const monthly = cycle === 'annual' ? plan.price.annual / 12 : plan.price.monthly
  return `$${monthly.toFixed(2)}`
}
