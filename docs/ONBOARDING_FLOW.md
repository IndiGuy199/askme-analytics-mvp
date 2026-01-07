# Onboarding Flow Documentation

## Overview

The onboarding system tracks user progress through a multi-step setup process and allows users to resume where they left off if they navigate away mid-setup.

## Database Schema

### Users Table - New Fields

```sql
onboarding_completed BOOLEAN DEFAULT false
onboarding_step VARCHAR(50) DEFAULT 'company'
```

**Possible values for `onboarding_step`:**
- `'company'` - User needs to create/configure company
- `'analytics'` - User needs to set up PostHog analytics
- `'completed'` - Onboarding fully complete

## Onboarding Steps

### Step 1: Company Setup (`/onboarding/company`)

**What happens:**
1. User enters company information (name, domain, billing email)
2. Company record is created in database
3. User's `company_id` is set
4. User's `onboarding_step` is set to `'analytics'`
5. Premium trial is started automatically
6. User is redirected to Step 2 with `company_id` in URL

**Database updates:**
```sql
UPDATE users SET 
  company_id = <new_company_id>,
  role = 'owner',
  onboarding_step = 'analytics',
  onboarding_completed = false
WHERE id = <user_id>;
```

### Step 2: Analytics Setup (`/onboarding/posthog`)

**What happens:**
1. Form pre-fills with existing PostHog credentials (Project ID, API Key)
2. User enters Client ID for multi-tenant filtering
3. Company record is updated with analytics configuration
4. User's `onboarding_step` is set to `'completed'`
5. User's `onboarding_completed` flag is set to `true`
6. User is redirected to analytics dashboard

**Database updates:**
```sql
UPDATE companies SET
  posthog_project_id = <project_id>,
  posthog_api_key_encrypted = <api_key>,
  posthog_client_id = <client_id>
WHERE id = <company_id>;

UPDATE users SET
  onboarding_step = 'completed',
  onboarding_completed = true
WHERE id = <user_id>;
```

## Resume Functionality

### How It Works

When a user logs in or navigates to a protected page, the system:

1. **Checks onboarding status** using `checkOnboardingStatus()`
2. **Determines current step** based on database state:
   - No company? → Step 1 (company)
   - Has company but no analytics? → Step 2 (analytics)
   - Has both? → Completed
3. **Redirects to appropriate step** if not complete

### Protected Pages

The following pages check onboarding and redirect if incomplete:

- `/analytics` - Analytics dashboard
- `/dashboard` - Main dashboard
- `/custom-analytics` - Custom funnel analytics

### Auto-Redirect on Login

The login page (`/login`) checks if user is already authenticated:

- **If logged in AND onboarding incomplete:** Redirects to resume step
- **If logged in AND onboarding complete:** Redirects to dashboard
- **If not logged in:** Shows login form

## Utility Functions

### `checkOnboardingStatus()`

**Location:** `lib/onboarding.ts`

**Returns:**
```typescript
{
  completed: boolean,
  currentStep: 'company' | 'analytics' | 'completed',
  companyId: string | null,
  hasCompany: boolean,
  hasAnalyticsSetup: boolean
}
```

**Usage:**
```typescript
import { checkOnboardingStatus } from '@/lib/onboarding';

const status = await checkOnboardingStatus();
if (!status.completed) {
  console.log('User needs to complete:', status.currentStep);
}
```

### `updateOnboardingStep(step)`

**Location:** `lib/onboarding.ts`

**Usage:**
```typescript
import { updateOnboardingStep } from '@/lib/onboarding';

await updateOnboardingStep('analytics'); // or 'completed'
```

### `requireOnboardingComplete()`

**Location:** `lib/onboarding.ts`

**Returns:** `string | null`
- Returns redirect path if onboarding incomplete
- Returns `null` if onboarding is complete

**Usage:**
```typescript
import { requireOnboardingComplete } from '@/lib/onboarding';

const redirectPath = await requireOnboardingComplete();
if (redirectPath) {
  router.push(redirectPath);
  return;
}
// Continue with page logic...
```

