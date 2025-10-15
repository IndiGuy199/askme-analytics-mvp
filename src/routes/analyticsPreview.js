// src/routes/analyticsPreview.js
import express from 'express';
import axios from 'axios';
import { CLIENTS } from '../config/clients.js';
import { getApiHost, injectClientFilter } from '../config/posthog.js';
import { getCompanyPostHogConfig } from '../services/companyService.js';
import { getQueryConfigForCompany } from '../services/queryConfigService.js';

const router = express.Router();
const findClient = (id) => CLIENTS.find((c) => c.clientId === id);

async function callQuery({ projectId, apiKey, name, query }) {
  const url = `${getApiHost()}/api/projects/${encodeURIComponent(projectId)}/query`;
  
  // Add comprehensive debugging
  console.log(`[${name}] PostHog API Configuration Check:`);
  console.log(`[${name}] - API Host: ${getApiHost()}`);
  console.log(`[${name}] - Project ID: ${projectId}`);
  console.log(`[${name}] - API Key exists: ${!!apiKey}`);
  console.log(`[${name}] - API Key format: ${apiKey ? (apiKey.startsWith('phx_') ? 'Personal API Key' : 'Unknown format') : 'MISSING'}`);
  console.log(`[${name}] - Full URL: ${url}`);
  
  if (!apiKey) {
    return { ok: false, reason: 'Missing PostHog API key' };
  }
  
  if (!apiKey.startsWith('phx_')) {
    return { ok: false, reason: 'Invalid PostHog API key format (should start with phx_)' };
  }

  try {
    console.log(`[${name}] Making query to:`, url);
    console.log(`[${name}] Query payload:`, JSON.stringify(query, null, 2));
    
    const res = await axios.post(url, { query }, {
      headers: { 
        Authorization: `Bearer ${apiKey}`, 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      },
      timeout: 30000 // Add 30 second timeout
    });

    console.log(`[${name}] Response status:`, res.status);
    console.log(`[${name}] Response data:`, JSON.stringify(res.data, null, 2));

    if (res.data?.error) {
      console.error(`[${name}] PostHog API error:`, res.data.error);
      return { ok: false, reason: res.data.error };
    }

    console.log(`[${name}] Query successful`);
    return { ok: true, data: res.data };
  } catch (err) {
    console.error(`[${name}] Request failed with full error:`, {
      message: err.message,
      code: err.code,
      response: err.response?.data,
      status: err.response?.status,
      config: {
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers ? Object.keys(err.config.headers) : 'none'
      }
    });
    
    const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message;
    return { ok: false, reason: errorMsg };
  }
}

/* ---------- tolerant parsers ---------- */
const firstSeries = (j) =>
  (Array.isArray(j?.results) ? j.results[0] : (Array.isArray(j?.result) ? j.result[0] : j?.result || {}));

