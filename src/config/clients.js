import dotenv from 'dotenv';
dotenv.config(); // Add this line at the top

// src/config/clients.js
export const CLIENTS = [
  {
    name: 'AskMe AI',
    clientId: 'askme-ai-app',               // <-- the tenant key you register into PostHog: posthog.register({ client_id: 'askme-ai' })
    projectId: process.env.POSTHOG_PROJECT_ID || '202299', // Add fallback
    apiKey: process.env.POSTHOG_API_KEY,       // personal API key (server-side only)
    recipients: [process.env.DEFAULT_RECIPIENT || 'proservices330@gmail.com'], // Add this line
    queries: {
      traffic: {
        // PASTE your Trends "query" JSON from Debug page (Last 7 days, interval day)
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'TrendsQuery',
            series: [{ kind: 'EventsNode', event: '$pageview', name: '$pageview', math: 'dau' }],
            dateRange: { date_from: '-7d', date_to: null },
            interval: 'day',
          },
        },
      },
      funnel: {
        // PASTE your Funnels "query" JSON from Debug page (Last 7 days)
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'FunnelsQuery',
            dateRange: { date_from: '-7d', date_to: null },
            series: [
              { kind: 'EventsNode', event: '$pageview', name: 'Landing' },
              { kind: 'EventsNode', event: '$autocapture', name: 'CTA click' },
              { kind: 'EventsNode', event: '$autocapture', name: 'Form submit' },
              { kind: 'EventsNode', event: '$pageview', name: 'Success' },
            ],
            funnelsFilter: { layout: 'horizontal' },
          },
        },
      },
      retention: {
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'RetentionQuery',
            dateRange: { date_from: '-30d', date_to: null },
            retentionFilter: {
              period: 'Day',
              totalIntervals: 8,
              // use generic entity shape (not EventsNode)
              targetEntity: {
                type: 'events',
                id: '$pageview',
                name: '$pageview',
              },
              // Optional:
              // returningEntity: { type: 'events', id: '$pageview', name: '$pageview' },
            },
            // client filter is injected by code; keep clean
          },
        },
      },
      deviceMix: {
        // PASTE your device breakdown Trends "query" JSON
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'TrendsQuery',
            series: [{ kind: 'EventsNode', event: '$pageview', name: '$pageview' }],
            dateRange: { date_from: '-7d', date_to: null },
            interval: 'day',
            breakdownFilter: { // <-- was breakdown: { ... }
              breakdown_type: 'event',
              breakdown: '$device_type',
            },
          },
        },
      },
    },
  },

  // Add more clients here, only change clientId/name/recipients if needed
];
