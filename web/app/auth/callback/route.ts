import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/analytics'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      const user = data.user
      
      // Check if user exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        // Create user record using service client
        const serviceSupabase = createServiceClient()
        await serviceSupabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
            role: 'owner', // First user becomes owner
          })
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)

      // Determine redirect path
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      let redirectPath = next

      if (!userData?.company_id) {
        redirectPath = '/onboarding/company'
      } else {
        // Check if company has active subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('company_id', userData.company_id)
          .in('status', ['active', 'trialing'])
          .single()

        if (!subscription) {
          redirectPath = '/pricing'
        }
      }

      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  // Auth failed, redirect to login with error
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
