import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
// Import from web/src/config/clients.js - the Next.js app configuration
import { CLIENTS } from '@/src/config/clients.js'

// Helper to convert dateRange string to PostHog format
const getDateRangeFilter = (dateRange: string) => {
  switch (dateRange) {
    case '7d':
      return { date_from: '-7d', date_to: null };
    case '30d':
      return { date_from: '-30d', date_to: null };
    case '24h':
      return { date_from: '-24h', date_to: null };
    case '1h':
      return { date_from: '-1h', date_to: null };
    case '30m':
      return { date_from: '-30m', date_to: null };
    case '14d':
      return { date_from: '-14d', date_to: null };
    case '90d':
      return { date_from: '-90d', date_to: null };
    default:
      return { date_from: '-7d', date_to: null };
  }
};

// Create dynamic queries with date range injection and comparison support
const createQueryWithDateRange = (baseQuery: any, dateRange: any, enableComparison = false) => {
  const query = JSON.parse(JSON.stringify(baseQuery));
  
  if (query.kind === 'InsightVizNode' && query.source) {
    query.source.dateRange = dateRange;
    
    // 🆕 Add compareFilter if comparison is enabled
    // ⚠️ IMPORTANT: Only add comparison for supported query types
    // Funnels, Lifecycle, and some other query types don't support comparison
    if (enableComparison) {
      const sourceKind = query.source.kind;
      
      // List of query types that support comparison
      const supportsComparison = [
        'TrendsQuery',           // Traffic, Device Mix, Geography, etc.
        'StickinessQuery',       // User stickiness
        'PathsQuery'             // User paths
        // NOT supported: 'FunnelsQuery', 'LifecycleQuery', 'RetentionQuery'
      ];
      
      if (supportsComparison.includes(sourceKind)) {
        query.source.compareFilter = {
          compare: true
        };
        console.log(`✅ Comparison enabled for ${sourceKind}`);
      } else {
        console.log(`⚠️ Comparison NOT supported for ${sourceKind} - skipping compareFilter (will render without comparison)`);
      }
    }
  } else if (query.kind === 'FunnelsQuery') {
    query.dateRange = dateRange;
    
    // ⚠️ FunnelsQuery does NOT support compareFilter - causes 400 errors
    // Just set the date range and skip comparison
    console.log(`⚠️ FunnelsQuery does NOT support comparison - rendering without comparison`);
  } else if (query.kind === 'HogQLQuery') {
    // HogQL queries have date ranges directly in the SQL WHERE clause
    // No need to modify, just return as-is
    return query;
  }
  
  return query;
};

// Enhanced logging function for queries
const logFinalQuery = (queryName: string, query: any, clientId: string) => {
  console.log(`\n🔍 ========== ${queryName.toUpperCase()} QUERY STRUCTURE ==========`);
  console.log(`📊 Query Name: ${queryName}`);
  console.log(`🏢 Client ID: ${clientId}`);
  console.log(`📋 Final Query JSON:`);
  console.log(JSON.stringify(query, null, 2));
  console.log(`========== END ${queryName.toUpperCase()} QUERY ==========\n`);
};

// EXACT PARSING FUNCTIONS FROM EXPRESS SERVER
const firstSeries = (j: any) =>
  (Array.isArray(j?.results) ? j.results[0] : (Array.isArray(j?.result) ? j.result[0] : j?.result || {}));

function parseTraffic(json: any, hasComparison: boolean = false) {
  console.log('[DEBUG] ========== PARSE TRAFFIC START ==========');
  console.log('[DEBUG] hasComparison:', hasComparison);
  console.log('[DEBUG] json has results:', !!json?.results);
  console.log('[DEBUG] json.results length:', json?.results?.length);
  
  // Extract results array from PostHog response
  const resultsArray = json?.results || json;
  
  // Handle the PostHog Query API response format (array of results with multiple series)
  if (Array.isArray(resultsArray) && resultsArray.length > 0) {
    // Log first few series to understand structure
    console.log('[DEBUG] First series structure:', JSON.stringify(resultsArray[0], null, 2));
    if (resultsArray.length > 1) {
      console.log('[DEBUG] Second series structure:', JSON.stringify(resultsArray[1], null, 2));
    }
    
    let currentVisitors = null;
    let previousVisitors = null;
    let currentPageViews = null;
    let previousPageViews = null;
    
    if (hasComparison && resultsArray.length >= 2) {
      console.log('[DEBUG] Attempting to parse comparison data. Total series:', resultsArray.length);
      
      // PostHog returns comparison data with compare_label field
      // Expected format when comparison is enabled:
      // [0] = current visitors (compare_label: "current", math: "dau")
      // [1] = current pageviews (compare_label: "current", math: "total")
      // [2] = previous visitors (compare_label: "previous", math: "dau")
      // [3] = previous pageviews (compare_label: "previous", math: "total")
      
      resultsArray.forEach((series: any, idx: number) => {
        console.log(`[DEBUG] Series ${idx}:`, {
          compare_label: series.compare_label,
          math: series.action?.math,
          custom_name: series.action?.custom_name,
          count: series.count,
          dataLength: series.data?.length
        });
      });
      
      for (const series of resultsArray) {
        const isVisitors = series.action?.math === 'dau' || series.action?.custom_name?.includes('visitors');
        const isPageViews = series.action?.math === 'total' || series.action?.custom_name?.includes('views');
        const isCurrent = series.compare_label === 'current';
        const isPrevious = series.compare_label === 'previous';
        
        if (isCurrent && isVisitors && !currentVisitors) {
          currentVisitors = series;
          console.log('[DEBUG] ✅ Found current visitors:', series.count);
        } else if (isCurrent && isPageViews && !currentPageViews) {
          currentPageViews = series;
          console.log('[DEBUG] ✅ Found current pageviews:', series.count);
        } else if (isPrevious && isVisitors && !previousVisitors) {
          previousVisitors = series;
          console.log('[DEBUG] ✅ Found previous visitors:', series.count);
        } else if (isPrevious && isPageViews && !previousPageViews) {
          previousPageViews = series;
          console.log('[DEBUG] ✅ Found previous pageviews:', series.count);
        }
      }
      
      // If we found all comparison data, return it
      if (currentVisitors && previousVisitors && currentPageViews && previousPageViews) {
        const uniqueVisitorsData = currentVisitors.data || [];
        const previousVisitorsData = previousVisitors.data || [];
        const pageViewsData = currentPageViews.data || [];
        const previousPageViewsData = previousPageViews.data || [];
        const labels = currentVisitors.labels || currentVisitors.days || uniqueVisitorsData.map((_: any, i: number) => `Day ${i + 1}`);
        
        const uniques = currentVisitors.count || currentVisitors.aggregated_value || 
                       uniqueVisitorsData.reduce((a: number, b: number) => a + (b || 0), 0);
        const pageviews = currentPageViews.count || currentPageViews.aggregated_value || 
                         pageViewsData.reduce((a: number, b: number) => a + (b || 0), 0);
        
        const previousUniques = previousVisitors.count || previousVisitors.aggregated_value || 
                               previousVisitorsData.reduce((a: number, b: number) => a + (b || 0), 0);
        const previousPageviews = previousPageViews.count || previousPageViews.aggregated_value || 
                                 previousPageViewsData.reduce((a: number, b: number) => a + (b || 0), 0);
        
        console.log('[DEBUG] ✅ Parsed traffic WITH COMPARISON:', {
          unique_users: uniques,
          previous_unique_users: previousUniques,
          pageviews: pageviews,
          previous_pageviews: previousPageviews,
          seriesLength: uniqueVisitorsData.length
        });
        
        return {
          series: uniqueVisitorsData,
          pageviewsSeries: pageViewsData,
          previous_series: previousVisitorsData,
          previous_pageviews_series: previousPageViewsData,
          labels: labels,
          unique_users: uniques,
          pageviews: pageviews,
          previous_unique_users: previousUniques,
          previous_pageviews: previousPageviews
        };
      }
      
      console.log('[DEBUG] ⚠️ Could not find all comparison series, falling back to standard parsing');
    }
    
    // FALLBACK: No comparison or comparison parsing failed - use standard format
    // Check if we have multiple series (unique visitors + page views) without comparison
    if (resultsArray.length >= 2) {
      const uniqueVisitorsSeries = resultsArray[0]; // First series: unique visitors (dau)
      const pageViewsSeries = resultsArray[1];      // Second series: page views (total)
      
      if (uniqueVisitorsSeries && Array.isArray(uniqueVisitorsSeries.data) &&
          pageViewsSeries && Array.isArray(pageViewsSeries.data)) {
        const uniqueVisitorsData = uniqueVisitorsSeries.data;
        const pageViewsData = pageViewsSeries.data;
        const labels = uniqueVisitorsSeries.labels || uniqueVisitorsSeries.days || uniqueVisitorsData.map((_: any, i: number) => `Day ${i + 1}`);
        
        // Get unique users from first series (dau)
        const uniques = uniqueVisitorsSeries.count || uniqueVisitorsSeries.aggregated_value || 
                       uniqueVisitorsSeries.data.reduce((a: number, b: number) => a + (b || 0), 0);
        
        // Get page views from second series (total)
        const pageviews = pageViewsSeries.count || pageViewsSeries.aggregated_value || 
                         pageViewsSeries.data.reduce((a: number, b: number) => a + (b || 0), 0);
        
        console.log('[DEBUG] Parsed traffic (multi-series format):', { 
          dataLength: uniqueVisitorsData.length,
          unique_users: uniques,
          pageviews: pageviews
        });
        
        return {
          series: uniqueVisitorsData,          // Unique visitors series for chart
          pageviewsSeries: pageViewsData,      // Page views series for chart
          labels: labels,
          unique_users: uniques,
          pageviews: pageviews
        };
      }
    }
    
    // Single series fallback
    const firstResult = resultsArray[0];
    if (firstResult && Array.isArray(firstResult.data)) {
      const data = firstResult.data;
      const labels = firstResult.labels || firstResult.days || data.map((_: any, i: number) => `Day ${i + 1}`);
      const total = data.reduce((a: number, b: number) => a + (b || 0), 0);
      const uniques = firstResult.count || total;
      
      console.log('[DEBUG] Parsed traffic (single series format):', { 
        dataLength: data.length,
        series: data, 
        labels: labels.slice(0, 5),
        unique_users: uniques, 
        pageviews: total 
      });
      
      return {
        series: data,
        labels: labels,
        unique_users: uniques,
        pageviews: total
      };
    }
  }
  
  // Handle PostHog results format (wrapped in results array with multiple series)
  if (json && Array.isArray(json.results) && json.results.length > 0) {
    // Check if we have multiple series
    if (json.results.length >= 2) {
      const uniqueVisitorsSeries = json.results[0];
      const pageViewsSeries = json.results[1];
      
      if (uniqueVisitorsSeries && Array.isArray(uniqueVisitorsSeries.data) &&
          pageViewsSeries && Array.isArray(pageViewsSeries.data)) {
        const uniqueVisitorsData = uniqueVisitorsSeries.data;
        const pageViewsData = pageViewsSeries.data;
        const labels = uniqueVisitorsSeries.labels || uniqueVisitorsSeries.days || uniqueVisitorsData.map((_: any, i: number) => `Day ${i + 1}`);
        
        const uniques = uniqueVisitorsSeries.count || uniqueVisitorsSeries.aggregated_value || 
                       uniqueVisitorsSeries.data.reduce((a: number, b: number) => a + (b || 0), 0);
        const pageviews = pageViewsSeries.count || pageViewsSeries.aggregated_value || 
                         pageViewsSeries.data.reduce((a: number, b: number) => a + (b || 0), 0);
        
        console.log('[DEBUG] Parsed traffic (results multi-series format):', { 
          unique_users: uniques,
          pageviews: pageviews
        });
        
        return {
          series: uniqueVisitorsData,
          pageviewsSeries: pageViewsData,
          labels: labels,
          unique_users: uniques,
          pageviews: pageviews
        };
      }
    }
    
    // Single series fallback
    const firstResult = json.results[0];
    if (firstResult && Array.isArray(firstResult.data)) {
      const data = firstResult.data;
      const labels = firstResult.labels || firstResult.days || data.map((_: any, i: number) => `Day ${i + 1}`);
      const total = data.reduce((a: number, b: number) => a + (b || 0), 0);
      const uniques = firstResult.count || total;
      
      return {
        series: data,
        labels: labels,
        unique_users: uniques,
        pageviews: total
      };
    }
  }
  
  // Handle legacy format (fallback)
  const s = firstSeries(json) || {};
  const data = s.data || [];
  const total = data.reduce((a: number, b: number) => a + (b || 0), 0);
  const uniques = s.aggregated_value ?? s.count ?? total;
  const labels = data.map((_: any, i: number) => `Day ${i + 1}`);
  
  return {
    series: data,
    labels: labels,
    unique_users: uniques,
    pageviews: total
  };
}

