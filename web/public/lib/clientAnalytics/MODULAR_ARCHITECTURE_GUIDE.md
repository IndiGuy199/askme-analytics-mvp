# AskMe Analytics v2.0 - Modular Architecture Guide

## Overview

AskMe Analytics v2.0 introduces a complete architectural refactoring, breaking the monolithic 1867-line `ph-product-injector.js` into specialized, maintainable modules. This modular design enables:

- **Easier debugging** - Each concern is isolated in its own file
- **Client-specific customization** - Add custom extraction strategies without touching core logic
- **Better testability** - Each module can be tested independently
- **Maintainability** - Clear separation of concerns reduces complexity

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  askme-analytics-init-v2.js                                 │
│  (Initialization orchestrator)                              │
└────────────────┬────────────────────────────────────────────┘
                 │ Loads modules sequentially ↓
                 │
┌────────────────┴────────────────────────────────────────────┐
│  1. ph-constants.js     → Global enums & constants          │
│  2. ph-utils.js         → DOM utilities & helpers           │
│  3. ph-identity.js      → User identification bridge        │
│  4. ph-event-capture.js → Event capture & queuing           │
│  5. ph-product-extractors.js → Product metadata extraction  │
│  6. ph-observers.js     → DOM/route observers               │
│  7. ph-step-tracker.js  → Step tagging & rules              │
│  8. ph-product-injector-refactored.js → Main orchestration  │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Responsibilities

### 1. **ph-constants.js**
**Purpose**: Global constants and enums shared across all modules

**Exports**:
- `window.PH_KEYS` - Event names (SIGNUP_COMPLETED, CHECKOUT_COMPLETED, etc.)
- `window.PH_DATA_KEYS` - Data attribute keys (data-event-name, data-steps, etc.)
- `window.PH_PRODUCT_DOM` - DOM attributes (data-product, data-price, etc.)
- `window.PH_PROPS` - PostHog property keys (product, price, currency, etc.)
- `window.PH_PRODUCT_EVENT` - Default event names

**Dependencies**: None (load first)

---

### 2. **ph-utils.js**
**Purpose**: Reusable DOM utilities and selector helpers

**Key Functions**:
- `PHUtils.norm(s)` - Normalize whitespace in strings
- `PHUtils.isNonEmptyStr(x)` - Check for non-empty strings
- `PHUtils.isValidSelector(s)` - Validate CSS selectors
- `PHUtils.qsa(sel, root)` - Query selector all (safe wrapper)
- `PHUtils.first(root, selCsv)` - Find first matching element from CSV selectors
- `PHUtils.ciRegex(str)` - Create case-insensitive regex
- `PHUtils.isVisible(el)` - Check element visibility
- `PHUtils.evaluateXPath(xpath)` - XPath evaluation
- `PHUtils.buildSelector(options)` - Multi-strategy selector builder
- `PHUtils.findElements(options)` - Multi-strategy element finder

**Dependencies**: None

**Usage Example**:
```javascript
// Find elements using multiple strategies
const buttons = PHUtils.findElements({
    selector: '.pricing-button',
    class: 'btn-primary',
    attr: 'data-pricing-button',
    xpath: '//button[@role="cta"]'
});
```

---

### 3. **ph-identity.js**
**Purpose**: Backend-agnostic user identification bridge

**Key Functions**:
- `AMA.preAuthMark()` - Capture anonymous ID before login
- `AMA.afterLoginIdentify(user, props)` - Merge anonymous session with identified user
- `AMA.onLogoutCleanup(userId)` - Clean up identification data
- `AMA.identifyUser(email, properties)` - Direct PostHog identification

**Dependencies**: None

**Usage Example**:
```javascript
// Before login form submission
AMA.preAuthMark();

// After successful login
AMA.afterLoginIdentify({ id: 'user123', email: 'user@example.com' }, {
    company_id: 'company456',
    company_name: 'Acme Corp'
});

// On logout
AMA.onLogoutCleanup('user123');
```

---

### 4. **ph-event-capture.js**
**Purpose**: PostHog event capture, queuing, deduplication, and revenue tracking

