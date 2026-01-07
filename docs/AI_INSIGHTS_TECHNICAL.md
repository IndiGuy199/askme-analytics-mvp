# AI Insights - Technical Details

## KPIs Sent to OpenAI

When generating AI insights, the following comprehensive KPI data is sent to OpenAI's GPT-4o-mini:

### 1. Traffic Data
```typescript
traffic: {
  unique_users: number;      // Total unique visitors
  pageviews: number;         // Total page views
  series?: number[];         // Daily traffic time series [day1, day2, ...]
}
```

**Example:**
```json
{
  "unique_users": 1250,
  "pageviews": 3450,
  "series": [120, 145, 132, 189, 156, 178, 165]
}
```

### 2. Conversion Funnel Data
```typescript
funnel: {
  steps: Array<{
    name: string;            // Step name (e.g., "Profile Creation")
    count: number;           // Users who completed this step
  }>;
  conversion_rate: number;   // Overall conversion rate (0-1)
  median_time_to_convert_sec: number;  // Time to complete funnel
  top_drop?: {
    from: string;            // Step where drop-off starts
    to: string;              // Next step
    dropRate: number;        // % of users who dropped (0-1)
  };
}
```

**Example:**
```json
{
  "steps": [
    { "name": "Landing Page", "count": 1000 },
    { "name": "Sign Up Started", "count": 450 },
    { "name": "Email Verified", "count": 320 },
    { "name": "Trial Started", "count": 280 }
  ],
  "conversion_rate": 0.28,
  "median_time_to_convert_sec": 180,
  "top_drop": {
    "from": "Sign Up Started",
    "to": "Email Verified",
    "dropRate": 0.29
  }
}
```

### 3. User Lifecycle Data
```typescript
lifecycle: {
  series: {
    new: number[];           // New users per day
    returning: number[];     // Returning users per day
    resurrecting: number[];  // Reactivated users per day
    dormant: number[];       // Inactive users per day
  };
}
```

**Example:**
```json
{
  "series": {
    "new": [45, 52, 48, 61, 54, 58, 50],
    "returning": [72, 85, 91, 98, 102, 95, 88],
    "resurrecting": [8, 12, 10, 15, 11, 13, 9],
    "dormant": [15, 18, 12, 20, 16, 14, 17]
  }
}
```

### 4. Device Mix Data
```typescript
device: {
  device_mix: {
    [device: string]: number;  // Device type -> percentage (0-1)
  };
}
```

**Example:**
```json
{
  "device_mix": {
    "desktop": 0.42,
    "mobile": 0.53,
    "tablet": 0.05
  }
}
```

### 5. Retention Data
```typescript
retention: {
  d7_retention: number;      // Day 7 retention rate (0-1)
  values: Array<{
    day: number;             // Day number (0-7+)
    percentage: number;      // Retention % for that day
  }>;
}
```

**Example:**
```json
{
  "d7_retention": 0.24,
  "values": [
    { "day": 0, "percentage": 100 },
    { "day": 1, "percentage": 68 },
    { "day": 2, "percentage": 45 },
    { "day": 3, "percentage": 35 },
    { "day": 4, "percentage": 30 },
    { "day": 5, "percentage": 27 },
    { "day": 6, "percentage": 25 },
    { "day": 7, "percentage": 24 }
  ]
}
```

### 6. Geography Data
```typescript
geography: {
  countries: {
    [countryCode: string]: number;  // Country code -> user count
  };
}
```

**Example:**
```json
{
  "countries": {
    "US": 650,
    "GB": 180,
    "CA": 120,
    "DE": 95,
    "FR": 75,
    "AU": 60
  }
}
```

---

## Complete Example KPI Payload

Here's a full example of what gets sent to OpenAI:

```json
{
  "traffic": {
    "unique_users": 1250,
    "pageviews": 3450,
    "series": [420, 485, 512, 489, 556, 478, 510]
  },
  "funnel": {
    "steps": [
      { "name": "Landing Page Visit", "count": 1000 },
      { "name": "Sign Up Started", "count": 450 },
      { "name": "Email Verified", "count": 320 },
      { "name": "Trial Started", "count": 280 },
      { "name": "First Action", "count": 185 }
    ],
    "conversion_rate": 0.185,
    "median_time_to_convert_sec": 240,
    "top_drop": {
      "from": "Email Verified",
      "to": "Trial Started",
      "dropRate": 0.125
    }
  },
  "lifecycle": {
    "series": {
      "new": [45, 52, 48, 61, 54, 58, 50],
      "returning": [72, 85, 91, 98, 102, 95, 88],
      "resurrecting": [8, 12, 10, 15, 11, 13, 9],
      "dormant": [15, 18, 12, 20, 16, 14, 17]
    }
  },
  "device": {
    "device_mix": {
      "desktop": 0.42,
      "mobile": 0.53,
      "tablet": 0.05
    }
  },
  "retention": {
    "d7_retention": 0.24,
    "values": [
      { "day": 0, "percentage": 100 },
      { "day": 1, "percentage": 68 },
      { "day": 2, "percentage": 45 },
      { "day": 3, "percentage": 35 },
      { "day": 4, "percentage": 30 },
      { "day": 5, "percentage": 27 },
      { "day": 6, "percentage": 25 },
      { "day": 7, "percentage": 24 }
    ]
  },
  "geography": {
    "countries": {
      "US": 650,
      "GB": 180,
      "CA": 120,
      "DE": 95,
      "FR": 75
    }
  }
}
```

