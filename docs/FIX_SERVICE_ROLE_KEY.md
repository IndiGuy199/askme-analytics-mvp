# Fix Service Role Key

## Problem
The `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` has a typo in the JWT payload:
- Current: `"rose": "service_role"` ❌
- Should be: `"role": "service_role"` ✅

This causes the "Invalid API key" error in webhooks.

## Solution

### Step 1: Get the Correct Service Role Key

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `xbmarhenqwlupmhglpoy`
3. Go to **Settings** → **API**
4. Find the **service_role** key (NOT the anon key)
5. Copy the full key starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 2: Update .env.local

Replace line 10 in `web/.env.local`:

```bash
# OLD (has typo "rose")
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibWFyaGVucXdsdXBtaGdscG95Iiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQzNTQxNSwiZXhwIjoyMDczMDExNDE1fQ.7eLxRlmuCYeTrQwbbz2W9VG6-dm6-hqizONqw6Gi2hU

# NEW (correct key from Supabase dashboard)
SUPABASE_SERVICE_ROLE_KEY=<paste_your_correct_key_here>
```

### Step 3: Restart Dev Server

```powershell
cd web
npm run dev
```

### Step 4: Test Payment Again

Make another test payment in Stripe and verify:
- ✅ Subscription created in database
- ✅ Payment recorded in payment_transactions table
- ✅ No "Invalid API key" errors
- ✅ No date conversion errors

## Why Service Role Key is Needed

Webhooks come from Stripe servers (not authenticated users), so they need the **service role key** which bypasses Row Level Security (RLS) policies. The anon key would be blocked by RLS.

## Verification

After fixing, you should see in the terminal:
```
✅ Subscription created/updated in database: sub_xxxxx
✅ Subscription updated in database: sub_xxxxx
💰 Payment succeeded and recorded: pi_xxxxx
```

No more errors! 🎉