function parseFunnel(json: any) {
  console.log('[DEBUG] Raw funnel JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { 
      steps: [], 
      conversion_rate: 0, 
      median_time_to_convert_sec: 0, 
      top_drop: { from: 'N/A', to: 'N/A', dropRate: 0 } 
    };
  }

  const steps = results.map((step: any, index: number) => {
    const stepName = step.custom_name || step.name || `Step ${index + 1}`;
    return {
      name: stepName,
      count: step.count || 0
    };
  });

  const firstCount = steps[0]?.count || 0;
  const lastCount = steps[steps.length - 1]?.count || 0;
  const conversion_rate = firstCount > 0 ? lastCount / firstCount : 0;

  // Find the biggest drop-off
  let maxDrop = 0;
  let topDrop = { from: 'N/A', to: 'N/A', dropRate: 0 };
  
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    const next = steps[i + 1];
    const dropRate = current.count > 0 ? (current.count - next.count) / current.count : 0;
    
    if (dropRate > maxDrop) {
      maxDrop = dropRate;
      topDrop = {
        from: current.name,
        to: next.name,
        dropRate: dropRate
      };
    }
  }

  return {
    steps,
    conversion_rate,
    median_time_to_convert_sec: json?.median_time_to_convert_sec || 0,
    top_drop: topDrop
  };
}

function parseLifecycle(json: any) {
  console.log('[DEBUG] Raw lifecycle JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { labels: [], series: { new: [], returning: [], resurrecting: [], dormant: [] } };
  }

  const labels: string[] = [];
  const series = { new: [], returning: [], resurrecting: [], dormant: [] };
  
  // Extract dates/labels from the first result
  if (results[0]?.data && Array.isArray(results[0].data)) {
    const dataLength = results[0].data.length;
    for (let i = 0; i < dataLength; i++) {
      labels.push(`Day ${i + 1}`);
    }
  }
  
  // Process each lifecycle category
  results.forEach((result: any) => {
    const label = result?.label?.toLowerCase() || '';
    const data = result?.data || [];
    
    if (label.includes('new')) {
      series.new = data;
    } else if (label.includes('returning')) {
      series.returning = data;
    } else if (label.includes('resurrecting')) {
      series.resurrecting = data;
    } else if (label.includes('dormant')) {
      series.dormant = data;
    }
  });

  return { labels, series };
}

function parseDeviceMix(json: any, hasComparison: boolean = false) {
  console.log('[DEBUG] Raw device JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { device_mix: {}, previous_device_mix: {} };
  }

  // Separate current and previous data if comparison is enabled
  const currentResults = hasComparison 
    ? results.filter((r: any) => r.compare_label === 'current' || (!r.compare_label && !hasComparison))
    : results;
    
  const previousResults = hasComparison
    ? results.filter((r: any) => r.compare_label === 'previous')
    : [];

  // Process current period
  const device_mix: any = {};
  let total = 0;

  currentResults.forEach((result: any) => {
    const device = result?.breakdown_value || result?.label || 'Unknown';
    const count = result?.count || 
                  (Array.isArray(result?.data) ? result.data.reduce((a: number, b: number) => a + (b || 0), 0) : 0) ||
                  result?.aggregated_value || 0;
    
    if (device && count > 0) {
      device_mix[device] = { count, percentage: 0 };
      total += count;
    }
  });

  // Calculate percentages while keeping counts
  if (total > 0) {
    Object.keys(device_mix).forEach(device => {
      device_mix[device].percentage = (device_mix[device].count / total) * 100;
    });
  }
  
  // Process previous period if comparison is enabled
  const previous_device_mix: any = {};
  let previousTotal = 0;
  
  if (hasComparison && previousResults.length > 0) {
    previousResults.forEach((result: any) => {
      const device = result?.breakdown_value || result?.label || 'Unknown';
      const count = result?.count || 
                    (Array.isArray(result?.data) ? result.data.reduce((a: number, b: number) => a + (b || 0), 0) : 0) ||
                    result?.aggregated_value || 0;
      
      if (device && count > 0) {
        previous_device_mix[device] = { count, percentage: 0 };
        previousTotal += count;
      }
    });
    
    // Calculate percentages while keeping counts
    if (previousTotal > 0) {
      Object.keys(previous_device_mix).forEach(device => {
        previous_device_mix[device].percentage = (previous_device_mix[device].count / previousTotal) * 100;
      });
    }
    
    console.log('[DEBUG] Device Mix WITH COMPARISON:', {
      current_devices: Object.keys(device_mix),
      previous_devices: Object.keys(previous_device_mix)
    });
  }
  
  return { 
    device_mix,
    ...(hasComparison && { previous_device_mix })
  };
}

