import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseClient';
import { isValidEmail } from '../../../../lib/validators';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Newsletter is not configured' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .upsert(
        [{ email: normalizedEmail, is_active: true, subscribed_at: new Date().toISOString() }],
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving newsletter subscriber:', error);
      return NextResponse.json({ error: 'Could not subscribe right now' }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscriber: data });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json({ error: 'Could not subscribe right now' }, { status: 500 });
  }
}
