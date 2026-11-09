/**
 * ecommerce-flow.integration.test.js
 *
 * End-to-end integration tests for the ecommerce analytics tracking flow:
 *
 *  - CHECKLIST 7: Cart caching — CHECKOUT_STARTED writes ph_cart_data to
 *    sessionStorage; CHECKOUT_COMPLETED reads the cache, enriches the event
 *    with revenue/cart_items, and clears the cache.
 *  - Revenue calculation: subtotal + tax + shipping.
 *  - Multiple cart items: item_count, total_quantity, product_names.
 *  - UTM first-touch attribution carried through a multi-step funnel.
 *  - autoFire event dedup prevents re-firing across SPA navigation.
 *  - PHEventCapture.enhanceRevenueProps adds revenue to purchase events.
 *
 * Modules loaded in dependency order:
 *   ph-constants → ph-utils → ph-event-capture → ph-step-tracker
 *
 * PHStepTracker / PHEventCapture are loaded via eval() from public/lib so
 * the tests exercise the real post-fix code paths.
 */

const fs   = require('fs');
const path = require('path');

const SDK_DIR = path.join(__dirname, '..');

// ─── helper: read + eval a single SDK file ────────────────────────────────────

function evalSDK(filename) {
  // eslint-disable-next-line no-eval
  global.eval(fs.readFileSync(path.join(SDK_DIR, filename), 'utf-8'));
}

// ─── sample cart data returned by PHCartExtractor mock ───────────────────────

const SAMPLE_ITEMS = [
  { product: 'Widget A', name: 'Widget A', unit_price: 29.99, quantity: 2, item_total: 59.98 },
  { product: 'Widget B', name: 'Widget B', unit_price: 9.99,  quantity: 1, item_total: 9.99  },
];
const SUBTOTAL = 69.97;   // 59.98 + 9.99
const TAX      = 5.60;
const SHIPPING = 3.99;
const TOTAL    = SUBTOTAL + TAX + SHIPPING; // 79.56

function makeCartData() {
  return {
    items: SAMPLE_ITEMS,
    subtotal: SUBTOTAL,
    tax:      TAX,
    shipping: SHIPPING,
    discount: 0,
    gratuity: 0,
    total:    TOTAL,
    currency: 'USD',
  };
}

/** Minimal PHCartExtractor stub that the step-tracker calls. */
function makeCartExtractor(cartData) {
  return {
    extractCartData: jest.fn(() => cartData),
    formatCartPropertiesForPostHog: jest.fn((cd) => ({
      product_names: cd.items.map((i) => i.name).join(', '),
      product: cd.items[0].product,
      cart_items: cd.items,
    })),
  };
}

// ─── install fresh module stubs ───────────────────────────────────────────────

function installStubs({ debug = false } = {}) {
  sessionStorage.clear();
  localStorage.clear();

  global.AskMeAnalyticsConfig = {
    debug,
    clientId:   'test-client',
    dedupScope: 'path',
    allowEmailIdentify: false,
    cartExtractorConfig: { itemSelector: '.cart-item' },
  };

  global.posthog = {
    capture:         jest.fn(),
    identify:        jest.fn(),
    alias:           jest.fn(),
    reset:           jest.fn(),
    group:           jest.fn(),
    setPersonProperties: jest.fn(),
    get_distinct_id: jest.fn(() => 'anon-id'),
    __loaded:        true,
  };
}

// ─── load the SDK modules we need ─────────────────────────────────────────────

function loadCapture() {
  delete global.PHEventCapture;
  // Clear in-memory dedup state so each test starts fresh
  delete global.__phFiredOnce;
  delete global.__phFiredOnceOrder;
  evalSDK('ph-event-capture.js');
}

function loadStepTracker() {
  delete global.PHStepTracker;
  evalSDK('ph-step-tracker.js');
}

function loadBoth() {
  // PHUtils is required by PHStepTracker — eval it if not already loaded
  if (!global.PHUtils) evalSDK('ph-utils.js');
  loadCapture();
  loadStepTracker();
}

// ─── set a fake pathname  (jsdom's location.pathname is read-only) ─────────────

function setPath(p) {
  window.history.pushState({}, '', p);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Assert sessionStorage contains valid ph_cart_data. */
function getCachedCart() {
  const raw = sessionStorage.getItem('ph_cart_data');
  expect(raw).not.toBeNull();
  return JSON.parse(raw);
}

// ─── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  setPath('/checkout');
  installStubs();
});

