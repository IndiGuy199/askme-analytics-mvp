import { CLIENTS } from '../../../src/config/clients.js';

// Import your parser functions from the existing route
const firstSeries = (j) =>
  (Array.isArray(j?.results) ? j.results[0] : (Array.isArray(j?.result) ? j.result[0] : j?.result || {}));

function parseTraffic(json) {
  const s = firstSeries(json) || {};
  const data = s.data || [];
  const total = data.reduce((a, b) => a + (b || 0), 0);
  const uniques = s.aggregated_value ?? s.count ?? total;
  
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
  
  if (Array.isArray(json?.results) && json.results.length) {
    const steps = json.results.map((s, i) => ({
      name: s.custom_name || s.name || `Step ${i + 1}`,
      count: s.count || 0,
    }));
    const first = steps[0]?.count || 0;
    const last = steps[steps.length - 1]?.count || 0;
    const conversion_rate = first ? last / first : 0;
    const median_time_to_convert_sec = json.results[json.results.length - 1]?.median_conversion_time || 0;

    let top = { from: 'N/A', to: 'N/A', dropRate: 0 };
    for (let i = 0; i < steps.length - 1; i++) {
      const a = steps[i], b = steps[i + 1];
      const drop = a.count ? (a.count - (b.count || 0)) / a.count : 0;
      if (drop > top.dropRate) top = { from: a.name, to: b.name, dropRate: drop };
    }
    
    return { steps, conversion_rate, median_time_to_convert_sec, top_drop: top };
  }

  return { 
    steps: [], 
    conversion_rate: 0, 
    median_time_to_convert_sec: 0, 
    top_drop: { from: 'N/A', to: 'N/A', dropRate: 0 } 
  };
}

function parseLifecycle(json) {
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { labels: [], series: { new: [], returning: [], resurrecting: [], dormant: [] } };
  }

  const labels = [];
  const series = { new: [], returning: [], resurrecting: [], dormant: [] };
  
  if (results[0]?.data && Array.isArray(results[0].data)) {
    const dataLength = results[0].data.length;
    for (let i = 0; i < dataLength; i++) {
      labels.push(`Day ${i + 1}`);
    }
  }
  
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
  
  return { labels, series };
}

function parseDeviceMix(json) {
  const results = json?.results || [];
  if (!Array.isArray(results) || results.length === 0) {
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

  if (total > 0) {
    Object.keys(device_mix).forEach(device => {
      device_mix[device] = device_mix[device] / total;
    });
  }
  
  return { device_mix };
}

function parseRetention(json) {
  const results = json?.results;
  if (!Array.isArray(results) || results.length === 0) {
    return { d7_retention: 0, values: [] };
  }
  
  let bestCohort = null;
  let maxValues = 0;
  
  for (const cohort of results) {
    if (cohort?.values && Array.isArray(cohort.values)) {
      const valueCount = cohort.values.length;
      if (valueCount > maxValues) {
        maxValues = valueCount;
        bestCohort = cohort;
      }
    }
  }
  
  if (!bestCohort || !bestCohort.values || bestCohort.values.length === 0) {
    return { d7_retention: 0, values: [] };
  }
  
  const cohortValues = bestCohort.values.map((item, index) => {
    let count = 0;
    if (typeof item === 'number') {
      count = item;
    } else if (item && typeof item === 'object') {
      count = item.count || item.value || 0;
    }
    
    return {
      day: index,
      count: count
    };
  });
  
  const day0Count = cohortValues[0]?.count || 0;
  const day7Count = cohortValues[7]?.count || 0;
  const d7_retention = day0Count > 0 ? day7Count / day0Count : 0;
  
  const formattedValues = cohortValues.map((v) => {
    const percentage = day0Count > 0 ? (v.count / day0Count) * 100 : 0;
    return {
      day: v.day,
      count: v.count,
      percentage: Math.round(percentage * 100) / 100
    };
  });
  
  return { 
    d7_retention,
    values: formattedValues
  };
}

function parseGeography(json) {
  const results = json?.results || json?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { countries: {} };
  }

  const countries = {};
  
  results.forEach(result => {
    const countryCode = result?.breakdown_value || result?.label || 'Unknown';
    const count = result?.count || 
                  (Array.isArray(result?.data) ? result.data.reduce((a, b) => a + (b || 0), 0) : 0) ||
                  result?.aggregated_value || 0;
    
    if (countryCode && countryCode !== 'Unknown' && count > 0) {
      countries[countryCode.toUpperCase()] = count;
    }
  });
  
  return { countries };
}

function parseCityGeography(json) {
  const results = json?.results || json?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    return { cities: {} };
  }

  const cities = {};
  
  results.forEach(result => {
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
  
  return { cities };
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId } = req.query;
  
  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    const client = CLIENTS.find((c) => c.clientId === clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Return mock data for now to avoid API issues
    const kpis = {
      traffic: {
        series: [1, 1, 1, 0, 0, 1, 1],
        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        unique_users: 1230,
        pageviews: 1500
      },
      funnel: {
        steps: [
          { name: 'Profile Creation Start View', count: 100 },
          { name: 'Primary Area Selected', count: 80 },
          { name: 'Personal Information Entered', count: 60 },
          { name: 'Challenges Selected', count: 40 },
          { name: 'Consent Provided', count: 20 },
          { name: 'Profile Created', count: 52 }
        ],
        conversion_rate: 0.52,
        median_time_to_convert_sec: 120,
        top_drop: { from: 'Challenges Selected', to: 'Consent Provided', dropRate: 0.5 }
      },
      lifecycle: {
        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        series: {
          new: [10, 15, 12, 8, 20, 18, 14],
          returning: [5, 8, 10, 12, 15, 20, 18],
          resurrecting: [2, 3, 5, 4, 6, 8, 10],
          dormant: [1, 2, 1, 3, 2, 4, 3]
        }
      },
      device: {
        device_mix: {
          desktop: 0.65,
          mobile: 0.30,
          tablet: 0.05
        }
      },
      retention: {
        d7_retention: 0.25,
        values: [
          { day: 0, count: 100, percentage: 100 },
          { day: 1, count: 80, percentage: 80 },
          { day: 2, count: 60, percentage: 60 },
          { day: 3, count: 45, percentage: 45 },
          { day: 4, count: 35, percentage: 35 },
          { day: 5, count: 30, percentage: 30 },
          { day: 6, count: 28, percentage: 28 },
          { day: 7, count: 25, percentage: 25 }
        ]
      },
      geography: {
        countries: {
          'US': 1200,
          'CA': 200,
          'GB': 150,
          'DE': 100,
          'FR': 80
        }
      },
      cityGeography: {
        cities: {
          'pompano-beach-us': { city: 'Pompano Beach', country: 'US', count: 500 },
          'new-york-us': { city: 'New York', country: 'US', count: 400 },
          'toronto-ca': { city: 'Toronto', country: 'CA', count: 200 },
          'london-gb': { city: 'London', country: 'GB', count: 150 },
          'berlin-de': { city: 'Berlin', country: 'DE', count: 100 }
        }
      },
      meta: { errors: {} }
    };

    console.log('Analytics API returning data:', JSON.stringify(kpis, null, 2));
    res.status(200).json({ kpis });

  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}