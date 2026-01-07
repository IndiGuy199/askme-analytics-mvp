# E-Commerce Cart Tracking Guide (Olive Garden Style)

This guide explains how to configure analytics for e-commerce sites with complex carts featuring:
- Multiple items with quantities
- Sub-selections (e.g., "Soup or Salad Choice")
- Add-ons (e.g., beverages, extras)
- Item removal capabilities

## Events Tracked

### 1. **PRODUCT_SELECTED** (Add to Cart)
Fires when user clicks "ADD" or "Add to Cart" button.

**Captured Data:**
```javascript
{
  product_name: "Chicken Carbonara",
  product: "chicken_carbonara",
  price: "25.49",
  quantity: 3,
  currency: "USD",
  item_total: "76.47",
  sub_selections: "Famous House Salad",
  add_ons: "Sweet Tea ($3.99), Breadsticks ($2.49)",
  add_ons_count: 2,
  sub_selections_count: 1,
  path: "/menu/classic-entrees"
}
```

### 2. **PRODUCT_REMOVED** (Remove from Cart)
Fires when user clicks "REMOVE" button on cart item.

**Captured Data:**
```javascript
{
  product_name: "Fried Mozzarella",
  product: "fried_mozzarella",
  price: "9.99",
  quantity: 1,
  path: "/menu/classic-entrees"
}
```

### 3. **CHECKOUT_STARTED** (Cart View)
Fires when user views checkout page with cart.

### 4. **CHECKOUT_SUBMITTED** (Place Order)
Fires when user clicks "CHECKOUT" button. Caches full cart data.

**Captured Data:**
```javascript
{
  revenue: "278.51",
  currency: "USD",
  subtotal: "226.34",
  tax: "15.84",
  gratuity: "36.33",
  discount: "0.00",
  shipping: "0.00",
  item_count: 4,
  total_quantity: 10,
  product_names: "Stuffed Ziti Fritta, Chicken Carbonara, Fried Mozzarella, Steak Gorgonzola Alfredo",
  quantities: "2,3,1,2",
  cart_items: [
    {
      name: "Stuffed Ziti Fritta",
      quantity: 2,
      unit_price: "21.58",
      item_total: "43.16",
      currency: "USD",
      sub_selections: ["Famous House Salad"],
      add_ons: [
        { name: "Sweet Tea", price: 3.99 }
      ]
    },
    // ... more items
  ]
}
```

### 5. **CHECKOUT_COMPLETED** (Order Confirmation)
Fires on confirmation page. Uses cached cart data for revenue.

**Captured Data:**
```javascript
{
  revenue: "278.51",
  currency: "USD",
  product: "stuffed_ziti_fritta,chicken_carbonara,fried_mozzarella,steak_gorgonzola_alfredo",
  subtotal: "226.34",
  tax: "15.84",
  // ... all cart details from cache
  path: "/order-confirmation"
}
```

---

## Configuration

### Complete Example for Olive Garden-Style Sites

