import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    // Get the session from the request headers
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', !!authHeader);

    // Try to get session using the client
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return NextResponse.json({
        error: 'Failed to get session',
        details: error.message
      }, { status: 400 });
    }

    if (!session) {
      return NextResponse.json({
        message: 'No active session',
        session: null
      }, { status: 401 });
    }

    return NextResponse.json({
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          email_confirmed_at: session.user.email_confirmed_at,
          user_metadata: session.user.user_metadata
        },
        expires_at: session.expires_at
      }
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
