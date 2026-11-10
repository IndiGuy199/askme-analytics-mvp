import Link from 'next/link'
import { ArrowLeft, MessageSquareText, MessageCircle, Sparkles, AlertTriangle } from 'lucide-react'
import LeadAssistantChatWidget from '@/components/LeadAssistantChatWidget'
import '../chat-widget.css'

export const metadata = {
  title: 'AI Lead Assistant Demo - AskMe Analytics',
  description:
    'A sample inquiry workflow demo showing how an AI assistant captures and qualifies leads from a conversation.',
}

const SUGGESTED_PROMPTS = [
  "I'm interested in your consulting services — can you tell me more?",
  'Do you have pricing information for a small business plan?',
  "I'd like to schedule a callback about onboarding.",
]

export default function LeadAssistantDemoPage() {
  const webhookUrl = process.env.NEXT_PUBLIC_LEAD_ASSISTANT_CHAT_URL

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="mb-8">
          <Link href="/services/ai-automation" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to AI Automation</span>
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <MessageSquareText className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">AI Lead Assistant Demo</h1>
          </div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full mb-4">
            <Sparkles className="h-4 w-4" />
            Sample inquiry workflow · Use fictional contact details
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            This demo shows how an AI assistant captures and qualifies a lead from a conversation — no real
            business or inquiry is involved. Click the chat button below, and please use a made-up name, email,
            and phone number if asked for contact details, since sample inquiries are logged for the demo.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-lg mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-indigo-600" />
            Try asking the chatbot
          </h2>
          <ul className="space-y-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <li key={prompt} className="text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                "{prompt}"
              </li>
            ))}
          </ul>
        </div>

        {webhookUrl ? (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-6">
              Click the chat button below to try the demo.
            </p>
            <div id="lead-assistant-chat" className="askme-chat-widget" />
            <LeadAssistantChatWidget webhookUrl={webhookUrl} />
          </div>
        ) : (
          <div className="bg-white/80 border border-amber-200 rounded-2xl p-6 sm:p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Demo chat is temporarily unavailable</h2>
            <p className="text-gray-600">
              This demo isn't configured yet. Check back soon, or{' '}
              <Link href="/contact?service=ai-automation" className="text-indigo-600 font-medium underline">
                contact us
              </Link>{' '}
              to see a live walkthrough.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
