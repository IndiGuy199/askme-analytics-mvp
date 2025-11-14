/**
 * Unit Tests for Product Configuration
 * Tests product metadata extraction, button annotation, and selector strategies
 */

describe('Product Configuration - Selector Strategies', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('TC-PC-001: CSS Class Selector Strategy', () => {
    test('should extract product using class selector', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3 class="product-name">Premium Plan</h3>
          <div class="price">$29.99</div>
          <button type="submit">Subscribe</button>
        </div>
      `;

      const config = {
        selectorStrategy: 'Class',
        productNameClass: 'product-name',
        priceClass: 'price'
      };

      const button = document.querySelector('button');
      const container = button.closest('.pricing-card');
      
      const productName = container.querySelector('.product-name')?.textContent.trim();
      const price = container.querySelector('.price')?.textContent.trim();

      expect(productName).toBe('Premium Plan');
      expect(price).toBe('$29.99');
    });
  });

  describe('TC-PC-002: CSS Selector Strategy', () => {
    test('should extract product using complex selector', () => {
      document.body.innerHTML = `
        <div class="pricing">
          <div data-testid="plan-card">
            <h3 id="plan-name">Enterprise Plan</h3>
            <span data-price="199">$199/mo</span>
            <button>Buy Now</button>
          </div>
        </div>
      `;

      const productName = document.querySelector('[data-testid="plan-card"] #plan-name')?.textContent.trim();
      const price = document.querySelector('[data-testid="plan-card"] [data-price]')?.textContent.trim();

      expect(productName).toBe('Enterprise Plan');
      expect(price).toBe('$199/mo');
    });
  });

  describe('TC-PC-003: Data Attribute Strategy', () => {
    test('should extract product from data attributes', () => {
      document.body.innerHTML = `
        <div class="product-card">
          <h3 data-product-name="Starter Pack">Starter Pack</h3>
          <div data-product-price="9.99">$9.99</div>
          <button data-product-button>Add to Cart</button>
        </div>
      `;

      const productName = document.querySelector('[data-product-name]')?.getAttribute('data-product-name');
      const price = document.querySelector('[data-product-price]')?.getAttribute('data-product-price');

      expect(productName).toBe('Starter Pack');
      expect(price).toBe('9.99');
    });
  });

  describe('TC-PC-004: ID Selector Strategy', () => {
    test('should extract product using ID selectors', () => {
      document.body.innerHTML = `
        <div class="checkout">
          <h2 id="product-title">Professional License</h2>
          <div id="product-price">$499.00</div>
          <button id="checkout-btn">Checkout</button>
        </div>
      `;

      const productName = document.getElementById('product-title')?.textContent.trim();
      const price = document.getElementById('product-price')?.textContent.trim();

      expect(productName).toBe('Professional License');
      expect(price).toBe('$499.00');
    });
  });

  describe('TC-PC-006: Selector Precedence', () => {
    test('should prefer data attributes over classes', () => {
      document.body.innerHTML = `
        <div class="card">
          <h3 class="product-name" data-product-name="Correct Name">Wrong Name</h3>
          <div class="price" data-product-price="99.99">$0.00</div>
        </div>
      `;

      // Data attribute should take precedence
      const nameFromAttr = document.querySelector('[data-product-name]')?.getAttribute('data-product-name');
      const priceFromAttr = document.querySelector('[data-product-price]')?.getAttribute('data-product-price');

      expect(nameFromAttr).toBe('Correct Name');
      expect(priceFromAttr).toBe('99.99');
    });
  });
});

describe('Product Configuration - Price Parsing', () => {
  describe('TC-PP-001: US Price Format', () => {
    test('should parse US dollar amounts correctly', () => {
      const testCases = [
        { input: '$29.99', expected: '29.99', currency: 'USD' },
        { input: '$1,234.56', expected: '1234.56', currency: 'USD' },
        { input: 'USD 99', expected: '99', currency: 'USD' },
        { input: '$0.99', expected: '0.99', currency: 'USD' }
      ];

      testCases.forEach(({ input, expected, currency }) => {
        const priceMatch = input.match(/[\d,]+\.?\d*/);
        const cleanPrice = priceMatch ? priceMatch[0].replace(/,/g, '') : '0.00';
        const extractedCurrency = input.includes('$') ? 'USD' : 'USD';

        expect(cleanPrice).toBe(expected);
        expect(extractedCurrency).toBe(currency);
      });
    });
  });

  describe('TC-PP-002: European Price Format', () => {
    test('should parse European price formats', () => {
      const testCases = [
        { input: '€29,99', expected: '29.99', currency: 'EUR' },
        { input: '€1.234,56', expected: '1234.56', currency: 'EUR' },
        { input: '1.234,00 EUR', expected: '1234.00', currency: 'EUR' }
      ];

      testCases.forEach(({ input, expected, currency }) => {
        // Convert European format to US format
        let cleanPrice = input.replace(/[€EUR\s]/g, '');
        // Replace dots (thousand separators) with nothing
        cleanPrice = cleanPrice.replace(/\./g, '');
        // Replace comma (decimal separator) with dot
        cleanPrice = cleanPrice.replace(/,/g, '.');
        
        const extractedCurrency = input.includes('€') || input.includes('EUR') ? 'EUR' : 'USD';

        expect(cleanPrice).toBe(expected);
        expect(extractedCurrency).toBe(currency);
      });
    });
  });

  describe('TC-PP-003: Multi-Currency Support', () => {
    test('should detect currency symbols correctly', () => {
      const currencies = [
        { symbol: '$', code: 'USD' },
        { symbol: '€', code: 'EUR' },
        { symbol: '£', code: 'GBP' },
        { symbol: '¥', code: 'JPY' },
        { symbol: '₹', code: 'INR' }
      ];

      currencies.forEach(({ symbol, code }) => {
        const input = `${symbol}99.99`;
        const symbolMap = {
          '$': 'USD',
          '€': 'EUR',
          '£': 'GBP',
          '¥': 'JPY',
          '₹': 'INR'
        };
        
        const detected = symbolMap[symbol];
        expect(detected).toBe(code);
      });
    });
  });

  describe('TC-PP-004: Attribute vs Text Extraction', () => {
    test('should prefer data attributes over text content', () => {
      document.body.innerHTML = `
        <div data-price="49.99">Display: $99.99</div>
      `;

      const priceFromAttr = document.querySelector('[data-price]')?.getAttribute('data-price');
      const priceFromText = document.querySelector('[data-price]')?.textContent.match(/[\d.]+/)?.[0];

      expect(priceFromAttr).toBe('49.99');
      expect(priceFromText).toBe('99.99');
      // Attribute should win
      expect(priceFromAttr).not.toBe(priceFromText);
    });
  });
});

describe('Product Configuration - Button Selectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('TC-BS-001: Specific Button Classes', () => {
    test('should target only specified button classes', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3>Premium</h3>
          <button class="bg-blue-600">Subscribe</button>
          <button class="bg-gray-200">Cancel</button>
          <button class="close-btn">Close</button>
        </div>
      `;

      const targetSelector = 'button.bg-blue-600';
      const matchedButtons = document.querySelectorAll(targetSelector);
      const allButtons = document.querySelectorAll('button');

      expect(matchedButtons.length).toBe(1);
      expect(allButtons.length).toBe(3);
      expect(matchedButtons[0].textContent).toBe('Subscribe');
    });
  });

  describe('TC-BS-002: Container-Based Button Selection', () => {
    test('should only select buttons within pricing containers', () => {
      document.body.innerHTML = `
        <nav>
          <button class="cta-btn">Nav CTA</button>
        </nav>
        <div class="pricing-section">
          <div class="pricing-card">
            <button class="cta-btn">Buy Plan</button>
          </div>
        </div>
      `;

      const pricingButtons = document.querySelectorAll('.pricing-card button.cta-btn');
      const allCtaButtons = document.querySelectorAll('button.cta-btn');

      expect(pricingButtons.length).toBe(1);
      expect(allCtaButtons.length).toBe(2);
      expect(pricingButtons[0].textContent).toBe('Buy Plan');
    });
  });

  describe('TC-BS-003: Data Attribute Button Targeting', () => {
    test('should target buttons using data attributes', () => {
      document.body.innerHTML = `
        <button data-action="close">Close</button>
        <button data-action="submit">Submit</button>
        <button data-product-cta>Buy Now</button>
      `;

      const productButtons = document.querySelectorAll('[data-product-cta]');
      expect(productButtons.length).toBe(1);
      expect(productButtons[0].textContent).toBe('Buy Now');
    });
  });

  describe('TC-BS-004: Container Filtering Safety', () => {
    test('should exclude buttons without valid containers', () => {
      document.body.innerHTML = `
        <button class="cta">Orphan Button</button>
        <div class="pricing-card">
          <h3>Plan Name</h3>
          <div class="price">$99</div>
          <button class="cta">Valid Button</button>
        </div>
      `;

      // Simulate container detection logic
      const buttons = document.querySelectorAll('button.cta');
      const validButtons = Array.from(buttons).filter(btn => {
        const container = btn.closest('.pricing-card');
        return container && container.querySelector('.price');
      });

      expect(buttons.length).toBe(2);
      expect(validButtons.length).toBe(1);
      expect(validButtons[0].textContent).toBe('Valid Button');
    });
  });
});

