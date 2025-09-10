'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Sparkles, Zap, Crown, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Plan, User } from '@/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PricingPageProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default function PricingPage({ searchParams }: PricingPageProps) {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user data with current subscription
      const { data: userData } = await supabase
        .from('users')
        .select(`
          *,
          companies!inner(
            subscriptions(plan_id, status)
          )
        `)
        .eq('id', user.id)
        .single()

      if (userData) {
        setCurrentUser(userData)
        const subscription = (userData.companies as any)?.subscriptions?.[0]
        if (subscription && ['active', 'trialing'].includes(subscription.status)) {
          setCurrentPlan(subscription.plan_id)
        }
      }

      // Get plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (plansData) {
        setPlans(plansData)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [router])

  const handleCheckout = async (planId: string) => {
    if (!currentUser) return

    setCheckoutLoading(planId)

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: planId.replace('_yearly', ''),
          interval: planId.includes('yearly') ? 'year' : 'month',
        }),
      })

      const { sessionId, error } = await response.json()
      
      if (error) {
        throw new Error(error)
      }

      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe not loaded')

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const getPlanIcon = (planId: string) => {
    if (planId.includes('basic')) return <Sparkles className="h-5 w-5" />
    if (planId.includes('premium')) return <Zap className="h-5 w-5" />
    if (planId.includes('enterprise')) return <Crown className="h-5 w-5" />
    return <Sparkles className="h-5 w-5" />
  }

  const getPlanFeatures = (plan: Plan): string[] => {
    const features = []
    
    if (plan.max_team_members === -1) {
      features.push('Unlimited team members')
    } else {
      features.push(`Up to ${plan.max_team_members} team members`)
    }

    if (plan.ai_insights) features.push('AI-powered insights')
    if (plan.email_digest) features.push('Weekly email digests')
    if (plan.slack_integration) features.push('Slack integration')
    if (plan.priority_support) features.push('Priority support')

    return features
  }

  const getYearlyDiscount = (monthlyPrice: number, yearlyPrice: number): number => {
    return Math.round((1 - (yearlyPrice / 12) / monthlyPrice) * 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Filter plans based on interval
  const displayPlans = plans.filter(plan => {
    if (selectedInterval === 'year') {
      return plan.interval === 'year'
    } else {
      return plan.interval === 'month'
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose your plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start with a 14-day free trial. No credit card required.
          </p>

          {/* Interval Toggle */}
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setSelectedInterval('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedInterval === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedInterval('year')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                selectedInterval === 'year'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayPlans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id
            const monthlyEquivalent = plan.interval === 'year' ? plan.price_cents / 12 : plan.price_cents

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.is_popular ? 'border-indigo-500 shadow-lg scale-105' : ''
                } ${isCurrentPlan ? 'border-green-500' : ''}`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Current Plan
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">
                      {formatCurrency(monthlyEquivalent)}
                    </div>
                    <div className="text-gray-500 text-sm">
                      per month{plan.interval === 'year' ? ', billed yearly' : ''}
                    </div>
                    {plan.interval === 'year' && (
                      <div className="text-green-600 text-sm font-medium mt-1">
                        Save {getYearlyDiscount(
                          plans.find(p => p.id === plan.id.replace('_yearly', ''))?.price_cents || 0,
                          plan.price_cents
                        )}% annually
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {getPlanFeatures(plan).map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isCurrentPlan || checkoutLoading === plan.id}
                    className="w-full"
                    variant={plan.is_popular ? 'default' : 'outline'}
                  >
                    {checkoutLoading === plan.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      <>
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              No setup fees
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Cancel anytime
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              24/7 support
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
