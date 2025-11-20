/* ========================================================================
 * AskMe Analytics — ph-observers.js
 * DOM mutation observers, route change detection, and dynamic content monitoring
 * ======================================================================== */

(function () {
    'use strict';

    window.PHObservers = window.PHObservers || {};

    let observerConfig = null;
    let mutationObserver = null;
    let routeObserver = null;
    let mutationDebounceTimer = null;
    const MUTATION_DEBOUNCE_MS = 250; // Wait 250ms after last mutation before processing

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
            console.log('[ph-observers] MutationObserver already running');
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
                    console.log('[ph-observers] DOM mutations detected, triggering callbacks (debounced)');
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
        console.log('[ph-observers] ✅ MutationObserver started');
    }

    /**
     * Stop mutation observer
     */
    function stopMutationObserver() {
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
            console.log('[ph-observers] MutationObserver stopped');
        }
    }

    /* ---------- Route Change Observer -------------------------------- */
    /**
     * Monitor for route/URL changes (SPA navigation)
     * Calls registered callbacks when route changes
     */
    function startRouteObserver() {
        if (routeObserver) {
            console.log('[ph-observers] Route observer already running');
            return;
        }

        let lastPath = location.pathname;

        // Check for route changes periodically
        routeObserver = setInterval(() => {
            if (location.pathname !== lastPath) {
                console.log('[ph-observers] Route changed:', lastPath, '→', location.pathname);
                const oldPath = lastPath;
                lastPath = location.pathname;

                callbacks.onRouteChange.forEach(cb => {
                    try {
                        cb(oldPath, lastPath);
                    } catch (e) {
                        console.warn('[ph-observers] Route change callback failed:', e);
                    }
                });
            }
        }, 200);

        // Also listen for popstate (back/forward navigation)
        window.addEventListener('popstate', () => {
            const currentPath = location.pathname;
            if (currentPath !== lastPath) {
                console.log('[ph-observers] Popstate route change:', lastPath, '→', currentPath);
                const oldPath = lastPath;
                lastPath = currentPath;

                callbacks.onRouteChange.forEach(cb => {
                    try {
                        cb(oldPath, currentPath);
                    } catch (e) {
                        console.warn('[ph-observers] Route change callback failed:', e);
                    }
                });
            }
        });

        console.log('[ph-observers] ✅ Route observer started');
    }

    /**
     * Stop route observer
     */
    function stopRouteObserver() {
        if (routeObserver) {
            clearInterval(routeObserver);
            routeObserver = null;
            console.log('[ph-observers] Route observer stopped');
        }
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

    console.log('[ph-observers] ✅ Observer module loaded');
})();
