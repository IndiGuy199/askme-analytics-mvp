'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import SimpleAnalyticsCard from '../../components/SimpleAnalyticsCard';

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userCompany, setUserCompany] = useState<any>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('30d');

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
      if (!company?.posthog_client_id) {
        console.error('User company has no PostHog client ID configured');
        setLoading(false);
        return;
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">PostHog Not Configured</h2>
          <p className="text-gray-600 mb-4">
            Your company doesn't have PostHog analytics configured yet.
          </p>
          <a
            href="/onboarding/posthog"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Configure PostHog
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with client name and date range selector */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{userCompany.name} Analytics</h1>
            <p className="text-sm text-gray-500">Client ID: {userCompany.posthog_client_id}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>
      </div>

      <SimpleAnalyticsCard
        clientId={userCompany.posthog_client_id} // ← Dynamic based on user's company
        dateRange={selectedDateRange}            // ← Dynamic based on user selection
        comparisonMode="none"
      />
    </div>
  );
}
