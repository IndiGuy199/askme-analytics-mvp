import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const acceptInviteSchema = z.object({
  token: z.string(),
  name: z.string().min(1).optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { token, name } = acceptInviteSchema.parse(body)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select(`
        *,
        companies!inner(
          id,
          name
        )
      `)
      .eq('token', token)
      .eq('email', user.email)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 404 })
    }

    // Check if user is already part of a company
    const { data: existingUser } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (existingUser?.company_id) {
      return NextResponse.json({ 
        error: 'You are already part of a company. Please contact your administrator to switch companies.' 
      }, { status: 400 })
    }

    // Create or update user record
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: name || user.user_metadata?.name || user.email?.split('@')[0],
        company_id: invite.company_id,
        role: invite.role,
        is_active: true
      })

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json({ error: 'Failed to join company' }, { status: 500 })
    }

    // Mark invite as accepted
    const { error: acceptError } = await supabase
      .from('invites')
      .update({ 
        accepted_at: new Date().toISOString() 
      })
      .eq('id', invite.id)

    if (acceptError) {
      console.error('Invite acceptance error:', acceptError)
      // User was created, so this is not a critical error
    }

    const company = invite.companies as any

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name
      },
      role: invite.role
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', issues: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get invite details for display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find the invite (without auth requirement for display)
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select(`
        id,
        email,
        role,
        expires_at,
        companies!inner(
          name
        )
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 404 })
    }

    const company = invite.companies as any

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      company: {
        name: company.name
      },
      expires_at: invite.expires_at
    })
  } catch (error) {
    console.error('Get invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
