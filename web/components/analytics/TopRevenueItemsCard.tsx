'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface RevenueDataPoint {
  label: string
  value: number
}

interface Props {
  companyId: string
  from?: string
  to?: string
}

/**
 * TopRevenueItemsCard
 * 
 * Displays a bar chart showing top revenue items aggregated by product_name.
 * Fetches data from /api/analytics/top-revenue endpoint.
 */
export default function TopRevenueItemsCard({ 
  companyId, 
  from = '30d', 
  to = 'now' 
}: Props) {
  const [data, setData] = useState<RevenueDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const url = `/api/analytics/top-revenue?companyId=${companyId}&from=${from}&to=${to}`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Failed to fetch top revenue items')
        }
        
        const json = await response.json()
        
        if (json.ok) {
          setData(json.data ?? [])
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
  }, [companyId, from, to])

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate total revenue
  const totalRevenue = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Top Revenue Pages / Products</h3>
        <p className="text-sm text-gray-500 mt-1">
          {loading ? 'Loading...' : `Total: ${formatCurrency(totalRevenue)}`}
        </p>
      </div>

      {error ? (
        <div className="h-56 flex items-center justify-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : loading ? (
        <div className="h-56 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-56 flex items-center justify-center">
          <p className="text-sm text-gray-500">No revenue data available</p>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
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
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
