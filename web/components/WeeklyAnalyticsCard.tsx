'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

/** ------- Types that match /api/analytics/preview ------- */
type FunnelStep = { name: string; count: number };
type TopDrop = { from: string; to: string; dropRate: number };
type Funnel = { 
  steps: FunnelStep[]; 
  conversion_rate: number; 
  median_time_to_convert_sec: number; 
  top_drop: TopDrop;
  previous_conversion_rate?: number;
  previous_signups?: number;
};
type Traffic = { 
  series: number[]; 
  labels: string[]; 
  unique_users: number; 
  pageviews: number;
  previous_unique_users?: number;
  previous_pageviews?: number;
};
type LifecycleSeries = { new: number[]; returning: number[]; resurrecting: number[]; dormant: number[] };
type Lifecycle = { 
  labels: string[]; 
  series: LifecycleSeries;
  previous_series?: LifecycleSeries;
};
type DeviceMix = { 
  device_mix: Record<string, number>;
  previous_device_mix?: Record<string, number>;
};
type Retention = { 
  d7_retention: number; 
  values: { day: number; count: number; percentage: number }[];
  previous_d7_retention?: number;
  previous_values?: { day: number; count: number; percentage: number }[];
};
type Geography = { 
  countries: Record<string, number>;
  previous_countries?: Record<string, number>;
};
type CityGeography = { 
  cities: Record<string, { city: string; country: string; count: number }>;
  previous_cities?: Record<string, { city: string; country: string; count: number }>;
};

type KPIs = {
  traffic: Traffic;
  funnel: Funnel;
  lifecycle: Lifecycle;
  device: DeviceMix;
  retention: Retention;
  geography: Geography;
  cityGeography: CityGeography;
  meta: { errors: Record<string, string>; dateRange: string; comparisonEnabled: boolean };
};

type ApiResponse = {
  kpis: KPIs;
};

// AI Insights types
type AiInsights = {
  headline: string;
  highlights: string[];
  bottleneck: string;
  actions: string[];
};

