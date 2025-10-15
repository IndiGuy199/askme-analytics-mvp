-- Insert Ask Me AI company with PostHog configuration
INSERT INTO companies (
    name, 
    slug, 
    billing_email,
    posthog_project_id,
    posthog_api_key_encrypted,
    posthog_client_id,
    is_active
) VALUES (
    'Ask Me AI', 
    'ask-me-ai', 
    'billing@askme-ai.com',
    202299,
    'phx_tmki9RqkURHkZJxHnFErIij6C8zcnStWQ4HajDA51GY1QFY',
    'askme-ai-app',
    true
) ON CONFLICT (slug) DO UPDATE SET
    posthog_project_id = EXCLUDED.posthog_project_id,
    posthog_api_key_encrypted = EXCLUDED.posthog_api_key_encrypted,
    posthog_client_id = EXCLUDED.posthog_client_id,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the company was created/updated
SELECT id, name, slug, posthog_client_id, posthog_project_id 
FROM companies 
WHERE slug = 'ask-me-ai' OR posthog_client_id = 'askme-ai-app';
