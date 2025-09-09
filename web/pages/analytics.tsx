'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Fix the import path - should be '../components' not '../../components'
const WeeklyAnalyticsCard = dynamic(() => import('../components/WeeklyAnalyticsCard'), {
  ssr: false,
  loading: () => <div className="p-6 text-center">Loading analytics...</div>,
});

export default function AnalyticsPage() {
  const [selectedDateRange, setSelectedDateRange] = useState('7d');
  const [comparisonMode, setComparisonMode] = useState('none'); // 'none' or 'previous'
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case '7d':
        return 'Last 7 days';
      case '30d':
        return 'Last 30 days';
      default:
        return 'Last 7 days';
    }
  };

  const getComparisonLabel = (mode: string, dateRange: string) => {
    if (mode === 'none') return 'No comparison between periods';
    if (mode === 'previous') {
      return dateRange === '7d' ? 'Previous 7 days' : 'Previous 30 days';
    }
    return 'No comparison';
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Analytics Content - this already has its own header with dropdowns */}
      <WeeklyAnalyticsCard
        clientId="askme-ai-app"
        clientName="AskMe AI"
        dateRange={selectedDateRange}
        dateRangeLabel={getDateRangeLabel(selectedDateRange)}
        comparisonMode={comparisonMode}
        comparisonPeriod={getComparisonLabel(comparisonMode, selectedDateRange)}
      />
    </div>
  );
}