interface WeeklyAnalyticsCardProps {
  clientId?: string;
  customLabels?: {
    title?: string;
    conversionTarget?: string;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function WeeklyAnalyticsCard({ 
  clientId = 'askme-ai-app',
  customLabels = {}
}: WeeklyAnalyticsCardProps) {
  const [kpis, setKPIs] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d'>('30d');
  const [comparisonMode, setComparisonMode] = useState<'none' | 'previous'>('previous');
  const [geographyTab, setGeographyTab] = useState<'countries' | 'cities'>('countries');

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to calculate percentage change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { value: 0, formatted: 'No change' };
      return { value: Infinity, formatted: '+∞%' };
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change > 0 ? '+' : '';
    return { 
      value: change, 
      formatted: `${sign}${change.toFixed(1)}% vs previous ${dateRange === '7d' ? '7' : '30'} days`
    };
  };

  // Helper function to format comparison text
  const formatComparison = (current: number, previous: number, unit: string = '') => {
    if (!kpis?.meta.comparisonEnabled || previous === undefined) {
      return 'No comparison data';
    }
    const change = calculateChange(current, previous);
    return change.formatted;
  };

  // Helper function to get total from previous data
  const getPreviousTotal = (previousData: Record<string, any>) => {
    if (!previousData) return 0;
    return Object.values(previousData).reduce((sum: number, value: any) => {
      if (typeof value === 'number') return sum + value;
      if (typeof value === 'object' && value.count) return sum + value.count;
      return sum;
    }, 0);
  };

  // Fetch AI insights
  const fetchAiInsights = async (kpisData: KPIs) => {
    try {
      setAiLoading(true);
      setAiError(null);
      
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kpis: kpisData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAiInsights(data.summary);
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
      setAiError(err instanceof Error ? err.message : 'Failed to generate insights');
      // Set fallback insights
      setAiInsights({
        headline: 'AI insights temporarily unavailable',
        highlights: ['Data analysis in progress', 'Check back in a few minutes', 'Manual review recommended'],
        bottleneck: 'Unable to identify bottlenecks automatically',
        actions: ['Review data manually', 'Check analytics configuration', 'Contact support if needed']
      });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const compareParam = comparisonMode === 'previous' ? '&compare=true' : '';
        const response = await fetch(`/api/analytics/preview?clientId=${clientId}&dateRange=${dateRange}${compareParam}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data: ApiResponse = await response.json();
        setKPIs(data.kpis);
        setError(null);
        
        // Fetch AI insights after getting KPIs
        if (data.kpis) {
          fetchAiInsights(data.kpis);
        }
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, dateRange, comparisonMode]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading analytics</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!kpis) return null;

  // Calculate derived metrics
  const totalTraffic = kpis.traffic.unique_users || 0;
  const totalSignups = kpis.funnel.steps[kpis.funnel.steps.length - 1]?.count || 0;
  const conversionRate = totalTraffic > 0 ? (totalSignups / totalTraffic) * 100 : 0;

  // Calculate changes for comparison
  const trafficChange = calculateChange(totalTraffic, kpis.traffic.previous_unique_users || 0);
  const signupChange = calculateChange(totalSignups, kpis.funnel.previous_signups || 0);
  const conversionChange = calculateChange(conversionRate, 
    kpis.traffic.previous_unique_users && kpis.traffic.previous_unique_users > 0 
      ? ((kpis.funnel.previous_signups || 0) / kpis.traffic.previous_unique_users) * 100 
      : 0
  );

  // Prepare chart data
  const trafficData = kpis.traffic.series.map((value, index) => ({
    dayNum: index,
    value: value,
    day: kpis.traffic.labels[index] || `Day ${index + 1}`
  }));

  const dateRangeLabel = dateRange === '7d' ? 'Last 7 days' : 'Last 30 days';

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {customLabels.title || 'Analytics Dashboard'}
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d')}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          
          <select 
            value={comparisonMode} 
            onChange={(e) => setComparisonMode(e.target.value as 'none' | 'previous')}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="none">No comparison between periods</option>
            <option value="previous">Compare to previous period</option>
          </select>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
          {aiLoading && (
            <div className="ml-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {aiError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm">{aiError}</p>
          </div>
        )}

        {aiInsights ? (
          <div className="space-y-4">
            {/* Headline */}
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h4 className="font-semibold text-gray-900 mb-2">Executive Summary</h4>
              <p className="text-gray-700">{aiInsights.headline}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Highlights */}
              <div className="bg-white rounded-lg p-4 border border-green-100">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Key Highlights
                </h4>
                <ul className="space-y-2">
                  {aiInsights.highlights.map((highlight, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottleneck */}
              <div className="bg-white rounded-lg p-4 border border-orange-100">
                <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Main Bottleneck
                </h4>
                <p className="text-sm text-gray-700">{aiInsights.bottleneck}</p>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Recommended Actions
                </h4>
                <ul className="space-y-2">
                  {aiInsights.actions.map((action, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : aiLoading ? (
          <div className="bg-white rounded-lg p-8 border border-blue-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your data with AI...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-gray-500 text-center">AI insights will appear here once data is loaded.</p>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Traffic Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Traffic Overview</h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {totalTraffic.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 font-medium">
                {trafficChange.formatted}
              </div>
            </div>
          </div>
          
          {/* Traffic metrics row */}
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {totalTraffic.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Unique Users</div>
              {kpis.meta.comparisonEnabled && kpis.traffic.previous_unique_users !== undefined && (
                <div className="text-xs text-gray-400 mt-1">
                  Previous: {kpis.traffic.previous_unique_users}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {(kpis?.traffic?.pageviews || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Pageviews</div>
              {kpis.meta.comparisonEnabled && kpis.traffic.previous_pageviews !== undefined && (
                <div className="text-xs text-gray-400 mt-1">
                  Previous: {kpis.traffic.previous_pageviews}
                </div>
              )}
            </div>
          </div>

          {/* Traffic chart */}
          <div className="h-48">
            {mounted && trafficData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="dayNum" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `Day ${value + 1}`}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [value, 'Users']}
                    labelFormatter={(day) => `Day ${day + 1}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    fill="url(#trafficGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">No traffic data available</span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Signup Funnel Chart with integrated metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Header with key metrics */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Signup Funnel</h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-500">
                {conversionRate.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-500 font-medium">
                {conversionChange.formatted}
              </div>
            </div>
          </div>

          {/* Funnel metrics row */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            {/* Signups */}
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {totalSignups}
              </div>
              <div className="text-xs text-gray-500">Signups</div>
              {kpis.meta.comparisonEnabled && (
                <div className="text-xs text-gray-400 mt-1">
                  {formatComparison(totalSignups, kpis.funnel.previous_signups)}
                </div>
              )}
            </div>

            {/* Conversion Rate */}
            <div className="text-center">
              <div className="text-lg font-semibold text-red-500">
                {conversionRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Conversion</div>
              {kpis.meta.comparisonEnabled && kpis.funnel.previous_conversion_rate !== undefined && (
                <div className="text-xs text-gray-400 mt-1">
                  Previous: {(kpis.funnel.previous_conversion_rate * 100).toFixed(1)}%
                </div>
              )}
            </div>

            {/* Drop-off Rate */}
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {((kpis?.funnel?.top_drop?.dropRate || 0) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Top Drop</div>
              <div className="text-xs text-gray-400 mt-1">
                {kpis?.funnel?.top_drop?.from ? 
                  `${kpis.funnel.top_drop.from.substring(0, 15)}...` : 
                  'No data'
                }
              </div>
            </div>
          </div>

          {/* Funnel chart */}
          <div className="h-48">
            {mounted ? (
              kpis?.funnel?.steps && kpis.funnel.steps.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={kpis.funnel.steps} 
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
                  >
                    <XAxis 
                      type="number" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      domain={[0, 'dataMax']}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 8, fill: '#6B7280' }}
                      width={130}
                      tickFormatter={(value) => {
                        return value.length > 20 ? value.substring(0, 20) + '...' : value;
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name) => [value, 'Count']}
                      labelFormatter={(label) => label}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#3B82F6"
                      radius={[0, 4, 4, 0]}
                      minPointSize={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-gray-400 text-sm block">No funnel data available</span>
                    <span className="text-xs text-gray-400 mt-1">
                      Steps: {kpis?.funnel?.steps?.length || 0}
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>

          {/* Simplified footer with only biggest drop-off info */}
          {kpis?.funnel?.top_drop && kpis.funnel.top_drop.from && kpis.funnel.top_drop.to && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Biggest drop-off:</span> {kpis.funnel.top_drop.from} → {kpis.funnel.top_drop.to} 
                <span className="font-medium text-red-600 ml-1">
                  ({((kpis.funnel.top_drop.dropRate || 0) * 100).toFixed(0)}% drop)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Lifecycle Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Lifecycle</h3>
            {kpis.meta.comparisonEnabled && kpis.lifecycle.previous_series && (
              <div className="text-xs text-gray-500">
                Current vs Previous Period
              </div>
            )}
          </div>
          <div className="h-48">
            {mounted ? (
              (() => {
                const hasCurrentData = Object.values(kpis.lifecycle.series).some(arr => arr.some(val => val !== 0));
                const hasPreviousData = kpis.lifecycle.previous_series && 
                  Object.values(kpis.lifecycle.previous_series).some(arr => arr.some(val => val !== 0));
                
                if (!hasCurrentData && !hasPreviousData) {
                  return (
                    <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No lifecycle data available</span>
                    </div>
                  );
                }

                // Prepare data for the chart
                const lifecycleData = kpis.lifecycle.labels.map((label, index) => ({
                  day: label,
                  new: kpis.lifecycle.series.new[index] || 0,
                  returning: kpis.lifecycle.series.returning[index] || 0,
                  resurrecting: kpis.lifecycle.series.resurrecting[index] || 0,
                  dormant: Math.abs(kpis.lifecycle.series.dormant[index] || 0), // Make dormant positive for chart
                }));

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lifecycleData}>
                      <XAxis 
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6B7280' }}
                        interval="preserveStartEnd"
                        tickFormatter={(value) => value.replace('Day ', '')}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area type="monotone" dataKey="new" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="returning" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="resurrecting" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="dormant" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })()
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>
          
          {/* Enhanced Lifecycle summary with comparison totals */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>New</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Returning</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Resurrecting</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Dormant</span>
              </div>
            </div>
            
            {/* Comparison summary */}
            {kpis.meta.comparisonEnabled && kpis.lifecycle.previous_series && (
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Current Total New:</span>
                  <span>{kpis.lifecycle.series.new.reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Previous Total New:</span>
                  <span>{kpis.lifecycle.previous_series.new.reduce((a, b) => a + b, 0)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device Mix Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Device Mix</h3>
            {kpis.meta.comparisonEnabled && kpis.device.previous_device_mix && (
              <div className="text-xs text-gray-500">
                Current vs Previous Period
              </div>
            )}
          </div>
          <div className="h-48">
            {mounted && Object.keys(kpis.device.device_mix).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(kpis.device.device_mix).map(([device, count], index) => ({
                      name: device,
                      value: count,
                      count: count
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {Object.entries(kpis.device.device_mix).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [value, 'Users']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">No device data available</span>
              </div>
            )}
          </div>
          
          {/* Device legend with comparison */}
          <div className="mt-4 space-y-2">
            {Object.entries(kpis.device.device_mix).map(([device, count], index) => {
              const total = Object.values(kpis.device.device_mix).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const previousCount = kpis.device.previous_device_mix?.[device] || 0;
              
              return (
                <div key={device} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-gray-700">{device}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{count} ({percentage.toFixed(1)}%)</div>
                    {kpis.meta.comparisonEnabled && kpis.device.previous_device_mix && (
                      <div className="text-xs text-gray-400">
                        Previous: {previousCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Combined Geography & Cities Chart with Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Geography</h3>
              {/* Tab Navigation */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setGeographyTab('countries')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    geographyTab === 'countries'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Countries
                </button>
                <button
                  onClick={() => setGeographyTab('cities')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    geographyTab === 'cities'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cities
                </button>
              </div>
            </div>
            {kpis.meta.comparisonEnabled && (
              (geographyTab === 'countries' && kpis.geography.previous_countries) ||
              (geographyTab === 'cities' && kpis.cityGeography.previous_cities)
            ) && (
              <div className="text-xs text-gray-500">
                Current vs Previous Period
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="space-y-3 min-h-[200px]">
            {geographyTab === 'countries' ? (
              /* Countries Tab Content */
              <>
                {Object.entries(kpis.geography.countries)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([country, count]) => {
                    const total = Object.values(kpis.geography.countries).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    const previousCount = kpis.geography.previous_countries?.[country] || 0;
                    
                    return (
                      <div key={country} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700">{country}</span>
                          <div className="text-right">
                            <span className="font-medium">{count} users</span>
                            {kpis.meta.comparisonEnabled && kpis.geography.previous_countries && (
                              <div className="text-xs text-gray-400">
                                Previous: {previousCount}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                
                {/* Show previous period totals summary */}
                {kpis.meta.comparisonEnabled && kpis.geography.previous_countries && (
                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Current Period Total:</span>
                      <span>{Object.values(kpis.geography.countries).reduce((a, b) => a + b, 0)} users</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Previous Period Total:</span>
                      <span>{getPreviousTotal(kpis.geography.previous_countries)} users</span>
                    </div>
                  </div>
                )}
                
                {Object.keys(kpis.geography.countries).length === 0 && (
                  <div className="text-center py-8">
                    <span className="text-gray-400 text-sm">No geography data available</span>
                  </div>
                )}
              </>
            ) : (
              /* Cities Tab Content */
              <>
                {Object.entries(kpis.cityGeography.cities)
                  .sort(([,a], [,b]) => b.count - a.count)
                  .slice(0, 5)
                  .map(([key, cityData]) => {
                    // Try to find matching previous city data by city name
                    const previousCityData = kpis.cityGeography.previous_cities?.[key] || 
                      Object.values(kpis.cityGeography.previous_cities || {}).find(
                        city => city.city === cityData.city && city.country === cityData.country
                      );
                    
                    return (
                      <div key={key} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{cityData.city}</div>
                          <div className="text-xs text-gray-500">{cityData.country}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{cityData.count}</div>
                          {kpis.meta.comparisonEnabled && kpis.cityGeography.previous_cities && (
                            <div className="text-xs text-gray-400">
                              Previous: {previousCityData?.count || 0}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                
                {/* Show previous period cities summary */}
                {kpis.meta.comparisonEnabled && kpis.cityGeography.previous_cities && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-2">Previous Period Cities:</div>
                    {Object.entries(kpis.cityGeography.previous_cities).map(([key, cityData]) => (
                      <div key={key} className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{cityData.city}, {cityData.country}</span>
                        <span>{cityData.count}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {Object.keys(kpis.cityGeography.cities).length === 0 && (
                  <div className="text-center py-8">
                    <span className="text-gray-400 text-sm">No city data available</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* User Retention Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Retention</h3>
            {kpis.meta.comparisonEnabled && kpis.retention.previous_d7_retention !== undefined && (
              <div className="text-right text-sm">
                <div className="text-gray-600">
                  Current: {kpis.retention.d7_retention.toFixed(1)}%
                </div>
                <div className="text-gray-400">
                  Previous: {kpis.retention.previous_d7_retention.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
          <div className="h-48">
            {mounted ? (
              kpis.retention.values && kpis.retention.values.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpis.retention.values}>
                    <XAxis 
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickFormatter={(value) => `Day ${value}`}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name) => [`${value}%`, 'Retention Rate']}
                      labelFormatter={(day) => `Day ${day}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-gray-400 text-sm block">No retention data available</span>
                    <span className="text-xs text-gray-400 mt-1">
                      Period: {kpis.retention.retention_period || 7} days
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>
          
          {/* Retention summary with comparison */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-600">
                <span className="font-medium">{kpis.retention.label || '7-day'}</span> retention rate
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {kpis.retention.d7_retention.toFixed(1)}%
                </div>
                {kpis.meta.comparisonEnabled && kpis.retention.previous_d7_retention !== undefined && (
                  <div className="text-xs text-gray-400">
                    Previous: {kpis.retention.previous_d7_retention.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
            {kpis.retention.note && (
              <div className="mt-2 text-xs text-gray-500">
                Note: {kpis.retention.note}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Errors Display */}
      {Object.keys(kpis.meta.errors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-yellow-800 font-semibold mb-2">Some data could not be loaded:</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            {Object.entries(kpis.meta.errors).map(([metric, error]) => (
              <li key={metric}>
                <strong>{metric}:</strong> {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
