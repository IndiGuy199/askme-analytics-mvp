'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import RevenueByChannelCard from '@/components/analytics/RevenueByChannelCard';
import TopRevenueItemsCard from '@/components/analytics/TopRevenueItemsCard';
import PostHogIdentifier from '@/components/PostHogIdentifier';
import Link from 'next/link';
import { ArrowLeft, Shield, X } from 'lucide-react';

export default function RevenueAnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userCompany, setUserCompany] = useState<any>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [comparisonMode, setComparisonMode] = useState('none');
  const [impersonationInfo, setImpersonationInfo] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchUserCompany();
  }, []);

  const fetchUserCompany = async () => {
    try {
      const supabase = createClient();
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('No authenticated user:', userError);
        setLoading(false);
        return;
      }

      const impersonation = user.user_metadata?.impersonation;
      
      let company = null;
      
      if (impersonation?.target_company_id) {
        const targetCompanyId = impersonation.target_company_id;
        
        setImpersonationInfo({
          isImpersonating: true,
          targetCompanyId: impersonation.target_company_id,
          startedAt: impersonation.started_at
        });

        const { data: targetCompany, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', targetCompanyId)
          .single();
        
        if (companyError) {
          console.error('Error fetching target company:', companyError);
          setLoading(false);
          return;
        }
        
        company = targetCompany;
      } else {
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select(`
            id,
            company_id,
            is_super_admin,
            companies (
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

        company = userData?.companies as any;
      }

      if (!company) {
        console.error('User has no company associated');
        setLoading(false);
        return;
      }

      setUserCompany(company);
    } catch (error) {
      console.error('Error fetching user company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndImpersonation = async () => {
    try {
      await fetch('/api/admin/impersonate', { method: 'DELETE' });
      window.location.href = '/admin';
    } catch (error) {
      console.error('Error ending impersonation:', error);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading revenue analytics...</p>
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
      <PostHogIdentifier />
      
      {/* Impersonation Banner */}
      {impersonationInfo?.isImpersonating && (
        <div className="bg-red-600 text-white px-4 sm:px-6 py-3 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <Shield className="h-5 w-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block sm:inline truncate">
                    Super Admin Mode: Viewing {userCompany.name}
                  </span>
                  <span className="text-sm sm:text-base block sm:inline truncate"> ({userCompany.slug})</span>
                  <p className="text-xs opacity-90 mt-0.5 sm:mt-0 sm:ml-2 sm:inline-block">
                    Started {new Date(impersonationInfo.startedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleEndImpersonation}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-gray-100 font-medium transition-colors text-sm whitespace-nowrap w-full sm:w-auto"
              >
                <X className="h-4 w-4" />
                <span>End Impersonation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with controls */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Back link */}
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Revenue Analytics</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                {userCompany.name} • Client ID: {userCompany.posthog_client_id || userCompany.slug}
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:gap-3 sm:space-y-0 lg:gap-4">
              {/* Date Range Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Date Range:</label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>

              {/* Comparison Mode Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Compare:</label>
                <select
                  value={comparisonMode}
                  onChange={(e) => setComparisonMode(e.target.value)}
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No comparison</option>
                  <option value="previous">Previous period</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Charts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RevenueByChannelCard 
            companyId={userCompany.id} 
            from={selectedDateRange} 
            to="now"
            compare={comparisonMode === 'previous'}
          />
          <TopRevenueItemsCard 
            companyId={userCompany.id} 
            from={selectedDateRange} 
            to="now"
            compare={comparisonMode === 'previous'}
          />
        </div>
      </div>
    </div>
  );
}
