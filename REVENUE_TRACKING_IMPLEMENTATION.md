# 💰 Revenue Tracking Implementation Guide

**Date:** 2024-11-14  
**Status:** ✅ Complete and Ready for Testing

---

## Overview

This document explains how revenue is captured and tracked throughout the entire purchase flow, from product selection to subscription completion.

## Complete Revenue Tracking Flow

### 1. **Product Selection** (Pricing Page)

**File:** `web/app/pricing/page.tsx`

**User Action:** User clicks "Subscribe Now" button on a pricing plan

**Analytics Event:** `subscription_click` (automatically captured by `ph-product-injector.js`)

**Data Captured:**
```javascript
{
  event: 'subscription_click',
  product: 'Premium Plan',
  price: '29.99',
  currency: 'USD',
  quantity: '1',
  utm_source: 'facebook',  // From channel tracking
  utm_medium: 'cpc',
  utm_campaign: 'spring_sale'
}
```

**Storage:**
- Product, price, currency, quantity saved to `sessionStorage`
- UTM parameters saved to both `sessionStorage` and `localStorage`

---

### 2. **Stripe Checkout** (External)

**Action:** User redirected to Stripe Checkout page

**URL:** `https://checkout.stripe.com/pay/...`

**Process:**
- User enters payment details
- Stripe processes payment
- Stripe redirects back to success URL

**Redirect URL:** 
```
/dashboard?session_id=cs_xxx&success=true
```

**No analytics events fired** (external page)

---

### 3. **Checkout Completion** (Dashboard Success Page) - **CRITICAL**

**File:** `web/app/dashboard/page.tsx` (lines 62-125)

**User Action:** Lands on dashboard after successful payment

**Analytics Event:** `checkout_completed` (**THIS IS WHERE REVENUE IS TRACKED**)

**Implementation:**
```typescript
useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search)
  const success = searchParams.get('success')
  const sessionId = searchParams.get('session_id')

  if (success === 'true' && sessionId) {
    // 1. Fetch subscription details from Supabase
    const { data: subData } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plans:plan_id (
          id,
          name,
          price_cents,
          currency,
          interval
        )
      `)
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 2. Calculate revenue
    const revenue = (plan.price_cents / 100).toFixed(2)

    // 3. Wait for PostHog to load
    const waitForPostHog = setInterval(() => {
      if (window.posthog) {
        // 4. Fire checkout_completed event
        window.posthog.capture('checkout_completed', {
          revenue: revenue,              // e.g., "29.99"
          unit_price: revenue,           // e.g., "29.99"
          quantity: '1',
          product_name: planName,        // e.g., "Premium Plan"
          product_id: plan.id,           // e.g., "premium_monthly"
          currency: currency,            // e.g., "USD"
          interval: interval,            // e.g., "month"
          session_id: sessionId,         // Stripe session ID
          company_id: userData.company_id
          // UTM params automatically added by ph-product-injector
        })
      }
    }, 100)
  }
}, [])
```

**Data Captured:**
```javascript
{
  event: 'checkout_completed',
  revenue: '29.99',              // ✅ TOTAL REVENUE
  unit_price: '29.99',
  quantity: '1',
  product_name: 'Premium Plan',
  product_id: 'premium_monthly',
  currency: 'USD',
  interval: 'month',
  session_id: 'cs_xxx',
  company_id: 'company-123',
  // Auto-attached by ph-product-injector:
  utm_source: 'facebook',        // ✅ CHANNEL ATTRIBUTION
  utm_medium: 'cpc',
  utm_campaign: 'spring_sale',
  attribution_timestamp: '2024-11-14T10:00:00Z',
  days_since_attribution: 0,
  referrer: 'https://facebook.com/...'
}
```

---

## Channel Attribution Enhancement

### How UTM Parameters Are Attached

**File:** `web/public/lib/clientAnalytics/ph-product-injector.js`

**Function:** `captureOnce()` (lines 362-499)

**Enhancement:** Three-tier fallback ensures UTM parameters are ALWAYS present on revenue events:

```javascript
// Priority 1: Get from current URL
if (urlParams.has('utm_source')) {
  props[P.UTM_SOURCE] = urlParams.get('utm_source');
}
// Priority 2: Get from sessionStorage (same browsing session)
else if (sessionStorage.getItem('ph_utm_source')) {
  props[P.UTM_SOURCE] = sessionStorage.getItem('ph_utm_source');
}
// Priority 3: Get from localStorage (persistent across sessions)
else if (localStorage.getItem('ph_utm_source')) {
  props[P.UTM_SOURCE] = localStorage.getItem('ph_utm_source');
  console.log('[ph-injector] 🔄 Restored utm_source from localStorage');
}
```

**Result:** Even if user:
- Closes browser after clicking ad
- Returns days later with direct traffic
- Completes purchase

**The revenue is still attributed to the original marketing channel!**

---

## Revenue Query in PostHog

### How Revenue is Aggregated

**File:** `web/lib/queries/revenue.ts`

**Function:** `getRevenueByChannel()`

**PostHog Query:**
```javascript
{
  kind: 'TrendsQuery',
  series: [{
    kind: 'EventsNode',
    event: 'checkout_completed',      // ✅ Event name
    name: 'checkout_completed',
    math: 'sum',                       // ✅ Sum all revenue
    math_property: 'revenue'           // ✅ Property to sum
  }],
  breakdownFilter: {
    breakdown: 'utm_source',           // ✅ Group by channel
    breakdown_type: 'event'
  },
  dateRange: {
    date_from: '-30d',
    date_to: 'now'
  }
}
```

**SQL Equivalent:**
```sql
SELECT 
  utm_source AS channel,
  SUM(CAST(revenue AS NUMERIC)) AS total_revenue,
  COUNT(*) AS conversions