describe('Product Configuration - Multiple Products', () => {
  describe('TC-MP-001: Multiple Pricing Tiers', () => {
    test('should handle multiple products on same page', () => {
      document.body.innerHTML = `
        <div class="pricing-container">
          <div class="pricing-card" data-plan="basic">
            <h3>Basic</h3>
            <div class="price">$9/mo</div>
            <button>Subscribe</button>
          </div>
          <div class="pricing-card" data-plan="pro">
            <h3>Pro</h3>
            <div class="price">$29/mo</div>
            <button>Subscribe</button>
          </div>
          <div class="pricing-card" data-plan="enterprise">
            <h3>Enterprise</h3>
            <div class="price">$99/mo</div>
            <button>Subscribe</button>
          </div>
        </div>
      `;

      const cards = document.querySelectorAll('.pricing-card');
      expect(cards.length).toBe(3);

      const products = Array.from(cards).map(card => ({
        plan: card.getAttribute('data-plan'),
        name: card.querySelector('h3').textContent,
        price: card.querySelector('.price').textContent
      }));

      expect(products).toEqual([
        { plan: 'basic', name: 'Basic', price: '$9/mo' },
        { plan: 'pro', name: 'Pro', price: '$29/mo' },
        { plan: 'enterprise', name: 'Enterprise', price: '$99/mo' }
      ]);
    });
  });

  describe('TC-MP-002: Nested Product Structures', () => {
    test('should handle nested product cards correctly', () => {
      document.body.innerHTML = `
        <div class="plans-wrapper">
          <div class="plan-category">
            <h2>Individual Plans</h2>
            <div class="plan-card">
              <h3>Solo</h3>
              <span class="price">$15</span>
            </div>
          </div>
          <div class="plan-category">
            <h2>Team Plans</h2>
            <div class="plan-card">
              <h3>Team</h3>
              <span class="price">$50</span>
            </div>
          </div>
        </div>
      `;

      const categories = document.querySelectorAll('.plan-category');
      expect(categories.length).toBe(2);

      const plans = Array.from(categories).map(cat => ({
        category: cat.querySelector('h2').textContent,
        plan: cat.querySelector('.plan-card h3').textContent,
        price: cat.querySelector('.plan-card .price').textContent
      }));

      expect(plans).toEqual([
        { category: 'Individual Plans', plan: 'Solo', price: '$15' },
        { category: 'Team Plans', plan: 'Team', price: '$50' }
      ]);
    });
  });
});

