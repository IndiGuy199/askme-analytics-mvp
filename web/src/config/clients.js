console.log('🔴 Loading clients.js from WEB directory');

// Import query templates
import { generateStandardQueries } from './queryTemplates.js';

/**
 * CLIENTS configuration array
 * 
 * ⚠️ OPTIONAL: Only add clients here if they need:
 *   - Custom funnel queries (beyond standard metrics)
 *   - Specific project IDs or API keys
 *   - Custom names or settings
 * 
 * ✅ AUTOMATIC: Clients NOT listed here will automatically get:
 *   - All standard queries (traffic, lifecycle, retention, device mix, geography, etc.)
 *   - Dynamic client_id filtering
 *   - No configuration needed!
 * 
 * To use standard queries for any client, simply call:
 *   <SimpleAnalyticsCard clientId="your-client-id" />
 * 
 * The system will automatically generate standard queries via generateStandardQueries()
 */
export const CLIENTS = [
  {
    // Make sure this matches your client id used by the web: <WeeklyAnalyticsCard clientId="askme-ai-app" />
    clientId: 'askme-ai-app',
    name: 'AskMe AI',
    projectId: 202299,
    apiKey: process.env.POSTHOG_API_KEY, // personal API key (phx_...)
    queries: {
      // ✅ Use standard query templates (traffic, lifecycle, retention, deviceMix, geography, etc.)
      ...generateStandardQueries('askme-ai-app')
    },
  },
  {
    clientId: 'ask-me-ltp', // This matches posthog_client_id in your database
    name: 'AskMe LTP',
    // Note: No projectId/apiKey needed - these come from database
    queries: {
      // ✅ Use standard query templates (traffic, lifecycle, retention, deviceMix, geography, etc.)
      ...generateStandardQueries('ask-me-ltp'),
      
      // ✅ Keep client-specific funnel queries
      profileFunnel: {
        // ✅ UPDATED: Actions-based funnel query from PostHog
        query: {
          kind: "InsightVizNode",
          source: {
            kind: "FunnelsQuery",
            series: [
              {
                kind: "ActionsNode",
                id: "205944",
                name: "ONBOARDING_STARTED",
                custom_name: "Profile Creation Start View New",
                properties: [
                  {
                    key: "client_id",
                    value: ["ask-me-ltp"],
                    operator: "exact",
                    type: "event"
                  }
                ]
              },
              {
                kind: "ActionsNode",
                id: "206352",
                name: "ONBOARDING_STEP1_COMPLETED",
                custom_name: "Step 1 completed"
              },
              {
                kind: "ActionsNode",
                id: "206353",
                name: "ONBOARDING_STEP2_COMPLETED",
                custom_name: "Step 2 Completed"
              },
              {
                kind: "ActionsNode",
                id: "208791",
                name: "ONBOARDING_STEP3_COMPLETED",
                custom_name: "Security Q&A Completed"
              },
              {
                kind: "ActionsNode",
                id: "209319",
                name: "CONSENT_PROVIDED",
                custom_name: "Consent Provided"
              },
              {
                kind: "ActionsNode",
                id: "206354",
                name: "SIGNUP_COMPLETED",
                custom_name: "Profile Completed"
              }
            ],
            interval: "day",
            funnelsFilter: {
              layout: "vertical",
              funnelVizType: "steps"
            }
          },
          full: true
        }
      },
      renewalFunnel: {
        query: {
          kind: "InsightVizNode",
          source: {
            kind: "FunnelsQuery",
            series: [
              {
                kind: "ActionsNode",
                id: "206367",
                name: "RENEWAL_STARTED",
                properties: [
                  {
                    key: "client_id",
                    type: "event",
                    value: [
                      "ask-me-ltp"
                    ],
                    operator: "exact"
                  }
                ]
              },
              {
                kind: "ActionsNode",
                id: "206358",
                name: "PRODUCT_SELECTED"
              },
              {
                kind: "ActionsNode",
                id: "206363",
                name: "CHECKOUT_VIEWED"
              },
              {
                kind: "ActionsNode",
                id: "206375",
                name: "CHECKOUT_SUBMITTED"
              },
              {
                kind: "ActionsNode",
                id: "206365",
                name: "RENEWAL_COMPLETED"
              }
            ],
            funnelsFilter: {
              funnelVizType: "steps",
              layout: "horizontal"
            },
            interval: "day",
            breakdownFilter: {}
          },
          full: true
        },
      },
    },
  }

  // Add more clients here, only change clientId/name/recipients if needed
];

export const createQueryWithDateRange = (baseQuery, dateRange, enableComparison = false) => {
  const query = JSON.parse(JSON.stringify(baseQuery));
  
  if (query.kind === 'InsightVizNode' && query.source) {
    query.source.dateRange = dateRange;
    
    // Add compare filter if comparison is enabled
    if (enableComparison) {
      query.source.compareFilter = {
        compare: true
      };
    }
  } else if (query.kind === 'FunnelsQuery') {
    // Handle FunnelsQuery type by adding dateRange directly to the query
    query.dateRange = dateRange;
  } else if (query.kind === 'HogQLQuery') {
    // HogQL queries have date ranges directly in the SQL WHERE clause
    // No need to modify, just return as-is
    return query;
  }
  
  return query;
};

/**
 * Check if a client has custom queries beyond standard ones
 * @param {string} clientId - The client identifier
 * @returns {boolean} True if client has custom queries configured
 */
export const hasCustomQueries = (clientId) => {
  const client = CLIENTS.find(c => c.clientId === clientId);
  if (!client) return false;
  
  const standardQueryKeys = Object.keys(generateStandardQueries(clientId));
  const clientQueryKeys = Object.keys(client.queries);
  
  // Check if client has any queries beyond standard ones
  return clientQueryKeys.some(key => !standardQueryKeys.includes(key));
};

/**
 * Get client configuration
 * If client is not explicitly configured, returns a default config with standard queries
 * This allows clients to use standard metrics without explicit configuration in clients.js
 * 
 * @param {string} clientId - The client identifier
 * @returns {Object} Client configuration with queries
 * 
 * @example
 * // Client explicitly configured in CLIENTS array
 * const config = getClientConfig('ask-me-ltp'); // Returns custom config
 * 
 * @example
 * // Client not configured - gets standard queries automatically
 * const config = getClientConfig('new-client-id'); // Returns default config with standard queries
 */
export const getClientConfig = (clientId) => {
  // Try to find explicitly configured client
  const configuredClient = CLIENTS.find(client => client.clientId === clientId);
  
  if (configuredClient) {
    return configuredClient;
  }
  
  // Return default configuration with standard queries for unconfigured clients
  console.log(`📋 Client '${clientId}' not explicitly configured, using standard queries`);
  return {
    clientId: clientId,
    name: clientId, // Use clientId as name by default
    queries: {
      ...generateStandardQueries(clientId)
    }
  };
};
