'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/** ------- Types that match /api/analytics/preview ------- */
type FunnelStep = { name: string; count: number };

type KPI = {
  traffic: { 
    series: number[]; 
    labels?: string[]; 
    unique_users: number; 
    pageviews: number;
    previous_unique_users?: number;
    previous_pageviews?: number;
  };
  funnel: {
    steps: FunnelStep[];
    conversion_rate: number;
    median_time_to_convert_sec: number;
    top_drop?: { from: string; to: string; dropRate: number };
    top_drop_rate?: number;
    previous_conversion_rate?: number;
    previous_signups?: number;
  };
  device: { device_mix: Record<string, number> };
  lifecycle: {
    labels: string[];
    series: {
      new: number[];
      returning: number[];
      resurrecting: number[];
      dormant: number[];
    };
  };
  retention: { 
    d7_retention: number; 
    values?: Array<{ day: number; count: number; percentage: number }>;
    retention_period?: number;
    requested_period?: number;
    label?: string;
    note?: string;
  };
  geography: { countries: Record<string, number> };
  cityGeography: { cities: Record<string, { city: string; country: string; count: number }> };
  meta?: { errors?: Record<string, string>; dateRange?: string };
};

type Props = { 
  clientId: string;
  clientName?: string;
  showAIInsights?: boolean;
  dateRange?: string;
  dateRangeLabel?: string;
  comparisonPeriod?: string;
  industryBenchmarks?: {
    conversionRate: { min: number; max: number };
    retentionRate: number;
  };
  chartConfig?: {
    deviceColors?: Record<string, string>;
    lifecycleLabels?: {
      new: string;
      returning: string;
      resurrecting: string;
      dormant: string;
    };
    lifecycleTitle?: string;
    lifecycleColors?: {
      new: string;
      returning: string;
      resurrecting: string;
      dormant: string;
    };
    chartColors?: {
      traffic: string;
      funnel: string;
      retention: string;
      retentionBenchmark: string;
    };
  };
  customLabels?: {
    conversionTarget?: string;
    retentionTarget?: string;
  };
  countryNameService?: (code: string) => string;
};

