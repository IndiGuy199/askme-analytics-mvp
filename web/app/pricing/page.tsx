'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, BarChart3, ArrowRight, ArrowLeft, AlertCircle, TrendingUp, Shield } from 'lucide-react'

export default function PricingPage() {
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 200,
      description: 'Perfect for focused monitoring',
      isPopular: true,
      features: [
        'Monitor 1 critical flow',
        'Conversion baseline',
        'Real-time AI-powered insights',
        'Real-time metrics comparison with previous periods',
        'Change impact confirmation',
        'Alerts when things change',
        'Weekly summary',
        'Direct access to me'
      ]
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 400,
      description: 'For businesses with multiple funnels',
      isPopular: false,
      features: [
        'Monitor 2–3 flows',
        'Priority monitoring',
        'Real-time AI-powered insights',
        'Real-time metrics comparison with previous periods',
        'Monthly recommendations',
        'Change impact confirmation',
        'Real-time alerts',
        'Weekly detailed reports',
        'Strategy consultation'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Navigation Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>

        {/* Header Section */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Confidence Pricing</h1>
          </div>
          
          <p className="text-xl sm:text-2xl text-gray-700 mb-4 max-w-3xl mx-auto leading-relaxed">
            Know what's working and what's breaking — <span className="font-semibold">within days</span>
          </p>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            No confusing dashboards. No data overload. Just clear answers about your website's performance.
          </p>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Catch problems early</h3>
            <p className="text-sm text-gray-600">
              Get alerted when conversions drop before it costs you revenue
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Make changes confidently</h3>
            <p className="text-sm text-gray-600">
              Know if your updates helped or hurt — no more guessing
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Stay protected 24/7</h3>
            <p className="text-sm text-gray-600">
              I monitor your flows around the clock so you don't have to
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative bg-white/90 backdrop-blur-sm border-0 shadow-xl ${
                plan.isPopular ? 'ring-2 ring-indigo-500 scale-105' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-4 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mt-4 mb-2">
                  <span className="text-5xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-500 text-lg ml-2">/month</span>
                </div>
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <Button
                  className={`w-full mb-6 text-base py-6 ${
                    plan.isPopular
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                      : ''
                  }`}
                  variant={plan.isPopular ? 'default' : 'outline'}
                  asChild
                >
                  <Link href="/contact" className="flex items-center justify-center gap-2">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ / Clarification Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            How this works
          </h3>
          
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">What's a "critical flow"?</h4>
              <p className="text-gray-600">
                It's any path your visitors take that leads to revenue — like your pricing page → signup, 
                product page → checkout, or landing page → contact form. I help you identify which one matters most.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">What do I get exactly?</h4>
              <p className="text-gray-600">
                A baseline of your current conversion rate, monitoring that tracks changes in real-time, 
                alerts when something drops (or improves), and a weekly summary in plain English. 
                No dashboards to check unless you want to.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">Is this a long-term contract?</h4>
              <p className="text-gray-600">
                No. Monthly billing, cancel anytime. Most clients stay because they want to keep monitoring 
                their changes, but there's no lock-in.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">Can I upgrade later?</h4>
              <p className="text-gray-600">
                Absolutely. Start with Starter to monitor your most critical flow, then upgrade to Growth 
                when you want to track additional funnels or need priority attention.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 sm:p-12 text-center text-white shadow-2xl">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
              Not sure which plan is right?
            </h3>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Let's talk. I'll help you figure out which flow to monitor first and which plan makes sense for your business.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 py-6"
              asChild
            >
              <Link href="/contact" className="flex items-center gap-2">
                Get a Free Conversion Check
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm opacity-75 mt-4">
              Takes 10 minutes · No commitment required
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>All plans are month-to-month with no setup fees</p>
        </div>
      </div>
    </div>
  )
}
