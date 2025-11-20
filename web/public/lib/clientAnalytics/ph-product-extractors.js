/* ========================================================================
 * AskMe Analytics — ph-product-extractors.js
 * Product metadata extraction strategies (container-based, checkbox-based, custom)
 * ======================================================================== */

(function () {
    'use strict';

    if (!window.PHUtils || !window.PH_PROPS || !window.PH_PRODUCT_DOM) {
        console.warn('[ph-product-extractors] Missing dependencies. Load ph-utils.js and ph-constants.js first.');
        return;
    }

    window.PHExtractors = window.PHExtractors || {};

    const U = window.PHUtils;
    const P = window.PH_PROPS;
    const DOM = window.PH_PRODUCT_DOM;

    /* ---------- Text/Attribute extraction helpers -------------------------------- */
    function text(el, sel = '') {
        if (!el) return '';
        const target = sel ? U.first(el, sel) : el;
        if (!target) return '';
        if (target.tagName === 'INPUT') return target.value || '';
        return U.norm(target.textContent || target.innerText || '');
    }

    function attr(el, attrName, sel = '') {
        if (!el || !attrName) return '';
        const target = sel ? U.first(el, sel) : el;
        if (!target || !target.getAttribute) return '';
        const val = target.getAttribute(attrName);
        return U.norm(val || '');
    }

    function parseNum(input) {
        if (typeof input === 'number') return String(input.toFixed(2));
        if (!input || typeof input !== 'string') return '0.00';
        const stripped = input.replace(/[^0-9.]/g, '');
        const n = parseFloat(stripped);
        return (isNaN(n) || !isFinite(n)) ? '0.00' : n.toFixed(2);
    }

    /* ---------- Container finder -------------------------------- */
    /**
     * Guess the pricing container for a button
     * Walks up the DOM to find nearest pricing panel
     */
    function guessContainer(btn, config) {
        if (!btn || !btn.parentElement) return null;

        // Check if button itself has product metadata attributes
        if (btn.hasAttribute && btn.hasAttribute(DOM.PRODUCT)) return btn;

        // Build selector for pricing containers
        const options = {
            selector: config.panelSelector,
            class: config.panelClass,
            attr: config.panelAttr,
            id: config.panelId,
            xpath: config.panelXPath
        };

        const cssSelector = U.buildSelector(options);
        if (!cssSelector) return btn.parentElement;

        // Walk up to find container
        let curr = btn.parentElement;
        while (curr && curr !== document.body) {
            if (curr.matches && curr.matches(cssSelector)) return curr;
            curr = curr.parentElement;
        }

        // XPath fallback
        if (U.isNonEmptyStr(options.xpath)) {
            const containers = U.evaluateXPath(options.xpath);
            if (containers.length > 0) {
                // Find closest container to button
                return containers.find(c => c.contains(btn)) || containers[0];
            }
        }

        return btn.parentElement;
    }

    /* ---------- Container-based extraction -------------------------------- */
    /**
     * Extract product metadata from pricing container
     * Strategy: Find container, then extract title, price, currency, quantity
     */
    function extractFromContainer(container, config) {
        if (!container) return null;

        // === PRODUCT/TITLE EXTRACTION ===
        let product = 'unknown_product';
        
        const titleElement = U.findFirstElement({
            selector: config.titleSelector,
            class: config.titleClass,
            attr: config.titleAttr,
            id: config.titleId,
            xpath: config.titleXPath
        }, container);

        if (titleElement) {
            if (config.titleAttr && titleElement.hasAttribute && titleElement.hasAttribute(config.titleAttr)) {
                product = titleElement.getAttribute(config.titleAttr).trim();
            } else {
                product = text(titleElement) || 'unknown_product';
            }
        } else if (config.titleAttr && container.hasAttribute && container.hasAttribute(config.titleAttr)) {
            product = container.getAttribute(config.titleAttr).trim();
        }

        // === PRICE EXTRACTION ===
        let price = '0.00';
        
        const priceElement = U.findFirstElement({
            selector: config.priceSelector,
            class: config.priceClass,
            attr: config.priceAttr,
            id: config.priceId,
            xpath: config.priceXPath
        }, container);

        if (priceElement) {
            if (config.priceAttr && priceElement.hasAttribute && priceElement.hasAttribute(config.priceAttr)) {
                price = parseNum(priceElement.getAttribute(config.priceAttr));
            } else {
                price = parseNum(text(priceElement));
            }
        } else if (config.priceAttr && container.hasAttribute && container.hasAttribute(config.priceAttr)) {
            price = parseNum(container.getAttribute(config.priceAttr));
        }

        // === CURRENCY EXTRACTION ===
        let currency = 'USD';
        
        const currencyElement = U.findFirstElement({
            selector: config.currencySelector,
            class: config.currencyClass,
            attr: config.currencyAttr,
            id: config.currencyId,
            xpath: config.currencyXPath
        }, container);

        if (currencyElement) {
            if (config.currencyAttr && currencyElement.hasAttribute && currencyElement.hasAttribute(config.currencyAttr)) {
                const raw = currencyElement.getAttribute(config.currencyAttr).trim().toUpperCase();
                currency = raw || 'USD';
            } else {
                const raw = text(currencyElement).replace('$', '').trim();
                currency = /^us$/i.test(raw) ? 'USD' : (raw || 'USD').toUpperCase();
            }
        } else if (priceElement) {
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

        // === QUANTITY EXTRACTION ===
        let quantity = '1';
        
        const quantityElement = U.findFirstElement({
            selector: config.quantitySelector,
            class: config.quantityClass,
            attr: config.quantityAttr,
            id: config.quantityId,
            xpath: config.quantityXPath
        }, container);

        if (quantityElement) {
            if (quantityElement.tagName === 'INPUT' || quantityElement.tagName === 'SELECT') {
                quantity = quantityElement.value || '1';
            } else if (config.quantityAttr && quantityElement.hasAttribute && quantityElement.hasAttribute(config.quantityAttr)) {
                quantity = quantityElement.getAttribute(config.quantityAttr) || '1';
            } else {
                const parsedQty = parseNum(text(quantityElement));
                if (parsedQty && parsedQty !== '0.00') {
                    quantity = parsedQty;
                }
            }
        } else if (config.quantityAttr && container.hasAttribute && container.hasAttribute(config.quantityAttr)) {
            quantity = container.getAttribute(config.quantityAttr);
        } else {
            const commonSelectors = 'input[name*="quantity" i], input[name*="qty" i], select[name*="quantity" i], .quantity input, .qty input';
            const qn = U.first(container, commonSelectors);
            if (qn && (qn.tagName === 'INPUT' || qn.tagName === 'SELECT')) {
                quantity = qn.value || '1';
            }
        }

        // Validate quantity
        const parsedQty = parseFloat(quantity);
        if (isNaN(parsedQty) || parsedQty < 1) {
            quantity = '1';
        } else {
            quantity = String(Math.floor(parsedQty));
        }

        const prodNorm = (product ? product.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') : 'unknown_product');
        return {
            [P.PRODUCT]: prodNorm,
            [P.PRICE]: price || '0.00',
            [P.CURRENCY]: currency,
            [P.QUANTITY]: quantity
        };
    }

    /* ---------- Checkbox-based extraction -------------------------------- */
    /**
     * Extract product metadata from selected checkboxes
     * Strategy: Find all checked checkboxes, extract metadata from each, aggregate
     * Used for multi-product selection (Amazon-style)
     */
    function extractFromCheckboxes(container, config) {
        if (!container) return null;

        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        if (!checkboxes.length) {
            console.log('[ph-extractors] No checked checkboxes found');
            return null;
        }

        const products = [];
        let totalPrice = 0;
        let currency = 'USD';

        checkboxes.forEach(checkbox => {
            const checkboxContainer = checkbox.closest(config.checkboxItemSelector || '.product-item, .checkbox-item, [data-product-item]');
            if (!checkboxContainer) return;

            const itemData = extractFromContainer(checkboxContainer, config);
            if (itemData) {
                products.push(itemData[P.PRODUCT]);
                totalPrice += parseFloat(itemData[P.PRICE] || 0);
                currency = itemData[P.CURRENCY]; // Use last currency found
            }
        });

        if (!products.length) return null;

        return {
            [P.PRODUCT]: products.join(','),
            [P.PRICE]: totalPrice.toFixed(2),
            [P.CURRENCY]: currency,
            [P.QUANTITY]: String(products.length)
        };
    }

    /* ---------- Revenue extraction for completion events -------------------------------- */
    /**
     * Extract revenue data for checkout/subscription completion events
     * Searches entire page for revenue indicators
     */
    function extractRevenueData(container = document.body, config = {}) {
        const data = {};

        // Try to find revenue/price elements on confirmation pages
        const commonRevenueSels = [
            '[data-revenue]', '[data-price]', '[data-amount]',
            '.revenue', '.price', '.amount', '.total',
            '.order-total', '.payment-amount', '.subscription-price'
        ].join(',');

        try {
            const revenueEl = container.querySelector(commonRevenueSels);
            if (revenueEl) {
                const revenueText = revenueEl.getAttribute('data-revenue') ||
                                  revenueEl.getAttribute('data-price') ||
                                  revenueEl.getAttribute('data-amount') ||
                                  text(revenueEl);
                
                const amount = parseNum(revenueText);
                if (amount && amount !== '0.00') {
                    data[P.PRICE] = amount;
                    data[P.REVENUE] = amount;
                }
            }
        } catch (e) {
            console.warn('[ph-extractors] Revenue extraction failed:', e);
        }

        return data;
    }

    /* ---------- Exports -------------------------------- */
    PHExtractors.guessContainer = guessContainer;
    PHExtractors.extractFromContainer = extractFromContainer;
    PHExtractors.extractFromCheckboxes = extractFromCheckboxes;
    PHExtractors.extractRevenueData = extractRevenueData;
    
    // Helper exports
    PHExtractors.text = text;
    PHExtractors.attr = attr;
    PHExtractors.parseNum = parseNum;

    console.log('[ph-product-extractors] ✅ Product extraction module loaded');
})();
