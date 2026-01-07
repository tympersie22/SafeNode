# SafeNode Billing & Stripe Integration Guide

## Overview

SafeNode uses Stripe for subscription management and billing. This guide covers setup, configuration, and usage of the billing system.

## Features

- ✅ Subscription checkout sessions
- ✅ Customer portal for subscription management
- ✅ Webhook handling for subscription events
- ✅ Subscription limits enforcement
- ✅ Multiple pricing tiers (Free, Individual, Family, Teams, Business)

## Stripe Setup

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete account verification
3. Get your API keys from the Dashboard

### 2. Create Products & Prices

In Stripe Dashboard → Products:

#### Individual Plan
- **Name**: Individual
- **Price**: $0.99/month (recurring)
- **Price ID**: Copy after creation (e.g., `price_xxxxx`)

#### Family Plan
- **Name**: Family
- **Price**: $1.99/month (recurring)
- **Price ID**: Copy after creation

#### Teams Plan
- **Name**: Teams
- **Price**: $11.99/month (recurring)
- **Price ID**: Copy after creation

#### Business Plan
- **Name**: Business
- **Price**: $5.99/month (recurring)
- **Price ID**: Copy after creation

### 3. Environment Variables

#### Backend (.env)
```env
STRIPE_SECRET_KEY=sk_live_...          # Production key
STRIPE_SECRET_KEY=sk_test_...          # Test key (for development)

STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret

# Optional: Override default price IDs
STRIPE_PRICE_INDIVIDUAL=price_xxxxx
STRIPE_PRICE_FAMILY=price_xxxxx
STRIPE_PRICE_TEAMS=price_xxxxx
STRIPE_PRICE_BUSINESS=price_xxxxx
```

#### Frontend (.env)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...    # Production key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...    # Test key (for development)
```

### 4. Webhook Configuration

#### Development (Local Testing)

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
# or
npm install -g stripe-cli
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:4000/api/billing/webhook
```

4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Production

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://api.yourdomain.com/api/billing/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add to production environment variables

## API Endpoints

### Create Checkout Session

**POST** `/api/billing/create-checkout-session`

Creates a Stripe checkout session for subscription purchase.

**Authentication**: Required

**Request Body**:
```json
{
  "priceId": "price_xxxxx",
  "successUrl": "https://app.safenode.com/billing/success",
  "cancelUrl": "https://app.safenode.com/billing"
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "cs_xxxxx",
  "url": "https://checkout.stripe.com/pay/cs_xxxxx"
}
```

**Usage**:
```typescript
const response = await fetch('/api/billing/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    priceId: 'price_individual_monthly',
    successUrl: `${window.location.origin}/billing/success`,
    cancelUrl: `${window.location.origin}/billing`
  })
})

const { url } = await response.json()
window.location.href = url // Redirect to Stripe Checkout
```

### Create Portal Session

**POST** `/api/billing/portal`

Creates a Stripe customer portal session for subscription management.

**Authentication**: Required

**Request Body**:
```json
{
  "returnUrl": "https://app.safenode.com/settings/billing"
}
```

**Response**:
```json
{
  "success": true,
  "url": "https://billing.stripe.com/p/session/xxxxx"
}
```

**Usage**:
```typescript
const response = await fetch('/api/billing/portal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    returnUrl: `${window.location.origin}/settings/billing`
  })
})

const { url } = await response.json()
window.location.href = url // Redirect to Stripe Portal
```

### Webhook Endpoint

**POST** `/api/billing/webhook`

Handles Stripe webhook events. This endpoint is public but verifies webhook signatures.

**Authentication**: Not required (uses Stripe signature verification)

**Headers**:
- `stripe-signature`: Stripe webhook signature

**Events Handled**:
- `checkout.session.completed` - Updates user subscription after successful checkout
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription
- `invoice.payment_succeeded` - Handles successful payments
- `invoice.payment_failed` - Handles failed payments

## Subscription Limits

Subscription tiers and their limits:

