# Multi-Client Configuration Guide

## Overview

The ph-product-injector has been designed to support **multiple clients** with different DOM structures without requiring code modifications. All DOM selectors are now fully configurable via HTML data-attributes.

## Problem Solved

**Before:** Hardcoded selectors like this wouldn't work across different client websites:
```javascript
// ❌ HARDCODED - only works for specific DOM structures
const priceInputs = document.querySelectorAll('select[id*="plan" i], select[name*="plan" i]');
```

**After:** Configurable selectors support any client's DOM structure:
```html
<!-- ✅ CLIENT-SPECIFIC - works with any DOM structure -->
<script id="ph-product-injector"
    data-price-watch-selectors="select.billing-toggle, input[name='subscription-type']"
    data-email-selectors=".user-email-input, #checkout-email"
    data-button-selectors="button.cta, a.action-link">
</script>
```

## Configuration Attributes

### 1. `data-price-watch-selectors`
**Purpose:** Selectors for elements that trigger price changes (dropdowns, radio buttons, toggles)

**Default (if not provided):**
```javascript
// Intelligent defaults based on common patterns
'select[id*="plan" i], select[name*="plan" i], ' +
'select[id*="interval" i], select[name*="interval" i], ' +
'input[type="radio"][name*="plan" i], input[type="radio"][name*="billing" i]'

// PLUS: If data-price-class is configured (e.g., "price"), also adds:
'.price select, .price input[type="radio"]'
```

**Example:**
```html
<!-- SaaS pricing page -->
<script id="ph-product-injector"
    data-price-watch-selectors="select#billing-cycle, input[name='plan-tier']">
</script>

<!-- E-commerce product page -->
<script id="ph-product-injector"
    data-price-watch-selectors=".quantity-selector, .variant-dropdown, .size-picker">
</script>
```

### 2. `data-email-selectors`
**Purpose:** Selectors for email input fields to identify users

**Default (if not provided):**
```javascript
'input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[id*="email" i]'
```

**Example:**
```html
<!-- Checkout flow -->
<script id="ph-product-injector"
    data-email-selectors="#customer-email, .checkout-email-field">
</script>

<!-- Multi-step form -->
<script id="ph-product-injector"
    data-email-selectors="input.user-email, input[data-field='email']">
</script>
```

### 3. `data-button-selectors`
**Purpose:** Selectors for clickable elements (buttons, links) when using `textRegex` rule matching

**Default (if not provided):**
```javascript
'button, a, input[type="submit"], input[type="button"], [role="button"]'
```

**Example:**
```html
<!-- Custom UI framework -->
<script id="ph-product-injector"
    data-button-selectors=".ui-button, .action-link, .cta-element">
</script>

<!-- React components -->
<script id="ph-product-injector"
    data-button-selectors="[data-component='Button'], [data-action-type='click']">
</script>
```

## Complete Configuration Examples

### Example 1: SaaS Pricing Page
```html
<script id="ph-product-injector"
    src="/lib/clientAnalytics/ph-product-injector.js"
    data-event-name="Clicked CTA"
    data-price-class="price-value"
    data-currency-class="currency-symbol"
    data-product-class="plan-name"
    data-price-watch-selectors="select#billing-toggle, input[name='plan-select']"
    data-email-selectors="input.email-input"
    data-button-selectors="button.cta-button, a.try-free">
</script>
```

### Example 2: E-commerce Product Page
```html
<script id="ph-product-injector"
    src="/lib/clientAnalytics/ph-product-injector.js"
    data-event-name="Added to Cart"
    data-price-class="product-price"
    data-currency-class="currency"
    data-product-class="product-title"
    data-price-watch-selectors=".quantity-input, .size-selector, .color-picker"
    data-email-selectors="#checkout-email, .user-email-field"
    data-button-selectors="button.add-to-cart, button.buy-now">
</script>
```

