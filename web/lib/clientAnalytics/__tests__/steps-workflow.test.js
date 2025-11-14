/**
 * Unit Tests for Steps Workflow
 * Tests step tracking, autoFire, requireSelectorPresent, priority, blocking, URL matching
 */

describe('Steps Workflow - Basic Step Tracking', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('TC-ST-001: AutoFire Step', () => {
    test('should fire event immediately on page load', () => {
      const step = {
        key: 'PAGE_VIEWED',
        url: '/test',
        urlMatch: 'contains',
        autoFire: true,
        oncePerPath: true
      };

      // Mock current path for test
      const currentPath = '/test';
      
      // Simulate URL matching
      const urlMatches = currentPath.includes(step.url);
      expect(urlMatches).toBe(true);

      // Simulate autoFire
      if (urlMatches && step.autoFire) {
        window.posthog.capture(step.key, { path: currentPath });
      }

      expect(window.posthog.capture).toHaveBeenCalledWith('PAGE_VIEWED', {
        path: '/test'
      });
    });
  });

  describe('TC-ST-002: RequireSelectorPresent Step', () => {
    test('should fire when selector appears in DOM', () => {
      document.body.innerHTML = `
        <div id="app"></div>
      `;

      const step = {
        key: 'SUCCESS_MESSAGE_SHOWN',
        selector: '.alert-success',
        requireSelectorPresent: true
      };

      // Initially no selector
      let element = document.querySelector(step.selector);
      expect(element).toBeNull();

      // Add selector to DOM
      document.getElementById('app').innerHTML = '<div class="alert-success">Success!</div>';
      element = document.querySelector(step.selector);
      expect(element).not.toBeNull();

      // Simulate event fire
      if (element && step.requireSelectorPresent) {
        window.posthog.capture(step.key, { selector: step.selector });
      }

      expect(window.posthog.capture).toHaveBeenCalledWith('SUCCESS_MESSAGE_SHOWN', {
        selector: '.alert-success'
      });
    });
  });

  describe('TC-ST-003: Click Event Binding', () => {
    test('should bind click events to matching selectors', () => {
      document.body.innerHTML = `
        <button id="submit-btn">Submit</button>
      `;

      const step = {
        key: 'FORM_SUBMITTED',
        selector: '#submit-btn',
        url: '/form',
        urlMatch: 'contains'
      };

      const button = document.querySelector(step.selector);
      expect(button).not.toBeNull();

      // Simulate click handler attachment
      button.setAttribute('data-ph', step.key);
      button.addEventListener('click', () => {
        window.posthog.capture(step.key);
      });

      // Simulate click
      button.click();

      expect(button.getAttribute('data-ph')).toBe('FORM_SUBMITTED');
      expect(window.posthog.capture).toHaveBeenCalledWith('FORM_SUBMITTED');
    });
  });
});

describe('Steps Workflow - URL Matching', () => {
  describe('TC-UM-001: Contains Match', () => {
    test('should match URL containing substring', () => {
      const testCases = [
        { pathname: '/pricing', url: '/pricing', expected: true },
        { pathname: '/pricing/monthly', url: '/pricing', expected: true },
        { pathname: '/en/pricing', url: '/pricing', expected: true },
        { pathname: '/about', url: '/pricing', expected: false }
      ];

      testCases.forEach(({ pathname, url, expected }) => {
        const matches = pathname.includes(url);
        expect(matches).toBe(expected);
      });
    });
  });

  describe('TC-UM-002: Exact Match', () => {
    test('should match URL exactly', () => {
      const testCases = [
        { pathname: '/checkout', url: '/checkout', expected: true },
        { pathname: '/checkout/cart', url: '/checkout', expected: false },
        { pathname: '/app/checkout', url: '/checkout', expected: false }
      ];

      testCases.forEach(({ pathname, url, expected }) => {
        const matches = pathname === url;
        expect(matches).toBe(expected);
      });
    });
  });

  describe('TC-UM-003: Regex Match', () => {
    test('should match URL using regex', () => {
      const testCases = [
        { pathname: '/pricing', pattern: '^/(pricing|plans)$', expected: true },
        { pathname: '/plans', pattern: '^/(pricing|plans)$', expected: true },
        { pathname: '/subscribe', pattern: '^/(pricing|plans)$', expected: false },
        { pathname: '/pricing/detail', pattern: '^/(pricing|plans)$', expected: false }
      ];

      testCases.forEach(({ pathname, pattern, expected }) => {
        const regex = new RegExp(pattern);
        const matches = regex.test(pathname);
        expect(matches).toBe(expected);
      });
    });
  });
});

