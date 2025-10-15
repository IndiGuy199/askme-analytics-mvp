import Stripe from 'stripe'

// Create stripe instance only when the secret key is available
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null

// Helper function to get stripe instance with error handling
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return stripe
}

// Stripe Price IDs - These should match your Stripe dashboard
export const STRIPE_PRICES = {
  basic_monthly: 'price_basic_monthly_id',
  basic_yearly: 'price_basic_yearly_id',
  premium_monthly: 'price_premium_monthly_id',
  premium_yearly: 'price_premium_yearly_id',
  enterprise_monthly: 'price_enterprise_monthly_id',
  enterprise_yearly: 'price_enterprise_yearly_id',
} as const

export function getStripePriceId(planId: string): string {
  const priceMap: Record<string, string> = {
    'basic': STRIPE_PRICES.basic_monthly,
    'basic_yearly': STRIPE_PRICES.basic_yearly,
    'premium': STRIPE_PRICES.premium_monthly,
    'premium_yearly': STRIPE_PRICES.premium_yearly,
    'enterprise': STRIPE_PRICES.enterprise_monthly,
    'enterprise_yearly': STRIPE_PRICES.enterprise_yearly,
  }

  const priceId = priceMap[planId]
  if (!priceId) {
    throw new Error(`No Stripe price ID found for plan: ${planId}`)
  }

  return priceId
}

export function getPlanIdFromStripePrice(stripePriceId: string): string {
  const reverseMap: Record<string, string> = Object.entries(STRIPE_PRICES)
    .reduce((acc, [key, value]) => {
      acc[value] = key.replace('_monthly', '').replace('_yearly', '_yearly')
      return acc
    }, {} as Record<string, string>)

  return reverseMap[stripePriceId] || 'basic'
}
