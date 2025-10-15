'use client';

import { useEffect, useState } from 'react';

/** ------- Types that match /api/analytics/preview ------- */
type WeeklyAnalyticsCardProps = {
  clientId?: string;
  companyId?: string;
  clientName?: string;
  dateRange?: string;
  dateRangeLabel?: string;
  comparisonMode?: string;
  comparisonPeriod?: string;
  onDateRangeChange?: (range: string) => void;
  onComparisonModeChange?: (mode: string) => void;
  customLabels?: {
    title?: string;
    subtitle?: string;
  };
};

export default function WeeklyAnalyticsCard({ 
  clientId = 'askme-ai-app',
  companyId,
  clientName = 'Company',
  dateRange = '7d',
  dateRangeLabel = 'Last 7 days',
  comparisonMode = 'none',
  comparisonPeriod = 'No comparison',
  onDateRangeChange,
  onComparisonModeChange,
  customLabels = {}
}: WeeklyAnalyticsCardProps) {
  // TEST: Return simple content to verify component loading
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-green-100 p-6 rounded-lg border-2 border-green-500">
        <h2 className="text-2xl font-bold text-green-800">TEST: WeeklyAnalyticsCard Component</h2>
        <p className="text-green-700 text-lg">Component is loading successfully!</p>
        <div className="mt-4 bg-green-50 p-4 rounded">
          <p className="text-sm font-semibold text-green-600">Props received:</p>
          <ul className="text-xs text-green-600 mt-2 space-y-1">
            <li>Client ID: {clientId}</li>
            <li>Company ID: {companyId}</li>
            <li>Client Name: {clientName}</li>
            <li>Date Range: {dateRange}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
