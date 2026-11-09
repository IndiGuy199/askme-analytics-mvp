/**
 * ph-event-capture.test.js
 *
 * Tests for ph-event-capture.js covering:
 *  - buildDedupKey with dedupScope: "path" | "path+query" | "full_url"
 *  - 500-key FIFO cap (oldest evicted when at capacity)
 *  - captureOnce deduplication (scopePath true/false)
 *  - Event queuing when PostHog is not yet ready, then flush on ready
 *  - UTM parameter extraction and attachment to events
 *  - Revenue/unit_price enhancement for purchase events
 *  - debug flag gates console.log output
 */

const fs   = require('fs');
const path = require('path');

const SDK_PATH = path.join(__dirname, '..', 'ph-event-capture.js');

// ─── helpers ──────────────────────────────────────────────────────────────────

function setPath(pathname, search = '') {
  window.history.pushState({}, '', pathname + search);
}

/** Fresh module load.  posthog mock is set before loading so the
 *  poll loop finds it immediately (phReady = true) unless explicitly
 *  overridden in a test. */
function loadCapture({ posthogReady = true } = {}) {
  delete global.PHEventCapture;
  delete global.__phFiredOnce;
  delete global.__phFiredOnceOrder;
  sessionStorage.clear();

  if (posthogReady) {
    global.posthog = {
      capture:   jest.fn(),
      identify:  jest.fn(),
      alias:     jest.fn(),
      reset:     jest.fn(),
      group:     jest.fn(),
      get_distinct_id: jest.fn(() => 'anon-id'),
      __loaded:  true,
    };
    global.window.posthog = global.posthog;
  } else {
    // posthog not yet loaded
    delete global.posthog;
    delete global.window.posthog;
  }

  // eslint-disable-next-line no-eval
  global.eval(fs.readFileSync(SDK_PATH, 'utf-8'));
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  setPath('/start');
  global.AskMeAnalyticsConfig = { debug: false, dedupScope: 'path' };
  loadCapture();
});

afterEach(() => {
  jest.useRealTimers();
  sessionStorage.clear();
});

// ─── module loads ─────────────────────────────────────────────────────────────

describe('module initialisation', () => {
  test('exposes PHEventCapture with captureOnce, isReady, getQueueLength', () => {
    expect(typeof PHEventCapture.captureOnce).toBe('function');
    expect(typeof PHEventCapture.isReady).toBe('function');
    expect(typeof PHEventCapture.getQueueLength).toBe('function');
  });
});

// ─── CHECKLIST 5 — dedupScope "path" (default) ───────────────────────────────

describe('captureOnce – dedupScope "path" (default)', () => {
  test('fires DASHBOARD_VIEWED once on /dashboard', () => {
    setPath('/dashboard');
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {});
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  test('CHECKLIST 5: does NOT fire DASHBOARD_VIEWED a second time on the same path', () => {
    setPath('/dashboard');
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {});
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {});
    // Only once
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  test('fires again if the path changes', () => {
    setPath('/dashboard');
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {});
    setPath('/dashboard/settings'); // different pathname
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {});
    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });

  test('query string ignored in "path" scope — same path+different query = still deduped', () => {
    setPath('/pricing', '?plan=pro');
    global.AskMeAnalyticsConfig.dedupScope = 'path';
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});
    setPath('/pricing', '?plan=basic');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});
    // Both share the same pathname → second is deduped
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  test('scopePath=false bypasses dedup and fires every time', () => {
    setPath('/dashboard');
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {}, { scopePath: false });
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {}, { scopePath: false });
    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });

  test('dedup key is persisted to sessionStorage across module reload', () => {
    setPath('/pricing');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});
    expect(posthog.capture).toHaveBeenCalledTimes(1);

    // Simulate a page reload: clear ONLY the in-memory globals so the module
    // hydrates from sessionStorage.  Do NOT call loadCapture() — that would
    // also wipe sessionStorage and create a fresh posthog mock.
    delete global.__phFiredOnce;
    delete global.__phFiredOnceOrder;
    delete global.PHEventCapture;
    // eslint-disable-next-line no-eval
    global.eval(fs.readFileSync(require('path').join(__dirname, '..', 'ph-event-capture.js'), 'utf-8'));

    setPath('/pricing');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});

    // Total still 1: the second call was deduped via sessionStorage
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });
});

