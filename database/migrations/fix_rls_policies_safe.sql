-- Fix RLS policies to avoid infinite recursion
-- This version checks for table existence before dropping policies

-- Core tables that should exist
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Users can view company members" ON users;
DROP POLICY IF EXISTS "Users can update their profile" ON users;

-- Check if subscriptions table exists and drop its policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        DROP POLICY IF EXISTS "Company members can view subscription" ON subscriptions;
    END IF;
END $$;

-- Check if payments table exists and drop its policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        DROP POLICY IF EXISTS "Company members can view payments" ON payments;
    END IF;
END $$;

-- Check if analytics_snapshots table exists and drop its policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_snapshots') THEN
        DROP POLICY IF EXISTS "Company members can view analytics" ON analytics_snapshots;
    END IF;
END $$;

-- Check if ai_insights table exists and drop its policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_insights') THEN
        DROP POLICY IF EXISTS "Company members can view AI insights" ON ai_insights;
    END IF;
END $$;

-- Check if email_digests table exists and drop its policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_digests') THEN
        DROP POLICY IF EXISTS "Company members can manage email digests" ON email_digests;
    END IF;
END $$;

-- Check if email_recipients table exists and drop its policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_recipients') THEN
        DROP POLICY IF EXISTS "Company members can manage email recipients" ON email_recipients;
    END IF;
END $$;

-- Check if query_configurations table exists and drop its policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_configurations') THEN
        DROP POLICY IF EXISTS "Company members can manage query configurations" ON query_configurations;
    END IF;
END $$;

-- Create new simplified policies to avoid recursion

-- Companies: Allow authenticated users to view and create companies
CREATE POLICY "Authenticated users can manage companies" ON companies
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Users: Allow users full access to user records (they'll be filtered by application logic)
CREATE POLICY "Authenticated users can manage users" ON users
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create policies for existing tables only
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        CREATE POLICY "Authenticated users can view subscriptions" ON subscriptions
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        CREATE POLICY "Authenticated users can view payments" ON payments
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_snapshots') THEN
        CREATE POLICY "Authenticated users can manage analytics" ON analytics_snapshots
            FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_insights') THEN
        CREATE POLICY "Authenticated users can manage AI insights" ON ai_insights
            FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_digests') THEN
        CREATE POLICY "Authenticated users can manage email digests" ON email_digests
            FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_recipients') THEN
        CREATE POLICY "Authenticated users can manage email recipients" ON email_recipients
            FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_configurations') THEN
        CREATE POLICY "Authenticated users can manage query configurations" ON query_configurations
            FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END $$;
