'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  ArrowLeft,
  BarChart3,
  Brain,
  CreditCard,
  Lock,
  Database,
  Zap,
  Mail
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  icon: any;
}

const faqs: FAQItem[] = [
  // Getting Started
  {
    id: 'what-is-askme',
    category: 'Getting Started',
    question: 'What is AskMe Analytics?',
    answer: 'AskMe Analytics is a powerful analytics platform that provides actionable insights for your business. We integrate with PostHog to analyze your data and use AI (GPT-4) to generate personalized recommendations that help you grow your business.',
    icon: BarChart3
  },
  {
    id: 'how-to-start',
    category: 'Getting Started',
    question: 'How do I get started?',
    answer: 'After signing up, complete the onboarding process to create your company profile. You\'ll start with a 30-day free trial of our Premium plan, which includes access to standard analytics, AI insights, and up to 5 team members. We\'ll help you configure PostHog integration during onboarding.',
    icon: Zap
  },
  {
    id: 'trial-period',
    category: 'Getting Started',
    question: 'What\'s included in the free trial?',
    answer: 'Your 30-day free trial includes full access to the Premium plan: comprehensive web analytics, AI-powered insights, up to 5 team members, and email support. No credit card required to start.',
    icon: Zap
  },

  // Analytics & Data
  {
    id: 'what-metrics',
    category: 'Analytics & Data',
    question: 'What metrics and KPIs does AskMe Analytics track?',
    answer: 'We track comprehensive metrics including: Traffic (unique visitors, pageviews), Conversion Funnels (step-by-step analysis), User Lifecycle (new, returning, dormant users), Device Mix (mobile/desktop breakdown), Retention (D7, D30), Geography (countries and cities), and Time-based trends.',
    icon: BarChart3
  },
  {
    id: 'data-refresh',
    category: 'Analytics & Data',
    question: 'How often is my data refreshed?',
    answer: 'Analytics data is updated in real-time from PostHog. Our smart caching system stores data for 5 minutes to improve performance. When you switch between metrics, cached data loads instantly. Stale data (older than 2 minutes) is automatically refreshed in the background.',
    icon: Database
  },
  {
    id: 'data-sources',
    category: 'Analytics & Data',
    question: 'What data sources do you support?',
    answer: 'Currently, we integrate with PostHog for analytics data. PostHog provides comprehensive event tracking, user analytics, and funnel analysis. We\'re planning to add support for Google Analytics, Mixpanel, and Amplitude in the future.',
    icon: Database
  },
  {
    id: 'historical-data',
    category: 'Analytics & Data',
    question: 'How far back can I view historical data?',
    answer: 'You can view analytics for any date range: last 24 hours, 7 days, 30 days, or 90 days. AI insights can be generated for any of these periods, and all insights are saved in your dashboard for historical comparison.',
    icon: BarChart3
  },

  // AI Insights
  {
    id: 'how-ai-works',
    category: 'AI Insights',
    question: 'How do AI insights work?',
    answer: 'Our AI analyzes your analytics data (traffic, conversions, retention, etc.) and compares it against industry benchmarks (3-5% SaaS conversion, 20-25% D7 retention). It then generates a personalized report with: a headline summary, 3 key highlights, your main bottleneck, and 3 specific action recommendations.',
    icon: Brain
  },
  {
    id: 'ai-kpis',
    category: 'AI Insights',
    question: 'What data does the AI analyze?',
    answer: 'The AI receives these KPIs: Traffic (unique users, pageviews, trends), Conversion Funnel (steps, rates, drop-offs), User Lifecycle (new/returning/dormant), Device Mix (mobile/desktop/tablet %), Retention (D7 rate + daily breakdown), and Geography (top countries). This comprehensive view allows for holistic recommendations.',
    icon: Brain
  },
  {
    id: 'ai-accuracy',
    category: 'AI Insights',
    question: 'How accurate are the AI insights?',
    answer: 'We use OpenAI\'s GPT-4o-mini model trained on industry best practices and benchmarks. Insights are based on your actual data compared to proven SaaS metrics. You can rate each insight (1-5 stars) to help us improve accuracy over time. The AI provides actionable recommendations, but you should validate them against your specific business context.',
    icon: Brain
  },
  {
    id: 'insight-cost',
    category: 'AI Insights',
    question: 'Do AI insights cost extra?',
    answer: 'AI insights are included in all paid plans at no extra charge! Generation costs are typically $0.001-0.01 per insight (less than 1 cent). We track and display the exact cost for transparency. You can generate unlimited insights within your plan.',
    icon: CreditCard
  },
  {
    id: 'insight-frequency',
    category: 'AI Insights',
    question: 'How often should I generate insights?',
    answer: 'We recommend generating insights weekly for 7-day periods to spot trends and track improvements. For major campaigns or product launches, daily insights can help you react quickly. All insights are saved, so you can compare them over time to measure progress.',
    icon: Brain
  },

  // Pricing & Billing
  {
    id: 'pricing-plans',
    category: 'Pricing & Billing',
    question: 'What are your pricing plans?',
    answer: 'We currently offer one plan: Premium at $39/month (or $390/year with 2 months free). It includes up to 5 team members, comprehensive web analytics, unlimited AI insights, custom funnels, and email support. Perfect for growing businesses who want actionable insights without complexity.',
    icon: CreditCard
  },
  {
    id: 'payment-methods',
    category: 'Pricing & Billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and debit cards through Stripe. Payment is secure and PCI-compliant. You can update your payment method anytime in your account settings.',
    icon: CreditCard
  },
  {
    id: 'cancel-subscription',
    category: 'Pricing & Billing',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes! You can cancel anytime from your account settings. If you cancel, you\'ll retain access until the end of your current billing period. Your data remains accessible for 30 days after cancellation in case you want to reactivate.',
    icon: CreditCard
  },
  {
    id: 'refund-policy',
    category: 'Pricing & Billing',
    question: 'What is your refund policy?',
    answer: 'We offer a 14-day money-back guarantee on all plans. If you\'re not satisfied for any reason, contact us within 14 days of purchase for a full refund. After 14 days, we don\'t provide refunds, but you can cancel anytime.',
    icon: CreditCard
  },

  // Security & Privacy
  {
    id: 'data-security',
    category: 'Security & Privacy',
    question: 'Is my data secure?',
    answer: 'Absolutely! We use industry-standard encryption (TLS 1.3) for data in transit and AES-256 for data at rest. Our database (Supabase) is hosted on AWS with automatic backups. We\'re SOC 2 Type II compliant and follow GDPR guidelines. Your analytics data never leaves our secure infrastructure.',
    icon: Lock
  },
  {
    id: 'data-ownership',
    category: 'Security & Privacy',
    question: 'Who owns my data?',
    answer: 'You do! You retain full ownership of all your analytics data, insights, and configurations. We never sell or share your data with third parties. You can export your data anytime and delete it permanently if you close your account.',
    icon: Lock
  },
  {
    id: 'gdpr-compliance',
    category: 'Security & Privacy',
    question: 'Are you GDPR compliant?',
    answer: 'Yes, we\'re fully GDPR compliant. We provide data processing agreements (DPA), honor all data subject rights (access, deletion, portability), and minimize data collection. Our servers are hosted in EU-compliant AWS regions, and we never track personal data without consent.',
    icon: Lock
  },
  {
    id: 'team-access',
    category: 'Security & Privacy',
    question: 'How do team member permissions work?',
    answer: 'You can invite team members with different roles: Owner (full access), Admin (manage team & settings), and Member (view analytics only). Each team member has their own secure login. You control who sees what data and can revoke access anytime.',
    icon: Lock
  },

  // Technical
  {
    id: 'integrations',
    category: 'Technical',
    question: 'What integrations are available?',
    answer: 'Currently: PostHog (analytics), Stripe (billing), and OpenAI (AI insights). Coming soon: Slack (notifications), Email (weekly digests), Zapier (automation), Google Analytics, and Webhooks for custom integrations.',
    icon: Zap
  },
  {
    id: 'api-access',
    category: 'Technical',
    question: 'Do you provide API access?',
    answer: 'API access is coming soon! It will allow you to programmatically fetch analytics data, generate insights, and integrate AskMe into your own tools. Contact us if you need early access or have specific integration requirements.',
    icon: Zap
  },
  {
    id: 'custom-funnels',
    category: 'Technical',
    question: 'Can I create custom conversion funnels?',
    answer: 'Yes! The Premium plan includes custom funnel creation. Define your own conversion steps, track specific user journeys, and get AI recommendations tailored to your funnel. You can create unlimited funnels and track them over time.',
    icon: BarChart3
  },
  {
    id: 'mobile-app',
    category: 'Technical',
    question: 'Is there a mobile app?',
    answer: 'Not yet, but it\'s on our roadmap! For now, our web app is fully responsive and works great on mobile browsers. You can view analytics and generate insights from any device. A native mobile app (iOS/Android) is planned for Q2 2026.',
    icon: Zap
  },

  // Support
  {
    id: 'support-channels',
    category: 'Support',
    question: 'How can I get help?',
    answer: 'We offer email support (support@askmeanalytics.com) with 24-hour response time, in-app help resources, and comprehensive documentation. For urgent issues, reach out via our contact form and we\'ll prioritize your request. We\'re here to help you succeed!',
    icon: Mail
  },
  {
    id: 'setup-assistance',
    category: 'Support',
    question: 'Do you help with setup and onboarding?',
    answer: 'Yes! All new customers receive onboarding assistance. We\'ll help you configure PostHog integration, set up your first funnels, and generate your first AI insights. Our guided onboarding makes setup quick and painless.',
    icon: Mail
  },
  {
    id: 'feature-requests',
    category: 'Support',
    question: 'Can I request new features?',
    answer: 'Absolutely! We love hearing from our customers. Submit feature requests through the contact form or email us directly. We prioritize features based on customer demand and impact. You can also vote on existing feature requests in our public roadmap.',
    icon: Mail
  },
];