---

## Complete OpenAI Prompt

Here's the exact prompt sent to GPT-4o-mini:

```
You are an analytics consultant. Analyze these KPIs and provide actionable insights as STRICT JSON:
{
  "headline": string,                       // 1 sentence summary with key metric
  "highlights": string[3],                  // 3 bullets with specific numbers and comparisons
  "bottleneck": string,                     // Biggest conversion issue with percentage
  "actions": string[3]                      // 3 specific, actionable recommendations
}

Focus on:
- Conversion rate issues (target >5%)
- Retention problems (target >20% D7)
- Traffic quality and device mix
- Specific funnel drop-off points

Industry benchmarks:
- SaaS conversion: 3-5%
- App D7 retention: 20-25%
- Mobile vs desktop usage patterns

KPIs JSON:
${JSON.stringify(kpis, null, 2)}

Provide specific, actionable insights with numbers.
```

### Prompt Parameters

- **Temperature**: 0.3 (lower = more consistent, focused responses)
- **Model**: gpt-4o-mini (cost-effective, fast)
- **Response Format**: JSON object (enforced)
- **Max Tokens**: Default (typically completes in 200-400 tokens)

---

## Example AI Response

Given the KPIs above, here's a typical response:

```json
{
  "headline": "Traffic growing at 18% but conversion stuck at 1.85% - well below SaaS benchmark of 3-5%",
  "highlights": [
    "Unique visitors increased to 1,250 users with strong engagement (2.76 pages/user)",
    "Mobile dominates at 53% but conversion may be suffering on smaller screens",
    "D7 retention at 24% exceeds the 20-25% target, showing product-market fit"
  ],
  "bottleneck": "Main conversion blocker is the Email Verified → Trial Started step with 12.5% drop-off (40 users lost), suggesting friction in email verification process",
  "actions": [
    "Implement one-click email verification or magic links to reduce 12.5% drop-off",
    "Optimize mobile sign-up flow - 53% of traffic is mobile but conversion is lagging",
    "A/B test removing email verification requirement for trial users to improve 1.85% conversion"
  ]
}
```

---

## Response Processing

The API processes the response as follows:

1. **Parse JSON**: Extract structured data from AI response
2. **Validate**: Ensure all required fields are present
3. **Calculate Cost**: 
   - Input tokens: ~800-1200 tokens (depending on KPI complexity)
   - Output tokens: ~200-400 tokens
   - Cost: $0.15 per 1M input tokens + $0.60 per 1M output tokens
   - Typical insight: $0.001-0.01 (less than 1 cent)

4. **Save to Database**:
```sql
INSERT INTO ai_insights (
  company_id,
  date_range,
  start_date,
  end_date,
  headline,
  highlights,        -- JSONB array
  bottleneck,
  actions,           -- JSONB array
  kpis_snapshot,     -- Complete KPI data for reproducibility
  model_used,
  generation_time_ms,
  prompt_tokens,
  completion_tokens,
  total_cost_cents,
  status
) VALUES (...);
```

5. **Return to Client**: Send insights + metadata to frontend

---

## Fallback Behavior

If OpenAI returns invalid JSON or fails, we use this fallback:

```json
{
  "headline": "Weekly Analytics Summary",
  "highlights": [
    "Unable to generate detailed insights due to data parsing issues"
  ],
  "bottleneck": "Data processing issues detected",
  "actions": [
    "Check data connections",
    "Verify PostHog setup",
    "Review analytics configuration"
  ]
}
```

---

## Performance Metrics

- **Average Generation Time**: 2-5 seconds
- **Success Rate**: >99%
- **Token Usage**: 1000-1600 total tokens
- **Cost per Insight**: $0.001-0.01
- **Cache Hit Rate**: N/A (insights are unique per generation)

---

## Privacy & Security

- **No PII**: KPIs contain only aggregated, anonymous metrics
- **No User Identities**: Names, emails, IDs are never sent
- **Encrypted Transit**: HTTPS/TLS 1.3 for all API calls
- **OpenAI Policy**: Data not used for model training (as of API TOS)
- **Audit Trail**: All generations logged with timestamps and costs

---

## Customization Options

You can customize the AI behavior by modifying:

1. **Temperature**: Lower (0.1-0.5) for consistent insights, higher (0.6-0.9) for creative suggestions
2. **Model**: Switch to gpt-4 for more sophisticated analysis (10x cost)
3. **Prompt**: Add company-specific context or industry benchmarks
4. **Response Schema**: Request additional fields like sentiment, urgency, impact scores

---

## Future Enhancements

Planned improvements:
- **Historical Comparison**: "Traffic up 25% vs last period"
- **Anomaly Detection**: "Unusual spike in mobile traffic detected"
- **Predictive Insights**: "Trend suggests 30% growth next month"
- **Multi-Language**: Generate insights in user's language
- **Custom Benchmarks**: Compare against your industry peers
- **Action Tracking**: Mark actions as completed and measure impact

---

## Questions?

See `AI_INSIGHTS_IMPLEMENTATION.md` for implementation details or `QUICK_START_AI_INSIGHTS.md` for user guide.
