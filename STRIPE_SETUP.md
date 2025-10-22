# Stripe Integration Setup Guide

## Prerequisites
- [x] Stripe account created
- [x] npm packages installed: `stripe` and `@stripe/stripe-js`
- [x] Database migration run: `add_stripe_columns.sql`

## Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/register (or login)
2. Navigate to **Developers** → **API Keys**
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`) - Keep this secure!
5. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Step 2: Create Products in Stripe

### Basic Plan
1. Go to **Products** → **Add Product**
2. Fill in details:
   - **Name**: Basic Plan
   - **Description**: Track 1 website/app with standard analytics
3. Add pricing:
   - **Monthly**: $39/month
     - Set recurring: Monthly
     - Currency: USD
     - After creation, copy **Price ID** (e.g., `price_1ABC...`)
   - **Yearly**: $390/year (optional)
     - Set recurring: Yearly
     - Currency: USD
     - After creation, copy **Price ID**

### Premium Plan
1. Go to **Products** → **Add Product**
2. Fill in details:
   - **Name**: Premium Plan
   - **Description**: Track up to 3 websites/apps with advanced analytics
3. Add pricing:
   - **Monthly**: $79/month
   - **Yearly**: $790/year (optional)

### Configure Trial Period
For each price:
1. Click on the price
2. Scroll to **Trial period**
3. Set to **30 days**
4. Save

### Add Price IDs to Environment
Add the Price IDs to `.env.local`:
```env
STRIPE_PRICE_BASIC_MONTHLY=price_1ABC...
STRIPE_PRICE_PREMIUM_MONTHLY=price_1XYZ...
STRIPE_PRICE_BASIC_YEARLY=price_1DEF...  # optional
STRIPE_PRICE_PREMIUM_YEARLY=price_1GHI... # optional
```

## Step 3: Setup Webhook (For Production)

### For Production:
1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Copy **Signing secret** (starts with `whsec_`)
5. Add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### For Local Development:

#### Option 1: Stripe CLI (Recommended)
```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe
# Or download from: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# This command will output a webhook signing secret
# Add it to .env.local as STRIPE_WEBHOOK_SECRET
```

#### Option 2: ngrok
```bash
# Install ngrok: https://ngrok.com/
ngrok http 3000

# Use the https URL for webhook endpoint in Stripe Dashboard
```

## Step 4: Run Database Migration

```bash
# Connect to your Supabase database
# Run the migration file: database/migrations/add_stripe_columns.sql
```

Or in Supabase Dashboard:
1. Go to **SQL Editor**
2. Copy contents of `add_stripe_columns.sql`
3. Run query

## Step 5: Test the Integration

### Test Cards (Use in Test Mode Only)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

### Test Flow
1. Start your development server: `npm run dev`
2. Login to your app
3. Go to `/pricing`
4. Click "Subscribe Now" on Basic plan
5. You should be redirected to Stripe Checkout
6. Use test card: `4242 4242 4242 4242`
7. Complete checkout
8. Should redirect back to `/dashboard?session_id=...&success=true`
9. Check Supabase `subscriptions` table - should see new row
10. Check Stripe Dashboard - should see successful payment

### Verify Webhook
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. View **Recent events** - should see `checkout.session.completed`
4. Check server logs for webhook processing

## Step 6: Enable Tax Collection (Optional)

1. In Stripe Dashboard, go to **Settings** → **Tax**
2. Enable **Stripe Tax**
3. Configure tax settings for your regions
4. Tax will be automatically calculated at checkout

## Step 7: Go Live

### Switch to Live Mode
1. Toggle from **Test mode** to **Live mode** in Stripe Dashboard
2. Get your live API keys from **Developers** → **API Keys**
3. Update production environment variables:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   ```
4. Create live webhook endpoint with same URL
5. Update `STRIPE_WEBHOOK_SECRET` with live webhook secret
6. Update `NEXT_PUBLIC_APP_URL` to your production domain

### Checklist Before Going Live
- [ ] Live API keys added to production environment
- [ ] Live webhook created and verified
- [ ] Products and prices created in live mode
- [ ] Price IDs updated in production environment
- [ ] Tax settings configured
- [ ] Test successful payment in live mode with real card
- [ ] Verify subscription appears in database
- [ ] Test webhook processing
- [ ] Email notifications configured (optional)

## Troubleshooting

### "No price found for planId"
- Verify Price IDs in `.env.local` match your Stripe dashboard
- Make sure you're using the correct Price ID (not Product ID)
- Price IDs start with `price_`, not `prod_`

### Webhook not receiving events
- Check webhook URL is publicly accessible
- For local dev, use Stripe CLI or ngrok
- Verify webhook secret matches in `.env.local`
- Check Stripe Dashboard → Webhooks → Events for errors

### Subscription not created in database
- Check webhook handler logs for errors
- Verify database migration was run successfully
- Check `metadata.company_id` is being passed correctly
- Ensure webhook secret is correct

### "Failed to create checkout session"
- Check API keys are valid and not expired
- Verify Price IDs exist in your Stripe account
- Check company_id is valid
- Look at server logs for detailed error

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe Testing: https://stripe.com/docs/testing
- Webhook Guide: https://stripe.com/docs/webhooks

## Next Steps

After basic integration is working:
1. [ ] Add customer portal for subscription management
2. [ ] Implement email notifications
3. [ ] Add usage-based billing (optional)
4. [ ] Set up dunning emails for failed payments
5. [ ] Configure invoice settings
6. [ ] Add proration for mid-cycle upgrades/downgrades
