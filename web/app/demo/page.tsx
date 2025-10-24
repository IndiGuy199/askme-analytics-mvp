'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Target, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Calendar,
  DollarSign,
  Activity,
  Globe,
  Smartphone,
  Clock,
  Award,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function DemoPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('onboarding');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const lifecycleStages = [
    {
      id: 'onboarding',
      title: 'User Onboarding',
      icon: Users,
      color: 'bg-blue-500',
      description: 'Track how users discover and sign up for your platform',
      metrics: [
        { label: 'Sign-up Conversion Rate', value: '68%', trend: '+12%' },
        { label: 'Profile Completion Rate', value: '92%', trend: '+8%' },
        { label: 'Time to First Action', value: '2.3 min', trend: '-15%' },
        { label: 'Onboarding Drop-off', value: '8%', trend: '-5%' }
      ],
      features: [
        'Step-by-step funnel visualization',
        'Identify friction points in registration',
        'Track form field completion rates',
        'Monitor security question setup',
        'Measure consent acceptance rates'
      ],
      screenshot: '/demo-onboarding.png'
    },
    {
      id: 'trial',
      title: 'Free Trial Period',
      icon: Calendar,
      color: 'bg-purple-500',
      description: 'Understand user behavior during their trial experience',
      metrics: [
        { label: 'Active Trial Users', value: '1,234', trend: '+18%' },
        { label: 'Feature Adoption Rate', value: '76%', trend: '+22%' },
        { label: 'Trial Engagement Score', value: '8.4/10', trend: '+0.8' },
        { label: 'Support Ticket Volume', value: '23', trend: '-12%' }
      ],
      features: [
        'Daily active user tracking',
        'Feature usage analytics',
        'Session duration monitoring',
        'Page view patterns',
        'User engagement scoring'
      ],
      screenshot: '/demo-trial.png'
    },
    {
      id: 'conversion',
      title: 'Trial to Paid Conversion',
      icon: DollarSign,
      color: 'bg-green-500',
      description: 'Monitor the conversion from trial to paid membership',
      metrics: [
        { label: 'Trial-to-Paid Rate', value: '42%', trend: '+15%' },
        { label: 'Average Time to Convert', value: '18 days', trend: '-3 days' },
        { label: 'Checkout Completion', value: '89%', trend: '+7%' },
        { label: 'Payment Success Rate', value: '96%', trend: '+2%' }
      ],
      features: [
        'Conversion funnel tracking',
        'Pricing page analytics',
        'Checkout process monitoring',
        'Payment gateway success rates',
        'Abandonment analysis'
      ],
      screenshot: '/demo-conversion.png'
    },
    {
      id: 'active',
      title: 'Active Membership',
      icon: Activity,
      color: 'bg-emerald-500',
      description: 'Track engagement and retention of paid members',
      metrics: [
        { label: 'Monthly Active Members', value: '8,456', trend: '+24%' },
        { label: 'Feature Usage Rate', value: '84%', trend: '+11%' },
        { label: 'Session Frequency', value: '12.3/month', trend: '+18%' },
        { label: 'Member Satisfaction', value: '4.6/5', trend: '+0.3' }
      ],
      features: [
        'Cohort retention analysis',
        'Feature adoption tracking',
        'User lifecycle segmentation',
        'Churn prediction indicators',
        'Engagement trend analysis'
      ],
      screenshot: '/demo-active.png'
    },
    {
      id: 'renewal',
      title: 'Membership Renewal',
      icon: Award,
      color: 'bg-orange-500',
      description: 'Optimize the renewal process and reduce churn',
      metrics: [
        { label: 'Renewal Rate', value: '87%', trend: '+9%' },
        { label: 'Auto-renewal Enabled', value: '73%', trend: '+14%' },
        { label: 'Renewal Reminder Opens', value: '64%', trend: '+8%' },
        { label: 'Renewal Completion Time', value: '3.2 min', trend: '-22%' }
      ],
      features: [
        'Renewal funnel optimization',
        'Payment method update tracking',
        'Reminder email effectiveness',
        'Dunning management analytics',
        'Win-back campaign tracking'
      ],
      screenshot: '/demo-renewal.png'
    },
    {
      id: 'insights',
      title: 'AI-Powered Insights',
      icon: Zap,
      color: 'bg-yellow-500',
      description: 'Get automated insights and actionable recommendations',
      metrics: [
        { label: 'Insights Generated', value: '47', trend: 'This week' },
        { label: 'Critical Alerts', value: '3', trend: 'Needs attention' },
        { label: 'Opportunities Found', value: '12', trend: 'High impact' },
        { label: 'Recommendations', value: '8', trend: 'Quick wins' }
      ],
      features: [
        'Automated trend detection',
        'Anomaly alerts',
        'Cohort behavior analysis',
        'Predictive analytics',
        'Custom business context'
      ],
      screenshot: '/demo-insights.png'
    }
  ];

  const dashboardFeatures = [
    {
      title: 'Real-Time Analytics',
      description: 'Monitor your metrics as they happen with live data updates',
      icon: Activity
    },
    {
      title: 'Custom Funnels',
      description: 'Build and track conversion funnels specific to your business',
      icon: Target
    },
    {
      title: 'Geographic Insights',
      description: 'Understand where your users are coming from worldwide',
      icon: Globe
    },
    {
      title: 'Device Analytics',
      description: 'Optimize for the devices your users prefer',
      icon: Smartphone
    },
    {
      title: 'Time-Based Analysis',
      description: 'Identify patterns and trends over time',
      icon: Clock
    },
    {
      title: 'Performance Metrics',
      description: 'Track engagement, retention, and user satisfaction',
      icon: TrendingUp
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AskMe Analytics</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/faq" className="text-gray-600 hover:text-gray-900">
                FAQ
              </Link>
              <Link
                href="/login"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Eye className="w-4 h-4" />
            Interactive Demo
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            See Your Complete User Journey
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            From first visit to loyal member - understand every step of your user's lifecycle with powerful analytics and AI-driven insights.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg inline-flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="bg-white text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg border-2 border-gray-300"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Lifecycle Stages */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Complete User Lifecycle Analytics
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track and optimize every stage of your user's journey with comprehensive analytics
            </p>
          </div>

          <div className="space-y-4">
            {lifecycleStages.map((stage, index) => {
              const Icon = stage.icon;
              const isExpanded = expandedSection === stage.id;

              return (
                <div
                  key={stage.id}
                  className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleSection(stage.id)}
                    className="w-full px-6 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${stage.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-gray-900">{stage.title}</h3>
                        <p className="text-gray-600">{stage.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-200">
                      <div className="grid md:grid-cols-2 gap-8 mt-6">
                        {/* Metrics */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4">Key Metrics</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {stage.metrics.map((metric, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                                <div className="text-sm text-gray-600 mb-1">{metric.label}</div>
                                <div className="text-xs text-green-600 font-medium">{metric.trend}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Features */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4">What You'll Track</h4>
                          <ul className="space-y-3">
                            {stage.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dashboard Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Dashboard Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to understand your users and grow your business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sample Dashboard Links */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Explore Sample Dashboards
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See real analytics in action with our sample data
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/analytics"
              className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-8 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="w-12 h-12" />
                <ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Standard Analytics</h3>
              <p className="text-blue-100">
                View traffic, user behavior, device mix, and geographic insights
              </p>
            </Link>

            <Link
              href="/custom-analytics"
              className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-8 text-white hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <Target className="w-12 h-12" />
                <ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Custom Funnels</h3>
              <p className="text-purple-100">
                Track onboarding, renewal, and custom conversion funnels
              </p>
            </Link>

            <Link
              href="/ai-insights"
              className="group bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-8 text-white hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <Zap className="w-12 h-12" />
                <ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-2">AI Insights</h3>
              <p className="text-green-100">
                Get automated insights and actionable recommendations
              </p>
            </Link>

            <Link
              href="/dashboard"
              className="group bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-8 text-white hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-12 h-12" />
                <ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Main Dashboard</h3>
              <p className="text-orange-100">
                Access your complete analytics suite and team management
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Analytics?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Start your free 30-day trial today. No credit card required.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg inline-flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="bg-blue-700 text-white px-8 py-4 rounded-lg hover:bg-blue-800 transition-colors font-semibold text-lg border-2 border-white"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold">AskMe Analytics</span>
              </div>
              <p className="text-sm">
                AI-powered analytics for modern businesses
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/about" className="hover:text-white">About</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 AskMe Analytics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
