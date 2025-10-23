# Stripe Payment Testing Guide

## Overview
This guide will help you set up and test Stripe payments locally with full transaction recording.

---

## 🎯 Prerequisites

1. **Stripe Account** (Test Mode)
   - Already have test API keys in `.env.local`
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: `pk_test_...`
   - STRIPE_SECRET_KEY: `sk_test_...`

2. **Database Migration**
   - Run the payment_transactions table migration first

---

## 📋 Step 1: Fix Environment Variables

Your current `.env.local` has **Product IDs** instead of **Price IDs**. You need to update these:

### Current (INCORRECT):
```bash
STRIPE_PRICE_BASIC_MONTHLY=prod_THgU2F8dkGh9p9
STRIPE_PRICE_BASIC_YEARLY=prod_THgWtMwnNY6yUe
```

### Steps to Get Correct Price IDs:

1. **Go to Stripe Dashboard** (Test Mode)
   - https://dashboard.stripe.com/test/products

2. **Create Products & Prices:**

   **Basic Monthly:**
   - Product Name: "Basic Plan"
   - Price: $29.00 USD (or your price)
   - Billing Period: Monthly
   - Copy the Price ID (starts with `price_...`)

   **Basic Yearly:**
   - Same product as above
   - Add new price: $290.00 USD (or your price)
   - Billing Period: Yearly
   - Copy the Price ID (starts with `price_...`)

3. **Update `.env.local`:**
```bash
STRIPE_PRICE_BASIC_MONTHLY=price_1ABC...xyz123  # Replace with your actual price ID
STRIPE_PRICE_BASIC_YEARLY=price_1XYZ...abc456   # Replace with your actual price ID
```

4. **Restart your dev server** after updating env variables

---

## 🔧 Step 2: Run Database Migration

Run the payment transactions migration to create the table:

```bash
# Connect to your Supabase database and run:
psql -h db.xbmarhenqwlupmhglpoy.supabase.co -U postgres -d postgres < database/migrations/create_payment_transactions.sql
```

Or use Supabase SQL Editor:
1. Go to https://supabase.com/dashboard/project/xbmarhenqwlupmhglpoy/sql
2. Copy the contents of `database/migrations/create_payment_transactions.sql`
3. Paste and execute

**Verify the table was created:**
```sql
SELECT * FROM payment_transactions;
-- Should return empty result (no rows yet)
```

---

## 🎧 Step 3: Set Up Stripe CLI for Local Webhooks

The Stripe CLI forwards webhook events to your local server during testing.

### Install Stripe CLI:

**Windows (PowerShell):**
```powershell
# Download from https://github.com/stripe/stripe-cli/releases/latest
# Or use Scoop:
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Mac/Linux:**
```bash
# Mac (Homebrew)
brew install stripe/stripe-cli/stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases/latest
```

### Login to Stripe CLI:
```bash
stripe login
# This will open browser to authenticate
```

### Forward Webhooks to Local Server:
```bash
# Make sure your Next.js dev server is running on port 3000
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**You'll see output like:**
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef...
```

### Update `.env.local` with the NEW webhook secret:
```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...  # Use the secret from stripe listen command
```

**Important:** Keep the `stripe listen` command running in a separate terminal while testing!

---

## 💳 Step 4: Test Payment Flow

Now you're ready to test payments!

### 4.1 Start Your Servers:

**Terminal 1 - Next.js Dev Server:**
```powershell
cd web
npm run dev
```

**Terminal 2 - Stripe CLI (Webhook Forwarding):**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 4.2 Test a Payment:

1. **Go to Pricing Page:**
   - http://localhost:3000/pricing

2. **Click "Subscribe" on Basic Plan (Monthly or Yearly)**

3. **You'll be redirected to Stripe Checkout**

4. **Use Test Card:**
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/34)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```

5. **Complete Payment**

### 4.3 Watch the Webhooks:

In Terminal 2 (Stripe CLI), you should see:
```
  --> checkout.session.completed [evt_1ABC...]
  --> invoice.payment_succeeded [evt_1XYZ...]
  --> customer.subscription.created [evt_1DEF...]
```

In Terminal 1 (Dev Server), you should see console logs:
```
🔔 Webhook received: checkout.session.completed
💳 Checkout completed: { sessionId: '...', companyId: '...', planId: 'basic' }
✅ Subscription created/updated in database
✅ Payment transaction recorded
```

### 4.4 Verify in Database:

Check that the payment was recorded:

```sql
-- View payment transactions
SELECT 
    id,
    company_id,
    amount,
    currency,
    status,
    stripe_invoice_id,
    paid_at,
    created_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 5;

-- View successful payments with company details
SELECT * FROM successful_payments;

-- Check subscription status
SELECT 
    company_id,
    plan_id,
    status,
    stripe_subscription_id,
    current_period_end
FROM subscriptions
WHERE status = 'active';
```

