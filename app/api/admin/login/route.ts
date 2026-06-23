import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // If ADMIN_EMAIL and ADMIN_PASSWORD are set, allow local env-based auth
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    console.log('[LOGIN] Email from request:', email);
    console.log('[LOGIN] Admin email from env:', adminEmail);
    console.log('[LOGIN] Email match:', email === adminEmail);
    console.log('[LOGIN] Admin password exists:', !!adminPassword);

    if (adminEmail && adminPassword && email === adminEmail) {
      console.log('[LOGIN] Checking password...');
      const ok = password === adminPassword;
      console.log('[LOGIN] Password match:', ok);
      
      if (!ok) {
        console.log('[LOGIN] Password mismatch');
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const adminName =
        process.env.ADMIN_NAME ||
        adminEmail.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      const res = NextResponse.json({ ok: true, adminName, adminEmail });
      res.cookies.set({
        name: 'admin_session',
        value: 'authenticated',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
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
        value: adminEmail,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    // Fallback to Supabase Auth using official client to verify credentials
    // This avoids manual fetch and ensures correct encoding of payload.
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
      console.log('[LOGIN] Supabase signIn error:', signInError?.message);
      console.log('[LOGIN] Auth failed for email:', email);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const accessToken = signInData.session.access_token;
    console.log('[LOGIN] Supabase login succeeded, got tokens');
    console.log('[LOGIN] Setting cookies with accessToken:', !!accessToken);

    const adminName =
      signInData.user?.user_metadata?.full_name ||
      signInData.user?.user_metadata?.name ||
      email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    const res = NextResponse.json({ 
      ok: true,
      adminName,
      adminEmail: signInData.user?.email || email,
    });
    // set simple admin session flag
    res.cookies.set({
      name: 'admin_session',
      value: 'authenticated',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
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

    console.log('[LOGIN] admin_session cookie set');
    console.log('[LOGIN] Cookies after setting:', res.cookies.getAll().map(c => c.name));

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
      console.log('[LOGIN] sb-admin-token cookie set');
      console.log('[LOGIN] Cookies now:', res.cookies.getAll().map(c => c.name));
    } else {
      console.log('[LOGIN] No access token to set sb-admin-token cookie');
    }

    console.log('[LOGIN] Login successful for:', email);
    return res;
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
