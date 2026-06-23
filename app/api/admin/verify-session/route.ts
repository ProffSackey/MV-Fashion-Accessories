import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  const adminName = cookieStore.get('admin_name')?.value;
  const adminEmail = cookieStore.get('admin_email')?.value;

  if (session) {
    return NextResponse.json({
      authenticated: true,
      adminName: adminName || 'Admin',
      adminEmail: adminEmail || process.env.ADMIN_EMAIL || '',
    });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
