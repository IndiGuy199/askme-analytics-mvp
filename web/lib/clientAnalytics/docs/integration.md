# AskMe Analytics - Client Integration Guide

**Backend-Agnostic Identity Bridge** — Integrate analytics with any auth system (Email+Password, SSO, Magic Link)

**Version**: 1.2.0  
**Last Updated**: November 1, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Core API](#core-api)
3. [Integration Patterns](#integration-patterns)
   - [Email + Password](#a-regular-email--password-same-tab)
   - [SSO OAuth](#b-sso-oauth-googlemicrosoftfacebookokta)
   - [Magic Link](#c-magic-link)
   - [Logout](#d-logout-all-auth-types)
4. [Implementation Examples](#implementation-examples)
5. [Best Practices](#best-practices)
6. [QA Checklist](#qa-checklist)
7. [TypeScript Support](#typescript-support)

---

## Overview

The AskMe Analytics injector now exposes a **backend-agnostic identity bridge** that works with any authentication system. You don't need Supabase, Auth0, or any specific backend framework.

### Core Principle

**Never identify from typed emails. Only identify after verified auth. Merge pre-login history via alias.**

This ensures:
- ✅ Anonymous browsing tracked correctly
- ✅ Pre-login activity merged after authentication
- ✅ No duplicate user profiles
- ✅ Accurate funnel analytics
- ✅ GDPR/privacy compliant (no PII until verified)

---

## Core API

The injector exposes three global functions under `window.AMA`:

### `AMA.preAuthMark()`

**When**: Call right before any login attempt (form submit or SSO redirect)  
**What**: Saves the current anonymous PostHog ID for later merge  
**Returns**: `string | null` (the pre-login PostHog ID)

```javascript
AMA.preAuthMark();
```

### `AMA.afterLoginIdentify(user, props)`

**When**: Call after the backend confirms a verified session  
**What**: Merges pre-login history and identifies the user once per session  
**Parameters**:
- `user`: `{ id: string, email?: string }` — Your stable internal user ID
- `props`: `{ [key: string]: any }` — Additional user properties

```javascript
AMA.afterLoginIdentify(
  { id: 'user_123', email: 'john@example.com' },
  { plan: 'premium', company_id: 'acme', role: 'admin' }
);
```

### `AMA.onLogoutCleanup(userId)`

**When**: Call on logout before clearing session  
**What**: Clears identification flags and resets PostHog  
**Parameters**:
- `userId`: `string | null` — Your internal user ID (optional)

```javascript
AMA.onLogoutCleanup('user_123');
```

---

## Integration Patterns

### A) Regular Email + Password (Same Tab)

**Flow**: User enters credentials → backend validates → session created → identify

```javascript
// 1) Before sending credentials:
AMA.preAuthMark();

// 2) Do your own login call:
const res = await fetch('/api/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password })
});
if (!res.ok) { /* show error */ return; }

// 3) After the server sets a verified session, get the user:
const me = await fetch('/api/me').then(r => r.json()); // { id, email, plan, company_id, ... }

// 4) Canonical identify:
AMA.afterLoginIdentify(
  { id: me.id, email: me.email },
  { plan: me.plan, company_id: me.company_id, company_name: me.company_name, role: me.role }
);

// 5) Navigate in your app:
location.assign('/dashboard');
```

**Key Points**:
- ✅ `preAuthMark()` saves the anonymous ID before login
- ✅ `afterLoginIdentify()` merges pre-login activity via alias
- ✅ Session guard prevents duplicate identifies
- ✅ Works with any backend framework (Node.js, Django, Rails, etc.)

---

### B) SSO OAuth (Google/Microsoft/Facebook/Okta)

OAuth redirects to provider and returns to callback URL. You have two options:

#### Option B1 (Simple): Rely on sessionStorage

Best for same-origin callbacks where sessionStorage persists.

```javascript
AMA.preAuthMark();                 // right before redirecting to provider
location.href = '/api/auth/login'; // start your SSO flow

// After callback returns to the same origin and session is set:
const me = await fetch('/api/me').then(r => r.json());
AMA.afterLoginIdentify({ id: me.id, email: me.email }, { company_id: me.company_id, /* ... */ });
location.replace('/dashboard');
```

#### Option B2 (Bulletproof): Pass ph_id via state or callback URL

Recommended for cross-origin redirects or when sessionStorage might not persist.

```javascript
const preId = AMA.preAuthMark();
const cb = new URL(`${location.origin}/auth/callback`);
if (preId) cb.searchParams.set('ph_id', preId);

// If you control OAuth "state", encode and sign it server-side; include preId:
const state = btoa(JSON.stringify({ ph_id: preId, nonce: crypto.randomUUID() }));

// Kick off your provider flow (framework-specific):
location.href = `/api/auth/login?returnTo=${encodeURIComponent(cb.toString())}&state=${encodeURIComponent(state)}`;

// On /auth/callback (after server sets session):
const me = await fetch('/api/me').then(r => r.json());
AMA.afterLoginIdentify({ id: me.id, email: me.email }, { company_id: me.company_id, /* ... */ });
location.replace('/dashboard');
```

**How It Works**:
1. `preAuthMark()` saves anonymous ID to sessionStorage
2. Optionally pass `ph_id` in callback URL as backup
3. `afterLoginIdentify()` checks both sessionStorage and URL for the pre-login ID
4. If found, performs `posthog.alias(user.id, preId)` to merge history
5. Then identifies with stable user ID

**Backend Example** (Node.js/Express):

```javascript
// Start OAuth flow
app.get('/api/auth/login', (req, res) => {
  const returnTo = req.query.returnTo;
  const state = req.query.state; // includes ph_id
  
  // Store state in session for validation
  req.session.oauthState = state;
  
  // Redirect to provider (Google, Microsoft, etc.)
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=.../callback&state=${state}`);
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  
  // Validate state
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state');
  }
  
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  const user = await getUserFromProvider(tokens);
  
  // Create session
  req.session.userId = user.id;
  
  // Parse state to extract ph_id
  const stateObj = JSON.parse(atob(state));
  const returnTo = stateObj.ph_id 
    ? `/dashboard?ph_id=${stateObj.ph_id}`
    : '/dashboard';
  
  res.redirect(returnTo);
});
```

---

### C) Magic Link

**Flow**: User requests link → email sent → clicks link → backend validates token → identify

```javascript
const preId = AMA.preAuthMark();
const cb = new URL(`${location.origin}/auth/magic-callback`);
if (preId) cb.searchParams.set('ph_id', preId);

// Send the magic link using YOUR backend. Make its redirect target = cb.toString()
await fetch('/api/auth/magic-link', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ 
    email: userEmail,
    callbackUrl: cb.toString()
  })
});

// Show "Check your email" message
```

**On magic-callback page** (after backend validates token and sets session):

```javascript
const me = await fetch('/api/me').then(r => r.json());
AMA.afterLoginIdentify({ id: me.id, email: me.email }, { company_id: me.company_id });
location.replace('/dashboard');
```

**Backend Example** (Node.js/Express):

```javascript
// Generate magic link
app.post('/api/auth/magic-link', async (req, res) => {
  const { email, callbackUrl } = req.body;
  
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store token in database with expiry
  await db.magicTokens.create({ email, token, expiresAt: Date.now() + 15 * 60 * 1000 });
  
  // Build link with token
  const magicUrl = new URL(callbackUrl);
  magicUrl.searchParams.set('token', token);
  
  // Send email
  await sendEmail(email, 'Magic Link Login', `Click here: ${magicUrl.toString()}`);
  
  res.json({ success: true });
});

// Validate magic link
app.get('/auth/magic-callback', async (req, res) => {
  const token = req.query.token;
  const ph_id = req.query.ph_id; // preserve for frontend
  
  // Validate token
  const record = await db.magicTokens.findOne({ token, expiresAt: { $gt: Date.now() } });
  if (!record) {
    return res.status(400).send('Invalid or expired token');
  }
  
  // Find or create user
  const user = await db.users.findOne({ email: record.email });
  
  // Create session
  req.session.userId = user.id;
  
  // Delete used token
  await db.magicTokens.delete({ token });
  
  // Redirect with ph_id preserved
  const redirect = ph_id ? `/dashboard?ph_id=${ph_id}` : '/dashboard';
  res.redirect(redirect);
});
```

---

### D) Logout (All Auth Types)

**Flow**: User clicks logout → cleanup flags → backend clears session → redirect

```javascript
AMA.onLogoutCleanup(currentUser?.id || null);
await fetch('/api/logout', { method: 'POST' });
location.assign('/login');
```

**What It Does**:
- Clears `localStorage.posthog_identified_<userId>`
- Clears `sessionStorage.ph_ss_identified_<userId>`
- Clears `sessionStorage.ama:pre_ph_id`
- Calls `posthog.reset()` to start fresh anonymous session

**Backend Example** (Node.js/Express):

```javascript
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});
```

---

## Implementation Examples

### React Example

```jsx
import { useState } from 'react';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // 1) Mark pre-auth
    window.AMA.preAuthMark();
    
    // 2) Login call
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) {
      alert('Login failed');
      return;
    }
    
    // 3) Get user
    const me = await fetch('/api/me').then(r => r.json());
    
    // 4) Identify
    window.AMA.afterLoginIdentify(
      { id: me.id, email: me.email },
      { plan: me.plan, role: me.role }
    );
    
    // 5) Navigate
    window.location.href = '/dashboard';
  };

  return (
    <form onSubmit={handleLogin}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        required 
      />
      <button type="submit">Login</button>
    </form>
  );
}