```json
{
  "cartExtractorConfig": {
    // ===== CART CONTAINER =====
    "cartContainerSelector": ".cart-summary, [class*='cart-container']",
    
    // ===== CART ITEMS =====
    "cartItemSelector": ".cart-item, [class*='cart-item'], [class*='order-item']",
    "cartItemNameSelector": ".item-name, [class*='item-name'], [class*='product-name']",
    "cartItemPriceSelector": ".item-price, [class*='item-price'], [class*='price']",
    "cartItemQuantitySelector": ".item-quantity, [class*='quantity']",
    "cartItemTotalSelector": ".item-total, [class*='item-total']",
    
    // ===== SUB-SELECTIONS (Soup/Salad Choices) =====
    "cartItemSubSelectionsSelector": ".sub-selection, [class*='choice'], [class*='included']",
    
    // ===== ADD-ONS (Beverages, Extras) =====
    "cartItemAddOnsSelector": ".addon, [class*='addon'], [class*='extra']",
    "cartItemAddOnNameSelector": ".addon-name, [class*='addon-name']",
    "cartItemAddOnPriceSelector": ".addon-price, [class*='addon-price']",
    
    // ===== TOTALS =====
    "subtotalSelector": ".subtotal, [class*='subtotal']",
    "taxSelector": ".tax, [class*='tax']",
    "gratuitySelector": ".gratuity, .tip, [class*='gratuity']",
    "discountSelector": ".discount, [class*='discount']",
    "shippingSelector": ".shipping, .delivery-fee, [class*='shipping']",
    "totalSelector": ".total, .grand-total, [class*='total-amount']",
    
    // ===== CURRENCY (OPTIONAL) =====
    "currencySelector": ".currency, [class*='currency']",
    
    // ===== PRODUCT MODAL (for Add to Cart tracking) =====
    "modalProductNameSelector": "h1, h2, .product-title, [class*='product-name']",
    "modalProductPriceSelector": ".product-price, [class*='price']:not([class*='addon'])",
    "modalQuantitySelector": "input[type='number'], [class*='quantity-input']",
    "modalSubSelectionsSelector": "input[type='radio']:checked, select option:checked",
    "modalAddOnsSelector": "input[type='checkbox']:checked"
  },
  
  "steps": [
    {
      "key": "PRODUCT_SELECTED",
      "description": "Auto-tracked when user clicks ADD/Add to Cart buttons"
    },
    {
      "key": "PRODUCT_REMOVED",
      "description": "Auto-tracked when user clicks REMOVE buttons in cart"
    },
    {
      "key": "CHECKOUT_STARTED",
      "selector": ".cart-page, [class*='cart-summary']",
      "autoFire": true,
      "requireSelectorPresent": true,
      "extractCart": true
    },
    {
      "key": "CHECKOUT_SUBMITTED",
      "selector": "button.checkout-btn, button:has-text('CHECKOUT')",
      "extractCart": true
    },
    {
      "key": "CHECKOUT_COMPLETED",
      "selector": ".order-confirmation, [class*='confirmation']",
      "autoFire": true,
      "requireSelectorPresent": true
    }
  ]
}
```

---

## Auto-Detection

The system automatically detects and tracks these actions **without explicit configuration**:

### Add to Cart Detection
Looks for buttons matching:
- Text: "ADD", "Add to Cart", "ADD TO CART"
- Classes: `add-to-cart`, `add-cart`, `btn-add`
- Values: `ADD` (for input buttons)

### Remove from Cart Detection
Looks for buttons matching:
- Text: "REMOVE", "Delete", "Remove Item"
- Classes: `remove`, `delete`, `btn-remove`

---

## Sub-Selections vs Add-Ons

### Sub-Selections (Included in Base Price)
- **Examples:** "Soup or Salad", "Side Choice", "Dressing Type"
- **UI Pattern:** Radio buttons, dropdowns (single choice)
- **Price Impact:** No additional charge
- **Capture:** Extracted as array of strings

```javascript
sub_selections: ["Famous House Salad", "Italian Dressing"]
```

### Add-Ons (Additional Charges)
- **Examples:** Beverages, extra sides, premium toppings
- **UI Pattern:** Checkboxes (multiple choice)
- **Price Impact:** Adds to item total
- **Capture:** Extracted as array of objects with name and price

```javascript
add_ons: [
  { name: "Sweet Tea", price: 3.99 },
  { name: "Breadsticks", price: 2.49 }
]
```

---

## DOM Structure Examples

### Typical Cart Item Structure
```html
<div class="cart-item">
  <h3 class="item-name">Chicken Carbonara</h3>
  <div class="item-price">$25.49</div>
  <div class="quantity">Quantity: 3</div>
  
  <!-- Sub-selections (included) -->
  <div class="sub-selection">
    <span>Soup or Salad Choice</span>
    <strong>Famous House Salad</strong>
  </div>
  
  <!-- Add-ons (extra cost) -->
  <div class="addon">
    <span class="addon-name">Sweet Tea</span>
    <span class="addon-price">$3.99</span>
  </div>
  
  <div class="item-total">$76.47</div>
  <button class="remove-btn">REMOVE</button>
</div>
```

