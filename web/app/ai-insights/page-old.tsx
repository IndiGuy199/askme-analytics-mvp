'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, AlertCircle, CheckCircle, Sparkles, RefreshCw, Star, ArrowLeft } from 'lucide-react';

interface AIInsight {
  id: string;
  headline: string;
  highlights: string[];
  bottleneck: string;
  actions: string[];
  quality_score?: number;
  created_at: string;
  date_range: string;
  generation_time_ms: number;
}

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
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh insights list
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

      // Update local state
      setInsights(
        insights.map((insight) =>
          insight.id === insightId ? { ...insight, quality_score: rating } : insight
        )
      );
    } catch (error) {
      console.error('Error rating insight:', error);
    }
  };

  const getDaysFromRange = (range: string): number => {
    switch (range) {
      case '24h':
        return 1;
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 7;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Insights...</p>
        </div>
      </div>
    );
  }

  const latestInsight = insights[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-purple-600" />
                  <h1 className="text-2xl font-bold text-gray-900">AI-Powered Insights</h1>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Actionable recommendations powered by GPT-4
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
            {latestInsight ? (
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
                          • Generated {new Date(latestInsight.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-xl text-gray-900">
                        {latestInsight.headline}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => rateInsight(latestInsight.id, star)}
                          className={`${
                            (latestInsight.quality_score || 0) >= star
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
                <CardContent className="pt-6 space-y-6">
                  {/* Key Highlights */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">Key Highlights</h3>
                    </div>
                    <ul className="space-y-2">
                      {latestInsight.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottleneck */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-orange-900 mb-1">Main Bottleneck</h3>
                        <p className="text-sm text-orange-800">{latestInsight.bottleneck}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Recommended Actions</h3>
                    <div className="space-y-2">
                      {latestInsight.actions.map((action, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          <p className="text-sm text-gray-700">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                    Generated in {latestInsight.generation_time_ms}ms • Range:{' '}
                    {latestInsight.date_range}
                  </div>
                </CardContent>
              </Card>
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

          {/* Sidebar - Previous Insights */}
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
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• SaaS conversion target: 3-5%</li>
                  <li>• D7 retention target: 20-25%</li>
                  <li>• Actionable recommendations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
