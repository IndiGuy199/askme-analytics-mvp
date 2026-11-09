import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  Globe,
  Search,
  Bell,
  Shield,
  ArrowRight,
  Sparkles,
  Workflow,
} from 'lucide-react'

export const metadata = {
  title: 'AskMe Analytics - Analytics, AI Automation & Software Integrations',
  description:
    'AskMe Analytics helps small businesses understand performance with conversion analytics, automate repetitive work with AI, and connect the tools they already use.',
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, redirect to dashboard (handled by middleware too)
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AskMe Analytics
                </h1>
                <p className="text-sm text-gray-500">Analytics · AI Automation · Integrations</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="#services"
                className="text-gray-600 hover:text-gray-900 font-medium hidden sm:inline"
              >
                Services
              </a>
              <a
                href="#how-it-works"
                className="text-gray-600 hover:text-gray-900 font-medium hidden sm:inline"
              >
                How it Works
              </a>
              <a
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium hidden sm:inline"
              >
                Sign In
              </a>
              <Button asChild>
                <a href="/contact">Get a Free Check</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Make your{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                data, software, and AI
              </span>{' '}
              work together
            </h2>

            <p className="text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              AskMe Analytics helps small businesses understand how their website and funnels are performing,
              connect the systems they already use, and automate the repetitive work eating up their time.
              <br className="hidden sm:block" />
              <span className="font-medium text-gray-700">No dashboards to dig through. No guesswork. Just clear answers.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" asChild>
                <a href="#services" className="flex items-center gap-2">
                  Explore Our Services
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                <a href="/contact">Talk to Us</a>
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              Takes 10 minutes · No setup required · Limited slots
            </p>
          </div>
        </div>

        {/* Services Section */}
        <div id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center mb-12 sm:mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Three Ways We Help Your Business
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Pick one service or combine all three — each is scoped to what makes sense for your business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Analytics */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm flex flex-col">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">Analytics</CardTitle>
                <p className="text-sm font-medium text-indigo-600">Conversion Guardian</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <CardDescription className="text-base leading-relaxed mb-6">
                  Conversion monitoring, clear dashboards, and actionable insights so you know the moment a
                  change helps or hurts your revenue.
                </CardDescription>
                <div className="mt-auto space-y-3">
                  <Button className="w-full" asChild>
                    <a href="/contact?service=analytics">Get a Free Conversion Check</a>
                  </Button>
                  <div className="flex justify-center gap-4 text-sm">
                    <a href="/services/analytics" className="text-gray-600 hover:text-gray-900 font-medium">
                      Learn more
                    </a>
                    <a href="/demo" className="text-gray-600 hover:text-gray-900 font-medium">
                      See the product tour
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Automation */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm flex flex-col">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">AI Automation</CardTitle>
                <p className="text-sm font-medium text-indigo-600">Automate repetitive work</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <CardDescription className="text-base leading-relaxed mb-6">
                  AI that answers routine customer questions, searches your approved business information,
                  captures leads, and hands conversations to your staff when a human is needed.
                </CardDescription>
                <div className="mt-auto space-y-3">
                  <Button className="w-full" asChild>
                    <a href="/contact?service=ai-automation">Talk About Automation</a>
                  </Button>
                  <div className="flex justify-center gap-4 text-sm">
                    <a href="/services/ai-automation" className="text-gray-600 hover:text-gray-900 font-medium">
                      Learn more
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Software Integrations */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm flex flex-col">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                  <Workflow className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">Software Integrations</CardTitle>
                <p className="text-sm font-medium text-indigo-600">Connect what you already use</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <CardDescription className="text-base leading-relaxed mb-6">
                  Connect forms, CRM, spreadsheets, email, scheduling, and other existing tools. Feasibility
                  depends on your current systems and the access available to them.
                </CardDescription>
                <div className="mt-auto space-y-3">
                  <Button className="w-full" asChild>
                    <a href="/contact?service=integrations">Discuss Your Stack</a>
                  </Button>
                  <div className="flex justify-center gap-4 text-sm">
                    <a href="/services/integrations" className="text-gray-600 hover:text-gray-900 font-medium">
                      Learn more
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How it Works Section (Analytics) */}
        <div id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">Analytics Service</p>
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How it Works
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A simple, hands-off process that keeps you informed without the complexity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-600">1</span>
              </div>
              <CardHeader className="pb-4 pt-8">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                  <Globe className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">You show me your website</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Send your URL and tell me what you're changing — pricing, signup flow, funnel, landing page, etc.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-600">2</span>
              </div>
              <CardHeader className="pb-4 pt-8">
                <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                  <Search className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">I identify your highest-risk drop-off</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  I pinpoint where conversions are most likely to break — the critical moments that matter most to your revenue.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-600">3</span>
              </div>
              <CardHeader className="pb-4 pt-8">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                  <Bell className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">I monitor and alert</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  If something improves or drops, you'll know — without checking dashboards or digging through data.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trust Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  Change your website without guessing — and without losing conversions
                </h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Most small businesses make website changes and hope for the best. 
                  They don't have the time or expertise to set up proper tracking.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  I become your conversion guardian — watching your most critical user flows 
                  so you can make changes with confidence.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-48 h-48 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Shield className="h-24 w-24 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    24/7
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 sm:p-12 text-center text-white">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to protect your conversions?
            </h3>
            <p className="text-lg sm:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Get a free conversion check and see exactly where your website might be losing customers.
            </p>
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <a href="/contact?service=analytics" className="flex items-center gap-2">
                Get a Free Conversion Check
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            <p className="text-sm opacity-75 mt-4">
              Limited slots available · Response within 24 hours
            </p>
            <p className="text-sm opacity-90 mt-6">
              Need AI automation or help connecting your tools instead?{' '}
              <a href="/contact" className="underline font-medium">Talk to us</a> about any of our services.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left text-gray-500">
                <p>&copy; 2026 AskMe Analytics. All rights reserved.</p>
              </div>
              <div className="flex gap-6">
                <a href="#services" className="text-gray-500 hover:text-gray-700">Services</a>
                <a href="/contact" className="text-gray-500 hover:text-gray-700">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
