/**
 * Client-safe authentication utilities
 * These can be imported in both client and server components
 */

/**
 * Check if user has permission to impersonate
 */
export function canImpersonate(user: any): boolean {
  return user?.is_super_admin === true
}

/**
 * Check if user is owner or admin
 */
export function isOwnerOrAdmin(user: any): boolean {
  return ['owner', 'admin'].includes(user?.role)
}

/**
 * Check if user can manage billing
 */
export function canManageBilling(user: any): boolean {
  return user?.role === 'owner'
}

/**
 * Check if user can manage team
 */
export function canManageTeam(user: any): boolean {
  return ['owner', 'admin'].includes(user?.role)
}

/**
 * Get the redirect URL for magic link authentication
 * This determines where users should be redirected after clicking the magic link
 */
export function getRedirectUrl(): string {
  // In development, use localhost
  if (process.env.NODE_ENV === 'development') {
    return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
  }
  
  // In production, use the configured site URL
  return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
}

/**
 * Get the redirect path after successful authentication
 * This determines where to send users after they're authenticated
 */
export function getAuthRedirectPath(isNewUser: boolean = false): string {
  if (isNewUser) {
    // New users go through onboarding
    return '/onboarding/company'
  }
  
  // Existing users go to the analytics dashboard
  return '/analytics'
}

/**
 * Check if a user should go through onboarding
 * This checks if the user has completed company setup
 */
export function shouldShowOnboarding(user: any): boolean {
  // If user has no company_id in their metadata, they need onboarding
  return !user?.user_metadata?.company_id && !user?.app_metadata?.company_id
}

/**
 * Protected route paths that require authentication
 */
export const PROTECTED_ROUTES = [
  '/analytics',
  '/dashboard', 
  '/settings',
  '/onboarding',
  '/pricing',
  '/invite',
  '/admin'
]

/**
 * Public route paths that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/login',
  '/auth',
  '/'
]

/**
 * Check if a path requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if a path is public (doesn't require authentication)
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))
}
