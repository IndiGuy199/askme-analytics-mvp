module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/test-setup.js'
  ],
  collectCoverageFrom: [
    'lib/clientAnalytics/**/*.js',
    '!lib/clientAnalytics/**/*.test.js',
    '!lib/clientAnalytics/**/*.md',
    '!lib/clientAnalytics/dist/**',
    '!lib/clientAnalytics/build.js',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/',
    '/build.js'
  ],
  // Note: Coverage thresholds removed for config/constant testing
  // Actual implementation logic is in browser-executed scripts
  // These unit tests validate configuration correctness and logic
};
