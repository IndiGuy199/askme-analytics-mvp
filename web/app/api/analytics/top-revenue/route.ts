import { NextRequest, NextResponse } from 'next/server'
import { getTopRevenue } from '@/lib/queries/revenue'

/**
 * GET /api/analytics/top-revenue
 * 
 * Query params:
 * - companyId: Company ID (required)
 * - from: Start date (default: '30d')
 * - to: End date (default: 'now')
 * 
 * Returns top revenue items aggregated by product_name
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const from = searchParams.get('from') ?? '30d'
    const to = searchParams.get('to') ?? 'now'

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    console.log('[Top Revenue API] Query:', { companyId, from, to })

    const data = await getTopRevenue({ companyId, from, to })

    return NextResponse.json({ ok: true, data })
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
