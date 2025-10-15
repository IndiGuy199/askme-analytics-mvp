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
            series: [{ 
              kind: 'EventsNode', 
              event: 'page_view', // Make sure this matches your PostHog events
              name: 'page_view',
              math: 'dau',
              properties: [
                {
                  key: 'client_id',
                  value: ['ask-me-ltp'],
                  operator: 'exact',
                  type: 'event'
                }
              ]
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
            // Note: dateRange will be injected dynamically by createQueryWithDateRange
          },
          full: true
        },
      },
      funnel: {
        query: {
          kind: 'FunnelsQuery',
          series: [
            {
              kind: "EventsNode",
              name: "All events",
              event: null,
              properties: [
                {
                  key: "$current_url",
                  type: "event",
                  value: "/app/profile/createProfile",
                  operator: "icontains"
                },
                {
                  key: "client_id",
                  type: "event",
                  value: [
                    "ask-me-ltp"
                  ],
                  operator: "exact"
                }
              ],
              custom_name: "Profile Creation Start View"
            },
            {
              kind: "EventsNode",
              name: "All events",
              event: null,
              properties: [
                {
                  key: "$event_type",
                  type: "event",
                  value: [
                    "submit"
                  ],
                  operator: "exact"
                },
                {
                  key: "selector",
                  type: "element",
                  value: [
                    "#membershipProfile"
                  ],
                  operator: "exact"
                }
              ],
              custom_name: "Step 1 completed"
            },
            {
              kind: "EventsNode",
              name: "All events",
              event: null,
              properties: [
                {
                  key: "$event_type",
                  type: "event",
                  value: [
                    "submit"
                  ],
                  operator: "exact"
                },
                {
                  key: "selector",
                  type: "element",
                  value: [
                    "#contactForm"
                  ],
                  operator: "exact"
                }
              ],
              custom_name: "Step 2 Completed"
            },
            {
              kind: "EventsNode",
              name: "All events",
              event: null,
              properties: [
                {
                  key: "$event_type",
                  type: "event",
                  value: [
                    "submit"
                  ],
                  operator: "exact"
                },
                {
                  key: "selector",
                  type: "element",
                  value: [
                    "#createProfileStep3Form"
                  ],
                  operator: "exact"
                }
              ],
              custom_name: "Security Q&A Completed"
            },
            {
              kind: "EventsNode",
              name: "$autocapture",
              event: "$autocapture",
              properties: [
                {
                  key: "text",
                  type: "element",
                  value: "I CONSENT",
                  operator: "icontains"
                }
              ],
              custom_name: "Consent Provided"
            },
            {
              kind: "EventsNode",
              name: "All events",
              event: null,
              properties: [
                {
                  key: "$current_url",
                  type: "event",
                  value: "/auth/dashboard",
                  operator: "icontains"
                }
              ],
              custom_name: "Profile Completed"
            }
          ],
          interval: "hour",
          funnelsFilter: {
            layout: "vertical",
            funnelVizType: "steps"
          }
        },
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
      retention: {
        query: {
          kind: "InsightVizNode",
          source: {
            kind: "RetentionQuery",
            version: 2,
            retentionFilter: {
              period: "Day",
              display: "ActionsBar",
              targetEntity: {
                id: "$pageview",
                name: "$pageview",
                type: "events",
                uuid: "779247c6-6328-4977-9bd7-94fd4cf47546",
                order: 0,
                properties: [
                  {
                    key: "client_id",
                    type: "event",
                    value: [
                      "ask-me-ltp" // Changed to match new client
                    ],
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
    },
  }

  // Add more clients here, only change clientId/name/recipients if needed
];

const createQueryWithDateRange = (baseQuery, dateRange, enableComparison = false) => {
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
  }
  
  return query;
};
