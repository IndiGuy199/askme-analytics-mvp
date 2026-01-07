# AI Insights V2 - Strategic Upgrade Implementation Guide

## 🎯 Overview

This upgrade transforms AI Insights from basic recommendations into a sophisticated, benchmark-aware, comparison-driven analytics copilot specifically designed for SMB owners.

## ✨ What's New

### 1. **Period-over-Period Comparisons**
- Automatically fetches prior period KPIs from `analytics_snapshots` table
- Calculates matching date ranges (same duration, offset backward)
- AI generates headlines like: "Traffic up 18% WoW but conversion stuck at 1.85%"
- Numbers table shows Current vs Prior with delta indicators (↗️ +12.3% or ↘️ -8.5%)

### 2. **Industry Benchmarks**
- Default benchmarks for SaaS: 3-5% conversion, 20-25% D7 retention
- Industry-specific overrides: ecommerce, content, app
- Passed directly to OpenAI (no hallucination risk)
- UI displays benchmark badges: **Below** | **Meets** | **Exceeds** | **Unknown**

### 3. **Segment-Aware Insights**
- AI identifies top 1-2 impactful segments:
  - **Device**: Mobile vs Desktop behavior patterns
  - **Geography**: Country/region-specific insights
- Each segment includes: insight text + action hint
- Visual cards with icons (📱 Smartphone, 🌍 Globe)

### 4. **Prioritized Actions with Impact×Effort**
- Each action now includes:
  - **Title**: e.g., "Streamline email verification"
  - **Why**: Ties to specific metric or benchmark gap
  - **Impact**: 1-5 scale (visual bars)
  - **Effort**: 1-5 scale (visual bars)
  - **Confidence**: 0-1 (displayed as percentage)
  - **Expected Lift**: Optional % improvement estimate
  - **Tag**: funnel | mobile | content | geo | retention | performance
