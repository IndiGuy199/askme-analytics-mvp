# 🎯 AskMe Analytics - CSS Class Convention Guide

**Version:** 1.0.0  
**Last Updated:** November 15, 2025

---

## Overview

This guide defines a **simple, predictable CSS class naming convention** for tracking user interactions. Instead of complex selectors, clients can add standardized classes to their UI elements for automatic analytics tracking.

---

## Philosophy

### ❌ The Problem

Complex selectors are fragile and hard to maintain:

```javascript
// Bad: Breaks when UI changes
"selector": ".pricing-card > div:nth-child(2) button[type='submit']"
"selector": "form#checkout-form input.submit-btn.primary"
```

### ✅ The Solution

Simple, semantic CSS classes that never break:

```html
<!-- Good: Clear, maintainable, works forever -->
<button class="ph-track-signup">Sign Up</button>
<button class="ph-track-checkout-complete">Complete Purchase</button>
```

---

## Naming Convention

### Prefix: `ph-track-*`

All tracking classes use the `ph-track-` prefix to:
- ✅ Avoid conflicts with existing CSS
- ✅ Make tracking elements immediately visible
- ✅ Enable easy search in codebase (`grep "ph-track"`)

### Format: `ph-track-{category}-{action}`

```
ph-track-[category]-[action]-[detail]
          ↓          ↓        ↓
       Feature    Action   Optional
```

**Examples:**
```html
<!-- Category: auth, Action: signup -->
<button class="ph-track-auth-signup">Sign Up</button>

<!-- Category: product, Action: select, Detail: premium -->
<button class="ph-track-product-select-premium">Choose Premium</button>

<!-- Category: checkout, Action: complete -->
<div class="ph-track-checkout-complete">Order Complete!</div>
```

---

## Standard Class Library

### 🔐 Authentication & User Management

| Class | Usage | Fires Event |
|-------|-------|-------------|
| `ph-track-auth-signup` | Sign up button/form | `SIGNUP_STARTED` |
| `ph-track-auth-signup-complete` | Signup success page | `SIGNUP_COMPLETED` |
| `ph-track-auth-login` | Login button/form | `LOGIN_ATTEMPTED` |
| `ph-track-auth-login-complete` | Login success (dashboard) | `LOGIN_COMPLETED` |
| `ph-track-auth-logout` | Logout button | `LOGOUT_CLICKED` |
| `ph-track-auth-forgot-password` | Forgot password link | `PASSWORD_RESET_STARTED` |
| `ph-track-auth-reset-complete` | Password reset success | `PASSWORD_RESET_COMPLETED` |

**Example:**
```html
<!-- Sign Up Page -->
<form action="/signup" method="POST">
  <input type="email" name="email" placeholder="Email">
  <input type="password" name="password" placeholder="Password">
  <button type="submit" class="ph-track-auth-signup">
    Create Account
  </button>
</form>

<!-- Dashboard (after login) -->
<body class="ph-track-auth-login-complete">
  <header>
    <button class="ph-track-auth-logout">Sign Out</button>
  </header>
</body>
```

---

### 💳 Product & Pricing

| Class | Usage | Fires Event |
|-------|-------|-------------|
| `ph-track-product-view` | Product catalog/listing page | `PRODUCT_CATALOGUE_VIEWED` |
| `ph-track-product-item` | Individual product card | `PRODUCT_VIEWED` (on click) |
| `ph-track-product-select` | Product selection button | `PRODUCT_SELECTED` |
| `ph-track-product-select-{plan}` | Specific plan selection | `PRODUCT_SELECTED` (with plan name) |
| `ph-track-pricing-view` | Pricing page loaded | `PRICING_PAGE_VIEWED` |
| `ph-track-pricing-compare` | Compare plans button | `PRICING_COMPARISON_VIEWED` |

**Example:**
```html
<!-- Pricing Page -->
<div class="pricing-page ph-track-pricing-view">
  
  <!-- Basic Plan -->
  <div class="pricing-card ph-track-product-item"
       data-product="Basic Plan"
       data-price="9.99"
       data-currency="USD">
    <h3>Basic Plan</h3>
    <div class="price">$9.99/mo</div>
    <button class="ph-track-product-select-basic">
      Choose Basic
    </button>
  </div>
  
  <!-- Premium Plan -->
  <div class="pricing-card ph-track-product-item"
       data-product="Premium Plan"
       data-price="29.99"
       data-currency="USD">
    <h3>Premium Plan</h3>
    <div class="price">$29.99/mo</div>
    <button class="ph-track-product-select-premium">
      Choose Premium
    </button>
  </div>
  
</div>
```

