# AskMe Analytics Injector - CHANGELOG

All notable changes to the PostHog product injector and identity bridge.

---

## [1.2.0] - 2025-11-01

### 🎉 Added - Backend-Agnostic Identity Bridge

The injector now exposes a **public identity API** that works with any authentication system (Email+Password, SSO OAuth, Magic Link). No backend dependencies required.

#### New Public API

**`window.AMA.preAuthMark()`**
- Call right before any login attempt (form submit or SSO redirect)
- Saves current anonymous PostHog ID to sessionStorage
- Returns the pre-login ID for optional URL passing
- Safe to call even if PostHog not loaded (returns null)

**`window.AMA.afterLoginIdentify(user, props)`**
- Call after backend confirms verified session and provides user object
- Merges pre-login history via `posthog.alias()`
- Identifies user once per session (session guard prevents duplicates)
- Supports company-level analytics via `posthog.group()`
- Parameters:
  - `user`: `{ id: string, email?: string }` - Stable internal user ID
  - `props`: `{ company_id?, plan?, role?, ... }` - Additional user properties

**`window.AMA.onLogoutCleanup(userId)`**
- Call on logout to clear identification flags
- Clears sessionStorage and localStorage guards
- Calls `posthog.reset()` to start fresh anonymous session
- Safe to call with null userId

**`window.AMA._takePreAuthId()`** (internal helper)
- Retrieves pre-login ID from sessionStorage or URL parameter
- Used internally by `afterLoginIdentify()`
- Checks `sessionStorage.getItem('ama:pre_ph_id')` first
- Falls back to URL parameter `?ph_id=...` for SSO/magic link flows

#### Storage Keys

- `sessionStorage.ama:pre_ph_id` - Pre-auth anonymous ID (temporary)
- `sessionStorage.ph_ss_identified_<userId>` - Session guard (per session)
- `localStorage.posthog_identified_<userId>` - Redundant guard (persistent)

#### Integration Patterns Supported

1. **Email + Password** (Same-tab)
   ```javascript
   AMA.preAuthMark();
   // ... login API call ...
   const me = await fetch('/api/me').then(r => r.json());
   AMA.afterLoginIdentify({ id: me.id, email: me.email }, { plan: me.plan });
   ```

2. **SSO OAuth** (Redirect flow)
   ```javascript
   // Option A: sessionStorage (simple)
   AMA.preAuthMark();
   location.href = '/api/auth/google';
   // ... after callback ...
   AMA.afterLoginIdentify(user, props);
   
   // Option B: URL parameter (bulletproof)
   const preId = AMA.preAuthMark();
   const cb = new URL(`${origin}/callback`);
   cb.searchParams.set('ph_id', preId);
   location.href = `/api/auth/google?returnTo=${encodeURIComponent(cb)}`;
   ```

3. **Magic Link**
   ```javascript
   const preId = AMA.preAuthMark();
   const cb = new URL(`${origin}/auth/magic-callback`);
   cb.searchParams.set('ph_id', preId);
   await sendMagicLink(email, cb.toString());
   ```

4. **Logout** (All auth types)
   ```javascript
   AMA.onLogoutCleanup(user.id);
   await fetch('/api/logout', { method: 'POST' });
   location.assign('/login');
   ```

#### Documentation

- **Integration Guide**: `docs/integration.md` - Copy-paste examples for all auth types
- **QA Checklist**: `docs/QA_CHECKLIST.md` - 8 test scenarios with verification commands
- **TypeScript Types**: `types/ama.d.ts` - Full type definitions for `window.AMA`

#### Core Principles

- ✅ Never identify from typed emails
- ✅ Only identify after verified authentication
- ✅ Always merge pre-login history via alias
- ✅ Identify once per session (session guard)
- ✅ Full reset on logout

#### Backward Compatibility

- ✅ All existing product tracking functionality preserved
- ✅ Zero breaking changes to existing injector behavior
- ✅ New API is additive only (opt-in)
- ✅ Safe to deploy without code changes

---

## [1.1.0] - 2025-10-16

### Added - Rule Blocking & Priority System

**Conditional Rule Blocking**
- New `blockRules` array property on rules
- Error states can prevent success states from firing
- Use case: Form validation errors block success events

**Priority-Based Evaluation**
- New `priority` property (default: 100)
- Lower number = higher priority
- Rules evaluated in priority order
- Use case: Check errors before success conditions

**Example Configuration**:
```javascript
[
  {
    "key": "ONBOARDING_ERROR",
    "selector": ".alert-danger",
    "priority": 1,
    "blockRules": ["ONBOARDING_STARTED"]
  },
  {
    "key": "ONBOARDING_STARTED",
    "selector": "#membershipProfile",
    "priority": 10
  }
]
```

### Fixed

