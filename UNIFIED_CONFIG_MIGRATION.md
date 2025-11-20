# Unified Configuration: cartExtractorConfig for All Clients

## Overview

**Good news:** You can use `cartExtractorConfig` for **both** static pricing and e-commerce cart scenarios!

The key insight: A single-item selection is just a **cart with one item**. This allows us to:
1. **Eliminate `productConfig`** duplication
2. **Use one extraction strategy** for all clients
3. **Simplify configuration** significantly

---

## Migration Path

### ❌ OLD: Separate Configs (Deprecated)

```json
{
  "productConfig": {
    "eventName": "subscription_click",
    "pageMatch": "/pricing",
    "panelClass": "ph-track-product-item",
    "titleClass": "text-2xl",
    "priceClass": "text-4xl font-bold",
    "productButtonSelectors": ".ph-track-product-select"
  }
}
```

### ✅ NEW: Unified cartExtractorConfig

```json
{
  "cartExtractorConfig": {
    "cartContainerSelector": ".pricing-page",
    "cartItemSelector": ".ph-track-product-item",
    "cartItemNameSelector": ".text-2xl",
    "cartItemPriceSelector": ".text-4xl",
    "cartItemQuantitySelector": "[data-quantity]",
    "currencySelector": ".currency",
    "singleItemMode": true
  }
}
```

---

## Configuration Patterns

### 1. Static Pricing (Subscription Plans)

**Scenario:** User selects one plan at a time (Premium, Enterprise, etc.)

```json
{
  "cartExtractorConfig": {
    // ===== CONTAINER (Pricing Page) =====
    "cartContainerSelector": ".pricing-page, main, [class*='pricing']",
    
    // ===== "CART ITEMS" (Actually Pricing Cards) =====
    "cartItemSelector": ".pricing-card, .plan-card, [class*='plan-item']",
    "cartItemNameSelector": ".plan-name, h3, [class*='title']",
    "cartItemPriceSelector": ".price, [class*='price']",
    "cartItemQuantitySelector": "[data-quantity]",
    
    // ===== CURRENCY (OPTIONAL) =====
    "currencySelector": ".currency",
    
    // ===== TOTALS (Usually not needed for static pricing) =====
    "totalSelector": ".total",
    
    // ===== MODE =====
    "singleItemMode": true
  },
  
  "steps": [
    {
      "key": "PRODUCT_SELECTED",
      "selector": ".ph-track-product-select, button.select-plan",
      "extractCart": true
    },
    {
      "key": "CHECKOUT_COMPLETED",
      "selector": ".confirmation, .ph-track-checkout-complete",
      "autoFire": true,
      "requireSelectorPresent": true
    }
  ]
}
```

**What Happens:**
1. User clicks "Select Plan" button
2. System treats pricing card as "cart with 1 item"
3. Extracts: name, price, quantity (defaults to 1)
4. Caches in sessionStorage: `ph_cart_data`
5. CHECKOUT_COMPLETED retrieves cached data

**Example Event:**
```javascript
PRODUCT_SELECTED: {
  revenue: "29.99",
  currency: "USD",
  item_count: 1,
  total_quantity: 1,
  product: "premium_plan",
  product_names: "Premium Plan",
  quantities: "1",
  cart_items: [
    {
      product: "premium_plan",
      name: "Premium Plan",
      quantity: 1,
      unit_price: "29.99",
      item_total: "29.99",
      currency: "USD"
    }
  ]
}
```

---

### 2. E-Commerce Cart (Multiple Items)

**Scenario:** User adds multiple products to cart (Olive Garden style)

