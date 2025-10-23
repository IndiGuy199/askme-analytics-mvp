'use client';

import React, { useState, useEffect } from 'react';

interface FunnelStep {
  name: string;
  count: number;
}

interface FunnelData {
  steps: FunnelStep[];
  conversion_rate: number;
}

interface FunnelChartProps {
  clientId?: string;
  companyId?: string;
  dateRange: string;
  funnelType: 'profile' | 'renewal';
}

export default function FunnelChart({ clientId, companyId, dateRange, funnelType }: FunnelChartProps) {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchFunnelData();
  }, [mounted, clientId, companyId, dateRange, funnelType]);

  const fetchFunnelData = async () => {
    try {
      setLoading(true);
      
      // Build query params - prefer companyId if provided (for impersonation)
      const params = new URLSearchParams();
      if (companyId) {
        params.append('companyId', companyId);
      } else if (clientId) {
        params.append('clientId', clientId);
      }
      params.append('dateRange', dateRange);
      
      const response = await fetch(`/api/analytics/preview?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch funnel data');
      }

      const data = await response.json();
      
      console.log('🔍 Full API response:', data);
      console.log('🎯 Funnel type requested:', funnelType);
      
      // API returns { kpis: { funnel: {...}, renewalFunnel: {...} } }
      const kpis = data.kpis || data;
      const funnel = funnelType === 'profile' ? kpis.funnel : kpis.renewalFunnel;
      
      console.log('📊 KPIs object:', kpis);
      console.log('📊 Extracted funnel data:', funnel);
      console.log('📝 Funnel steps:', funnel?.steps);
      console.log('📈 Conversion rate:', funnel?.conversion_rate);
      
      setFunnelData(funnel || { steps: [], conversion_rate: 0 });
    } catch (error) {
      console.error('Error fetching funnel data:', error);
      setFunnelData({ steps: [], conversion_rate: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-48 bg-gray-50 rounded-lg flex items-center justify-center">
        <span className="text-gray-400 text-sm">Initializing...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-48 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <span className="text-gray-400 text-sm">Loading funnel...</span>
        </div>
      </div>
    );
  }

  console.log('🚦 Checking funnel data state:', { 
    hasFunnelData: !!funnelData, 
    hasSteps: !!funnelData?.steps,
    stepsLength: funnelData?.steps?.length,
    fullData: funnelData 
  });

  if (!funnelData || !funnelData.steps || funnelData.steps.length === 0) {
    console.log('❌ No funnel data to display');
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <div className="text-lg font-medium">No Funnel Data</div>
          <div className="text-sm">
            {funnelType === 'profile' ? 'Profile creation' : 'Renewal'} funnel data not available for this period
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Debug: {JSON.stringify({ hasFunnelData: !!funnelData, hasSteps: !!funnelData?.steps, stepsLength: funnelData?.steps?.length })}
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ Rendering funnel with', funnelData.steps.length, 'steps');

  const firstStepCount = funnelData.steps[0]?.count || 1;

  return (
    <div className="space-y-4">
      {/* Conversion Rate Display */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div>
          <div className="text-sm font-medium text-gray-600">Overall Conversion Rate</div>
          <div className="text-xs text-gray-500 mt-1">
            From {funnelData.steps[0]?.name} to {funnelData.steps[funnelData.steps.length - 1]?.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">
            {((funnelData.conversion_rate || 0) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">
            {funnelData.steps[funnelData.steps.length - 1]?.count || 0} / {firstStepCount} users
          </div>
        </div>
      </div>

      {/* Funnel Steps */}
      <div className="space-y-3 min-h-48 max-h-96 overflow-y-auto pr-2">
        {funnelData.steps.map((step: FunnelStep, index: number) => {
          const stepConversionRate = (step.count / firstStepCount) * 100;
          const dropoffFromPrevious = index > 0 
            ? ((funnelData.steps[index - 1].count - step.count) / funnelData.steps[index - 1].count) * 100
            : 0;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-start text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900 truncate pr-2" title={step.name}>
                      {step.name || `Step ${index + 1}`}
                    </span>
                  </div>
                  {index > 0 && dropoffFromPrevious > 0 && (
                    <div className="text-xs text-red-600 ml-8 mt-1">
                      ↓ {dropoffFromPrevious.toFixed(1)}% drop-off from previous step
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="font-bold text-gray-900 whitespace-nowrap">
                    {step.count.toLocaleString()} users
                  </div>
                  <div className="text-xs text-gray-500">
                    {stepConversionRate.toFixed(1)}% of total
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className={`h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2 ${
                    funnelType === 'profile' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'
                  }`}
                  style={{ width: `${Math.max(stepConversionRate, 2)}%` }}
                >
                  {stepConversionRate > 15 && (
                    <span className="text-xs font-medium text-white">
                      {stepConversionRate.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {funnelData.steps.length}
          </div>
          <div className="text-xs text-gray-500">Total Steps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {firstStepCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Started</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {(funnelData.steps[funnelData.steps.length - 1]?.count || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
      </div>
    </div>
  );
}
