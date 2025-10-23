'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasCustomQueries } from '@/src/config/clients';
import FunnelChart from '@/components/FunnelChart';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CustomAnalyticsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userCompany, setUserCompany] = useState<any>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('7d');
  const [funnelView, setFunnelView] = useState<'profile' | 'renewal'>('profile');
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedCompanyName, setImpersonatedCompanyName] = useState('');
  const [hasCustomAnalytics, setHasCustomAnalytics] = useState(false);

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

      // Check if super admin is impersonating
      const impersonation = user.user_metadata?.impersonation;
      let company = null;

      if (impersonation?.target_company_id) {
        // Super admin impersonating - fetch the target company directly
        console.log('🎭 Super admin impersonating company:', impersonation.target_company_id);
        
        const { data: targetCompany, error: companyError } = await supabase
          .from('companies')
          .select('id, name, slug, posthog_client_id, posthog_project_id')
          .eq('id', impersonation.target_company_id)
          .single();

        if (companyError) {
          console.error('Error fetching target company:', companyError);
          setLoading(false);
          return;
        }

        company = targetCompany;
        setIsImpersonating(true);
        setImpersonatedCompanyName(impersonation.target_company_name || targetCompany.name);
      } else {
        // Regular user - fetch their company via user relationship
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

        company = userData?.companies as any;
      }
      
      if (!company) {
        console.error('No company found');
        setLoading(false);
        return;
      }

      if (!company.posthog_client_id) {
        console.log('⚠️ No posthog_client_id configured, using company slug as client_id');
        company.posthog_client_id = company.slug || `company-${company.id}`;
      }

      // Check if this company has custom funnels configured
      const clientHasCustomFunnels = hasCustomQueries(company.posthog_client_id);
      setHasCustomAnalytics(clientHasCustomFunnels);
      
      if (!clientHasCustomFunnels) {
        console.log('⚠️ Company does not have custom funnels configured, redirecting to standard analytics');
        router.push('/analytics');
        return;
      }

      setUserCompany(company);
      console.log('[DEBUG] User company loaded:', company);
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
          <p className="text-gray-600">Loading custom analytics...</p>
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
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-red-600 text-white px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">🎭 Super Admin Mode:</span>
              <span>Viewing analytics for {impersonatedCompanyName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/analytics" className="text-blue-600 hover:text-blue-800 text-sm">
                ← Back to Standard Analytics
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Custom Product Analytics</h1>
            <p className="text-sm text-gray-500">Client ID: {userCompany.posthog_client_id}</p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-4">
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Custom Funnels</h2>
            
            {/* Funnel Type Selector - Show for all clients since standard queries include both funnels */}
            <div className="flex gap-2">
              <button
                onClick={() => setFunnelView('profile')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  funnelView === 'profile'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Profile Creation Funnel
              </button>
              <button
                onClick={() => setFunnelView('renewal')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  funnelView === 'renewal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Renewal Funnel
              </button>
            </div>
          </div>

          {/* Render FunnelChart Component */}
          <FunnelChart 
            companyId={isImpersonating ? userCompany.id : undefined}
            clientId={!isImpersonating ? userCompany.posthog_client_id : undefined}
            dateRange={selectedDateRange}
            funnelType={funnelView}
          />
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">About Custom Product Analytics</h3>
              <p className="text-sm text-gray-600">
                This page displays custom conversion funnels and product-specific metrics unique to your business. 
                Custom funnels are configured per client and track user journeys through your specific workflows.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                For standard web analytics (visitors, page views, traffic sources, etc.), visit the{' '}
                <Link href="/analytics" className="text-blue-600 hover:underline font-medium">
                  Standard Web Analytics
                </Link>{' '}
                page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
