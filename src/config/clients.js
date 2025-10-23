//import dotenv from 'dotenv';
//dotenv.config(); // Add this line at the top
console.log('🔴 Loading clients.js from WEB directory');

// src/config/clients.js
export const CLIENTS = [
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
