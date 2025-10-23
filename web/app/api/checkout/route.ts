import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getPriceId } from '@/lib/stripe/config'

export async function POST(req: NextRequest) {
  try {
    const { planId, companyId } = await req.json()

    if (!planId || !companyId) {
      return NextResponse.json(
        { error: 'Missing planId or companyId' },
        { status: 400 }
      )
    }

    // Get Stripe price ID
    const priceId = getPriceId(planId)
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid plan ID: ${planId}. Please check STRIPE_PRICE_* environment variables.` },
        { status: 400 }
      )
    }

    // Get company and user info
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        subscriptions(*)
      `)
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      console.error('Company fetch error:', companyError)
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Check if company already has a Stripe customer ID
    let customerId = company.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.name,
        metadata: {
          company_id: companyId,
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Update company with Stripe customer ID
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', companyId)

      console.log('✅ Created Stripe customer:', customerId)
    }

    // Check if user is currently trialing
    const activeSubscription = company.subscriptions?.find(
      (sub: any) => sub.status === 'trialing' || sub.status === 'active'
    )

    const isTrialing = activeSubscription?.status === 'trialing'

    console.log('🔍 Subscription status:', {
      isTrialing,
      currentStatus: activeSubscription?.status,
      planId,
    })

    // Create Checkout Session
    const sessionConfig: any = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        company_id: companyId,
        user_id: user.id,
        plan_id: planId,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Disable automatic tax for sandbox testing
      // automatic_tax: {
      //   enabled: true,
      // },
    }

    // Add subscription data based on trial status
    if (isTrialing) {
      // User is already trialing - convert to paid subscription (no trial)
      sessionConfig.subscription_data = {
        metadata: {
          company_id: companyId,
          plan_id: planId,
          converted_from_trial: 'true',
        },
      }
    } else {
      // New subscription - give 30-day trial
      sessionConfig.subscription_data = {
        trial_period_days: 30,
        metadata: {
          company_id: companyId,
          plan_id: planId,
          new_trial: 'true',
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('✅ Created checkout session:', session.id)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('❌ Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
