-- =====================================================
-- Add Business Context Fields to Companies Table
-- =====================================================
-- This migration adds fields to capture business context
-- during onboarding for more relevant AI insights
-- =====================================================

-- Add business context columns to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS business_model VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_goal VARCHAR(255),
  ADD COLUMN IF NOT EXISTS audience_region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS traffic_sources TEXT[], -- Array of traffic sources
  ADD COLUMN IF NOT EXISTS monthly_visitors INTEGER;

-- Add comments for new columns
COMMENT ON COLUMN companies.industry IS 'Business industry: E-commerce, SaaS, Local Services, Education, Healthcare, Real Estate, Other';
COMMENT ON COLUMN companies.business_model IS 'Business model: B2C, B2B, B2B2C, Marketplace, etc.';
COMMENT ON COLUMN companies.primary_goal IS 'Main business goal: Generate leads, Get sign-ups, Sell products, Book appointments, Other';
COMMENT ON COLUMN companies.audience_region IS 'Primary audience region: US / Canada, Europe, Asia-Pacific, Global';
COMMENT ON COLUMN companies.traffic_sources IS 'Typical traffic sources: Google Search, Facebook/Instagram Ads, Email, Direct, Other';
COMMENT ON COLUMN companies.monthly_visitors IS 'Approximate monthly visitors';

-- Add index for industry lookups (for industry-specific insights)
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

-- =====================================================
-- Migration complete
-- =====================================================
-- Summary of changes:
-- ✅ Added 6 business context columns to companies table
-- ✅ Added comments explaining each field
-- ✅ Added index for industry queries
-- =====================================================
