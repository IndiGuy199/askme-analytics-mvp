/**
 * Revenue Analytics Query Helpers
 * 
 * These functions query PostHog for checkout_completed events
 * and aggregate revenue data by different dimensions.
 */

import { createServiceClient } from '@/lib/supabase/server'

const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'

type Range = { companyId: string; from: string; to: string; compare?: boolean }

interface RevenueDataPoint {
  label: string
  value: number
}

interface RevenueResponse {
  data: RevenueDataPoint[]
  previousData?: RevenueDataPoint[]
}

/**
 * Calculate previous period dates based on current range
 * If from is "30d", previous period is -60d to -30d
 * If from/to are ISO dates, calculate same duration shifted back
 */
function calculatePreviousPeriod(from: string, to: string): { prevFrom: string; prevTo: string } {
  // Handle relative dates like "30d", "7d", etc.
  const relativeMatch = from.match(/^(\d+)d$/)
  if (relativeMatch) {
    const days = parseInt(relativeMatch[1], 10)
    return {
      prevFrom: `${days * 2}d`,
      prevTo: `${days}d`
    }
  }
  
  // Handle ISO date strings
  const fromDate = new Date(from)
  const toDate = to === 'now' ? new Date() : new Date(to)
  const duration = toDate.getTime() - fromDate.getTime()
  
  const prevToDate = new Date(fromDate.getTime() - 1) // Day before current period starts
  const prevFromDate = new Date(prevToDate.getTime() - duration)
  
  return {
    prevFrom: prevFromDate.toISOString().split('T')[0],
    prevTo: prevToDate.toISOString().split('T')[0]
  }
}

/**
 * Helper function to get PostHog credentials for a company
 */
