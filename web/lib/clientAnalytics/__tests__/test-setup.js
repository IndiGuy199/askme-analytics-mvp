/**
 * test-setup.js
 * Required by web/jest.setup.js as setupFilesAfterFramework.
 * Loads ph-constants.js into the jsdom global so that PH_KEYS, PH_DATA_KEYS,
 * PH_PRODUCT_DOM, PH_PROPS etc. are available in every test file without
 * each test having to load them manually.
 *
 * In Jest + jsdom: global === window, so eval(code) sets window.PH_KEYS etc.
 */

const fs   = require('fs');
const path = require('path');

const SDK_DIR = path.resolve(__dirname, '../../../public/lib/clientAnalytics');

function loadGlobal(filename) {
  const code = fs.readFileSync(path.join(SDK_DIR, filename), 'utf-8');
  // global.eval runs in the jsdom global scope (== window), setting browser globals
  // eslint-disable-next-line no-eval
  global.eval(code);
}

// Load constants first — all other modules depend on them at parse time
loadGlobal('ph-constants.js');

// Default AskMeAnalyticsConfig with debug:false (tests override per-suite)
global.AskMeAnalyticsConfig = global.AskMeAnalyticsConfig || {
  clientId: 'test-client',
  debug: false,
  dedupScope: 'path',
  allowEmailIdentify: false,
};
