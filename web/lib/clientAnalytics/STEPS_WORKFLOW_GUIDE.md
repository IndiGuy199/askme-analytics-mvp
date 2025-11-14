# Steps Workflow Configuration Guide

**Version 1.0** — Complete guide for configuring funnel tracking with the steps workflow

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Step Attributes Reference](#step-attributes-reference)
4. [Configuration Patterns](#configuration-patterns)
5. [Real-World Examples](#real-world-examples)
6. [Advanced Techniques](#advanced-techniques)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The `steps` workflow enables sophisticated funnel tracking across your entire user journey. It automatically detects page views, element interactions, and form submissions to create a complete picture of user behavior.

### What Gets Tracked?

Steps can track:
- **Page views** (auto-fire on URL match)
- **Element appearances** (forms loading, success messages)
- **Button clicks** (submissions, CTAs, navigation)
- **Error states** (validation errors, failed submissions)
- **User flows** (onboarding, checkout, sign-up)

### Event Flow

```
User lands on page
    ↓
URL matches step.url?
    ↓ YES
Check priority order
    ↓
Is rule blocked?
    ↓ NO
autoFire? OR selector found?
    ↓ YES
Fire event to PostHog
    ↓
Mark as fired (if oncePerPath: true)
```

---

## Quick Start

### Basic Page View Tracking

Track when users visit important pages:

```javascript
steps: [
    {
        "key": "PRICING_PAGE_VIEWED",
        "url": "/pricing",
        "urlMatch": "contains",
        "autoFire": true,
        "oncePerPath": true
    }
]
```

**What happens**:
1. User visits /pricing
2. Event fires immediately (no selector needed)
3. Won't fire again on reload (oncePerPath)

---

### Form Submission Tracking

Track when users click submit buttons:

```javascript
steps: [
    {
        "key": "CONTACT_FORM_SUBMITTED",
        "url": "/contact",
        "urlMatch": "contains",
        "selector": "#contact-form button[type='submit']"
    }
]
```

**What happens**:
1. User visits /contact
2. Submit button gets tagged with `data-ph="CONTACT_FORM_SUBMITTED"`
3. When clicked, event fires to PostHog

---

### Element Detection Tracking

Track when specific elements appear (success messages, modals, etc.):

```javascript
steps: [
    {
        "key": "SUCCESS_MESSAGE_SHOWN",
        "url": "/submit",
        "urlMatch": "contains",
        "selector": ".alert-success",
        "requireSelectorPresent": true
    }
]
```

**What happens**:
1. User submits form
2. `.alert-success` appears in DOM
3. Event fires immediately
4. Hidden input created as marker

---

## Step Attributes Reference

### Core Attributes

#### `key` (required)
The event name sent to PostHog. Should use constants from `PH_KEYS`.

```javascript
"key": "ONBOARDING_STARTED"
"key": "CHECKOUT_COMPLETED"
"key": "ERROR_OCCURRED"
```

**Best Practice**: Use descriptive, ALL_CAPS names with underscores.

---

#### `url` (optional)
URL pattern to match. Leave empty to match all pages.

```javascript
"url": "/pricing"              // Match /pricing pages
"url": "/app/dashboard"        // Match dashboard
"url": ""                      // Match all pages
```

---

#### `urlMatch` (optional, default: "contains")
How to match the URL.

**Options**:
- `"contains"` - Substring match (most common)
- `"exact"` - Exact match
- `"regex"` - Regular expression

```javascript
// Contains (default)
{
    "url": "/pricing",
    "urlMatch": "contains"
}
// Matches: /pricing, /pricing/monthly, /en/pricing

// Exact
{
    "url": "/checkout/cart",
    "urlMatch": "exact"
}
// Matches ONLY: /checkout/cart

// Regex
{
    "url": "/(pricing|plans|subscribe)",
    "urlMatch": "regex"
}
// Matches: /pricing OR /plans OR /subscribe
```

---

#### `selector` (optional)
CSS selector for elements to track.

```javascript
"selector": "#contact-form"                    // Single element
"selector": "button[type='submit']"            // All submit buttons
"selector": ".alert-danger, .error-message"    // Multiple selectors (OR)
"selector": "[\"#form1\", \"#form2\"]"         // JSON array
```

**When to use**:
- Tracking button clicks
- Detecting element appearances
- Tagging interactive elements

**When NOT to use**:
- Simple page views (use `autoFire` instead)

---

#### `autoFire` (optional, default: false)
Fire event immediately when page loads (no selector needed).

```javascript
{
    "key": "LANDING_PAGE_VIEWED",
    "url": "/",
    "autoFire": true
}
```

**Use cases**:
- Page view tracking
- Entry point detection
- Initial funnel steps

**⚠️ Note**: Don't combine with `requireSelectorPresent` - they're mutually exclusive.

---

#### `requireSelectorPresent` (optional, default: false)
Fire event as soon as selector is found in DOM. Creates hidden input marker.

```javascript
{
    "key": "MODAL_OPENED",
    "selector": "#signup-modal",
    "requireSelectorPresent": true
}
```

**What happens**:
1. Script watches for `#signup-modal`
2. When found, event fires immediately
3. Hidden input created: `<input type="hidden" data-ph="MODAL_OPENED">`
4. Won't fire again (hidden input prevents duplicates)

**Use cases**:
- Success message detection
- Modal/dialog appearances
- Dynamic content loading
- Error state detection

---

#### `oncePerPath` (optional, default: true)
Fire event only once per unique URL path.

```javascript
{
    "key": "DASHBOARD_VIEWED",
    "url": "/dashboard",
    "autoFire": true,
    "oncePerPath": true  // Fire once per session on /dashboard
}
```

**When true**:
- Event fires once per unique path
- Page reloads don't re-fire
- Different paths fire separately

**When false**:
- Event fires every time
- Useful for retry buttons, re-submissions
- Use sparingly to avoid event spam

---

#### `priority` (optional, default: 100)
Evaluation order. **Lower number = higher priority.**

```javascript
{
    "key": "ERROR_CHECK",
    "priority": 1      // Evaluated FIRST
}
{
    "key": "SUCCESS_CHECK",
    "priority": 10     // Evaluated SECOND
}
{
    "key": "DEFAULT",
    "priority": 100    // Evaluated LAST (default)
}
```

**Use cases**:
- Error handling (errors should check first)
- Conditional logic (check blockers before success)
- Ordered workflows

**Default**: If not specified, uses 100 (low priority).

---

#### `blockRules` (optional, default: [])
Array of step keys to block if this step fires.

```javascript
{
    "key": "FORM_ERROR",
    "priority": 1,
    "blockRules": ["FORM_SUCCESS"]  // Block success if error found
}
{
    "key": "FORM_SUCCESS",
    "priority": 10
}
```

**How it works**:
1. Rules evaluated in priority order
2. If `FORM_ERROR` fires, adds `"FORM_SUCCESS"` to blocked Set
3. When `FORM_SUCCESS` evaluated, checks blocked Set
4. If blocked, doesn't fire or tag elements

**Use cases**:
- Error states blocking success
- Validation failures preventing submissions
- Conditional workflows

---

#### `textRegex` (optional)
Regular expression to match element text content.

```javascript
{
    "key": "SUBMIT_BUTTON_CLICKED",
    "selector": "button",
    "textRegex": "(?i)submit|continue|next"  // Case-insensitive
}
```

**Use cases**:
- Finding buttons by text when classes unavailable
- Matching dynamic text
- Language-agnostic tracking

---

#### `metadata` (optional, default: {})
Additional properties to include in PostHog event.

```javascript
{
    "key": "BUTTON_CLICKED",
    "selector": "#special-btn",
    "metadata": {
        "campaign": "summer_sale",
        "variant": "blue_button",
        "experiment_id": "exp_123"
    }
}
```

**Use cases**:
- A/B test tracking
- Campaign attribution
- Custom context

---

## Configuration Patterns

### Pattern 1: Simple Page View

Track page views without any interactions.

```javascript
{
    "key": "HOME_PAGE_VIEWED",
    "url": "/",
    "urlMatch": "exact",
    "autoFire": true,
    "oncePerPath": true
}
```

✅ **When to use**: Landing pages, category pages, content pages  
📊 **Funnel step**: Entry points

---

### Pattern 2: Button Click

Track when users click specific buttons.

```javascript
{
    "key": "SIGNUP_BUTTON_CLICKED",
    "url": "/",
    "selector": "#signup-btn, button.signup-cta",
    "oncePerPath": true
}
```

✅ **When to use**: CTAs, form submissions, navigation  
📊 **Funnel step**: User intent signals

---

### Pattern 3: Element Detection

Track when specific elements appear (success, errors, modals).

```javascript
{
    "key": "SUCCESS_MESSAGE_SHOWN",
    "url": "/submit",
    "selector": ".alert-success, .success-banner",
    "requireSelectorPresent": true,
    "oncePerPath": true
}
```

✅ **When to use**: Success confirmations, error states, dynamic content  
📊 **Funnel step**: Completion signals

---

### Pattern 4: Error Handling

Track errors and block success events.

```javascript
// High priority - check errors first
{
    "key": "FORM_ERROR",
    "url": "/submit",
    "selector": ".alert-danger, .error-message",
    "requireSelectorPresent": true,
    "priority": 1,
    "blockRules": ["FORM_SUCCESS"],
    "oncePerPath": false  // Allow multiple error tracking
}

// Low priority - success only if no errors
{
    "key": "FORM_SUCCESS",
    "url": "/submit",
    "selector": ".alert-success",
    "requireSelectorPresent": true,
    "priority": 10,
    "oncePerPath": true
}
```

✅ **When to use**: Form validation, submissions, critical workflows  
📊 **Funnel step**: Error vs success paths

---

### Pattern 5: Multi-Step Funnel

Track complete user journeys across multiple pages.

```javascript
steps: [
    // Step 1: Landing
    {
        "key": "FUNNEL_STARTED",
        "url": "/welcome",
        "autoFire": true,
        "oncePerPath": true,
        "metadata": {"funnel_name": "onboarding"}
    },
    
    // Step 2: Form started
    {
        "key": "FUNNEL_STEP1_STARTED",
        "url": "/signup",
        "selector": "#signup-form",
        "requireSelectorPresent": true,
        "metadata": {"funnel_name": "onboarding", "step": 1}
    },
    
    // Step 3: Form submitted
    {
        "key": "FUNNEL_STEP1_COMPLETED",
        "url": "/signup",
        "selector": "#signup-form button[type='submit']",
        "metadata": {"funnel_name": "onboarding", "step": 1}
    },
    
    // Step 4: Verification
    {
        "key": "FUNNEL_STEP2_STARTED",
        "url": "/verify",
        "autoFire": true,
        "metadata": {"funnel_name": "onboarding", "step": 2}
    },
    
    // Step 5: Completed
    {
        "key": "FUNNEL_COMPLETED",
        "url": "/dashboard",
        "autoFire": true,
        "oncePerPath": true,
        "metadata": {"funnel_name": "onboarding", "step": "complete"}
    }
]
```

✅ **When to use**: Onboarding, checkout, multi-page workflows  
📊 **Funnel step**: Complete journey mapping

---

## Real-World Examples

### Example 1: E-commerce Checkout Funnel

```javascript
steps: [
    // Cart viewed
    {
        "key": "CART_VIEWED",
        "url": "/cart",
        "autoFire": true,
        "oncePerPath": true
    },
    
    // Proceed to checkout
    {
        "key": "CHECKOUT_STARTED",
        "url": "/cart",
        "selector": "button.checkout-btn",
        "oncePerPath": true
    },
    
    // Shipping info
    {
        "key": "SHIPPING_INFO_ENTERED",
        "url": "/checkout/shipping",
        "selector": "#shipping-form button[type='submit']"
    },
    
    // Payment info
    {
        "key": "PAYMENT_INFO_ENTERED",
        "url": "/checkout/payment",
        "selector": "#payment-form button[type='submit']"
    },
    
    // Order confirmation
    {
        "key": "ORDER_COMPLETED",
        "url": "/checkout/confirmation",
        "selector": ".order-success",
        "requireSelectorPresent": true,
        "oncePerPath": true,
        "metadata": {"conversion": true}
    }
]
```

**PostHog Funnel**:
1. Cart Viewed
2. Checkout Started
3. Shipping Info Entered
4. Payment Info Entered
5. Order Completed

**Metrics**:
- Cart → Checkout conversion: XX%
- Checkout → Order conversion: XX%
- Drop-off points identified

---

### Example 2: SaaS Onboarding Flow

```javascript
steps: [
    // Sign-up initiated
    {
        "key": "SIGNUP_STARTED",
        "url": "/signup",
        "selector": "#email-input",
        "requireSelectorPresent": true,
        "oncePerPath": true
    },
    
    // Account created
    {
        "key": "ACCOUNT_CREATED",
        "url": "/signup",
        "selector": "#signup-form button[type='submit']",
        "oncePerPath": true
    },
    
    // Email verification
    {
        "key": "EMAIL_VERIFICATION_SENT",
        "url": "/verify-email",
        "autoFire": true
    },
    
    // Profile setup
    {
        "key": "PROFILE_SETUP_STARTED",
        "url": "/onboarding/profile",
        "autoFire": true
    },
    
    // Company info
    {
        "key": "COMPANY_INFO_ADDED",
        "url": "/onboarding/company",
        "selector": "#company-form button[type='submit']"
    },
    
    // First dashboard view
    {
        "key": "ONBOARDING_COMPLETED",
        "url": "/dashboard",
        "autoFire": true,
        "oncePerPath": true,
        "metadata": {"is_new_user": true}
    },
    
    // Activation (key action)
    {
        "key": "FIRST_PROJECT_CREATED",
        "url": "/projects/new",
        "selector": "#create-project-btn",
        "oncePerPath": true,
        "metadata": {"activation": true}
    }
]
```

**Key Metrics**:
- Sign-up → Account Created: XX%
- Account → Email Verified: XX%
- Onboarding → First Project: XX%
- Time to activation: XX days

---

### Example 3: Content/Blog Site

```javascript
steps: [
    // Article page view
    {
        "key": "ARTICLE_VIEWED",
        "url": "/blog/",
        "urlMatch": "contains",
        "autoFire": true,
        "oncePerPath": true
    },
    
    // Scroll depth (75%)
    {
        "key": "ARTICLE_READ_75",
        "url": "/blog/",
        "urlMatch": "contains",
        "selector": ".article-marker-75",  // Inject markers at 25%, 50%, 75%
        "requireSelectorPresent": true
    },
    
    // Newsletter signup opened
    {
        "key": "NEWSLETTER_MODAL_OPENED",
        "url": "/blog/",
        "urlMatch": "contains",
        "selector": "#newsletter-modal",
        "requireSelectorPresent": true
    },
    
    // Newsletter subscribed
    {
        "key": "NEWSLETTER_SUBSCRIBED",
        "url": "/blog/",
        "urlMatch": "contains",
        "selector": "#newsletter-modal .success",
        "requireSelectorPresent": true,
        "metadata": {"conversion": true}
    },
    
    // Related article clicked
    {
        "key": "RELATED_ARTICLE_CLICKED",
        "url": "/blog/",
        "urlMatch": "contains",
        "selector": ".related-articles a"
    }
]
```

**Engagement Metrics**:
- % of readers reaching 75% scroll
- Newsletter conversion rate
- Articles per session

---

### Example 4: Lead Generation Form

```javascript
steps: [
    // Landing page view
    {
        "key": "LANDING_PAGE_VIEWED",
        "url": "/demo",
        "autoFire": true,
        "oncePerPath": true,
        "metadata": {"page_type": "landing"}
    },
    
    // Form interaction started
    {
        "key": "FORM_STARTED",
        "url": "/demo",
        "selector": "#demo-form input:first-child",
        "requireSelectorPresent": true
    },
    
    // Validation error
    {
        "key": "FORM_VALIDATION_ERROR",
        "url": "/demo",
        "selector": ".form-error, .field-error",
        "requireSelectorPresent": true,
        "priority": 1,
        "blockRules": ["FORM_SUBMITTED"],
        "oncePerPath": false  // Track multiple errors
    },
    
    // Form submitted
    {
        "key": "FORM_SUBMITTED",
        "url": "/demo",
        "selector": "#demo-form button[type='submit']",
        "priority": 10,
        "oncePerPath": true
    },
    
    // Success confirmation
    {
        "key": "LEAD_CAPTURED",
        "url": "/demo",
        "selector": ".success-message, .thank-you",
        "requireSelectorPresent": true,
        "priority": 10,
        "oncePerPath": true,
        "metadata": {"conversion": true, "lead_source": "demo_form"}
    }
]
```

**Conversion Funnel**:
1. Landing Page Viewed: 1000
2. Form Started: 450 (45%)
3. Form Submitted: 280 (62% of started)
4. Lead Captured: 250 (89% success rate)

**Error Analysis**:
- Validation errors: 70 (15% of started forms)

---

### Example 5: SPA (Single Page Application)

```javascript
steps: [
    // App loaded
    {
        "key": "APP_LOADED",
        "url": "/app",
        "autoFire": true,
        "oncePerPath": true
    },
    
    // Main sections (SPA routes)
    {
        "key": "PROJECTS_VIEWED",
        "url": "/app/projects",
        "autoFire": true,
        "oncePerPath": true
    },
    {
        "key": "SETTINGS_VIEWED",
        "url": "/app/settings",
        "autoFire": true,
        "oncePerPath": true
    },
    {
        "key": "ANALYTICS_VIEWED",
        "url": "/app/analytics",
        "autoFire": true,
        "oncePerPath": true
    },
    
    // Dynamic modals/dialogs
    {
        "key": "CREATE_PROJECT_MODAL_OPENED",
        "selector": "[data-modal='create-project']",
        "requireSelectorPresent": true
    },
    
    // Actions
    {
        "key": "PROJECT_CREATED",
        "selector": "button[data-action='create-project']"
    },
    {
        "key": "SETTINGS_SAVED",
        "selector": "button[data-action='save-settings']"
    }
]
```

**SPA Tracking Features**:
- ✅ Detects route changes (pushState/replaceState hooked)
- ✅ MutationObserver for dynamic content
- ✅ Works without page reloads

---

## Advanced Techniques

### Technique 1: Cascading Error Handling

Handle multiple error severity levels:

```javascript
steps: [
    // Critical errors (highest priority)
    {
        "key": "CRITICAL_ERROR",
        "selector": ".critical-error, .fatal-error",
        "priority": 1,
        "blockRules": ["WARNING", "SUCCESS"],
        "requireSelectorPresent": true
    },
    
    // Warnings (medium priority)
    {
        "key": "WARNING",
        "selector": ".warning-message",
        "priority": 5,
        "blockRules": ["SUCCESS"],
        "requireSelectorPresent": true
    },
    
    // Success (lowest priority)
    {
        "key": "SUCCESS",
        "selector": ".success-message",
        "priority": 10,
        "requireSelectorPresent": true
    }
]
```

**Result**: Only the most severe state fires.

---

### Technique 2: Progressive Engagement

Track deepening engagement levels:

```javascript
steps: [
    // Level 1: Awareness
    {
        "key": "PAGE_VIEWED",
        "url": "/product",
        "autoFire": true,
        "metadata": {"engagement_level": 1}
    },
    
    // Level 2: Interest
    {
        "key": "DETAILS_EXPANDED",
        "selector": ".details-accordion",
        "requireSelectorPresent": true,
        "metadata": {"engagement_level": 2}
    },
    
    // Level 3: Consideration
    {
        "key": "VIDEO_PLAYED",
        "selector": ".video-player.playing",
        "requireSelectorPresent": true,
        "metadata": {"engagement_level": 3}
    },
    
    // Level 4: Intent
    {
        "key": "PRICING_CLICKED",
        "selector": "a[href='/pricing']",
        "metadata": {"engagement_level": 4}
    },
    
    // Level 5: Action
    {
        "key": "TRIAL_STARTED",
        "selector": "#start-trial-btn",
        "metadata": {"engagement_level": 5, "conversion": true}
    }
]
```

**Analysis**: Segment users by max engagement level reached.

---

### Technique 3: A/B Test Tracking

Track experiment variants:

```javascript
steps: [
    // Control group
    {
        "key": "CTA_CLICKED_CONTROL",
        "selector": "button.cta[data-variant='control']",
        "metadata": {
            "experiment": "cta_test_v1",
            "variant": "control"
        }
    },
    
    // Variant A
    {
        "key": "CTA_CLICKED_VARIANT_A",
        "selector": "button.cta[data-variant='a']",
        "metadata": {
            "experiment": "cta_test_v1",
            "variant": "a"
        }
    },
    
    // Variant B
    {
        "key": "CTA_CLICKED_VARIANT_B",
        "selector": "button.cta[data-variant='b']",
        "metadata": {
            "experiment": "cta_test_v1",
            "variant": "b"
        }
    }
]
```

**PostHog Analysis**: Compare conversion rates by variant.

---

### Technique 4: Feature Adoption Tracking

Track new feature usage:

```javascript
steps: [
    // Feature discovery
    {
        "key": "FEATURE_BANNER_VIEWED",
        "selector": ".feature-announcement",
        "requireSelectorPresent": true,
        "metadata": {"feature": "ai_assistant"}
    },
    
    // Feature tooltip opened
    {
        "key": "FEATURE_TOOLTIP_VIEWED",
        "selector": "[data-feature-tooltip='ai_assistant']",
        "requireSelectorPresent": true,
        "metadata": {"feature": "ai_assistant"}
    },
    
    // Feature activated
    {
        "key": "FEATURE_ACTIVATED",
        "selector": "button[data-feature='ai_assistant']",
        "metadata": {"feature": "ai_assistant", "activation": true}
    },
    
    // Feature used
    {
        "key": "FEATURE_USED",
        "selector": ".ai-assistant-panel",
        "requireSelectorPresent": true,
        "metadata": {"feature": "ai_assistant", "usage": true}
    }
]
```

**Metrics**:
- Discovery → Activation rate
- Activation → Usage rate
- Time to first use

---

## Troubleshooting

### Events Not Firing

**Problem**: Step configured but event not captured.

**Checklist**:
1. ✅ Does URL match `pageMatch` pattern?
2. ✅ Is selector valid CSS?
3. ✅ Is element visible in DOM?
4. ✅ Is step blocked by another rule?
5. ✅ Is `oncePerPath: true` preventing re-fire?

**Debug**:
```javascript
// Check if URL matches
console.log(location.pathname);
console.log(/your-pattern/.test(location.pathname));

// Check if selector exists
console.log(document.querySelectorAll('your-selector'));

// Check blocked rules
console.log(window.__blockedRules);

// Check fired events
console.log(window.__phFiredOnce);
```

---

### Duplicate Events

**Problem**: Same event firing multiple times.

**Solutions**:

1. **Add `oncePerPath: true`**:
```javascript
{
    "key": "PAGE_VIEWED",
    "oncePerPath": true  // ✅ Fire once per unique URL
}
```

2. **Check for multiple selectors matching**:
```javascript
// Bad: Both buttons match
"selector": "button"  // ❌ Too broad

// Good: Specific selector
"selector": "button#submit-btn"  // ✅ Unique
```

3. **Use `requireSelectorPresent`** for one-time events:
```javascript
{
    "key": "MODAL_SHOWN",
    "selector": "#modal",
    "requireSelectorPresent": true  // ✅ Fires once when found
}
```

---

### Selector Not Found

**Problem**: Console shows "Selector NOT FOUND" but element exists.

**Causes**:
1. **Element loads after script runs** (dynamic content)
   - ✅ Solution: Use `requireSelectorPresent: true`

2. **Selector syntax error**:
   ```javascript
   // Bad
   "selector": "#form[required]"  // ❌ Invalid
   
   // Good
   "selector": "#form [required]"  // ✅ Space matters!
   ```

3. **Element in iframe/shadow DOM**:
   - ⚠️ Shadow DOM not supported
   - ⚠️ iFrames not accessible

---

### Events Firing on Wrong Pages

**Problem**: Event fires on pages it shouldn't.

**Fix URL matching**:
```javascript
// Bad: Too broad
{
    "url": "/app",
    "urlMatch": "contains"  // ❌ Matches /app/anything
}

// Good: More specific
{
    "url": "/app/dashboard",
    "urlMatch": "exact"  // ✅ Only /app/dashboard
}

// Or use regex
{
    "url": "^/app/(dashboard|home)$",
    "urlMatch": "regex"  // ✅ Only these exact paths
}
```

---

### Blocking Not Working

**Problem**: Error present but success still fires.

**Check priority**:
```javascript
// Bad: Success has higher priority
{
    "key": "ERROR",
    "priority": 10,  // ❌ Evaluated AFTER success
    "blockRules": ["SUCCESS"]
}
{
    "key": "SUCCESS",
    "priority": 1   // ❌ Evaluated FIRST
}

// Good: Error has higher priority
{
    "key": "ERROR",
    "priority": 1,   // ✅ Evaluated FIRST
    "blockRules": ["SUCCESS"]
}
{
    "key": "SUCCESS",
    "priority": 10   // ✅ Evaluated SECOND
}
```

---

## Best Practices

### ✅ DO

1. **Use descriptive event names**:
   ```javascript
   "key": "CHECKOUT_STARTED"  // ✅ Clear
   "key": "BTN_CLICK"         // ❌ Vague
   ```

2. **Add metadata for context**:
   ```javascript
   "metadata": {
       "page_type": "landing",
       "campaign": "summer_sale",
       "variant": "blue_cta"
   }
   ```

3. **Use `oncePerPath` for page views**:
   ```javascript
   {
       "key": "PAGE_VIEWED",
       "autoFire": true,
       "oncePerPath": true  // ✅ Prevent duplicates
   }
   ```

4. **Test selectors in DevTools first**:
   ```javascript
   document.querySelectorAll('your-selector')
   ```

5. **Use data attributes for reliable tracking**:
   ```html
   <button data-tracking="signup-cta">Sign Up</button>
   ```
   ```javascript
   "selector": "[data-tracking='signup-cta']"
   ```

---

### ❌ DON'T

1. **Don't use overly broad selectors**:
   ```javascript
   "selector": "button"  // ❌ Matches ALL buttons
   "selector": ".btn"    // ❌ Too generic
   ```

2. **Don't forget URL matching**:
   ```javascript
   {
       "key": "FORM_SUBMITTED",
       // ❌ No URL - fires on ALL pages
   }
   ```

3. **Don't mix `autoFire` and `requireSelectorPresent`**:
   ```javascript
   {
       "autoFire": true,
       "requireSelectorPresent": true  // ❌ Conflicting
   }
   ```

4. **Don't rely on text content alone**:
   ```javascript
   "selector": "button"  // ❌
   "textRegex": "Submit"  // ❌ Text may change/translate
   
   // Better: Use data attributes
   "selector": "[data-action='submit']"  // ✅
   ```

---

## Configuration Template

```javascript
steps: [
    {
        // Event name (required)
        "key": "EVENT_NAME",
        
        // URL matching (optional)
        "url": "/page-path",
        "urlMatch": "contains",  // or "exact" or "regex"
        
        // Element targeting (optional)
        "selector": ".css-selector",
        
        // Behavior flags
        "autoFire": false,              // Fire immediately on page load?
        "requireSelectorPresent": false, // Fire when selector appears?
        "oncePerPath": true,            // Fire only once per URL?
        
        // Advanced
        "priority": 100,                // Evaluation order (lower = sooner)
        "blockRules": [],               // Block these if this fires
        "textRegex": "",                // Match element text content
        "metadata": {}                  // Additional event properties
    }
]
```

---

## Summary

### Key Takeaways

1. **Steps track user journeys** across pages and interactions
2. **Use `autoFire` for page views**, selectors for interactions
3. **Priority + blocking** enable sophisticated error handling
4. **`oncePerPath`** prevents duplicate events
5. **Metadata** adds context for analysis
6. **Test selectors** in DevTools before deploying

### Common Use Cases

| Use Case | Configuration |
|----------|--------------|
| Page view | `autoFire: true, oncePerPath: true` |
| Button click | `selector: "button.cta"` |
| Form submission | `selector: "form button[type='submit']"` |
| Success message | `selector: ".success", requireSelectorPresent: true` |
| Error handling | `priority: 1, blockRules: [...]` |
| Modal opened | `selector: "#modal", requireSelectorPresent: true` |

---

**Last Updated**: November 14, 2025  
**Version**: 1.0  
**Guides Available**:
- [Product Configuration Guide](PRODUCT_CONFIG_GUIDE.md)
- [Test Cases](PRODUCT_CONFIG_TEST_CASES.md)
- [Steps Workflow Guide](STEPS_WORKFLOW_GUIDE.md) (this file)
