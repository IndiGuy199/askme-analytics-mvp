import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Start impersonation session
 * POST /api/admin/impersonate
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    const { companyId, reason } = await request.json()

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Log impersonation for audit trail
    const { error: logError } = await supabase
      .from('impersonation_logs')
      .insert({
        super_admin_id: user.id,
        target_company_id: companyId,
        reason: reason || 'Troubleshooting',
        started_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log impersonation:', logError)
    }

    // Update user metadata to include impersonation info
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        impersonation: {
          target_company_id: companyId,
          super_admin_id: user.id,
          started_at: new Date().toISOString()
        }
      }
    })

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to start impersonation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug
      }
    })

  } catch (error) {
    console.error('Impersonation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * End impersonation session
 * DELETE /api/admin/impersonate
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update impersonation log to mark as ended
    if (user.user_metadata?.impersonation) {
      await supabase
        .from('impersonation_logs')
        .update({ ended_at: new Date().toISOString() })
        .eq('super_admin_id', user.id)
        .is('ended_at', null)
    }

    // Clear impersonation metadata
    await supabase.auth.updateUser({
      data: {
        impersonation: null
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('End impersonation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
