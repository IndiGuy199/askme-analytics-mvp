/**
 * Test Setup - Load constants before tests
 */

// Load constants before all tests
beforeAll(() => {
  // Mock window.PH_DATA_KEYS
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
    PRICE_WATCH_SELECTORS: 'data-price-watch-selectors',
    EMAIL_SELECTORS: 'data-email-selectors',
    BUTTON_SELECTORS: 'data-button-selectors',
    PRODUCT_BUTTON_SELECTORS: 'data-product-button-selectors',
    QUANTITY_CLASS: 'data-quantity-class',
    QUANTITY_ATTR: 'data-quantity-attr'
  });

  // Mock window.PH_KEYS
  window.PH_KEYS = Object.freeze({
    SIGNUP_CTA_CLICKED: 'SIGNUP_CTA_CLICKED',
    ONBOARDING_STARTED: 'ONBOARDING_STARTED',
    ONBOARDING_STEP1_COMPLETED: 'ONBOARDING_STEP1_COMPLETED',
    ONBOARDING_STEP2_COMPLETED: 'ONBOARDING_STEP2_COMPLETED',
    ONBOARDING_STEP3_COMPLETED: 'ONBOARDING_STEP3_COMPLETED',
    ONBOARDING_ERROR: 'ONBOARDING_ERROR',
    SIGNUP_COMPLETED: 'SIGNUP_COMPLETED',
    CONSENT_PROVIDED: 'CONSENT_PROVIDED',
    LANDING_PAGE_VIEWED: 'LANDING_PAGE_VIEWED',
    INFORMATIONAL_CONTENT_VIEWED: 'INFORMATIONAL_CONTENT_VIEWED',
    LOGIN_CONTENT_VIEWED: 'LOGIN_CONTENT_VIEWED',
    LOGIN_ATTEMPTED: 'LOGIN_ATTEMPTED',
    LOGIN_FAILED: 'LOGIN_FAILED',
    DASHBOARD_VIEWED: 'DASHBOARD_VIEWED',
    FAQ_VIEWED: 'FAQ_VIEWED',
    CONTACT_US_VIEWED: 'CONTACT_US_VIEWED',
    CONTACT_US_ATTEMPTED: 'CONTACT_US_ATTEMPTED',
    HELP_INITIATED: 'HELP_INITIATED',
    SUBSCRIPTION_STARTED: 'SUBSCRIPTION_STARTED',
    SUBSCRIPTION_PRODUCT_SELECTED: 'SUBSCRIPTION_PRODUCT_SELECTED',
    SUBSCRIPTION_COMPLETED: 'SUBSCRIPTION_COMPLETED',
    SUBSCRIPTION_CONTENT_VIEWED: 'SUBSCRIPTION_CONTENT_VIEWED',
    PRODUCT_CATALOGUE_VIEWED: 'PRODUCT_CATALOGUE_VIEWED',
    PRODUCT_SEARCHED: 'PRODUCT_SEARCHED',
    PRODUCT_VIEWED: 'PRODUCT_VIEWED',
    PRODUCT_SELECTED: 'PRODUCT_SELECTED',
    CHECKOUT_STARTED: 'CHECKOUT_STARTED',
    CHECKOUT_COMPLETED: 'CHECKOUT_COMPLETED',
    CHECKOUT_ERROR: 'CHECKOUT_ERROR',
    CHECKOUT_SUBMITTED: 'CHECKOUT_SUBMITTED',
    CHECKOUT_RESUBMITTED: 'CHECKOUT_RESUBMITTED'
  });

  // Mock window.PH_PRODUCT_DOM
  window.PH_PRODUCT_DOM = Object.freeze({
    PRODUCT: 'data-product',
    PRICE: 'data-price',
    CURRENCY: 'data-currency',
    QUANTITY: 'data-quantity'
  });

  // Mock window.PH_PROPS
  window.PH_PROPS = Object.freeze({
    SOURCE: 'source',
    PRODUCT: 'product',
    PRICE: 'price',
    CURRENCY: 'currency',
    PATH: 'path',
    REFERRER: 'referrer',
    DEDUPE: '__dedupeKey',
    QUANTITY: 'quantity',
    REVENUE: 'revenue',
    UNIT_PRICE: 'unit_price',
    PRODUCT_NAME: 'product_name',
    PRODUCT_ID: 'product_id',
    UTM_SOURCE: 'utm_source',
    UTM_MEDIUM: 'utm_medium',
    UTM_CAMPAIGN: 'utm_campaign'
  });

  // Mock window.PH_PRODUCT_EVENT
  window.PH_PRODUCT_EVENT = Object.freeze({
    DEFAULT_NAME: 'renew_click'
  });

  // Mock window.PH_UTILS
  window.PH_UTILS = Object.freeze({
    isValidEventKey: (key) => Object.values(window.PH_KEYS).includes(key),
    isValidDataKey: (key) => Object.values(window.PH_DATA_KEYS).includes(key),
    isValidProductAttr: (attr) => Object.values(window.PH_PRODUCT_DOM).includes(attr)
  });
});
