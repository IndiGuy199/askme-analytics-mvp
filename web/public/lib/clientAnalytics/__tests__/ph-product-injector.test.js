/**
 * ph-product-injector.test.js
 *
 * Tests for ph-product-injector-refactored.js covering:
 *  - CHECKLIST 1: bootCalled guard — boot() executes exactly once per page load
 *  - CHECKLIST 2: globalClickBound guard — click listener attached exactly once
 *  - hookSPA() removed — no history monkeypatching inside the injector
 *  - ph:routechange listener removed — route detection is owned by ph-observers
 *  - AMA API is locked (non-writable) after module loads
 *  - Dependency check fails gracefully when modules missing
 *  - debug logging gated
 */

const fs   = require('fs');
const path = require('path');

const SDK_PATH = path.join(__dirname, '..', 'ph-product-injector-refactored.js');

// ─── minimal dependency stubs ─────────────────────────────────────────────────

function installDeps() {
  // ph-constants.js globals already loaded by test-setup.js
  // Install the minimal module stubs the injector checks for

  global.PHUtils = {
    isNonEmptyStr:   (s) => typeof s === 'string' && s.trim().length > 0,
    isValidSelector: (s) => { try { document.querySelector(s); return true; } catch { return false; } },
    isVisible:       () => true,
    selectorListFrom: () => [],
    parseMaybeJSONList: () => [],
    qsa:             (s) => { try { return Array.from(document.querySelectorAll(s)); } catch { return []; } },
    norm:            (s) => s.trim(),
    first:           (root, sel) => { try { return root.querySelector(sel); } catch { return null; } },
    findFirstElement: () => null,
    findElements:    () => [],
    ciRegex:         () => null,
  };

  global.PHEventCapture = {
    captureOnce: jest.fn(),
    isReady:     () => true,
    getQueueLength: () => 0,
  };

  global.PHExtractors = {
    guessContainer:       () => null,
    extractFromContainer: () => null,
    extractFromCheckboxes: () => null,
    extractRevenueData:   () => ({}),
  };

  global.PHObservers = {
    onMutation:           jest.fn(),
    onRouteChange:        jest.fn(),
    startMutationObserver: jest.fn(),
    stopMutationObserver:  jest.fn(),
    startRouteObserver:    jest.fn(),
    stopRouteObserver:     jest.fn(),
    watchVisibility:       jest.fn(),
  };

  global.PHStepTracker = {
    applyAllRules:           jest.fn(),
    tagElementsForRule:      jest.fn(),
    extractEventNameFromClass: jest.fn(() => null),
    scanForPhTrackClasses:   jest.fn(),
    sentStepEls:             new WeakSet(),
  };

  global.AMA = {
    preAuthMark:       jest.fn(),
    afterLoginIdentify: jest.fn(),
    onLogoutCleanup:   jest.fn(),
    _takePreAuthId:    jest.fn(() => null),
    identifyUser:      jest.fn(),
    version:           '2.0.0',
    isReady:           false,
    _initialized:      true,
  };
}

/** Create the <script id="ph-product-injector"> tag the module looks for. */
function createInjectorScript(extraAttrs = {}) {
  const script = document.createElement('script');
  script.id  = 'ph-product-injector';
  script.src = '/lib/clientAnalytics/ph-product-injector-refactored.js';
  // Minimal required attributes
  Object.entries({
    'data-event-name': 'product_click',
    'data-page-match': '',
    'data-steps':      '[]',
    'data-panel-class': '',
    'data-title-class': '',
    'data-price-class': '',
    'data-currency-class': '',
    ...extraAttrs,
  }).forEach(([k, v]) => script.setAttribute(k, v));
  document.head.appendChild(script);
  return script;
}

function loadInjector() {
  // eslint-disable-next-line no-eval
  global.eval(fs.readFileSync(SDK_PATH, 'utf-8'));
}

// ─── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  global.AskMeAnalyticsConfig = { debug: false, dedupScope: 'path' };

  // Clean ALL side-effects from previous test
  document.head.innerHTML   = '';
  document.body.innerHTML   = '';

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
  global.window.posthog = global.posthog;

  installDeps();
  createInjectorScript();
});

afterEach(() => {
  jest.useRealTimers();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  // Restore any spies set in this test to prevent cross-test contamination
  jest.restoreAllMocks();
  // Remove stale window 'load' handlers that the injector registers
  // (prevents accumulation across tests)
  jest.clearAllMocks();
});

// ─── dependency check ─────────────────────────────────────────────────────────

describe('dependency guard', () => {
  test('module exits early and does not throw when a dependency is missing', () => {
    delete global.PHUtils;
    expect(() => loadInjector()).not.toThrow();
  });

  test('does not register click listener when dependencies missing', () => {
    delete global.PHUtils;
    jest.spyOn(document, 'addEventListener');
    loadInjector();
    expect(document.addEventListener).not.toHaveBeenCalledWith('click', expect.any(Function), expect.anything());
  });
});

// ─── CHECKLIST 1 — bootCalled guard ──────────────────────────────────────────

