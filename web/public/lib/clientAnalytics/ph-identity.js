/* ========================================================================
 * AskMe Analytics — ph-identity.js
 * Backend-agnostic identity bridge for user identification and auth tracking
 * Exposes AMA.preAuthMark(), AMA.afterLoginIdentify(), AMA.onLogoutCleanup()
 * ======================================================================== */

(function () {
    'use strict';

    window.AMA = window.AMA || {};

    const identifiedEmails = new Set();

    /* ---------- Pre-Auth Marker -------------------------------- */
    /**
     * Call right before starting any login (form submit or SSO click)
     * Captures the anonymous PostHog ID for later aliasing
     */
    window.AMA.preAuthMark = function () {
        try {
            const ph = window.posthog;
            const preId = ph?.get_distinct_id?.() || null;
            if (preId) sessionStorage.setItem('ama:pre_ph_id', preId);
            return preId;
        } catch { return null; }
    };

    /* ---------- Helper: Retrieve Pre-Auth ID -------------------------------- */
    window.AMA._takePreAuthId = function () {
        try {
            const v = sessionStorage.getItem('ama:pre_ph_id');
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
     */
    window.AMA.afterLoginIdentify = function (user, props = {}) {
        const ph = window.posthog;
        if (!ph?.identify || !user?.id) return;

        const current = ph?.get_distinct_id?.();
        const ssKey = `ph_ss_identified_${user.id}`;
        if (sessionStorage.getItem(ssKey) === '1' || current === user.id) {
            sessionStorage.setItem(ssKey, '1');
            return;
        }

        const carried = window.AMA._takePreAuthId();
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

        ph.capture?.('USER_IDENTIFIED', { identification_method: 'post_login', page: location.pathname });

        sessionStorage.setItem(ssKey, '1');
        try { localStorage.setItem(`posthog_identified_${user.id}`, user.id); } catch {}
    };

    /* ---------- Logout Cleanup -------------------------------- */
    window.AMA.onLogoutCleanup = function (userId) {
        try {
            if (userId) {
                localStorage.removeItem(`posthog_identified_${userId}`);
                sessionStorage.removeItem(`ph_ss_identified_${userId}`);
            }
            sessionStorage.removeItem('ama:pre_ph_id');
        } catch {}
        window.posthog?.reset?.();
    };

    /* ---------- Direct Identify (from injector) -------------------------------- */
    window.AMA.identifyUser = function (email, properties = {}) {
        if (!email || typeof email !== 'string' || !email.trim()) return;
        if (identifiedEmails.has(email)) return;
        identifiedEmails.add(email);

        const ph = window.posthog;
        if (ph?.identify && typeof ph.identify === 'function') {
            try {
                ph.identify(email, { email, identified_via: 'injector', ...properties });
                console.log('[ph-identity] User identified:', email);
            } catch (e) {
                console.warn('[ph-identity] identify failed', e);
            }
        } else {
            setTimeout(() => window.AMA.identifyUser(email, properties), 100);
        }
    };

    console.log('[ph-identity] ✅ Identity bridge loaded');
})();
