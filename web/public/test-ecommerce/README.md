# Test E-Commerce Pages

Complete e-commerce test environment for validating cart extraction and analytics event tracking.

## Pages

### 1. **index.html** - Restaurant E-Commerce (Olive Garden Style)
- Displays 6 menu items with pricing
- Cart sidebar with add/remove/quantity controls
- localStorage-based cart persistence
- **Events Tracked:** `PRICING_PAGE_VIEWED`, `PRODUCT_SELECTED`, `PRODUCT_REMOVED`
- **Config:** `test-ecommerce.json`

### 2. **apparel.html** - Apparel Store (CardVault Style)
- Product catalog with color and size attributes
- Attribute selection before adding to cart
- Cart displays selected attributes (Color: Gray, Size: L)
- Tests product variant tracking
- **Events Tracked:** `PRICING_PAGE_VIEWED`, `PRODUCT_SELECTED`, `PRODUCT_REMOVED`
- **Config:** `test-apparel.json`

### 3. **product-detail.html** - Product with Customization
- Tour of Italy with sub-selections and add-ons
- Choose soup/salad (sub-selection)
- Add extras: breadsticks, desserts, drinks (add-ons)
- Dynamic price calculation
- **Events Tracked:** `PRODUCT_SELECTED` (when adding configured item)

### 3. **checkout.html** - Order Review & Payment
- Cart summary with all items, sub-selections, add-ons
- Customer information form
- Payment method selection
- Subtotal, tax (8%), delivery fee ($3.99), total
- **Events Tracked:** `CHECKOUT_STARTED` (on page load, caches cart to sessionStorage)

### 4. **confirmation.html** - Order Complete
- Order summary with generated order number
- Final totals and item list
- Print receipt option
- **Events Tracked:** `CHECKOUT_COMPLETED` (retrieves cached cart for revenue tracking)

## Configuration

**File:** `test-ecommerce.json`

Defines:
- Cart extraction selectors
- Sub-selections and add-ons selectors
- Step rules for each event
- Cart caching behavior

## Testing Flow

### Basic Flow (Simple Cart)

1. **Open:** `http://localhost:3000/test-ecommerce/index.html`
2. **Action:** Click "Add to Cart" on any product
3. **Expected:** `PRODUCT_SELECTED` event fires with product data
4. **Action:** Click "Remove" on cart item
5. **Expected:** `PRODUCT_REMOVED` event fires
6. **Action:** Click "Proceed to Checkout"
7. **Navigate to:** `checkout.html`
8. **Expected:** `CHECKOUT_STARTED` event fires, cart cached to `sessionStorage.ph_cart_data`
9. **Action:** Fill form and click "Place Order"
10. **Navigate to:** `confirmation.html`
11. **Expected:** `CHECKOUT_COMPLETED` event fires with revenue from cached cart

### Advanced Flow (With Add-Ons)

1. **Open:** `http://localhost:3000/test-ecommerce/product-detail.html`
2. **Action:** Select different side (e.g., Caesar Salad +$2.99)
3. **Expected:** Price updates to $27.98
4. **Action:** Check add-ons (e.g., Breadsticks +$4.99, Tiramisu +$7.99)
5. **Expected:** Price updates to $40.96
6. **Action:** Increase quantity to 2
7. **Expected:** Total shows $81.92
8. **Action:** Click "Add to Cart"
9. **Expected:** `PRODUCT_SELECTED` event fires with:
   - `product_name`: "Tour of Italy"
   - `price`: 40.96 (unit price with add-ons)
   - `quantity`: 2
   - `sub_selections`: Array with Caesar Salad
   - `add_ons`: Array with Breadsticks, Tiramisu
10. **Action:** Navigate to checkout and complete order
11. **Expected:** Revenue captured includes all customizations

## Verification Checklist

### Console Logs
Open DevTools (F12) → Console tab to see:
- ✅ `[PostHog] PRICING_PAGE_VIEWED event fired`
- ✅ `[PostHog] PRODUCT_SELECTED event fired` (with product details)
- ✅ `[PostHog] CHECKOUT_STARTED event fired` (with cart array)
- ✅ `[Cart] Cached to sessionStorage: ph_cart_data`
- ✅ `[PostHog] CHECKOUT_COMPLETED event fired` (with revenue)

### SessionStorage
Check: DevTools → Application → Storage → Session Storage
- ✅ `ph_cart_data` exists after reaching checkout
- ✅ Contains JSON array with all cart items
- ✅ Includes sub_selections and add_ons if configured

### PostHog Events
Check: PostHog dashboard → Events
- ✅ `pricing_page_viewed` - properties: `page_path`, `page_title`
- ✅ `product_selected` - properties: `product_name`, `price`, `currency`, `quantity`, `cart_items` (array)
- ✅ `checkout_started` - properties: `cart_items`, `cart_total`, `cart_count`
- ✅ `checkout_completed` - properties: `revenue`, `currency`, `cart_items`, `transaction_id`

## Cart Extraction - Universal Support

The cart extraction system supports **all e-commerce types** through configuration:

### Supported Product Types:

1. **Simple Products** (test restaurants)
   - Basic name, price, quantity
   
