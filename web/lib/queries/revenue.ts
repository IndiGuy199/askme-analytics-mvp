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
 */
export async function getRevenueByChannel({
  companyId,
  from,
  to,
}: Range): Promise<RevenueDataPoint[]> {
  try {
    const { projectId, apiKey, clientId } = await getCompanyPostHogConfig(companyId)
    
    // DEMO MODE: Return hardcoded data for askme-analytics-app
    if (clientId === 'askme-analytics-app') {
      return [
        { label: 'Direct', value: 650.00 },
        { label: 'Google Ads', value: 520.50 },
        { label: 'Facebook', value: 435.25 },
        { label: 'Email Campaign', value: 380.00 },
        { label: 'Organic Search', value: 295.75 },
      ]
    }
    
    // Query all events and aggregate manually to handle missing utm_source
    const payload = {
      query: {
        kind: 'DataTableNode',
        full: true,
        source: {
          kind: 'EventsQuery',
          select: ['properties.cart_total', 'properties.cart_items', 'properties.utm_source', 'timestamp'],
          orderBy: ['timestamp DESC'],
          after: from === 'now' ? '-7d' : from,
          before: to === 'now' ? null : to,
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
    
    // Parse results - manually aggregate by channel
    const events = json?.results || []
    
    console.log('[Revenue by Channel] Raw response:', json)
    console.log('[Revenue by Channel] Events count:', events.length)
    
    // Aggregate revenue by channel (utm_source)
    const channelRevenue = new Map<string, number>()
    
    events.forEach((event: any, index: number) => {
      console.log(`[Revenue by Channel] Event ${index}:`, event)
      
      // cart_total is in column 0, cart_items in column 1, utm_source in column 2
      const cartTotalRaw = event[0]
      const cartItemsRaw = event[1]
      const utmSource = event[2] || 'direct' // Default to 'direct' if no utm_source
      
      let revenue = 0
      
      // Try cart_total first
      if (cartTotalRaw) {
        revenue = parseFloat(cartTotalRaw)
      } 
      // Fallback: Calculate from cart_items if cart_total is missing
      else if (cartItemsRaw) {
        try {
          const cartItems = typeof cartItemsRaw === 'string' ? JSON.parse(cartItemsRaw) : cartItemsRaw
          if (Array.isArray(cartItems)) {
            revenue = cartItems.reduce((sum, item) => sum + parseFloat(item.item_total || 0), 0)
            console.log(`[Revenue by Channel] Calculated revenue from cart_items: ${revenue}`)
          }
        } catch (e) {
          console.error(`[Revenue by Channel] Failed to parse cart_items for event ${index}:`, e)
        }
      }
      
      if (revenue > 0) {
        console.log(`[Revenue by Channel] Channel: ${utmSource}, Revenue: ${revenue}`)
        const currentTotal = channelRevenue.get(utmSource) || 0
        channelRevenue.set(utmSource, currentTotal + revenue)
      }
    })
    
    console.log('[Revenue by Channel] Aggregated channel revenue:', Array.from(channelRevenue.entries()))
    
    // Convert to array and sort
    const data: RevenueDataPoint[] = Array.from(channelRevenue.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((item: RevenueDataPoint) => item.value > 0)
      .sort((a: RevenueDataPoint, b: RevenueDataPoint) => b.value - a.value)
    
    console.log('[Revenue by Channel] Final data:', data)
    
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
 * Queries PostHog for CHECKOUT_COMPLETED events, parses cart_items array,
 * and aggregates revenue by individual products.
 * Returns top products sorted by revenue (highest first).
 */
export async function getTopRevenue({
  companyId,
  from,
  to,
}: Range): Promise<RevenueDataPoint[]> {
  try {
    const { projectId, apiKey, clientId } = await getCompanyPostHogConfig(companyId)
    
    // DEMO MODE: Return hardcoded data for askme-analytics-app
    if (clientId === 'askme-analytics-app') {
      return [
        { label: 'Premium Plan', value: 690.00 },
        { label: 'Enterprise Plan', value: 580.00 },
        { label: 'Professional Services', value: 445.50 },
        { label: 'Add-on: Priority Support', value: 320.25 },
        { label: 'Add-on: Custom Integration', value: 215.00 },
      ]
    }
    
    // Get all checkout_completed events with cart_items
    const payload = {
      query: {
        kind: 'DataTableNode',
        full: true,
        source: {
          kind: 'EventsQuery',
          select: ['properties.cart_items', 'timestamp'],
          orderBy: ['timestamp DESC'],
          after: from === 'now' ? '-7d' : from,
          before: to === 'now' ? null : to,
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
    
    console.log('[Top Revenue] Raw response:', json)
    
    // Parse results - cart_items is an array of products in each event
    const events = json?.results || []
    console.log('[Top Revenue] Events count:', events.length)
    
    // Aggregate revenue by product name
    const productRevenue = new Map<string, number>()
    
    events.forEach((event: any, index: number) => {
      console.log(`[Top Revenue] Event ${index}:`, event)
      
      // cart_items is in the first column (index 0) as a JSON string
      const cartItemsRaw = event[0]
      
      if (!cartItemsRaw) {
        console.warn(`[Top Revenue] Event ${index} has no cart_items`)
        return
      }
      
      // Parse the JSON string to get the actual array
      let cartItems: any[]
      try {
        cartItems = typeof cartItemsRaw === 'string' ? JSON.parse(cartItemsRaw) : cartItemsRaw
      } catch (e) {
        console.error(`[Top Revenue] Failed to parse cart_items for event ${index}:`, e)
        return
      }
      
      if (Array.isArray(cartItems)) {
        console.log(`[Top Revenue] Processing ${cartItems.length} cart items`)
        
        cartItems.forEach((item: any) => {
          const name = item.name || 'Unknown Product'
          const itemTotal = parseFloat(item.item_total || 0)
          
          console.log(`[Top Revenue] Product: ${name}, Revenue: ${itemTotal}`)
          
          const currentTotal = productRevenue.get(name) || 0
          productRevenue.set(name, currentTotal + itemTotal)
        })
      } else {
        console.warn('[Top Revenue] cart_items is not an array after parsing:', cartItems)
      }
    })
    
    console.log('[Top Revenue] Aggregated product revenue:', Array.from(productRevenue.entries()))
    
    // Convert to array and sort
    const data: RevenueDataPoint[] = Array.from(productRevenue.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((item: RevenueDataPoint) => item.value > 0)
      .sort((a: RevenueDataPoint, b: RevenueDataPoint) => b.value - a.value)
      .slice(0, 10) // Top 10 products
    
    console.log('[Top Revenue] Final data:', data)
    
    return data
  } catch (error) {
    console.error('[Top Revenue] Error:', error)
    // Return empty array instead of throwing to prevent page crashes
    return []
  }
}
