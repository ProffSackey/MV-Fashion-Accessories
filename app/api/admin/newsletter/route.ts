import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseClient';

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  if (error) {
    console.error('Error fetching newsletter subscribers:', error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data || []);
}
