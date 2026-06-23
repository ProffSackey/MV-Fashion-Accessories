import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseClient';
import { sendEmail, getAdminEmailList } from '../../../../lib/emailService';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sb = cookieStore.get('sb-admin-token');
  const session = cookieStore.get('admin_session');
  if (sb) return sb.value;
  if (session) return session.value;
  return null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or("recipient_type.eq.admin,recipient_type.eq.all")
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, markAll } = body;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  if (markAll) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .or("recipient_type.eq.admin,recipient_type.eq.all");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  // allow admin or internal services to create notifications
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notification = await req.json();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  const { data, error } = await supabase
    .from('notifications')
    .insert([notification])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // optionally send email to admins when admin notification is created
  if ((notification.recipient_type === 'admin' || notification.recipient_type === 'all')) {
    const admins = getAdminEmailList();
    if (admins.length > 0) {
      const subject = `[Boania] ${notification.title}`;
      const text = notification.message;
      sendEmail({ to: admins, subject, text });
    }
  }

  return NextResponse.json(data);
}
