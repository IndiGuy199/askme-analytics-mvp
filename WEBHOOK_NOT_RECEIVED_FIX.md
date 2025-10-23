# Webhook Not Received - Quick Fix Guide

## 🚨 Problem: Payment succeeded in Stripe but no database update

The issue is that webhook events aren't reaching your local server because `stripe listen` isn't running.

---

## ✅ Quick Solution: Resend Webhook from Stripe Dashboard

Since the payment already succeeded, you can manually resend the webhook events:

### Step 1: Go to Stripe Events
1. Open: https://dashboard.stripe.com/test/events
2. Find the recent events related to your payment (they'll have timestamps around Oct 23, 8:33 PM)

### Step 2: Look for These Events:
- `checkout.session.completed` - This creates the subscription record
- `invoice.payment_succeeded` - This creates the payment transaction
- `customer.subscription.created` or `customer.subscription.updated` - Updates subscription status

### Step 3: Resend Each Event:
1. Click on each event
2. Click the "Resend event" button (top right)
3. Enter your webhook endpoint: `http://localhost:3000/api/webhooks/stripe`
4. Click "Send test webhook"

---

## 🔧 Permanent Fix: Start Stripe Webhook Forwarding

For future payments, you need to keep `stripe listen` running:

### Option A: Restart Terminal and Try Again

1. **Close the current PowerShell terminal**
2. **Open a NEW PowerShell terminal** (this loads updated PATH)
3. **Navigate to your project:**
   ```powershell
   cd C:\opt\analytics-mvp\askme-analytics-mvp
   ```
4. **Start webhook forwarding:**
   ```powershell
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Option B: Use Full Path to Stripe CLI

If the above doesn't work, use the full path:

```powershell
& "$env:USERPROFILE\scoop\apps\stripe\current\stripe.exe" listen --forward-to localhost:3000/api/webhooks/stripe
```

### What You Should See:

```
> Ready! Your webhook signing secret is whsec_...
```

Keep this terminal running while testing payments!

---

## 🧪 Alternative: Manually Trigger Test Events

You can also use Stripe CLI to trigger test events:

```powershell
# Trigger a successful payment
stripe trigger checkout.session.completed

# Trigger payment succeeded
stripe trigger invoice.payment_succeeded
```

---

## 📊 Verify Database After Webhook

After resending the webhook events, check your database:

```sql
-- Check payment transactions
SELECT 
    id,
    company_id,
    amount,
    status,
    stripe_invoice_id,
    paid_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 5;

-- Check subscription status
SELECT 
    company_id,
    plan_id,
    status,
    stripe_subscription_id,
    current_period_end
FROM subscriptions
WHERE stripe_subscription_id = 'sub_1SlVC4gLT9aIqMDUfYkcMO9';
-- ^^^ Replace with your actual subscription ID from Stripe
```

---

## 🎯 Expected Results After Webhook:

1. **subscriptions table:**
   - Status should change from `trialing` to `active`
   - `stripe_subscription_id` populated
   - `current_period_end` set to 30 days from now

2. **payment_transactions table:**
   - New row with `status = 'succeeded'`
   - Amount: $39.00
   - Receipt URL populated
   - Invoice PDF URL populated

---

## 🐛 Troubleshooting: Why Webhook Didn't Work

**Common Issues:**

1. **Stripe CLI not running**
   - Solution: Keep `stripe listen` running in a terminal

2. **Wrong webhook secret**
   - Check `.env.local` has the secret from `stripe listen` output
   - Should start with `whsec_...`

3. **Dev server not running**
   - Make sure `npm run dev` is running on port 3000

4. **Firewall blocking**
   - Stripe CLI needs internet access to forward events

---

## ✅ Checklist for Testing Future Payments

Before testing another payment:

- [ ] Dev server running (`npm run dev` in Terminal 1)
- [ ] Stripe webhook forwarding running (`stripe listen...` in Terminal 2)
- [ ] Webhook secret in `.env.local` matches the one from `stripe listen`
- [ ] Dev server restarted after updating `.env.local`
- [ ] Both terminals showing no errors

---

## 📝 Quick Commands Reference

```powershell
# Terminal 1: Start dev server
cd C:\opt\analytics-mvp\askme-analytics-mvp\web
npm run dev

# Terminal 2: Start webhook forwarding (in a NEW PowerShell)
cd C:\opt\analytics-mvp\askme-analytics-mvp
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook secret (whsec_...) to .env.local
# Then restart Terminal 1 (dev server)
```

---

## 🎉 Next Steps

1. **Resend the webhook events** from Stripe Dashboard (Option 1 above)
2. **Check database** to verify payment was recorded
3. **Start `stripe listen`** for future tests
4. **Try another test payment** to verify everything works end-to-end

Your payment was successful in Stripe - we just need to get the webhook events delivered to record it in your database! 🚀
