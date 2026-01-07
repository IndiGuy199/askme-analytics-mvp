import { NextRequest, NextResponse } from 'next/server'
import { getTopRevenue } from '@/lib/queries/revenue'

/**
 * GET /api/analytics/top-revenue
 * 
 * Query params:
 * - companyId: Company ID (required)
 * - from: Start date (default: '30d')
 * - to: End date (default: 'now')
 * - compare: Whether to include previous period data (default: false)
 * 
 * Returns top revenue items aggregated by product_name
 * When compare=true, also returns previousData for comparison
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const from = searchParams.get('from') ?? '30d'
    const to = searchParams.get('to') ?? 'now'
    const compare = searchParams.get('compare') === 'true'

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    console.log('[Top Revenue API] Query:', { companyId, from, to, compare })

    const result = await getTopRevenue({ companyId, from, to, compare })

    return NextResponse.json({ 
      ok: true, 
      data: result.data,
      ...(result.previousData && { previousData: result.previousData })
    })
  } catch (error) {
    console.error('[Top Revenue API] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
