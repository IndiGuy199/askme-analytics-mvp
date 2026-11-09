import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Workflow,
  FileText,
  Bell,
  Car,
  CalendarCheck,
  Receipt,
} from 'lucide-react'

export const metadata = {
  title: 'Software Integrations - AskMe Analytics',
  description:
    'Connect forms, CRM, spreadsheets, email, scheduling, and other existing tools your business already uses.',
}

const FLOWS = [
  {
    icon: FileText,
    iconClass: 'from-blue-500 to-cyan-500',
    title: 'Website form \u2192 CRM \u2192 staff alert',
    description:
      'A form submission is created as a record in your CRM and your team gets an alert, instead of submissions sitting in an inbox.',
  },
  {
    icon: Car,
    iconClass: 'from-purple-500 to-pink-500',
    title: 'Inventory source \u2192 chatbot',
    description:
      'Your current inventory list or sheet is connected so a chatbot can answer questions with up-to-date availability.',
  },
  {
    icon: CalendarCheck,
    iconClass: 'from-emerald-500 to-teal-500',
    title: 'Booking \u2192 calendar \u2192 confirmation',
    description:
      'A booking request is added to the right calendar and a confirmation goes out automatically, without double-booking.',
  },
  {
    icon: Receipt,
    iconClass: 'from-amber-500 to-orange-500',
    title: 'Invoice status \u2192 follow-up task',
    description:
      'A change in invoice or payment status creates a follow-up task for your team, so nothing overdue gets missed.',
  },
]

export default function IntegrationsServicePage() {
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
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
              <Workflow className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Software Integrations</h1>
          </div>
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-4">Connect what you already use</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 leading-tight">
            Your tools, working together instead of in silos
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Connect forms, CRM, spreadsheets, email, scheduling, and other existing tools so information
            flows automatically instead of being copied by hand.
          </p>
          <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" asChild>
            <a href="/contact?service=integrations" className="flex items-center gap-2">
              Discuss Your Stack
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
        </div>

        {/* Concrete flows */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Example Flows We Build</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A few concrete patterns — the exact steps depend on your systems
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FLOWS.map((flow) => (
              <Card key={flow.title} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className={`w-12 h-12 bg-gradient-to-r ${flow.iconClass} rounded-xl flex items-center justify-center mb-3`}>
                    <flow.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{flow.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">{flow.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Note on feasibility */}
        <div className="mb-16">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-gray-100 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Bell className="h-5 w-5 text-indigo-600" />
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">How we connect your tools</p>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              The actual connection method depends on your system \u2014 a direct API, a webhook, a supported
              connector, or an authorized data export. Feasibility and approach are confirmed during a short
              discovery conversation before any work begins.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 sm:p-12 text-center text-white">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">Want to stop copying data by hand?</h3>
          <p className="text-lg sm:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Tell us what you're using today, and we'll tell you what's possible.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
            <a href="/contact?service=integrations" className="flex items-center gap-2">
              Discuss Your Stack
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