function DashboardPage({ user }) {
  const handleLogout = async () => {
    window.AMA.onLogoutCleanup(user.id);
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

### Vue.js Example

```vue
<template>
  <form @submit.prevent="handleLogin">
    <input v-model="email" type="email" required />
    <input v-model="password" type="password" required />
    <button type="submit">Login</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const email = ref('');
const password = ref('');

const handleLogin = async () => {
  // 1) Mark pre-auth
  window.AMA.preAuthMark();
  
  // 2) Login call
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 
      email: email.value, 
      password: password.value 
    })
  });
  
  if (!res.ok) {
    alert('Login failed');
    return;
  }
  
  // 3) Get user
  const me = await res.json();
  
  // 4) Identify
  window.AMA.afterLoginIdentify(
    { id: me.id, email: me.email },
    { plan: me.plan }
  );
  
  // 5) Navigate
  window.location.href = '/dashboard';
};
</script>
```

### Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Login</title>
  <script src="https://cdn.yoursite.com/ph-constants.js"></script>
  <script src="https://cdn.yoursite.com/ph-product-injector.js"></script>
</head>
<body>
  <form id="loginForm">
    <input type="email" id="email" required />
    <input type="password" id="password" required />
    <button type="submit">Login</button>
  </form>

  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // 1) Mark pre-auth
      window.AMA.preAuthMark();
      
      // 2) Login call
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) {
        alert('Login failed');
        return;
      }
      
      // 3) Get user
      const me = await fetch('/api/me').then(r => r.json());
      
      // 4) Identify
      window.AMA.afterLoginIdentify(
        { id: me.id, email: me.email },
        { plan: me.plan, role: me.role }
      );
      
      // 5) Navigate
      location.href = '/dashboard';
    });
  </script>
