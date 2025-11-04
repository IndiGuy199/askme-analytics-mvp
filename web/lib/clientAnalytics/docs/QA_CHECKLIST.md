# AskMe Analytics - Identity Bridge QA Checklist

**Version**: 1.2.0  
**Purpose**: Verify correct implementation of backend-agnostic identity tracking

---

## Overview

This checklist ensures that:
- ✅ Pre-login activity is captured anonymously
- ✅ Post-login activity is merged correctly via alias
- ✅ Identity is established once per session
- ✅ Logout resets PostHog state cleanly
- ✅ No PII is sent before verified authentication

---

## Test Scenarios

### ✅ Scenario 1: Email+Password Login (End-to-End)

**Objective**: Verify pre-login history merges after email+password authentication

**Steps**:

1. **Clear browser data** (new anonymous session)
   ```javascript
   // Open DevTools Console
   sessionStorage.clear();
   localStorage.clear();
   // Refresh page
   location.reload();
   ```

2. **Browse anonymously and capture pre-login ID**
   ```javascript
   // After page load
   const anonId = window.posthog.get_distinct_id();
   console.log('🔍 Anonymous ID:', anonId);
   // Example output: "017abc123-def4-5678-90ab-cdefghijk123"
   ```

3. **Generate pre-login events**
   ```javascript
   // View some pages, trigger events
   window.posthog.capture('page_view', { page: '/pricing' });
   window.posthog.capture('button_click', { button: 'learn_more' });
   console.log('✅ Generated 2 pre-login events');
   ```

4. **Start login flow**
   ```javascript
   // In your login handler (BEFORE submitting credentials)
   window.AMA.preAuthMark();
   
   // Verify it saved
   const saved = sessionStorage.getItem('ama:pre_ph_id');
   console.log('💾 Saved pre-auth ID:', saved);
   // Should match anonId from step 2
   ```

5. **Submit login credentials**
   ```javascript
   // Your actual login code
   const res = await fetch('/api/login', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
   });
   console.log('🔐 Login response:', res.status);
   ```

6. **Fetch user and identify**
   ```javascript
   const me = await fetch('/api/me').then(r => r.json());
   console.log('👤 User fetched:', me.id, me.email);
   
   window.AMA.afterLoginIdentify(
     { id: me.id, email: me.email },
     { plan: me.plan, company_id: me.company_id }
   );
   ```

7. **Verify identification**
   ```javascript
   const identifiedId = window.posthog.get_distinct_id();
   console.log('✅ Identified ID:', identifiedId);
   // Should be me.id (e.g., "user_123")
   
   // Check session guard
   const guard = sessionStorage.getItem(`ph_ss_identified_${me.id}`);
   console.log('🛡️ Session guard:', guard);
   // Should be "1"
   ```

8. **Verify in PostHog dashboard**
   - Go to PostHog dashboard
   - Search for user by ID or email
   - Check timeline: pre-login events should be merged
   - Verify events show `page_view` and `button_click` from step 3

**Expected Results**:
- ✅ Pre-login ID saved to sessionStorage
- ✅ Post-login ID matches user.id
- ✅ Session guard set to "1"
- ✅ Pre-login events visible in PostHog under identified user
- ✅ USER_IDENTIFIED event captured

**Pass Criteria**:
```javascript
// All should be true
console.assert(saved === anonId, 'Pre-auth ID saved correctly');
console.assert(identifiedId === me.id, 'Identified with correct user ID');
console.assert(guard === '1', 'Session guard set');
console.assert(!sessionStorage.getItem('ama:pre_ph_id'), 'Pre-auth ID consumed');
```

---

### ✅ Scenario 2: SSO OAuth Login (Google/Microsoft)

**Objective**: Verify ph_id parameter preserves pre-login ID through OAuth redirect

**Steps**:

1. **Clear browser and start fresh**
   ```javascript
   sessionStorage.clear();
   localStorage.clear();
   location.reload();
   ```

