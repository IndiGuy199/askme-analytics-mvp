/**
 * ph-observers.test.js
 *
 * Tests for ph-observers.js covering:
 *  - Route observer: history monkeypatching (pushState / replaceState / popstate)
 *  - Double-start guard
 *  - stopRouteObserver restores originals and cleans up popstate listener
 *  - Single callback emission per navigation (no duplicates)
 *  - MutationObserver 250ms debounce
 *  - watchVisibility helper
 *  - All console.log calls are gated behind config.debug
 */

const fs   = require('fs');
const path = require('path');

const SDK_PATH = path.join(__dirname, '..', 'ph-observers.js');

// ─── helpers ──────────────────────────────────────────────────────────────────

let origPushState;
let origReplaceState;

/** Re-evaluate the IIFE so every test starts with fresh module state. */
function loadObservers() {
  delete global.PHObservers;
  // eslint-disable-next-line no-eval
  global.eval(fs.readFileSync(SDK_PATH, 'utf-8'));
}

/**
 * Spy on jsdom's real history.pushState / replaceState so they still update
 * window.location.pathname (call-through) while giving us jest.fn() tracking.
 */
function mockHistory() {
  // jest.spyOn preserves the real implementation so location IS updated on call
  origPushState    = jest.spyOn(window.history, 'pushState');
  origReplaceState = jest.spyOn(window.history, 'replaceState');
}

function setPath(p) {
  window.history.pushState({}, '', p);
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  mockHistory();
  setPath('/start');
  global.AskMeAnalyticsConfig = { debug: false };
  loadObservers();
});

afterEach(() => {
  jest.useRealTimers();
  // Stop any observer that was started to avoid leaks across tests
  if (global.PHObservers && global.PHObservers.stopRouteObserver) {
    global.PHObservers.stopRouteObserver();
  }
  if (global.PHObservers && global.PHObservers.stopMutationObserver) {
    global.PHObservers.stopMutationObserver();
  }
  // Restore any jest.spyOn overrides
  jest.restoreAllMocks();
});

// ─── module loads ─────────────────────────────────────────────────────────────

describe('module initialisation', () => {
  test('exposes the full public API', () => {
    expect(typeof PHObservers.startMutationObserver).toBe('function');
    expect(typeof PHObservers.stopMutationObserver).toBe('function');
    expect(typeof PHObservers.startRouteObserver).toBe('function');
    expect(typeof PHObservers.stopRouteObserver).toBe('function');
    expect(typeof PHObservers.onMutation).toBe('function');
    expect(typeof PHObservers.onRouteChange).toBe('function');
    expect(typeof PHObservers.watchVisibility).toBe('function');
  });
});

// ─── CHECKLIST 3 & 4 — route observer via history monkeypatching ──────────────

describe('startRouteObserver – history monkeypatching', () => {
  test('no setInterval is scheduled after start (regression: old polling removed)', () => {
    jest.spyOn(global, 'setInterval');
    PHObservers.startRouteObserver();
    expect(setInterval).not.toHaveBeenCalled();
  });

  test('patches history.pushState with a wrapper function', () => {
    const before = global.history.pushState;
    PHObservers.startRouteObserver();
    expect(global.history.pushState).not.toBe(before);
    expect(typeof global.history.pushState).toBe('function');
  });

  test('patches history.replaceState with a wrapper function', () => {
    const before = global.history.replaceState;
    PHObservers.startRouteObserver();
    expect(global.history.replaceState).not.toBe(before);
  });

  test('wrapped pushState still calls the original', () => {
    PHObservers.startRouteObserver();
    global.history.pushState(null, '', '/pricing');
    expect(origPushState).toHaveBeenCalledWith(null, '', '/pricing');
  });

  test('wrapped replaceState still calls the original', () => {
    PHObservers.startRouteObserver();
    global.history.replaceState(null, '', '/about');
    expect(origReplaceState).toHaveBeenCalledWith(null, '', '/about');
  });

  test('emits onRouteChange(old, new) when pushState changes pathname', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();

    setPath('/pricing');
    global.history.pushState(null, '', '/pricing');

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('/start', '/pricing');
  });

  test('emits onRouteChange when replaceState changes pathname', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();

    setPath('/checkout');
    global.history.replaceState(null, '', '/checkout');

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('/start', '/checkout');
  });

  test('does NOT emit if pushState is called with the same pathname', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();

    // Same path – location.pathname unchanged
    global.history.pushState(null, '', '/start');
    expect(cb).not.toHaveBeenCalled();
  });

  test('emits only ONCE per unique navigation (no duplicate firings)', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();

    setPath('/pricing');
    global.history.pushState(null, '', '/pricing');
    global.history.pushState(null, '', '/pricing'); // same path again

    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('emits for sequential different routes without skipping', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();

    setPath('/pricing');
    global.history.pushState(null, '', '/pricing');
    setPath('/checkout');
    global.history.pushState(null, '', '/checkout');

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenNthCalledWith(1, '/start',   '/pricing');
    expect(cb).toHaveBeenNthCalledWith(2, '/pricing', '/checkout');
  });
});

// ─── CHECKLIST 4 — popstate (back/forward navigation) ─────────────────────────

