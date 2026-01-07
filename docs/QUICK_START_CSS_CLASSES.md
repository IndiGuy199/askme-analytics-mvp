# 🚀 Quick Start: CSS Class Convention Implementation

**Get tracking running in 5 minutes with zero configuration!**

---

## Step 1: Add Analytics Library

Add this to the `<head>` of your HTML:

```html
<script>
  window.AskMeAnalyticsConfig = {
    clientId: 'your-client-id',  // Replace with your client ID
    debug: true                   // Set to false in production
  };
</script>
<script src="https://analytics.askme.com/lib/askme-analytics-init.js"></script>
```

---

## Step 2: Add Tracking Classes

Just add `ph-track-*` classes to your UI elements:

### 📝 Sign Up Flow

```html
<!-- Sign Up Page -->
<form action="/signup" method="POST">
  <input type="text" name="name" placeholder="Full Name">
  <input type="email" name="email" placeholder="Email">
  <input type="password" name="password" placeholder="Password">
  
  <button type="submit" class="btn btn-primary ph-track-auth-signup">
    Create Account
  </button>
</form>

<!-- Sign Up Success Page -->
<div class="success-message ph-track-auth-signup-complete">
  <h1>✅ Welcome! Your account is ready.</h1>
</div>
```

**Events Fired:**
- Click "Create Account" → `SIGNUP_STARTED`
- Success page loads → `SIGNUP_COMPLETED` ✅

---

### 🔐 Login Flow

```html
<!-- Login Page -->
<form action="/login" method="POST">
  <input type="email" name="email" placeholder="Email">
  <input type="password" name="password" placeholder="Password">
  
  <button type="submit" class="btn btn-primary ph-track-auth-login">
    Sign In
  </button>
  
  <a href="/forgot-password" class="ph-track-auth-forgot-password">
    Forgot Password?
  </a>
</form>

<!-- Dashboard (after login) -->
<body class="dashboard ph-track-auth-login-complete">
  <header>
    <button class="ph-track-auth-logout">Sign Out</button>
  </header>
  <main>
    <h1>Dashboard</h1>
  </main>
</body>
```

**Events Fired:**
- Click "Sign In" → `LOGIN_ATTEMPTED`
- Dashboard loads → `LOGIN_COMPLETED` ✅
- Click "Sign Out" → `LOGOUT_CLICKED`
- Click "Forgot Password?" → `PASSWORD_RESET_STARTED`

---

### 💰 Pricing & Product Selection

```html
<!-- Pricing Page -->
<div class="pricing-page ph-track-pricing-view">
  
  <!-- Basic Plan -->
  <div class="pricing-card"
       data-product="Basic Plan"
       data-price="9.99"
       data-currency="USD">
    <h3>Basic Plan</h3>
    <div class="price">$9.99/month</div>
    <button class="btn ph-track-product-select-basic">
      Choose Basic
    </button>
  </div>
  
  <!-- Premium Plan -->
  <div class="pricing-card"
       data-product="Premium Plan"
       data-price="29.99"
       data-currency="USD">
    <h3>Premium Plan</h3>
    <div class="price">$29.99/month</div>
    <button class="btn ph-track-product-select-premium">
      Choose Premium
    </button>
  </div>
  
</div>
```

**Events Fired:**
- Pricing page loads → `PRICING_PAGE_VIEWED` ✅
- Click "Choose Premium" → `PRODUCT_SELECTED` with product data

---

### 🛒 Checkout & Revenue Tracking

```html
<!-- Checkout Page -->
<form action="/checkout/submit" method="POST" class="ph-track-checkout-start">
  <h2>Complete Your Purchase</h2>
  
  <input type="text" name="name" placeholder="Full Name">
  <input type="email" name="email" placeholder="Email">
  <input type="text" name="card" placeholder="Card Number">
  
  <button type="submit" class="btn btn-primary ph-track-checkout-submit">
    Pay $29.99
  </button>
</form>

<!-- Order Confirmation Page -->
<div class="order-confirmation ph-track-checkout-complete"
     data-revenue="29.99"
     data-product-name="Premium Plan"
     data-currency="USD"
     data-quantity="1"
     data-order-id="12345">
  
  <h1>✅ Order Complete!</h1>
  
  <div class="order-summary">
    <p>Order #12345</p>
    <p>Product: Premium Plan</p>
    <p>Total: $29.99</p>
  </div>
  
  <button onclick="window.location='/dashboard'">
    Go to Dashboard
  </button>
  
</div>
```

**Events Fired:**
- Checkout page loads → `CHECKOUT_STARTED` ✅
- Click "Pay $29.99" → `CHECKOUT_SUBMITTED`
- Confirmation page loads → `CHECKOUT_COMPLETED` with revenue: $29.99 💰

---

### 👥 Onboarding Flow

