# Signup Flow Fix - Critical Issues Resolved

## Problems Identified

1. ❌ **PostHog credentials not persisting** - The onboarding form was initializing with empty Project ID and API Key
2. ❌ **Users not inserted in users table** - The database trigger to auto-create user records was missing
3. ❌ **"Company not found" errors** - Related to missing user records and PostHog configuration

## Fixes Applied

### 1. PostHog Default Credentials (COMPLETED ✅)
**File:** `web/app/onboarding/posthog/page.tsx`

**Changes:**
- Form now initializes with default PostHog credentials:
  - **Project ID**: 202299
  - **Personal API Key**: phx_tmki9RqkURHkZJxHnFErIij6C8zcnStWQ4HajDA51GY1QFY
- These defaults are preserved unless overridden by existing company data
- Fields remain disabled (managed by admin) but now have proper default values

**Why this fixes the issue:**
- Previously, disabled fields had empty strings, causing the database UPDATE to set `NULL` values
- Now, the form always has valid credentials that get saved during signup

### 2. User Auto-Creation Trigger (NEEDS DATABASE MIGRATION ⚠️)
**File:** `database/migrations/create_user_trigger.sql` (CREATED)

**What it does:**
- Automatically creates a `public.users` record when a new `auth.users` record is inserted
- Sets initial onboarding state (`onboarding_completed: false`, `onboarding_step: 'company'`)
- Uses email from Supabase Auth and sets default role to 'member'

**Why this was the problem:**
- When users signed up, Supabase Auth created a record in `auth.users` (internal table)
- But nothing was creating the corresponding record in `public.users` (application table)
- This caused "user not found" and "company not found" errors

## Migration Required - IMPORTANT! 🚨

You **MUST** run this SQL migration in Supabase before testing:

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Migration
Copy and paste the contents of:
```
database/migrations/create_user_trigger.sql
```

Or run this directly:

```sql
-- Migration: Auto-create user records when someone signs up via Supabase Auth

-- Function to handle new user creation
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
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'member',
    false,
    'company',
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to fire when new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, authenticated, service_role;
```

### Step 3: Verify the Migration
Run this query to verify the trigger was created:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Expected result:** Should return 1 row showing the trigger exists.

### Step 4: Check Existing Auth Users
If you have existing auth users without user records, run this to create them:

```sql
-- Find auth users without public.users records
INSERT INTO public.users (id, email, name, role, onboarding_completed, onboarding_step, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  'member',
  CASE 
    WHEN EXISTS (SELECT 1 FROM companies WHERE id IN (SELECT company_id FROM users WHERE id = au.id)) 
    THEN true 
    ELSE false 
  END,
  CASE 
    WHEN EXISTS (SELECT 1 FROM companies WHERE id IN (SELECT company_id FROM users WHERE id = au.id)) 
    THEN 'completed' 
    ELSE 'company' 
  END,
  true
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

## Testing Instructions

### Test 1: Fresh Signup (Use Incognito/Private Window)

1. **Go to signup page**: http://localhost:3000/login
2. **Enter new email** and request magic link
3. **Check email** and click the magic link
4. **Should redirect to**: `/onboarding/company`

**Expected in browser console:**
```
✅ Created new user record: <user_id>
```

5. **Complete Step 1 (Company)**:
   - Enter company name
   - Fill in required fields
   - Click "Continue"

**Expected in browser console:**
```
📝 Step 1: Creating company for user: <user_id>
✅ Company created: <company_id>
✅ User updated with company_id
✅ Trial started
```

6. **Should redirect to**: `/onboarding/posthog?company_id=<id>`

7. **Verify Step 2 (Analytics)**:
   - Project ID should show: 202299
   - API Key should show: phx_... (masked)
   - **Only Client ID should be editable**

8. **Enter Client ID**: e.g., `my-company-123`
9. **Click "Complete Setup"**

**Expected in browser console:**
```
📝 Step 2: Updating analytics for company: <company_id>
✅ Company analytics updated
✅ User onboarding marked complete
```

10. **Should redirect to**: `/analytics?welcome=true`
11. **Verify analytics page loads** without errors

### Test 2: Verify Database

After signup, run this in Supabase SQL Editor:

```sql
-- Check the user record
SELECT 
  u.id,
  u.email,
  u.company_id,
  u.role,
  u.onboarding_completed,
  u.onboarding_step,
  c.name as company_name,
  c.posthog_project_id,
  c.posthog_client_id,
  LENGTH(c.posthog_api_key_encrypted) as api_key_length
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.email = 'your-test-email@example.com';
```

**Expected results:**
- ✅ User record EXISTS
- ✅ `company_id` is populated (UUID)
- ✅ `role` = 'owner' (first user of company)
- ✅ `onboarding_completed` = true
- ✅ `onboarding_step` = 'completed'
- ✅ `company_name` matches what you entered
- ✅ `posthog_project_id` = 202299
- ✅ `posthog_client_id` matches what you entered
- ✅ `api_key_length` > 0 (should be ~50 characters)

### Test 3: Analytics Access

1. Navigate to: http://localhost:3000/analytics
2. **Should NOT see**: "Company not found" error
3. **Should see**: Loading indicators, then analytics dashboard
4. **Check browser console**: Should see PostHog API calls being made

## Debugging

### If User Still Not Created

**Check 1: Trigger exists**
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

**Check 2: Function exists**
```sql
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

**Check 3: Count users**
```sql
-- Count auth users
SELECT 'auth.users' as table_name, COUNT(*) FROM auth.users
UNION ALL
-- Count public users
SELECT 'public.users', COUNT(*) FROM public.users;
```

### If PostHog Credentials Not Saved

**Check the company record:**
```sql
SELECT 
  id,
  name,
  slug,
  posthog_project_id,
  posthog_client_id,
  LENGTH(posthog_api_key_encrypted) as key_length,
  created_at,
  updated_at
FROM companies
ORDER BY created_at DESC
LIMIT 5;
```

If `posthog_project_id` is NULL or key_length is 0:
- Check browser console for form validation errors
- Verify the form shows 202299 in Project ID field
- Verify the API Key field is not empty

### If "Company Not Found" Error Persists

**Check RLS policies:**
```sql
-- Users should be able to read their own company
SELECT * FROM pg_policies WHERE tablename = 'companies';
```

**Test company access manually:**
```sql
-- Replace with your user's email
SELECT 
  u.id as user_id,
  c.id as company_id,
  c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.email = 'your-email@example.com';
```

## Summary of Changes

| File | Change | Status |
|------|--------|--------|
| `web/app/onboarding/posthog/page.tsx` | Set default PostHog credentials (202299, phx_...) | ✅ DONE |
| `database/migrations/create_user_trigger.sql` | Created auto-user trigger migration | ✅ CREATED |
| Migration in Supabase | Run SQL to create trigger | ⚠️ **REQUIRED** |

## Next Steps

1. ⚠️ **Run the migration** in Supabase SQL Editor (see Step 2 above)
2. ✅ Test fresh signup flow (incognito window)
3. ✅ Verify database records created correctly
4. ✅ Test analytics page access
5. 🎉 Signup should now work end-to-end!

## Rollback (If Needed)

If you need to undo these changes:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove function
DROP FUNCTION IF EXISTS public.handle_new_user();
```

And revert `web/app/onboarding/posthog/page.tsx`:
```typescript
const [formData, setFormData] = useState({
  posthog_project_id: '', // Back to empty
  posthog_api_key: '', // Back to empty
  posthog_client_id: ''
})
```
