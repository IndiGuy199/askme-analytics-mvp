# Fixing User Record Creation Issue

## Problem
Users completing onboarding have no record in the `users` table, causing "account not tied to a company" errors.

## Root Cause
Two issues:
1. **Missing trigger**: No automatic user record creation when someone signs up via Supabase Auth
2. **Missing fields**: Auth callback wasn't setting `onboarding_completed` and `onboarding_step` fields

## Solution - Run These Migrations

### Step 1: Add Onboarding Tracking Fields
```bash
# Run in Supabase SQL Editor
```
File: `database/migrations/add_onboarding_tracking.sql`

This adds:
- `onboarding_completed` (boolean)
- `onboarding_step` (varchar)

### Step 2: Create Auto-User Trigger
```bash
# Run in Supabase SQL Editor
```
File: `database/migrations/create_user_trigger.sql`

This creates:
- `handle_new_user()` function that auto-creates user records
- Trigger on `auth.users` that fires on INSERT
- Automatically sets initial onboarding state

## Code Changes Made

### 1. Auth Callback (`app/auth/callback/route.ts`)
✅ Now sets `onboarding_completed = false` and `onboarding_step = 'company'` when creating user
✅ Better redirect logic based on actual onboarding state
✅ Added logging for debugging

### 2. Company Page (`app/onboarding/company/page.tsx`)
✅ Sets `onboarding_step = 'analytics'` after company creation
✅ Added comprehensive logging
✅ Better error messages

### 3. PostHog Page (`app/onboarding/posthog/page.tsx`)
✅ Sets `onboarding_step = 'completed'` and `onboarding_completed = true`
✅ Verifies user record was updated
✅ Added comprehensive logging

## Testing Instructions

### Test 1: Fresh Signup
1. **Clear browser data** (or use incognito)
2. Sign up with new email
3. **Check console** - should see:
   ```
   ✅ Created new user record: <user_id>
   ```
4. Complete Step 1 (Company) - should see:
   ```
   📝 Step 1: Creating company for user: <user_id>
   ✅ Company created: <company_id>
   ✅ User updated with company_id
   ✅ Trial started, navigating to step 2...
   ```
5. Complete Step 2 (Analytics) - should see:
   ```
   📝 Step 2: Updating analytics for company: <company_id>
   ✅ Company analytics updated
   ✅ User onboarding marked complete
   ✅ User record verified: { ... onboarding_completed: true }
   ✅ Onboarding complete! Redirecting to analytics...
   ```

### Test 2: Verify Database
After completing onboarding, run this query in Supabase SQL Editor:

```sql
SELECT 
  u.id,
  u.email,
  u.company_id,
  u.onboarding_completed,
  u.onboarding_step,
  u.created_at,
  c.name as company_name,
  c.posthog_client_id
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY u.created_at DESC
LIMIT 5;
```

**Expected result:**
- User record EXISTS ✅
- `company_id` is populated ✅
- `onboarding_completed` = true ✅
- `onboarding_step` = 'completed' ✅
- Company has `posthog_client_id` ✅

### Test 3: Resume Functionality
1. Sign up and complete Step 1 only
2. Close browser (or navigate away)
3. Log back in
4. **Should automatically resume at Step 2** ✅
5. Form should pre-fill with Project ID and API Key ✅

## Debugging

### If User Record Not Created

**Check 1: Trigger exists**
```sql
SELECT * FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

**Check 2: Function exists**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

**Check 3: Auth users vs public users**
```sql
-- Count auth users
SELECT COUNT(*) FROM auth.users;

-- Count public users
SELECT COUNT(*) FROM public.users;

-- They should match (or public should be equal or greater)
```

### If Update Failing

**Check RLS policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

**Check permissions:**
```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='users';
```

### Common Console Errors

**Error:** "Not authenticated"
- **Solution**: User session expired, need to re-login

**Error:** "User update failed"
- **Solution**: Check RLS policies allow authenticated users to update their own record

**Error:** "Company not found"
- **Solution**: company_id in URL is invalid or missing

## Migration Checklist

- [ ] Run `add_onboarding_tracking.sql` in Supabase SQL Editor
- [ ] Run `create_user_trigger.sql` in Supabase SQL Editor
- [ ] Verify trigger created: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
- [ ] Test fresh signup - check browser console for logs
- [ ] Verify user record created in database
- [ ] Test complete onboarding flow
- [ ] Test resume functionality
- [ ] Check existing users marked as completed (if they have companies)

## Rollback (If Needed)

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Remove columns (careful - this deletes data!)
ALTER TABLE users 
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS onboarding_step;
```

## Next Steps After Migration

1. Monitor Supabase logs for any auth errors
2. Check user creation rate vs auth user rate (should match)
3. Verify onboarding completion rate increases
4. Consider adding analytics to track drop-off points
