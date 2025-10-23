import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Get all companies for super admin dashboard
 * GET /api/admin/companies
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check super admin authorization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // Get all companies with subscription and user count info
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        slug,
        posthog_client_id,
        posthog_project_id,
        is_active,
        created_at,
        subscriptions (
          id,
          status,
          plan_id,
          trial_end,
          current_period_end
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching companies:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user counts for each company
    const companiesWithCounts = await Promise.all(
      (companies || []).map(async (company) => {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('is_active', true)

        return {
          ...company,
          user_count: count || 0
        }
      })
    )

    return NextResponse.json({ companies: companiesWithCounts })

  } catch (error) {
    console.error('Fetch companies error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
