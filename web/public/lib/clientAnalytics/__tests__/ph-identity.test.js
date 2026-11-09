/**
 * ph-identity.test.js
 *
 * Tests for ph-identity.js covering:
 *  - _takePreAuthId reads only sessionStorage (URL ?ph_id= fallback removed)
 *  - preAuthMark() stores the anonymous PostHog distinct_id
 *  - identifyUser safe default: setPersonProperties, NOT ph.identify
 *  - identifyUser allowEmailIdentify:true opt-in restores legacy ph.identify
 *  - Email is normalised to lowercase; in-memory dedup prevents double-calls
 *  - afterLoginIdentify: alias + identify + group + session dedup
 *  - onLogoutCleanup: calls posthog.reset and removes all storage keys
 *  - AMA._initialized guard prevents double-init
 *  - debug flag gating
 *
 * CHECKLIST items covered: 8, 9, 10
 */

const fs   = require('fs');
const path = require('path');

const SDK_PATH = path.join(__dirname, '..', 'ph-identity.js');

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadIdentity({ config = {} } = {}) {
  // Clear module state
  delete global.AMA;
  sessionStorage.clear();
  localStorage.clear();

  global.AskMeAnalyticsConfig = {
    debug: false,
    allowEmailIdentify: false,
    ...config,
  };

  global.posthog = {
    capture:         jest.fn(),
    identify:        jest.fn(),
    alias:           jest.fn(),
    reset:           jest.fn(),
    group:           jest.fn(),
    setPersonProperties: jest.fn(),
    get_distinct_id: jest.fn(() => 'anon-id'),
    __loaded: true,
  };
  global.window.posthog = global.posthog;

  // eslint-disable-next-line no-eval
  global.eval(fs.readFileSync(SDK_PATH, 'utf-8'));
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  window.history.pushState({}, '', '/');
  loadIdentity();
});

afterEach(() => {
  jest.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
});

// ─── module loads ─────────────────────────────────────────────────────────────

describe('module initialisation', () => {
  test('exposes window.AMA with all required methods', () => {
    expect(typeof AMA.preAuthMark).toBe('function');
    expect(typeof AMA.afterLoginIdentify).toBe('function');
    expect(typeof AMA.onLogoutCleanup).toBe('function');
    expect(typeof AMA.identifyUser).toBe('function');
    expect(typeof AMA._takePreAuthId).toBe('function');
  });

  test('AMA.version is set', () => {
    expect(AMA.version).toBe('2.0.0');
  });

  test('AMA.isReady is true after load', () => {
    expect(AMA.isReady).toBe(true);
  });

  test('AMA._initialized guard prevents double init', () => {
    // Load again — should bail early, not throw or overwrite
    expect(() => {
      // eslint-disable-next-line no-eval
      global.eval(fs.readFileSync(SDK_PATH, 'utf-8'));
    }).not.toThrow();
    expect(AMA.isReady).toBe(true);
  });
});

// ─── preAuthMark ──────────────────────────────────────────────────────────────

describe('AMA.preAuthMark()', () => {
  test('stores anonymous PostHog distinct_id in sessionStorage', () => {
    AMA.preAuthMark();
    expect(sessionStorage.getItem('ama:pre_ph_id')).toBe('anon-id');
  });

  test('returns the pre-auth id', () => {
    const id = AMA.preAuthMark();
    expect(id).toBe('anon-id');
  });

  test('returns null when posthog unavailable', () => {
    delete global.posthog;
    delete global.window.posthog;
    const id = AMA.preAuthMark();
    expect(id).toBeNull();
  });
});

// ─── _takePreAuthId ───────────────────────────────────────────────────────────

describe('AMA._takePreAuthId() – URL fallback removed', () => {
  test('returns value from sessionStorage', () => {
    sessionStorage.setItem('ama:pre_ph_id', 'stored-id');
    expect(AMA._takePreAuthId()).toBe('stored-id');
  });

  test('returns null when sessionStorage is empty', () => {
    expect(AMA._takePreAuthId()).toBeNull();
  });

  test('SECURITY: does NOT read ?ph_id= query param (URL fallback removed)', () => {
    window.history.pushState({}, '', '/?ph_id=url-injected-id');
    // Nothing in sessionStorage
    const result = AMA._takePreAuthId();
    expect(result).toBeNull();
    expect(result).not.toBe('url-injected-id');
  });
});

