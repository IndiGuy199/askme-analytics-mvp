# 📊 Channel Attribution Tracking System

## Overview

This document explains how the enhanced channel attribution tracking system captures and persists marketing channel data throughout the entire user journey, from initial landing to subscription completion and revenue generation.

## Architecture

### Three-Tier Storage Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      USER JOURNEY                            │
├─────────────────────────────────────────────────────────────┤
│  Landing Page → Product Pages → Pricing → Checkout          │
│       ↓              ↓              ↓           ↓            │
│  [Capture UTMs] → [Persist] → [Track Events] → [Revenue]    │
└─────────────────────────────────────────────────────────────┘

Storage Layers:
1. URL Parameters (utm_source, utm_medium, utm_campaign, fbclid, gclid)
2. sessionStorage (survives page navigation within session)
3. localStorage (survives browser close/reopen)
```

### Attribution Priority

When capturing channel attribution, the system follows this priority:

```
Priority 1: URL Parameters (fresh campaign click)
  ↓ not found
Priority 2: sessionStorage (current browsing session)
  ↓ not found
Priority 3: localStorage (persistent across sessions)
  ↓ not found
Priority 4: Referrer Analysis (organic traffic)
  ↓ not found
Fallback: Direct Traffic
```

## Implementation Details

### File: `ph-product-injector.js`

#### 1. Boot Function (Initial Capture)

Located at lines ~1309-1398, the `boot()` function captures channel attribution when the page first loads:

```javascript
// Capture UTM parameters from URL
if (urlParams.has('utm_source')) {
    sessionStorage.setItem('ph_utm_source', utmSource);
    localStorage.setItem('ph_utm_source', utmSource);
    localStorage.setItem('ph_utm_timestamp', Date.now().toString());
}

// Extract channel from referrer (if no UTM)
if (!sessionStorage.getItem('ph_utm_source')) {
    const referrer = document.referrer;
    const channel = extractChannelFromReferrer(referrer);
    if (channel) {
        sessionStorage.setItem('ph_utm_source', channel);
        localStorage.setItem('ph_utm_source', channel);
    }
}

// Detect third-party click IDs
if (urlParams.has('fbclid')) {
    // Facebook paid ad
    sessionStorage.setItem('ph_utm_source', 'facebook');
    sessionStorage.setItem('ph_utm_medium', 'cpc');
}

if (urlParams.has('gclid')) {
    // Google Ads paid ad
    sessionStorage.setItem('ph_utm_source', 'google');
    sessionStorage.setItem('ph_utm_medium', 'cpc');
}
```

**Channel Mapping:**

| Referrer Domain | Mapped Channel |
|----------------|----------------|
| google.* | google |
| facebook.*, fb.* | facebook |
| twitter.*, t.co | twitter |
| linkedin.* | linkedin |
| instagram.* | instagram |
| youtube.* | youtube |
| bing.* | bing |
| yahoo.* | yahoo |
| (same domain) | null (not new) |
| (other domain) | referral |
| (no referrer) | direct |

#### 2. Event Capture Function (Attribution Attachment)

Located at lines ~360-490, the `captureOnce()` function attaches UTM parameters to EVERY event:

**For Revenue Events (checkout_completed, subscription_completed):**

```javascript
// Enhanced revenue event with full attribution
const revenue = price * quantity;
props[P.REVENUE] = revenue.toFixed(2);

// Three-tier fallback for UTM parameters
if (!props[P.UTM_SOURCE]) {
    // Try URL
    if (urlParams.has('utm_source')) {
        props[P.UTM_SOURCE] = urlParams.get('utm_source');
    }
    // Try sessionStorage
    else if (sessionStorage.getItem('ph_utm_source')) {
        props[P.UTM_SOURCE] = sessionStorage.getItem('ph_utm_source');
    }
    // Try localStorage
    else if (localStorage.getItem('ph_utm_source')) {
        props[P.UTM_SOURCE] = localStorage.getItem('ph_utm_source');
        console.log('[ph-injector] 🔄 Restored utm_source from localStorage');
    }
}

