/**
 * Unit Tests for ph-constants.js
 * Tests all constant definitions and utility functions
 */

describe('PH_DATA_KEYS', () => {
  test('should be defined and frozen', () => {
    expect(window.PH_DATA_KEYS).toBeDefined();
    expect(Object.isFrozen(window.PH_DATA_KEYS)).toBe(true);
  });

  test('should contain all required data attribute keys', () => {
    const keys = window.PH_DATA_KEYS;
    expect(keys.EVENT_NAME).toBe('data-event-name');
    expect(keys.PAGE_MATCH).toBe('data-page-match');
    expect(keys.PANEL_CLASS).toBe('data-panel-class');
    expect(keys.TITLE_ATTR).toBe('data-title-attr');
    expect(keys.TITLE_CLASS).toBe('data-title-class');
    expect(keys.PRICE_CLASS).toBe('data-price-class');
    expect(keys.PRICE_ATTR).toBe('data-price-attr');
    expect(keys.CURRENCY_CLASS).toBe('data-currency-class');
    expect(keys.STEPS).toBe('data-steps');
  });

  test('should contain new configurable selector keys', () => {
    const keys = window.PH_DATA_KEYS;
    expect(keys.PRICE_WATCH_SELECTORS).toBe('data-price-watch-selectors');
    expect(keys.EMAIL_SELECTORS).toBe('data-email-selectors');
    expect(keys.BUTTON_SELECTORS).toBe('data-button-selectors');
    expect(keys.PRODUCT_BUTTON_SELECTORS).toBe('data-product-button-selectors');
  });

  test('should contain quantity tracking keys', () => {
    const keys = window.PH_DATA_KEYS;
    expect(keys.QUANTITY_CLASS).toBe('data-quantity-class');
    expect(keys.QUANTITY_ATTR).toBe('data-quantity-attr');
  });
});

describe('PH_KEYS (Event Keys)', () => {
  test('should be defined and frozen', () => {
    expect(window.PH_KEYS).toBeDefined();
    expect(Object.isFrozen(window.PH_KEYS)).toBe(true);
  });

  test('should contain signup funnel events', () => {
    const keys = window.PH_KEYS;
    expect(keys.SIGNUP_CTA_CLICKED).toBe('SIGNUP_CTA_CLICKED');
    expect(keys.ONBOARDING_STARTED).toBe('ONBOARDING_STARTED');
    expect(keys.ONBOARDING_STEP1_COMPLETED).toBe('ONBOARDING_STEP1_COMPLETED');
    expect(keys.ONBOARDING_STEP2_COMPLETED).toBe('ONBOARDING_STEP2_COMPLETED');
    expect(keys.ONBOARDING_STEP3_COMPLETED).toBe('ONBOARDING_STEP3_COMPLETED');
    expect(keys.ONBOARDING_ERROR).toBe('ONBOARDING_ERROR');
    expect(keys.SIGNUP_COMPLETED).toBe('SIGNUP_COMPLETED');
    expect(keys.CONSENT_PROVIDED).toBe('CONSENT_PROVIDED');
  });

  test('should contain page view events', () => {
    const keys = window.PH_KEYS;
    expect(keys.LANDING_PAGE_VIEWED).toBe('LANDING_PAGE_VIEWED');
    expect(keys.INFORMATIONAL_CONTENT_VIEWED).toBe('INFORMATIONAL_CONTENT_VIEWED');
    expect(keys.LOGIN_CONTENT_VIEWED).toBe('LOGIN_CONTENT_VIEWED');
    expect(keys.DASHBOARD_VIEWED).toBe('DASHBOARD_VIEWED');
    expect(keys.FAQ_VIEWED).toBe('FAQ_VIEWED');
    expect(keys.CONTACT_US_VIEWED).toBe('CONTACT_US_VIEWED');
  });

  test('should contain login events', () => {
    const keys = window.PH_KEYS;
    expect(keys.LOGIN_ATTEMPTED).toBe('LOGIN_ATTEMPTED');
    expect(keys.LOGIN_FAILED).toBe('LOGIN_FAILED');
  });

  test('should contain subscription/product events', () => {
    const keys = window.PH_KEYS;
    expect(keys.SUBSCRIPTION_STARTED).toBe('SUBSCRIPTION_STARTED');
    expect(keys.SUBSCRIPTION_PRODUCT_SELECTED).toBe('SUBSCRIPTION_PRODUCT_SELECTED');
    expect(keys.SUBSCRIPTION_COMPLETED).toBe('SUBSCRIPTION_COMPLETED');
    expect(keys.PRODUCT_CATALOGUE_VIEWED).toBe('PRODUCT_CATALOGUE_VIEWED');
    expect(keys.PRODUCT_SEARCHED).toBe('PRODUCT_SEARCHED');
    expect(keys.PRODUCT_VIEWED).toBe('PRODUCT_VIEWED');
    expect(keys.PRODUCT_SELECTED).toBe('PRODUCT_SELECTED');
  });

  test('should contain checkout events', () => {
    const keys = window.PH_KEYS;
    expect(keys.CHECKOUT_STARTED).toBe('CHECKOUT_STARTED');
    expect(keys.CHECKOUT_COMPLETED).toBe('CHECKOUT_COMPLETED');
    expect(keys.CHECKOUT_ERROR).toBe('CHECKOUT_ERROR');
    expect(keys.CHECKOUT_SUBMITTED).toBe('CHECKOUT_SUBMITTED');
    expect(keys.CHECKOUT_RESUBMITTED).toBe('CHECKOUT_RESUBMITTED');
  });
});

