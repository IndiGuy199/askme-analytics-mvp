'use client'

import { useState } from 'react'
import { useRouter }        p_company_id: companyId,
        p_plan_id: 'premium',
        p_trial_days: 30
      });m 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { generateSlug } from '@/lib/utils'

export default function CompanyOnboardingPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    billing_email: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({
    domain: '',
    billing_email: ''
  })
  
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }))
  }

  const validateURL = (url: string): boolean => {
    if (!url) return true // Optional field
    
    // Check if URL has protocol
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }
    
    // Check if it's a valid domain pattern without protocol
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/
    return domainPattern.test(url)
  }

  const validateEmail = (email: string): boolean => {
    if (!email) return true // Optional field
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailPattern.test(email)
  }

  const handleDomainChange = (domain: string) => {
    setFormData(prev => ({ ...prev, domain }))
    
    if (domain && !validateURL(domain)) {
      setValidationErrors(prev => ({
        ...prev,
        domain: 'Please enter a valid URL (e.g., https://example.com or example.com)'
      }))
    } else {
      setValidationErrors(prev => ({ ...prev, domain: '' }))
    }
  }

  const handleEmailChange = (email: string) => {
    setFormData(prev => ({ ...prev, billing_email: email }))
    
    if (email && !validateEmail(email)) {
      setValidationErrors(prev => ({
        ...prev,
        billing_email: 'Please enter a valid email address'
      }))
    } else {
      setValidationErrors(prev => ({ ...prev, billing_email: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Normalize domain - add https:// if no protocol
      let normalizedDomain = formData.domain
      if (normalizedDomain && !normalizedDomain.startsWith('http://') && !normalizedDomain.startsWith('https://')) {
        normalizedDomain = `https://${normalizedDomain}`
      }

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.name,
          slug: formData.slug,
          domain: normalizedDomain || null,
          billing_email: formData.billing_email || user.email,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (companyError) throw companyError

      // Update user with company_id and mark progress to step 2
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          company_id: company.id,
          role: 'owner', // First user becomes owner
          onboarding_step: 'analytics'
        })
        .eq('id', user.id)

      if (userError) throw userError

      // Start Basic trial using the database function
      const { error: trialError } = await supabase.rpc('start_trial', {
        p_company_id: company.id,
        p_plan_id: 'basic',
        p_trial_days: 30
      })

      if (trialError) throw trialError

      // Navigate to PostHog setup with company ID
      router.push(`/onboarding/posthog?company_id=${company.id}`)
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
              <span className="ml-2 text-sm text-gray-500">PostHog</span>
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
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl">Create your company</CardTitle>
            <CardDescription>
              Let's set up your analytics workspace. You'll get a 30-day Premium trial to explore all features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Acme Inc."
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                    Company URL
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      askme.analytics/
                    </span>
                    <Input
                      id="slug"
                      type="text"
                      placeholder="acme-inc"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="rounded-l-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                    Website (optional)
                  </label>
                  <Input
                    id="domain"
                    type="text"
                    placeholder="www.testwebsite.com"
                    value={formData.domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    disabled={isLoading}
                    className={validationErrors.domain ? 'border-red-500' : ''}
                  />
                  {validationErrors.domain && (
                    <div className="flex items-center mt-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {validationErrors.domain}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="billing_email" className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Email (optional)
                  </label>
                  <Input
                    id="billing_email"
                    type="text"
                    placeholder="test@testwebsite.com"
                    value={formData.billing_email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    disabled={isLoading}
                    className={validationErrors.billing_email ? 'border-red-500' : ''}
                  />
                  {validationErrors.billing_email ? (
                    <div className="flex items-center mt-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {validationErrors.billing_email}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to use your login email
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Trial features preview */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-indigo-900 mb-2">
                  Your 30-day Premium trial includes:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-indigo-700">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    AI-powered insights
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Weekly email digests
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Slack integration
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Priority support
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !formData.name || !formData.slug}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating company...
                  </>
                ) : (
                  <>
                    Create company & start trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
