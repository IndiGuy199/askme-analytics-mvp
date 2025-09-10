#!/usr/bin/env node

/**
 * Migration script to convert hardcoded CLIENTS to database entries
 * 
 * Usage:
 *   node scripts/migrate-clients-to-db.js
 * 
 * This script will:
 * 1. Read existing CLIENTS from config/clients.js
 * 2. Create companies in the database
 * 3. Store encrypted PostHog credentials
 * 4. Save query configurations
 * 5. Set up email recipients
 */

import { createClient } from '@supabase/supabase-js'
import { CLIENTS } from '../src/config/clients.js'
import { encryptApiKey } from '../src/services/companyService.js'
import { saveQueryConfigForCompany } from '../src/services/queryConfigService.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrateClients() {
  console.log('🚀 Starting client migration to database...')
  console.log(`Found ${CLIENTS.length} clients to migrate:`)
  
  CLIENTS.forEach(client => {
    console.log(`  - ${client.name} (${client.clientId})`)
  })
  
  const results = []

  for (const client of CLIENTS) {
    console.log(`\n📦 Migrating client: ${client.name}`)
    
    try {
      // 1. Create company
      console.log('  Creating company...')
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .upsert({
          name: client.name,
          slug: client.clientId,
          posthog_project_id: client.projectId,
          posthog_api_key_encrypted: encryptApiKey(client.apiKey),
          posthog_client_id: client.clientId, // Use clientId as PostHog client ID
          is_active: true,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days trial
        })
        .select()
        .single()

      if (companyError) {
        throw new Error(`Company creation failed: ${companyError.message}`)
      }

      console.log(`  ✅ Company created with ID: ${company.id}`)

      // 2. Migrate query configurations
      const queryTypes = Object.keys(client.queries)
      console.log(`  Migrating ${queryTypes.length} query configurations...`)
      
      for (const [queryType, queryConfig] of Object.entries(client.queries)) {
        try {
          await saveQueryConfigForCompany(
            company.id,
            queryType,
            queryConfig.query,
            queryConfig.title || `${queryType} query`
          )
          console.log(`    ✅ ${queryType} query saved`)
        } catch (queryError) {
          console.error(`    ❌ Failed to save ${queryType} query:`, queryError.message)
        }
      }

      // 3. Set up email recipients (if available)
      if (client.recipients && client.recipients.length > 0) {
        console.log(`  Setting up ${client.recipients.length} email recipients...`)
        
        const emailInserts = client.recipients.map(email => ({
          company_id: company.id,
          email: email
        }))

        const { error: emailError } = await supabase
          .from('email_recipients')
          .upsert(emailInserts)

        if (emailError) {
          console.error(`  ❌ Email recipients setup failed:`, emailError.message)
        } else {
          console.log(`  ✅ Email recipients configured`)
        }
      }

      // 4. Create a default admin user (optional)
      if (client.recipients && client.recipients.length > 0) {
        const adminEmail = client.recipients[0] // Use first recipient as admin
        
        // Note: This creates a user record but they still need to authenticate via Supabase
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            email: adminEmail,
            company_id: company.id,
            role: 'owner',
            name: `${client.name} Admin`,
            is_active: true
          })

        if (userError) {
          console.error(`  ⚠️  Admin user setup failed:`, userError.message)
        } else {
          console.log(`  ✅ Admin user configured: ${adminEmail}`)
        }
      }

      results.push({
        client: client.name,
        success: true,
        companyId: company.id,
        queryTypes: queryTypes.length,
        recipients: client.recipients?.length || 0
      })

      console.log(`  🎉 Migration completed for ${client.name}`)

    } catch (error) {
      console.error(`  ❌ Migration failed for ${client.name}:`, error.message)
      results.push({
        client: client.name,
        success: false,
        error: error.message
      })
    }
  }

  // Summary
  console.log('\n📊 Migration Summary:')
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`  ✅ Successful: ${successful.length}`)
  console.log(`  ❌ Failed: ${failed.length}`)

  if (successful.length > 0) {
    console.log('\n✅ Successfully migrated companies:')
    successful.forEach(result => {
      console.log(`  - ${result.client} (ID: ${result.companyId})`)
      console.log(`    Queries: ${result.queryTypes}, Recipients: ${result.recipients}`)
    })
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed migrations:')
    failed.forEach(result => {
      console.log(`  - ${result.client}: ${result.error}`)
    })
  }

  console.log('\n🎯 Next Steps:')
  console.log('1. Update your application to use runForCompanyId() instead of runForClientId()')
  console.log('2. Use companyId parameter in analytics preview API calls')
  console.log('3. Test the new database-driven functionality')
  console.log('4. Users will need to authenticate via Supabase to access their company data')

  console.log('\n✨ Migration completed!')
}

// Handle process errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run migration
migrateClients().catch(error => {
  console.error('Migration script failed:', error)
  process.exit(1)
})
