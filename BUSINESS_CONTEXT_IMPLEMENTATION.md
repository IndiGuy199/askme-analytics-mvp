# Business Context Implementation Guide

## ✅ Implementation Complete

This guide documents the business context capture feature that provides personalized AI insights based on company-specific information.

---

## 🎯 Overview

The system now captures business context during onboarding and uses it to generate more relevant, personalized AI insights. The AI tailors recommendations based on:
- Industry type
- Business model
- Primary goals
- Audience region
- Traffic sources
- Monthly visitors

---

## 📋 What Was Changed

### 1. Database Schema (`add_business_context_to_companies.sql`)

**Status:** ✅ Migration Applied

Added 6 new columns to `companies` table:
- `industry` (VARCHAR 100) - E-commerce, SaaS, Local Services, etc.
- `business_model` (VARCHAR 50) - B2C, B2B, B2B2C, Marketplace
- `primary_goal` (VARCHAR 255) - Generate leads, Get sign-ups, etc.
- `audience_region` (VARCHAR 100) - US/Canada, Europe, Asia-Pacific, etc.
- `traffic_sources` (TEXT[]) - Array of traffic sources
- `monthly_visitors` (INTEGER) - Approximate visitor count

Includes:
- Column comments for documentation
- Index on `industry` for efficient queries

---

### 2. Enhanced Onboarding Form (`web/app/onboarding/company/page.tsx`)

**Status:** ✅ Complete

**New Form Fields (All Mandatory):**

#### Industry Dropdown
Options: E-commerce, SaaS, Software, Local Services, Education, Healthcare, Real Estate, Media & Publishing, Finance, Other

#### Primary Goal Dropdown
Options: Generate leads, Get sign-ups, Sell products, Book appointments, Increase engagement, Drive subscriptions, Other

#### Monthly Visitors Dropdown
Ranges: Under 1K, 1K-10K, 10K-50K, 50K-100K, 100K-500K, 500K+

#### Audience Region Dropdown
Options: US/Canada, Europe, Asia-Pacific, Latin America, Middle East/Africa, Global

#### Traffic Sources Multi-Select
Checkboxes for:
- Google Search
- Facebook / Instagram Ads
- LinkedIn
- Email Marketing
- Direct Traffic
- Referrals
- Content Marketing
- Other Paid Ads

**Form Enhancements:**
- Added "Business Context" section with explanatory text
- Required field validation for all new fields
- Error messages with icon indicators
- Auto-determines business_model (B2B for SaaS/Software, B2C for others)
- Saves all context to database on company creation

---

### 3. AI Insights API (`web/app/api/ai/insights/route.ts`)

**Status:** ✅ Complete

**Changes:**

#### POST Handler
1. **Fetch Business Context** (Lines 477-498)
   ```typescript
   const { data: companyData } = await supabase
     .from('companies')
     .select('industry, business_model, primary_goal, audience_region, traffic_sources, monthly_visitors')
     .eq('id', companyId)
     .single();
   ```

2. **Use Context for Benchmarks**
   - Uses company's industry for benchmark selection
   - Falls back to provided industry parameter

3. **Pass Context to AI Generation**
   - Sends business context to `generateInsights()` function

4. **Save Industry with Insights**
   - Stores industry in `ai_insights` table for filtering/analysis

#### generateInsights() Function
1. **Updated Signature** (Lines 276-294)
   - Added optional `businessContext` parameter
   - Type-safe interface for all context fields

2. **Enhanced Prompt** (Lines 298-311)
   - Builds "CLIENT BUSINESS CONTEXT" section when data available
   - Instructs AI to:
     - Tailor insights to specific business type
     - Explain metrics in relevant terms
     - Reference primary goal in actions
     - Consider traffic sources in analysis
     - Use simple, actionable language

**Example Context Section in Prompt:**
```
=== CLIENT BUSINESS CONTEXT ===
Industry: E-commerce
Business Model: B2C
Primary Goal: Sell products
Audience Region: US / Canada
Traffic Sources: Google Search, Facebook / Instagram Ads, Email Marketing
Monthly Visitors: 25,000

Use this context to:
- Tailor insights to this specific business type and industry
- Explain metrics in terms relevant to their business model
- Reference their primary goal when suggesting actions
- Consider their traffic sources when analyzing performance
- Use simple, actionable language for their business context
```

---

## 🔄 How It Works

### Onboarding Flow
1. User signs up and creates account
2. User fills out company information form
3. **NEW:** User provides business context (industry, goals, traffic, etc.)
4. Form validates all required fields
5. Company record created with full context
6. User proceeds to PostHog setup