describe('PH_PRODUCT_DOM', () => {
  test('should be defined and frozen', () => {
    expect(window.PH_PRODUCT_DOM).toBeDefined();
    expect(Object.isFrozen(window.PH_PRODUCT_DOM)).toBe(true);
  });

  test('should contain product DOM attributes', () => {
    const dom = window.PH_PRODUCT_DOM;
    expect(dom.PRODUCT).toBe('data-product');
    expect(dom.PRICE).toBe('data-price');
    expect(dom.CURRENCY).toBe('data-currency');
    expect(dom.QUANTITY).toBe('data-quantity');
  });
});

describe('PH_PROPS', () => {
  test('should be defined and frozen', () => {
    expect(window.PH_PROPS).toBeDefined();
    expect(Object.isFrozen(window.PH_PROPS)).toBe(true);
  });

  test('should contain property keys', () => {
    const props = window.PH_PROPS;
    expect(props.SOURCE).toBe('source');
    expect(props.PRODUCT).toBe('product');
    expect(props.PRICE).toBe('price');
    expect(props.CURRENCY).toBe('currency');
    expect(props.PATH).toBe('path');
    expect(props.REFERRER).toBe('referrer');
    expect(props.DEDUPE).toBe('__dedupeKey');
    expect(props.QUANTITY).toBe('quantity');
    expect(props.REVENUE).toBe('revenue');
    expect(props.UNIT_PRICE).toBe('unit_price');
    expect(props.PRODUCT_NAME).toBe('product_name');
    expect(props.PRODUCT_ID).toBe('product_id');
  });

  test('should contain UTM parameters', () => {
    const props = window.PH_PROPS;
    expect(props.UTM_SOURCE).toBe('utm_source');
    expect(props.UTM_MEDIUM).toBe('utm_medium');
    expect(props.UTM_CAMPAIGN).toBe('utm_campaign');
  });
});

describe('PH_PRODUCT_EVENT', () => {
  test('should be defined and frozen', () => {
    expect(window.PH_PRODUCT_EVENT).toBeDefined();
    expect(Object.isFrozen(window.PH_PRODUCT_EVENT)).toBe(true);
  });

  test('should have default event name', () => {
    expect(window.PH_PRODUCT_EVENT.DEFAULT_NAME).toBe('renew_click');
  });
});