**Key Functions**:
- `PHEventCapture.captureOnce(name, props, options)` - Fire event with deduplication
- `PHEventCapture.isReady()` - Check if PostHog is ready
- `PHEventCapture.getQueueLength()` - Get number of queued events

**Features**:
- Automatic queuing when PostHog not ready
- UTM parameter extraction and persistence
- Revenue tracking enhancement for purchase events
- Session storage-based deduplication

**Dependencies**: PH_PROPS, PH_KEYS

**Usage Example**:
```javascript
// Fire event once per path
PHEventCapture.captureOnce('PRODUCT_SELECTED', {
    product: 'premium',
    price: '39.00',
    currency: 'USD'
}, { scopePath: true });
```

---

### 5. **ph-product-extractors.js**
**Purpose**: Product metadata extraction strategies

**Key Functions**:
- `PHExtractors.guessContainer(btn, config)` - Find pricing container for button
- `PHExtractors.extractFromContainer(container, config)` - Container-based extraction
- `PHExtractors.extractFromCheckboxes(container, config)` - Checkbox-based extraction (NEW)
- `PHExtractors.extractRevenueData(container, config)` - Revenue data extraction
- `PHExtractors.text(el, sel)` - Extract text from element
- `PHExtractors.attr(el, attrName, sel)` - Extract attribute value
- `PHExtractors.parseNum(input)` - Parse numeric price

**Extraction Strategies**:

1. **Container-based** (default) - One button per product
   ```javascript
   const props = PHExtractors.extractFromContainer(container, config);
   // Returns: { product, price, currency, quantity }
   ```

2. **Checkbox-based** (Amazon-style) - Multiple checkboxes → single button
   ```javascript
   const props = PHExtractors.extractFromCheckboxes(container, config);
   // Returns: { product: 'product1,product2', price: '78.00', currency: 'USD', quantity: '2' }
   ```

**Dependencies**: PHUtils, PH_PROPS, PH_PRODUCT_DOM

**Adding Custom Extraction Strategy**:
```javascript
// Extend PHExtractors with custom strategy
PHExtractors.extractFromSlider = function(container, config) {
    const slider = container.querySelector('.price-slider');
    const value = slider.value;
    
    return {
        [P.PRODUCT]: 'variable_plan',
        [P.PRICE]: (value * 10).toFixed(2),
        [P.CURRENCY]: 'USD',
        [P.QUANTITY]: '1'
    };
};
```

---

### 6. **ph-observers.js**
**Purpose**: DOM mutation and route change monitoring

**Key Functions**:
- `PHObservers.startMutationObserver(targetNode, config)` - Monitor DOM changes
- `PHObservers.stopMutationObserver()` - Stop mutation observer
- `PHObservers.startRouteObserver()` - Monitor SPA route changes
- `PHObservers.stopRouteObserver()` - Stop route observer
- `PHObservers.onMutation(callback)` - Register mutation callback
- `PHObservers.onRouteChange(callback)` - Register route change callback
- `PHObservers.watchVisibility(element, callback)` - Watch element visibility

**Dependencies**: None

**Usage Example**:
```javascript
// Monitor DOM changes
PHObservers.onMutation((mutations) => {
    console.log('DOM changed, re-scan for buttons');
    scanAndAnnotate();
});

// Monitor route changes
PHObservers.onRouteChange((oldPath, newPath) => {
    console.log(`Route changed: ${oldPath} → ${newPath}`);
    applyAllRules();
});

PHObservers.startMutationObserver();
PHObservers.startRouteObserver();
```

---

### 7. **ph-step-tracker.js**
**Purpose**: Dynamic step tagging, rule evaluation, and click tracking

**Key Functions**:
- `PHStepTracker.tagElementsForRule(rule, config, extractRevenueData)` - Apply single rule
- `PHStepTracker.applyAllRules(rules, config, extractRevenueData, mutationObserver)` - Apply all rules
- `PHStepTracker.extractEventNameFromClass(element)` - Extract event from `ph-track-*` class
- `PHStepTracker.scanForPhTrackClasses(extractRevenueData, productPropsFrom)` - Auto-detect CSS classes