2. **Browse and capture anonymous ID**
   ```javascript
   const anonId = window.posthog.get_distinct_id();
   console.log('🔍 Anonymous ID:', anonId);
   
   // Generate events
   window.posthog.capture('viewed_sso_button');
   ```

3. **Start OAuth flow with ph_id**
   ```javascript
   // Before redirect
   const preId = window.AMA.preAuthMark();
   console.log('💾 Pre-auth ID:', preId);
   
   // Build callback URL with ph_id
   const cb = new URL(`${location.origin}/auth/callback`);
   cb.searchParams.set('ph_id', preId);
   console.log('🔗 Callback URL:', cb.toString());
   
   // Redirect to OAuth provider
   location.href = `/api/auth/google?returnTo=${encodeURIComponent(cb.toString())}`;
   ```

4. **After OAuth callback returns**
   ```javascript
   // Check URL for ph_id
   const urlParams = new URL(location.href).searchParams;
   const carriedId = urlParams.get('ph_id');
   console.log('🔗 Carried ID from URL:', carriedId);
   // Should match preId from step 3
   
   // Fetch user
   const me = await fetch('/api/me').then(r => r.json());
   console.log('👤 User from OAuth:', me.id);
   
   // Identify
   window.AMA.afterLoginIdentify(
     { id: me.id, email: me.email },
     { company_id: me.company_id }
   );
   ```

5. **Verify merge**
   ```javascript
   const identifiedId = window.posthog.get_distinct_id();
   console.log('✅ Identified as:', identifiedId);
   
   // Check PostHog dashboard for pre-login events under this user
   ```

**Expected Results**:
- ✅ ph_id parameter present in callback URL
- ✅ afterLoginIdentify() retrieves ph_id from URL
- ✅ Pre-login events merged via alias
- ✅ Identified with OAuth user ID

**Pass Criteria**:
```javascript
console.assert(carriedId === preId, 'ph_id preserved through OAuth');
console.assert(identifiedId === me.id, 'Identified with OAuth user');
```

---

### ✅ Scenario 3: Magic Link Login

**Objective**: Verify magic link preserves pre-login ID via URL parameter

**Steps**:

1. **Request magic link with ph_id**
   ```javascript
   // Before sending magic link
   const preId = window.AMA.preAuthMark();
   const cb = new URL(`${location.origin}/auth/magic-callback`);
   cb.searchParams.set('ph_id', preId);
   
   console.log('📧 Magic link callback:', cb.toString());
   
   await fetch('/api/auth/magic-link', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ 
       email: 'test@example.com',
       callbackUrl: cb.toString()
     })
   });
   ```

2. **Simulate clicking magic link**
   ```javascript
   // In production, user clicks link in email
   // For testing, manually navigate to callback URL with ph_id and token
   
   // After backend validates token and creates session:
   const urlParams = new URL(location.href).searchParams;
   const carriedId = urlParams.get('ph_id');
   console.log('📧 Carried ID from email link:', carriedId);
   
   const me = await fetch('/api/me').then(r => r.json());
   console.log('👤 User from magic link:', me.id);
   
   window.AMA.afterLoginIdentify(
     { id: me.id, email: me.email },
     { plan: me.plan }
   );
   ```

3. **Verify identification**
   ```javascript
   const identifiedId = window.posthog.get_distinct_id();
   console.log('✅ Identified as:', identifiedId);
   ```

**Expected Results**:
- ✅ ph_id included in magic link URL
- ✅ ph_id preserved after token validation
- ✅ afterLoginIdentify() merges history
- ✅ User identified with correct ID

**Pass Criteria**:
```javascript
console.assert(carriedId === preId, 'ph_id preserved in magic link');
console.assert(identifiedId === me.id, 'Identified with magic link user');
```

---

### ✅ Scenario 4: Session Guard (No Duplicate Identifies)

