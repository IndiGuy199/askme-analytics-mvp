import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

// Price IDs mapping - these will come from Stripe Dashboard after creating products
export const STRIPE_PRICES = {
  basic: process.env.STRIPE_PRICE_BASIC_MONTHLY || '',
  premium: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
  basic_yearly: process.env.STRIPE_PRICE_BASIC_YEARLY || '',
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || '',
}

// Helper to get price ID from plan ID
export function getPriceId(planId: string): string | null {
  return STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES] || null
}