</body>
</html>
```

---

## Best Practices

### Do ✅

- **Call `preAuthMark()` immediately before auth**  
  Right before form submit or SSO redirect

- **Call `afterLoginIdentify()` after verified session**  
  Only after backend confirms authentication

- **Use stable internal user ID**  
  Never use email as ID (emails can change)

- **Include company/org context**  
  Pass `company_id`, `company_name`, etc. for group analytics

- **Call `onLogoutCleanup()` on logout**  
  Before clearing session, to reset PostHog state

### Don't ❌

- **Don't identify from typed emails**  
  Never call identify on blur/focus of email inputs

- **Don't identify before auth**  
  Wait until backend confirms verified session

- **Don't skip session guards**  
  The API handles deduplication automatically

- **Don't use email as user ID**  
  Use your backend's stable internal ID (UUID, integer, etc.)

### Privacy & GDPR

The identity bridge is designed for privacy compliance:

- ✅ Anonymous browsing tracked without PII
- ✅ Identification only after explicit authentication
- ✅ No email addresses sent until verified
- ✅ Pre-login history merged, not duplicated
- ✅ Full reset on logout

---

## QA Checklist

Use this checklist to verify correct integration:

### 1. Pre-Login Activity Merge

**Test**: Browse anonymously → login → verify history merged

```javascript
// Before login (open console)
console.log('Anonymous ID:', window.posthog.get_distinct_id());
// → "1a2b3c4d-anon-id"

// Trigger some events
window.posthog.capture('page_view', { page: '/pricing' });

// Login and verify
// After AMA.afterLoginIdentify() runs:
console.log('Identified ID:', window.posthog.get_distinct_id());
// → "user_123"

// Check PostHog dashboard:
// Events should show user_123 with pre-login history merged
```

**Expected**: All pre-login events appear under the identified user.

### 2. No Duplicate Identifies

**Test**: Refresh page → check console for redundant identify calls

```javascript
// After login, refresh the page
// Check console for:
// ✅ No new identify() calls
// ✅ Session guard message (if you add logging)

