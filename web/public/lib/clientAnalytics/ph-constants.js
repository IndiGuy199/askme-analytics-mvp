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
    BUTTON_SELECTORS: 'data-button-selectors',
    // 🆕 NEW: Quantity tracking configuration
    QUANTITY_CLASS: 'data-quantity-class',
    QUANTITY_ATTR: 'data-quantity-attr'
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
   
    LANDING_PAGE_VIEWED : 'LANDING_PAGE_VIEWED',
    INFORMATIONAL_CONTENT_VIEWED : 'INFORMATIONAL_CONTENT_VIEWED',
    
    LOGIN_CONTENT_VIEWED : 'LOGIN_CONTENT_VIEWED',
    LOGIN_ATTEMPTED   : 'LOGIN_ATTEMPTED',
    LOGIN_FAILED      : 'LOGIN_FAILED',

    DASHBOARD_VIEWED  : 'DASHBOARD_VIEWED',
    FAQ_VIEWED       : 'FAQ_VIEWED',
    CONTACT_US_VIEWED  : 'CONTACT_US_VIEWED',
    CONTACT_US_ATTEMPTED  : 'CONTACT_US_ATTEMPTED',
    HELP_INITIATED        : 'HELP_INITIATED',
    

    // Renewal funnel
    SUBSCRIPTION_STARTED    : 'SUBSCRIPTION_STARTED',
    SUBSCRIPTION_PRODUCT_SELECTED   : 'SUBSCRIPTION_PRODUCT_SELECTED',
    SUBSCRIPTION_COMPLETED  : 'SUBSCRIPTION_COMPLETED',
    SUBSCRIPTION_CONTENT_VIEWED : 'SUBSCRIPTION_CONTENT_VIEWED',
    
    PRODUCT_CATALOGUE_VIEWED : 'PRODUCT_CATALOGUE_VIEWED', // 🆕 NEW: Viewing the product catalogue
    PRODUCT_SEARCHED : 'PRODUCT_SEARCHED', // 🆕 NEW: Searching for a product
    PRODUCT_VIEWED :    'PRODUCT_VIEWED', // 🆕 NEW: Viewing a specific product
    PRODUCT_SELECTED : 'PRODUCT_SELECTED', // 🆕 NEW: Selecting a specific product
    // Generic checkout events (optional)
    CHECKOUT_STARTED    : 'CHECKOUT_STARTED',
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
    CURRENCY : 'data-currency',
    QUANTITY : 'data-quantity'
});


/* ---- 4) Product Property Keys (PostHog capture payload) ----- */
/**
 * Optional — consistent property names when sending PostHog events.
 * e.g. posthog.capture('renew_click', { [PH_PROPS.PRODUCT]: '2_years' })
window.PH_PROPS = Object.freeze({
    SOURCE   : 'source',
    PRODUCT  : 'product',
    PRICE    : 'price',
    CURRENCY : 'currency',
    PATH     : 'path',
    REFERRER : 'referrer',
    DEDUPE   : '__dedupeKey',
    QUANTITY : 'quantity',
    REVENUE  : 'revenue',
    UNIT_PRICE : 'unit_price',
    PRODUCT_NAME : 'product_name',
    PRODUCT_ID : 'product_id',
    UTM_SOURCE : 'utm_source',
    UTM_MEDIUM : 'utm_medium',
    UTM_CAMPAIGN : 'utm_campaign'
}); DEDUPE   : '__dedupeKey'
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