import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Authenticate through Supabase, then separately verify the admin role.
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string // use service key for admin operations
    );

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const appMetadata = signInData.user.app_metadata || {};
    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('id')
      .ilike('email', signInData.user.email || email)
      .maybeSingle();
    if (appMetadata.role !== 'admin' && appMetadata.is_admin !== true && !adminRecord) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'This account is not authorized for administration' }, { status: 403 });
    }

    const accessToken = signInData.session.access_token;

    const adminName =
      signInData.user?.user_metadata?.full_name ||
      signInData.user?.user_metadata?.name ||
      email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    const res = NextResponse.json({ 
      ok: true,
      adminName,
      adminEmail: signInData.user?.email || email,
    });
    res.cookies.set({
      name: 'admin_name',
      value: adminName,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.set({
      name: 'admin_email',
      value: signInData.user?.email || email,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    if (accessToken) {
      res.cookies.set({
        name: 'sb-admin-token',
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return res;
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