---

### 🛒 Checkout & Purchase

| Class | Usage | Fires Event |
|-------|-------|-------------|
| `ph-track-checkout-start` | Begin checkout button | `CHECKOUT_STARTED` |
| `ph-track-checkout-info` | Billing info page | `CHECKOUT_INFO_ENTERED` |
| `ph-track-checkout-payment` | Payment page | `CHECKOUT_PAYMENT_VIEWED` |
| `ph-track-checkout-submit` | Submit payment button | `CHECKOUT_SUBMITTED` |
| `ph-track-checkout-complete` | Order confirmation page | `CHECKOUT_COMPLETED` |
| `ph-track-checkout-error` | Error message element | `CHECKOUT_ERROR` |

**Example:**
```html
<!-- Checkout Flow -->

<!-- Step 1: Billing Information -->
<form action="/checkout/payment" method="POST" 
      class="ph-track-checkout-info">
  <input type="text" name="name" placeholder="Full Name">
  <input type="text" name="address" placeholder="Address">
  <button type="submit">Continue to Payment</button>
</form>

<!-- Step 2: Payment -->
<form action="/checkout/submit" method="POST"
      class="ph-track-checkout-payment">
  <input type="text" name="card" placeholder="Card Number">
  <button type="submit" class="ph-track-checkout-submit">
    Complete Purchase
  </button>
</form>

<!-- Step 3: Confirmation -->
<div class="order-confirmation ph-track-checkout-complete"
     data-revenue="29.99"
     data-product-name="Premium Plan"
     data-currency="USD">
  <h1>✅ Order Complete!</h1>
  <p>Order #12345</p>
</div>
```

---

### 🔄 Subscription Management

| Class | Usage | Fires Event |
|-------|-------|-------------|
| `ph-track-subscription-start` | Start subscription button | `SUBSCRIPTION_STARTED` |
| `ph-track-subscription-complete` | Subscription success | `SUBSCRIPTION_COMPLETED` |
| `ph-track-subscription-upgrade` | Upgrade plan button | `SUBSCRIPTION_UPGRADED` |
| `ph-track-subscription-downgrade` | Downgrade plan button | `SUBSCRIPTION_DOWNGRADED` |
| `ph-track-subscription-cancel` | Cancel subscription button | `SUBSCRIPTION_CANCELED` |
| `ph-track-subscription-renew` | Renew subscription button | `SUBSCRIPTION_RENEWED` |

**Example:**
```html
<!-- Account Settings -->
<div class="subscription-management">
  <h2>Your Plan: Basic</h2>
  
  <button class="ph-track-subscription-upgrade"
          data-from-plan="Basic"
          data-to-plan="Premium">
    Upgrade to Premium
  </button>
  
  <button class="ph-track-subscription-cancel">
    Cancel Subscription
  </button>
</div>
```

---

### 👥 Onboarding & Setup

| Class | Usage | Fires Event |
|-------|-------|-------------|
| `ph-track-onboard-start` | Onboarding flow begins | `ONBOARDING_STARTED` |
| `ph-track-onboard-step1` | First step completion | `ONBOARDING_STEP1_COMPLETED` |
| `ph-track-onboard-step2` | Second step completion | `ONBOARDING_STEP2_COMPLETED` |
| `ph-track-onboard-step3` | Third step completion | `ONBOARDING_STEP3_COMPLETED` |
| `ph-track-onboard-complete` | Onboarding finished | `ONBOARDING_COMPLETED` |
| `ph-track-onboard-skip` | Skip onboarding button | `ONBOARDING_SKIPPED` |