---

## 🧪 Step 5: Test Different Scenarios

### Test Successful Payment:
```
Card: 4242 4242 4242 4242
Result: Payment succeeds, subscription becomes active
```

### Test Payment Declined:
```
Card: 4000 0000 0000 0002
Result: Payment fails, no subscription created
```

### Test Card Requires Authentication (3D Secure):
```
Card: 4000 0025 0000 3155
Result: Modal appears for authentication
```

### Test Expired Card:
```
Card: 4000 0000 0000 0069
Result: Payment fails with expired card error
```

### Test Insufficient Funds:
```
Card: 4000 0000 0000 9995
Result: Payment fails with insufficient funds
```

See full list: https://stripe.com/docs/testing#cards

---

## 🔍 Step 6: Monitor & Verify

### Check Stripe Dashboard:
1. Go to https://dashboard.stripe.com/test/payments
2. See all test payments
3. View customer details
4. Check subscription status

### Check Your Database:
```sql
-- All payment transactions (audit trail)
SELECT 
    pt.*,
    c.name as company_name
FROM payment_transactions pt
JOIN companies c ON c.id = pt.company_id
ORDER BY pt.created_at DESC;

-- Payment summary by company
SELECT 
    c.name as company_name,
    COUNT(*) as total_payments,
    SUM(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN pt.status = 'failed' THEN 1 ELSE 0 END) as failed_payments
FROM payment_transactions pt
JOIN companies c ON c.id = pt.company_id
GROUP BY c.id, c.name;
```

---

## 📊 What Gets Recorded

Every payment transaction records:

✅ **Payment Details:**
- Amount, currency, status
- Stripe IDs (payment intent, charge, invoice)
- Payment method type

✅ **Proof of Payment:**
- Receipt URL (customer can view)
- Invoice PDF URL
- Paid timestamp

✅ **Audit Trail:**
- Created/updated timestamps
- Status changes (succeeded → refunded)
- Metadata (billing period, invoice number)

✅ **Company Linkage:**
- Links to company and subscription
- Enables revenue reporting
- Supports refunds and disputes

---

## 🚨 Common Issues & Fixes

### Issue: Webhook not receiving events
**Solution:**
- Ensure `stripe listen` is running
- Check webhook secret matches in `.env.local`
- Restart dev server after changing env variables
- Check Terminal 2 for webhook events

### Issue: Payment succeeds but not recorded in DB
**Solution:**
- Check webhook handler logs in Terminal 1
- Verify payment_transactions table exists
- Check RLS policies allow service role to insert
- Look for errors in webhook handler

### Issue: "Invalid price ID" error
**Solution:**
- Replace `prod_*` with `price_*` IDs from Stripe Dashboard
- Ensure prices exist in Stripe test mode
- Restart dev server after updating `.env.local`

### Issue: Company ID not found in webhook
**Solution:**
- Ensure checkout session includes company_id in metadata
- Check that user is authenticated before checkout
- Verify company exists in database

---

## 🎉 Step 7: Deploy to Production

When ready for production:

1. **Switch to Live Mode in Stripe Dashboard**
2. **Get Live API Keys:**
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   ```

3. **Create Production Webhook:**
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: Select all or specific events:
     - checkout.session.completed
     - invoice.payment_succeeded
     - invoice.payment_failed
     - customer.subscription.updated
     - customer.subscription.deleted
     - charge.refunded
   - Copy webhook signing secret
   
4. **Update Production Environment Variables:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_live_...  # From webhook endpoint
   ```

5. **Test with Real Card** (use small amount first!)

---

## 📞 Support

- **Stripe Docs:** https://stripe.com/docs
- **Stripe Test Cards:** https://stripe.com/docs/testing
- **Webhook Events:** https://stripe.com/docs/api/events/types

---

## ✅ Checklist

Before testing:
- [ ] Updated `.env.local` with correct price IDs (`price_*` not `prod_*`)
- [ ] Ran payment_transactions migration
- [ ] Installed Stripe CLI
- [ ] Started dev server (Terminal 1)
- [ ] Started `stripe listen` (Terminal 2)
- [ ] Updated STRIPE_WEBHOOK_SECRET with secret from stripe listen

During testing:
- [ ] Successfully completed test payment
- [ ] Verified webhook events in Terminal 2
- [ ] Checked payment recorded in database
- [ ] Verified subscription status updated
- [ ] Tested payment failure scenario
- [ ] Checked Stripe Dashboard for test payments

---

**You're all set! 🎊**

Your payment system now:
- ✅ Processes test payments via Stripe
- ✅ Records all transactions as proof
- ✅ Updates subscription status automatically
- ✅ Handles webhooks for real-time updates
- ✅ Provides audit trail for compliance
