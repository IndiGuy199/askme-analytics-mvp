/* ========================================================================
 * AskMe Analytics — ph-identity.js
 * Backend-agnostic identity bridge for user identification and auth tracking
 * Exposes AMA.preAuthMark(), AMA.afterLoginIdentify(), AMA.onLogoutCleanup()
 * ======================================================================== */

(function () {
    'use strict';

    const root = window;

    const dbg = (...a) => { if (root.AskMeAnalyticsConfig?.debug) console.log(...a); };

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
     * Retrieves the pre-auth ID from sessionStorage only.
     * URL-param fallback (?ph_id=) removed — it is a privacy risk and
     * could allow session-hijacking via crafted links.
     * @returns {string|null}
     */
    AMA._takePreAuthId = function _takePreAuthId() {
        try {
            const v = safeGetItem('session', 'ama:pre_ph_id');
            if (v) return v;
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
     * Identifies user by email (used by injector for email-field auto-detection).
     *
     * Security note: using a raw email as PostHog distinct_id leaks PII and makes
     * cross-device dedup unreliable.  This function now defaults to setting the email
     * as a person *property* only (via setPersonProperties), NOT as the distinct_id.
     *
     * Set config.allowEmailIdentify = true to restore the legacy behaviour where
     * email is used as distinct_id (e.g. during a controlled migration period).
     *
     * @param {string} email - User email captured from DOM
     * @param {Object} properties - Additional properties
     */
    AMA.identifyUser = function identifyUser(email, properties = {}) {
        try {
            if (!email || typeof email !== 'string' || !email.trim()) return;
            const normalised = email.trim().toLowerCase();
            if (identifiedEmails.has(normalised)) return;
            identifiedEmails.add(normalised);

            const config = root.AskMeAnalyticsConfig || {};
            const allowEmailIdentify = config.allowEmailIdentify === true;

            const ph = root.posthog;

            function applyIdentity(ph) {
                if (allowEmailIdentify) {
                    // Legacy: use email as distinct_id (requires explicit opt-in)
                    if (typeof ph.identify === 'function') {
                        ph.identify(normalised, { email: normalised, identified_via: 'injector', ...properties });
                        dbg('[ph-identity] identifyUser (email as distinct_id):', normalised);
                    }
                } else {
                    // Safe default: set email as a person property WITHOUT changing distinct_id
                    if (typeof ph.setPersonProperties === 'function') {
                        ph.setPersonProperties({ email: normalised, identified_via: 'injector', ...properties });
                    } else if (typeof ph.capture === 'function') {
                        // Fallback for older PostHog bundle versions
                        ph.capture('$set', { $set: { email: normalised, identified_via: 'injector', ...properties } });
                    }
                    dbg('[ph-identity] identifyUser (person property only):', normalised);
                }
            }

            if (ph && typeof ph.capture === 'function') {
                applyIdentity(ph);
            } else {
                // Retry once if PostHog not yet ready
                setTimeout(() => {
                    const ph2 = root.posthog;
                    if (ph2 && typeof ph2.capture === 'function') applyIdentity(ph2);
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
    
    AMA.isReady = true;
    AMA._initialized = true;

    dbg('[ph-identity] ✅ AMA v' + AMA.version + ' initialized');
})();