// ─── CHECKLIST 6 — dedupScope "path+query" ───────────────────────────────────

describe('captureOnce – dedupScope "path+query"', () => {
  beforeEach(() => {
    global.AskMeAnalyticsConfig = { debug: false, dedupScope: 'path+query' };
    loadCapture();
  });

  test('CHECKLIST 6: fires for /pricing?plan=pro then fires AGAIN for /pricing?plan=basic', () => {
    setPath('/pricing', '?plan=pro');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});
    setPath('/pricing', '?plan=basic');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});
    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });

  test('deduplicates when same path+query visited twice', () => {
    setPath('/pricing', '?plan=pro');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });
});

// ─── dedupScope "full_url" ────────────────────────────────────────────────────

describe('captureOnce – dedupScope "full_url"', () => {
  beforeEach(() => {
    global.AskMeAnalyticsConfig = { debug: false, dedupScope: 'full_url' };
    loadCapture();
  });

  test('different full hrefs are treated as separate events', () => {
    // Different full URLs (pathname+query) even with same pathname
    window.history.pushState({}, '', '/pricing?ref=email');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});

    window.history.pushState({}, '', '/pricing?ref=social');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});

    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });
});

// ─── 500-key FIFO cap ─────────────────────────────────────────────────────────

describe('dedup key FIFO cap (500 keys)', () => {
  test('500-key cap evicts the oldest key when exceeded', () => {
    // Fill the set to exactly 500 with unique path-scoped events
    for (let i = 0; i < 500; i++) {
      setPath(`/page-${i}`);
      PHEventCapture.captureOnce('PRODUCT_VIEWED', {});
    }
    expect(posthog.capture).toHaveBeenCalledTimes(500);

    // Adding a NEW (501st) unique key triggers eviction of the OLDEST key (page-0)
    setPath('/page-500');
    PHEventCapture.captureOnce('PRODUCT_VIEWED', {});
    // page-500 fires (new unique key) — also evicts page-0 from the set
    expect(posthog.capture).toHaveBeenCalledTimes(501);

    // page-0 was evicted, so it should fire again now
    setPath('/page-0');
    PHEventCapture.captureOnce('PRODUCT_VIEWED', {});
    expect(posthog.capture).toHaveBeenCalledTimes(502);
  });

  test('key inserted at 501st position does not push capacity past 500', () => {
    for (let i = 0; i < 505; i++) {
      setPath(`/p-${i}`);
      PHEventCapture.captureOnce('PRODUCT_VIEWED', {});
    }
    // __phFiredOnceOrder should never exceed 500
    expect(global.__phFiredOnceOrder.length).toBeLessThanOrEqual(500);
  });

  test('Set and Order array stay in sync after eviction', () => {
    for (let i = 0; i < 502; i++) {
      setPath(`/x-${i}`);
      PHEventCapture.captureOnce('PRODUCT_VIEWED', {});
    }
    expect(global.__phFiredOnce.size).toBe(global.__phFiredOnceOrder.length);
  });
});

// ─── event queuing when PostHog not ready ─────────────────────────────────────

describe('event queuing', () => {
  beforeEach(() => {
    loadCapture({ posthogReady: false });
  });

  test('events are queued when posthog is not loaded', () => {
    setPath('/pricing');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', { test: true });
    expect(PHEventCapture.getQueueLength()).toBe(1);
  });

  test('queue flushes when posthog becomes available (poll)', () => {
    setPath('/pricing');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {});
    expect(PHEventCapture.getQueueLength()).toBe(1);

    // Now make posthog available
    global.posthog = {
      capture: jest.fn(),
      identify: jest.fn(),
      __loaded: true,
    };
    global.window.posthog = global.posthog;

    // Advance timers to trigger poll (150ms interval)
    jest.advanceTimersByTime(200);

    expect(posthog.capture).toHaveBeenCalledWith('PRICING_PAGE_VIEWED', expect.any(Object));
    expect(PHEventCapture.getQueueLength()).toBe(0);
  });

  test('multiple queued events all flush in order', () => {
    setPath('/a');
    PHEventCapture.captureOnce('LANDING_PAGE_VIEWED', {}, { scopePath: false });
    setPath('/b');
    PHEventCapture.captureOnce('PRICING_PAGE_VIEWED', {}, { scopePath: false });
    expect(PHEventCapture.getQueueLength()).toBe(2);

    global.posthog = { capture: jest.fn(), __loaded: true };
    global.window.posthog = global.posthog;
    jest.advanceTimersByTime(200);

    expect(posthog.capture).toHaveBeenCalledTimes(2);
    expect(posthog.capture).toHaveBeenNthCalledWith(1, 'LANDING_PAGE_VIEWED', expect.any(Object));
    expect(posthog.capture).toHaveBeenNthCalledWith(2, 'PRICING_PAGE_VIEWED', expect.any(Object));
  });
});