```html
<!-- Onboarding Step 1 -->
<form action="/onboarding/step2" method="POST" class="ph-track-onboard-step1">
  <h2>Tell us about yourself</h2>
  <input type="text" name="company" placeholder="Company Name">
  <input type="text" name="role" placeholder="Your Role">
  <button type="submit">Continue</button>
  <a href="/dashboard" class="ph-track-onboard-skip">Skip Onboarding</a>
</form>

<!-- Onboarding Step 2 -->
<form action="/onboarding/complete" method="POST" class="ph-track-onboard-step2">
  <h2>Set your preferences</h2>
  <label><input type="checkbox" name="email"> Email Notifications</label>
  <label><input type="checkbox" name="sms"> SMS Alerts</label>
  <button type="submit">Finish Setup</button>
</form>

<!-- Onboarding Complete -->
<div class="ph-track-onboard-complete">
  <h1>🎉 You're All Set!</h1>
  <button onclick="window.location='/dashboard'">Go to Dashboard</button>
</div>
```

**Events Fired:**
- Step 1 page loads → `ONBOARDING_STEP1_COMPLETED` ✅
- Step 2 page loads → `ONBOARDING_STEP2_COMPLETED` ✅
- Complete page loads → `ONBOARDING_COMPLETED` ✅
- Click "Skip" → `ONBOARDING_SKIPPED`

---

## Step 3: Test Your Implementation

### Open Browser Console

```javascript
// Check if PostHog loaded
console.log(window.posthog);  // Should show PostHog object

// See all tracked elements on page
document.querySelectorAll('[class*="ph-track-"]').forEach(el => {
  console.log('✅', el.className);
});

// Count tracked elements
const count = document.querySelectorAll('[class*="ph-track-"]').length;
console.log(`Found ${count} tracked elements`);
```

### Test With UTM Parameters

Visit your site with tracking parameters:

```
https://your-site.com/pricing?utm_source=facebook&utm_medium=cpc&utm_campaign=spring-sale
```

Complete a purchase and verify in PostHog:
- Event: `CHECKOUT_COMPLETED`
- Properties should include:
  - `revenue`: "29.99"
  - `product_name`: "Premium Plan"
  - `utm_source`: "facebook"
  - `utm_medium`: "cpc"
  - `utm_campaign`: "spring-sale"

---

