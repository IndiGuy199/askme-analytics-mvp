/**
 * Query Templates - Reusable PostHog query configurations
 * These templates are used across all clients with dynamic client_id injection
 * 
 * @module queryTemplates
 */

console.log('🔵 Loading queryTemplates.js');

/**
 * Query template functions that inject client_id dynamically
 */
export const QUERY_TEMPLATES = {
  /**
   * Traffic query - unique visitors and pageviews
   * @param {string} clientId - The client identifier
   */
  traffic: (clientId) => ({
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        { 
          kind: 'EventsNode', 
          event: '$pageview',
          name: '$pageview',
          custom_name: 'Unique visitors',
          math: 'dau',
          properties: [
            {
              key: 'client_id',
              value: [clientId],
              operator: 'exact',
              type: 'event'
            }
          ]
        },
        { 
          kind: 'EventsNode', 
          event: '$pageview',
          name: '$pageview',
          custom_name: 'Page views',
          math: 'total',
          properties: [
            {
              key: 'client_id',
              value: [clientId],
              operator: 'exact',
              type: 'event'
            }
          ]
        }
      ],
      version: 2,
      trendsFilter: {
        display: "ActionsLineGraph",
        showLegend: false,
        showTrendLines: false,
        showMultipleYAxes: false,
        showValuesOnSeries: true,
        showAlertThresholdLines: false
      },
      interval: 'day'
    },
    full: true
  }),

  /**
   * Lifecycle query - user activity patterns
   * @param {string} clientId - The client identifier
   */
  lifecycle: (clientId) => ({
    kind: 'InsightVizNode',
    source: {
      kind: 'LifecycleQuery',
      series: [
        {
          kind: 'EventsNode',
          event: "$pageview",
          name: "$pageview",
          math: 'total'
        }
      ],
      properties: {
        type: 'AND',
        values: [
          {
            type: 'AND',
            values: [
              {
                key: 'client_id',
                value: [clientId],
                operator: 'exact',
                type: 'event'
              }
            ]
          }
        ]
      }
    }
  }),

  /**
   * Daily Retention query
   * @param {string} clientId - The client identifier
   */
  dailyRetention: (clientId) => ({
    kind: "InsightVizNode",
    source: {
      kind: "RetentionQuery",
      version: 2,
      retentionFilter: {
        period: "Day",
        display: "ActionsLineGraph",
        targetEntity: {
          id: "$pageview",
          name: "$pageview",
          type: "events",
          order: 0,
          properties: [
            {
              key: "client_id",
              type: "event",
              value: [clientId],
              operator: "exact"
            }
          ]
        },
        retentionType: "retention_first_time",
        totalIntervals: 8,
        returningEntity: {
          id: "$pageview",
          name: "$pageview",
          type: "events"
        },
        meanRetentionCalculation: "simple",
        showTrendLines: false,
        cumulative: false
      }
    },
    full: true
  }),

  /**
   * Cumulative Retention query
   * @param {string} clientId - The client identifier
   */
  cumulativeRetention: (clientId) => ({
    kind: "InsightVizNode",
    source: {
      kind: "RetentionQuery",
      version: 2,
      retentionFilter: {
        period: "Day",
        display: "ActionsLineGraph",
        targetEntity: {
          id: "$pageview",
          name: "$pageview",
          type: "events",
          order: 0,
          properties: [
            {
              key: "client_id",
              type: "event",
              value: [clientId],
              operator: "exact"
            }
          ]
        },
        retentionType: "retention_first_time",
        totalIntervals: 8,
        returningEntity: {
          id: "$pageview",
          name: "$pageview",
          type: "events"
        },
        meanRetentionCalculation: "simple",
        showTrendLines: false,
        cumulative: true
      }
    },
    full: true
  }),

  /**
   * Device Mix query - breakdown by device type
   * @param {string} clientId - The client identifier
   */
  deviceMix: (clientId) => ({
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        {
          kind: 'EventsNode',
          math: 'dau',
          name: '$pageview',
          event: '$pageview',
          properties: [
            {
              key: 'client_id',
              value: [clientId],
              operator: 'exact',
              type: 'event'
            }
          ]
        }
      ],
      version: 2,
      interval: 'day',
      properties: [],
      trendsFilter: {
        display: 'ActionsPie',
        showLegend: false,
        yAxisScaleType: 'linear',
        showValuesOnSeries: true,
        smoothingIntervals: 1,
        showPercentStackView: false,
        aggregationAxisFormat: 'numeric',
        showAlertThresholdLines: false
      },
      breakdownFilter: {
        breakdown: '$device_type',
        breakdown_type: 'event'
      },
      filterTestAccounts: true
    },
    full: true
  }),

  /**
   * Geography query - world map by country
   * @param {string} clientId - The client identifier
   */
  geography: (clientId) => ({
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      breakdownFilter: {
        breakdown: "$geoip_country_code",
        breakdown_type: "event"
      },
      series: [
        {
          event: "$pageview",
          name: "$pageview",
          kind: "EventsNode",
          math: "dau",
          properties: [
            {
              key: "client_id",
              value: [clientId],
              operator: "exact",
              type: "event"
            }
          ]
        }
      ],
      trendsFilter: {
        display: "WorldMap"
      },
      conversionGoal: null,
      filterTestAccounts: false,
      properties: {
        type: "AND",
        values: [
          {
            type: "AND",
            values: [
              {
                key: "client_id",
                value: [clientId],
                operator: "exact",
                type: "event"
              }
            ]
          }
        ]
      },
      tags: {
        productKey: "web_analytics"
      },
      version: 2
    },
    full: true
  }),

  /**
   * City Geography query - breakdown by city
   * @param {string} clientId - The client identifier
   */
  cityGeography: (clientId) => ({
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      breakdownFilter: {
        breakdowns: [
          {
            property: "$geoip_country_code",
            type: "event"
          },
          {
            property: "$geoip_city_name",
            type: "event"
          }
        ]
      },
      series: [
        {
          event: "$pageview",
          name: "$pageview",
          kind: "EventsNode",
          math: "dau",
          properties: [
            {
              key: "client_id",
              value: [clientId],
              operator: "exact",
              type: "event"
            }
          ]
        }
      ],
      trendsFilter: {
        display: "ActionsTable"
      },
      conversionGoal: null,
      filterTestAccounts: false,
      properties: {
        type: "AND",
        values: [
          {
            type: "AND",
            values: [
              {
                key: "client_id",
                value: [clientId],
                operator: "exact",
                type: "event"
              }
            ]
          }
        ]
      },
      tags: {
        productKey: "web_analytics"
      },
      version: 2
    },
    full: true
  }),

  /**
   * Session Count query
   * @param {string} clientId - The client identifier
   */
  sessions: (clientId) => ({
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "$pageview",
          name: "$pageview",
          properties: [
            {
              key: "client_id",
              value: [clientId],
              operator: "exact",
              type: "event"
            }
          ],
          math: "unique_session"
        }
      ],
      trendsFilter: {
        display: "BoldNumber"
      },
      interval: "day"
    },
    full: true
  }),

  /**
   * Session Duration query - average session length
   * @param {string} clientId - The client identifier
   */
  sessionDuration: (clientId) => ({
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "$pageview",
          name: "$pageview",
          properties: [
            {
              key: "client_id",
              value: [clientId],
              operator: "exact",
              type: "event"
            }
          ],
          math: "avg",
          math_property: "$session_duration",
          math_property_type: "session_properties"
        }
      ],
      trendsFilter: {
        display: "BoldNumber"
      },
      interval: "day"
    },
    full: true
  }),

  /**
   * Bounce Rate query - HogQL calculation
   * @param {string} clientId - The client identifier
   */
  bounceRate: (clientId) => ({
    kind: "HogQLQuery",
    query: `
      WITH base AS (
        SELECT
          $session_id as session_id,
          count(*) as pageview_count
        FROM events
        WHERE 
          event = '$pageview'
          AND properties.client_id = '${clientId}'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY $session_id
      )
      SELECT
        round(100.0 * sumIf(1, pageview_count = 1) / count(), 2) AS bounce_rate
      FROM base
    `
  }),

  /**
   * Top Pages query - most visited pages
   * @param {string} clientId - The client identifier
   */
  topPages: (clientId) => ({
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "$pageview",
          name: "$pageview",
          properties: [
            {
              key: "client_id",
              value: [clientId],
              operator: "exact",
              type: "event"
            }
          ],
          math: "unique_session"
        }
      ],
      properties: {
        type: "AND",
        values: [
          {
            type: "AND",
            values: [
              {
                key: "$current_url",
                type: "event",
                value: "?",
                operator: "not_icontains"
              }
            ]
          }
        ]
      },
      trendsFilter: {
        display: "ActionsBarValue",
        showLegend: false,
        yAxisScaleType: "linear",
        showValuesOnSeries: false,
        smoothingIntervals: 1,
        showPercentStackView: false,
        aggregationAxisFormat: "numeric",
        showAlertThresholdLines: false
      },
      breakdownFilter: {
        breakdowns: [
          {
            property: "$current_url",
            type: "event"
          }
        ]
      },
      interval: "day",
      filterTestAccounts: false
    },
    full: true
  }),

  /**
   * Referring Domains query - traffic sources
   * @param {string} clientId - The client identifier
   */
  referringDomains: (clientId) => ({
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "$pageview",
          name: "$pageview",
          properties: [
            {
              key: "client_id",
              value: [clientId],
              operator: "exact",
              type: "event"
            }
          ],
          math: "unique_session"
        }
      ],
      trendsFilter: {
        display: "ActionsPie",
        showLegend: false,
        yAxisScaleType: "linear",
        showValuesOnSeries: false,
        smoothingIntervals: 1,
        showPercentStackView: false,
        aggregationAxisFormat: "numeric",
        showAlertThresholdLines: false
      },
      breakdownFilter: {
        breakdown: "$referring_domain",
        breakdown_type: "event"
      },
      interval: "day",
      filterTestAccounts: true
    },
    full: true
  })
};

