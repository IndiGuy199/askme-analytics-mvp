/**
 * AskMe Analytics Initialization Script - REFACTORED v2.0
 * @version 2.0.0
 * @updated 2025-01-14
 * @features
 *   - Modular architecture with specialized modules
 *   - Dynamic configuration loading from JSON files
 *   - Duplicate prevention guards
 *   - Support for inline config overrides
 *   - Automatic fallback to defaults
 * 
 * Module Loading Order:
 * 1. ph-constants.js - Global constants and enums
 * 2. ph-utils.js - DOM utilities and helpers
 * 3. ph-identity.js - User identification bridge
 * 4. ph-event-capture.js - Event capture and queuing
 * 5. ph-product-extractors.js - Product metadata extraction
 * 6. ph-observers.js - DOM/route observers
 * 7. ph-step-tracker.js - Step tagging and rules
 * 8. ph-product-injector-refactored.js - Main orchestration
 */

(function() {
    'use strict';

    // Module paths configuration - will be initialized after config loads
    function getModulePaths(config) {
        return {
            constants: (config && config.constantsPath) || '/lib/clientAnalytics/ph-constants.js',
            utils: '/lib/clientAnalytics/ph-utils.js',
            identity: '/lib/clientAnalytics/ph-identity.js',
            eventCapture: '/lib/clientAnalytics/ph-event-capture.js',
            extractors: '/lib/clientAnalytics/ph-product-extractors.js',
            cartExtractor: '/lib/clientAnalytics/ph-cart-extractor.js',
            observers: '/lib/clientAnalytics/ph-observers.js',
            stepTracker: '/lib/clientAnalytics/ph-step-tracker.js',
            injector: (config && config.injectorPath) || '/lib/clientAnalytics/ph-product-injector-refactored.js'
        };
    }

    // ✅ Dynamic configuration loading
    async function loadClientConfig() {
        const clientId = window.AskMeAnalyticsClientId || 'askme-analytics-app';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const configUrl = isLocalhost 
            ? `/lib/clientAnalytics/configs/${clientId}.json`
            : `https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/configs/${clientId}.json`;
        
        console.log('[init-v2] 🔍 Loading config from:', configUrl);
        try {
            const response = await fetch(configUrl);
            if (!response.ok) {
                return getDefaultConfig(clientId);
            }
            
            const config = await response.json();
            return config;
        } catch (error) {
            console.warn('[init-v2] ⚠️ Failed to load config, using defaults:', error.message);
            return getDefaultConfig(clientId);
        }
    }
    
    // Default configuration fallback
    function getDefaultConfig(clientId) {
        return {
            apiKey: 'phc_MN5MXCec7lNZtZakqpRQZqTLaPfcV6CxeE8hfbTUFE2',
            apiHost: 'https://us.i.posthog.com',
            clientId: clientId,
            debug: false,
            autocapture: true,
            useBuiltInPageview: true,
            capture_pageview: true,
            capture_pageleave: true,
            enableCustomDomTracking: false,
            preferCustomOverAutocapture: false,
            emailSelectors: 'input[type="email"], input[name*="email" i]',
            analyticsLibraryPath: '/lib/clientAnalytics/ask-me-analytics.min.js',
            productConfig: null,
            steps: []
        };
    }

    // Temporary placeholder
    window.AskMeAnalyticsConfig = window.AskMeAnalyticsConfig || getDefaultConfig('askme-analytics-app');

    // Page type detection function
    function getPageType() {
        const path = window.location.pathname.toLowerCase();
        if (path === '/' || path === '') return 'home';
        if (path.includes('/login') || path.includes('/signin')) return 'auth';
        if (path.includes('/signup') || path.includes('/register')) return 'registration';
        if (path.includes('/dashboard')) return 'dashboard';
        if (path.includes('/profile') || path.includes('/settings')) return 'profile';
        if (path.includes('/chat') || path.includes('/conversation')) return 'chat';
        return 'other';
    }

    // Load script helper with duplicate prevention
    function loadScript(src, onLoad, onError) {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            console.log('[init-v2] ✅ Script already loaded:', src);
            if (onLoad) onLoad();
            return existingScript;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = onLoad;
        script.onerror = onError;
        document.head.appendChild(script);
        return script;
    }

    // Initialize analytics
    function initAnalytics() {
        const config = window.AskMeAnalyticsConfig;
        
        if (window.__askme_genericanalytics_initialized) {
            console.warn('[init-v2] ⚠️ GenericAnalytics already initialized. Skipping duplicate init.');
            return;
        }
        
        if (window.GenericAnalytics) {
            if (window.posthog && window.posthog.__loaded) {
                console.log('[init-v2] ✅ PostHog already initialized on page, reusing existing instance');
                window.__askme_genericanalytics_initialized = true;
                
                window.dispatchEvent(new CustomEvent('askme:analytics:ready', {
                    detail: { clientId: config.clientId }
                }));
                return;
            }
            
            try {
                window.__askme_genericanalytics_initialized = true;
                
                window.GenericAnalytics.init({
                    apiKey: config.apiKey,
                    apiHost: config.apiHost,
                    clientId: config.clientId,
                    debug: config.debug,
                    autocapture: config.autocapture,
                    useBuiltInPageview: config.useBuiltInPageview,
                    capture_pageview: config.capture_pageview,
                    capture_pageleave: config.capture_pageleave,
                    enableCustomDomTracking: config.enableCustomDomTracking,
                    preferCustomOverAutocapture: config.preferCustomOverAutocapture,
                    getPageType: getPageType,
                    workflows: []
                });
                
                window.dispatchEvent(new CustomEvent('askme:analytics:ready', {
                    detail: { clientId: config.clientId }
                }));
                
            } catch (error) {
                console.error('[init-v2] ❌ Failed to initialize AskMe Analytics:', error);
                window.__askme_genericanalytics_initialized = false;
            }
        } else {
            const maxRetries = 10;
            const currentRetry = (window.__askme_init_retry_count || 0) + 1;
            window.__askme_init_retry_count = currentRetry;
            
            if (currentRetry <= maxRetries) {
                setTimeout(initAnalytics, 100);
            } else {
                console.error('[init-v2] ❌ GenericAnalytics library failed to load after', maxRetries, 'retries');
            }
        }
    }

    // Load modules in sequence
    function loadModulesSequentially(modules, onComplete) {
        let index = 0;
        
        function loadNext() {
            if (index >= modules.length) {
                console.log('[init-v2] ✅ All modules loaded successfully');
                if (onComplete) onComplete();
                return;
            }
            
            const module = modules[index];
            
            // Skip optional modules if not configured
            if (module.optional) {
                console.log(`[init-v2] ⏭️ Skipping optional module: ${module.name} (not configured)`);
                index++;
                loadNext();
                return;
            }
            
            console.log(`[init-v2] 📦 Loading module ${index + 1}/${modules.length}: ${module.name}`);
            
            // Special handling for the Injector module - create script with attributes BEFORE loading
            if (module.name === 'Injector') {
                const config = window.AskMeAnalyticsConfig;
                
                // Create script element
                const existingScript = document.querySelector(`script[src="${module.path}"]`);
                if (existingScript) {
                    console.log('[init-v2] ✅ Injector script already loaded');
                    index++;
                    loadNext();
                    return;
                }
                
                const script = document.createElement('script');
                script.id = 'ph-product-injector'; // Set ID so injector can find itself
                script.src = module.path;
                
                // Set all attributes BEFORE appending to DOM
                setupAttributesOnScript(script, config);
                
                script.onload = () => {
                    console.log(`[init-v2] ✅ Module loaded: ${module.name}`);
                    index++;
                    loadNext();
                };
                script.onerror = () => {
                    console.error(`[init-v2] ❌ Failed to load module: ${module.name} from ${module.path}`);
                    index++;
                    loadNext();
                };
                
                document.head.appendChild(script);
            } else {
                loadScript(module.path,
                    () => {
                        console.log(`[init-v2] ✅ Module loaded: ${module.name}`);
                        index++;
                        loadNext();
                    },
                    () => {
                        console.error(`[init-v2] ❌ Failed to load module: ${module.name} from ${module.path}`);
                        index++;
                        loadNext(); // Continue loading other modules
                    }
                );
            }
        }
        
        loadNext();
    }

    // Setup product injector with attributes
    function setupAttributesOnScript(script, config) {
        // Verify constants loaded
        if (!window.PH_DATA_KEYS || !window.PH_KEYS || !window.PH_PRODUCT_DOM || !window.PH_PROPS) {
            console.error('[init-v2] ❌ PostHog constants not loaded. Product tracking disabled.');
            return;
        }

        if (!script) {
            console.error('[init-v2] ❌ Script element not provided');
            return;
        }

        // Set attributes using constants (only if productConfig exists)
        if (config.productConfig) {
            script.setAttribute(window.PH_DATA_KEYS.EVENT_NAME, config.productConfig.eventName || 'product_click');
            script.setAttribute(window.PH_DATA_KEYS.PAGE_MATCH, config.productConfig.pageMatch || '');
            
            // Panel/container selectors
            script.setAttribute(window.PH_DATA_KEYS.PANEL_CLASS, config.productConfig.panelClass || '');
            if (config.productConfig.panelSelector) script.setAttribute('data-panel-selector', config.productConfig.panelSelector);
            if (config.productConfig.panelAttr) script.setAttribute('data-panel-attr', config.productConfig.panelAttr);
            if (config.productConfig.panelId) script.setAttribute('data-panel-id', config.productConfig.panelId);
            if (config.productConfig.panelXPath) script.setAttribute('data-panel-xpath', config.productConfig.panelXPath);
            
            // Title selectors
            script.setAttribute(window.PH_DATA_KEYS.TITLE_CLASS, config.productConfig.titleClass || '');
            script.setAttribute(window.PH_DATA_KEYS.TITLE_ATTR, config.productConfig.titleAttr || '');
            if (config.productConfig.titleSelector) script.setAttribute('data-title-selector', config.productConfig.titleSelector);
            if (config.productConfig.titleId) script.setAttribute('data-title-id', config.productConfig.titleId);
            if (config.productConfig.titleXPath) script.setAttribute('data-title-xpath', config.productConfig.titleXPath);
            
            // Price selectors
            script.setAttribute(window.PH_DATA_KEYS.PRICE_CLASS, config.productConfig.priceClass || '');
            script.setAttribute(window.PH_DATA_KEYS.PRICE_ATTR, config.productConfig.priceAttr || '');
            if (config.productConfig.priceSelector) script.setAttribute('data-price-selector', config.productConfig.priceSelector);
            if (config.productConfig.priceId) script.setAttribute('data-price-id', config.productConfig.priceId);
            if (config.productConfig.priceXPath) script.setAttribute('data-price-xpath', config.productConfig.priceXPath);
            
            // Currency selectors
            script.setAttribute(window.PH_DATA_KEYS.CURRENCY_CLASS, config.productConfig.currencyClass || '');
            if (config.productConfig.currencySelector) script.setAttribute('data-currency-selector', config.productConfig.currencySelector);
            if (config.productConfig.currencyAttr) script.setAttribute('data-currency-attr', config.productConfig.currencyAttr);
            if (config.productConfig.currencyId) script.setAttribute('data-currency-id', config.productConfig.currencyId);
            if (config.productConfig.currencyXPath) script.setAttribute('data-currency-xpath', config.productConfig.currencyXPath);
            
            // Quantity selectors
            if (config.productConfig.quantityClass) {
                script.setAttribute(window.PH_DATA_KEYS.QUANTITY_CLASS, config.productConfig.quantityClass);
            }
            if (config.productConfig.quantityAttr) {
                script.setAttribute(window.PH_DATA_KEYS.QUANTITY_ATTR, config.productConfig.quantityAttr);
            }
            if (config.productConfig.quantitySelector) script.setAttribute('data-quantity-selector', config.productConfig.quantitySelector);
            if (config.productConfig.quantityId) script.setAttribute('data-quantity-id', config.productConfig.quantityId);
            if (config.productConfig.quantityXPath) script.setAttribute('data-quantity-xpath', config.productConfig.quantityXPath);
            
            // Product button selectors
            if (config.productConfig.productButtonSelectors) {
                script.setAttribute(window.PH_DATA_KEYS.PRODUCT_BUTTON_SELECTORS, config.productConfig.productButtonSelectors);
            }
            
            // Checkbox mode
            if (config.productConfig.checkboxMode) {
                script.setAttribute('data-checkbox-products', 'true');
                if (config.productConfig.checkboxItemSelector) {
                    script.setAttribute('data-checkbox-item-selector', config.productConfig.checkboxItemSelector);
                }
            }
        }

        // Convert step keys to actual enum values
        if (config.steps && Array.isArray(config.steps) && config.steps.length > 0) {
            console.log('[init-v2] 🔍 Config has', config.steps.length, 'steps');
            const resolvedSteps = config.steps.map(step => ({
                ...step,
                key: window.PH_KEYS[step.key] || step.key
            }));
            console.log('[init-v2] 🔍 Resolved to', resolvedSteps.length, 'steps');
            script.setAttribute(window.PH_DATA_KEYS.STEPS, JSON.stringify(resolvedSteps));
        } else {
            script.setAttribute(window.PH_DATA_KEYS.STEPS, JSON.stringify([]));
        }

        console.log('[init-v2] ✅ Product injector attributes configured');
    }

    /* =========================================
     * Main Initialization Function
     * ========================================= */
    async function initialize() {
        if (window.__askme_analytics_initialized) {
            console.log('[init-v2] ⚠️ Analytics already initialized');
            return;
        }
        window.__askme_analytics_initialized = true;
        
        console.log('[init-v2] 🚀 Initializing AskMe Analytics v2.0 (Modular)');
        
        // Step 0: Load configuration
        window.AskMeAnalyticsConfig = await loadClientConfig();
        
        // Step 1: Load main analytics library
        if (!window.GenericAnalytics) {
            loadScript(window.AskMeAnalyticsConfig.analyticsLibraryPath, 
                function() {
                    initAnalytics();
                },
                function() {
                    console.error('[init-v2] ❌ Failed to load analytics library');
                }
            );
        } else {
            initAnalytics();
        }
        
        // Step 2: Load modules sequentially
        const config = window.AskMeAnalyticsConfig;
        const MODULE_PATHS = getModulePaths(config);
        const modules = [
            { name: 'Constants', path: MODULE_PATHS.constants },
            { name: 'Utils', path: MODULE_PATHS.utils },
            { name: 'Identity', path: MODULE_PATHS.identity },
            { name: 'EventCapture', path: MODULE_PATHS.eventCapture },
            { name: 'Extractors', path: MODULE_PATHS.extractors },
            { name: 'CartExtractor', path: MODULE_PATHS.cartExtractor, optional: !config.cartExtractorConfig },
            { name: 'Observers', path: MODULE_PATHS.observers },
            { name: 'StepTracker', path: MODULE_PATHS.stepTracker },
            { name: 'Injector', path: MODULE_PATHS.injector }
        ];
        
        loadModulesSequentially(modules, function() {
            console.log('[init-v2] 🎉 AskMe Analytics v2.0 initialization complete');
        });
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Expose public API
    window.AskMeAnalytics = {
        init: initialize,
        getConfig: function() { return window.AskMeAnalyticsConfig; },
        updateConfig: function(newConfig) {
            window.AskMeAnalyticsConfig = Object.assign(window.AskMeAnalyticsConfig, newConfig);
        },
        version: '2.0.0'
    };

    console.log('[init-v2] 📦 AskMe Analytics v2.0 loader ready');
})();