// Check sessionStorage
console.log(sessionStorage.getItem('ph_ss_identified_user_123'));
// → "1" (guards against duplicates)
```

**Expected**: Only one identify per session.

### 3. Email+Password Flow

**Test**: Login with email/password → verify identify happens once

```javascript
// In login handler:
AMA.preAuthMark();
// Check sessionStorage:
console.log(sessionStorage.getItem('ama:pre_ph_id'));
// → "1a2b3c4d-anon-id"

// After login:
AMA.afterLoginIdentify({ id: 'user_123', email: 'john@example.com' }, { plan: 'premium' });

// Check PostHog:
console.log(window.posthog.get_distinct_id());
// → "user_123"
```

**Expected**: User identified with correct ID and properties.

### 4. SSO OAuth Flow

**Test**: Login with Google/Microsoft → verify ph_id preserved

```javascript
// Before SSO redirect:
const preId = AMA.preAuthMark();
console.log('Pre-login ID:', preId);
// → "1a2b3c4d-anon-id"

// After OAuth callback:
// Check URL for ph_id parameter
console.log(new URL(location.href).searchParams.get('ph_id'));
// → "1a2b3c4d-anon-id"

// After identify:
console.log(window.posthog.get_distinct_id());
// → "user_123"
```

**Expected**: Pre-login ID carried through OAuth flow and merged.

### 5. Magic Link Flow

**Test**: Request magic link → click → verify identify

```javascript
// Before requesting link:
const preId = AMA.preAuthMark();
const cb = new URL(`${location.origin}/auth/magic-callback`);
cb.searchParams.set('ph_id', preId);
console.log('Callback URL:', cb.toString());
// → "https://example.com/auth/magic-callback?ph_id=1a2b3c4d-anon-id"

// After clicking magic link and callback:
console.log(new URL(location.href).searchParams.get('ph_id'));
// → "1a2b3c4d-anon-id"

// After identify:
console.log(window.posthog.get_distinct_id());
// → "user_123"
```

**Expected**: Pre-login ID preserved in email link and merged after auth.

### 6. Logout Cleanup

**Test**: Logout → verify PostHog reset

```javascript
// Before logout:
console.log('Before logout:', window.posthog.get_distinct_id());
// → "user_123"

// Logout:
AMA.onLogoutCleanup('user_123');

// After logout:
console.log('After logout:', window.posthog.get_distinct_id());
// → "2x3y4z5a-anon-id" (new anonymous ID)

// Check storage:
console.log(sessionStorage.getItem('ph_ss_identified_user_123'));
// → null
console.log(localStorage.getItem('posthog_identified_user_123'));
// → null
```

**Expected**: New anonymous session started, all flags cleared.

### 7. Cross-Tab Sync

**Test**: Login in one tab → open another tab → verify no duplicate identify

```javascript
// Tab 1: Login
AMA.afterLoginIdentify({ id: 'user_123', email: 'john@example.com' }, {});

// Tab 2: Navigate to dashboard
// Check console - should NOT see identify() call
console.log(sessionStorage.getItem('ph_ss_identified_user_123'));
// → "1" (already identified this session)
```

**Expected**: Session guard prevents duplicate identifies across tabs.

### 8. Error Handling

**Test**: Call APIs with invalid data → verify no crashes

```javascript
// Test graceful degradation
AMA.afterLoginIdentify(null, {}); // Should not crash
AMA.afterLoginIdentify({ id: null }, {}); // Should not crash
AMA.onLogoutCleanup(null); // Should not crash

// Test before PostHog loads
delete window.posthog;
AMA.preAuthMark(); // Should return null
AMA.afterLoginIdentify({ id: 'user_123' }, {}); // Should not crash
```

**Expected**: No errors, graceful handling of edge cases.

---

## TypeScript Support

### Type Definitions

Create `types/ama.d.ts` in your project:

```typescript
declare global {
  interface Window {
    AMA: {
      /**
       * Call right before any login attempt (form submit or SSO redirect).
       * Saves the current anonymous PostHog ID for later merge.
       * @returns The pre-login PostHog ID, or null if unavailable
       */
      preAuthMark: () => string | null;

      /**
       * Internal helper to retrieve the pre-login ID after auth.
       * Checks sessionStorage first, then URL parameter as fallback.
       * @returns The pre-login PostHog ID, or null if not found
       */
      _takePreAuthId: () => string | null;

      /**
       * Call after login succeeds and you have the verified user.
       * Merges pre-login history via alias, then identifies once per session.
       * @param user - User object with stable internal ID
       * @param props - Additional user properties for analytics
       */
      afterLoginIdentify: (
        user: { id: string; email?: string },
        props?: Record<string, any>
      ) => void;

      /**
       * Call on logout to clear identification flags and reset PostHog.
       * @param userId - Your internal user ID (optional)
       */
      onLogoutCleanup: (userId?: string | null) => void;
    };
  }
}

