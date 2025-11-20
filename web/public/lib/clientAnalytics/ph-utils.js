/* ========================================================================
 * AskMe Analytics — ph-utils.js
 * Core utility functions for DOM manipulation, selectors, and validation
 * ======================================================================== */

(function () {
    'use strict';

    window.PHUtils = window.PHUtils || {};

    /* ---------- String utilities -------------------------------- */
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const isNonEmptyStr = (x) => typeof x === 'string' && x.trim() !== '';

    PHUtils.norm = norm;
    PHUtils.isNonEmptyStr = isNonEmptyStr;

    /* ---------- Selector validation -------------------------------- */
    function isLikelyBadSelector(s) {
        if (!isNonEmptyStr(s)) return true;
        const t = s.trim();
        if (t === '[]' || t === '{}' || t === 'null' || t === 'undefined') return true;
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

    PHUtils.isLikelyBadSelector = isLikelyBadSelector;
    PHUtils.isValidSelector = isValidSelector;

    /* ---------- Array/List parsing -------------------------------- */
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

    PHUtils.parseMaybeJSONList = parseMaybeJSONList;

    /* ---------- Selector builders -------------------------------- */
    function selectorListFrom(input) {
        const items = parseMaybeJSONList(input).flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean);
        return items.filter(isValidSelector);
    }

    function classToSelectorCsv(input) {
        const classes = parseMaybeJSONList(input);
        const sels = [];
        for (const cls of classes) {
            const dot = norm(cls).split(/\s+/).filter(Boolean).map(c => '.' + c).join('');
            if (dot) sels.push(dot);
        }
        return sels.join(',');
    }

    function splitSelectorsCsv(selCsv) {
        if (!isNonEmptyStr(selCsv)) return [];
        return selCsv.split(',').map((s) => s.trim()).filter(isValidSelector);
    }

    PHUtils.selectorListFrom = selectorListFrom;
    PHUtils.classToSelectorCsv = classToSelectorCsv;
    PHUtils.splitSelectorsCsv = splitSelectorsCsv;

    /* ---------- DOM query helpers -------------------------------- */
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

    PHUtils.qsa = qsa;
    PHUtils.first = first;

    /* ---------- Regex utilities -------------------------------- */
    function ciRegex(str) {
        if (!isNonEmptyStr(str)) return null;
        const ci = str.startsWith('(?i)');
        const body = ci ? str.slice(4) : str;
        try { return new RegExp(body, ci ? 'i' : undefined); } catch { return null; }
    }

    PHUtils.ciRegex = ciRegex;

    /* ---------- Visibility check -------------------------------- */
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

    PHUtils.isVisible = isVisible;

    /* ---------- XPath evaluation -------------------------------- */
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
            console.warn('[ph-utils] Invalid XPath:', xpath, e);
            return [];
        }
    }

    PHUtils.evaluateXPath = evaluateXPath;

    /* ---------- Multi-strategy selector builder -------------------------------- */
    function buildSelector(options) {
        const { selector, class: cls, attr, id } = options;
        
        if (isNonEmptyStr(selector) && isValidSelector(selector)) {
            return selector;
        }
        
        if (isNonEmptyStr(cls)) {
            const classSel = classToSelectorCsv(cls);
            if (classSel && isValidSelector(classSel)) {
                return classSel;
            }
        }
        
        if (isNonEmptyStr(attr)) {
            const attrSel = `[${attr}]`;
            if (isValidSelector(attrSel)) {
                return attrSel;
            }
        }
        
        if (isNonEmptyStr(id)) {
            const idSel = `#${id}`;
            if (isValidSelector(idSel)) {
                return idSel;
            }
        }
        
        return '';
    }

    PHUtils.buildSelector = buildSelector;

    /* ---------- Multi-strategy element finder -------------------------------- */
    function findElements(options, context = document) {
        const cssSelector = buildSelector(options);
        if (cssSelector) {
            const elements = qsa(cssSelector, context);
            if (elements.length > 0) return elements;
        }
        
        if (isNonEmptyStr(options.xpath)) {
            const elements = evaluateXPath(options.xpath, context);
            if (elements.length > 0) return elements;
        }
        
        return [];
    }

    function findFirstElement(options, context = document) {
        const elements = findElements(options, context);
        return elements.length > 0 ? elements[0] : null;
    }

    PHUtils.findElements = findElements;
    PHUtils.findFirstElement = findFirstElement;

    console.log('[ph-utils] ✅ Utility module loaded');
})();