// ─── UTM parameter extraction ─────────────────────────────────────────────────

describe('UTM parameters', () => {
  test('attaches utm_source from URL search param', () => {
    setPath('/landing', '?utm_source=google&utm_medium=cpc&utm_campaign=spring');
    PHEventCapture.captureOnce('LANDING_PAGE_VIEWED', {}, { scopePath: false });
    const [, props] = posthog.capture.mock.calls[0];
    expect(props.utm_source).toBe('google');
    expect(props.utm_medium).toBe('cpc');
    expect(props.utm_campaign).toBe('spring');
  });

  test('falls back to sessionStorage UTM when URL params absent', () => {
    sessionStorage.setItem('ph_utm_source',   'newsletter');
    sessionStorage.setItem('ph_utm_medium',   'email');
    sessionStorage.setItem('ph_utm_campaign', 'weekly');
    setPath('/dashboard');
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {}, { scopePath: false });
    const [, props] = posthog.capture.mock.calls[0];
    expect(props.utm_source).toBe('newsletter');
    expect(props.utm_medium).toBe('email');
  });
});

// ─── revenue enhancement ──────────────────────────────────────────────────────

describe('revenue enhancement on purchase events', () => {
  test('CHECKOUT_COMPLETED gets revenue = price * quantity', () => {
    setPath('/dashboard');
    PHEventCapture.captureOnce('CHECKOUT_COMPLETED', { price: '29.99', quantity: '2' }, { scopePath: false });
    const [, props] = posthog.capture.mock.calls[0];
    expect(props.revenue).toBe('59.98');
    expect(props.unit_price).toBe('29.99');
  });

  test('SUBSCRIPTION_COMPLETED gets revenue enrichment', () => {
    setPath('/dashboard');
    PHEventCapture.captureOnce('SUBSCRIPTION_COMPLETED', { price: '99.00', quantity: '1' }, { scopePath: false });
    const [, props] = posthog.capture.mock.calls[0];
    expect(props.revenue).toBe('99.00');
  });

  test('non-purchase event does NOT get revenue injected', () => {
    setPath('/dashboard');
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {}, { scopePath: false });
    const [, props] = posthog.capture.mock.calls[0];
    expect(props.revenue).toBeUndefined();
  });
});

// ─── invalid event name ───────────────────────────────────────────────────────

describe('input validation', () => {
  test('captureOnce ignores empty name', () => {
    PHEventCapture.captureOnce('', {});
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  test('captureOnce ignores null/undefined name', () => {
    PHEventCapture.captureOnce(null, {});
    PHEventCapture.captureOnce(undefined, {});
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

// ─── debug logging gating ─────────────────────────────────────────────────────

describe('debug logging', () => {
  test('no console.log output when debug:false', () => {
    global.AskMeAnalyticsConfig = { debug: false, dedupScope: 'path' };
    loadCapture();
    jest.spyOn(console, 'log');
    setPath('/test');
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {});
    expect(console.log).not.toHaveBeenCalled();
  });

  test('console.log fires when debug:true', () => {
    global.AskMeAnalyticsConfig = { debug: true, dedupScope: 'path' };
    loadCapture();
    jest.spyOn(console, 'log');
    setPath('/test');
    PHEventCapture.captureOnce('DASHBOARD_VIEWED', {});
    expect(console.log).toHaveBeenCalled();
  });
});
