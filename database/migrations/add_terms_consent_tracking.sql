-- Add consent tracking fields to users table
-- Run this migration to add Terms & Conditions acceptance tracking

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS consent_ip_address INET;

-- Add index for querying users by consent status
CREATE INDEX IF NOT EXISTS idx_users_terms_accepted 
ON users(terms_accepted_at) 
WHERE terms_accepted_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.terms_accepted_at IS 'Timestamp when user accepted Terms and Conditions';
COMMENT ON COLUMN users.terms_version IS 'Version of Terms and Conditions accepted by user';
COMMENT ON COLUMN users.consent_ip_address IS 'IP address from which consent was given (for legal compliance)';