function parseGeography(json: any, hasComparison: boolean = false) {
  const results = json?.results || json?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { countries: {}, previous_countries: {} };
  }

  // Separate current and previous data if comparison is enabled
  const currentResults = hasComparison 
    ? results.filter((r: any) => r.compare_label === 'current' || (!r.compare_label && !hasComparison))
    : results;
    
  const previousResults = hasComparison
    ? results.filter((r: any) => r.compare_label === 'previous')
    : [];

  // Process current period
  const countries: any = {};
  
  currentResults.forEach((result: any) => {
    const countryCode = result?.breakdown_value || result?.label || 'Unknown';
    const count = result?.count || 
                  (Array.isArray(result?.data) ? result.data.reduce((a: number, b: number) => a + (b || 0), 0) : 0) ||
                  result?.aggregated_value || 0;
    
    if (countryCode && countryCode !== 'Unknown' && count > 0) {
      countries[countryCode.toUpperCase()] = count;
    }
  });
  
  // Process previous period if comparison is enabled
  const previous_countries: any = {};
  
  if (hasComparison && previousResults.length > 0) {
    previousResults.forEach((result: any) => {
      const countryCode = result?.breakdown_value || result?.label || 'Unknown';
      const count = result?.count || 
                    (Array.isArray(result?.data) ? result.data.reduce((a: number, b: number) => a + (b || 0), 0) : 0) ||
                    result?.aggregated_value || 0;
      
      if (countryCode && countryCode !== 'Unknown' && count > 0) {
        previous_countries[countryCode.toUpperCase()] = count;
      }
    });
    
    console.log('[DEBUG] Geography WITH COMPARISON:', {
      current_countries: Object.keys(countries),
      previous_countries: Object.keys(previous_countries)
    });
  }
  
  return { 
    countries,
    ...(hasComparison && { previous_countries })
  };
}

function parseCityGeography(json: any, hasComparison: boolean = false) {
  console.log('[DEBUG] Raw city geography JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || json?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No city geography results found');
    return { cities: {}, previous_cities: {} };
  }

  // Separate current and previous data if comparison is enabled
  const currentResults = hasComparison 
    ? results.filter((r: any) => r.compare_label === 'current' || (!r.compare_label && !hasComparison))
    : results;
    
  const previousResults = hasComparison
    ? results.filter((r: any) => r.compare_label === 'previous')
    : [];

  // Process current period
  const cities: any = {};
  
  currentResults.forEach((result: any) => {
    // Handle breakdown array format: ["US", "New York"] or similar
    const breakdownValue = result?.breakdown_value;
    let countryCode = 'Unknown';
    let cityName = 'Unknown';
    
    if (Array.isArray(breakdownValue) && breakdownValue.length >= 2) {
      countryCode = breakdownValue[0] || 'Unknown';
      cityName = breakdownValue[1] || 'Unknown';
    } else if (typeof breakdownValue === 'string') {
      // Fallback if it's a single string
      cityName = breakdownValue;
    }
    
    const count = result?.count || 
                  (Array.isArray(result?.data) ? result.data.reduce((a: number, b: number) => a + (b || 0), 0) : 0) ||
                  result?.aggregated_value || 0;
    
    if (cityName !== 'Unknown' && count > 0) {
      const key = `${cityName}, ${countryCode}`;
      cities[key] = {
        city: cityName,
        country: countryCode,
        count: count
      };
    }
  });

  // Process previous period if comparison is enabled
  const previous_cities: any = {};
  
  if (hasComparison && previousResults.length > 0) {
    previousResults.forEach((result: any) => {
      const breakdownValue = result?.breakdown_value;
      let countryCode = 'Unknown';
      let cityName = 'Unknown';
      
      if (Array.isArray(breakdownValue) && breakdownValue.length >= 2) {
        countryCode = breakdownValue[0] || 'Unknown';
        cityName = breakdownValue[1] || 'Unknown';
      } else if (typeof breakdownValue === 'string') {
        cityName = breakdownValue;
      }
      
      const count = result?.count || 
                    (Array.isArray(result?.data) ? result.data.reduce((a: number, b: number) => a + (b || 0), 0) : 0) ||
                    result?.aggregated_value || 0;
      
      if (cityName !== 'Unknown' && count > 0) {
        const key = `${cityName}, ${countryCode}`;
        previous_cities[key] = {
          city: cityName,
          country: countryCode,
          count: count
        };
      }
    });
    
    console.log('[DEBUG] City geography WITH COMPARISON:', { 
      current_cities: cities, 
      previous_cities 
    });
    
    return { cities, previous_cities };
  }

  console.log('[DEBUG] Parsed cities (no comparison):', cities);
  
  return { cities };
}

