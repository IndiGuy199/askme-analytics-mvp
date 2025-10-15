<script src="./ask-me-analytics.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
       // Wait for analytics library to load
       function initAnalytics() {
          if (window.GenericAnalytics) {
             const getPageType = () => {
                const path = window.location.pathname.toLowerCase();
                if (path === '/' || path === '') return 'home';
                if (path.includes('/login') || path.includes('/signin')) return 'auth';
                if (path.includes('/signup') || path.includes('/register')) return 'registration';
                if (path.includes('/dashboard')) return 'dashboard';
                if (path.includes('/profile') || path.includes('/settings')) return 'profile';
                if (path.includes('/chat') || path.includes('/conversation')) return 'chat';
                // Add your Spring Boot specific routes
                return 'other';
             };

             window.GenericAnalytics.init({
                apiKey: 'phc_MN5MXCec7lNZtZakqpRQZqTLaPfcV6CxeE8hfbTUFE2',
                apiHost: 'https://us.i.posthog.com',
                clientId: 'ask-me-ltp', // Change this
                debug: true,

                // Autocapture-first mode
                autocapture: true,
                useBuiltInPageview: true,
                capture_pageview: true,
                capture_pageleave: true,
                enableCustomDomTracking: false,
                preferCustomOverAutocapture: false,

                getPageType: getPageType,
                workflows: []
             });

             console.log('✅ Analytics initialized for Spring Boot app');
          } else {
             // Retry if library hasn't loaded yet
             setTimeout(initAnalytics, 100);
          }
       }

       initAnalytics();
    });
</script>


<script src="/resources/js/common/ph-constants.js"></script>

<script>
    window.addEventListener('load', function () {
       var s = document.createElement('script');
       s.id = 'ph-product-injector';
       s.src = '/resources/js/common/ph-product-injector.js';

       // Use enum constants for all attributes
       s.setAttribute(PH_DATA_KEYS.EVENT_NAME, 'renew_click');
       s.setAttribute(PH_DATA_KEYS.PAGE_MATCH, '/app/renew');
       s.setAttribute(PH_DATA_KEYS.PANEL_CLASS, 'price');
       s.setAttribute(PH_DATA_KEYS.TITLE_CLASS, 'panel-heading');
       s.setAttribute(PH_DATA_KEYS.PRICE_CLASS, 'memberVal');
       s.setAttribute(PH_DATA_KEYS.CURRENCY_CLASS, 'memTop');

       // Steps (enum keys)
       s.setAttribute(PH_DATA_KEYS.STEPS, JSON.stringify([
          {"key":PH_KEYS.RENEWAL_STARTED,"url":"/app/membership","urlMatch":"contains","selector":"form input[type=submit]"},
          {"key":PH_KEYS.PRODUCT_SELECTED,"url":"/app/renew/index","urlMatch":"contains","selector":"form input[type=submit]"},
          {"key":PH_KEYS.CHECKOUT_VIEWED,"url":"/app/renew/submitRenewal","urlMatch":"contains"},
          {"key":PH_KEYS.CHECKOUT_SUBMITTED,"url":"/app/renew/submitRenewal","urlMatch":"contains","selector":"input[type=submit]"},
          {"key":PH_KEYS.CHECKOUT_ERROR,"url":"/app/renew/pay","urlMatch":"contains","selector":"input[type=submit]","requireSelectorPresent":true},
          {"key":PH_KEYS.RENEWAL_COMPLETED,"url":"/app/renew/pay","urlMatch":"contains","selector":".receipt","requireSelectorPresent":true },
          {"key":PH_KEYS.ONBOARDING_STARTED,"url":"/app/profile/createProfile","urlMatch":"contains","selector":"#membershipProfile","autoFire":true},
          {"key":PH_KEYS.ONBOARDING_STEP1_COMPLETED,"url":"/app/profile/createProfile","urlMatch":"contains","selector":"#membershipProfile input[type=submit]"},
          {"key":PH_KEYS.ONBOARDING_STEP2_COMPLETED,"url":"/app/profile/createProfile","urlMatch":"contains","selector":"#contactForm input[type=button]#pwsubmit"},
          {"key":PH_KEYS.ONBOARDING_STEP3_COMPLETED,"url":"/app/profile/createSecurityQuestions","urlMatch":"contains","selector":"#createProfileStep3Form input[type=submit]"},
          {"key":PH_KEYS.CONSENT_PROVIDED,"url":"/app/membership/consent","urlMatch":"contains","selector":"#consent-form input[type=button]"},
          {"key":PH_KEYS.SIGNUP_COMPLETED,"url":"/auth/dashboard","urlMatch":"contains"},


       ]));

       document.head.appendChild(s);
    }, { once: true });
</script>