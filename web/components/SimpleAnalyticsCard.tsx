'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

// Chart color palette
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

interface SimpleAnalyticsCardProps {
  clientId: string;
  dateRange?: string;
  comparisonMode?: string;
}

export default function SimpleAnalyticsCard({
  clientId,
  dateRange = '30d',
  comparisonMode = 'none'
}: SimpleAnalyticsCardProps) {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [geographyView, setGeographyView] = useState<'countries' | 'cities'>('countries');
  const [funnelView, setFunnelView] = useState<'profile' | 'renewal'>('profile');

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
        comparisonMode,
        funnelType: funnelView // Add funnelType parameter
      });

      const response = await fetch(`/api/analytics/preview?${params}`);
      const data = await response.json();

      console.log('Simple Analytics API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      if (data.success) {
        setKpis(data.kpis);
      } else {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchAnalytics();
    }
  }, [mounted, clientId, dateRange, comparisonMode, funnelView]); // Add funnelView to dependencies

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
          <button 
            onClick={fetchAnalytics}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!kpis) return null;

  // Prepare chart data using the working patterns from the old code
  const trafficData = kpis.traffic?.series?.map((value: number, index: number) => ({
    dayNum: index,
    value: Math.max(value || 0, 0.1), // Ensure minimum visibility
    day: kpis.traffic?.labels?.[index] || `Day ${index + 1}`
  })) || [{ dayNum: 0, value: 0.1, day: 'Day 1' }]; // Always provide fallback data

  // Ensure geography data has at least something to show
  const geographyData = kpis.geography?.countries && Object.keys(kpis.geography.countries).length > 0 
    ? kpis.geography.countries 
    : { "No Data": 1 };

  // Ensure device data has at least something to show
  const deviceMixData = kpis.device?.device_mix && Object.keys(kpis.device.device_mix).length > 0 
    ? kpis.device.device_mix 
    : { "No Data": 1 };

  // Ensure retention data has at least something to show
  const retentionData = kpis.retention?.values && kpis.retention.values.length > 0 
    ? kpis.retention.values.slice(0, 14)
    : [{ day: 0, percentage: 0.1, count: 0 }];

  console.log('Chart data prepared:', { 
    trafficData: trafficData.length,
    geographyKeys: Object.keys(geographyData).length,
    deviceKeys: Object.keys(deviceMixData).length,
    retentionLength: retentionData.length,
    mounted,
    originalTraffic: kpis.traffic?.series,
    originalGeo: kpis.geography?.countries,
    originalDevice: kpis.device?.device_mix
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select 
            value={dateRange} 
            onChange={() => {}} // Read-only since dateRange is passed as prop
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900">{kpis.traffic?.unique_users || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Page Views</h3>
          <p className="text-2xl font-bold text-gray-900">{kpis.traffic?.pageviews || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Countries</h3>
          <p className="text-2xl font-bold text-gray-900">{Object.keys(kpis.geography?.countries || {}).length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
          <p className="text-2xl font-bold text-gray-900">
            {funnelView === 'profile' 
              ? ((kpis.funnel?.conversion_rate || 0) * 100).toFixed(1)
              : ((kpis.renewalFunnel?.conversion_rate || 0) * 100).toFixed(1)
            }%
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Traffic Chart - Using the working pattern */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Traffic Overview</h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {(kpis.traffic?.unique_users || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 font-medium">
                Unique Users
              </div>
            </div>
          </div>
          
          <div className="h-48">
            {mounted ? (
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
                    formatter={(value) => [value === 0.1 && !kpis.traffic?.series ? 'No data' : value, 'Users']}
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
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>
        </div>

        {/* Combined Funnel Analysis Chart with Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {funnelView === 'profile' ? 'Profile Creation Funnel' : 'Renewal Funnel'}
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setFunnelView('profile')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    funnelView === 'profile'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setFunnelView('renewal')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    funnelView === 'renewal'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Renewal
                </button>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {funnelView === 'profile' 
                    ? ((kpis.funnel?.conversion_rate || 0) * 100).toFixed(1)
                    : ((kpis.renewalFunnel?.conversion_rate || 0) * 100).toFixed(1)
                  }%
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Conversion Rate
                </div>
              </div>
            </div>
          </div>
          
          <div className="min-h-48 max-h-96 overflow-y-auto">
            {mounted ? (
              <div className="space-y-3">
                {(() => {
                  const currentFunnel = funnelView === 'profile' ? kpis.funnel : kpis.renewalFunnel;
                  
                  if (!currentFunnel?.steps || currentFunnel.steps.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <div className="text-lg font-medium">
                            No {funnelView === 'profile' ? 'Profile' : 'Renewal'} Funnel Data
                          </div>
                          <div className="text-sm">
                            {funnelView === 'profile' ? 'Profile creation' : 'Renewal'} funnel data not available
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  console.log(`🔍 ${funnelView} funnel steps data:`, currentFunnel.steps);
                  console.log(`📊 Total ${funnelView} steps count:`, currentFunnel.steps.length);
                  
                  return currentFunnel.steps.map((step: any, index: number) => {
                    const firstStepCount = currentFunnel.steps?.[0]?.count || 1;
                    const stepConversionRate = (step.count / firstStepCount) * 100;
                    console.log(`${funnelView} Step ${index + 1}: ${step.name} - ${step.count} users (${stepConversionRate.toFixed(1)}%)`);
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700 truncate pr-2" title={step.name}>
                            {step.name || `Step ${index + 1}`}
                          </span>
                          <span className="font-medium whitespace-nowrap">
                            {step.count} users ({stepConversionRate.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ease-out ${
                              funnelView === 'profile' ? 'bg-blue-600' : 'bg-purple-600'
                            }`}
                            style={{ width: `${Math.max(stepConversionRate, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>
        </div>

        {/* Lifecycle Analysis Chart - NEW */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Lifecycle</h3>
          </div>
          
          <div className="h-48">
            {mounted && kpis.lifecycle?.labels && kpis.lifecycle.labels.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={kpis.lifecycle.labels.map((label: string, index: number) => {
                    // Create a date for proper display - using days ago from today
                    const daysAgo = kpis.lifecycle.labels.length - index - 1;
                    const date = new Date();
                    date.setDate(date.getDate() - daysAgo);
                    
                    return {
                      day: date.toISOString().split('T')[0], // YYYY-MM-DD format
                      dayLabel: label, // Keep original label for debugging
                      new: kpis.lifecycle.series.new[index] || 0,
                      returning: kpis.lifecycle.series.returning[index] || 0,
                      resurrecting: kpis.lifecycle.series.resurrecting[index] || 0,
                      dormant: kpis.lifecycle.series.dormant[index] || 0
                    };
                  })}
                >
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString();
                    }}
                  />
                  <Area type="monotone" dataKey="new" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="returning" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="resurrecting" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="dormant" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.7} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-lg font-medium">No Lifecycle Data</div>
                  <div className="text-sm">User lifecycle data not available</div>
                </div>
              </div>
            )}
          </div>

          {/* Lifecycle legend */}
          {kpis.lifecycle?.labels && kpis.lifecycle.labels.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>New Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span>Returning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span>Resurrecting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span>Dormant</span>
              </div>
            </div>
          )}
        </div>

        {/* Combined Geography Chart with Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {geographyView === 'countries' ? 'Top Countries' : 'Top Cities'}
            </h3>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setGeographyView('countries')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  geographyView === 'countries'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Countries
              </button>
              <button
                onClick={() => setGeographyView('cities')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  geographyView === 'cities'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cities
              </button>
            </div>
          </div>
          
          <div className="h-48">
            {mounted ? (
              <div className="space-y-3">
                {geographyView === 'countries' ? (
                  // Countries View
                  Object.entries(geographyData)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([country, count]) => {
                      const total = Object.values(geographyData).reduce((a: number, b: any) => a + (b as number), 0);
                      const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                      
                      return (
                        <div key={country} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700">{country}</span>
                            <span className="font-medium">
                              {country === "No Data" ? "No data available" : `${count} users (${percentage.toFixed(1)}%)`}
                            </span>
                          </div>
                          {country !== "No Data" && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  // Cities View
                  kpis.cityGeography?.cities && Object.keys(kpis.cityGeography.cities).length > 0 ? (
                    Object.entries(kpis.cityGeography.cities)
                      .sort(([,a], [,b]) => (b as any).count - (a as any).count)
                      .slice(0, 5)
                      .map(([cityKey, cityData]) => {
                        const data = cityData as any;
                        const total = Object.values(kpis.cityGeography.cities).reduce((a: number, b: any) => a + b.count, 0);
                        const percentage = total > 0 ? (data.count / total) * 100 : 0;
                        
                        return (
                          <div key={cityKey} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-700">{data.city}, {data.country}</span>
                              <span className="font-medium">{data.count} users ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="text-lg font-medium">No City Data</div>
                        <div className="text-sm">City-level data not available</div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>
        </div>

        {/* Device Mix Chart - Using the working pattern */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Device Mix</h3>
          </div>
          <div className="h-48">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(deviceMixData).map(([device, count], index) => ({
                      name: device,
                      value: Math.max(count as number, 0.1),
                      actualValue: count,
                      count: count
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {Object.entries(deviceMixData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      props.payload.name === "No Data" ? "No data available" : `${props.payload.actualValue} Users`,
                      'Users'
                    ]}
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
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>
          
          {/* Device legend */}
          <div className="mt-4 space-y-2">
            {Object.entries(deviceMixData).map(([device, count], index) => {
              const total = Object.values(deviceMixData).reduce((a: number, b: any) => a + (b as number), 0);
              const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
              
              return (
                <div key={device} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-gray-700">{device}</span>
                  </div>
                  <div className="font-medium">
                    {device === "No Data" ? "No data" : `${count} (${percentage.toFixed(1)}%)`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Retention Chart - Using the working pattern */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Retention</h3>
            <div className="text-right text-sm">
              <div className="text-gray-600">
                7-day: {kpis.retention?.d7_retention?.toFixed(1) || 0}%
              </div>
            </div>
          </div>
          <div className="h-48">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retentionData}>
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
                    formatter={(value, name) => [
                      value === 0.1 && (!kpis.retention?.values || kpis.retention.values.length === 0) 
                        ? 'No data' 
                        : `${value}%`, 
                      'Retention Rate'
                    ]}
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
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded text-sm">
        <strong>Debug Info:</strong> mounted={mounted.toString()}, 
        trafficLength={trafficData.length}, 
        geoKeys={Object.keys(geographyData).length},
        deviceKeys={Object.keys(deviceMixData).length},
        retentionLength={retentionData.length}
        <details className="mt-2">
          <summary className="cursor-pointer">Chart Data Status</summary>
          <pre className="mt-2 text-xs overflow-auto max-h-32">
Traffic: {JSON.stringify(trafficData.slice(0, 3), null, 2)}
Geography: {JSON.stringify(geographyData, null, 2)}
Device: {JSON.stringify(deviceMixData, null, 2)}
Retention: {JSON.stringify(retentionData.slice(0, 3), null, 2)}
          </pre>
        </details>
        <details className="mt-2">
          <summary className="cursor-pointer">Full KPIs Data</summary>
          <pre className="mt-2 text-xs overflow-auto max-h-48">{JSON.stringify(kpis, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}