export default function WeeklyAnalyticsCard({ 
  clientId, 
  clientName, 
  showAIInsights = true, 
  dateRange = "7d",
  dateRangeLabel = "Last 7 days",
  comparisonPeriod = "Previous 7 days",
  industryBenchmarks = {
    conversionRate: { min: 3, max: 5 },
    retentionRate: 20
  },
  chartConfig = {
    deviceColors: {
      desktop: '#3B82F6',
      mobile: '#10B981',
      tablet: '#F59E0B',
      unknown: '#6B7280'
    },
    lifecycleLabels: {
      new: 'New',
      returning: 'Returning', 
      resurrecting: 'Resurrecting',
      dormant: 'Dormant'
    },
    lifecycleTitle: 'User lifecycle based on Pageview',
    lifecycleColors: {
      new: '#3B82F6',
      returning: '#10B981',
      resurrecting: '#F59E0B',
      dormant: '#EF4444'
    },
    chartColors: {
      traffic: '#3B82F6',
      funnel: '#3B82F6',
      retention: '#60a5fa',
      retentionBenchmark: '#ef4444'
    }
  },
  customLabels = {
    conversionTarget: `Industry target: 3-5%`,
    retentionTarget: `Target: 20%+`
  },
  countryNameService = (code: string) => {
    const basicMapping: Record<string, string> = {
      'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom',
      'DE': 'Germany', 'FR': 'France', 'JP': 'Japan', 'AU': 'Australia',
      'IN': 'India', 'BR': 'Brazil', 'MX': 'Mexico', 'CN': 'China',
      'RU': 'Russia', 'IT': 'Italy', 'ES': 'Spain', 'KR': 'South Korea',
      'NL': 'Netherlands', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
      'FI': 'Finland'
    };
    return basicMapping[code] || code;
  }
}: Props) {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [geographyView, setGeographyView] = useState<'countries' | 'cities'>('countries');

  // Add AI state directly in component
  const [ai, setAi] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch analytics data with dateRange parameter
  useEffect(() => {
    if (!clientId) return;
    
    setLoading(true);
    setErr(null);
    
    // Pass dateRange as query parameter
    fetch(`/api/analytics/preview?clientId=${encodeURIComponent(clientId)}&dateRange=${encodeURIComponent(dateRange)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('[DEBUG] Received analytics data:', data);
        setKpis(data.kpis || data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch analytics:', err);
        setErr(err.message);
        setLoading(false);
      });
  }, [clientId, dateRange]);

  // AI logic directly in component - FIXED VERSION
  useEffect(() => {
    // Reset state when dependencies change
    setAi(null);
    setAiErr(null);
    
    if (!kpis || !showAIInsights) {
      setAiLoading(false);
      return;
    }
    
    console.log('[DEBUG] Starting AI analysis for KPIs:', kpis);
    setAiLoading(true);
    
    // Add a small delay to prevent rapid-fire requests
    const timeoutId = setTimeout(() => {
      // Call the actual AI service
      fetch('/api/ai/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ kpis })
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('[DEBUG] AI Response received:', data);
          if (data.summary) {
            setAi(data.summary);
          } else {
            throw new Error('No summary in AI response');
          }
          setAiLoading(false);
        })
        .catch(err => {
          console.error('[DEBUG] AI call failed:', err);
          setAiErr(err.message);
          
          // Fallback to dynamic insights if AI fails
          const conversionRate = (kpis.funnel?.conversion_rate || 0) * 100;
          const retentionRate = (kpis.retention?.d7_retention || 0) * 100;
          const totalUsers = kpis.traffic?.unique_users || 0;
          
          // Use the current values instead of from dependencies
          const conversionBenchmark = 3; // Fixed value instead of industryBenchmarks.conversionRate.min
          const retentionBenchmark = 20; // Fixed value instead of industryBenchmarks.retentionRate
          const currentDateLabel = dateRange === '7d' ? 'Last 7 days' : 'Last 30 days'; // Derive from dateRange
          
          const fallbackAi = {
            headline: `Analytics for ${currentDateLabel}: ${totalUsers} users, ${conversionRate.toFixed(1)}% conversion rate`,
            highlights: [
              `${totalUsers} unique users generated ${kpis.traffic?.pageviews || 0} pageviews this ${currentDateLabel.toLowerCase()}`,
              `Conversion rate of ${conversionRate.toFixed(1)}% is ${conversionRate < conversionBenchmark ? `below the ${conversionBenchmark}-5% industry benchmark` : 'within acceptable range'}`,
              `Day 7 retention at ${retentionRate.toFixed(1)}% ${retentionRate < retentionBenchmark ? `needs improvement (target: ${retentionBenchmark}%+)` : 'meets industry standards'}`
            ],
            bottleneck: conversionRate < conversionBenchmark ? `Low conversion rate (${conversionRate.toFixed(1)}% vs ${conversionBenchmark}% target)` : `Retention could be improved (${retentionRate.toFixed(1)}% vs ${retentionBenchmark}% target)`,
            actions: [
              conversionRate < conversionBenchmark ? "Focus on funnel optimization" : "Maintain conversion performance",
              retentionRate < retentionBenchmark ? "Implement user retention strategies" : "Sustain retention rates",
              "Analyze traffic source quality"
            ]
          };
          
          setAi(fallbackAi);
          setAiLoading(false);
        });
    }, 500); // 500ms delay to debounce rapid changes

    // Cleanup timeout on unmount or dependency change
    return () => clearTimeout(timeoutId);
  }, [kpis, showAIInsights]); // REMOVED industryBenchmarks and dateRangeLabel

  // Add debugging for AI
  useEffect(() => {
    console.log('[DEBUG] AI State:', {
      showAIInsights,
      aiLoading,
      aiErr,
      ai,
      hasAiData: !!ai
    });
  }, [showAIInsights, aiLoading, aiErr, ai]);

  // Process data for charts
  const trafficData = useMemo(() => {
    const series = kpis?.traffic?.series || [];
    const labels = kpis?.traffic?.labels || [];
    return series.map((value, index) => ({
      day: labels[index] || `Day ${index + 1}`,
      value,
      dayNum: index
    }));
  }, [kpis]);

  const conversionRate = (kpis?.funnel?.conversion_rate || 0) * 100;
  const totalTraffic = kpis?.traffic?.unique_users || 0;
  const totalSignups = kpis?.funnel?.steps?.[kpis.funnel.steps.length - 1]?.count || 0;

  const retentionData = useMemo(() => {
    return (kpis?.retention?.values || []).map(v => ({
      day: v.day,
      retention: v.percentage
    }));
  }, [kpis]);

  const deviceData = useMemo(() => {
    const devices = kpis?.device?.device_mix || {};
    return Object.entries(devices).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value as number) * 100),
      fill: chartConfig.deviceColors?.[name] || chartConfig.deviceColors?.unknown || '#6B7280'
    }));
  }, [kpis, chartConfig.deviceColors]);

  // Create a dynamic country name resolver (could fetch from API or use a service)
  const getCountryName = (code: string): string => {
    // This could be replaced with a dynamic lookup service
    const basicMapping: Record<string, string> = {
      'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom',
      'DE': 'Germany', 'FR': 'France', 'JP': 'Japan', 'AU': 'Australia',
      'IN': 'India', 'BR': 'Brazil', 'MX': 'Mexico', 'CN': 'China',
      'RU': 'Russia', 'IT': 'Italy', 'ES': 'Spain', 'KR': 'South Korea',
      'NL': 'Netherlands', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
      'FI': 'Finland'
    };
    return basicMapping[code] || code;
  };

  // Update geography data to use dynamic country names
  const geographyData = useMemo(() => {
    const countries = kpis?.geography?.countries || {};
    return Object.entries(countries)
      .map(([code, count]) => ({
        code,
        name: getCountryName(code),
        count: count as number
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [kpis]);

  const cityGeographyData = useMemo(() => {
    const cities = kpis?.cityGeography?.cities || {};
    return Object.entries(cities)
      .map(([key, data]) => ({
        key,
        city: data.city,
        country: data.country,
        count: data.count,
        displayName: `${data.city}, ${getCountryName(data.country)}`
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [kpis]);

  const exportData = () => {
    if (!kpis) return;
    
    const exportObj = {
      timestamp: new Date().toISOString(),
      clientId,
      kpis,
      aiSummary: ai
    };
    
    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${clientId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Add this debug logging for funnel data
  useEffect(() => {
    if (kpis) {
      console.log('[DEBUG] KPIs received:', kpis);
      console.log('[DEBUG] Funnel data:', kpis.funnel);
      console.log('[DEBUG] Funnel steps:', kpis.funnel?.steps);
      console.log('[DEBUG] Number of funnel steps:', kpis.funnel?.steps?.length);
    }
  }, [kpis]);

  // Calculate dynamic percentage changes - make these accept comparison data from API
  const trafficChange = useMemo(() => {
    // If your API provides previous period data, use it here
    const currentTraffic = kpis?.traffic?.unique_users || 0;
    const previousTraffic = kpis?.traffic?.previous_unique_users || 0; // Add this to API response
    
    if (previousTraffic > 0) {
      const change = ((currentTraffic - previousTraffic) / previousTraffic) * 100;
      return {
        value: Math.abs(change),
        isPositive: change >= 0,
        formatted: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
      };
    }
    
    return {
      value: 0,
      isPositive: true,
      formatted: "No comparison data"
    };
  }, [kpis]);

  const signupChange = useMemo(() => {
    // Calculate signup change based on actual data
    const currentSignups = totalSignups;
    const previousSignups = kpis?.funnel?.previous_signups || 0; // Add this to API response
    
    if (previousSignups > 0) {
      const change = ((currentSignups - previousSignups) / previousSignups) * 100;
      return {
        value: Math.abs(change),
        isPositive: change >= 0,
        formatted: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
      };
    }
    
    return {
      value: 0,
      isPositive: true,
      formatted: "No comparison data"
    };
  }, [kpis, totalSignups]);

  const conversionChange = useMemo(() => {
    const currentConversion = conversionRate;
    const previousConversion = (kpis?.funnel?.previous_conversion_rate || 0) * 100; // Add this to API response
    
    if (previousConversion > 0) {
      const change = currentConversion - previousConversion;
      return {
        value: Math.abs(change),
        isNegative: change < 0,
        formatted: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
      };
    }
    
    return {
      value: 0,
      isNegative: false,
      formatted: "No comparison data"
    };
  }, [kpis, conversionRate]);

  // Add specific logging for retention
  useEffect(() => {
    if (kpis?.retention) {
      console.log('[DEBUG] Retention KPI received:', {
        d7_retention: kpis.retention.d7_retention,
        values_length: kpis.retention.values?.length || 0,
        retention_period: kpis.retention.retention_period,
        requested_period: kpis.retention.requested_period,
        label: kpis.retention.label,
        note: kpis.retention.note,
        first_few_values: kpis.retention.values?.slice(0, 5),
        raw_retention_data: kpis.retention
      });
    } else {
      console.log('[DEBUG] No retention data in KPIs:', kpis);
    }
  }, [kpis?.retention]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (err || !kpis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Failed to load analytics</div>
          <div className="text-gray-500">{err || 'Unknown error occurred'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header - Update to remove duplicate title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">{dateRangeLabel}</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <button
                onClick={exportData}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Export Data
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Updated just now</div>
          </div>
        </div>

        {/* AI Summary - Enhanced with better error handling and loading states */}
        {showAIInsights && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              {aiLoading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-xs text-gray-500">Analyzing...</span>
                </div>
              )}
            </div>
            
            {aiLoading && !ai && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Generating AI insights...</p>
                  <p className="text-gray-400 text-xs mt-1">This may take a few seconds</p>
                </div>
              </div>
            )}
            
            {aiErr && !ai && (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-red-600">!</span>
                </div>
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">AI Analysis Failed</h4>
                  <p className="text-sm text-red-600">{aiErr}</p>
                  <p className="text-xs text-red-500 mt-1">Using fallback analysis instead</p>
                </div>
              </div>
            )}
            
            {ai && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">AI</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">{ai.headline}</h4>
                    
                    {ai.highlights && ai.highlights.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Key Insights:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {ai.highlights.map((highlight, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {ai.bottleneck && (
                      <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                        <h5 className="text-sm font-medium text-orange-900 mb-1">Key Bottleneck:</h5>
                        <p className="text-sm text-orange-700">{ai.bottleneck}</p>
                      </div>
                    )}
                    
                    {ai.actions && ai.actions.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Recommended Actions:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {ai.actions.map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-4 h-4 bg-green-100 rounded text-xs flex items-center justify-center text-green-600 mt-0.5 flex-shrink-0">
                                {index + 1}
                              </div>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {!aiLoading && !aiErr && !ai && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No AI insights available</p>
                <p className="text-gray-400 text-xs mt-1">Check OpenAI API configuration</p>
              </div>
            )}
          </div>
        )}

        {/* KPI Cards - Update conversion target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Traffic */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Traffic</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {totalTraffic.toLocaleString()}
            </div>
            {/* Remove hardcoded "Prev: +8%" */}
            <div className="text-sm text-gray-500 font-medium">
              {trafficChange.formatted}
            </div>
          </div>

          {/* Signups */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Signups</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {totalSignups}
            </div>
            {/* Remove hardcoded "• 13%" */}
            <div className="text-sm text-gray-500 font-medium">
              {signupChange.formatted}
            </div>
            {/* Remove hardcoded previous value calculation */}
            <div className="text-xs text-gray-500 mt-1">
              Current period data
            </div>
          </div>

          {/* Conversion - Use dynamic target text */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Conversion</h3>
            <div className="text-3xl font-bold text-red-500 mb-1">
              {conversionRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500 font-medium">
              {conversionChange.formatted}
            </div>
            {/* Use configurable target text */}
            <div className="text-xs text-gray-500 mt-1">
              {customLabels.conversionTarget}
            </div>
          </div>

          {/* Top Drop-off - Already dynamic */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Top Drop-off Point</h3>
            <div className="text-sm font-medium text-gray-900 mb-1">
              {kpis?.funnel?.top_drop?.from && kpis?.funnel?.top_drop?.to 
                ? `${kpis.funnel.top_drop.from.substring(0, 25)}...` 
                : 'No drop-off data'
              }
            </div>
            <div className="text-xs text-gray-500">
              {kpis?.funnel?.top_drop?.from && kpis?.funnel?.top_drop?.to
                ? `${kpis.funnel.top_drop.from} → ${kpis.funnel.top_drop.to} (${((kpis.funnel.top_drop.dropRate || 0) * 100).toFixed(0)}% drop)`
                : 'No funnel analysis available'
              }
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Traffic Chart - First position */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic</h3>
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
                  <span className="text-gray-400 text-sm">No data available</span>
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {totalTraffic} users • {kpis?.traffic?.pageviews || 0} pageviews
            </div>
          </div>

          {/* Signup Funnel Chart - Second position - THIS SHOULD BE VISIBLE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Signup Funnel</h3>
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
                          // Smart truncation that preserves key words
                          if (value.length <= 22) return value;
                          
                          // Try to break at word boundaries
                          const words = value.split(' ');
                          if (words.length > 2) {
                            // Take first and last word for context
                            return `${words[0]} ... ${words[words.length - 1]}`;
                          }
                          
                          return value.substring(0, 19) + '...';
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px'
                        }}
                        formatter={(value, name) => [value, 'Users']}
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
                      {kpis?.funnel?.steps && kpis.funnel.steps.length > 0 && (
                        <div className="text-xs text-gray-400 mt-2">
                          <div>Debug: Steps found but no data</div>
                          {kpis.funnel.steps.map((step, i) => (
                            <div key={i}>{step.name}: {step.count}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Loading chart...</span>
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Conversion rate: <span className="font-medium">{conversionRate.toFixed(1)}%</span>
              {kpis?.funnel?.top_drop && (
                <span className="ml-4">
                  Biggest drop: <span className="font-medium text-red-600">
                    {((kpis.funnel.top_drop.dropRate || 0) * 100).toFixed(0)}%
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* User Lifecycle Chart - Use configurable title and labels */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {chartConfig.lifecycleTitle}
            </h3>
            <div className="h-48">
              {mounted ? (
                // Check if we have meaningful lifecycle data
                kpis?.lifecycle?.labels && kpis.lifecycle.labels.length > 0 && 
                kpis?.lifecycle?.series && 
                (kpis.lifecycle.series.new?.length > 0 || 
                 kpis.lifecycle.series.returning?.length > 0 || 
                 kpis.lifecycle.series.resurrecting?.length > 0 || 
                 kpis.lifecycle.series.dormant?.length > 0) &&
                // Check if there's actually data (not all zeros)
                [...(kpis.lifecycle.series.new || []), 
                 ...(kpis.lifecycle.series.returning || []), 
                 ...(kpis.lifecycle.series.resurrecting || []), 
                 ...(kpis.lifecycle.series.dormant || [])].some(value => value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={kpis.lifecycle.labels.map((label, index) => ({
                      day: label,
                      dayIndex: index,
                      new: kpis.lifecycle.series.new[index] || 0,
                      returning: kpis.lifecycle.series.returning[index] || 0,
                      resurrecting: kpis.lifecycle.series.resurrecting[index] || 0,
                      dormant: kpis.lifecycle.series.dormant[index] || 0,
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="dayIndex" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#6B7280' }}
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
                    />
                    <Area dataKey="new" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.8} />
                    <Area dataKey="returning" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.8} />
                    <Area dataKey="resurrecting" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.8} />
                    <Area dataKey="dormant" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.8} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-gray-400 text-sm block">No lifecycle data available</span>
                    <span className="text-gray-400 text-xs block mt-1">
                      {dateRangeLabel.toLowerCase()} period has no user activity
                    </span>
                  </div>
                </div>
              )) : (
                <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Loading chart...</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>{chartConfig.lifecycleLabels?.new}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{chartConfig.lifecycleLabels?.returning}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>{chartConfig.lifecycleLabels?.resurrecting}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>{chartConfig.lifecycleLabels?.dormant}</span>
              </div>
            </div>
          </div>

          {/* Device Mix Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Mix</h3>
            <div className="h-48">
              {mounted && deviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Usage']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No device data available</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              {deviceData.map((device, index) => (
                <div key={index} className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: device.fill }}
                    ></div>
                    <span>{device.name}</span>
                  </div>
                  <span className="font-medium">{device.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Geography Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Geography</h3>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setGeographyView('countries')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    geographyView === 'countries'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Countries
                </button>
                <button
                  onClick={() => setGeographyView('cities')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    geographyView === 'cities'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cities
                </button>
              </div>
            </div>
            <div className="h-48 overflow-y-auto">
              {mounted ? (
                geographyView === 'countries' ? (
                  geographyData.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
                        <span>Rank</span>
                        <span>Country</span>
                        <span className="text-right">Users</span>
                      </div>
                      {geographyData.map((country, index) => (
                        <div key={index} className="grid grid-cols-3 text-sm py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                          <span className="text-gray-500">#{index + 1}</span>
                          <span className="font-medium text-gray-900 truncate">{country.name}</span>
                          <span className="text-right font-semibold text-blue-600">{country.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No country data available</span>
                    </div>
                  )
                ) : (
                  cityGeographyData.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
                        <span>Rank</span>
                        <span>City</span>
                        <span className="text-right">Users</span>
                      </div>
                      {cityGeographyData.map((city, index) => (
                        <div key={index} className="grid grid-cols-3 text-sm py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                          <span className="text-gray-500">#{index + 1}</span>
                          <span className="font-medium text-gray-900 truncate" title={city.displayName}>{city.city}</span>
                          <span className="text-right font-semibold text-purple-600">{city.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No city data available</span>
                    </div>
                  )
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Loading...</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                Showing top {geographyView === 'countries' ? geographyData.length : cityGeographyData.length} {geographyView} by user count
              </div>
            </div>
          </div>

          {/* User Retention Chart - Show dynamic retention period */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              User Retention ({kpis?.retention?.label || '7-day'}) - {dateRangeLabel} cohorts
            </h3>
            <div className="h-48">
              {mounted && retentionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retentionData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <XAxis dataKey="day" tickFormatter={(day) => `Day ${day}`} />
                    <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Retention']} labelFormatter={(day) => `Day ${day}`} />
                    <Bar dataKey="retention" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    <ReferenceLine 
                      y={industryBenchmarks.retentionRate} 
                      stroke="#ef4444" 
                      strokeDasharray="3 3" 
                      label={{ 
                        value: `Industry Avg (${industryBenchmarks.retentionRate}%)`, 
                        position: "topRight" 
                      }} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-gray-400 text-sm block">No retention data available</span>
                    <span className="text-gray-400 text-xs block mt-1">
                      No user cohorts found for {dateRangeLabel.toLowerCase()} period
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-2 flex justify-between">
              <span>
                Day {kpis?.retention?.retention_period || 7} retention: 
                <span className={`font-medium ml-1 ${(kpis?.retention?.d7_retention || 0) * 100 >= industryBenchmarks.retentionRate ? 'text-green-600' : 'text-red-600'}`}>
                  {((kpis?.retention?.d7_retention || 0) * 100).toFixed(1)}%
                </span>
              </span>
              <span className="text-gray-500">
                Cohorts from {dateRangeLabel.toLowerCase()}
                {kpis?.retention?.note && (
                  <div className="text-orange-500 text-xs mt-1">
                    {kpis.retention.note}
                  </div>
                )}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
