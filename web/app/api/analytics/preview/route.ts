import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
// FIX THIS: Correct the import path
import { CLIENTS } from '../../../../../src/config/clients.js'

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

// Create dynamic queries with date range injection
const createQueryWithDateRange = (baseQuery: any, dateRange: any) => {
  const query = JSON.parse(JSON.stringify(baseQuery));
  
  if (query.kind === 'InsightVizNode' && query.source) {
    query.source.dateRange = dateRange;
  } else if (query.kind === 'FunnelsQuery') {
    query.dateRange = dateRange;
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

function parseTraffic(json: any) {
  console.log('[DEBUG] Raw traffic JSON:', JSON.stringify(json, null, 2));
  
  // Handle the PostHog Query API response format (array of results)
  if (Array.isArray(json) && json.length > 0) {
    const firstResult = json[0];
    
    if (firstResult && Array.isArray(firstResult.data)) {
      const data = firstResult.data;
      const labels = firstResult.labels || firstResult.days || data.map((_: any, i: number) => `Day ${i + 1}`);
      const total = data.reduce((a: number, b: number) => a + (b || 0), 0);
      const uniques = firstResult.count || total;
      
      console.log('[DEBUG] Parsed traffic (array format):', { 
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
  
  // Handle PostHog results format (wrapped in results array)
  if (json && Array.isArray(json.results) && json.results.length > 0) {
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

function parseDeviceMix(json: any) {
  console.log('[DEBUG] Raw device JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { device_mix: {} };
  }

  const device_mix: any = {};
  let total = 0;

  results.forEach((result: any) => {
    const device = result?.breakdown_value || result?.label || 'Unknown';
    const count = result?.count || 
                  (Array.isArray(result?.data) ? result.data.reduce((a: number, b: number) => a + (b || 0), 0) : 0) ||
                  result?.aggregated_value || 0;
    
    if (device && count > 0) {
      device_mix[device] = count;
      total += count;
    }
  });

  // Convert to percentages
  if (total > 0) {
    Object.keys(device_mix).forEach(device => {
      device_mix[device] = device_mix[device] / total;
    });
  }
  
  return { device_mix };
}

function parseGeography(json: any) {
  const results = json?.results || json?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { countries: {} };
  }

  const countries: any = {};
  
  results.forEach((result: any) => {
    const countryCode = result?.breakdown_value || result?.label || 'Unknown';
    const count = result?.count || 
                  (Array.isArray(result?.data) ? result.data.reduce((a: number, b: number) => a + (b || 0), 0) : 0) ||
                  result?.aggregated_value || 0;
    
    if (countryCode && countryCode !== 'Unknown' && count > 0) {
      countries[countryCode.toUpperCase()] = count;
    }
  });
  
  return { countries };
}

function parseCityGeography(json: any) {
  console.log('[DEBUG] Raw city geography JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || json?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No city geography results found');
    return { cities: {} };
  }

  const cities: any = {};
  
  results.forEach((result: any) => {
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

  console.log('[DEBUG] Parsed cities:', cities);
  
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
    
    // Create queries with date range injection and log each one
    const trafficQuery = baseQueries.traffic ? 
      createQueryWithDateRange(baseQueries.traffic.query, dateFilter) : null;
    if (trafficQuery) logFinalQuery('TRAFFIC', trafficQuery, effectiveClientId);

    const funnelQuery = baseQueries.funnel && funnelType === 'profile' ? 
      createQueryWithDateRange(baseQueries.funnel.query, dateFilter) : null;
    if (funnelQuery) logFinalQuery('FUNNEL', funnelQuery, effectiveClientId);

    // Add renewal funnel support
    const renewalFunnelQuery = baseQueries.renewalFunnel && funnelType === 'renewal' ? 
      createQueryWithDateRange(baseQueries.renewalFunnel.query, dateFilter) : null;
    if (renewalFunnelQuery) logFinalQuery('RENEWAL_FUNNEL', renewalFunnelQuery, effectiveClientId);

    const lifecycleQuery = baseQueries.lifecycle ? 
      createQueryWithDateRange(baseQueries.lifecycle.query, dateFilter) : null;
    if (lifecycleQuery) logFinalQuery('LIFECYCLE', lifecycleQuery, effectiveClientId);

    const deviceQuery = baseQueries.deviceMix ? 
      createQueryWithDateRange(baseQueries.deviceMix.query, dateFilter) : null;
    if (deviceQuery) logFinalQuery('DEVICE', deviceQuery, effectiveClientId);

    const geographyQuery = baseQueries.geography ? 
      createQueryWithDateRange(baseQueries.geography.query, dateFilter) : null;
    if (geographyQuery) logFinalQuery('GEOGRAPHY', geographyQuery, effectiveClientId);

    const cityGeographyQuery = baseQueries.cityGeography ? 
      createQueryWithDateRange(baseQueries.cityGeography.query, dateFilter) : null;
    if (cityGeographyQuery) logFinalQuery('CITY_GEOGRAPHY', cityGeographyQuery, effectiveClientId);

    const retentionQuery = baseQueries.retention ? 
      createQueryWithDateRange(baseQueries.retention.query, dateFilter) : null;
    if (retentionQuery) logFinalQuery('RETENTION', retentionQuery, effectiveClientId);

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
    if (retentionQuery) apiCallPromises.push(callPostHogAPI(projectId, apiKey, 'RETENTION', retentionQuery))

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
    if (retentionQuery) resultsByType.set('retention', apiCalls[callIndex++]);

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
    
    if (retentionQuery) {
      kpis.retention = { d7_retention: 0, values: [] };
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
    const retentionResult = resultsByType.get('retention');

    // Process traffic data with logging only if query was defined
    if (trafficQuery) {
      if (trafficResult && trafficResult.status === 'fulfilled') {
        console.log('🔄 Processing TRAFFIC data...');
        kpis.traffic = parseTraffic(trafficResult.value);
        console.log('✅ Traffic processed:', {
          series_length: kpis.traffic.series?.length,
          labels_length: kpis.traffic.labels?.length,
          unique_users: kpis.traffic.unique_users,
          pageviews: kpis.traffic.pageviews
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
        kpis.device = parseDeviceMix(deviceResult.value);
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
        kpis.geography = parseGeography(geographyResult.value);
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
        kpis.cityGeography = parseCityGeography(cityGeographyResult.value);
        console.log('✅ City Geography processed:', {
          cities_count: Object.keys(kpis.cityGeography.cities || {}).length
        });
      } else if (cityGeographyResult && cityGeographyResult.status === 'rejected') {
        console.log('❌ City Geography failed:', cityGeographyResult.reason.message);
        kpis.meta.errors.push(`City Geography query failed: ${cityGeographyResult.reason.message}`);
      }
    }

    // Process retention data only if query was defined
    if (retentionQuery) {
      if (retentionResult && retentionResult.status === 'fulfilled') {
        console.log('🔄 Processing RETENTION data...');
        kpis.retention = parseRetention(retentionResult.value, dateRange);
        console.log('✅ Retention processed:', {
          d7_retention: kpis.retention.d7_retention,
          values_count: kpis.retention.values?.length
        });
      } else if (retentionResult && retentionResult.status === 'rejected') {
        console.log('❌ Retention failed:', retentionResult.reason.message);
        kpis.meta.errors.push(`Retention query failed: ${retentionResult.reason.message}`);
      }
    }

    console.log('\n📋 ========== FINAL RESPONSE SUMMARY ==========');
    if (kpis.traffic) console.log(`🎯 Traffic Data: ${kpis.traffic.series?.length || 0} points`);
    if (kpis.funnel) console.log(`🎯 Funnel Steps: ${kpis.funnel.steps?.length || 0}`);
    if (kpis.renewalFunnel) console.log(`🎯 Renewal Funnel Steps: ${kpis.renewalFunnel.steps?.length || 0}`);
    if (kpis.lifecycle) console.log(`🎯 Lifecycle Series: ${Object.keys(kpis.lifecycle.series || {}).length}`);
    if (kpis.device) console.log(`🎯 Device Types: ${Object.keys(kpis.device.device_mix || {}).length}`);
    if (kpis.geography) console.log(`🎯 Countries: ${Object.keys(kpis.geography.countries || {}).length}`);
    if (kpis.cityGeography) console.log(`🎯 Cities: ${Object.keys(kpis.cityGeography.cities || {}).length}`);
    if (kpis.retention) console.log(`🎯 Retention: ${kpis.retention.d7_retention}%`);
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
          ...(retentionQuery && { retention: retentionResult?.status === 'fulfilled' ? retentionResult.value : { error: retentionResult?.reason?.message } })
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

function parseRetention(json: any, selectedDateRange = '7d') {
  console.log('[DEBUG] Raw retention JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results;
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No results array found in retention data');
    return { d7_retention: 0, values: [], retention_period: selectedDateRange === '7d' ? 7 : 30 };
  }
  
  console.log('[DEBUG] Found', results.length, 'retention cohorts');
  
  // Log all cohorts to see what we have
  console.log('[DEBUG] All cohorts overview:');
  results.forEach((cohort, index) => {
    const day0Count = cohort?.values?.[0]?.count || 0;
    console.log(`  Cohort ${index}: ${cohort.date} (${cohort.label}) - Day 0: ${day0Count} users`);
  });
  
  // Find the cohort with the most Day 0 users (actual users, not percentage)
  let bestCohort = null;
  let maxDay0Users = 0;
  
  for (const cohort of results) {
    if (cohort?.values && Array.isArray(cohort.values) && cohort.values.length > 0) {
      const day0Count = cohort.values[0]?.count || 0;
      console.log(`[DEBUG] Checking cohort ${cohort.date}: Day 0 count = ${day0Count}`);
      
      if (day0Count > maxDay0Users) {
        maxDay0Users = day0Count;
        bestCohort = cohort;
        console.log(`[DEBUG] New best cohort found: ${cohort.date} with ${day0Count} users`);
      }
    }
  }
  
  // If no cohort has users, return empty data
  if (!bestCohort || maxDay0Users === 0) {
    console.log('[DEBUG] No cohort found with users on Day 0');
    return { d7_retention: 0, values: [], retention_period: selectedDateRange === '7d' ? 7 : 30 };
  }
  
  console.log('[DEBUG] Selected cohort:', bestCohort.date, 'with', maxDay0Users, 'Day 0 users');
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
  
  // Calculate retention rate (as decimal for d7_retention)
  const day0Count = cohortValues[0]?.count || 0;
  const targetDayCount = cohortValues[actualRetentionDays]?.count || 0;
  const retention_rate = day0Count > 0 ? targetDayCount / day0Count : 0;
  
  console.log('[DEBUG] Final retention calculation:');
  console.log(`  Day 0 users: ${day0Count}`);
  console.log(`  Day ${actualRetentionDays} users: ${targetDayCount}`);
  console.log(`  Retention rate: ${retention_rate} (${(retention_rate * 100).toFixed(1)}%)`);
  console.log(`  Processed values:`, cohortValues);
  
  return { 
    d7_retention: retention_rate, 
    values: cohortValues,
    retention_period: actualRetentionDays,
    cohort_date: bestCohort.date,
    cohort_label: bestCohort.label,
    total_day0_users: maxDay0Users
  };
}
