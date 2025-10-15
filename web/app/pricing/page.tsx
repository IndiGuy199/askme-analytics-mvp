'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Sparkles, Zap, Crown, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Define types locally instead of importing potentially problematic ones
interface Plan {
  id: string
  name: string
  description: string
  price_cents: number
  interval: 'month' | 'year'
  is_popular: boolean
  is_active: boolean
  max_team_members: number
  ai_insights: boolean
  email_digest: boolean
  slack_integration: boolean
  priority_support: boolean
}

interface User {
  id: string
  email: string
  name?: string
  role?: string
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Remove any PricingPageProps interface - not needed for client components
export default function PricingPage() {
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
        setCurrentUser(userData as User)
        const activeSubscription = userData.companies?.subscriptions?.find(
          (sub: any) => sub.status === 'active'
        )
        if (activeSubscription) {
          setCurrentPlan(activeSubscription.plan_id)
        }
      }

      // Get available plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_cents', { ascending: true })

      if (plansData) {
        setPlans(plansData as Plan[])
      }

      setIsLoading(false)
    }

    fetchData()
  }, [router])

  const handleCheckout = async (planId: string) => {
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
                    <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center mb-4">
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {formatCurrency(monthlyEquivalent)}
                    </span>
                    <span className="text-gray-500 ml-1">/month</span>
                    {plan.interval === 'year' && (
                      <div className="text-sm text-gray-500 mt-1">
                        Billed annually ({formatCurrency(plan.price_cents)}/year)
                      </div>
                    )}
                  </div>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <Button
                    className="w-full mb-6"
                    variant={plan.is_popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || checkoutLoading === plan.id}
                    onClick={() => handleCheckout(plan.id)}
                  >
                    {checkoutLoading === plan.id ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      <>
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="space-y-3">
                    {getPlanFeatures(plan).map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="h-4 w-4 mr-3 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Feature comparison */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              All plans include
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Real-time analytics
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Custom dashboards
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Data export
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              API access
            </div>
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