**Example:**
```html
<!-- Onboarding Flow -->

<!-- Step 1: Profile -->
<form action="/onboarding/step2" method="POST"
      class="ph-track-onboard-step1">
  <input type="text" name="company" placeholder="Company Name">
  <input type="text" name="role" placeholder="Your Role">
  <button type="submit">Continue</button>
  <a href="/dashboard" class="ph-track-onboard-skip">Skip</a>
</form>

<!-- Step 2: Preferences -->
<form action="/onboarding/step3" method="POST"
      class="ph-track-onboard-step2">
  <label><input type="checkbox" name="email"> Email Notifications</label>
  <label><input type="checkbox" name="sms"> SMS Alerts</label>
  <button type="submit">Continue</button>
</form>

<!-- Step 3: Complete -->
<div class="ph-track-onboard-complete">
  <h1>🎉 You're All Set!</h1>
  <button onclick="window.location='/dashboard'">
    Go to Dashboard
  </button>
</div>
```

---

### 📞 Support & Help

| Class | Usage | Fires Event |
|-------|-------|-------------|
| `ph-track-help-view` | Help center page | `HELP_CENTER_VIEWED` |
| `ph-track-help-search` | Help search box | `HELP_SEARCHED` |
| `ph-track-help-article` | Help article clicked | `HELP_ARTICLE_VIEWED` |
| `ph-track-contact-view` | Contact page viewed | `CONTACT_US_VIEWED` |
| `ph-track-contact-submit` | Contact form submit | `CONTACT_US_ATTEMPTED` |
| `ph-track-support-chat` | Live chat opened | `SUPPORT_CHAT_OPENED` |

**Example:**
```html
<!-- Help Center -->
<div class="help-center ph-track-help-view">
  <input type="text" 
         class="ph-track-help-search" 
         placeholder="Search help articles">
  
  <article class="ph-track-help-article"
           data-article-title="How to reset password">
    <h2>How to reset password</h2>
    <p>...</p>
  </article>
</div>

<!-- Contact Page -->
<form action="/contact/submit" method="POST"
      class="ph-track-contact-view">
  <input type="email" name="email" placeholder="Email">
  <textarea name="message" placeholder="Message"></textarea>
  <button type="submit" class="ph-track-contact-submit">
    Send Message
  </button>
</form>
```

---

### 🎨 Content Engagement

| Class | Usage | Fires Event |
|-------|-------|-------------|
| `ph-track-content-view` | Article/blog page | `CONTENT_VIEWED` |
| `ph-track-content-share` | Share button | `CONTENT_SHARED` |
| `ph-track-content-download` | Download button | `CONTENT_DOWNLOADED` |
| `ph-track-video-play` | Video play button | `VIDEO_PLAYED` |
| `ph-track-video-complete` | Video completion trigger | `VIDEO_COMPLETED` |
| `ph-track-cta-click` | Call-to-action button | `CTA_CLICKED` |

**Example:**
```html
<!-- Blog Post -->
<article class="blog-post ph-track-content-view"
         data-content-title="10 Marketing Tips"
         data-content-category="Marketing">
  
  <h1>10 Marketing Tips for Success</h1>
  <p>...</p>
  
  <button class="ph-track-content-share"
          data-share-platform="twitter">
    Share on Twitter
  </button>
  
  <a href="/ebook.pdf" 
     class="ph-track-content-download"
     data-content-type="ebook">
    Download Full Guide
  </a>
  
</article>
```

---

## Data Attributes for Rich Context

Combine tracking classes with data attributes for detailed analytics:

### Product/Pricing Data

```html
<button class="ph-track-product-select-premium"
        data-product="Premium Plan"
        data-price="29.99"
        data-currency="USD"
        data-interval="monthly">
  Choose Premium
</button>
```

### Revenue Data

```html
<div class="ph-track-checkout-complete"
     data-revenue="29.99"
     data-product-name="Premium Plan"
     data-currency="USD"
     data-quantity="1"
     data-order-id="12345">
  Order Complete!
</div>
```

### Content Data

```html
<article class="ph-track-content-view"
         data-content-title="Marketing Guide"
         data-content-category="Marketing"
         data-content-author="John Doe"
         data-reading-time="5">
  ...
</article>
```

### User Context

```html
<form class="ph-track-auth-signup"
      data-signup-source="homepage"
      data-referrer="facebook">
  ...
</form>
```

---

## Configuration

### Automatic Detection (Recommended)

The analytics library automatically detects all `ph-track-*` classes. No configuration needed!

```html
<!-- Just add the class - it works automatically -->
<button class="ph-track-checkout-complete">Complete Order</button>
```

