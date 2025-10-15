import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, getPlanIdFromStripePrice } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  // Check if Stripe is available
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const companyId = session.metadata?.company_id
        const planId = session.metadata?.plan_id

        if (!companyId || !planId) {
          throw new Error('Missing metadata in checkout session')
        }

        // Get the subscription
        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string
        )

        // Update or create subscription record
        await supabase
          .from('subscriptions')
          .upsert({
            company_id: companyId,
            plan_id: planId,
            status: subscription.status,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const companyId = subscription.metadata?.company_id

        if (!companyId) {
          // Try to find company by customer ID
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('stripe_customer_id', subscription.customer)
            .single()

          if (!company) {
            throw new Error('Company not found for subscription update')
          }
        }

        // Update subscription
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Mark subscription as canceled
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            ended_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          // Get subscription to find company
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('company_id, plan_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single()

          if (subscription) {
            // Record payment
            await supabase
              .from('payments')
              .insert({
                company_id: subscription.company_id,
                subscription_id: (await supabase
                  .from('subscriptions')
                  .select('id')
                  .eq('stripe_subscription_id', invoice.subscription)
                  .single()
                )?.data?.id,
                provider: 'stripe',
                provider_payment_id: invoice.payment_intent as string || invoice.id,
                amount_cents: invoice.amount_paid,
                currency: invoice.currency,
                status: 'succeeded',
                plan_id: subscription.plan_id,
                occurred_at: new Date(invoice.created * 1000).toISOString(),
              })
          }
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Update subscription status to past_due
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