// Add attribution timestamp
const utmTimestamp = localStorage.getItem('ph_utm_timestamp');
if (utmTimestamp) {
    props['attribution_timestamp'] = new Date(parseInt(utmTimestamp)).toISOString();
    props['days_since_attribution'] = Math.floor((Date.now() - parseInt(utmTimestamp)) / (1000 * 60 * 60 * 24));
}

console.log('[ph-injector] 💰 Revenue event with attribution:', {
    event: name,
    revenue: props[P.REVENUE],
    utm_source: props[P.UTM_SOURCE],
    utm_medium: props[P.UTM_MEDIUM],
    utm_campaign: props[P.UTM_CAMPAIGN],
    days_since_attribution: props['days_since_attribution']
});
```

**For All Other Events:**

```javascript
// Attach UTM to every event (page views, clicks, form submits, etc.)
if (!props[P.UTM_SOURCE]) {
    // Check URL → sessionStorage → localStorage
    props[P.UTM_SOURCE] = 
        urlParams.get('utm_source') || 
        sessionStorage.getItem('ph_utm_source') || 
        localStorage.getItem('ph_utm_source');
}
```

## Storage Schema

### sessionStorage (Current Session)

```javascript
{
  "ph_utm_source": "facebook",      // Marketing channel
  "ph_utm_medium": "cpc",            // Traffic type
  "ph_utm_campaign": "spring_sale",  // Campaign name
  "ph_fbclid": "IwAR123...",         // Facebook click ID (if present)
  "ph_gclid": "EAIaIQ..."            // Google click ID (if present)
}
```

### localStorage (Persistent)

```javascript
{
  "ph_utm_source": "facebook",
  "ph_utm_medium": "cpc",
  "ph_utm_campaign": "spring_sale",
  "ph_utm_timestamp": "1715700000000",           // Epoch milliseconds
  "ph_attribution_source": "url_params"          // How was it captured
}
```

## Event Properties

Every PostHog event now includes these attribution properties:

### Standard Events

```javascript
{
  "event": "page_view",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "spring_sale"
}
```

### Revenue Events

```javascript
{
  "event": "checkout_completed",
  "revenue": "29.99",
  "unit_price": "29.99",
  "quantity": "1",
  "product_name": "Premium Plan",
  "product_id": "Premium Plan",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "spring_sale",
  "attribution_timestamp": "2024-05-14T12:00:00.000Z",
  "days_since_attribution": 0,
  "referrer": "https://facebook.com/..."
}
```

## Marketing Channel Scenarios

### Scenario 1: Paid Facebook Ad

**User Journey:**
```
1. User clicks Facebook ad with utm_source=facebook&utm_medium=cpc
2. Lands on homepage → UTMs captured to storage
3. Browses product pages → All events include utm_source=facebook
4. Goes to pricing page → Events include utm_source=facebook
5. Completes checkout → Revenue event includes utm_source=facebook
```

**PostHog Query Result:**
```sql
SELECT utm_source, SUM(revenue) 
FROM events 
WHERE event = 'checkout_completed'
GROUP BY utm_source

Result:
facebook | $29.99
```

### Scenario 2: Google Organic Search

**User Journey:**
```
1. User searches Google, clicks organic result (no UTMs)
2. Lands on blog post → Referrer = google.com → utm_source='google' inferred
3. Reads article, clicks CTA → Events include utm_source=google
4. Subscribes → Revenue attributed to Google organic
```

**Attribution Source:** `referrer_domain`

### Scenario 3: Facebook Click ID (no UTM)

**User Journey:**
```
1. User clicks Facebook ad → URL has fbclid=IwAR123
2. System detects fbclid → Sets utm_source='facebook', utm_medium='cpc'
3. All subsequent events include Facebook attribution
```

**Attribution Source:** `fbclid`

### Scenario 4: Direct Traffic + Return Visit

**User Journey:**
```
Day 1:
1. User clicks email link with utm_source=email
2. Browses site, doesn't subscribe
3. Closes browser → localStorage preserves utm_source=email

