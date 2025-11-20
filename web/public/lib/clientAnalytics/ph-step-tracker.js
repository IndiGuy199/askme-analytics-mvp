/* ========================================================================
 * AskMe Analytics — ph-step-tracker.js
 * Dynamic step tagging, rule evaluation, and click tracking
 * ======================================================================== */

(function () {
    'use strict';

    if (!window.PHUtils || !window.PH_PROPS || !window.PH_KEYS || !window.PHEventCapture) {
        console.warn('[ph-step-tracker] Missing dependencies. Load required modules first.');
        return;
    }

    window.PHStepTracker = window.PHStepTracker || {};

    const U = window.PHUtils;
    const P = window.PH_PROPS;
    const EK = window.PH_KEYS;
    const captureOnce = window.PHEventCapture.captureOnce;

    /* ---------- State -------------------------------- */
    const sentStepEls = new WeakSet();
    const blockedRules = new Set();
    const autoFireEvents = ['CHECKOUT_COMPLETED', 'SUBSCRIPTION_COMPLETED', 'CHECKOUT_STARTED'];

    /* ---------- URL Matching -------------------------------- */
    function urlMatches(rule) {
        if (!rule || !U.isNonEmptyStr(rule.url)) return true;
        const u = (location.pathname + location.search) || '';
        
        // Debug mode: Allow debug-demo-events.html to match /demo rules
        const isDebugPage = location.pathname.includes('debug-demo-events.html');
        if (isDebugPage && rule.url.includes('/demo')) {
            console.log('[ph-step-tracker] 🐛 DEBUG MODE: Treating debug page as /demo');
            return true;
        }
        
        switch (rule.urlMatch) {
            case 'exact':   return u === rule.url;
            case 'regex':   { const rx = U.ciRegex(rule.url) || new RegExp(rule.url); return rx.test(u); }
            case 'contains':
            default:        return u.toLowerCase().includes(String(rule.url).toLowerCase());
        }
    }

    /* ---------- Apply Single Rule -------------------------------- */
    function tagElementsForRule(rule, config, extractRevenueData) {
        if (!rule || !rule.key) {
            console.log('[ph-step-tracker] ⚠️ Rule skipped: no rule or no key');
            return;
        }
        
        const urlMatchResult = urlMatches(rule);
        console.log('[ph-step-tracker] 🔍 Checking rule:', rule.key, {
            currentPath: location.pathname,
            ruleUrl: rule.url,
            urlMatch: rule.urlMatch,
            urlMatches: urlMatchResult,
            autoFire: rule.autoFire,
            blocked: blockedRules.has(rule.key)
        });
        
        if (!urlMatchResult) {
            console.log('[ph-step-tracker] ⏭️ Rule skipped (URL mismatch):', rule.key);
            return;
        }

        if (blockedRules.has(rule.key)) {
            console.log('[ph-step-tracker] 🚫 Rule blocked:', rule.key);
            return;
        }

        // AutoFire logic with requireSelectorPresent check
        if (rule.autoFire) {
            // Check if requireSelectorPresent is enabled FIRST (before checking if already fired)
            // This prevents marking an event as "fired" when the selector wasn't even present
            if (rule.requireSelectorPresent && U.isNonEmptyStr(rule.selector)) {
                const selectorExists = U.first(document, rule.selector);
                if (!selectorExists) {
                    console.log('[ph-step-tracker] ⏭️ AutoFire blocked: required selector not present:', rule.key, rule.selector);
                    return;
                }
                console.log('[ph-step-tracker] ✅ Required selector found:', rule.selector);
            }
            
            // Now check if already fired (after confirming selector is present)
            const key = rule.oncePerPath ? `${rule.key}::${location.pathname}` : rule.key;
            const fired = window.__phFiredOnce && window.__phFiredOnce.has(key);
            
            if (rule.oncePerPath && fired) {
                console.log('[ph-step-tracker] ⏭️ Skipping already-fired event:', rule.key, 'on path:', location.pathname);
                return;
            }
            
            console.log('[ph-step-tracker] 🔥 AutoFire event:', rule.key, 'on path:', location.pathname);
            const props = { [P.PATH]: location.pathname, ...rule.metadata };
            
            // Cart extraction and caching for CHECKOUT_STARTED (if cart extractor available)
            console.log('[ph-step-tracker] 🔍 Cart extraction check:', {
                ruleKey: rule.key,
                isCheckoutStarted: rule.key === EK.CHECKOUT_STARTED,
                hasExtractCart: rule.extractCart,
                hasCartExtractor: !!window.PHCartExtractor,
                allConditionsMet: rule.key === EK.CHECKOUT_STARTED && rule.extractCart && window.PHCartExtractor
            });
            
            if (rule.key === EK.CHECKOUT_STARTED && rule.extractCart && window.PHCartExtractor) {
                const config = window.AskMeAnalyticsConfig;
                if (config && config.cartExtractorConfig) {
                    try {
                        console.log('[ph-step-tracker] 🛒 Attempting cart extraction for CHECKOUT_STARTED');
                        let cartData = window.PHCartExtractor.extractCartData(config.cartExtractorConfig);
                        console.log('[ph-step-tracker] 📦 DOM extraction result:', cartData);
                        
                        // Fallback: If DOM extraction failed, try localStorage (for test pages)
                        if (!cartData || !cartData.items || cartData.items.length === 0) {
                            console.log('[ph-step-tracker] 🔍 DOM extraction empty, checking localStorage...');
                            const localCart = localStorage.getItem('test-cart');
                            if (localCart) {
                                const items = JSON.parse(localCart);
                                console.log('[ph-step-tracker] 📦 Found localStorage cart:', items);
                                if (items && items.length > 0) {
                                    let subtotal = 0;
                                    
                                    // Transform items to match expected format
                                    const transformedItems = items.map(item => {
                                        const itemTotal = item.price * item.quantity;
                                        subtotal += itemTotal;
                                        
                                        const transformed = {
                                            product: item.id || item.name,
                                            name: item.name,
                                            unit_price: item.price,
                                            quantity: item.quantity,
                                            item_total: itemTotal,
                                            attributes: item.attributes || {},
                                            sub_selections: item.sub_selections || [],
                                            add_ons: item.add_ons || []
                                        };
                                        
                                        return transformed;
                                    });
                                    
                                    const tax = subtotal * 0.08;
                                    const shipping = 3.99;
                                    cartData = {
                                        items: transformedItems,
                                        subtotal: subtotal,
                                        tax: tax,
                                        shipping: shipping,
                                        discount: 0,
                                        gratuity: 0,
                                        total: subtotal + tax + shipping,
                                        currency: items[0]?.currency || 'USD'
                                    };
                                    console.log('[ph-step-tracker] 💾 Loaded cart from localStorage:', cartData);
                                } else {
                                    console.warn('[ph-step-tracker] ⚠️ localStorage cart is empty');
                                }
                            } else {
                                console.warn('[ph-step-tracker] ⚠️ No localStorage cart found (key: test-cart)');
                            }
                        }
                        
                        if (cartData && cartData.items && cartData.items.length > 0) {
                            const formattedProps = window.PHCartExtractor.formatCartPropertiesForPostHog(cartData);
                            
                            // Add cart properties to the event
                            Object.assign(props, {
                                cart_total: cartData.total.toFixed(2),
                                cart_subtotal: cartData.subtotal.toFixed(2),
                                cart_tax: cartData.tax.toFixed(2),
                                cart_discount: cartData.discount.toFixed(2),
                                cart_shipping: cartData.shipping.toFixed(2),
                                cart_gratuity: cartData.gratuity.toFixed(2),
                                cart_currency: cartData.currency,
                                cart_item_count: cartData.items.length,
                                cart_total_quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
                                ...formattedProps
                            });
                            
                            // Cache for CHECKOUT_COMPLETED
                            sessionStorage.setItem('ph_cart_data', JSON.stringify({
                                revenue: cartData.total,
                                currency: cartData.currency,
                                subtotal: cartData.subtotal,
                                tax: cartData.tax,
                                discount: cartData.discount,
                                shipping: cartData.shipping,
                                gratuity: cartData.gratuity,
                                cart_total: cartData.total,
                                items: cartData.items,
                                product_names: formattedProps.product_names,
                                product: formattedProps[P.PRODUCT],
                                item_count: cartData.items.length,
                                total_quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
                                cart_items: formattedProps.cart_items,
                                cached_at: new Date().toISOString()
                            }));
                            console.log('[ph-step-tracker] 💾 Cart data extracted and cached at CHECKOUT_STARTED:', formattedProps);
                        }
                    } catch (e) {
                        console.warn('[ph-step-tracker] Failed to extract/cache cart at CHECKOUT_STARTED:', e);
                    }
                }
            }
            
            // Revenue tracking for completion events
            if (rule.key === EK.CHECKOUT_COMPLETED || rule.key === EK.SUBSCRIPTION_COMPLETED) {
                let revenueData = null;
                
                console.log('[ph-step-tracker] 💰 Processing revenue for:', rule.key);
                
                // PRIORITY 1: Try cached cart data (for cart-based clients)
                try {
                    const cachedCart = sessionStorage.getItem('ph_cart_data');
                    console.log('[ph-step-tracker] 🔍 Checking sessionStorage for ph_cart_data:', cachedCart ? 'FOUND' : 'NOT FOUND');
                    if (cachedCart) {
                        const cartData = JSON.parse(cachedCart);
                        console.log('[ph-step-tracker] 💰 Using cached cart data for revenue:', cartData);
                        revenueData = {
                            [P.REVENUE]: cartData.revenue.toFixed(2),
                            [P.CURRENCY]: cartData.currency,
                            subtotal: cartData.subtotal.toFixed(2),
                            tax: cartData.tax.toFixed(2),
                            discount: cartData.discount.toFixed(2),
                            shipping: cartData.shipping.toFixed(2),
                            gratuity: cartData.gratuity.toFixed(2),
                            cart_total: cartData.cart_total.toFixed(2),
                            [P.PRODUCT]: cartData.product,
                            product_names: cartData.product_names,
                            item_count: cartData.item_count,
                            total_quantity: cartData.total_quantity,
                            cart_items: cartData.cart_items,
                            cart_cached_at: cartData.cached_at
                        };
                        // Clear cached cart after using it
                        sessionStorage.removeItem('ph_cart_data');
                    }
                } catch (e) {
                    console.warn('[ph-step-tracker] Failed to retrieve cached cart:', e);
                }
                
                // PRIORITY 2: Calculate from static product data (for static pricing clients)
                if (!revenueData) {
                    try {
                        const prod = sessionStorage.getItem('ph_last_product');
                        const price = sessionStorage.getItem('ph_last_price');
                        const curr = sessionStorage.getItem('ph_last_currency');
                        const qty = sessionStorage.getItem('ph_last_quantity') || '1';
                        
                        if (prod && price && curr) {
                            const priceNum = parseFloat(price);
                            const qtyNum = parseInt(qty, 10);
                            const revenue = (priceNum * qtyNum).toFixed(2);
                            
                            console.log('[ph-step-tracker] 💰 Calculating revenue from static product:', {
                                product: prod,
                                price: price,
                                quantity: qty,
                                revenue: revenue
                            });
                            
                            // Create cart_items array for simple clients
                            const cartItem = {
                                name: prod,
                                product: prod,
                                unit_price: price,
                                quantity: qtyNum,
                                item_total: revenue,
                                currency: curr
                            };
                            
                            revenueData = {
                                [P.PRODUCT]: prod,
                                [P.PRICE]: price,
                                [P.CURRENCY]: curr,
                                [P.QUANTITY]: qty,
                                [P.REVENUE]: revenue,
                                cart_items: [cartItem],
                                cart_total: revenue,
                                item_count: 1,
                                total_quantity: qtyNum,
                                product_names: prod
                            };
                            
                            // Clear product data after using it
                            sessionStorage.removeItem('ph_last_product');
                            sessionStorage.removeItem('ph_last_price');
                            sessionStorage.removeItem('ph_last_currency');
                            sessionStorage.removeItem('ph_last_quantity');
                        }
                    } catch (e) {
                        console.warn('[ph-step-tracker] Failed to calculate revenue from product data:', e);
                    }
                }
                
                // PRIORITY 3: Fallback to DOM extraction
                if (!revenueData) {
                    console.log('[ph-step-tracker] 💰 No cached data, extracting revenue from DOM');
                    revenueData = extractRevenueData(document.body);
                }
                
                Object.assign(props, revenueData);
            }
            
            console.log('[ph-step-tracker] 🚀 Calling captureOnce for:', rule.key);
            captureOnce(rule.key, props, { scopePath: rule.oncePerPath });
            console.log('[ph-step-tracker] ✅ captureOnce completed for:', rule.key);
        }

        // Collect all visible elements matching selectors
        const bucket = new Set();

        const sels = (rule.selectorList && rule.selectorList.length)
            ? rule.selectorList
            : (U.isValidSelector(rule.selector) ? [rule.selector] : []);

        for (const sel of sels) {
            const allMatches = U.qsa(sel);
            
            allMatches.forEach((el) => {
                const visible = U.isVisible(el);
                const isHiddenInput = el.tagName === 'INPUT' && el.type === 'hidden';
                
                if (visible && !isHiddenInput) {
                    bucket.add(el);
                }
            });
        }

        // TextRegex fallback
        if (!bucket.size && U.isNonEmptyStr(rule.textRegex)) {
            const rx = U.ciRegex(rule.textRegex);
            if (rx) {
                const buttonSelector = config.buttonSelectors || 
                    'button, a, input[type="submit"], input[type="button"], [role="button"]';
                
                try {
                    Array.from(document.querySelectorAll(buttonSelector))
                        .filter(U.isVisible)
                        .forEach(el => {
                            const txt = el.tagName === 'INPUT'
                                ? (el.getAttribute('value') || '')
                                : (el.textContent || '');
                            if (rx.test(U.norm(txt))) bucket.add(el);
                        });
                } catch (e) {
                    console.warn('[ph-step-tracker] Invalid button selectors:', buttonSelector, e);
                }
            }
        }

        const targets = Array.from(bucket);

        // Block other rules if this rule matched
        if (targets.length && rule.blockRules && rule.blockRules.length) {
            rule.blockRules.forEach(blockedKey => {
                blockedRules.add(blockedKey);
                console.log(`[ph-step-tracker] Rule "${rule.key}" is blocking "${blockedKey}"`);
            });
        }

        // RequireSelectorPresent: Fire once if selector found, create hidden element
        if (rule.requireSelectorPresent) {
            if (targets.length) {
                const hiddenSel = `input[type="hidden"][data-ph="${rule.key}"]`;
                if (!document.querySelector(hiddenSel)) {
                    const hidden = document.createElement('input');
                    hidden.type = 'hidden';
                    hidden.setAttribute('data-ph', rule.key);
                    hidden.setAttribute('data-ph-tagged-dyn', '1');
                    document.body.appendChild(hidden);

                    const props = { [P.PATH]: location.pathname, matched: 'selector', ...rule.metadata };
                    
                    if (rule.key === EK.CHECKOUT_COMPLETED || rule.key === EK.SUBSCRIPTION_COMPLETED) {
                        let revenueData = null;
                        
                        // PRIORITY 1: Try cached cart data (for cart-based clients)
                        try {
                            const cachedCart = sessionStorage.getItem('ph_cart_data');
                            if (cachedCart) {
                                const cartData = JSON.parse(cachedCart);
                                console.log('[ph-step-tracker] 💰 Using cached cart data for revenue:', cartData);
                                revenueData = {
                                    [P.REVENUE]: cartData.revenue.toFixed(2),
                                    [P.CURRENCY]: cartData.currency,
                                    subtotal: cartData.subtotal.toFixed(2),
                                    tax: cartData.tax.toFixed(2),
                                    discount: cartData.discount.toFixed(2),
                                    shipping: cartData.shipping.toFixed(2),
                                    gratuity: cartData.gratuity.toFixed(2),
                                    [P.PRODUCT]: cartData.product,
                                    product_names: cartData.product_names,
                                    item_count: cartData.item_count,
                                    total_quantity: cartData.total_quantity,
                                    cart_cached_at: cartData.cached_at
                                };
                                // Clear cached cart after using it
                                sessionStorage.removeItem('ph_cart_data');
                            }
                        } catch (e) {
                            console.warn('[ph-step-tracker] Failed to retrieve cached cart:', e);
                        }
                        
                        // PRIORITY 2: Calculate from static product data (for static pricing clients)
                        if (!revenueData) {
                            try {
                                const prod = sessionStorage.getItem('ph_last_product');
                                const price = sessionStorage.getItem('ph_last_price');
                                const curr = sessionStorage.getItem('ph_last_currency');
                                const qty = sessionStorage.getItem('ph_last_quantity') || '1';
                                
                                if (prod && price && curr) {
                                    const priceNum = parseFloat(price);
                                    const qtyNum = parseInt(qty, 10);
                                    const revenue = (priceNum * qtyNum).toFixed(2);
                                    
                                    console.log('[ph-step-tracker] 💰 Calculating revenue from static product:', {
                                        product: prod,
                                        price: price,
                                        quantity: qty,
                                        revenue: revenue
                                    });
                                    
                                    revenueData = {
                                        [P.PRODUCT]: prod,
                                        [P.PRICE]: price,
                                        [P.CURRENCY]: curr,
                                        [P.QUANTITY]: qty,
                                        [P.REVENUE]: revenue
                                    };
                                    
                                    // Clear product data after using it
                                    sessionStorage.removeItem('ph_last_product');
                                    sessionStorage.removeItem('ph_last_price');
                                    sessionStorage.removeItem('ph_last_currency');
                                    sessionStorage.removeItem('ph_last_quantity');
                                }
                            } catch (e) {
                                console.warn('[ph-step-tracker] Failed to calculate revenue from product data:', e);
                            }
                        }
                        
                        // PRIORITY 3: Fallback to DOM extraction
                        if (!revenueData) {
                            console.log('[ph-step-tracker] 💰 No cached data, extracting revenue from DOM');
                            revenueData = extractRevenueData(targets[0]);
                        }
                        
                        Object.assign(props, revenueData);
                    }
                    
                    captureOnce(rule.key, props, { scopePath: rule.oncePerPath });
                    console.log(`[ph-step-tracker] Rule "${rule.key}" created hidden element (requireSelectorPresent)`);
                }
            }
            return;
        }

        // Tag visible elements (allow multiple event keys on same element)
        if (targets.length) {
            targets.forEach((el) => {
                const existing = el.getAttribute('data-ph');
                if (existing) {
                    // Element already has events - append this one if not already present
                    const existingKeys = existing.split(',').map(k => k.trim());
                    if (!existingKeys.includes(rule.key)) {
                        el.setAttribute('data-ph', [...existingKeys, rule.key].join(','));
                    }
                } else {
                    // First event for this element
                    el.setAttribute('data-ph', rule.key);
                }
            });
            return;
        }

        // Hidden rule fallback
        const hasMatchers = (sels.length > 0) || U.isNonEmptyStr(rule.textRegex);
        const wantsAutoHidden = (!hasMatchers) || rule.autoFire === true;
        if (wantsAutoHidden) {
            const hiddenSel = `input[type="hidden"][data-ph="${rule.key}"]`;
            if (!document.querySelector(hiddenSel)) {
                if (rule.requireSelectorPresent && sels.length) {
                    const any = sels.some(sel => U.qsa(sel).some(U.isVisible));
                    if (!any) return;
                }
                const hidden = document.createElement('input');
                hidden.type = 'hidden';
                hidden.setAttribute('data-ph', rule.key);
                hidden.setAttribute('data-ph-tagged-dyn', '1');
                document.body.appendChild(hidden);

                const props = { [P.PATH]: location.pathname, auto: true, ...rule.metadata };
                captureOnce(rule.key, props, { scopePath: rule.oncePerPath });
            }
        }
    }

    /* ---------- Apply All Rules -------------------------------- */
    function applyAllRules(rules, config, extractRevenueData, mutationObserver) {
        console.log('[ph-step-tracker] 🔍 applyAllRules called, found', rules?.length || 0, 'rules on path:', location.pathname);
        if (!Array.isArray(rules) || !rules.length) return;

        // Disconnect observer to prevent infinite loop
        if (mutationObserver) {
            mutationObserver.disconnect();
        }

        // Clear blocked rules for fresh evaluation
        blockedRules.clear();

        // Clean up stale tags
        document.querySelectorAll('[data-ph-tagged-dyn]').forEach(el => el.remove());
        document.querySelectorAll('[data-ph]').forEach(el => {
            const phAttr = el.getAttribute('data-ph');
            if (!phAttr) return;
            
            // Handle comma-separated event keys
            const eventKeys = phAttr.split(',').map(k => k.trim());
            const validKeys = eventKeys.filter(key => 
                rules.some(r => urlMatches(r) && r.key === key)
            );
            
            if (validKeys.length === 0) {
                el.removeAttribute('data-ph');
            } else if (validKeys.length !== eventKeys.length) {
                // Some keys are no longer valid - keep only valid ones
                el.setAttribute('data-ph', validKeys.join(','));
            }
        });

        rules.forEach(rule => tagElementsForRule(rule, config, extractRevenueData));

        // Reconnect observer
        if (mutationObserver) {
            mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    /* ---------- Extract Event Name from CSS Class -------------------------------- */
    function extractEventNameFromClass(element) {
        if (!element || !element.className) return null;
        
        const classList = element.className.split(' ');
        
        for (const className of classList) {
            if (className.startsWith('ph-track-')) {
                let eventName = className.replace('ph-track-', '');
                eventName = eventName.toUpperCase().replace(/-/g, '_');
                return eventName;
            }
        }
        
        return null;
    }

    /* ---------- Scan for ph-track-* Classes -------------------------------- */
    function scanForPhTrackClasses() {
        try {
            const elements = document.querySelectorAll('[class*="ph-track-"]');
            
            elements.forEach(element => {
                if (sentStepEls.has(element)) return;
                
                const eventName = extractEventNameFromClass(element);
                if (!eventName) return;
                
                if (autoFireEvents.includes(eventName)) {
                    const extras = productPropsFrom(element) || {};
                    
                    if (eventName === 'CHECKOUT_COMPLETED' || eventName === 'SUBSCRIPTION_COMPLETED') {
                        let revenueData = null;
                        
                        // PRIORITY 1: Try cached cart data (for cart-based clients)
                        try {
                            const cachedCart = sessionStorage.getItem('ph_cart_data');
                            if (cachedCart) {
                                const cartData = JSON.parse(cachedCart);
                                console.log('[ph-step-tracker] 💰 Using cached cart data for revenue:', cartData);
                                revenueData = {
                                    [P.REVENUE]: cartData.revenue.toFixed(2),
                                    [P.CURRENCY]: cartData.currency,
                                    subtotal: cartData.subtotal.toFixed(2),
                                    tax: cartData.tax.toFixed(2),
                                    discount: cartData.discount.toFixed(2),
                                    shipping: cartData.shipping.toFixed(2),
                                    gratuity: cartData.gratuity.toFixed(2),
                                    [P.PRODUCT]: cartData.product,
                                    product_names: cartData.product_names,
                                    item_count: cartData.item_count,
                                    total_quantity: cartData.total_quantity,
                                    cart_cached_at: cartData.cached_at
                                };
                                // Clear cached cart after using it
                                sessionStorage.removeItem('ph_cart_data');
                            }
                        } catch (e) {
                            console.warn('[ph-step-tracker] Failed to retrieve cached cart:', e);
                        }
                        
                        // PRIORITY 2: Calculate from static product data (for static pricing clients)
                        if (!revenueData) {
                            try {
                                const prod = sessionStorage.getItem('ph_last_product');
                                const price = sessionStorage.getItem('ph_last_price');
                                const curr = sessionStorage.getItem('ph_last_currency');
                                const qty = sessionStorage.getItem('ph_last_quantity') || '1';
                                
                                if (prod && price && curr) {
                                    const priceNum = parseFloat(price);
                                    const qtyNum = parseInt(qty, 10);
                                    const revenue = (priceNum * qtyNum).toFixed(2);
                                    
                                    console.log('[ph-step-tracker] 💰 Calculating revenue from static product:', {
                                        product: prod,
                                        price: price,
                                        quantity: qty,
                                        revenue: revenue
                                    });
                                    
                                    revenueData = {
                                        [P.PRODUCT]: prod,
                                        [P.PRICE]: price,
                                        [P.CURRENCY]: curr,
                                        [P.QUANTITY]: qty,
                                        [P.REVENUE]: revenue
                                    };
                                    
                                    // Clear product data after using it
                                    sessionStorage.removeItem('ph_last_product');
                                    sessionStorage.removeItem('ph_last_price');
                                    sessionStorage.removeItem('ph_last_currency');
                                    sessionStorage.removeItem('ph_last_quantity');
                                }
                            } catch (e) {
                                console.warn('[ph-step-tracker] Failed to calculate revenue from product data:', e);
                            }
                        }
                        
                        // PRIORITY 3: Fallback to DOM extraction
                        if (!revenueData) {
                            console.log('[ph-step-tracker] 💰 No cached data, extracting revenue from DOM');
                            revenueData = extractRevenueData(element);
                        }
                        
                        Object.assign(extras, revenueData);
                    }
                    
                    if (eventName === 'CONTENT_VIEWED') {
                        if (element.hasAttribute('data-content-title')) {
                            extras.content_title = element.getAttribute('data-content-title');
                        }
                    }
                    
                    captureOnce(eventName, { [P.PATH]: location.pathname, ...extras }, { scopePath: true });
                    sentStepEls.add(element);
                }
            });
        } catch (e) {
            console.warn('[ph-step-tracker] Failed to scan for ph-track-* classes:', e);
        }
    }

    /* ---------- Exports -------------------------------- */
    PHStepTracker.tagElementsForRule = tagElementsForRule;
    PHStepTracker.applyAllRules = applyAllRules;
    PHStepTracker.extractEventNameFromClass = extractEventNameFromClass;
    PHStepTracker.scanForPhTrackClasses = scanForPhTrackClasses;
    PHStepTracker.sentStepEls = sentStepEls;

    console.log('[ph-step-tracker] ✅ Step tracker module loaded');
})();
