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
      
      console.log('🔐 Auth callback - User authenticated:', user.email)
      
      // Check if user exists in our users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('👤 Existing user check:', { 
        exists: !!existingUser, 
        userId: user.id,
        checkError: checkError?.message 
      })

      if (!existingUser) {
        console.log('➕ Creating new user record...')
        // Create user record using authenticated client (user is logged in now)
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
            role: 'owner', // First user becomes owner
            onboarding_completed: false,
            onboarding_step: 'company'
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ Failed to create user record:', {
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          })
          // Continue anyway - they can try again
        } else {
          console.log('✅ Created user record:', newUser)
        }
      } else {
        console.log('✅ User already exists in database')
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)

      // Determine redirect path
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, is_super_admin')
        .eq('id', user.id)
        .single()

      let redirectPath = next

      // Super admins go directly to admin dashboard
      if (userData?.is_super_admin) {
        redirectPath = '/admin'
      } else if (!userData?.company_id) {
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
