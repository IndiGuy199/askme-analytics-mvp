#!/usr/bin/env node

/**
 * Generate a secure 32-byte encryption key for PostHog API key encryption
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 */

import crypto from 'crypto'

function generateEncryptionKey() {
  // Generate a secure 32-byte (256-bit) key
  const key = crypto.randomBytes(32).toString('hex')
  
  console.log('🔐 Generated PostHog Encryption Key:')
  console.log('')
  console.log(`POSTHOG_ENCRYPTION_KEY=${key}`)
  console.log('')
  console.log('📝 Add this to your .env file')
  console.log('⚠️  Keep this key secure and never commit it to version control!')
  console.log('')
  console.log('Key details:')
  console.log(`  Length: ${key.length} characters (${key.length / 2} bytes)`)
  console.log(`  Format: Hexadecimal`)
  console.log(`  Strength: 256-bit encryption`)
}

generateEncryptionKey()
