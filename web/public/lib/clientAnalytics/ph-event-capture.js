/* ========================================================================
 * AskMe Analytics — ph-event-capture.js
 * PostHog event capture, queuing, deduplication, and revenue tracking
 * ======================================================================== */

(function () {
    'use strict';

    if (!window.PH_PROPS || !window.PH_KEYS) {
        console.warn('[ph-event-capture] Missing constants. Load ph-constants.js first.');
        return;
    }

    window.PHEventCapture = window.PHEventCapture || {};

    const dbg = (...a) => { if (window.AskMeAnalyticsConfig?.debug) console.log(...a); };

    const P = window.PH_PROPS;
    const EK = window.PH_KEYS;

    /* ---------- Dedup config -------------------------------- */
    const DEDUP_MAX_SIZE = 500;

    /**
     * Build the dedup key for an event.
     * Scope is controlled by config.dedupScope:
     *   'path'       — default, per event+pathname
     *   'path+query' — event+pathname+search
     *   'full_url'   — event+full href
     */
    function buildDedupKey(name, scopePath) {
        if (!scopePath) return name;
        const cfg = window.AskMeAnalyticsConfig || {};
        switch (cfg.dedupScope) {
            case 'path+query': return `${name}::${location.pathname}${location.search}`;
            case 'full_url':   return `${name}::${location.href}`;
            default:           return `${name}::${location.pathname}`; // 'path' or unset
        }
    }

    /* ---------- State -------------------------------- */
    // sentOncePathOrder mirrors the Set in insertion order for FIFO eviction.
    const sentOncePathOrder = (() => {
        if (window.__phFiredOnceOrder) return window.__phFiredOnceOrder;
        try {
            const stored = sessionStorage.getItem('__phFiredOnce');
            return window.__phFiredOnceOrder = stored ? JSON.parse(stored) : [];
        } catch {
            return window.__phFiredOnceOrder = [];
        }
    })();

    const sentOncePath = (() => {
        if (window.__phFiredOnce) return window.__phFiredOnce;
        return window.__phFiredOnce = new Set(sentOncePathOrder);
    })();

    function addToDedupSet(key) {
        if (sentOncePath.has(key)) return;
        // Evict oldest entries when at capacity
        while (sentOncePathOrder.length >= DEDUP_MAX_SIZE) {
            const oldest = sentOncePathOrder.shift();
            sentOncePath.delete(oldest);
        }
        sentOncePath.add(key);
        sentOncePathOrder.push(key);
    }

    const queue = [];
    let phReady = false;
    let pollCount = 0;
    const MAX_POLL_ATTEMPTS = 100;

    /* ---------- PostHog readiness polling -------------------------------- */
    function flushPH() {
        if (window.posthog && typeof window.posthog.capture === 'function') {
            phReady = true;
            dbg(`[ph-event-capture] ✅ PostHog ready! Flushing ${queue.length} events`);
            while (queue.length) {
                const { name, props } = queue.shift();
                try {
                    window.posthog.capture(name, props);
                    dbg(`[ph-event-capture] ✅ Queued event sent: ${name}`);
                } catch (e) {
                    console.warn('[ph-event-capture] ❌ capture failed', e);
                }
            }
        }
    }

    (function pollPH() {
        if (!phReady) {
            pollCount++;
            if (pollCount % 10 === 0) {
                dbg(`[ph-event-capture] ⏳ Waiting for PostHog... ${pollCount}/${MAX_POLL_ATTEMPTS}`);
            }
            flushPH();
            if (!phReady && pollCount < MAX_POLL_ATTEMPTS) {
                setTimeout(pollPH, 150);
            } else if (pollCount >= MAX_POLL_ATTEMPTS) {
                console.error('[ph-event-capture] ❌ PostHog failed to initialize after', MAX_POLL_ATTEMPTS, 'attempts');
            }
        }
    })();

    /* ---------- UTM parameter extraction -------------------------------- */
    function extractUTMParams() {
        const params = {};
        try {
            const urlParams = new URLSearchParams(window.location.search);
            
            // Priority 1: URL
            if (urlParams.has('utm_source')) params[P.UTM_SOURCE] = urlParams.get('utm_source');
            if (urlParams.has('utm_medium')) params[P.UTM_MEDIUM] = urlParams.get('utm_medium');
            if (urlParams.has('utm_campaign')) params[P.UTM_CAMPAIGN] = urlParams.get('utm_campaign');
            
            // Priority 2: sessionStorage
            if (!params[P.UTM_SOURCE]) {
                const sessionSource = sessionStorage.getItem('ph_utm_source');
                if (sessionSource) params[P.UTM_SOURCE] = sessionSource;
            }
            if (!params[P.UTM_MEDIUM]) {
                const sessionMedium = sessionStorage.getItem('ph_utm_medium');
                if (sessionMedium) params[P.UTM_MEDIUM] = sessionMedium;
            }
            if (!params[P.UTM_CAMPAIGN]) {
                const sessionCampaign = sessionStorage.getItem('ph_utm_campaign');
                if (sessionCampaign) params[P.UTM_CAMPAIGN] = sessionCampaign;
            }
            
            // Priority 3: localStorage
            if (!params[P.UTM_SOURCE]) {
                const localSource = localStorage.getItem('ph_utm_source');
                if (localSource) params[P.UTM_SOURCE] = localSource;
            }
            if (!params[P.UTM_MEDIUM]) {
                const localMedium = localStorage.getItem('ph_utm_medium');
                if (localMedium) params[P.UTM_MEDIUM] = localMedium;
            }
            if (!params[P.UTM_CAMPAIGN]) {
                const localCampaign = localStorage.getItem('ph_utm_campaign');
                if (localCampaign) params[P.UTM_CAMPAIGN] = localCampaign;
            }
            
            // Attribution timestamp
            const utmTimestamp = localStorage.getItem('ph_utm_timestamp');
            if (utmTimestamp) {
                const attributionDate = new Date(parseInt(utmTimestamp));
                params['attribution_timestamp'] = attributionDate.toISOString();
                const daysSince = Math.floor((Date.now() - parseInt(utmTimestamp)) / (1000 * 60 * 60 * 24));
                params['days_since_attribution'] = daysSince;
            }
        } catch (e) {
            console.warn('[ph-event-capture] Failed to extract UTM:', e);
        }
        return params;
    }

    /* ---------- Revenue tracking enhancement -------------------------------- */
    function enhanceRevenueProps(eventName, props) {
        const purchaseEvents = [EK.SUBSCRIPTION_COMPLETED, EK.CHECKOUT_COMPLETED];
        
        if (purchaseEvents.includes(eventName)) {
            if (document.referrer) {
                props[P.REFERRER] = document.referrer;
            }
            
            const price = parseFloat(props[P.PRICE] || props.price || '0');
            const quantity = parseInt(props[P.QUANTITY] || props.quantity || '1', 10);
            const revenue = price * quantity;
            
            // Only set revenue if not already provided (e.g. by ph-step-tracker cart extraction)
            if (!props[P.REVENUE]) {
                props[P.REVENUE] = revenue.toFixed(2);
                props[P.UNIT_PRICE] = price.toFixed(2);
                props[P.QUANTITY] = String(quantity);
            }
            
            if (props[P.PRODUCT]) {
                props[P.PRODUCT_NAME] = props[P.PRODUCT];
                props[P.PRODUCT_ID] = props[P.PRODUCT];
            }
            
            Object.assign(props, extractUTMParams());
        } else {
            // Attach UTM to all events
            const utmParams = extractUTMParams();
            Object.keys(utmParams).forEach(key => {
                if (!props[key]) props[key] = utmParams[key];
            });
        }
    }

    /* ---------- Main capture function -------------------------------- */
    function captureOnce(name, props = {}, { scopePath = true } = {}) {
        if (!name || typeof name !== 'string' || !name.trim()) return;

        const key = buildDedupKey(name, scopePath);
        if (scopePath && sentOncePath.has(key)) {
            dbg(`[ph-event-capture] ⏭️ Event already fired: ${name} (dedup key: ${key})`);
            return;
        }

        if (scopePath) {
            addToDedupSet(key);
            try {
                sessionStorage.setItem('__phFiredOnce', JSON.stringify(sentOncePathOrder));
            } catch {}
        }

        enhanceRevenueProps(name, props);

        const phStatus = window.posthog ?
            (typeof window.posthog.capture === 'function' ? 'ready' : 'loading') :
            'not-loaded';
        dbg(`[ph-event-capture] 📊 Event: ${name} (PostHog: ${phStatus})`, props);

        if (phReady) {
            try {
                window.posthog.capture(name, props);
                dbg(`[ph-event-capture] ✅ Event sent: ${name}`);
            } catch (e) {
                console.warn('[ph-event-capture] ❌ capture failed', e);
            }
        } else {
            queue.push({ name, props });
            dbg(`[ph-event-capture] 📦 Event queued: ${name}`);
        }
    }

    /* ---------- Exports -------------------------------- */
    PHEventCapture.captureOnce = captureOnce;
    PHEventCapture.isReady = () => phReady;
    PHEventCapture.getQueueLength = () => queue.length;

    dbg('[ph-event-capture] ✅ Event capture module loaded');
})();
