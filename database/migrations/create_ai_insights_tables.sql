-- Create tables for storing AI-generated insights and analytics snapshots
-- This allows us to save and leverage insights over time

-- AI Insights table - stores generated insights from OpenAI
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Time period and context
    date_range VARCHAR(20) NOT NULL, -- '7d', '30d', '90d', etc.
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- AI-generated content (stored as JSON for flexibility)
    headline TEXT,
    highlights JSONB, -- Array of highlight strings
    bottleneck TEXT,
    actions JSONB, -- Array of action recommendations
    
    -- Raw KPI data at time of insight generation
    kpis_snapshot JSONB,
    
    -- Metadata
    model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
    generation_time_ms INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost_cents DECIMAL(10, 4),
    
    -- Status and quality
    status VARCHAR(20) DEFAULT 'generated', -- 'generated', 'reviewed', 'archived'
    quality_score DECIMAL(3, 2), -- User rating 0-5
    user_feedback TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Analytics Snapshots table - stores raw KPI data for historical comparison
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Time period
    date_range VARCHAR(20) NOT NULL, -- '7d', '30d', '90d', etc.
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- KPI data (stored as JSON for flexibility)
    traffic_data JSONB, -- pageviews, unique_users, series
    funnel_data JSONB, -- steps, conversion_rate, etc.
    lifecycle_data JSONB, -- new, returning, resurrecting, dormant
    device_data JSONB, -- device_mix
    retention_data JSONB, -- d7_retention, values
    geography_data JSONB, -- countries, cities
    
    -- Aggregated metrics for quick queries
    total_pageviews INTEGER,
    unique_users INTEGER,
    conversion_rate DECIMAL(5, 4),
    d7_retention DECIMAL(5, 4),
    
    -- Metadata
    data_source VARCHAR(50) DEFAULT 'posthog',
    client_id VARCHAR(255),
    posthog_project_id INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_snapshot_date_range CHECK (end_date > start_date)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_company_date 
    ON ai_insights(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_date_range 
    ON ai_insights(company_id, date_range, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_status 
    ON ai_insights(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_company_date 
    ON analytics_snapshots(company_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date_range 
    ON analytics_snapshots(company_id, date_range, snapshot_date DESC);

-- RLS Policies
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view insights for their own company
CREATE POLICY ai_insights_select_policy ON ai_insights
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Service role can insert insights (for API)
CREATE POLICY ai_insights_insert_policy ON ai_insights
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can update their own company's insights (for ratings/feedback)
CREATE POLICY ai_insights_update_policy ON ai_insights
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can view snapshots for their own company
CREATE POLICY analytics_snapshots_select_policy ON analytics_snapshots
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Service role can insert snapshots (for API)
CREATE POLICY analytics_snapshots_insert_policy ON analytics_snapshots
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on ai_insights
CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON ai_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for latest insights per company
CREATE OR REPLACE VIEW latest_insights AS
SELECT DISTINCT ON (company_id, date_range)
    id,
    company_id,
    date_range,
    start_date,
    end_date,
    headline,
    highlights,
    bottleneck,
    actions,
    quality_score,
    created_at
FROM ai_insights
WHERE status != 'archived'
ORDER BY company_id, date_range, created_at DESC;

-- Comments for documentation
COMMENT ON TABLE ai_insights IS 'Stores AI-generated insights from OpenAI based on analytics data';
COMMENT ON TABLE analytics_snapshots IS 'Stores historical snapshots of analytics KPIs for comparison and trend analysis';
COMMENT ON COLUMN ai_insights.kpis_snapshot IS 'Complete KPI data at the time of insight generation for reproducibility';
COMMENT ON COLUMN ai_insights.quality_score IS 'User rating of insight quality, 0-5 scale';
COMMENT ON COLUMN analytics_snapshots.snapshot_date IS 'When this snapshot was captured, different from the data period';
