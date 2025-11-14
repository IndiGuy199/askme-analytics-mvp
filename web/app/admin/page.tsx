'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, LogOut, Search, Activity, AlertCircle, Users, Calendar } from 'lucide-react'

interface Company {
  id: string
  name: string
  slug: string
  posthog_client_id?: string
  posthog_project_id?: number
  is_active: boolean
  created_at: string
  user_count?: number
  subscriptions: Array<{
    id: string
    status: string
    plan_id: string
    trial_end?: string
    current_period_end?: string
  }>
}

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [impersonating, setImpersonating] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkSuperAdmin()
  }, [])

  const handleLogout = async () => {
    try {
      // Get user ID before signing out
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id
      
      // 📊 Track logout in analytics before clearing session
      if (userId && typeof window !== 'undefined' && window.AMA?.onLogoutCleanup) {
        window.AMA.onLogoutCleanup(userId)
      }
      
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const checkSuperAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_super_admin) {
      router.push('/dashboard')
      return
    }

    setIsSuperAdmin(true)
    fetchCompanies()
  }

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies')
      const data = await response.json()
      
      if (response.ok) {
        setCompanies(data.companies || [])
      } else {
        console.error('Failed to fetch companies:', data.error)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImpersonate = async (companyId: string, companyName: string) => {
    const reason = prompt(`You are about to impersonate "${companyName}". This action will be logged.\n\nOptional: Enter reason for troubleshooting:`)
    
    if (reason === null) {
      // User clicked cancel
      return
    }
    
    setImpersonating(true)
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, reason: reason || 'Troubleshooting' })
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to analytics page as the impersonated company
        window.location.href = '/analytics'
      } else {
        alert(`Failed to start impersonation: ${data.error}`)
      }
    } catch (error) {
      console.error('Impersonation error:', error)
      alert('Error starting impersonation')
    } finally {
      setImpersonating(false)
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.posthog_client_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (subscription: Company['subscriptions'][0] | undefined) => {
    if (!subscription) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">No subscription</span>
    }

    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800',
      incomplete: 'bg-orange-100 text-orange-800'
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[subscription.status] || 'bg-gray-100 text-gray-800'}`}>
        {subscription.status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading companies...</p>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
              <p className="text-sm opacity-90">Impersonate clients for troubleshooting</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="bg-white text-gray-900 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Exit Admin
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="max-w-7xl mx-auto flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
          <p className="text-sm text-yellow-700">
            <strong>Security Notice:</strong> All impersonation actions are logged for security audit purposes. Only use this feature for legitimate troubleshooting.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Companies</p>
                  <p className="text-3xl font-bold text-gray-900">{companies.length}</p>
                </div>
                <Shield className="h-12 w-12 text-indigo-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Subscriptions</p>
                  <p className="text-3xl font-bold text-green-600">
                    {companies.filter(c => c.subscriptions[0]?.status === 'active').length}
                  </p>
                </div>
                <Activity className="h-12 w-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Trial Accounts</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {companies.filter(c => c.subscriptions[0]?.status === 'trialing').length}
                  </p>
                </div>
                <Calendar className="h-12 w-12 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Companies</CardTitle>
            <CardDescription>Find a company to impersonate and view their analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, slug, or client ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Companies List */}
        <div className="grid gap-4">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                      {getStatusBadge(company.subscriptions[0])}
                      {!company.is_active && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactive</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Slug:</span> {company.slug}
                      </div>
                      <div>
                        <span className="font-medium">Client ID:</span> {company.posthog_client_id || 'Not set'}
                      </div>
                      <div>
                        <span className="font-medium">Analytics Project:</span> {company.posthog_project_id || 'Not configured'}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(company.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {company.user_count !== undefined && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{company.user_count} active user{company.user_count !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleImpersonate(company.id, company.name)}
                    disabled={impersonating || !company.is_active}
                    className="ml-4"
                  >
                    {impersonating ? 'Starting...' : 'Impersonate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredCompanies.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No companies found matching your search.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