async function getCompanyPostHogConfig(companyId: string) {
  const supabase = await createServiceClient()
  
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, posthog_project_id, posthog_api_key_encrypted, posthog_client_id')
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
    clientId: company.posthog_client_id, // For filtering events
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
 * Queries PostHog for checkout_completed events and sums cart_total by utm_source.
 * Returns data sorted by revenue (highest first).
 * When compare=true, also returns previousData for the previous period.
 */
export async function getRevenueByChannel({
  companyId,
  from,
  to,
  compare = false,
}: Range): Promise<RevenueResponse> {
  try {
    const { projectId, apiKey, clientId } = await getCompanyPostHogConfig(companyId)
    
    // DEMO MODE: Return hardcoded data for askme-analytics-app
    if (clientId === 'askme-analytics-app') {
      const currentData = [
        { label: 'Direct', value: 650.00 },
        { label: 'Google Ads', value: 520.50 },
        { label: 'Facebook', value: 435.25 },
        { label: 'Email Campaign', value: 380.00 },
        { label: 'Organic Search', value: 295.75 },
      ]
      
      if (compare) {
        // Previous period data (simulated ~10-15% lower)
        const previousData = [
          { label: 'Direct', value: 580.00 },
          { label: 'Google Ads', value: 470.00 },
          { label: 'Facebook', value: 400.00 },
          { label: 'Email Campaign', value: 350.00 },
          { label: 'Organic Search', value: 260.00 },
        ]
        return { data: currentData, previousData }
      }
      return { data: currentData }
    }
    
    // Helper function to query and aggregate revenue by channel
    const queryChannelRevenue = async (queryFrom: string, queryTo: string): Promise<RevenueDataPoint[]> => {
      const payload = {
        query: {
          kind: 'DataTableNode',
          full: true,
          source: {
            kind: 'EventsQuery',
            select: ['properties.cart_total', 'properties.cart_items', 'properties.utm_source', 'timestamp'],
            orderBy: ['timestamp DESC'],
            after: queryFrom === 'now' ? '-7d' : queryFrom,
            before: queryTo === 'now' ? null : queryTo,
            event: 'CHECKOUT_COMPLETED',
            properties: clientId ? [
              {
                key: 'client_id',
                value: [clientId],
                operator: 'exact',
                type: 'event',
              },
            ] : [],
          },
        },
      }
      
      const json = await queryPostHog(projectId, apiKey, payload)
      const events = json?.results || []
      
      console.log(`[Revenue by Channel] Events count for ${queryFrom} to ${queryTo}:`, events.length)
      
      // Aggregate revenue by channel (utm_source)
      const channelRevenue = new Map<string, number>()
      
      events.forEach((event: any, index: number) => {
        // cart_total is in column 0, cart_items in column 1, utm_source in column 2
        const cartTotalRaw = event[0]
        const cartItemsRaw = event[1]
        const utmSource = event[2] || 'direct'
        
        let revenue = 0
        
        if (cartTotalRaw) {
          revenue = parseFloat(cartTotalRaw)
        } else if (cartItemsRaw) {
          try {
            const cartItems = typeof cartItemsRaw === 'string' ? JSON.parse(cartItemsRaw) : cartItemsRaw
            if (Array.isArray(cartItems)) {
              revenue = cartItems.reduce((sum, item) => sum + parseFloat(item.item_total || 0), 0)
            }
          } catch (e) {
            console.error(`[Revenue by Channel] Failed to parse cart_items for event ${index}:`, e)
          }
        }
        
        if (revenue > 0) {
          const currentTotal = channelRevenue.get(utmSource) || 0
          channelRevenue.set(utmSource, currentTotal + revenue)
        }
      })
      
      return Array.from(channelRevenue.entries())
        .map(([label, value]) => ({ label, value }))
        .filter((item: RevenueDataPoint) => item.value > 0)
        .sort((a: RevenueDataPoint, b: RevenueDataPoint) => b.value - a.value)
    }
    
    // Get current period data
    const data = await queryChannelRevenue(from, to)
    console.log('[Revenue by Channel] Current period data:', data)
    
    // Get previous period data if compare is enabled
    if (compare) {
      const { prevFrom, prevTo } = calculatePreviousPeriod(from, to)
      console.log(`[Revenue by Channel] Fetching previous period: ${prevFrom} to ${prevTo}`)
      const previousData = await queryChannelRevenue(prevFrom, prevTo)
      console.log('[Revenue by Channel] Previous period data:', previousData)
      return { data, previousData }
    }
    
    return { data }
  } catch (error) {
    console.error('[Revenue by Channel] Error:', error)
    return { data: [] }
  }
}

/**
 * Get revenue aggregated by product name
 * 
 * Queries PostHog for CHECKOUT_COMPLETED events, parses cart_items array,
 * and aggregates revenue by individual products.
 * Returns top products sorted by revenue (highest first).
 * When compare=true, also returns previousData for the previous period.
 */
export async function getTopRevenue({
  companyId,
  from,
  to,
  compare = false,
}: Range): Promise<RevenueResponse> {
  try {
    const { projectId, apiKey, clientId } = await getCompanyPostHogConfig(companyId)
    
    // DEMO MODE: Return hardcoded data for askme-analytics-app
    if (clientId === 'askme-analytics-app') {
      const currentData = [
        { label: 'Premium Plan', value: 690.00 },
        { label: 'Enterprise Plan', value: 580.00 },
        { label: 'Professional Services', value: 445.50 },
        { label: 'Add-on: Priority Support', value: 320.25 },
        { label: 'Add-on: Custom Integration', value: 215.00 },
      ]
      
      if (compare) {
        // Previous period data (simulated ~10-15% lower)
        const previousData = [
          { label: 'Premium Plan', value: 620.00 },
          { label: 'Enterprise Plan', value: 530.00 },
          { label: 'Professional Services', value: 400.00 },
          { label: 'Add-on: Priority Support', value: 280.00 },
          { label: 'Add-on: Custom Integration', value: 190.00 },
        ]
        return { data: currentData, previousData }
      }
      return { data: currentData }
    }
    
    // Helper function to query and aggregate revenue by product
    const queryProductRevenue = async (queryFrom: string, queryTo: string): Promise<RevenueDataPoint[]> => {
      const payload = {
        query: {
          kind: 'DataTableNode',
          full: true,
          source: {
            kind: 'EventsQuery',
            select: ['properties.cart_items', 'timestamp'],
            orderBy: ['timestamp DESC'],
            after: queryFrom === 'now' ? '-7d' : queryFrom,
            before: queryTo === 'now' ? null : queryTo,
            event: 'CHECKOUT_COMPLETED',
            properties: clientId ? [
              {
                key: 'client_id',
                value: [clientId],
                operator: 'exact',
                type: 'event',
              },
            ] : [],
          },
        },
      }
      
      const json = await queryPostHog(projectId, apiKey, payload)
      const events = json?.results || []
      
      console.log(`[Top Revenue] Events count for ${queryFrom} to ${queryTo}:`, events.length)
      
      // Aggregate revenue by product name
      const productRevenue = new Map<string, number>()
      
      events.forEach((event: any, index: number) => {
        const cartItemsRaw = event[0]
        
        if (!cartItemsRaw) return
        
        let cartItems: any[]
        try {
          cartItems = typeof cartItemsRaw === 'string' ? JSON.parse(cartItemsRaw) : cartItemsRaw
        } catch (e) {
          console.error(`[Top Revenue] Failed to parse cart_items for event ${index}:`, e)
          return
        }
        
        if (Array.isArray(cartItems)) {
          cartItems.forEach((item: any) => {
            const name = item.name || 'Unknown Product'
            const itemTotal = parseFloat(item.item_total || 0)
            const currentTotal = productRevenue.get(name) || 0
            productRevenue.set(name, currentTotal + itemTotal)
          })
        }
      })
      
      return Array.from(productRevenue.entries())
        .map(([label, value]) => ({ label, value }))
        .filter((item: RevenueDataPoint) => item.value > 0)
        .sort((a: RevenueDataPoint, b: RevenueDataPoint) => b.value - a.value)
        .slice(0, 10) // Top 10 products
    }
    
    // Get current period data
    const data = await queryProductRevenue(from, to)
    console.log('[Top Revenue] Current period data:', data)
    
    // Get previous period data if compare is enabled
    if (compare) {
      const { prevFrom, prevTo } = calculatePreviousPeriod(from, to)
      console.log(`[Top Revenue] Fetching previous period: ${prevFrom} to ${prevTo}`)
      const previousData = await queryProductRevenue(prevFrom, prevTo)
      console.log('[Top Revenue] Previous period data:', previousData)
      return { data, previousData }
    }
    
    return { data }
  } catch (error) {
    console.error('[Top Revenue] Error:', error)
    return { data: [] }
  }
}