| Tier | Devices | Vaults | Team Members | Storage |
|------|---------|--------|--------------|---------|
| Free | 1 | 1 | 0 | 100 MB |
| Individual | 3 | 5 | 0 | 1 GB |
| Family | 10 | 20 | 0 | 5 GB |
| Teams | 50 | 100 | 50 | 10 GB |
| Business | 200 | 500 | 200 | 50 GB |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited |

Limits are enforced in:
- `backend/src/services/stripeService.ts` - `SUBSCRIPTION_LIMITS`
- `backend/src/services/stripeService.ts` - `checkSubscriptionLimits()`

## Testing

### Test Mode

1. Use Stripe test keys:
   - `sk_test_...` for backend
   - `pk_test_...` for frontend

2. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

3. Test webhooks locally:
```bash
stripe listen --forward-to localhost:4000/api/billing/webhook
stripe trigger checkout.session.completed
```

### Testing Checklist

- [ ] Create checkout session
- [ ] Complete checkout with test card
- [ ] Verify subscription created in database
- [ ] Test subscription limits enforcement
- [ ] Test customer portal access
- [ ] Test subscription cancellation
- [ ] Test webhook events
- [ ] Test failed payment handling

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook endpoint URL**: Must be publicly accessible
2. **Verify webhook secret**: Must match Stripe Dashboard
3. **Check webhook signature**: Ensure raw body is passed correctly
4. **Check logs**: Look for webhook errors in server logs

### Subscription Not Updating

1. **Check webhook events**: Verify events are being received
2. **Check database**: Verify user's `subscriptionStatus` and `subscriptionTier`
3. **Check Stripe Dashboard**: Verify subscription status in Stripe
4. **Check logs**: Look for errors in webhook handler

### Checkout Session Creation Fails

1. **Verify Stripe keys**: Check `STRIPE_SECRET_KEY` is set
2. **Verify price ID**: Ensure price ID exists in Stripe
3. **Check user exists**: User must be authenticated
4. **Check logs**: Look for specific error messages

### Customer Portal Not Loading

1. **Verify customer exists**: User must have `stripeCustomerId`
2. **Check Stripe configuration**: Portal must be configured in Stripe Dashboard
3. **Verify return URL**: Must be a valid URL

## Code Structure

### Backend

- **Service**: `backend/src/services/stripeService.ts`
  - `createCheckoutSession()` - Creates checkout session
  - `createPortalSession()` - Creates portal session
  - `handleStripeWebhook()` - Handles webhook events
  - `checkSubscriptionLimits()` - Enforces subscription limits

- **Routes**: `backend/src/routes/billing.ts`
  - `/api/billing/create-checkout-session` - POST
  - `/api/billing/portal` - POST
  - `/api/billing/webhook` - POST

### Frontend

- **Service**: `frontend/src/services/billingService.ts`
  - `createCheckoutSession()` - API client for checkout
  - `createPortalSession()` - API client for portal
  - `getSubscription()` - Get user subscription

- **Pages**:
  - `frontend/src/pages/billing/Subscribe.tsx` - Subscription page
  - `frontend/src/pages/settings/Billing.tsx` - Billing settings

## Security Considerations

1. **Webhook Signature Verification**: All webhooks verify Stripe signatures
2. **Authentication**: Checkout and portal endpoints require authentication
3. **Price ID Validation**: Price IDs are validated before creating sessions
4. **Customer Isolation**: Users can only manage their own subscriptions
5. **HTTPS Required**: All Stripe endpoints require HTTPS in production

## Production Checklist

- [ ] Stripe account verified
- [ ] Production API keys configured
- [ ] Products and prices created
- [ ] Webhook endpoint configured
- [ ] Webhook secret added to environment
- [ ] Test all subscription flows
- [ ] Monitor webhook deliveries
- [ ] Set up Stripe alerts for failed payments
- [ ] Configure customer portal branding
- [ ] Test subscription cancellation flow
- [ ] Test upgrade/downgrade flows

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

