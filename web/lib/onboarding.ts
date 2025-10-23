import { createClient } from '@/lib/supabase/client';

export type OnboardingStep = 'company' | 'analytics' | 'completed';

export interface OnboardingStatus {
  completed: boolean;
  currentStep: OnboardingStep;
  companyId: string | null;
  hasCompany: boolean;
  hasAnalyticsSetup: boolean;
}

/**
 * Check the user's onboarding status
 * Returns the current step and completion status
 */
export async function checkOnboardingStatus(): Promise<OnboardingStatus | null> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No authenticated user:', userError);
      return null;
    }

    // Fetch user data with company information
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        company_id,
        onboarding_completed,
        onboarding_step,
        companies (
          id,
          posthog_project_id,
          posthog_client_id
        )
      `)
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching user onboarding status:', fetchError);
      return null;
    }

    const company = userData?.companies as any;
    const hasCompany = !!userData?.company_id;
    const hasAnalyticsSetup = !!(company?.posthog_project_id && company?.posthog_client_id);

    // Determine actual current step based on data
    let actualStep: OnboardingStep;
    if (!hasCompany) {
      actualStep = 'company';
    } else if (!hasAnalyticsSetup) {
      actualStep = 'analytics';
    } else {
      actualStep = 'completed';
    }

    return {
      completed: userData.onboarding_completed || actualStep === 'completed',
      currentStep: actualStep,
      companyId: userData.company_id,
      hasCompany,
      hasAnalyticsSetup,
    };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return null;
  }
}

/**
 * Update the user's onboarding step
 */
export async function updateOnboardingStep(step: OnboardingStep): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('users')
      .update({
        onboarding_step: step,
        onboarding_completed: step === 'completed',
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating onboarding step:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    return false;
  }
}

/**
 * Get the redirect path based on onboarding status
 * Returns null if onboarding is complete
 */
export function getOnboardingRedirectPath(status: OnboardingStatus): string | null {
  if (status.completed) {
    return null;
  }

  switch (status.currentStep) {
    case 'company':
      return '/onboarding/company';
    case 'analytics':
      return `/onboarding/posthog?company_id=${status.companyId}`;
    default:
      return null;
  }
}

/**
 * Check if user needs onboarding and return redirect path
 * Used in protected pages to ensure onboarding is complete
 */
export async function requireOnboardingComplete(): Promise<string | null> {
  const status = await checkOnboardingStatus();
  
  if (!status) {
    return '/login';
  }

  return getOnboardingRedirectPath(status);
}
