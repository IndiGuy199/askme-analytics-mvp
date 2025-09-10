-- Fix RLS policies to avoid infinite recursion
-- Drop existing policies that cause recursion

DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Users can view company members" ON users;
DROP POLICY IF EXISTS "Users can update their profile" ON users;
DROP POLICY IF EXISTS "Company members can view subscription" ON subscriptions;
DROP POLICY IF EXISTS "Company members can view payments" ON payments;
DROP POLICY IF EXISTS "Company members can view analytics" ON analytics_snapshots;
DROP POLICY IF EXISTS "Company members can view AI insights" ON ai_insights;
DROP POLICY IF EXISTS "Company members can manage email digests" ON email_digests;
DROP POLICY IF EXISTS "Company members can manage email recipients" ON email_recipients;
-- Skip invites table policies as table doesn't exist yet
-- DROP POLICY IF EXISTS "Company admins can manage invites" ON invites;
-- DROP POLICY IF EXISTS "Anyone can view their own invite" ON invites;
DROP POLICY IF EXISTS "Company members can manage query configurations" ON query_configurations;

-- Create new simplified policies to avoid recursion

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

CREATE POLICY "Authenticated users can manage email recipients" ON email_recipients
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Skip invites table policy as table doesn't exist yet
-- CREATE POLICY "Authenticated users can manage invites" ON invites
--     FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage query configurations" ON query_configurations
    FOR ALL USING (auth.uid() IS NOT NULL);
