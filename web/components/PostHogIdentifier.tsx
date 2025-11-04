'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * PostHogIdentifier Component
 * 
 * Automatically identifies authenticated users in PostHog on every page load.
 * This ensures proper user tracking even if they skip email fields during onboarding.
 * 
 * Usage: Add once in your root layout or protected pages layout
 * <PostHogIdentifier />
 */
export default function PostHogIdentifier() {
  useEffect(() => {
    const identifyUser = async () => {
      try {
        // Wait for PostHog to be fully loaded and ready
        if (!window.posthog || typeof window.posthog.identify !== 'function') {
          console.debug('[PostHogIdentifier] PostHog not yet loaded, retrying...');
          setTimeout(identifyUser, 500);
          return;
        }

        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          console.debug('[PostHogIdentifier] No authenticated user');
          return;
        }

        // Check if we've already identified this user globally in localStorage
        const localStorageKey = `posthog_identified_${user.id}`;
        const alreadyIdentifiedUserId = localStorage.getItem(localStorageKey);

        if (alreadyIdentifiedUserId === user.id) {
          console.debug('[PostHogIdentifier] User already identified globally');
          return;
        }

        // Update localStorage key to the current user ID
        localStorage.setItem(localStorageKey, user.id);

        // Fetch user details from database
        const { data: userData } = await supabase
          .from('users')
          .select(`
            id,
            email,
            company_id,
            companies (
              id,
              name,
              slug
            )
          `)
          .eq('id', user.id)
          .single();

        // Build identification properties
        const identifyProps: Record<string, any> = {
          email: user.email,
          user_id: user.id,
          created_at: user.created_at
        };

        // Add company information if available
        if (userData?.companies && userData.companies.length > 0) {
          identifyProps.company_id = userData.companies[0].id;
          identifyProps.company_name = userData.companies[0].name;
          identifyProps.company_slug = userData.companies[0].slug;
        }

        // Add user metadata if available
        if (user.user_metadata) {
          if (user.user_metadata.full_name) {
            identifyProps.name = user.user_metadata.full_name;
          }
          if (user.user_metadata.impersonation) {
            identifyProps.is_impersonating = true;
            identifyProps.impersonation_target = user.user_metadata.impersonation.target_company_id;
          }
        }

        // Identify user in PostHog with error handling
        try {
          window.posthog.identify(user.id, identifyProps);

          // Track identification event for debugging
          window.posthog.capture('USER_IDENTIFIED', {
            identification_method: 'auto',
            page: window.location.pathname
          });

          console.log('[PostHogIdentifier] ✅ User identified:', {
            user_id: user.id,
            email: user.email,
            company: userData?.companies && userData.companies.length > 0 ? userData.companies[0].name : null
          });
        } catch (identifyError) {
          console.error('[PostHogIdentifier] Error during identify call:', identifyError);
        }

      } catch (error) {
        console.error('[PostHogIdentifier] Error identifying user:', error);
      }
    };

    // Wait a bit longer for PostHog to fully initialize
    const timer = setTimeout(identifyUser, 2000);

    return () => clearTimeout(timer);
  }, []); // Run once on mount

  // This component doesn't render anything
  return null;
}

// Note: Window.posthog types are defined globally in lib/clientAnalytics/types/ama.d.ts
