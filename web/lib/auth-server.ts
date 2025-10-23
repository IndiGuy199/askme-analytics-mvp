/**
 * Server-side authentication utilities
 * Use these in API routes and Server Components only
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

/**
 * Get the current user with company information
 */
export async function getCurrentUserWithCompany() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select(`
      *,
      companies (*)
    `)
    .eq('id', user.id)
    .single()

  return data
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.is_super_admin === true
}

/**
 * Get the current impersonation session if active
 */
export async function getImpersonationSession(): Promise<{
  isImpersonating: boolean
  targetCompanyId?: string
  superAdminId?: string
} | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return null
  
  const impersonationData = session.user.user_metadata?.impersonation
  
  if (impersonationData?.target_company_id) {
    return {
      isImpersonating: true,
      targetCompanyId: impersonationData.target_company_id,
      superAdminId: impersonationData.super_admin_id
    }
  }
  
  return { isImpersonating: false }
}
