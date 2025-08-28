// src/services/weeklyDigestService.js
import axios from 'axios';
import { getApiHost, injectClientFilter } from '../config/posthog.js';
import { CLIENTS } from '../config/clients.js';
import { createMailer } from '../config/mailer.js';

async function runQuery({ projectId, apiKey, query }) {
  // Use Query API (current API for PostHog Cloud)
  const url = `${getApiHost()}/api/projects/${encodeURIComponent(projectId)}/query`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  console.log('PostHog Query API URL:', url);
  console.log('Query payload:', JSON.stringify(query, null, 2));

  try {
    // Query API expects { query: InsightVizNode }
    const payload = { query };
    const res = await axios.post(url, payload, { headers });
    console.log('PostHog Response:', JSON.stringify(res.data, null, 2));
    if (res?.data?.error) {
      console.error('PostHog error field:', res.data.error);
      throw new Error(res.data.error);
    }
    return res.data;
  } catch (err) {
    const data = err?.response?.data;
    if (data) {
      console.error('PostHog error response:', JSON.stringify(data, null, 2));
      if (err.response.status === 401) {
        console.error('Hint: 401 means bad/expired personal API key or wrong project.');
      } else if (err.response.status === 403) {
        console.error('Hint: 403 means insufficient permissions for this project');
      }
    } else {
      console.error('PostHog request error:', err.message);
    }
    throw new Error(`PostHog Query failed for project ${projectId}: ${err?.message || 'unknown'}`);
  }
}

/* ---------- Parsers (updated to handle Insights API response) ---------- */
function parseTraffic(trendsJson) {
  // Handle both results and result (Insights vs Query API response shapes)
  const series = trendsJson?.results?.[0] || trendsJson?.result?.[0];
  const data = series?.data || [];
  const total = data.reduce((a, b) => a + (b || 0), 0);
  const uniques = series?.aggregated_value ?? total;
  return { pageviews: total, unique_users: uniques, series: data };
}

function parseFunnel(funnelJson) {
  if (Array.isArray(funnelJson?.results) && funnelJson.results.length) {
    const steps = funnelJson.results.map((s, i) => ({
      name: s.custom_name || s.name || `Step ${i + 1}`,
      count: s.count || 0,
    }));
    const first = steps[0]?.count || 0;
    const last = steps[steps.length - 1]?.count || 0;
    const conversion_rate = first ? last / first : 0;
    const median_time_to_convert_sec = funnelJson.results[funnelJson.results.length - 1]?.median_conversion_time || 0;

    let top = { from: 'N/A', to: 'N/A', dropRate: 0 };
    for (let i = 0; i < steps.length - 1; i++) {
      const a = steps[i], b = steps[i + 1];
      const drop = a.count ? (a.count - (b.count || 0)) / a.count : 0;
      if (drop > top.dropRate) top = { from: a.name, to: b.name, dropRate: drop };
    }
    return { steps, conversion_rate, median_time_to_convert_sec, top_drop: top, top_drop_rate: top.dropRate };
  }

  // Fallback (older aggregate shape)
  const result = funnelJson?.results?.[0] || funnelJson?.result?.[0] || funnelJson?.result;
  const steps = (result?.steps || []).map((s, i) => ({ name: s.name || s.custom_name || `Step ${i + 1}`, count: s.count || 0 }));
  const conversion_rate = result?.aggregate?.conversion_rate ?? result?.conversion_rate ?? 0;
  const median_time_to_convert_sec = result?.aggregate?.median_conversion_time_seconds ?? result?.median_conversion_time_seconds ?? 0;

  let top = { from: 'N/A', to: 'N/A', dropRate: 0 };
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i], b = steps[i + 1];
    const drop = a.count ? (a.count - (b.count || 0)) / a.count : 0;
    if (drop > top.dropRate) top = { from: a.name, to: b.name, dropRate: drop };
  }
  return { steps, conversion_rate, median_time_to_convert_sec, top_drop: top, top_drop_rate: top.dropRate };
}

function parseRetention(retJson) {
  const result = retJson?.results?.[0] || retJson?.result?.[0];
  const values = result?.values || result?.data || [];
  const day0 = values?.[0]?.count || values?.[0]?.value || 0;
  const day7 = values?.[7]?.count || values?.[7]?.value || 0;
  const d7_retention = day0 ? day7 / day0 : 0;
  return { d7_retention };
}