```json
{
  "cartExtractorConfig": {
    // ===== CONTAINER (Cart Summary) =====
    "cartContainerSelector": ".cart-summary, [class*='cart']",
    
    // ===== CART ITEMS =====
    "cartItemSelector": ".cart-item",
    "cartItemNameSelector": ".item-name",
    "cartItemPriceSelector": ".item-price",
    "cartItemQuantitySelector": ".item-quantity",
    "cartItemTotalSelector": ".item-total",
    
    // ===== SUB-SELECTIONS (OPTIONAL) =====
    "cartItemSubSelectionsSelector": ".sub-selection, .choice",
    
    // ===== ADD-ONS (OPTIONAL) =====
    "cartItemAddOnsSelector": ".addon",
    "cartItemAddOnNameSelector": ".addon-name",
    "cartItemAddOnPriceSelector": ".addon-price",
    
    // ===== TOTALS =====
    "subtotalSelector": ".subtotal",
    "taxSelector": ".tax",
    "gratuitySelector": ".gratuity",
    "totalSelector": ".total",
    
    // ===== MODE =====
    "singleItemMode": false
  },
  
  "steps": [
    {
      "key": "PRODUCT_SELECTED",
      "description": "Auto-tracked when ADD button clicked"
    },
    {
      "key": "PRODUCT_REMOVED",
      "description": "Auto-tracked when REMOVE button clicked"
    },
    {
      "key": "CHECKOUT_SUBMITTED",
      "selector": "button.checkout-btn",
      "extractCart": true
    },
    {
      "key": "CHECKOUT_COMPLETED",
      "selector": ".order-confirmation",
      "autoFire": true,
      "requireSelectorPresent": true
    }
  ]
}
```

**What Happens:**
1. User adds items → PRODUCT_SELECTED fires per item
2. User clicks "CHECKOUT" → Full cart extracted
3. Caches cart with all items, quantities, add-ons
4. CHECKOUT_COMPLETED retrieves cached cart

**Example Event:**
```javascript
CHECKOUT_COMPLETED: {
  revenue: "278.51",
  currency: "USD",
  item_count: 4,
  total_quantity: 10,
  product_names: "Pizza, Salad, Pasta, Steak",
  quantities: "2,1,3,4",
  subtotal: "226.34",
  tax: "15.84",
  gratuity: "36.33",
  cart_items: [
    {
      name: "Pizza",
      quantity: 2,
      unit_price: "15.99",
      item_total: "35.97",
      currency: "USD",
      sub_selections: ["Salad"],
      add_ons: [{ name: "Sweet Tea", price: 3.99 }]
    },
    // ... more items
  ]
}
```

---

## Key Differences

| Feature | Static Pricing | E-Commerce Cart |
|---------|---------------|-----------------|
| **Container** | Pricing page | Cart sidebar/page |
| **Items** | Pricing cards | Cart items |
| **Item Count** | Always 1 | Multiple |
| **Quantity** | Usually 1 | Variable |
| **Sub-selections** | ❌ Not needed | ✅ Optional (soup/salad) |
| **Add-ons** | ❌ Not needed | ✅ Optional (beverages) |
| **Totals** | Price = Total | Subtotal + Tax + Tips |
| **singleItemMode** | `true` | `false` |

---

## Backward Compatibility

### Option 1: Keep productConfig (Deprecated)
If you already have `productConfig`, it will continue working:
```json
{
  "productConfig": { ... },  // Still works
  "cartExtractorConfig": { ... }  // Also available
}
```

### Option 2: Migrate to Unified Config (Recommended)
Replace `productConfig` with `cartExtractorConfig`:

**Before:**
```json
{
  "productConfig": {
    "panelClass": "pricing-card",
    "titleClass": "plan-name",
    "priceClass": "plan-price"
  }
}
```

**After:**
```json
{
  "cartExtractorConfig": {
    "cartContainerSelector": ".pricing-page",
    "cartItemSelector": ".pricing-card",
    "cartItemNameSelector": ".plan-name",
    "cartItemPriceSelector": ".plan-price",
    "singleItemMode": true
  }
}
```

---

## Configuration Properties

### Required (All Clients)
- `cartContainerSelector` - Where to find items (pricing page or cart)
- `cartItemSelector` - Individual item containers
- `cartItemNameSelector` - Product/plan name
- `cartItemPriceSelector` - Price per item

### Optional (All Clients)
- `cartItemQuantitySelector` - Quantity (defaults to 1)
- `currencySelector` - Currency code (auto-detected from price)
- `totalSelector` - Total amount (calculated if missing)

