import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('❌ No Stripe signature found')
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  console.log('🔔 Webhook received:', event.type)

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const companyId = session.metadata?.company_id
        const planId = session.metadata?.plan_id

        console.log('💳 Checkout completed:', {
          sessionId: session.id,
          companyId,
          planId,
          customerId: session.customer,
        })

        if (!companyId || !planId) {
          console.error('❌ Missing metadata in checkout session')
          break
        }

        // Get subscription details
        const subscriptionId = session.subscription as string
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        console.log('📋 Subscription details:', {
          id: subscription.id,
          status: subscription.status,
          trialEnd: subscription.trial_end,
          currentPeriodEnd: subscription.current_period_end,
        })

        // Create or update subscription in database
        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              company_id: companyId,
              plan_id: planId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer as string,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_end: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
            },
            {
              onConflict: 'company_id',
            }
          )

        if (error) {
          console.error('❌ Error creating subscription:', error)
        } else {
          console.log('✅ Subscription created/updated in database:', subscriptionId)
        }
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const companyId = subscription.metadata?.company_id

        console.log('🆕 Subscription created:', {
          id: subscription.id,
          companyId,
          status: subscription.status,
        })

        if (!companyId) {
          console.error('❌ Missing company_id in subscription metadata')
          break
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const companyId = subscription.metadata?.company_id

        console.log('🔄 Subscription updated:', {
          id: subscription.id,
          companyId,
          status: subscription.status,
          trialEnd: subscription.trial_end,
        })

        if (!companyId) {
          // Try to find subscription by stripe_subscription_id
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('company_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          if (!existingSub) {
            console.error('❌ Could not find subscription in database')
            break
          }
        }

        // Update subscription in database
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('❌ Error updating subscription:', error)
        } else {
          console.log('✅ Subscription updated in database:', subscription.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        console.log('🗑️ Subscription deleted:', subscription.id)

        // Update subscription status to canceled
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('❌ Error canceling subscription:', error)
        } else {
          console.log('✅ Subscription canceled in database:', subscription.id)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('✅ Payment succeeded for invoice:', invoice.id)

        // Optional: Send payment confirmation email
        // Optional: Log payment in separate payments table
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.error('❌ Payment failed for invoice:', invoice.id)

        // Update subscription status to past_due
        if (invoice.subscription) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription as string)

          if (error) {
            console.error('❌ Error updating subscription to past_due:', error)
          } else {
            console.log('⚠️ Subscription marked as past_due')
          }
        }

        // Optional: Send payment failure notification email
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('⏰ Trial ending soon for subscription:', subscription.id)

        // Optional: Send trial ending reminder email
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
