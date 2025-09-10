import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company and dashboard data
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('company_dashboard')
      .select('*')
      .eq('id', (
        await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single()
      ).data?.company_id)
      .single()

    if (dashboardError || !dashboardData) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get latest analytics snapshot
    const { data: latestSnapshot } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .eq('company_id', dashboardData.id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    // Get recent AI insights
    const { data: insights } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('company_id', dashboardData.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      company: dashboardData,
      latestSnapshot,
      insights: insights || []
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
