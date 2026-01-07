# Client Configuration Guide - Scalable Architecture

## Problem: Managing 50+ Client Init Files

Currently, we have separate init files for each client (`askme-analytics-init.js`, `askme-analytics-init-ltp.js`). This approach **does not scale**:

❌ **Maintenance nightmare**: Bug fixes require updating 50+ files  
❌ **Version drift**: Clients end up on different code versions  
❌ **Code duplication**: Same logic copied across all files  
❌ **Error-prone**: Easy to miss updating one client  

---

## Solution: Single Init File + Configuration Overrides

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Single Universal Init File                                  │
│  askme-analytics-init.js (hosted on Vercel)                 │
│  - Duplicate prevention guards                               │
│  - Dynamic configuration loading                             │
│  - Default fallback values                                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼─────────┐  ┌─────▼──────────┐
│ Client A       │  │ Client B       │  │ Client C       │
│ (LTP)          │  │ (AskMe App)    │  │ (Future)       │
│                │  │                │  │                │
│ Override:      │  │ Override:      │  │ Override:      │
│ - clientId     │  │ - clientId     │  │ - clientId     │
│ - productCfg   │  │ - productCfg   │  │ - productCfg   │
│ - steps        │  │ - steps        │  │ - steps        │
└────────────────┘  └────────────────┘  └────────────────┘
```

---

## Implementation Strategy

### Option 1: Inline Configuration (Recommended for <10 clients)

Each client site loads the universal init script and defines config **before** loading:

```html
<!-- Client: Leisure Time Passport -->
<script>
  // ✅ Define config BEFORE loading init script
  window.AskMeAnalyticsConfig = {
    clientId: 'ask-me-ltp',
    debug: true,
    
    // Client-specific product tracking
    productConfig: {
      eventName: 'subscription_click',
      pageMatch: '/pricing',
      panelClass: 'pricing-card',
      titleClass: 'plan-title',
      priceClass: 'price-amount',
      productButtonSelectors: 'button.cta-button'
    },
    
    // Client-specific funnel steps
    steps: [
      {"key":"SUBSCRIPTION_CONTENT_VIEWED","url":"/pricing","urlMatch":"contains","autoFire": true},
      {"key":"SUBSCRIPTION_COMPLETED","url":"/checkout/success","urlMatch":"contains","autoFire": true}
    ]
  };
</script>

<!-- ✅ Load universal init script (same for ALL clients) -->
<script src="https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/askme-analytics-init.js"></script>
```

**Pros:**
- Simple implementation
- Easy to debug (config visible in HTML)
- No server requests for config

**Cons:**
- Config changes require updating client site HTML
- Not ideal for 50+ clients

---

### Option 2: External Configuration Files (Recommended for 50+ clients)

Store each client's config in a separate JSON file:

```
web/public/lib/clientAnalytics/configs/
  ├── ask-me-ltp.json
  ├── askme-analytics-app.json
  ├── client-x.json
  └── client-y.json
```

**Modified init script** loads config dynamically:

```javascript
// In askme-analytics-init.js
(function() {
    'use strict';

    // ✅ NEW: Dynamic config loading
    async function loadClientConfig() {
        const clientId = window.AskMeAnalyticsClientId || 'askme-analytics-app'; // Default
        const configUrl = `https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/configs/${clientId}.json`;
        
        try {
            const response = await fetch(configUrl);
            if (!response.ok) {
                console.warn(`⚠️ Config not found for ${clientId}, using defaults`);
                return getDefaultConfig(clientId);
            }
            
            const config = await response.json();
            console.log('✅ Loaded config for client:', clientId);
            return config;
            
        } catch (error) {
            console.warn('⚠️ Failed to load config, using defaults:', error);
            return getDefaultConfig(clientId);
        }
    }
    
    function getDefaultConfig(clientId) {
        return {
            apiKey: 'phc_MN5MXCec7lNZtZakqpRQZqTLaPfcV6CxeE8hfbTUFE2',
            apiHost: 'https://us.i.posthog.com',
            clientId: clientId,
            debug: false,
            autocapture: true,
            // ... other defaults
        };
    }
    
    // Main initialization
    async function initialize() {
        if (window.__askme_analytics_initialized) return;
        window.__askme_analytics_initialized = true;
        
        // Load config dynamically
        window.AskMeAnalyticsConfig = await loadClientConfig();
        
        // Continue with existing initialization...
        console.log('🚀 Initializing AskMe Analytics for:', window.AskMeAnalyticsConfig.clientId);
        // ... rest of init code
    }
    
    initialize();
})();
```

**Client HTML (SUPER SIMPLE):**

```html
<!-- Client: Leisure Time Passport -->
<script>
  // ✅ Just specify client ID
  window.AskMeAnalyticsClientId = 'ask-me-ltp';
