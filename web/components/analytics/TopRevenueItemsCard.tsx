'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface RevenueDataPoint {
  label: string
  value: number
}

interface ChartDataPoint {
  label: string
  current: number
  previous?: number
}

interface Props {
  companyId: string
  from?: string
  to?: string
  compare?: boolean
}

/**
 * TopRevenueItemsCard
 * 
 * Displays a bar chart showing top revenue items aggregated by product_name.
 * When compare=true, shows dual bars comparing current vs previous period.
 * Fetches data from /api/analytics/top-revenue endpoint.
 */
export default function TopRevenueItemsCard({ 
  companyId, 
  from = '30d', 
  to = 'now',
  compare = false
}: Props) {
  const [data, setData] = useState<RevenueDataPoint[]>([])
  const [previousData, setPreviousData] = useState<RevenueDataPoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const url = `/api/analytics/top-revenue?companyId=${companyId}&from=${from}&to=${to}${compare ? '&compare=true' : ''}`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Failed to fetch top revenue items')
        }
        
        const json = await response.json()
        
        if (json.ok) {
          setData(json.data ?? [])
          setPreviousData(json.previousData ?? null)
        } else {
          throw new Error(json.error || 'Unknown error')
        }
      } catch (err) {
        console.error('[TopRevenueItemsCard] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [companyId, from, to, compare])

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Merge current and previous data for comparison chart
  const chartData = useMemo((): ChartDataPoint[] => {
    // When not comparing, just return current data
    if (!compare || !previousData) {
      return data.map(d => ({ label: d.label, current: d.value, previous: 0 }))
    }
    
    // Create a map of all labels from both periods
    const allLabels = new Set([
      ...data.map(d => d.label),
      ...previousData.map(d => d.label)
    ])
    
    // Build merged data with both current and previous values
    const previousMap = new Map(previousData.map(d => [d.label, d.value]))
    const currentMap = new Map(data.map(d => [d.label, d.value]))
    
    return Array.from(allLabels).map(label => ({
      label,
      current: currentMap.get(label) ?? 0,
      previous: previousMap.get(label) ?? 0
    })).sort((a, b) => Math.max(b.current, b.previous ?? 0) - Math.max(a.current, a.previous ?? 0)).slice(0, 10)
  }, [data, previousData, compare])

  // Determine if we should show comparison UI (compare mode is enabled and we have the response)
  const showComparison = compare && previousData !== null
  
  // Check if previous period actually has data for the bars
  const hasPreviousData = previousData && previousData.length > 0

  // Calculate max value for Y-axis domain to ensure both current and previous bars are visible
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 0
    return Math.max(...chartData.map(d => Math.max(d.current, d.previous ?? 0)))
  }, [chartData])

  // Calculate total revenue and change percentage
  const totalRevenue = data.reduce((sum, item) => sum + item.value, 0)
  const previousTotalRevenue = previousData?.reduce((sum, item) => sum + item.value, 0) ?? 0
  const percentChange = previousTotalRevenue > 0 
    ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 
    : 0

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Top Revenue Pages / Products</h3>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `Total: ${formatCurrency(totalRevenue)}`}
          </p>
          {showComparison && !loading && (
            <span className={`text-sm font-medium ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {previousTotalRevenue === 0 && totalRevenue > 0 
                ? 'New' 
                : `${percentChange >= 0 ? '↑' : '↓'} ${Math.abs(percentChange).toFixed(1)}%`
              }
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="h-56 flex items-center justify-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : loading ? (
        <div className="h-56 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-56 flex items-center justify-center">
          <p className="text-sm text-gray-500">No revenue data available</p>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={(value) => `$${value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                domain={[0, maxValue > 0 ? Math.ceil(maxValue * 1.1) : 'auto']}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'current' ? 'Current Period' : 'Previous Period'
                ]}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
              />
              {showComparison && (
                <Legend 
                  formatter={(value) => value === 'previous' ? 'Previous Period' : 'Current Period'}
                />
              )}
              <Bar 
                dataKey="previous" 
                fill={hasPreviousData ? "#bbf7d0" : "transparent"}
                radius={[4, 4, 0, 0]}
                name="previous"
                hide={!hasPreviousData}
              />
              <Bar 
                dataKey="current" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                name="current"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
