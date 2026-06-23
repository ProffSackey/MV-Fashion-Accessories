import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseClient';
import { isValidEmail, sanitizeString } from '../../../../lib/validators';

export async function POST(request: NextRequest) {
  try {
    const { email, content } = await request.json();

    if (!email || !content) {
      return NextResponse.json({ error: 'Email and content required' }, { status: 400 });
    }

    // validate and sanitize
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    const safeContent = sanitizeString(content, 2000);

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{ 
        sender_email: email,
        recipient_email: 'admin@boanipa.com',
        body: safeContent,
    }])
    .select();

    return NextResponse.json({ success: true, message: data?.[0] || null });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}