FROM posthog_events
WHERE event = 'checkout_completed'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY utm_source
ORDER BY total_revenue DESC
```

**Result:**
```javascript
[
  { channel: 'facebook', revenue: 299.90, conversions: 10 },
  { channel: 'google', revenue: 149.95, conversions: 5 },
  { channel: 'email', revenue: 89.97, conversions: 3 },
  { channel: 'direct', revenue: 29.99, conversions: 1 }
]
```

---

## Dashboard Visualization

### Revenue by Channel Card

**File:** `web/components/analytics/RevenueByChannelCard.tsx`

**Component:**
```tsx
export default function RevenueByChannelCard({ companyId, from, to }) {
  // Fetch revenue data from API
  const { data } = useSWR(
    `/api/analytics/revenue-by-channel?companyId=${companyId}&from=${from}&to=${to}`
  )

  // Display bar chart
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Channel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="channel" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value}`} />
            <Bar dataKey="revenue" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

**Displayed On:** `/dashboard` page

---

## Testing the Complete Flow

### Manual Test Procedure

#### Step 1: Product Selection with Channel Attribution

```bash
# Open browser in incognito mode (clean slate)
1. Navigate to: http://localhost:3000/pricing?utm_source=test_channel&utm_medium=test_medium&utm_campaign=test_campaign

2. Open DevTools Console

3. Look for:
   [ph-injector] 📊 Captured utm_source: test_channel
   [ph-injector] 📊 Captured utm_medium: test_medium
   [ph-injector] 📊 Captured utm_campaign: test_campaign

4. Verify storage:
   sessionStorage.getItem('ph_utm_source')  // → "test_channel"
   localStorage.getItem('ph_utm_source')    // → "test_channel"
```

#### Step 2: Stripe Checkout (Use Test Mode)

```bash
1. Click "Subscribe Now" on a plan

2. Look for console log:
   [ph-injector] Product event captured

3. You'll be redirected to Stripe Checkout

4. Use test card:
   Card Number: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)

5. Complete payment
```

#### Step 3: Revenue Event Verification

```bash
1. After successful payment, you'll land on:
   /dashboard?session_id=cs_xxx&success=true

2. Open DevTools Console immediately

3. Look for these logs:
   ✅ Payment successful! Session ID: cs_xxx
   💰 Revenue event captured: {
     revenue: "29.99",
     product: "Premium Plan",
     session_id: "cs_xxx"
   }
   [ph-injector] 💰 Revenue event with attribution: {
     event: "checkout_completed",
     revenue: "29.99",
     utm_source: "test_channel",
     utm_medium: "test_medium",
     utm_campaign: "test_campaign",
     days_since_attribution: 0
   }