**Features**:
- URL-based rule filtering
- Selector + textRegex + XPath matching
- AutoFire events (fire once on page load)
- RequireSelectorPresent (fire when selector found)
- Rule priority and blocking
- `ph-track-*` CSS class convention

**Dependencies**: PHUtils, PH_PROPS, PH_KEYS, PHEventCapture

**Usage Example**:
```javascript
// Define step rules
const rules = [
    {
        key: 'CHECKOUT_STARTED',
        url: '/checkout',
        urlMatch: 'contains',
        autoFire: true,
        oncePerPath: true
    },
    {
        key: 'CHECKOUT_COMPLETED',
        url: '/thank-you',
        urlMatch: 'exact',
        requireSelectorPresent: true,
        selector: '.order-confirmation',
        metadata: { revenue_event: true }
    }
];

PHStepTracker.applyAllRules(rules, config, extractRevenueData, mutationObserver);
```

---

### 8. **ph-product-injector-refactored.js** (Main Orchestration)
**Purpose**: Coordinate all modules and handle product tracking

**Key Responsibilities**:
- Parse configuration from script tag data attributes
- Coordinate product annotation (button metadata)
- Handle global click events (data-ph, ph-track-*, product buttons)
- Setup SPA navigation hooks
- Configure price change listeners
- Bootstrap entire system

**Dependencies**: ALL previous modules

**Size**: ~400 lines (vs 1867 original) - 79% reduction

---

## Migration Guide: v1 → v2

### Step 1: Update Script Tags

**Old (v1)**:
```html
<script src="/lib/clientAnalytics/askme-analytics-init.js"></script>
```

**New (v2)**:
```html
<script src="/lib/clientAnalytics/askme-analytics-init-v2.js"></script>
```

### Step 2: Configuration Compatibility

**All existing configurations work unchanged**. The new system is fully backward compatible:

```javascript
window.AskMeAnalyticsConfig = {
    apiKey: 'phc_xxx',
    productConfig: {
        eventName: 'subscription_click',
        panelClass: 'pricing-card',
        titleClass: 'plan-name',
        priceClass: 'plan-price'
        // All existing config keys work
    },
    steps: [/* existing steps */]
};
```

### Step 3: Enable Checkbox Mode (Optional - NEW Feature)

To use Amazon-style checkbox selection:

```javascript
window.AskMeAnalyticsConfig = {
    productConfig: {
        // ... existing config ...
        checkboxMode: true,
        checkboxItemSelector: '.product-item', // Container for each checkbox+product
    }
};
```

### Step 4: Test Thoroughly

1. **Verify existing events fire correctly**
   - Check PostHog debugger for product clicks
   - Verify step events (CHECKOUT_STARTED, etc.)
   - Confirm UTM tracking works

2. **Test dynamic content**
   - SPA navigation
   - Price changes (monthly/yearly toggle)
   - Mutation observer re-scanning

3. **Check deduplication**
   - Events should fire once per path (if `oncePerPath: true`)
   - No duplicate events in PostHog

---

## Adding Client-Specific Logic

### Example: Custom Extraction for Tiered Pricing

**File**: `web/public/lib/clientAnalytics/custom/client-acme-extractors.js`

```javascript
(function() {
    'use strict';
    
    // Wait for PHExtractors to load
    if (!window.PHExtractors) {
        setTimeout(arguments.callee, 50);
        return;
    }
    
    // Add custom extraction strategy
    PHExtractors.extractAcmeTiered = function(container, config) {
        const tier = container.getAttribute('data-tier'); // gold, silver, bronze
        const seats = container.querySelector('.seat-count')?.value || '1';
        
        const tierPrices = {
            gold: 99,
            silver: 49,
            bronze: 29
        };
        
        const basePrice = tierPrices[tier] || 0;
        const totalPrice = basePrice * parseInt(seats);
        
        return {
            product: `${tier}_${seats}_seats`,
            price: totalPrice.toFixed(2),
            currency: 'USD',
            quantity: seats
        };
    };
    
    console.log('✅ Acme custom extractors loaded');
})();
```

