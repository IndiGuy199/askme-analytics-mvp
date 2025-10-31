-- Fix missing user record for rdvns199@gmail.com
-- This user exists in auth.users but not in public.users

-- First, check if the user exists in auth
SELECT 
  au.id,
  au.email,
  au.created_at,
  pu.id as public_user_exists
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'rdvns199@gmail.com';

-- If public_user_exists is NULL, run this INSERT:
INSERT INTO public.users (id, email, name, role, onboarding_completed, onboarding_step, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  'member',
  false,
  'company',
  true
FROM auth.users au
WHERE au.email = 'rdvns199@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = au.id);

-- Verify the user was created
SELECT * FROM public.users WHERE email = 'rdvns199@gmail.com';