// ─── CHECKLIST 8 — identifyUser safe default ─────────────────────────────────

describe('AMA.identifyUser() – safe default (allowEmailIdentify:false)', () => {
  test('CHECKLIST 8: calls setPersonProperties instead of ph.identify', () => {
    AMA.identifyUser('User@Example.com');
    expect(posthog.setPersonProperties).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com', identified_via: 'injector' })
    );
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  test('email is normalised to lowercase before use', () => {
    AMA.identifyUser('UPPER@CASE.COM');
    expect(posthog.setPersonProperties).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'upper@case.com' })
    );
  });

  test('in-memory dedup: calling identifyUser twice with same email fires only once', () => {
    AMA.identifyUser('same@email.com');
    AMA.identifyUser('same@email.com');
    expect(posthog.setPersonProperties).toHaveBeenCalledTimes(1);
  });

  test('different emails are each identified separately', () => {
    AMA.identifyUser('a@test.com');
    AMA.identifyUser('b@test.com');
    expect(posthog.setPersonProperties).toHaveBeenCalledTimes(2);
  });

  test('extra properties are forwarded to setPersonProperties', () => {
    AMA.identifyUser('user@test.com', { company: 'Acme' });
    expect(posthog.setPersonProperties).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'Acme' })
    );
  });

  test('ignores empty/null email', () => {
    AMA.identifyUser('');
    AMA.identifyUser(null);
    AMA.identifyUser(undefined);
    expect(posthog.setPersonProperties).not.toHaveBeenCalled();
  });

  test('falls back to $set capture when setPersonProperties unavailable', () => {
    delete posthog.setPersonProperties;
    global.window.posthog = posthog;
    AMA.identifyUser('noprop@test.com');
    expect(posthog.capture).toHaveBeenCalledWith('$set', expect.objectContaining({
      $set: expect.objectContaining({ email: 'noprop@test.com' }),
    }));
  });

  test('does NOT change the anonymous distinct_id', () => {
    AMA.identifyUser('user@test.com');
    expect(posthog.identify).not.toHaveBeenCalled();
    // distinct_id untouched — get_distinct_id still returns the original
    expect(posthog.get_distinct_id()).toBe('anon-id');
  });
});

// ─── CHECKLIST 9 — identifyUser allowEmailIdentify:true opt-in ───────────────

describe('AMA.identifyUser() – allowEmailIdentify:true (opt-in legacy)', () => {
  beforeEach(() => {
    loadIdentity({ config: { allowEmailIdentify: true } });
  });

  test('CHECKLIST 9: calls ph.identify with email as distinct_id', () => {
    AMA.identifyUser('legacy@test.com');
    expect(posthog.identify).toHaveBeenCalledWith(
      'legacy@test.com',
      expect.objectContaining({ email: 'legacy@test.com', identified_via: 'injector' })
    );
  });

  test('does NOT call setPersonProperties in legacy mode', () => {
    AMA.identifyUser('legacy@test.com');
    expect(posthog.setPersonProperties).not.toHaveBeenCalled();
  });

  test('email is still normalised to lowercase in legacy mode', () => {
    AMA.identifyUser('LEGACY@TEST.COM');
    expect(posthog.identify).toHaveBeenCalledWith('legacy@test.com', expect.any(Object));
  });
});

// ─── CHECKLIST 10 — afterLoginIdentify ───────────────────────────────────────

