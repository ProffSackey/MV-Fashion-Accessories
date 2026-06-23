import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseClient';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ count: 0 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ count: 0 });
  }

  const { count, error } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_email', email)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching user unread message count:', error);
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count || 0 });
}
