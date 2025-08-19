// src/config/posthog.js
// Use the private API host by default (US Cloud). Override via POSTHOG_HOST for EU/self-hosted.
export const POSTHOG_HOST =
  (process.env.POSTHOG_HOST && process.env.POSTHOG_HOST.replace(/\/$/, '')) ||
  'https://us.posthog.com'; // For EU use https://eu.posthog.com

// Map ingestion hosts (e.g. us.i.posthog.com) to API hosts (us.posthog.com)
export function getApiHost() {
  try {
    const u = new URL(POSTHOG_HOST);
    const host = u.host.endsWith('.i.posthog.com') ? u.host.replace('.i.posthog.com', '.posthog.com') : u.host;
    return `${u.protocol}//${host}`;
  } catch {
    return 'https://us.posthog.com';
  }
}

export function buildQueryApiUrl(projectId) {
  return `${getApiHost()}/api/projects/${encodeURIComponent(projectId)}/query`;
}

// Merge a PostHog property filter into an array of filters
function mergePropFilter(existing = [], filter) {
  const arr = Array.isArray(existing) ? existing.slice() : [];
  arr.push(filter);
  return arr;
}

// Inject a property filter client_id == clientId into supported queries
export function injectClientFilter(insightNode, clientId) {
  try {
    const q = JSON.parse(JSON.stringify(insightNode)); // deep clone
    const src = q?.source || q?.query?.source || q;

    const propFilter = {
      type: 'event',
      key: 'client_id',
      value: clientId,            // use string to match UI/exported insights
      operator: 'exact',
    };

    if (src) {
      src.properties = mergePropFilter(src.properties, propFilter);
    }

    if (src?.kind === 'FunnelsQuery' && Array.isArray(src.series)) {
      src.series = src.series.map((s) =>
        s?.kind === 'EventsNode' ? { ...s, properties: mergePropFilter(s.properties, propFilter) } : s
      );
    }

    if (q.source) q.source = src;
    else if (q.query?.source) q.query.source = src;

    return q;
  } catch {
    return insightNode;
  }
}
