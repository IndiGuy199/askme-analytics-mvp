/**
 * AskMe Analytics - Identity Bridge Type Definitions
 * Version: 1.2.0
 * 
 * Backend-agnostic identity bridge for client-side analytics.
 * Works with any auth system: Email+Password, SSO, Magic Link.
 */

declare global {
  interface Window {
    /**
     * AskMe Analytics Identity Bridge
     * 
     * Three-step pattern for correct identity tracking:
     * 1. preAuthMark() - Before any login attempt
     * 2. afterLoginIdentify() - After verified session
     * 3. onLogoutCleanup() - On logout
     */
    AMA: {
      /**
       * Call right before any login attempt (form submit or SSO redirect).
       * 
       * Saves the current anonymous PostHog ID to sessionStorage for later merge.
       * This ensures pre-login browsing activity is merged with the identified user.
       * 
       * @returns The pre-login PostHog distinct ID, or null if PostHog not loaded
       * 
       * @example
       * // Email+Password login
       * AMA.preAuthMark();
       * await fetch('/api/login', { method: 'POST', body: credentials });
       * 
       * @example
       * // SSO OAuth redirect
       * AMA.preAuthMark();
       * location.href = '/api/auth/google';
       * 
       * @example
       * // Magic link request
       * const preId = AMA.preAuthMark();
       * const callbackUrl = `${origin}/auth/callback?ph_id=${preId}`;
       * await sendMagicLink(email, callbackUrl);
       */
      preAuthMark: () => string | null;

      /**
       * Internal helper to retrieve the pre-login ID after authentication.
       * 
       * Checks two sources in order:
       * 1. sessionStorage.getItem('ama:pre_ph_id') - Saved by preAuthMark()
       * 2. URL parameter ?ph_id=... - For SSO/magic link flows
       * 
       * @returns The pre-login PostHog ID, or null if not found
       * 
       * @internal
       * You typically don't need to call this directly.
       * Used internally by afterLoginIdentify().
       */
      _takePreAuthId: () => string | null;

      /**
       * Call after login succeeds and you have a verified user session.
       * 
       * This function:
       * 1. Checks session guard to prevent duplicate identifies
       * 2. Retrieves pre-login ID via _takePreAuthId()
       * 3. Calls posthog.alias() to merge pre-login history
       * 4. Calls posthog.identify() with stable user ID and properties
       * 5. Optionally calls posthog.group() for company-level analytics
       * 6. Captures USER_IDENTIFIED event
       * 7. Sets session guard to prevent re-identification
       * 
       * @param user - User object with stable internal ID
       * @param user.id - Your backend's stable user identifier (UUID, integer, etc.)
       * @param user.email - User's email address (optional)
       * @param props - Additional user properties for analytics
       * @param props.company_id - Company/organization ID for group analytics
       * @param props.company_name - Company name (for group analytics)
       * @param props.company_slug - Company slug (for group analytics)
       * @param props.plan - Subscription plan name
       * @param props.role - User role/permissions
       * 
       * @example
       * // Basic usage
       * const me = await fetch('/api/me').then(r => r.json());
       * AMA.afterLoginIdentify(
       *   { id: me.id, email: me.email },
       *   { plan: me.plan }
       * );
       * 
       * @example
       * // With company context
       * AMA.afterLoginIdentify(
       *   { id: 'user_123', email: 'john@acme.com' },
       *   {
       *     company_id: 'acme',
       *     company_name: 'Acme Corp',
       *     company_slug: 'acme-corp',
       *     plan: 'enterprise',
       *     role: 'admin'
       *   }
       * );
       * 
       * @example
       * // Minimal (just ID)
       * AMA.afterLoginIdentify({ id: 'user_123' }, {});
       */
      afterLoginIdentify: (
        user: {
          /** Stable internal user ID from your backend */
          id: string;
          /** User's email address (optional) */
          email?: string;
        },
        props?: {
          /** Company/organization ID for group analytics */
          company_id?: string;
          /** Company name */
          company_name?: string;
          /** Company URL slug */
          company_slug?: string;
          /** Subscription plan (e.g., 'free', 'premium', 'enterprise') */
          plan?: string;
          /** User role (e.g., 'admin', 'member', 'viewer') */
          role?: string;
          /** Any other custom properties */
          [key: string]: any;
        }
      ) => void;

      /**
       * Call on logout to clear identification flags and reset PostHog.
       * 
       * This function:
       * 1. Removes localStorage flag: `posthog_identified_<userId>`
       * 2. Removes sessionStorage flag: `ph_ss_identified_<userId>`
       * 3. Removes sessionStorage pre-auth ID: `ama:pre_ph_id`
       * 4. Calls posthog.reset() to start new anonymous session
       * 
       * @param userId - Your internal user ID (optional but recommended)
       * 
       * @example
       * // Recommended: pass user ID
       * AMA.onLogoutCleanup(currentUser.id);
       * await fetch('/api/logout', { method: 'POST' });
       * location.href = '/login';
       * 
       * @example
       * // Fallback: without user ID
       * AMA.onLogoutCleanup(null);
       * await fetch('/api/logout', { method: 'POST' });
       * location.href = '/login';
       */
      onLogoutCleanup: (userId?: string | null) => void;
    };

    /**
     * PostHog SDK Interface (partial)
     * 
     * Reference for the PostHog methods used by AMA identity bridge.
     * See https://posthog.com/docs for full API documentation.
     */
    posthog?: {
      /**
       * Get the current distinct ID (anonymous or identified)
       */
      get_distinct_id: () => string;

      /**
       * Identify a user with a stable ID
       * @param userId - Stable user identifier
       * @param properties - User properties
       */
      identify: (userId: string, properties?: Record<string, any>) => void;

      /**
       * Alias an anonymous ID to an identified user ID
       * Merges pre-login activity with identified user
       * @param alias - The identified user ID
       * @param distinctId - The anonymous ID to merge from
       */
      alias: (alias: string, distinctId: string) => void;

      /**
       * Group users by organization/company
       * @param groupType - Group type (e.g., 'company')
       * @param groupKey - Group identifier
       * @param groupProperties - Group properties
       */
      group: (
        groupType: string,
        groupKey: string,
        groupProperties?: Record<string, any>
      ) => void;

      /**
       * Capture a custom event
       * @param eventName - Event name
       * @param properties - Event properties
       */
      capture: (eventName: string, properties?: Record<string, any>) => void;

      /**
       * Reset PostHog state (start new anonymous session)
       */
      reset: () => void;
    };
  }
}

export {};