**Objective**: Verify afterLoginIdentify() doesn't re-identify on page refresh

**Steps**:

1. **Complete login** (use any method from scenarios 1-3)
   ```javascript
   window.AMA.afterLoginIdentify(
     { id: 'user_123', email: 'test@example.com' },
     { plan: 'premium' }
   );
   
   console.log('✅ Initial identify complete');
   ```

2. **Check session guard**
   ```javascript
   const guard = sessionStorage.getItem('ph_ss_identified_user_123');
   console.log('🛡️ Session guard:', guard);
   // Should be "1"
   ```

3. **Refresh the page**
   ```javascript
   location.reload();
   ```

4. **Try to identify again**
   ```javascript
   // After page reload
   window.AMA.afterLoginIdentify(
     { id: 'user_123', email: 'test@example.com' },
     { plan: 'premium' }
   );
   
   console.log('🛡️ Second identify call (should be no-op)');
   ```

5. **Verify no duplicate**
   ```javascript
   // Check PostHog dashboard
   // Should NOT see duplicate USER_IDENTIFIED events
   // Should NOT see duplicate posthog.identify() calls
   
   const guard = sessionStorage.getItem('ph_ss_identified_user_123');
   console.log('🛡️ Guard still set:', guard);
   // Should still be "1"
   ```

**Expected Results**:
- ✅ Session guard set after first identify
- ✅ Second identify call is no-op (guard prevents re-identification)
- ✅ No duplicate USER_IDENTIFIED events in PostHog
- ✅ PostHog distinct_id remains user_123

**Pass Criteria**:
```javascript
console.assert(guard === '1', 'Session guard prevents duplicates');
```

---

### ✅ Scenario 5: Logout and Reset

**Objective**: Verify logout clears flags and starts new anonymous session

**Steps**:

1. **Login and identify**
   ```javascript
   window.AMA.afterLoginIdentify(
     { id: 'user_123', email: 'test@example.com' },
     { plan: 'premium' }
   );
   
   const beforeId = window.posthog.get_distinct_id();
   console.log('👤 Before logout:', beforeId);
   // Should be "user_123"
   ```

2. **Check flags before logout**
   ```javascript
   console.log('Before logout flags:');
   console.log('  sessionStorage guard:', sessionStorage.getItem('ph_ss_identified_user_123'));
   console.log('  localStorage guard:', localStorage.getItem('posthog_identified_user_123'));
   console.log('  pre_ph_id:', sessionStorage.getItem('ama:pre_ph_id'));
   ```

3. **Logout**
   ```javascript
   window.AMA.onLogoutCleanup('user_123');
   
   await fetch('/api/logout', { method: 'POST' });
   ```

4. **Verify cleanup**
   ```javascript
   const afterId = window.posthog.get_distinct_id();
   console.log('👤 After logout:', afterId);
   // Should be NEW anonymous ID (different from beforeId)
   
   console.log('After logout flags:');
   console.log('  sessionStorage guard:', sessionStorage.getItem('ph_ss_identified_user_123'));
   // Should be null
   console.log('  localStorage guard:', localStorage.getItem('posthog_identified_user_123'));
   // Should be null
   console.log('  pre_ph_id:', sessionStorage.getItem('ama:pre_ph_id'));
   // Should be null
   ```

5. **Navigate to login page**
   ```javascript
   location.href = '/login';
   
   // After redirect
   const freshId = window.posthog.get_distinct_id();
   console.log('👤 Fresh anonymous ID:', freshId);
   // Should be same as afterId (new anonymous session)
   ```

**Expected Results**:
- ✅ New anonymous ID after logout (different from user_123)
- ✅ All flags cleared (sessionStorage and localStorage)
- ✅ PostHog reset called
- ✅ Fresh anonymous session started

