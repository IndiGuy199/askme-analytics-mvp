-- Add onboarding tracking fields to users table
-- This allows users to resume onboarding at the step they left off

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'company'; -- 'company', 'analytics', 'completed'

-- Create index for quick lookup of incomplete onboarding
CREATE INDEX IF NOT EXISTS idx_users_onboarding_incomplete 
ON users(id) WHERE onboarding_completed = false;

-- Update existing users who have a company_id and posthog setup as completed
UPDATE users u
SET 
  onboarding_completed = true,
  onboarding_step = 'completed'
FROM companies c
WHERE u.company_id = c.id 
  AND c.posthog_project_id IS NOT NULL 
  AND c.posthog_client_id IS NOT NULL;

COMMENT ON COLUMN users.onboarding_completed IS 'Whether the user has completed the full onboarding flow';
COMMENT ON COLUMN users.onboarding_step IS 'Current step in onboarding: company, analytics, or completed';
