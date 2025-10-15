import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is available
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    
    // Get current user and company
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
          stripe_customer_id
        )
      `)
      .eq('id', user.id)
      .single()

    if (!userData?.company_id || !userData.companies) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if user can manage billing
    if (userData.role !== 'owner') {
      return NextResponse.json({ error: 'Only company owners can manage billing' }, { status: 403 })
    }

    const company = userData.companies as any
    
    if (!company.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
    }

    // Create billing portal session
    const session = await getStripe().billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
