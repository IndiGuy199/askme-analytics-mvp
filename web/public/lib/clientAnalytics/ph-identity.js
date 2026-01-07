/* ========================================================================
 * AskMe Analytics — ph-identity.js
 * Backend-agnostic identity bridge for user identification and auth tracking
 * Exposes AMA.preAuthMark(), AMA.afterLoginIdentify(), AMA.onLogoutCleanup()
 * ======================================================================== */

(function () {
    'use strict';

    const root = window;
    
    // ═══ Initialize AMA namespace (never replace existing) ═══
    root.AMA = root.AMA || {};
    const AMA = root.AMA;
    
    // Prevent re-initialization
    if (AMA._initialized) {
        if (root.AskMeAnalyticsConfig?.debug) {
            console.warn('[ph-identity] AMA already initialized, skipping');
        }
        return;
    }
    
    // ═══ Version & Ready State ═══
    AMA.version = '2.0.0';
    AMA.isReady = false;  // Set true after all functions attached

    const identifiedEmails = new Set();
    
    // ═══ Safe Storage Access ═══
    function safeGetItem(type, key, fallback = null) {
        try {
            const storage = type === 'session' ? sessionStorage : localStorage;
            return storage.getItem(key) ?? fallback;
        } catch (e) {
            return fallback;
        }
    }
    
    function safeSetItem(type, key, value) {
        try {
            const storage = type === 'session' ? sessionStorage : localStorage;
            storage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    function safeRemoveItem(type, key) {
        try {
            const storage = type === 'session' ? sessionStorage : localStorage;
            storage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    /* ---------- Pre-Auth Marker -------------------------------- */
    /**
     * Call right before starting any login (form submit or SSO click)
     * Captures the anonymous PostHog ID for later aliasing
     * @returns {string|null} The pre-auth PostHog ID or null
     */
    AMA.preAuthMark = function preAuthMark() {
        try {
            const ph = root.posthog;
            if (!ph || typeof ph.get_distinct_id !== 'function') {
                return null;  // NOOP when PostHog unavailable
            }
            const preId = ph.get_distinct_id() || null;
            if (preId) {
                safeSetItem('session', 'ama:pre_ph_id', preId);
            }
            return preId;
        } catch (e) {
            if (root.AskMeAnalyticsConfig?.debug) {
                console.warn('[AMA.preAuthMark] Error:', e.message);
            }
            return null;
        }
    };

    /* ---------- Helper: Retrieve Pre-Auth ID -------------------------------- */
    /**
     * Retrieves the pre-auth ID from storage or URL
     * @returns {string|null} The pre-auth ID or null
     */
    AMA._takePreAuthId = function _takePreAuthId() {
        try {
            const v = safeGetItem('session', 'ama:pre_ph_id');
            if (v) return v;
        } catch {}
        try {
            const u = new URL(location.href);
            return u.searchParams.get('ph_id');
        } catch {}
        return null;
    };

    /* ---------- Post-Login Identification -------------------------------- */
    /**
     * Call after login succeeds with verified user data
     * Merges anonymous session with identified user
     * @param {Object} user - User object with id and optional email
     * @param {Object} props - Additional properties (company_id, etc.)
     */
    AMA.afterLoginIdentify = function afterLoginIdentify(user, props = {}) {
        try {
            const ph = root.posthog;
            if (!ph || typeof ph.identify !== 'function') {
                if (root.AskMeAnalyticsConfig?.debug) {
                    console.warn('[AMA.afterLoginIdentify] PostHog not available');
                }
                return;
            }
            if (!user || !user.id) {
                if (root.AskMeAnalyticsConfig?.debug) {
                    console.warn('[AMA.afterLoginIdentify] Invalid user object');
                }
                return;
            }

            const current = ph.get_distinct_id?.() || null;
            const ssKey = `ph_ss_identified_${user.id}`;
            if (safeGetItem('session', ssKey) === '1' || current === user.id) {
                safeSetItem('session', ssKey, '1');
                return;
            }

            const carried = AMA._takePreAuthId();
            if (carried && carried !== user.id && typeof ph.alias === 'function') {
                ph.alias(user.id, carried);
            }

            ph.identify(user.id, { email: user.email, ...props });

            if (props.company_id && typeof ph.group === 'function') {
                ph.group('company', props.company_id, {
                    company_name: props.company_name,
                    company_slug: props.company_slug,
                });
            }

            if (typeof ph.capture === 'function') {
                ph.capture('USER_IDENTIFIED', { identification_method: 'post_login', page: location.pathname });
            }

            safeSetItem('session', ssKey, '1');
            safeSetItem('local', `posthog_identified_${user.id}`, user.id);
        } catch (e) {
            if (root.AskMeAnalyticsConfig?.debug) {
                console.warn('[AMA.afterLoginIdentify] Error:', e.message);
            }
        }
    };

    /* ---------- Logout Cleanup -------------------------------- */
    /**
     * Cleans up identity state on logout
     * @param {string|null} userId - Optional user ID to clean up
     */
    AMA.onLogoutCleanup = function onLogoutCleanup(userId) {
        try {
            if (userId) {
                safeRemoveItem('local', `posthog_identified_${userId}`);
                safeRemoveItem('session', `ph_ss_identified_${userId}`);
            }
            safeRemoveItem('session', 'ama:pre_ph_id');
            root.posthog?.reset?.();
        } catch (e) {
            if (root.AskMeAnalyticsConfig?.debug) {
                console.warn('[AMA.onLogoutCleanup] Error:', e.message);
            }
        }
    };

    /* ---------- Direct Identify (from injector) -------------------------------- */
    /**
     * Identifies user by email (used by injector for email field detection)
     * Note: This is different from afterLoginIdentify - it's for injector auto-detection
     * @param {string} email - User email
     * @param {Object} properties - Additional properties
     */
    AMA.identifyUser = function identifyUser(email, properties = {}) {
        try {
            if (!email || typeof email !== 'string' || !email.trim()) return;
            if (identifiedEmails.has(email)) return;
            identifiedEmails.add(email);

            const ph = root.posthog;
            if (ph && typeof ph.identify === 'function') {
                ph.identify(email, { email, identified_via: 'injector', ...properties });
                if (root.AskMeAnalyticsConfig?.debug) {
                    console.log('[ph-identity] User identified:', email);
                }
            } else {
                // Retry once if PostHog not yet ready
                setTimeout(() => {
                    const ph2 = root.posthog;
                    if (ph2 && typeof ph2.identify === 'function') {
                        ph2.identify(email, { email, identified_via: 'injector', ...properties });
                    }
                }, 100);
            }
        } catch (e) {
            if (root.AskMeAnalyticsConfig?.debug) {
                console.warn('[AMA.identifyUser] Error:', e.message);
            }
        }
    };
    
    // ═══ Backward Compatibility Alias ═══
    // Note: identifyUser has different semantics (email-based, injector auto-detection)
    // Keep both as separate functions; alias is only for legacy code that calls identifyUser
    // expecting afterLoginIdentify behavior - they can use either
    
    // ═══ Mark Ready ═══
    AMA.isReady = true;
    AMA._initialized = true;

    console.log('[ph-identity] ✅ AMA v' + AMA.version + ' initialized');
})();
