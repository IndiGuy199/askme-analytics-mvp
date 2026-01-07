# Fix: Duplicate Analytics Initialization (Stack Overflow)

## Problem Identified

The client `ask-me-ltp` was experiencing a **critical recursive stack overflow** error caused by **duplicate PostHog initialization**. This manifested as:

```
Uncaught RangeError: Maximum call stack size exceeded
at posthog-core.ts:1012
```

### Root Causes

1. **Double Script Loading**
   - Both `ask-me-analytics.js` (unminified) AND `ask-me-analytics.min.js` (minified) were being loaded
   - This caused PostHog to initialize twice on the same page

2. **Duplicate Initialization Calls**
   - `GenericAnalytics.init()` was called multiple times
   - PostHog's queue execution method (`push()`) entered infinite recursion

3. **Missing Duplicate Protection**
   - No guards to prevent scripts from loading twice
   - No checks to prevent initialization functions from running multiple times

### Console Evidence

```javascript
// BOTH libraries loaded:
ask-me-analytics.js:324 ✅ GenericAnalytics v1.0.1 loaded
ask-me-analytics.min.js:1 ✅ GenericAnalytics v1.0.1 loaded

// BOTH initialized:
ask-me-analytics.js:156 🔧 GenericAnalytics initializing (autocapture only)
ask-me-analytics.min.js:1 🔧 GenericAnalytics initializing (autocapture only)

// Stack overflow:
posthog-core.ts:1012 Uncaught RangeError: Maximum call stack size exceeded
    at $o.push (posthog-core.ts:1012:14)
    at t.<computed> [as set_config] (ask-me-analytics.min.js:1:1106)
    at $o._execute_array (posthog-core.ts:987:9)
    at $o.push (posthog-core.ts:1012:14)
    // ... infinite recursion ...
```

---

## Solution Implemented

Updated `web/public/lib/clientAnalytics/askme-analytics-init-ltp.js` with **comprehensive duplicate prevention guards**:

### 1. Main Initialization Guard

```javascript
function initialize() {
    // ✅ CRITICAL: Prevent double initialization
    if (window.__askme_analytics_initialized) {
        console.warn('⚠️ AskMe Analytics already initialized. Skipping duplicate initialization.');
        return;
    }
    window.__askme_analytics_initialized = true;
    
    // Check if analytics library is already loaded
    if (window.GenericAnalytics) {
        console.log('✅ Analytics library already loaded (from page), skipping script load');
        initAnalytics();
        loadConstants();
        return;
    }
    // ... rest of initialization
}
```

### 2. GenericAnalytics Init Guard

```javascript
function initAnalytics() {
    // ✅ CRITICAL: Prevent duplicate initialization
    if (window.__askme_genericanalytics_initialized) {
        console.warn('⚠️ GenericAnalytics already initialized. Skipping duplicate init.');
        return;
    }
    
    // Check if PostHog is already initialized on page
    if (window.posthog && window.posthog.__loaded) {
        console.log('✅ PostHog already initialized on page, reusing existing instance');
        window.__askme_genericanalytics_initialized = true;
        // ... trigger ready event
        return;
    }
    
    window.__askme_genericanalytics_initialized = true;
    // ... proceed with initialization
}
```

### 3. Script Loading Guard

```javascript
function loadScript(src, onLoad, onError) {
    // ✅ CRITICAL: Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
        console.log('✅ Script already loaded:', src);
        if (onLoad) onLoad();
        return existingScript;
    }
    
    // ... load script
}
```

### 4. Product Injector Guard

```javascript
function setupProductInjector() {
    // ✅ CRITICAL: Prevent duplicate product injector setup
    if (window.__askme_product_injector_initialized) {
        console.warn('⚠️ Product injector already initialized. Skipping duplicate setup.');
        return;
    }
    window.__askme_product_injector_initialized = true;
    // ... setup product injector
}
```

### 5. User Identification Guard

```javascript
function setupUserIdentification() {
    // ✅ CRITICAL: Prevent duplicate user identification setup
    if (window.__askme_user_identification_initialized) {
        return; // Already setup
    }
    window.__askme_user_identification_initialized = true;
    // ... setup user identification
}
```

### 6. Group Identification Guard