const categories = Array.from(new Set(faqs.map(faq => faq.category)));

export default function FAQPage() {
  const router = useRouter();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Everything you need to know about AskMe Analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Links */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="justify-start bg-white hover:bg-gray-50"
              onClick={() => router.push('/pricing')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              View Pricing
            </Button>
            <Button
              variant="outline"
              className="justify-start bg-white hover:bg-gray-50"
              onClick={() => router.push('/contact')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button
              variant="outline"
              className="justify-start bg-white hover:bg-gray-50"
              onClick={() => router.push('/dashboard')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Questions ({faqs.length})
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category} ({faqs.filter(f => f.category === category).length})
            </Button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFAQs.map((faq) => {
            const Icon = faq.icon;
            const isOpen = openItems.has(faq.id);

            return (
              <Card key={faq.id} className="hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleItem(faq.id)}
                  className="w-full text-left"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 text-base">
                              {faq.question}
                            </h3>
                            {isOpen ? (
                              <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 mt-1 inline-block">
                            {faq.category}
                          </span>
                          {isOpen && (
                            <p className="text-gray-700 mt-3 leading-relaxed">
                              {faq.answer}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </button>
              </Card>
            );
          })}
        </div>

        {/* Still Have Questions */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Still have questions?
            </h2>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Can't find the answer you're looking for? Our support team is here to help. 
              Reach out and we'll get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push('/contact')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="mr-2 h-5 w-5" />
                Contact Support
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/pricing')}
              >
                View Pricing Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