</script>

<!-- ✅ Load universal init script -->
<script src="https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/askme-analytics-init.js"></script>
```

**Example config file:** `configs/ask-me-ltp.json`

```json
{
  "clientId": "ask-me-ltp",
  "debug": true,
  "productConfig": {
    "eventName": "subscription_click",
    "pageMatch": "/pricing",
    "panelClass": "pricing-card",
    "titleClass": "plan-title",
    "priceClass": "price-amount",
    "productButtonSelectors": "button.cta-button"
  },
  "steps": [
    {
      "key": "SUBSCRIPTION_CONTENT_VIEWED",
      "url": "/pricing",
      "urlMatch": "contains",
      "autoFire": true
    },
    {
      "key": "SUBSCRIPTION_COMPLETED",
      "url": "/checkout/success",
      "urlMatch": "contains",
      "autoFire": true
    }
  ]
}
```

**Pros:**
- ✅ Single init script for ALL clients (bug fixes deploy to everyone instantly)
- ✅ Configs managed centrally in your repo
- ✅ Easy to version control per-client settings
- ✅ Add new clients by creating JSON file
- ✅ Update client config without touching their site

**Cons:**
- Requires network request to fetch config (minimal ~5ms delay)
- Clients must set `window.AskMeAnalyticsClientId`

---

### Option 3: Database-Backed Configuration (Enterprise Scale)

For 100+ clients or complex multi-tenant scenarios:

```javascript
// API endpoint: /api/analytics/config/:clientId
async function loadClientConfig() {
    const clientId = window.AskMeAnalyticsClientId;
    const response = await fetch(`https://api.askme.com/analytics/config/${clientId}`, {
        headers: { 'X-Client-Domain': window.location.hostname }
    });
    
    return await response.json();
}
```

**Benefits:**
- Dynamic config updates (no deploy needed)
- Client portal for self-service config management
- A/B testing different configs
- Usage analytics per client

---

## Migration Plan: From Multiple Init Files to Single File

### Phase 1: Update Current Init Files (✅ DONE)

- [x] Apply duplicate prevention guards to `askme-analytics-init.js`
- [x] Apply duplicate prevention guards to `askme-analytics-init-ltp.js`

### Phase 2: Consolidate Logic

1. **Choose a primary init file** (recommend `askme-analytics-init.js`)
2. **Add dynamic config loading** (Option 2 above)
3. **Create config directory**: `web/public/lib/clientAnalytics/configs/`
4. **Extract client configs to JSON files**:
   - `ask-me-ltp.json`
   - `askme-analytics-app.json`

### Phase 3: Migrate Clients

Update client HTML one-by-one:

**Before:**
```html
<script src=".../askme-analytics-init-ltp.js"></script>
```

**After:**
```html
<script>window.AskMeAnalyticsClientId = 'ask-me-ltp';</script>
<script src=".../askme-analytics-init.js"></script>
```

### Phase 4: Deprecate Client-Specific Init Files

Once all clients migrated:
1. Archive old init files: `web/public/lib/clientAnalytics/legacy/`
2. Add deprecation notice to old files
3. Eventually delete after 6 months

---

## Configuration Schema

### Standard Configuration Object

```typescript
interface AskMeAnalyticsConfig {
  // Core settings (REQUIRED)
  clientId: string;                    // Unique client identifier
  apiKey: string;                      // PostHog API key
  apiHost: string;                     // PostHog host URL
  
