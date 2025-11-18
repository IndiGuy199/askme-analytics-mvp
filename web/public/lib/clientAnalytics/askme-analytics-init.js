/**
 * AskMe Analytics Initialization Script
 * @version 2.1.0
 * @updated 2025-11-14
 * @features
 *   - Dynamic configuration loading from JSON files
 *   - Duplicate prevention guards
 *   - Support for inline config overrides
 *   - Automatic fallback to defaults
 */

(function() {
    'use strict';

    // ✅ Dynamic configuration loading
    async function loadClientConfig() {
        // Load config from JSON file based on clientId
        const clientId = window.AskMeAnalyticsClientId || 'askme-analytics-app';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const configUrl = isLocalhost 
            ? `/lib/clientAnalytics/configs/${clientId}.json`
            : `https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/configs/${clientId}.json`;
        
        console.log('[init] 🔍 Loading config from:', configUrl);
        try {
            const response = await fetch(configUrl);
            if (!response.ok) {
                return getDefaultConfig(clientId);
            }
            
            const config = await response.json();
            return config;
        } catch (error) {
            console.warn('⚠️ Failed to load config, using defaults:', error.message);
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
            emailSelectors: 'input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[id*="email" i]',
            analyticsLibraryPath: '/lib/clientAnalytics/ask-me-analytics.min.js',
            constantsPath: '/lib/clientAnalytics/ph-constants.js',
            injectorPath: '/lib/clientAnalytics/ph-product-injector.js',
            productConfig: null,
            steps: []
        };
    }

    // Temporary placeholder (will be replaced after config loads)
    window.AskMeAnalyticsConfig = window.AskMeAnalyticsConfig || {
        // Core PostHog settings
        apiKey: 'phc_MN5MXCec7lNZtZakqpRQZqTLaPfcV6CxeE8hfbTUFE2',
        apiHost: 'https://us.i.posthog.com',
        clientId: 'askme-analytics-app', // Default client ID
        debug: true, // Set to false in production
        
        // Analytics library settings
        autocapture: true,
        useBuiltInPageview: true,
        capture_pageview: true,
        capture_pageleave: true,
        enableCustomDomTracking: false,
        preferCustomOverAutocapture: false,
        
        // User identification settings
        emailSelectors: 'input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[id*="email" i]',
        
        // Local paths to analytics libraries (served from /public directory)
        analyticsLibraryPath: '/lib/clientAnalytics/ask-me-analytics.min.js',
        
        // Path to constants file
        constantsPath: '/lib/clientAnalytics/ph-constants.js',
        
        // Path to product injector
        injectorPath: '/lib/clientAnalytics/ph-product-injector.js',
        
        // Product tracking configuration (CLIENT-SPECIFIC - configure this in your site)
        // Supports multiple selector strategies for maximum flexibility
        productConfig: {
            eventName: 'subscription_click',
            pageMatch: '/pricing',
            
            // === PANEL/CONTAINER SELECTORS ===
            // Use ONE of these (checked in order of precedence):
            panelSelector: '',  // Full CSS selector (highest priority) - e.g., '.pricing > div[role="article"]'
            panelClass: 'rounded-xl border bg-card text-card-foreground shadow',  // CSS class names
            panelAttr: '',      // data-* attribute name - e.g., 'data-pricing-card'
            panelId: '',        // Element ID - e.g., 'premium-plan-card'
            panelXPath: '',     // XPath expression - e.g., '//div[@class="pricing-card"]'
            
            // === TITLE/PLAN NAME SELECTORS ===
            // Use ONE of these (checked in order of precedence):
            titleSelector: '',  // Full CSS selector - e.g., 'h2.plan-name, [itemprop="name"]'
            titleClass: 'text-2xl',  // CSS class names
            titleAttr: '',      // data-* attribute - e.g., 'data-plan-name'
            titleId: '',        // Element ID - e.g., 'plan-title'
            titleXPath: '',     // XPath expression - e.g., '//h3[contains(@class, "plan-name")]'
            
            // === PRICE SELECTORS ===
            // Use ONE of these (checked in order of precedence):
            priceSelector: '',  // Full CSS selector - e.g., '.price-value, [itemprop="price"]'
            priceClass: 'text-4xl font-bold',  // CSS class names
            priceAttr: '',      // data-* attribute - e.g., 'data-price'
            priceId: '',        // Element ID - e.g., 'plan-price'
            priceXPath: '',     // XPath expression - e.g., '//span[@itemprop="price"]'
            
            // === CURRENCY SELECTORS ===
            // Use ONE of these (optional - defaults to USD if all empty):
            currencySelector: '',  // Full CSS selector - e.g., '[itemprop="priceCurrency"]'
            currencyClass: '',     // CSS class names - e.g., 'currency-symbol'
            currencyAttr: '',      // data-* attribute - e.g., 'data-currency'
            currencyId: '',        // Element ID - e.g., 'currency-code'
            currencyXPath: '',     // XPath expression - e.g., '//span[@class="currency"]'
            
            // === QUANTITY SELECTORS ===
            // Use ONE of these (for multi-seat pricing, optional):
            quantitySelector: '',  // Full CSS selector - e.g., 'input[name="seats"], .team-size'
            quantityClass: '',     // CSS class names - e.g., 'quantity-input, team-size-select'
            quantityAttr: '',      // data-* attribute - e.g., 'data-quantity'
            quantityId: '',        // Element ID - e.g., 'seat-count'
            quantityXPath: '',     // XPath expression - e.g., '//input[@name="quantity"]'
            
            // === PRODUCT BUTTON SELECTORS ===
            // Specify which buttons should be annotated with product data (data-product, data-price, etc.)
            // This prevents accidentally annotating navigation buttons, close buttons, etc.
            // Examples:
            //   - 'button.bg-blue-600, button.bg-gray-900' (specific CSS classes)
            //   - '[data-pricing-button]' (data attributes - BEST PRACTICE)
            //   - '.pricing-card button' (buttons inside pricing containers)
            productButtonSelectors: 'button.bg-blue-600, button.bg-gray-900, button.bg-indigo-600'
        },
        
        // Step definitions for funnel tracking (CLIENT-SPECIFIC - configure this in your site)
        steps: [
            {"key":"INFORMATIONAL_CONTENT_VIEWED","url":"/demo","urlMatch":"contains", "urlMatch": "contains","autoFire": true},
            {"key":"DASHBOARD_VIEWED","url":"/dashboard","urlMatch":"contains","autoFire": true, "oncePerPath": true },
            {"key":"SUBSCRIPTION_CONTENT_VIEWED","url":"/pricing","urlMatch":"contains","autoFire": true, "oncePerPath": true },
            {"key":"SUBSCRIPTION_PRODUCT_SELECTED","url":"/pricing","urlMatch":"contains","autoFire": true, "oncePerPath": true,
              "selector": ".font-semibold .text-blue-900", "requireSelectorPresent": true },
            {"key":"SUBSCRIPTION_COMPLETED","url":"/dashboard","urlMatch":"contains","autoFire": false, "oncePerPath": true, 
             "selector": ".font-semibold .text-blue-900", "requireSelectorPresent": false },
        ]
    };

    // Page type detection function
    function getPageType() {
        const path = window.location.pathname.toLowerCase();
        if (path === '/' || path === '') return 'home';
        if (path.includes('/login') || path.includes('/signin')) return 'auth';
        if (path.includes('/signup') || path.includes('/register')) return 'registration';
        if (path.includes('/dashboard')) return 'dashboard';
        if (path.includes('/profile') || path.includes('/settings')) return 'profile';
        if (path.includes('/chat') || path.includes('/conversation')) return 'chat';
        // Add your app-specific routes
        return 'other';
    }

    // Load script helper with duplicate prevention
    function loadScript(src, onLoad, onError) {
        // ✅ CRITICAL: Check if script is already loaded
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            console.log('✅ Script already loaded:', src);
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
        
        // ✅ CRITICAL: Prevent duplicate initialization
        if (window.__askme_genericanalytics_initialized) {
            console.warn('⚠️ GenericAnalytics already initialized. Skipping duplicate init.');
            return;
        }
        
        if (window.GenericAnalytics) {
            // Check if PostHog is already initialized (might be loaded directly on page)
            if (window.posthog && window.posthog.__loaded) {
                console.log('✅ PostHog already initialized on page, reusing existing instance');
                window.__askme_genericanalytics_initialized = true;
                
                // Trigger ready event
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
                
                // Trigger custom event for successful initialization
                window.dispatchEvent(new CustomEvent('askme:analytics:ready', {
                    detail: { clientId: config.clientId }
                }));
                
            } catch (error) {
                console.error('❌ Failed to initialize AskMe Analytics:', error);
                window.__askme_genericanalytics_initialized = false; // Reset on error
            }
        } else {
            // Retry if library hasn't loaded yet (max 10 retries = 1 second)
            const maxRetries = 10;
            const currentRetry = (window.__askme_init_retry_count || 0) + 1;
            window.__askme_init_retry_count = currentRetry;
            
            if (currentRetry <= maxRetries) {
                setTimeout(initAnalytics, 100);
            } else {
                console.error('❌ GenericAnalytics library failed to load after', maxRetries, 'retries');
            }
        }
    }

    function setupProductInjector() {
        const config = window.AskMeAnalyticsConfig;
        
        // ✅ CRITICAL: Prevent duplicate product injector setup
        if (window.__askme_product_injector_initialized) {
            return;
        }
        window.__askme_product_injector_initialized = true;
        
        // Quick verification that constants loaded
        if (!window.PH_DATA_KEYS || !window.PH_KEYS || !window.PH_PRODUCT_DOM || !window.PH_PROPS) {
            console.error('❌ PostHog constants not loaded. Product tracking disabled.');
            window.__askme_product_injector_initialized = false; // Reset flag on error
            return;
        }

        // ✅ Add PostHog group identification
        function setupGroupIdentification() {
            // ✅ CRITICAL: Prevent duplicate group identification
            if (window.__askme_group_identified) {
                return; // Already identified
            }
            
            // Wait for PostHog to be ready
            if (window.posthog && typeof window.posthog.groupIdentify === 'function') {
                try {
                    window.__askme_group_identified = true;
                    window.posthog.groupIdentify('client', config.clientId, {
                        name: config.clientId,
                        client_type: 'askme_analytics',
                        setup_date: new Date().toISOString(),
                        analytics_version: '2.0.0'
                    });
                    console.log('✅ PostHog group identified for client:', config.clientId);
                } catch (error) {
                    console.warn('⚠️ Failed to identify PostHog group:', error);
                    window.__askme_group_identified = false; // Reset on error
                }
            } else {
                // Retry if PostHog isn't ready yet (max 10 retries)
                const maxRetries = 10;
                const currentRetry = (window.__askme_group_retry_count || 0) + 1;
                window.__askme_group_retry_count = currentRetry;
                
                if (currentRetry <= maxRetries) {
                    setTimeout(setupGroupIdentification, 100);
                } else {
                    console.warn('⚠️ PostHog groupIdentify not available after', maxRetries, 'retries');
                }
                if (currentRetry <= maxRetries) {
                    setTimeout(setupGroupIdentification, 100);
                }
            }
        }

        // Call group identification
        // ⚠️ DISABLED: Group identification causing console spam
        // setupGroupIdentification();

        // ✅ Add user identification functionality
        // ⚠️ DISABLED: Email-based user identification is commented out to prevent errors
        // Uncomment when ready to enable automatic user identification
        /*
        function setupUserIdentification() {
            // ✅ CRITICAL: Prevent duplicate user identification setup
            if (window.__askme_user_identification_initialized) {
                return; // Already setup
            }
            
            // Wait for PostHog to be ready
            if (!window.posthog || typeof window.posthog.identify !== 'function') {
                setTimeout(setupUserIdentification, 100);
                return;
            }
            
            window.__askme_user_identification_initialized = true;

            // Strategy 1: Look for email inputs and identify on blur/submit
            const emailSelectors = config.emailSelectors || 
                'input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[id*="email" i]';
            
            const identifiedEmails = new Set();
            
            function isValidEmail(email) {
                return /\S+@\S+\.\S+/.test(email);
            }
            
            function identifyFromEmail(email, context = {}) {
                if (!email || !isValidEmail(email) || identifiedEmails.has(email)) return;
                identifiedEmails.add(email);
                
                try {
                    window.posthog.identify(email, {
                        email: email,
                        client_id: config.clientId,
                        identified_via: 'askme_analytics',
                        ...context
                    });
                    console.log('✅ User identified:', email);
                } catch (error) {
                    console.warn('⚠️ Failed to identify user:', error);
                }
            }
            
            function bindEmailInput(input) {
                if (input.hasAttribute('data-askme-identify-bound')) return;
                input.setAttribute('data-askme-identify-bound', 'true');
                
                const handleIdentification = () => {
                    const email = (input.value || '').trim();
                    if (email && isValidEmail(email)) {
                        const form = input.closest('form');
                        const context = {};
                        
                        // Get name if available
                        if (form) {
                            const nameInput = form.querySelector('input[name*="name" i], input[placeholder*="name" i]');
                            if (nameInput && nameInput.value) {
                                context.name = nameInput.value.trim();
                            }
                            context.form_context = form.id || form.className || 'unknown';
                        }
                        
                        context.page_url = window.location.href;
                        context.page_title = document.title;
                        
                        identifyFromEmail(email, context);
                    }
                };
                
                // Bind to blur event
                input.addEventListener('blur', handleIdentification);
                
                // Also bind to form submit
                const form = input.closest('form');
                if (form && !form.hasAttribute('data-askme-identify-form-bound')) {
                    form.setAttribute('data-askme-identify-form-bound', 'true');
                    form.addEventListener('submit', handleIdentification);
                }
            }
            
            // Scan for email inputs
            function scanForEmails() {
                try {
                    const inputs = document.querySelectorAll(emailSelectors);
                    inputs.forEach(bindEmailInput);
                } catch (error) {
                    console.warn('⚠️ Error scanning for email inputs:', error);
                }
            }
            
            // Initial scan
            scanForEmails();
            
            // Watch for new email inputs being added to the DOM
            const observer = new MutationObserver(() => {
                scanForEmails();
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            
            // Strategy 2: Check if user is already logged in (look for common patterns)
            function checkExistingUser() {
                // Look for common logged-in user indicators
                const userEmailElements = document.querySelectorAll(
                    '[data-user-email], [data-email], .user-email, .logged-in-email, #user-email'
                );
                
                userEmailElements.forEach(el => {
                    const email = el.getAttribute('data-user-email') || 
                                 el.getAttribute('data-email') || 
                                 el.textContent.trim();
                    if (email && isValidEmail(email)) {
                        identifyFromEmail(email, { source: 'existing_session' });
                    }
                });
            }
            
            // Check for existing logged-in users
            setTimeout(checkExistingUser, 1000);
            
            // Expose identify function globally for manual calls
            window.AskMeAnalytics.identify = identifyFromEmail;
        }
        
        // Setup user identification
        setupUserIdentification();
        */

        const script = document.createElement('script');
        script.id = 'ph-product-injector';
        script.src = config.injectorPath;
        script.defer = true; // Ensure script executes after document is parsed

        // Set attributes using constants (only if productConfig exists)
        if (config.productConfig) {
            script.setAttribute(window.PH_DATA_KEYS.EVENT_NAME, config.productConfig.eventName || 'product_click');
            script.setAttribute(window.PH_DATA_KEYS.PAGE_MATCH, config.productConfig.pageMatch || '');
            
            // === PANEL/CONTAINER SELECTORS ===
            script.setAttribute(window.PH_DATA_KEYS.PANEL_CLASS, config.productConfig.panelClass || '');
            if (config.productConfig.panelSelector) script.setAttribute('data-panel-selector', config.productConfig.panelSelector);
            if (config.productConfig.panelAttr) script.setAttribute('data-panel-attr', config.productConfig.panelAttr);
            if (config.productConfig.panelId) script.setAttribute('data-panel-id', config.productConfig.panelId);
            if (config.productConfig.panelXPath) script.setAttribute('data-panel-xpath', config.productConfig.panelXPath);
            
            // === TITLE/PLAN NAME SELECTORS ===
            script.setAttribute(window.PH_DATA_KEYS.TITLE_CLASS, config.productConfig.titleClass || '');
            script.setAttribute(window.PH_DATA_KEYS.TITLE_ATTR, config.productConfig.titleAttr || '');
            if (config.productConfig.titleSelector) script.setAttribute('data-title-selector', config.productConfig.titleSelector);
            if (config.productConfig.titleId) script.setAttribute('data-title-id', config.productConfig.titleId);
            if (config.productConfig.titleXPath) script.setAttribute('data-title-xpath', config.productConfig.titleXPath);
            
            // === PRICE SELECTORS ===
            script.setAttribute(window.PH_DATA_KEYS.PRICE_CLASS, config.productConfig.priceClass || '');
            script.setAttribute(window.PH_DATA_KEYS.PRICE_ATTR, config.productConfig.priceAttr || '');
            if (config.productConfig.priceSelector) script.setAttribute('data-price-selector', config.productConfig.priceSelector);
            if (config.productConfig.priceId) script.setAttribute('data-price-id', config.productConfig.priceId);
            if (config.productConfig.priceXPath) script.setAttribute('data-price-xpath', config.productConfig.priceXPath);
            
            // === CURRENCY SELECTORS ===
            script.setAttribute(window.PH_DATA_KEYS.CURRENCY_CLASS, config.productConfig.currencyClass || '');
            if (config.productConfig.currencySelector) script.setAttribute('data-currency-selector', config.productConfig.currencySelector);
            if (config.productConfig.currencyAttr) script.setAttribute('data-currency-attr', config.productConfig.currencyAttr);
            if (config.productConfig.currencyId) script.setAttribute('data-currency-id', config.productConfig.currencyId);
            if (config.productConfig.currencyXPath) script.setAttribute('data-currency-xpath', config.productConfig.currencyXPath);
            
            // === QUANTITY SELECTORS ===
            if (config.productConfig.quantityClass) {
                script.setAttribute(window.PH_DATA_KEYS.QUANTITY_CLASS, config.productConfig.quantityClass);
            }
            if (config.productConfig.quantityAttr) {
                script.setAttribute(window.PH_DATA_KEYS.QUANTITY_ATTR, config.productConfig.quantityAttr);
            }
            if (config.productConfig.quantitySelector) script.setAttribute('data-quantity-selector', config.productConfig.quantitySelector);
            if (config.productConfig.quantityId) script.setAttribute('data-quantity-id', config.productConfig.quantityId);
            if (config.productConfig.quantityXPath) script.setAttribute('data-quantity-xpath', config.productConfig.quantityXPath);
            
            // === PRODUCT BUTTON SELECTORS ===
            // 🆕 NEW: Specific buttons to annotate with product data
            if (config.productConfig.productButtonSelectors) {
                script.setAttribute(window.PH_DATA_KEYS.PRODUCT_BUTTON_SELECTORS, config.productConfig.productButtonSelectors);
            }
        }

        // Convert step keys to actual enum values (only if steps exist)
        if (config.steps && Array.isArray(config.steps) && config.steps.length > 0) {
            console.log('[init] 🔍 Config has', config.steps.length, 'steps');
            const resolvedSteps = config.steps.map(step => ({
                ...step,
                key: window.PH_KEYS[step.key] || step.key
            }));
            console.log('[init] 🔍 Resolved to', resolvedSteps.length, 'steps');
            script.setAttribute(window.PH_DATA_KEYS.STEPS, JSON.stringify(resolvedSteps));
        } else {
            script.setAttribute(window.PH_DATA_KEYS.STEPS, JSON.stringify([]));
        }

        document.head.appendChild(script);
        console.log('✅ Product injector script loaded');
    }

    // Load constants first, then setup injector
    function loadConstants() {
        const config = window.AskMeAnalyticsConfig;
        
        loadScript(config.constantsPath, 
            function() {
                console.log('✅ PostHog constants loaded');
                setupProductInjector();
            },
            function() {
                console.error('❌ Failed to load PostHog constants from:', config.constantsPath);
            }
        );
    }

    /* =========================================
     * Main Initialization Function
     * ========================================= */
    async function initialize() {
        // ✅ CRITICAL: Prevent double initialization
        if (window.__askme_analytics_initialized) {
            return;
        }
        window.__askme_analytics_initialized = true;
        
        // Step 0: Load configuration (dynamic or inline)
        window.AskMeAnalyticsConfig = await loadClientConfig();
        
        // ✅ CRITICAL: Check if analytics library is already loaded
        if (window.GenericAnalytics) {
            initAnalytics();
            loadConstants();
            return;
        }
        
        // Step 1: Load main analytics library
        loadScript(window.AskMeAnalyticsConfig.analyticsLibraryPath, 
            function() {
                initAnalytics();
            },
            function() {
                console.error('❌ Failed to load analytics library from:', window.AskMeAnalyticsConfig.analyticsLibraryPath);
            }
        );
        
        // Step 2: Load constants and setup product injector
        loadConstants();
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM already loaded
        initialize();
    }

    // Expose public API for manual control
    window.AskMeAnalytics = {
        init: initialize,
        getConfig: function() { return window.AskMeAnalyticsConfig; },
        updateConfig: function(newConfig) {
            window.AskMeAnalyticsConfig = Object.assign(window.AskMeAnalyticsConfig, newConfig);
        }
    };

})();