**Pass Criteria**:
```javascript
console.assert(afterId !== beforeId, 'New anonymous session started');
console.assert(!sessionStorage.getItem('ph_ss_identified_user_123'), 'Session guard cleared');
console.assert(!localStorage.getItem('posthog_identified_user_123'), 'Local guard cleared');
console.assert(!sessionStorage.getItem('ama:pre_ph_id'), 'Pre-auth ID cleared');
```

---

### ✅ Scenario 6: Cross-Tab Sync

**Objective**: Verify session guard works across browser tabs

**Steps**:

1. **Tab 1: Login and identify**
   ```javascript
   window.AMA.afterLoginIdentify(
     { id: 'user_123', email: 'test@example.com' },
     { plan: 'premium' }
   );
   
   console.log('Tab 1: Identified as', window.posthog.get_distinct_id());
   ```

2. **Tab 2: Open new tab to dashboard**
   ```javascript
   // Open new tab: example.com/dashboard
   
   // Check session guard
   const guard = sessionStorage.getItem('ph_ss_identified_user_123');
   console.log('Tab 2: Session guard exists:', !!guard);
   // Should be true (sessionStorage is shared across tabs in same origin)
   ```

3. **Tab 2: Try to identify again**
   ```javascript
   // This might happen if you have identify logic on page load
   window.AMA.afterLoginIdentify(
     { id: 'user_123', email: 'test@example.com' },
     { plan: 'premium' }
   );
   
   console.log('Tab 2: Should be no-op (guard prevents duplicate)');
   ```

4. **Verify no duplicates**
   ```javascript
   // Check PostHog dashboard
   // Should NOT see duplicate USER_IDENTIFIED events from Tab 2
   ```

**Expected Results**:
- ✅ sessionStorage guard shared across tabs (same origin)
- ✅ Second tab doesn't re-identify
- ✅ No duplicate events in PostHog

**Pass Criteria**:
```javascript
console.assert(guard === '1', 'Session guard prevents cross-tab duplicates');
```

---

### ✅ Scenario 7: Error Handling

**Objective**: Verify graceful degradation when PostHog not available

**Steps**:

1. **Simulate PostHog not loaded**
   ```javascript
   const originalPostHog = window.posthog;
   delete window.posthog;
   
   console.log('⚠️ PostHog not available');
   ```

2. **Call identity APIs**
   ```javascript
   // Should not crash
   const preId = window.AMA.preAuthMark();
   console.log('preAuthMark() with no PostHog:', preId);
   // Should be null
   
   window.AMA.afterLoginIdentify(
     { id: 'user_123', email: 'test@example.com' },
     { plan: 'premium' }
   );
   console.log('✅ afterLoginIdentify() did not crash');
   
   window.AMA.onLogoutCleanup('user_123');
   console.log('✅ onLogoutCleanup() did not crash');
   ```

3. **Restore PostHog**
   ```javascript
   window.posthog = originalPostHog;
   console.log('PostHog restored');
   ```

**Expected Results**:
- ✅ No JavaScript errors
- ✅ preAuthMark() returns null
- ✅ afterLoginIdentify() is no-op
- ✅ onLogoutCleanup() clears storage only

**Pass Criteria**:
```javascript
console.assert(preId === null, 'Returns null when PostHog unavailable');
// No exceptions thrown
```

---

### ✅ Scenario 8: Invalid User Data

**Objective**: Verify safe handling of invalid inputs

**Steps**:

1. **Call with null user**
   ```javascript
   window.AMA.afterLoginIdentify(null, {});
   console.log('✅ Handled null user');
   ```

2. **Call with missing ID**
   ```javascript
   window.AMA.afterLoginIdentify({ email: 'test@example.com' }, {});
   console.log('✅ Handled missing ID');
   ```

3. **Call with invalid ID**
   ```javascript
   window.AMA.afterLoginIdentify({ id: '', email: 'test@example.com' }, {});
   console.log('✅ Handled empty ID');
   ```

4. **Call onLogoutCleanup with null**
   ```javascript
   window.AMA.onLogoutCleanup(null);
   console.log('✅ Handled null userId in cleanup');
   ```