### Optional (E-Commerce Only)
- `cartItemSubSelectionsSelector` - Included choices (soup/salad)
- `cartItemAddOnsSelector` - Paid extras (beverages)
- `cartItemAddOnNameSelector` - Add-on name
- `cartItemAddOnPriceSelector` - Add-on price
- `subtotalSelector` - Subtotal before tax
- `taxSelector` - Tax amount
- `gratuitySelector` - Tip/gratuity
- `discountSelector` - Discount amount
- `shippingSelector` - Shipping/delivery fee

### Modal Tracking (E-Commerce Only)
- `modalProductNameSelector` - Product name in add dialog
- `modalProductPriceSelector` - Price in add dialog
- `modalQuantitySelector` - Quantity input
- `modalSubSelectionsSelector` - Radio buttons/dropdowns
- `modalAddOnsSelector` - Checkboxes for add-ons

---

## Benefits of Unified Config

### 1. **Consistency**
Same extraction logic for all clients:
```javascript
// Works for both scenarios
const cartData = PHCartExtractor.extractCartData(config.cartExtractorConfig);
```

### 2. **Easier Upgrades**
Static pricing client can add multi-select later:
```json
{
  "cartExtractorConfig": {
    // Add multi-select without changing structure
    "singleItemMode": false
  }
}
```

### 3. **Simpler Codebase**
One extractor module instead of two:
- ✅ `ph-cart-extractor.js` - handles everything
- ❌ ~~`ph-product-extractors.js`~~ - still used for legacy

### 4. **Better Testing**
Test once, works everywhere:
```javascript
// Same test suite for all extraction
test('extractCartData works for 1 item', () => { ... });
test('extractCartData works for N items', () => { ... });
```

---

## Migration Checklist

### For Static Pricing Clients

- [ ] Copy `productConfig` selectors to `cartExtractorConfig`
- [ ] Rename properties:
  - `panelClass` → `cartItemSelector`
  - `titleClass` → `cartItemNameSelector`
  - `priceClass` → `cartItemPriceSelector`
- [ ] Add `"singleItemMode": true`
- [ ] Add `extractCart: true` to PRODUCT_SELECTED step
- [ ] Test: Click pricing card → verify event fires
- [ ] Test: CHECKOUT_COMPLETED → verify revenue populated
- [ ] Remove old `productConfig` (optional)

### For E-Commerce Clients

- [ ] Configure cart selectors (`cartContainerSelector`, etc.)
- [ ] Add sub-selections selectors (if needed)
- [ ] Add add-ons selectors (if needed)
- [ ] Configure modal selectors (for ADD tracking)
- [ ] Add `extractCart: true` to CHECKOUT_SUBMITTED step
- [ ] Test: Add to cart → verify PRODUCT_SELECTED
- [ ] Test: Remove → verify PRODUCT_REMOVED
- [ ] Test: Checkout → verify cart cached
- [ ] Test: Confirmation → verify revenue from cache

---

## Real-World Example: AskMe Analytics

**Current (askme-analytics-app.json):**
```json
{
  "productConfig": {
    "eventName": "subscription_click",
    "pageMatch": "/pricing",
    "panelClass": "ph-track-product-item",
    "titleClass": "text-2xl",
    "priceClass": "text-4xl font-bold",
    "productButtonSelectors": ".ph-track-product-select"
  }
}
```

**Migrated (Unified):**
```json
{
  "cartExtractorConfig": {
    "cartContainerSelector": ".pricing-page",
    "cartItemSelector": ".ph-track-product-item",
    "cartItemNameSelector": ".text-2xl",
    "cartItemPriceSelector": ".text-4xl",
    "singleItemMode": true
  },
  
  "steps": [
    {
      "key": "PRODUCT_SELECTED",
      "selector": ".ph-track-product-select",
      "extractCart": true
    },
    {
      "key": "CHECKOUT_COMPLETED",
      "selector": ".ph-track-checkout-complete",
      "autoFire": true,
      "requireSelectorPresent": true
    }
  ]
}
```

---

## Recommendation

### ✅ DO: Use cartExtractorConfig for new clients
### ✅ DO: Migrate existing static pricing clients gradually
### ✅ DO: Keep productConfig for backward compatibility
### ⚠️ CONSIDER: Deprecating productConfig in v3.0

**Bottom Line:** `cartExtractorConfig` is more flexible and can handle both scenarios elegantly. The "cart with 1 item" mental model makes sense for static pricing too!