### Steps Configuration (Optional)

For more control, configure steps in your client config:

```json
{
  "clientId": "my-site",
  "steps": [
    {
      "key": "CHECKOUT_COMPLETED",
      "selector": ".ph-track-checkout-complete",
      "requireSelectorPresent": true,
      "autoFire": true
    },
    {
      "key": "PRODUCT_SELECTED",
      "selector": ".ph-track-product-select",
      "extractData": true
    }
  ]
}
```

---

## Complete Example: E-commerce Flow

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
  
  <!-- Load Analytics -->
  <script>
    window.AskMeAnalyticsConfig = {
      clientId: 'my-store',
      debug: true
    };
  </script>
  <script src="https://analytics.askme.com/lib/askme-analytics-init.js"></script>
</head>
<body>

<!-- Homepage -->
<div class="homepage">
  <header>
    <button class="ph-track-auth-login">Sign In</button>
    <button class="ph-track-auth-signup">Sign Up</button>
  </header>
  
  <section>
    <h1>Welcome!</h1>
    <button class="ph-track-cta-click" 
            data-cta-location="hero">
      View Pricing
    </button>
  </section>
</div>

<!-- Pricing Page -->
<div class="pricing-page ph-track-pricing-view">
  
  <div class="pricing-card ph-track-product-item"
       data-product="Basic Plan"
       data-price="9.99"
       data-currency="USD">
    <h3>Basic Plan</h3>
    <div class="price">$9.99/month</div>
    <ul>
      <li>Feature 1</li>
      <li>Feature 2</li>
    </ul>
    <button class="ph-track-product-select-basic">
      Choose Basic
    </button>
  </div>
  
  <div class="pricing-card ph-track-product-item"
       data-product="Premium Plan"
       data-price="29.99"
       data-currency="USD">
    <h3>Premium Plan</h3>
    <div class="price">$29.99/month</div>
    <ul>
      <li>Everything in Basic</li>
      <li>Premium Feature 1</li>
      <li>Premium Feature 2</li>
    </ul>
    <button class="ph-track-product-select-premium">
      Choose Premium
    </button>
  </div>
  
</div>

<!-- Checkout -->
<div class="checkout-page ph-track-checkout-start">
  
  <form action="/checkout/submit" method="POST"
        class="ph-track-checkout-payment">
    
    <h2>Complete Your Purchase</h2>
    
    <input type="text" name="name" placeholder="Full Name" required>
    <input type="email" name="email" placeholder="Email" required>
    <input type="text" name="card" placeholder="Card Number" required>
    
    <button type="submit" class="ph-track-checkout-submit">
      Pay $29.99
    </button>
    
  </form>
  
</div>

<!-- Order Confirmation -->
<div class="order-confirmation ph-track-checkout-complete"
     data-revenue="29.99"
     data-product-name="Premium Plan"
     data-currency="USD"
     data-quantity="1"
     data-order-id="ORD-12345">
  
  <h1>✅ Order Complete!</h1>
  <p>Order #ORD-12345</p>
  
  <div class="order-summary">
    <div>Product: Premium Plan</div>
    <div>Total: $29.99</div>
  </div>
  
  <button onclick="window.location='/dashboard'">
    Go to Dashboard
  </button>
  
</div>

<!-- Dashboard (after login) -->
<div class="dashboard ph-track-auth-login-complete">
  
  <header>
    <button class="ph-track-auth-logout">Sign Out</button>
  </header>
  
  <main>
    <h1>Dashboard</h1>
    <p>Welcome back!</p>
  </main>
  
</div>

</body>
</html>
```

---

## CSS Styling (Important!)

The tracking classes are **semantic only** - they don't add visual styles:

```css
/* ✅ CORRECT: Add visual styles to separate classes */
.btn-primary {
  background: blue;
  color: white;
  padding: 10px 20px;
}

/* Use both classes together */
<button class="btn-primary ph-track-product-select">
  Choose Plan
</button>
```

```css
/* ❌ WRONG: Don't style tracking classes */
.ph-track-product-select {
  background: blue;  /* Don't do this! */
}
```

---

## Migration Guide

### Option 1: Add Classes to Existing Elements

```html
<!-- Before -->
<button class="btn btn-primary" onclick="checkout()">
  Buy Now
</button>

