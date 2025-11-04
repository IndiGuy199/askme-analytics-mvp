# AskMe Analytics Injector - Quick Start

**Version**: 1.2.0 — Backend-agnostic identity bridge for any auth system

---

## Installation

### Option 1: CDN (Recommended)

```html
<!-- Load constants first -->
<script src="https://cdn.yoursite.com/ph-constants.js"></script>

<!-- Load minified injector -->
<script src="https://cdn.yoursite.com/dist/ph-product-injector.min.js"></script>
```

### Option 2: Self-Hosted

Download from releases and host on your server:

```html
<script src="/js/ph-constants.js"></script>
<script src="/js/ph-product-injector.min.js"></script>
```

### Option 3: NPM (If you have a build system)

```bash
npm install @askme/analytics-injector
```

```javascript
import '@askme/analytics-injector';
```

---

## Basic Setup (3 Steps)

### Step 1: Before Login

```javascript
// Call right before form submit or SSO redirect
window.AMA.preAuthMark();
```

### Step 2: After Login

```javascript
// After your backend confirms verified session
const me = await fetch('/api/me').then(r => r.json());

window.AMA.afterLoginIdentify(
  { id: me.id, email: me.email },
  { plan: me.plan, company_id: me.company_id }
);
```

### Step 3: On Logout

```javascript
// Before clearing session
window.AMA.onLogoutCleanup(user.id);
await fetch('/api/logout', { method: 'POST' });
location.href = '/login';
```

---

## Complete Examples

### Email + Password Login

```javascript
// login.js
async function handleLogin(email, password) {
  // 1. Mark pre-auth
  window.AMA.preAuthMark();
  
  // 2. Your login API
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!res.ok) {
    alert('Login failed');
    return;
  }
  
  // 3. Get user
  const me = await fetch('/api/me').then(r => r.json());
  
  // 4. Identify
  window.AMA.afterLoginIdentify(
    { id: me.id, email: me.email },
    { plan: me.plan, role: me.role }
  );
  
  // 5. Redirect
  location.href = '/dashboard';
}
```

### SSO OAuth (Google/Microsoft/Facebook)

```javascript
// sso-login.js
function handleSSOLogin() {
  // 1. Mark and get pre-auth ID
  const preId = window.AMA.preAuthMark();
  
  // 2. Build callback URL with ph_id
  const cb = new URL(`${location.origin}/auth/callback`);
  if (preId) cb.searchParams.set('ph_id', preId);
  
  // 3. Redirect to SSO provider
  location.href = `/api/auth/google?returnTo=${encodeURIComponent(cb.toString())}`;
}

// auth/callback page
async function handleCallback() {
  // 4. Get user after OAuth success
  const me = await fetch('/api/me').then(r => r.json());
  
  // 5. Identify (will merge pre-login history via ph_id param)
  window.AMA.afterLoginIdentify(
    { id: me.id, email: me.email },
    { company_id: me.company_id }
  );
  
  // 6. Redirect
  location.replace('/dashboard');
}
```

### Magic Link

```javascript
// request-magic-link.js
async function sendMagicLink(email) {
  // 1. Mark and get pre-auth ID
  const preId = window.AMA.preAuthMark();
  
  // 2. Build callback URL with ph_id
  const cb = new URL(`${location.origin}/auth/magic-callback`);
  if (preId) cb.searchParams.set('ph_id', preId);
  
  // 3. Send magic link
  await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 
      email,
      callbackUrl: cb.toString()
    })
  });
  
  alert('Check your email!');
}

// magic-callback page
async function handleMagicCallback() {
  // 4. Get user after token validation
  const me = await fetch('/api/me').then(r => r.json());
  
  // 5. Identify
  window.AMA.afterLoginIdentify(
    { id: me.id, email: me.email },
    { plan: me.plan }
  );
  
  // 6. Redirect
  location.replace('/dashboard');
}
```

### Logout (All Auth Types)

```javascript
// logout.js
async function handleLogout() {
  // 1. Cleanup identity
  const userId = getCurrentUser()?.id; // Your user state
  window.AMA.onLogoutCleanup(userId);
  
  // 2. Backend logout
  await fetch('/api/logout', { method: 'POST' });
  
  // 3. Redirect
  location.href = '/login';
}
```

---

## Verification

### Check if Working

Open browser console after integration:

