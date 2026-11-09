/* ========================================================================
 * AskMe Analytics — ph-observers.js
 * DOM mutation observers, route change detection, and dynamic content monitoring
 * ======================================================================== */

(function () {
    'use strict';

    const dbg = (...a) => { if (window.AskMeAnalyticsConfig?.debug) console.log(...a); };

    window.PHObservers = window.PHObservers || {};

    let observerConfig = null;
    let mutationObserver = null;
    let routeObserver = null;          // truthy when route observer is running
    let mutationDebounceTimer = null;
    const MUTATION_DEBOUNCE_MS = 250;

    // Route observer internals – kept so stopRouteObserver() can clean up properly
    let popstateHandler = null;
    let origPushState = null;
    let origReplaceState = null;

    let callbacks = {
        onMutation: [],
        onRouteChange: []
    };

    /* ---------- Mutation Observer -------------------------------- */
    /**
     * Start observing DOM mutations
     * Calls registered callbacks when changes detected
     */
    function startMutationObserver(targetNode = document.body, config = {}) {
        if (mutationObserver) {
            dbg('[ph-observers] MutationObserver already running');
            return;
        }

        observerConfig = {
            childList: true,
            subtree: true,
            ...config
        };

        mutationObserver = new MutationObserver((mutations) => {
            let hasRelevantChanges = false;

            mutations.forEach(mut => {
                if (mut.type === 'childList' && (mut.addedNodes.length || mut.removedNodes.length)) {
                    hasRelevantChanges = true;
                }
            });

            if (hasRelevantChanges) {
                // Debounce: clear existing timer and set new one
                if (mutationDebounceTimer) {
                    clearTimeout(mutationDebounceTimer);
                }

                mutationDebounceTimer = setTimeout(() => {
                    dbg('[ph-observers] DOM mutations detected, triggering callbacks (debounced)');
                    callbacks.onMutation.forEach(cb => {
                        try {
                            cb(mutations);
                        } catch (e) {
                            console.warn('[ph-observers] Mutation callback failed:', e);
                        }
                    });
                    mutationDebounceTimer = null;
                }, MUTATION_DEBOUNCE_MS);
            }
        });

        mutationObserver.observe(targetNode, observerConfig);
        dbg('[ph-observers] ✅ MutationObserver started');
    }

    /**
     * Stop mutation observer
     */
    function stopMutationObserver() {
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
            dbg('[ph-observers] MutationObserver stopped');
        }
    }

    /* ---------- Route Change Observer -------------------------------- */
    /**
     * Monitor for route/URL changes (SPA navigation).
     * Uses history.pushState / replaceState monkeypatching + popstate.
     * Safe to call multiple times — only installs once.
     */
    function startRouteObserver() {
        if (routeObserver) {
            dbg('[ph-observers] Route observer already running');
            return;
        }
        routeObserver = true; // sentinel – set before patching so re-entrant calls bail

        let lastPath = location.pathname;

        function emitRouteChange(oldPath, newPath) {
            dbg('[ph-observers] Route changed:', oldPath, '→', newPath);
            callbacks.onRouteChange.forEach(cb => {
                try { cb(oldPath, newPath); }
                catch (e) { console.warn('[ph-observers] Route change callback failed:', e); }
            });
        }

        function handleNavigation() {
            const currentPath = location.pathname;
            if (currentPath !== lastPath) {
                const oldPath = lastPath;
                lastPath = currentPath;
                emitRouteChange(oldPath, currentPath);
            }
        }

        // Monkeypatch pushState / replaceState (only if we haven't already)
        if (!origPushState) {
            origPushState = history.pushState.bind(history);
            history.pushState = function (...args) {
                const result = origPushState(...args);
                handleNavigation();
                return result;
            };
        }
        if (!origReplaceState) {
            origReplaceState = history.replaceState.bind(history);
            history.replaceState = function (...args) {
                const result = origReplaceState(...args);
                handleNavigation();
                return result;
            };
        }

        // popstate covers back/forward navigation (browser doesn't fire pushState for those)
        if (!popstateHandler) {
            popstateHandler = () => handleNavigation();
            window.addEventListener('popstate', popstateHandler);
        }

        dbg('[ph-observers] ✅ Route observer started (history monkeypatch)');
    }

    /**
     * Stop route observer and restore all patched history methods.
     */
    function stopRouteObserver() {
        if (!routeObserver) return;
        routeObserver = null;

        // Restore original history methods
        if (origPushState) { history.pushState = origPushState; origPushState = null; }
        if (origReplaceState) { history.replaceState = origReplaceState; origReplaceState = null; }

        // Remove popstate listener
        if (popstateHandler) {
            window.removeEventListener('popstate', popstateHandler);
            popstateHandler = null;
        }

        dbg('[ph-observers] Route observer stopped');
    }

    /* ---------- Callback Registration -------------------------------- */
    /**
     * Register callback for mutation events
     * @param {Function} callback - Called when DOM mutations detected
     */
    function onMutation(callback) {
        if (typeof callback === 'function') {
            callbacks.onMutation.push(callback);
        }
    }

    /**
     * Register callback for route changes
     * @param {Function} callback - Called when route changes (oldPath, newPath)
     */
    function onRouteChange(callback) {
        if (typeof callback === 'function') {
            callbacks.onRouteChange.push(callback);
        }
    }

    /* ---------- Visibility Observer -------------------------------- */
    /**
     * Watch for element visibility changes
     * @param {Element} element - Element to watch
     * @param {Function} callback - Called when visibility changes (isVisible)
     */
    function watchVisibility(element, callback) {
        if (!element || typeof callback !== 'function') return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                callback(entry.isIntersecting);
            });
        }, { threshold: 0.1 });

        observer.observe(element);
        return observer;
    }

    /* ---------- Exports -------------------------------- */
    PHObservers.startMutationObserver = startMutationObserver;
    PHObservers.stopMutationObserver = stopMutationObserver;
    PHObservers.startRouteObserver = startRouteObserver;
    PHObservers.stopRouteObserver = stopRouteObserver;
    PHObservers.onMutation = onMutation;
    PHObservers.onRouteChange = onRouteChange;
    PHObservers.watchVisibility = watchVisibility;

    dbg('[ph-observers] ✅ Observer module loaded');
})();
