-- Fix user creation trigger to include consent/terms fields
-- This ensures new signups have all required fields populated

-- First, check the current trigger function
-- SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Drop and recreate the function with consent fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    onboarding_completed,
    onboarding_step,
    is_active,
    terms_accepted_at,
    terms_version,
    consent_ip_address
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'member',
    false,
    'company',
    true,
    NULL, -- Will be set when user accepts terms in onboarding
    NULL,
    NULL
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Failed to create user record for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is enabled
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, authenticated, service_role;

-- Fix existing users without terms fields (set NULL explicitly)
UPDATE public.users
SET 
  terms_accepted_at = NULL,
  terms_version = NULL,
  consent_ip_address = NULL
WHERE terms_accepted_at IS NULL 
  AND terms_version IS NULL 
  AND consent_ip_address IS NULL;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a public.users record when a new auth.users record is inserted. Includes error handling to prevent auth failures.';