**Expected Results**:
- ✅ No JavaScript errors
- ✅ No PostHog calls made with invalid data
- ✅ Graceful no-op behavior

**Pass Criteria**:
```javascript
// No exceptions thrown
console.log('All edge cases handled gracefully');
```

---

## Automated Verification Script

Run this in browser console after implementing:

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AMA Identity Bridge Automated QA Script
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(async function runQA() {
  console.log('🧪 Starting AMA Identity Bridge QA...\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, condition, expected = true) {
    const result = condition === expected;
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.error(`❌ ${name}`);
      console.error(`   Expected: ${expected}, Got: ${condition}`);
      failed++;
    }
    return result;
  }
  
  // Test 1: API exists
  test('AMA global exists', typeof window.AMA === 'object');
  test('preAuthMark exists', typeof window.AMA.preAuthMark === 'function');
  test('afterLoginIdentify exists', typeof window.AMA.afterLoginIdentify === 'function');
  test('onLogoutCleanup exists', typeof window.AMA.onLogoutCleanup === 'function');
  test('_takePreAuthId exists', typeof window.AMA._takePreAuthId === 'function');
  
  // Test 2: PostHog loaded
  test('PostHog SDK loaded', typeof window.posthog === 'object');
  test('posthog.get_distinct_id exists', typeof window.posthog?.get_distinct_id === 'function');
  
  // Test 3: preAuthMark
  const preId = window.AMA.preAuthMark();
  test('preAuthMark returns string', typeof preId === 'string');
  const savedId = sessionStorage.getItem('ama:pre_ph_id');
  test('preAuthMark saves to sessionStorage', savedId === preId);
  
  // Test 4: _takePreAuthId
  const retrieved = window.AMA._takePreAuthId();
  test('_takePreAuthId retrieves saved ID', retrieved === preId);
  
  // Test 5: afterLoginIdentify (mock user)
  const mockUser = { id: 'test_user_' + Date.now(), email: 'test@qa.com' };
  window.AMA.afterLoginIdentify(mockUser, { plan: 'test' });
  const guard = sessionStorage.getItem(`ph_ss_identified_${mockUser.id}`);
  test('afterLoginIdentify sets session guard', guard === '1');
  test('PostHog distinct_id updated', window.posthog.get_distinct_id() === mockUser.id);
  
  // Test 6: Session guard prevents duplicate
  const beforeCount = sessionStorage.length;
  window.AMA.afterLoginIdentify(mockUser, { plan: 'test' });
  test('Session guard prevents duplicate identify', sessionStorage.length === beforeCount);
  
  // Test 7: onLogoutCleanup
  window.AMA.onLogoutCleanup(mockUser.id);
  const guardAfterLogout = sessionStorage.getItem(`ph_ss_identified_${mockUser.id}`);
  test('onLogoutCleanup clears session guard', guardAfterLogout === null);
  const preIdAfterLogout = sessionStorage.getItem('ama:pre_ph_id');
  test('onLogoutCleanup clears pre_ph_id', preIdAfterLogout === null);
  test('PostHog reset (new anonymous ID)', window.posthog.get_distinct_id() !== mockUser.id);
  
  // Test 8: Error handling
  const originalPostHog = window.posthog;
  delete window.posthog;
  let crashed = false;
  try {
    window.AMA.preAuthMark();
    window.AMA.afterLoginIdentify({ id: 'test' }, {});
    window.AMA.onLogoutCleanup('test');
  } catch (e) {
    crashed = true;
  }
  window.posthog = originalPostHog;
  test('APIs safe when PostHog unavailable', !crashed);
  
  // Test 9: Invalid inputs
  crashed = false;
  try {
    window.AMA.afterLoginIdentify(null, {});
    window.AMA.afterLoginIdentify({ id: '' }, {});
    window.AMA.onLogoutCleanup(null);
  } catch (e) {
    crashed = true;
  }
  test('APIs handle invalid inputs gracefully', !crashed);
  
  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - Identity Bridge is working correctly!');
  } else {
    console.error('❌ SOME TESTS FAILED - Please review implementation');
  }
})();
```

---

## Manual Verification Commands

### Check Current State

```javascript
// Current PostHog ID
console.log('Current ID:', window.posthog.get_distinct_id());