describe('AMA.afterLoginIdentify() – alias + identify + group', () => {
  test('CHECKLIST 10a: calls posthog.alias with userId and pre-auth id', () => {
    sessionStorage.setItem('ama:pre_ph_id', 'anon-123');
    AMA.afterLoginIdentify({ id: 'user-456', email: 'me@example.com' }, {});
    expect(posthog.alias).toHaveBeenCalledWith('user-456', 'anon-123');
  });

  test('CHECKLIST 10b: calls posthog.identify with userId as distinct_id', () => {
    AMA.afterLoginIdentify({ id: 'user-456', email: 'me@example.com' }, {});
    expect(posthog.identify).toHaveBeenCalledWith(
      'user-456',
      expect.objectContaining({ email: 'me@example.com' })
    );
  });

  test('CHECKLIST 10c: calls posthog.group when company_id provided', () => {
    AMA.afterLoginIdentify(
      { id: 'user-456', email: 'me@example.com' },
      { company_id: 'co-1', company_name: 'Acme', company_slug: 'acme' }
    );
    expect(posthog.group).toHaveBeenCalledWith('company', 'co-1', {
      company_name: 'Acme',
      company_slug: 'acme',
    });
  });

  test('does NOT call alias when no pre-auth id in sessionStorage', () => {
    // sessionStorage is clean (no ama:pre_ph_id)
    AMA.afterLoginIdentify({ id: 'user-789', email: 'x@y.com' }, {});
    expect(posthog.alias).not.toHaveBeenCalled();
  });

  test('does NOT call alias if preAuthId equals userId', () => {
    sessionStorage.setItem('ama:pre_ph_id', 'user-456');
    AMA.afterLoginIdentify({ id: 'user-456', email: 'x@y.com' }, {});
    expect(posthog.alias).not.toHaveBeenCalled();
  });

  test('CHECKLIST 10 dedup: second call with same userId in same session is skipped', () => {
    AMA.afterLoginIdentify({ id: 'user-456', email: 'me@example.com' }, {});
    jest.clearAllMocks();
    AMA.afterLoginIdentify({ id: 'user-456', email: 'me@example.com' }, {});
    // Second call is a no-op — session dedup key present
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  test('fires USER_IDENTIFIED capture event', () => {
    AMA.afterLoginIdentify({ id: 'user-456', email: 'me@example.com' }, {});
    expect(posthog.capture).toHaveBeenCalledWith('USER_IDENTIFIED', expect.any(Object));
  });

  test('ignores missing user.id gracefully', () => {
    expect(() => AMA.afterLoginIdentify({}, {})).not.toThrow();
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  test('ignores null user gracefully', () => {
    expect(() => AMA.afterLoginIdentify(null, {})).not.toThrow();
    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

// ─── CHECKLIST 10 — onLogoutCleanup ──────────────────────────────────────────

describe('AMA.onLogoutCleanup()', () => {
  test('CHECKLIST 10: calls posthog.reset()', () => {
    AMA.onLogoutCleanup('user-456');
    expect(posthog.reset).toHaveBeenCalledTimes(1);
  });

  test('clears session dedup key for the user', () => {
    sessionStorage.setItem('ph_ss_identified_user-456', '1');
    AMA.onLogoutCleanup('user-456');
    expect(sessionStorage.getItem('ph_ss_identified_user-456')).toBeNull();
  });

  test('clears localStorage identified key for the user', () => {
    localStorage.setItem('posthog_identified_user-456', 'user-456');
    AMA.onLogoutCleanup('user-456');
    expect(localStorage.getItem('posthog_identified_user-456')).toBeNull();
  });

  test('clears ama:pre_ph_id from sessionStorage', () => {
    sessionStorage.setItem('ama:pre_ph_id', 'was-anon');
    AMA.onLogoutCleanup('user-456');
    expect(sessionStorage.getItem('ama:pre_ph_id')).toBeNull();
  });

  test('calling without userId does not throw', () => {
    expect(() => AMA.onLogoutCleanup()).not.toThrow();
    expect(posthog.reset).toHaveBeenCalled();
  });

  test('after logout, a subsequent afterLoginIdentify identifies fresh', () => {
    AMA.afterLoginIdentify({ id: 'user-456', email: 'x@y.com' }, {});
    AMA.onLogoutCleanup('user-456');
    jest.clearAllMocks();

    // Reload module to reset in-memory state; re-identify fresh user
    loadIdentity();
    AMA.afterLoginIdentify({ id: 'user-456', email: 'x@y.com' }, {});
    expect(posthog.identify).toHaveBeenCalled();
  });
});

// ─── debug logging gating ─────────────────────────────────────────────────────

describe('debug logging', () => {
  test('no console.log when debug:false', () => {
    loadIdentity({ config: { debug: false } });
    jest.spyOn(console, 'log');
    AMA.identifyUser('quiet@test.com');
    expect(console.log).not.toHaveBeenCalled();
  });

  test('console.log fires when debug:true', () => {
    loadIdentity({ config: { debug: true } });
    jest.spyOn(console, 'log');
    AMA.identifyUser('loud@test.com');
    expect(console.log).toHaveBeenCalled();
  });
});
