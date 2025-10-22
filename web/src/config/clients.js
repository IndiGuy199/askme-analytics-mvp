console.log('🔴 Loading clients.js from WEB directory');

// src/config/clients.js
export const CLIENTS = [
  {
    // Make sure this matches your client id used by the web: <WeeklyAnalyticsCard clientId="askme-ai-app" />
    clientId: 'askme-ai-app',
    name: 'AskMe AI',
    projectId: 202299,
    apiKey: process.env.POSTHOG_API_KEY, // personal API key (phx_...)
    queries: {
      traffic: {
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'TrendsQuery',
            series: [{ 
              kind: 'EventsNode', 
              event: 'page_view', 
              name: 'page_view', 
              math: 'dau' 
            }],
            version: 2,
            trendsFilter: {
              display: "ActionsLineGraph",
              showLegend: false,
              showTrendLines: false,
              showMultipleYAxes: false,
              showValuesOnSeries: true,
              showAlertThresholdLines: false
            },
            interval: 'day',
          },
          full: true
        },
      },
      funnel: {
        // Keep shortId for reference, but we do NOT call Insights endpoints nor SavedInsightNode.
        shortId: 'lHXgXu0t',
        // Use the exact saved insight query (FunnelsQuery) so Query API accepts it.
        query: {
          kind: 'FunnelsQuery',
          // Remove hardcoded dateRange - will be set dynamically
          series: [
            {
              kind: 'EventsNode',
              event: '$pageview',
              name: '$pageview',
              custom_name: 'Profile Creation Start View',
              properties: [
                { key: '$current_url', type: 'event', value: 'profile-setup', operator: 'icontains' },
              ],
            },
            {
              kind: 'EventsNode',
              event: '$autocapture',
              name: '$autocapture',
              custom_name: 'Primary Area Selected',
              properties: [
                { key: 'text', type: 'element', value: 'Get Specialized Help', operator: 'icontains' },
              ],
            },
            {
              kind: 'EventsNode',
              event: '$autocapture',
              name: '$autocapture',
              custom_name: 'Personal Information Entered',
              properties: [
                { key: 'text', type: 'element', value: 'your challenges', operator: 'icontains' },
              ],
            },
            {
              kind: 'EventsNode',
              event: '$autocapture',
              name: '$autocapture',
              custom_name: 'Challenges Selected',
              properties: [
                { key: 'text', type: 'element', value: 'Terms', operator: 'icontains' },
              ],
            },
            {
              kind: 'EventsNode',
              event: '$autocapture',
              name: '$autocapture',
              custom_name: 'Consent Provided',
              properties: [
                { key: 'text', type: 'element', value: 'complete profile setup', operator: 'icontains' },
              ],
            },
            {
              kind: 'EventsNode',
              event: '$pageview',
              name: 'Pageview',
              custom_name: 'Profile Created',
              properties: [
                { key: '$current_url', type: 'event', value: '/dashboard', operator: 'icontains' },
              ],
            },
          ],
          funnelsFilter: { funnelVizType: 'steps' },
        },
      },
      lifecycle: {
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'LifecycleQuery',
            series: [
              {
                kind: 'EventsNode',
                event: 'page_view',
                name: 'page_view',
                math: 'total'
              }
            ],
            // Remove hardcoded dateRange
            properties: {
              type: 'AND',
              values: [
                {
                  type: 'AND',
                  values: [
                    {
                      key: 'client_id',
                      value: ['askme-ai-app'],
                      operator: 'exact',
                      type: 'event'
                    }
                  ]
                }
              ]
            }
          }
        }
      },
      retention: {
        query: {
          kind: "InsightVizNode",
          source: {
            kind: "RetentionQuery",
            version: 2,
            // Remove hardcoded dateRange - will be set dynamically
            retentionFilter: {
              period: "Day",
              display: "ActionsBar",
              targetEntity: {
                id: "$pageview", // Changed from "page_view" to "$pageview"
                name: "$pageview", // Changed from "page_view" to "$pageview"
                type: "events",
                uuid: "482804e9-eab8-4fc9-bfa5-501f9612137a", // Use the UUID from PostHog UI
                order: 0,
                properties: [
                  {
                    key: "client_id",
                    type: "event",
                    value: [
                      "askme-ai-app"
                    ],
                    operator: "exact"
                  }
                ]
              },
              retentionType: "retention_first_time",
              totalIntervals: 8, // Keep at 8 as specified
              returningEntity: {
                id: "$pageview", // Changed from "page_view" to "$pageview"
                name: "$pageview", // Changed from "page_view" to "$pageview"
                type: "events"
                // Removed order, uuid, and properties - not needed for returningEntity
              },
              meanRetentionCalculation: "simple"
            }
          },
          full: true
        },
      },
      deviceMix: {
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'TrendsQuery',
            series: [{ kind: 'EventsNode', event: 'page_view', name: 'page_view' }],
            // Remove this hardcoded dateRange
            // dateRange: { date_from: '-7d', date_to: null }, 
            interval: 'day',
            breakdownFilter: {
              breakdown_type: 'event',
              breakdown: '$device_type',
            },
          },
        },
      },
      geography: {
        query: {
          kind: "InsightVizNode",
          source: {
            kind: "TrendsQuery",
            breakdownFilter: {
              breakdown: "$geoip_country_code",
              breakdown_type: "event"
            },
            // Remove this hardcoded dateRange
            // dateRange: {
            //   date_from: "-7d",
            //   date_to: null
            // },
            series: [
              {
                event: "page_view",
                name: "page_view",
                kind: "EventsNode",
                math: "dau"
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
                      value: [
                        "askme-ai-app"
                      ],
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
        }
      },
      cityGeography: {
        query: {
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
            // Remove this hardcoded dateRange
            // dateRange: {
            //   date_from: "-7d",
            //   date_to: null
            // },
            series: [
              {
                event: "page_view",
                name: "page_view",
                kind: "EventsNode",
                math: "dau"
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
                      value: [
                        "askme-ai-app"
                      ],
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
        }
      },
    },
  },
  {
    clientId: 'ask-me-ltp', // This matches posthog_client_id in your database
    name: 'AskMe LTP',
    // Note: No projectId/apiKey needed - these come from database
    queries: {
      traffic: {
        query: {
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
                    value: ['ask-me-ltp'],
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
                    value: ['ask-me-ltp'],
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
            interval: 'day',
            // Note: dateRange will be injected dynamically by createQueryWithDateRange
          },
          full: true
        },
      },
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
            // ❌ Remove hardcoded dateRange - will be set dynamically
            // dateRange: {
            //   date_to: null,
            //   date_from: "-30d",
            //   explicitDate: false
            // },
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
      lifecycle: {
        query: {
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
                      value: ['ask-me-ltp'], // Changed to match new client
                      operator: 'exact',
                      type: 'event'
                    }
                  ]
                }
              ]
            }
          }
        }
      },
      dailyRetention: {
        query: {
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
                uuid: "b5f8d90b-57b9-461e-a45b-fad92e74cf25",
                order: 0,
                properties: [
                  {
                    key: "client_id",
                    type: "event",
                    value: ["ask-me-ltp"],
                    operator: "exact"
                  }
                ]
              },
              retentionType: "retention_first_time",
              totalIntervals: 8,
              returningEntity: {
                id: "$pageview",
                name: "$pageview",
                type: "events",
                order: 0,
                uuid: "16c73964-648a-4ed6-baea-b49be2dc55ae",
                properties: [
                  {
                    key: "client_id",
                    value: ["ask-me-ltp"],
                    operator: "exact",
                    type: "event"
                  }
                ]
              },
              meanRetentionCalculation: "simple",
              showTrendLines: false,
              cumulative: false  // Daily retention
            }
          },
          full: true
        }
      },
      cumulativeRetention: {
        query: {
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
                uuid: "b5f8d90b-57b9-461e-a45b-fad92e74cf25",
                order: 0,
                properties: [
                  {
                    key: "client_id",
                    type: "event",
                    value: ["ask-me-ltp"],
                    operator: "exact"
                  }
                ]
              },
              retentionType: "retention_first_time",
              totalIntervals: 8,
              returningEntity: {
                id: "$pageview",
                name: "$pageview",
                type: "events",
                order: 0,
                uuid: "16c73964-648a-4ed6-baea-b49be2dc55ae",
                properties: [
                  {
                    key: "client_id",
                    value: ["ask-me-ltp"],
                    operator: "exact",
                    type: "event"
                  }
                ]
              },
              meanRetentionCalculation: "simple",
              showTrendLines: false,
              cumulative: true  // Cumulative retention
            }
          },
          full: true
        }
      },
      deviceMix: {
        query: {
          kind: 'InsightVizNode',
          source: {
            kind: 'TrendsQuery',
            series: [{ kind: 'EventsNode', event: 'page_view', name: 'page_view' }],
            interval: 'day',
            breakdownFilter: {
              breakdown_type: 'event',
              breakdown: '$device_type',
            },
            properties: {
              type: 'AND',
              values: [
                {
                  type: 'AND',
                  values: [
                    {
                      key: 'client_id',
                      value: ['ask-me-ltp'], // Changed to match new client
                      operator: 'exact',
                      type: 'event'
                    }
                  ]
                }
              ]
            }
          },
        },
      },
      geography: {
        query: {
          kind: "InsightVizNode",
          source: {
            kind: "TrendsQuery",
            breakdownFilter: {
              breakdown: "$geoip_country_code",
              breakdown_type: "event"
            },
            series: [
              {
                event: "page_view",
                name: "page_view",
                kind: "EventsNode",
                math: "dau"
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
                      value: [
                        "ask-me-ltp" // Changed to match new client
                      ],
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
        }
      },
      cityGeography: {
        query: {
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
                event: "page_view",
                name: "page_view",
                kind: "EventsNode",
                math: "dau"
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
                      value: [
                        "ask-me-ltp" // Changed to match new client
                      ],
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
        }
      },
      // Session count query - using Web Analytics
      // Sessions query - count unique sessions
      sessions: {
        query: {
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
                    value: ["ask-me-ltp"],
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
        }
      },
      // Session duration query - average session duration
      sessionDuration: {
        query: {
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
                    value: ["ask-me-ltp"],
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
        }
      },
      // Bounce rate query - accurate calculation using HogQL
      // Query sessions table directly to count sessions with exactly 1 pageview
      // Formula: (sessions with event_count = 1) / (total sessions) × 100
      bounceRate: {
        query: {
          kind: "HogQLQuery",
          query: `
            WITH base AS (
              SELECT
                $session_id as session_id,
                count(*) as pageview_count
              FROM events
              WHERE 
                event = '$pageview'
                AND properties.client_id = 'ask-me-ltp'
                AND timestamp >= now() - INTERVAL 30 DAY
              GROUP BY $session_id
            )
            SELECT
              round(100.0 * sumIf(1, pageview_count = 1) / count(), 2) AS bounce_rate
            FROM base
          `
        }
      },
      // Top Pages - breakdown by URL to show most visited pages
      topPages: {
        query: {
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
                    value: ["ask-me-ltp"],
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
        }
      },
      // Referring Domains - shows where traffic is coming from
      referringDomains: {
        query: {
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
                    value: ["ask-me-ltp"],
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
        }
      }
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

export const getClientConfig = (clientId) => {
  return CLIENTS.find(client => client.clientId === clientId);
};
