import dynamic from 'next/dynamic';

const WeeklyAnalyticsCard = dynamic(() => import('../components/WeeklyAnalyticsCard'), {
  ssr: false,
  loading: () => <div className="p-6">Loading…</div>,
});

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <WeeklyAnalyticsCard clientId="askme-ai-app" />
    </main>
  );
}
