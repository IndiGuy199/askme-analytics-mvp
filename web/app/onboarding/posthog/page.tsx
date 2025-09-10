'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, ArrowRight, Eye, EyeOff, ExternalLink } from 'lucide-react'

export default function PostHogOnboardingPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    posthog_project_id: '',
    posthog_api_key: '',
    posthog_client_id: ''
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

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
    }

    checkUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    setIsLoading(true)
    setError('')

    const supabase = createClient()
    
    try {
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

      router.push('/analytics?welcome=true')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/analytics?welcome=true')
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
              <span className="ml-2 text-sm font-medium text-indigo-600">PostHog</span>
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
            <CardTitle className="text-2xl">Connect PostHog</CardTitle>
            <CardDescription>
              Connect your PostHog project to start receiving analytics insights and AI-powered recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
                    PostHog Project ID
                  </label>
                  <Input
                    id="project_id"
                    type="number"
                    placeholder="202299"
                    value={formData.posthog_project_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, posthog_project_id: e.target.value }))}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find this in your PostHog project settings
                  </p>
                </div>

                <div>
                  <label htmlFor="api_key" className="block text-sm font-medium text-gray-700 mb-2">
                    PostHog Personal API Key
                  </label>
                  <div className="relative">
                    <Input
                      id="api_key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="phx_..."
                      value={formData.posthog_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, posthog_api_key: e.target.value }))}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Create one in PostHog Settings → Personal API Keys
                  </p>
                </div>

                <div>
                  <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID (optional)
                  </label>
                  <Input
                    id="client_id"
                    type="text"
                    placeholder="askme-prod-v1"
                    value={formData.posthog_client_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, posthog_client_id: e.target.value }))}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank if you use one PostHog project per company. Use this to filter analytics when multiple companies share the same PostHog project.
                  </p>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  How to find your PostHog credentials:
                </h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to your PostHog dashboard</li>
                  <li>Project ID: Settings → Project → Project ID</li>
                  <li>API Key: Settings → Personal API Keys → Create new key</li>
                  <li>Client ID: Use this if you share a PostHog project with other companies</li>
                </ol>
                <a 
                  href="https://app.posthog.com/settings/project"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2"
                >
                  Open PostHog Settings
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="w-full"
                >
                  Skip for now
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.posthog_project_id || !formData.posthog_api_key}
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
