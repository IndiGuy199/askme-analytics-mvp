-- AskMe Analytics MVP Database Schema - Simplified
-- PostgreSQL compatible schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table - represents organizations using the platform WITH PostHog integration
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    billing_email VARCHAR(255),
    
    -- PostHog integration (moved from clients table)
    posthog_project_id INTEGER, -- PostHog project ID
    posthog_api_key_encrypted TEXT, -- Encrypted PostHog API key
    posthog_client_id VARCHAR(255), -- Client ID for filtering within shared PostHog projects
    
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table - Supabase auth ready
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Matches Supabase auth.users.id
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Plans table - three tiers only
CREATE TABLE plans (
    id VARCHAR(50) PRIMARY KEY, -- 'basic', 'premium', 'enterprise'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    interval VARCHAR(10) NOT NULL DEFAULT 'month', -- 'month' | 'year'
    
    -- Feature entitlements (simplified)
    max_team_members INTEGER NOT NULL DEFAULT 1,
    ai_insights BOOLEAN NOT NULL DEFAULT false,
    slack_integration BOOLEAN NOT NULL DEFAULT false,
    email_digest BOOLEAN NOT NULL DEFAULT false,
    priority_support BOOLEAN NOT NULL DEFAULT false,
    
    is_popular BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
    
    status VARCHAR(20) NOT NULL DEFAULT 'trialing', -- 'trialing'|'active'|'past_due'|'canceled'
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Stripe integration only
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_id) WHERE status IN ('active', 'trialing', 'past_due')
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    provider VARCHAR(20) NOT NULL DEFAULT 'stripe',
    provider_payment_id TEXT NOT NULL,
    
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(20) NOT NULL, -- 'succeeded'|'pending'|'failed'|'refunded'
    
    plan_id VARCHAR(50) REFERENCES plans(id),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (provider, provider_payment_id)
);

-- Email recipients for notifications (directly linked to company)
CREATE TABLE email_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics snapshots - directly linked to company
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    date_range VARCHAR(10) NOT NULL, -- '7d', '30d'
    snapshot_date DATE NOT NULL,
    
    -- Core metrics
    unique_users INTEGER DEFAULT 0,
    pageviews INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    
    -- JSON data for flexibility
    traffic_data JSONB,
    funnel_data JSONB,
    retention_data JSONB,
    device_data JSONB,
    geo_data JSONB,
    lifecycle_data JSONB,
    
    errors JSONB DEFAULT '{}',
    comparison_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_id, date_range, snapshot_date)
);

-- AI insights - directly linked to company
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    snapshot_id UUID REFERENCES analytics_snapshots(id) ON DELETE CASCADE,
    
    headline TEXT,
    summary TEXT,
    recommendations JSONB,
    
    model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
    tokens_used INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invites table - team invitations
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Query configurations - store PostHog queries per company
CREATE TABLE query_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    query_type VARCHAR(50) NOT NULL, -- 'traffic', 'funnel', 'retention', 'deviceMix', 'geography', 'lifecycle'
    query_name VARCHAR(100) NOT NULL,
    query_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, query_type)
);

-- Email digests - directly linked to company
CREATE TABLE email_digests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    snapshot_id UUID REFERENCES analytics_snapshots(id) ON DELETE SET NULL,
    
    recipients TEXT[],
    subject VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Essential indexes
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_posthog_client_id ON companies(posthog_client_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);

-- Unique constraint for PostHog project + client ID combination
CREATE UNIQUE INDEX idx_companies_project_client ON companies(posthog_project_id, posthog_client_id) 
WHERE posthog_project_id IS NOT NULL AND posthog_client_id IS NOT NULL;
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_analytics_snapshots_company_date ON analytics_snapshots(company_id, snapshot_date DESC);
CREATE INDEX idx_ai_insights_company_created ON ai_insights(company_id, created_at DESC);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_company_email ON invites(company_id, email);
CREATE INDEX idx_query_configurations_company_type ON query_configurations(company_id, query_type);

-- RLS for Supabase
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Simplified policies to avoid recursion

