# AskMe Analytics - ph-product-injector.js

**Version 1.2.0** — Complete analytics solution with backend-agnostic identity bridge

---

## 🚀 What's New in v1.2.0

### Backend-Agnostic Identity Bridge

The injector now includes a **client-side identity API** that works with any authentication system:

```javascript
// Before login
window.AMA.preAuthMark();

// After verified session
window.AMA.afterLoginIdentify(
  { id: 'user_123', email: 'user@example.com' },
  { plan: 'premium', company_id: 'acme' }
);

// On logout
window.AMA.onLogoutCleanup('user_123');
```

**Features:**
- ✅ Works with Email+Password, SSO OAuth, Magic Link
- ✅ No backend dependencies (Supabase, Auth0, etc.)
- ✅ Privacy-first (no PII before verified auth)
- ✅ Automatic history merge via PostHog alias
- ✅ Session guards prevent duplicate identifies

**👉 [Read the Identity Bridge Integration Guide →](docs/integration.md)**

---

## 📚 Table of Contents

1. [Identity Bridge (NEW)](#identity-bridge-new)
2. [Overview](#overview)
3. [Features](#features)
4. [Quick Start](#quick-start)
5. [Configuration Guide](#configuration-guide)
6. [Rule Blocking](#rule-blocking)
7. [Testing](#testing)
8. [Test Results](#test-results)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## Identity Bridge (NEW)

### Quick Integration

**3-Step Pattern** for all auth types:

```javascript
// 1. Before login
AMA.preAuthMark();

// 2. After verified session
const me = await fetch('/api/me').then(r => r.json());
AMA.afterLoginIdentify(
  { id: me.id, email: me.email },
  { plan: me.plan, company_id: me.company_id }
);

// 3. On logout
AMA.onLogoutCleanup(user.id);
```

### Documentation

- **Complete Guide**: [docs/integration.md](docs/integration.md) — All auth types with examples
- **QA Checklist**: [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) — 8 test scenarios
- **Quick Start**: [QUICK_START.md](QUICK_START.md) — Copy-paste examples
- **TypeScript**: [types/ama.d.ts](types/ama.d.ts) — Full type definitions

### Test Demo

Open [test-identity-bridge.html](test-identity-bridge.html) in your browser to see the identity bridge in action.

---

## Overview

The `ph-product-injector.js` script provides automatic analytics tracking for user journeys, product interactions, and form submissions. It dynamically tags DOM elements and captures events to PostHog based on configurable rules.

### Key Capabilities

- **🆕 Backend-Agnostic Identity Bridge**: Works with any auth system
- **Dynamic Step Tagging**: Automatically tags elements based on URL and selector rules
- **Conditional Rule Blocking**: Error states prevent success events from firing
- **Product Metadata Tracking**: Captures product, price, and currency data
- **SPA Support**: Works with Single Page Applications via MutationObserver
- **Deduplication**: Prevents duplicate events with `oncePerPath` mechanism
- **Priority-Based Evaluation**: Control rule execution order for complex scenarios

---

## Features

### Core Features

- ✅ **requireSelectorPresent**: Fire event once when selector appears
- ✅ **autoFire**: Fire event immediately on page load (no selector needed)
- ✅ **oncePerPath**: Deduplicate events per URL path
- ✅ **blockRules**: Conditional rule blocking (error states prevent success states)
- ✅ **priority**: Rule evaluation order (lower number = higher priority)
- ✅ **Product metadata**: Automatic `data-product`, `data-price`, `data-currency` tagging
- ✅ **Click tracking**: Capture events on element clicks
- ✅ **Email identification**: Auto-identify users from email input fields
- ✅ **URL matching**: Supports contains, exact, and regex matching
- ✅ **Robust selectors**: Handles CSV, JSON arrays, and complex selectors

### Browser Support

- Modern browsers with MutationObserver support
- PostHog SDK (loaded separately)

---

## Quick Start

### 1. Load Constants First

```html
<script src="/resources/js/common/ph-constants.js"></script>
```

### 2. Configure and Load Injector

```html
<script>
    window.addEventListener('load', function () {
        var s = document.createElement('script');
        s.id = 'ph-product-injector';
        s.src = '/resources/js/common/ph-product-injector.js';

        // Configure rules
        s.setAttribute(PH_DATA_KEYS.STEPS, JSON.stringify([
            {
                "key": PH_KEYS.ONBOARDING_STARTED,
                "url": "/app/profile/createProfile",
                "urlMatch": "contains",
                "selector": "#membershipProfile",
                "requireSelectorPresent": true,
                "priority": 10,
                "oncePerPath": true
            }
        ]));

        document.head.appendChild(s);
    }, { once: true });
</script>
```

### 3. Basic Configuration Example

```javascript
s.setAttribute(PH_DATA_KEYS.STEPS, JSON.stringify([
    // Onboarding flow
    {
        "key": PH_KEYS.ONBOARDING_STARTED,
        "url": "/app/profile/createProfile",
        "urlMatch": "contains",
        "selector": "#membershipProfile",
        "requireSelectorPresent": true,
        "oncePerPath": true
    },
    {
        "key": PH_KEYS.ONBOARDING_STEP1_COMPLETED,
        "url": "/app/profile/createProfile",
        "urlMatch": "contains",
        "selector": "#membershipProfile input[type=submit]"
    },
    
    // Checkout flow
    {
        "key": PH_KEYS.CHECKOUT_VIEWED,
        "url": "/app/renew/submitRenewal",
        "urlMatch": "contains",
        "autoFire": true
    }
]));
```

---

## Configuration Guide

### Rule Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | string | required | Event name from `PH_KEYS` |
| `url` | string | `""` | URL pattern to match |
| `urlMatch` | string | `"contains"` | Match type: `contains`, `exact`, or `regex` |
| `selector` | string | `""` | CSS selector for elements to tag |
| `selectorList` | array | `[]` | Array of selectors (parsed from CSV/JSON) |
| `textRegex` | string | `""` | Regex to match element text content |
| `priority` | number | `100` | Evaluation order (lower = higher priority) |
| `requireSelectorPresent` | boolean | `false` | Fire when selector exists (creates hidden input) |
| `autoFire` | boolean | `false` | Fire immediately on page load |
| `oncePerPath` | boolean | `true` | Fire only once per URL path |
| `blockRules` | array | `[]` | Array of rule keys to block if this fires |
| `metadata` | object | `{}` | Additional properties to include in event |

### URL Matching

```javascript
// Contains (default)
{ "url": "/app/profile", "urlMatch": "contains" }
// Matches: /app/profile, /app/profile/createProfile, etc.

// Exact
{ "url": "/app/profile/createProfile", "urlMatch": "exact" }
// Matches only: /app/profile/createProfile

// Regex
{ "url": "/app/(profile|settings)", "urlMatch": "regex" }
// Matches: /app/profile or /app/settings
```

### Selector Options

```javascript
// Single selector
{ "selector": "#membershipProfile" }

// Multiple selectors (CSV)
{ "selector": ".alert-danger, .error-message, .validation-error" }

// JSON array
{ "selector": "[\"#form1\", \"#form2\"]" }

// Text-based fallback
{ "textRegex": "(?i)submit|continue" }  // Case-insensitive
```

---

## Rule Blocking

### Overview

The `blockRules` feature allows error states to prevent success events from firing. This ensures accurate analytics when form submissions fail or validation errors occur.

### Use Case: Error Handling

**Problem**: When a form submission fails:
- Error element appears (`.alert-danger`)
- Both `ONBOARDING_ERROR` and `ONBOARDING_STARTED` would fire
- You only want the error event

**Solution**: Configure error rule to block success rule

### Configuration Example

```javascript
s.setAttribute(PH_DATA_KEYS.STEPS, JSON.stringify([
    // HIGH PRIORITY: Error rule (evaluated first)
    {
        "key": PH_KEYS.ONBOARDING_ERROR,
        "url": "/app/profile/createProfile",
        "urlMatch": "contains",
        "selector": "#membershipProfile .alert-danger",
        "requireSelectorPresent": true,
        "priority": 1,                      // 🔥 Evaluated first
        "blockRules": ["ONBOARDING_STARTED"], // 🚫 Block this if error found
        "oncePerPath": false                // Allow multiple error tracking
    },
    
    // LOW PRIORITY: Success rule (evaluated second)
    {
        "key": PH_KEYS.ONBOARDING_STARTED,
        "url": "/app/profile/createProfile",
        "urlMatch": "contains",
        "selector": "#membershipProfile",
        "requireSelectorPresent": true,
        "priority": 10,                     // Evaluated after errors
        "oncePerPath": true                 // Fire only once
    }
]));
```

### How It Works

```
┌─────────────────────────────────────────┐
│ Fresh Page Load (No Error)             │
├─────────────────────────────────────────┤
│ 1. applyAllRules() → blockedRules.clear()
│ 2. ONBOARDING_ERROR (priority: 1)      │
│    → Selector NOT FOUND → doesn't block│
│ 3. ONBOARDING_STARTED (priority: 10)   │
│    → Selector FOUND → FIRES ✅          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Form Error Appears                      │
├─────────────────────────────────────────┤
│ 1. DOM mutates → applyAllRules()       │
│ 2. blockedRules.clear() → reset        │
│ 3. ONBOARDING_ERROR (priority: 1)      │
│    → Selector FOUND → FIRES ✅          │
│    → Adds "ONBOARDING_STARTED" to Set  │
│ 4. ONBOARDING_STARTED (priority: 10)   │
│    → BLOCKED ❌ (no fire, no tag)      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Error Disappears                        │
├─────────────────────────────────────────┤
│ 1. DOM mutates → applyAllRules()       │
│ 2. blockedRules.clear() → reset        │
│ 3. ONBOARDING_ERROR (priority: 1)      │
│    → Selector NOT FOUND → doesn't block│
│ 4. ONBOARDING_STARTED (priority: 10)   │
│    → Already fired (oncePerPath: true) │
│    → Doesn't fire again                │
└─────────────────────────────────────────┘
```

### Key Points

- ✅ **Priority matters**: Lower number = evaluated first
- ✅ **Blocking is temporary**: `blockedRules` Set cleared on each run
- ✅ **Prevents everything**: No event, no tagging, no hidden inputs
- ✅ **Fresh evaluation**: Re-evaluates on every DOM change
- ✅ **Multiple blocking**: One rule can block multiple others

### Advanced Patterns

#### Block Multiple Rules
```javascript
{
    "key": "CHECKOUT_ERROR",
    "blockRules": ["CHECKOUT_VIEWED", "CHECKOUT_SUBMITTED", "CHECKOUT_COMPLETED"]
}
```

#### Cascading Priorities
```javascript
[
    { "key": "CRITICAL_ERROR", "priority": 1, "blockRules": ["WARNING", "SUCCESS"] },
    { "key": "WARNING", "priority": 5, "blockRules": ["SUCCESS"] },
    { "key": "SUCCESS", "priority": 10 }
]
```

#### Multiple Error Selectors
```javascript
{
    "key": "FORM_ERROR",
    "selector": ".alert-danger, .error-message, .validation-error",
    "priority": 1,
    "blockRules": ["FORM_STARTED"]
}
```

---

## Testing

### Test Files

#### 1. `test-manual.html` - Comprehensive Testing
Interactive test suite with all 10 core tests:
- Injector loading
- Constants availability
- Event capture
- Element tagging
- Hidden inputs
- Product metadata
- Deduplication
- Click tracking
- Selector validation
- Visibility detection

**Usage**: Open in browser → Click "Run Manual Test"

#### 2. `test-blocking.html` - Rule Blocking Tests
Interactive demonstration of blocking mechanism:
- Show/hide error functionality
- Real-time blocking validation
- Debug console output
- Visual test results

**Usage**:
1. Open in browser
2. Click "Show Error" → Error rule fires, blocks success rule
3. Click "Hide Error" → Blocking removed
4. Click "Run All Tests" → Comprehensive validation

### Console Debug Output

Look for these messages to verify blocking:

```javascript
[DEBUG] Selector "#membershipProfile .alert-danger" found 1 elements
[DEBUG] Rule "ONBOARDING_ERROR" is blocking "ONBOARDING_STARTED"
[DEBUG] Rule "ONBOARDING_STARTED" is blocked by another rule
[MOCK PostHog] Captured: ONBOARDING_ERROR {path: '/app/profile/createProfile'}
```

---

## Test Results

### Bug Fix: MutationObserver Infinite Loop

**Date**: October 16, 2025  
**Status**: ✅ FIXED

#### Problem
Pages would hang when rules were configured with `requireSelectorPresent`. The `applyAllRules()` function modified the DOM, which triggered the MutationObserver, which called `applyAllRules()` again → infinite loop.

#### Solution
Added disconnect/reconnect pattern:

```javascript
function applyAllRules() {
    // 🛡️ Disconnect before DOM modifications
    if (window.__phMutationObserver) {
        window.__phMutationObserver.disconnect();
    }

    // Modify DOM safely
    blockedRules.clear();
    rules.forEach(tagElementsForRule);

    // 🛡️ Reconnect after modifications
    if (window.__phMutationObserver) {
        window.__phMutationObserver.observe(document.documentElement, { 
            childList: true, 
            subtree: true 
        });
    }
}
```

### All Tests Passing ✅

**10/10 Tests Passed** via `test-manual.html`:

1. ✅ Injector Loaded - ph-product-injector.js loaded successfully
2. ✅ Constants Available - PH_KEYS (15), PH_DATA_KEYS (9), PH_PRODUCT_DOM (3)
3. ✅ Events Captured - SIGNUP_COMPLETED auto-fired
4. ✅ Elements Tagged - 2 elements with data-ph attributes
5. ✅ Hidden Elements Created - requireSelectorPresent logic validated
6. ✅ Product Metadata - Product, Price, Currency tracked
7. ✅ Deduplication Active - oncePerPath mechanism working
8. ✅ Click Event Binding - SIGNUP_CTA_CLICKED captured on click
9. ✅ Selector Validation - Invalid selectors handled correctly
10. ✅ Visibility Detection - Hidden vs visible elements distinguished

### Rule Blocking Tests ✅

**All Blocking Tests Passed** via `test-blocking.html`:

- ✅ `ONBOARDING_STARTED` fires on fresh page load without errors
- ✅ `ONBOARDING_ERROR` fires when `.alert-danger` appears
- ✅ `ONBOARDING_STARTED` does NOT fire when error is present
- ✅ `ONBOARDING_STARTED` does NOT tag elements when blocked
- ✅ No infinite loops or console errors
- ✅ Works correctly with `oncePerPath: true`
- ✅ Priority-based evaluation works (lower priority number = higher precedence)

---

## Troubleshooting

### Events Not Firing

**Check**:
1. Is PostHog SDK loaded? Check `window.posthog`
2. Does URL match? Check `urlMatch` setting
3. Is selector valid? Open console for `[DEBUG]` messages
4. Is rule blocked? Look for `"is blocked by another rule"` messages

**Debug**:
```javascript
// Check if rules are parsed
console.log(parseSteps());

// Check deduplication
console.log(window.__phFiredOnce);

// Check blocked rules
console.log(blockedRules);
```

### Elements Not Tagged

**Check**:
1. Is element visible? Hidden elements aren't tagged (except hidden inputs)
2. Is `requireSelectorPresent: true`? Creates hidden input instead of tagging
3. Is rule blocked? Check console for blocking messages
4. Does selector match? Use browser DevTools to test selector

**Debug**:
```javascript
// Test selector
document.querySelectorAll('YOUR_SELECTOR');

// Check tagged elements
document.querySelectorAll('[data-ph]');

// Check hidden inputs
document.querySelectorAll('input[type="hidden"][data-ph]');
```

### Blocking Not Working

**Check**:
1. Is priority set correctly? Lower number = higher priority
2. Is `blockRules` array correct? Must match exact key names
3. Is error selector found? Check console debug output
4. Are both rules on same URL? Check `url` and `urlMatch` settings

**Debug**:
```javascript
// Check current blocked rules
console.log(blockedRules);

// Check if selector exists
document.querySelectorAll('.alert-danger').length;

// Force re-evaluation
applyAllRules();
```

### Duplicate Events

**Solution**: Add `oncePerPath: true` to rule configuration

```javascript
{
    "key": PH_KEYS.ONBOARDING_STARTED,
    "oncePerPath": true  // ✅ Prevents duplicates
}
```

### Infinite Loops

**Fixed**: Disconnect/reconnect pattern prevents infinite loops. If you still see issues:

1. Check for custom DOM modifications in your code
2. Verify `window.__phMutationObserver` is being used correctly
3. Check console for stack overflow errors

---

## API Reference

### Global Objects

#### `window.PH_KEYS`
Event key constants for consistent naming across the application.

```javascript
PH_KEYS.SIGNUP_CTA_CLICKED
PH_KEYS.ONBOARDING_STARTED
PH_KEYS.ONBOARDING_ERROR
PH_KEYS.CHECKOUT_COMPLETED
// ... etc
```

#### `window.PH_DATA_KEYS`
Data attribute keys for injector configuration.

```javascript
PH_DATA_KEYS.EVENT_NAME      // 'data-event-name'
PH_DATA_KEYS.STEPS           // 'data-steps'
PH_DATA_KEYS.PAGE_MATCH      // 'data-page-match'
// ... etc
```

#### `window.PH_PRODUCT_DOM`
DOM attribute keys for product metadata.

```javascript
PH_PRODUCT_DOM.PRODUCT       // 'data-product'
PH_PRODUCT_DOM.PRICE         // 'data-price'
PH_PRODUCT_DOM.CURRENCY      // 'data-currency'
```

#### `window.PH_PROPS`
Property keys for PostHog event payloads.

```javascript
PH_PROPS.PRODUCT    // 'product'
PH_PROPS.PRICE      // 'price'
PH_PROPS.CURRENCY   // 'currency'
PH_PROPS.PATH       // 'path'
```

### Internal Functions

#### `captureOnce(name, props, options)`
Captures an event to PostHog with deduplication.

```javascript
captureOnce('ONBOARDING_STARTED', 
    { path: '/app/profile' }, 
    { scopePath: true }
);
```

#### `applyAllRules()`
Evaluates all rules and tags/fires events. Called on:
- Page load
- Route change (SPA)
- DOM mutations

#### `tagElementsForRule(rule)`
Processes a single rule:
- Checks URL matching
- Checks if blocked
- Finds and tags elements
- Fires events if configured

---

## Quick Reference

### Common Configuration Patterns

```javascript
// Page view (auto-fire on URL match)
{
    "key": "PAGE_VIEWED",
    "url": "/app/dashboard",
    "urlMatch": "contains",
    "autoFire": true,
    "oncePerPath": true
}

// Form submission (click tracking)
{
    "key": "FORM_SUBMITTED",
    "selector": "#contactForm input[type=submit]",
    "oncePerPath": true
}

// Element appears (requireSelectorPresent)
{
    "key": "SUCCESS_MESSAGE",
    "selector": ".success-banner",
    "requireSelectorPresent": true
}

// Error blocking success
{
    "key": "FORM_ERROR",
    "selector": ".alert-danger",
    "priority": 1,
    "blockRules": ["FORM_SUCCESS"]
},
{
    "key": "FORM_SUCCESS",
    "selector": ".success-message",
    "priority": 10,
    "oncePerPath": true
}
```

### Debug Checklist

- [ ] Check console for `[DEBUG]` messages
- [ ] Verify `window.posthog` is loaded
- [ ] Test selector in DevTools console
- [ ] Check `window.__phFiredOnce` for deduplication
- [ ] Look for blocking messages
- [ ] Verify URL matching with current path
- [ ] Check element visibility with `isVisible()`

### Files Overview

- `ph-constants.js` - Global constants and enums
- `ph-product-injector.js` - Main injector logic
- `test-manual.html` - Comprehensive test suite
- `test-blocking.html` - Rule blocking tests
- `README.md` - This file

---

## Production Deployment

### Example: head.jsp Configuration

```jsp
<script src="/resources/js/common/ph-constants.js"></script>

<script>
    window.addEventListener('load', function () {
        var s = document.createElement('script');
        s.id = 'ph-product-injector';
        s.src = '/resources/js/common/ph-product-injector.js';

        s.setAttribute(PH_DATA_KEYS.EVENT_NAME, 'renew_click');
        s.setAttribute(PH_DATA_KEYS.PAGE_MATCH, '/app/renew');

        s.setAttribute(PH_DATA_KEYS.STEPS, JSON.stringify([
            // Renewal funnel with error handling
            {
                "key": PH_KEYS.RENEWAL_STARTED,
                "url": "/app/membership",
                "urlMatch": "contains",
                "selector": "form input[type=submit]"
            },
            {
                "key": PH_KEYS.CHECKOUT_ERROR,
                "url": "/app/renew/pay",
                "urlMatch": "contains",
                "selector": "input[type=submit]",
                "requireSelectorPresent": true,
                "priority": 1,
                "blockRules": ["RENEWAL_COMPLETED"]
            },
            {
                "key": PH_KEYS.RENEWAL_COMPLETED,
                "url": "/app/renew/pay",
                "urlMatch": "contains",
                "selector": ".receipt",
                "requireSelectorPresent": true,
                "priority": 10,
                "oncePerPath": true
            },
            
            // Onboarding funnel with error handling
            {
                "key": PH_KEYS.ONBOARDING_ERROR,
                "url": "/app/profile/createProfile",
                "urlMatch": "contains",
                "selector": "#membershipProfile .alert-danger",
                "requireSelectorPresent": true,
                "priority": 1,
                "blockRules": ["ONBOARDING_STARTED"]
            },
            {
                "key": PH_KEYS.ONBOARDING_STARTED,
                "url": "/app/profile/createProfile",
                "urlMatch": "contains",
                "selector": "#membershipProfile",
                "requireSelectorPresent": true,
                "priority": 10,
                "oncePerPath": true
            },
            {
                "key": PH_KEYS.ONBOARDING_STEP1_COMPLETED,
                "url": "/app/profile/createProfile",
                "urlMatch": "contains",
                "selector": "#membershipProfile input[type=submit]"
            },
            {
                "key": PH_KEYS.SIGNUP_COMPLETED,
                "url": "/auth/dashboard",
                "urlMatch": "contains",
                "autoFire": true,
                "oncePerPath": true
            }
        ]));

        document.head.appendChild(s);
    }, { once: true });
</script>
```

---

## Support & Contribution

### Need Help?

1. Check this README for common patterns
2. Open `test-manual.html` or `test-blocking.html` for live examples
3. Check browser console for `[DEBUG]` messages
4. Review PostHog dashboard for captured events

### Files

- **Main**: `ph-product-injector.js`, `ph-constants.js`
- **Tests**: `test-manual.html`, `test-blocking.html`
- **Docs**: `README.md` (this file)

---

**Status**: ✅ Production Ready  
**Last Updated**: October 16, 2025  
**Version**: 2.0 (with rule blocking support)