**MutationObserver Infinite Loop**
- Added disconnect/reconnect pattern in `applyAllRules()`
- Prevents infinite loop when `requireSelectorPresent` rules modify DOM
- Stored observer reference at `window.__phMutationObserver`
- Rules now cleared and re-evaluated safely on each DOM mutation

### Changed

**Rule Evaluation**
- `blockedRules` Set cleared on each `applyAllRules()` call
- Fresh blocking evaluation on every route change or DOM mutation
- Dynamic tags (`data-ph-tagged-dyn`) cleaned up before re-tagging

---

## [1.0.0] - 2025-10-01

### Added - Initial Release

**Dynamic Step Tagging**
- URL-gated event capture
- Selector-based element tagging
- Text regex fallback for button matching
- `requireSelectorPresent` for passive detection
- `autoFire` for immediate events on page load

**Product Metadata Tracking**
- Automatic `data-product`, `data-price`, `data-currency` annotation
- Configurable selectors via data attributes
- Panel/container detection with smart heuristics
- Multiple currency format support (US, European)

**SPA Support**
- MutationObserver for dynamic content
- History API hooks (pushState, replaceState, popstate)
- Custom route change event: `ph:routechange`

**Deduplication**
- `oncePerPath` mechanism (default: true)
- Per-route event firing with `__phFiredOnce` Set
- Button/element click tracking with WeakSet
- SessionStorage persistence for reload resilience

**Click Tracking**
- Global capture phase listener
- Step element clicks (`data-ph` tagged elements)
- Product submit clicks with metadata
- Configurable product event name

**Email Identification** (Legacy - now replaced by identity bridge)
- Auto-identify from email input fields
- Blur and submit handlers
- Form context capture

**Price Change Listeners**
- Dynamic re-annotation on plan/interval changes
- Configurable watch selectors
- Mutation-based updates

**Configuration API**
- Script data attributes for all settings
- JSON steps configuration
- Page matching (contains, exact, regex)
- Selector lists (CSV, JSON array, single)

**Robust Selector Handling**
- Invalid selector detection
- CSV parsing
- JSON array parsing
- Fallback mechanisms

**Constants Integration**
- `PH_KEYS` for event names
- `PH_DATA_KEYS` for configuration attributes
- `PH_PRODUCT_DOM` for DOM attributes
- `PH_PROPS` for event properties
- `PH_PRODUCT_EVENT` for product events

---

## Version History Summary

- **v1.2.0** (2025-11-01) - Backend-agnostic identity bridge
- **v1.1.0** (2025-10-16) - Rule blocking & priority system
- **v1.0.0** (2025-10-01) - Initial release with product tracking

---

## Migration Guides

### Migrating from Legacy Email Identification

**Before (v1.0.0 - v1.1.0)**:
```javascript
// Automatic email identification on blur (not recommended)
// Handled automatically by injector
```

**After (v1.2.0)**:
```javascript
// Manual identification after verified auth
AMA.preAuthMark(); // before login
// ... authentication ...
const me = await fetch('/api/me').then(r => r.json());
AMA.afterLoginIdentify({ id: me.id, email: me.email }, { plan: me.plan });
```

**Benefits**:
- ✅ No PII sent before verified authentication
- ✅ Pre-login activity merged correctly
- ✅ Works with any auth system
- ✅ GDPR/privacy compliant

### Upgrading from v1.1.0 to v1.2.0

**No breaking changes** - v1.2.0 is fully backward compatible.

**Optional: Adopt identity bridge**
1. Add `preAuthMark()` calls before login
2. Add `afterLoginIdentify()` calls after auth
3. Add `onLogoutCleanup()` calls on logout
4. Remove any manual `posthog.identify()` calls from typed email fields

**Optional: Remove legacy email identification**
- Email blur handlers no longer needed
- Identity bridge handles all identification

---

## Roadmap

### Planned for v1.3.0
- [ ] Built-in A/B test support
- [ ] Feature flag integration
- [ ] Session replay triggers
- [ ] Funnel step validation API

### Planned for v2.0.0
- [ ] Multi-product support (cart tracking)
- [ ] Subscription lifecycle events
- [ ] Revenue tracking helpers
- [ ] Custom event templates

---

## Support & Contribution

### Files
- **Main**: `ph-product-injector.js`, `ph-constants.js`
- **Docs**: `docs/integration.md`, `docs/QA_CHECKLIST.md`, `README.md`
- **Types**: `types/ama.d.ts`
- **Tests**: `test-manual.html`, `test-blocking.html`

### Getting Help
1. Review integration guide: `docs/integration.md`
2. Run QA checklist: `docs/QA_CHECKLIST.md`
3. Check README for product tracking: `README.md`
4. Use TypeScript types: `types/ama.d.ts`

---

**Current Version**: 1.2.0  
**Status**: ✅ Production Ready  
**Last Updated**: November 1, 2025