Day 7:
1. User types URL directly (no referrer, no UTM)
2. System restores utm_source=email from localStorage
3. Completes subscription → Revenue attributed to email (7 days later)
```

**Event Properties:**
```javascript
{
  "utm_source": "email",
  "days_since_attribution": 7
}
```

## PostHog Revenue Analysis

### Query: Revenue by Channel

**API Endpoint:** `/api/analytics/revenue-by-channel`

**PostHog Query:**
```javascript
{
  kind: 'TrendsQuery',
  series: [{
    kind: 'EventsNode',
    event: 'checkout_completed',
    math: 'sum',
    math_property: 'revenue'
  }],
  breakdownFilter: {
    breakdown: 'utm_source',
    breakdown_type: 'event'
  },
  interval: 'day',
  dateRange: { date_from: '-30d' }
}
```

**Result Format:**
```json
[
  {
    "channel": "facebook",
    "revenue": 299.90,
    "conversions": 10
  },
  {
    "channel": "google",
    "revenue": 149.95,
    "conversions": 5
  },
  {
    "channel": "email",
    "revenue": 89.97,
    "conversions": 3
  }
]
```

### Dashboard Visualization

**Component:** `RevenueByChannelCard.tsx`

```
Revenue by Channel (Last 30 Days)
┌────────────────────────────────────────┐
│ facebook  ████████████████  $299.90    │
│ google    ████████          $149.95    │
│ email     ████              $89.97     │
│ twitter   ██                $59.98     │
│ direct    █                 $29.99     │
└────────────────────────────────────────┘
```

## Testing

### Test Suite Location

**File:** `web/public/lib/clientAnalytics/test-channel-tracking.html`

### Manual Testing Steps

1. **Test UTM Capture:**
   ```
   Open: http://localhost:3000/lib/clientAnalytics/test-channel-tracking.html?utm_source=facebook&utm_medium=cpc
   Expected: Storage shows facebook/cpc in both session and local storage
   ```

2. **Test Persistence:**
   ```
   1. Load page with UTM parameters
   2. Navigate to page without parameters
   3. Check storage still has UTM data
   4. Close browser
   5. Reopen same URL (no UTM)
   6. Expected: localStorage still has original UTM
   ```

3. **Test Referrer Fallback:**
   ```
   1. Clear all storage
   2. Navigate from Google search (or use DevTools to set referrer)
   3. Expected: utm_source='google' inferred from referrer
   ```

4. **Test Click ID Detection:**
   ```
   Open: http://localhost:3000/?fbclid=IwAR123
   Expected: utm_source='facebook', utm_medium='cpc' automatically set
   ```

5. **Test Event Attribution:**
   ```
   1. Load page with utm_source=test
   2. Open DevTools Console
   3. Simulate checkout: window.posthog.capture('checkout_completed', {price: 29.99})
   4. Expected: Console log shows event with utm_source=test
   ```

### Console Verification

**Expected Logs:**
```
[ph-injector] 📊 Captured utm_source: facebook
[ph-injector] 📊 Captured utm_medium: cpc
[ph-injector] 📊 Captured utm_campaign: spring_sale
[ph-injector] 📊 Attribution source: url_params
[ph-injector] 💰 Revenue event with attribution: {
  event: "checkout_completed",
  revenue: "29.99",
  utm_source: "facebook",
  utm_medium: "cpc",
  utm_campaign: "spring_sale",
  days_since_attribution: 0
}
```

**Manual Storage Check:**
```javascript
// Console commands
sessionStorage.getItem('ph_utm_source')     // "facebook"
localStorage.getItem('ph_utm_source')       // "facebook"
localStorage.getItem('ph_utm_timestamp')    // "1715700000000"
```

## Integration with Existing Code

### No Breaking Changes

✅ **Backward Compatible:** All existing analytics events continue to work  
✅ **Additive Only:** Only ADDS utm parameters, doesn't modify existing properties  
✅ **Graceful Fallback:** If storage fails, events still capture without attribution  
✅ **Console-Only Logging:** Debug logs don't affect production performance  

### Revenue Reporting Still Works

✅ **RevenueByChannelCard.tsx:** No changes needed  
✅ **revenue.ts:** getRevenueByChannel() query unchanged  
✅ **API Route:** /api/analytics/revenue-by-channel continues working  

## Performance Considerations

### Storage Limits

- **sessionStorage:** 5-10 MB (browser dependent)
- **localStorage:** 5-10 MB (browser dependent)
- **Our Usage:** ~500 bytes per user (well within limits)

### Performance Impact

- **Boot function:** Adds ~5ms to page load (negligible)
- **Event capture:** Adds ~1ms per event (negligible)
- **Console logging:** Can be removed in production if needed

### Browser Compatibility

- **sessionStorage:** IE8+, all modern browsers ✅
- **localStorage:** IE8+, all modern browsers ✅
- **URLSearchParams:** IE11+ (polyfilled in older browsers) ✅

## Troubleshooting

### Issue: UTM parameters not persisting

**Symptoms:** Events don't include utm_source after navigation  
**Check:**
```javascript
// In console
sessionStorage.getItem('ph_utm_source')
localStorage.getItem('ph_utm_source')
```
**Solution:** Ensure user hasn't disabled storage in browser settings

### Issue: Wrong channel attribution

**Symptoms:** Revenue attributed to wrong channel  
**Check:**
```javascript
localStorage.getItem('ph_attribution_source')
```
**Possible Causes:**
- User clicked multiple campaigns (last-touch attribution)
- localStorage not cleared between tests
- Clock skew causing timestamp issues

### Issue: No channel data in PostHog

**Symptoms:** Revenue by Channel shows empty  
**Check:**
1. Open DevTools → Console → Look for `[ph-injector]` logs
2. Check event payload includes utm_source
3. Verify PostHog API key is correct
4. Check PostHog dashboard for events (may take 1-2 minutes)

**Debug Command:**
```javascript
// Force a test event
window.posthog.capture('test_event', {
  utm_source: 'manual_test',
  utm_medium: 'console'
})
```

## Future Enhancements

### Potential Improvements

1. **Multi-Touch Attribution:**
   - Track all channels in user journey (not just last-touch)
   - Example: Google → Facebook → Email → Purchase
   - Store array in localStorage

2. **Attribution Decay:**
   - Expire attribution after 30/60/90 days
   - Currently: persists indefinitely

3. **Cross-Device Tracking:**
   - Use PostHog user_id to link mobile + desktop
   - Requires user identification

4. **Campaign Performance Dashboard:**
   - Real-time ROI by campaign
   - Conversion funnel by channel
   - Time-to-conversion by source

## Deployment

### Files Modified

```
web/public/lib/clientAnalytics/
├── ph-product-injector.js        (MODIFIED - lines 1309-1398, 388-490)
├── test-channel-tracking.html    (NEW - test suite)
└── CHANNEL_ATTRIBUTION.md        (NEW - this document)
```

### Deployment Checklist

- [ ] Code changes committed to git
- [ ] Tests passed locally
- [ ] Test page accessible at /lib/clientAnalytics/test-channel-tracking.html
- [ ] Deploy to Vercel staging
- [ ] Verify analytics events in PostHog staging
- [ ] Deploy to production
- [ ] Monitor console logs for errors
- [ ] Verify revenue by channel dashboard shows data

### Rollback Plan

If issues arise, revert these changes:

```bash
git revert <commit-hash>
git push origin main
```

The system will fall back to basic UTM capture (sessionStorage only).

## Support

For questions or issues with channel attribution tracking:

1. Check console logs: `[ph-injector]` prefix
2. Run test suite: `/lib/clientAnalytics/test-channel-tracking.html`
3. Verify PostHog events include utm_source property
4. Check this documentation for troubleshooting steps

---

**Last Updated:** 2024-05-14  
**Version:** 2.1.0  
**Author:** Analytics Team