/**
 * Generate all standard queries for a client
 * This creates a complete set of analytics queries with the client_id injected
 * 
 * @param {string} clientId - The client identifier (e.g., 'ask-me-ltp')
 * @returns {object} Object containing all standard query configurations
 * 
 * @example
 * const queries = generateStandardQueries('ask-me-ltp');
 * // Returns: { traffic: { query: {...} }, lifecycle: { query: {...} }, ... }
 */
export function generateStandardQueries(clientId) {
  console.log(`📊 Generating standard queries for client: ${clientId}`);
  
  return {
    traffic: { query: QUERY_TEMPLATES.traffic(clientId) },
    lifecycle: { query: QUERY_TEMPLATES.lifecycle(clientId) },
    dailyRetention: { query: QUERY_TEMPLATES.dailyRetention(clientId) },
    cumulativeRetention: { query: QUERY_TEMPLATES.cumulativeRetention(clientId) },
    deviceMix: { query: QUERY_TEMPLATES.deviceMix(clientId) },
    geography: { query: QUERY_TEMPLATES.geography(clientId) },
    cityGeography: { query: QUERY_TEMPLATES.cityGeography(clientId) },
    sessions: { query: QUERY_TEMPLATES.sessions(clientId) },
    sessionDuration: { query: QUERY_TEMPLATES.sessionDuration(clientId) },
    bounceRate: { query: QUERY_TEMPLATES.bounceRate(clientId) },
    topPages: { query: QUERY_TEMPLATES.topPages(clientId) },
    referringDomains: { query: QUERY_TEMPLATES.referringDomains(clientId) }
  };
}

/**
 * Get a specific query template for a client
 * 
 * @param {string} queryType - The type of query (e.g., 'traffic', 'lifecycle')
 * @param {string} clientId - The client identifier
 * @returns {object} Query configuration object
 * 
 * @example
 * const trafficQuery = getQueryTemplate('traffic', 'ask-me-ltp');
 */
export function getQueryTemplate(queryType, clientId) {
  const templateFn = QUERY_TEMPLATES[queryType];
  
  if (!templateFn) {
    console.warn(`⚠️ Unknown query type: ${queryType}`);
    return null;
  }
  
  return { query: templateFn(clientId) };
}

console.log('✅ Query templates loaded successfully');
