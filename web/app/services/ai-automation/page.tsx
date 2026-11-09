import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MessageSquare,
  UserPlus,
  CalendarClock,
  ListChecks,
  Car,
} from 'lucide-react'

export const metadata = {
  title: 'AI Automation - AskMe Analytics',
  description:
    'AI automation that answers routine customer questions, captures leads, coordinates appointments, and triages internal requests — with staff kept in the loop.',
}

const WORKFLOWS = [
  {
    icon: MessageSquare,
    iconClass: 'from-blue-500 to-cyan-500',
    title: 'Inventory & FAQ assistants with staff handoff',
    enters: 'Customer questions typed into chat — hours, pricing, availability, specs, policies.',
    automates:
      'The assistant searches your approved inventory or knowledge source and answers instantly, recognizing when a question is outside what it can confidently handle.',
    staffReceives:
      'A flagged conversation with the full question history when a handoff is needed — nothing to re-ask the customer.',
  },
  {
    icon: UserPlus,
    iconClass: 'from-purple-500 to-pink-500',
    title: 'Lead capture and follow-up',
    enters: 'Contact details and interest shared mid-conversation or through a form.',
    automates:
      'The assistant collects the information your team needs and logs it to your CRM or spreadsheet — no manual re-entry.',
    staffReceives:
      'A new lead record plus a notification, so follow-up can happen while the interest is still fresh.',
  },
  {
    icon: CalendarClock,
    iconClass: 'from-emerald-500 to-teal-500',
    title: 'Appointment coordination',
    enters: 'A request for a visit, call, or service date and time.',
    automates:
      'Available slots are checked against your calendar and a booking is proposed or confirmed automatically.',
    staffReceives:
      'The appointment already on their calendar, with the customer\u2019s details and reason for the visit attached.',
  },
  {
    icon: ListChecks,
    iconClass: 'from-amber-500 to-orange-500',
    title: 'Internal request triage',
    enters: 'Employee requests — IT issues, supply needs, scheduling changes — submitted via chat or a form.',
    automates:
      'The request is categorized and routed to the right person or queue based on rules you define.',
    staffReceives:
      'A ticket or message with the category and details already filled in, ready to action.',
  },
]

export default function AIAutomationServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">AI Automation</h1>
          </div>
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-4">Automate repetitive work</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 leading-tight">
            Let AI handle the questions you answer every single day
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Free up your team by letting AI handle the repetitive, routine parts of customer and internal
            requests — while keeping your staff in control of anything that needs a human touch.
          </p>
          <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" asChild>
            <a href="/contact?service=ai-automation" className="flex items-center gap-2">
              Talk About Automation
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
        </div>

        {/* Try the demo */}
        <div className="mb-16">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 sm:p-10 text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="hidden sm:flex p-3 bg-white/15 rounded-xl">
                  <Car className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-1">See an inventory assistant in action</h3>
                  <p className="text-white/90">
                    Try the Sunrise Motors chatbot — a fictional dealership demo of an inventory &amp; lead-capture assistant.
                  </p>
                </div>
              </div>
              <Button size="lg" variant="secondary" className="whitespace-nowrap" asChild>
                <Link href="/demos/sunrise-motors" className="flex items-center gap-2">
                  Try the Sunrise Motors Chatbot
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* What it does */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Practical Automation Workflows</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Each workflow is scoped to your business and the information and actions you approve
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {WORKFLOWS.map((workflow) => (
              <Card key={workflow.title} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className={`w-14 h-14 bg-gradient-to-r ${workflow.iconClass} rounded-xl flex items-center justify-center mb-4`}>
                    <workflow.icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{workflow.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">What enters the workflow</p>
                    <CardDescription className="text-base leading-relaxed">{workflow.enters}</CardDescription>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">What gets automated</p>
                    <CardDescription className="text-base leading-relaxed">{workflow.automates}</CardDescription>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">What a staff member receives</p>
                    <CardDescription className="text-base leading-relaxed">{workflow.staffReceives}</CardDescription>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Note on scope */}
        <div className="mb-16">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-gray-100 text-center">
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              These are illustrative workflow patterns we build for clients, scoped during a short discovery
              conversation — not already-deployed projects for any specific business shown on this page. Every
              automation only answers with information you've approved and only takes actions you've authorized.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 sm:p-12 text-center text-white">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">Curious what this could look like for your business?</h3>
          <p className="text-lg sm:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Tell us about the questions your team answers most often, and we'll walk you through what's possible.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
            <a href="/contact?service=ai-automation" className="flex items-center gap-2">
              Talk About Automation
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
