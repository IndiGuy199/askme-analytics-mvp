import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Get team members
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user and company
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get team members
    const { data: teamMembers, error: teamError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        is_active,
        last_login_at,
        created_at
      `)
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: true })

    if (teamError) {
      console.error('Team fetch error:', teamError)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Get pending invites (only for admins/owners)
    let pendingInvites: any[] = []
    if (['owner', 'admin'].includes(userData.role)) {
      const { data: invites } = await supabase
        .from('invites')
        .select(`
          id,
          email,
          role,
          expires_at,
          created_at,
          invited_by,
          users!invites_invited_by_fkey(name)
        `)
        .eq('company_id', userData.company_id)
        .is('accepted_at', null)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      pendingInvites = invites || []
    }

    return NextResponse.json({
      teamMembers,
      pendingInvites,
      currentUserRole: userData.role
    })
  } catch (error) {
    console.error('Team API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update team member role (owners/admins only)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role || !['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Get current user and verify permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Only owners and admins can change roles
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get target user
    const { data: targetUser } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', userId)
      .single()

    if (!targetUser || targetUser.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent changing owner role or making multiple owners
    if (targetUser.role === 'owner' || role === 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 })
    }

    // Admins can't change other admins (only owners can)
    if (userData.role === 'admin' && targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot change other admin roles' }, { status: 403 })
    }

    // Update role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)

    if (updateError) {
      console.error('Role update error:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Team update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Remove team member (owners/admins only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get current user and verify permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Only owners and admins can remove members
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get target user
    const { data: targetUser } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', userId)
      .single()

    if (!targetUser || targetUser.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Cannot remove owners or self
    if (targetUser.role === 'owner' || userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove this user' }, { status: 400 })
    }

    // Admins can't remove other admins (only owners can)
    if (userData.role === 'admin' && targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot remove other admins' }, { status: 403 })
    }

    // Remove user (set company_id to null and is_active to false)
    const { error: removeError } = await supabase
      .from('users')
      .update({ 
        company_id: null,
        is_active: false
      })
      .eq('id', userId)

    if (removeError) {
      console.error('User removal error:', removeError)
      return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Team removal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
