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
      {/* Header with Date Range Selector */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Weekly Comparison</h1>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="dateRange" className="text-sm font-medium text-gray-700">
                Time Period:
              </label>
              <select
                id="dateRange"
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <WeeklyAnalyticsCard
        clientId="askme-ai-app"
        clientName="AskMe AI"
        dateRange={selectedDateRange}
        dateRangeLabel={getDateRangeLabel(selectedDateRange)}
      />
    </div>
  );
}
