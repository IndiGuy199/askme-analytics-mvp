'use client'

import { createClient } from '@/lib/supabase/client'
import { hasCustomQueries } from '@/src/config/clients'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Settings, Users, Zap, LogOut, Shield, Brain } from 'lucide-react'
import RevenueByChannelCard from '@/components/analytics/RevenueByChannelCard'
import TopRevenueItemsCard from '@/components/analytics/TopRevenueItemsCard'

interface User {
  id: string
  email?: string
  is_super_admin?: boolean
  user_metadata?: {
    full_name?: string
  }
}

interface Company {
  id: string
  name: string
  slug: string
  posthog_client_id?: string
}

interface Subscription {
  id: string
  status: string
  trial_end: string | null
  current_period_end: string
  plan_id: string
}

interface AnalyticsData {
  totalViews: number
  activeUsers: number
  error?: string
  needsSetup?: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({ 
    totalViews: 0, 
    activeUsers: 0,
    error: undefined,
    needsSetup: false
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [showCustomAnalyticsLink, setShowCustomAnalyticsLink] = useState(false)
  const supabase = createClient()

  // Handle successful checkout callback
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const success = searchParams.get('success')
    const sessionId = searchParams.get('session_id')

    if (success === 'true' && sessionId) {
      console.log('✅ Payment successful! Session ID:', sessionId)
      setShowSuccessMessage(true)
      
      // Clear URL parameters
      window.history.replaceState({}, '', '/dashboard')
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000)
    }

    const canceled = searchParams.get('canceled')
    if (canceled === 'true') {
      console.log('❌ Checkout canceled')
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        setUser(user)

        // Get user's company and subscription
        const { data: userData } = await supabase
          .from('users')
          .select('company_id, is_super_admin, companies(*)')
          .eq('id', user.id)
          .single()

        // Check if user is super admin
        if (userData?.is_super_admin) {
          setIsSuperAdmin(true)
          
          // If super admin has no company, redirect to admin dashboard
          if (!userData?.company_id) {
            router.push('/admin')
            return
          }
        }

        if (userData?.companies) {
          const companyData = userData.companies as unknown as Company
          setCompany(companyData)
          
          // Check if this company has custom funnels
          const clientId = companyData.posthog_client_id || companyData.slug || `company-${companyData.id}`;
          setShowCustomAnalyticsLink(hasCustomQueries(clientId));
          
          // Fetch subscription data
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('company_id', companyData.id)
            .in('status', ['trialing', 'active', 'past_due'])
            .single()
          
          if (subData) {
            setSubscription(subData as Subscription)
          }
          
          // Fetch analytics data
          fetchAnalyticsData(companyData)
        }

      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router, supabase])