function parseDeviceMix(trendsJson) {
  const results = trendsJson?.results || trendsJson?.result || [];
  if (!Array.isArray(results) || results.length === 0) return { device_mix: {} };
  
  const totals = results.map((s) => ({
    label: s.label || s.breakdown_value || 'Other',
    value: s.count || (Array.isArray(s.data) ? s.data.reduce((a, b) => a + (b || 0), 0) : 0),
  }));
  
  const sum = totals.reduce((acc, item) => acc + item.value, 0) || 1;
  const device_mix = {};
  totals.forEach((item) => {
    device_mix[item.label] = item.value / sum;
  });
  
  return { device_mix };
}

/* ---------- (Optional) AI summary placeholder ---------- */
async function aiSummary(kpis) {
  return `This week saw ${kpis.traffic.unique_users} unique users with ${kpis.traffic.pageviews} pageviews. Conversion rate was ${(kpis.funnel.conversion_rate * 100).toFixed(1)}%.`;
}

/* ---------- Email renderer ---------- */
function renderEmail({ clientName, kpis, summary }) {
  const pct = (x) => (x * 100).toFixed(1) + '%';
  const deviceList = Object.entries(kpis.device.device_mix || {})
    .map(([k, v]) => `${k}: ${pct(v)}`).join(' • ');
  const topDrop = `${kpis.funnel.top_drop.from} → ${kpis.funnel.top_drop.to}`;

  return {
    subject: `Weekly Analytics – ${clientName}`,
    html: `
      <h2>${clientName}: Weekly Analytics</h2>
      <ul>
        <li><b>Traffic</b>: ${kpis.traffic.unique_users} users, ${kpis.traffic.pageviews} pageviews</li>
        <li><b>Conversion</b>: ${(kpis.funnel.conversion_rate * 100).toFixed(1)}%</li>
        <li><b>Top drop</b>: ${topDrop} (${pct(kpis.funnel.top_drop_rate)})</li>
        <li><b>Time-to-convert</b>: ${Math.round(kpis.funnel.median_time_to_convert_sec)}s</li>
        <li><b>D7 retention</b>: ${(kpis.retention.d7_retention * 100).toFixed(1)}%</li>
        <li><b>Device mix</b>: ${deviceList}</li>
      </ul>
      <h3>AI Summary</h3>
      <p>${summary.replace(/\n/g, '<br/>')}</p>
    `,
  };
}

/* ---------- Public entry ---------- */
export async function runForClientId(clientId) {
  const client = CLIENTS.find((c) => c.clientId === clientId);
  if (!client) throw new Error(`Unknown clientId: ${clientId}`);

  console.log('Processing client:', client.name);
  
  try {
    // Use the configured FunnelsQuery directly (mirrors your saved insight JSON).
    // This avoids 403s from Insights endpoints and union_tag_invalid errors.
    const funnelQueryNode = client.queries.funnel.query;

    // Inject client_id filter into each query
    const qTraffic   = injectClientFilter(client.queries.traffic.query,   client.clientId);
    const qFunnel    = injectClientFilter(funnelQueryNode,                client.clientId);
    const qRetention = injectClientFilter(client.queries.retention.query, client.clientId);
    const qDevice    = injectClientFilter(client.queries.deviceMix.query, client.clientId);

    // Run queries in parallel
    const [trafficJ, funnelJ, retentionJ, deviceJ] = await Promise.all([
      runQuery({ projectId: client.projectId, apiKey: client.apiKey, query: qTraffic }),
      runQuery({ projectId: client.projectId, apiKey: client.apiKey, query: qFunnel }),
      runQuery({ projectId: client.projectId, apiKey: client.apiKey, query: qRetention }),
      runQuery({ projectId: client.projectId, apiKey: client.apiKey, query: qDevice }),
    ]);

    const traffic   = parseTraffic(trafficJ);
    const funnel    = parseFunnel(funnelJ);
    const retention = parseRetention(retentionJ);
    const device    = parseDeviceMix(deviceJ);

    console.log('Parsed metrics:', { traffic, funnel, retention, device });

    const summary = await aiSummary({ traffic, funnel, retention, device });

    // Email
    const mailer = await createMailer();
    const { subject, html } = renderEmail({
      clientName: client.name,
      kpis: { traffic, funnel, retention, device },
      summary,
    });

    const info = await mailer.sendMail({
      from: process.env.FROM_EMAIL || 'insights@your-saas.com',
      to: client.recipients.join(', '),
      subject,
      html,
    });

    console.log('Email sent:', info.messageId);
    return { ok: true };
  } catch (e) {
    console.error('Client processing error:', e.message);
    throw e;
  }
}

export default { runForClientId };
