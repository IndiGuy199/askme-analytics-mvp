import { NextRequest, NextResponse } from 'next/server'
import { getRevenueByChannel } from '@/lib/queries/revenue'

/**
 * GET /api/analytics/revenue-by-channel
 * 
 * Query params:
 * - companyId: Company ID (required)
 * - from: Start date (default: '30d')
 * - to: End date (default: 'now')
 * - compare: Whether to include previous period data (default: false)
 * 
 * Returns revenue aggregated by UTM source (channel)
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

    console.log('[Revenue by Channel API] Query:', { companyId, from, to, compare })

    const result = await getRevenueByChannel({ companyId, from, to, compare })

    return NextResponse.json({ 
      ok: true, 
      data: result.data,
      ...(result.previousData && { previousData: result.previousData })
    })
  } catch (error) {
    console.error('[Revenue by Channel API] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
