'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
  BarChart, Bar,
  RadialBarChart, RadialBar,
} from 'recharts';

type KPI = {
  traffic: { series: number[]; labels?: string[]; unique_users: number; pageviews: number };
  funnel: {
    steps?: { name: string; count: number }[];
    conversion_rate: number;                 // 0..1
    median_time_to_convert_sec: number;      // seconds
    top_drop?: { from: string; to: string; dropRate: number }; // 0..1
    top_drop_rate?: number;
  };
  retention: { d7_retention: number };       // 0..1
  device: { device_mix: Record<string, number> }; // 0..1 fractions
  meta?: { errors?: { traffic?: string; funnel?: string; retention?: string; device?: string } };
};

type ApiResp = { kpis?: KPI; errors?: Record<string, string> };

type Props = { clientId: string };

type AISummary = {
  headline: string;
  highlights?: string[];
  bottleneck?: string;
  actions?: string[];
};

function formatAiText(ai: AISummary): string {
  const lines = [
    ai.headline,
    ai.bottleneck ? `Bottleneck: ${ai.bottleneck}` : '',
    ...(ai.highlights || []).map((h) => `• ${h}`),
    ...(ai.actions || []).map((a) => `→ ${a}`),
  ].filter(Boolean);
  return lines.join('\n');
}