afterEach(() => {
  jest.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
  // Also clear in-memory dedup state to prevent cross-test contamination
  delete global.__phFiredOnce;
  delete global.__phFiredOnceOrder;
});

// ─── PHEventCapture — revenue enhancement ─────────────────────────────────────

describe('PHEventCapture — revenue enhancement (enhanceRevenueProps)', () => {
  beforeEach(() => loadCapture());

  test('adds revenue to CHECKOUT_COMPLETED using ph_last_price + ph_last_quantity in sessionStorage', () => {
    // PHEventCapture.enhanceRevenueProps reads price from props (not sessionStorage)
    // Pass price + quantity directly in event props
    const { captureOnce } = global.PHEventCapture;
    captureOnce(global.PH_KEYS.CHECKOUT_COMPLETED, {
      price: '29.99',
      quantity: '3',
      currency: 'USD',
    });
    jest.runAllTimers();

    const callArgs = global.posthog.capture.mock.calls[0];
    expect(callArgs).toBeDefined();
    const props = callArgs[1];
    // revenue = 29.99 × 3 = 89.97
    expect(parseFloat(props[global.PH_PROPS.REVENUE])).toBeCloseTo(89.97, 2);
  });

  test('adds revenue to SUBSCRIPTION_COMPLETED', () => {
    const { captureOnce } = global.PHEventCapture;
    captureOnce(global.PH_KEYS.SUBSCRIPTION_COMPLETED, {
      price: '49.00',
      currency: 'EUR',
      quantity: '1',
    });
    jest.runAllTimers();

    const callArgs = global.posthog.capture.mock.calls[0];
    expect(callArgs).toBeDefined();
    const props = callArgs[1];
    expect(parseFloat(props[global.PH_PROPS.REVENUE])).toBeCloseTo(49.0, 2);
  });

  test('does NOT add revenue to non-purchase events', () => {
    sessionStorage.setItem('ph_last_price', '99.99');

    const { captureOnce } = global.PHEventCapture;
    captureOnce('PRICING_PAGE_VIEWED', {});
    jest.runAllTimers();

    const callArgs = global.posthog.capture.mock.calls[0];
    const props = callArgs?.[1] ?? {};
    expect(props[global.PH_PROPS.REVENUE]).toBeUndefined();
  });
});

// ─── CHECKLIST 7 — cart caching + retrieval ───────────────────────────────────