  const fetchAnalyticsData = async (companyData: Company) => {
    try {
      setAnalyticsLoading(true)
      
      // Use posthog_client_id if available, otherwise fall back to company slug
      const clientId = companyData.posthog_client_id || companyData.slug || `company-${companyData.id}`
      
      // Fetch analytics from API (7 days)
      const response = await fetch(`/api/analytics/preview?clientId=${clientId}&dateRange=7d`)
      
      if (response.ok) {
        const data = await response.json()
        
        setAnalyticsData({
          totalViews: data.kpis?.traffic?.pageviews || 0,
          activeUsers: data.kpis?.traffic?.unique_users || 0,
          error: undefined,
          needsSetup: false
        })
      } else {
        const errorData = await response.json()
        setAnalyticsData({
          totalViews: 0,
          activeUsers: 0,
          error: errorData.error || 'Failed to load analytics',
          needsSetup: errorData.error?.includes('not configured') || errorData.error?.includes('PostHog')
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setAnalyticsData({
        totalViews: 0,
        activeUsers: 0,
        error: 'Failed to load analytics data',
        needsSetup: false
      })
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleSignOut = async () => {
    // Clear PostHog identification key from localStorage
    const userId = user?.id;
    if (userId) {
      const localStorageKey = `posthog_identified_${userId}`;
      localStorage.removeItem(localStorageKey);
    }

    await supabase.auth.signOut()
    router.push('/')
  }

  const getTrialInfo = () => {
    if (!subscription || subscription.status !== 'trialing' || !subscription.trial_end) {
      return null
    }

    const trialEnd = new Date(subscription.trial_end)
    const now = new Date()
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      daysLeft,
      trialEnd,
      isExpiringSoon: daysLeft <= 7
    }
  }

  const trialInfo = getTrialInfo()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {company ? company.name : 'AskMe Analytics'}
                </h1>
                {company && (
                  <p className="text-sm text-gray-500">/{company.slug}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isSuperAdmin && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                >
                  <Shield className="h-4 w-4" />
                  Super Admin
                </Button>
              )}
              <span className="text-sm text-gray-600">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message Banner */}
      {showSuccessMessage && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900">
                    🎉 Payment Successful!
                  </p>
                  <p className="text-xs text-green-700">
                    Your subscription is now active. Welcome aboard!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-600 hover:text-green-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!company ? (
          // No company setup - redirect to onboarding
          <div className="text-center">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Welcome to AskMe Analytics!</CardTitle>
                <CardDescription>
                  Let's set up your company to get started with analytics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => router.push('/onboarding/company')}
                  className="w-full"
                >
                  Set Up Company
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Company exists - show dashboard
          <div className="space-y-8">
            {/* Consolidated Membership Status Card */}
            {subscription && (subscription.status === 'active' || subscription.status === 'trialing') && (() => {
              const expiryDate = subscription.status === 'trialing' && subscription.trial_end 
                ? new Date(subscription.trial_end)
                : new Date(subscription.current_period_end);
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isExpiringSoon = daysUntilExpiry <= 10 && daysUntilExpiry > 0;
              const planName = subscription.plan_id === 'premium_yearly' ? 'Premium (Yearly)' : 'Premium';
              
              return (
                <Card className={`${isExpiringSoon ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${isExpiringSoon ? 'bg-orange-500' : 'bg-blue-500'} flex items-center justify-center`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isExpiringSoon ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isExpiringSoon ? 'text-orange-900' : 'text-blue-900'}`}>
                            {subscription.status === 'trialing' 
                              ? 'Your trial membership is valid until'
                              : `Your ${planName} membership is valid until`
                            }
                          </p>
                          <p className={`text-base font-bold ${isExpiringSoon ? 'text-orange-900' : 'text-blue-900'}`}>
                            {expiryDate.toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                          {isExpiringSoon && (
                            <>
                              <p className={`text-sm ${subscription.status === 'trialing' ? 'text-orange-700' : 'text-orange-700'} mt-2`}>
                                {subscription.status === 'trialing' 
                                  ? 'Your trial expires soon! Subscribe now to continue enjoying uninterrupted access to all features.'
                                  : 'Your membership expires soon! Renew your subscription to continue enjoying uninterrupted access to all features.'
                                }
                              </p>
                              <p className="text-xs text-orange-600 mt-2 font-medium">
                                {daysUntilExpiry === 1 ? '1 day remaining' : `${daysUntilExpiry} days remaining`}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {isExpiringSoon && (
                        <Button
                          onClick={() => router.push('/pricing')}
                          className={`${subscription.status === 'trialing' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white ml-4`}
                          size="sm"
                        >
                          {subscription.status === 'trialing' ? 'Subscribe Now' : 'Manage Plan'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Analytics Overview</h2>
              
              {/* Analytics Error Message */}
              {analyticsData.error && (
                <Card className="mb-6 border-orange-200 bg-orange-50">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-medium text-orange-800">
                          Analytics Not Set Up Yet
                        </h3>
                        <p className="mt-1 text-sm text-orange-700">
                          Your analytics has not been set up yet. Please contact us to start the process.
                        </p>
                        <Button
                          onClick={() => router.push('/contact')}
                          className="mt-3 h-9 px-3 bg-orange-600 hover:bg-orange-700"
                        >
                          Contact Us
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Views</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {analyticsLoading ? (
                            <span className="text-gray-400">...</span>
                          ) : (
                            analyticsData.totalViews.toLocaleString()
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Users</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {analyticsLoading ? (
                            <span className="text-gray-400">...</span>
                          ) : (
                            analyticsData.activeUsers.toLocaleString()
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Zap className="h-8 w-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Events</p>
                        <p className="text-2xl font-bold text-gray-900">-</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Settings className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <p className="text-sm font-bold text-green-600">Connected</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Analytics Cards */}
              {company && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Analytics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RevenueByChannelCard companyId={company.id} from="30d" to="now" />
                    <TopRevenueItemsCard companyId={company.id} from="30d" to="now" />
                  </div>
                </div>
              )}

              {/* Analytics Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI-Powered Insights</CardTitle>
                      <CardDescription>
                        Smart analytics recommendations based on your data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* AI Insight Cards */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">Getting Started</h4>
                              <p className="text-sm text-gray-600">
                                Your AI insights will appear here once we gather enough data. Check back after your first analytics are collected!
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">Ready to Explore</h4>
                              <p className="text-sm text-gray-600">
                                View standard web analytics and custom product funnels for detailed insights.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* CTA Button */}
                        <div className="pt-2">
                          <Button 
                            variant="default" 
                            size="lg"
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            onClick={() => router.push('/ai-insights')}
                          >
                            <Brain className="mr-2 h-5 w-5" />
                            View AI-Powered Insights
                          </Button>
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full mt-3"
                            onClick={() => router.push('/analytics')}
                          >
                            <BarChart3 className="mr-2 h-5 w-5" />
                            View Standard Web Analytics
                          </Button>
                          {showCustomAnalyticsLink && (
                            <Button 
                              variant="outline" 
                              size="lg"
                              className="w-full mt-3"
                              onClick={() => router.push('/custom-analytics')}
                            >
                              View Custom Product Analytics
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:from-purple-100 hover:to-indigo-100"
                        onClick={() => router.push('/ai-insights')}
                      >
                        <Brain className="mr-2 h-4 w-4 text-purple-600" />
                        <span className="text-purple-900 font-medium">AI Insights</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => router.push('/settings')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => router.push('/analytics')}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Standard Web Analytics
                      </Button>
                      {showCustomAnalyticsLink && (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => router.push('/custom-analytics')}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Custom Product Analytics
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => router.push('/pricing')}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Upgrade Plan
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 text-center py-8">
                        No recent activity
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