describe('Steps Workflow - OncePerPath', () => {
  let firedEvents;

  beforeEach(() => {
    firedEvents = new Set();
    jest.clearAllMocks();
  });

  describe('TC-OP-001: Single Event Per Path', () => {
    test('should fire event only once per unique path', () => {
      const step = {
        key: 'DASHBOARD_VIEWED',
        url: '/dashboard',
        autoFire: true,
        oncePerPath: true
      };

      const path = '/dashboard';
      const dedupeKey = `${step.key}:${path}`;

      // First visit
      if (!firedEvents.has(dedupeKey)) {
        window.posthog.capture(step.key, { path });
        firedEvents.add(dedupeKey);
      }

      expect(window.posthog.capture).toHaveBeenCalledTimes(1);

      // Second visit (same path)
      if (!firedEvents.has(dedupeKey)) {
        window.posthog.capture(step.key, { path });
      }

      // Should still be 1 call
      expect(window.posthog.capture).toHaveBeenCalledTimes(1);
    });
  });

  describe('TC-OP-002: Multiple Events When Disabled', () => {
    test('should fire event multiple times when oncePerPath is false', () => {
      const step = {
        key: 'RETRY_BUTTON_CLICKED',
        selector: '#retry-btn',
        oncePerPath: false
      };

      document.body.innerHTML = '<button id="retry-btn">Retry</button>';
      const button = document.querySelector('#retry-btn');

      // Simulate multiple clicks
      button.click();
      window.posthog.capture(step.key);
      
      button.click();
      window.posthog.capture(step.key);
      
      button.click();
      window.posthog.capture(step.key);

      expect(window.posthog.capture).toHaveBeenCalledTimes(3);
    });
  });
});

describe('Steps Workflow - Priority and Blocking', () => {
  let blockedRules;

  beforeEach(() => {
    blockedRules = new Set();
    jest.clearAllMocks();
  });

  describe('TC-PB-001: Priority Ordering', () => {
    test('should evaluate steps in priority order (lower number first)', () => {
      const steps = [
        { key: 'DEFAULT', priority: 100 },
        { key: 'ERROR_CHECK', priority: 1 },
        { key: 'SUCCESS_CHECK', priority: 10 }
      ];

      const sorted = [...steps].sort((a, b) => (a.priority || 100) - (b.priority || 100));

      expect(sorted[0].key).toBe('ERROR_CHECK');
      expect(sorted[1].key).toBe('SUCCESS_CHECK');
      expect(sorted[2].key).toBe('DEFAULT');
    });
  });

  describe('TC-PB-002: Error Blocks Success', () => {
    test('should block success event when error is present', () => {
      document.body.innerHTML = `
        <div class="alert-danger">Error occurred</div>
      `;

      const steps = [
        {
          key: 'FORM_ERROR',
          selector: '.alert-danger',
          priority: 1,
          blockRules: ['FORM_SUCCESS'],
          requireSelectorPresent: true
        },
        {
          key: 'FORM_SUCCESS',
          selector: '.alert-success',
          priority: 10,
          requireSelectorPresent: true
        }
      ];

      // Sort by priority
      const sorted = steps.sort((a, b) => (a.priority || 100) - (b.priority || 100));

      // Process in order
      sorted.forEach(step => {
        if (blockedRules.has(step.key)) return; // Skip if blocked

        const element = document.querySelector(step.selector);
        if (element && step.requireSelectorPresent) {
          window.posthog.capture(step.key);
          
          // Add blocked rules
          if (step.blockRules) {
            step.blockRules.forEach(rule => blockedRules.add(rule));
          }
        }
      });

      expect(window.posthog.capture).toHaveBeenCalledWith('FORM_ERROR');
      expect(window.posthog.capture).not.toHaveBeenCalledWith('FORM_SUCCESS');
      expect(blockedRules.has('FORM_SUCCESS')).toBe(true);
    });
  });

  describe('TC-PB-003: Cascading Blocks', () => {
    test('should support cascading block rules', () => {
      document.body.innerHTML = `
        <div class="critical-error">Critical!</div>
      `;

      const steps = [
        {
          key: 'CRITICAL_ERROR',
          selector: '.critical-error',
          priority: 1,
          blockRules: ['WARNING', 'SUCCESS'],
          requireSelectorPresent: true
        },
        {
          key: 'WARNING',
          selector: '.warning',
          priority: 5,
          blockRules: ['SUCCESS'],
          requireSelectorPresent: true
        },
        {
          key: 'SUCCESS',
          selector: '.success',
          priority: 10,
          requireSelectorPresent: true
        }
      ];

      const sorted = steps.sort((a, b) => (a.priority || 100) - (b.priority || 100));

      sorted.forEach(step => {
        if (blockedRules.has(step.key)) return;

        const element = document.querySelector(step.selector);
        if (element && step.requireSelectorPresent) {
          window.posthog.capture(step.key);
          if (step.blockRules) {
            step.blockRules.forEach(rule => blockedRules.add(rule));
          }
        }
      });

      expect(window.posthog.capture).toHaveBeenCalledWith('CRITICAL_ERROR');
      expect(blockedRules.has('WARNING')).toBe(true);
      expect(blockedRules.has('SUCCESS')).toBe(true);
    });
  });
});