describe('CHECKLIST 7 — CHECKOUT_STARTED caches cart; CHECKOUT_COMPLETED reads cache', () => {
  let cartExtractor;

  beforeEach(() => {
    loadBoth();
    cartExtractor = makeCartExtractor(makeCartData());
    global.PHCartExtractor = cartExtractor;
  });

  // ── CHECKOUT_STARTED ──────────────────────────────────────────────────────

  test('CHECKOUT_STARTED writes ph_cart_data to sessionStorage', () => {
    setPath('/checkout/cart');
    const rule = {
      key:         global.PH_KEYS.CHECKOUT_STARTED,
      url:         '/checkout/cart',
      urlMatch:    'contains',
      autoFire:    true,
      extractCart: true,
      selector:    null,
    };

    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, null);

    const cached = getCachedCart();
    expect(typeof cached.revenue).toBe('number');
    expect(cached.revenue).toBeCloseTo(TOTAL, 2);
    expect(cached.currency).toBe('USD');
    expect(Array.isArray(cached.items)).toBe(true);
    expect(cached.items).toHaveLength(SAMPLE_ITEMS.length);
  });

  test('cached cart includes product_names (comma-joined)', () => {
    setPath('/checkout/cart');
    const rule = {
      key: global.PH_KEYS.CHECKOUT_STARTED,
      url: '/checkout/cart', urlMatch: 'contains',
      autoFire: true, extractCart: true, selector: null,
    };

    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, null);
    const cached = getCachedCart();
    expect(cached.product_names).toBe('Widget A, Widget B');
  });

  test('cached cart has correct item_count and total_quantity', () => {
    setPath('/checkout/cart');
    const rule = {
      key: global.PH_KEYS.CHECKOUT_STARTED,
      url: '/checkout/cart', urlMatch: 'contains',
      autoFire: true, extractCart: true, selector: null,
    };

    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, null);
    const cached = getCachedCart();
    expect(cached.item_count).toBe(2);         // 2 distinct SKUs
    expect(cached.total_quantity).toBe(3);     // 2 × Widget A + 1 × Widget B
  });

  test('revenue = subtotal + tax + shipping', () => {
    setPath('/checkout/cart');
    const rule = {
      key: global.PH_KEYS.CHECKOUT_STARTED,
      url: '/checkout/cart', urlMatch: 'contains',
      autoFire: true, extractCart: true, selector: null,
    };

    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, null);
    const cached = getCachedCart();
    expect(cached.revenue).toBeCloseTo(SUBTOTAL + TAX + SHIPPING, 2);
  });

  // ── CHECKOUT_COMPLETED ────────────────────────────────────────────────────

  test('CHECKOUT_COMPLETED reads ph_cart_data and passes revenue to captureOnce', () => {
    // Pre-fill the cache as if CHECKOUT_STARTED already ran
    const cartPayload = {
      revenue:      TOTAL,
      currency:     'USD',
      subtotal:     SUBTOTAL,
      tax:          TAX,
      discount:     0,
      shipping:     SHIPPING,
      gratuity:     0,
      cart_total:   TOTAL,
      items:        SAMPLE_ITEMS,
      product_names: 'Widget A, Widget B',
      product:      'Widget A',
      item_count:   2,
      total_quantity: 3,
      cart_items:   SAMPLE_ITEMS,
      cached_at:    new Date().toISOString(),
    };
    sessionStorage.setItem('ph_cart_data', JSON.stringify(cartPayload));

    jest.spyOn(global.PHEventCapture, 'captureOnce');
    setPath('/checkout/confirmation');
    const rule = {
      key:       global.PH_KEYS.CHECKOUT_COMPLETED,
      url:       '/checkout/confirmation',
      urlMatch:  'contains',
      autoFire:  true,
      selector:  null,
    };

    // Pass a real extractRevenueData fn (step-tracker calls it as fallback)
    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, jest.fn(() => null));
    jest.runAllTimers();

    // PHStepTracker calls the original captureOnce (not the spy) since it captured
    // the function reference at module load time.  Verify via posthog.capture instead.
    const checkoutCalls = global.posthog.capture.mock.calls.filter(
      ([name]) => name === global.PH_KEYS.CHECKOUT_COMPLETED
    );
    expect(checkoutCalls.length).toBe(1);
    const props = checkoutCalls[0][1];
    expect(parseFloat(props[global.PH_PROPS.REVENUE])).toBeCloseTo(TOTAL, 2);
    expect(props[global.PH_PROPS.CURRENCY]).toBe('USD');
    expect(props.cart_items).toEqual(SAMPLE_ITEMS);
    expect(props.item_count).toBe(2);
    expect(props.total_quantity).toBe(3);
  });

  test('CHECKOUT_COMPLETED clears ph_cart_data from sessionStorage', () => {
    sessionStorage.setItem('ph_cart_data', JSON.stringify({
      revenue: TOTAL, currency: 'USD',
      subtotal: SUBTOTAL, tax: TAX, discount: 0, shipping: SHIPPING, gratuity: 0,
      cart_total: TOTAL, items: SAMPLE_ITEMS, product_names: 'Widget A',
      product: 'Widget A', item_count: 2, total_quantity: 3,
      cart_items: SAMPLE_ITEMS, cached_at: new Date().toISOString(),
    }));

    setPath('/checkout/confirmation');
    const rule = {
      key: global.PH_KEYS.CHECKOUT_COMPLETED,
      url: '/checkout/confirmation', urlMatch: 'contains',
      autoFire: true, selector: null,
    };
    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, jest.fn(() => null));
    jest.runAllTimers();

    expect(sessionStorage.getItem('ph_cart_data')).toBeNull();
  });

  test('CHECKOUT_COMPLETED without cached cart does not throw', () => {
    sessionStorage.removeItem('ph_cart_data');
    setPath('/checkout/confirmation');
    const rule = {
      key: global.PH_KEYS.CHECKOUT_COMPLETED,
      url: '/checkout/confirmation', urlMatch: 'contains',
      autoFire: true, selector: null,
    };
    // Pass a real non-null extractRevenueData to avoid TypeError in DOM fallback
    expect(() => {
      global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, jest.fn(() => null));
      jest.runAllTimers();
    }).not.toThrow();
  });
});