<!-- After: Just add tracking class -->
<button class="btn btn-primary ph-track-checkout-start" onclick="checkout()">
  Buy Now
</button>
```

### Option 2: Wrapper Approach

```html
<!-- Before -->
<div class="order-complete">
  <h1>Success!</h1>
</div>

<!-- After: Add tracking class to parent -->
<div class="order-complete ph-track-checkout-complete"
     data-revenue="29.99"
     data-product-name="Premium">
  <h1>Success!</h1>
</div>
```

### Option 3: Keep Both (Transition Period)

```json
{
  "steps": [
    {
      "key": "CHECKOUT_COMPLETED",
      "selectorList": [
        ".ph-track-checkout-complete",  // New convention
        ".order-confirmation",           // Legacy selector
        "#checkout-success"              // Legacy selector
      ],
      "requireSelectorPresent": true,
      "autoFire": true
    }
  ]
}
```

---

## Testing

### Visual Indicator (Development Mode)

Add this to your site during development to highlight tracked elements:

```html
<style>
  /* Show tracked elements in dev mode */
  [class*="ph-track-"] {
    outline: 2px dashed orange !important;
    position: relative;
  }
  
  [class*="ph-track-"]::after {
    content: attr(class);
    position: absolute;
    top: -20px;
    left: 0;
    background: orange;
    color: white;
    font-size: 10px;
    padding: 2px 5px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 9999;
  }
</style>
```

### Console Verification

```javascript
// Find all tracked elements on page
document.querySelectorAll('[class*="ph-track-"]').forEach(el => {
  console.log(el.className, el);
});

// Count tracked elements
const count = document.querySelectorAll('[class*="ph-track-"]').length;
console.log(`Found ${count} tracked elements`);
```

### Browser Extension (Optional)

Create a bookmarklet to highlight tracked elements:

```javascript
javascript:(function(){
  document.querySelectorAll('[class*="ph-track-"]').forEach(el => {
    el.style.outline = '3px solid orange';
    el.style.backgroundColor = 'rgba(255,165,0,0.1)';
  });
  alert(`Found ${document.querySelectorAll('[class*="ph-track-"]').length} tracked elements`);
})();
```

---

## Best Practices

### ✅ DO

- Use semantic class names that describe the action
- Add data attributes for rich context
- Keep classes simple and readable
- Document tracking classes in your codebase
- Test tracking before deploying

### ❌ DON'T

- Don't use tracking classes for visual styling
- Don't add tracking classes dynamically via JavaScript (add on page load)
- Don't use complex nested selectors anymore
- Don't reuse same class for different actions

---

## Class Naming Rules

1. **Always start with `ph-track-`**
2. **Use kebab-case** (lowercase with hyphens)
3. **Be specific** but not verbose
4. **Follow pattern**: `ph-track-{category}-{action}-{detail}`

**Examples:**

✅ Good:
```
ph-track-auth-signup
ph-track-product-select-premium
ph-track-checkout-complete
```

❌ Bad:
```
track-signup           (missing prefix)
ph-track-SignUp        (wrong case)
ph-track-button-1      (not semantic)
```

---

## Quick Reference Card

```
Authentication:          ph-track-auth-{action}
Product/Pricing:         ph-track-product-{action}
                         ph-track-pricing-{action}
Checkout:                ph-track-checkout-{action}
Subscription:            ph-track-subscription-{action}
Onboarding:              ph-track-onboard-{action}
Support:                 ph-track-help-{action}
                         ph-track-contact-{action}
Content:                 ph-track-content-{action}
                         ph-track-video-{action}
CTA:                     ph-track-cta-click
```

---

## Summary

### Why This System Works

1. **Simple**: Just add a CSS class
2. **Predictable**: Clear naming convention
3. **Maintainable**: Classes don't break when UI changes
4. **Flexible**: Works with any framework (React, Vue, vanilla HTML)
5. **Discoverable**: Easy to search codebase for `ph-track-`
6. **Zero Config**: Works automatically, no complex configuration needed

### Getting Started

1. Choose relevant classes from the standard library
2. Add classes to your UI elements
3. Add data attributes for context (optional)
4. Load analytics library
5. Done! Events automatically tracked

---

**Questions?** Contact support or refer to the Client Revenue Tracking Guide for advanced use cases.
