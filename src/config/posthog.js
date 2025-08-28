import axios from 'axios';
// src/config/posthog.js
// Use the private API host by default (US Cloud). Override via POSTHOG_HOST for EU/self-hosted.
export const POSTHOG_HOST =
  (process.env.POSTHOG_HOST && process.env.POSTHOG_HOST.replace(/\/$/, '')) ||
  'https://us.posthog.com'; // For EU use https://eu.posthog.com

// Prefer US Cloud; override with POSTHOG_HOST for EU/self-hosted.
export function getApiHost() {
  return (process.env.POSTHOG_HOST || 'https://us.posthog.com').trim();
}

// Inject client_id into FunnelsQuery only, using the correct PropertyFilter shape (no `kind`).
export function injectClientFilter(query, clientId) {
  const q = JSON.parse(JSON.stringify(query || {}));

  // Correct PostHog property filter shape for Query API
  const funnelProp = {
    type: 'event',
    key: 'client_id',
    value: clientId,
    operator: 'exact',
  };

  const ensureFunnelProps = (node) => {
    if (!node || typeof node !== 'object') return;
    if (!Array.isArray(node.properties)) node.properties = [];
    if (!node.properties.some((p) => p?.key === 'client_id')) node.properties.push(funnelProp);

    if (Array.isArray(node.series)) {
      node.series.forEach((s) => {
        if (!Array.isArray(s.properties)) s.properties = [];
        if (!s.properties.some((p) => p?.key === 'client_id')) s.properties.push(funnelProp);
      });
    }
  };

  if (q?.kind === 'InsightVizNode' && q.source?.kind === 'FunnelsQuery') {
    ensureFunnelProps(q.source);
  } else if (q?.kind === 'FunnelsQuery') {
    ensureFunnelProps(q);
  }
  // Do not touch Trends/Retention/etc.
  return q;
}

// Normalize legacy properties (array or group) into valid PropertyFilter objects (no `kind`)
function normalizeProperties(input) {
  const out = [];

  const push = (p) => {
    if (!p || typeof p !== 'object') return;
    // PropertyGroup { type: 'AND'|'OR', values: [...] }
    if (Array.isArray(p.values)) {
      p.values.forEach(push);
      return;
    }
    // Legacy { type, key, value, operator }
    out.push({
      type: p.type || 'event',
      key: p.key,
      value: p.value,
      operator: p.operator || 'exact',
    });
  };

  if (Array.isArray(input)) input.forEach(push);
  else if (input && typeof input === 'object') push(input);

  return out;
}

// Convert legacy insight.filters to a FunnelsQuery QueryNode (fallback path).
function filtersToFunnelsQuery(filters = {}) {
  const events = Array.isArray(filters.events) ? filters.events : [];

  const series = events.map((e, i) => ({
    kind: 'EventsNode',
    event: e.id || e.name,
    name: e.name || e.id || `Step ${i + 1}`,
    math: e.math || 'total',
    properties: normalizeProperties(e.properties),
  }));

  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'FunnelsQuery',
      dateRange: { date_from: filters.date_from ?? '-7d', date_to: filters.date_to ?? null },
      series,
      properties: normalizeProperties(filters.properties),
      funnelsFilter: { layout: filters.layout || 'horizontal' },
    },
  };
}

// Ensure the query node is always wrapped as { kind: 'InsightVizNode', source: { ... } }
export function normalizeQueryNode(node) {
  if (!node) throw new Error('Missing query node');
  if (node.kind === 'InsightVizNode') return node;
  if (node.kind === 'FunnelsQuery') return { kind: 'InsightVizNode', source: node };
  if (node.source && node.source.kind === 'FunnelsQuery') return node;
  throw new Error('Unsupported query node shape for PostHog Query API');
}

// Helper to extract a usable FunnelsQuery from an Insight response (list or item)
function pickInsightQuery(data) {
  const insight = Array.isArray(data?.results) ? data.results[0] : data;
  if (!insight) throw new Error('Insight not found');

  if (insight.query) {
    return normalizeQueryNode(insight.query);
  }
  if (insight.filters) {
    // Convert legacy filters to a proper FunnelsQuery node
    return normalizeQueryNode(filtersToFunnelsQuery(insight.filters));
  }
  throw new Error('Insight has neither query nor filters');
}

// Update fetchInsightQuery to first try the list endpoint (short_id supported), then item
export async function fetchInsightQuery(projectId, apiKey, shortId) {
  const base = getApiHost();
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };

  const listUrl = `${base}/api/projects/${encodeURIComponent(projectId)}/insights/?short_id=${encodeURIComponent(shortId)}&limit=1`;
  const itemUrl = `${base}/api/projects/${encodeURIComponent(projectId)}/insights/${encodeURIComponent(shortId)}`;

  // Try list endpoint
  try {
    const r = await axios.get(listUrl, { headers });
    return pickInsightQuery(r.data);
  } catch (e) {
    console.warn(`[PostHog] list-by-short_id failed for ${shortId}:`, e?.response?.status || e.message);
  }

  // Fallback to item endpoint
  try {
    const r = await axios.get(itemUrl, { headers });
    return pickInsightQuery(r.data);
  } catch (e) {
    console.error(`[PostHog] item endpoint failed for ${shortId}:`, e?.response?.status || e.message);
    throw new Error(`Failed to fetch insight ${shortId}: ${e.message}`);
  }
}
