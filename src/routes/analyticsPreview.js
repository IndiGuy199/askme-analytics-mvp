// src/routes/analyticsPreview.js
import express from 'express';
import axios from 'axios';
import { CLIENTS } from '../config/clients.js';
import { getApiHost, injectClientFilter } from '../config/posthog.js';

const router = express.Router();
const findClient = (id) => CLIENTS.find((c) => c.clientId === id);

async function callQuery({ projectId, apiKey, name, query }) {
  const url = `${getApiHost()}/api/projects/${encodeURIComponent(projectId)}/query`;
  try {
    console.log(`[${name}] Making query to:`, url);
    console.log(`[${name}] Query payload:`, JSON.stringify(query, null, 2));
    
    const res = await axios.post(url, { query }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
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
    const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message;
    console.error(`[${name}] Query failed:`, errorMsg);
    console.error(`[${name}] Full error response:`, err.response?.data);
    return { ok: false, reason: errorMsg };
  }
}

/* ---------- tolerant parsers ---------- */
const firstSeries = (j) =>
  (Array.isArray(j?.results) ? j.results[0] : (Array.isArray(j?.result) ? j.result[0] : j?.result || {}));

function parseTraffic(json) {
  const s = firstSeries(json) || {};
  const data = s.data || [];
  const total = data.reduce((a, b) => a + (b || 0), 0);
  const uniques = s.aggregated_value ?? s.count ?? total;
  
  // Generate simple labels for the data points
  const labels = data.map((_, i) => `Day ${i + 1}`);
  
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
  
  return {
    steps,
    conversion_rate,
    median_time_to_convert_sec: json?.median_time_to_convert_sec || 0,
    top_drop: topDrop
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

/* ---------- GET /api/analytics/preview?clientId=askme-ai-app&dateRange=7d ---------- */
router.get('/preview', async (req, res) => {
  // CORS for frontend
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const clientId = (req.query.clientId || '').toString();
  const dateRange = (req.query.dateRange || '7d').toString(); // Get dateRange from query
  
  const client = findClient(clientId);
  if (!client) {
    return res.status(400).json({ error: `Unknown clientId: ${clientId}` });
  }

  console.log(`[Analytics Preview] Processing request for client: ${client.name} (${clientId})`);
  console.log(`[Analytics Preview] Date range: ${dateRange}`);

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

  const dateFilter = getDateRangeFilter(dateRange);
  console.log(`[Analytics Preview] Using date filter:`, dateFilter);

  // Create dynamic queries with the selected date range
  const createQueryWithDateRange = (baseQuery, dateRange) => {
    const query = JSON.parse(JSON.stringify(baseQuery)); // Deep clone
    
    console.log(`[createQueryWithDateRange] Original query:`, JSON.stringify(query, null, 2));
    console.log(`[createQueryWithDateRange] Applying date range:`, dateRange);
    
    // Apply date range based on query structure
    if (query.kind === 'InsightVizNode' && query.source) {
      // Most queries follow this pattern
      query.source.dateRange = dateRange;
      
      // Special handling for RetentionQuery
      if (query.source.kind === 'RetentionQuery') {
        query.source.dateRange = {
          ...dateRange,
          explicitDate: false
        };
      }
    } 
    else if (query.kind === 'FunnelsQuery') {
      // Direct FunnelsQuery
      query.dateRange = dateRange;
    }
    else if (query.dateRange) {
      // Fallback for any query with direct dateRange
      query.dateRange = dateRange;
    }
    else {
      console.warn(`[createQueryWithDateRange] Unknown query structure for date range application:`, query.kind);
    }
    
    console.log(`[createQueryWithDateRange] Updated query:`, JSON.stringify(query, null, 2));
    return query;
  };

  // Apply date range to all queries
  const trafficQuery = client.queries.traffic ? 
    createQueryWithDateRange(client.queries.traffic.query, dateFilter) : null;
    
  console.log(`[Analytics Preview] Traffic query with date range:`, JSON.stringify(trafficQuery, null, 2));
    
  const lifecycleQuery = client.queries.lifecycle ? 
    createQueryWithDateRange(client.queries.lifecycle.query, dateFilter) : null; // ✅ Use dateFilter instead of hardcoded 30d
    
  console.log(`[Analytics Preview] Lifecycle query with date range:`, JSON.stringify(lifecycleQuery, null, 2));
    
  const deviceQuery = client.queries.deviceMix ? 
    createQueryWithDateRange(client.queries.deviceMix.query, dateFilter) : null;
    
  console.log(`[Analytics Preview] Device query with date range:`, JSON.stringify(deviceQuery, null, 2));
    
  const retentionQuery = client.queries.retention ? 
    createQueryWithDateRange(client.queries.retention.query, {
      // Use the exact date range selected by the user
      // -7d for 7-day selection, -30d for 30-day selection
      date_from: dateRange === '7d' ? '-7d' : '-30d',
      date_to: null,
      explicitDate: false
    }) : null;
    
  console.log(`[Analytics Preview] Retention query with date range:`, JSON.stringify(retentionQuery, null, 2));
    
  const geographyQuery = client.queries.geography ? 
    createQueryWithDateRange(client.queries.geography.query, dateFilter) : null;
    
  console.log(`[Analytics Preview] Geography query with date range:`, JSON.stringify(geographyQuery, null, 2));
    
  const cityGeographyQuery = client.queries.cityGeography ? 
    createQueryWithDateRange(client.queries.cityGeography.query, dateFilter) : null;
    
  console.log(`[Analytics Preview] City geography query with date range:`, JSON.stringify(cityGeographyQuery, null, 2));

  // Funnel query with dynamic date range
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

  const funnelQuery = createQueryWithDateRange(fallbackFunnelQuery, dateFilter);
  console.log(`[Analytics Preview] Funnel query with date range:`, JSON.stringify(funnelQuery, null, 2));

  // Inject client filters
  const withFunnelFilter = (q) => injectClientFilter(q, client.clientId);

  // Run queries in parallel
  const pTraffic = trafficQuery ? 
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'traffic', query: withFunnelFilter(trafficQuery) }) : 
    Promise.resolve({ ok: false, reason: 'Traffic query not configured' });
    
  const pLifecycle = lifecycleQuery ? 
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'lifecycle', query: lifecycleQuery }) : 
    Promise.resolve({ ok: false, reason: 'Lifecycle query not configured' });
    
  const pDevice = deviceQuery ? 
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'deviceMix', query: withFunnelFilter(deviceQuery) }) : 
    Promise.resolve({ ok: false, reason: 'Device query not configured' });
    
  const pRetention = retentionQuery ? 
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'retention', query: retentionQuery }) : 
    Promise.resolve({ ok: false, reason: 'Retention query not configured' });
    
  const pGeography = geographyQuery ? 
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'geography', query: geographyQuery }) : 
    Promise.resolve({ ok: false, reason: 'Geography query not configured' });
    
  const pCityGeography = cityGeographyQuery ? 
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'cityGeography', query: cityGeographyQuery }) : 
    Promise.resolve({ ok: false, reason: 'City geography query not configured' });

  // Funnel query
  const rFunnel = await callQuery({
    projectId: client.projectId,
    apiKey: client.apiKey,
    name: 'funnel',
    query: withFunnelFilter(funnelQuery),
  });

  const [rTraffic, rLifecycle, rDevice, rRetention, rGeography, rCityGeography] = await Promise.all([
    pTraffic, pLifecycle, pDevice, pRetention, pGeography, pCityGeography
  ]);

  // Build response with proper error handling
  const errors = {};
  if (!rTraffic.ok) errors.traffic = rTraffic.reason;
  if (!rFunnel.ok) errors.funnel = rFunnel.reason;
  if (!rLifecycle.ok) errors.lifecycle = rLifecycle.reason;
  if (!rDevice.ok) errors.device = rDevice.reason;
  if (!rRetention.ok) errors.retention = rRetention.reason;
  if (!rGeography.ok) errors.geography = rGeography.reason;
  if (!rCityGeography.ok) errors.cityGeography = rCityGeography.reason;

  const kpis = {
    traffic: rTraffic.ok ? parseTraffic(rTraffic.data) : { series: [], labels: [], unique_users: 0, pageviews: 0 },
    funnel: rFunnel.ok
      ? parseFunnel(rFunnel.data)
      : { steps: [], conversion_rate: 0, median_time_to_convert_sec: 0, top_drop: { from: 'N/A', to: 'N/A', dropRate: 0 } },
    lifecycle: rLifecycle.ok
      ? parseLifecycle(rLifecycle.data)
      : { labels: [], series: { new: [], returning: [], resurrecting: [], dormant: [] } },
    device: rDevice.ok ? parseDeviceMix(rDevice.data) : { device_mix: {} },
    retention: rRetention.ok ? parseRetention(rRetention.data, dateRange) : { d7_retention: 0, values: [], retention_period: dateRange === '7d' ? 7 : 30 }, // Pass dateRange to parser
    geography: rGeography.ok ? parseGeography(rGeography.data) : { countries: {} },
    cityGeography: rCityGeography.ok ? parseCityGeography(rCityGeography.data) : { cities: {} },
    meta: { errors, dateRange: dateRange },
  };

  console.log(`[Analytics Preview] Query results for ${dateRange}:`, {
    traffic: rTraffic.ok ? 'SUCCESS' : `FAILED: ${rTraffic.reason}`,
    lifecycle: rLifecycle.ok ? 'SUCCESS' : `FAILED: ${rLifecycle.reason}`,
    device: rDevice.ok ? 'SUCCESS' : `FAILED: ${rDevice.reason}`,
    funnel: rFunnel.ok ? 'SUCCESS' : `FAILED: ${rFunnel.reason}`,
    retention: rRetention.ok ? 'SUCCESS' : `FAILED: ${rRetention.reason}`,
    geography: rGeography.ok ? 'SUCCESS' : `FAILED: ${rGeography.reason}`,
    cityGeography: rCityGeography.ok ? 'SUCCESS' : `FAILED: ${rCityGeography.reason}`,
  });

  return res.json({ kpis, errors });
});

export default router;