-- Companies: Allow authenticated users to view and create companies
CREATE POLICY "Authenticated users can manage companies" ON companies
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Users: Allow users full access to user records (they'll be filtered by application logic)
CREATE POLICY "Authenticated users can manage users" ON users
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Simplified policies for all other tables to avoid recursion
CREATE POLICY "Authenticated users can view subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view payments" ON payments
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage analytics" ON analytics_snapshots
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage AI insights" ON ai_insights
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage email digests" ON email_digests
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view plans" ON plans
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage email recipients" ON email_recipients
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage invites" ON invites
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage query configurations" ON query_configurations
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function for trial management
CREATE OR REPLACE FUNCTION start_trial(
    p_company_id UUID,
    p_plan_id VARCHAR(50),
    p_trial_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    subscription_id UUID;
BEGIN
    INSERT INTO subscriptions (
        company_id,
        plan_id,
        status,
        trial_end,
        current_period_start,
        current_period_end
    ) VALUES (
        p_company_id,
        p_plan_id,
        'trialing',
        CURRENT_TIMESTAMP + (p_trial_days || ' days')::INTERVAL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + (p_trial_days || ' days')::INTERVAL
    )
    ON CONFLICT (company_id) WHERE status IN ('active', 'trialing', 'past_due')
    DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        trial_end = EXCLUDED.trial_end,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO subscription_id;
    
    RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert three subscription plans
INSERT INTO plans (id, name, description, price_cents, max_team_members, ai_insights, slack_integration, email_digest, priority_support, is_popular, sort_order) VALUES
('basic', 'Basic', 'Essential analytics for growing teams', 3900, 2, true, false, true, false, false, 1),
('premium', 'Premium', 'Advanced analytics with AI insights', 7900, 6, true, true, true, true, true, 2),
('enterprise', 'Enterprise', 'Full-featured analytics for large organizations', 29900, -1, true, true, true, true, false, 3);

-- Insert yearly variants (17% discount)
INSERT INTO plans (id, name, description, price_cents, currency, interval, max_team_members, ai_insights, slack_integration, email_digest, priority_support, sort_order) VALUES
('basic_yearly', 'Basic (Yearly)', 'Essential analytics - 2 months free', 39000, 'usd', 'year', 2, true, false, true, false, 4),
('premium_yearly', 'Premium (Yearly)', 'Advanced analytics - 2 months free', 79000, 'usd', 'year', 6, true, true, true, true, 5),
('enterprise_yearly', 'Enterprise (Yearly)', 'Full-featured analytics - 2 months free', 299000, 'usd', 'year', -1, true, true, true, true, 6);

-- Company dashboard view
CREATE VIEW company_dashboard AS
SELECT 
    co.id,
    co.name,
    co.slug,
    co.posthog_project_id,
    co.posthog_client_id,
    co.is_active,
    co.trial_ends_at,
    
    s.status as subscription_status,
    s.current_period_end,
    s.trial_end,
    p.name as plan_name,
    p.price_cents,
    p.interval,
    
    -- Plan features
    p.max_team_members,
    p.ai_insights,
    p.slack_integration,
    p.email_digest,
    p.priority_support,
    
    -- Usage counts
    (SELECT COUNT(*) FROM users WHERE company_id = co.id AND is_active = true) as team_members,
    (SELECT COUNT(*) FROM analytics_snapshots WHERE company_id = co.id AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days') as snapshots_this_month,
    
    co.created_at
FROM companies co
LEFT JOIN subscriptions s ON co.id = s.company_id AND s.status IN ('active', 'trialing', 'past_due')
LEFT JOIN plans p ON s.plan_id = p.id;

-- Create sample company
DO $$
DECLARE
    askme_company_id UUID;
BEGIN
    -- Create company with PostHog integration
    INSERT INTO companies (name, slug, billing_email, posthog_project_id, trial_ends_at)
    VALUES ('AskMe AI', 'askme-ai', 'billing@askme-ai.com', 202299, CURRENT_TIMESTAMP + INTERVAL '30 days')
    RETURNING id INTO askme_company_id;
    
    -- Start premium trial
    PERFORM start_trial(askme_company_id, 'premium', 30);
    
    -- Add email recipients
    INSERT INTO email_recipients (company_id, email) VALUES
    (askme_company_id, 'analytics@askme-ai.com'),
    (askme_company_id, 'team@askme-ai.com');
    
END $$;

-- Comments
COMMENT ON TABLE companies IS 'Organizations with PostHog integration and billing';
COMMENT ON TABLE users IS 'Users linked to Supabase auth with magic link support';
COMMENT ON TABLE plans IS 'Three subscription tiers: basic, premium, enterprise';
COMMENT ON TABLE subscriptions IS 'Billing subscriptions with flexible trial periods';
COMMENT ON TABLE analytics_snapshots IS 'Analytics data directly linked to companies';
COMMENT ON FUNCTION start_trial IS 'Start trial for any plan with custom duration';