```javascript
function setupGroupIdentification() {
    // ✅ CRITICAL: Prevent duplicate group identification
    if (window.__askme_group_identified) {
        return; // Already identified
    }
    window.__askme_group_identified = true;
    // ... identify group
}
```

---

## Global Flags Used

All guards use window-scoped flags to prevent duplicate execution:

| Flag | Purpose |
|------|---------|
| `window.__askme_analytics_initialized` | Main initialization guard |
| `window.__askme_genericanalytics_initialized` | GenericAnalytics.init() guard |
| `window.__askme_product_injector_initialized` | Product injector setup guard |
| `window.__askme_user_identification_initialized` | User identification guard |
| `window.__askme_group_identified` | PostHog group identification guard |

---

## Testing Instructions

### 1. Deploy Updated Script

```bash
cd web
npm run build
git add public/lib/clientAnalytics/askme-analytics-init-ltp.js
git commit -m "Fix: Prevent duplicate analytics initialization and stack overflow"
git push origin main
```

### 2. Test on Client Site

Add this to your client's HTML:

```html
<!-- Option 1: Load init script ONCE -->
<script src="https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/askme-analytics-init-ltp.js"></script>

<!-- DO NOT load ask-me-analytics.js or ask-me-analytics.min.js separately -->
<!-- The init script will load the correct version automatically -->
```

### 3. Verify No Duplicates in Console

Expected console output (NO DUPLICATES):

```
🚀 Initializing AskMe Analytics...
✅ Analytics library loaded
✅ GenericAnalytics v1.0.1 loaded
🔧 GenericAnalytics initializing (autocapture only)
✅ PostHog loaded (autocapture enabled)
✅ AskMe Analytics initialized successfully
✅ PostHog constants loaded
✅ Product injector script loaded
✅ PostHog group identified for client: ask-me-ltp
✅ User identification setup complete
```

### 4. Verify No Stack Overflow

❌ **Should NOT see:**
```
Uncaught RangeError: Maximum call stack size exceeded
```

✅ **Should see:**
```
[PostHog.js] Starting in debug mode
[PostHog.js] send "$pageview"
```

---

## Additional Recommendations

### For Client Sites

1. **Load ONLY the init script**
   ```html
   <script src=".../askme-analytics-init-ltp.js"></script>
   ```

2. **Do NOT load these manually:**
   - ❌ `ask-me-analytics.js`
   - ❌ `ask-me-analytics.min.js`
   - ❌ `ph-constants.js`
   - ❌ `ph-product-injector.js`
   
   The init script loads these automatically.

3. **Check for duplicate script tags** in your HTML
   ```bash
   grep -i "analytics" your-page.html
   ```

4. **Clear browser cache** after deployment
   - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - Or use incognito/private browsing mode

### Handling Browser Tracking Prevention

Some browsers (Edge, Safari) block 3rd-party tracking by default. The console shows:

```
Tracking Prevention blocked access to storage for <URL>
```

**This is expected behavior** and does not affect functionality. PostHog will:
- Still capture events (stored in memory)
- Fall back to sessionStorage if localStorage is blocked
- Use alternative identifiers when cookies are blocked

To minimize these warnings, consider:
1. Hosting PostHog on your own domain (reverse proxy)
2. Using a CNAME for the analytics endpoint
3. Setting up PostHog self-hosted (eliminates 3rd-party tracking flags)

---

## Files Modified

- ✅ `web/public/lib/clientAnalytics/askme-analytics-init-ltp.js`

## Status

- ✅ Duplicate initialization guards added
- ✅ Script loading guards added
- ✅ Retry limits added (prevents infinite retry loops)
- ✅ Error handling improved
- ✅ Console logging clarified

## Deployment

After changes are committed and pushed, Vercel will auto-deploy. The updated script will be available at:

```
https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/askme-analytics-init-ltp.js
```

Client sites using this URL will automatically receive the fix.

---

## Contact

If stack overflow errors persist after deployment, check:

1. Client site HTML for duplicate script tags
2. Browser console for actual error source
3. Network tab to verify only ONE analytics library loads
4. PostHog initialization count (should be exactly 1)

Report issues with:
- Full browser console log
- Network tab screenshot showing all script loads
- Client site URL
- Browser version and tracking prevention settings