function parseTraffic(json) {
  console.log('[DEBUG] Raw traffic JSON:', JSON.stringify(json, null, 2));
  
  // Handle the PostHog Query API response format (array of results)
  if (Array.isArray(json) && json.length > 0) {
    const firstResult = json[0];
    
    if (firstResult && Array.isArray(firstResult.data)) {
      const data = firstResult.data;
      const labels = firstResult.labels || firstResult.days || data.map((_, i) => `Day ${i + 1}`);
      const total = data.reduce((a, b) => a + (b || 0), 0);
      const uniques = firstResult.count || total;
      
      console.log('[DEBUG] Parsed traffic (array format):', { 
        dataLength: data.length,
        series: data, 
        labels: labels.slice(0, 5), // Show first 5 labels
        unique_users: uniques, 
        pageviews: total 
      });
      
      return {
        series: data,                    // ✅ Use the full 31-day array
        labels: labels,                  // ✅ Use the full 31-day labels
        unique_users: uniques,           // ✅ Use count from PostHog
        pageviews: total                 // ✅ Sum all data points
      };
    }
  }
  
  // Handle PostHog results format (wrapped in results array)
  if (json && Array.isArray(json.results) && json.results.length > 0) {
    const firstResult = json.results[0];
    
    if (firstResult && Array.isArray(firstResult.data)) {
      const data = firstResult.data;
      const labels = firstResult.labels || firstResult.days || data.map((_, i) => `Day ${i + 1}`);
      const total = data.reduce((a, b) => a + (b || 0), 0);
      const uniques = firstResult.count || total;
      
      console.log('[DEBUG] Parsed traffic (results format):', { 
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
  
  // Handle legacy format (fallback)
  const s = firstSeries(json) || {};
  const data = s.data || [];
  const total = data.reduce((a, b) => a + (b || 0), 0);
  const uniques = s.aggregated_value ?? s.count ?? total;
  const labels = data.map((_, i) => `Day ${i + 1}`);
  
  console.log('[DEBUG] Parsed traffic (legacy format):', { 
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

function parseFunnel(json) {
  console.log('[DEBUG] Raw funnel JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No funnel results found');
    return { 
      steps: [], 
      conversion_rate: 0, 
      median_time_to_convert_sec: 0, 
      top_drop: { from: 'N/A', to: 'N/A', dropRate: 0 } 
    };
  }

  // PostHog funnel results include custom_name, name, and other properties
  const steps = results.map((step, index) => {
    // Priority: custom_name > name > fallback
    const stepName = step.custom_name || step.name || `Step ${index + 1}`;
    
    console.log('[DEBUG] Processing funnel step:', {
      index,
      custom_name: step.custom_name,
      name: step.name,
      count: step.count,
      finalName: stepName
    });
    
    return {
      name: stepName,
      count: step.count || 0
    };
  });

  const firstCount = steps[0]?.count || 0;
  const lastCount = steps[steps.length - 1]?.count || 0;
  const conversion_rate = firstCount > 0 ? lastCount / firstCount : 0;

  // Find the biggest drop-off using custom names
  let maxDrop = 0;
  let topDrop = { from: 'N/A', to: 'N/A', dropRate: 0 };
  
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    const next = steps[i + 1];
    const dropRate = current.count > 0 ? (current.count - next.count) / current.count : 0;
    
    if (dropRate > maxDrop) {
      maxDrop = dropRate;
      topDrop = {
        from: current.name, // This will now use the custom_name
        to: next.name,      // This will now use the custom_name
        dropRate: dropRate
      };
    }
  }

  console.log('[DEBUG] Parsed funnel with custom names:', { steps, conversion_rate, topDrop });
  
  // Handle PostHog's native funnel comparison
  let previousConversionRate = 0;
  let previousSignups = 0;
  
  if (json.compare_results && json.compare_results.length > 0) {
    const compareResults = json.compare_results[0];
    if (compareResults.results && compareResults.results.length > 0) {
      const compareSteps = compareResults.results.map(step => ({
        name: step.custom_name || step.name || 'Unnamed Step',
        count: step.count || 0
      }));
      
      const compareFirstCount = compareSteps[0]?.count || 0;
      const compareLastCount = compareSteps[compareSteps.length - 1]?.count || 0;
      previousConversionRate = compareFirstCount > 0 ? compareLastCount / compareFirstCount : 0;
      previousSignups = compareLastCount;
    }
  }
  
  return {
    steps,
    conversion_rate,
    median_time_to_convert_sec: json?.median_time_to_convert_sec || 0,
    top_drop: topDrop,
    previous_conversion_rate: previousConversionRate,
    previous_signups: previousSignups
  };
}

function parseLifecycle(json) {
  console.log('[DEBUG] Raw lifecycle JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No lifecycle results found');
    return { labels: [], series: { new: [], returning: [], resurrecting: [], dormant: [] } };
  }

  // PostHog lifecycle returns data grouped by lifecycle status
  const labels = [];
  const series = { new: [], returning: [], resurrecting: [], dormant: [] };
  
  // Extract dates/labels from the first result
  if (results[0]?.data && Array.isArray(results[0].data)) {
    // Assuming data points correspond to dates
    const dataLength = results[0].data.length;
    for (let i = 0; i < dataLength; i++) {
      labels.push(`Day ${i + 1}`); // Simple day labels, adjust as needed
    }
  }
  
  // Process each lifecycle category
  results.forEach(result => {
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

  console.log('[DEBUG] Parsed lifecycle:', { labels, series });
  
  // Check if we have any meaningful data
  const hasData = [...series.new, ...series.returning, ...series.resurrecting, ...series.dormant]
    .some(value => value > 0);
  
  if (!hasData) {
    console.log('[DEBUG] No meaningful lifecycle data found - all values are zero or empty');
  }
  
  return { labels, series };
}

function parseDeviceMix(json) {
  console.log('[DEBUG] Raw device JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No device results found');
    return { device_mix: {} };
  }

  const device_mix = {};
  let total = 0;

  results.forEach(result => {
    const device = result?.breakdown_value || result?.label || 'Unknown';
    const count = result?.count || 
                  (Array.isArray(result?.data) ? result.data.reduce((a, b) => a + (b || 0), 0) : 0) ||
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

  console.log('[DEBUG] Parsed device mix:', device_mix);
  
  return { device_mix };
}

function parseRetention(json, selectedDateRange = '7d') {
  console.log('[DEBUG] Raw retention JSON:', JSON.stringify(json, null, 2));
  console.log('[DEBUG] Selected date range:', selectedDateRange);
  
  const results = json?.results;
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No results array found in retention data');
    return { d7_retention: 0, values: [], retention_period: selectedDateRange === '7d' ? 7 : 30 };
  }
  
  console.log('[DEBUG] Found', results.length, 'retention cohorts');
  
  // PostHog retention results structure with totalIntervals: 8
  // results[0] = { date: "2024-01-01", label: "Day 0", values: [100, 45, 32, 28, 25, 23, 21, 20] }
  // With 8 intervals, we get Day 0 through Day 7 (8 data points total)
  
  // The maxRetentionDays should respect the selected date range, but limited by available data
  const requestedRetentionDays = selectedDateRange === '7d' ? 7 : 30;
  
  // Find the most recent cohort with data
  let bestCohort = null;
  for (const cohort of results) {
    if (cohort?.values && Array.isArray(cohort.values) && cohort.values.length > 0) {
      bestCohort = cohort;
      break; // Take the first (most recent) available cohort
    }
  }
  
  if (!bestCohort || !bestCohort.values || bestCohort.values.length === 0) {
    console.log('[DEBUG] No valid cohort found with data');
    console.log('[DEBUG] Available cohorts:', results.map(r => ({ 
      date: r.date, 
      label: r.label, 
      valuesLength: r.values?.length || 0,
      firstValue: r.values?.[0]
    })));
    return { d7_retention: 0, values: [], retention_period: requestedRetentionDays };
  }
  
  console.log('[DEBUG] Using cohort:', bestCohort.date || 'unknown date', 'with', bestCohort.values.length, 'values');
  console.log('[DEBUG] Cohort values:', bestCohort.values);
  
  // Process the cohort values - PostHog returns percentages (0-100) for retention
  // We're limited by the actual data available from PostHog (totalIntervals: 8 means only 8 data points)
  const availableDays = Math.min(bestCohort.values.length, 8); // Limited by totalIntervals
  const actualRetentionDays = Math.min(requestedRetentionDays, availableDays - 1); // -1 because Day 0 is included
  
  console.log('[DEBUG] Requested retention days:', requestedRetentionDays);
  console.log('[DEBUG] Available data days:', availableDays);
  console.log('[DEBUG] Actual retention days (limited by data):', actualRetentionDays);
  
  const cohortValues = bestCohort.values.slice(0, availableDays).map((value, index) => {
    let percentage = 0;
    
    if (typeof value === 'number') {
      // Direct percentage format (0-100)
      percentage = value;
    } else if (value && typeof value === 'object') {
      // Object format: { count: 100 } or { value: 100 }
      percentage = value.count || value.value || 0;
    }
    
    return {
      day: index,
      count: percentage, // This is actually a percentage from PostHog
      percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
    };
  });
  
  // FIX: Change selectedRetentionDays to selectedDateRange
  console.log('[DEBUG] Processed cohort values for', selectedDateRange, ':', cohortValues);
  
  // Calculate retention rate based on the actual available data
  const day0Percentage = cohortValues[0]?.percentage || 0;
  const targetDayPercentage = cohortValues[actualRetentionDays]?.percentage || 0;
  const retention_rate = targetDayPercentage / 100; // Convert percentage to decimal
  
  console.log('[DEBUG] Day 0 retention:', day0Percentage, '%');
  console.log('[DEBUG] Day', actualRetentionDays, 'retention:', targetDayPercentage, '%');
  console.log('[DEBUG] Final retention rate:', retention_rate);
  
  // Format values for chart visualization
  const formattedValues = cohortValues.map((v) => ({
    day: v.day,
    count: v.count, // This is actually the percentage value
    percentage: v.percentage
  }));
  
  console.log('[DEBUG] Formatted retention values:', formattedValues);
  
  // Return the retention data with proper labeling
  const retentionLabel = selectedDateRange === '7d' ? '7-day' : '30-day';
  const actualLabel = actualRetentionDays === 7 ? '7-day' : `${actualRetentionDays}-day`;
  
  return { 
    d7_retention: retention_rate, 
    values: formattedValues,
    retention_period: actualRetentionDays, // This now reflects the actual measurement
    requested_period: requestedRetentionDays, // What was requested
    label: actualLabel, // What we actually measured
    note: actualRetentionDays < requestedRetentionDays ? `Limited to ${actualRetentionDays}-day due to data availability` : null
  };
}

function parseGeography(json) {
  console.log('[DEBUG] Raw geography JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || json?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No geography results found');
    return { countries: {} };
  }

  const countries = {};
  
  results.forEach(result => {
    // Handle different possible structures
    const countryCode = result?.breakdown_value || result?.label || 'Unknown';
    const count = result?.count || 
                  (Array.isArray(result?.data) ? result.data.reduce((a, b) => a + (b || 0), 0) : 0) ||
                  result?.aggregated_value || 0;
    
    if (countryCode && countryCode !== 'Unknown' && count > 0) {
      countries[countryCode.toUpperCase()] = count;
    }
  });

  console.log('[DEBUG] Parsed countries:', countries);
  
  return { countries };
}

function parseCityGeography(json) {
  console.log('[DEBUG] Raw city geography JSON:', JSON.stringify(json, null, 2));
  
  const results = json?.results || json?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    console.log('[DEBUG] No city geography results found');
    return { cities: {} };
  }

  const cities = {};
  
  results.forEach(result => {
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
                  (Array.isArray(result?.data) ? result.data.reduce((a, b) => a + (b || 0), 0) : 0) ||
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

/* ---------- GET /api/analytics/preview?clientId=askme-ai-app&dateRange=7d (DATABASE-DRIVEN) ---------- */
router.get('/preview', async (req, res) => {
  // CORS for frontend
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const clientId = (req.query.clientId || '').toString();
  const companyId = (req.query.companyId || '').toString();
  const dateRange = (req.query.dateRange || '7d').toString();
  const enableComparison = req.query.compare === 'true';
  
  let client = null;
  let useDatabase = false;

  // Try database-driven approach first (preferred)
  if (companyId) {
    console.log(`[Analytics Preview] Using database mode for company: ${companyId}`);
    try {
      const company = await getCompanyPostHogConfig(companyId);
      const queries = await getQueryConfigForCompany(companyId);
      
      // Convert to client-like structure for compatibility
      client = {
        clientId: company.clientId,
        name: company.name,
        projectId: company.projectId,
        apiKey: company.apiKey,
        queries: {
          traffic: { query: queries.traffic },
          funnel: { query: queries.funnel },
          retention: { query: queries.retention },
          deviceMix: { query: queries.deviceMix },
          geography: { query: queries.geography },
          lifecycle: { query: queries.lifecycle },
          cityGeography: { query: queries.geography } // Use same as geography for now
        }
      };
      useDatabase = true;
    } catch (error) {
      console.error(`[Analytics Preview] Database error for company ${companyId}:`, error.message);
      return res.status(404).json({ error: `Company not found or PostHog not configured: ${error.message}` });
    }
  }
  
  // Fallback to legacy hardcoded clients
  if (!client && clientId) {
    console.log(`[Analytics Preview] Using legacy mode for client: ${clientId}`);
    client = findClient(clientId);
    if (!client) {
      return res.status(400).json({ error: `Unknown clientId: ${clientId}. Use companyId parameter for database-driven mode.` });
    }
    useDatabase = false;
  }

  if (!client) {
    return res.status(400).json({ error: 'Either clientId or companyId parameter is required' });
  }

  console.log(`[Analytics Preview] Processing request for: ${client.name} (${useDatabase ? 'database' : 'legacy'} mode)`);
  console.log(`[Analytics Preview] Date range: ${dateRange}`);
  console.log(`[Analytics Preview] Comparison enabled: ${enableComparison}`);

  // Convert dateRange to PostHog format
  const getDateRangeFilter = (range) => {
    switch (range) {
      case '7d':
        return { date_from: '-7d', date_to: null };
      case '30d':
        return { date_from: '-30d', date_to: null };
      default:
        return { date_from: '-7d', date_to: null };
    }
  };

  // Get comparison date range (previous period)
  const getComparisonDateRange = (range) => {
    switch (range) {
      case '7d':
        return { date_from: '-14d', date_to: '-7d' };
      case '30d':
        return { date_from: '-60d', date_to: '-30d' };
      default:
        return { date_from: '-14d', date_to: '-7d' };
    }
  };

  const dateFilter = getDateRangeFilter(dateRange);
  const comparisonDateFilter = enableComparison ? getComparisonDateRange(dateRange) : null;
  
  console.log(`[Analytics Preview] Using date filter:`, dateFilter);
  if (comparisonDateFilter) {
    console.log(`[Analytics Preview] Using comparison date filter:`, comparisonDateFilter);
  }

  // Create dynamic queries with the selected date range (REMOVE compareFilter)
  const createQueryWithDateRange = (baseQuery, dateRange) => {
    const query = JSON.parse(JSON.stringify(baseQuery));
    
    if (query.kind === 'InsightVizNode' && query.source) {
      query.source.dateRange = dateRange;
      // REMOVE: Don't add compareFilter - use separate queries instead
    } else if (query.kind === 'FunnelsQuery') {
      query.dateRange = dateRange;
    }
    
    return query;
  };

  // Check if funnel query exists
  const fallbackFunnelQuery = client?.queries?.funnel?.query || null;
  if (!fallbackFunnelQuery) {
    return res.status(400).json({
      error: 'Missing funnel query',
      details: 'No FunnelsQuery is configured in CLIENTS.',
      kpis: {
        traffic: { series: [], labels: [], unique_users: 0, pageviews: 0 },
        funnel: { steps: [], conversion_rate: 0, median_time_to_convert_sec: 0, top_drop: { from: 'N/A', to: 'N/A', dropRate: 0 } },
        device: { device_mix: {} },
        lifecycle: { labels: [], series: { new: [], returning: [], resurrecting: [], dormant: [] } },
        meta: { errors: { funnel: 'No FunnelsQuery available' } },
      },
    });
  }

  // Create current period queries
  const trafficQuery = client.queries.traffic ? 
    createQueryWithDateRange(client.queries.traffic.query, dateFilter) : null;

  const funnelQuery = createQueryWithDateRange(fallbackFunnelQuery, dateFilter);

  const lifecycleQuery = client.queries.lifecycle ? 
    createQueryWithDateRange(client.queries.lifecycle.query, dateFilter) : null;

  const deviceQuery = client.queries.deviceMix ? 
    createQueryWithDateRange(client.queries.deviceMix.query, dateFilter) : null;

  const retentionQuery = client.queries.retention ? 
    createQueryWithDateRange(client.queries.retention.query, {
      date_from: dateRange === '7d' ? '-7d' : '-30d',
      date_to: null,
      explicitDate: false
    }) : null;

  const geographyQuery = client.queries.geography ? 
    createQueryWithDateRange(client.queries.geography.query, dateFilter) : null;

  const cityGeographyQuery = client.queries.cityGeography ? 
    createQueryWithDateRange(client.queries.cityGeography.query, dateFilter) : null;

  // Create comparison period queries (separate queries for previous period)
  let comparisonTrafficQuery = null;
  let comparisonFunnelQuery = null;
  let comparisonDeviceQuery = null;
  let comparisonLifecycleQuery = null;
  let comparisonRetentionQuery = null;
  let comparisonGeographyQuery = null;
  let comparisonCityGeographyQuery = null;

  if (enableComparison && comparisonDateFilter) {
    console.log('[Analytics Preview] Creating comparison queries...');
    
    // Traffic comparison
    comparisonTrafficQuery = client.queries.traffic ? 
      createQueryWithDateRange(client.queries.traffic.query, comparisonDateFilter) : null;
    
    // Funnel comparison
    comparisonFunnelQuery = createQueryWithDateRange(fallbackFunnelQuery, comparisonDateFilter);

    // Device comparison
    comparisonDeviceQuery = client.queries.deviceMix ? 
      createQueryWithDateRange(client.queries.deviceMix.query, comparisonDateFilter) : null;

    // Lifecycle comparison
    comparisonLifecycleQuery = client.queries.lifecycle ? 
      createQueryWithDateRange(client.queries.lifecycle.query, comparisonDateFilter) : null;

    // Retention comparison
    comparisonRetentionQuery = client.queries.retention ? 
      createQueryWithDateRange(client.queries.retention.query, {
        date_from: dateRange === '7d' ? '-14d' : '-60d',
        date_to: dateRange === '7d' ? '-7d' : '-30d',
        explicitDate: false
      }) : null;

    // Geography comparison
    comparisonGeographyQuery = client.queries.geography ? 
      createQueryWithDateRange(client.queries.geography.query, comparisonDateFilter) : null;

    // City Geography comparison
    comparisonCityGeographyQuery = client.queries.cityGeography ? 
      createQueryWithDateRange(client.queries.cityGeography.query, comparisonDateFilter) : null;
  }

  // Inject client filters
  const withFunnelFilter = (q) => injectClientFilter(q, client.clientId);

  // Prepare all promises (current period + comparison if enabled)
  const promises = [
    // Current period queries
    trafficQuery ? 
      callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'traffic', query: withFunnelFilter(trafficQuery) }) : 
      Promise.resolve({ ok: false, reason: 'Traffic query not configured' }),
      
    funnelQuery ? 
      callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'funnel', query: withFunnelFilter(funnelQuery) }) : 
      Promise.resolve({ ok: false, reason: 'Funnel query not configured' }),
      
    lifecycleQuery ? 
      callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'lifecycle', query: lifecycleQuery }) : 
      Promise.resolve({ ok: false, reason: 'Lifecycle query not configured' }),
      
    deviceQuery ? 
      callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'deviceMix', query: withFunnelFilter(deviceQuery) }) : 
      Promise.resolve({ ok: false, reason: 'Device query not configured' }),
      
    retentionQuery ? 
      callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'retention', query: retentionQuery }) : 
      Promise.resolve({ ok: false, reason: 'Retention query not configured' }),
      
    geographyQuery ? 
      callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'geography', query: geographyQuery }) : 
      Promise.resolve({ ok: false, reason: 'Geography query not configured' }),
      
    cityGeographyQuery ? 
      callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'cityGeography', query: cityGeographyQuery }) : 
      Promise.resolve({ ok: false, reason: 'City geography query not configured' })
  ];

  // Add comparison queries if enabled
  if (enableComparison && comparisonDateFilter) {
    promises.push(
      // Traffic comparison
      comparisonTrafficQuery ? 
        callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'comparisonTraffic', query: withFunnelFilter(comparisonTrafficQuery) }) : 
        Promise.resolve({ ok: false, reason: 'Comparison traffic query not configured' }),
        
      // Funnel comparison
      comparisonFunnelQuery ? 
        callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'comparisonFunnel', query: withFunnelFilter(comparisonFunnelQuery) }) : 
        Promise.resolve({ ok: false, reason: 'Comparison funnel query not configured' }),

      // Device comparison
      comparisonDeviceQuery ? 
        callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'comparisonDevice', query: withFunnelFilter(comparisonDeviceQuery) }) : 
        Promise.resolve({ ok: false, reason: 'Comparison device query not configured' }),

      // Lifecycle comparison
      comparisonLifecycleQuery ? 
        callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'comparisonLifecycle', query: comparisonLifecycleQuery }) : 
        Promise.resolve({ ok: false, reason: 'Comparison lifecycle query not configured' }),

      // Retention comparison
      comparisonRetentionQuery ? 
        callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'comparisonRetention', query: comparisonRetentionQuery }) : 
        Promise.resolve({ ok: false, reason: 'Comparison retention query not configured' }),

      // Geography comparison
      comparisonGeographyQuery ? 
        callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'comparisonGeography', query: comparisonGeographyQuery }) : 
        Promise.resolve({ ok: false, reason: 'Comparison geography query not configured' }),

      // City Geography comparison
      comparisonCityGeographyQuery ? 
        callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'comparisonCityGeography', query: comparisonCityGeographyQuery }) : 
        Promise.resolve({ ok: false, reason: 'Comparison city geography query not configured' })
    );
  }

  // Execute all queries in parallel
  const results = await Promise.all(promises);
  
  // Extract results
  const [rTraffic, rFunnel, rLifecycle, rDevice, rRetention, rGeography, rCityGeography] = results;
  
  // Extract comparison results if enabled
  let rComparisonTraffic, rComparisonFunnel, rComparisonDevice, rComparisonLifecycle, rComparisonRetention, rComparisonGeography, rComparisonCityGeography;

  if (enableComparison && results.length > 7) {
    // Current period queries are indices 0-6, comparison queries start at index 7
    rComparisonTraffic = results[7];
    rComparisonFunnel = results[8];
    rComparisonDevice = results[9];
    rComparisonLifecycle = results[10];
    rComparisonRetention = results[11];
    rComparisonGeography = results[12];
    rComparisonCityGeography = results[13];
    
    console.log('[Analytics Preview] Comparison results available:', {
      traffic: rComparisonTraffic?.ok,
      funnel: rComparisonFunnel?.ok,
      device: rComparisonDevice?.ok,
      lifecycle: rComparisonLifecycle?.ok,
      retention: rComparisonRetention?.ok,
      geography: rComparisonGeography?.ok,
      cityGeography: rComparisonCityGeography?.ok
    });
  }

  // Build errors object
  const errors = {};
  if (!rTraffic.ok) errors.traffic = rTraffic.reason;
  if (!rFunnel.ok) errors.funnel = rFunnel.reason;
  if (!rLifecycle.ok) errors.lifecycle = rLifecycle.reason;
  if (!rDevice.ok) errors.device = rDevice.reason;
  if (!rRetention.ok) errors.retention = rRetention.reason;
  if (!rGeography.ok) errors.geography = rGeography.reason;
  if (!rCityGeography.ok) errors.cityGeography = rCityGeography.reason;

  // Parse current period data
  const traffic = rTraffic.ok ? parseTraffic(rTraffic.data) : { series: [], labels: [], unique_users: 0, pageviews: 0 };
  const funnel = rFunnel.ok ? parseFunnel(rFunnel.data) : { steps: [], conversion_rate: 0, median_time_to_convert_sec: 0, top_drop: { from: 'N/A', to: 'N/A', dropRate: 0 } };

  // Add comparison data if available
  if (enableComparison && rComparisonTraffic?.ok) {
    console.log('[Analytics Preview] Processing comparison traffic data...');
    const comparisonTraffic = parseTraffic(rComparisonTraffic.data);
    traffic.previous_unique_users = comparisonTraffic.unique_users;
    traffic.previous_pageviews = comparisonTraffic.pageviews;
    console.log('[Analytics Preview] Comparison traffic:', {
      current: { users: traffic.unique_users, pageviews: traffic.pageviews },
      previous: { users: traffic.previous_unique_users, pageviews: traffic.previous_pageviews }
    });
  }

  if (enableComparison && rComparisonFunnel?.ok) {
    console.log('[Analytics Preview] Processing comparison funnel data...');
    const comparisonFunnel = parseFunnel(rComparisonFunnel.data);
    funnel.previous_conversion_rate = comparisonFunnel.conversion_rate;
    funnel.previous_signups = comparisonFunnel.steps[comparisonFunnel.steps.length - 1]?.count || 0;
    console.log('[Analytics Preview] Comparison funnel:', {
      current: { conversion: funnel.conversion_rate, signups: funnel.steps[funnel.steps.length - 1]?.count || 0 },
      previous: { conversion: funnel.previous_conversion_rate, signups: funnel.previous_signups }
    });
  }

  // Build KPIs with comparison data
  const kpis = {
    traffic,
    funnel,
    lifecycle: rLifecycle.ok ? parseLifecycle(rLifecycle.data) : { labels: [], series: { new: [], returning: [], resurrecting: [], dormant: [] } },
    device: rDevice.ok ? parseDeviceMix(rDevice.data) : { device_mix: {} },
    retention: rRetention.ok ? parseRetention(rRetention.data, dateRange) : { d7_retention: 0, values: [], retention_period: dateRange === '7d' ? 7 : 30 },
    geography: rGeography.ok ? parseGeography(rGeography.data) : { countries: {} },
    cityGeography: rCityGeography.ok ? parseCityGeography(rCityGeography.data) : { cities: {} },
    meta: { 
      errors, 
      dateRange: dateRange,
      comparisonEnabled: enableComparison
    },
  };

  // Add comparison data to all KPIs if available
  if (enableComparison) {
    // Device comparison
    if (rComparisonDevice?.ok) {
      console.log('[Analytics Preview] Processing comparison device data...');
      const comparisonDevice = parseDeviceMix(rComparisonDevice.data);
      kpis.device.previous_device_mix = comparisonDevice.device_mix;
    }

    // Lifecycle comparison
    if (rComparisonLifecycle?.ok) {
      console.log('[Analytics Preview] Processing comparison lifecycle data...');
      const comparisonLifecycle = parseLifecycle(rComparisonLifecycle.data);
      kpis.lifecycle.previous_series = comparisonLifecycle.series;
    }

    // Retention comparison
    if (rComparisonRetention?.ok) {
      console.log('[Analytics Preview] Processing comparison retention data...');
      const comparisonRetention = parseRetention(rComparisonRetention.data, dateRange);
      kpis.retention.previous_d7_retention = comparisonRetention.d7_retention;
      kpis.retention.previous_values = comparisonRetention.values;
    }

    // Geography comparison
    if (rComparisonGeography?.ok) {
      console.log('[Analytics Preview] Processing comparison geography data...');
      const comparisonGeography = parseGeography(rComparisonGeography.data);
      kpis.geography.previous_countries = comparisonGeography.countries;
    }

    // City Geography comparison
    if (rComparisonCityGeography?.ok) {
      console.log('[Analytics Preview] Processing comparison city geography data...');
      const comparisonCityGeography = parseCityGeography(rComparisonCityGeography.data);
      kpis.cityGeography.previous_cities = comparisonCityGeography.cities;
    }
  }

  console.log(`[Analytics Preview] Final KPIs with comparison:`, {
    traffic: {
      current_users: kpis.traffic.unique_users,
      previous_users: kpis.traffic.previous_unique_users,
      comparison_enabled: enableComparison
    },
    funnel: {
      current_conversion: kpis.funnel.conversion_rate,
      previous_conversion: kpis.funnel.previous_conversion_rate,
      comparison_enabled: enableComparison
    }
  });

  res.json({ kpis });
});

export default router;
