import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

interface KPIs {
  traffic?: {
    unique_users: number;
    pageviews: number;
    series?: number[];
  };
  funnel?: {
    steps: Array<{ name: string; count: number }>;
    conversion_rate: number;
    median_time_to_convert_sec: number;
    top_drop?: { from: string; to: string; dropRate: number };
  };
  lifecycle?: {
    series: {
      new: number[];
      returning: number[];
      resurrecting: number[];
      dormant: number[];
    };
  };
  device?: {
    device_mix: Record<string, number>;
  };
  retention?: {
    d7_retention: number;
    values: Array<{ day: number; percentage: number }>;
  };
  geography?: {
    countries: Record<string, number>;
  };
}

interface Benchmarks {
  saas_conv_rate_target: { low: number; good: number };
  d7_retention_target: { low: number; good: number };
  mobile_share_norm: { low: number; high: number };
}

interface AIBottleneck {
  step_from: string | null;
  step_to: string | null;
  drop_rate_pct: number | null;
  diagnosis: string;
  hypotheses: string[];
}

interface AISegmentInsight {
  segment: string;
  insight: string;
  action_hint: string;
}

interface AISegments {
  by_device: AISegmentInsight | null;
  by_geo: AISegmentInsight | null;
}

interface AIRetention {
  d7_pct: number | null;
  benchmark_status: 'below' | 'meets' | 'exceeds' | 'unknown';
  note: string;
}

interface AIAction {
  title: string;
  why: string;
  impact: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  expected_lift_pct: number | null;
  tag: 'funnel' | 'mobile' | 'content' | 'geo' | 'retention' | 'performance';
}

interface NumbersRow {
  metric: string;
  current: string;
  prior: string | null;
  delta: string | null;
}

interface AIMetaInfo {
  period_compared: 'none' | 'prior_provided' | 'insufficient_prior';
  data_gaps: string[];
}

interface AIInsight {
  headline: string;
  summary: string;
  highlights: string[];
  bottleneck: AIBottleneck;
  segments: AISegments;
  retention: AIRetention;
  actions: AIAction[];
  numbers_table: NumbersRow[];
  meta: AIMetaInfo;
}

// Default benchmarks (can be overridden by industry)
const DEFAULT_BENCHMARKS: Benchmarks = {
  saas_conv_rate_target: { low: 0.03, good: 0.05 },
  d7_retention_target: { low: 0.20, good: 0.25 },
  mobile_share_norm: { low: 0.45, high: 0.65 },
};

// Industry-specific benchmark overrides
const INDUSTRY_BENCHMARKS: Record<string, Partial<Benchmarks>> = {
  ecommerce: {
    saas_conv_rate_target: { low: 0.02, good: 0.04 },
    mobile_share_norm: { low: 0.60, high: 0.75 },
  },
  content: {
    saas_conv_rate_target: { low: 0.01, good: 0.03 },
    d7_retention_target: { low: 0.15, good: 0.20 },
  },
  app: {
    d7_retention_target: { low: 0.25, good: 0.35 },
    mobile_share_norm: { low: 0.75, high: 0.90 },
  },
};

/**
 * Get benchmarks for a company (with industry overrides if applicable)
 */
function getBenchmarks(industry?: string): Benchmarks {
  if (industry && INDUSTRY_BENCHMARKS[industry]) {
    return { ...DEFAULT_BENCHMARKS, ...INDUSTRY_BENCHMARKS[industry] };
  }
  return DEFAULT_BENCHMARKS;
}

/**
 * Calculate prior period date range
 */
function calculatePriorPeriod(startDate: string, endDate: string): { start: string; end: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationMs = end.getTime() - start.getTime();
  
  const priorEnd = new Date(start.getTime() - 1); // Day before current period starts
  const priorStart = new Date(priorEnd.getTime() - durationMs);
  
  return {
    start: priorStart.toISOString(),
    end: priorEnd.toISOString(),
  };
}

/**
 * Validate and coerce AI response to ensure schema compliance
 */
