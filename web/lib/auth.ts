/**
 * Authentication utilities for the SaaS application
 */

// Re-export all utilities from auth-utils
export {
  canImpersonate,
  isOwnerOrAdmin,
  canManageBilling,
  canManageTeam,
  getRedirectUrl,
  getAuthRedirectPath,
  shouldShowOnboarding,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  isProtectedRoute,
  isPublicRoute
} from './auth-utils'