4. Verify in PostHog dashboard (wait 1-2 minutes):
   - Go to: PostHog → Events → Search "checkout_completed"
   - Click on latest event
   - Verify properties include:
     * revenue: "29.99"
     * utm_source: "test_channel"
     * product_name: "Premium Plan"
     * currency: "USD"
```

#### Step 4: Revenue Dashboard Verification

```bash
1. Refresh dashboard page: /dashboard

2. Scroll to "Revenue Analytics" section

3. "Revenue by Channel" card should show:
   test_channel | $29.99 | ███████████

4. "Top Revenue Items" card should show:
   Premium Plan | $29.99
```

### Automated Test (Optional)

**File:** Create `web/app/dashboard/__tests__/revenue-tracking.test.ts`

```typescript
import { render, waitFor } from '@testing-library/react'
import DashboardPage from '../page'

// Mock PostHog
const mockCapture = jest.fn()
global.window.posthog = {
  capture: mockCapture
}

test('fires checkout_completed event after successful payment', async () => {
  // Mock URL with success parameters
  delete window.location
  window.location = { 
    search: '?success=true&session_id=cs_test_123' 
  } as any

  // Mock Supabase response
  const mockSubData = {
    plans: {
      id: 'premium_monthly',
      name: 'Premium Plan',
      price_cents: 2999,
      currency: 'USD',
      interval: 'month'
    }
  }

  // Render component
  render(<DashboardPage />)

  // Wait for event to fire
  await waitFor(() => {
    expect(mockCapture).toHaveBeenCalledWith('checkout_completed', 
      expect.objectContaining({
        revenue: '29.99',
        product_name: 'Premium Plan',
        product_id: 'premium_monthly',
        currency: 'USD'
      })
    )
  }, { timeout: 3000 })
})
```

---

## Troubleshooting

### Issue 1: Revenue Event Not Firing

**Symptoms:**
- No "Revenue event captured" log in console
- No `checkout_completed` event in PostHog

**Checks:**
```javascript
// 1. Verify URL has success parameters
console.log(window.location.search)  
// Should show: ?session_id=cs_xxx&success=true

// 2. Verify PostHog loaded
console.log(typeof window.posthog)  
// Should show: "object"

// 3. Check for errors
// Look for: "❌ Error tracking checkout revenue:" in console
```

**Solutions:**
- If PostHog not loaded: Check analytics library is included in page
- If error in console: Check Supabase query for subscription details
- If no error but no event: Increase timeout in waitForPostHog loop

### Issue 2: Missing Channel Attribution

**Symptoms:**
- Revenue event fires but utm_source is null
- "Revenue by Channel" shows all revenue as "unknown"

**Checks:**
```javascript
// 1. Check storage before checkout
sessionStorage.getItem('ph_utm_source')  // Should have value
localStorage.getItem('ph_utm_source')    // Should have value

// 2. Check storage after redirect
sessionStorage.getItem('ph_utm_source')  // Should still have value
localStorage.getItem('ph_utm_source')    // Should still have value

// 3. Verify ph-product-injector is loaded
console.log(typeof window.AMA)  // Should show: "object"
```

**Solutions:**
- If storage empty: User may have disabled cookies/storage in browser
- If ph-product-injector not loaded: Check analytics init script
- If UTM not captured initially: Add UTM params to all marketing links

### Issue 3: Wrong Revenue Amount

**Symptoms:**
- Revenue shows $0.00 or incorrect amount
- Dashboard shows wrong price

**Checks:**
```javascript
// 1. Check plan details in database
SELECT id, name, price_cents FROM plans WHERE id = 'premium_monthly';
// Should show: price_cents = 2999 (for $29.99)

// 2. Check conversion logic
const price_cents = 2999;
const revenue = (price_cents / 100).toFixed(2);
console.log(revenue);  // Should show: "29.99"

