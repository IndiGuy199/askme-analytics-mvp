-- Sample data for development and testing
-- Run this after schema.sql to populate with test data

-- Additional test companies
DO $$
DECLARE
    demo_company_id UUID;
    test_company_id UUID;
    demo_user_id UUID;
    test_user_id UUID;
    demo_client_id UUID;
    test_client_id UUID;
BEGIN
    -- Insert demo company
    INSERT INTO companies (name, slug, billing_email, is_active)
    VALUES ('Demo Company', 'demo-company', 'billing@demo.com', true)
    RETURNING id INTO demo_company_id;
    
    -- Insert test company (inactive)
    INSERT INTO companies (name, slug, billing_email, is_active)
    VALUES ('Test Company', 'test-company', 'test@test.com', false)
    RETURNING id INTO test_company_id;
    
    -- Insert users for demo company
    INSERT INTO users (company_id, email, name, role, email_verified_at)
    VALUES 
    (demo_company_id, 'admin@demo.com', 'Demo Admin', 'owner', CURRENT_TIMESTAMP),
    (demo_company_id, 'user@demo.com', 'Demo User', 'member', CURRENT_TIMESTAMP)
    RETURNING id INTO demo_user_id;
    
    -- Insert user for test company
    INSERT INTO users (company_id, email, name, role, email_verified_at)
    VALUES (test_company_id, 'admin@test.com', 'Test Admin', 'owner', CURRENT_TIMESTAMP)
    RETURNING id INTO test_user_id;
    
    -- Create subscriptions
    INSERT INTO subscriptions (company_id, plan_id, status, current_period_start, current_period_end)
    VALUES 
    (demo_company_id, 'basic', 'active', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP + INTERVAL '15 days'),
    (test_company_id, 'free', 'active', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '25 days');
    
    -- Insert analytics clients
    INSERT INTO clients (company_id, client_id, name, project_id, is_active)
    VALUES 
    (demo_company_id, 'demo-client', 'Demo Client Analytics', 100001, true),
    (test_company_id, 'test-client', 'Test Client Analytics', 100002, false)
    RETURNING id INTO demo_client_id, test_client_id;
    
    -- Add sample payments for demo company
    INSERT INTO payments (company_id, provider, provider_payment_id, amount_cents, currency, status, plan_id, occurred_at)
    VALUES 
    (demo_company_id, 'stripe', 'pi_demo_12345', 2900, 'usd', 'succeeded', 'basic', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    (demo_company_id, 'stripe', 'pi_demo_12346', 2900, 'usd', 'succeeded', 'basic', CURRENT_TIMESTAMP - INTERVAL '45 days');
    
    -- Add usage tracking
    INSERT INTO usage_tracking (company_id, metric, value, period_start, period_end) VALUES
    (demo_company_id, 'projects', 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month'),
    (demo_company_id, 'team_members', 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month'),
    (test_company_id, 'projects', 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month'),
    (test_company_id, 'team_members', 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month');
    
END $$;

-- Sample analytics snapshots (last 7 days of data)
DO $$
DECLARE
    askme_client_id UUID;
    demo_client_id UUID;
    snapshot_date DATE;
BEGIN
    -- Get client IDs from existing companies
    SELECT c.id INTO askme_client_id 
    FROM clients c 
    JOIN companies co ON c.company_id = co.id 
    WHERE c.client_id = 'askme-ai-app';
    
    SELECT c.id INTO demo_client_id 
    FROM clients c 
    JOIN companies co ON c.company_id = co.id 
    WHERE c.client_id = 'demo-client';
    
    -- Insert sample snapshots for the last 7 days
    FOR i IN 0..6 LOOP
        snapshot_date := CURRENT_DATE - i;
        
        -- AskMe AI App snapshots
        INSERT INTO analytics_snapshots (
            client_id, date_range, snapshot_date,
            unique_users, pageviews, conversion_rate,
            d7_retention, d30_retention,
            traffic_series, funnel_steps, device_mix,
            countries, cities, lifecycle_series
        ) VALUES (
            askme_client_id, '7d', snapshot_date,
            1250 + (i * 50), 3200 + (i * 120), 0.0435 + (i * 0.002),
            0.1234, 0.0876,
            '[{"date":"' || snapshot_date || '","users":' || (500 + i * 20) || ',"pageviews":' || (1200 + i * 45) || '}]'::jsonb,
            '[{"step":"Landing","users":1000},{"step":"Signup","users":350},{"step":"First Query","users":280}]'::jsonb,
            '{"Desktop":{"percentage":65.2},"Mobile":{"percentage":28.4},"Tablet":{"percentage":6.4}}'::jsonb,
            '{"US":{"percentage":45.2},"UK":{"percentage":18.7},"CA":{"percentage":12.3}}'::jsonb,
            '{"San Francisco":{"percentage":15.2},"New York":{"percentage":12.8},"London":{"percentage":8.5}}'::jsonb,
            '[{"category":"New","users":450},{"category":"Returning","users":600},{"category":"Resurrecting","users":150},{"category":"Dormant","users":50}]'::jsonb
        );
        
        -- Demo client snapshots (smaller numbers)
        INSERT INTO analytics_snapshots (
            client_id, date_range, snapshot_date,
            unique_users, pageviews, conversion_rate,
            d7_retention, d30_retention,
            traffic_series, funnel_steps, device_mix
        ) VALUES (
            demo_client_id, '7d', snapshot_date,
            250 + (i * 15), 650 + (i * 25), 0.0234 + (i * 0.001),
            0.0987, 0.0654,
            '[{"date":"' || snapshot_date || '","users":' || (100 + i * 5) || ',"pageviews":' || (250 + i * 10) || '}]'::jsonb,
            '[{"step":"Landing","users":200},{"step":"Signup","users":65},{"step":"Purchase","users":45}]'::jsonb,
            '{"Desktop":{"percentage":58.3},"Mobile":{"percentage":35.1},"Tablet":{"percentage":6.6}}'::jsonb
        );
    END LOOP;
END $$;

-- Sample AI insights
DO $$
DECLARE
    askme_client_id UUID;
    latest_snapshot_id UUID;
BEGIN
    SELECT id INTO askme_client_id FROM clients WHERE client_id = 'askme-ai-app';
    
    -- Get the latest snapshot
    SELECT id INTO latest_snapshot_id 
    FROM analytics_snapshots 
    WHERE client_id = askme_client_id 
    ORDER BY snapshot_date DESC 
    LIMIT 1;
    
    INSERT INTO ai_insights (
        client_id, snapshot_id,
        headline, highlights, bottleneck, actions,
        model_used, tokens_used, processing_time_ms
    ) VALUES (
        askme_client_id, latest_snapshot_id,
        'Strong user growth with conversion opportunity',
        '["7-day unique users increased by 15.2%", "Mobile traffic growing faster than desktop", "Retention rates above industry average"]'::jsonb,
        'Signup to first query conversion could be improved - currently at 80%',
        '["Implement onboarding tutorial", "Add email nurture sequence for new signups", "A/B test simplified query interface"]'::jsonb,
        'gpt-4o-mini', 1250, 850
    );
END $$;

-- Sample email digests
DO $$
DECLARE
    askme_client_id UUID;
    latest_snapshot_id UUID;
BEGIN
    SELECT id INTO askme_client_id FROM clients WHERE client_id = 'askme-ai-app';
    SELECT id INTO latest_snapshot_id 
    FROM analytics_snapshots 
    WHERE client_id = askme_client_id 
    ORDER BY snapshot_date DESC 
    LIMIT 1;
    
    INSERT INTO email_digests (
        client_id, snapshot_id,
        recipients, subject, status,
        message_id, sent_at
    ) VALUES (
        askme_client_id, latest_snapshot_id,
        '{"analytics@askme-ai.com", "team@askme-ai.com"}',
        'Weekly Analytics Digest - Week of ' || TO_CHAR(CURRENT_DATE, 'Mon DD, YYYY'),
        'sent',
        'msg_' || generate_random_uuid()::text,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    );
END $$;

-- Sample query configurations
DO $$
DECLARE
    askme_client_id UUID;
BEGIN
    SELECT id INTO askme_client_id FROM clients WHERE client_id = 'askme-ai-app';
    
    INSERT INTO query_configurations (client_id, query_type, query_config) VALUES
    (askme_client_id, 'traffic', '{"kind":"TrendsQuery","series":[{"kind":"EventsNode","event":"$pageview"}],"trendsFilter":{"display":"ActionsLineGraph"},"dateRange":{"date_from":"-7d"}}'::jsonb),
    (askme_client_id, 'funnel', '{"kind":"FunnelsQuery","series":[{"kind":"EventsNode","event":"$pageview"},{"kind":"EventsNode","event":"signup"},{"kind":"EventsNode","event":"first_query"}],"dateRange":{"date_from":"-7d"}}'::jsonb),
    (askme_client_id, 'retention', '{"kind":"RetentionQuery","retentionFilter":{"period":"Day","retention_type":"retention_first_time"},"dateRange":{"date_from":"-30d"}}'::jsonb);
END $$;
