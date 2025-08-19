// src/services/weeklyDigestService.js
import axios from 'axios';
import { POSTHOG_HOST, injectClientFilter } from '../config/posthog.js';
import { CLIENTS } from '../config/clients.js';
import { createMailer } from '../config/mailer.js';

async function runQuery({ projectId, apiKey, query }) {
  // Use the Query API (NOT /api/insights)
  const url = `${POSTHOG_HOST}/api/projects/${projectId}/query`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // The Query API expects { query: <Your InsightVizNode / TrendsQuery / FunnelsQuery ...> }
  console.log('PostHog Query URL:', url);
  console.log('Query payload:', JSON.stringify({ query }, null, 2));

  try {
    const res = await axios.post(url, { query }, { headers });
    console.log('PostHog Response:', JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err) {
    const data = err?.response?.data;
    if (data) {
      console.error('PostHog error response:', JSON.stringify(data, null, 2));
      if (err.response.status === 404) {
        console.error('Hint: 404 often means wrong host or path. Use https://us.i.posthog.com and /api/projects/{id}/query');
      } else if (err.response.status === 401) {
        console.error('Hint: 401 means bad/expired personal API key or wrong project.');
      }
    } else {
      console.error('PostHog request error:', err.message);
    }
    throw new Error(`PostHog Query failed for project ${projectId}: ${err?.message || 'unknown'}`);
  }
}

/* ---------- Parsers (tolerant to shape differences) ---------- */
function parseTraffic(trendsJson) {
  const series = trendsJson?.result?.[0];
  const data = series?.data || [];
  const total = data.reduce((a, b) => a + (b || 0), 0);
  const uniques = series?.aggregated_value ?? total;
  return { pageviews: total, unique_users: uniques, series: data };
}

function parseFunnel(funnelJson) {
  const res = funnelJson?.result?.[0] || funnelJson?.result;
  const steps = (res?.steps || []).map((s) => ({
    name: s.name || s.custom_name || 'step',
    count: s.count || 0,
  }));
  const conversion_rate = res?.aggregate?.conversion_rate ?? res?.conversion_rate ?? 0;
  const median_time_to_convert_sec =
    res?.aggregate?.median_conversion_time_seconds ?? res?.median_conversion_time_seconds ?? 0;

  let top = { from: 'N/A', to: 'N/A', dropRate: 0 };
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i], to = steps[i + 1];
    const rate = from.count ? (from.count - (to.count || 0)) / from.count : 0;
    if (rate > top.dropRate) top = { from: from.name, to: to.name, dropRate: rate };
  }

  return {
    steps,
    conversion_rate,
    median_time_to_convert_sec,
    top_drop: `${top.from} → ${top.to}`,
    top_drop_rate: top.dropRate,
  };
}

function parseRetention(retJson) {
  const d7 =
    retJson?.result?.[0]?.values?.[7]?.value ??
    retJson?.result?.insight?.d7 ??
    0;
  return { d7_retention: d7 };
}

function parseDeviceMix(trendsJson) {
  const series = trendsJson?.result || [];
  const totals = series.map((s) => s.aggregated_value || (s.data || []).reduce((a, b) => a + (b || 0), 0));
  const sum = totals.reduce((a, b) => a + b, 0) || 1;
  const mix = {};
  series.forEach((s, i) => {
    const label = (s.label || s.breakdown_value || `device_${i}`).toString().toLowerCase();
    mix[label] = +(totals[i] / sum).toFixed(3);
  });
  return { device_mix: mix };
}

/* ---------- (Optional) AI summary placeholder ---------- */
async function aiSummary(kpis) {
  return `Traffic ${kpis.traffic.unique_users} users; conversion ${(kpis.funnel.conversion_rate * 100).toFixed(1)}%. Biggest drop: ${kpis.funnel.top_drop}. Median time to convert ${Math.round(kpis.funnel.median_time_to_convert_sec)}s. D7 ${(kpis.retention.d7_retention * 100).toFixed(1)}%.`;
}

/* ---------- Email renderer ---------- */
function renderEmail({ clientName, kpis, summary }) {
  const pct = (x) => (x * 100).toFixed(1) + '%';
  const deviceList = Object.entries(kpis.device.device_mix || {})
    .map(([k, v]) => `${k}: ${pct(v)}`).join(' • ');

  return {
    subject: `Weekly Analytics – ${clientName}`,
    html: `
      <h2>${clientName}: Weekly Analytics</h2>
      <ul>
        <li><b>Traffic</b>: ${kpis.traffic.unique_users} users, ${kpis.traffic.pageviews} pageviews</li>
        <li><b>Conversion</b>: ${(kpis.funnel.conversion_rate * 100).toFixed(1)}%</li>
        <li><b>Top drop</b>: ${kpis.funnel.top_drop} (${pct(kpis.funnel.top_drop_rate)})</li>
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
    // Inject client_id filter into each query
    const qTraffic   = injectClientFilter(client.queries.traffic.query,   client.clientId);
    const qFunnel    = injectClientFilter(client.queries.funnel.query,    client.clientId);
    const qRetention = injectClientFilter(client.queries.retention.query, client.clientId);
    const qDevice    = injectClientFilter(client.queries.deviceMix.query, client.clientId);

    // Run queries in parallel
    const [trafficJ, funnelJ, retentionJ, deviceJ] = await Promise.all([
      runQuery({ projectId: client.projectId, apiKey: client.apiKey, query: qTraffic }),
      runQuery({ projectId: client.projectId, apiKey: client.apiKey, query: qFunnel }),
      runQuery({ projectId: client.projectId, apiKey: client.apiKey, query: qRetention }),
      runQuery({ projectId: client.projectId, apiKey: client.apiKey, query: qDevice }),
    ]);

    // Parse metrics
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
      to: (client.recipients || [process.env.DEFAULT_RECIPIENT]).join(','),
      subject,
      html,
    });

    // Log Ethereal preview URL if available
    if (info.messageId && info.messageId.includes('ethereal.email')) {
      console.log('📧 Ethereal preview URL:', `https://ethereal.email/message/${info.messageId}`);
    }

    console.log('✅ Email sent successfully to:', client.recipients || [process.env.DEFAULT_RECIPIENT]);
    return { ok: true };

  } catch (error) {
    console.error('Error processing client:', client.name, error);
    throw error;
  }
}

export default { runForClientId };    // Run queries in parallel