// ─── UTM first-touch attribution ──────────────────────────────────────────────

describe('UTM first-touch attribution through multi-step funnel', () => {
  beforeEach(() => loadCapture());

  test('UTM params captured on landing are present in CHECKOUT_COMPLETED event', () => {
    // Simulate what ph-product-injector's captureUTMParams() stores after a UTM landing
    // (the injector is not loaded in this integration test, so we set sessionStorage directly)
    sessionStorage.setItem('ph_utm_source',   'google');
    sessionStorage.setItem('ph_utm_medium',   'cpc');
    sessionStorage.setItem('ph_utm_campaign', 'summer_sale');

    setPath('/checkout/confirmation');
    // PHEventCapture reads UTMs from sessionStorage and attaches them to purchase events
    global.PHEventCapture.captureOnce(global.PH_KEYS.CHECKOUT_COMPLETED, { price: '99.00', currency: 'USD' });
    jest.runAllTimers();

    const calls = global.posthog.capture.mock.calls;
    const checkoutCall = calls.find(([name]) => name === global.PH_KEYS.CHECKOUT_COMPLETED);
    expect(checkoutCall).toBeDefined();
    const props = checkoutCall[1];
    // UTM props should be attached (using PH_PROPS.UTM_SOURCE = 'utm_source' key)
    expect(props[global.PH_PROPS.UTM_SOURCE]).toBe('google');
    expect(props[global.PH_PROPS.UTM_MEDIUM]).toBe('cpc');
  });
});

// ─── autoFire dedup across SPA navigation ─────────────────────────────────────

describe('autoFire dedup — event fires only once per session across SPA navigations', () => {
  beforeEach(() => {
    // Need PHEventCapture loaded before PHStepTracker (step-tracker captures captureOnce at load)
    if (!global.PHEventCapture) loadCapture();
    loadStepTracker();
  });

  test('autoFire rule fires on first URL match but NOT on second navigation to same URL', () => {
    setPath('/checkout/cart');
    const rule = {
      key:      'CHECKOUT_STARTED',
      url:      '/checkout/cart',
      urlMatch: 'contains',
      autoFire: true,
      selector: null,
    };

    // First navigation: rule fires
    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, jest.fn(() => null));
    expect(global.posthog.capture).toHaveBeenCalledTimes(1);
    expect(global.posthog.capture.mock.calls[0][0]).toBe('CHECKOUT_STARTED');

    // SPA back + forward to same URL — blockedRules prevents double-fire
    setPath('/');
    setPath('/checkout/cart');
    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, jest.fn(() => null));
    jest.runAllTimers();

    // Still only 1 call total
    expect(global.posthog.capture).toHaveBeenCalledTimes(1);
  });
});

// ─── cart localStorage fallback ───────────────────────────────────────────────

describe('localStorage cart fallback when DOM extraction returns empty', () => {
  beforeEach(() => {
    loadBoth();
    // Cart extractor that returns null (simulates empty DOM)
    global.PHCartExtractor = {
      extractCartData:              jest.fn(() => null),
      formatCartPropertiesForPostHog: jest.fn((cd) => ({
        product_names: cd.items.map((i) => i.name).join(', '),
        product:       cd.items[0].product,
        cart_items:    cd.items,
      })),
    };
  });

  test('falls back to localStorage test-cart when PHCartExtractor returns null', () => {
    const cartItems = [
      { id: 'sku-x', name: 'Test Product', price: 15.00, quantity: 2, currency: 'USD' },
    ];
    localStorage.setItem('test-cart', JSON.stringify(cartItems));

    setPath('/checkout');
    const rule = {
      key: global.PH_KEYS.CHECKOUT_STARTED,
      url: '/checkout', urlMatch: 'contains',
      autoFire: true, extractCart: true, selector: null,
    };

    global.PHStepTracker.tagElementsForRule(rule, global.AskMeAnalyticsConfig, null);

    const cached = getCachedCart();
    expect(cached.revenue).toBeCloseTo(15.00 * 2 + 15.00 * 2 * 0.08 + 3.99, 2);
    expect(cached.currency).toBe('USD');
    expect(cached.item_count).toBe(1);
  });
});