**Load after modules**:
```html
<script src="/lib/clientAnalytics/askme-analytics-init-v2.js"></script>
<script src="/lib/clientAnalytics/custom/client-acme-extractors.js"></script>
```

**Use in injector**:
```javascript
// In ph-product-injector-refactored.js (or custom override)
if (config.clientId === 'acme-corp') {
    props = PHExtractors.extractAcmeTiered(container, DS);
} else {
    props = PHExtractors.extractFromContainer(container, DS);
}
```

---

## Debugging

### Enable Debug Logging

```javascript
window.AskMeAnalyticsConfig.debug = true;
```

### Check Module Loading

Open browser console:
```
[init-v2] 📦 Loading module 1/8: Constants
[ph-constants] loaded successfully
[init-v2] ✅ Module loaded: Constants
[init-v2] 📦 Loading module 2/8: Utils
[ph-utils] ✅ Utility module loaded
...
[init-v2] 🎉 AskMe Analytics v2.0 initialization complete
```

### Verify Dependencies

```javascript
// In browser console
console.log('PH_KEYS:', window.PH_KEYS);
console.log('PHUtils:', window.PHUtils);
console.log('PHExtractors:', window.PHExtractors);
console.log('PHEventCapture:', window.PHEventCapture);
console.log('PHObservers:', window.PHObservers);
console.log('PHStepTracker:', window.PHStepTracker);
```

### Check Event Queue

```javascript
// See if events are queued (PostHog not ready)
console.log('Queue length:', PHEventCapture.getQueueLength());
console.log('PostHog ready:', PHEventCapture.isReady());
```

---

## File Structure

```
web/public/lib/clientAnalytics/
├── askme-analytics-init-v2.js          # New initialization script
├── ph-constants.js                     # Constants (unchanged)
├── ph-utils.js                         # NEW: DOM utilities
├── ph-identity.js                      # NEW: User identification
├── ph-event-capture.js                 # NEW: Event capture
├── ph-product-extractors.js            # NEW: Product extraction
├── ph-observers.js                     # NEW: DOM observers
├── ph-step-tracker.js                  # NEW: Step tracking
├── ph-product-injector-refactored.js   # NEW: Main orchestration
└── ph-product-injector.js              # OLD: Monolithic (deprecated)
```

---

## Performance Comparison

| Metric | v1 (Monolithic) | v2 (Modular) | Improvement |
|--------|----------------|--------------|-------------|
| Main file size | 1867 lines | 400 lines | 79% reduction |
| Debuggability | Low (all in one file) | High (isolated concerns) | ✅ |
| Testability | Low (coupled logic) | High (pure functions) | ✅ |
| Extensibility | Hard (modify monolith) | Easy (add modules) | ✅ |
| Client customization | Complex (fork entire file) | Simple (extend extractors) | ✅ |

---

## FAQ

### Q: Do I need to migrate immediately?
**A**: No. v1 (ph-product-injector.js) still works. Migrate when ready.

### Q: Will my existing configuration break?
**A**: No. v2 is fully backward compatible with v1 configurations.

### Q: Can I mix v1 and v2?
**A**: No. Use either `askme-analytics-init.js` (v1) OR `askme-analytics-init-v2.js` (v2), not both.

### Q: How do I add Amazon-style checkbox selection?
**A**: Set `checkboxMode: true` in productConfig. See "Enable Checkbox Mode" section.

### Q: What if a module fails to load?
**A**: The init script continues loading other modules. Check console for errors.

### Q: Can I load modules in parallel?
**A**: No. Modules must load sequentially due to dependencies.

---

## Support

For issues or questions:
1. Check browser console for module loading errors
2. Verify all modules loaded: `window.PHUtils`, `window.PHExtractors`, etc.
3. Enable debug mode: `window.AskMeAnalyticsConfig.debug = true`
4. Check PostHog debugger for event capture

---

## Version History

- **v2.0.0** (2025-01-14) - Modular architecture refactoring
  - Split monolithic 1867-line file into 8 specialized modules
  - Added checkbox-based product extraction
  - Improved extensibility and maintainability
  - Fully backward compatible with v1 configurations

- **v1.x.x** - Original monolithic implementation
