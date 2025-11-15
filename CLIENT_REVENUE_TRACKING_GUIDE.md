# 💰 Client Revenue Tracking Guide

## Overview

The AskMe Analytics library automatically captures revenue data when a client's customer completes a purchase. This guide explains how to configure your site to enable automatic revenue tracking.

---

## How It Works

When a `checkout_completed` or `subscription_completed` event fires, the library automatically:

1. ✅ **Extracts revenue data** from your page using multiple strategies
2. ✅ **Captures channel attribution** (utm_source, utm_medium, utm_campaign) 
3. ✅ **Sends complete revenue event** to PostHog for analytics

**Revenue Properties Captured:**
- `revenue` - Total purchase amount
- `product_name` - Product or plan name
- `currency` - Currency code (default: USD)
- `quantity` - Number of items (default: 1)
- `utm_source` - Marketing channel (preserved throughout journey)
- `utm_medium` - Traffic type
- `utm_campaign` - Campaign name

---

## Configuration Options

### Option 1: Data Attributes (Recommended)

Add data attributes to your order confirmation / receipt page:

```html
<!-- Order Confirmation Page -->
<div class="order-complete" 
     data-revenue="29.99"
     data-product-name="Premium Plan"
     data-currency="USD"
     data-quantity="1">
  
  <h1>Order Complete!</h1>
  <p>Thank you for your purchase.</p>
  
  <div class="order-summary">
    <div>Product: Premium Plan</div>
    <div>Total: $29.99</div>
  </div>
</div>
```

**Steps Configuration:**

```javascript
{
  "steps": [
    {
      "key": "CHECKOUT_COMPLETED",
      "url": "/order-complete",
      "urlMatch": "contains",
      "selector": ".order-complete",
      "requireSelectorPresent": true,
      "autoFire": true
    }
  ]
}
```

**How It Works:**
- When user lands on `/order-complete` page
- Library detects `.order-complete` element exists
- Extracts revenue data from data attributes
- Fires `checkout_completed` event automatically
- Event includes revenue + channel attribution

---

### Option 2: Automatic Extraction from Page Elements

If you can't add data attributes, the library can extract revenue from page content:

```html
<!-- Order Confirmation Page -->
<div class="receipt">
  <h1>Order Confirmed</h1>
  
  <div class="product-name">Premium Plan</div>
  <div class="order-total">$29.99</div>
  
  <p>Your subscription is now active.</p>
</div>
```

**Client Configuration:**

```javascript
{
  "clientId": "your-client-id",
  "productConfig": {
    "titleSelector": ".product-name",
    "priceSelector": ".order-total",
    "revenueSelector": ".order-total",  // ← For total amount
    "totalSelector": ".order-total",
    "currencySelector": ".currency"  // Optional
  },
  "steps": [
    {
      "key": "CHECKOUT_COMPLETED",
      "url": "/order-complete",
      "selector": ".receipt",
      "requireSelectorPresent": true,
      "autoFire": true
    }
  ]
}
```

**Common Selector Patterns:**

```javascript
// For order total
"revenueSelector": ".order-total"
"revenueSelector": "#total-amount"
"revenueSelector": "[data-total]"

// For product name
"titleSelector": ".product-name"
"titleSelector": ".item-name"
"titleSelector": "h2.product-title"
```

---

### Option 3: sessionStorage Fallback

If revenue data isn't on the confirmation page, the library automatically falls back to sessionStorage:

**How It Works:**

1. **Pricing Page** - User selects product:
   ```html
   <button type="submit" 
           data-product="Premium Plan"
           data-price="29.99"
           data-currency="USD">
     Subscribe Now
   </button>
   ```

2. **Library stores to sessionStorage:**
   ```javascript
   sessionStorage.setItem('ph_last_product', 'Premium Plan')
   sessionStorage.setItem('ph_last_price', '29.99')
   sessionStorage.setItem('ph_last_currency', 'USD')
   sessionStorage.setItem('ph_last_quantity', '1')
   ```

3. **Order Confirmation Page** - No data attributes needed:
   ```html
   <div class="receipt">
     <h1>Order Complete!</h1>
   </div>
   ```

4. **Library retrieves from sessionStorage:**
   - Fires `checkout_completed` event
   - Includes revenue data from sessionStorage
   - Includes channel attribution from localStorage

**Steps Configuration:**