function validateAIResponse(response: any): AIInsight {
  // Coerce percentages to 0-100 range
  const coercePercentage = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    if (isNaN(num)) return null;
    return Math.max(0, Math.min(100, num));
  };

  // Coerce rating to 1-5 range
  const coerceRating = (val: any): 1 | 2 | 3 | 4 | 5 => {
    const num = Number(val);
    if (isNaN(num)) return 3;
    return Math.max(1, Math.min(5, Math.round(num))) as 1 | 2 | 3 | 4 | 5;
  };

  // Coerce confidence to 0-1 range
  const coerceConfidence = (val: any): number => {
    const num = Number(val);
    if (isNaN(num)) return 0.5;
    return Math.max(0, Math.min(1, num));
  };

  // Validate bottleneck
  const bottleneck: AIBottleneck = {
    step_from: response.bottleneck?.step_from || null,
    step_to: response.bottleneck?.step_to || null,
    drop_rate_pct: coercePercentage(response.bottleneck?.drop_rate_pct),
    diagnosis: response.bottleneck?.diagnosis || 'No bottleneck identified',
    hypotheses: Array.isArray(response.bottleneck?.hypotheses)
      ? response.bottleneck.hypotheses.slice(0, 3)
      : [],
  };

  // Validate segments
  const segments: AISegments = {
    by_device: response.segments?.by_device
      ? {
          segment: response.segments.by_device.segment || 'unknown',
          insight: response.segments.by_device.insight || '',
          action_hint: response.segments.by_device.action_hint || '',
        }
      : null,
    by_geo: response.segments?.by_geo
      ? {
          segment: response.segments.by_geo.segment || 'unknown',
          insight: response.segments.by_geo.insight || '',
          action_hint: response.segments.by_geo.action_hint || '',
        }
      : null,
  };

  // Validate retention
  const retention: AIRetention = {
    d7_pct: coercePercentage(response.retention?.d7_pct),
    benchmark_status: ['below', 'meets', 'exceeds', 'unknown'].includes(
      response.retention?.benchmark_status
    )
      ? response.retention.benchmark_status
      : 'unknown',
    note: response.retention?.note || '',
  };

  // Validate actions
  const actions: AIAction[] = (Array.isArray(response.actions) ? response.actions : [])
    .slice(0, 5)
    .map((action: any) => ({
      title: action.title || 'Untitled action',
      why: action.why || '',
      impact: coerceRating(action.impact),
      effort: coerceRating(action.effort),
      confidence: coerceConfidence(action.confidence),
      expected_lift_pct: coercePercentage(action.expected_lift_pct),
      tag: ['funnel', 'mobile', 'content', 'geo', 'retention', 'performance'].includes(action.tag)
        ? action.tag
        : 'funnel',
    }));

  // Validate numbers table
  const numbers_table: NumbersRow[] = (
    Array.isArray(response.numbers_table) ? response.numbers_table : []
  )
    .slice(0, 6)
    .map((row: any) => ({
      metric: row.metric || '',
      current: row.current || '-',
      prior: row.prior || null,
      delta: row.delta || null,
    }));

  // Validate meta
  const meta: AIMetaInfo = {
    period_compared: ['none', 'prior_provided', 'insufficient_prior'].includes(
      response.meta?.period_compared
    )
      ? response.meta.period_compared
      : 'none',
    data_gaps: Array.isArray(response.meta?.data_gaps) ? response.meta.data_gaps : [],
  };

  return {
    headline: response.headline || 'Analytics Summary',
    summary: response.summary || 'Unable to generate summary',
    highlights: Array.isArray(response.highlights)
      ? response.highlights.slice(0, 3)
      : ['No highlights available'],
    bottleneck,
    segments,
    retention,
    actions,
    numbers_table,
    meta,
  };
}

/**
 * Generate AI insights from KPI data using OpenAI
 */
