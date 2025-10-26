import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, termsVersion } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get client IP address for compliance record-keeping
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown';

    const supabase = await createClient();

    // Check if user exists with this email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Update existing user's consent
      const { error: updateError } = await supabase
        .from('users')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: termsVersion || '1.0',
          consent_ip_address: ip
        })
        .eq('email', email);

      if (updateError) {
        console.error('Error updating consent:', updateError);
        return NextResponse.json(
          { error: 'Failed to record consent' },
          { status: 500 }
        );
      }
    }
    // If user doesn't exist yet, consent will be recorded after account creation
    // through a database trigger or in the onboarding flow

    return NextResponse.json(
      { 
        success: true, 
        message: 'Consent recorded successfully',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in consent API:', error);
    return NextResponse.json(
      { error: 'Failed to process consent', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user has accepted terms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('terms_accepted_at, terms_version')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { accepted: false },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        accepted: !!user.terms_accepted_at,
        acceptedAt: user.terms_accepted_at,
        version: user.terms_version
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error checking consent:', error);
    return NextResponse.json(
      { error: 'Failed to check consent', details: error.message },
      { status: 500 }
    );
  }
}
