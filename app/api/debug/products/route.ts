import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    // Check if ID parameter is provided
    const id = req.nextUrl.searchParams.get('id');
    
    if (id) {
      // Fetch single product by ID
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url, about, category, stock_quantity')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (!data) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    // Get all products with their raw field values
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, image_url, about, category')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('DEBUG: All products in database:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      count: data?.length || 0,
      products: data || [],
    });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
