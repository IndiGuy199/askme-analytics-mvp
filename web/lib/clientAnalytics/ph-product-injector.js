/* ========================================================================
* AskMe Analytics — ph-product-injector.js
* Requires: /resources/js/common/ph-constants.js (must be loaded first)
*
* Features:
    *  - Dynamic Step Tagging (URL-gated; selector/textRegex/hidden)
*  - requireSelectorPresent: fire once on load if selector exists (plus tag)
*  - autoFire: fire once on load when URL matches (selector not required)
*  - oncePerPath: dedupe per route (default true; can be disabled per rule)
*  - Product metadata annotation (data-product, data-price, data-currency)
*  - Step-clicks include product props (Option A)
*  - Custom product event via data-event-name (or default from constants)
*  - SPA resilience + MutationObserver
*  - Robust selector handling (CSV / JSON-array / bad values)
* ======================================================================== */

(function () {
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

    /* ---------- 2) PostHog queue + dedupe -------------------------------- */
    const sentOncePath = window.__phFiredOnce || (window.__phFiredOnce = new Set()); // key::path
    const sentButtons  = new WeakSet();   // submit/product elements
    const sentStepEls  = new WeakSet();   // data-ph elements
    const identifiedEmails = new Set();  // ✅ Track identified emails to prevent duplicates
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
        if (scopePath) sentOncePath.add(key);

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
        panelClass    : SCRIPT.getAttribute(K.PANEL_CLASS),
        titleAttr     : SCRIPT.getAttribute(K.TITLE_ATTR),
        titleClass    : SCRIPT.getAttribute(K.TITLE_CLASS),
        priceClass    : SCRIPT.getAttribute(K.PRICE_CLASS),
        priceAttr     : SCRIPT.getAttribute(K.PRICE_ATTR),
        currencyClass : SCRIPT.getAttribute(K.CURRENCY_CLASS),
        stepsRaw      : SCRIPT.getAttribute(K.STEPS)
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
        isNonEmptyStr(DS.panelClass) ||
        isNonEmptyStr(DS.titleAttr)  ||
        isNonEmptyStr(DS.titleClass) ||
        isNonEmptyStr(DS.priceClass) ||
        isNonEmptyStr(DS.priceAttr)  ||
        isNonEmptyStr(DS.currencyClass);

    function guessContainer(btn) {
        // optional panel class(es)
        const panelSelCsv = classToSelectorCsv(DS.panelClass);
        if (panelSelCsv) {
            try { const c = btn.closest(panelSelCsv); if (c) return c; } catch {}
        }
        // heuristic scan upward
        let p = btn.parentElement, hops = 0;
        const nearPriceSel = [
            DS.priceAttr ? `[${DS.priceAttr}]` : '',
            classToSelectorCsv(DS.priceClass)
        ].filter(Boolean).join(',');
        while (p && hops++ < 6) {
            const cls = (p.className || '').toString();
            if (/\b(price|panel|card|plan|tier|product)\b/i.test(cls)) return p;
            if (nearPriceSel && first(p, nearPriceSel)) return p;
            if (DS.titleAttr && p.hasAttribute && p.hasAttribute(DS.titleAttr)) return p;
            p = p.parentElement;
        }
        return btn.parentElement || document;
    }

    function text(el) { return norm(el?.textContent || ''); }
    function parseNum(s) {
        const m = norm(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
        return m ? m[0] : null;
    }

    function extractFrom(container) {
        if (!container) container = document;

        // product
        let product = null;
        if (isNonEmptyStr(DS.titleAttr) && container.hasAttribute && container.hasAttribute(DS.titleAttr)) {
            product = container.getAttribute(DS.titleAttr);
        }
        if (!product) {
            const titleCsv = classToSelectorCsv(DS.titleClass);
            const guessTitleSel = (titleCsv ? `${titleCsv} h3,` : '') + `[${DS.titleAttr || 'data-title'}]`;
            const tn = first(container, guessTitleSel) || first(container, 'h3,[data-title]');
            if (tn) product = tn.getAttribute('data-title') || text(tn);
        }

        // price
        let price = null;
        const pCsv = [
            DS.priceAttr ? `[${DS.priceAttr}]` : '',
            classToSelectorCsv(DS.priceClass)
        ].filter(Boolean).join(',');
        const pn = first(container, pCsv || '.price,.amount,[data-originalfee]');
        if (pn) {
            if (DS.priceAttr && pn.hasAttribute && pn.hasAttribute(DS.priceAttr)) price = pn.getAttribute(DS.priceAttr);
            if (!price) price = parseNum(text(pn));
        }

        // currency
        const cCsv = classToSelectorCsv(DS.currencyClass);
        const currencySel = cCsv ? `${cCsv} sup,[data-currency]` : '.currency sup,[data-currency]';
        const cn = first(container, currencySel);
        let currency = 'USD';
        if (cn) {
            const raw = text(cn).replace('$', '').trim();
            currency = /^us$/i.test(raw) ? 'USD' : (raw || 'USD').toUpperCase();
        }

        const prodNorm = (product ? product.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') : 'unknown_product');
        return { [P.PRODUCT]: prodNorm, [P.PRICE]: price || '0.00', [P.CURRENCY]: currency };
    }

    function annotateSubmit(btn) {
        if (!btn || sentButtons.has(btn)) return;
        const props = extractFrom(guessContainer(btn));
        if (!props) return;
        if (!btn.hasAttribute(DOM.PRODUCT))  btn.setAttribute(DOM.PRODUCT,  props[P.PRODUCT]);
        if (!btn.hasAttribute(DOM.PRICE))    btn.setAttribute(DOM.PRICE,    String(props[P.PRICE]));
        if (!btn.hasAttribute(DOM.CURRENCY)) btn.setAttribute(DOM.CURRENCY, props[P.CURRENCY]);
        sentButtons.add(btn);
    }

    function scanAndAnnotate() {
        if (!hasAnyProductHint) return;
        document.querySelectorAll('input[type="submit"], button[type="submit"]').forEach(annotateSubmit);
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

// 2) textRegex fallback (only if no visible matches found)
        if (!bucket.size && isNonEmptyStr(rule.textRegex)) {
            const rx = ciRegex(rule.textRegex);
            if (rx) {
                Array.from(document.querySelectorAll('button, a, input[type="submit"]'))
                    .filter(isVisible)
                    .forEach(el => {
                        const txt = el.tagName === 'INPUT'
                            ? (el.getAttribute('value') || '')
                            : (el.textContent || '');
                        if (rx.test(norm(txt))) bucket.add(el);
                    });
            }
        }

        const targets = Array.from(bucket);

// --- Tag all visible elements safely (no overwrites of different keys) ---
        if (targets.length) {
            targets.forEach((el) => {
                const existing = el.getAttribute('data-ph');
                // Only skip if element already has a DIFFERENT rule key
                if (existing && existing !== rule.key) return;
                // Always set the current rule key (handles both new elements and re-tagging)
                el.setAttribute('data-ph', rule.key);
            });

            if (rule.requireSelectorPresent) {
                const props = { [P.PATH]: location.pathname, matched: 'selector', ...rule.metadata };
                captureOnce(rule.key, props, { scopePath: rule.oncePerPath });
            }
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

        // 🧹 Clean up previously injected dynamic tags that no longer match
        document.querySelectorAll('[data-ph-tagged-dyn]').forEach(el => el.remove());
        // Optional: clear stale data-ph on elements when URL no longer matches any rule
        document.querySelectorAll('[data-ph]').forEach(el => {
            const name = el.getAttribute('data-ph');
            const stillValid = rules.some(r => urlMatches(r) && r.key === name);
            if (!stillValid) el.removeAttribute('data-ph');
        });


        rules.forEach(tagElementsForRule);
    }

    /* ---------- 8) Product props from any element (for step clicks) ------- */
    function productPropsFrom(el) {
        if (!el) return null;

        // 1) element itself
        const a = el.getAttribute(DOM.PRODUCT);
        const b = el.getAttribute(DOM.PRICE);
        const c = el.getAttribute(DOM.CURRENCY);
        if (a && b && c) return { [P.PRODUCT]: a, [P.PRICE]: b, [P.CURRENCY]: c };

        // 2) nearest submit
        const btn = el.closest('input[type="submit"], button[type="submit"]');
        if (btn) {
            const a2 = btn.getAttribute(DOM.PRODUCT);
            const b2 = btn.getAttribute(DOM.PRICE);
            const c2 = btn.getAttribute(DOM.CURRENCY);
            if (a2 && b2 && c2) return { [P.PRODUCT]: a2, [P.PRICE]: b2, [P.CURRENCY]: c2 };
        }

        // 3) walk up a bit
        let p = el.parentElement, hops = 0;
        while (p && hops++ < 5) {
            const a3 = p.getAttribute?.(DOM.PRODUCT);
            const b3 = p.getAttribute?.(DOM.PRICE);
            const c3 = p.getAttribute?.(DOM.CURRENCY);
            if (a3 && b3 && c3) return { [P.PRODUCT]: a3, [P.PRICE]: b3, [P.CURRENCY]: c3 };
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
                    if (prod && price && curr) {
                        captureOnce(
                            productEventName,
                            { [P.PRODUCT]: prod, [P.PRICE]: price, [P.CURRENCY]: curr, [P.PATH]: location.pathname },
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

    function scanForEmailInputs() {
        // Find all email inputs on the page
        const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email" i], input[placeholder*="email" i]');
        emailInputs.forEach(tryIdentifyFromEmail);
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
        if (pageMatches(DS.pageMatch)) scanAndAnnotate();
        scanForEmailInputs(); // ✅ Scan for email inputs on route change
    }

    function onMutations(muts) {
       if (muts.some(m => m.addedNodes && m.addedNodes.length)) {
            applyAllRules();
           if (pageMatches(DS.pageMatch)) scanAndAnnotate();
           scanForEmailInputs(); // ✅ Scan for email inputs when DOM changes
        }
    }

    /* ---------- 11) Boot -------------------------------------------------- */
    function boot() {
        applyAllRules();
        if (pageMatches(DS.pageMatch)) scanAndAnnotate();
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
    mo.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('ph:routechange', () => setTimeout(onRoute, 0));
})();