  // Feature flags (OPTIONAL)
  debug?: boolean;                     // Console logging
  autocapture?: boolean;               // Auto-capture clicks
  capture_pageview?: boolean;          // Track page views
  capture_pageleave?: boolean;         // Track page exits
  
  // User identification (OPTIONAL)
  emailSelectors?: string;             // CSS selector for email inputs
  
  // Product tracking (OPTIONAL)
  productConfig?: {
    eventName: string;                 // Event name for product clicks
    pageMatch: string;                 // URL pattern to match
    
    // Panel/container selectors (use ONE)
    panelSelector?: string;
    panelClass?: string;
    panelAttr?: string;
    panelId?: string;
    panelXPath?: string;
    
    // Title selectors (use ONE)
    titleSelector?: string;
    titleClass?: string;
    titleAttr?: string;
    titleId?: string;
    titleXPath?: string;
    
    // Price selectors (use ONE)
    priceSelector?: string;
    priceClass?: string;
    priceAttr?: string;
    priceId?: string;
    priceXPath?: string;
    
    // Currency selectors (OPTIONAL)
    currencySelector?: string;
    currencyClass?: string;
    currencyAttr?: string;
    currencyId?: string;
    currencyXPath?: string;
    
    // Button selectors
    productButtonSelectors: string;    // CSS selectors for CTA buttons
  };
  
  // Funnel tracking (OPTIONAL)
  steps?: Array<{
    key: string;                       // Step key (from PH_KEYS enum)
    url: string;                       // URL pattern
    urlMatch: 'exact' | 'contains' | 'regex';
    autoFire: boolean;                 // Fire automatically on page load
    oncePerPath?: boolean;             // Fire only once per URL
    selector?: string;                 // Element selector (optional)
    requireSelectorPresent?: boolean;  // Require selector to exist
  }>;
}
```

---

## Version Control Strategy

### Git Branch Structure

```
main
  └── web/public/lib/clientAnalytics/
      ├── askme-analytics-init.js (v2.1.0 - latest)
      ├── ask-me-analytics.min.js
      ├── ph-constants.js
      ├── ph-product-injector.js
      └── configs/
          ├── ask-me-ltp.json
          ├── askme-analytics-app.json
          └── README.md (config schema docs)
```

### Versioning

Use **semantic versioning** in script headers:

```javascript
/**
 * AskMe Analytics Initialization Script
 * @version 2.1.0
 * @updated 2025-11-14
 * @changelog
 *   - 2.1.0: Added duplicate prevention guards
 *   - 2.0.0: Unified init script with dynamic config loading
 *   - 1.0.0: Initial release
 */
```

### Update Process

1. **Make changes** to `askme-analytics-init.js`
2. **Update version** in script header
3. **Test locally** with multiple client configs
4. **Commit & push** to main branch
5. **Vercel auto-deploys** - ALL clients get update instantly ✨
6. **Monitor PostHog** for errors (use `$exception` events)

---

## Testing Multi-Client Scenarios

### Test Suite

Create test configs for different client types:

```javascript
// test-configs.js
const testClients = [
  {
    id: 'basic-client',
    config: { clientId: 'basic-client', productConfig: null, steps: [] }
  },
  {
    id: 'premium-client',
    config: { clientId: 'premium', productConfig: { /* full config */ }, steps: [/* ... */] }
  },
  {
    id: 'enterprise-client',
    config: { /* complex config with all features */ }
  }
];

testClients.forEach(client => {
  console.log(`Testing ${client.id}...`);
  window.AskMeAnalyticsConfig = client.config;
  // Initialize and verify...
});
```

### Local Testing

```bash
# Test with LTP config
window.AskMeAnalyticsClientId = 'ask-me-ltp';

# Test with default config
window.AskMeAnalyticsClientId = 'askme-analytics-app';

# Test with non-existent config (should fallback to defaults)
window.AskMeAnalyticsClientId = 'does-not-exist';
```

---

## Client Onboarding Process

### 1. Create Config File

```bash
cd web/public/lib/clientAnalytics/configs
cp askme-analytics-app.json new-client.json
# Edit new-client.json with client-specific settings
```

### 2. Provide Client Integration Code

Send client this HTML snippet:

```html
<!-- AskMe Analytics - Client: {CLIENT_NAME} -->
<script>
  window.AskMeAnalyticsClientId = '{CLIENT_ID}';
