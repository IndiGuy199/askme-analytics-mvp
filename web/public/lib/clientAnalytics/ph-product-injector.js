/* ========================================================================
* AskMe Analytics — ph-product-injector.js
* Requires: /resources/js/common/ph-constants.js (must be loaded first)
*
* Features:
    *  - Dynamic Step Tagging (URL-gated; selector/textRegex/hidden)
*  - requireSelectorPresent: fire once on load if selector exists (plus tag)
*  - autoFire: fire once on load when URL matches (selector not required)
*  - oncePerPath: dedupe per route (default true; can be disabled per rule)
*  - blockRules: conditional rule blocking (error states prevent success states)
*  - priority: rule evaluation order (lower number = higher priority)
*  - Product metadata annotation (data-product, data-price, data-currency)
*  - Step-clicks include product props (Option A)
*  - Custom product event via data-event-name (or default from constants)
*  - SPA resilience + MutationObserver
*  - Robust selector handling (CSV / JSON-array / bad values)
* ======================================================================== */

(function () {
    /* ========================================================================
     * BACKEND-AGNOSTIC IDENTITY BRIDGE (v1.2.0)
     * Exposes AMA.preAuthMark(), AMA.afterLoginIdentify(), AMA.onLogoutCleanup()
     * Works with any auth system (Email+Password, SSO, Magic Link)
     * ======================================================================== */
    window.AMA = window.AMA || {};

    /** 1) Call right before starting any login (form submit or SSO click) */
    window.AMA.preAuthMark = function () {
        try {
            const ph = window.posthog;
            const preId = ph?.get_distinct_id?.() || null;
            if (preId) sessionStorage.setItem('ama:pre_ph_id', preId);
            return preId;
        } catch { return null; }
    };

    /** helper to read the pre-login id after auth */
    window.AMA._takePreAuthId = function () {
        try {
            const v = sessionStorage.getItem('ama:pre_ph_id');
            if (v) return v;
        } catch {}
        try {
            const u = new URL(location.href);
            return u.searchParams.get('ph_id'); // optional fallback if passed via URL/state
        } catch {}
        return null;
    };

    /** 2) Call after login succeeds and you have the verified user */
    window.AMA.afterLoginIdentify = function (user, props = {}) {
        const ph = window.posthog;
        if (!ph?.identify || !user?.id) return;

        const current = ph?.get_distinct_id?.();
        const ssKey = `ph_ss_identified_${user.id}`;
        if (sessionStorage.getItem(ssKey) === '1' || current === user.id) {
            sessionStorage.setItem(ssKey, '1');
            return;
        }

        // Merge pre-login history
        const carried = window.AMA._takePreAuthId();
        if (carried && carried !== user.id && typeof ph.alias === 'function') {
            ph.alias(user.id, carried);
        }

        // Identify with stable props
        ph.identify(user.id, { email: user.email, ...props });

        // Optional org-level analytics
        if (props.company_id && typeof ph.group === 'function') {
            ph.group('company', props.company_id, {
                company_name: props.company_name,
                company_slug: props.company_slug,
            });
        }

        ph.capture?.('USER_IDENTIFIED', { identification_method: 'post_login', page: location.pathname });

        sessionStorage.setItem(ssKey, '1');
        try { localStorage.setItem(`posthog_identified_${user.id}`, user.id); } catch {}
    };

    /** 3) Call on logout */
    window.AMA.onLogoutCleanup = function (userId) {
        try {
            if (userId) {
                localStorage.removeItem(`posthog_identified_${userId}`);
                sessionStorage.removeItem(`ph_ss_identified_${userId}`);
            }
            sessionStorage.removeItem('ama:pre_ph_id');
        } catch {}
        window.posthog?.reset?.();
    };

    /* ---------- 0) Require enums, never redefine -------------------------- */
    const K  = window.PH_DATA_KEYS;
    const EK = window.PH_KEYS;
    const DOM = window.PH_PRODUCT_DOM;
    const EV  = window.PH_PRODUCT_EVENT;
    const P   = window.PH_PROPS;

    if (!K || !EK || !DOM || !EV || !P) {
        console.warn('[ph-injector] Missing constants. Ensure ph-constants.js is loaded first.');
        return;
    }

    /* ---------- 1) Small utils (defensive) -------------------------------- */
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const isNonEmptyStr = (x) => typeof x === 'string' && x.trim() !== '';

    function isLikelyBadSelector(s) {
        if (!isNonEmptyStr(s)) return true;
        const t = s.trim();
        if (t === '[]' || t === '{}' || t === 'null' || t === 'undefined') return true;
        // whole JSON blobs are not valid CSS selectors
        if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) return true;
        return false;
    }

    function isValidSelector(s) {
        if (!isNonEmptyStr(s)) return false;
        try {
            document.createDocumentFragment().querySelector(s);
            return true;
        } catch { return false; }
    }

    // Accepts string or JSON-array string; returns an array of strings (trimmed)
    function parseMaybeJSONList(input) {
        if (!isNonEmptyStr(input)) return [];
        const t = input.trim();
        if (t === '[]' || t === '{}' || t === 'null' || t === 'undefined') return [];
        if (t.startsWith('[') && t.endsWith(']')) {
            try {
                const arr = JSON.parse(t);
                return Array.isArray(arr) ? arr.map(x => String(x || '').trim()).filter(Boolean) : [];
            } catch { return []; }
        }
        return [t];
    }

    // Build list of selectors from CSV or JSON-array string
    function selectorListFrom(input) {
        const items = parseMaybeJSONList(input).flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean);
        // keep only syntactically valid selectors
        return items.filter(isValidSelector);
    }

    // Convert a “class-like” input (single string or JSON-array) into a CSV of .class selectors
    function classToSelectorCsv(input) {
        const classes = parseMaybeJSONList(input);
        const sels = [];
        for (const cls of classes) {
            // support "a b" -> ".a.b"
            const dot = norm(cls).split(/\s+/).filter(Boolean).map(c => '.' + c).join('');
            if (dot) sels.push(dot);
        }
        return sels.join(',');
    }

    function splitSelectorsCsv(selCsv) {
        if (!isNonEmptyStr(selCsv)) return [];
        return selCsv.split(',').map((s) => s.trim()).filter(isValidSelector);
    }

    function qsa(sel, root = document) {
        if (!isNonEmptyStr(sel) || isLikelyBadSelector(sel)) return [];
        try { return Array.from(root.querySelectorAll(sel)); } catch { return []; }
    }

    function first(root, selCsv) {
        const list = splitSelectorsCsv(selCsv);
        for (const s of list) {
            try {
                const el = root.querySelector(s);
                if (el) return el;
            } catch { /* skip invalid */ }
        }
        return null;
    }

    function ciRegex(str) {
        if (!isNonEmptyStr(str)) return null;
        const ci = str.startsWith('(?i)');
        const body = ci ? str.slice(4) : str;
        try { return new RegExp(body, ci ? 'i' : undefined); } catch { return null; }
    }

    function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect?.();
        const style = window.getComputedStyle(el);
        return (
            !!rect &&
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
        );
    }

    /* ---------- 1b) Multi-strategy selector evaluation -------------------- */
    /**
     * Evaluate XPath expression and return matching elements
     * @param {string} xpath - XPath expression
     * @param {Node} context - Context node (default: document)
     * @returns {Array<Element>} Array of matching elements
     */
    function evaluateXPath(xpath, context = document) {
        if (!isNonEmptyStr(xpath)) return [];
        try {
            const result = document.evaluate(
                xpath,
                context,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            const elements = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                const node = result.snapshotItem(i);
                if (node.nodeType === Node.ELEMENT_NODE) {
                    elements.push(node);
                }
            }
            return elements;
        } catch (e) {
            console.warn('[ph-injector] Invalid XPath:', xpath, e);
            return [];
        }
    }

    /**
     * Build a CSS selector from multiple strategy options
     * Checks in order of precedence: Selector > Class > Attr > Id
     * @param {Object} options - Selector options {selector, class, attr, id, xpath}
     * @returns {string} Combined CSS selector or empty string
     */
    function buildSelector(options) {
        const { selector, class: cls, attr, id } = options;
        
        // Priority 1: Full CSS selector (highest priority)
        if (isNonEmptyStr(selector) && isValidSelector(selector)) {
            return selector;
        }
        
        // Priority 2: CSS classes
        if (isNonEmptyStr(cls)) {
            const classSel = classToSelectorCsv(cls);
            if (classSel && isValidSelector(classSel)) {
                return classSel;
            }
        }
        
        // Priority 3: Data attribute
        if (isNonEmptyStr(attr)) {
            const attrSel = `[${attr}]`;
            if (isValidSelector(attrSel)) {
                return attrSel;
            }
        }
        
        // Priority 4: Element ID
        if (isNonEmptyStr(id)) {
            const idSel = `#${id}`;
            if (isValidSelector(idSel)) {
                return idSel;
            }
        }
        
        return '';
    }

    /**
     * Find elements using multi-strategy approach
     * Tries: selector > class > attr > id > xpath
     * @param {Object} options - Selector options
     * @param {Node} context - Context node (default: document)
     * @returns {Array<Element>} Array of matching elements
     */
    function findElements(options, context = document) {
        // Try CSS-based strategies first
        const cssSelector = buildSelector(options);
        if (cssSelector) {
            const elements = qsa(cssSelector, context);
            if (elements.length > 0) return elements;
        }
        
        // Priority 5: XPath (last resort)
        if (isNonEmptyStr(options.xpath)) {
            const elements = evaluateXPath(options.xpath, context);
            if (elements.length > 0) return elements;
        }
        
        return [];
    }

    /**
     * Find first element using multi-strategy approach
     * @param {Object} options - Selector options
     * @param {Node} context - Context node (default: document)
     * @returns {Element|null} First matching element or null
     */
    function findFirstElement(options, context = document) {
        const elements = findElements(options, context);
        return elements.length > 0 ? elements[0] : null;
    }

    /* ---------- 2) PostHog queue + dedupe -------------------------------- */
    // 🆕 Enhanced: Load from sessionStorage for persistence across quick reloads
    const sentOncePath = (() => {
        if (window.__phFiredOnce) return window.__phFiredOnce;
        
        try {
            const stored = sessionStorage.getItem('__phFiredOnce');
            return window.__phFiredOnce = stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return window.__phFiredOnce = new Set();
        }
    })();
    
    const sentButtons  = new WeakSet();   // submit/product elements
    const sentStepEls  = new WeakSet();   // data-ph elements
    const identifiedEmails = new Set();  // ✅ Track identified emails to prevent duplicates
    const blockedRules = new Set();      // 🆕 Track which rules are currently blocked
    const queue = [];
    let phReady = false;

    function flushPH() {
        if (window.posthog && typeof window.posthog.capture === 'function') {
            phReady = true;
            while (queue.length) {
                const { name, props } = queue.shift();
                try { window.posthog.capture(name, props); } catch (e) { console.warn('[ph-injector] capture failed', e); }
            }
        }
    }
    (function pollPH() {
        if (!phReady) {
            flushPH();
            if (!phReady) setTimeout(pollPH, 150);
        }
    })();

    function captureOnce(name, props = {}, { scopePath = true } = {}) {
        if (!isNonEmptyStr(name)) return;
        const key = scopePath ? `${name}::${location.pathname}` : name;
        if (scopePath && sentOncePath.has(key)) return;
        if (scopePath) {
            sentOncePath.add(key);
            // 🆕 Persist to sessionStorage to survive quick reloads
            try {
                sessionStorage.setItem('__phFiredOnce', JSON.stringify([...sentOncePath]));
            } catch (e) {
                // Silent fail if sessionStorage is not available
            }
        }

        // 🆕 Enhanced revenue tracking for purchase completion events
        const purchaseEvents = [EK.SUBSCRIPTION_COMPLETED, EK.CHECKOUT_COMPLETED];
        if (purchaseEvents.includes(name)) {
            // Add referrer
            if (document.referrer) {
                props[P.REFERRER] = document.referrer;
            }
            
            // Calculate revenue = price × quantity
            const price = parseFloat(props[P.PRICE] || props.price || '0');
            const quantity = parseInt(props[P.QUANTITY] || props.quantity || '1', 10);
            const revenue = price * quantity;
            
            // Add comprehensive revenue properties
            props[P.REVENUE] = revenue.toFixed(2);
            props[P.UNIT_PRICE] = price.toFixed(2);
            props[P.QUANTITY] = String(quantity);
            
            // Normalize product_name and product_id
            if (props[P.PRODUCT]) {
                props[P.PRODUCT_NAME] = props[P.PRODUCT];
                props[P.PRODUCT_ID] = props[P.PRODUCT];
            }
            
            // Extract UTM parameters from URL
            try {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('utm_source')) props[P.UTM_SOURCE] = urlParams.get('utm_source');
                if (urlParams.has('utm_medium')) props[P.UTM_MEDIUM] = urlParams.get('utm_medium');
                if (urlParams.has('utm_campaign')) props[P.UTM_CAMPAIGN] = urlParams.get('utm_campaign');
                
                // Try to get UTM from sessionStorage if not in current URL
                if (!props[P.UTM_SOURCE]) {
                    const storedSource = sessionStorage.getItem('ph_utm_source');
                    if (storedSource) props[P.UTM_SOURCE] = storedSource;
                }
            } catch (e) {
                console.warn('[ph-injector] Failed to extract UTM parameters:', e);
            }
        }

        if (phReady) {
            try { window.posthog.capture(name, props); } catch (e) { console.warn('[ph-injector] capture failed', e); }
        } else {
            queue.push({ name, props });
        }
    }

    // ✅ NEW: PostHog identify function
    function identifyUser(email, properties = {}) {
        if (!isNonEmptyStr(email) || identifiedEmails.has(email)) return;
        identifiedEmails.add(email);

        if (phReady && window.posthog.identify) {
            try { 
                window.posthog.identify(email, { email, identified_via: 'injector', ...properties }); 
                console.log('[ph-injector] User identified:', email);
            } catch (e) { 
                console.warn('[ph-injector] identify failed', e); 
            }
        } else {
            // Queue identify calls if PostHog isn't ready yet
            setTimeout(() => identifyUser(email, properties), 100);
        }
    }

    /* ---------- 3) Current script & dataset ------------------------------- */
    const SCRIPT =
        document.getElementById('ph-product-injector') ||
        Array.from(document.scripts).find(s => (s.id === 'ph-product-injector') || /ph-product-injector/.test(s.src));

    if (!SCRIPT) return;

    const DS = {
        eventName     : SCRIPT.getAttribute(K.EVENT_NAME),
        pageMatch     : SCRIPT.getAttribute(K.PAGE_MATCH),
        
        // === PANEL/CONTAINER SELECTORS (multiple strategies) ===
        panelClass    : SCRIPT.getAttribute(K.PANEL_CLASS),
        panelSelector : SCRIPT.getAttribute('data-panel-selector'),
        panelAttr     : SCRIPT.getAttribute('data-panel-attr'),
        panelId       : SCRIPT.getAttribute('data-panel-id'),
        panelXPath    : SCRIPT.getAttribute('data-panel-xpath'),
        
        // === TITLE SELECTORS (multiple strategies) ===
        titleClass    : SCRIPT.getAttribute(K.TITLE_CLASS),
        titleAttr     : SCRIPT.getAttribute(K.TITLE_ATTR),
        titleSelector : SCRIPT.getAttribute('data-title-selector'),
        titleId       : SCRIPT.getAttribute('data-title-id'),
        titleXPath    : SCRIPT.getAttribute('data-title-xpath'),
        
        // === PRICE SELECTORS (multiple strategies) ===
        priceClass    : SCRIPT.getAttribute(K.PRICE_CLASS),
        priceAttr     : SCRIPT.getAttribute(K.PRICE_ATTR),
        priceSelector : SCRIPT.getAttribute('data-price-selector'),
        priceId       : SCRIPT.getAttribute('data-price-id'),
        priceXPath    : SCRIPT.getAttribute('data-price-xpath'),
        
        // === CURRENCY SELECTORS (multiple strategies) ===
        currencyClass : SCRIPT.getAttribute(K.CURRENCY_CLASS),
        currencySelector : SCRIPT.getAttribute('data-currency-selector'),
        currencyAttr  : SCRIPT.getAttribute('data-currency-attr'),
        currencyId    : SCRIPT.getAttribute('data-currency-id'),
        currencyXPath : SCRIPT.getAttribute('data-currency-xpath'),
        
        // === QUANTITY SELECTORS (multiple strategies) ===
        quantityClass : SCRIPT.getAttribute(K.QUANTITY_CLASS),
        quantityAttr  : SCRIPT.getAttribute(K.QUANTITY_ATTR),
        quantitySelector : SCRIPT.getAttribute('data-quantity-selector'),
        quantityId    : SCRIPT.getAttribute('data-quantity-id'),
        quantityXPath : SCRIPT.getAttribute('data-quantity-xpath'),
        
        // Other configurations
        stepsRaw      : SCRIPT.getAttribute(K.STEPS),
        priceWatchSelectors : SCRIPT.getAttribute(K.PRICE_WATCH_SELECTORS),
        emailSelectors      : SCRIPT.getAttribute(K.EMAIL_SELECTORS),
        buttonSelectors     : SCRIPT.getAttribute(K.BUTTON_SELECTORS),
        productButtonSelectors : SCRIPT.getAttribute(K.PRODUCT_BUTTON_SELECTORS)
    };

    /* ---------- 4) Page gating -------------------------------------------- */
    function pageMatches(match) {
        if (!isNonEmptyStr(match)) return true;
        const pathQ = location.pathname + location.search;
        const looksRegex = /^\/.*\/$/.test(match) || /[\\^$.*+?()[\]{}|]/.test(match);
        if (looksRegex) {
            try { return new RegExp(match, 'i').test(pathQ); } catch { /* fallthrough */ }
        }
        return pathQ.toLowerCase().includes(match.toLowerCase());
    }

    /* ---------- 5) Product annotation ------------------------------------ */
    const hasAnyProductHint =
        isNonEmptyStr(DS.panelSelector) ||
        isNonEmptyStr(DS.panelClass) ||
        isNonEmptyStr(DS.panelAttr) ||
        isNonEmptyStr(DS.panelId) ||
        isNonEmptyStr(DS.panelXPath) ||
        isNonEmptyStr(DS.titleSelector) ||
        isNonEmptyStr(DS.titleClass) ||
        isNonEmptyStr(DS.titleAttr) ||
        isNonEmptyStr(DS.titleId) ||
        isNonEmptyStr(DS.titleXPath) ||
        isNonEmptyStr(DS.priceSelector) ||
        isNonEmptyStr(DS.priceClass) ||
        isNonEmptyStr(DS.priceAttr) ||
        isNonEmptyStr(DS.priceId) ||
        isNonEmptyStr(DS.priceXPath) ||
        isNonEmptyStr(DS.currencySelector) ||
        isNonEmptyStr(DS.currencyClass) ||
        isNonEmptyStr(DS.currencyAttr) ||
        isNonEmptyStr(DS.currencyId) ||
        isNonEmptyStr(DS.currencyXPath);

    function guessContainer(btn) {
        // 🆕 Priority 1: Try configured panel selector (multi-strategy)
        const panelSelector = buildSelector({
            selector: DS.panelSelector,
            class: DS.panelClass,
            attr: DS.panelAttr,
            id: DS.panelId
        });
        
        if (panelSelector) {
            try {
                const container = btn.closest(panelSelector);
                if (container) return container;
            } catch (e) {
                console.warn('[ph-injector] Invalid panel selector:', panelSelector, e);
            }
        }
        
        // Priority 2: XPath for panel (if configured)
        if (isNonEmptyStr(DS.panelXPath)) {
            // XPath doesn't have a "closest" equivalent, so we check ancestors
            let ancestor = btn.parentElement;
            while (ancestor && ancestor !== document.documentElement) {
                const matches = evaluateXPath(DS.panelXPath, document);
                if (matches.includes(ancestor)) return ancestor;
                ancestor = ancestor.parentElement;
            }
        }
        
        // Priority 3: Try default pricing container markers
        const directContainer = btn.closest('.price-card, .pricing-card, .pricing-tier, .plan-card, .product-card');
        if (directContainer) return directContainer;
        
        // Priority 4: Heuristic scan upward for price/product hints
        let p = btn.parentElement, hops = 0;
        const priceSelector = buildSelector({
            selector: DS.priceSelector,
            class: DS.priceClass,
            attr: DS.priceAttr,
            id: DS.priceId
        });
        
        while (p && hops++ < 6) {
            const cls = (p.className || '').toString();
            if (/\b(price|panel|card|plan|tier|product)\b/i.test(cls)) return p;
            if (priceSelector && first(p, priceSelector)) return p;
            if (DS.titleAttr && p.hasAttribute && p.hasAttribute(DS.titleAttr)) return p;
            p = p.parentElement;
        }
        
        return btn.parentElement || document;
    }

    function text(el) { return norm(el?.textContent || ''); }
    
    function parseNum(s) {
        const cleaned = norm(s).toLowerCase();
        
        // Check for "free" or "$0"
        if (cleaned.includes('free') || cleaned.includes('trial')) {
            return '0.00';
        }
        
        // Detect format by checking structure
        // European: 1.234,56 or 1234,56 (comma as decimal separator)
        // US: 1,234.56 or 1234.56 (dot as decimal separator)
        const hasCommaDecimal = /\d+[.,]\d+,\d{2}/.test(cleaned) || /^\D*\d{1,3}\.\d{3},\d{2}/.test(cleaned);
        
        if (hasCommaDecimal) {
            // European format: 1.234,56 → 1234.56
            // Remove everything except digits and comma, then replace comma with dot
            const converted = cleaned.replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.');
            const m = converted.match(/-?\d+(\.\d+)?/);
            return m ? m[0] : null;
        } else if (/\d+[.,]\d+\.\d{2}/.test(cleaned) || /^\D*\d{1,3},\d{3}\.\d{2}/.test(cleaned)) {
            // US format: 1,234.56 → 1234.56
            // Remove everything except digits and dot
            const converted = cleaned.replace(/[^\d.]/g, '');
            const m = converted.match(/-?\d+(\.\d+)?/);
            return m ? m[0] : null;
        }
        
        // Fallback: detect by last separator
        // If last separator is comma, it's European; if dot, it's US
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        
        if (lastComma > lastDot && lastComma > 0) {
            // European: comma is decimal separator
            const converted = cleaned.replace(/[^\d,]/g, '').replace(/,/g, '.');
            const m = converted.match(/-?\d+(\.\d+)?/);
            return m ? m[0] : null;
        } else {
            // US or simple number: dot is decimal separator
            const converted = cleaned.replace(/[^\d.]/g, '');
            const m = converted.match(/-?\d+(\.\d+)?/);
            return m ? m[0] : null;
        }
    }

    function extractFrom(container) {
        if (!container) container = document;

        // === PRODUCT/TITLE EXTRACTION (multi-strategy) ===
        let product = null;
        
        // Try to find title element using multi-strategy selector
        const titleElement = findFirstElement({
            selector: DS.titleSelector,
            class: DS.titleClass,
            attr: DS.titleAttr,
            id: DS.titleId,
            xpath: DS.titleXPath
        }, container);
        
        if (titleElement) {
            // Priority 1: Check for titleAttr on the found element
            if (DS.titleAttr && titleElement.hasAttribute && titleElement.hasAttribute(DS.titleAttr)) {
                product = titleElement.getAttribute(DS.titleAttr);
            }
            // Priority 2: Use element's text content
            if (!product) {
                product = text(titleElement);
            }
        }
        
        // Fallback: Check container itself for titleAttr
        if (!product && DS.titleAttr && container.hasAttribute && container.hasAttribute(DS.titleAttr)) {
            product = container.getAttribute(DS.titleAttr);
        }

        // === PRICE EXTRACTION (multi-strategy) ===
        let price = null;
        
        // Try to find price element using multi-strategy selector
        const priceElement = findFirstElement({
            selector: DS.priceSelector,
            class: DS.priceClass,
            attr: DS.priceAttr,
            id: DS.priceId,
            xpath: DS.priceXPath
        }, container);
        
        if (priceElement) {
            // Priority 1: Check for priceAttr on the found element
            if (DS.priceAttr && priceElement.hasAttribute && priceElement.hasAttribute(DS.priceAttr)) {
                price = priceElement.getAttribute(DS.priceAttr);
            }
            // Priority 2: Parse from element's text content
            if (!price) {
                price = parseNum(text(priceElement));
            }
        }
        
        // Fallback: Check container itself for priceAttr
        if (!price && DS.priceAttr && container.hasAttribute && container.hasAttribute(DS.priceAttr)) {
            price = container.getAttribute(DS.priceAttr);
        }

        // === CURRENCY EXTRACTION (multi-strategy) ===
        let currency = 'USD'; // Default to USD
        
        // Try to find currency element using multi-strategy selector
        const currencyElement = findFirstElement({
            selector: DS.currencySelector,
            class: DS.currencyClass,
            attr: DS.currencyAttr,
            id: DS.currencyId,
            xpath: DS.currencyXPath
        }, container);
        
        if (currencyElement) {
            // Priority 1: Check for currencyAttr on the found element
            if (DS.currencyAttr && currencyElement.hasAttribute && currencyElement.hasAttribute(DS.currencyAttr)) {
                const raw = currencyElement.getAttribute(DS.currencyAttr).trim().toUpperCase();
                currency = raw || 'USD';
            }
            // Priority 2: Parse from element's text content
            else {
                const raw = text(currencyElement).replace('$', '').trim();
                currency = /^us$/i.test(raw) ? 'USD' : (raw || 'USD').toUpperCase();
            }
        }
        // Fallback 1: Extract currency from price text itself
        else if (priceElement) {
            const priceText = text(priceElement);
            const currencyMap = {
                '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR', 
                'C$': 'CAD', 'A$': 'AUD', '$': 'USD',
                'eur': 'EUR', 'gbp': 'GBP', 'jpy': 'JPY', 'inr': 'INR',
                'cad': 'CAD', 'aud': 'AUD', 'usd': 'USD'
            };
            
            for (const [symbol, code] of Object.entries(currencyMap)) {
                if (priceText.toLowerCase().includes(symbol.toLowerCase())) {
                    currency = code;
                    break;
                }
            }
        }

        // === QUANTITY EXTRACTION (multi-strategy) ===
        let quantity = '1'; // default to 1
        
        // Try to find quantity element using multi-strategy selector
        const quantityElement = findFirstElement({
            selector: DS.quantitySelector,
            class: DS.quantityClass,
            attr: DS.quantityAttr,
            id: DS.quantityId,
            xpath: DS.quantityXPath
        }, container);
        
        if (quantityElement) {
            // Handle input/select elements
            if (quantityElement.tagName === 'INPUT' || quantityElement.tagName === 'SELECT') {
                quantity = quantityElement.value || '1';
            }
            // Check for quantity attribute
            else if (DS.quantityAttr && quantityElement.hasAttribute && quantityElement.hasAttribute(DS.quantityAttr)) {
                quantity = quantityElement.getAttribute(DS.quantityAttr) || '1';
            }
            // Parse from text content
            else {
                const parsedQty = parseNum(text(quantityElement));
                if (parsedQty && parsedQty !== '0.00') {
                    quantity = parsedQty;
                }
            }
        }
        
        // Fallback 1: Check container for quantity attribute
        if (quantity === '1' && DS.quantityAttr && container.hasAttribute && container.hasAttribute(DS.quantityAttr)) {
            quantity = container.getAttribute(DS.quantityAttr);
        }
        
        // Fallback 2: Try common quantity input selectors
        if (quantity === '1') {
            const commonSelectors = 'input[name*="quantity" i], input[name*="qty" i], select[name*="quantity" i], .quantity input, .qty input';
            const qn = first(container, commonSelectors);
            if (qn && (qn.tagName === 'INPUT' || qn.tagName === 'SELECT')) {
                quantity = qn.value || '1';
            }
        }
        
        // Ensure quantity is a valid number
        const parsedQty = parseFloat(quantity);
        if (isNaN(parsedQty) || parsedQty < 1) {
            quantity = '1';
        } else {
            quantity = String(Math.floor(parsedQty)); // Convert to integer string
        }

        const prodNorm = (product ? product.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') : 'unknown_product');
        return { 
            [P.PRODUCT]: prodNorm, 
            [P.PRICE]: price || '0.00', 
            [P.CURRENCY]: currency,
            [P.QUANTITY]: quantity
        };
    }

    function annotateSubmit(btn) {
        if (!btn) return;
        
        // Always re-extract to get latest prices (for dynamic changes)
        const container = guessContainer(btn);
        const props = extractFrom(container);
        
        if (!props) {
            console.warn('[ph-injector] Failed to extract product data for button:', btn);
            return;
        }
        
        // Update or set attributes (always update for dynamic prices)
        btn.setAttribute(DOM.PRODUCT,  props[P.PRODUCT]);
        btn.setAttribute(DOM.PRICE,    String(props[P.PRICE]));
        btn.setAttribute(DOM.CURRENCY, props[P.CURRENCY]);
        btn.setAttribute(DOM.QUANTITY, String(props[P.QUANTITY] || '1'));
        
        console.log('[ph-injector] ✅ Annotated button with product data:', {
            button: btn,
            product: props[P.PRODUCT],
            price: props[P.PRICE],
            currency: props[P.CURRENCY],
            container: container
        });
        
        sentButtons.add(btn);
    }

    function scanAndAnnotate() {
        if (!hasAnyProductHint) {
            console.warn('[ph-injector] No product hints configured. Skipping annotation.');
            return;
        }
        
        // 🆕 FIXED: Use specific button selectors instead of scanning ALL buttons
        let buttonSelector = DS.productButtonSelectors;
        
        // Fallback: If no specific selector provided, use intelligent defaults for PRICING buttons only
        if (!isNonEmptyStr(buttonSelector)) {
            buttonSelector = [
                'input[type="submit"]',
                'button[type="submit"]',
                // Only target buttons that look like pricing CTAs
                'button:not([type])',  // Buttons without type (common in React)
                'button[type="button"]'
            ].join(', ');
            
            console.warn('[ph-injector] No productButtonSelectors configured. Using default:', buttonSelector);
            console.warn('[ph-injector] Consider configuring productButtonSelectors for more precise targeting.');
        }
        
        try {
            const buttons = document.querySelectorAll(buttonSelector);
            console.log(`[ph-injector] Found ${buttons.length} buttons matching selector: "${buttonSelector}"`);
            
            // Additional filtering: only annotate buttons within pricing containers
            const pricingButtons = Array.from(buttons).filter(btn => {
                const container = guessContainer(btn);
                // Only annotate if button is inside a container that has pricing info
                const hasContainer = container && container !== document && container !== btn.parentElement;
                if (!hasContainer) {
                    console.log('[ph-injector] Skipping button (no valid container):', btn);
                }
                return hasContainer;
            });
            
            console.log(`[ph-injector] Annotating ${pricingButtons.length} buttons with product data`);
            pricingButtons.forEach(annotateSubmit);
            
        } catch (e) {
            console.error('[ph-injector] Invalid productButtonSelectors:', buttonSelector, e);
        }
    }

    // 🆕 UPDATED: Configurable price change listeners - no hardcoding
    function bindPriceChangeListeners() {
        // If no configuration provided, use intelligent defaults
        let selectorString = DS.priceWatchSelectors;
        
        if (!isNonEmptyStr(selectorString)) {
            // Fallback: Build selectors dynamically based on common patterns
            const defaultSelectors = [
                'select[id*="plan" i]',
                'select[name*="plan" i]',
                'select[id*="interval" i]',
                'select[name*="interval" i]',
                'select[id*="price" i]',
                'select[name*="price" i]',
                'input[type="radio"][name*="plan" i]',
                'input[type="radio"][name*="interval" i]',
                'input[type="radio"][name*="billing" i]',
                'input[type="radio"][name*="price" i]'
            ];
            
            // If client provided priceClass, add those as watch targets
            if (isNonEmptyStr(DS.priceClass)) {
                const priceClasses = parseMaybeJSONList(DS.priceClass);
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

    /* ---------- 6) Steps parsing (enhanced + selector fallback) ----------- */
    function parseSteps() {
        if (!isNonEmptyStr(DS.stepsRaw)) return [];

        let raw = [];
        try { raw = JSON.parse(DS.stepsRaw); } catch { raw = []; }

        return raw
            .filter(r => r && typeof r === 'object' && r.key && Object.values(EK).includes(r.key))
            .map(r => {
                const rawSel = isNonEmptyStr(r.selector) ? r.selector.trim() : '';
                const list = selectorListFrom(rawSel);
                // fallback: if selectorListFrom stripped it out, but raw is valid CSS, keep it
                if (!list.length && isValidSelector(rawSel)) list.push(rawSel);

                return {
                    key: r.key,
                    selector: rawSel,          // keep the original string too
                    selectorList: list,        // array of selectors (CSV / JSON / fallback)
                    textRegex: isNonEmptyStr(r.textRegex) ? r.textRegex.trim() : '',
                    url: isNonEmptyStr(r.url) ? r.url.trim() : '',
                    urlMatch: /^(contains|exact|regex)$/i.test(r.urlMatch || '') ? r.urlMatch.toLowerCase() : 'contains',
                    priority: Number.isFinite(r.priority) ? r.priority : 100,
                    requireSelectorPresent: !!r.requireSelectorPresent,
                    autoFire: !!r.autoFire,
                    oncePerPath: (r.oncePerPath === false) ? false : true,
                    blockRules: Array.isArray(r.blockRules) ? r.blockRules : [],  // 🆕 NEW: Rules to block if this fires
                    metadata: (r.metadata && typeof r.metadata === 'object') ? r.metadata : {}
                };
            })
            .sort((a, b) => (a.priority - b.priority) || a.key.localeCompare(b.key));
    }

    function urlMatches(rule) {
        if (!rule || !isNonEmptyStr(rule.url)) return true;
        const u = (location.pathname + location.search) || '';
        switch (rule.urlMatch) {
            case 'exact':   return u === rule.url;
            case 'regex':   { const rx = ciRegex(rule.url) || new RegExp(rule.url); return rx.test(u); }
            case 'contains':
            default:        return u.toLowerCase().includes(String(rule.url).toLowerCase());
        }
    }

   /* ---------- 7) Apply a single rule (respects selector fallback) ------- */
    function tagElementsForRule(rule) {
        if (!rule || !rule.key) return;
        if (!urlMatches(rule)) return;

        // 🆕 CHECK: Skip if this rule is blocked by another rule
        if (blockedRules.has(rule.key)) {
            console.log(`[DEBUG] Rule "${rule.key}" is blocked by another rule`);
            return;
        }

        // autoFire independent of selector
        if (rule.autoFire) {
            const props = { [P.PATH]: location.pathname, ...rule.metadata };
            captureOnce(rule.key, props, { scopePath: rule.oncePerPath });
        }

        // --- Collect all visible elements across all selectors (no hidden fields) ---
        const bucket = new Set();

// 1) gather all matching visible elements for all selectors
        const sels = (rule.selectorList && rule.selectorList.length)
            ? rule.selectorList
            : (isValidSelector(rule.selector) ? [rule.selector] : []);

        for (const sel of sels) {
            const allMatches = qsa(sel);
            console.log(`[DEBUG] Selector "${sel}" found ${allMatches.length} elements`);
            
            allMatches.forEach((el, index) => {
                const visible = isVisible(el);
                const isHiddenInput = el.tagName === 'INPUT' && el.type === 'hidden';
                console.log(`[DEBUG] Element ${index + 1}: visible=${visible}, hiddenInput=${isHiddenInput}`, el);
                
                if (visible && !isHiddenInput) {
                    bucket.add(el);
                }
            });
        }

        console.log(`[DEBUG] Rule "${rule.key}" tagged ${Array.from(bucket).length} visible elements`);

        // 2) 🆕 UPDATED: Configurable textRegex fallback - no hardcoding
        if (!bucket.size && isNonEmptyStr(rule.textRegex)) {
            const rx = ciRegex(rule.textRegex);
            if (rx) {
                // Use client-provided button selectors, or fall back to intelligent defaults
                const buttonSelector = DS.buttonSelectors || 
                    'button, a, input[type="submit"], input[type="button"], [role="button"]';
                
                try {
                    Array.from(document.querySelectorAll(buttonSelector))
                        .filter(isVisible)
                        .forEach(el => {
                            const txt = el.tagName === 'INPUT'
                                ? (el.getAttribute('value') || '')
                                : (el.textContent || '');
                            if (rx.test(norm(txt))) bucket.add(el);
                        });
                } catch (e) {
                    console.warn('[ph-injector] Invalid button selectors:', buttonSelector, e);
                }
            }
        }

        const targets = Array.from(bucket);

        // 🆕 NEW: If this rule found elements and has blockRules, block those rules
        if (targets.length && rule.blockRules && rule.blockRules.length) {
            rule.blockRules.forEach(blockedKey => {
                blockedRules.add(blockedKey);
                console.log(`[DEBUG] Rule "${rule.key}" is blocking "${blockedKey}"`);
            });
        }

// --- NEW: Handle requireSelectorPresent differently ---
        if (rule.requireSelectorPresent) {
            // For requireSelectorPresent, we only check if visible elements exist
            // We DON'T tag them, but we DO fire the event and create a hidden element
            if (targets.length) {
                // Check if hidden element already exists
                const hiddenSel = `input[type="hidden"][data-ph="${rule.key}"]`;
                if (!document.querySelector(hiddenSel)) {
                    // Create hidden element
                    const hidden = document.createElement('input');
                    hidden.type = 'hidden';
                    hidden.setAttribute('data-ph', rule.key);
                    hidden.setAttribute('data-ph-tagged-dyn', '1');
                    document.body.appendChild(hidden);

                    // Fire the event once
                    const props = { [P.PATH]: location.pathname, matched: 'selector', ...rule.metadata };
                    captureOnce(rule.key, props, { scopePath: rule.oncePerPath });
                    console.log(`[DEBUG] Rule "${rule.key}" created hidden element (requireSelectorPresent)`);
                }
            }
            return; // Exit early - don't tag visible elements
        }

// --- Tag all visible elements safely (only if NOT requireSelectorPresent) ---
        if (targets.length) {
            targets.forEach((el) => {
                const existing = el.getAttribute('data-ph');
                // Only skip if element already has a DIFFERENT rule key
                if (existing && existing !== rule.key) return;
                // Always set the current rule key (handles both new elements and re-tagging)
                el.setAttribute('data-ph', rule.key);
            });
            return;
        }

    // --- Hidden rule fallback (unchanged) ---
        const hasMatchers = (sels.length > 0) || isNonEmptyStr(rule.textRegex);
        const wantsAutoHidden = (!hasMatchers) || rule.autoFire === true;
        if (wantsAutoHidden) {
            const hiddenSel = `input[type="hidden"][data-ph="${rule.key}"]`;
            if (!document.querySelector(hiddenSel)) {

                if (rule.requireSelectorPresent && sels.length) {
                    const any = sels.some(sel => qsa(sel).some(isVisible));
                    if (!any) return; // no visible match yet → do nothing
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

    function applyAllRules() {
        const rules = parseSteps();
        if (!Array.isArray(rules) || !rules.length) return;

        // 🛡️ Disconnect MutationObserver to prevent infinite loop
        if (window.__phMutationObserver) {
            window.__phMutationObserver.disconnect();
        }

        // 🆕 Clear blocked rules for fresh evaluation on each run
        blockedRules.clear();

        // 🧹 Clean up previously injected dynamic tags that no longer match
        document.querySelectorAll('[data-ph-tagged-dyn]').forEach(el => el.remove());
        // Optional: clear stale data-ph on elements when URL no longer matches any rule
        document.querySelectorAll('[data-ph]').forEach(el => {
            const name = el.getAttribute('data-ph');
            const stillValid = rules.some(r => urlMatches(r) && r.key === name);
            if (!stillValid) el.removeAttribute('data-ph');
        });


        rules.forEach(tagElementsForRule);

        // 🛡️ Reconnect MutationObserver after DOM modifications are complete
        if (window.__phMutationObserver) {
            window.__phMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    /* ---------- 8) Product props from any element (for step clicks) ------- */
    function productPropsFrom(el) {
        if (!el) return null;

        // 1) element itself
        const a = el.getAttribute(DOM.PRODUCT);
        const b = el.getAttribute(DOM.PRICE);
        const c = el.getAttribute(DOM.CURRENCY);
        const q = el.getAttribute(DOM.QUANTITY);
        if (a && b && c) return { [P.PRODUCT]: a, [P.PRICE]: b, [P.CURRENCY]: c, [P.QUANTITY]: q || '1' };

        // 2) nearest submit
        const btn = el.closest('input[type="submit"], button[type="submit"]');
        if (btn) {
            const a2 = btn.getAttribute(DOM.PRODUCT);
            const b2 = btn.getAttribute(DOM.PRICE);
            const c2 = btn.getAttribute(DOM.CURRENCY);
            const q2 = btn.getAttribute(DOM.QUANTITY);
            if (a2 && b2 && c2) return { [P.PRODUCT]: a2, [P.PRICE]: b2, [P.CURRENCY]: c2, [P.QUANTITY]: q2 || '1' };
        }

        // 3) walk up a bit
        let p = el.parentElement, hops = 0;
        while (p && hops++ < 5) {
            const a3 = p.getAttribute?.(DOM.PRODUCT);
            const b3 = p.getAttribute?.(DOM.PRICE);
            const c3 = p.getAttribute?.(DOM.CURRENCY);
            const q3 = p.getAttribute?.(DOM.QUANTITY);
            if (a3 && b3 && c3) return { [P.PRODUCT]: a3, [P.PRICE]: b3, [P.CURRENCY]: c3, [P.QUANTITY]: q3 || '1' };
            p = p.parentElement;
        }
        return null;
    }

    /* ---------- 9) Global click capture (steps + product event) ----------- */
    function bindGlobalClick() {
        const productEventName = DS.eventName || EV.DEFAULT_NAME || 'product_click';

        document.addEventListener('click', (e) => {
            const target = e.target;

            // (A) data-ph steps
            const stepEl = target.closest && target.closest('[data-ph]');
            if (stepEl && !sentStepEls.has(stepEl)) {
                const name = stepEl.getAttribute('data-ph');
                if (isNonEmptyStr(name)) {
                    const extras = productPropsFrom(stepEl) || {};
                    captureOnce(name, { [P.PATH]: location.pathname, ...extras }, { scopePath: true });
                    sentStepEls.add(stepEl);
                }
            }

            // (B) product submit click -> custom product event
            const isSubmit =
                (target.matches && target.matches('input[type="submit"], button[type="submit"]')) ||
                (target.closest && target.closest('input[type="submit"], button[type="submit"]'));
            if (isSubmit && isNonEmptyStr(productEventName)) {
                const btn = target.closest('input[type="submit"], button[type="submit"]');
                if (btn && !sentButtons.has(btn)) {
                    if (!btn.hasAttribute(DOM.PRODUCT) && hasAnyProductHint) annotateSubmit(btn);
                    const prod = btn.getAttribute(DOM.PRODUCT);
                    const price = btn.getAttribute(DOM.PRICE);
                    const curr = btn.getAttribute(DOM.CURRENCY);
                    const qty = btn.getAttribute(DOM.QUANTITY) || '1';
                    if (prod && price && curr) {
                        // Store product data in sessionStorage for checkout completion
                        try {
                            sessionStorage.setItem('ph_last_product', prod);
                            sessionStorage.setItem('ph_last_price', price);
                            sessionStorage.setItem('ph_last_currency', curr);
                            sessionStorage.setItem('ph_last_quantity', qty);
                        } catch (e) {
                            console.warn('[ph-product-injector] sessionStorage not available:', e);
                        }
                        
                        captureOnce(
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
        }, true); // capture phase
    }

    /* ---------- 9.5) Email identification functionality ------------------- */
    function isValidEmail(email) {
        return /\S+@\S+\.\S+/.test(email);
    }

    function tryIdentifyFromEmail(emailInput) {
        if (!emailInput || emailInput.hasAttribute('data-ph-identify-bound')) return;
        emailInput.setAttribute('data-ph-identify-bound', 'true');

        const handleEmailIdentification = () => {
            const email = (emailInput.value || '').trim();
            if (email && isValidEmail(email)) {
                // Extract additional context from the form
                const form = emailInput.closest('form');
                const additionalProps = {};
                
                // Try to get name from nearby fields
                if (form) {
                    const nameInput = form.querySelector('input[name*="name" i], input[placeholder*="name" i]');
                    if (nameInput && nameInput.value) {
                        additionalProps.name = nameInput.value.trim();
                    }
                    
                    // Capture form context
                    const formId = form.id || form.className || 'unknown_form';
                    additionalProps.form_context = formId;
                    additionalProps.page_context = location.pathname;
                }

                identifyUser(email, additionalProps);
            }
        };

        // Bind to multiple events for better coverage
        emailInput.addEventListener('blur', handleEmailIdentification, { once: true });
        
        // Also bind to form submit for backup identification
        const form = emailInput.closest('form');
        if (form && !form.hasAttribute('data-ph-identify-form-bound')) {
            form.setAttribute('data-ph-identify-form-bound', 'true');
            form.addEventListener('submit', handleEmailIdentification, { once: true });
        }
    }

    // 🆕 UPDATED: Configurable email input scanning - no hardcoding
    function scanForEmailInputs() {
        // Use client-provided selectors, or fall back to intelligent defaults
        const emailSelector = DS.emailSelectors || 
            'input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[id*="email" i]';
        
        try {
            const emailInputs = document.querySelectorAll(emailSelector);
            emailInputs.forEach(tryIdentifyFromEmail);
        } catch (e) {
            console.warn('[ph-injector] Invalid email selectors:', emailSelector, e);
        }
    }

    /* ---------- 10) SPA hooks + observers -------------------------------- */
    function hookSPA() {
        const wrap = (t) => {
            const orig = history[t];
            return function () {
                const r = orig.apply(this, arguments);
                window.dispatchEvent(new Event('ph:routechange'));
                return r;
            };
        };
        try { history.pushState = wrap('pushState'); history.replaceState = wrap('replaceState'); } catch {}
        window.addEventListener('popstate', () => window.dispatchEvent(new Event('ph:routechange')));
    }

    function onRoute() {
        applyAllRules();
        if (pageMatches(DS.pageMatch)) {
            scanAndAnnotate();
            bindPriceChangeListeners(); // 🆕 Bind listeners on route change
        }
        scanForEmailInputs(); // ✅ Scan for email inputs on route change
    }

    function onMutations(muts) {
       if (muts.some(m => m.addedNodes && m.addedNodes.length)) {
            applyAllRules();
           if (pageMatches(DS.pageMatch)) {
               scanAndAnnotate();
               bindPriceChangeListeners(); // 🆕 Bind listeners when DOM changes
           }
           scanForEmailInputs(); // ✅ Scan for email inputs when DOM changes
        }
    }

    /* ---------- 11) Boot -------------------------------------------------- */
    function boot() {
        console.log('[ph-injector] 🚀 Booting product injector...');
        console.log('[ph-injector] Current page:', location.pathname);
        console.log('[ph-injector] Page match pattern:', DS.pageMatch);
        console.log('[ph-injector] Page matches?', pageMatches(DS.pageMatch));
        console.log('[ph-injector] Has product hints?', hasAnyProductHint);
        console.log('[ph-injector] Dataset:', {
            panelClass: DS.panelClass,
            titleClass: DS.titleClass,
            priceClass: DS.priceClass,
            eventName: DS.eventName
        });
        
        // 🆕 Capture UTM parameters to sessionStorage on initial load
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
        } catch (e) {
            console.warn('[ph-injector] Failed to store UTM parameters:', e);
        }
        
        applyAllRules();
        if (pageMatches(DS.pageMatch)) {
            console.log('[ph-injector] ✅ Page matches! Running scanAndAnnotate...');
            scanAndAnnotate();
            bindPriceChangeListeners(); // 🆕 Initial binding of price change listeners
        } else {
            console.log('[ph-injector] ❌ Page does not match pattern. Skipping product annotation.');
        }
        bindGlobalClick();
        scanForEmailInputs(); // ✅ Initial scan for email inputs

        // Ensure hidden one-time inputs (if already inserted) get captured once
        document
            .querySelectorAll('input[type="hidden"][data-ph]')
            .forEach((n) => {
                const name = n.getAttribute('data-ph');
                if (isNonEmptyStr(name)) captureOnce(name, { [P.PATH]: location.pathname, auto: true }, { scopePath: true });
            });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(boot, 0);
    } else {
        window.addEventListener('DOMContentLoaded', boot, { once: true });
    }
    window.addEventListener('load', boot);

    hookSPA();
    const mo = new MutationObserver(onMutations);
    window.__phMutationObserver = mo; // Store reference globally for disconnect/reconnect
    mo.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('ph:routechange', () => setTimeout(onRoute, 0));
})();
