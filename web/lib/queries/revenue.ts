/**
 * Revenue Analytics Query Helpers
 * 
 * These functions query PostHog for checkout_completed events
 * and aggregate revenue data by different dimensions.
 */

import { createServiceClient } from '@/lib/supabase/server'

const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'

type Range = { companyId: string; from: string; to: string }

interface RevenueDataPoint {
  label: string
  value: number
}

/**
 * Helper function to get PostHog credentials for a company
 */
async function getCompanyPostHogConfig(companyId: string) {
  const supabase = await createServiceClient()
  
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, posthog_project_id, posthog_api_key_encrypted')
    .eq('id', companyId)
    .single()
  
  if (error || !company) {
    throw new Error(`Company not found: ${companyId}`)
  }
  
  if (!company.posthog_project_id || !company.posthog_api_key_encrypted) {
    throw new Error('PostHog not configured for this company')
  }
  
  return {
    projectId: company.posthog_project_id.toString(),
    apiKey: company.posthog_api_key_encrypted, // Already decrypted by Supabase RLS
  }
}

/**
 * Helper function to make PostHog API requests
 */
async function queryPostHog(
  projectId: string,
  apiKey: string,
  payload: any
): Promise<any> {
  const url = `${PH_HOST}/api/projects/${projectId}/query/`
  
  console.log('[Revenue Query] Requesting:', url)
  console.log('[Revenue Query] Payload:', JSON.stringify(payload, null, 2))
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[Revenue Query] Error:', res.status, errorText)
    throw new Error(`PostHog API error: ${res.status} - ${errorText}`)
  }
  
  const json = await res.json()
  console.log('[Revenue Query] Response status:', res.status, res.statusText)
  console.log('[Revenue Query] Full Response Keys:', Object.keys(json))
  console.log('[Revenue Query] Results:', json?.results)
  console.log('[Revenue Query] Results length:', json?.results?.length)
  console.log('[Revenue Query] Error:', json?.error)
  
  return json
}

/**
 * Get revenue aggregated by UTM source (channel)
 * 
 * Queries PostHog for checkout_completed events and sums revenue by utm_source.
 * Returns data sorted by revenue (highest first).
 */
export async function getRevenueByChannel({
  companyId,
  from,
  to,
}: Range): Promise<RevenueDataPoint[]> {
  try {
    const { projectId, apiKey } = await getCompanyPostHogConfig(companyId)
    
    // PostHog Query API payload for trends with breakdown
    const payload = {
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'TrendsQuery',
          series: [
            {
              kind: 'EventsNode',
              event: 'checkout_completed',
              name: 'checkout_completed',
              math: 'sum',
              math_property: 'revenue',
            },
          ],
          breakdownFilter: {
            breakdown: 'utm_source',
            breakdown_type: 'event',
          },
          dateRange: {
            date_from: from === 'now' ? '-7d' : from,
            date_to: to === 'now' ? null : to,
          },
          filterTestAccounts: false, // Changed to false to include localhost events
        },
      },
    }
    
    const json = await queryPostHog(projectId, apiKey, payload)
    
    // Parse results from PostHog response
    const results = json?.results || []
    
    console.log('[Revenue by Channel] Raw results:', results)
    console.log('[Revenue by Channel] Results type:', typeof results, Array.isArray(results))
    console.log('[Revenue by Channel] First result:', results[0])
    
    const data: RevenueDataPoint[] = results
      .map((series: any) => {
        console.log('[Revenue by Channel] Mapping series:', series)
        return {
          label: series.breakdown_value || series.label || 'direct',
          value: series.count || series.aggregated_value || 0,
        }
      })
      .filter((item: RevenueDataPoint) => item.value > 0)
      .sort((a: RevenueDataPoint, b: RevenueDataPoint) => b.value - a.value)
    
    console.log('[Revenue by Channel] Parsed data:', data)
    
    return data
  } catch (error) {
    console.error('[Revenue by Channel] Error:', error)
    // Return empty array instead of throwing to prevent page crashes
    return []
  }
}

/**
 * Get revenue aggregated by product name
 * 
 * Queries PostHog for checkout_completed events and sums revenue by product_name.
 * Returns top products sorted by revenue (highest first).
 */
export async function getTopRevenue({
  companyId,
  from,
  to,
}: Range): Promise<RevenueDataPoint[]> {
  try {
    const { projectId, apiKey } = await getCompanyPostHogConfig(companyId)
    
    // PostHog Query API payload for trends with breakdown by product_name
    const payload = {
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'TrendsQuery',
          series: [
            {
              kind: 'EventsNode',
              event: 'checkout_completed',
              name: 'checkout_completed',
              math: 'sum',
              math_property: 'revenue',
            },
          ],
          breakdownFilter: {
            breakdown: 'product_name',
            breakdown_type: 'event',
          },
          dateRange: {
            date_from: from === 'now' ? '-7d' : from,
            date_to: to === 'now' ? null : to,
          },
          filterTestAccounts: false, // Changed to false to include localhost events
        },
      },
    }
    
    const json = await queryPostHog(projectId, apiKey, payload)
    
    // Parse results from PostHog response
    const results = json?.results || []
    
    console.log('[Top Revenue] Raw results:', results)
    console.log('[Top Revenue] Results type:', typeof results, Array.isArray(results))
    console.log('[Top Revenue] First result:', results[0])
    
    const data: RevenueDataPoint[] = results
      .map((series: any) => {
        console.log('[Top Revenue] Mapping series:', series)
        return {
          label: series.breakdown_value || series.label || 'unknown',
          value: series.count || series.aggregated_value || 0,
        }
      })
      .filter((item: RevenueDataPoint) => item.value > 0)
      .sort((a: RevenueDataPoint, b: RevenueDataPoint) => b.value - a.value)
      .slice(0, 10) // Top 10 products
    
    console.log('[Top Revenue] Parsed data:', data)
    
    return data
  } catch (error) {
    console.error('[Top Revenue] Error:', error)
    // Return empty array instead of throwing to prevent page crashes
    return []
  }
}
