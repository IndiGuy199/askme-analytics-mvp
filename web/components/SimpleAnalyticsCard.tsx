'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  const [trafficView, setTrafficView] = useState<'visitors' | 'pageviews'>('visitors');
  const [retentionView, setRetentionView] = useState<'daily' | 'cumulative'>('daily');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // 🆕 Include comparison parameter
      const params = new URLSearchParams({
        clientId,
        dateRange,
        compare: comparisonMode === 'previous' ? 'true' : 'false' // ✅ Convert to boolean
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
  }, [mounted, clientId, dateRange, comparisonMode]); // Remove funnelView from dependencies

  // Prepare chart data using the working patterns from the old code
  // Select the appropriate series based on trafficView
  // MUST be before conditional returns to follow Rules of Hooks
  const trafficData = useMemo(() => {
    if (!kpis || !kpis.traffic) {
      return [{ dayNum: 0, value: 0.1, day: 'Day 1' }];
    }
    
    const selectedTrafficSeries = trafficView === 'visitors' 
      ? (kpis.traffic?.series || [])
      : (kpis.traffic?.pageviewsSeries || kpis.traffic?.series || []);
    
    // 🆕 Get previous period data if comparison is enabled
    const selectedPreviousSeries = comparisonMode === 'previous' && kpis.traffic
      ? (trafficView === 'visitors' 
          ? (kpis.traffic?.previous_series || [])
          : (kpis.traffic?.previous_pageviews_series || []))
      : [];
    
    console.log('🔄 Traffic view changed:', {
      trafficView,
      comparisonMode,
      hasVisitorsSeries: !!kpis.traffic?.series,
      hasPageviewsSeries: !!kpis.traffic?.pageviewsSeries,
      hasPreviousSeries: selectedPreviousSeries.length > 0,
      visitorsLength: kpis.traffic?.series?.length || 0,
      pageviewsLength: kpis.traffic?.pageviewsSeries?.length || 0,
      selectedSeriesLength: selectedTrafficSeries.length,
      firstFewValues: selectedTrafficSeries.slice(0, 5)
    });
    
    return selectedTrafficSeries.map((value: number, index: number) => ({
      dayNum: index,
      value: Math.max(value || 0, 0.1), // Ensure minimum visibility
      previousValue: selectedPreviousSeries[index] || 0, // 🆕 Add previous period value
      day: kpis.traffic?.labels?.[index] || `Day ${index + 1}`
    })) || [{ dayNum: 0, value: 0.1, day: 'Day 1' }];
  }, [trafficView, comparisonMode, kpis?.traffic?.series, kpis?.traffic?.pageviewsSeries, kpis?.traffic?.previous_series, kpis?.traffic?.previous_pageviews_series, kpis?.traffic?.labels]);

  // Compute retention data based on selected view
  const retentionData = useMemo(() => {
    if (!kpis?.retention) return { d7_retention: 0, values: [] };
    
    const selectedRetention = retentionView === 'daily' 
      ? kpis.retention.daily 
      : kpis.retention.cumulative;

    console.log('🔄 Retention view changed:', {
      retentionView,
      hasDaily: !!kpis.retention.daily,
      hasCumulative: !!kpis.retention.cumulative,
      selectedRetention
    });

    return selectedRetention || { d7_retention: 0, values: [] };
  }, [retentionView, kpis?.retention]);

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

  // Ensure geography data has at least something to show
  const geographyData = kpis.geography?.countries && Object.keys(kpis.geography.countries).length > 0 
    ? kpis.geography.countries 
    : { "No Data": 1 };
  
  // 🆕 Previous geography data for comparison
  const previousGeographyData = comparisonMode === 'previous' && kpis.geography?.previous_countries && Object.keys(kpis.geography.previous_countries).length > 0
    ? kpis.geography.previous_countries
    : {};

  // Ensure device data has at least something to show
  const deviceMixData = kpis.device?.device_mix && Object.keys(kpis.device.device_mix).length > 0 
    ? kpis.device.device_mix 
    : { "No Data": 1 };
  
  // 🆕 Previous device data for comparison
  const previousDeviceMixData = comparisonMode === 'previous' && kpis.device?.previous_device_mix && Object.keys(kpis.device.previous_device_mix).length > 0
    ? kpis.device.previous_device_mix
    : {};

  // Prepare retention chart data from the selected retention view
  const retentionChartData = retentionData?.values && retentionData.values.length > 0 
    ? retentionData.values.slice(0, 14)
    : [{ day: 0, percentage: 0.1, count: 0 }];

  console.log('Chart data prepared:', { 
    trafficData: trafficData.length,
    geographyKeys: Object.keys(geographyData).length,
    deviceKeys: Object.keys(deviceMixData).length,
    retentionView,
    retentionLength: retentionChartData.length,
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
      </div>

      {/* Mini Summary - Narrative-driven insight */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Summary</h3>
            <p className="text-gray-700 leading-relaxed">
              {(() => {
                const visitors = kpis.traffic?.unique_users || 0;
                const pageviews = kpis.traffic?.pageviews || 0;
                const sessions = kpis.sessions || 0;
                const bounceRate = kpis.bounce_rate || 0;
                const topCountry = kpis.geography?.countries ? Object.keys(kpis.geography.countries)[0] : null;
                const topPage = kpis.topPages?.[0]?.url || null;
                const durationMinutes = Math.floor((kpis.session_duration || 0) / 60);
                
                // Build narrative
                let summary = `In the last ${kpis.meta?.dateRange || '30 days'}, `;
                
                // Visitors and pageviews
                summary += `you had <strong>${visitors.toLocaleString()} visitor${visitors !== 1 ? 's' : ''}</strong> `;
                summary += `and <strong>${pageviews.toLocaleString()} page view${pageviews !== 1 ? 's' : ''}</strong>. `;
                
                // Geographic insight
                if (topCountry) {
                  summary += `Most visitors are from <strong>${topCountry}</strong> `;
                }
                
                // Top page insight
                if (topPage) {
                  const cleanUrl = topPage.replace(/^https?:\/\//, '').replace(/\/$/, '');
                  const pageName = cleanUrl.split('/').pop() || 'your homepage';
                  summary += `and viewed <strong>${pageName}</strong>. `;
                }
                
                // Engagement insight
                if (bounceRate < 40 && durationMinutes >= 2) {
                  summary += `<strong className="text-green-600">Great engagement overall!</strong> `;
                  summary += `Visitors are spending quality time on your site.`;
                } else if (bounceRate < 60) {
                  summary += `<strong>Good engagement!</strong> People are exploring your content.`;
                } else {
                  summary += `There's opportunity to <strong>improve engagement</strong> and keep visitors exploring longer.`;
                }
                
                return <span dangerouslySetInnerHTML={{ __html: summary }} />;
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {/* Total Visitors */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Visitors</h3>
          <p className="text-2xl font-bold text-gray-900">{kpis.traffic?.unique_users || 0}</p>
          
          {/* 🆕 Show comparison change */}
          {comparisonMode === 'previous' && kpis.traffic?.previous_unique_users !== undefined && (
            <p className="text-sm mt-1">
              {(() => {
                const current = kpis.traffic.unique_users || 0;
                const previous = kpis.traffic.previous_unique_users;
                const change = current - previous;
                const percentChange = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0.0';
                const isPositive = change > 0;
                
                return (
                  <>
                    <span className={isPositive ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {isPositive ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change)} ({percentChange}%)
                    </span>
                    <span className="text-gray-500 ml-1">vs previous</span>
                  </>
                );
              })()}
            </p>
          )}
        </div>
        
        {/* Page Views */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Page Views</h3>
          <p className="text-2xl font-bold text-gray-900">{kpis.traffic?.pageviews || 0}</p>
          
          {/* 🆕 Show comparison change */}
          {comparisonMode === 'previous' && kpis.traffic?.previous_pageviews !== undefined && (
            <p className="text-sm mt-1">
              {(() => {
                const current = kpis.traffic.pageviews || 0;
                const previous = kpis.traffic.previous_pageviews;
                const change = current - previous;
                const percentChange = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0.0';
                const isPositive = change > 0;
                
                return (
                  <>
                    <span className={isPositive ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {isPositive ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change)} ({percentChange}%)
                    </span>
                    <span className="text-gray-500 ml-1">vs previous</span>
                  </>
                );
              })()}
            </p>
          )}
        </div>
        
        {/* Visits (previously Sessions) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Visits</h3>
          <p className="text-2xl font-bold text-gray-900">{kpis.sessions || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Website visits</p>
          
          {/* 🆕 Show comparison change */}
          {comparisonMode === 'previous' && kpis.previous_sessions !== undefined && (
            <p className="text-sm mt-1">
              {(() => {
                const current = kpis.sessions || 0;
                const previous = kpis.previous_sessions;
                const change = current - previous;
                const percentChange = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0.0';
                const isPositive = change > 0;
                
                return (
                  <>
                    <span className={isPositive ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {isPositive ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change)} ({percentChange}%)
                    </span>
                    <span className="text-gray-500 ml-1">vs previous</span>
                  </>
                );
              })()}
            </p>
          )}
        </div>
        
        {/* Visit Duration (previously Session Duration) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Visit Duration</h3>
          <p className="text-2xl font-bold text-gray-900">
            {kpis.session_duration 
              ? `${Math.floor(kpis.session_duration / 60)}m ${Math.floor(kpis.session_duration % 60)}s`
              : '0m 0s'
            }
          </p>
          {kpis.session_duration !== undefined && comparisonMode !== 'previous' && (
            <p className="text-xs mt-1">
              {kpis.session_duration >= 180
                ? <span className="text-green-600 font-medium">✅ Great engagement</span>
                : kpis.session_duration >= 120
                ? <span className="text-blue-600 font-medium">Good</span>
                : <span className="text-orange-500 font-medium">⚠️ Needs attention</span>
              }
            </p>
          )}
          
          {/* 🆕 Show comparison change */}
          {comparisonMode === 'previous' && kpis.previous_session_duration !== undefined && (
            <p className="text-sm mt-1">
              {(() => {
                const current = kpis.session_duration || 0;
                const previous = kpis.previous_session_duration;
                const change = current - previous;
                const percentChange = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0.0';
                const isPositive = change > 0;
                
                // Format time change nicely
                const changeMinutes = Math.floor(Math.abs(change) / 60);
                const changeSeconds = Math.floor(Math.abs(change) % 60);
                const changeFormatted = changeMinutes > 0 
                  ? `${changeMinutes}m ${changeSeconds}s`
                  : `${changeSeconds}s`;
                
                return (
                  <>
                    <span className={isPositive ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {isPositive ? '↑' : change < 0 ? '↓' : '→'} {changeFormatted} ({percentChange}%)
                    </span>
                    <span className="text-gray-500 ml-1">vs previous</span>
                  </>
                );
              })()}
            </p>
          )}
        </div>
        
        {/* Quick Exits (previously Bounce Rate) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Quick Exits</h3>
          <p className="text-2xl font-bold text-gray-900">
            {kpis.bounce_rate !== undefined 
              ? `${kpis.bounce_rate.toFixed(0)}%`
              : '-'
            }
          </p>
          {kpis.bounce_rate !== undefined && comparisonMode !== 'previous' && (
            <p className="text-xs mt-1">
              {kpis.bounce_rate < 40 
                ? <span className="text-green-600 font-medium">✅ Excellent</span>
                : kpis.bounce_rate < 60 
                ? <span className="text-blue-600 font-medium">Good</span>
                : <span className="text-red-600 font-medium">⚠️ High - needs attention</span>
              }
            </p>
          )}
          
          {/* 🆕 Show comparison change */}
          {comparisonMode === 'previous' && kpis.previous_bounce_rate !== undefined && (
            <p className="text-sm mt-1">
              {(() => {
                const current = kpis.bounce_rate || 0;
                const previous = kpis.previous_bounce_rate;
                const change = current - previous;
                const percentChange = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0.0';
                // For bounce rate, lower is better, so we invert the color logic
                const isPositive = change < 0;
                
                return (
                  <>
                    <span className={isPositive ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-500'}>
                      {change > 0 ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change).toFixed(1)}% ({percentChange}%)
                    </span>
                    <span className="text-gray-500 ml-1">vs previous</span>
                  </>
                );
              })()}
            </p>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Traffic Chart - Using the working pattern */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Traffic Overview</h3>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTrafficView('visitors')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    trafficView === 'visitors'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Visitors
                </button>
                <button
                  onClick={() => setTrafficView('pageviews')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    trafficView === 'pageviews'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Page Views
                </button>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {trafficView === 'visitors' 
                    ? (kpis.traffic?.unique_users || 0).toLocaleString()
                    : (kpis.traffic?.pageviews || 0).toLocaleString()
                  }
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {trafficView === 'visitors' ? 'Unique Visitors' : 'Total Page Views'}
                </div>
                
                {/* 🆕 Show comparison indicator */}
                {comparisonMode === 'previous' && (
                  <div className="text-sm mt-1">
                    {(() => {
                      const current = trafficView === 'visitors' 
                        ? (kpis.traffic?.unique_users || 0)
                        : (kpis.traffic?.pageviews || 0);
                      const previous = trafficView === 'visitors'
                        ? (kpis.traffic?.previous_unique_users || 0)
                        : (kpis.traffic?.previous_pageviews || 0);
                      
                      if (previous === 0) return null;
                      
                      const change = current - previous;
                      const percentChange = ((change / previous) * 100).toFixed(1);
                      const isPositive = change > 0;
                      
                      return (
                        <>
                          <span className={isPositive ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}>
                            {isPositive ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change)} ({percentChange}%)
                          </span>
                          <span className="text-gray-500 ml-1">vs previous</span>
                        </>
                      );
                    })()}
                  </div>
                )}
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
                    formatter={(value, name) => {
                      if (name === 'previousValue') {
                        return [value, 'Previous Period'];
                      }
                      return [
                        value === 0.1 && !kpis.traffic?.series ? 'No data' : value, 
                        trafficView === 'visitors' ? 'Visitors' : 'Page Views'
                      ];
                    }}
                    labelFormatter={(day) => `Day ${day + 1}`}
                  />
                  {/* Current period */}
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    fill="url(#trafficGradient)" 
                  />
                  
                  {/* 🆕 Previous period (if comparison enabled) */}
                  {comparisonMode === 'previous' && (
                    <Area
                      type="monotone"
                      dataKey="previousValue"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="transparent"
                      opacity={0.7}
                    />
                  )}
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
                  // Countries View with comparison
                  Object.entries(geographyData)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([country, count]) => {
                      const total = Object.values(geographyData).reduce((a: number, b: any) => a + (b as number), 0);
                      const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                      
                      // Get previous period data if available
                      const previousCount = previousGeographyData[country] || 0;
                      const previousTotal = Object.values(previousGeographyData).reduce((a: number, b: any) => a + (b as number), 0);
                      const previousPercentage = previousTotal > 0 ? (previousCount / previousTotal) * 100 : 0;
                      const change = previousCount > 0 ? (((count as number) - previousCount) / previousCount) * 100 : 0;
                      
                      return (
                        <div key={country} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700">{country}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {country === "No Data" ? "No data available" : `${count} users (${percentage.toFixed(1)}%)`}
                              </span>
                              {comparisonMode === 'previous' && previousCount > 0 && (
                                <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {country !== "No Data" && (
                            <div className="space-y-1">
                              {/* Current period bar */}
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(percentage, 5)}%` }}
                                ></div>
                              </div>
                              {/* Previous period bar (if comparison enabled) */}
                              {comparisonMode === 'previous' && previousCount > 0 && (
                                <div className="w-full bg-gray-200 rounded-full h-2 opacity-60">
                                  <div 
                                    className="bg-gray-400 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(previousPercentage, 5)}%` }}
                                    title={`Previous: ${previousCount} users (${previousPercentage.toFixed(1)}%)`}
                                  ></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  // Cities View with comparison
                  kpis.cityGeography?.cities && Object.keys(kpis.cityGeography.cities).length > 0 ? (
                    Object.entries(kpis.cityGeography.cities)
                      .sort(([,a], [,b]) => (b as any).count - (a as any).count)
                      .slice(0, 5)
                      .map(([cityKey, cityData]) => {
                        const data = cityData as any;
                        const total = Object.values(kpis.cityGeography.cities).reduce((a: number, b: any) => a + b.count, 0);
                        const percentage = total > 0 ? (data.count / total) * 100 : 0;
                        
                        // Get previous period data if available
                        const previousData = kpis.cityGeography?.previous_cities?.[cityKey] as any;
                        const previousCount = previousData?.count || 0;
                        const previousTotal = kpis.cityGeography?.previous_cities 
                          ? Object.values(kpis.cityGeography.previous_cities).reduce((a: number, b: any) => a + b.count, 0)
                          : 0;
                        const previousPercentage = previousTotal > 0 ? (previousCount / previousTotal) * 100 : 0;
                        const change = previousCount > 0 ? ((data.count - previousCount) / previousCount) * 100 : 0;
                        
                        return (
                          <div key={cityKey} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-700">{data.city}, {data.country}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{data.count} users ({percentage.toFixed(1)}%)</span>
                                {comparisonMode === 'previous' && previousCount > 0 && (
                                  <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {/* Current period bar */}
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(percentage, 5)}%` }}
                                ></div>
                              </div>
                              {/* Previous period bar (if comparison enabled) */}
                              {comparisonMode === 'previous' && previousCount > 0 && (
                                <div className="w-full bg-gray-200 rounded-full h-2 opacity-60">
                                  <div 
                                    className="bg-gray-400 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(previousPercentage, 5)}%` }}
                                    title={`Previous: ${previousCount} users (${previousPercentage.toFixed(1)}%)`}
                                  ></div>
                                </div>
                              )}
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
            {comparisonMode === 'previous' && Object.keys(previousDeviceMixData).length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  Current
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-400"></div>
                  Previous
                </span>
              </div>
            )}
          </div>
          <div className="h-48">
            {mounted ? (
              <div className="flex gap-6">
                {/* Current Period Pie Chart */}
                <div className="flex-1">
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
                          'Current Period'
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
                </div>
                
                {/* Previous Period Pie Chart (if comparison enabled) */}
                {comparisonMode === 'previous' && Object.keys(previousDeviceMixData).length > 0 && (
                  <div className="flex-1 opacity-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(previousDeviceMixData).map(([device, count], index) => ({
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
                          {Object.entries(previousDeviceMixData).map((entry, index) => {
                            // Use gray shades for previous period
                            const grayColors = ['#9CA3AF', '#6B7280', '#4B5563', '#374151'];
                            return <Cell key={`cell-prev-${index}`} fill={grayColors[index % grayColors.length]} />;
                          })}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => [
                            `${props.payload.actualValue} Users`,
                            'Previous Period'
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
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            )}
          </div>
          
          {/* Device legend with comparison */}
          <div className="mt-4 space-y-2">
            {Object.entries(deviceMixData).map(([device, count], index) => {
              const total = Object.values(deviceMixData).reduce((a: number, b: any) => a + (b as number), 0);
              const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
              
              // Get previous period data
              const previousCount = previousDeviceMixData[device] || 0;
              const previousTotal = Object.values(previousDeviceMixData).reduce((a: number, b: any) => a + (b as number), 0);
              const previousPercentage = previousTotal > 0 ? (previousCount / previousTotal) * 100 : 0;
              const change = previousCount > 0 ? (((count as number) - previousCount) / previousCount) * 100 : 0;
              
              return (
                <div key={device} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-gray-700">{device}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {device === "No Data" ? "No data" : `${count} (${percentage.toFixed(1)}%)`}
                    </div>
                    {comparisonMode === 'previous' && previousCount > 0 && (
                      <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Return Rate (previously User Retention) - With Daily/Cumulative Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Customer Return Rate</h3>
            
            {/* Retention Toggle Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setRetentionView('daily')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  retentionView === 'daily'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setRetentionView('cumulative')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  retentionView === 'cumulative'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cumulative
              </button>
            </div>

            {/* Retention Value Display with Status Indicator */}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {retentionData?.d7_retention?.toFixed(1) || 0}%
              </div>
              <div className="text-xs mt-1">
                {(retentionData?.d7_retention || 0) >= 40 
                  ? <span className="text-green-600 font-medium">✅ Excellent</span>
                  : (retentionData?.d7_retention || 0) >= 25
                  ? <span className="text-blue-600 font-medium">Good</span>
                  : <span className="text-orange-500 font-medium">⚠️ Needs attention</span>
                }
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                7-day {retentionView}
              </div>
            </div>
          </div>
          <div className="h-48">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retentionChartData}>
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
                      value === 0.1 && (!retentionData?.values || retentionData.values.length === 0) 
                        ? 'No data' 
                        : `${value}%`, 
                      retentionView === 'daily' ? 'Daily Retention' : 'Cumulative Retention'
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

        {/* Top Pages Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Most Visited Pages</h3>
            <div className="text-sm text-gray-500">
              {kpis.topPages?.length || 0} pages
            </div>
          </div>
          
          {kpis.topPages && kpis.topPages.length > 0 ? (
            <div className="space-y-3">
              {kpis.topPages.map((page: any, index: number) => {
                // Extract just the path from the URL (remove domain)
                let displayPath = page.url;
                try {
                  const urlObj = new URL(page.url);
                  displayPath = urlObj.pathname + urlObj.search + urlObj.hash;
                  if (displayPath === '') displayPath = '/';
                } catch (e) {
                  // If URL parsing fails, just remove protocol and domain manually
                  displayPath = page.url
                    .replace(/^https?:\/\//, '') // Remove protocol
                    .replace(/^[^\/]+/, '') // Remove domain
                    || '/';
                }
                
                // Get previous period data if available
                const previousPage = kpis.previous_topPages?.find((p: any) => p.url === page.url);
                const previousVisits = previousPage?.visits || 0;
                const change = previousVisits > 0 ? ((page.visits - previousVisits) / previousVisits) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate" title={displayPath}>
                        {displayPath}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${page.percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0 w-16 text-right">
                          {page.visits} visits
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900 w-12 text-right">
                        {page.percentage.toFixed(1)}%
                      </div>
                      {comparisonMode === 'previous' && previousVisits > 0 && (
                        <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'} w-14 text-right`}>
                          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <div className="text-center">
                <div className="text-lg font-medium">No Page Data</div>
                <div className="text-sm">Top pages data not available</div>
              </div>
            </div>
          )}
        </div>

        {/* Referring Sources / Traffic Sources Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Traffic Sources</h3>
            <div className="text-sm text-gray-500">
              Where visitors come from
            </div>
          </div>
          
          {kpis.referringSources && kpis.referringSources.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Pie Chart */}
              <div className="w-full lg:w-1/2 h-64">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={kpis.referringSources}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }: any) => `${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="visits"
                        nameKey="domain"
                      >
                        {kpis.referringSources.map((source: any, index: number) => {
                          // Determine color based on source type
                          const isDirect = source.domain === 'Direct / Unknown' || source.domain === 'Direct';
                          const isGoogle = source.domain.includes('google');
                          const isSocial = ['facebook', 'twitter', 'linkedin', 'instagram'].some((s: string) => source.domain.includes(s));
                          
                          let color = COLORS[index % COLORS.length];
                          if (isDirect) color = '#8B5CF6'; // Purple
                          else if (isGoogle) color = '#3B82F6'; // Blue
                          else if (isSocial) color = '#10B981'; // Green
                          
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any, name: string, props: any) => [
                          `${value} visits (${props.payload.percentage.toFixed(1)}%)`,
                          props.payload.domain
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Loading chart...</span>
                  </div>
                )}
              </div>

              {/* Legend List with comparison */}
              <div className="w-full lg:w-1/2 space-y-2">
                {kpis.referringSources.map((source: any, index: number) => {
                  // Determine icon/color based on source type
                  const isDirect = source.domain === 'Direct / Unknown' || source.domain === 'Direct';
                  const isGoogle = source.domain.includes('google');
                  const isSocial = ['facebook', 'twitter', 'linkedin', 'instagram'].some((s: string) => source.domain.includes(s));
                  
                  let icon = '🌐';
                  let color = COLORS[index % COLORS.length];
                  
                  if (isDirect) {
                    icon = '🔗';
                    color = '#8B5CF6'; // Purple
                  } else if (isGoogle) {
                    icon = '🔍';
                    color = '#3B82F6'; // Blue
                  } else if (isSocial) {
                    icon = '👥';
                    color = '#10B981'; // Green
                  }
                  
                  // Get previous period data if available
                  const previousSource = kpis.previous_referringSources?.find((s: any) => s.domain === source.domain);
                  const previousVisits = previousSource?.visits || 0;
                  const change = previousVisits > 0 ? ((source.visits - previousVisits) / previousVisits) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div 
                        className="flex-shrink-0 w-4 h-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-shrink-0 text-lg">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate" title={source.domain}>
                          {source.domain}
                        </div>
                        <div className="text-xs text-gray-500">
                          {source.visits} visits
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-900">
                          {source.percentage.toFixed(1)}%
                        </div>
                        {comparisonMode === 'previous' && previousVisits > 0 && (
                          <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'} w-14 text-right`}>
                            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <div className="text-center">
                <div className="text-lg font-medium">No Referral Data</div>
                <div className="text-sm">Traffic source data not available</div>
              </div>
            </div>
          )}
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
Retention: {JSON.stringify(retentionData?.values?.slice(0, 3) || retentionData, null, 2)}
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