export default function WeeklyAnalyticsCard({ clientId }: Props) {
  // Hooks must always run in the same order
  const [mounted, setMounted] = useState(false);
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ai, setAi] = useState<AISummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/digest/preview?clientId=${encodeURIComponent(clientId)}`, {
          headers: { Accept: 'application/json' },
        });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }
        const json: ApiResp = await res.json();
        if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);
        if (!canceled) setKpis(json.kpis || null);
      } catch (e: any) {
        if (!canceled) setErr(e?.message || 'Failed to load');
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [clientId]);

  useEffect(() => {
    let canceled = false;
    async function run() {
      if (!kpis) return;
      setAiLoading(true);
      setAiErr(null);
      try {
        const res = await fetch('/api/ai/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ kpis }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `AI HTTP ${res.status}`);
        if (!canceled) setAi(json.summary || null);
      } catch (e: any) {
        if (!canceled) setAiErr(e.message || 'Failed to generate summary');
      } finally {
        if (!canceled) setAiLoading(false);
      }
    }
    run();
    return () => {
      canceled = true;
    };
  }, [kpis]);

  // Derived values (useMemo are hooks: keep above any return)
  const colors = ['#2563eb', '#60a5fa', '#9ca3af', '#10b981', '#f59e0b', '#ef4444'];
  const canRenderCharts = mounted && typeof window !== 'undefined';

  const trafficData = useMemo(() => {
    const labels = kpis?.traffic?.labels || [];
    const series = kpis?.traffic?.series || [];
    return labels.map((label, i) => ({ label, value: series[i] ?? 0 }));
  }, [kpis]);

  const pieData = useMemo(() => {
    const entries = Object.entries(kpis?.device?.device_mix || {});
    return entries.map(([name, frac]) => ({ name, value: Math.round((frac || 0) * 100) }));
  }, [kpis]);

  const convPct = useMemo(() => Math.round(100 * (kpis?.funnel?.conversion_rate || 0)), [kpis]);
  const d7Pct = useMemo(() => Math.round(100 * (kpis?.retention?.d7_retention || 0)), [kpis]);
  const ttcSec = useMemo(() => Math.round(kpis?.funnel?.median_time_to_convert_sec || 0), [kpis]);

  const topDrop = kpis?.funnel?.top_drop;
  const dropRate = topDrop?.dropRate ?? kpis?.funnel?.top_drop_rate ?? 0;
  const dropRatePct = Math.round(100 * dropRate);
  const topDropFrom = topDrop?.from || 'N/A';
  const topDropTo = topDrop?.to || 'N/A';
  const topDropBars = useMemo(
    () => [
      { name: topDropFrom, value: 100 },
      { name: topDropTo, value: Math.max(1, Math.round(100 * (1 - dropRate))) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topDropFrom, topDropTo, dropRate]
  );

  const msg = (key: 'traffic' | 'funnel' | 'retention' | 'device') => kpis?.meta?.errors?.[key];

  // Render (no early returns; show banners instead)
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold mb-4">Weekly Analytics</h1>

      {err && <div className="mb-4 text-sm text-red-600">Error: {err}</div>}
      {loading && <div className="mb-4 text-sm text-gray-600">Loading…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 1) Traffic */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="font-semibold">Traffic</h3>
            {msg('traffic') && <span className="text-xs text-gray-500">{msg('traffic')}</span>}
          </div>
          <div className="h-44">
            {canRenderCharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficData}>
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded" />
            )}
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {(kpis?.traffic?.unique_users ?? 0)} users • {(kpis?.traffic?.pageviews ?? 0)} pageviews
          </div>
        </div>

        {/* 2) Conversion rate */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="font-semibold">Conversion</h3>
            {msg('funnel') && <span className="text-xs text-gray-500">{msg('funnel')}</span>}
          </div>
          <div className="h-44 relative">
            {canRenderCharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={[{ name: 'Conv', value: convPct }]}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="60%"
                  outerRadius="100%"
                >
                  <RadialBar dataKey="value" fill="#10b981" cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-semibold">{convPct}%</div>
            </div>
          </div>
          <div className="text-xs text-gray-600">Percent of sessions that converted</div>
        </div>

        {/* 3) Top drop-off */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="font-semibold">Top Drop-off Point</h3>
            {msg('funnel') && <span className="text-xs text-gray-500">{msg('funnel')}</span>}
          </div>
          <div className="h-44">
            {canRenderCharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDropBars} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis dataKey="name" />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" fill="#9ca3af" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded" />
            )}
          </div>
          <div className="text-xs text-gray-600">
            {topDropFrom} → {topDropTo} ({dropRatePct}% drop)
          </div>
        </div>

        {/* 4) Time-to-convert (median) */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="font-semibold">Time‑to‑Convert</h3>
            {msg('funnel') && <span className="text-xs text-gray-500">{msg('funnel')}</span>}
          </div>
          <div className="h-44">
            {canRenderCharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ label: 'Median (s)', v: ttcSec }]} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="v" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded" />
            )}
          </div>
          <div className="text-xs text-gray-600">{ttcSec}s median</div>
        </div>

        {/* 5) D7 Retention */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="font-semibold">D7 Retention</h3>
            {msg('retention') && <span className="text-xs text-gray-500">{msg('retention')}</span>}
          </div>
          <div className="h-44 relative">
            {canRenderCharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={[{ name: 'D7', value: d7Pct }]}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="60%"
                  outerRadius="100%"
                >
                  <RadialBar dataKey="value" fill="#f59e0b" cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-semibold">{d7Pct}%</div>
            </div>
          </div>
          <div className="text-xs text-gray-600">Users returning by day 7</div>
        </div>

        {/* 6) Device Mix */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="font-semibold">Device Mix</h3>
            {msg('device') && <span className="text-xs text-gray-500">{msg('device')}</span>}
          </div>
          <div className="h-44">
            {canRenderCharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded" />
            )}
          </div>
          <ul className="mt-1 text-xs text-gray-600">
            {pieData.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: colors[i % colors.length] }} />
                {p.name}: {p.value}%
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Summary card */}
      <div className="mt-6 bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">AI Summary</h3>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-xs rounded border hover:bg-gray-50"
              onClick={() => {
                // trigger re-run by clearing ai so useEffect on kpis refires when we setAgain
                setAi(null);
                setAiLoading(true);
                // force re-fetch
                (async () => {
                  try {
                    const res = await fetch('/api/ai/summary', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                      body: JSON.stringify({ kpis }),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json?.error || `AI HTTP ${res.status}`);
                    setAi(json.summary || null);
                  } catch (e: any) {
                    setAiErr(e.message || 'Failed to generate summary');
                  } finally {
                    setAiLoading(false);
                  }
                })();
              }}
            >
              Regenerate
            </button>
            <button
              className="px-3 py-1 text-xs rounded border hover:bg-gray-50"
              onClick={async () => {
                if (!ai) return;
                await navigator.clipboard.writeText(formatAiText(ai));
              }}
            >
              Copy
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm">
          {aiLoading && <div className="text-gray-500">Generating…</div>}
          {aiErr && <div className="text-red-600">Error: {aiErr}</div>}
          {!aiLoading && ai && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-3 text-lg font-medium">{ai.headline}</div>
              {ai.bottleneck && (
                <div className="md:col-span-3 text-gray-700">
                  <span className="font-medium">Bottleneck:</span> {ai.bottleneck}
                </div>
              )}
              <div>
                <p className="font-medium mb-1">Highlights</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(ai.highlights || []).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2">
                <p className="font-medium mb-1">Actions</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(ai.actions || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

