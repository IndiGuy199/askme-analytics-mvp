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

interface Company {
  id: string
  name: string
  slug: string
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Remove any PricingPageProps interface - not needed for client components
export default function PricingPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      // Get current user (but don't redirect if not logged in)
      const { data: { user } } = await supabase.auth.getUser()
      
      // If user is logged in, fetch their data
      if (user) {
        // Get user data with current subscription
        const { data: userData } = await supabase
          .from('users')
          .select(`
            *,
            companies!inner(
              id,
              name,
              slug,
              subscriptions(plan_id, status)
            )
          `)
          .eq('id', user.id)
          .single()

        if (userData) {
          setCurrentUser(userData as User)
          if (userData.companies) {
            setCompany(userData.companies as unknown as Company)
          }
          const activeSubscription = userData.companies?.subscriptions?.find(
            (sub: any) => sub.status === 'active' || sub.status === 'trialing'
          )
          if (activeSubscription) {
            setCurrentPlan(activeSubscription.plan_id)
            setSubscriptionStatus(activeSubscription.status)
          }
        }
      }

      // Get available plans (public data)
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
    // If user is not logged in, redirect to login
    if (!currentUser) {
      router.push('/login?redirect=/pricing')
      return
    }

    if (!company) {
      alert('Company information not found. Please try logging in again.')
      return
    }

    setCheckoutLoading(planId)
    
    try {
      // Call our API to create Stripe Checkout Session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: planId,
          companyId: company.id,
        }),
      })

      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert(error.message || 'Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const getPlanIcon = (planId: string) => {
    if (planId.includes('premium')) return <Sparkles className="h-5 w-5" />
    if (planId.includes('premium')) return <Zap className="h-5 w-5" />
    if (planId.includes('enterprise')) return <Crown className="h-5 w-5" />
    return <Sparkles className="h-5 w-5" />
  }

  const getPlanFeatures = (plan: Plan): string[] => {
    const planId = plan.id.toLowerCase()
    
    // Premium Plan Features
    if (planId.includes('premium')) {
      return [
        'Track 1 website/app',
        'Add 1 team member (2 total)',
        'Standard metric charts',
        'AI-powered insights',
        'Weekly email digest',
        'Compare to previous periods',
        'Date ranges: 7 & 30 days'
      ]
    }
    
    // Enterprise Plan Features (inherits from Premium + additional)
    if (planId.includes('premium') || planId.includes('standard')) {
      return [
        'Track up to 3 websites/apps',
        'Add up to 5 team members (6 total)',
        'Standard metric charts',
        'AI-powered insights',
        'Weekly email digest',
        'Compare to previous periods',
        'Custom signup & revenue charts',
        'Extended date ranges: 1, 7, 30 & 90 days',
        'Priority support'
      ]
    }
    
    // Fallback for other plans
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

  // Filter plans based on interval and hide Basic + Enterprise
  const displayPlans = plans.filter(plan => {
    // Hide Basic plan (not offering anymore)
    if (plan.id.toLowerCase().includes('basic')) {
      return false
    }
    
    // Hide Enterprise plan (not ready yet)
    if (plan.id.toLowerCase().includes('enterprise')) {
      return false
    }
    
    if (selectedInterval === 'year') {
      return plan.interval === 'year'
    } else {
      return plan.interval === 'month'
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="outline"
            onClick={() => router.push(currentUser ? '/dashboard' : '/')}
            className="bg-white hover:bg-gray-50"
          >
            ← Back to {currentUser ? 'Dashboard' : 'Home'}
          </Button>
          <div className="text-sm text-gray-600">
            {currentUser ? (
              currentUser.email
            ) : (
              <Button
                variant="outline"
                onClick={() => router.push('/login')}
                className="bg-white hover:bg-gray-50"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose your plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {subscriptionStatus === 'trialing' 
              ? 'Select a plan to continue after your trial ends'
              : 'Start with a 30-day free trial. No credit card required.'
            }
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

        <div className={`grid gap-8 mx-auto ${
          displayPlans.length === 1 
            ? 'max-w-md justify-center' 
            : displayPlans.length === 2 
            ? 'md:grid-cols-2 max-w-4xl' 
            : 'md:grid-cols-3 max-w-5xl'
        }`}>
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
                    disabled={(isCurrentPlan && subscriptionStatus === 'active') || checkoutLoading === plan.id}
                    onClick={() => handleCheckout(plan.id)}
                  >
                    {checkoutLoading === plan.id ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : !currentUser ? (
                      <>
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : isCurrentPlan && subscriptionStatus === 'active' ? (
                      'Current Plan'
                    ) : subscriptionStatus ? (
                      // User has a subscription (active or trialing), so no more trials
                      <>
                        Subscribe Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      // New user with no subscription ever
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

        {/* Coming Soon Message */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm text-gray-600">
              More plans coming soon with advanced features!
            </span>
          </div>
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