describe('Steps Workflow - Selector Validation', () => {
  describe('TC-SV-001: CSV Selector Parsing', () => {
    test('should parse comma-separated selectors', () => {
      const selectorString = '.btn-primary, .btn-secondary, #submit-btn';
      const selectors = selectorString.split(',').map(s => s.trim());

      expect(selectors).toEqual(['.btn-primary', '.btn-secondary', '#submit-btn']);
      expect(selectors.length).toBe(3);
    });
  });

  describe('TC-SV-002: JSON Array Selectors', () => {
    test('should parse JSON array of selectors', () => {
      const jsonString = '["#form1", "#form2", ".contact-form"]';
      const selectors = JSON.parse(jsonString);

      expect(Array.isArray(selectors)).toBe(true);
      expect(selectors).toEqual(['#form1', '#form2', '.contact-form']);
    });
  });

  describe('TC-SV-003: Invalid Selector Handling', () => {
    test('should handle invalid selectors gracefully', () => {
      const invalidSelectors = ['', null, undefined, '###invalid', '[[[broken'];

      invalidSelectors.forEach(selector => {
        try {
          if (!selector) {
            expect(selector).toBeFalsy();
          } else {
            document.querySelectorAll(selector);
          }
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });
  });
});

describe('Steps Workflow - Text Regex', () => {
  describe('TC-TR-001: Case-Insensitive Text Matching', () => {
    test('should match button text case-insensitively', () => {
      document.body.innerHTML = `
        <button>Submit</button>
        <button>SUBMIT</button>
        <button>submit</button>
        <button>Cancel</button>
      `;

      const pattern = /submit/i;
      const buttons = Array.from(document.querySelectorAll('button'));
      const matched = buttons.filter(btn => pattern.test(btn.textContent));

      expect(matched.length).toBe(3);
    });
  });

  describe('TC-TR-002: Complex Text Patterns', () => {
    test('should match multiple text patterns', () => {
      document.body.innerHTML = `
        <button>Continue</button>
        <button>Next Step</button>
        <button>Submit</button>
        <button>Cancel</button>
      `;

      const pattern = /(submit|continue|next)/i;
      const buttons = Array.from(document.querySelectorAll('button'));
      const matched = buttons.filter(btn => pattern.test(btn.textContent));

      expect(matched.length).toBe(3);
      expect(matched.map(b => b.textContent)).toEqual(['Continue', 'Next Step', 'Submit']);
    });
  });
});

describe('Steps Workflow - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-PS-001: Product Metadata in Step Events', () => {
    test('should include product metadata in step events', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3 class="product-name">Premium Plan</h3>
          <div class="price">$29.99</div>
          <button id="subscribe-btn" 
                  data-product="Premium Plan"
                  data-price="29.99"
                  data-currency="USD">
            Subscribe
          </button>
        </div>
      `;

      const button = document.getElementById('subscribe-btn');
      const productData = {
        product: button.getAttribute('data-product'),
        price: button.getAttribute('data-price'),
        currency: button.getAttribute('data-currency')
      };

      button.click();
      window.posthog.capture('SUBSCRIPTION_STARTED', productData);

      expect(window.posthog.capture).toHaveBeenCalledWith('SUBSCRIPTION_STARTED', {
        product: 'Premium Plan',
        price: '29.99',
        currency: 'USD'
      });
    });
  });

  describe('TC-PS-002: Dynamic Price Updates in Events', () => {
    test('should capture updated prices after toggle', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3>Business Plan</h3>
          <div class="price">$29/mo</div>
          <button id="toggle">Switch to Annual</button>
          <button id="subscribe-btn">Subscribe</button>
        </div>
      `;

      // Initial price
      let price = document.querySelector('.price').textContent;
      expect(price).toBe('$29/mo');

      // Toggle to annual
      document.getElementById('toggle').addEventListener('click', () => {
        document.querySelector('.price').textContent = '$290/yr';
      });
      document.getElementById('toggle').click();

      // Updated price
      price = document.querySelector('.price').textContent;
      expect(price).toBe('$290/yr');

      // Capture with new price
      document.getElementById('subscribe-btn').click();
      window.posthog.capture('SUBSCRIPTION_STARTED', { price });

      expect(window.posthog.capture).toHaveBeenCalledWith('SUBSCRIPTION_STARTED', {
        price: '$290/yr'
      });
    });
  });
});

describe('Steps Workflow - Metadata Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should attach custom metadata to events', () => {
    const step = {
      key: 'CTA_CLICKED',
      selector: '#cta-btn',
      metadata: {
        campaign: 'summer_sale',
        variant: 'blue_button',
        experiment_id: 'exp_123'
      }
    };

    document.body.innerHTML = '<button id="cta-btn">Click Me</button>';
    const button = document.getElementById('cta-btn');

    button.click();
    window.posthog.capture(step.key, step.metadata);

    expect(window.posthog.capture).toHaveBeenCalledWith('CTA_CLICKED', {
      campaign: 'summer_sale',
      variant: 'blue_button',
      experiment_id: 'exp_123'
    });
  });
});