## Complete Working Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My SaaS Product</title>
  
  <!-- Analytics Setup -->
  <script>
    window.AskMeAnalyticsConfig = {
      clientId: 'my-saas-product',
      debug: true
    };
  </script>
  <script src="https://analytics.askme.com/lib/askme-analytics-init.js"></script>
  
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .btn { padding: 10px 20px; cursor: pointer; }
    .btn-primary { background: #007bff; color: white; border: none; }
    .pricing-card { border: 1px solid #ddd; padding: 20px; margin: 10px; }
  </style>
</head>
<body>

<!-- Landing Page -->
<div id="landing">
  <h1>Welcome to My SaaS</h1>
  <button class="btn btn-primary ph-track-cta-click" 
          onclick="showPage('pricing')">
    View Pricing
  </button>
</div>

<!-- Pricing Page -->
<div id="pricing" style="display:none;" class="ph-track-pricing-view">
  <h1>Choose Your Plan</h1>
  
  <div class="pricing-card" 
       data-product="Basic Plan" 
       data-price="9.99" 
       data-currency="USD">
    <h3>Basic</h3>
    <div>$9.99/month</div>
    <button class="btn btn-primary ph-track-product-select-basic"
            onclick="selectPlan('Basic Plan', 9.99)">
      Choose Basic
    </button>
  </div>
  
  <div class="pricing-card" 
       data-product="Premium Plan" 
       data-price="29.99" 
       data-currency="USD">
    <h3>Premium</h3>
    <div>$29.99/month</div>
    <button class="btn btn-primary ph-track-product-select-premium"
            onclick="selectPlan('Premium Plan', 29.99)">
      Choose Premium
    </button>
  </div>
</div>

<!-- Checkout Page -->
<div id="checkout" style="display:none;" class="ph-track-checkout-start">
  <h1>Complete Your Purchase</h1>
  <form onsubmit="completeCheckout(event)">
    <input type="text" placeholder="Full Name" required>
    <input type="email" placeholder="Email" required>
    <input type="text" placeholder="Card Number" required>
    <button type="submit" class="btn btn-primary ph-track-checkout-submit">
      Pay <span id="checkout-price"></span>
    </button>
  </form>
</div>

<!-- Confirmation Page -->
<div id="confirmation" style="display:none;" class="ph-track-checkout-complete">
  <h1>✅ Order Complete!</h1>
  <p>Order #<span id="order-id"></span></p>
  <p>Product: <span id="order-product"></span></p>
  <p>Total: $<span id="order-total"></span></p>
</div>

<script>
  let selectedPlan = '';
  let selectedPrice = 0;
  
  function showPage(pageId) {
    document.querySelectorAll('body > div').forEach(d => d.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
  }
  
  function selectPlan(plan, price) {
    selectedPlan = plan;
    selectedPrice = price;
    document.getElementById('checkout-price').textContent = '$' + price.toFixed(2);
    showPage('checkout');
  }
  
  function completeCheckout(e) {
    e.preventDefault();
    
    // Set order details
    const orderId = Math.floor(Math.random() * 100000);
    document.getElementById('order-id').textContent = orderId;
    document.getElementById('order-product').textContent = selectedPlan;
    document.getElementById('order-total').textContent = selectedPrice.toFixed(2);
    
    // Add revenue data attributes to confirmation div
    const confirmDiv = document.getElementById('confirmation');
    confirmDiv.setAttribute('data-revenue', selectedPrice.toFixed(2));
    confirmDiv.setAttribute('data-product-name', selectedPlan);
    confirmDiv.setAttribute('data-currency', 'USD');
    confirmDiv.setAttribute('data-order-id', orderId);
    
    showPage('confirmation');
  }
</script>

</body>
</html>
```

**Save this as `test.html` and open in browser!**

---

## What Happens Automatically

### ✅ Channel Attribution (Automatic)

When user visits with UTM parameters:
```
?utm_source=facebook&utm_medium=cpc&utm_campaign=summer
```

All events include these parameters automatically:
- `utm_source`: "facebook"
- `utm_medium`: "cpc"
- `utm_campaign`: "summer"

Channel attribution is **persistent** (stored in localStorage):
- Day 1: User clicks Facebook ad → lands on pricing
- Day 2: User returns directly → completes checkout
- Revenue correctly attributed to Facebook! 🎯

---

### ✅ Revenue Extraction (Automatic)

The library automatically extracts revenue from:

**1. Data Attributes (Recommended):**
```html
<div class="ph-track-checkout-complete"
     data-revenue="29.99"
     data-product-name="Premium Plan"
     data-currency="USD">
  Order Complete!
</div>
```

**2. SessionStorage (Automatic):**
When user clicks product selection, library stores:
- `ph_last_product`: "Premium Plan"
- `ph_last_price`: "29.99"
- `ph_last_currency`: "USD"

Checkout completion automatically retrieves these!

**3. Page Elements (Fallback):**
Library searches for common selectors:
- `.order-total`, `.total-price`, `.checkout-total`
- `.product-name`, `.plan-name`, `.item-name`

---

## Class Library Reference

| Class | When It Fires | Event Name |
|-------|---------------|------------|
| `ph-track-auth-signup` | Click | `SIGNUP_STARTED` |
| `ph-track-auth-signup-complete` | Page Load | `SIGNUP_COMPLETED` |
| `ph-track-auth-login` | Click | `LOGIN_ATTEMPTED` |
| `ph-track-auth-login-complete` | Page Load | `LOGIN_COMPLETED` |
| `ph-track-pricing-view` | Page Load | `PRICING_PAGE_VIEWED` |
| `ph-track-product-select` | Click | `PRODUCT_SELECTED` |
| `ph-track-checkout-start` | Page Load | `CHECKOUT_STARTED` |
| `ph-track-checkout-complete` | Page Load | `CHECKOUT_COMPLETED` 💰 |
| `ph-track-subscription-complete` | Page Load | `SUBSCRIPTION_COMPLETED` 💰 |

**💰 = Automatically extracts revenue**

See [CSS_CLASS_CONVENTION_GUIDE.md](CSS_CLASS_CONVENTION_GUIDE.md) for complete list.

---

## Troubleshooting

### "Events not firing"

**Check if library loaded:**
```javascript
console.log(window.posthog);  // Should be defined
```

**Check for tracked elements:**
```javascript
document.querySelectorAll('[class*="ph-track-"]').length;  // Should be > 0
```

### "Revenue is $0.00"

**Verify data attributes present:**
```javascript
const el = document.querySelector('.ph-track-checkout-complete');
console.log(el.getAttribute('data-revenue'));  // Should be "29.99"
```

### "Channel attribution missing"

**Verify UTM in localStorage:**
```javascript
console.log(localStorage.getItem('ph_utm_source'));  // Should be "facebook"
console.log(sessionStorage.getItem('ph_utm_source'));  // Should be "facebook"
```

---

## Advanced: Framework Integration

### React

```jsx
function CheckoutComplete({ order }) {
  return (
    <div className="order-confirmation ph-track-checkout-complete"
         data-revenue={order.total}
         data-product-name={order.product}
         data-currency="USD"
         data-order-id={order.id}>
      <h1>✅ Order Complete!</h1>
      <p>Order #{order.id}</p>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :class="['order-confirmation', 'ph-track-checkout-complete']"
       :data-revenue="order.total"
       :data-product-name="order.product"
       data-currency="USD">
    <h1>✅ Order Complete!</h1>
  </div>
</template>
```

### Next.js

```jsx
export default function OrderConfirmation({ order }) {
  return (
    <div className="ph-track-checkout-complete"
         data-revenue={order.total}
         data-product-name={order.product}
         data-currency="USD">
      <h1>✅ Order Complete!</h1>
    </div>
  );
}
```

---

## That's It! 🎉

**Three simple steps:**
1. Add analytics script
2. Add `ph-track-*` classes to UI elements
3. Add `data-revenue` attribute to confirmation page

**Everything else is automatic:**
- ✅ Channel attribution tracking
- ✅ Revenue extraction
- ✅ User journey mapping
- ✅ Funnel analytics

**Need help?** See [CSS_CLASS_CONVENTION_GUIDE.md](CSS_CLASS_CONVENTION_GUIDE.md) for the complete guide.