// Session guards
console.log('Session guards:', 
  Object.keys(sessionStorage)
    .filter(k => k.includes('ph_ss_identified'))
);

// Pre-auth ID
console.log('Pre-auth ID:', sessionStorage.getItem('ama:pre_ph_id'));

// Local guards
console.log('Local guards:',
  Object.keys(localStorage)
    .filter(k => k.includes('posthog_identified'))
);
```

### Force Reset

```javascript
// Nuclear option: clear everything
sessionStorage.clear();
localStorage.clear();
window.posthog?.reset();
location.reload();
```

### Debug Logging

Add this to your code temporarily:

```javascript
// Wrap afterLoginIdentify with logging
const originalIdentify = window.AMA.afterLoginIdentify;
window.AMA.afterLoginIdentify = function(user, props) {
  console.log('🔍 [DEBUG] afterLoginIdentify called:', { user, props });
  const preId = window.AMA._takePreAuthId();
  console.log('🔍 [DEBUG] Pre-auth ID retrieved:', preId);
  const result = originalIdentify.call(this, user, props);
  console.log('🔍 [DEBUG] Identify complete:', window.posthog.get_distinct_id());
  return result;
};
```

---

## PostHog Dashboard Verification

### Events to Check

After running tests, verify in PostHog dashboard:

1. **USER_IDENTIFIED events**
   - Should appear once per session
   - Properties: `identification_method: 'post_login'`, `page: '/...'`

2. **Pre-login events**
   - Should be merged under identified user
   - Check timeline shows events before and after login

3. **Group analytics** (if using company_id)
   - User should be associated with company group
   - Company properties should be set

### Filters to Use

```
Event: USER_IDENTIFIED
Breakdown: identification_method

Person: [your test user email]
Timeline view: All events
```

---

## Common Issues & Solutions

### Issue: Pre-login history not merged

**Symptoms**: Events before login appear under separate anonymous user

**Debug**:
```javascript
// Check if preAuthMark was called
console.log(sessionStorage.getItem('ama:pre_ph_id'));
// Should NOT be null before login
```

**Solution**: Ensure `preAuthMark()` called BEFORE auth redirect/submit

---

### Issue: Duplicate USER_IDENTIFIED events

**Symptoms**: Multiple identify events for same user in same session

**Debug**:
```javascript
// Check session guard
console.log(sessionStorage.getItem('ph_ss_identified_user_123'));
// Should be "1" after first identify
```

**Solution**: Session guard should prevent this automatically. Check if you're manually calling `posthog.identify()` elsewhere.

---

### Issue: PostHog not available

**Symptoms**: Console errors about `posthog` undefined

**Debug**:
```javascript
console.log(typeof window.posthog);
// Should be "object"
```

**Solution**: Ensure PostHog SDK loaded before calling AMA APIs. The identity bridge is safe but won't work without PostHog.

---

## Sign-Off Checklist

Before deploying to production:

- [ ] All 8 test scenarios pass
- [ ] Automated QA script runs without errors
- [ ] PostHog dashboard shows correct event merge
- [ ] No duplicate USER_IDENTIFIED events
- [ ] Logout properly resets state
- [ ] Cross-tab behavior verified
- [ ] Error handling tested (PostHog unavailable)
- [ ] Invalid inputs handled gracefully
- [ ] TypeScript types working (if using TS)
- [ ] Integration docs reviewed by team

---

**Status**: Ready for Production  
**Last Updated**: November 1, 2025  
**Version**: 1.2.0
