'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

// Chart color palette
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

interface WeeklyAnalyticsCardProps {
  clientId: string;
  dateRange?: string;
  comparisonMode?: string;
  onDateRangeChange?: (value: string) => void;
  onComparisonModeChange?: (value: string) => void;
  customLabels?: {
    title?: string;
    traffic?: string;
    signups?: string;
    funnel?: string;
  };
}

export default function WeeklyAnalyticsCard({
  clientId,
  dateRange = '7d',
  comparisonMode = 'none',
  onDateRangeChange,
  onComparisonModeChange,
  customLabels = {}
}: WeeklyAnalyticsCardProps) {
  console.log('WeeklyAnalyticsCard: component started with props:', { clientId, dateRange, comparisonMode });
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [geographyTab, setGeographyTab] = useState<'countries' | 'cities'>('countries');

  // AI insights state
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        clientId,
        dateRange,
        comparisonMode
      });

      console.log('WeeklyAnalyticsCard: fetching with params', { clientId, dateRange, comparisonMode });

      const response = await fetch(`/api/analytics/preview?${params}`);
      const data = await response.json();

      console.log('WeeklyAnalyticsCard: API response', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      if (data.success) {
        console.log('WeeklyAnalyticsCard: setting kpis data');
        // API returns data.kpis, not data.data
        setKpis(data.kpis);
        
        // Fetch AI insights after successful data load
        if (data.kpis && Object.keys(data.kpis).length > 0) {
          fetchAiInsights(data.kpis);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('WeeklyAnalyticsCard: error fetching analytics', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      console.log('WeeklyAnalyticsCard: setting loading to false');
      setLoading(false);
    }
  };

  const fetchAiInsights = async (analyticsData: any) => {
    try {
      setAiLoading(true);
      setAiError(null);

      const response = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          analyticsData,
          dateRange,
          comparisonMode
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAiInsights(data.insights);
      } else {
        console.warn('AI insights failed:', data.error);
        setAiError(data.error || 'Failed to generate AI insights');
      }
    } catch (err) {
      console.warn('AI insights error:', err);
      setAiError('Failed to generate AI insights');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (clientId && mounted) {
      fetchAnalytics();
    }
  }, [clientId, dateRange, comparisonMode, mounted]);

  // Helper functions
  const getPreviousTotal = (previousData: any) => {
    if (!previousData) return 0;
    return Object.values(previousData).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
  };

  const formatComparison = (current: number, previous?: number) => {
    if (previous === undefined) return '';
    const change = current - previous;
    const percentage = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0.0';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change} (${sign}${percentage}%)`;
  };

  const calculateChange = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) {
      return {
        value: current,
        percentage: 0,
        formatted: `${current.toLocaleString()}`,
        color: 'text-gray-500'
      };
    }

    const change = current - previous;
    const percentage = ((change / previous) * 100);
    const sign = change > 0 ? '+' : '';
    const color = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500';

    return {
      value: change,
      percentage,
      formatted: `${sign}${Math.abs(change).toLocaleString()} (${sign}${percentage.toFixed(1)}%)`,
      color
    };
  };

  if (loading) {
    console.log('WeeklyAnalyticsCard: showing loading state');
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="bg-blue-100 p-4 mb-4 rounded">
          <p className="text-blue-800">WeeklyAnalyticsCard Loading State</p>
          <p className="text-sm">clientId: {clientId}</p>
        </div>
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
    console.log('WeeklyAnalyticsCard: showing error state:', error);
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading analytics</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Provide default empty data structure if no kpis
  const safeKpis = kpis || {
    traffic: { unique_users: 0, pageviews: 0, series: [] },
    funnel: { steps: [], conversion_rate: 0 },
    lifecycle: { series: {}, labels: [] },
    device: { device_mix: {} },
    geography: { countries: {} },
    cityGeography: { cities: {} },
    retention: { values: [], d7_retention: 0 },
    meta: { errors: [], comparisonEnabled: false }
  };

  console.log('WeeklyAnalyticsCard: rendering main dashboard with safeKpis:', !!safeKpis);

  // Calculate derived metrics
  const totalTraffic = safeKpis.traffic?.unique_users || 0;
  const totalSignups = safeKpis.funnel?.steps?.length > 0 ? safeKpis.funnel.steps[safeKpis.funnel.steps.length - 1]?.count || 0 : 0;
  const conversionRate = safeKpis.funnel?.conversion_rate || 0;

  // Calculate changes for comparison mode
  const trafficChange = calculateChange(totalTraffic, safeKpis.traffic?.previous_unique_users);
  const conversionChange = calculateChange(conversionRate, safeKpis.funnel?.previous_conversion_rate ? safeKpis.funnel?.previous_conversion_rate * 100 : undefined);

  // Prepare traffic chart data - API returns 'series' not 'daily_data'
  // Debug log at top level to see all data structure
  console.log('Full safeKpis structure:', {
    kpis,
    safeKpis,
    kpisKeys: Object.keys(safeKpis),
    geography: safeKpis.geography,
    device: safeKpis.device,
    traffic: safeKpis.traffic,
    lifecycle: safeKpis.lifecycle,
    funnel: safeKpis.funnel
  });

  const trafficData = safeKpis.traffic?.series?.map((value: number, index: number) => ({
    dayNum: index,
    value: Math.max(value, 0), // Ensure non-negative values
    name: `Day ${index + 1}`
  })) || [];

  // Debug: Add console log to see what's happening
  console.log('WeeklyAnalyticsCard render:', { loading, error, mounted, kpis: !!safeKpis, trafficDataLength: trafficData.length });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Debug info */}
      <div className="bg-yellow-100 p-2 text-xs">
        Debug: loading={loading.toString()}, error={error || 'none'}, mounted={mounted.toString()},
        kpis={!!safeKpis ? 'exists' : 'null'}, trafficData.length={trafficData.length}
      </div>

      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {customLabels.title || 'Analytics Dashboard'}
        </h2>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange?.(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          <select
            value={comparisonMode}
            onChange={(e) => onComparisonModeChange?.(e.target.value)}
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
                  {aiInsights.highlights.map((highlight: string, index: number) => (
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
                  {aiInsights.actions.map((action: string, index: number) => (
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
              {safeKpis.meta?.comparisonEnabled && safeKpis.traffic?.previous_unique_users !== undefined && (
                <div className="text-xs text-gray-400 mt-1">
                  Previous: {safeKpis.traffic?.previous_unique_users}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {(safeKpis?.traffic?.pageviews || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Pageviews</div>
              {safeKpis.meta?.comparisonEnabled && safeKpis.traffic?.previous_pageviews !== undefined && (
                <div className="text-xs text-gray-400 mt-1">
                  Previous: {safeKpis.traffic?.previous_pageviews}
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
                <span className="text-gray-400 text-sm">
                  {mounted ? 'No traffic data available' : 'Loading...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Signup Funnel Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

          <div className="h-48">
            {mounted && safeKpis?.funnel?.steps && safeKpis.funnel.steps.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={safeKpis.funnel.steps}
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
                  <span className="text-gray-400 text-sm block">
                    {mounted ? 'No funnel data available' : 'Loading chart...'}
                  </span>
                  {mounted && (
                    <span className="text-xs text-gray-400 mt-1">
                      Steps: {safeKpis?.funnel?.steps?.length || 0}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Lifecycle Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Lifecycle</h3>
          </div>
          <div className="h-48">
            {mounted ? (
              (() => {
                const hasCurrentData = Object.values(safeKpis.lifecycle?.series || {}).some(arr => Array.isArray(arr) && arr.some(val => val !== 0));
                
                if (!hasCurrentData) {
                  return (
                    <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No lifecycle data available</span>
                    </div>
                  );
                }

                const lifecycleData = safeKpis.lifecycle?.labels?.map((label: string, index: number) => ({
                  day: label,
                  new: safeKpis.lifecycle?.series?.new?.[index] || 0,
                  returning: safeKpis.lifecycle?.series?.returning?.[index] || 0,
                  resurrecting: safeKpis.lifecycle?.series?.resurrecting?.[index] || 0,
                  dormant: Math.abs(safeKpis.lifecycle?.series?.dormant?.[index] || 0),
                })) || [];

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
        </div>

          {/* Device Mix Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Device Mix</h3>
          </div>
          <div className="h-48">
            {(() => {
              const deviceData = safeKpis.device?.device_mix || {};
              const deviceKeys = Object.keys(deviceData);
              console.log('Device mix debug:', { 
                device: safeKpis.device,
                device_mix: deviceData, 
                deviceKeys, 
                keysLength: deviceKeys.length,
                mounted 
              });
              
              if (mounted && deviceKeys.length > 0) {
                // Show chart even if values are 0, but with special handling
                const chartData = Object.entries(deviceData).map(([device, count], index) => ({
                  name: device,
                  value: Math.max(count as number, 0.1), // Ensure minimum value for visibility
                  actualValue: count as number,
                  count: count as number
                }));
                
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any, props: any) => [props.payload.actualValue, 'Users']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                );
              } else {
                return (
                  <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">
                      {mounted ? `No device data available (keys: ${deviceKeys.length})` : 'Loading chart...'}
                    </span>
                  </div>
                );
              }
            })()}
          </div>
        </div>

        {/* Geography Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Locations</h3>
          </div>
          <div className="h-48">
            {(() => {
              // Use the correct path: geography.countries instead of just geography
              const geoData = safeKpis.geography?.countries || {};
              const geoKeys = Object.keys(geoData);
              console.log('Geography debug:', { 
                geography: safeKpis.geography, 
                countries: geoData,
                geoKeys, 
                keysLength: geoKeys.length,
                mounted 
              });
              
              if (mounted && geoKeys.length > 0) {
                const chartData = Object.entries(geoData).map(([location, count]) => ({
                  name: location,
                  users: count
                }));
                
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              } else {
                return (
                  <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">
                      {mounted ? `No geography data available (keys: ${geoKeys.length})` : 'Loading chart...'}
                    </span>
                  </div>
                );
              }
            })()}
          </div>
        </div>

        {/* User Retention Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Retention</h3>
          </div>
          <div className="h-48">
            {(() => {
              const retentionData = safeKpis.retention?.values || [];
              const hasRetentionData = retentionData.some((item: any) => item.count > 0);
              console.log('Retention debug:', { 
                retention: safeKpis.retention, 
                values: retentionData,
                hasData: hasRetentionData,
                mounted 
              });
              
              if (mounted && hasRetentionData) {
                // Filter to show only first 14 days for better visibility
                const chartData = retentionData.slice(0, 14).map((item: any) => ({
                  day: item.day,
                  percentage: item.percentage,
                  count: item.count
                }));
                
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `D${value}`}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any, name: any) => [
                          name === 'percentage' ? `${(value as number).toFixed(1)}%` : value,
                          name === 'percentage' ? 'Retention' : 'Users'
                        ]}
                        labelFormatter={(day) => `Day ${day}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                );
              } else {
                return (
                  <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">
                      {mounted ? 'No retention data available' : 'Loading chart...'}
                    </span>
                  </div>
                );
              }
            })()}
          </div>
        </div>

      </div>

      {/* Errors Display */}
      {Object.keys(safeKpis.meta?.errors || {}).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-yellow-800 font-semibold mb-2">Some data could not be loaded:</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            {Object.entries(safeKpis.meta?.errors || {}).map(([metric, error]) => (
              <li key={metric}>
                <strong>{metric}:</strong> {String(error)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