```javascript
{
  "steps": [
    {
      "key": "CHECKOUT_COMPLETED",
      "url": "/order-complete",
      "selector": ".receipt",
      "requireSelectorPresent": true,
      "autoFire": true
    }
  ]
}
```

---

## Complete Example: E-commerce Site

### 1. Pricing Page (`/pricing`)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Pricing</title>
  
  <!-- Load AskMe Analytics -->
  <script>
    window.AskMeAnalyticsConfig = {
      clientId: 'my-store',
      debug: true
    };
  </script>
  <script src="https://yoursite.com/lib/askme-analytics-init.js"></script>
</head>
<body>
  <h1>Choose Your Plan</h1>
  
  <div class="pricing-card">
    <h3>Premium Plan</h3>
    <div class="price">$29.99/month</div>
    
    <!-- Product data will be automatically captured -->
    <form action="/checkout" method="POST">
      <button type="submit"
              data-product="Premium Plan"
              data-price="29.99"
              data-currency="USD"
              data-quantity="1">
        Subscribe Now
      </button>
    </form>
  </div>
</body>
</html>
```

### 2. Order Confirmation Page (`/order-complete`)

**Option A: With Data Attributes (Recommended)**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Order Complete</title>
  
  <!-- Load AskMe Analytics -->
  <script>
    window.AskMeAnalyticsConfig = {
      clientId: 'my-store',
      debug: true
    };
  </script>
  <script src="https://yoursite.com/lib/askme-analytics-init.js"></script>
</head>
<body>
  <!-- Add data attributes with revenue information -->
  <div class="order-complete"
       data-revenue="29.99"
       data-product-name="Premium Plan"
       data-currency="USD"
       data-quantity="1">
    
    <h1>✅ Order Complete!</h1>
    <p>Order #12345</p>
    
    <div class="order-summary">
      <div>Product: Premium Plan</div>
      <div>Total: $29.99</div>
    </div>
  </div>
</body>
</html>
```

**Option B: Without Data Attributes (Auto-extraction)**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Order Complete</title>
  
  <!-- Load AskMe Analytics -->
  <script>
    window.AskMeAnalyticsConfig = {
      clientId: 'my-store',
      debug: true,
      productConfig: {
        titleSelector: ".product-name",
        priceSelector: ".order-total"
      }
    };
  </script>
  <script src="https://yoursite.com/lib/askme-analytics-init.js"></script>
</head>
<body>
  <div class="receipt">
    <h1>✅ Order Complete!</h1>
    <p>Order #12345</p>
    
    <div class="order-summary">
      <div class="product-name">Premium Plan</div>
      <div class="order-total">$29.99</div>
    </div>
  </div>
</body>
</html>
```

### 3. Client Configuration (`configs/my-store.json`)

```json
{
  "clientId": "my-store",
  "debug": true,
  "analyticsLibraryPath": "https://yoursite.com/lib/ask-me-analytics.min.js",
  "productConfig": {
    "eventName": "product_selected",
    "pageMatch": "/pricing",
    "titleSelector": ".pricing-card h3",
    "priceSelector": ".price",
    "revenueSelector": ".order-total",
    "totalSelector": ".order-total"
  },
  "steps": [
    {
      "key": "CHECKOUT_COMPLETED",
      "url": "/order-complete",
      "urlMatch": "contains",
      "selector": ".order-complete, .receipt",
      "requireSelectorPresent": true,
      "autoFire": true
    }
  ]
}
```

---

## Data Attribute Reference

### Revenue Data Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-revenue` | **Total revenue amount** | `data-revenue="29.99"` |
| `data-total` | Alias for revenue | `data-total="29.99"` |
| `data-amount` | Alias for revenue | `data-amount="29.99"` |
| `data-order-total` | Alias for revenue | `data-order-total="29.99"` |
| `data-product-name` | **Product name** | `data-product-name="Premium Plan"` |
| `data-product` | Alias for product name | `data-product="Premium Plan"` |
| `data-item-name` | Alias for product name | `data-item-name="Premium Plan"` |
| `data-plan-name` | Alias for product name | `data-plan-name="Premium Plan"` |
| `data-currency` | Currency code | `data-currency="USD"` |
| `data-quantity` | Number of items | `data-quantity="1"` |

### Where to Place Attributes