```javascript
// 1. Check API exists
console.log(typeof window.AMA); // Should be "object"

// 2. After login, check identity
console.log(window.posthog.get_distinct_id()); // Should be your user ID

// 3. Check session guard
console.log(sessionStorage.getItem('ph_ss_identified_user_123')); // Should be "1"
```

### Run QA Script

Copy-paste this into console:

```javascript
(async function() {
  console.log('Testing AMA Identity Bridge...\n');
  
  // Test 1: API exists
  console.assert(typeof window.AMA === 'object', '✅ AMA global exists');
  console.assert(typeof window.AMA.preAuthMark === 'function', '✅ preAuthMark exists');
  console.assert(typeof window.AMA.afterLoginIdentify === 'function', '✅ afterLoginIdentify exists');
  console.assert(typeof window.AMA.onLogoutCleanup === 'function', '✅ onLogoutCleanup exists');
  
  // Test 2: PreAuthMark
  const preId = window.AMA.preAuthMark();
  console.assert(typeof preId === 'string', '✅ preAuthMark returns ID');
  
  // Test 3: Storage
  const saved = sessionStorage.getItem('ama:pre_ph_id');
  console.assert(saved === preId, '✅ ID saved to sessionStorage');
  
  console.log('\n✅ All basic tests passed!');
})();
```

---

## TypeScript Support

Add to your project:

```typescript
// types/ama.d.ts
declare global {
  interface Window {
    AMA: {
      preAuthMark: () => string | null;
      afterLoginIdentify: (
        user: { id: string; email?: string },
        props?: Record<string, any>
      ) => void;
      onLogoutCleanup: (userId?: string | null) => void;
      _takePreAuthId: () => string | null;
    };
  }
}
export {};
```

Usage:

```typescript
// login.ts
window.AMA.preAuthMark(); // TypeScript knows the API
```

---

## Common Pitfalls

### ❌ Don't

```javascript
// DON'T identify from typed emails
emailInput.addEventListener('blur', () => {
  posthog.identify(emailInput.value); // ❌ NO!
});

// DON'T skip preAuthMark
// ❌ Missing this step loses pre-login history

// DON'T call afterLoginIdentify before session verified
// ❌ Must wait for backend confirmation
```

### ✅ Do

```javascript
// DO call preAuthMark before auth
AMA.preAuthMark(); // ✅ YES

// DO identify only after verified session
const me = await fetch('/api/me').then(r => r.json());
if (me.id) {
  AMA.afterLoginIdentify({ id: me.id, email: me.email }, {}); // ✅ YES
}

// DO cleanup on logout
AMA.onLogoutCleanup(user.id); // ✅ YES
```

---

## Documentation

- **Integration Guide**: `docs/integration.md` — Full examples for all auth types
- **QA Checklist**: `docs/QA_CHECKLIST.md` — 8 test scenarios
- **CHANGELOG**: `CHANGELOG.md` — Version history
- **README**: `README.md` — Product tracking features

---

## Support

**Questions?**
1. Read integration guide: `docs/integration.md`
2. Check QA checklist: `docs/QA_CHECKLIST.md`
3. Review PostHog dashboard for events

**Files**:
- Source: `ph-product-injector.js`
- Minified: `dist/ph-product-injector.min.js`
- Constants: `ph-constants.js`
- Types: `types/ama.d.ts`

---

## What's Included

- ✅ **Identity Bridge**: Backend-agnostic auth integration
- ✅ **Product Tracking**: Automatic price/product metadata
- ✅ **Funnel Tracking**: Step-based event capture
- ✅ **SPA Support**: MutationObserver + History API
- ✅ **Deduplication**: Once-per-path event firing
- ✅ **Rule Blocking**: Error states block success events
- ✅ **TypeScript Types**: Full type definitions

---

**Version**: 1.2.0  
**License**: MIT  
**Status**: ✅ Production Ready

---

## Quick Reference

```javascript
// ━━━ 3-STEP INTEGRATION ━━━

// 1️⃣ BEFORE LOGIN
AMA.preAuthMark();

// 2️⃣ AFTER VERIFIED SESSION
const me = await fetch('/api/me').then(r => r.json());
AMA.afterLoginIdentify(
  { id: me.id, email: me.email },
  { plan: me.plan, company_id: me.company_id }
);

// 3️⃣ ON LOGOUT
AMA.onLogoutCleanup(user.id);
```
