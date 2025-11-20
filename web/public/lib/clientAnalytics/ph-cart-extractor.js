/* ========================================================================
 * AskMe Analytics — ph-cart-extractor.js
 * Shopping cart product extraction for checkout/order completion events
 * Handles multi-item carts with complex pricing (subtotal, tax, discounts)
 * ======================================================================== */

(function () {
    'use strict';

    if (!window.PHUtils || !window.PH_PROPS || !window.PH_PRODUCT_DOM) {
        console.warn('[ph-cart-extractor] Missing dependencies. Load ph-utils.js and ph-constants.js first.');
        return;
    }

    window.PHCartExtractor = window.PHCartExtractor || {};

    const U = window.PHUtils;
    const P = window.PH_PROPS;
    const DOM = window.PH_PRODUCT_DOM;

    /* ---------- Helper Functions -------------------------------- */
    
    function text(el) {
        if (!el) return '';
        if (el.tagName === 'INPUT') return el.value || '';
        return U.norm(el.textContent || el.innerText || '');
    }

    function parseNum(input) {
        if (typeof input === 'number') return input;
        if (!input || typeof input !== 'string') return 0;
        const stripped = input.replace(/[^0-9.-]/g, '');
        const n = parseFloat(stripped);
        return (isNaN(n) || !isFinite(n)) ? 0 : n;
    }

    /* ---------- Cart Item Extraction -------------------------------- */
    
    /**
     * Extract data from a single cart item
     * @param {HTMLElement} itemElement - DOM element representing one cart item
     * @param {Object} config - Cart extraction configuration
     * @returns {Object|null} Cart item data
     */
    function extractCartItem(itemElement, config) {
        if (!itemElement) return null;

        const item = {};

        // === PRODUCT NAME ===
        const nameElement = U.findFirstElement({
            selector: config.cartItemNameSelector,
            class: config.cartItemNameClass,
            attr: config.cartItemNameAttr,
            id: config.cartItemNameId
        }, itemElement);

        if (nameElement) {
            item.name = text(nameElement).trim();
            item.product = item.name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
        } else {
            console.warn('[ph-cart-extractor] Could not find product name in cart item:', itemElement);
            return null;
        }

        // === PRODUCT ATTRIBUTES (e.g., Color, Size, Material) - OPTIONAL ===
        item.attributes = {};
        if (config.cartItemAttributesSelector || config.cartItemAttributesClass) {
            try {
                const attrElements = U.findElements({
                    selector: config.cartItemAttributesSelector,
                    class: config.cartItemAttributesClass,
                    attr: config.cartItemAttributesAttr
                }, itemElement);

                attrElements.forEach(attrEl => {
                    const attrText = text(attrEl).trim();
                    
                    // Support formats: "Color: Gray", "Size: L", or just "Gray" with data attributes
                    const attrName = attrEl.getAttribute('data-attribute-name') || 
                                    attrEl.getAttribute('data-attr-name') ||
                                    attrEl.className.match(/attr-(\w+)/)?.[1];
                    
                    if (attrName && attrText) {
                        item.attributes[attrName] = attrText.replace(/^[^:]*:\s*/, '').trim();
                    } else if (attrText.includes(':')) {
                        // Parse "Color: Gray" format
                        const [key, value] = attrText.split(':').map(s => s.trim());
                        if (key && value) {
                            item.attributes[key.toLowerCase()] = value;
                        }
                    } else if (attrText) {
                        // Fallback: use element's class or data attribute
                        const attrKey = attrEl.className.split(/\s+/).find(c => c.startsWith('attr-'))?.replace('attr-', '') || 'variant';
                        item.attributes[attrKey] = attrText;
                    }
                });
            } catch (e) {
                // Attributes are optional, continue without them
            }
        }

        // === QUANTITY ===
        const quantityElement = U.findFirstElement({
            selector: config.cartItemQuantitySelector,
            class: config.cartItemQuantityClass,
            attr: config.cartItemQuantityAttr,
            id: config.cartItemQuantityId
        }, itemElement);

        if (quantityElement) {
            const qtyText = quantityElement.tagName === 'INPUT' || quantityElement.tagName === 'SELECT'
                ? quantityElement.value
                : text(quantityElement);
            
            // Handle "Quantity: 2" or "Quantity 2" format
            const match = qtyText.match(/\d+/);
            item.quantity = match ? parseInt(match[0], 10) : 1;
        } else {
            item.quantity = 1;
        }

        // === SUB-SELECTIONS (e.g., "Soup or Salad Choice") - OPTIONAL ===
        item.sub_selections = [];
        if (config.cartItemSubSelectionsSelector || config.cartItemSubSelectionsClass) {
            try {
                const subSelectionElements = U.findElements({
                    selector: config.cartItemSubSelectionsSelector,
                    class: config.cartItemSubSelectionsClass,
                    attr: config.cartItemSubSelectionsAttr
                }, itemElement);

                subSelectionElements.forEach(subEl => {
                    const subText = text(subEl).trim();
                    if (subText) {
                        item.sub_selections.push(subText);
                    }
                });
            } catch (e) {
                // Sub-selections are optional, continue without them
            }
        }

        // === ADD-ONS (e.g., beverages, sides with additional prices) - OPTIONAL ===
        item.add_ons = [];
        if (config.cartItemAddOnsSelector || config.cartItemAddOnsClass) {
            try {
                const addOnElements = U.findElements({
                    selector: config.cartItemAddOnsSelector,
                    class: config.cartItemAddOnsClass,
                    attr: config.cartItemAddOnsAttr
                }, itemElement);

                addOnElements.forEach(addOnEl => {
                    const addOnName = text(U.findFirstElement({
                        selector: config.cartItemAddOnNameSelector,
                        class: config.cartItemAddOnNameClass
                    }, addOnEl) || addOnEl).trim();

                    const addOnPriceEl = U.findFirstElement({
                        selector: config.cartItemAddOnPriceSelector,
                        class: config.cartItemAddOnPriceClass
                    }, addOnEl);

                    const addOnPrice = addOnPriceEl ? parseNum(text(addOnPriceEl)) : 0;

                    if (addOnName) {
                        item.add_ons.push({
                            name: addOnName,
                            price: addOnPrice
                        });
                    }
                });
            } catch (e) {
                // Add-ons are optional, continue without them
            }
        }

        // === UNIT PRICE (price per item) ===
        const priceElement = U.findFirstElement({
            selector: config.cartItemPriceSelector,
            class: config.cartItemPriceClass,
            attr: config.cartItemPriceAttr,
            id: config.cartItemPriceId
        }, itemElement);

        if (priceElement) {
            item.unit_price = parseNum(text(priceElement));
        } else {
            console.warn('[ph-cart-extractor] Could not find price for cart item:', item.name);
            item.unit_price = 0;
        }

        // === ITEM TOTAL (price × quantity, may include item-level discounts) ===
        const totalElement = U.findFirstElement({
            selector: config.cartItemTotalSelector,
            class: config.cartItemTotalClass,
            attr: config.cartItemTotalAttr,
            id: config.cartItemTotalId
        }, itemElement);

        if (totalElement) {
            item.item_total = parseNum(text(totalElement));
        } else {
            // Calculate from unit_price × quantity
            item.item_total = item.unit_price * item.quantity;
        }

        return item;
    }

    /* ---------- Full Cart Extraction -------------------------------- */
    
    /**
     * Extract all products from shopping cart
     * @param {Object} config - Cart extraction configuration
     * @returns {Object} Cart data with items and totals
     */
    function extractCartData(config) {
        const cartData = {
            items: [],
            subtotal: 0,
            tax: 0,
            discount: 0,
            shipping: 0,
            gratuity: 0,
            total: 0,
            currency: 'USD'
        };

        // === FIND CART CONTAINER ===
        const cartContainer = U.findFirstElement({
            selector: config.cartContainerSelector,
            class: config.cartContainerClass,
            attr: config.cartContainerAttr,
            id: config.cartContainerId
        });

        if (!cartContainer) {
            console.warn('[ph-cart-extractor] Cart container not found. Config:', config);
            return null;
        }

        // === EXTRACT CART ITEMS ===
        const itemElements = U.findElements({
            selector: config.cartItemSelector,
            class: config.cartItemClass,
            attr: config.cartItemAttr
        }, cartContainer);

        console.log(`[ph-cart-extractor] Found ${itemElements.length} cart items`);

        itemElements.forEach(itemEl => {
            const item = extractCartItem(itemEl, config);
            if (item) {
                cartData.items.push(item);
            }
        });

        if (cartData.items.length === 0) {
            console.warn('[ph-cart-extractor] No valid cart items extracted');
            return null;
        }

        // === EXTRACT TOTALS ===
        
        // Subtotal
        const subtotalElement = U.findFirstElement({
            selector: config.subtotalSelector,
            class: config.subtotalClass,
            attr: config.subtotalAttr,
            id: config.subtotalId
        }, cartContainer);

        if (subtotalElement) {
            cartData.subtotal = parseNum(text(subtotalElement));
        } else {
            // Calculate from items
            cartData.subtotal = cartData.items.reduce((sum, item) => sum + item.item_total, 0);
        }

        // Tax
        const taxElement = U.findFirstElement({
            selector: config.taxSelector,
            class: config.taxClass,
            attr: config.taxAttr,
            id: config.taxId
        }, cartContainer);

        if (taxElement) {
            cartData.tax = parseNum(text(taxElement));
        }

        // Discount
        const discountElement = U.findFirstElement({
            selector: config.discountSelector,
            class: config.discountClass,
            attr: config.discountAttr,
            id: config.discountId
        }, cartContainer);

        if (discountElement) {
            cartData.discount = parseNum(text(discountElement));
        }

        // Shipping/Delivery Fee
        const shippingElement = U.findFirstElement({
            selector: config.shippingSelector,
            class: config.shippingClass,
            attr: config.shippingAttr,
            id: config.shippingId
        }, cartContainer);

        if (shippingElement) {
            cartData.shipping = parseNum(text(shippingElement));
        }

        // Gratuity/Tip
        const gratuityElement = U.findFirstElement({
            selector: config.gratuitySelector,
            class: config.gratuityClass,
            attr: config.gratuityAttr,
            id: config.gratuityId
        }, cartContainer);

        if (gratuityElement) {
            cartData.gratuity = parseNum(text(gratuityElement));
        }

        // Total
        const totalElement = U.findFirstElement({
            selector: config.totalSelector,
            class: config.totalClass,
            attr: config.totalAttr,
            id: config.totalId
        }, cartContainer);

        if (totalElement) {
            cartData.total = parseNum(text(totalElement));
        } else {
            // Calculate: subtotal + tax + shipping + gratuity - discount
            cartData.total = cartData.subtotal + cartData.tax + cartData.shipping + cartData.gratuity - cartData.discount;
        }

        // Currency - try multiple sources
        let currencyFound = false;
        
        // 1. Try configured currency selector
        const currencyElement = U.findFirstElement({
            selector: config.currencySelector,
            class: config.currencyClass,
            attr: config.currencyAttr,
            id: config.currencyId
        }, cartContainer);

        if (currencyElement) {
            const currencyText = text(currencyElement);
            cartData.currency = detectCurrency(currencyText);
            currencyFound = true;
        }
        
        // 2. Try extracting from total/price text if not found
        if (!currencyFound && totalElement) {
            const totalText = text(totalElement);
            cartData.currency = detectCurrency(totalText);
            currencyFound = true;
        }
        
        // 3. Check subtotal for currency
        if (!currencyFound && subtotalElement) {
            const subtotalText = text(subtotalElement);
            cartData.currency = detectCurrency(subtotalText);
            currencyFound = true;
        }
        
        // 4. Check first item price for currency
        if (!currencyFound && cartData.items.length > 0) {
            const firstItemContainer = U.findElements({
                selector: config.cartItemSelector,
                class: config.cartItemClass,
                attr: config.cartItemAttr
            }, cartContainer)[0];
            
            if (firstItemContainer) {
                const priceEl = U.findFirstElement({
                    selector: config.cartItemPriceSelector,
                    class: config.cartItemPriceClass,
                    attr: config.cartItemPriceAttr,
                    id: config.cartItemPriceId
                }, firstItemContainer);
                
                if (priceEl) {
                    const priceText = text(priceEl);
                    cartData.currency = detectCurrency(priceText);
                }
            }
        }
        
        console.log('[ph-cart-extractor] Currency detected:', cartData.currency);

        return cartData;
    }

    /* ---------- Currency Detection Helper -------------------------------- */
    
    /**
     * Detect currency from text containing price
     * @param {string} text - Text that may contain currency symbol or code
     * @returns {string} Currency code (e.g., 'USD', 'EUR')
     */
    function detectCurrency(text) {
        if (!text) return 'USD';
        
        const lowerText = text.toLowerCase();
        
        const currencyMap = {
            '$': 'USD', 'usd': 'USD', 'dollar': 'USD',
            '€': 'EUR', 'eur': 'EUR', 'euro': 'EUR',
            '£': 'GBP', 'gbp': 'GBP', 'pound': 'GBP',
            '¥': 'JPY', 'jpy': 'JPY', 'yen': 'JPY',
            '₹': 'INR', 'inr': 'INR', 'rupee': 'INR',
            'cad': 'CAD', 'c$': 'CAD',
            'aud': 'AUD', 'a$': 'AUD',
            'chf': 'CHF',
            'cny': 'CNY', 'rmb': 'CNY',
            'krw': 'KRW', '₩': 'KRW',
            'mxn': 'MXN',
            'brl': 'BRL', 'r$': 'BRL'
        };
        
        for (const [symbol, code] of Object.entries(currencyMap)) {
            if (lowerText.includes(symbol)) {
                return code;
            }
        }
        
        return 'USD'; // Default fallback
    }

    /* ---------- Format Cart Data for PostHog -------------------------------- */
    
    /**
     * Convert cart data to PostHog event properties
     * @param {Object} cartData - Extracted cart data
     * @returns {Object} PostHog event properties
     */
    function formatCartPropertiesForPostHog(cartData) {
        if (!cartData || !cartData.items || cartData.items.length === 0) {
            return null;
        }

        const props = {
            // Revenue tracking
            [P.REVENUE]: cartData.total.toFixed(2),
            [P.CURRENCY]: cartData.currency,
            
            // Breakdown
            subtotal: cartData.subtotal.toFixed(2),
            tax: cartData.tax.toFixed(2),
            discount: cartData.discount.toFixed(2),
            shipping: cartData.shipping.toFixed(2),
            gratuity: cartData.gratuity.toFixed(2),
            
            // Item summary
            item_count: cartData.items.length,
            total_quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
            
            // Product names (comma-separated)
            product_names: cartData.items.map(item => item.name).join(', '),
            [P.PRODUCT]: cartData.items.map(item => item.product).join(','),
            
            // Quantity breakdown (comma-separated, same order as products)
            quantities: cartData.items.map(item => item.quantity).join(','),
            
            // Individual items (for detailed analysis)
            cart_items: cartData.items.map(item => {
                const cartItem = {
                    product: item.product,
                    name: item.name,
                    quantity: item.quantity,
                    unit_price: item.unit_price.toFixed(2),
                    item_total: item.item_total.toFixed(2),
                    currency: cartData.currency
                };
                
                // Only include attributes if present
                if (item.attributes && Object.keys(item.attributes).length > 0) {
                    cartItem.attributes = item.attributes;
                }
                
                // Only include sub_selections if present
                if (item.sub_selections && item.sub_selections.length > 0) {
                    cartItem.sub_selections = item.sub_selections;
                }
                
                // Only include add_ons if present
                if (item.add_ons && item.add_ons.length > 0) {
                    cartItem.add_ons = item.add_ons;
                }
                
                return cartItem;
            })
        };

        return props;
    }

    /* ---------- Exports -------------------------------- */
    
    PHCartExtractor.extractCartItem = extractCartItem;
    PHCartExtractor.extractCartData = extractCartData;
    PHCartExtractor.formatCartPropertiesForPostHog = formatCartPropertiesForPostHog;

    console.log('[ph-cart-extractor] ✅ Cart extraction module loaded');
})();