import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin } = await import('../../../../lib/supabaseClient');

    // Use admin client to bypass RLS
    if (!supabaseAdmin) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customers', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in customers endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: String(error) },
      { status: 500 }
    );
  }
}
