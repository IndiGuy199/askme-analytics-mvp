// src/routes/analyticsPreview.js
import express from 'express';
import axios from 'axios';
import { CLIENTS } from '../config/clients.js';
import { POSTHOG_HOST, injectClientFilter } from '../config/posthog.js';

const router = express.Router();

function findClient(clientId) {
  return CLIENTS.find((c) => c.clientId === clientId);
}

async function callQuery({ projectId, apiKey, name, query }) {
  const url = `${POSTHOG_HOST}/api/projects/${encodeURIComponent(projectId)}/query`;
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' };

  console.log(`[QueryAPI] ${name} URL: ${url}`);
  console.log(`[QueryAPI] ${name} payload: ${JSON.stringify({ query }, null, 2)}`);

  try {
    const res = await axios.post(url, { query }, { headers });
    if (res?.data?.error) {
      console.error(`[QueryAPI] ${name} error: ${res.data.error}`);
      return { ok: false, reason: res.data.error, data: res.data };
    }
    return { ok: true, data: res.data };
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const reason = data?.detail || data?.error || err?.message || 'unknown';
    console.error(`[QueryAPI] ${name} failed (${status || 'n/a'}): ${JSON.stringify(data || {}, null, 2)}`);
    if (status === 404) {
      console.error('Hint: 404 often means wrong host/path. For cloud, try POSTHOG_HOST=https://us.i.posthog.com and POST /api/projects/{id}/query');
    }
    return { ok: false, reason, status, data };
  }
}

/* ---------- Parsers (tolerant of shapes) ---------- */
function firstSeries(json) {
  const r = json?.results ?? json?.result ?? [];
  return Array.isArray(r) ? r[0] : r;
}

function parseTraffic(json) {
  const s = firstSeries(json) || {};
  const data = s.data || [];
  const labels = s.labels || [];
  const total = data.reduce((a, b) => a + (b || 0), 0);
  const uniques = s.aggregated_value ?? s.count ?? total;
  return { series: data, labels, unique_users: uniques || 0, pageviews: total || 0 };
}

function parseFunnel(json) {
  const f = firstSeries(json) || {};
  const steps = (f?.steps || []).map((x) => ({ name: x?.name || x?.custom_name || 'step', count: x?.count || 0 }));
  const conversion_rate = f?.aggregate?.conversion_rate ?? f?.conversion_rate ?? 0;
  const median_time_to_convert_sec =
    f?.aggregate?.median_conversion_time_seconds ?? f?.median_conversion_time_seconds ?? 0;
  let top = { from: 'N/A', to: 'N/A', dropRate: 0 };
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i], to = steps[i + 1];
    const rate = from.count ? (from.count - (to.count || 0)) / from.count : 0;
    if (rate > top.dropRate) top = { from: from.name, to: to.name, dropRate: rate };
  }
  return { steps, conversion_rate, median_time_to_convert_sec, top_drop: top };
}

function parseDeviceMix(json) {
  const r = json?.results ?? json?.result ?? [];
  if (!Array.isArray(r) || r.length === 0) return { device_mix: {} };
  const totals = r.map((s) => ({
    label: s.label || s.breakdown_value || 'Other',
    value: (s.count ?? (Array.isArray(s.data) ? s.data.reduce((a, b) => a + (b || 0), 0) : 0)) || 0,
  }));
  const sum = totals.reduce((a, b) => a + b.value, 0) || 1;
  const mix = {};
  for (const t of totals) mix[t.label] = t.value / sum;
  return { device_mix: mix };
}

function parseRetention(json) {
  const r = json?.results ?? json?.result ?? [];
  const row = Array.isArray(r) ? r[0] : r;
  const values = row?.values || row?.data || [];
  const day0 = values?.[0]?.count ?? values?.[0]?.value ?? 0;
  const day7 = values?.[7]?.count ?? values?.[7]?.value ?? 0;
  const d7 = day0 ? day7 / day0 : 0;
  return { d7_retention: d7 || 0 };
}

router.get('/preview', async (req, res) => {
  const clientId = (req.query.clientId || req.body?.clientId || '').toString();
  const client = findClient(clientId);
  if (!client) return res.status(400).json({ error: `Unknown clientId: ${clientId}` });

  console.log('Preview for client:', client.name, client.clientId);

  const withFilter = (q) => injectClientFilter(q, client.clientId);

  const qTraffic = withFilter(client.queries.traffic.query);
  const qFunnel = withFilter(client.queries.funnel.query);
  const qRetention = withFilter(client.queries.retention.query);
  const qDevice = withFilter(client.queries.deviceMix.query);

  const [rTraffic, rFunnel, rRetention, rDevice] = await Promise.all([
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'traffic', query: qTraffic }),
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'funnel', query: qFunnel }),
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'retention', query: qRetention }),
    callQuery({ projectId: client.projectId, apiKey: client.apiKey, name: 'deviceMix', query: qDevice }),
  ]);

  const errors = {};
  if (!rTraffic.ok) errors.traffic = rTraffic.reason;
  if (!rFunnel.ok) errors.funnel = rFunnel.reason;
  if (!rRetention.ok) errors.retention = rRetention.reason;
  if (!rDevice.ok) errors.device = rDevice.reason;

  const kpis = {
    traffic: rTraffic.ok ? parseTraffic(rTraffic.data) : { series: [], labels: [], unique_users: 0, pageviews: 0 },
    funnel: rFunnel.ok
      ? parseFunnel(rFunnel.data)
      : { steps: [], conversion_rate: 0, median_time_to_convert_sec: 0, top_drop: { from: 'N/A', to: 'N/A', dropRate: 0 } },
    retention: rRetention.ok ? parseRetention(rRetention.data) : { d7_retention: 0 },
    device: rDevice.ok ? parseDeviceMix(rDevice.data) : { device_mix: {} },
    meta: { errors },
  };

  // If API returned OK but there is no data, attach a visible reason
  const addIfEmpty = (empty, key, msg) => {
    if (empty && !errors[key]) errors[key] = msg;
  };
  addIfEmpty(rTraffic.ok && !(kpis.traffic.series || []).some((n) => n > 0), 'traffic', 'No matching events in date range');
  addIfEmpty(rFunnel.ok && (kpis.funnel.steps || []).length === 0, 'funnel', 'No funnel steps returned');
  addIfEmpty(rRetention.ok && !kpis.retention.d7_retention, 'retention', 'No repeat usage detected (D7=0)');
  addIfEmpty(rDevice.ok && Object.keys(kpis.device.device_mix || {}).length === 0, 'device', 'No breakdown values');

  return res.json({ kpis, errors });
});

export default router;
