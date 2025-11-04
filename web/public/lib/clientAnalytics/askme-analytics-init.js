/**
 * AskMe Analytics Initialization Script
 * Standalone JavaScript file for client-side analytics setup
 * No server-side processing required
 */

(function() {
    'use strict';

    // Configuration object that clients can override
    window.AskMeAnalyticsConfig = window.AskMeAnalyticsConfig || {
        // Core PostHog settings
        apiKey: 'phc_MN5MXCec7lNZtZakqpRQZqTLaPfcV6CxeE8hfbTUFE2',
        apiHost: 'https://us.i.posthog.com',
        clientId: 'askme-ai-app', // Default client ID
        debug: false, // Set to true for development
        
        // Analytics library settings
        autocapture: true,
        useBuiltInPageview: true,
        capture_pageview: true,
        capture_pageleave: true,
        enableCustomDomTracking: false,
        preferCustomOverAutocapture: false,
        
        // User identification settings
        emailSelectors: 'input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[id*="email" i]',
        
        // Path to analytics library (clients can override)
        analyticsLibraryPath: 'https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/ask-me-analytics.min.js',
        
        // Path to constants file
        constantsPath: 'https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/ph-constants.js',
        
        // Path to product injector
        injectorPath: 'https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/ph-product-injector.js',
        
        // Product tracking configuration (CLIENT-SPECIFIC - configure this in your site)
        // productConfig: {
        //     eventName: 'renew_click',
        //     pageMatch: '/app/renew',
        //     panelClass: 'price',
        //     titleClass: 'panel-heading',
        //     priceClass: 'memberVal',
        //     currencyClass: 'memTop',
        //     quantityClass: 'quantity, qty, seats', // 🆕 NEW: Classes for quantity inputs/displays
        //     quantityAttr: 'data-quantity' // 🆕 NEW: Attribute for quantity value
        // },
        
        // Step definitions for funnel tracking (CLIENT-SPECIFIC - configure this in your site)
        // steps: [
        //     {"key":"RENEWAL_STARTED","url":"/app/membership","urlMatch":"contains","selector":"form input[type=submit]"},
        //     {"key":"PRODUCT_SELECTED","url":"/app/renew/index","urlMatch":"contains","selector":"form input[type=submit]"},
        //     {"key":"CHECKOUT_VIEWED","url":"/app/renew/submitRenewal","urlMatch":"contains"},
        //     {"key":"CHECKOUT_SUBMITTED","url":"/app/renew/submitRenewal","urlMatch":"contains","selector":"input[type=submit]"},
        //     {"key":"CHECKOUT_ERROR","url":"/app/renew/pay","urlMatch":"contains","selector":"input[type=submit]","requireSelectorPresent":true},
        //     {"key":"CHECKOUT_COMPLETED","url":"/app/renew/pay","urlMatch":"contains","selector":".receipt","requireSelectorPresent":true}, // 🆕 Revenue event
        //     {"key":"RENEWAL_COMPLETED","url":"/app/renew/pay","urlMatch":"contains","selector":".receipt","requireSelectorPresent":true},
        //     {"key":"ONBOARDING_STARTED","url":"/app/profile/createProfile","urlMatch":"contains","selector":"#membershipProfile","autoFire":true},
        //     {"key":"ONBOARDING_STEP1_COMPLETED","url":"/app/profile/createProfile","urlMatch":"contains","selector":"#membershipProfile input[type=submit]"},
        //     {"key":"ONBOARDING_STEP2_COMPLETED","url":"/app/profile/createProfile","urlMatch":"contains","selector":"#contactForm input[type=button]#pwsubmit"},
        //     {"key":"ONBOARDING_STEP3_COMPLETED","url":"/app/profile/createSecurityQuestions","urlMatch":"contains","selector":"#createProfileStep3Form input[type=submit]"},
        //     {"key":"CONSENT_PROVIDED","url":"/app/membership/consent","urlMatch":"contains","selector":"#consent-form input[type=button]"},
        //     {"key":"SIGNUP_COMPLETED","url":"/auth/dashboard","urlMatch":"contains"}
        // ]
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

    // Load script helper
    function loadScript(src, onLoad, onError) {
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
        
        if (window.GenericAnalytics) {
            try {
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
                
                console.log('✅ AskMe Analytics initialized successfully');
                
                // Trigger custom event for successful initialization
                window.dispatchEvent(new CustomEvent('askme:analytics:ready', {
                    detail: { clientId: config.clientId }
                }));
                
            } catch (error) {
                console.error('❌ Failed to initialize AskMe Analytics:', error);
            }
        } else {
            // Retry if library hasn't loaded yet
            setTimeout(initAnalytics, 100);
        }
    }

    // Setup product injector
    function setupProductInjector() {
        const config = window.AskMeAnalyticsConfig;
        
        // Wait for constants to be loaded
        if (!window.PH_DATA_KEYS || !window.PH_KEYS) {
            console.warn('⚠️ PostHog constants not loaded, retrying...');
            setTimeout(setupProductInjector, 100);
            return;
        }

        // ✅ Add PostHog group identification
        function setupGroupIdentification() {
            // Wait for PostHog to be ready
            if (window.posthog && typeof window.posthog.groupIdentify === 'function') {
                try {
                    window.posthog.groupIdentify('client', config.clientId, {
                        name: config.clientId,
                        client_type: 'askme_analytics',
                        setup_date: new Date().toISOString(),
                        analytics_version: '2.0.0'
                    });
                    console.log('✅ PostHog group identified for client:', config.clientId);
                } catch (error) {
                    console.warn('⚠️ Failed to identify PostHog group:', error);
                }
            } else {
                // Retry if PostHog isn't ready yet
                setTimeout(setupGroupIdentification, 100);
            }
        }

        // Call group identification
        setupGroupIdentification();

        // ✅ Add user identification functionality
        function setupUserIdentification() {
            // Wait for PostHog to be ready
            if (!window.posthog || typeof window.posthog.identify !== 'function') {
                setTimeout(setupUserIdentification, 100);
                return;
            }

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
            
            console.log('✅ User identification setup complete');
        }
        
        // Setup user identification
        setupUserIdentification();

        const script = document.createElement('script');
        script.id = 'ph-product-injector';
        script.src = config.injectorPath;

        // Set attributes using constants (only if productConfig exists)
        if (config.productConfig) {
            script.setAttribute(window.PH_DATA_KEYS.EVENT_NAME, config.productConfig.eventName || 'product_click');
            script.setAttribute(window.PH_DATA_KEYS.PAGE_MATCH, config.productConfig.pageMatch || '');
            script.setAttribute(window.PH_DATA_KEYS.PANEL_CLASS, config.productConfig.panelClass || '');
            script.setAttribute(window.PH_DATA_KEYS.TITLE_CLASS, config.productConfig.titleClass || '');
            script.setAttribute(window.PH_DATA_KEYS.PRICE_CLASS, config.productConfig.priceClass || '');
            script.setAttribute(window.PH_DATA_KEYS.CURRENCY_CLASS, config.productConfig.currencyClass || '');
            // 🆕 NEW: Quantity tracking configuration
            if (config.productConfig.quantityClass) {
                script.setAttribute(window.PH_DATA_KEYS.QUANTITY_CLASS, config.productConfig.quantityClass);
            }
            if (config.productConfig.quantityAttr) {
                script.setAttribute(window.PH_DATA_KEYS.QUANTITY_ATTR, config.productConfig.quantityAttr);
            }
        }

        // Convert step keys to actual enum values (only if steps exist)
        if (config.steps && Array.isArray(config.steps) && config.steps.length > 0) {
            const resolvedSteps = config.steps.map(step => ({
                ...step,
                key: window.PH_KEYS[step.key] || step.key
            }));
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

    // Main initialization sequence
    function initialize() {
        const config = window.AskMeAnalyticsConfig;
        
        console.log('🚀 Initializing AskMe Analytics...');
        
        // Step 1: Load analytics library
        loadScript(config.analyticsLibraryPath,
            function() {
                console.log('✅ Analytics library loaded');
                initAnalytics();
            },
            function() {
                console.error('❌ Failed to load analytics library from:', config.analyticsLibraryPath);
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