✅ **On confirmation container:**
```html
<div class="order-complete" data-revenue="29.99" data-product-name="Premium">
  ...
</div>
```

✅ **On parent element:**
```html
<div data-revenue="29.99">
  <div class="order-complete">...</div>
</div>
```

✅ **On individual elements:**
```html
<div class="order-complete">
  <div data-revenue="29.99">Total: $29.99</div>
  <div data-product-name="Premium">Premium Plan</div>
</div>
```

---

## Testing Revenue Tracking

### Step 1: Test with UTM Parameters

```bash
# Visit pricing page with UTM parameters
https://yoursite.com/pricing?utm_source=facebook&utm_medium=cpc&utm_campaign=spring_sale
```

### Step 2: Complete Purchase

```bash
# Click "Subscribe Now"
# Complete checkout process
# Land on order confirmation page
```

### Step 3: Verify in Browser Console

```javascript
// Open DevTools Console (F12)

// You should see:
[ph-injector] 💰 Extracted revenue data: {
  revenue: "29.99",
  product: "Premium Plan",
  currency: "USD",
  quantity: "1"
}

[ph-injector] 💰 Revenue event with attribution: {
  event: "CHECKOUT_COMPLETED",
  revenue: "29.99",
  utm_source: "facebook",
  utm_medium: "cpc",
  utm_campaign: "spring_sale",
  days_since_attribution: 0
}
```

### Step 4: Verify in PostHog

```bash
# 1. Go to PostHog dashboard
# 2. Navigate to Events
# 3. Search for "CHECKOUT_COMPLETED"
# 4. Click on latest event
# 5. Verify properties include:
#    - revenue: "29.99"
#    - product_name: "Premium Plan"
#    - utm_source: "facebook"
#    - currency: "USD"
```

---

## Troubleshooting

### Issue: No revenue in event

**Check:**
```javascript
// In browser console on order confirmation page
console.log(document.querySelector('[data-revenue]'))
console.log(sessionStorage.getItem('ph_last_price'))
```

**Solutions:**
1. Add `data-revenue` attribute to confirmation page element
2. Ensure product selection page has data attributes on button
3. Configure `revenueSelector` in client config to point to total amount element

---

### Issue: Revenue is "0.00"

**Check:**
```javascript
// In browser console
const el = document.querySelector('[data-revenue]')
console.log(el.getAttribute('data-revenue'))  // Should show number
```

**Solutions:**
1. Ensure data-revenue contains numeric value (e.g., "29.99" not "$29.99")
2. If using element text extraction, ensure price is in format: "$29.99" or "29.99"

---

### Issue: Channel attribution missing

**Check:**
```javascript
// In browser console
console.log(localStorage.getItem('ph_utm_source'))
console.log(sessionStorage.getItem('ph_utm_source'))
```

**Solutions:**
1. Ensure user visits site with UTM parameters initially
2. Check that analytics library loads on FIRST page visit (landing page)
3. Verify localStorage is not disabled in browser

---

## Advanced: Multiple Products / Line Items

For carts with multiple items:

```html
<div class="order-complete"
     data-revenue="79.97"
     data-currency="USD">
  
  <h1>Order Complete!</h1>
  
  <!-- Individual line items -->
  <div class="line-item" data-product-name="Product A" data-price="29.99" data-quantity="1"></div>
  <div class="line-item" data-product-name="Product B" data-price="49.98" data-quantity="2"></div>
  
  <div class="order-total">Total: $79.97</div>
</div>
```

**Result:** Event captures total revenue ($79.97) with channel attribution. For per-product analysis, consider firing separate events per line item.

---

## Summary

### ✅ Automatic Revenue Tracking

The library automatically tracks revenue when:
1. `CHECKOUT_COMPLETED` step is configured
2. User lands on order confirmation page
3. Revenue data is available via:
   - Data attributes (best)
   - Page element extraction (good)
   - sessionStorage fallback (okay)

### ✅ Channel Attribution Included

Every revenue event includes:
- `utm_source` - Marketing channel
- `utm_medium` - Traffic type  
- `utm_campaign` - Campaign name
- `days_since_attribution` - Time to conversion

These are preserved throughout the user journey via localStorage.

### ✅ Zero Additional Code Required

Once configured, revenue tracking is **completely automatic**. No need to call functions or write custom code on order confirmation pages.

---

**Questions?** Contact support or refer to the main Analytics Library documentation.