### Product Modal Structure (Add to Cart)
```html
<div class="product-modal" style="display: block;">
  <h1 class="product-title">Shrimp Carbonara</h1>
  <div class="product-price">$25.49</div>
  <input type="number" class="quantity-input" value="1" />
  
  <!-- Sub-selections -->
  <div class="choice-section">
    <h3>Choose Soup Or Salad (Required)</h3>
    <label>
      <input type="radio" name="soup-salad" value="salad" checked />
      Famous House Salad
    </label>
    <label>
      <input type="radio" name="soup-salad" value="soup" />
      Pasta e Fagioli Soup
    </label>
  </div>
  
  <!-- Add-ons -->
  <div class="addons-section">
    <h3>Would You Like To Add A Beverage? (Optional)</h3>
    <label>
      <input type="checkbox" value="raspberry-lemonade" />
      <span class="addon-name">Raspberry Lemonade</span>
      <span class="addon-price">$4.49</span>
    </label>
    <label>
      <input type="checkbox" value="sweet-tea" />
      <span class="addon-name">Sweet Tea</span>
      <span class="addon-price">$3.99</span>
    </label>
  </div>
  
  <button class="add-to-cart-btn">ADD TO CART</button>
</div>
```

---

## Testing Checklist

✅ **Add to Cart (PRODUCT_SELECTED)**
- [ ] Click "ADD" button fires event
- [ ] Product name captured correctly
- [ ] Price and quantity captured
- [ ] Sub-selections captured (radio buttons/dropdowns)
- [ ] Add-ons captured with prices (checkboxes)
- [ ] Currency detected from price text
- [ ] Item total calculated correctly

✅ **Remove from Cart (PRODUCT_REMOVED)**
- [ ] Click "REMOVE" button fires event
- [ ] Product name and quantity captured
- [ ] Event fires immediately (not on page load)

✅ **Cart Caching**
- [ ] Cart data cached when CHECKOUT_STARTED fires
- [ ] Cart data cached when CHECKOUT_SUBMITTED fires
- [ ] Full cart details preserved (items, quantities, add-ons)

✅ **Revenue Tracking**
- [ ] CHECKOUT_COMPLETED uses cached cart data
- [ ] Revenue matches cart total
- [ ] All items listed in cart_items array
- [ ] Quantities and add-ons preserved

✅ **Currency Detection**
- [ ] Currency extracted from "$" → USD
- [ ] Currency extracted from "€" → EUR
- [ ] Falls back to USD if not detected

---

## Debug Console Logs

### Successful Add to Cart
```
[ph-injector] 🛒 PRODUCT_SELECTED: {
  product_name: "Chicken Carbonara",
  quantity: 3,
  sub_selections: "Famous House Salad",
  add_ons: "Sweet Tea ($3.99)"
}
```

### Successful Remove
```
[ph-injector] 🗑️ PRODUCT_REMOVED: {
  product_name: "Fried Mozzarella",
  quantity: 1
}
```

### Cart Extraction
```
[ph-cart-extractor] Found 4 cart items
[ph-cart-extractor] Currency detected: USD
[ph-injector] 💾 Cart data cached for checkout completion
```

### Revenue Tracking
```
[ph-step-tracker] 💰 Using cached cart data for revenue: {
  revenue: 278.51,
  item_count: 4,
  total_quantity: 10
}
```

---

## Common Issues

### Issue: PRODUCT_SELECTED not firing
**Solution:** Check button text/classes. Add custom selector:
```json
{
  "steps": [{
    "key": "PRODUCT_SELECTED",
    "selector": "button.your-custom-add-btn"
  }]
}
```

### Issue: Sub-selections not captured
**Solution:** Configure `modalSubSelectionsSelector`:
```json
{
  "modalSubSelectionsSelector": "input[name='side-choice']:checked"
}
```

### Issue: Add-ons missing prices
**Solution:** Ensure price elements have consistent classes:
```json
{
  "cartItemAddOnPriceSelector": ".addon-price, [data-price]"
}
```

### Issue: Cart items not found
**Solution:** Inspect cart HTML and update selectors:
```json
{
  "cartItemSelector": ".your-custom-cart-item-class"
}
```

---

## Next Steps

1. **Inspect your cart HTML** - Use browser DevTools to identify class names
2. **Update configuration** - Match selectors to your site's structure
3. **Test each event** - Use browser console to verify events fire
4. **Check PostHog** - Verify events appear with correct properties
5. **Refine selectors** - Adjust based on what's captured vs. expected

For further assistance, check `ph-cart-extractor.js` source code for extraction logic.
