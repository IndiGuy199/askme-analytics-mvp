# Product Configuration Test Cases

**Version 1.0** — Comprehensive test suite for productConfig and steps workflow

---

## 📚 Table of Contents

1. [Product Configuration Tests](#product-configuration-tests)
2. [Steps Workflow Tests](#steps-workflow-tests)
3. [Integration Tests](#integration-tests)
4. [E-commerce Platform Tests](#e-commerce-platform-tests)
5. [Test Execution Guide](#test-execution-guide)

---

## Product Configuration Tests

### Test Suite 1: Selector Strategy Tests

#### TC-PC-001: CSS Class Selector
**Objective**: Verify product extraction using CSS class selectors

**Setup**:
```javascript
productConfig: {
    panelClass: 'pricing-card',
    titleClass: 'plan-name',
    priceClass: 'price-amount',
    productButtonSelectors: 'button.cta'
}
```

**HTML**:
```html
<div class="pricing-card">
  <h3 class="plan-name">Premium Plan</h3>
  <div class="price-amount">$49.99</div>
  <button class="cta">Buy Now</button>
</div>
```

**Expected Result**:
```html
<button class="cta"
  data-product="premium_plan"
  data-price="49.99"
  data-currency="USD"
  data-quantity="1">Buy Now</button>
```

**Validation**:
- ✅ Button has all 4 data attributes
- ✅ Product name normalized (spaces→underscores, lowercase)
- ✅ Price parsed correctly (number only, no symbols)
- ✅ Currency defaults to USD
- ✅ Quantity defaults to 1

---

#### TC-PC-002: CSS Selector Strategy
**Objective**: Verify complex CSS selectors work correctly

**Setup**:
```javascript
productConfig: {
    panelSelector: '.pricing > div[role="article"]',
    titleSelector: 'h2.plan-name, [itemprop="name"]',
    priceSelector: '.price-value, [itemprop="price"]',
    productButtonSelectors: '[role="article"] button'
}
```

**HTML**:
```html
<div class="pricing">
  <div role="article">
    <h2 itemprop="name">Business Plan</h2>
    <span itemprop="price">$99.99</span>
    <button>Subscribe</button>
  </div>
</div>
```

**Expected Result**:
```html
<button
  data-product="business_plan"
  data-price="99.99"
  data-currency="USD"
  data-quantity="1">Subscribe</button>
```

**Validation**:
- ✅ Complex selectors resolve correctly
- ✅ Multiple selector options (comma-separated) work
- ✅ Semantic HTML attributes (itemprop) supported

---

#### TC-PC-003: Data Attribute Strategy
**Objective**: Verify data attribute selectors (best practice)

**Setup**:
```javascript
productConfig: {
    panelAttr: 'data-pricing-card',
    titleAttr: 'data-plan-name',
    priceAttr: 'data-price',
    currencyAttr: 'data-currency',
    productButtonSelectors: '[data-pricing-button]'
}
```

**HTML**:
```html
<div data-pricing-card="enterprise">
  <h3 data-plan-name>Enterprise</h3>
  <div data-price="499.00" data-currency="USD">$499/month</div>
  <button data-pricing-button>Contact Sales</button>
</div>
```

**Expected Result**:
```html
<button data-pricing-button
  data-product="enterprise"
  data-price="499.00"
  data-currency="USD"
  data-quantity="1">Contact Sales</button>
```

**Validation**:
- ✅ Attribute values read directly (no text parsing)
- ✅ Exact price preserved (499.00 not 499)
- ✅ Currency from attribute, not text

---

#### TC-PC-004: Element ID Strategy
**Objective**: Verify ID-based selectors work

**Setup**:
```javascript
productConfig: {
    panelId: 'premium-card',
    titleId: 'plan-title',
    priceId: 'plan-price',
    productButtonSelectors: '#premium-card button'
}
```

**HTML**:
```html
<div id="premium-card">
  <h3 id="plan-title">Premium</h3>
  <div id="plan-price">$49.99</div>
  <button>Get Started</button>
</div>
```

**Expected Result**:
```html
<button
  data-product="premium"
  data-price="49.99"
  data-currency="USD"
  data-quantity="1">Get Started</button>
```

**Validation**:
- ✅ ID selectors resolve correctly
- ✅ Works for single pricing panel
- ⚠️ Note: IDs must be unique per page

---

#### TC-PC-005: XPath Strategy
**Objective**: Verify XPath expressions work correctly

**Setup**:
```javascript
productConfig: {
    panelXPath: '//div[@class="pricing-card"]',
    titleXPath: '//h3[contains(@class, "plan-name")]',
    priceXPath: '//span[@itemprop="price"]',
    productButtonSelectors: '.pricing-card button'
}
```

**HTML**:
```html
<div class="pricing-card">
  <h3 class="plan-name bold">Starter</h3>
  <span itemprop="price">$19.99</span>
  <button>Start Free Trial</button>
</div>
```

**Expected Result**:
```html
<button
  data-product="starter"
  data-price="19.99"
  data-currency="USD"
  data-quantity="1">Start Free Trial</button>
```

**Validation**:
- ✅ XPath expressions evaluate correctly
- ✅ XPath fallback works when CSS fails
- ✅ Complex XPath queries supported

---

#### TC-PC-006: Selector Precedence
**Objective**: Verify selector strategies are checked in correct order

**Setup**:
```javascript
productConfig: {
    titleSelector: 'h2.plan-name',     // Priority 1
    titleClass: 'wrong-class',         // Priority 2 (should be skipped)
    titleAttr: 'data-plan',            // Priority 3 (should be skipped)
    titleId: 'plan-title',             // Priority 4 (should be skipped)
    titleXPath: '//h3',                // Priority 5 (should be skipped)
    productButtonSelectors: 'button'
}
```

**HTML**:
```html
<div>
  <h2 class="plan-name">Premium</h2>
  <h3 id="plan-title">Should Not Use This</h3>
  <div class="wrong-class">Wrong</div>
  <button>Subscribe</button>
</div>
```

**Expected Result**:
```html
<button data-product="premium" ...>Subscribe</button>
```

**Validation**:
- ✅ Selector strategy used (highest priority)
- ✅ Other strategies ignored
- ✅ "Premium" extracted, not "Wrong" or "Should Not Use This"

---

### Test Suite 2: Price Parsing Tests

#### TC-PP-001: US Dollar Format
**Objective**: Verify USD price parsing

**Test Data**:
| Input | Expected Price | Expected Currency |
|-------|---------------|-------------------|
| $49.99 | 49.99 | USD |
| $1,234.56 | 1234.56 | USD |
| 99.00 USD | 99.00 | USD |
| Free | 0.00 | USD |

**Validation**:
- ✅ Dollar sign removed
- ✅ Commas removed
- ✅ Decimal preserved
- ✅ "Free" converts to 0.00

---

#### TC-PP-002: European Format
**Objective**: Verify European price parsing

**Test Data**:
| Input | Expected Price | Expected Currency |
|-------|---------------|-------------------|
| €45,99 | 45.99 | EUR |
| €1.234,56 | 1234.56 | EUR |
| 39,99 EUR | 39.99 | EUR |

**Validation**:
- ✅ Euro sign detected and removed
- ✅ Thousand separator (.) removed
- ✅ Decimal separator (,) converted to (.)
- ✅ Currency detected from symbol

---

#### TC-PP-003: Multi-Currency Support
**Objective**: Verify multiple currencies detected correctly

**Test Data**:
| Input | Expected Currency |
|-------|-------------------|
| $49.99 | USD |
| €45.99 | EUR |
| £39.99 | GBP |
| ¥4999 | JPY |
| ₹3499 | INR |
| C$59.99 | CAD |
| A$65.99 | AUD |

**Validation**:
- ✅ All currency symbols detected
- ✅ Correct ISO codes assigned
- ✅ Multi-character symbols (C$, A$) work

---

#### TC-PP-004: Price Attribute vs Text
**Objective**: Verify data-price attribute takes precedence

**Setup**:
```javascript
productConfig: {
    priceAttr: 'data-price',
    priceClass: 'price-display'
}
```

**HTML**:
```html
<div data-price="49.99" class="price-display">
  $49.99/month (billed annually)
</div>
```

**Expected Result**:
- Price: "49.99" (from attribute, not text)

**Validation**:
- ✅ Attribute value used
- ✅ Text parsing bypassed
- ✅ Extra text ignored

---

### Test Suite 3: Button Selector Tests

#### TC-BS-001: Specific Button Classes
**Objective**: Verify only configured buttons are annotated

**Setup**:
```javascript
productConfig: {
    panelClass: 'pricing-card',
    titleClass: 'plan-name',
    priceClass: 'price',
    productButtonSelectors: 'button.buy-button, button.subscribe-btn'
}
```

**HTML**:
```html
<div class="pricing-card">
  <h3 class="plan-name">Premium</h3>
  <div class="price">$49.99</div>
  <button class="buy-button">Buy Now</button>
  <button class="subscribe-btn">Subscribe</button>
  <button class="close-btn">Close</button>
  <button class="cancel-btn">Cancel</button>
</div>
```

**Expected Result**:
- ✅ `button.buy-button` has product attributes
- ✅ `button.subscribe-btn` has product attributes
- ❌ `button.close-btn` has NO product attributes
- ❌ `button.cancel-btn` has NO product attributes

**Validation**:
- ✅ Only specified buttons annotated
- ✅ Other buttons untouched
- ✅ No false positives

---

#### TC-BS-002: Container-Based Selectors
**Objective**: Verify container-based button targeting

**Setup**:
```javascript
productConfig: {
    productButtonSelectors: '.pricing-card button, .product-card button'
}
```

**HTML**:
```html
<div class="pricing-card">
  <button>Buy Now</button>
</div>
<div class="product-card">
  <button>Add to Cart</button>
</div>
<div class="header">
  <button>Menu</button>
</div>
```

**Expected Result**:
- ✅ Pricing card button annotated
- ✅ Product card button annotated
- ❌ Header menu button NOT annotated

**Validation**:
- ✅ Container scoping works
- ✅ Buttons outside containers ignored

---

#### TC-BS-003: Data Attribute Buttons (Best Practice)
**Objective**: Verify data-attribute button targeting

**Setup**:
```javascript
productConfig: {
    productButtonSelectors: '[data-pricing-button]'
}
```

**HTML**:
```html
<button data-pricing-button>Subscribe</button>
<button data-checkout-button>Checkout</button>
<button>Cancel</button>
```

**Expected Result**:
- ✅ `[data-pricing-button]` annotated
- ❌ `[data-checkout-button]` NOT annotated
- ❌ Cancel button NOT annotated

**Validation**:
- ✅ Precise targeting with data attributes
- ✅ Most reliable strategy
- ✅ No ambiguity

---

#### TC-BS-004: Container Filtering
**Objective**: Verify buttons must be inside valid pricing containers

**Setup**:
```javascript
productConfig: {
    panelClass: 'pricing-card',
    titleClass: 'plan-name',
    priceClass: 'price',
    productButtonSelectors: 'button'  // Intentionally broad
}
```

**HTML**:
```html
<div class="pricing-card">
  <h3 class="plan-name">Premium</h3>
  <div class="price">$49.99</div>
  <button>Subscribe</button>
</div>
<div class="other-section">
  <button>Not a pricing button</button>
</div>
```

**Expected Result**:
- ✅ Button inside `.pricing-card` annotated
- ❌ Button in `.other-section` NOT annotated (no container found)

**Validation**:
- ✅ Container filtering active
- ✅ Safety mechanism works
- ✅ Prevents false positives

---

### Test Suite 4: Multiple Products Tests

#### TC-MP-001: Multiple Pricing Tiers
**Objective**: Verify multiple products tracked on one page

**HTML**:
```html
<div class="pricing-card">
  <h3 class="plan-name">Basic</h3>
  <div class="price">$9.99</div>
  <button class="cta">Buy Basic</button>
</div>

<div class="pricing-card">
  <h3 class="plan-name">Premium</h3>
  <div class="price">$49.99</div>
  <button class="cta">Buy Premium</button>
</div>

<div class="pricing-card">
  <h3 class="plan-name">Enterprise</h3>
  <div class="price">$199.99</div>
  <button class="cta">Buy Enterprise</button>
</div>
```

**Expected Result**:
```html
<button class="cta"
  data-product="basic"
  data-price="9.99" ...>Buy Basic</button>

<button class="cta"
  data-product="premium"
  data-price="49.99" ...>Buy Premium</button>

<button class="cta"
  data-product="enterprise"
  data-price="199.99" ...>Buy Enterprise</button>
```

**Validation**:
- ✅ All 3 buttons annotated
- ✅ Each button has correct product
- ✅ Each button has correct price
- ✅ No cross-contamination

---

#### TC-MP-002: Nested Products
**Objective**: Verify nested product structures work

**HTML**:
```html
<div class="category">
  <div class="pricing-card">
    <h3>Basic</h3>
    <div class="price">$9.99</div>
    <button>Buy</button>
  </div>
  <div class="pricing-card">
    <h3>Premium</h3>
    <div class="price">$49.99</div>
    <button>Buy</button>
  </div>
</div>
```

**Expected Result**:
- ✅ Both buttons annotated correctly
- ✅ guessContainer() finds closest panel
- ✅ No mixing of data between panels

**Validation**:
- ✅ Container detection works with nesting
- ✅ Closest parent panel found
- ✅ Data isolation maintained

---

### Test Suite 5: Quantity Tracking Tests

#### TC-QT-001: Seat-Based Pricing
**Objective**: Verify quantity extraction from input

**Setup**:
```javascript
productConfig: {
    quantityClass: 'seat-count'
}
```

**HTML**:
```html
<div class="pricing-card">
  <h3>Team Plan</h3>
  <div class="price">$10 per seat</div>
  <input type="number" class="seat-count" value="5">
  <button>Subscribe</button>
</div>
```

**Expected Result**:
```html
<button data-quantity="5" ...>Subscribe</button>
```

**Validation**:
- ✅ Input value read correctly
- ✅ Quantity updates when input changes
- ✅ Defaults to "1" if no input

---

#### TC-QT-002: Select Dropdown Quantity
**Objective**: Verify quantity from select element

**HTML**:
```html
<select class="seat-count">
  <option value="1">1 seat</option>
  <option value="5" selected>5 seats</option>
  <option value="10">10 seats</option>
</select>
<button>Subscribe</button>
```

**Expected Result**:
```html
<button data-quantity="5" ...>Subscribe</button>
```

**Validation**:
- ✅ Selected option value used
- ✅ Updates when selection changes

---

### Test Suite 6: Dynamic Content Tests

#### TC-DC-001: Price Toggle (Monthly/Yearly)
**Objective**: Verify buttons update when prices change

**Setup**:
```javascript
productConfig: {
    priceClass: 'price',
    priceWatchSelectors: 'input[name="billing-cycle"]'
}
```

**Test Steps**:
1. Load page with monthly pricing
2. Verify button has `data-price="49.99"`
3. Toggle to yearly pricing (price changes to $499.99)
4. Verify button updates to `data-price="499.99"`

**Validation**:
- ✅ Price watch listeners bound
- ✅ scanAndAnnotate() called on change
- ✅ Button attributes update

---

#### TC-DC-002: SPA Route Changes
**Objective**: Verify tracking works on SPA route changes

**Test Steps**:
1. Navigate to /products (no product tracking)
2. Navigate to /pricing (product tracking active)
3. Verify buttons annotated
4. Navigate back to /products
5. Verify buttons NOT annotated

**Validation**:
- ✅ pageMatches() checks current URL
- ✅ scanAndAnnotate() runs on route change
- ✅ Cleanup on non-matching pages

---

#### TC-DC-003: DOM Mutations
**Objective**: Verify tracking works when pricing cards added dynamically

**Test Steps**:
1. Load page with 2 pricing cards
2. Verify 2 buttons annotated
3. Dynamically add 3rd pricing card via JavaScript
4. Verify new button automatically annotated

**Validation**:
- ✅ MutationObserver detects additions
- ✅ onMutations() called
- ✅ New elements processed

---

### Test Suite 7: Edge Cases

#### TC-EC-001: Missing Elements
**Objective**: Verify graceful handling of missing elements

**Scenario**: Panel has no price element

**HTML**:
```html
<div class="pricing-card">
  <h3 class="plan-name">Custom</h3>
  <!-- No price! -->
  <button>Contact Us</button>
</div>
```

**Expected Result**:
```html
<button
  data-product="custom"
  data-price="0.00"
  data-currency="USD"
  data-quantity="1">Contact Us</button>
```

**Validation**:
- ✅ Missing price defaults to "0.00"
- ✅ No errors thrown
- ✅ Button still annotated

---

#### TC-EC-002: Empty Strings
**Objective**: Verify empty values handled

**HTML**:
```html
<div class="pricing-card">
  <h3 class="plan-name"></h3>
  <div class="price"></div>
  <button>Buy</button>
</div>
```

**Expected Result**:
```html
<button
  data-product="unknown_product"
  data-price="0.00"
  data-currency="USD"
  data-quantity="1">Buy</button>
```

**Validation**:
- ✅ Empty product name → "unknown_product"
- ✅ Empty price → "0.00"
- ✅ No crashes

---

#### TC-EC-003: Special Characters in Names
**Objective**: Verify special characters sanitized

**HTML**:
```html
<h3 class="plan-name">Premium+ Pro (v2.0)</h3>
```

**Expected Result**:
```
data-product="premium_pro_v20"
```

**Validation**:
- ✅ Special chars removed
- ✅ Spaces → underscores
- ✅ Lowercase

---

#### TC-EC-004: Very Long Product Names
**Objective**: Verify long names don't break

**HTML**:
```html
<h3 class="plan-name">Enterprise Advanced Professional Business Ultimate Premium Plus Package</h3>
```

**Expected Result**:
```
data-product="enterprise_advanced_professional_business_ultimate_premium_plus_package"
```

**Validation**:
- ✅ Full name preserved
- ✅ No truncation
- ✅ Proper normalization

---

#### TC-EC-005: No Buttons Found
**Objective**: Verify graceful handling when no buttons match

**Setup**:
```javascript
productConfig: {
    productButtonSelectors: 'button.does-not-exist'
}
```

**Expected Result**:
- Console log: `[ph-injector] Found 0 buttons matching selector`
- No errors thrown
- Script continues normally

**Validation**:
- ✅ No crashes
- ✅ Informative logging
- ✅ Graceful degradation

---

## Steps Workflow Tests

### Test Suite 8: Basic Step Tracking

#### TC-ST-001: autoFire on Page Load
**Objective**: Verify event fires immediately when page loads

**Setup**:
```javascript
steps: [{
    "key": "DASHBOARD_VIEWED",
    "url": "/dashboard",
    "urlMatch": "contains",
    "autoFire": true,
    "oncePerPath": true
}]
```

**Test Steps**:
1. Navigate to /dashboard
2. Wait for page load

**Expected Result**:
- PostHog event: `DASHBOARD_VIEWED`
- Properties: `{path: '/dashboard', auto: true}`
- Fires immediately (no selector needed)

**Validation**:
- ✅ Event captured
- ✅ No delays
- ✅ Fires once (oncePerPath)

---

#### TC-ST-002: requireSelectorPresent
**Objective**: Verify event fires when selector appears

**Setup**:
```javascript
steps: [{
    "key": "FORM_LOADED",
    "url": "/contact",
    "urlMatch": "contains",
    "selector": "#contact-form",
    "requireSelectorPresent": true
}]
```

**Test Steps**:
1. Navigate to /contact
2. Wait for `#contact-form` to render

**Expected Result**:
- PostHog event: `FORM_LOADED`
- Hidden input created: `<input type="hidden" data-ph="FORM_LOADED">`

**Validation**:
- ✅ Event fires when selector found
- ✅ Hidden input created
- ✅ Doesn't fire if selector missing

---

#### TC-ST-003: Click Event Binding
**Objective**: Verify events fire on element clicks

**Setup**:
```javascript
steps: [{
    "key": "BUTTON_CLICKED",
    "url": "/",
    "selector": "#submit-btn"
}]
```

**Test Steps**:
1. Navigate to page
2. Click `#submit-btn`

**Expected Result**:
- PostHog event: `BUTTON_CLICKED`
- Element gets `data-ph="BUTTON_CLICKED"` attribute

**Validation**:
- ✅ Click listener bound
- ✅ Event fires on click
- ✅ Element tagged

---

### Test Suite 9: URL Matching

#### TC-UM-001: Contains Match
**Objective**: Verify "contains" URL matching

**Setup**:
```javascript
steps: [{
    "key": "PRICING_VIEWED",
    "url": "/pricing",
    "urlMatch": "contains",
    "autoFire": true
}]
```

**Test Cases**:
| URL | Should Fire? |
|-----|-------------|
| /pricing | ✅ Yes |
| /pricing/monthly | ✅ Yes |
| /en/pricing | ✅ Yes |
| /products | ❌ No |

**Validation**:
- ✅ Substring matching works
- ✅ Case-insensitive

---

#### TC-UM-002: Exact Match
**Objective**: Verify "exact" URL matching

**Setup**:
```javascript
steps: [{
    "key": "CHECKOUT_VIEWED",
    "url": "/checkout/cart",
    "urlMatch": "exact",
    "autoFire": true
}]
```

**Test Cases**:
| URL | Should Fire? |
|-----|-------------|
| /checkout/cart | ✅ Yes |
| /checkout/cart?item=1 | ❌ No (query string) |
| /checkout/cart/ | ❌ No (trailing slash) |
| /en/checkout/cart | ❌ No |

**Validation**:
- ✅ Exact matching works
- ✅ Query strings don't match
- ✅ Trailing slashes matter

---

#### TC-UM-003: Regex Match
**Objective**: Verify regex URL matching

**Setup**:
```javascript
steps: [{
    "key": "PLAN_PAGE_VIEWED",
    "url": "/(pricing|plans|subscribe)",
    "urlMatch": "regex",
    "autoFire": true
}]
```

**Test Cases**:
| URL | Should Fire? |
|-----|-------------|
| /pricing | ✅ Yes |
| /plans | ✅ Yes |
| /subscribe | ✅ Yes |
| /products | ❌ No |

**Validation**:
- ✅ Regex patterns work
- ✅ Alternation supported
- ✅ Complex patterns work

---

### Test Suite 10: oncePerPath Deduplication

#### TC-OP-001: Single Event Per Path
**Objective**: Verify event fires only once per unique path

**Setup**:
```javascript
steps: [{
    "key": "PAGE_VIEWED",
    "url": "/dashboard",
    "urlMatch": "contains",
    "autoFire": true,
    "oncePerPath": true
}]
```

**Test Steps**:
1. Navigate to /dashboard → Event fires
2. Reload page → Event should NOT fire again
3. Navigate to /dashboard/settings → Event fires (different path)
4. Navigate back to /dashboard → Event should NOT fire

**Expected Result**:
- /dashboard: Fires once
- /dashboard/settings: Fires once
- Total events: 2

**Validation**:
- ✅ Fires once per unique path
- ✅ `window.__phFiredOnce` Set tracks paths
- ✅ Reloads don't trigger

---

#### TC-OP-002: Multiple Events Per Path
**Objective**: Verify oncePerPath: false allows repeats

**Setup**:
```javascript
steps: [{
    "key": "BUTTON_CLICKED",
    "selector": "#retry-btn",
    "oncePerPath": false
}]
```

**Test Steps**:
1. Click button → Event fires
2. Click button again → Event fires again
3. Click button third time → Event fires again

**Expected Result**:
- Total events: 3

**Validation**:
- ✅ Fires multiple times
- ✅ No deduplication
- ✅ Useful for retry buttons

---

### Test Suite 11: Priority & Blocking

#### TC-PB-001: Priority Ordering
**Objective**: Verify rules evaluated in priority order

**Setup**:
```javascript
steps: [
    {
        "key": "ERROR_CHECK",
        "selector": ".error",
        "priority": 1,
        "requireSelectorPresent": true
    },
    {
        "key": "SUCCESS_CHECK",
        "selector": ".success",
        "priority": 10,
        "requireSelectorPresent": true
    }
]
```

**HTML**:
```html
<div class="error">Error message</div>
<div class="success">Success message</div>
```

**Expected Result**:
- `ERROR_CHECK` evaluated first (priority: 1)
- `SUCCESS_CHECK` evaluated second (priority: 10)

**Validation**:
- ✅ Lower number = higher priority
- ✅ Evaluation order correct
- ✅ Both fire if present

---

#### TC-PB-002: Rule Blocking - Error Blocks Success
**Objective**: Verify error states block success events

**Setup**:
```javascript
steps: [
    {
        "key": "FORM_ERROR",
        "url": "/submit",
        "selector": ".alert-danger",
        "priority": 1,
        "blockRules": ["FORM_SUCCESS"],
        "requireSelectorPresent": true
    },
    {
        "key": "FORM_SUCCESS",
        "url": "/submit",
        "selector": ".alert-success",
        "priority": 10,
        "requireSelectorPresent": true
    }
]
```

**Test Scenario 1: Error Present**

**HTML**:
```html
<div class="alert-danger">Error</div>
<div class="alert-success">Success</div>
```

**Expected Result**:
- ✅ `FORM_ERROR` fires
- ❌ `FORM_SUCCESS` blocked (doesn't fire)

**Test Scenario 2: No Error**

**HTML**:
```html
<div class="alert-success">Success</div>
```

**Expected Result**:
- ❌ `FORM_ERROR` doesn't fire (selector not found)
- ✅ `FORM_SUCCESS` fires (not blocked)

**Validation**:
- ✅ Blocking mechanism works
- ✅ `blockedRules` Set populated
- ✅ Blocked rules don't fire or tag

---

#### TC-PB-003: Cascading Blocks
**Objective**: Verify one rule can block multiple others

**Setup**:
```javascript
steps: [
    {
        "key": "CRITICAL_ERROR",
        "selector": ".critical-error",
        "priority": 1,
        "blockRules": ["WARNING", "SUCCESS"]
    },
    {
        "key": "WARNING",
        "selector": ".warning",
        "priority": 5,
        "blockRules": ["SUCCESS"]
    },
    {
        "key": "SUCCESS",
        "selector": ".success",
        "priority": 10
    }
]
```

**Test Cases**:

| Present Elements | Expected Events |
|-----------------|----------------|
| .critical-error, .warning, .success | CRITICAL_ERROR only |
| .warning, .success | WARNING only |
| .success | SUCCESS |
| (none) | (none) |

**Validation**:
- ✅ Multiple blocking works
- ✅ Cascading priorities work
- ✅ Most severe error wins

---

### Test Suite 12: Selector Validation

#### TC-SV-001: Multiple Selectors (CSV)
**Objective**: Verify comma-separated selectors work

**Setup**:
```javascript
steps: [{
    "key": "ERROR_FOUND",
    "selector": ".alert-danger, .error-message, .validation-error",
    "requireSelectorPresent": true
}]
```

**HTML Options**:
```html
<!-- Option 1 -->
<div class="alert-danger">Error</div>

<!-- Option 2 -->
<div class="error-message">Error</div>

<!-- Option 3 -->
<div class="validation-error">Error</div>
```

**Expected Result**:
- Event fires if ANY selector found
- Works with any of the 3 options

**Validation**:
- ✅ CSV parsing works
- ✅ "OR" logic applied
- ✅ First match wins

---

#### TC-SV-002: JSON Array Selectors
**Objective**: Verify JSON array selectors work

**Setup**:
```javascript
steps: [{
    "key": "FORM_FOUND",
    "selector": '["#form1", "#form2", "#form3"]',
    "requireSelectorPresent": true
}]
```

**Expected Result**:
- JSON array parsed correctly
- Same behavior as CSV

**Validation**:
- ✅ JSON parsing works
- ✅ Array flattened
- ✅ Multiple selectors checked

---

#### TC-SV-003: Invalid Selectors
**Objective**: Verify invalid selectors handled gracefully

**Setup**:
```javascript
steps: [{
    "key": "TEST",
    "selector": "#[invalid syntax]",
    "requireSelectorPresent": true
}]
```

**Expected Result**:
- Console warning logged
- No event fires
- No crashes
- Script continues

**Validation**:
- ✅ Try/catch blocks work
- ✅ Error logged
- ✅ Graceful degradation

---

### Test Suite 13: Text Regex Matching

#### TC-TR-001: Case-Insensitive Text Match
**Objective**: Verify textRegex works with case-insensitive flag

**Setup**:
```javascript
steps: [{
    "key": "SUBMIT_BUTTON_FOUND",
    "selector": "button",
    "textRegex": "(?i)submit|continue|next"
}]
```

**HTML Options**:
```html
<button>Submit</button>
<button>SUBMIT</button>
<button>Continue</button>
<button>Next Step</button>
```

**Expected Result**:
- All 4 buttons matched and tagged

**Validation**:
- ✅ Case-insensitive flag works
- ✅ Alternation works
- ✅ All variants matched

---

#### TC-TR-002: Complex Regex Patterns
**Objective**: Verify complex regex patterns work

**Setup**:
```javascript
steps: [{
    "key": "PRICE_BUTTON",
    "selector": "button",
    "textRegex": "\\$\\d+\\.\\d{2}"
}]
```

**HTML**:
```html
<button>Buy for $49.99</button>
<button>Subscribe $29.99/mo</button>
<button>Free Trial</button>
```

**Expected Result**:
- First 2 buttons matched (contain price pattern)
- Third button NOT matched

**Validation**:
- ✅ Complex patterns work
- ✅ Escaping works
- ✅ Selective matching

---

## Integration Tests

### Test Suite 14: Product + Steps Integration

#### TC-PS-001: Product Click + Step Event
**Objective**: Verify product metadata included in step events

**Setup**:
```javascript
productConfig: {
    panelClass: 'pricing-card',
    titleClass: 'plan-name',
    priceClass: 'price',
    productButtonSelectors: 'button.subscribe-btn'
},
steps: [{
    "key": "SUBSCRIPTION_SELECTED",
    "selector": "button.subscribe-btn"
}]
```

**Test Steps**:
1. Load pricing page
2. Verify buttons annotated with product data
3. Click button

**Expected PostHog Event**:
```javascript
{
    event: 'SUBSCRIPTION_SELECTED',
    properties: {
        product: 'premium_plan',
        price: '49.99',
        currency: 'USD',
        quantity: '1',
        path: '/pricing'
    }
}
```

**Validation**:
- ✅ Product data in event properties
- ✅ Step event fires
- ✅ Data merged correctly

---

#### TC-PS-002: Dynamic Price + Step Event
**Objective**: Verify price changes reflected in events

**Test Steps**:
1. Load page (monthly: $49.99)
2. Click button → Event has price: "49.99"
3. Toggle to yearly ($499.99)
4. Click button → Event has price: "499.99"

**Validation**:
- ✅ Dynamic updates work
- ✅ Latest price captured
- ✅ Event properties accurate

---

## E-commerce Platform Tests

### Test Suite 15: Shopify

#### TC-SHOP-001: Standard Product Card
**Config**:
```javascript
productConfig: {
    panelClass: 'product-card',
    titleClass: 'product-card__title',
    priceClass: 'price',
    currencyClass: 'currency',
    quantitySelector: 'input[name="quantity"]',
    productButtonSelectors: 'button[name="add"], .product-form__submit'
}
```

**Validation**:
- ✅ Product card detected
- ✅ Price parsed from Shopify format
- ✅ Quantity input read
- ✅ Add to cart button tracked

---

### Test Suite 16: WooCommerce

#### TC-WOO-001: Loop Product
**Config**:
```javascript
productConfig: {
    panelClass: 'woocommerce-LoopProduct-link',
    titleClass: 'woocommerce-loop-product__title',
    priceClass: 'woocommerce-Price-amount',
    productButtonSelectors: '.add_to_cart_button'
}
```

**Validation**:
- ✅ Loop product detected
- ✅ Price with currency symbol parsed
- ✅ Add to cart button tracked

---

### Test Suite 17: Stripe Checkout

#### TC-STRIPE-001: Pricing Table
**Config**:
```javascript
productConfig: {
    panelSelector: 'stripe-pricing-table [data-product-id]',
    titleAttr: 'data-product-name',
    priceAttr: 'data-amount',
    currencyAttr: 'data-currency',
    productButtonSelectors: 'stripe-pricing-table button'
}
```

**Validation**:
- ✅ Stripe web component detected
- ✅ Shadow DOM traversed
- ✅ Data attributes read

---

## Test Execution Guide

### Manual Testing Checklist

**Before Testing**:
- [ ] Clear browser cache
- [ ] Clear PostHog cookies
- [ ] Open DevTools console (F12)
- [ ] Enable "Preserve log" in console

**During Testing**:
- [ ] Check console for `[ph-injector]` logs
- [ ] Inspect button attributes with DevTools
- [ ] Verify PostHog events in dashboard
- [ ] Test on multiple browsers

**After Testing**:
- [ ] Document any failures
- [ ] Screenshot unexpected behavior
- [ ] Export PostHog event data

---

### Automated Test Template

```javascript
describe('Product Configuration', () => {
    test('TC-PC-001: CSS Class Selector', () => {
        // Setup
        const config = {
            panelClass: 'pricing-card',
            titleClass: 'plan-name',
            priceClass: 'price-amount',
            productButtonSelectors: 'button.cta'
        };
        
        // Create HTML
        document.body.innerHTML = `
            <div class="pricing-card">
                <h3 class="plan-name">Premium Plan</h3>
                <div class="price-amount">$49.99</div>
                <button class="cta">Buy Now</button>
            </div>
        `;
        
        // Initialize analytics
        initProductTracking(config);
        
        // Assert
        const button = document.querySelector('button.cta');
        expect(button.getAttribute('data-product')).toBe('premium_plan');
        expect(button.getAttribute('data-price')).toBe('49.99');
        expect(button.getAttribute('data-currency')).toBe('USD');
        expect(button.getAttribute('data-quantity')).toBe('1');
    });
});
```

---

## Summary

### Test Coverage

| Category | Test Cases | Priority |
|----------|-----------|----------|
| Selector Strategies | 6 | High |
| Price Parsing | 4 | High |
| Button Selectors | 4 | Critical |
| Multiple Products | 2 | High |
| Quantity Tracking | 2 | Medium |
| Dynamic Content | 3 | High |
| Edge Cases | 5 | Medium |
| Step Tracking | 3 | High |
| URL Matching | 3 | High |
| oncePerPath | 2 | High |
| Priority & Blocking | 3 | Critical |
| Selector Validation | 3 | Medium |
| Text Regex | 2 | Low |
| Integration | 2 | High |
| E-commerce Platforms | 3 | High |

**Total Test Cases**: 47

### Known Limitations

1. **Shadow DOM**: Limited support for web components
2. **iFrames**: Cannot track buttons inside iframes
3. **Canvas/SVG**: Cannot track dynamically drawn buttons
4. **AJAX Forms**: May require additional configuration

---

**Last Updated**: November 14, 2025  
**Version**: 1.0  
**Test Status**: ✅ All test cases documented