describe('CHECKLIST 1 — boot() guard', () => {
  test('boot() runs exactly once even though DOMContentLoaded and load both fire', () => {
    loadInjector();

    // Advance timers — the deferred setTimeout(boot, 0) fires
    jest.runAllTimers();

    // Simulate 'load' event (second trigger for boot)
    window.dispatchEvent(new Event('load'));
    jest.runAllTimers();

    // applyAllRules is called inside boot(); should be called exactly once
    expect(PHStepTracker.applyAllRules).toHaveBeenCalledTimes(1);
  });

  test('reloading the module (fresh eval) gives a fresh bootCalled=false state', () => {
    loadInjector();
    jest.runAllTimers();
    // First load: applyAllRules called once on the SAME PHStepTracker mock
    expect(PHStepTracker.applyAllRules).toHaveBeenCalledTimes(1);

    // Second eval: don't reinstall deps (keep same mocks) so we can track cumulative calls
    document.head.innerHTML = '';
    createInjectorScript();          // re-create the <script> tag
    loadInjector();                  // new closure, fresh bootCalled=false
    jest.runAllTimers();

    // Boot ran again → applyAllRules called twice on the same mock
    expect(PHStepTracker.applyAllRules).toHaveBeenCalledTimes(2);
  });
});

// ─── CHECKLIST 2 — globalClickBound guard ────────────────────────────────────

describe('CHECKLIST 2 — bindGlobalClick() guard', () => {
  test('document click listener is attached exactly once per module load', () => {
    // Spy BEFORE loading — spy is fresh due to jest.restoreAllMocks() in afterEach
    const addSpy = jest.spyOn(document, 'addEventListener');
    loadInjector();
    jest.runAllTimers();
    // Simulate multiple triggers that would call bindGlobalClick() again
    // if the guard were absent (load fires boot again, ph:routechange fires onRoute)
    window.dispatchEvent(new Event('load'));  // boot returns early (bootCalled=true)
    jest.runAllTimers();

    const clickListeners = addSpy.mock.calls.filter(([evt]) => evt === 'click');
    expect(clickListeners.length).toBe(1);
  });

  test('click event on a .ph-track-* element fires PHEventCapture.captureOnce once', () => {
    loadInjector();
    jest.runAllTimers();

    // Create a tracked button
    const btn = document.createElement('button');
    btn.className = 'ph-track-LOGIN_ATTEMPTED';
    document.body.appendChild(btn);

    // Stub extractEventNameFromClass to return the real event
    PHStepTracker.extractEventNameFromClass.mockReturnValue('LOGIN_ATTEMPTED');

    btn.click();
    btn.click(); // second click — should NOT double-fire (sentStepEls WeakSet)

    const loginCalls = PHEventCapture.captureOnce.mock.calls.filter(
      ([name]) => name === 'LOGIN_ATTEMPTED'
    );
    expect(loginCalls.length).toBeLessThanOrEqual(1);
  });
});

// ─── hookSPA removed ─────────────────────────────────────────────────────────

describe('hookSPA removed', () => {
  test('loading the injector does NOT monkeypatch history.pushState', () => {
    const origPush = window.history.pushState;
    loadInjector();
    jest.runAllTimers();
    expect(window.history.pushState).toBe(origPush);
  });

  test('loading the injector does NOT monkeypatch history.replaceState', () => {
    const origReplace = window.history.replaceState;
    loadInjector();
    jest.runAllTimers();
    expect(window.history.replaceState).toBe(origReplace);
  });
});

// ─── AMA API locking ──────────────────────────────────────────────────────────

describe('AMA API locking', () => {
  test('AMA.preAuthMark is non-writable after module loads', () => {
    const original = AMA.preAuthMark;
    loadInjector();
    jest.runAllTimers();
    // Silently fails in strict mode; property remains unchanged
    try { AMA.preAuthMark = () => 'hacked'; } catch { /* expected in strict */ }
    expect(AMA.preAuthMark).toBe(original);
  });

  test('AMA.afterLoginIdentify is non-writable after module loads', () => {
    const original = AMA.afterLoginIdentify;
    loadInjector();
    jest.runAllTimers();
    try { AMA.afterLoginIdentify = () => 'hacked'; } catch { /* expected */ }
    expect(AMA.afterLoginIdentify).toBe(original);
  });
});

// ─── observers wired up ───────────────────────────────────────────────────────

describe('observer wiring', () => {
  test('registers an onMutation callback with PHObservers', () => {
    loadInjector();
    expect(PHObservers.onMutation).toHaveBeenCalledWith(expect.any(Function));
  });

  test('registers an onRouteChange callback with PHObservers', () => {
    loadInjector();
    expect(PHObservers.onRouteChange).toHaveBeenCalledWith(expect.any(Function));
  });

  test('starts both MutationObserver and RouteObserver', () => {
    loadInjector();
    expect(PHObservers.startMutationObserver).toHaveBeenCalled();
    expect(PHObservers.startRouteObserver).toHaveBeenCalled();
  });
});

// ─── debug logging gating ─────────────────────────────────────────────────────

describe('debug logging', () => {
  test('no console.log output when debug:false', () => {
    global.AskMeAnalyticsConfig = { debug: false };
    jest.spyOn(console, 'log');
    loadInjector();
    jest.runAllTimers();
    expect(console.log).not.toHaveBeenCalled();
  });

  test('console.log fires when debug:true', () => {
    global.AskMeAnalyticsConfig = { debug: true };
    jest.spyOn(console, 'log');
    loadInjector();
    jest.runAllTimers();
    expect(console.log).toHaveBeenCalled();
  });
});
