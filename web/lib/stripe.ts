import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

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
  const priceId = STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES]
  if (!priceId) {
    throw new Error(`Unknown plan ID: ${planId}`)
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