async function generateInsights(
  currentKpis: KPIs,
  previousKpis: KPIs | null,
  benchmarks: Benchmarks,
  language: string = 'en',
  businessContext: {
    industry: string | null;
    business_model: string | null;
    primary_goal: string | null;
    audience_region: string | null;
    traffic_sources: string[];
    monthly_visitors: number | null;
  } | null = null
): Promise<{
  insights: AIInsight;
  metadata: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    generationTimeMs: number;
  };
}> {
  const startTime = Date.now();

  // Build business context section for prompt
  let contextSection = '';
  if (businessContext && businessContext.industry) {
    contextSection = `
=== CLIENT BUSINESS CONTEXT ===
Industry: ${businessContext.industry || 'Not specified'}
Business Model: ${businessContext.business_model || 'Not specified'}
Primary Goal: ${businessContext.primary_goal || 'Not specified'}
Audience Region: ${businessContext.audience_region || 'Not specified'}
Traffic Sources: ${businessContext.traffic_sources.length > 0 ? businessContext.traffic_sources.join(', ') : 'Not specified'}
Monthly Visitors: ${businessContext.monthly_visitors ? businessContext.monthly_visitors.toLocaleString() : 'Not specified'}

Use this context to:
- Tailor insights to this specific business type and industry
- Explain metrics in terms relevant to their business model
- Reference their primary goal when suggesting actions
- Consider their traffic sources when analyzing performance
- Use simple, actionable language for their business context
`;
  }

  const prompt = `You are a no-nonsense analytics consultant. Use ONLY the data provided.
Return STRICT JSON matching the schema below. Do not include any extra text.
${contextSection}
=== CONTEXT ===
- Audience: non-technical small-business operators.
- Goal: quickly explain what changed, where the funnel leaks, and what to do next.
- Language: ${language} (use plain words; avoid jargon)

=== BENCHMARKS ===
Use these as reference, do not invent others.
${JSON.stringify(benchmarks, null, 2)}

=== CURRENT KPIs (required) ===
${JSON.stringify(currentKpis, null, 2)}

=== PRIOR KPIs (same period, optional) ===
${JSON.stringify(previousKpis ?? null, null, 2)}

=== SCHEMA (return exactly this shape) ===
{
  "headline": string,                     // One sentence with the single most important change. Include % change if prior is present.
  "summary": string,                      // 2–3 lines: what's up/down and why it matters.
  "highlights": [                         // Exactly 3 bullets, each concise, with numbers.
    string, string, string
  ],
  "bottleneck": {
    "step_from": string | null,
    "step_to": string | null,
    "drop_rate_pct": number | null,       // 0–100
    "diagnosis": string,                  // Plain-language explanation
    "hypotheses": string[]                // Up to 3 root-cause ideas, each tied to observed data
  },
  "segments": {                           // Up to 2 segments that most influence outcomes
    "by_device": {
      "segment": string,                  // e.g., "mobile"
      "insight": string,                  // with numbers
      "action_hint": string
    } | null,
    "by_geo": {
      "segment": string,                  // e.g., "US"
      "insight": string,
      "action_hint": string
    } | null
  },
  "retention": {
    "d7_pct": number | null,              // 0–100
    "benchmark_status": "below" | "meets" | "exceeds" | "unknown",
    "note": string
  },
  "actions": [                            // Rank by impact desc (max 5)
    {
      "title": string,                    // e.g., "Streamline email verification"
      "why": string,                      // tie to data/benchmark gap
      "impact": 1|2|3|4|5,
      "effort": 1|2|3|4|5,
      "confidence": number,               // 0–1
      "expected_lift_pct": number | null, // 0–100, optional estimate
      "tag": "funnel"|"mobile"|"content"|"geo"|"retention"|"performance"
    }
  ],
  "numbers_table": [                      // Small table for UI; 3–6 rows
    { "metric": string, "current": string, "prior": string | null, "delta": string | null }
  ],
  "meta": {
    "period_compared": "none"|"prior_provided"|"insufficient_prior",
    "data_gaps": string[]                 // list reasons if something is null
  }
}

=== RULES ===
- Use ONLY provided fields; do not invent events, steps, or channels.
- Percentages: show with % sign, 1 decimal max, include sign (e.g., "+12.3%").
- Time: use seconds or minutes (e.g., "3m 10s").
- If previous_kpis is null: set "period_compared" to "insufficient_prior" and leave deltas null.
- Pick at most ONE device and ONE geo segment. If no clear story, set them to null.
- "actions": 3–5 items, each tied to a specific metric or benchmark gap.
- Keep language clear and friendly; avoid jargon.

Return ONLY the JSON object.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.25, // Lower temperature for more consistent, deterministic output
    response_format: { type: 'json_object' },
  });

  const generationTimeMs = Date.now() - startTime;
  const content = completion.choices[0]?.message?.content || '{}';
  
  let rawInsights: any;
  try {
    rawInsights = JSON.parse(content);
  } catch {
    // Fallback if the model didn't return valid JSON
    rawInsights = {
      headline: 'Weekly Analytics Summary',
      summary: 'Unable to generate detailed insights due to data parsing issues.',
      highlights: ['Unable to generate detailed insights'],
      bottleneck: {
        step_from: null,
        step_to: null,
        drop_rate_pct: null,
        diagnosis: 'Data parsing issues detected',
        hypotheses: [],
      },
      segments: { by_device: null, by_geo: null },
      retention: { d7_pct: null, benchmark_status: 'unknown', note: 'Data unavailable' },
      actions: [
        {
          title: 'Check data connections',
          why: 'Unable to parse analytics data',
          impact: 5,
          effort: 2,
          confidence: 0.9,
          expected_lift_pct: null,
          tag: 'performance',
        },
        {
          title: 'Verify PostHog setup',
          why: 'Ensure events are being tracked correctly',
          impact: 5,
          effort: 2,
          confidence: 0.9,
          expected_lift_pct: null,
          tag: 'performance',
        },
        {
          title: 'Review analytics configuration',
          why: 'Check for configuration issues',
          impact: 4,
          effort: 3,
          confidence: 0.8,
          expected_lift_pct: null,
          tag: 'performance',
        },
      ],
      numbers_table: [],
      meta: {
        period_compared: 'none',
        data_gaps: ['Unable to parse AI response'],
      },
    };
  }

  // Validate and coerce the response
  const insights = validateAIResponse(rawInsights);

  return {
    insights,
    metadata: {
      model: MODEL,
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      generationTimeMs,
    },
  };
}

/**
 * POST /api/ai/insights
 * Generate AI insights from analytics data
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyId = userData.company_id;

    // Fetch company business context for personalized insights
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('industry, business_model, primary_goal, audience_region, traffic_sources, monthly_visitors')
      .eq('id', companyId)
      .single();

    const businessContext = companyData ? {
      industry: companyData.industry || null,
      business_model: companyData.business_model || null,
      primary_goal: companyData.primary_goal || null,
      audience_region: companyData.audience_region || null,
      traffic_sources: companyData.traffic_sources || [],
      monthly_visitors: companyData.monthly_visitors || null,
    } : null;

    console.log('🎯 Business context:', businessContext);

    // Parse request body
    const body = await req.json();
    const { 
      kpis, 
      previousKpis = null, 
      dateRange = '7d', 
      startDate, 
      endDate,
      industry = null,
      language = 'en'
    } = body;

    if (!kpis) {
      return NextResponse.json({ error: 'KPIs data is required' }, { status: 400 });
    }

    // Use provided start/end dates or calculate from date range
    const finalStartDate = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const finalEndDate = endDate || new Date().toISOString();

    // Fetch previous period KPIs if not provided
    let priorKpis = previousKpis;
    if (!priorKpis && startDate && endDate) {
      try {
        const priorPeriod = calculatePriorPeriod(startDate, endDate);
        
        // Try to fetch from analytics_snapshots
        const { data: snapshot } = await supabase
          .from('analytics_snapshots')
          .select('*')
          .eq('company_id', companyId)
          .gte('snapshot_date', priorPeriod.start)
          .lte('snapshot_date', priorPeriod.end)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single();

        if (snapshot) {
          priorKpis = {
            traffic: snapshot.traffic_data,
            funnel: snapshot.funnel_data,
            lifecycle: snapshot.lifecycle_data,
            device: snapshot.device_data,
            retention: snapshot.retention_data,
            geography: snapshot.geography_data,
          };
          console.log('📊 Found prior period KPIs:', priorPeriod);
        }
      } catch (error) {
        console.log('ℹ️  No prior period data available');
      }
    }

    // Get benchmarks for this company's industry
    const benchmarks = getBenchmarks(businessContext?.industry || industry);

    // Generate AI insights
    console.log('🤖 Generating AI insights for company:', companyId);
    console.log('📊 Prior period data:', priorKpis ? 'available' : 'not available');
    const { insights, metadata } = await generateInsights(kpis, priorKpis, benchmarks, language, businessContext);

    // Calculate cost (rough estimate: $0.15 per 1M input tokens, $0.60 per 1M output tokens for gpt-4o-mini)
    const inputCostPer1M = 0.15;
    const outputCostPer1M = 0.60;
    const totalCostCents =
      ((metadata.promptTokens / 1_000_000) * inputCostPer1M +
        (metadata.completionTokens / 1_000_000) * outputCostPer1M) *
      100;

    // Save current KPIs to analytics_snapshots for future comparison
    try {
      await supabase.from('analytics_snapshots').insert({
        company_id: companyId,
        date_range: dateRange,
        start_date: finalStartDate,
        end_date: finalEndDate,
        snapshot_date: new Date().toISOString(),
        traffic_data: kpis.traffic || null,
        funnel_data: kpis.funnel || null,
        lifecycle_data: kpis.lifecycle || null,
        device_data: kpis.device || null,
        retention_data: kpis.retention || null,
        geography_data: kpis.geography || null,
        data_source: 'posthog',
      });
      console.log('✅ Saved KPI snapshot for future comparisons');
    } catch (error) {
      console.error('⚠️  Failed to save KPI snapshot:', error);
      // Non-critical, continue
    }

    // Save insights to database
    const { data: savedInsight, error: insertError } = await supabase
      .from('ai_insights')
      .insert({
        company_id: companyId,
        date_range: dateRange,
        start_date: finalStartDate,
        end_date: finalEndDate,
        headline: insights.headline,
        summary: insights.summary,
        highlights: insights.highlights,
        bottleneck: insights.bottleneck,
        segments: insights.segments,
        retention_analysis: insights.retention,
        actions: insights.actions,
        numbers_table: insights.numbers_table,
        meta: insights.meta,
        kpis_snapshot: kpis,
        previous_kpis_snapshot: priorKpis,
        model_used: metadata.model,
        generation_time_ms: metadata.generationTimeMs,
        prompt_tokens: metadata.promptTokens,
        completion_tokens: metadata.completionTokens,
        total_cost_cents: totalCostCents,
        language: language,
        industry: businessContext?.industry || null,
        status: 'generated',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving insights:', insertError);
      // Still return the insights even if save fails
      return NextResponse.json({
        success: true,
        insights,
        metadata,
        saved: false,
        error: insertError.message,
      });
    }

    console.log('✅ AI insights generated and saved:', savedInsight.id);

    return NextResponse.json({
      success: true,
      insights,
      metadata,
      saved: true,
      insightId: savedInsight.id,
    });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate insights',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/insights
 * Retrieve saved AI insights for a company
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyId = userData.company_id;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get('dateRange') || '7d';
    const limit = parseInt(searchParams.get('limit') || '10');
    const insightId = searchParams.get('id');

    // If specific insight ID requested
    if (insightId) {
      const { data: insight, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('id', insightId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, insight });
    }

    // Get list of insights
    const query = supabase
      .from('ai_insights')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (dateRange !== 'all') {
      query.eq('date_range', dateRange);
    }

    const { data: insights, error } = await query;

    if (error) {
      console.error('Error fetching insights:', error);
      return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      insights,
      count: insights?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch insights',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/insights
 * Update insight (for user feedback/ratings)
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { insightId, qualityScore, userFeedback, status } = body;

    if (!insightId) {
      return NextResponse.json({ error: 'Insight ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (qualityScore !== undefined) updateData.quality_score = qualityScore;
    if (userFeedback !== undefined) updateData.user_feedback = userFeedback;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('ai_insights')
      .update(updateData)
      .eq('id', insightId)
      .select()
      .single();

    if (error) {
      console.error('Error updating insight:', error);
      return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      insight: data,
    });
  } catch (error: any) {
    console.error('Error updating insight:', error);
    return NextResponse.json(
      {
        error: 'Failed to update insight',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
