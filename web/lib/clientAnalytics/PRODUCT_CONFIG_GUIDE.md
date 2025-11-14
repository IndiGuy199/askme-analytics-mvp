# Product Configuration Guide

**Version 1.0** — Complete guide for configuring product tracking across any e-commerce platform

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Configuration Reference](#configuration-reference)
4. [Selector Strategies](#selector-strategies)
5. [Real-World Examples](#real-world-examples)
6. [Testing Your Configuration](#testing-your-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The `productConfig` object enables automatic tracking of product interactions on pricing and checkout pages. It works by:

1. **Finding pricing panels** using your configured selectors
2. **Extracting product metadata** (name, price, currency, quantity)
3. **Annotating CTA buttons** with `data-*` attributes
4. **Capturing events** when users click those buttons

### What Gets Tracked?

When properly configured, every pricing button gets these attributes:

```html
<button 
  data-product="premium_plan"
  data-price="49.99"
  data-currency="USD"
  data-quantity="1">
  Buy Now
</button>
```

These attributes are automatically captured in PostHog events when users click the button.

---

## Quick Start

### Basic Configuration (3 Steps)

**Step 1: Identify Your Pricing Elements**

Open your pricing page in browser DevTools and inspect:
- The container/card for each pricing tier
- The element showing the plan name
- The element showing the price
- The CTA button

**Step 2: Configure Selectors**

```javascript
productConfig: {
    eventName: 'subscription_click',
    pageMatch: '/pricing',
    
    // Container for each pricing tier
    panelClass: 'pricing-card',
    
    // Plan name element
    titleClass: 'plan-name',
    
    // Price element
    priceClass: 'price-amount',
    
    // Which buttons to track
    productButtonSelectors: 'button.cta-button, .pricing-card button'
}
```

**Step 3: Test**

1. Reload your pricing page
2. Open browser console (F12)
3. Look for logs: `[ph-injector] ✅ Annotated button with product data`
4. Inspect your CTA buttons to see `data-product`, `data-price`, etc.

---

## Configuration Reference

### Core Settings

```javascript
productConfig: {
    // Event name sent to PostHog when button is clicked
    eventName: 'subscription_click',
    
    // Which page(s) this applies to
    pageMatch: '/pricing',  // or '/checkout' or '/plans'
    
    // ... selector configurations ...
    
    // Which buttons should be tracked (IMPORTANT!)
    productButtonSelectors: 'button.buy-button, [data-pricing-cta]'
}
```

### Event Name

The event name sent to PostHog when a tracked button is clicked.

```javascript
eventName: 'subscription_click'  // Default
eventName: 'product_selected'    // Custom
eventName: 'checkout_initiated'  // Another example
```

### Page Matching

Controls which pages the product tracking runs on.

```javascript
// Contains (checks if URL includes this string)
pageMatch: '/pricing'
// Matches: /pricing, /pricing/monthly, /en/pricing

// Exact match
pageMatch: '/checkout/cart'
// Matches only: /checkout/cart

// Regex pattern
pageMatch: '/(pricing|plans|subscribe)'
// Matches: /pricing, /plans, /subscribe
```

---

## Selector Strategies

You have **5 different strategies** for each element type. Use the one that best fits your HTML structure.

### Strategy 1: CSS Class (Most Common)

**Best for**: Bootstrap, Tailwind, or any framework using utility classes

```javascript
panelClass: 'pricing-card rounded shadow'
titleClass: 'h3 plan-title text-center'
priceClass: 'price-display font-bold text-4xl'
```

**HTML Example:**
```html
<div class="pricing-card rounded shadow">
  <h3 class="h3 plan-title text-center">Premium Plan</h3>
  <div class="price-display font-bold text-4xl">$49.99</div>
  <button>Subscribe</button>
</div>
```

---

### Strategy 2: CSS Selector (Most Powerful)

**Best for**: Complex selectors, combining multiple conditions

```javascript
panelSelector: '.pricing > div[role="article"]'
titleSelector: 'h2.plan-name, [itemprop="name"]'
priceSelector: '.price-value, [itemprop="price"]'
```

**HTML Example:**
```html
<div class="pricing">
  <div role="article">
    <h2 class="plan-name">Premium</h2>
    <span class="price-value">$49.99</span>
  </div>
</div>
```

---

### Strategy 3: Data Attributes (Best Practice)

**Best for**: Clean, semantic markup; new implementations

```javascript
panelAttr: 'data-pricing-card'
titleAttr: 'data-plan-name'
priceAttr: 'data-price'
```

**HTML Example:**
```html
<div data-pricing-card>
  <h3 data-plan-name>Premium Plan</h3>
  <div data-price="49.99">$49.99/month</div>
  <button data-pricing-button>Subscribe</button>
</div>
```

✅ **Recommended**: Also add `productButtonSelectors: '[data-pricing-button]'`

---

### Strategy 4: Element ID

**Best for**: Unique elements, single pricing panel

```javascript
panelId: 'premium-plan-card'
titleId: 'plan-title'
priceId: 'plan-price'
```

**HTML Example:**
```html
<div id="premium-plan-card">
  <h3 id="plan-title">Premium Plan</h3>
  <div id="plan-price">$49.99</div>
  <button>Subscribe</button>
</div>
```

⚠️ **Note**: IDs must be unique per page. Use classes for multiple plans.

---

### Strategy 5: XPath (Advanced)

**Best for**: Complex DOM structures, legacy systems, unusual layouts

```javascript
panelXPath: '//div[@class="pricing-card"]'
titleXPath: '//h3[contains(@class, "plan-name")]'
priceXPath: '//span[@itemprop="price"]'
```

**HTML Example:**
```html
<div class="pricing-card">
  <h3 class="plan-name bold">Premium</h3>
  <span itemprop="price">$49.99</span>
</div>
```

---

### Precedence Order

If you specify multiple strategies, they're checked in this order:

1. **Selector** (highest priority)
2. **Class**
3. **Attr**
4. **Id**
5. **XPath** (fallback)

**Example:**
```javascript
titleSelector: 'h2.plan-name',  // ✅ Used first
titleClass: 'plan-title',       // ⏭️ Skipped (selector found)
titleAttr: 'data-plan',         // ⏭️ Skipped
titleXPath: '//h2'              // ⏭️ Skipped
```

---

## Real-World Examples

### Example 1: Shopify Store

**HTML Structure:**
```html
<div class="product-card">
  <h4 class="product-title">Wireless Headphones</h4>
  <span class="price">$79.99</span>
  <span class="currency">USD</span>
  <button class="add-to-cart">Add to Cart</button>
</div>
```

**Configuration:**
```javascript
productConfig: {
    eventName: 'product_add_to_cart',
    pageMatch: '/products',
    
    panelClass: 'product-card',
    titleClass: 'product-title',
    priceClass: 'price',
    currencyClass: 'currency',
    
    productButtonSelectors: 'button.add-to-cart'
}
```

---

### Example 2: WordPress + WooCommerce

**HTML Structure:**
```html
<div class="woocommerce-product-card">
  <h3 class="woocommerce-loop-product__title">Coffee Maker</h3>
  <span class="woocommerce-Price-amount">
    <span class="woocommerce-Price-currencySymbol">$</span>129.99
  </span>
  <button class="button product_type_simple add_to_cart_button">Buy Now</button>
</div>
```

**Configuration:**
```javascript
productConfig: {
    eventName: 'woocommerce_add_to_cart',
    pageMatch: '/shop',
    
    panelClass: 'woocommerce-product-card',
    titleClass: 'woocommerce-loop-product__title',
    priceClass: 'woocommerce-Price-amount',
    
    productButtonSelectors: 'button.add_to_cart_button'
}
```

---

### Example 3: SaaS Pricing Page (Tailwind CSS)

**HTML Structure:**
```html
<div class="rounded-xl border bg-card text-card-foreground shadow-lg">
  <h3 class="text-2xl font-semibold">Enterprise</h3>
  <div class="text-4xl font-bold">$199</div>
  <button class="bg-blue-600 hover:bg-blue-700 text-white">
    Start Free Trial
  </button>
</div>
```

**Configuration:**
```javascript
productConfig: {
    eventName: 'subscription_click',
    pageMatch: '/pricing',
    
    panelClass: 'rounded-xl border bg-card text-card-foreground shadow-lg',
    titleClass: 'text-2xl font-semibold',
    priceClass: 'text-4xl font-bold',
    
    productButtonSelectors: 'button.bg-blue-600, button.bg-indigo-600'
}
```

---

### Example 4: Bootstrap Pricing Cards

**HTML Structure:**
```html
<div class="card pricing-card">
  <div class="card-header">
    <h4 class="my-0 font-weight-normal">Professional</h4>
  </div>
  <div class="card-body">
    <h1 class="card-title pricing-card-title">
      $29 <small class="text-muted">/ mo</small>
    </h1>
    <button class="btn btn-lg btn-block btn-primary">Get Started</button>
  </div>
</div>
```

**Configuration:**
```javascript
productConfig: {
    eventName: 'subscription_selected',
    pageMatch: '/pricing',
    
    panelClass: 'card pricing-card',
    titleClass: 'font-weight-normal',
    priceClass: 'pricing-card-title',
    
    productButtonSelectors: '.pricing-card button.btn-primary'
}
```

---

### Example 5: Material-UI / React Components

**HTML Structure:**
```html
<div class="MuiPaper-root MuiCard-root pricing-card">
  <div class="MuiCardContent-root">
    <h5 class="MuiTypography-h5">Starter Pack</h5>
    <p class="MuiTypography-h3">$19.99</p>
    <button class="MuiButton-root MuiButton-contained MuiButton-containedPrimary">
      Choose Plan
    </button>
  </div>
</div>
```

**Configuration:**
```javascript
productConfig: {
    eventName: 'plan_selection',
    pageMatch: '/plans',
    
    panelSelector: '.MuiCard-root.pricing-card',
    titleSelector: '.MuiTypography-h5',
    priceSelector: '.MuiTypography-h3',
    
    productButtonSelectors: '.pricing-card .MuiButton-containedPrimary'
}
```

---

### Example 6: Multi-Currency Support

**HTML Structure:**
```html
<div class="plan-card" data-plan="premium">
  <h3>Premium Plan</h3>
  <div class="price-container">
    <span class="currency">€</span>
    <span class="amount">45.99</span>
  </div>
  <button>Subscribe</button>
</div>
```

**Configuration:**
```javascript
productConfig: {
    eventName: 'subscription_click',
    pageMatch: '/pricing',
    
    panelAttr: 'data-plan',
    titleSelector: 'h3',
    priceClass: 'amount',
    currencyClass: 'currency',  // Extracts '€' symbol
    
    productButtonSelectors: '.plan-card button'
}
```

**Result:**
```html
<button 
  data-product="premium_plan"
  data-price="45.99"
  data-currency="EUR"  <!-- Automatically converted from € -->
  data-quantity="1">
```

---

### Example 7: Team/Seat-Based Pricing

**HTML Structure:**
```html
<div class="team-pricing">
  <h3>Team Plan</h3>
  <div class="price">$10 per seat/month</div>
  <input type="number" class="seat-count" value="5" min="1" max="100">
  <button class="select-team-plan">Get Started</button>
</div>
```

**Configuration:**
```javascript
productConfig: {
    eventName: 'team_plan_selected',
    pageMatch: '/pricing',
    
    panelClass: 'team-pricing',
    titleSelector: 'h3',
    priceSelector: '.price',
    quantityClass: 'seat-count',  // Reads from input value
    
    productButtonSelectors: '.select-team-plan'
}
```

**Result:**
```html
<button 
  data-product="team_plan"
  data-price="10"
  data-currency="USD"
  data-quantity="5">  <!-- From input value -->
```

---

### Example 8: Data Attributes (Best Practice)

**HTML Structure:**
```html
<div data-pricing-card="enterprise">
  <h2 data-plan-name>Enterprise</h2>
  <div data-price="499.00" data-currency="USD">$499/month</div>
  <button data-pricing-button>Contact Sales</button>
</div>
```

**Configuration:**
```javascript
productConfig: {
    eventName: 'enterprise_inquiry',
    pageMatch: '/pricing',
    
    panelAttr: 'data-pricing-card',
    titleAttr: 'data-plan-name',
    priceAttr: 'data-price',      // Reads attribute value directly
    currencyAttr: 'data-currency', // Reads attribute value directly
    
    productButtonSelectors: '[data-pricing-button]'
}
```

✅ **Advantage**: Attributes provide exact values, bypassing text parsing issues.

---

## Button Selectors (Critical!)

### Why Button Selectors Matter

Without `productButtonSelectors`, the script would annotate **every button** on the page (navigation, close, menu, etc.). This causes:
- ❌ Wrong products tracked
- ❌ Navigation events misattributed
- ❌ Polluted analytics data

### Configuration

```javascript
productConfig: {
    // ... other config ...
    
    // ✅ SPECIFIC: Only these buttons get product data
    productButtonSelectors: 'button.buy-now, .pricing-card button, [data-cta]'
}
```

### Button Selector Strategies

**Strategy 1: By Class**
```javascript
productButtonSelectors: 'button.subscribe-btn, button.cta-button'
```

**Strategy 2: By Container**
```javascript
productButtonSelectors: '.pricing-card button, .product-card button'
```

**Strategy 3: By Data Attribute** (Best Practice)
```javascript
productButtonSelectors: '[data-pricing-button], [data-product-cta]'

// In HTML:
<button data-pricing-button>Buy Now</button>
```

**Strategy 4: Combined**
```javascript
productButtonSelectors: '.pricing-card button.primary, [data-checkout-button]'
```

---

## Testing Your Configuration

### Step 1: Visual Inspection

1. Load your pricing page
2. Open DevTools (F12)
3. Inspect a pricing button
4. Look for these attributes:

```html
<button 
  data-product="premium_plan"
  data-price="49.99"
  data-currency="USD"
  data-quantity="1">
  Buy Now
</button>
```

### Step 2: Console Logs

Look for these messages:

```
[ph-injector] 🚀 Booting product injector...
[ph-injector] Current page: /pricing
[ph-injector] Page matches? true
[ph-injector] Has product hints? true
[ph-injector] Found 3 buttons matching selector: "button.cta-button"
[ph-injector] Annotating 3 buttons with product data
[ph-injector] ✅ Annotated button with product data: {product: "premium", price: "49.99"}
```

### Step 3: Event Capture

1. Click a pricing button
2. Open PostHog dashboard
3. Check for `subscription_click` event (or your configured event name)
4. Verify properties:
   - `product`: "premium_plan"
   - `price`: "49.99"
   - `currency`: "USD"
   - `quantity`: "1"

### Troubleshooting Checklist

**Buttons not getting attributes:**
- ✅ Check `productButtonSelectors` matches your buttons
- ✅ Verify `pageMatch` matches current URL
- ✅ Check console for errors
- ✅ Ensure buttons are inside pricing panels

**Wrong product/price extracted:**
- ✅ Verify selectors match correct elements
- ✅ Check precedence order (Selector > Class > Attr > Id > XPath)
- ✅ Inspect HTML structure with DevTools
- ✅ Test selectors in console: `document.querySelectorAll('your-selector')`

**No console logs:**
- ✅ Verify analytics script is loaded
- ✅ Check for JavaScript errors
- ✅ Ensure `pageMatch` is correct
- ✅ Verify at least one selector strategy is configured

---

## Advanced Configurations

### Dynamic Price Updates

If prices change based on billing cycle (monthly/yearly):

```javascript
productConfig: {
    // ... basic config ...
    
    // Watch these elements for changes
    priceWatchSelectors: 'input[name="billing-cycle"], select#plan-interval'
}
```

When users toggle monthly/yearly, prices auto-update on buttons.

---

### Multiple Pricing Pages

```javascript
// Configuration 1: Pricing page
productConfig: {
    eventName: 'subscription_click',
    pageMatch: '/pricing',
    panelClass: 'pricing-card',
    titleClass: 'plan-name',
    priceClass: 'price',
    productButtonSelectors: 'button.subscribe-btn'
}

// Configuration 2: Checkout page
// (Create separate configuration or use broader pageMatch)
productConfig: {
    eventName: 'checkout_initiated',
    pageMatch: '/checkout',
    panelClass: 'cart-item',
    titleClass: 'product-name',
    priceClass: 'item-price',
    productButtonSelectors: 'button.checkout-btn'
}
```

---

### Currency Defaulting

If no currency selector is configured, defaults to **USD**.

```javascript
// No currency configured → USD
productConfig: {
    priceClass: 'price',
    currencyClass: '',  // Empty → defaults to USD
}
```

To specify currency:
```javascript
// Option 1: Extract from element
currencyClass: 'currency-symbol'

// Option 2: Use data attribute
currencyAttr: 'data-currency'

// Option 3: Parse from price text (automatic)
// "$49.99" → USD
// "€45.99" → EUR
// "£39.99" → GBP
```

---

## Best Practices

### ✅ DO

1. **Use data attributes** for new implementations
2. **Be specific** with button selectors
3. **Test on all pricing tiers** (free, basic, premium, etc.)
4. **Verify currency detection** for international sites
5. **Use container-based** button selectors when possible
6. **Document your configuration** for your team

### ❌ DON'T

1. **Don't use vague selectors** like `button` or `.btn`
2. **Don't forget** `productButtonSelectors` configuration
3. **Don't assume** class names (check with DevTools)
4. **Don't skip testing** on different screen sizes
5. **Don't mix strategies** unless necessary (choose one and stick to it)

---

## Configuration Template

Copy and customize this template:

```javascript
window.AskMeAnalyticsConfig = {
    // ... other analytics config ...
    
    productConfig: {
        // Event name when button is clicked
        eventName: 'subscription_click',
        
        // Which page(s) to track
        pageMatch: '/pricing',
        
        // === PANEL/CONTAINER (Choose ONE strategy) ===
        panelSelector: '',  // Full CSS selector
        panelClass: '',     // CSS class names
        panelAttr: '',      // data-* attribute
        panelId: '',        // Element ID
        panelXPath: '',     // XPath expression
        
        // === TITLE/PLAN NAME (Choose ONE strategy) ===
        titleSelector: '',  // Full CSS selector
        titleClass: '',     // CSS class names
        titleAttr: '',      // data-* attribute
        titleId: '',        // Element ID
        titleXPath: '',     // XPath expression
        
        // === PRICE (Choose ONE strategy) ===
        priceSelector: '',  // Full CSS selector
        priceClass: '',     // CSS class names
        priceAttr: '',      // data-* attribute
        priceId: '',        // Element ID
        priceXPath: '',     // XPath expression
        
        // === CURRENCY (Optional - defaults to USD) ===
        currencySelector: '',  // Full CSS selector
        currencyClass: '',     // CSS class names
        currencyAttr: '',      // data-* attribute
        currencyId: '',        // Element ID
        currencyXPath: '',     // XPath expression
        
        // === QUANTITY (Optional - defaults to 1) ===
        quantitySelector: '',  // Full CSS selector
        quantityClass: '',     // CSS class names
        quantityAttr: '',      // data-* attribute
        quantityId: '',        // Element ID
        quantityXPath: '',     // XPath expression
        
        // === BUTTON SELECTORS (REQUIRED!) ===
        // Which buttons should get product data
        productButtonSelectors: 'button.cta-button, [data-pricing-button]'
    }
};
```

---

## Support

### Common Questions

**Q: Can I track multiple products on one page?**  
A: Yes! The script automatically finds all panels and annotates their respective buttons.

**Q: What if my price includes currency symbol?**  
A: The script automatically parses "$49.99" → price: "49.99", currency: "USD"

**Q: Do I need to configure all selector strategies?**  
A: No! Choose ONE strategy per element type that fits your HTML.

**Q: Will this work with React/Vue/Angular?**  
A: Yes! The MutationObserver automatically detects dynamic content changes.

**Q: How do I track different button types (Subscribe vs Contact Sales)?**  
A: Use specific button selectors or different event names per button type.

---

## Summary

1. **Inspect your HTML** with DevTools
2. **Choose selector strategy** that fits your structure
3. **Configure `productConfig`** with your selectors
4. **Set `productButtonSelectors`** to target only pricing buttons
5. **Test** by inspecting button attributes and console logs
6. **Verify** events in PostHog dashboard

**Need help?** Check the console logs and verify your selectors with DevTools!

---

**Last Updated**: November 14, 2025  
**Version**: 1.0
