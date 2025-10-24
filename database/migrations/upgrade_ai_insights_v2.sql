-- =====================================================
-- AI Insights V2 - Enhanced Schema Migration
-- =====================================================
-- This migration adds support for:
-- - Prior period comparisons
-- - Industry benchmarks
-- - Segment analysis (device/geo)
-- - Retention analysis
-- - Numbered comparison tables
-- - Action tracking with impact/effort scores
-- - Multi-language support
-- =====================================================

-- Add new columns to ai_insights table
ALTER TABLE ai_insights 
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS segments JSONB,
  ADD COLUMN IF NOT EXISTS retention_analysis JSONB,
  ADD COLUMN IF NOT EXISTS numbers_table JSONB,
  ADD COLUMN IF NOT EXISTS meta JSONB,
  ADD COLUMN IF NOT EXISTS previous_kpis_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS industry VARCHAR(50);

-- Add comments for new columns
COMMENT ON COLUMN ai_insights.summary IS '2-3 sentence summary of key changes and what they mean';
COMMENT ON COLUMN ai_insights.segments IS 'Device and geographic segment insights: { by_device, by_geo }';
COMMENT ON COLUMN ai_insights.retention_analysis IS 'Retention metrics and benchmark status: { d7_pct, benchmark_status, note }';
COMMENT ON COLUMN ai_insights.numbers_table IS 'Comparison table rows: [{ metric, current, prior, delta }]';
COMMENT ON COLUMN ai_insights.meta IS 'Metadata about the insight: { period_compared, data_gaps }';
COMMENT ON COLUMN ai_insights.previous_kpis_snapshot IS 'Prior period KPIs for comparison (same structure as kpis_snapshot)';
COMMENT ON COLUMN ai_insights.language IS 'Language code for insights (en, es, fr, etc.)';
COMMENT ON COLUMN ai_insights.industry IS 'Company industry for benchmark selection (saas, ecommerce, content, app)';

-- =====================================================
-- Drop dependent views before modifying columns
-- =====================================================
DROP VIEW IF EXISTS latest_insights;

-- Modify bottleneck column to support structured data if it's not already JSONB
-- (Old schema had it as TEXT, new schema needs JSONB for hypotheses)
DO $$ 
BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'ai_insights' AND column_name = 'bottleneck') = 'text' THEN
    
    -- Create a temporary column with JSONB type
    ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS bottleneck_new JSONB;
    
    -- Migrate old text data to structured format
    UPDATE ai_insights 
    SET bottleneck_new = jsonb_build_object(
      'step_from', NULL,
      'step_to', NULL,
      'drop_rate_pct', NULL,
      'diagnosis', bottleneck,
      'hypotheses', '[]'::jsonb
    )
    WHERE bottleneck_new IS NULL AND bottleneck IS NOT NULL;
    
    -- Drop old column and rename new one
    ALTER TABLE ai_insights DROP COLUMN bottleneck;
    ALTER TABLE ai_insights RENAME COLUMN bottleneck_new TO bottleneck;
    
    COMMENT ON COLUMN ai_insights.bottleneck IS 'Structured bottleneck analysis: { step_from, step_to, drop_rate_pct, diagnosis, hypotheses[] }';
  END IF;
END $$;

-- Modify actions column to support structured data if it's not detailed enough
-- (Old schema had simple array, new schema needs array of objects with impact/effort/confidence)
DO $$ 
BEGIN
  -- Check if actions column exists and is JSONB
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_insights' 
    AND column_name = 'actions' 
    AND data_type = 'jsonb'
  ) THEN
    -- Migrate simple string arrays to structured format for existing records
    -- Only update records where actions is a simple array of strings
    UPDATE ai_insights 
    SET actions = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'title', value,
          'why', 'Legacy action - no details available',
          'impact', 3,
          'effort', 3,
          'confidence', 0.5,
          'expected_lift_pct', NULL,
          'tag', 'funnel'
        )
      )
      FROM jsonb_array_elements_text(actions)
    )
    WHERE jsonb_typeof(actions) = 'array' 
    AND actions->0 IS NOT NULL
    AND jsonb_typeof(actions->0) = 'string'
    AND created_at < NOW();
  END IF;
END $$;

COMMENT ON COLUMN ai_insights.actions IS 'Array of action objects: [{ title, why, impact, effort, confidence, expected_lift_pct, tag }]';