### `getOnboardingRedirectPath(status)`

**Location:** `lib/onboarding.ts`

**Usage:**
```typescript
import { getOnboardingRedirectPath } from '@/lib/onboarding';

const path = getOnboardingRedirectPath(status);
// Returns: '/onboarding/company' or '/onboarding/posthog?company_id=...'
```

## Migration

To add onboarding tracking to existing database:

```bash
# Run this migration
psql -f database/migrations/add_onboarding_tracking.sql
```

**What it does:**
- Adds `onboarding_completed` and `onboarding_step` columns
- Creates index for fast lookup
- Marks existing users with complete setup as completed
- New users default to `onboarding_step = 'company'`

## User Experience Flow

### New User Journey

1. **Sign up** → Receives magic link email
2. **Click magic link** → Lands on `/onboarding/company` (Step 1)
3. **Fill company info** → Auto-advances to `/onboarding/posthog` (Step 2)
4. **Configure analytics** → Redirects to `/analytics` dashboard
5. **Onboarding complete** ✓

### Interrupted Journey (User Leaves Mid-Setup)

**Scenario 1: Leaves after Step 1**
1. User completes company setup
2. User closes browser before finishing Step 2
3. User returns and logs in
4. System detects `onboarding_step = 'analytics'`
5. User is redirected to `/onboarding/posthog?company_id=<their_company>`
6. Form pre-fills with existing data
7. User completes setup

**Scenario 2: Hasn't Started**
1. User receives magic link but never completes onboarding
2. User logs in later
3. System detects `onboarding_step = 'company'`
4. User is redirected to `/onboarding/company`
5. User starts from beginning

## Testing Scenarios

### Test 1: Fresh User
```
1. Create new account
2. Verify redirect to /onboarding/company
3. Complete Step 1
4. Verify redirect to /onboarding/posthog with company_id
5. Complete Step 2
6. Verify redirect to /analytics
7. Verify onboarding_completed = true in DB
```

### Test 2: Resume After Step 1
```
1. Start onboarding, complete Step 1 only
2. Manually navigate to /dashboard
3. Verify redirect to /onboarding/posthog
4. Complete Step 2
5. Verify access to all pages
```

### Test 3: Already Completed
```
1. Log in with completed account
2. Verify no redirects
3. Verify access to /dashboard and /analytics
```

### Test 4: Re-login
```
1. Log in with incomplete onboarding
2. Verify redirect to correct step
3. Verify form pre-fills with existing data
```

## Debugging

### Console Logs

The system includes helpful debug logs:

```javascript
// Step 2 page
'🔍 Onboarding Step 2 - Checking user and company...'
'📋 Company ID from URL: abc-123'
'✅ Pre-filling form with company data: { hasProjectId: true, ... }'

// Protected pages
'⚠️ Onboarding not complete, redirecting to: /onboarding/company'
```

### Common Issues

**Issue:** User stuck in redirect loop
- **Check:** Verify `onboarding_step` matches actual data state
- **Fix:** Manually update in database or check for RLS policy issues

**Issue:** Form fields not pre-filling
- **Check:** Console logs for API errors
- **Fix:** Verify `company_id` is in URL params or user record

**Issue:** "Not tied to company" error
- **Check:** User's `company_id` field in database
- **Fix:** Ensure Step 1 properly updates user record

## Best Practices

1. **Always pass `company_id` in URL** when navigating between onboarding steps
2. **Check onboarding status** on all protected pages
3. **Pre-fill forms** with existing data to avoid data loss
4. **Add delays** (500ms) after database updates before navigation
5. **Log extensively** during onboarding for debugging
6. **Handle errors gracefully** - allow retry without data loss

## Future Enhancements

- [ ] Add "Save as draft" functionality
- [ ] Email reminder for incomplete onboarding
- [ ] Admin panel to view/manage user onboarding status
- [ ] Analytics on onboarding drop-off points
- [ ] Optional onboarding steps (e.g., team invites)
- [ ] Onboarding progress percentage indicator