### Example 3: Lead Generation Form
```html
<script id="ph-product-injector"
    src="/lib/clientAnalytics/ph-product-injector.js"
    data-event-name="Submitted Lead Form"
    data-price-class='["package-price", "tier-price"]'
    data-product-class='["package-name", "tier-title"]'
    data-price-watch-selectors="select.package-selector"
    data-email-selectors="input[name='contact-email']"
    data-button-selectors="button[type='submit'], .submit-button">
</script>
```

### Example 4: Minimal Configuration (using all defaults)
```html
<!-- Works out-of-the-box for standard HTML patterns -->
<script id="ph-product-injector"
    src="/lib/clientAnalytics/ph-product-injector.js"
    data-event-name="Purchase Intent"
    data-price-class="price">
</script>
```

## How Defaults Work

The injector uses **intelligent defaults** when configuration attributes are not provided:

1. **Checks if client provided custom selectors**: `DS.priceWatchSelectors`, `DS.emailSelectors`, `DS.buttonSelectors`
2. **If not provided**: Uses broad selectors that match common HTML patterns
3. **Dynamic enhancement**: If `data-price-class` is configured, automatically adds those classes to watch lists
4. **Error handling**: Invalid selectors log warnings but don't break execution

```javascript
// Example: Price watch listeners with dynamic defaults
let selectorString = DS.priceWatchSelectors;

if (!isNonEmptyStr(selectorString)) {
    const defaultSelectors = [
        'select[id*="plan" i]',
        'select[name*="plan" i]',
        // ... more defaults ...
    ];
    
    // If client configured data-price-class="price"
    if (isNonEmptyStr(DS.priceClass)) {
        const classes = parseMaybeJSONList(DS.priceClass);
        classes.forEach(cls => {
            defaultSelectors.push(`.${cls} select`);
            defaultSelectors.push(`.${cls} input[type="radio"]`);
        });
    }
    
    selectorString = defaultSelectors.join(', ');
}

try {
    const elements = document.querySelectorAll(selectorString);
    // ... bind listeners ...
} catch (e) {
    console.warn('[ph-injector] Invalid selectors:', selectorString, e);
}
```

## Best Practices

### 1. Start with Defaults
For standard HTML pages, the defaults work well. Only customize when needed:
```html
<script id="ph-product-injector"
    data-event-name="Purchase">
    <!-- Will use all intelligent defaults -->
</script>
```

### 2. Be Specific
More specific selectors = better performance and accuracy:
```html
<!-- ❌ Too broad -->
data-button-selectors="div, span, a, button"

<!-- ✅ Specific and efficient -->
data-button-selectors="button.checkout-btn, a.buy-now-link"
```

### 3. Test with Invalid Selectors
Invalid selectors log warnings but don't crash:
```html
<!-- This will warn in console but continue with defaults -->
<script id="ph-product-injector"
    data-price-watch-selectors="this[is[not[valid]]]]">
</script>
```

### 4. Combine Multiple Selectors
Use comma-separated CSS selectors for multiple patterns:
```html
data-email-selectors="input.email, input#user-email, [data-field='email']"
```

### 5. Use CSS Attribute Selectors
Powerful for dynamic frameworks (React, Vue, etc.):
```html
<!-- React components -->
data-button-selectors="[data-component='Button'], [data-testid='cta-button']"

<!-- Vue components -->
data-button-selectors="[data-v-component='purchase-button']"
```

## Backward Compatibility

**All new attributes are optional**. Existing implementations continue to work without any changes:

```html
<!-- ✅ EXISTING CONFIG - Still works perfectly -->
<script id="ph-product-injector"
    data-event-name="Clicked CTA"
    data-price-class="price">
</script>
```

The injector will:
1. Check for new selector attributes
2. If not found, use intelligent defaults
3. Enhance defaults based on existing config (`data-price-class`, etc.)

## Debugging

### Check What Selectors Are Being Used

Open browser console after page load:

