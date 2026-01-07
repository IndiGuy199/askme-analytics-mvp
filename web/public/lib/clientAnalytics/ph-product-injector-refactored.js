/* ========================================================================
 * AskMe Analytics — ph-product-injector.js (REFACTORED v2.0)
 * Main orchestration layer - delegates to specialized modules
 * 
 * Module Dependencies (load order):
 * 1. ph-constants.js - Global constants and enums
 * 2. ph-utils.js - DOM utilities and helpers
 * 3. ph-identity.js - User identification bridge
 * 4. ph-event-capture.js - Event capture and queuing
 * 5. ph-product-extractors.js - Product metadata extraction
 * 6. ph-observers.js - DOM/route observers
 * 7. ph-step-tracker.js - Step tagging and rules
 * 8. THIS FILE - Orchestration and initialization
 * ======================================================================== */

(function () {
    'use strict';

    /* ---------- Dependency check -------------------------------- */
    const dependencies = [
        'PH_KEYS', 'PH_DATA_KEYS', 'PH_PRODUCT_DOM', 'PH_PRODUCT_EVENT', 'PH_PROPS',
        'PHUtils', 'PHEventCapture', 'PHExtractors', 'PHObservers', 'PHStepTracker', 'AMA'
    ];

    const missing = dependencies.filter(dep => !window[dep]);
    if (missing.length) {
        console.error('[ph-injector] ❌ Missing dependencies:', missing.join(', '));
        console.error('[ph-injector] ❌ Ensure all modules are loaded before ph-product-injector.js');
        return;
    }

    /* ---------- Module references -------------------------------- */
    const K = window.PH_DATA_KEYS;
    const EK = window.PH_KEYS;
    const DOM = window.PH_PRODUCT_DOM;
    const EV = window.PH_PRODUCT_EVENT;
    const P = window.PH_PROPS;

    const U = window.PHUtils;
    const Capture = window.PHEventCapture;
    const Extract = window.PHExtractors;
    const Observe = window.PHObservers;
    const Steps = window.PHStepTracker;

    /* ---------- State -------------------------------- */
    const sentButtons = new WeakSet();
    let hasAnyProductHint = false;
    
    /* ═══════════════════════════════════════════════════════════════════
     * LOCK PUBLIC API (window.AMA)
     * Prevents accidental overwrites of critical identity functions
     * ═══════════════════════════════════════════════════════════════════ */
    
    (function lockAMA() {
        const AMA = window.AMA;
        if (!AMA) {
            console.error('[ph-injector] ❌ AMA not found - ph-identity.js must load first');
            return;
        }
        
        // List of functions to lock (must be non-writable)
        const requiredFunctions = ['preAuthMark', 'afterLoginIdentify', 'onLogoutCleanup'];
        const optionalFunctions = ['_takePreAuthId', 'identifyUser'];
        
        // Verify required functions exist
        for (const fn of requiredFunctions) {
            if (typeof AMA[fn] !== 'function') {
                console.error('[ph-injector] ❌ Missing required AMA.' + fn);
                return;
            }
        }
        
        // Lock functions with Object.defineProperty
        const allFunctions = [...requiredFunctions, ...optionalFunctions];
        for (const fn of allFunctions) {
            if (typeof AMA[fn] === 'function') {
                const originalFn = AMA[fn];
                try {
                    Object.defineProperty(AMA, fn, {
                        value: originalFn,
                        writable: false,
                        configurable: false,
                        enumerable: true
                    });
                } catch (e) {
                    // Already locked or browser doesn't support
                    if (window.AskMeAnalyticsConfig?.debug) {
                        console.warn('[ph-injector] Could not lock AMA.' + fn + ':', e.message);
                    }
                }
            }
        }
        
        // Lock version and isReady
        try {
            Object.defineProperty(AMA, 'version', {
                value: AMA.version || '2.0.0',
                writable: false,
                configurable: false
            });
            Object.defineProperty(AMA, 'isReady', {
                value: true,
                writable: false,
                configurable: false
            });
        } catch (e) { /* ignore */ }
        
        // Debug mode self-test
        if (window.AskMeAnalyticsConfig?.debug) {
            console.log('[ph-injector] 🔒 AMA API locked. Contract:');
            console.log('  version:', AMA.version);
            console.log('  isReady:', AMA.isReady);
            console.log('  Functions:', Object.keys(AMA).filter(k => typeof AMA[k] === 'function'));
            
            // Verify overwrite protection
            try {
                AMA.preAuthMark = function() { return 'HACKED'; };
                console.warn('[ph-injector] ⚠️ AMA.preAuthMark was overwritten! Lock failed.');
            } catch (e) {
                console.log('[ph-injector] ✅ Overwrite protection working');
            }
        }
    })();
    
    /* ---------- Runtime Guards -------------------------------- */
    
    /**
     * Safe storage access - won't throw in private browsing mode
     */
    function safeStorage(type) {
        try {
            const storage = type === 'session' ? sessionStorage : localStorage;
            storage.setItem('__ph_test__', '1');
            storage.removeItem('__ph_test__');
            return storage;
        } catch { return null; }
    }
    
    function safeGetItem(type, key, fallback = null) {
        try {
            const storage = safeStorage(type);
            return storage ? (storage.getItem(key) ?? fallback) : fallback;
        } catch { return fallback; }
    }
    
    function safeSetItem(type, key, value) {
        try {
            const storage = safeStorage(type);
            if (storage) storage.setItem(key, value);
            return true;
        } catch { return false; }
    }
    
    /**
     * Safe number parsing - never returns NaN
     */
    function safeNumber(x, fallback = 0) {
        if (typeof x === 'number' && isFinite(x)) return x;
        if (typeof x === 'string') {
            const n = parseFloat(x.replace(/[^0-9.-]/g, ''));
            return isFinite(n) ? n : fallback;
        }
        return fallback;
    }
    
    function safePrice(x) { return safeNumber(x, 0).toFixed(2); }
    function safeQuantity(x) { return Math.max(1, Math.round(safeNumber(x, 1))); }
    
    /**
     * Safe PostHog capture - NOOP if posthog missing
     */
    function safeCapture(event, props) {
        try {
            if (window.posthog?.capture) {
                window.posthog.capture(event, props);
                return true;
            }
        } catch (e) {
            console.warn('[ph-injector] Capture failed:', e.message);
        }
        return false;
    }
    
    /* ---------- Helper Functions -------------------------------- */
    
    function text(el) {
        if (!el) return '';
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return el.value || '';
        return U.norm(el.textContent || el.innerText || '');
    }

    function parseNum(input) {
        if (typeof input === 'number') return input;
        if (!input || typeof input !== 'string') return 0;
        const stripped = input.replace(/[^0-9.-]/g, '');
        const n = parseFloat(stripped);
        return (isNaN(n) || !isFinite(n)) ? 0 : n;
    }

    function detectCurrency(textContent) {
        if (!textContent) return 'USD';
        const lowerText = textContent.toLowerCase();
        const currencyMap = {
            '$': 'USD', 'usd': 'USD', 'dollar': 'USD',
            '€': 'EUR', 'eur': 'EUR', 'euro': 'EUR',
            '£': 'GBP', 'gbp': 'GBP', 'pound': 'GBP',
            '¥': 'JPY', 'jpy': 'JPY', 'yen': 'JPY',
            '₹': 'INR', 'inr': 'INR', 'rupee': 'INR'
        };
        for (const [symbol, code] of Object.entries(currencyMap)) {
            if (lowerText.includes(symbol)) return code;
        }
        return 'USD';
    }

    /* ---------- Script configuration -------------------------------- */
    const SCRIPT =
        document.getElementById('ph-product-injector') ||
        Array.from(document.scripts).find(s => (s.id === 'ph-product-injector') || /ph-product-injector/.test(s.src));

    if (!SCRIPT) {
        console.warn('[ph-injector] Script tag not found. Analytics disabled.');
        return;
    }

    const DS = {
        eventName: SCRIPT.getAttribute(K.EVENT_NAME),
        pageMatch: SCRIPT.getAttribute(K.PAGE_MATCH),
        
        // Container selectors
        panelClass: SCRIPT.getAttribute(K.PANEL_CLASS),
        panelSelector: SCRIPT.getAttribute('data-panel-selector'),
        panelAttr: SCRIPT.getAttribute('data-panel-attr'),
        panelId: SCRIPT.getAttribute('data-panel-id'),
        panelXPath: SCRIPT.getAttribute('data-panel-xpath'),
        
        // Product/Title selectors
        titleClass: SCRIPT.getAttribute(K.TITLE_CLASS),
        titleAttr: SCRIPT.getAttribute(K.TITLE_ATTR),
        titleSelector: SCRIPT.getAttribute('data-title-selector'),
        titleId: SCRIPT.getAttribute('data-title-id'),
        titleXPath: SCRIPT.getAttribute('data-title-xpath'),
        
        // Price selectors
        priceClass: SCRIPT.getAttribute(K.PRICE_CLASS),
        priceAttr: SCRIPT.getAttribute(K.PRICE_ATTR),
        priceSelector: SCRIPT.getAttribute('data-price-selector'),
        priceId: SCRIPT.getAttribute('data-price-id'),
        priceXPath: SCRIPT.getAttribute('data-price-xpath'),
        
        // Currency selectors
        currencyClass: SCRIPT.getAttribute(K.CURRENCY_CLASS),
        currencySelector: SCRIPT.getAttribute('data-currency-selector'),
        currencyAttr: SCRIPT.getAttribute('data-currency-attr'),
        currencyId: SCRIPT.getAttribute('data-currency-id'),
        currencyXPath: SCRIPT.getAttribute('data-currency-xpath'),
        
        // Quantity selectors
        quantityClass: SCRIPT.getAttribute(K.QUANTITY_CLASS),
        quantityAttr: SCRIPT.getAttribute(K.QUANTITY_ATTR),
        quantitySelector: SCRIPT.getAttribute('data-quantity-selector'),
        quantityId: SCRIPT.getAttribute('data-quantity-id'),
        quantityXPath: SCRIPT.getAttribute('data-quantity-xpath'),
        
        // Dynamic elements
        stepsRaw: SCRIPT.getAttribute(K.STEPS),
        priceWatchSelectors: SCRIPT.getAttribute(K.PRICE_WATCH_SELECTORS),
        emailSelectors: SCRIPT.getAttribute(K.EMAIL_SELECTORS),
        buttonSelectors: SCRIPT.getAttribute(K.BUTTON_SELECTORS),
        productButtonSelectors: SCRIPT.getAttribute(K.PRODUCT_BUTTON_SELECTORS),
        
        // Checkbox selection
        checkboxMode: SCRIPT.getAttribute('data-checkbox-products') === 'true',
        checkboxItemSelector: SCRIPT.getAttribute('data-checkbox-item-selector')
    };

    // Check if any product hints are configured
    hasAnyProductHint = !!(
        DS.titleClass || DS.titleSelector || DS.titleAttr || DS.titleId || DS.titleXPath ||
        DS.priceClass || DS.priceSelector || DS.priceAttr || DS.priceId || DS.priceXPath ||
        DS.panelClass || DS.panelSelector || DS.panelAttr || DS.panelId || DS.panelXPath
    );

    /* ---------- Page gating -------------------------------- */
    function pageMatches(match) {
        if (!U.isNonEmptyStr(match)) return true;
        return location.pathname.includes(match.toLowerCase());
    }

    /* ---------- Product annotation -------------------------------- */
    function annotateSubmit(btn) {
        if (!btn) return;
        
        // Choose extraction strategy
        let props;
        if (DS.checkboxMode) {
            const container = Extract.guessContainer(btn, DS);
            props = Extract.extractFromCheckboxes(container, DS);
        } else {
            const container = Extract.guessContainer(btn, DS);
            props = Extract.extractFromContainer(container, DS);
        }
        
        if (!props) {
            console.warn('[ph-injector] Failed to extract product data for button:', btn);
            return;
        }
        
        // Annotate button
        btn.setAttribute(DOM.PRODUCT, props[P.PRODUCT]);
        btn.setAttribute(DOM.PRICE, String(props[P.PRICE]));
        btn.setAttribute(DOM.CURRENCY, props[P.CURRENCY]);
        btn.setAttribute(DOM.QUANTITY, String(props[P.QUANTITY] || '1'));
        
        sentButtons.add(btn);
    }

    function scanAndAnnotate() {
        if (!hasAnyProductHint) {
            console.warn('[ph-injector] No product hints configured. Skipping annotation.');
            return;
        }
        
        // Use specific button selectors or intelligent defaults
        let buttonSelector = DS.productButtonSelectors;
        
        if (!U.isNonEmptyStr(buttonSelector)) {
            buttonSelector = [
                'input[type="submit"]',
                'button[type="submit"]',
                'button:not([type])',
                'button[type="button"]'
            ].join(', ');
        }
        
        try {
            const buttons = document.querySelectorAll(buttonSelector);
            
            // Filter: only annotate buttons within pricing containers
            const pricingButtons = Array.from(buttons).filter(btn => {
                const container = Extract.guessContainer(btn, DS);
                return container && container !== document && container !== btn.parentElement;
            });
            
            pricingButtons.forEach(annotateSubmit);
            
        } catch (e) {
            console.error('[ph-injector] Invalid productButtonSelectors:', buttonSelector, e);
        }
    }

    /* ---------- Price change listeners -------------------------------- */
    function bindPriceChangeListeners() {
        let selectorString = DS.priceWatchSelectors;
        
        if (!U.isNonEmptyStr(selectorString)) {
            const defaultSelectors = [
                'select[id*="plan" i]', 'select[name*="plan" i]',
                'select[id*="interval" i]', 'select[name*="interval" i]',
                'input[type="radio"][name*="plan" i]',
                'input[type="radio"][name*="billing" i]'
            ];
            
            if (U.isNonEmptyStr(DS.priceClass)) {
                const priceClasses = U.parseMaybeJSONList(DS.priceClass);
                priceClasses.forEach(cls => {
                    defaultSelectors.push(`.${cls} select`);
                    defaultSelectors.push(`.${cls} input[type="radio"]`);
                });
            }
            
            selectorString = defaultSelectors.join(', ');
        }
        
        try {
            const priceInputs = document.querySelectorAll(selectorString);
            
            priceInputs.forEach(input => {
                if (input.hasAttribute('data-ph-price-watcher')) return;
                input.setAttribute('data-ph-price-watcher', 'true');
                
                input.addEventListener('change', () => {
                    setTimeout(() => {
                        scanAndAnnotate();
                    }, 100);
                });
            });
        } catch (e) {
            console.warn('[ph-injector] Invalid price watch selectors:', selectorString, e);
        }
    }

    /* ---------- Steps parsing -------------------------------- */
    function parseSteps() {
        if (!U.isNonEmptyStr(DS.stepsRaw)) return [];

        let raw = [];
        try { raw = JSON.parse(DS.stepsRaw); } catch { raw = []; }
        
        console.log('[ph-injector] 🔍 Raw steps before filter:', raw.length);
        const filtered = raw.filter(r => {
            const valid = r && typeof r === 'object' && r.key && Object.values(EK).includes(r.key);
            if (!valid && r?.key) {
                console.warn('[ph-injector] ⚠️ Filtered out step:', r.key, '- not in PH_KEYS');
            }
            return valid;
        });
        console.log('[ph-injector] 🔍 Steps after filter:', filtered.length);

        return filtered
            .map(r => {
                const rawSel = U.isNonEmptyStr(r.selector) ? r.selector.trim() : '';
                const list = U.selectorListFrom(rawSel);
                if (!list.length && U.isValidSelector(rawSel)) list.push(rawSel);

                return {
                    key: r.key,
                    selector: rawSel,
                    selectorList: list,
                    textRegex: U.isNonEmptyStr(r.textRegex) ? r.textRegex.trim() : '',
                    url: U.isNonEmptyStr(r.url) ? r.url.trim() : '',
                    urlMatch: /^(contains|exact|regex)$/i.test(r.urlMatch || '') ? r.urlMatch.toLowerCase() : 'contains',
                    priority: Number.isFinite(r.priority) ? r.priority : 100,
                    requireSelectorPresent: !!r.requireSelectorPresent,
                    autoFire: !!r.autoFire,
                    oncePerPath: (r.oncePerPath === false) ? false : true,
                    extractCart: !!r.extractCart,
                    blockRules: Array.isArray(r.blockRules) ? r.blockRules : [],
                    metadata: (r.metadata && typeof r.metadata === 'object') ? r.metadata : {}
                };
            })
            .sort((a, b) => (a.priority - b.priority) || a.key.localeCompare(b.key));
    }

    /* ---------- Product props from element -------------------------------- */
    function productPropsFrom(el) {
        if (!el) return null;

        // PRIORITY 1: Check for annotated data-product attributes (old productConfig)
        const a = el.getAttribute(DOM.PRODUCT);
        const b = el.getAttribute(DOM.PRICE);
        const c = el.getAttribute(DOM.CURRENCY);
        const q = el.getAttribute(DOM.QUANTITY);
        if (a && b && c) return { [P.PRODUCT]: a, [P.PRICE]: b, [P.CURRENCY]: c, [P.QUANTITY]: q || '1' };

        // Check nearest submit button
        const btn = el.closest('input[type="submit"], button[type="submit"]');
        if (btn) {
            const a2 = btn.getAttribute(DOM.PRODUCT);
            const b2 = btn.getAttribute(DOM.PRICE);
            const c2 = btn.getAttribute(DOM.CURRENCY);
            const q2 = btn.getAttribute(DOM.QUANTITY);
            if (a2 && b2 && c2) return { [P.PRODUCT]: a2, [P.PRICE]: b2, [P.CURRENCY]: c2, [P.QUANTITY]: q2 || '1' };
        }

        // Walk up parents for annotated attributes
        let p = el.parentElement, hops = 0;
        while (p && hops++ < 5) {
            const a3 = p.getAttribute?.(DOM.PRODUCT);
            const b3 = p.getAttribute?.(DOM.PRICE);
            const c3 = p.getAttribute?.(DOM.CURRENCY);
            const q3 = p.getAttribute?.(DOM.QUANTITY);
            if (a3 && b3 && c3) return { [P.PRODUCT]: a3, [P.PRICE]: b3, [P.CURRENCY]: c3, [P.QUANTITY]: q3 || '1' };
            p = p.parentElement;
        }

        // PRIORITY 2: Try cartExtractorConfig extraction (new unified config)
        const config = window.AskMeAnalyticsConfig;
        if (config && config.cartExtractorConfig && window.PHCartExtractor) {
            try {
                // Find the pricing card/cart item containing this element
                const cartItem = el.closest(config.cartExtractorConfig.cartItemSelector);
                if (cartItem) {
                    const itemData = window.PHCartExtractor.extractCartItem(cartItem, config.cartExtractorConfig);
                    if (itemData) {
                        const currency = detectCurrency(text(cartItem));
                        return {
                            [P.PRODUCT]: itemData.product,
                            [P.PRODUCT_NAME]: itemData.name,
                            [P.PRICE]: itemData.unit_price.toFixed(2),
                            [P.CURRENCY]: currency,
                            [P.QUANTITY]: String(itemData.quantity || 1)
                        };
                    }
                }
            } catch (e) {
                console.warn('[ph-injector] Failed to extract via cartExtractorConfig:', e);
            }
        }

        return null;
    }

    /* ---------- Cart Extraction Helpers -------------------------------- */
    
    /**
     * Check if button should trigger cart extraction
     */
    function isCartCheckoutButton(btn) {
        if (!btn || !window.PHCartExtractor) return false;
        
        const config = window.AskMeAnalyticsConfig;
        if (!config || !config.cartExtractorConfig) return false;
        
        // Check if any step has extractCart: true
        const cartSteps = (config.steps || []).filter(step => step.extractCart === true);
        if (cartSteps.length === 0) return false;
        
        // Check if button matches any cart step selector
        return cartSteps.some(step => {
            if (!step.selector) return false;
            try {
                return btn.matches && btn.matches(step.selector);
            } catch (e) {
                return false;
            }
        });
    }

    /**
     * Handle cart-based checkout submission
     */
    function handleCartCheckout(btn, eventKey = 'CHECKOUT_SUBMITTED') {
        const config = window.AskMeAnalyticsConfig;
        if (!config || !config.cartExtractorConfig) {
            console.warn('[ph-injector] Cart config not found');
            return false;
        }
        
        const cartData = window.PHCartExtractor.extractCartData(config.cartExtractorConfig);
        
        if (!cartData) {
            console.warn('[ph-injector] Failed to extract cart data');
            return false;
        }
        
        const props = window.PHCartExtractor.formatCartPropertiesForPostHog(cartData);
        
        if (props) {
            console.log('[ph-injector] 🛒 Cart checkout detected:', props);
            
            // Cache cart data for CHECKOUT_COMPLETED event
            try {
                sessionStorage.setItem('ph_cart_data', JSON.stringify({
                    revenue: cartData.total,
                    currency: cartData.currency,
                    subtotal: cartData.subtotal,
                    tax: cartData.tax,
                    discount: cartData.discount,
                    shipping: cartData.shipping,
                    gratuity: cartData.gratuity,
                    items: cartData.items,
                    product_names: props.product_names,
                    product: props[P.PRODUCT],
                    item_count: cartData.items.length,
                    total_quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
                    cached_at: new Date().toISOString()
                }));
                console.log('[ph-injector] 💾 Cart data cached for checkout completion');
            } catch (e) {
                console.warn('[ph-injector] Failed to cache cart data:', e);
            }
            
            Capture.captureOnce(eventKey, props, { scopePath: true });
            return true;
        }
        
        return false;
    }

    /* ---------- Cart Item Event Tracking -------------------------------- */
    
    /**
     * Track "Add to Cart" events (PRODUCT_SELECTED)
     */
    function trackAddToCart(button) {
        const config = window.AskMeAnalyticsConfig;
        if (!config || !config.cartExtractorConfig) return;

        try {
            // Find the product modal/container for this add button
            const productModal = button.closest('[class*="modal"], [class*="product"], [role="dialog"]') || 
                               button.closest('form') ||
                               document.querySelector('[class*="modal"][style*="display: block"]');
            
            if (!productModal) {
                console.warn('[ph-injector] Cannot find product container for add to cart');
                return;
            }

            const cfg = config.cartExtractorConfig;
            
            // Extract product name
            const nameEl = U.findFirstElement({
                selector: cfg.modalProductNameSelector || cfg.cartItemNameSelector,
                class: cfg.modalProductNameClass
            }, productModal);
            
            const productName = nameEl ? text(nameEl).trim() : 'Unknown Product';
            
            // Extract price
            const priceEl = U.findFirstElement({
                selector: cfg.modalProductPriceSelector || cfg.cartItemPriceSelector,
                class: cfg.modalProductPriceClass
            }, productModal);
            
            const price = priceEl ? parseNum(text(priceEl)) : 0;
            
            // Extract quantity
            const qtyEl = U.findFirstElement({
                selector: cfg.modalQuantitySelector || 'input[type="number"]',
                class: cfg.modalQuantityClass
            }, productModal);
            
            const quantity = qtyEl ? parseInt(qtyEl.value || '1', 10) : 1;
            
            // Extract sub-selections (soup/salad choices)
            const subSelections = [];
            const subSelEls = U.findElements({
                selector: cfg.modalSubSelectionsSelector || 'input[type="radio"]:checked, select option:checked',
                class: cfg.modalSubSelectionsClass
            }, productModal);
            
            subSelEls.forEach(el => {
                const label = el.closest('label') || el.parentElement;
                const selText = text(label || el).trim();
                if (selText) subSelections.push(selText);
            });
            
            // Extract add-ons (beverages, extras)
            const addOns = [];
            const addOnEls = U.findElements({
                selector: cfg.modalAddOnsSelector || 'input[type="checkbox"]:checked',
                class: cfg.modalAddOnsClass
            }, productModal);
            
            addOnEls.forEach(el => {
                const container = el.closest('[class*="option"], [class*="addon"], li') || el.parentElement;
                const nameEl = U.first(container, '[class*="name"], label, span');
                const priceEl = U.first(container, '[class*="price"]');
                
                const addOnName = text(nameEl || el.parentElement).trim();
                const addOnPrice = priceEl ? parseNum(text(priceEl)) : 0;
                
                if (addOnName) {
                    addOns.push({ name: addOnName, price: addOnPrice });
                }
            });
            
            const itemTotal = price + addOns.reduce((sum, addon) => sum + addon.price, 0);
            
            // Detect currency
            const currencyText = text(priceEl || productModal);
            const currency = detectCurrency(currencyText);
            
            const props = {
                [P.PRODUCT_NAME]: productName,
                [P.PRODUCT]: productName.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_'),
                [P.PRICE]: price.toFixed(2),
                [P.CURRENCY]: currency,
                [P.QUANTITY]: quantity,
                [P.ITEM_TOTAL]: itemTotal.toFixed(2),
                [P.SUB_SELECTIONS]: subSelections.join(', '),
                [P.ADD_ONS]: addOns.map(a => `${a.name} ($${a.price.toFixed(2)})`).join(', '),
                add_ons_count: addOns.length,
                sub_selections_count: subSelections.length,
                [P.PATH]: location.pathname
            };
            
            console.log('[ph-injector] 🛒 PRODUCT_SELECTED:', props);
            Capture.captureOnce(EK.PRODUCT_SELECTED, props, { scopePath: false });
            
        } catch (e) {
            console.warn('[ph-injector] Failed to track add to cart:', e);
        }
    }
    
    /**
     * Track "Remove from Cart" events (PRODUCT_REMOVED)
     */
    function trackRemoveFromCart(button) {
        try {
            // Find the cart item container
            const cartItem = button.closest('[class*="cart-item"], [class*="item"], li');
            if (!cartItem) {
                console.warn('[ph-injector] Cannot find cart item for remove button');
                return;
            }
            
            const config = window.AskMeAnalyticsConfig;
            const cfg = config?.cartExtractorConfig || {};
            
            // Extract product name
            const nameEl = U.findFirstElement({
                selector: cfg.cartItemNameSelector,
                class: cfg.cartItemNameClass
            }, cartItem);
            
            const productName = nameEl ? text(nameEl).trim() : 'Unknown Product';
            
            // Extract quantity
            const qtyEl = U.findFirstElement({
                selector: cfg.cartItemQuantitySelector || '[class*="quantity"]',
                class: cfg.cartItemQuantityClass
            }, cartItem);
            
            const qtyText = qtyEl ? text(qtyEl) : '1';
            const quantity = parseInt(qtyText.match(/\d+/)?.[0] || '1', 10);
            
            // Extract price
            const priceEl = U.findFirstElement({
                selector: cfg.cartItemPriceSelector || cfg.cartItemTotalSelector,
                class: cfg.cartItemPriceClass
            }, cartItem);
            
            const price = priceEl ? parseNum(text(priceEl)) : 0;
            
            const props = {
                [P.PRODUCT_NAME]: productName,
                [P.PRODUCT]: productName.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_'),
                [P.PRICE]: price.toFixed(2),
                [P.QUANTITY]: quantity,
                [P.PATH]: location.pathname
            };
            
            console.log('[ph-injector] 🗑️ PRODUCT_REMOVED:', props);
            Capture.captureOnce(EK.PRODUCT_REMOVED, props, { scopePath: false });
            
        } catch (e) {
            console.warn('[ph-injector] Failed to track remove from cart:', e);
        }
    }

    /* ---------- Global click capture -------------------------------- */
    function bindGlobalClick() {
        const productEventName = DS.eventName || EV.DEFAULT_NAME || 'product_click';

        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // (A1) Track "Add to Cart" buttons (PRODUCT_SELECTED)
            const addToCartBtn = target.closest && target.closest(
                'button[class*="add"], button, input[type="submit"], input[type="button"]'
            );
            
            if (addToCartBtn && (
                addToCartBtn.textContent.match(/add\s+to\s+cart/i) ||
                addToCartBtn.textContent.match(/^add$/i) ||
                addToCartBtn.className.match(/add.*cart/i) ||
                addToCartBtn.value?.match(/add/i)
            )) {
                trackAddToCart(addToCartBtn);
            }
            
            // (A2) Track "Remove" buttons (PRODUCT_REMOVED)
            const removeBtn = target.closest && target.closest(
                'button[class*="remove"], button, a[class*="remove"], [role="button"]'
            );
            
            if (removeBtn && (
                removeBtn.textContent.match(/remove/i) ||
                removeBtn.className.match(/remove/i)
            )) {
                trackRemoveFromCart(removeBtn);
            }

            // (B) data-ph steps (can have comma-separated event keys)
            const stepEl = target.closest && target.closest('[data-ph]');
            if (stepEl && !Steps.sentStepEls.has(stepEl)) {
                const phAttr = stepEl.getAttribute('data-ph');
                if (U.isNonEmptyStr(phAttr)) {
                    // Split by comma to handle multiple events on same element
                    const eventNames = phAttr.split(',').map(n => n.trim()).filter(n => n);
                    
                    eventNames.forEach(name => {
                        // Check if this step should extract cart data
                        const config = window.AskMeAnalyticsConfig;
                        const step = config?.steps?.find(s => s.key === name);
                        
                        let extras = {};
                        
                        if (step && step.extractCart && config.cartExtractorConfig && window.PHCartExtractor) {
                            // Use cart extraction
                            const cartData = window.PHCartExtractor.extractCartData(config.cartExtractorConfig);
                            if (cartData) {
                                extras = window.PHCartExtractor.formatCartPropertiesForPostHog(cartData) || {};
                                
                                // Cache cart data for CHECKOUT_COMPLETED
                                try {
                                    sessionStorage.setItem('ph_cart_data', JSON.stringify({
                                        revenue: cartData.total,
                                        currency: cartData.currency,
                                        subtotal: cartData.subtotal,
                                        tax: cartData.tax,
                                        discount: cartData.discount,
                                        shipping: cartData.shipping,
                                        gratuity: cartData.gratuity,
                                        items: cartData.items,
                                        product_names: extras.product_names,
                                        product: extras[P.PRODUCT],
                                        item_count: cartData.items.length,
                                        total_quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
                                        cached_at: new Date().toISOString()
                                    }));
                                    console.log('[ph-injector] 💾 Cart data cached for:', name);
                                } catch (e) {
                                    console.warn('[ph-injector] Failed to cache cart:', e);
                                }
                            }
                        } else {
                            // Use standard product extraction
                            extras = productPropsFrom(stepEl) || {};
                        }
                        
                        if (name === EK.CHECKOUT_COMPLETED || name === EK.SUBSCRIPTION_COMPLETED) {
                            const revenueData = Extract.extractRevenueData(stepEl);
                            Object.assign(extras, revenueData);
                        }
                        
                        Capture.captureOnce(name, { [P.PATH]: location.pathname, ...extras }, { scopePath: true });
                    });
                    
                    Steps.sentStepEls.add(stepEl);
                }
            }
            
            // (C) ph-track-* CSS class convention
            const phTrackEl = target.closest && target.closest('[class*="ph-track-"]');
            if (phTrackEl && !Steps.sentStepEls.has(phTrackEl)) {
                const eventName = Steps.extractEventNameFromClass(phTrackEl);
                if (eventName) {
                    // Check if this event should extract cart data
                    const config = window.AskMeAnalyticsConfig;
                    const step = config?.steps?.find(s => s.key === eventName);
                    
                    let extras = {};
                    
                    if (step && step.extractCart && config.cartExtractorConfig && window.PHCartExtractor) {
                        // Use cart extraction
                        const cartData = window.PHCartExtractor.extractCartData(config.cartExtractorConfig);
                        if (cartData) {
                            extras = window.PHCartExtractor.formatCartPropertiesForPostHog(cartData) || {};
                            
                            // Cache cart data for CHECKOUT_COMPLETED
                            try {
                                sessionStorage.setItem('ph_cart_data', JSON.stringify({
                                    revenue: cartData.total,
                                    currency: cartData.currency,
                                    subtotal: cartData.subtotal,
                                    tax: cartData.tax,
                                    discount: cartData.discount,
                                    shipping: cartData.shipping,
                                    gratuity: cartData.gratuity,
                                    items: cartData.items,
                                    product_names: extras.product_names,
                                    product: extras[P.PRODUCT],
                                    item_count: cartData.items.length,
                                    total_quantity: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
                                    cached_at: new Date().toISOString()
                                }));
                                console.log('[ph-injector] 💾 Cart data cached for:', eventName);
                            } catch (e) {
                                console.warn('[ph-injector] Failed to cache cart:', e);
                            }
                        }
                    } else {
                        // Use standard product extraction
                        extras = productPropsFrom(phTrackEl) || {};
                    }
                    
                    if (eventName === EK.CHECKOUT_COMPLETED || eventName === EK.SUBSCRIPTION_COMPLETED) {
                        const revenueData = Extract.extractRevenueData(phTrackEl);
                        Object.assign(extras, revenueData);
                    }
                    
                    Capture.captureOnce(eventName, { [P.PATH]: location.pathname, ...extras }, { scopePath: true });
                    Steps.sentStepEls.add(phTrackEl);
                }
            }

            // (C) Product submit click (with cart detection)
            const isSubmit =
                (target.matches && target.matches('input[type="submit"], button[type="submit"]')) ||
                (target.closest && target.closest('input[type="submit"], button[type="submit"]'));
            
            if (isSubmit) {
                const btn = target.closest('input[type="submit"], button[type="submit"]');
                if (btn && !sentButtons.has(btn)) {
                    // PRIORITY 1: Check if this is a cart checkout button
                    if (isCartCheckoutButton(btn)) {
                        console.log('[ph-injector] 🛒 Cart checkout button detected');
                        const handled = handleCartCheckout(btn, 'CHECKOUT_SUBMITTED');
                        if (handled) {
                            sentButtons.add(btn);
                            return; // Skip standard product tracking
                        }
                    }
                    
                    // PRIORITY 2: Standard product tracking (existing behavior)
                    if (U.isNonEmptyStr(productEventName)) {
                        if (!btn.hasAttribute(DOM.PRODUCT) && hasAnyProductHint) annotateSubmit(btn);
                        const prod = btn.getAttribute(DOM.PRODUCT);
                        const price = btn.getAttribute(DOM.PRICE);
                        const curr = btn.getAttribute(DOM.CURRENCY);
                        const qty = btn.getAttribute(DOM.QUANTITY) || '1';
                        
                        if (prod && price && curr) {
                            // Store in sessionStorage for checkout completion
                            try {
                                sessionStorage.setItem('ph_last_product', prod);
                                sessionStorage.setItem('ph_last_price', price);
                                sessionStorage.setItem('ph_last_currency', curr);
                                sessionStorage.setItem('ph_last_quantity', qty);
                            } catch (e) {
                                console.warn('[ph-injector] sessionStorage not available:', e);
                            }
                            
                            Capture.captureOnce(
                                productEventName,
                                { 
                                    [P.PRODUCT]: prod, 
                                    [P.PRICE]: price, 
                                    [P.CURRENCY]: curr, 
                                    [P.QUANTITY]: qty,
                                    [P.PATH]: location.pathname 
                                },
                                { scopePath: true }
                            );
                            sentButtons.add(btn);
                        }
                    }
                }
            }
        }, true); // capture phase
    }

    /* ---------- SPA hooks -------------------------------- */
    function hookSPA() {
        const wrap = (t) => {
            const orig = history[t];
            return function () {
                const r = orig.apply(this, arguments);
                window.dispatchEvent(new Event('ph:routechange'));
                return r;
            };
        };
        try { 
            history.pushState = wrap('pushState'); 
            history.replaceState = wrap('replaceState'); 
        } catch {}
        window.addEventListener('popstate', () => window.dispatchEvent(new Event('ph:routechange')));
    }

    /* ---------- Route/mutation handlers -------------------------------- */
    function onRoute() {
        const rules = parseSteps();
        Steps.applyAllRules(rules, DS, Extract.extractRevenueData, window.__phMutationObserver);
        
        if (pageMatches(DS.pageMatch)) {
            scanAndAnnotate();
            bindPriceChangeListeners();
        }
        
        Steps.scanForPhTrackClasses(Extract.extractRevenueData, productPropsFrom);
    }

    function onMutations(muts) {
        if (muts.some(m => m.addedNodes && m.addedNodes.length)) {
            const rules = parseSteps();
            Steps.applyAllRules(rules, DS, Extract.extractRevenueData, window.__phMutationObserver);
            
            if (pageMatches(DS.pageMatch)) {
                scanAndAnnotate();
                bindPriceChangeListeners();
            }
        }
    }

    /* ---------- UTM capture -------------------------------- */
    function captureUTMParams() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            
            if (urlParams.has('utm_source')) {
                sessionStorage.setItem('ph_utm_source', urlParams.get('utm_source'));
            }
            if (urlParams.has('utm_medium')) {
                sessionStorage.setItem('ph_utm_medium', urlParams.get('utm_medium'));
            }
            if (urlParams.has('utm_campaign')) {
                sessionStorage.setItem('ph_utm_campaign', urlParams.get('utm_campaign'));
            }
            
            // Facebook/Google click IDs
            if (urlParams.has('fbclid')) {
                sessionStorage.setItem('ph_fbclid', urlParams.get('fbclid'));
                if (!sessionStorage.getItem('ph_utm_source')) {
                    sessionStorage.setItem('ph_utm_source', 'facebook');
                    sessionStorage.setItem('ph_utm_medium', 'cpc');
                }
            }
            if (urlParams.has('gclid')) {
                sessionStorage.setItem('ph_gclid', urlParams.get('gclid'));
                if (!sessionStorage.getItem('ph_utm_source')) {
                    sessionStorage.setItem('ph_utm_source', 'google');
                    sessionStorage.setItem('ph_utm_medium', 'cpc');
                }
            }
        } catch (e) {
            console.warn('[ph-injector] Failed to capture channel tracking parameters:', e);
        }
    }

    /* ---------- Boot -------------------------------- */
    function boot() {
        try {
            console.log('[ph-injector] 🚀 Boot function called (REFACTORED v2.0)');
            
            captureUTMParams();
            
            const rules = parseSteps();
            Steps.applyAllRules(rules, DS, Extract.extractRevenueData, null);
            
            if (pageMatches(DS.pageMatch)) {
                scanAndAnnotate();
                bindPriceChangeListeners();
            }
            
            bindGlobalClick();
            Steps.scanForPhTrackClasses(Extract.extractRevenueData, productPropsFrom);

            // Fire events for existing hidden inputs
            document
                .querySelectorAll('input[type="hidden"][data-ph]')
                .forEach((n) => {
                    try {
                        const name = n.getAttribute('data-ph');
                        if (U.isNonEmptyStr(name)) {
                            Capture.captureOnce(name, { [P.PATH]: location.pathname, auto: true }, { scopePath: true });
                        }
                    } catch (e) {
                        console.warn('[ph-injector] Failed to process hidden input:', e);
                    }
                });
        } catch (e) {
            console.error('[ph-injector] Boot failed:', e);
        }
    }

    /* ---------- Initialize -------------------------------- */
    try {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(boot, 0);
        } else {
            window.addEventListener('DOMContentLoaded', boot, { once: true });
        }
        window.addEventListener('load', boot);

        hookSPA();
        
        // Setup observers with error handling
        Observe.onMutation((muts) => {
            try {
                onMutations(muts);
            } catch (e) {
                console.warn('[ph-injector] Mutation handler error:', e);
            }
        });
        Observe.onRouteChange(onRoute);
        Observe.startMutationObserver(document.documentElement);
        Observe.startRouteObserver();
        
        // Store mutation observer reference globally
        window.__phMutationObserver = {
            disconnect: () => Observe.stopMutationObserver(),
            observe: (target, config) => Observe.startMutationObserver(target, config)
        };
        
        window.addEventListener('ph:routechange', () => setTimeout(onRoute, 0));

        console.log('[ph-injector] ✅ Injector orchestration layer initialized (v2.0)');
    } catch (e) {
        console.error('[ph-injector] Initialization failed:', e);
    }
})();
