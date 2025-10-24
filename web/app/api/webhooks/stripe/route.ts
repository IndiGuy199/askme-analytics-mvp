import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'
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

  // Create Supabase client with service role for webhooks (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

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
        // First, cancel any existing active subscriptions for this company
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString()
          })
          .eq('company_id', companyId)
          .in('status', ['active', 'trialing', 'past_due'])

        if (cancelError) {
          console.warn('⚠️ Error canceling existing subscriptions:', cancelError)
        }

        // Wait a moment for the cancel to complete
        await new Promise(resolve => setTimeout(resolve, 100))

        // Insert new subscription
        const { error } = await supabase
          .from('subscriptions')
          .insert({
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
          })

        if (error) {
          console.error('❌ Error creating subscription:', error)
          // If it's a duplicate key error, try updating instead
          if (error.code === '23505') {
            console.log('🔄 Attempting to update existing subscription instead...')
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({
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
              })
              .eq('company_id', companyId)
              .in('status', ['active', 'trialing', 'past_due'])
            
            if (updateError) {
              console.error('❌ Error updating subscription:', updateError)
            } else {
              console.log('✅ Subscription updated in database:', subscriptionId)
            }
          }
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
        let companyId = subscription.metadata?.company_id

        console.log('🔄 Subscription updated:', {
          id: subscription.id,
          companyId,
          status: subscription.status,
          trialEnd: subscription.trial_end,
        })

        if (!companyId) {
          // Try to find subscription by stripe_subscription_id
          const { data: existingSub, error: fetchError } = await supabase
            .from('subscriptions')
            .select('company_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          if (fetchError || !existingSub) {
            console.warn('⚠️ Subscription not found in database yet (might be created in another event):', subscription.id)
            // Return 200 to acknowledge receipt, subscription will be created by checkout.session.completed
            break
          }
          
          companyId = existingSub.company_id
        }

        // Update subscription in database
        const updateData: any = {
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }

        // Only add dates if they're valid
        if (subscription.current_period_start) {
          updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString()
        }
        if (subscription.current_period_end) {
          updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString()
        }
        if (subscription.trial_end) {
          updateData.trial_end = new Date(subscription.trial_end * 1000).toISOString()
        }

        const { error } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('❌ Error updating subscription:', error)
          throw error // This will cause 500 and retry
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
        console.log('🔍 Invoice details:', {
          subscription: invoice.subscription,
          customer: invoice.customer,
          amount: invoice.amount_paid / 100
        })

        // Get subscription details to find company_id
        let companyId: string | null = null
        let subscriptionDbId: string | null = null
        let stripeSubscriptionId: string | null = null
        
        // Method 1: Try to find by stripe_subscription_id if available
        if (invoice.subscription) {
          stripeSubscriptionId = invoice.subscription as string
          
          // Try to find subscription, with retry in case it hasn't been created yet
          let attempts = 0
          let subData = null
          
          while (attempts < 5 && !subData) {
            const { data, error } = await supabase
              .from('subscriptions')
              .select('id, company_id, plan_id, stripe_subscription_id')
              .eq('stripe_subscription_id', stripeSubscriptionId)
              .single()
            
            if (data) {
              subData = data
              console.log(`✅ Found subscription by ID on attempt ${attempts + 1}:`, {
                id: data.id,
                company_id: data.company_id,
                stripe_subscription_id: data.stripe_subscription_id
              })
            } else {
              console.log(`⏳ Subscription not found by ID (attempt ${attempts + 1}/5)`)
              if (attempts < 4) {
                console.log(`   Retrying in 2 seconds...`)
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }
            attempts++
          }
          
          if (subData) {
            companyId = subData.company_id
            subscriptionDbId = subData.id
          }
        }
        
        // Method 2: Fallback - find by customer_id if subscription not found
        if (!companyId && invoice.customer) {
          console.log('🔄 Trying to find subscription by customer_id:', invoice.customer)
          const { data: subData, error } = await supabase
            .from('subscriptions')
            .select('id, company_id, stripe_subscription_id')
            .eq('stripe_customer_id', invoice.customer as string)
            .in('status', ['active', 'trialing', 'past_due'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (subData) {
            companyId = subData.company_id
            subscriptionDbId = subData.id
            stripeSubscriptionId = subData.stripe_subscription_id
            console.log('✅ Found subscription by customer_id:', {
              id: subData.id,
              company_id: subData.company_id,
              stripe_subscription_id: subData.stripe_subscription_id
            })
          } else {
            console.error('❌ Could not find subscription by customer_id. Error:', error)
          }
        }

        // Record payment transaction
        if (companyId) {
          console.log('💰 Recording payment transaction:', {
            company_id: companyId,
            subscription_id: subscriptionDbId,
            amount: invoice.amount_paid / 100,
            stripe_subscription_id: stripeSubscriptionId
          })
          
          const { error: paymentError } = await supabase
            .from('payment_transactions')
            .insert({
              company_id: companyId,
              subscription_id: subscriptionDbId,
              stripe_payment_intent_id: invoice.payment_intent as string,
              stripe_charge_id: invoice.charge as string,
              stripe_invoice_id: invoice.id,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: invoice.customer as string,
              amount: (invoice.amount_paid / 100), // Convert cents to dollars
              currency: invoice.currency,
              status: 'succeeded',
              payment_method_type: invoice.payment_intent 
                ? (await stripe.paymentIntents.retrieve(invoice.payment_intent as string)).payment_method_types[0]
                : 'unknown',
              description: invoice.description || `Payment for ${invoice.period_start ? new Date(invoice.period_start * 1000).toLocaleDateString() : 'subscription'}`,
              receipt_url: invoice.hosted_invoice_url,
              invoice_pdf_url: invoice.invoice_pdf,
              paid_at: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
              metadata: {
                invoice_number: invoice.number,
                billing_reason: invoice.billing_reason,
                period_start: invoice.period_start,
                period_end: invoice.period_end,
              }
            })

          if (paymentError) {
            console.error('❌ Error recording payment transaction:', paymentError)
          } else {
            console.log('✅ Payment transaction recorded successfully!')
            console.log('   Invoice ID:', invoice.id)
            console.log('   Amount:', invoice.amount_paid / 100, invoice.currency.toUpperCase())
            console.log('   Company ID:', companyId)
          }
        } else {
          console.error('⚠️ Could not find company_id for invoice after all attempts')
          console.error('   Invoice ID:', invoice.id)
          console.error('   Customer ID:', invoice.customer)
          console.error('   Subscription ID:', invoice.subscription || 'undefined')
        }

        // Optional: Send payment confirmation email
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.error('❌ Payment failed for invoice:', invoice.id)

        // Get subscription details to find company_id
        let companyId: string | null = null
        let subscriptionDbId: string | null = null
        
        if (invoice.subscription) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id, company_id')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single()
          
          if (subData) {
            companyId = subData.company_id
            subscriptionDbId = subData.id
          }
        }

        // Record failed payment transaction
        if (companyId) {
          const { error: paymentError } = await supabase
            .from('payment_transactions')
            .insert({
              company_id: companyId,
              subscription_id: subscriptionDbId,
              stripe_payment_intent_id: invoice.payment_intent as string,
              stripe_invoice_id: invoice.id,
              stripe_subscription_id: invoice.subscription as string,
              stripe_customer_id: invoice.customer as string,
              amount: (invoice.amount_due / 100), // Convert cents to dollars
              currency: invoice.currency,
              status: 'failed',
              description: `Failed payment for ${invoice.description || 'subscription'}`,
              failed_at: new Date().toISOString(),
              metadata: {
                invoice_number: invoice.number,
                billing_reason: invoice.billing_reason,
                attempt_count: invoice.attempt_count,
                last_finalization_error: invoice.last_finalization_error,
              }
            })

          if (paymentError) {
            console.error('❌ Error recording failed payment:', paymentError)
          } else {
            console.log('✅ Failed payment recorded:', invoice.id)
          }
        }

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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('💰 Charge refunded:', charge.id)

        // First, fetch the current metadata
        const { data: currentTx } = await supabase
          .from('payment_transactions')
          .select('metadata')
          .eq('stripe_charge_id', charge.id)
          .single()

        // Merge with refund info
        const updatedMetadata = {
          ...(currentTx?.metadata || {}),
          refund_amount: charge.amount_refunded / 100,
          refund_reason: charge.refunds?.data[0]?.reason || 'unknown'
        }

        // Update payment transaction to refunded status
        const { error } = await supabase
          .from('payment_transactions')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            metadata: updatedMetadata
          })
          .eq('stripe_charge_id', charge.id)

        if (error) {
          console.error('❌ Error updating refunded payment:', error)
        } else {
          console.log('✅ Payment marked as refunded:', charge.id)
        }
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