describe('PH_UTILS', () => {
  test('should be defined and frozen', () => {
    expect(window.PH_UTILS).toBeDefined();
    expect(Object.isFrozen(window.PH_UTILS)).toBe(true);
  });

  describe('isValidEventKey', () => {
    test('should return true for valid event keys', () => {
      expect(window.PH_UTILS.isValidEventKey('SIGNUP_CTA_CLICKED')).toBe(true);
      expect(window.PH_UTILS.isValidEventKey('CHECKOUT_COMPLETED')).toBe(true);
      expect(window.PH_UTILS.isValidEventKey('PRODUCT_VIEWED')).toBe(true);
    });

    test('should return false for invalid event keys', () => {
      expect(window.PH_UTILS.isValidEventKey('INVALID_KEY')).toBe(false);
      expect(window.PH_UTILS.isValidEventKey('')).toBe(false);
      expect(window.PH_UTILS.isValidEventKey(null)).toBe(false);
    });
  });

  describe('isValidDataKey', () => {
    test('should return true for valid data keys', () => {
      expect(window.PH_UTILS.isValidDataKey('data-event-name')).toBe(true);
      expect(window.PH_UTILS.isValidDataKey('data-page-match')).toBe(true);
      expect(window.PH_UTILS.isValidDataKey('data-product-button-selectors')).toBe(true);
    });

    test('should return false for invalid data keys', () => {
      expect(window.PH_UTILS.isValidDataKey('data-invalid')).toBe(false);
      expect(window.PH_UTILS.isValidDataKey('')).toBe(false);
      expect(window.PH_UTILS.isValidDataKey(null)).toBe(false);
    });
  });

  describe('isValidProductAttr', () => {
    test('should return true for valid product attributes', () => {
      expect(window.PH_UTILS.isValidProductAttr('data-product')).toBe(true);
      expect(window.PH_UTILS.isValidProductAttr('data-price')).toBe(true);
      expect(window.PH_UTILS.isValidProductAttr('data-currency')).toBe(true);
      expect(window.PH_UTILS.isValidProductAttr('data-quantity')).toBe(true);
    });

    test('should return false for invalid product attributes', () => {
      expect(window.PH_UTILS.isValidProductAttr('data-invalid')).toBe(false);
      expect(window.PH_UTILS.isValidProductAttr('')).toBe(false);
      expect(window.PH_UTILS.isValidProductAttr(null)).toBe(false);
    });
  });
});

describe('Constants Immutability', () => {
  test('should verify PH_DATA_KEYS is frozen', () => {
    expect(Object.isFrozen(window.PH_DATA_KEYS)).toBe(true);
    // In strict mode, modifying frozen object would throw
    // In non-strict mode, it silently fails
    const beforeCount = Object.keys(window.PH_DATA_KEYS).length;
    try {
      window.PH_DATA_KEYS.NEW_KEY = 'test';
    } catch (e) {
      // Expected in strict mode
    }
    const afterCount = Object.keys(window.PH_DATA_KEYS).length;
    expect(afterCount).toBe(beforeCount); // No new keys added
  });

  test('should verify PH_KEYS is frozen', () => {
    expect(Object.isFrozen(window.PH_KEYS)).toBe(true);
    const beforeCount = Object.keys(window.PH_KEYS).length;
    try {
      window.PH_KEYS.NEW_EVENT = 'TEST_EVENT';
    } catch (e) {
      // Expected in strict mode
    }
    const afterCount = Object.keys(window.PH_KEYS).length;
    expect(afterCount).toBe(beforeCount);
  });

  test('should verify PH_PRODUCT_DOM is frozen', () => {
    expect(Object.isFrozen(window.PH_PRODUCT_DOM)).toBe(true);
    const beforeCount = Object.keys(window.PH_PRODUCT_DOM).length;
    try {
      window.PH_PRODUCT_DOM.NEW_ATTR = 'data-test';
    } catch (e) {
      // Expected in strict mode
    }
    const afterCount = Object.keys(window.PH_PRODUCT_DOM).length;
    expect(afterCount).toBe(beforeCount);
  });

  test('should verify PH_PROPS is frozen', () => {
    expect(Object.isFrozen(window.PH_PROPS)).toBe(true);
    const beforeCount = Object.keys(window.PH_PROPS).length;
    try {
      window.PH_PROPS.NEW_PROP = 'test';
    } catch (e) {
      // Expected in strict mode
    }
    const afterCount = Object.keys(window.PH_PROPS).length;
    expect(afterCount).toBe(beforeCount);
  });

  test('should verify PH_UTILS is frozen', () => {
    expect(Object.isFrozen(window.PH_UTILS)).toBe(true);
    const beforeCount = Object.keys(window.PH_UTILS).length;
    try {
      window.PH_UTILS.newFunction = () => {};
    } catch (e) {
      // Expected in strict mode
    }
    const afterCount = Object.keys(window.PH_UTILS).length;
    expect(afterCount).toBe(beforeCount);
  });
});