```javascript
// Check if custom selectors were provided
console.log('Price watch selectors:', document.querySelector('#ph-product-injector').getAttribute('data-price-watch-selectors'));
console.log('Email selectors:', document.querySelector('#ph-product-injector').getAttribute('data-email-selectors'));
console.log('Button selectors:', document.querySelector('#ph-product-injector').getAttribute('data-button-selectors'));
```

### Invalid Selector Warnings

If you provide invalid selectors, you'll see warnings like:
```
[ph-injector] Invalid price watch selectors: select[invalid[[]]] DOMException: Failed to execute 'querySelectorAll'
```

### Test Selector Validity

Before deploying, test selectors in console:
```javascript
// Test if selector is valid
try {
    const elements = document.querySelectorAll('your-selector-here');
    console.log('Found', elements.length, 'elements');
} catch (e) {
    console.error('Invalid selector:', e);
}
```

## Migration Guide

### Migrating from Hardcoded Version

**Before (hardcoded):**
```javascript
// Inside ph-product-injector.js (requires code changes for each client)
const priceInputs = document.querySelectorAll('select[id*="plan" i]');
```

**After (configurable):**
```html
<!-- In HTML (no code changes needed per client) -->
<script id="ph-product-injector"
    data-price-watch-selectors="select[id*='plan' i]">
</script>
```

### Step-by-Step Migration

1. **Identify hardcoded selectors** in your HTML structure
2. **Add configuration attributes** to script tag
3. **Test in development** environment
4. **Deploy with confidence** - defaults provide fallback

## Advanced Use Cases

### Dynamic SPA with Route-Specific Selectors

For Single Page Applications where selectors change per route:

```javascript
// Update selectors dynamically when route changes
window.addEventListener('ph:routechange', () => {
    const script = document.querySelector('#ph-product-injector');
    
    if (window.location.pathname === '/checkout') {
        script.setAttribute('data-email-selectors', '#checkout-email');
        script.setAttribute('data-button-selectors', 'button.place-order');
    } else if (window.location.pathname === '/pricing') {
        script.setAttribute('data-button-selectors', 'button.select-plan');
    }
    
    // Trigger re-scan
    window.dispatchEvent(new Event('ph:routechange'));
});
```

### Client-Specific Configuration Library

Create a configuration library for different clients:

```javascript
// clients-config.js
const CLIENTS = {
    'acme-corp': {
        priceWatchSelectors: 'select.plan-selector, input[name="billing"]',
        emailSelectors: 'input.email-field',
        buttonSelectors: 'button.cta-button'
    },
    'widgets-inc': {
        priceWatchSelectors: '.pricing-toggle, .plan-option',
        emailSelectors: '#user-email',
        buttonSelectors: '.purchase-btn, .subscribe-link'
    }
};

// Apply configuration
function configureForClient(clientId) {
    const config = CLIENTS[clientId];
    const script = document.querySelector('#ph-product-injector');
    
    Object.entries(config).forEach(([key, value]) => {
        const attrName = 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
        script.setAttribute(attrName, value);
    });
}
```

## Support

For issues or questions about multi-client configuration:

1. Check console warnings for invalid selectors
2. Test selectors using browser DevTools (`document.querySelectorAll(...)`)
3. Verify attribute names match exactly: `data-price-watch-selectors`, `data-email-selectors`, `data-button-selectors`
4. Review defaults in this documentation

## Changelog

### v2.0.0 (Multi-Client Support)
- ✅ Added `data-price-watch-selectors` configuration
- ✅ Added `data-email-selectors` configuration  
- ✅ Added `data-button-selectors` configuration
- ✅ Intelligent defaults for all selectors
- ✅ Dynamic enhancement based on `data-price-class`
- ✅ Error handling with console warnings
- ✅ 100% backward compatible

### v1.x (Previous)
- Edge case fixes (international formats, currency detection, etc.)
- Container detection improvements
- Dynamic price change listeners
- sessionStorage persistence
