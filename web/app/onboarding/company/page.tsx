'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { generateSlug } from '@/lib/utils'
import TermsModal from '@/components/TermsModal'

export default function CompanyOnboardingPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    billing_email: '',
    industry: '',
    primary_goal: '',
    monthly_visitors: '',
    audience_region: '',
    traffic_sources: [] as string[]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  
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

  const handleTrafficSourceToggle = (source: string) => {
    setFormData(prev => ({
      ...prev,
      traffic_sources: prev.traffic_sources.includes(source)
        ? prev.traffic_sources.filter(s => s !== source)
        : [...prev.traffic_sources, source]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check terms acceptance first
    if (!termsAccepted) {
      setError('You must accept the Terms and Conditions to continue')
      return
    }
    
    // Validate required fields
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Company name is required'
    }
    
    if (!formData.industry) {
      errors.industry = 'Industry is required'
    }
    
    if (!formData.primary_goal) {
      errors.primary_goal = 'Business goal is required'
    }
    
    if (!formData.monthly_visitors) {
      errors.monthly_visitors = 'Monthly visitors is required'
    }
    
    if (!formData.audience_region) {
      errors.audience_region = 'Audience region is required'
    }
    
    if (formData.traffic_sources.length === 0) {
      errors.traffic_sources = 'At least one traffic source is required'
    }
    
    if (formData.domain && !validateURL(formData.domain)) {
      errors.domain = 'Please enter a valid domain (e.g., example.com)'
    }
    
    if (formData.billing_email && !validateEmail(formData.billing_email)) {
      errors.billing_email = 'Please enter a valid email address'
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    
    setIsLoading(true)
    setError('')
    setValidationErrors({})

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
          industry: formData.industry,
          business_model: formData.industry === 'SaaS' || formData.industry === 'Software' ? 'B2B' : 'B2C',
          primary_goal: formData.primary_goal,
          audience_region: formData.audience_region,
          traffic_sources: formData.traffic_sources,
          monthly_visitors: parseInt(formData.monthly_visitors),
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (companyError) throw companyError

      // Update user with company_id, role, and record consent
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          company_id: company.id,
          role: 'owner', // First user becomes owner
          onboarding_step: 'analytics',
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0',
          consent_ip_address: null // IP tracking not implemented yet
        })
        .eq('id', user.id)

      if (userError) {
        console.error('User update error:', userError)
        throw new Error(`Failed to update user: ${userError.message}`)
      }

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

                {/* Business Context Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Business Context</h3>
                  <p className="text-xs text-gray-600 mb-4">Help us provide more relevant insights for your business</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                        Industry *
                      </label>
                      <select
                        id="industry"
                        value={formData.industry}
                        onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md ${validationErrors.industry ? 'border-red-500' : 'border-gray-300'}`}
                        required
                        disabled={isLoading}
                      >
                        <option value="">Select an industry</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="SaaS">SaaS</option>
                        <option value="Software">Software</option>
                        <option value="Local Services">Local Services</option>
                        <option value="Education">Education</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Media & Publishing">Media & Publishing</option>
                        <option value="Finance">Finance</option>
                        <option value="Other">Other</option>
                      </select>
                      {validationErrors.industry && (
                        <div className="flex items-center mt-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {validationErrors.industry}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="primary_goal" className="block text-sm font-medium text-gray-700 mb-2">
                        What's your main business goal? *
                      </label>
                      <select
                        id="primary_goal"
                        value={formData.primary_goal}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_goal: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md ${validationErrors.primary_goal ? 'border-red-500' : 'border-gray-300'}`}
                        required
                        disabled={isLoading}
                      >
                        <option value="">Select a goal</option>
                        <option value="Generate leads">Generate leads</option>
                        <option value="Get sign-ups">Get sign-ups</option>
                        <option value="Sell products">Sell products</option>
                        <option value="Book appointments">Book appointments</option>
                        <option value="Increase engagement">Increase engagement</option>
                        <option value="Drive subscriptions">Drive subscriptions</option>
                        <option value="Other">Other</option>
                      </select>
                      {validationErrors.primary_goal && (
                        <div className="flex items-center mt-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {validationErrors.primary_goal}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="monthly_visitors" className="block text-sm font-medium text-gray-700 mb-2">
                        Approximate monthly visitors *
                      </label>
                      <select
                        id="monthly_visitors"
                        value={formData.monthly_visitors}
                        onChange={(e) => setFormData(prev => ({ ...prev, monthly_visitors: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md ${validationErrors.monthly_visitors ? 'border-red-500' : 'border-gray-300'}`}
                        required
                        disabled={isLoading}
                      >
                        <option value="">Select range</option>
                        <option value="1000">Under 1,000</option>
                        <option value="5000">1,000 - 10,000</option>
                        <option value="25000">10,000 - 50,000</option>
                        <option value="75000">50,000 - 100,000</option>
                        <option value="200000">100,000 - 500,000</option>
                        <option value="750000">500,000+</option>
                      </select>
                      {validationErrors.monthly_visitors && (
                        <div className="flex items-center mt-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {validationErrors.monthly_visitors}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="audience_region" className="block text-sm font-medium text-gray-700 mb-2">
                        Primary audience region *
                      </label>
                      <select
                        id="audience_region"
                        value={formData.audience_region}
                        onChange={(e) => setFormData(prev => ({ ...prev, audience_region: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md ${validationErrors.audience_region ? 'border-red-500' : 'border-gray-300'}`}
                        required
                        disabled={isLoading}
                      >
                        <option value="">Select region</option>
                        <option value="US / Canada">US / Canada</option>
                        <option value="Europe">Europe</option>
                        <option value="Asia-Pacific">Asia-Pacific</option>
                        <option value="Latin America">Latin America</option>
                        <option value="Middle East / Africa">Middle East / Africa</option>
                        <option value="Global">Global</option>
                      </select>
                      {validationErrors.audience_region && (
                        <div className="flex items-center mt-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {validationErrors.audience_region}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Typical traffic sources * (select all that apply)
                      </label>
                      <div className="space-y-2">
                        {[
                          'Google Search',
                          'Facebook / Instagram Ads',
                          'LinkedIn',
                          'Email Marketing',
                          'Direct Traffic',
                          'Referrals',
                          'Content Marketing',
                          'Other Paid Ads'
                        ].map((source) => (
                          <label key={source} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.traffic_sources.includes(source)}
                              onChange={() => handleTrafficSourceToggle(source)}
                              disabled={isLoading}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">{source}</span>
                          </label>
                        ))}
                      </div>
                      {validationErrors.traffic_sources && (
                        <div className="flex items-center mt-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {validationErrors.traffic_sources}
                        </div>
                      )}
                    </div>
                  </div>
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

              {/* Terms and Conditions */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 flex-1">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                  >
                    Terms and Conditions
                  </button>
                  {' '}and consent to sharing my data (including email) with our analytics provider for service improvement.
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !formData.name || !formData.slug || !termsAccepted}
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
        
        {/* Terms Modal */}
        <TermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setTermsAccepted(true)
            setShowTermsModal(false)
          }}
          showAcceptButton={true}
        />
      </div>
    </div>
  )
}