describe('startRouteObserver – popstate handling', () => {
  test('fires onRouteChange when a popstate event fires with a changed pathname', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();

    setPath('/prev');
    window.dispatchEvent(new Event('popstate'));

    expect(cb).toHaveBeenCalledWith('/start', '/prev');
  });

  test('does not fire if popstate fires but pathname is unchanged', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();

    // pathname still /start
    window.dispatchEvent(new Event('popstate'));
    expect(cb).not.toHaveBeenCalled();
  });
});

// ─── CHECKLIST 4 — double-start guard ─────────────────────────────────────────

describe('startRouteObserver – double-start guard', () => {
  test('calling startRouteObserver twice does not register a second popstate listener', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();
    PHObservers.startRouteObserver(); // second call should be ignored

    setPath('/pricing');
    global.history.pushState(null, '', '/pricing');

    // Should fire exactly once despite two start() calls
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('calling startRouteObserver twice does not double-patch pushState', () => {
    PHObservers.startRouteObserver();
    const patchedOnce = global.history.pushState;
    PHObservers.startRouteObserver(); // second call
    expect(global.history.pushState).toBe(patchedOnce); // same reference, not re-patched
  });
});

// ─── stopRouteObserver — cleanup ──────────────────────────────────────────────

describe('stopRouteObserver', () => {
  test('restores the original history.pushState', () => {
    PHObservers.startRouteObserver();
    const wrapperFn = global.history.pushState;
    PHObservers.stopRouteObserver();
    // After stop the wrapper should be gone; a normal (non-wrapper) fn should be in place
    expect(global.history.pushState).not.toBe(wrapperFn);
    expect(typeof global.history.pushState).toBe('function');
  });

  test('restores the original history.replaceState', () => {
    PHObservers.startRouteObserver();
    const wrapperFn = global.history.replaceState;
    PHObservers.stopRouteObserver();
    expect(global.history.replaceState).not.toBe(wrapperFn);
    expect(typeof global.history.replaceState).toBe('function');
  });

  test('removes the popstate listener after stop', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();
    PHObservers.stopRouteObserver();

    setPath('/pricing');
    window.dispatchEvent(new Event('popstate'));
    expect(cb).not.toHaveBeenCalled();
  });

  test('after stop, pushState no longer triggers route callbacks', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);
    PHObservers.startRouteObserver();
    PHObservers.stopRouteObserver();

    setPath('/pricing');
    // Calling the now-restored original pushState — no wrapper in place
    global.history.pushState(null, '', '/pricing');
    expect(cb).not.toHaveBeenCalled();
  });

  test('can be restarted after stop', () => {
    const cb = jest.fn();
    PHObservers.onRouteChange(cb);  // register once — callbacks persist across stop/start
    PHObservers.startRouteObserver();
    PHObservers.stopRouteObserver();

    // Restart: don't re-register cb, callbacks array is preserved
    PHObservers.startRouteObserver();

    setPath('/dashboard');
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

// ─── MutationObserver — debounce ──────────────────────────────────────────────

describe('MutationObserver – debounce', () => {
  test('mutation callback is NOT fired immediately (debounced at 250ms)', () => {
    const cb = jest.fn();
    PHObservers.onMutation(cb);
    PHObservers.startMutationObserver(document.body);

    const div = document.createElement('div');
    document.body.appendChild(div);
    // Callbacks fire only after 250ms debounce; at 0ms they should not have fired
    expect(cb).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  test('mutation callback fires after 250ms debounce window', async () => {
    const cb = jest.fn();
    PHObservers.onMutation(cb);
    PHObservers.startMutationObserver(document.body);

    const div = document.createElement('div');
    document.body.appendChild(div);

    // Flush microtasks so jsdom's MutationObserver callback runs and schedules the setTimeout
    await Promise.resolve();
    jest.advanceTimersByTime(250);
    expect(cb).toHaveBeenCalledTimes(1);
    document.body.removeChild(div);
  });

  test('multiple rapid mutations are coalesced into one callback invocation', async () => {
    const cb = jest.fn();
    PHObservers.onMutation(cb);
    PHObservers.startMutationObserver(document.body);

    for (let i = 0; i < 5; i++) {
      const el = document.createElement('span');
      document.body.appendChild(el);
    }

    // Flush microtasks so all MutationObserver callbacks run (each clears + resets the debounce)
    await Promise.resolve();
    jest.advanceTimersByTime(300);
    // All mutations coalesced into 1 debounced callback
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('stopMutationObserver prevents callback from firing', () => {
    const cb = jest.fn();
    PHObservers.onMutation(cb);
    PHObservers.startMutationObserver(document.body);
    PHObservers.stopMutationObserver();

    const div = document.createElement('div');
    document.body.appendChild(div);
    jest.advanceTimersByTime(300);
    expect(cb).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });
});

// ─── debug logging gating ─────────────────────────────────────────────────────

describe('debug logging', () => {
  test('no console.log output when debug is false', () => {
    global.AskMeAnalyticsConfig = { debug: false };
    loadObservers();
    jest.spyOn(console, 'log');
    PHObservers.startRouteObserver();
    setPath('/pricing');
    global.history.pushState(null, '', '/pricing');
    expect(console.log).not.toHaveBeenCalled();
  });

  test('console.log output appears when debug is true', () => {
    global.AskMeAnalyticsConfig = { debug: true };
    loadObservers();
    jest.spyOn(console, 'log');
    PHObservers.startRouteObserver();
    setPath('/pricing');
    global.history.pushState(null, '', '/pricing');
    expect(console.log).toHaveBeenCalled();
  });
});
