import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * POST /api/admin/change-password
 * Change admin password using current password verification via Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, accessToken: tokenFromBody } = await request.json();

    console.log('[CHANGE-PASSWORD] Request received with:', {
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword,
      hasAccessToken: !!tokenFromBody,
    });

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server misconfiguration: admin client unavailable' },
        { status: 500 }
      );
    }

    // Check if we have an access token (from cookie or request body)
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('sb-admin-token')?.value;
    let accessToken = cookieToken || tokenFromBody;

    console.log('[CHANGE-PASSWORD] Token resolution:', {
      hasCookieToken: !!cookieToken,
      hasBodyToken: !!tokenFromBody,
      resolvedToSource: cookieToken ? 'cookie' : (tokenFromBody ? 'body' : 'none'),
      hasAccessToken: !!accessToken,
    });

    if (!accessToken) {
      console.error('[CHANGE-PASSWORD] No access token found in cookies or request body. Available cookies:', 
        cookieStore.getAll().map(c => c.name).join(', ')
      );
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    console.log('[CHANGE-PASSWORD] Access token verified');

    // Get user info from the access token
    const userRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        },
      }
    );

    if (!userRes.ok) {
      console.error('[CHANGE-PASSWORD] Failed to get user info:', userRes.status);
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    const userData = await userRes.json();
    const adminEmail = userData?.email;
    const userId = userData?.id;

    if (!adminEmail || !userId) {
      return NextResponse.json(
        { error: 'Failed to retrieve user information' },
        { status: 400 }
      );
    }

    console.log('[CHANGE-PASSWORD] User email retrieved:', adminEmail);

    // Verify current password by signing in with the Supabase client
    // This avoids manual fetch bugs with URLSearchParams.
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const { data: verifyData, error: verifyError } =
      await supabaseClient.auth.signInWithPassword({
        email: adminEmail,
        password: currentPassword,
      });

    console.log('[CHANGE-PASSWORD] verifyError', verifyError?.message);

    if (verifyError || !verifyData.session) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Use admin client to update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: `Failed to update password: ${updateError.message}` },
        { status: 400 }
      );
    }

    console.log('[CHANGE-PASSWORD] Password updated successfully for admin:', adminEmail);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: `Error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
