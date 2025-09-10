-- Test the updated schema with client_id support

-- First, apply the migration to add client_id
-- \i database/migrations/add_client_id_to_companies.sql

-- Test inserting a company with client_id
INSERT INTO companies (name, slug, posthog_project_id, posthog_api_key_encrypted, posthog_client_id)
VALUES ('Test Company', 'test-company', 123456, 'encrypted_key_here', 'test-client-v1');

-- Test the unique constraint (this should fail if we try to insert the same project_id + client_id combo)
-- INSERT INTO companies (name, slug, posthog_project_id, posthog_api_key_encrypted, posthog_client_id)
-- VALUES ('Another Company', 'another-company', 123456, 'another_key', 'test-client-v1');

-- Test querying with client_id
SELECT id, name, slug, posthog_project_id, posthog_client_id 
FROM companies 
WHERE posthog_client_id = 'test-client-v1';

-- Test the company dashboard view includes client_id
SELECT id, name, posthog_project_id, posthog_client_id 
FROM company_dashboard 
WHERE posthog_client_id IS NOT NULL;

-- Clean up test data
-- DELETE FROM companies WHERE slug = 'test-company';
