-- Add client_id to companies table for PostHog multi-tenancy
-- This allows multiple companies to share the same PostHog project but have different client IDs

ALTER TABLE companies 
ADD COLUMN posthog_client_id VARCHAR(255);

-- Add index for efficient filtering by client_id
CREATE INDEX idx_companies_posthog_client_id ON companies(posthog_client_id);

-- Add a unique constraint on the combination of project_id and client_id
-- This ensures no duplicate client_ids within the same PostHog project
CREATE UNIQUE INDEX idx_companies_project_client ON companies(posthog_project_id, posthog_client_id) 
WHERE posthog_project_id IS NOT NULL AND posthog_client_id IS NOT NULL;

-- Comment explaining the new field
COMMENT ON COLUMN companies.posthog_client_id IS 'Client ID for PostHog filtering - allows multiple companies to share the same PostHog project';
