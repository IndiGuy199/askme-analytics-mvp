'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import SimpleAnalyticsCard from '../../components/SimpleAnalyticsCard';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userCompany, setUserCompany] = useState<any>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('7d'); // 🔄 Changed: Default to 7 days
  const [comparisonMode, setComparisonMode] = useState('none'); // No comparison by default

  useEffect(() => {
    setMounted(true);
    fetchUserCompany();
  }, []);

  const fetchUserCompany = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('No authenticated user:', userError);
        setLoading(false);
        return;
      }

      // Get user's company information
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select(`
          id,
          company_id,
          companies!inner (
            id,
            name,
            slug,
            posthog_client_id,
            posthog_project_id
          )
        `)
        .eq('id', user.id)
        .single();

      if (userDataError) {
        console.error('Error fetching user data:', userDataError);
        setLoading(false);
        return;
      }

      const company = userData?.companies as any;
      
      // With the new system, we can use the company's slug or ID as the client_id
      // even if posthog_client_id is not explicitly configured
      if (!company) {
        console.error('User has no company associated');
        setLoading(false);
        return;
      }

      // Use posthog_client_id if available, otherwise fall back to company slug
      if (!company.posthog_client_id) {
        console.log('⚠️ No posthog_client_id configured, using company slug as client_id');
        company.posthog_client_id = company.slug || `company-${company.id}`;
      }

      setUserCompany(company);
      console.log('User company loaded:', userData.companies);
    } catch (error) {
      console.error('Error fetching user company:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userCompany) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Company Not Found</h2>
          <p className="text-gray-600 mb-4">
            Your account is not associated with a company yet. Please contact support or complete onboarding.
          </p>
          <a
            href="/onboarding/company"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Complete Onboarding
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with client name and controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Standard Web Analytics</h1>
            <p className="text-sm text-gray-500">
              {userCompany.name} • Client ID: {userCompany.posthog_client_id}
            </p>
            <Link 
              href="/custom-analytics"
              className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1"
            >
              View Custom Product Analytics →
            </Link>
          </div>
          
          {/* 🆕 NEW: Combined Controls */}
          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Date Range:</label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            {/* 🆕 NEW: Comparison Mode Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Compare:</label>
              <select
                value={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">No comparison</option>
                <option value="previous">Previous period</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <SimpleAnalyticsCard
        clientId={userCompany.posthog_client_id}
        dateRange={selectedDateRange}
        comparisonMode={comparisonMode} // 🆕 Pass comparison mode
      />
    </div>
  );
}