// 3. Check PostHog event
// In PostHog dashboard, verify revenue property is string "29.99"
```

**Solutions:**
- If $0.00: Check plan has correct price_cents in database
- If wrong amount: Verify price_cents is in cents, not dollars
- If NaN: Check price_cents is a number, not null

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     REVENUE TRACKING FLOW                    │
└─────────────────────────────────────────────────────────────┘

1. LANDING PAGE (with UTM)
   ↓
   URL: /pricing?utm_source=facebook&utm_medium=cpc
   ↓
   [ph-product-injector.js boots]
   ↓
   Storage: sessionStorage + localStorage
   {
     ph_utm_source: "facebook",
     ph_utm_medium: "cpc",
     ph_utm_timestamp: 1731600000000
   }

2. PRODUCT SELECTION
   ↓
   User clicks: "Subscribe Now" on Premium Plan
   ↓
   Event: subscription_click
   {
     product: "Premium Plan",
     price: "29.99",
     utm_source: "facebook"  ← From storage
   }

3. STRIPE CHECKOUT
   ↓
   Redirect to: checkout.stripe.com
   ↓
   User completes payment
   ↓
   Redirect back: /dashboard?session_id=cs_xxx&success=true

4. REVENUE TRACKING (CRITICAL)
   ↓
   [Dashboard page detects success=true]
   ↓
   Fetch: Subscription + Plan details from Supabase
   {
     plan: "premium_monthly",
     price_cents: 2999,
     name: "Premium Plan"
   }
   ↓
   Calculate: revenue = 2999 / 100 = "29.99"
   ↓
   Wait for: window.posthog to load
   ↓
   Fire event: checkout_completed
   {
     revenue: "29.99",         ← TOTAL REVENUE
     product_name: "Premium Plan",
     product_id: "premium_monthly",
     currency: "USD",
     session_id: "cs_xxx"
   }
   ↓
   [ph-product-injector.captureOnce() intercepts]
   ↓
   Enriches with channel attribution:
   {
     ...existing properties,
     utm_source: "facebook",   ← From localStorage
     utm_medium: "cpc",
     utm_campaign: "...",
     attribution_timestamp: "2024-11-14T10:00:00Z",
     days_since_attribution: 0
   }
   ↓
   Send to: PostHog

5. POSTHOG PROCESSING
   ↓
   Event stored in: posthog_events table
   ↓
   Aggregation query:
   SELECT utm_source, SUM(revenue)
   FROM events
   WHERE event = 'checkout_completed'
   GROUP BY utm_source

6. DASHBOARD DISPLAY
   ↓
   API: /api/analytics/revenue-by-channel
   ↓
   Component: RevenueByChannelCard
   ↓
   Display:
   ┌──────────────────────────────┐
   │ Revenue by Channel (30d)     │
   ├──────────────────────────────┤
   │ facebook  ████████   $29.99  │
   │ google    ████       $19.99  │
   │ email     ██         $9.99   │
   └──────────────────────────────┘
```

---

## Summary

### ✅ What We Track

1. **Product Selection:** User interest in a plan
2. **Channel Attribution:** Where the user came from (facebook, google, etc.)
3. **Revenue:** Actual dollar amount from completed purchase
4. **Product Details:** Which plan was purchased
5. **Conversion Time:** Days between first visit and purchase

### ✅ Where Revenue is Captured

**CRITICAL:** Revenue is captured in `web/app/dashboard/page.tsx` when the user lands on the dashboard after successful Stripe payment.

**Event:** `checkout_completed`

**Properties:**
- `revenue`: Total purchase amount (e.g., "29.99")
- `utm_source`: Marketing channel (e.g., "facebook")
- `product_name`: Plan name (e.g., "Premium Plan")
- `currency`: "USD"
- `session_id`: Stripe session ID

### ✅ How to Verify

1. Complete test purchase with UTM parameters
2. Check console for "💰 Revenue event captured" log
3. Verify in PostHog dashboard → Events → checkout_completed
4. Check /dashboard "Revenue by Channel" card shows data

---

**Last Updated:** 2024-11-14  
**Author:** Analytics Team  
**Status:** ✅ Implementation Complete - Ready for Testing
