import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member']).default('member')
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user and verify permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select(`
        company_id,
        role,
        companies!inner(
          id,
          name,
          plan_type
        )
      `)
      .eq('id', user.id)
      .single()

    if (!userData?.company_id || !userData.companies) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Only owners and admins can invite
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const company = userData.companies as any
    
    // Check plan limits for team size
    const { count: teamCount } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('company_id', userData.company_id)

    const currentTeamSize = teamCount || 0
    const maxTeamSize = company.plan_type === 'starter' ? 5 : 
                       company.plan_type === 'growth' ? 20 : 
                       company.plan_type === 'enterprise' ? 100 : 1

    if (currentTeamSize >= maxTeamSize) {
      return NextResponse.json({ 
        error: `Team size limit reached for ${company.plan_type} plan (${maxTeamSize} members)` 
      }, { status: 400 })
    }

    const body = await request.json()
    const { email, role } = inviteSchema.parse(body)

    // Check if user already exists in this company
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('company_id', userData.company_id)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists in this company' }, { status: 400 })
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Store invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        company_id: userData.company_id,
        email,
        role,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Invite creation error:', inviteError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Send invite email
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${inviteToken}`
    
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: email,
        subject: `You're invited to join ${company.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You're invited to join ${company.name}</h2>
            <p>You've been invited to join ${company.name} as a ${role}.</p>
            <p>Click the button below to accept your invitation:</p>
            <a href="${inviteUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Accept Invitation</a>
            <p>Or copy and paste this link: ${inviteUrl}</p>
            <p>This invitation expires in 7 days.</p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Continue - invite was created, just email failed
    }

    return NextResponse.json({ 
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at
      }
    })
  } catch (error) {
    console.error('Invite error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', issues: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