</script>
<script src="https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/askme-analytics-init.js"></script>
```

### 3. Verify Installation

Check PostHog dashboard for events from new `client_id`:
- Filter events by `client_id = '{CLIENT_ID}'`
- Verify `$pageview`, `analytics_initialized` events
- Test product tracking if configured

---

## Rollback Strategy

If a bug is introduced in the universal init script:

### Option 1: Git Revert

```bash
git revert HEAD
git push origin main
# Vercel redeploys previous version
```

### Option 2: Per-Client Rollback

If only affecting one client:

```html
<!-- Temporarily pin to older version -->
<script>window.AskMeAnalyticsClientId = 'ask-me-ltp';</script>
<script src="https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/askme-analytics-init.js?v=2.0.0"></script>
```

### Option 3: Feature Flags

Add feature flags to configs:

```json
{
  "clientId": "ask-me-ltp",
  "features": {
    "useNewProductInjector": false,  // Disable new feature for this client
    "enableUserIdentification": true
  }
}
```

---

## Monitoring & Observability

### PostHog Dashboard Filters

Create saved insights for:

1. **Errors by Client**
   - Event: `$exception`
   - Breakdown by: `client_id`

2. **Initialization Success Rate**
   - Event: `analytics_initialized`
   - Breakdown by: `client_id`

3. **Product Tracking Coverage**
   - Event: `subscription_click`
   - Breakdown by: `client_id`, `product`

### Console Logging Standards

All clients see consistent logging:

```
🚀 Initializing AskMe Analytics for: ask-me-ltp
✅ Config loaded: ask-me-ltp
✅ Analytics library loaded
✅ GenericAnalytics v2.1.0 initialized
✅ PostHog loaded (autocapture enabled)
✅ Product injector initialized
✅ User identification enabled
```

---

## Cost Analysis

### Current Approach (Multiple Init Files)

- **Developer time per bug fix**: 30 mins × 50 clients = **25 hours**
- **Risk of missed updates**: HIGH
- **Consistency**: LOW

### Proposed Approach (Single Init + Configs)

- **Developer time per bug fix**: 30 mins × 1 file = **30 minutes**
- **Risk of missed updates**: ZERO (all clients updated automatically)
- **Consistency**: HIGH

**Time savings per year** (assuming 10 bug fixes/year): **240 hours (6 weeks)**

---

## Next Steps

### Immediate (This Week)

1. ✅ Apply duplicate prevention fixes to both init files
2. ⏳ Decide on Option 1 (inline) or Option 2 (external configs)
3. ⏳ Create `configs/` directory structure
4. ⏳ Extract LTP config to `ask-me-ltp.json`

### Short-term (This Month)

5. ⏳ Implement dynamic config loading in init script
6. ⏳ Migrate first client (LTP) to new system
7. ⏳ Create client onboarding documentation

### Long-term (Next Quarter)

8. ⏳ Migrate all existing clients
9. ⏳ Build client portal for self-service config management
10. ⏳ Deprecate legacy client-specific init files

---

## Questions?

Common questions from clients:

**Q: Will updating the init script break our site?**  
A: No. We use duplicate prevention guards and extensive error handling. Changes are tested across multiple client configs before deployment.

**Q: Can we customize our config without touching your server?**  
A: Yes, with Option 1 (inline config). With Option 2, submit a PR with your config JSON changes.

**Q: How do we test changes before going live?**  
A: Use a staging client ID (`ask-me-ltp-staging`) and create a staging config file. Test on your staging environment first.

**Q: Can different pages have different configs?**  
A: Yes, override config per-page in your HTML before loading the init script.

---

## Summary

**Recommendation**: Implement **Option 2 (External Configuration Files)** for scalability.

**Benefits:**
- ✅ Single source of truth for all clients
- ✅ Bug fixes deploy instantly to everyone
- ✅ Easy to onboard new clients (just create JSON file)
- ✅ Version controlled configs
- ✅ Scales to 100+ clients effortlessly

**Implementation Effort:** ~4-6 hours
**Maintenance Savings:** ~240 hours/year at 50 clients
