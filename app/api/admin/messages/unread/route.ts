import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseClient';

const ADMIN_EMAIL = 'admin@boanipa.com';

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ count: 0 });
  }

  const { count, error } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_email', ADMIN_EMAIL)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching admin unread message count:', error);
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count || 0 });
}
