-- Minimal fix for RLS recursion issue
-- Only fix the core tables that are causing the infinite recursion

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Users can view company members" ON users;
DROP POLICY IF EXISTS "Users can update their profile" ON users;

-- Create simple non-recursive policies
CREATE POLICY "Authenticated users can manage companies" ON companies
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage users" ON users
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Keep the plans policy as it doesn't cause recursion
-- Anyone can view plans policy should already exist and is fine
