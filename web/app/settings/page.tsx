'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  Users, 
  CreditCard, 
  Building2, 
  Mail,
  Plus,
  Crown,
  Shield,
  User,
  Trash2,
  ExternalLink
} from 'lucide-react'

interface TeamMember {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
  users?: { name: string }
}

interface Company {
  id: string
  name: string
  plan_name: string
  subscription_status: string
  team_members: number
  max_team_members: number
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [company, setCompany] = useState<Company | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get company info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get dashboard data
      const dashboardRes = await fetch('/api/dashboard')
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json()
        setCompany(dashboardData.company)
      }

      // Get team data
      const teamRes = await fetch('/api/team')
      if (teamRes.ok) {
        const teamData = await teamRes.json()
        setTeamMembers(teamData.teamMembers)
        setPendingInvites(teamData.pendingInvites)
        setCurrentUserRole(teamData.currentUserRole)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        })
      })

      if (res.ok) {
        setInviteEmail('')
        setInviteRole('member')
        await loadData() // Refresh data
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to send invite')
      }
    } catch (error) {
      console.error('Invite error:', error)
      alert('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const res = await fetch(`/api/team?userId=${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadData() // Refresh data
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Remove member error:', error)
      alert('Failed to remove member')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })

      if (res.ok) {
        await loadData() // Refresh data
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Update role error:', error)
      alert('Failed to update role')
    }
  }

  const openBillingPortal = async () => {
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST'
      })

      if (res.ok) {
        const { url } = await res.json()
        window.open(url, '_blank')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to open billing portal')
      }
    } catch (error) {
      console.error('Billing portal error:', error)
      alert('Failed to open billing portal')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />
      case 'admin':
        return <Shield className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const canManageTeam = ['owner', 'admin'].includes(currentUserRole)

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-gray-600 mt-2">Manage your company and team settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('company')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'company' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Company
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'team' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              <Users className="h-4 w-4" />
              Team
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'billing' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'notifications' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              <Mail className="h-4 w-4" />
              Notifications
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'company' && (
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Manage your company profile and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name</label>
                  <Input value={company?.name || ''} disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Plan</label>
                  <Badge variant="outline" className="text-sm">
                    {company?.plan_name || 'Free'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Team Size</label>
                  <p className="text-sm text-gray-600">
                    {company?.team_members || 0} of {company?.max_team_members === -1 ? 'unlimited' : company?.max_team_members} members
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              {canManageTeam && (
                <Card>
                  <CardHeader>
                    <CardTitle>Invite Team Member</CardTitle>
                    <CardDescription>
                      Send an invitation to join your team
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleInvite} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="border rounded px-3 py-2"
                      >
                        <option value="member">Member</option>
                        {currentUserRole === 'owner' && <option value="admin">Admin</option>}
                      </select>
                      <Button type="submit" disabled={inviting}>
                        <Plus className="h-4 w-4 mr-1" />
                        {inviting ? 'Inviting...' : 'Invite'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Team Members ({teamMembers.length})</CardTitle>
                  <CardDescription>
                    Manage your team members and their roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name || member.email}</span>
                            <Badge className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                              <span className="flex items-center gap-1">
                                {getRoleIcon(member.role)}
                                {member.role}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{member.email}</p>
                          {member.last_login_at && (
                            <p className="text-xs text-gray-500">
                              Last login: {new Date(member.last_login_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {canManageTeam && member.role !== 'owner' && (
                          <div className="flex items-center gap-2">
                            {currentUserRole === 'owner' && member.role !== 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateRole(member.id, 'admin')}
                              >
                                Make Admin
                              </Button>
                            )}
                            {member.role === 'admin' && currentUserRole === 'owner' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateRole(member.id, 'member')}
                              >
                                Remove Admin
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {pendingInvites.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Invitations ({pendingInvites.length})</CardTitle>
                    <CardDescription>
                      Invitations waiting to be accepted
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingInvites.map((invite) => (
                        <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{invite.email}</span>
                              <Badge variant="outline" className="text-xs">
                                {invite.role}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Invited {new Date(invite.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Expires {new Date(invite.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
                <CardDescription>
                  Manage your subscription and billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Current Plan</label>
                  <Badge variant="outline" className="text-sm mb-2">
                    {company?.plan_name || 'Free'}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    Status: {company?.subscription_status || 'inactive'}
                  </p>
                </div>
                
                {currentUserRole === 'owner' && (
                  <div className="flex gap-2">
                    <Button onClick={() => router.push('/pricing')}>
                      Upgrade Plan
                    </Button>
                    <Button variant="outline" onClick={openBillingPortal}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Manage Billing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how you receive notifications and reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Weekly Analytics Digest</h4>
                      <p className="text-sm text-gray-600">Receive weekly email summaries of your analytics</p>
                    </div>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">AI Insights</h4>
                      <p className="text-sm text-gray-600">Get notified when new AI insights are available</p>
                    </div>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Team Updates</h4>
                      <p className="text-sm text-gray-600">Notifications about team member changes</p>
                    </div>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
