import { createClient } from '@/lib/supabase/server'
import { getStripe, getStripePriceId } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const checkoutSchema = z.object({
  planId: z.string(),
  interval: z.enum(['month', 'year']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is available
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { planId, interval = 'month' } = checkoutSchema.parse(body)

    const supabase = await createClient()
    
    // Get current user and company
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, companies(*)')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id || !userData.companies) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const company = userData.companies as any

    // Create the full plan ID with interval
    const fullPlanId = interval === 'year' ? `${planId}_yearly` : planId
    const stripePriceId = getStripePriceId(fullPlanId)

    // Check if customer already exists
    let customerId: string | undefined
    if (company.stripe_customer_id) {
      customerId = company.stripe_customer_id
    } else {
      // Create new customer
      const customer = await getStripe().customers.create({
        email: company.billing_email || user.email!,
        name: company.name,
        metadata: {
          company_id: company.id,
        },
      })
      customerId = customer.id

      // Update company with customer ID
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id)
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      metadata: {
        company_id: company.id,
        plan_id: fullPlanId,
      },
      subscription_data: {
        metadata: {
          company_id: company.id,
          plan_id: fullPlanId,
        },
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
