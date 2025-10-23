# Testing Webhook Events - Commands

## 🎯 The Issue
When you click "Resend" in Stripe Dashboard, it tries to send to the webhook endpoint configured in Dashboard (which points to localhost and can't be reached from Stripe's servers).

`stripe listen` creates its own tunnel that Stripe CAN reach, then forwards events to your localhost.

---

## ✅ Solution: Let stripe listen capture real events

Since you have `stripe listen` running, it will automatically capture and forward ANY events that happen in your Stripe account.

---

## 🧪 Two Ways to Test:

### Method 1: Make a New Test Payment (Best for Full Testing)

1. **Go to pricing page:**
   http://localhost:3000/pricing

2. **Click Subscribe on Basic or Premium plan**

3. **Use test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34` (any future date)
   - CVC: `123` (any 3 digits)
   - ZIP: `12345` (any 5 digits)

4. **Watch your terminals:**

   **Terminal with stripe listen:**
   ```
   2025-10-23 20:45:00   --> checkout.session.completed [evt_xxx]
   2025-10-23 20:45:01   --> customer.subscription.created [evt_yyy]  
   2025-10-23 20:45:02   --> invoice.payment_succeeded [evt_zzz]
   ```

   **Terminal with npm run dev:**
   ```
   🔔 Webhook received: checkout.session.completed
   💳 Checkout completed: { sessionId: '...', companyId: '...', planId: 'basic' }
   ✅ Subscription created/updated in database
   🔔 Webhook received: invoice.payment_succeeded
   ✅ Payment transaction recorded: inv_xxx
   ```

5. **Check database:**
   ```sql
   SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM subscriptions ORDER BY updated_at DESC LIMIT 1;
   ```

---

### Method 2: Trigger Fake Test Events (Quick Test)

Open a NEW PowerShell terminal and run:

```powershell
cd C:\opt\analytics-mvp\askme-analytics-mvp

# Make sure stripe is accessible (refresh PATH)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.created
```

**Note:** These are fake/simulated events with random data, not your actual payment.

---

## 📊 Verify Everything Works

After making a payment or triggering events, verify:

### 1. Check Webhooks Were Received:
Look at your `stripe listen` terminal - you should see lines like:
```
--> checkout.session.completed [evt_xxx]
--> invoice.payment_succeeded [evt_yyy]
```

### 2. Check Webhook Handler Logs:
Look at your `npm run dev` terminal for:
```
🔔 Webhook received: checkout.session.completed
✅ Subscription created/updated in database
✅ Payment transaction recorded
```

### 3. Check Database:

**Payment Transactions:**
```sql
SELECT 
    id,
    amount,
    status,
    stripe_invoice_id,
    paid_at,
    created_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 5;
```

**Subscriptions:**
```sql
SELECT 
    company_id,
    plan_id,
    status,
    stripe_subscription_id,
    current_period_end
FROM subscriptions
ORDER BY updated_at DESC
LIMIT 5;
```

---

## 🐛 If Still Not Working:

### Check 1: Both servers running?
```powershell
# Terminal 1: Dev server
cd C:\opt\analytics-mvp\askme-analytics-mvp\web
npm run dev
# Should see: ▲ Next.js 15.x.x, Local: http://localhost:3000

# Terminal 2: Webhook forwarding
cd C:\opt\analytics-mvp\askme-analytics-mvp
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Should see: Ready! Your webhook signing secret is whsec_...
```

### Check 2: Webhook secret matches?
The secret from `stripe listen` output should match `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_68928b4dc9a4de474aea0f1f625a6555f28847d90a4f6af106fa6de9e3e2960b
```
✅ **This already matches!**

### Check 3: Dev server restarted after env change?
If you updated `.env.local`, restart the dev server (Ctrl+C and `npm run dev` again).

### Check 4: Webhook endpoint exists?
Visit: http://localhost:3000/api/webhooks/stripe
You should see either a 405 error (POST required) or similar - means endpoint exists.

---

## 🎉 Expected Flow

When everything works correctly:

1. **User completes payment** → Stripe processes payment
2. **Stripe emits events** → checkout.session.completed, invoice.payment_succeeded, etc.
3. **stripe listen captures events** → Shows in terminal: `--> event_name [evt_id]`
4. **stripe listen forwards to localhost** → Sends POST to http://localhost:3000/api/webhooks/stripe
5. **Your webhook handler receives** → Logs: `🔔 Webhook received: event_name`
6. **Handler updates database** → Creates payment_transactions row, updates subscriptions
7. **Handler responds** → Logs: `✅ Payment transaction recorded`

---

## 💡 Pro Tip

Keep these 2 terminals always open while developing:
- **Terminal 1:** `npm run dev` (your app)
- **Terminal 2:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (webhook tunnel)

This way all Stripe events automatically flow to your local environment!