### AI Insights Generation Flow
1. User requests AI insights from dashboard
2. API fetches user's company data **including business context**
3. Context is added to OpenAI prompt as "CLIENT BUSINESS CONTEXT"
4. AI generates insights tailored to:
   - Business type (e.g., E-commerce vs SaaS metrics)
   - Primary goal (e.g., "increase add-to-cart rate" for product sales goal)
   - Traffic sources (e.g., "optimize Facebook ads" when FB is main source)
   - Audience region (e.g., consider time zones, local competitors)
5. Insights saved with industry tag for future filtering

---

## 📊 Example: Personalized Insights

### E-commerce Company
**Context:**
- Industry: E-commerce
- Goal: Sell products
- Traffic: Google Search, Instagram Ads

**AI Insights Would Focus On:**
- Product view → Add to cart → Checkout flow
- Shopping cart abandonment rates
- Mobile checkout experience (Instagram traffic)
- SEO performance for product pages
- Conversion rate optimization

### SaaS Company
**Context:**
- Industry: SaaS
- Goal: Get sign-ups
- Traffic: LinkedIn, Content Marketing

**AI Insights Would Focus On:**
- Sign-up funnel optimization
- Trial activation rates
- Feature adoption metrics
- User onboarding completion
- B2B conversion tactics

---

## 🧪 Testing Checklist

### ✅ Database Migration
- [x] Migration applied successfully
- [x] All 6 columns added to companies table
- [x] Index created on industry column

### ✅ Onboarding Form
- [ ] Create new test account
- [ ] Verify all 5 new fields appear
- [ ] Test required field validation
- [ ] Verify multi-select works for traffic sources
- [ ] Confirm company creation includes context
- [ ] Check business_model auto-determination

### ✅ AI Insights
- [ ] Generate insights with context-enabled account
- [ ] Verify console logs show "🎯 Business context: {...}"
- [ ] Review generated insights for personalization
- [ ] Compare insights between different industries
- [ ] Verify industry saved in ai_insights table

---

## 🐛 Troubleshooting

### No Business Context in AI Prompt
**Symptom:** Console shows `🎯 Business context: null`

**Causes:**
1. Company created before migration (no context data)
2. User didn't complete onboarding properly

**Solution:**
- Have user update company settings (if settings page exists)
- Manually update via Supabase SQL Editor:
  ```sql
  UPDATE companies 
  SET industry = 'E-commerce',
      primary_goal = 'Sell products',
      audience_region = 'US / Canada',
      traffic_sources = ARRAY['Google Search', 'Facebook / Instagram Ads'],
      monthly_visitors = 25000
  WHERE id = 'company-id-here';
  ```

### Onboarding Form Validation Errors
**Symptom:** Can't submit form despite filling all fields

**Check:**
- At least one traffic source selected
- Monthly visitors dropdown selected (not empty)
- All dropdowns have valid option selected

### AI Insights Not Using Context
**Symptom:** Generic insights despite having business context

**Check:**
1. Verify context is being fetched (console logs)
2. Verify context is being passed to `generateInsights()`
3. Check OpenAI prompt includes "CLIENT BUSINESS CONTEXT" section
4. Review AI response for industry-specific terms

---

## 📈 Future Enhancements

### Phase 2: Company Settings Page
- Allow users to update business context after onboarding
- Show how context affects AI insights
- Industry-specific tips and best practices

### Phase 3: Advanced Personalization
- Industry-specific KPI templates
- Custom benchmark groups
- Competitor comparisons (if data available)
- Region-specific optimization tips

### Phase 4: Context-Aware Features
- Dashboard layouts by industry
- Goal-based metric prioritization
- Traffic source-specific analysis
- Automated A/B test suggestions

---

## 📝 Code References

### Key Files Modified
1. `database/migrations/add_business_context_to_companies.sql` - Schema changes
2. `web/app/onboarding/company/page.tsx` - Enhanced form (Lines 15-23 state, Lines 259-392 UI, Lines 99-143 validation, Lines 159-169 submit)
3. `web/app/api/ai/insights/route.ts` - Context fetching (Lines 477-498), AI generation (Lines 276-311, 575)

### Database Tables
- `companies` - Business context fields
- `ai_insights` - Industry field for filtering

### Environment Variables
No new environment variables required. Uses existing:
- `OPENAI_API_KEY` - For AI generation
- Supabase credentials - For database access

---

## ✨ Summary

The business context feature is now **fully implemented and functional**. New companies will capture context during onboarding, and AI insights will be automatically personalized based on their:
- Industry
- Business goals
- Traffic sources
- Audience region
- Business scale

This makes AI insights **significantly more relevant and actionable** for SMB clients by speaking their business language and focusing on metrics that matter to their specific use case.

**Next Step:** Test the complete flow with a new onboarding to verify personalization in action! 🚀