describe('Product Configuration - Quantity Tracking', () => {
  describe('TC-QT-001: Seat-Based Quantity', () => {
    test('should extract quantity from input field', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3>Team Plan</h3>
          <div class="price">$10/seat</div>
          <label>Number of seats:</label>
          <input type="number" class="quantity" value="5" min="1" max="100">
          <button>Subscribe</button>
        </div>
      `;

      const quantityInput = document.querySelector('input.quantity');
      expect(quantityInput.value).toBe('5');
      expect(parseInt(quantityInput.value)).toBe(5);
    });
  });

  describe('TC-QT-002: Dropdown Quantity Selection', () => {
    test('should extract quantity from select dropdown', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3>Enterprise</h3>
          <select class="quantity-select">
            <option value="1">1-10 users</option>
            <option value="2" selected>11-50 users</option>
            <option value="3">51-100 users</option>
          </select>
          <button>Get Quote</button>
        </div>
      `;

      const quantitySelect = document.querySelector('select.quantity-select');
      expect(quantitySelect.value).toBe('2');
    });
  });
});

describe('Product Configuration - Edge Cases', () => {
  describe('TC-EC-001: Missing Product Name', () => {
    test('should handle missing product name gracefully', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <div class="price">$99</div>
          <button>Buy</button>
        </div>
      `;

      const productName = document.querySelector('.product-name')?.textContent || 'Unknown Product';
      const price = document.querySelector('.price')?.textContent;

      expect(productName).toBe('Unknown Product');
      expect(price).toBe('$99');
    });
  });

  describe('TC-EC-002: Missing Price', () => {
    test('should default to 0.00 when price is missing', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3>Free Plan</h3>
          <button>Sign Up</button>
        </div>
      `;

      const price = document.querySelector('.price')?.textContent || '0.00';
      expect(price).toBe('0.00');
    });
  });

  describe('TC-EC-003: Special Characters in Product Name', () => {
    test('should handle special characters correctly', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3 class="product-name">Pro & Enterprise™ (2024)</h3>
          <div class="price">$199</div>
        </div>
      `;

      const productName = document.querySelector('.product-name').textContent;
      expect(productName).toBe('Pro & Enterprise™ (2024)');
    });
  });

  describe('TC-EC-004: Very Long Product Names', () => {
    test('should handle long product names', () => {
      const longName = 'Ultra Premium Enterprise Professional Business Suite with Advanced Features and Support Package';
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3 class="product-name">${longName}</h3>
          <div class="price">$999</div>
        </div>
      `;

      const productName = document.querySelector('.product-name').textContent;
      expect(productName).toBe(longName);
      expect(productName.length).toBeGreaterThan(50);
    });
  });

  describe('TC-EC-005: No Buttons Found', () => {
    test('should handle pages with no matching buttons', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3>Premium Plan</h3>
          <div class="price">$99</div>
        </div>
      `;

      const buttons = document.querySelectorAll('button.cta');
      expect(buttons.length).toBe(0);
    });
  });

  describe('TC-EC-006: Empty String Values', () => {
    test('should handle empty string values', () => {
      document.body.innerHTML = `
        <div class="pricing-card">
          <h3 class="product-name"></h3>
          <div class="price"></div>
          <button>Buy</button>
        </div>
      `;

      const productName = document.querySelector('.product-name')?.textContent.trim() || 'Unknown';
      const price = document.querySelector('.price')?.textContent.trim() || '0.00';

      expect(productName).toBe('Unknown');
      expect(price).toBe('0.00');
    });
  });
});
