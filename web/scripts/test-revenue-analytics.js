#!/usr/bin/env node

/**
 * Revenue Analytics Implementation Test Script
 * 
 * This script verifies that all required files exist and have correct structure.
 * Run with: node web/scripts/test-revenue-analytics.js
 */

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..');

const requiredFiles = [
  'lib/queries/revenue.ts',
  'app/api/analytics/revenue-by-channel/route.ts',
  'app/api/analytics/top-revenue/route.ts',
  'components/analytics/RevenueByChannelCard.tsx',
  'components/analytics/TopRevenueItemsCard.tsx',
];

const modifiedFiles = [
  'app/dashboard/page.tsx',
];

console.log('🧪 Testing Revenue Analytics Implementation\n');

let allPassed = true;

// Check required files exist
console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(webDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allPassed = false;
  }
});

console.log('\n📝 Checking modified files...');
modifiedFiles.forEach(file => {
  const filePath = path.join(webDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for imports
    const hasRevenueImports = 
      content.includes('RevenueByChannelCard') && 
      content.includes('TopRevenueItemsCard');
    
    if (hasRevenueImports) {
      console.log(`  ✅ ${file} - Contains revenue card imports`);
    } else {
      console.log(`  ❌ ${file} - Missing revenue card imports!`);
      allPassed = false;
    }
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allPassed = false;
  }
});

// Check package.json for recharts
console.log('\n📦 Checking dependencies...');
const packageJsonPath = path.join(webDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (packageJson.dependencies && packageJson.dependencies.recharts) {
    console.log(`  ✅ recharts@${packageJson.dependencies.recharts}`);
  } else {
    console.log(`  ❌ recharts - NOT INSTALLED!`);
    allPassed = false;
  }
} else {
  console.log(`  ❌ package.json - NOT FOUND!`);
  allPassed = false;
}

// Check TypeScript config
console.log('\n⚙️  Checking TypeScript configuration...');
const tsconfigPath = path.join(webDir, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths && tsconfig.compilerOptions.paths['@/*']) {
    console.log(`  ✅ Path alias @/* configured`);
  } else {
    console.log(`  ⚠️  Path alias @/* not found (may cause import issues)`);
  }
} else {
  console.log(`  ❌ tsconfig.json - NOT FOUND!`);
  allPassed = false;
}

// Summary
console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✅ All checks passed! Implementation looks good.');
  console.log('\n📖 Next steps:');
  console.log('  1. Start the dev server: npm run dev');
  console.log('  2. Navigate to /dashboard');
  console.log('  3. Verify revenue cards render correctly');
  console.log('  4. Test with real PostHog data');
  console.log('\n📄 See REVENUE_ANALYTICS_IMPLEMENTATION.md for details');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the errors above.');
  process.exit(1);
}
