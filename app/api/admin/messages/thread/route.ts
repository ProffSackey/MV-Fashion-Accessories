import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseClient';

export async function GET(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    if (!email) {
      return NextResponse.json([], { status: 200 });
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('id, sender_email, recipient_email, body, is_read, created_at')
      .or(`sender_email.eq.${email},recipient_email.eq.${email}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching thread messages:', error);
      return NextResponse.json([], { status: 200 });
    }

    const messages = (data || []).map((m: any) => ({
      id: m.id,
      fromAdmin: m.sender_email !== email,
      content: m.body,
      time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return NextResponse.json(messages);
  } catch (err) {
    console.error('Failed to load thread messages:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
