# Run Database Migration - Add canceled_at Column

## Step 1: Run the Migration

You need to run the migration to add the `canceled_at` column to the subscriptions table.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `database/migrations/add_canceled_at_to_subscriptions.sql`:

```sql
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN subscriptions.canceled_at IS 'Timestamp when the subscription was canceled';
```

6. Click **Run** or press `Ctrl+Enter`
7. You should see "Success. No rows returned"

### Option B: Using psql Command Line

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xbmarhenqwlupmhglpoy.supabase.co:5432/postgres" -f database/migrations/add_canceled_at_to_subscriptions.sql
```

## Step 2: Verify the Column Was Added

Run this query in the SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name = 'canceled_at';
```

You should see:
```
column_name  | data_type
-------------+---------------------------
canceled_at  | timestamp with time zone
```

## Step 3: Restart Dev Server

```powershell
cd web
npm run dev
```

## What This Fixes

- ✅ Removes the error: "Could not find the 'canceled_at' column"
- ✅ Allows proper tracking of when subscriptions are canceled
- ✅ Webhooks can now successfully cancel old subscriptions before creating new ones

## Next Steps

After running the migration:
1. Make a new test payment
2. Verify subscription is created/updated
3. Verify payment is recorded in payment_transactions table
4. Check for any remaining errors
