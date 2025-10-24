'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Sparkles, RefreshCw, Star, 
  ArrowLeft, Award, Target, Smartphone, Globe, Zap, Filter, ArrowUpRight, ArrowDownRight,
  Minus, ChevronDown, ChevronUp
} from 'lucide-react';

// Enhanced interfaces matching new schema
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
  id: string;
  headline: string;
  summary: string;
  highlights: string[];
  bottleneck: AIBottleneck;
  segments: AISegments;
  retention: AIRetention;
  actions: AIAction[];
  numbers_table: NumbersRow[];
  meta: AIMetaInfo;
  quality_score?: number;
  created_at: string;
  date_range: string;
  generation_time_ms: number;
}

type SortOption = 'impact-desc' | 'impact-asc' | 'effort-asc' | 'effort-desc' | 'score-desc' | 'default';

export default function AIInsightsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState('7d');
  const [kpis, setKpis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [actionSort, setActionSort] = useState<SortOption>('impact-desc');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    highlights: true,
    segments: true,
    retention: true,
    bottleneck: true,
    actions: true,
    numbers: false,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (companyId || clientId) {
      fetchInsights();
      fetchAnalytics();
    }
  }, [selectedDateRange, companyId, clientId]);

  const fetchUserData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id, companies(id, name, slug, posthog_client_id)')
        .eq('id', user.id)
        .single();

      if (userData?.companies) {
        const company = userData.companies as any;
        setCompanyId(company.id);
        setClientId(company.posthog_client_id || company.slug);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch(`/api/ai/insights?dateRange=${selectedDateRange}&limit=5`);
      const data = await response.json();

      if (data.success) {
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        dateRange: selectedDateRange,
        compare: 'false',
      });

      if (companyId) {
        params.append('companyId', companyId);
      } else if (clientId) {
        params.append('clientId', clientId);
      }

      const response = await fetch(`/api/analytics/preview?${params}`);
      const data = await response.json();

      if (data.success) {
        setKpis(data.kpis);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const generateNewInsights = async () => {
    if (!kpis) {
      setError('No analytics data available');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpis,
          dateRange: selectedDateRange,
          startDate: new Date(Date.now() - getDaysFromRange(selectedDateRange) * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          language: 'en', // Could be from user settings
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchInsights();
      } else {
        setError(data.error || 'Failed to generate insights');
      }
    } catch (error: any) {
      console.error('Error generating insights:', error);
      setError(error.message || 'Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const rateInsight = async (insightId: string, rating: number) => {
    try {
      await fetch('/api/ai/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId,
          qualityScore: rating,
        }),
      });

      setInsights(
        insights.map((insight) =>
          insight.id === insightId ? { ...insight, quality_score: rating } : insight
        )
      );
    } catch (error) {
      console.error('Error rating insight:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper to normalize bottleneck data (handles both old string and new object format)
  const normalizeBottleneck = (bottleneck: any): AIBottleneck | null => {
    if (!bottleneck) return null;
    
    // If it's already the new format (object with diagnosis)
    if (typeof bottleneck === 'object' && 'diagnosis' in bottleneck) {
      // Ensure hypotheses are strings
      const hypotheses = Array.isArray(bottleneck.hypotheses)
        ? bottleneck.hypotheses.map((h: any) => typeof h === 'string' ? h : String(h))
        : [];
      
      return {
        step_from: bottleneck.step_from || null,
        step_to: bottleneck.step_to || null,
        drop_rate_pct: bottleneck.drop_rate_pct || null,
        diagnosis: String(bottleneck.diagnosis || ''),
        hypotheses,
      };
    }
    
    // If it's the old format (string), convert it
    if (typeof bottleneck === 'string') {
      return {
        step_from: null,
        step_to: null,
        drop_rate_pct: null,
        diagnosis: bottleneck,
        hypotheses: [],
      };
    }
    
    return null;
  };

  // Helper to normalize actions data (handles both old string array and new object array)
  const normalizeActions = (actions: any): AIAction[] => {
    if (!actions || !Array.isArray(actions)) return [];
    
    return actions.map((action, index) => {
      // If it's already the new format
      if (typeof action === 'object' && 'title' in action) {
        return action as AIAction;
      }
      
      // If it's the old format (string), convert it
      if (typeof action === 'string') {
        return {
          title: action,
          why: 'Legacy action from previous version',
          impact: 3,
          effort: 3,
          confidence: 0.5,
          expected_lift_pct: null,
          tag: 'funnel' as const,
        };
      }
      
      return action;
    });
  };

  const sortActions = (actions: AIAction[]): AIAction[] => {
    const sorted = [...actions];
    switch (actionSort) {
      case 'impact-desc':
        return sorted.sort((a, b) => b.impact - a.impact || b.confidence - a.confidence);
      case 'impact-asc':
        return sorted.sort((a, b) => a.impact - b.impact);
      case 'effort-asc':
        return sorted.sort((a, b) => a.effort - b.effort || b.impact - a.impact);
      case 'effort-desc':
        return sorted.sort((a, b) => b.effort - a.effort);
      case 'score-desc':
        return sorted.sort((a, b) => {
          const scoreA = (a.impact / a.effort) * a.confidence;
          const scoreB = (b.impact / b.effort) * b.confidence;
          return scoreB - scoreA;
        });
      default:
        return sorted;
    }
  };

  const getDaysFromRange = (range: string): number => {
    switch (range) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  const getBenchmarkBadge = (status: string) => {
    const badges = {
      below: { icon: TrendingDown, color: 'text-red-600 bg-red-50 border-red-200', label: 'Below Target' },
      meets: { icon: Target, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Meets Target' },
      exceeds: { icon: Award, color: 'text-green-600 bg-green-50 border-green-200', label: 'Exceeds Target' },
      unknown: { icon: Minus, color: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Unknown' },
    };

    const badge = badges[status as keyof typeof badges] || badges.unknown;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {badge.label}
      </span>
    );
  };

  const getTagIcon = (tag: string) => {
    const icons = {
      funnel: TrendingUp,
      mobile: Smartphone,
      content: Sparkles,
      geo: Globe,
      retention: Target,
      performance: Zap,
    };
    return icons[tag as keyof typeof icons] || Sparkles;
  };

  const getTagColor = (tag: string) => {
    const colors = {
      funnel: 'bg-purple-100 text-purple-700',
      mobile: 'bg-blue-100 text-blue-700',
      content: 'bg-pink-100 text-pink-700',
      geo: 'bg-green-100 text-green-700',
      retention: 'bg-orange-100 text-orange-700',
      performance: 'bg-yellow-100 text-yellow-700',
    };
    return colors[tag as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const renderImpactEffortIndicators = (impact: number, effort: number) => {
    return (
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="font-medium text-gray-600">Impact:</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-1.5 h-3 rounded-sm ${
                  i <= impact ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium text-gray-600">Effort:</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-1.5 h-3 rounded-sm ${
                  i <= effort ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Insights...</p>
        </div>
      </div>
    );
  }

  const latestInsight = insights[0];
  
  // Normalize data to handle both old and new schema formats
  const normalizedInsight = latestInsight ? {
    ...latestInsight,
    bottleneck: normalizeBottleneck(latestInsight.bottleneck),
    actions: normalizeActions(latestInsight.actions),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-purple-600" />
                  <h1 className="text-2xl font-bold text-gray-900">AI-Powered Insights</h1>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Actionable recommendations with industry benchmarks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>

              <Button
                onClick={generateNewInsights}
                disabled={generating || !kpis}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {generating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate New Insights
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Latest Insight - Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {normalizedInsight ? (
              <>
                {/* Headline Card */}
                <Card className="border-2 border-purple-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-5 w-5 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                            Latest AI Insight
                          </span>
                          <span className="text-xs text-gray-500">
                            • {new Date(normalizedInsight.created_at).toLocaleDateString()}
                          </span>
                          {normalizedInsight.meta?.period_compared === 'prior_provided' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              <TrendingUp className="h-3 w-3" />
                              vs Prior Period
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-xl text-gray-900 mb-2">
                          {normalizedInsight.headline}
                        </CardTitle>
                        {normalizedInsight.summary && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {normalizedInsight.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => rateInsight(normalizedInsight.id, star)}
                            className={`${
                              (normalizedInsight.quality_score || 0) >= star
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            } hover:text-yellow-400 transition-colors`}
                          >
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Numbers Table */}
                {normalizedInsight.numbers_table && normalizedInsight.numbers_table.length > 0 && (
                  <Card>
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSection('numbers')}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          Key Metrics Comparison
                        </CardTitle>
                        {expandedSections.numbers ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedSections.numbers && (
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Metric</th>
                                <th className="px-4 py-2 text-right font-semibold text-gray-700">Current</th>
                                {normalizedInsight.numbers_table[0].prior && (
                                  <>
                                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Prior</th>
                                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Change</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {normalizedInsight.numbers_table.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-900">{row.metric}</td>
                                  <td className="px-4 py-3 text-right text-gray-900">{row.current}</td>
                                  {row.prior && (
                                    <>
                                      <td className="px-4 py-3 text-right text-gray-600">{row.prior}</td>
                                      <td className="px-4 py-3 text-right">
                                        {row.delta && (
                                          <span className={`inline-flex items-center gap-1 font-medium ${
                                            row.delta.startsWith('+') ? 'text-green-600' :
                                            row.delta.startsWith('-') ? 'text-red-600' : 'text-gray-600'
                                          }`}>
                                            {row.delta.startsWith('+') && <ArrowUpRight className="h-3 w-3" />}
                                            {row.delta.startsWith('-') && <ArrowDownRight className="h-3 w-3" />}
                                            {row.delta}
                                          </span>
                                        )}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Key Highlights */}
                <Card>
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('highlights')}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Key Highlights
                      </CardTitle>
                      {expandedSections.highlights ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedSections.highlights && (
                    <CardContent>
                      <ul className="space-y-3">
                        {normalizedInsight.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 leading-relaxed">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>

                {/* Segments */}
                {(normalizedInsight.segments?.by_device || normalizedInsight.segments?.by_geo) && (
                  <Card>
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSection('segments')}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Filter className="h-5 w-5 text-indigo-600" />
                          Segment Analysis
                        </CardTitle>
                        {expandedSections.segments ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedSections.segments && (
                      <CardContent className="space-y-4">
                        {normalizedInsight.segments.by_device && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <Smartphone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-blue-900 mb-1">
                                  {normalizedInsight.segments.by_device.segment} Users
                                </h4>
                                <p className="text-sm text-blue-800 mb-2">
                                  {normalizedInsight.segments.by_device.insight}
                                </p>
                                <p className="text-xs text-blue-700 font-medium">
                                  💡 {normalizedInsight.segments.by_device.action_hint}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {normalizedInsight.segments.by_geo && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <Globe className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-green-900 mb-1">
                                  {normalizedInsight.segments.by_geo.segment}
                                </h4>
                                <p className="text-sm text-green-800 mb-2">
                                  {normalizedInsight.segments.by_geo.insight}
                                </p>
                                <p className="text-xs text-green-700 font-medium">
                                  💡 {normalizedInsight.segments.by_geo.action_hint}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Retention Analysis */}
                {normalizedInsight.retention && (
                  <Card>
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSection('retention')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Target className="h-5 w-5 text-orange-600" />
                            Retention Analysis
                          </CardTitle>
                          {getBenchmarkBadge(normalizedInsight.retention.benchmark_status)}
                        </div>
                        {expandedSections.retention ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedSections.retention && (
                      <CardContent>
                        <div className="space-y-3">
                          {normalizedInsight.retention.d7_pct !== null && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-700">D7 Retention</span>
                              <span className="text-2xl font-bold text-gray-900">
                                {normalizedInsight.retention.d7_pct.toFixed(1)}%
                              </span>
                            </div>
                          )}
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {normalizedInsight.retention.note}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Bottleneck */}
                {normalizedInsight.bottleneck && (
                  <Card>
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSection('bottleneck')}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                          Main Bottleneck
                        </CardTitle>
                        {expandedSections.bottleneck ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedSections.bottleneck && (
                      <CardContent>
                        <div className="space-y-4">
                          {normalizedInsight.bottleneck.step_from && normalizedInsight.bottleneck.step_to && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-md font-medium">
                                {normalizedInsight.bottleneck.step_from}
                              </span>
                              <span className="text-orange-600">→</span>
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-md font-medium">
                                {normalizedInsight.bottleneck.step_to}
                              </span>
                              {normalizedInsight.bottleneck.drop_rate_pct !== null && (
                                <span className="ml-auto text-orange-900 font-bold">
                                  {normalizedInsight.bottleneck.drop_rate_pct.toFixed(1)}% drop
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-gray-700 leading-relaxed">
                            {normalizedInsight.bottleneck.diagnosis}
                          </p>
                          {normalizedInsight.bottleneck.hypotheses && normalizedInsight.bottleneck.hypotheses.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-orange-200">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                Possible Root Causes:
                              </h4>
                              <ul className="space-y-2">
                                {normalizedInsight.bottleneck.hypotheses.map((hypothesis, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className="text-orange-600 font-bold mt-0.5">{index + 1}.</span>
                                    <span className="leading-relaxed">{String(hypothesis)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Recommended Actions */}
                <Card>
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('actions')}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Recommended Actions
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <select
                          value={actionSort}
                          onChange={(e) => setActionSort(e.target.value as SortOption)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="impact-desc">Impact (High → Low)</option>
                          <option value="impact-asc">Impact (Low → High)</option>
                          <option value="effort-asc">Effort (Low → High)</option>
                          <option value="effort-desc">Effort (High → Low)</option>
                          <option value="score-desc">Best Score (Impact/Effort)</option>
                          <option value="default">Default Order</option>
                        </select>
                        {expandedSections.actions ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedSections.actions && (
                    <CardContent>
                      <div className="space-y-4">
                        {sortActions(normalizedInsight.actions).map((action, index) => {
                          const TagIcon = getTagIcon(action.tag);
                          return (
                            <div
                              key={index}
                              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <span className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                  </span>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 mb-1">
                                      {action.title}
                                    </h4>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(action.tag)}`}>
                                      <TagIcon className="h-3 w-3" />
                                      {action.tag}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-700 mb-3 leading-relaxed pl-10">
                                {action.why}
                              </p>

                              <div className="flex items-center justify-between pl-10 pt-3 border-t border-gray-200">
                                {renderImpactEffortIndicators(action.impact, action.effort)}
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-600">
                                    Confidence: <span className="font-bold">{(action.confidence * 100).toFixed(0)}%</span>
                                  </span>
                                  {action.expected_lift_pct !== null && (
                                    <span className="text-xs text-green-700 font-medium">
                                      Expected: +{action.expected_lift_pct.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Metadata */}
                {normalizedInsight.meta && (
                  <div className="text-xs text-gray-500 px-4 py-3 bg-gray-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span>Generated in {normalizedInsight.generation_time_ms}ms • Range: {normalizedInsight.date_range}</span>
                      {normalizedInsight.meta.data_gaps && normalizedInsight.meta.data_gaps.length > 0 && (
                        <span className="text-orange-600">
                          ⚠️ Data gaps: {normalizedInsight.meta.data_gaps.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Insights Yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Generate your first AI-powered insight to get actionable recommendations
                    based on your analytics data.
                  </p>
                  <Button
                    onClick={generateNewInsights}
                    disabled={generating || !kpis}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Insights
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Previous Insights & Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Previous Insights</CardTitle>
                <CardDescription>Your insight history for {selectedDateRange}</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.length > 1 ? (
                  <div className="space-y-3">
                    {insights.slice(1).map((insight) => (
                      <div
                        key={insight.id}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                          {insight.headline}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                          {insight.quality_score && (
                            <div className="flex gap-0.5">
                              {Array.from({ length: insight.quality_score }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No previous insights for this period
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardContent className="pt-6">
                <Brain className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Our AI analyzes your analytics data and provides personalized insights
                  comparing your metrics against industry benchmarks.
                </p>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Conversion benchmarks (3-5%)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Retention targets (20-25%)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Period-over-period comparison
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Segment analysis (device/geo)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Ranked action recommendations
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Benchmarks Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Benchmark Badges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {getBenchmarkBadge('exceeds')}
                  <span className="text-xs text-gray-600">Above target</span>
                </div>
                <div className="flex items-center gap-2">
                  {getBenchmarkBadge('meets')}
                  <span className="text-xs text-gray-600">Meets target</span>
                </div>
                <div className="flex items-center gap-2">
                  {getBenchmarkBadge('below')}
                  <span className="text-xs text-gray-600">Below target</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