2. **Products with Attributes** (apparel, furniture, etc.)
   - Color, Size, Material, Style
   - Example: Gray Hoodie Size L
   
3. **Products with Sub-Selections** (restaurants)
   - Choice-based options (Soup OR Salad)
   
4. **Products with Add-Ons** (restaurants, services)
   - Optional extras (Breadsticks, Desserts)

### Configuration Examples:

**Apparel Store (with attributes):**
```json
"cartExtractorConfig": {
  "cartItemSelector": ".cart-item",
  "cartItemNameSelector": ".item-name",
  "cartItemAttributesSelector": ".item-attribute"
}
```

**Restaurant (with sub-selections & add-ons):**
```json
"cartExtractorConfig": {
  "cartItemSelector": ".cart-item",
  "subSelectionsSelector": ".sub-selections .sub-selection",
  "addOnsSelector": ".add-ons .add-on"
}
```

## Cart Extraction Points

### Simple Product (index.html)
```html
<div class="product-card" 
     data-product-id="lasagna-classico"
     data-product-name="Lasagna Classico"
     data-price="17.99"
     data-currency="USD">
```

### Cart Item (index.html)
```html
<div class="cart-item" data-cart-item="lasagna-classico">
  <div class="item-name">Lasagna Classico</div>
  <div class="item-price" data-price="17.99">$17.99</div>
  <span class="item-quantity" data-quantity="2">2</span>
</div>
```

### Apparel Product with Attributes (apparel.html)
```javascript
{
  id: 'hoodie-001-gray-l',
  name: 'Classic Pullover Hoodie',
  price: 74.95,
  currency: 'USD',
  quantity: 1,
  attributes: {
    color: 'Gray',
    size: 'L'
  }
}
```

### Complex Product with Sub-Selections & Add-Ons (product-detail.html)
```javascript
{
  id: 'tour-of-italy-1234567890',
  name: 'Tour of Italy',
  price: 40.96,  // base + sub-selections + add-ons
  currency: 'USD',
  quantity: 2,
  sub_selections: [
    { name: 'Caesar Salad', price: 2.99 }
  ],
  add_ons: [
    { name: 'Breadsticks', price: 4.99 },
    { name: 'Tiramisu', price: 7.99 }
  ]
}
```

### PostHog Event Properties:
```javascript
{
  event: 'PRODUCT_SELECTED',
  properties: {
    product_names: 'hoodie-001',
    product: 'classic_pullover_hoodie',
    prices: '74.95',
    quantities: '1',
    cart_items: [{
      product: 'hoodie-001',
      name: 'Classic Pullover Hoodie',
      quantity: 1,
      unit_price: '74.95',
      item_total: '74.95',
      currency: 'USD',
      attributes: {
        color: 'Gray',
        size: 'L'
      }
    }]
  }
}
```

## Revenue Calculation

### Priority Fallback System

**1. Cached Cart (Highest Priority)**
- Source: `sessionStorage.ph_cart_data`
- When: After `CHECKOUT_STARTED` fires
- Calculation: Sum of `price × quantity` for all items

**2. Static Product Data**
- Source: `sessionStorage.ph_last_product`, `ph_last_price`, `ph_last_quantity`
- When: Single product checkout without cart
- Calculation: `price × quantity`

**3. DOM Extraction**
- Source: Live cart DOM elements
- When: Fallback if no cached data
- Calculation: Extract from visible cart elements

## Common Issues

### Events Not Firing

**Problem:** `PRICING_PAGE_VIEWED` doesn't fire
- **Check:** Is `.ph-track-pricing-view` element present in DOM?
- **Check:** Does URL path match `/test-ecommerce/index.html`?
- **Check:** Is `test-ecommerce.json` loaded correctly?

**Problem:** `PRODUCT_SELECTED` doesn't capture product data
- **Check:** Do product elements have `data-product-id`, `data-product-name`, `data-price`?
- **Check:** Is `cartExtractorConfig` defined in JSON?
- **Check:** Console logs show extraction errors?

**Problem:** `CHECKOUT_COMPLETED` has no revenue
- **Check:** Did `CHECKOUT_STARTED` fire first (to cache cart)?
- **Check:** Is `sessionStorage.ph_cart_data` present?
- **Check:** Does config have `"captureRevenue": true`?

### Cart Not Caching

**Problem:** `sessionStorage.ph_cart_data` is empty
- **Check:** Does `CHECKOUT_STARTED` step rule have `"cacheCart": true`?
- **Check:** Is cart extraction working (check console logs)?
- **Check:** Is localStorage `test-cart` populated?

## Next Steps

1. **Open Dev Server:** `cd web && npm run dev`
2. **Navigate to:** `http://localhost:3000/test-ecommerce/index.html`
3. **Open DevTools:** Press F12
4. **Test Complete Flow:** Catalog → Cart → Checkout → Confirmation
5. **Verify Events:** Check console logs and PostHog dashboard
6. **Test Add-Ons:** Visit `product-detail.html` and configure complex item

## Files Structure

```
test-ecommerce/
├── index.html              # Product catalog with cart
├── product-detail.html     # Product with sub-selections/add-ons
├── checkout.html           # Order review & payment
├── confirmation.html       # Order complete
├── test-ecommerce.json     # Analytics configuration
└── README.md              # This file
```
