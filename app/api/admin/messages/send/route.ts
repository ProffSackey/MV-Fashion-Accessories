import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { recipientEmail, content } = await request.json();

    if (!recipientEmail || !content) {
      return NextResponse.json({ error: 'Recipient email and content required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{
        sender_email: 'admin@boanipa.com',
        recipient_email: recipientEmail,
        body: content.trim(),
        subject: '',
        is_read: false,
      }])
      .select();

    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data[0] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}