-- Fix missing user record for rdvns199@gmail.com
-- This user completed onboarding and created company 'askmeAnalytics' 
-- but has no user record because they signed up before the trigger was fixed

-- Step 1: Find the auth.users record and the company
SELECT 
  au.id as auth_user_id,
  au.email,
  c.id as company_id,
  c.name as company_name
FROM auth.users au
CROSS JOIN companies c
WHERE au.email = 'rdvns199@gmail.com'
  AND c.name = 'askmeAnalytics';

-- Step 2: Create the user record and link to the company
-- (This will only insert if the user doesn't already exist)
INSERT INTO public.users (
  id, 
  email, 
  name, 
  company_id, 
  role, 
  onboarding_completed, 
  onboarding_step,
  terms_accepted_at,
  terms_version,
  consent_ip_address,
  is_active
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'User'),
  c.id, -- Link to the askmeAnalytics company
  'owner', -- First user is owner
  true, -- They completed onboarding
  'completed',
  NOW(), -- They accepted terms during onboarding
  '1.0',
  'onboarding-fix',
  true
FROM auth.users au
CROSS JOIN companies c
WHERE au.email = 'rdvns199@gmail.com'
  AND c.name = 'askmeAnalytics'
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = au.id
  );

-- Step 3: Verify the user was created and linked
SELECT 
  u.id,
  u.email,
  u.name,
  u.company_id,
  u.role,
  u.onboarding_completed,
  c.name as company_name,
  c.posthog_project_id,
  c.posthog_client_id
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.email = 'rdvns199@gmail.com';
