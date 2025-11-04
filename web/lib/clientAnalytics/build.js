/**
 * AskMe Analytics - Minified Build Script
 * Minifies ph-product-injector.js to UMD format
 */

const fs = require('fs');
const path = require('path');

// Simple minifier (removes comments, extra whitespace)
function minify(code) {
  return code
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove single-line comments (but preserve URLs)
    .replace(/\/\/(?![^\n]*http)[^\n]*/g, '')
    // Remove leading/trailing whitespace from lines
    .replace(/^\s+|\s+$/gm, '')
    // Collapse multiple spaces
    .replace(/ {2,}/g, ' ')
    // Remove spaces around operators (safe subset)
    .replace(/\s*([=<>!+\-*/%&|^~?:,;(){}[\]])\s*/g, '$1')
    // Add back space after keywords
    .replace(/\b(return|var|let|const|if|else|for|while|do|switch|case|break|continue|function|try|catch|finally|throw|new|typeof|instanceof|in|of|delete|void)\b/g, '$1 ')
    // Remove empty lines
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// Read source file
const sourcePath = path.join(__dirname, 'ph-product-injector.js');
const source = fs.readFileSync(sourcePath, 'utf8');

// Minify
const minified = minify(source);

// Add UMD wrapper with version header
const umdBuild = `/*!
 * AskMe Analytics - Product Injector (UMD)
 * Version: 1.2.0
 * License: MIT
 * Date: ${new Date().toISOString().split('T')[0]}
 * 
 * Backend-agnostic identity bridge for PostHog analytics
 * Supports: Email+Password, SSO OAuth, Magic Link authentication
 */
${minified}`;

// Write minified file
const distPath = path.join(__dirname, 'dist', 'ph-product-injector.min.js');
fs.mkdirSync(path.dirname(distPath), { recursive: true });
fs.writeFileSync(distPath, umdBuild);

// Stats
const originalSize = source.length;
const minifiedSize = umdBuild.length;
const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

console.log('✅ Build complete!');
console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
console.log(`   Minified: ${(minifiedSize / 1024).toFixed(2)} KB`);
console.log(`   Savings: ${savings}%`);
console.log(`   Output: ${distPath}`);