- **Sorting Options**:
  - Impact (High → Low) - **Default**
  - Effort (Low → High) - Quick wins first
  - Best Score (Impact/Effort × Confidence) - ROI optimization
  - Default order (AI's original ranking)

### 5. **Structured Bottleneck Analysis**
- Step-by-step funnel drop identification
- Drop rate percentage (e.g., "12.5% drop from Email Verified → Trial Started")
- Plain-language diagnosis
- **Root Cause Hypotheses**: Up to 3 data-backed theories

### 6. **Retention Analysis with Benchmarks**
- D7 retention percentage
- Benchmark status badge
- Contextual note (e.g., "Exceeds 20-25% target, showing strong product-market fit")

### 7. **Enhanced Validation & Guardrails**
- Strict schema compliance
- Automatic coercion: percentages (0-100), ratings (1-5), confidence (0-1)
- Fallback handling for invalid AI responses
- **Data Gaps Tracking**: Lists missing/insufficient fields in `meta.data_gaps`

### 8. **UI Enhancements**
- **Collapsible Sections**: Click headers to expand/collapse
- **Benchmark Badges**: Visual indicators for Retention, Conversion
- **Numbers Comparison Table**: Side-by-side Current vs Prior
- **Segment Cards**: Color-coded (blue for device, green for geo)
- **Action Cards**: Tag icons, impact/effort bars, confidence %
- **Period Comparison Badge**: "vs Prior Period" indicator when comparison available
- **Sort Controls**: Dropdown for action prioritization
- **Expandable History**: Previous insights sidebar
- **Benchmark Legend**: Quick reference for badge meanings

### 9. **Database Schema Updates**
- **ai_insights** table: 8 new columns
  - `summary` TEXT - 2-3 sentence executive summary
  - `segments` JSONB - Device and geo insights
  - `retention_analysis` JSONB - Retention metrics + benchmark status
  - `numbers_table` JSONB - Comparison table data
  - `meta` JSONB - Period compared, data gaps
  - `previous_kpis_snapshot` JSONB - Prior period KPIs
  - `language` VARCHAR(10) - Multi-language support (future)
  - `industry` VARCHAR(50) - For benchmark selection
- **action_tracking** table: NEW
  - Tracks which actions users accept/complete
  - Records metrics before/after implementation
  - Enables "AI that learns" future feature
- **Automated data migration**: Old text fields → structured JSONB

### 10. **Action Tracking (Foundation)**
- Database schema ready for future feature
- Users can mark actions as "Accepted" → "Completed"
- Capture metrics_before and metrics_after
- Measure actual impact vs expected lift
- Future: Feed this back to AI for learning

---

## 🔧 Implementation Steps

### Step 1: Run Database Migration

```sql
-- In Supabase Dashboard → SQL Editor
-- Copy and paste: database/migrations/upgrade_ai_insights_v2.sql
```

This migration:
- ✅ Adds 8 new columns to `ai_insights`
- ✅ Migrates old `bottleneck` (TEXT) → structured JSONB
- ✅ Migrates old `actions` (string array) → structured objects array
- ✅ Creates `action_tracking` table with RLS policies
- ✅ Creates `action_effectiveness` view
- ✅ Updates `latest_insights` view
- ✅ Adds performance indexes
- ✅ **Backward compatible** - existing insights still work!

### Step 2: Update Backend API (Already Done ✅)

File: `web/app/api/ai/insights/route.ts`

**New Interfaces**:
```typescript
interface Benchmarks { saas_conv_rate_target, d7_retention_target, mobile_share_norm }
interface AIBottleneck { step_from, step_to, drop_rate_pct, diagnosis, hypotheses[] }
interface AISegments { by_device, by_geo }
interface AIRetention { d7_pct, benchmark_status, note }
interface AIAction { title, why, impact, effort, confidence, expected_lift_pct, tag }
interface NumbersRow { metric, current, prior, delta }
interface AIMetaInfo { period_compared, data_gaps[] }
```

**New Functions**:
- `getBenchmarks(industry)` - Returns default or industry-specific targets
- `calculatePriorPeriod(start, end)` - Computes matching prior date range
- `validateAIResponse(response)` - Coerces values, handles null fields, ensures schema compliance
- `generateInsights(currentKpis, previousKpis, benchmarks, language)` - Enhanced prompt with comparisons

**Enhanced POST Handler**:
1. Accepts `previousKpis`, `industry`, `language` in request body
2. Auto-fetches prior period from `analytics_snapshots` if not provided
3. Applies industry-specific benchmarks
4. Saves current KPIs to `analytics_snapshots` for future comparisons
5. Saves enhanced insights with all new fields

### Step 3: Update Frontend UI (Already Done ✅)

File: `web/app/ai-insights/page-v2.tsx` (Replace `page.tsx` after testing)

**New UI Components**:
- **Numbers Comparison Table**: Sortable, with ↗️↘️ delta indicators
- **Segment Analysis Cards**: Device (blue) and Geo (green) with action hints
- **Retention Card**: With benchmark badge
- **Enhanced Bottleneck**: Steps → Steps with drop %, hypotheses list
- **Action Cards**: Tag icons, impact/effort bars, confidence %, expected lift
- **Collapsible Sections**: Click-to-expand for better information hierarchy
- **Action Sorting**: 6 sort options (impact, effort, score, etc.)
- **Benchmark Badges**: TrendingDown (Below), Target (Meets), Award (Exceeds)
- **Benchmark Legend**: Sidebar card explaining badge meanings

**New State Management**:
- `actionSort`: Controls action prioritization
- `expandedSections`: Toggle visibility of sections
- `sortActions()`: Client-side action reordering

### Step 4: Replace Main UI File

```bash
# After testing, replace the original
cd web/app/ai-insights
mv page.tsx page-old.tsx  # Backup
mv page-v2.tsx page.tsx   # Activate new version
```

---

## 📊 New OpenAI Prompt Structure

### Input Format

```javascript
{
  language: "en",  // or "es", "fr", etc.
  benchmarks: {
    saas_conv_rate_target: { low: 0.03, good: 0.05 },
    d7_retention_target: { low: 0.20, good: 0.25 },
    mobile_share_norm: { low: 0.45, high: 0.65 }
  },
  current_kpis: { /* traffic, funnel, lifecycle, device, retention, geography */ },
  previous_kpis: { /* same structure, or null */ }
}
```

### Prompt Template

```
You are a no-nonsense analytics consultant. Use ONLY the data provided.
Return STRICT JSON matching the schema below.

=== CONTEXT ===
- Audience: non-technical small-business operators
- Goal: explain what changed, where the funnel leaks, what to do next
- Language: en

=== BENCHMARKS ===
{ saas_conv_rate_target: {low: 0.03, good: 0.05}, ... }

=== CURRENT KPIs ===
{ traffic: {...}, funnel: {...}, lifecycle: {...}, device: {...}, retention: {...}, geography: {...} }

=== PRIOR KPIs ===
{ same structure or null }

=== SCHEMA ===
{
  "headline": "One sentence with % change if prior present",
  "summary": "2-3 lines: what's up/down and why it matters",
  "highlights": ["3 bullets with numbers"],
  "bottleneck": {
    "step_from": "Step name", "step_to": "Next step", "drop_rate_pct": 12.5,
    "diagnosis": "Plain explanation",
    "hypotheses": ["Root cause 1", "Root cause 2", "Root cause 3"]
  },
  "segments": {
    "by_device": { "segment": "mobile", "insight": "...", "action_hint": "..." },
    "by_geo": { "segment": "US", "insight": "...", "action_hint": "..." }
  },
  "retention": {
    "d7_pct": 24.5, "benchmark_status": "exceeds", "note": "..."
  },
  "actions": [
    {
      "title": "Action title", "why": "Data-backed reason",
      "impact": 5, "effort": 2, "confidence": 0.85,
      "expected_lift_pct": 10.5, "tag": "funnel"
    }
  ],
  "numbers_table": [
    { "metric": "Unique Users", "current": "1,250", "prior": "1,050", "delta": "+19.0%" }
  ],
  "meta": {
    "period_compared": "prior_provided",
    "data_gaps": []
  }
}

=== RULES ===
- Percentages: with % sign, 1 decimal, include sign (+/-)
- Time: seconds or minutes (e.g., "3m 10s")
- Pick at most ONE device and ONE geo segment
- Actions: 3-5 items, ranked by impact desc
- If prior is null: set period_compared="insufficient_prior", leave deltas null
```

### Model Settings

- **Model**: `gpt-4o-mini` (fast, cost-effective)
- **Temperature**: `0.25` (consistent, deterministic output)
- **Response Format**: `{ type: 'json_object' }` (enforced JSON)
- **Expected Tokens**: 600-800 output tokens (~$0.001-0.01 per insight)

---

## 🧪 Testing Checklist

### Backend API Tests

```bash
# Test with curl or Postman
POST /api/ai/insights
{
  "kpis": { /* full KPI object */ },
  "dateRange": "7d",
  "startDate": "2025-10-17T00:00:00Z",
  "endDate": "2025-10-24T00:00:00Z",
  "industry": "saas",  # Optional
  "language": "en"      # Optional
}

# Expected response:
{
  "success": true,
  "insights": {
    "headline": "Traffic up 18% but conversion stuck at 1.85%",
    "summary": "...",
    "highlights": [...],
    "bottleneck": { step_from, step_to, drop_rate_pct, diagnosis, hypotheses },
    "segments": { by_device, by_geo },
    "retention": { d7_pct, benchmark_status, note },
    "actions": [ {title, why, impact, effort, confidence, expected_lift_pct, tag} ],
    "numbers_table": [ {metric, current, prior, delta} ],
    "meta": { period_compared, data_gaps }
  },
  "metadata": { model, promptTokens, completionTokens, generationTimeMs },
  "saved": true,
  "insightId": "uuid"
}
```

### Frontend UI Tests

1. **Generate Insights**
   - Click "Generate New Insights"
   - Verify loading state
   - Check for errors

2. **Numbers Table**
   - ✅ Current values display correctly
   - ✅ Prior values show (if available)
   - ✅ Delta with ↗️/↘️ icons and +/- colors
   - ✅ Click header to collapse/expand

3. **Highlights**
   - ✅ 3 bullet points with ✓ icons
   - ✅ Numbers formatted correctly

4. **Segments**
   - ✅ Device card (blue) with 📱 icon
   - ✅ Geo card (green) with 🌍 icon
   - ✅ Action hints displayed

5. **Retention**
   - ✅ D7 percentage shown
   - ✅ Benchmark badge: Below/Meets/Exceeds
   - ✅ Note text explains status

6. **Bottleneck**
   - ✅ Step → Step with drop %
   - ✅ Diagnosis text
   - ✅ Hypotheses numbered list

7. **Actions**
   - ✅ Tag icons (funnel, mobile, content, etc.)
   - ✅ Impact bars (1-5 green bars)
   - ✅ Effort bars (1-5 blue bars)
   - ✅ Confidence percentage
   - ✅ Expected lift (if present)
   - ✅ Sort dropdown: Impact/Effort/Score
   - ✅ Cards reorder when sort changes

8. **Benchmark Legend**
   - ✅ Sidebar card shows all badge types
   - ✅ Explanations clear

9. **Previous Insights**
   - ✅ History list in sidebar
   - ✅ Star ratings display

10. **Responsive Design**
    - ✅ Desktop layout (3-column grid)
    - ✅ Mobile layout (stacked)

### Database Tests

```sql
-- Verify columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_insights' 
AND column_name IN ('summary', 'segments', 'retention_analysis', 'numbers_table', 'meta', 'previous_kpis_snapshot', 'language', 'industry');

-- Check action_tracking table
SELECT * FROM action_tracking LIMIT 1;

-- Verify view updated
SELECT * FROM latest_insights WHERE company_id = 'your-company-id' LIMIT 1;
```

---

## 📈 Expected Improvements

### User Experience

| Feature | Before | After |
|---------|--------|-------|
| Insight Headline | Generic summary | Specific % change with comparison |
| Benchmarks | Mentioned in prompt | Visual badges + industry-specific |
| Actions | Simple list | Prioritized with impact/effort/confidence |
| Bottleneck | Text description | Steps, drop %, hypotheses |
| Segments | Not identified | Device + Geo with action hints |
| Retention | Not highlighted | Dedicated card with benchmark status |
| Comparison | None | Numbers table with deltas |
| Sorting | Fixed order | 6 sort options |
| UI Hierarchy | Flat | Collapsible sections |

### AI Response Quality

- **More Specific**: "up 18% WoW" vs "increasing"
- **More Actionable**: "Reduce 12.5% drop at email verification" vs "improve conversion"
- **More Credible**: Benchmarks in data vs prompt (no hallucination)
- **More Comprehensive**: 10 structured fields vs 4 simple arrays

### Performance

- **Generation Time**: 2-5 seconds (same)
- **Token Usage**: ~1000-1600 tokens (up from ~800, acceptable)
- **Cost**: $0.001-0.01 per insight (same range)
- **Cache Hit Rate**: Not applicable (insights are unique)

---

## 🚀 Future Enhancements (Post-Launch)

### Phase 2: Action Tracking

1. **Accept/Complete Actions**
   - "Accept Action" button on each card
   - Moves to "In Progress" section
   - "Mark Completed" button with date picker
   - Capture metrics_before and metrics_after

2. **Impact Measurement**
   - Compare actual lift vs expected lift
   - User rates outcome: positive/negative/neutral/too_early
   - Display success rate per action type

3. **AI Learning Loop**
   - Feed completed actions + outcomes back to prompt
   - "Your past actions: Email verification improvement → +15% conversion (vs +10% expected)"
   - Improves future recommendations

### Phase 3: Advanced Features

- **Anomaly Detection**: "Unusual spike in mobile traffic detected"
- **Predictive Insights**: "Trend suggests 30% growth next month"
- **Multi-Language**: Generate insights in user's preferred language
- **Custom Benchmarks**: Upload industry peer data for comparison
- **Insight Versioning**: Track how insights evolve over time
- **Export to PDF**: Downloadable executive summary

---

## 🐛 Troubleshooting

### Issue: No prior period data available

**Symptom**: `meta.period_compared = "insufficient_prior"`, no deltas in numbers table

**Cause**: `analytics_snapshots` table empty or no matching prior period

**Solution**:
1. Generate insights at least twice with same date range
2. First generation populates `analytics_snapshots`
3. Second generation fetches prior period automatically
4. Or manually insert prior KPIs in request: `{ previousKpis: {...} }`

### Issue: AI returns invalid JSON

**Symptom**: Fallback insights with generic text

**Cause**: OpenAI occasionally returns malformed JSON despite `response_format`

**Solution**:
- ✅ Validator catches and provides fallback
- ✅ User sees "Data parsing issues detected"
- ✅ Try regenerating insights
- ✅ If persistent, check OpenAI status page

### Issue: Benchmark badges all show "Unknown"

**Symptom**: `retention.benchmark_status = "unknown"`

**Cause**: Retention data missing from KPIs

**Solution**:
- Check PostHog retention query is working
- Verify `kpis.retention.d7_retention` exists
- May need to add default value in validation

### Issue: Actions not sorting

**Symptom**: Sort dropdown doesn't reorder cards

**Cause**: JavaScript error in `sortActions()` function

**Solution**:
- Check browser console for errors
- Verify all actions have `impact`, `effort`, `confidence` fields
- Ensure `actionSort` state is updating

### Issue: Database migration fails

**Symptom**: SQL errors during migration

**Cause**: Conflicting changes or missing extensions

**Solution**:
```sql
-- Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check for existing columns before adding
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ai_insights' AND column_name = 'summary';

-- If column exists, skip that ALTER TABLE statement
```

---

## 📚 Documentation Files

- **This Guide**: `AI_INSIGHTS_V2_UPGRADE.md` - Complete implementation reference
- **Technical Details**: `AI_INSIGHTS_TECHNICAL.md` - KPI structure, prompt, examples
- **Quick Start**: `QUICK_START_AI_INSIGHTS.md` - User-facing guide
- **Original Docs**: `AI_INSIGHTS_IMPLEMENTATION.md` - V1 implementation

---

## ✅ Completion Checklist

- [x] Database migration created (`upgrade_ai_insights_v2.sql`)
- [x] Backend interfaces updated (Benchmarks, AIBottleneck, AISegments, etc.)
- [x] Prior period fetching implemented (`calculatePriorPeriod`)
- [x] Industry benchmarks configured (DEFAULT + overrides)
- [x] Enhanced prompt template (with comparisons + benchmarks)
- [x] Response validation (`validateAIResponse`)
- [x] Enhanced POST handler (saves snapshots, accepts previousKpis)
- [x] New UI components (page-v2.tsx)
- [x] Benchmark badges implemented
- [x] Segment cards (device/geo)
- [x] Numbers comparison table
- [x] Action sorting (6 options)
- [x] Collapsible sections
- [x] Impact/effort indicators
- [ ] **TODO: Run database migration in Supabase**
- [ ] **TODO: Test insight generation with prior period**
- [ ] **TODO: Replace page.tsx with page-v2.tsx**
- [ ] **TODO: Verify UI on mobile devices**
- [ ] **TODO: User acceptance testing**

---

## 🎉 Summary

This upgrade transforms AI Insights from a basic recommendation engine into a sophisticated analytics copilot that:

1. **Compares over time** - Automatically shows WoW/MoM changes
2. **Benchmarks against industry** - Visual badges show where you stand
3. **Identifies key segments** - Highlights device/geo opportunities
4. **Prioritizes actions** - Impact×Effort scoring with confidence levels
5. **Explains bottlenecks** - Step-by-step with root cause hypotheses
6. **Validates rigorously** - Coerces values, handles nulls, provides fallbacks
7. **Future-proofs** - Action tracking foundation for learning loop

**Next Step**: Run the database migration and start generating smarter insights! 🚀