export {};
```

### Usage in TypeScript

```typescript
// login.ts
import type {} from './types/ama';

async function handleLogin(email: string, password: string) {
  // TypeScript now knows about window.AMA
  window.AMA.preAuthMark();

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) throw new Error('Login failed');

  const me = await fetch('/api/me').then(r => r.json());

  window.AMA.afterLoginIdentify(
    { id: me.id, email: me.email },
    { plan: me.plan, role: me.role }
  );

  window.location.href = '/dashboard';
}

function handleLogout(userId: string) {
  window.AMA.onLogoutCleanup(userId);
  fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}
```

---

## Troubleshooting

### Issue: Pre-login history not merged

**Symptoms**: Events before login don't appear under identified user

**Debug**:
```javascript
// Check if preAuthMark saved the ID
console.log(sessionStorage.getItem('ama:pre_ph_id'));

// Check if URL has ph_id (for SSO/magic link)
console.log(new URL(location.href).searchParams.get('ph_id'));

// Check if alias was called
// (Add temporary logging to afterLoginIdentify)
```

**Fix**:
- Ensure `preAuthMark()` is called BEFORE auth redirect/submit
- For SSO/magic link, verify `ph_id` is in callback URL
- Check that PostHog SDK is loaded before calling APIs

### Issue: Duplicate user profiles

**Symptoms**: Same user appears as multiple profiles in PostHog

**Debug**:
```javascript
// Check session guard
console.log(sessionStorage.getItem('ph_ss_identified_user_123'));

// Check if identify called multiple times
// (Add logging to afterLoginIdentify)
```

**Fix**:
- Session guard should prevent duplicates automatically
- Verify you're using stable user ID (not email)
- Don't call `afterLoginIdentify()` on every page load

### Issue: PostHog not available

**Symptoms**: `window.posthog` is undefined

**Debug**:
```javascript
// Check if PostHog loaded
console.log(typeof window.posthog);

// Check script tag
console.log(document.querySelector('script[src*="posthog"]'));
```

**Fix**:
- Ensure PostHog SDK is loaded before injector
- The identity bridge is safe (won't crash if PostHog missing)
- Consider delaying auth calls until PostHog loads

### Issue: sessionStorage not persisting

**Symptoms**: `ama:pre_ph_id` disappears after OAuth redirect

**Debug**:
```javascript
// Check if same origin
console.log('Origin:', location.origin);

// Check sessionStorage support
try {
  sessionStorage.setItem('test', '1');
  console.log('sessionStorage works');
} catch (e) {
  console.error('sessionStorage blocked:', e);
}
```

**Fix**:
- For cross-origin OAuth, use URL parameter method (Option B2)
- Check browser privacy settings (some block sessionStorage)
- Consider using state parameter in OAuth flow

---

## Support

### Questions?

1. Check this integration guide
2. Review QA checklist for test scenarios
3. Check browser console for errors
4. Verify PostHog dashboard for events

### Files

- **Injector**: `ph-product-injector.js` (contains identity bridge)
- **Constants**: `ph-constants.js` (event keys)
- **Docs**: `integration.md` (this file)
- **Types**: `types/ama.d.ts` (TypeScript definitions)

---

**Version**: 1.2.0  
**Status**: ✅ Production Ready  
**Compatibility**: All modern browsers, any backend framework  
**Privacy**: GDPR compliant, no PII before verified auth

---

## Quick Reference Card

```javascript
// ━━━ INTEGRATION PATTERN ━━━

// 1️⃣ BEFORE LOGIN (any auth type)
AMA.preAuthMark();

// 2️⃣ AFTER VERIFIED SESSION
const me = await fetch('/api/me').then(r => r.json());
AMA.afterLoginIdentify(
  { id: me.id, email: me.email },
  { plan: me.plan, company_id: me.company_id }
);

// 3️⃣ ON LOGOUT
AMA.onLogoutCleanup(user.id);
await fetch('/api/logout', { method: 'POST' });
location.href = '/login';

// ━━━ OPTIONAL: SSO/MAGIC LINK ━━━

// Pass ph_id in callback URL
const preId = AMA.preAuthMark();
const cb = new URL(`${location.origin}/auth/callback`);
if (preId) cb.searchParams.set('ph_id', preId);
// Use cb.toString() as your OAuth callback URL
```

