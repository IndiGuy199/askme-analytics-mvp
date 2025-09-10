'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, Mail, UserPlus, CheckCircle } from 'lucide-react'

interface InviteData {
  email: string
  role: string
  company: {
    name: string
  }
  expires_at: string
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [user, setUser] = useState<any>(null)

  const supabase = createClient()
  const token = params.token as string

  useEffect(() => {
    checkAuthAndLoadInvite()
  }, [token])

  const checkAuthAndLoadInvite = async () => {
    try {
      // Check if user is authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      // Load invite data
      const res = await fetch(`/api/team/accept?token=${token}`)
      if (res.ok) {
        const inviteData = await res.json()
        setInvite(inviteData)
        
        // If user is authenticated and email matches, pre-fill name
        if (currentUser && currentUser.email === inviteData.email) {
          setName(currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '')
        }
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Invalid invitation')
      }
    } catch (err) {
      console.error('Error loading invite:', err)
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    if (!invite) return

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: invite.email,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/${token}`
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setError('')
        alert('Check your email for a magic link to sign in!')
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError('Failed to send magic link')
    }
  }

  const handleAcceptInvite = async () => {
    if (!invite || !user) return

    setAccepting(true)
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim()
        })
      })

      if (res.ok) {
        setAccepted(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to accept invitation')
      }
    } catch (err) {
      console.error('Accept invite error:', err)
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Welcome to the team!</CardTitle>
            <CardDescription>
              You've successfully joined {invite?.company.name}. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            Join {invite?.company.name} as a {invite?.role}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{invite?.company.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{invite?.email}</span>
            </div>
            <div className="text-xs text-gray-500">
              Expires: {invite ? new Date(invite.expires_at).toLocaleDateString() : ''}
            </div>
          </div>

          {!user ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Sign in with your email to accept this invitation
              </p>
              <Button onClick={handleSignIn} className="w-full">
                Send Magic Link to {invite?.email}
              </Button>
            </div>
          ) : user.email !== invite?.email ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600 text-center">
                You're signed in as {user.email}, but this invitation is for {invite?.email}.
                Please sign out and sign in with the correct email.
              </p>
              <Button 
                variant="outline" 
                onClick={() => supabase.auth.signOut()} 
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Your Name (optional)
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              
              <Button 
                onClick={handleAcceptInvite} 
                disabled={accepting}
                className="w-full"
              >
                {accepting ? 'Accepting...' : `Accept Invitation`}
              </Button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
