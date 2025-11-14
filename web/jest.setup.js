// Add custom jest matchers from jest-dom
require('@testing-library/jest-dom');

// Load constants setup
require('./lib/clientAnalytics/__tests__/test-setup.js');

// Mock PostHog
global.posthog = {
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  group: jest.fn(),
  alias: jest.fn(),
  get_distinct_id: jest.fn(() => 'test-distinct-id'),
};

// Mock window.posthog
global.window.posthog = global.posthog;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
