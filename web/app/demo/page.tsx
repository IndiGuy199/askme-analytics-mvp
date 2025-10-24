'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  Users, 
  LogIn,
  UserPlus,
  LayoutDashboard,
  LineChart,
  Sparkles,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  TrendingUp,
  Globe,
  Smartphone
} from 'lucide-react';

export default function DemoPage() {
  const [activeDemo, setActiveDemo] = useState<string>('login');

  const demoSteps = [
    {
      id: 'login',
      title: 'Login & Authentication',
      icon: LogIn,
      description: 'Simple and secure login process',
      image: null, // We'll show a live preview
      features: [
        'Email/password authentication',
        'Social login options',
        'Forgot password flow',
        'Remember me functionality'
      ]
    },
    {
      id: 'onboarding',
      title: 'Company Onboarding',
      icon: UserPlus,
      description: 'Quick setup to get started',
      image: null,
      features: [
        'Create company profile',
        'Configure analytics connection',
        'Set up team members',
        'Takes less than 2 minutes'
      ]
    },
    {
      id: 'dashboard',
      title: 'Main Dashboard',
      icon: LayoutDashboard,
      description: 'Overview of your key metrics at a glance',
      image: null,
      features: [
        'Real-time data updates',
        'Quick action buttons',
        'Recent activity feed',
        'Navigation to all features'
      ]
    },
    {
      id: 'analytics',
      title: 'Standard Analytics',
      icon: BarChart3,
      description: 'Comprehensive metrics with beautiful visualizations',
      image: null,
      features: [
        'Traffic overview with trends',
        'Device mix breakdown',
        'Geographic distribution',
        'User lifecycle tracking',
        'Session duration analysis',
        'Compare to previous periods'
      ]
    },
    {
      id: 'custom',
      title: 'Custom Analytics',
      icon: LineChart,
      description: 'Build your own charts and funnels',
      image: null,
      features: [
        'Custom funnel creation',
        'Revenue tracking',
        'Signup conversion analysis',
        'Event-based tracking',
        'Flexible date ranges'
      ]
    },
    {
      id: 'ai-insights',
      title: 'AI-Powered Insights',
      icon: Sparkles,
      description: 'Get intelligent recommendations powered by GPT-4',
      image: null,
      features: [
        'Automated trend detection',
        'Actionable recommendations',
        'Performance summaries',
        'Growth opportunities',
        'Weekly email digests'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">AskMe Analytics</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/pricing">
                <Button variant="outline">Pricing</Button>
              </Link>
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            See AskMe Analytics in Action
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Take a guided tour through every feature. From login to AI insights, see exactly how our platform helps you understand and grow your business.
          </p>
        </div>

        {/* Navigation Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {demoSteps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setActiveDemo(step.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeDemo === step.id
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-xs font-bold">
                {index + 1}
              </span>
              <step.icon className="h-4 w-4" />
              <span>{step.title}</span>
            </button>
          ))}
        </div>

        {/* Demo Content */}
        {demoSteps.map((step) => (
          <div
            key={step.id}
            className={`${activeDemo === step.id ? 'block' : 'hidden'}`}
          >
            <Card className="mb-8 shadow-xl border-2 border-indigo-100">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{step.title}</CardTitle>
                    <CardDescription className="text-base mt-1">
                      {step.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {/* Demo Preview Area */}
                <div className="mb-8">
                  {step.id === 'login' && <LoginDemo />}
                  {step.id === 'onboarding' && <OnboardingDemo />}
                  {step.id === 'dashboard' && <DashboardDemo />}
                  {step.id === 'analytics' && <AnalyticsDemo />}
                  {step.id === 'custom' && <CustomAnalyticsDemo />}
                  {step.id === 'ai-insights' && <AIInsightsDemo />}
                </div>

                {/* Features List */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Key Features:</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {step.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  const currentIndex = demoSteps.findIndex(s => s.id === activeDemo);
                  if (currentIndex > 0) {
                    setActiveDemo(demoSteps[currentIndex - 1].id);
                  }
                }}
                disabled={demoSteps.findIndex(s => s.id === activeDemo) === 0}
              >
                Previous Step
              </Button>
              
              {demoSteps.findIndex(s => s.id === activeDemo) === demoSteps.length - 1 ? (
                <Link href="/login">
                  <Button size="lg" className="text-lg">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={() => {
                    const currentIndex = demoSteps.findIndex(s => s.id === activeDemo);
                    if (currentIndex < demoSteps.length - 1) {
                      setActiveDemo(demoSteps[currentIndex + 1].id);
                    }
                  }}
                >
                  Next Step
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Data?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Start your 30-day free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" variant="secondary" className="text-lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg bg-white/10 text-white border-white hover:bg-white/20">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo Components with Sample Data
function LoginDemo() {
  return (
    <div className="bg-gray-50 rounded-lg p-8 border-2 border-gray-200">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <BarChart3 className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-900">Welcome Back</h3>
          <p className="text-gray-600 mt-1">Sign in to your account</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled
            />
          </div>
          <Button className="w-full" disabled>
            Sign In
          </Button>
          <div className="text-center">
            <span className="text-sm text-gray-600">Don't have an account? </span>
            <span className="text-sm text-indigo-600 font-medium">Sign up</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingDemo() {
  return (
    <div className="bg-gray-50 rounded-lg p-8 border-2 border-gray-200">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full text-sm font-medium">
              1
            </div>
            <span className="ml-2 text-sm font-medium text-indigo-600">Company</span>
          </div>
          <div className="w-16 h-px bg-gray-300"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-500 rounded-full text-sm font-medium">
              2
            </div>
            <span className="ml-2 text-sm text-gray-500">Analytics</span>
          </div>
          <div className="w-16 h-px bg-gray-300"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-500 rounded-full text-sm font-medium">
              3
            </div>
            <span className="ml-2 text-sm text-gray-500">Dashboard</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Create Your Company Profile</h3>
          <p className="text-gray-600 mt-1">Tell us about your business</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              placeholder="Acme Corporation"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Slug</label>
            <input
              type="text"
              placeholder="acme-corp"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">This will be used in your URL</p>
          </div>
          <Button className="w-full" disabled>
            Continue to Analytics Setup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DashboardDemo() {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h3 className="text-xl font-bold text-gray-900">Dashboard Overview</h3>
          <p className="text-sm text-gray-600 mt-1">Welcome back! Here's what's happening with your business.</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <Users className="h-6 w-6 text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">2,543</p>
            <p className="text-xs text-green-600 mt-1">↑ 12% from last month</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <BarChart3 className="h-6 w-6 text-green-600 mb-2" />
            <p className="text-sm text-gray-600">Page Views</p>
            <p className="text-2xl font-bold text-gray-900">48.2K</p>
            <p className="text-xs text-green-600 mt-1">↑ 8% from last month</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
            <p className="text-sm text-gray-600">Conversions</p>
            <p className="text-2xl font-bold text-gray-900">326</p>
            <p className="text-xs text-green-600 mt-1">↑ 15% from last month</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <Sparkles className="h-6 w-6 text-orange-600 mb-2" />
            <p className="text-sm text-gray-600">AI Insights</p>
            <p className="text-2xl font-bold text-gray-900">12</p>
            <p className="text-xs text-gray-600 mt-1">New recommendations</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              View Analytics
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Create Custom Funnel
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              View AI Insights
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsDemo() {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
      <div className="space-y-4">
        {/* Header with Date Selector */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold text-gray-900">Standard Analytics</h3>
          <div className="flex items-center space-x-2">
            <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
            </select>
            <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-indigo-50 text-indigo-700 font-medium">
              Compare to previous
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Unique Users', value: '2,543', change: '+12.5%', positive: true },
            { label: 'Page Views', value: '48.2K', change: '+8.3%', positive: true },
            { label: 'Sessions', value: '5,821', change: '+15.2%', positive: true },
            { label: 'Avg. Duration', value: '3m 24s', change: '+22.1%', positive: true },
            { label: 'Bounce Rate', value: '32.4%', change: '-5.2%', positive: true },
          ].map((metric, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow">
              <p className="text-xs text-gray-600">{metric.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{metric.value}</p>
              <p className={`text-xs mt-1 ${metric.positive ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change} vs prev.
              </p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Traffic Chart */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-semibold text-gray-900 mb-3">Traffic Overview</h4>
            <div className="h-48 bg-gradient-to-t from-indigo-50 to-transparent rounded flex items-end justify-around p-4">
              {[40, 55, 45, 70, 60, 85, 75].map((height, i) => (
                <div key={i} className="flex flex-col items-center space-y-1">
                  <div className="w-8 bg-indigo-600 rounded-t" style={{ height: `${height}%` }}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-2 text-xs text-gray-500 space-x-4">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          {/* Device Mix */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-semibold text-gray-900 mb-3">Device Mix</h4>
            <div className="flex items-center justify-center h-48">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <Smartphone className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
              <div>
                <p className="font-semibold text-gray-900">62%</p>
                <p className="text-xs text-gray-600">Mobile</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">28%</p>
                <p className="text-xs text-gray-600">Desktop</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">10%</p>
                <p className="text-xs text-gray-600">Tablet</p>
              </div>
            </div>
          </div>
        </div>

        {/* Geography */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-gray-600" />
            Top Countries
          </h4>
          <div className="space-y-3">
            {[
              { country: 'United States', users: '1,245', percentage: 68 },
              { country: 'United Kingdom', users: '456', percentage: 25 },
              { country: 'Canada', users: '234', percentage: 13 },
              { country: 'Australia', users: '189', percentage: 10 },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.country}</span>
                  <span className="font-semibold text-gray-900">{item.users}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomAnalyticsDemo() {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Custom Analytics</h3>
            <Button size="sm" disabled>+ Create New Funnel</Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Build custom funnels and track specific user journeys</p>
        </div>

        {/* Funnel Builder Preview */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-semibold text-gray-900 mb-4">Sample Funnel: Signup to First Purchase</h4>
          
          {/* Funnel Steps */}
          <div className="space-y-4">
            {[
              { step: 'Landing Page', users: 10000, percentage: 100, color: 'bg-blue-500' },
              { step: 'Sign Up Started', users: 6800, percentage: 68, color: 'bg-indigo-500' },
              { step: 'Account Created', users: 5440, percentage: 54, color: 'bg-purple-500' },
              { step: 'Pricing Page', users: 3808, percentage: 38, color: 'bg-pink-500' },
              { step: 'Checkout Started', users: 2662, percentage: 27, color: 'bg-red-500' },
              { step: 'Purchase Complete', users: 2129, percentage: 21, color: 'bg-green-500' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full ${item.color} text-white flex items-center justify-center text-sm font-bold mr-3`}>
                          {i + 1}
                        </div>
                        <span className="font-medium text-gray-900">{item.step}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{item.users.toLocaleString()} users</p>
                        <p className="text-sm text-gray-600">{item.percentage}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`${item.color} h-3 rounded-full transition-all`} style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                </div>
                {i < 5 && (
                  <div className="ml-4 mt-2 mb-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 mr-2"></div>
                      <span className="text-red-600 font-medium">
                        Drop-off: {((1 - ([6800, 5440, 3808, 2662, 2129][i] / [10000, 6800, 5440, 3808, 2662][i])) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">21.3%</p>
              <p className="text-sm text-gray-600">Overall Conversion</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">4.2 days</p>
              <p className="text-sm text-gray-600">Avg. Time to Convert</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">30%</p>
              <p className="text-sm text-gray-600">Biggest Drop-off</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIInsightsDemo() {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-lg shadow text-white">
          <div className="flex items-center space-x-3 mb-2">
            <Sparkles className="h-8 w-8" />
            <h3 className="text-2xl font-bold">AI-Powered Insights</h3>
          </div>
          <p className="text-purple-100">Get intelligent recommendations powered by GPT-4</p>
        </div>

        {/* Insight Cards */}
        <div className="space-y-3">
          {[
            {
              type: 'Opportunity',
              color: 'bg-green-50 border-green-200',
              iconColor: 'text-green-600',
              title: 'Mobile Traffic Surge Detected',
              description: 'Mobile traffic increased 45% this week, but mobile conversion is 23% lower than desktop. Consider optimizing your mobile checkout flow.',
              impact: 'High',
              metric: '+$12K potential monthly revenue'
            },
            {
              type: 'Alert',
              color: 'bg-orange-50 border-orange-200',
              iconColor: 'text-orange-600',
              title: 'Pricing Page Drop-off Increasing',
              description: 'Users are spending 38% less time on your pricing page compared to last month. This correlates with a 15% decrease in trial signups.',
              impact: 'Medium',
              metric: '-45 trials this month'
            },
            {
              type: 'Success',
              color: 'bg-blue-50 border-blue-200',
              iconColor: 'text-blue-600',
              title: 'Feature Adoption Improving',
              description: 'Your new dashboard feature has 68% adoption rate among users who logged in this week. Users with this feature active have 2.3x higher retention.',
              impact: 'Positive',
              metric: '+23% retention rate'
            },
          ].map((insight, i) => (
            <div key={i} className={`${insight.color} border-2 rounded-lg p-5 shadow-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className={`h-5 w-5 ${insight.iconColor}`} />
                  <span className={`text-sm font-semibold ${insight.iconColor}`}>{insight.type}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  insight.impact === 'High' ? 'bg-red-100 text-red-700' :
                  insight.impact === 'Medium' ? 'bg-orange-100 text-orange-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {insight.impact} Impact
                </span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">{insight.title}</h4>
              <p className="text-gray-700 text-sm mb-3">{insight.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                <span className="text-sm font-semibold text-gray-900">{insight.metric}</span>
                <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Digest Preview */}
        <div className="bg-white p-5 rounded-lg shadow border-2 border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              📧
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Weekly Email Digest</h4>
              <p className="text-xs text-gray-600">Delivered every Monday at 9 AM</p>
            </div>
          </div>
          <p className="text-sm text-gray-700">
            Get a summary of your key metrics, AI insights, and recommendations delivered straight to your inbox.
          </p>
        </div>
      </div>
    </div>
  );
}