// Make PostHog API call with enhanced logging
const callPostHogAPI = async (projectId: string, apiKey: string, queryName: string, query: any) => {
  console.log(`\n🚀 ========== ${queryName.toUpperCase()} API CALL ==========`);
  console.log(`📍 URL: https://us.posthog.com/api/projects/${projectId}/query/`);
  console.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);
  console.log(`📊 Query Name: ${queryName}`);
  
  try {
    const response = await fetch(`https://us.posthog.com/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    console.log(`✅ [${queryName}] Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${queryName}] PostHog API error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`PostHog API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(`📊 [${queryName}] Response Data Structure:`, {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'not array',
      firstItemKeys: Array.isArray(data) && data[0] ? Object.keys(data[0]) : 'no first item',
      hasResults: !!data.results,
      resultsLength: data.results ? data.results.length : 'no results'
    });
    
    // Log first few data points for relevant queries
    if (Array.isArray(data) && data[0] && data[0].data) {
      console.log(`📈 [${queryName}] Data Preview:`, {
        dataLength: data[0].data.length,
        firstFewPoints: data[0].data.slice(0, 5),
        lastFewPoints: data[0].data.slice(-5),
        labels: data[0].labels?.slice(0, 3),
        count: data[0].count
      });
    }
    
    console.log(`========== END ${queryName.toUpperCase()} API CALL ==========\n`);

    return data;
  } catch (error) {
    console.error(`❌ [${queryName}] PostHog API call failed:`, error);
    throw error;
  }
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const companyId = searchParams.get('companyId')
    const clientId = searchParams.get('clientId') 
    const dateRange = searchParams.get('dateRange') || '30d'
    const compare = searchParams.get('compare') === 'true'
    const funnelType = searchParams.get('funnelType') || 'profile' // Add funnelType parameter

    console.log('\n🔍 ========== ANALYTICS REQUEST START ==========');
    console.log('📋 Request Parameters:', { companyId, clientId, dateRange, compare, funnelType });

    let company
    let clientConfig = null

    // Find company and client configuration
    if (companyId) {
      const { data } = await supabase
        .from('companies')
        .select('id, name, slug, posthog_project_id, posthog_api_key_encrypted, posthog_client_id')
        .eq('id', companyId)
        .single()
      company = data
      
      // Find client config by client ID
      const effectiveClientId = company?.posthog_client_id || company?.slug
      clientConfig = CLIENTS.find(c => c.clientId === effectiveClientId)
    } else if (clientId) {
      console.log(`🔍 Looking for company with clientId: ${clientId}`);
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, posthog_project_id, posthog_api_key_encrypted, posthog_client_id')
        .or(`posthog_client_id.eq.${clientId},slug.eq.${clientId}`)
        .single()
      
      company = data
      
      // Find client config by client ID
      clientConfig = CLIENTS.find(c => c.clientId === clientId)
    } else {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (!clientConfig) {
      return NextResponse.json({ error: `Client configuration not found for ${clientId}` }, { status: 404 });
    }

    if (!company.posthog_project_id || !company.posthog_api_key_encrypted) {
      return NextResponse.json({ error: 'PostHog not configured for this company' }, { status: 400 })
    }

    const apiKey = company.posthog_api_key_encrypted;
    const projectId = company.posthog_project_id.toString();
    const effectiveClientId = company.posthog_client_id || company.slug;

    console.log(`🏢 Company: ${company.name}`);
    console.log(`🔢 Project ID: ${projectId}`);
    console.log(`🆔 Client ID: ${effectiveClientId}`);
    console.log(`⚙️ Using client config: ${clientConfig.name}`);

    // Get date filter
    const dateFilter = getDateRangeFilter(dateRange);
    console.log(`📅 Date Filter:`, dateFilter);

    // ✅ Use the client's configured queries instead of hardcoded ones
    const baseQueries = clientConfig.queries;

    console.log('\n🔧 ========== CREATING QUERIES WITH DATE RANGES ==========');
    console.log(`🔄 Comparison Mode: ${compare ? 'ENABLED' : 'DISABLED'}`);
    
    // Create queries with date range injection and comparison support
    const trafficQuery = baseQueries.traffic ? 
      createQueryWithDateRange(baseQueries.traffic.query, dateFilter, compare) : null;
    if (trafficQuery) logFinalQuery('TRAFFIC', trafficQuery, effectiveClientId);

    // Dynamically detect funnel query names and derive funnel types
    // Look for queries ending with "Funnel" (e.g., profileFunnel, renewalFunnel, funnel)
    const funnelQueryNames = Object.keys(baseQueries).filter(key => key.toLowerCase().includes('funnel'));
    console.log('🔍 Detected funnel queries:', funnelQueryNames);
    
    // Create a map of funnel type to query
    const funnelQueries: Record<string, any> = {};
    funnelQueryNames.forEach(queryName => {
      // Extract the funnel type from the query name
      // e.g., "profileFunnel" -> "profile", "renewalFunnel" -> "renewal", "funnel" -> "funnel"
      const funnelType = queryName.toLowerCase().replace('funnel', '') || 'funnel';
      funnelQueries[funnelType] = createQueryWithDateRange((baseQueries as any)[queryName].query, dateFilter, compare);
      logFinalQuery(`FUNNEL_${funnelType.toUpperCase()}`, funnelQueries[funnelType], effectiveClientId);
    });

    // For backward compatibility, map to expected variable names
    const funnelQuery = funnelQueries.profile || funnelQueries.funnel || null;
    const renewalFunnelQuery = funnelQueries.renewal || null;


    const lifecycleQuery = baseQueries.lifecycle ? 
      createQueryWithDateRange(baseQueries.lifecycle.query, dateFilter, compare) : null;
    if (lifecycleQuery) logFinalQuery('LIFECYCLE', lifecycleQuery, effectiveClientId);

    const deviceQuery = baseQueries.deviceMix ? 
      createQueryWithDateRange(baseQueries.deviceMix.query, dateFilter, compare) : null;
    if (deviceQuery) logFinalQuery('DEVICE', deviceQuery, effectiveClientId);

    const geographyQuery = baseQueries.geography ?
      createQueryWithDateRange(baseQueries.geography.query, dateFilter, compare) : null;
    if (geographyQuery) logFinalQuery('GEOGRAPHY', geographyQuery, effectiveClientId);

    const cityGeographyQuery = baseQueries.cityGeography ?
      createQueryWithDateRange(baseQueries.cityGeography.query, dateFilter, compare) : null;
    if (cityGeographyQuery) logFinalQuery('CITY_GEOGRAPHY', cityGeographyQuery, effectiveClientId);

    // 🆕 NEW: Session metrics queries
    const sessionsQuery = baseQueries.sessions ?
      createQueryWithDateRange(baseQueries.sessions.query, dateFilter, compare) : null;
    if (sessionsQuery) logFinalQuery('SESSIONS', sessionsQuery, effectiveClientId);

    const sessionDurationQuery = baseQueries.sessionDuration ?
      createQueryWithDateRange(baseQueries.sessionDuration.query, dateFilter, compare) : null;
    if (sessionDurationQuery) logFinalQuery('SESSION_DURATION', sessionDurationQuery, effectiveClientId);

    // 🆕 Bounce rate uses a single query with 2 series (sessions and pageviews)
    const bounceRateQuery = baseQueries.bounceRate ?
      createQueryWithDateRange(baseQueries.bounceRate.query, dateFilter, compare) : null;
    if (bounceRateQuery) logFinalQuery('BOUNCE_RATE', bounceRateQuery, effectiveClientId);

    // Top Pages query
    const topPagesQuery = baseQueries.topPages ?
      createQueryWithDateRange(baseQueries.topPages.query, dateFilter, compare) : null;
    if (topPagesQuery) logFinalQuery('TOP_PAGES', topPagesQuery, effectiveClientId);

    // Referring Domains query
    const referringDomainsQuery = baseQueries.referringDomains ?
      createQueryWithDateRange(baseQueries.referringDomains.query, dateFilter, compare) : null;
    if (referringDomainsQuery) logFinalQuery('REFERRING_DOMAINS', referringDomainsQuery, effectiveClientId);

    // Dynamically detect retention queries (similar to funnel detection)
    const retentionQueryNames = Object.keys(baseQueries).filter(key => key.toLowerCase().includes('retention'));
    console.log('🔍 Detected retention queries:', retentionQueryNames);
    
    // Create a map of retention type to query
    const retentionQueries: Record<string, any> = {};
    retentionQueryNames.forEach(queryName => {
      // Extract the retention type from the query name
      // e.g., "dailyRetention" -> "daily", "cumulativeRetention" -> "cumulative", "retention" -> "retention"
      const retentionType = queryName.toLowerCase().replace('retention', '') || 'retention';
      retentionQueries[retentionType] = createQueryWithDateRange((baseQueries as any)[queryName].query, dateFilter, compare);
      logFinalQuery(`RETENTION_${retentionType.toUpperCase()}`, retentionQueries[retentionType], effectiveClientId);
    });

    // For backward compatibility, map to expected variable name
    const retentionQuery = retentionQueries.daily || retentionQueries.retention || null;
    const cumulativeRetentionQuery = retentionQueries.cumulative || null;

    // Create debug payload info
    const debugQueries: any = {}
    
    if (trafficQuery) {
      debugQueries.traffic = {
        url: `https://us.posthog.com/api/projects/${projectId}/query/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payload: { query: trafficQuery }
      }
    }

    if (funnelQuery) {
      debugQueries.funnel = {
        url: `https://us.posthog.com/api/projects/${projectId}/query/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payload: { query: funnelQuery }
      }
    }

    if (renewalFunnelQuery) {
      debugQueries.renewalFunnel = {
        url: `https://us.posthog.com/api/projects/${projectId}/query/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payload: { query: renewalFunnelQuery }
      }
    }

    if (lifecycleQuery) {
      debugQueries.lifecycle = {
        url: `https://us.posthog.com/api/projects/${projectId}/query/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payload: { query: lifecycleQuery }
      }
    }

    if (deviceQuery) {
      debugQueries.device = {
        url: `https://us.posthog.com/api/projects/${projectId}/query/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payload: { query: deviceQuery }
      }
    }

    if (geographyQuery) {
      debugQueries.geography = {
        url: `https://us.posthog.com/api/projects/${projectId}/query/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payload: { query: geographyQuery }
      }
    }

    if (cityGeographyQuery) {
      debugQueries.cityGeography = {
        url: `https://us.posthog.com/api/projects/${projectId}/query/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payload: { query: cityGeographyQuery }
      }
    }

    if (retentionQuery) {
      debugQueries.retention = {
        url: `https://us.posthog.com/api/projects/${projectId}/query/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        payload: { query: retentionQuery }
      }
    }

    console.log('\n🚀 ========== MAKING POSTHOG API CALLS ==========');

    // Make PostHog API calls - only for configured queries
    const apiCallPromises = []
    
    if (trafficQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'TRAFFIC', trafficQuery))
    if (funnelQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'FUNNEL', funnelQuery))
    if (renewalFunnelQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'RENEWAL_FUNNEL', renewalFunnelQuery))
    if (lifecycleQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'LIFECYCLE', lifecycleQuery))
    if (deviceQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'DEVICE', deviceQuery))
    if (geographyQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'GEOGRAPHY', geographyQuery))
    if (cityGeographyQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'CITY_GEOGRAPHY', cityGeographyQuery))
    if (retentionQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'RETENTION_DAILY', retentionQuery))
    if (cumulativeRetentionQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'RETENTION_CUMULATIVE', cumulativeRetentionQuery))
    // 🆕 NEW: Session metrics
    if (sessionsQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'SESSIONS', sessionsQuery))
    if (sessionDurationQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'SESSION_DURATION', sessionDurationQuery))
    if (bounceRateQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'BOUNCE_RATE', bounceRateQuery))
    if (topPagesQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'TOP_PAGES', topPagesQuery))
    if (referringDomainsQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'REFERRING_DOMAINS', referringDomainsQuery))

    const apiCalls = await Promise.allSettled(apiCallPromises)

    console.log('\n📊 ========== API CALLS COMPLETED ==========');
    console.log(`✅ Successful calls: ${apiCalls.filter(r => r.status === 'fulfilled').length}`);
    console.log(`❌ Failed calls: ${apiCalls.filter(r => r.status === 'rejected').length}`);

    // Map results by type for safer access
    const resultsByType = new Map();
    let callIndex = 0;
    
    if (trafficQuery) resultsByType.set('traffic', apiCalls[callIndex++]);
    if (funnelQuery) resultsByType.set('funnel', apiCalls[callIndex++]);
    if (renewalFunnelQuery) resultsByType.set('renewalFunnel', apiCalls[callIndex++]);
    if (lifecycleQuery) resultsByType.set('lifecycle', apiCalls[callIndex++]);
    if (deviceQuery) resultsByType.set('device', apiCalls[callIndex++]);
    if (geographyQuery) resultsByType.set('geography', apiCalls[callIndex++]);
    if (cityGeographyQuery) resultsByType.set('cityGeography', apiCalls[callIndex++]);
    if (retentionQuery) resultsByType.set('dailyRetention', apiCalls[callIndex++]);
    if (cumulativeRetentionQuery) resultsByType.set('cumulativeRetention', apiCalls[callIndex++]);
    // 🆕 NEW: Session metrics
    if (sessionsQuery) resultsByType.set('sessions', apiCalls[callIndex++]);
    if (sessionDurationQuery) resultsByType.set('sessionDuration', apiCalls[callIndex++]);
    if (bounceRateQuery) resultsByType.set('bounceRate', apiCalls[callIndex++]);
    if (topPagesQuery) resultsByType.set('topPages', apiCalls[callIndex++]);
    if (referringDomainsQuery) resultsByType.set('referringDomains', apiCalls[callIndex++]);

    const kpis: any = {
      meta: { 
        comparisonEnabled: compare,
        dateRange: dateRange,
        clientId: effectiveClientId,
        funnelType: funnelType,
        errors: []
      }
    };

    // Only initialize KPIs for queries that are defined for this client
    if (trafficQuery) {
      kpis.traffic = { unique_users: 0, pageviews: 0, series: [], labels: [] };
    }
    
    if (funnelQuery) {
      kpis.funnel = { steps: [], conversion_rate: 0 };
    }
    
    if (renewalFunnelQuery) {
      kpis.renewalFunnel = { steps: [], conversion_rate: 0 };
    }
    
    if (lifecycleQuery) {
      kpis.lifecycle = { 
        labels: [], 
        series: { 
          'new': [],
          returning: [], 
          resurrecting: [], 
          dormant: [] 
        } 
      };
    }
    
    if (retentionQuery || cumulativeRetentionQuery) {
      kpis.retention = { 
        daily: { d7_retention: 0, values: [] },
        cumulative: { d7_retention: 0, values: [] }
      };
    }
    
    if (deviceQuery) {
      kpis.device = { device_mix: {} };
    }
    
    if (geographyQuery) {
      kpis.geography = { countries: {} };
    }
    
    if (cityGeographyQuery) {
      kpis.cityGeography = { cities: {} };
    }

    console.log('\n🔄 ========== PROCESSING RESULTS ==========');

    // Define result variables at top level for debug section
    const trafficResult = resultsByType.get('traffic');
    const funnelResult = resultsByType.get('funnel');
    const renewalFunnelResult = resultsByType.get('renewalFunnel');
    const lifecycleResult = resultsByType.get('lifecycle');
    const deviceResult = resultsByType.get('device');
    const geographyResult = resultsByType.get('geography');
    const cityGeographyResult = resultsByType.get('cityGeography');
    const dailyRetentionResult = resultsByType.get('dailyRetention');
    const cumulativeRetentionResult = resultsByType.get('cumulativeRetention');

    // Process traffic data with logging only if query was defined
    if (trafficQuery) {
      if (trafficResult && trafficResult.status === 'fulfilled') {
        console.log('🔄 Processing TRAFFIC data...');
        kpis.traffic = parseTraffic(trafficResult.value, compare); // 🆕 Pass compare flag
        console.log('✅ Traffic processed:', {
          series_length: kpis.traffic.series?.length,
          labels_length: kpis.traffic.labels?.length,
          unique_users: kpis.traffic.unique_users,
          pageviews: kpis.traffic.pageviews,
          has_previous_data: !!kpis.traffic.previous_unique_users // 🆕 Log if comparison data exists
        });
      } else if (trafficResult && trafficResult.status === 'rejected') {
        console.log('❌ Traffic failed:', trafficResult.reason.message);
        kpis.meta.errors.push(`Traffic query failed: ${trafficResult.reason.message}`);
      }
    }

    // Process funnel data only if query was defined
    if (funnelQuery) {
      if (funnelResult && funnelResult.status === 'fulfilled') {
        console.log('🔄 Processing FUNNEL data...');
        kpis.funnel = parseFunnel(funnelResult.value);
        console.log('✅ Funnel processed:', {
          steps_count: kpis.funnel.steps?.length,
          conversion_rate: kpis.funnel.conversion_rate
        });
      } else if (funnelResult && funnelResult.status === 'rejected') {
        console.log('❌ Funnel failed:', funnelResult.reason.message);
        kpis.meta.errors.push(`Funnel query failed: ${funnelResult.reason.message}`);
      }
    }

    // Process renewal funnel data only if query was defined
    if (renewalFunnelQuery) {
      if (renewalFunnelResult && renewalFunnelResult.status === 'fulfilled') {
        console.log('🔄 Processing RENEWAL_FUNNEL data...');
        kpis.renewalFunnel = parseFunnel(renewalFunnelResult.value);
        console.log('✅ Renewal Funnel processed:', {
          steps_count: kpis.renewalFunnel.steps?.length,
          conversion_rate: kpis.renewalFunnel.conversion_rate
        });
      } else if (renewalFunnelResult && renewalFunnelResult.status === 'rejected') {
        console.log('❌ Renewal Funnel failed:', renewalFunnelResult.reason.message);
        kpis.meta.errors.push(`Renewal Funnel query failed: ${renewalFunnelResult.reason.message}`);
      }
    }

    // Process lifecycle data only if query was defined
    if (lifecycleQuery) {
      if (lifecycleResult && lifecycleResult.status === 'fulfilled') {
        console.log('🔄 Processing LIFECYCLE data...');
        kpis.lifecycle = parseLifecycle(lifecycleResult.value);
        console.log('✅ Lifecycle processed:', {
          labels_count: kpis.lifecycle.labels?.length,
          series_keys: Object.keys(kpis.lifecycle.series || {})
        });
      } else if (lifecycleResult && lifecycleResult.status === 'rejected') {
        console.log('❌ Lifecycle failed:', lifecycleResult.reason.message);
        kpis.meta.errors.push(`Lifecycle query failed: ${lifecycleResult.reason.message}`);
      }
    }

    // Process device data only if query was defined
    if (deviceQuery) {
      if (deviceResult && deviceResult.status === 'fulfilled') {
        console.log('🔄 Processing DEVICE data...');
        kpis.device = parseDeviceMix(deviceResult.value, compare);
        console.log('✅ Device processed:', {
          device_types: Object.keys(kpis.device.device_mix || {})
        });
      } else if (deviceResult && deviceResult.status === 'rejected') {
        console.log('❌ Device failed:', deviceResult.reason.message);
        kpis.meta.errors.push(`Device query failed: ${deviceResult.reason.message}`);
      }
    }

    // Process geography data only if query was defined
    if (geographyQuery) {
      if (geographyResult && geographyResult.status === 'fulfilled') {
        console.log('🔄 Processing GEOGRAPHY data...');
        kpis.geography = parseGeography(geographyResult.value, compare);
        console.log('✅ Geography processed:', {
          countries_count: Object.keys(kpis.geography.countries || {}).length
        });
      } else if (geographyResult && geographyResult.status === 'rejected') {
        console.log('❌ Geography failed:', geographyResult.reason.message);
        kpis.meta.errors.push(`Geography query failed: ${geographyResult.reason.message}`);
      }
    }

    // Process city geography data only if query was defined
    if (cityGeographyQuery) {
      if (cityGeographyResult && cityGeographyResult.status === 'fulfilled') {
        console.log('🔄 Processing CITY_GEOGRAPHY data...');
        kpis.cityGeography = parseCityGeography(cityGeographyResult.value, compare);
        console.log('✅ City Geography processed:', {
          cities_count: Object.keys(kpis.cityGeography.cities || {}).length
        });
      } else if (cityGeographyResult && cityGeographyResult.status === 'rejected') {
        console.log('❌ City Geography failed:', cityGeographyResult.reason.message);
        kpis.meta.errors.push(`City Geography query failed: ${cityGeographyResult.reason.message}`);
      }
    }

    // Process retention data - both daily and cumulative
    if (retentionQuery) {
      if (dailyRetentionResult && dailyRetentionResult.status === 'fulfilled') {
        console.log('🔄 Processing DAILY RETENTION data...');
        console.log('📊 Raw Daily Retention Response:', JSON.stringify(dailyRetentionResult.value, null, 2));
        kpis.retention.daily = parseRetention(dailyRetentionResult.value, dateRange);
        console.log('✅ Daily Retention processed:', {
          d7_retention: kpis.retention.daily.d7_retention,
          values_count: kpis.retention.daily.values?.length,
          first_3_values: kpis.retention.daily.values?.slice(0, 3)
        });
      } else if (dailyRetentionResult && dailyRetentionResult.status === 'rejected') {
        console.log('❌ Daily Retention failed:', dailyRetentionResult.reason.message);
        kpis.meta.errors.push(`Daily Retention query failed: ${dailyRetentionResult.reason.message}`);
      }
    }

    if (cumulativeRetentionQuery) {
      if (cumulativeRetentionResult && cumulativeRetentionResult.status === 'fulfilled') {
        console.log('🔄 Processing CUMULATIVE RETENTION data...');
        console.log('📊 Raw Cumulative Retention Response:', JSON.stringify(cumulativeRetentionResult.value, null, 2));
        kpis.retention.cumulative = parseRetention(cumulativeRetentionResult.value, dateRange, true); // Pass true for cumulative
        console.log('✅ Cumulative Retention processed:', {
          d7_retention: kpis.retention.cumulative.d7_retention,
          values_count: kpis.retention.cumulative.values?.length,
          first_3_values: kpis.retention.cumulative.values?.slice(0, 3)
        });
      } else if (cumulativeRetentionResult && cumulativeRetentionResult.status === 'rejected') {
        console.log('❌ Cumulative Retention failed:', cumulativeRetentionResult.reason.message);
        kpis.meta.errors.push(`Cumulative Retention query failed: ${cumulativeRetentionResult.reason.message}`);
      }
    }

    // 🆕 NEW: Process session metrics
    const sessionsResult = resultsByType.get('sessions');
    const sessionDurationResult = resultsByType.get('sessionDuration');
    const bounceRateResult = resultsByType.get('bounceRate');

    if (sessionsQuery && sessionsResult?.status === 'fulfilled') {
      console.log('🔄 Processing SESSIONS data...');
      console.log('📊 Raw Sessions Response:', JSON.stringify(sessionsResult.value, null, 2));
      
      // TrendsQuery returns: { results: [{ aggregated_value: count }] }
      // With comparison: { results: [current, previous] } or [{ compare_label: 'current' }, { compare_label: 'previous' }]
      const resultsArray = sessionsResult.value?.results || [];
      
      if (compare && resultsArray.length > 0) {
        console.log(`[DEBUG] Sessions comparison mode: ${resultsArray.length} results found`);
        
        // Try to find current and previous data by compare_label
        let currentData = resultsArray.find((r: any) => r.compare_label === 'current' || !r.compare_label);
        let previousData = resultsArray.find((r: any) => r.compare_label === 'previous');
        
        // Fallback: assume order-based if no labels (first=current, second=previous)
        if (!currentData && resultsArray.length >= 1) {
          currentData = resultsArray[0];
          previousData = resultsArray.length >= 2 ? resultsArray[1] : null;
        }
        
        kpis.sessions = currentData?.aggregated_value || currentData?.count || 0;
        kpis.previous_sessions = previousData?.aggregated_value || previousData?.count || 0;
        
        console.log('✅ Sessions WITH COMPARISON:', {
          current: kpis.sessions,
          previous: kpis.previous_sessions
        });
      } else {
        // No comparison
        const sessionsData = resultsArray[0];
        kpis.sessions = sessionsData?.aggregated_value || sessionsData?.count || 0;
        console.log('✅ Sessions (unique_session count):', kpis.sessions);
      }
    } else if (sessionsResult?.status === 'rejected') {
      console.log('❌ Sessions query failed:', sessionsResult.reason?.message);
      kpis.meta.errors.push(`Sessions query failed: ${sessionsResult.reason?.message}`);
    }

    if (sessionDurationQuery && sessionDurationResult?.status === 'fulfilled') {
      console.log('🔄 Processing SESSION DURATION data...');
      console.log('📊 Raw Session Duration Response:', JSON.stringify(sessionDurationResult.value, null, 2));
      
      // TrendsQuery returns: { results: [{ aggregated_value: avg_duration }] }
      // With comparison: { results: [current, previous] } or [{ compare_label: 'current' }, { compare_label: 'previous' }]
      const resultsArray = sessionDurationResult.value?.results || [];
      
      if (compare && resultsArray.length > 0) {
        console.log(`[DEBUG] Session Duration comparison mode: ${resultsArray.length} results found`);
        
        // Try to find current and previous data by compare_label
        let currentData = resultsArray.find((r: any) => r.compare_label === 'current' || !r.compare_label);
        let previousData = resultsArray.find((r: any) => r.compare_label === 'previous');
        
        // Fallback: assume order-based if no labels (first=current, second=previous)
        if (!currentData && resultsArray.length >= 1) {
          currentData = resultsArray[0];
          previousData = resultsArray.length >= 2 ? resultsArray[1] : null;
        }
        
        kpis.session_duration = currentData?.aggregated_value || 0;
        kpis.previous_session_duration = previousData?.aggregated_value || 0;
        
        console.log('✅ Session Duration WITH COMPARISON:', {
          current: Math.floor(kpis.session_duration / 60) + 'm ' + Math.floor(kpis.session_duration % 60) + 's',
          previous: Math.floor(kpis.previous_session_duration / 60) + 'm ' + Math.floor(kpis.previous_session_duration % 60) + 's'
        });
      } else {
        // No comparison
        const durationData = resultsArray[0];
        kpis.session_duration = durationData?.aggregated_value || 0;
        console.log('✅ Session Duration (avg $session_duration):', 
                    Math.floor(kpis.session_duration / 60), 'min', 
                    Math.floor(kpis.session_duration % 60), 'sec');
      }
    } else if (sessionDurationResult?.status === 'rejected') {
      console.log('❌ Session Duration query failed:', sessionDurationResult.reason?.message);
      kpis.meta.errors.push(`Session Duration query failed: ${sessionDurationResult.reason?.message}`);
    }

    // Bounce Rate calculation using HogQL query results
    // HogQL returns the calculated bounce_rate directly from the query
    // Note: HogQL doesn't support compareFilter, so we'd need separate queries for comparison
    if (bounceRateQuery && bounceRateResult?.status === 'fulfilled') {
      console.log('🔄 Processing BOUNCE RATE data (HogQL)...');
      console.log('📊 Raw Bounce Rate Response:', JSON.stringify(bounceRateResult.value, null, 2));
      
      // HogQL queries return results in a different format than TrendsQuery
      // Response structure: { results: [[bounce_rate_value]] }
      // Example: { results: [[24.44]] }
      // With comparison (if supported): { results: [[current_rate], [previous_rate]] }
      const bounceData = bounceRateResult.value?.results;
      
      let bounceRateValue;
      let previousBounceRateValue;
      
      if (Array.isArray(bounceData) && bounceData.length > 0) {
        // Extract current bounce rate
        if (Array.isArray(bounceData[0]) && bounceData[0].length > 0) {
          // Format: [[24.44]] - nested array (most common for HogQL)
          bounceRateValue = bounceData[0][0];
          console.log('📊 Extracted bounce rate from nested array:', bounceRateValue);
        } else if (typeof bounceData[0] === 'object' && bounceData[0] !== null && bounceData[0].bounce_rate !== undefined) {
          // Format: [{ bounce_rate: 24.44 }] - object with bounce_rate key
          bounceRateValue = bounceData[0].bounce_rate;
          console.log('📊 Extracted bounce rate from object:', bounceRateValue);
        } else if (typeof bounceData[0] === 'number') {
          // Format: [24.44] - direct number
          bounceRateValue = bounceData[0];
          console.log('📊 Extracted bounce rate as direct number:', bounceRateValue);
        }
        
        // Extract previous bounce rate if comparison is enabled and data exists
        if (compare && bounceData.length >= 2) {
          if (Array.isArray(bounceData[1]) && bounceData[1].length > 0) {
            previousBounceRateValue = bounceData[1][0];
          } else if (typeof bounceData[1] === 'number') {
            previousBounceRateValue = bounceData[1];
          }
          
          if (previousBounceRateValue !== undefined) {
            console.log('📊 Extracted PREVIOUS bounce rate:', previousBounceRateValue);
          }
        }
      }
      
      if (typeof bounceRateValue === 'number' && !isNaN(bounceRateValue)) {
        kpis.bounce_rate = bounceRateValue;
        
        if (typeof previousBounceRateValue === 'number' && !isNaN(previousBounceRateValue)) {
          kpis.previous_bounce_rate = previousBounceRateValue;
          console.log('✅ Bounce Rate WITH COMPARISON:', {
            current: kpis.bounce_rate.toFixed(1) + '%',
            previous: kpis.previous_bounce_rate.toFixed(1) + '%'
          });
        } else {
          console.log('✅ Bounce Rate (HogQL):', kpis.bounce_rate.toFixed(1), '%', 
                      '(accurate: sessions with 1 pageview / total sessions)');
        }
      } else {
        kpis.bounce_rate = 0;
        console.log('⚠️ Bounce Rate: Could not parse HogQL response, defaulting to 0%');
        console.log('⚠️ Parsed value:', bounceRateValue, '| Type:', typeof bounceRateValue);
      }
    } else if (bounceRateResult?.status === 'rejected') {
      console.log('❌ Bounce Rate query failed:', bounceRateResult.reason?.message);
      kpis.meta.errors.push(`Bounce Rate query failed: ${bounceRateResult.reason?.message}`);
    }

    // Top Pages processing
    const topPagesResult = resultsByType.get('topPages');
    if (topPagesQuery && topPagesResult?.status === 'fulfilled') {
      console.log('🔄 Processing TOP PAGES data...');
      console.log('📊 Raw Top Pages Response:', JSON.stringify(topPagesResult.value, null, 2));
      
      let pagesData = topPagesResult.value?.results || [];
      
      // Separate current and previous data if comparison is enabled
      let currentPagesData = pagesData;
      let previousPagesData: any[] = [];
      
      if (compare && pagesData.length > 0) {
        currentPagesData = pagesData.filter((r: any) => r.compare_label === 'current' || !r.compare_label);
        previousPagesData = pagesData.filter((r: any) => r.compare_label === 'previous');
      }
      
      // Process current period top pages
      const topPages: Array<{ url: string; visits: number; percentage: number }> = [];
      let totalVisits = 0;
      
      // Calculate total visits first
      currentPagesData.forEach((page: any) => {
        totalVisits += page.aggregated_value || 0;
      });
      
      // Build top pages array with percentages
      currentPagesData.forEach((page: any) => {
        const visits = page.aggregated_value || 0;
        const url = page.breakdown_value?.[0] || page.label || 'Unknown';
        const percentage = totalVisits > 0 ? (visits / totalVisits) * 100 : 0;
        
        topPages.push({
          url: url,
          visits: visits,
          percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal
        });
      });
      
      // Sort by visits (descending) and take top 10
      topPages.sort((a, b) => b.visits - a.visits);
      kpis.topPages = topPages.slice(0, 10);
      
      // Process previous period top pages if comparison is enabled
      if (compare && previousPagesData.length > 0) {
        const previousTopPages: Array<{ url: string; visits: number; percentage: number }> = [];
        let previousTotalVisits = 0;
        
        // Calculate total visits for previous period
        previousPagesData.forEach((page: any) => {
          previousTotalVisits += page.aggregated_value || 0;
        });
        
        // Build previous top pages array with percentages
        previousPagesData.forEach((page: any) => {
          const visits = page.aggregated_value || 0;
          const url = page.breakdown_value?.[0] || page.label || 'Unknown';
          const percentage = previousTotalVisits > 0 ? (visits / previousTotalVisits) * 100 : 0;
          
          previousTopPages.push({
            url: url,
            visits: visits,
            percentage: Math.round(percentage * 10) / 10
          });
        });
        
        // Sort by visits and take top 10
        previousTopPages.sort((a, b) => b.visits - a.visits);
        kpis.previous_topPages = previousTopPages.slice(0, 10);
        
        console.log('✅ Top Pages WITH COMPARISON:', {
          current_pages: kpis.topPages.length,
          previous_pages: kpis.previous_topPages.length,
          current_top_3: kpis.topPages.slice(0, 3).map((p: any) => `${p.url} (${p.visits})`),
          previous_top_3: kpis.previous_topPages.slice(0, 3).map((p: any) => `${p.url} (${p.visits})`)
        });
      } else {
        console.log('✅ Top Pages processed:', kpis.topPages.length, 'pages');
        console.log('📊 Top 3:', kpis.topPages.slice(0, 3).map((p: any) => `${p.url} (${p.visits})`));
      }
    } else if (topPagesResult?.status === 'rejected') {
      console.log('❌ Top Pages query failed:', topPagesResult.reason?.message);
      kpis.meta.errors.push(`Top Pages query failed: ${topPagesResult.reason?.message}`);
    }

    // Referring Domains processing
    const referringDomainsResult = resultsByType.get('referringDomains');
    if (referringDomainsQuery && referringDomainsResult?.status === 'fulfilled') {
      console.log('🔄 Processing REFERRING DOMAINS data...');
      console.log('📊 Raw Referring Domains Response:', JSON.stringify(referringDomainsResult.value, null, 2));
      
      let domainsData = referringDomainsResult.value?.results || [];
      
      // Separate current and previous data if comparison is enabled
      let currentDomainsData = domainsData;
      let previousDomainsData: any[] = [];
      
      if (compare && domainsData.length > 0) {
        currentDomainsData = domainsData.filter((r: any) => r.compare_label === 'current' || !r.compare_label);
        previousDomainsData = domainsData.filter((r: any) => r.compare_label === 'previous');
      }
      
      // Process current period referring sources
      const referringSources: Array<{ domain: string; visits: number; percentage: number }> = [];
      let totalVisits = 0;
      
      // Calculate total visits first
      currentDomainsData.forEach((domain: any) => {
        totalVisits += domain.aggregated_value || 0;
      });
      
      // Build referring sources array with percentages
      currentDomainsData.forEach((domain: any) => {
        const visits = domain.aggregated_value || 0;
        let domainName = domain.breakdown_value || domain.label || 'Direct / Unknown';
        
        // Clean up domain name
        if (domainName === '' || domainName === null || domainName === 'null') {
          domainName = 'Direct / Unknown';
        }
        
        const percentage = totalVisits > 0 ? (visits / totalVisits) * 100 : 0;
        
        referringSources.push({
          domain: domainName,
          visits: visits,
          percentage: Math.round(percentage * 10) / 10
        });
      });
      
      // Sort by visits (descending)
      referringSources.sort((a, b) => b.visits - a.visits);
      kpis.referringSources = referringSources;
      
      // Process previous period referring sources if comparison is enabled
      if (compare && previousDomainsData.length > 0) {
        const previousReferringSources: Array<{ domain: string; visits: number; percentage: number }> = [];
        let previousTotalVisits = 0;
        
        // Calculate total visits for previous period
        previousDomainsData.forEach((domain: any) => {
          previousTotalVisits += domain.aggregated_value || 0;
        });
        
        // Build previous referring sources array with percentages
        previousDomainsData.forEach((domain: any) => {
          const visits = domain.aggregated_value || 0;
          let domainName = domain.breakdown_value || domain.label || 'Direct / Unknown';
          
          // Clean up domain name
          if (domainName === '' || domainName === null || domainName === 'null') {
            domainName = 'Direct / Unknown';
          }
          
          const percentage = previousTotalVisits > 0 ? (visits / previousTotalVisits) * 100 : 0;
          
          previousReferringSources.push({
            domain: domainName,
            visits: visits,
            percentage: Math.round(percentage * 10) / 10
          });
        });
        
        // Sort by visits
        previousReferringSources.sort((a, b) => b.visits - a.visits);
        kpis.previous_referringSources = previousReferringSources;
        
        console.log('✅ Referring Domains WITH COMPARISON:', {
          current_sources: kpis.referringSources.length,
          previous_sources: kpis.previous_referringSources.length,
          current_top_3: kpis.referringSources.slice(0, 3).map((s: any) => `${s.domain} (${s.visits})`),
          previous_top_3: kpis.previous_referringSources.slice(0, 3).map((s: any) => `${s.domain} (${s.visits})`)
        });
      } else {
        console.log('✅ Referring Domains processed:', kpis.referringSources.length, 'sources');
        console.log('📊 Top 3:', kpis.referringSources.slice(0, 3).map((s: any) => `${s.domain} (${s.visits})`));
      }
    } else if (referringDomainsResult?.status === 'rejected') {
      console.log('❌ Referring Domains query failed:', referringDomainsResult.reason?.message);
      kpis.meta.errors.push(`Referring Domains query failed: ${referringDomainsResult.reason?.message}`);
    }

    console.log('\n📋 ========== FINAL RESPONSE SUMMARY ==========');
    if (kpis.traffic) console.log(`🎯 Traffic Data: ${kpis.traffic.series?.length || 0} points`);
    if (kpis.funnel) console.log(`🎯 Funnel Steps: ${kpis.funnel.steps?.length || 0}`);
    if (kpis.renewalFunnel) console.log(`🎯 Renewal Funnel Steps: ${kpis.renewalFunnel.steps?.length || 0}`);
    if (kpis.lifecycle) console.log(`🎯 Lifecycle Series: ${Object.keys(kpis.lifecycle.series || {}).length}`);
    if (kpis.device) console.log(`🎯 Device Types: ${Object.keys(kpis.device.device_mix || {}).length}`);
    if (kpis.geography) console.log(`🎯 Countries: ${Object.keys(kpis.geography.countries || {}).length}`);
    if (kpis.cityGeography) console.log(`🎯 Cities: ${Object.keys(kpis.cityGeography.cities || {}).length}`);
    if (kpis.retention) console.log(`🎯 Retention (Daily): ${kpis.retention.daily?.d7_retention}% | (Cumulative): ${kpis.retention.cumulative?.d7_retention}%`);
    if (kpis.sessions) console.log(`🎯 Sessions: ${kpis.sessions}`);
    if (kpis.session_duration) console.log(`🎯 Session Duration: ${Math.floor(kpis.session_duration / 60)}m ${Math.floor(kpis.session_duration % 60)}s`);
    if (kpis.bounce_rate !== undefined) console.log(`🎯 Bounce Rate: ${kpis.bounce_rate.toFixed(1)}%`);
    if (kpis.topPages) console.log(`🎯 Top Pages: ${kpis.topPages.length} pages`);
    if (kpis.referringSources) console.log(`🎯 Referring Sources: ${kpis.referringSources.length} sources`);
    console.log(`🎯 Errors: ${kpis.meta.errors.length}`);
    console.log('========== ANALYTICS REQUEST END ==========\n');

    return NextResponse.json({
      success: true,
      kpis,
      company: {
        name: company.name,
        clientId: effectiveClientId,
        config: clientConfig.name
      },
      // Include debug info for browser console
      debug: {
        queries: debugQueries,
        apiResponses: {
          ...(trafficQuery && { traffic: trafficResult?.status === 'fulfilled' ? trafficResult.value : { error: trafficResult?.reason?.message } }),
          ...(funnelQuery && { funnel: funnelResult?.status === 'fulfilled' ? funnelResult.value : { error: funnelResult?.reason?.message } }),
          ...(renewalFunnelQuery && { renewalFunnel: renewalFunnelResult?.status === 'fulfilled' ? renewalFunnelResult.value : { error: renewalFunnelResult?.reason?.message } }),
          ...(lifecycleQuery && { lifecycle: lifecycleResult?.status === 'fulfilled' ? lifecycleResult.value : { error: lifecycleResult?.reason?.message } }),
          ...(deviceQuery && { device: deviceResult?.status === 'fulfilled' ? deviceResult.value : { error: deviceResult?.reason?.message } }),
          ...(geographyQuery && { geography: geographyResult?.status === 'fulfilled' ? geographyResult.value : { error: geographyResult?.reason?.message } }),
          ...(cityGeographyQuery && { cityGeography: cityGeographyResult?.status === 'fulfilled' ? cityGeographyResult.value : { error: cityGeographyResult?.reason?.message } }),
          ...(retentionQuery && { dailyRetention: dailyRetentionResult?.status === 'fulfilled' ? dailyRetentionResult.value : { error: dailyRetentionResult?.reason?.message } }),
          ...(cumulativeRetentionQuery && { cumulativeRetention: cumulativeRetentionResult?.status === 'fulfilled' ? cumulativeRetentionResult.value : { error: cumulativeRetentionResult?.reason?.message } }),
          ...(sessionsQuery && { sessions: sessionsResult?.status === 'fulfilled' ? sessionsResult.value : { error: sessionsResult?.reason?.message } }),
          ...(sessionDurationQuery && { sessionDuration: sessionDurationResult?.status === 'fulfilled' ? sessionDurationResult.value : { error: sessionDurationResult?.reason?.message } }),
          ...(bounceRateQuery && { bounceRate: bounceRateResult?.status === 'fulfilled' ? bounceRateResult.value : { error: bounceRateResult?.reason?.message } })
        }
      }
    });

  } catch (error) {
    console.error('❌ Analytics preview error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function parseRetention(json: any, selectedDateRange = '7d', isCumulative = false) {
  console.log(`[DEBUG] Parsing ${isCumulative ? 'CUMULATIVE' : 'DAILY'} retention data`);
  console.log('[DEBUG] Raw retention JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results;
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No results array found in retention data');
    return { d7_retention: 0, values: [], retention_period: selectedDateRange === '7d' ? 7 : 30 };
  }
  
  console.log('[DEBUG] Found', results.length, 'retention cohorts');
  
  if (isCumulative) {
    // For cumulative: aggregate all cohorts together
    const aggregatedDays: { [day: number]: { totalDay0Users: number, returnedUsers: number } } = {};
    
    results.forEach((cohort) => {
      if (cohort?.values && Array.isArray(cohort.values)) {
        const day0Count = cohort.values[0]?.count || 0;
        
        cohort.values.forEach((value: any, dayIndex: number) => {
          const userCount = value?.count || 0;
          
          if (!aggregatedDays[dayIndex]) {
            aggregatedDays[dayIndex] = { totalDay0Users: 0, returnedUsers: 0 };
          }
          
          // Accumulate Day 0 users (cohort size)
          aggregatedDays[dayIndex].totalDay0Users += day0Count;
          // Accumulate returned users for this day
          aggregatedDays[dayIndex].returnedUsers += userCount;
        });
      }
    });
    
    console.log('[DEBUG] Aggregated cumulative data:', aggregatedDays);
    
    // Calculate cumulative retention percentages
    const cohortValues = Object.keys(aggregatedDays)
      .map(day => parseInt(day))
      .sort((a, b) => a - b)
      .slice(0, 8)
      .map(day => {
        const data = aggregatedDays[day];
        const percentage = data.totalDay0Users > 0 ? (data.returnedUsers / data.totalDay0Users) * 100 : 0;
        
        return {
          day,
          count: data.returnedUsers,
          percentage: Math.round(percentage * 100) / 100
        };
      });
    
    const day7Data = cohortValues.find(v => v.day === 7) || { percentage: 0 };
    
    console.log('[DEBUG] Cumulative retention result:', {
      cohortValues,
      day7Retention: day7Data.percentage
    });
    
    return {
      d7_retention: day7Data.percentage,
      values: cohortValues,
      retention_period: selectedDateRange === '7d' ? 7 : 30
    };
  }
  
  // Daily retention: Log all cohorts to see what we have
  console.log('[DEBUG] All cohorts overview:');
  results.forEach((cohort, index) => {
    const day0Count = cohort?.values?.[0]?.count || 0;
    const day7Count = cohort?.values?.[7]?.count || 0;
    const day7Retention = day0Count > 0 ? ((day7Count / day0Count) * 100).toFixed(1) : '0';
    console.log(`  Cohort ${index}: ${cohort.date} (${cohort.label}) - Day 0: ${day0Count}, Day 7: ${day7Count} (${day7Retention}%)`);
  });
  
  // Find the cohort with the best Day 7 retention rate (to show most interesting curve)
  // If tied, prefer the one with more users
  let bestCohort = null;
  let bestRetentionRate = -1;
  let maxDay0Users = 0;
  
  for (const cohort of results) {
    if (cohort?.values && Array.isArray(cohort.values) && cohort.values.length >= 8) {
      const day0Count = cohort.values[0]?.count || 0;
      const day7Count = cohort.values[7]?.count || 0;
      
      if (day0Count > 0) {
        const retentionRate = day7Count / day0Count;
        console.log(`[DEBUG] Checking cohort ${cohort.date}: Day 0=${day0Count}, Day 7=${day7Count}, Retention=${(retentionRate * 100).toFixed(1)}%`);
        
        // Pick cohort with best retention, or if tied, pick one with more users
        if (retentionRate > bestRetentionRate || 
            (retentionRate === bestRetentionRate && day0Count > maxDay0Users)) {
          bestRetentionRate = retentionRate;
          maxDay0Users = day0Count;
          bestCohort = cohort;
          console.log(`[DEBUG] New best cohort found: ${cohort.date} with ${(retentionRate * 100).toFixed(1)}% retention`);
        }
      }
    }
  }
  
  // If no cohort has users, return empty data
  if (!bestCohort || maxDay0Users === 0 || bestRetentionRate < 0) {
    console.log('[DEBUG] No cohort found with users on Day 0');
    return { d7_retention: 0, values: [], retention_period: selectedDateRange === '7d' ? 7 : 30 };
  }
  
  console.log('[DEBUG] Selected cohort:', bestCohort.date, 'with', maxDay0Users, 'Day 0 users and', (bestRetentionRate * 100).toFixed(1), '% Day 7 retention');
  console.log('[DEBUG] Cohort values:', bestCohort.values);
  
  const requestedRetentionDays = selectedDateRange === '7d' ? 7 : 30;
  const availableDays = Math.min(bestCohort.values.length, 8);
  const actualRetentionDays = Math.min(requestedRetentionDays, availableDays - 1);
  
  // Process the cohort values - PostHog gives us absolute user counts
  const cohortValues = bestCohort.values.slice(0, availableDays).map((value: any, index: number) => {
    let userCount = 0;
    
    if (typeof value === 'number') {
      userCount = value;
    } else if (value && typeof value === 'object') {
      userCount = value.count || value.value || 0;
    }
    
    // Calculate percentage based on Day 0 count
    const percentage = maxDay0Users > 0 ? (userCount / maxDay0Users) * 100 : 0;
    
    return {
      day: index,
      count: userCount,           // Actual user count
      percentage: Math.round(percentage * 100) / 100  // Percentage relative to Day 0
    };
  });
  
  // Calculate retention rate (as percentage for d7_retention)
  const day0Count = cohortValues[0]?.count || 0;
  const targetDayCount = cohortValues[actualRetentionDays]?.count || 0;
  const retention_rate = day0Count > 0 ? (targetDayCount / day0Count) * 100 : 0;
  
  console.log('[DEBUG] Final retention calculation:');
  console.log(`  Day 0 users: ${day0Count}`);
  console.log(`  Day ${actualRetentionDays} users: ${targetDayCount}`);
  console.log(`  Retention rate: ${retention_rate.toFixed(2)}%`);
  console.log(`  Processed values:`, cohortValues);
  
  return { 
    d7_retention: Math.round(retention_rate * 100) / 100, 
    values: cohortValues,
    retention_period: actualRetentionDays,
    cohort_date: bestCohort.date,
    cohort_label: bestCohort.label,
    total_day0_users: maxDay0Users
  };
}
