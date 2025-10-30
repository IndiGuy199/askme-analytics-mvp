/* ===========================================================
* AskMe Analytics — Global Constants
* Shared across JSPs, injector scripts, and analytics helpers
* =========================================================== */

/* ---- 1) Data-Attribute Keys Enum (used in JSP) ------------- */
/**
 * These keys correspond directly to data-* attributes
 * attached to the <script id="ph-product-injector"> tag.
 *
 * Example:
 *   s.setAttribute(PH_DATA_KEYS.EVENT_NAME, 'renew_click');
 *   s.setAttribute(PH_DATA_KEYS.PAGE_MATCH, '/app/renew');
 */
window.PH_DATA_KEYS = Object.freeze({
    EVENT_NAME: 'data-event-name',
    PAGE_MATCH: 'data-page-match',
    PANEL_CLASS: 'data-panel-class',
    TITLE_ATTR: 'data-title-attr',
    TITLE_CLASS: 'data-title-class',
    PRICE_CLASS: 'data-price-class',
    PRICE_ATTR: 'data-price-attr',
    CURRENCY_CLASS: 'data-currency-class',
    STEPS: 'data-steps',
    // 🆕 NEW: Configurable selectors for dynamic elements
    PRICE_WATCH_SELECTORS: 'data-price-watch-selectors',
    EMAIL_SELECTORS: 'data-email-selectors',
    BUTTON_SELECTORS: 'data-button-selectors'
});


/* ---- 2) Canonical Event Keys Enum --------------------------- */
/**
 * These represent the logical “business events” in your funnels.
 * They can be reused across clients for consistent reporting.
 */
window.PH_KEYS = Object.freeze({
    // Signup funnel
    SIGNUP_CTA_CLICKED : 'SIGNUP_CTA_CLICKED',
    ONBOARDING_STARTED : 'ONBOARDING_STARTED',
    ONBOARDING_STEP1_COMPLETED : 'ONBOARDING_STEP1_COMPLETED',
    ONBOARDING_STEP2_COMPLETED : 'ONBOARDING_STEP2_COMPLETED',
    ONBOARDING_STEP3_COMPLETED : 'ONBOARDING_STEP3_COMPLETED',
    ONBOARDING_ERROR   : 'ONBOARDING_ERROR',  // 🆕 NEW: Error state during onboarding
    SIGNUP_COMPLETED   : 'SIGNUP_COMPLETED',
    CONSENT_PROVIDED   : 'CONSENT_PROVIDED',

    // Renewal funnel
    RENEWAL_STARTED    : 'RENEWAL_STARTED',
    PRODUCT_SELECTED   : 'PRODUCT_SELECTED',
    RENEWAL_COMPLETED  : 'RENEWAL_COMPLETED',

    // Generic checkout events (optional)
    CHECKOUT_VIEWED    : 'CHECKOUT_VIEWED',
    CHECKOUT_COMPLETED : 'CHECKOUT_COMPLETED',
    CHECKOUT_ERROR : 'CHECKOUT_ERROR',
    CHECKOUT_SUBMITTED : 'CHECKOUT_SUBMITTED',
    CHECKOUT_RESUBMITTED : 'CHECKOUT_RESUBMITTED',
});


/* ---- 3) Product DOM Attribute Enum -------------------------- */
/**
 * These correspond to HTML attributes added dynamically
 * by the product injector for pricing/product tracking.
 */
window.PH_PRODUCT_DOM = Object.freeze({
    PRODUCT  : 'data-product',
    PRICE    : 'data-price',
    CURRENCY : 'data-currency'
});


/* ---- 4) Product Property Keys (PostHog capture payload) ----- */
/**
 * Optional — consistent property names when sending PostHog events.
 * e.g. posthog.capture('renew_click', { [PH_PROPS.PRODUCT]: '2_years' })
 */
window.PH_PROPS = Object.freeze({
    SOURCE   : 'source',
    PRODUCT  : 'product',
    PRICE    : 'price',
    CURRENCY : 'currency',
    PATH     : 'path',
    REFERRER : 'referrer',
    DEDUPE   : '__dedupeKey'
});


/* ---- 5) Default Product Event ------------------------------- */
/**
 * Default event name used for product clicks
 * (can be overridden via data-event-name on injector script)
 */
window.PH_PRODUCT_EVENT = Object.freeze({
    DEFAULT_NAME: 'renew_click'
});


/* ---- 6) Utility to Verify Keys ------------------------------ */
/**
 * Example:
 *   if (!PH_UTILS.isValidEventKey('SIGNUP_COMPLETED')) { ... }
 */
window.PH_UTILS = Object.freeze({
    isValidEventKey: (key) => Object.values(window.PH_KEYS).includes(key),
    isValidDataKey : (key) => Object.values(window.PH_DATA_KEYS).includes(key),
    isValidProductAttr: (attr) => Object.values(window.PH_PRODUCT_DOM).includes(attr)
});


console.debug('[ph-constants] loaded successfully');