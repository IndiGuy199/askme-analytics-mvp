# URGENT: Run This Migration First!

## ❌ Problem
The webhook is returning 500 error because the `payment_transactions` table doesn't exist in your database yet!

## ✅ Solution: Run the Migration

### Step 1: Go to Supabase SQL Editor
https://supabase.com/dashboard/project/xbmarhenqwlupmhglpoy/sql/new

### Step 2: Copy the SQL Migration
The SQL is in: `database/migrations/create_payment_transactions.sql`

Or copy from here:
```sql
-- See the file: database/migrations/create_payment_transactions.sql
```

### Step 3: Paste and Execute
1. Paste the entire SQL into the Supabase SQL Editor
2. Click "Run" button
3. You should see success message

### Step 4: Verify Table Was Created
Run this query:
```sql
SELECT * FROM payment_transactions LIMIT 1;
```

Should return empty result (no rows), meaning table exists!

---

## After Migration: Test Again

Once the table is created:

1. **Make a new test payment:**
   - Go to http://localhost:3000/pricing
   - Subscribe with test card `4242 4242 4242 4242`

2. **Watch your terminals:**
   - `stripe listen` terminal will show events
   - `npm run dev` terminal will show webhook processing
   - Should see: `✅ Payment transaction recorded`

3. **Check database:**
   ```sql
   SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM subscriptions WHERE status = 'active';
   ```

The payment will be recorded this time! 🎉