-- =====================================================
-- Create action_tracking table
-- =====================================================
CREATE TABLE IF NOT EXISTS action_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_id UUID NOT NULL REFERENCES ai_insights(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_index INTEGER NOT NULL, -- Index in the actions array
  action_title TEXT NOT NULL,
  action_tag TEXT, -- funnel, mobile, content, geo, retention, performance
  
  -- User interaction
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),
  
  -- Impact tracking
  metric_before JSONB, -- { conversion_rate: 0.035, d7_retention: 0.22, etc. }
  metric_after JSONB,  -- Measured after action implementation
  impact_observed TEXT, -- User's assessment: "positive", "negative", "neutral", "too_early"
  
  -- Notes
  implementation_notes TEXT,
  results_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for action_tracking
CREATE INDEX IF NOT EXISTS idx_action_tracking_insight ON action_tracking(insight_id);
CREATE INDEX IF NOT EXISTS idx_action_tracking_company ON action_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_action_tracking_accepted ON action_tracking(accepted_at) WHERE accepted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_tracking_completed ON action_tracking(completed_at) WHERE completed_at IS NOT NULL;

-- RLS policies for action_tracking
ALTER TABLE action_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their company's action tracking" ON action_tracking;
DROP POLICY IF EXISTS "Users can track actions for their company" ON action_tracking;
DROP POLICY IF EXISTS "Users can update their company's action tracking" ON action_tracking;

-- Users can view actions for their company
CREATE POLICY "Users can view their company's action tracking"
  ON action_tracking FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can insert action tracking for their company
CREATE POLICY "Users can track actions for their company"
  ON action_tracking FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update action tracking for their company
CREATE POLICY "Users can update their company's action tracking"
  ON action_tracking FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_action_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER action_tracking_updated_at
  BEFORE UPDATE ON action_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_action_tracking_updated_at();

-- =====================================================
-- Create view for action effectiveness analysis
-- =====================================================
CREATE OR REPLACE VIEW action_effectiveness AS
SELECT 
  at.id,
  at.company_id,
  at.insight_id,
  at.action_title,
  at.action_tag,
  ai.headline as insight_headline,
  ai.date_range,
  at.accepted_at,
  at.completed_at,
  EXTRACT(EPOCH FROM (at.completed_at - at.accepted_at)) / 86400 AS days_to_complete,
  at.impact_observed,
  at.metric_before,
  at.metric_after,
  
  -- Calculate metric improvements
  CASE 
    WHEN at.metric_before IS NOT NULL AND at.metric_after IS NOT NULL THEN
      jsonb_build_object(
        'conversion_delta', 
        COALESCE((at.metric_after->>'conversion_rate')::numeric, 0) - 
        COALESCE((at.metric_before->>'conversion_rate')::numeric, 0),
        
        'retention_delta',
        COALESCE((at.metric_after->>'d7_retention')::numeric, 0) - 
        COALESCE((at.metric_before->>'d7_retention')::numeric, 0)
      )
    ELSE NULL
  END as metric_improvements,
  
  at.implementation_notes,
  at.results_notes,
  at.created_at
FROM action_tracking at
JOIN ai_insights ai ON at.insight_id = ai.id
WHERE at.completed_at IS NOT NULL;

-- Grant access to view
GRANT SELECT ON action_effectiveness TO authenticated;

-- =====================================================
-- Add indexes for better query performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ai_insights_language ON ai_insights(language);
CREATE INDEX IF NOT EXISTS idx_ai_insights_industry ON ai_insights(industry);
CREATE INDEX IF NOT EXISTS idx_ai_insights_date_range_company ON ai_insights(company_id, date_range, created_at DESC);

-- =====================================================
-- Update latest_insights view to include new fields
-- =====================================================
DROP VIEW IF EXISTS latest_insights;

CREATE VIEW latest_insights AS
SELECT DISTINCT ON (company_id, date_range)
  id,
  company_id,
  date_range,
  start_date,
  end_date,
  headline,
  summary,
  highlights,
  bottleneck,
  segments,
  retention_analysis,
  actions,
  numbers_table,
  meta,
  quality_score,
  user_feedback,
  model_used,
  generation_time_ms,
  total_cost_cents,
  language,
  industry,
  created_at,
  updated_at
FROM ai_insights
WHERE status != 'archived'
ORDER BY company_id, date_range, created_at DESC;

GRANT SELECT ON latest_insights TO authenticated;

-- =====================================================
-- Migration complete
-- =====================================================
-- Summary of changes:
-- ✅ Added new columns to ai_insights table
-- ✅ Migrated bottleneck from TEXT to structured JSONB
-- ✅ Migrated actions from string[] to structured object[]
-- ✅ Created action_tracking table with RLS policies
-- ✅ Created action_effectiveness view
-- ✅ Added performance indexes
-- ✅ Updated latest_insights view
-- =====================================================
