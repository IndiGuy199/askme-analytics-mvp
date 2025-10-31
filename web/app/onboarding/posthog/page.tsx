'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, ArrowRight, Eye, EyeOff, ExternalLink } from 'lucide-react'

function PostHogOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    posthog_project_id: '202299', // Default PostHog project ID
    posthog_api_key: 'phx_tmki9RqkURHkZJxHnFErIij6C8zcnStWQ4HajDA51GY1QFY', // Default Personal API Key
    posthog_client_id: ''
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [clientIdError, setClientIdError] = useState('')
  const [isCheckingClientId, setIsCheckingClientId] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // First check if company_id is in URL params (from step 1)
      const urlCompanyId = searchParams?.get('company_id')
      if (urlCompanyId) {
        setCompanyId(urlCompanyId)
        
        // Fetch existing company data to pre-fill the form (only if already configured)
        const { data: companyData } = await supabase
          .from('companies')
          .select('posthog_project_id, posthog_api_key_encrypted, posthog_client_id')
          .eq('id', urlCompanyId)
          .single()
        
        if (companyData) {
          setFormData(prev => ({
            // Keep defaults if not set in DB, otherwise use DB values
            posthog_project_id: companyData.posthog_project_id?.toString() || prev.posthog_project_id,
            posthog_api_key: companyData.posthog_api_key_encrypted || prev.posthog_api_key,
            posthog_client_id: companyData.posthog_client_id || prev.posthog_client_id
          }))
        }
        return
      }

      // Otherwise fetch from database
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) {
        router.push('/onboarding/company')
        return
      }

      setCompanyId(userData.company_id)
      
      // Fetch existing company data to pre-fill the form (only if already configured)
      const { data: companyData } = await supabase
        .from('companies')
        .select('posthog_project_id, posthog_api_key_encrypted, posthog_client_id')
        .eq('id', userData.company_id)
        .single()
      
      if (companyData) {
        setFormData(prev => ({
          // Keep defaults if not set in DB, otherwise use DB values
          posthog_project_id: companyData.posthog_project_id?.toString() || prev.posthog_project_id,
          posthog_api_key: companyData.posthog_api_key_encrypted || prev.posthog_api_key,
          posthog_client_id: companyData.posthog_client_id || prev.posthog_client_id
        }))
      }
    }

    checkUser()
  }, [router, searchParams])

  const validateClientId = (clientId: string): boolean => {
    // Check for spaces
    if (/\s/.test(clientId)) {
      setClientIdError('Client ID cannot contain spaces')
      return false
    }
    
    // Check for valid format (alphanumeric, hyphens, underscores only)
    if (!/^[a-z0-9_-]+$/.test(clientId)) {
      setClientIdError('Client ID can only contain lowercase letters, numbers, hyphens, and underscores')
      return false
    }
    
    // Check minimum length
    if (clientId.length < 3) {
      setClientIdError('Client ID must be at least 3 characters long')
      return false
    }
    
    setClientIdError('')
    return true
  }

  const handleClientIdChange = async (value: string) => {
    // Remove spaces and convert to lowercase
    const sanitized = value.replace(/\s+/g, '').toLowerCase()
    setFormData(prev => ({ ...prev, posthog_client_id: sanitized }))
    
    if (!sanitized) {
      setClientIdError('Client ID is required')
      return
    }
    
    // Validate format first
    if (!validateClientId(sanitized)) {
      return
    }
    
    // Check if client ID is already taken
    setIsCheckingClientId(true)
    const supabase = createClient()
    
    const { data: existingCompany, error: checkError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('posthog_client_id', sanitized)
      .neq('id', companyId || '')
      .maybeSingle()
    
    setIsCheckingClientId(false)
    
    if (checkError) {
      console.error('Error checking client ID:', checkError)
      return
    }
    
    if (existingCompany) {
      setClientIdError(`This Client ID is already used by "${existingCompany.name}". Please choose a different one.`)
    } else {
      setClientIdError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    
    // Validate client ID before submission
    if (!formData.posthog_client_id) {
      setClientIdError('Client ID is required')
      return
    }
    
    if (clientIdError) {
      return
    }

    setIsLoading(true)
    setError('')

    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update company with PostHog details
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          posthog_project_id: parseInt(formData.posthog_project_id),
          posthog_api_key_encrypted: formData.posthog_api_key, // TODO: Encrypt this in production
          posthog_client_id: formData.posthog_client_id || null
        })
        .eq('id', companyId)

      if (updateError) throw updateError

      // Mark onboarding as complete and ensure company_id is set
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ 
          company_id: companyId,
          onboarding_completed: true,
          onboarding_step: 'completed'
        })
        .eq('id', user.id)

      if (userUpdateError) {
        console.warn('Failed to update user onboarding status:', userUpdateError)
      }

      // Small delay to ensure database changes propagate
      await new Promise(resolve => setTimeout(resolve, 500))

      router.push('/analytics?welcome=true')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-green-600">Company</span>
            </div>
            <div className="w-16 h-px bg-gray-300"></div>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-indigo-600">Analytics</span>
            </div>
            <div className="w-16 h-px bg-gray-300"></div>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-500 rounded-full text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm text-gray-500">Dashboard</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl">Connect Analytics</CardTitle>
            <CardDescription>
              Connect your analytics project to start receiving insights and AI-powered recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Project ID *
                  </label>
                  <Input
                    id="project_id"
                    type="number"
                    placeholder="202299"
                    value={formData.posthog_project_id}
                    disabled={true}
                    className="cursor-not-allowed bg-gray-100 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This field is managed by your administrator
                  </p>
                </div>

                <div>
                  <label htmlFor="api_key" className="block text-sm font-medium text-gray-700 mb-2">
                    Personal API Key *
                  </label>
                  <div className="relative">
                    <Input
                      id="api_key"
                      type="password"
                      placeholder="phx_..."
                      value={formData.posthog_api_key}
                      disabled={true}
                      autoComplete="off"
                      className="cursor-not-allowed bg-gray-100 text-gray-600"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This field is managed by your administrator
                  </p>
                </div>

                <div>
                  <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID *
                  </label>
                  <Input
                    id="client_id"
                    type="text"
                    placeholder="ask-me-abc"
                    value={formData.posthog_client_id}
                    onChange={(e) => handleClientIdChange(e.target.value)}
                    disabled={isLoading}
                    className={clientIdError ? 'border-red-500' : ''}
                    required
                  />
                  {isCheckingClientId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Checking availability...
                    </p>
                  )}
                  {clientIdError ? (
                    <p className="text-xs text-red-600 mt-1">
                      {clientIdError}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Use this to filter analytics when multiple companies share the same analytics project. Only lowercase letters, numbers, and hyphens allowed. No spaces.
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  disabled={
                    isLoading || 
                    !formData.posthog_client_id || 
                    !!clientIdError ||
                    isCheckingClientId
                  }
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect & Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PostHogOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PostHogOnboardingContent />
    </Suspense>
  )
}
