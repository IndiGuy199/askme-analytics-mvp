import { createClient } from '@/lib/supabase/server'
import { User, UserWithCompany } from '@/src/types'
import { redirect } from 'next/navigation'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  if (error || !authUser) {
    return null
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  return user
}

export async function getCurrentUserWithCompany(): Promise<UserWithCompany | null> {
  const supabase = await createClient()
  
  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  if (error || !authUser) {
    return null
  }

  const { data: user } = await supabase
    .from('users')
    .select(`
      *,
      company:companies(*)
    `)
    .eq('id', authUser.id)
    .single()

  return user
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireCompany(): Promise<UserWithCompany> {
  const user = await getCurrentUserWithCompany()
  if (!user) {
    redirect('/login')
  }
  if (!user.company_id || !user.company) {
    redirect('/onboarding/company')
  }
  return user as UserWithCompany
}

export async function requireActiveSubscription(): Promise<UserWithCompany> {
  const user = await requireCompany()
  
  const supabase = await createClient()
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('company_id', user.company_id)
    .in('status', ['active', 'trialing'])
    .single()

  if (!subscription) {
    redirect('/pricing')
  }

  return user
}

export function getRedirectUrl(path?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseUrl}/auth/callback${path ? `?next=${encodeURIComponent(path)}` : ''}`
}

export function isOwnerOrAdmin(user: User): boolean {
  return ['owner', 'admin'].includes(user.role)
}

export function canManageBilling(user: User): boolean {
  return user.role === 'owner'
}

export function canManageTeam(user: User): boolean {
  return ['owner', 'admin'].includes(user.role)
}
