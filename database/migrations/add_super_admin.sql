-- Add super admin functionality
-- This migration adds the is_super_admin column and impersonation_logs table

-- Add is_super_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Create index for faster super admin lookups
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;

-- Create impersonation log table for audit trail
CREATE TABLE IF NOT EXISTS impersonation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    super_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_super_admin FOREIGN KEY (super_admin_id) REFERENCES users(id),
    CONSTRAINT fk_target_company FOREIGN KEY (target_company_id) REFERENCES companies(id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_impersonation_super_admin ON impersonation_logs(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_company ON impersonation_logs(target_company_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_started ON impersonation_logs(started_at);

-- Add comments for documentation
COMMENT ON COLUMN users.is_super_admin IS 'Super admin can impersonate any company for troubleshooting';
COMMENT ON TABLE impersonation_logs IS 'Audit trail of super admin impersonations for security and compliance';
COMMENT ON COLUMN impersonation_logs.super_admin_id IS 'The super admin user who initiated the impersonation';
COMMENT ON COLUMN impersonation_logs.target_company_id IS 'The company being impersonated';
COMMENT ON COLUMN impersonation_logs.started_at IS 'When the impersonation session started';
COMMENT ON COLUMN impersonation_logs.ended_at IS 'When the impersonation session ended (NULL if still active)';
COMMENT ON COLUMN impersonation_logs.reason IS 'Optional reason for the impersonation (e.g., troubleshooting)';

-- Grant super admin access to specific user
-- Replace with your actual super admin email
DO $$
BEGIN
    -- Check if user exists first
    IF EXISTS (SELECT 1 FROM users WHERE email = 'proservices330@gmail.com') THEN
        UPDATE users 
        SET is_super_admin = true 
        WHERE email = 'proservices330@gmail.com';
        RAISE NOTICE 'Super admin access granted to proservices330@gmail.com';
    ELSE
        -- If user doesn't exist, insert them
        INSERT INTO users (id, email, name, role, is_super_admin, is_active)
        VALUES (
            uuid_generate_v4(),
            'proservices330@gmail.com',
            'Super Admin',
            'owner',
            true,
            true
        )
        ON CONFLICT (email) DO UPDATE SET is_super_admin = true;
        RAISE NOTICE 'Super admin user created: proservices330@gmail.com';
    END IF;
END $$;

-- Enable RLS on impersonation_logs table
ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Only super admins can view impersonation logs
CREATE POLICY "Super admins can view all impersonation logs"
ON impersonation_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = true
    )
);

-- Create RLS policy: Only super admins can insert impersonation logs
CREATE POLICY "Super admins can create impersonation logs"
ON impersonation_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = true
    )
);

-- Create RLS policy: Only super admins can update impersonation logs
CREATE POLICY "Super admins can update impersonation logs"
ON impersonation_logs
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = true
    )
);

-- Verification queries (run these to check the migration worked)
-- SELECT email, is_super_admin FROM users WHERE is_super_admin = true;
-- SELECT * FROM impersonation_logs ORDER BY started_at DESC LIMIT 10;
